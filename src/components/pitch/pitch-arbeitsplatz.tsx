"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Check,
  FolderOpen,
  Loader2,
  LogOut,
  Save,
  Trash2,
} from "lucide-react";
import { FehlerAnzeige } from "@/components/fehler-anzeige";
import { PruefFortschritt } from "@/components/pruef-fortschritt";
import { ReportAnsicht } from "@/components/report-ansicht";
import { UrlForm } from "@/components/url-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { PitchUebersicht } from "@/lib/pitch-speicher";
import { istFehler, type CheckAntwort, type CheckFehler, type Report } from "@/lib/types";

type Zustand =
  | { art: "start" }
  | { art: "laeuft"; url: string }
  | { art: "fertig"; report: Report; kunde: string; notiz: string; bereitsGesichert: boolean }
  | { art: "fehler"; fehler: CheckFehler; url: string };

export function PitchArbeitsplatz({ speicherAktiv }: { speicherAktiv: boolean }) {
  const router = useRouter();
  const [zustand, setZustand] = useState<Zustand>({ art: "start" });
  const [eintraege, setEintraege] = useState<PitchUebersicht[]>([]);
  const [listeLaedt, setListeLaedt] = useState(false);
  const [sichern, setSichern] = useState<"bereit" | "laeuft" | "fehler">("bereit");
  const [sicherMeldung, setSicherMeldung] = useState<string | null>(null);

  const ladeListe = useCallback(async () => {
    if (!speicherAktiv) return;
    setListeLaedt(true);
    try {
      const antwort = await fetch("/api/pitch/eintraege");
      const daten = (await antwort.json()) as { ok?: boolean; eintraege?: PitchUebersicht[] };
      if (daten.ok === true && Array.isArray(daten.eintraege)) setEintraege(daten.eintraege);
    } catch {
      // Liste bleibt leer; der Arbeitsplatz funktioniert trotzdem.
    }
    setListeLaedt(false);
  }, [speicherAktiv]);

  useEffect(() => {
    void ladeListe();
  }, [ladeListe]);

  async function starte(url: string) {
    setZustand({ art: "laeuft", url });
    setSichern("bereit");
    setSicherMeldung(null);

    try {
      const antwort = await fetch("/api/check", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const daten = (await antwort.json()) as CheckAntwort;

      if (istFehler(daten)) {
        setZustand({ art: "fehler", fehler: daten, url });
        return;
      }

      // Betriebsname aus der Domain vorbelegen — spart im Gespräch Tipparbeit.
      const vorschlag = new URL(daten.gepruefteUrl).hostname.replace(/^www\./, "");
      setZustand({
        art: "fertig",
        report: daten,
        kunde: vorschlag,
        notiz: "",
        bereitsGesichert: false,
      });
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      setZustand({
        art: "fehler",
        url,
        fehler: {
          fehler: true,
          code: "intern",
          meldung: "Die Verbindung ist abgebrochen. Bitte noch einmal versuchen.",
        },
      });
    }
  }

  async function oeffne(id: string) {
    setListeLaedt(true);
    try {
      const antwort = await fetch(`/api/pitch/eintraege/${id}`);
      const daten = (await antwort.json()) as {
        ok?: boolean;
        eintrag?: { kunde: string; notiz: string; report: Report };
      };
      if (daten.ok === true && daten.eintrag !== undefined) {
        setZustand({
          art: "fertig",
          report: daten.eintrag.report,
          kunde: daten.eintrag.kunde,
          notiz: daten.eintrag.notiz,
          bereitsGesichert: true,
        });
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    } catch {
      // still
    }
    setListeLaedt(false);
  }

  async function sichereJetzt() {
    if (zustand.art !== "fertig") return;
    if (zustand.kunde.trim() === "") {
      setSicherMeldung("Bitte einen Namen für den Betrieb angeben.");
      setSichern("fehler");
      return;
    }

    setSichern("laeuft");
    setSicherMeldung(null);

    try {
      const antwort = await fetch("/api/pitch/eintraege", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          kunde: zustand.kunde,
          notiz: zustand.notiz,
          report: zustand.report,
        }),
      });
      const daten = (await antwort.json()) as { ok?: boolean; meldung?: string };

      if (daten.ok !== true) {
        setSicherMeldung(daten.meldung ?? "Sichern hat nicht geklappt.");
        setSichern("fehler");
        return;
      }

      setZustand({ ...zustand, bereitsGesichert: true });
      setSichern("bereit");
      void ladeListe();
    } catch {
      setSicherMeldung("Die Verbindung ist abgebrochen.");
      setSichern("fehler");
    }
  }

  async function loesche(id: string) {
    await fetch(`/api/pitch/eintraege?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    void ladeListe();
  }

  async function abmelden() {
    await fetch("/api/pitch/login", { method: "DELETE" });
    router.refresh();
  }

  // ---------------------------------------------------------------- Report
  if (zustand.art === "fertig") {
    return (
      <div>
        <div className="print-hidden mx-auto w-full max-w-3xl px-5 pt-8 sm:px-8">
          <Button
            variant="ghost"
            onClick={() => setZustand({ art: "start" })}
            className="h-10 -ml-3"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Zurück zur Übersicht
          </Button>

          <div className="mt-3 rounded-xl border border-border bg-card p-5">
            <h2 className="font-heading text-lg font-medium">
              {zustand.bereitsGesichert ? "Gesicherte Prüfung" : "Prüfung sichern"}
            </h2>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="pitch-kunde" className="mb-1.5 block text-sm font-medium">
                  Betrieb
                </Label>
                <Input
                  id="pitch-kunde"
                  value={zustand.kunde}
                  onChange={(e) => setZustand({ ...zustand, kunde: e.target.value, bereitsGesichert: false })}
                  className="h-11 bg-background"
                />
              </div>
              <div>
                <Label htmlFor="pitch-notiz" className="mb-1.5 block text-sm font-medium">
                  Notiz fürs Gespräch
                </Label>
                <Input
                  id="pitch-notiz"
                  value={zustand.notiz}
                  placeholder="z. B. Termin am 12., Ansprechpartner Herr Meier"
                  onChange={(e) => setZustand({ ...zustand, notiz: e.target.value, bereitsGesichert: false })}
                  className="h-11 bg-background"
                />
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <Button
                onClick={sichereJetzt}
                disabled={sichern === "laeuft" || !speicherAktiv}
                className="h-11"
              >
                {sichern === "laeuft" ? (
                  <>
                    <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                    Wird gesichert
                  </>
                ) : zustand.bereitsGesichert ? (
                  <>
                    <Check className="size-4" aria-hidden="true" />
                    Gesichert
                  </>
                ) : (
                  <>
                    <Save className="size-4" aria-hidden="true" />
                    Sichern
                  </>
                )}
              </Button>

              {!speicherAktiv && (
                <p className="text-sm text-muted-foreground">
                  Ohne Upstash-Zugangsdaten lässt sich nichts sichern — die Prüfung
                  selbst und die Druckansicht funktionieren trotzdem.
                </p>
              )}
            </div>

            <p role="alert" aria-live="polite" className="mt-2 min-h-5 text-sm text-kritisch">
              {sicherMeldung}
            </p>
          </div>
        </div>

        <ReportAnsicht
          report={zustand.report}
          onNeueUrl={() => setZustand({ art: "start" })}
          pitchModus
        />
      </div>
    );
  }

  // ------------------------------------------------------------- Übersicht
  return (
    <div className="mx-auto w-full max-w-3xl px-5 pb-24 pt-10 sm:px-8 sm:pt-14">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl font-medium">Pitch-Modus</h1>
          <p className="mt-1.5 text-muted-foreground">
            Website prüfen, Ergebnis sichern, im Gespräch aufrufen.
          </p>
        </div>
        <Button variant="ghost" onClick={abmelden} className="h-10 shrink-0">
          <LogOut className="size-4" aria-hidden="true" />
          <span className="hidden sm:inline">Abmelden</span>
        </Button>
      </div>

      <div className="mt-8">
        {zustand.art === "laeuft" ? (
          <PruefFortschritt url={zustand.url} />
        ) : (
          <>
            {zustand.art === "fehler" && (
              <div className="mb-6">
                <FehlerAnzeige
                  fehler={zustand.fehler}
                  onErneutVersuchen={() => setZustand({ art: "start" })}
                />
              </div>
            )}
            <div className="rounded-xl border border-border bg-card p-5 sm:p-6">
              <UrlForm
                onSubmit={starte}
                laeuft={false}
                startwert={zustand.art === "fehler" ? zustand.url : ""}
                autoFocus={zustand.art === "start"}
                beschriftung="Adresse der Kundenwebsite"
                schaltflaeche="Prüfen"
              />
            </div>
          </>
        )}
      </div>

      {zustand.art !== "laeuft" && (
        <section className="mt-12" aria-labelledby="gesichert-titel">
          <div className="flex items-center gap-2">
            <FolderOpen className="size-5 text-primary" aria-hidden="true" />
            <h2 id="gesichert-titel" className="font-heading text-xl font-medium">
              Gesicherte Prüfungen
            </h2>
            {listeLaedt && (
              <Loader2 className="size-4 animate-spin text-muted-foreground" aria-hidden="true" />
            )}
          </div>

          {!speicherAktiv ? (
            <p className="mt-3 rounded-lg border border-border bg-card p-4 text-sm leading-relaxed text-muted-foreground">
              Für gesicherte Prüfungen werden die Upstash-Zugangsdaten benötigt
              (UPSTASH_REDIS_REST_URL und UPSTASH_REDIS_REST_TOKEN). Prüfen und
              Drucken geht auch ohne.
            </p>
          ) : eintraege.length === 0 ? (
            <p className="mt-3 rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              Noch nichts gesichert. Prüfen Sie oben eine Adresse und sichern Sie
              das Ergebnis — dann finden Sie es hier wieder.
            </p>
          ) : (
            <ul className="mt-3 space-y-2">
              {eintraege.map((eintrag) => (
                <li
                  key={eintrag.id}
                  className="flex items-center gap-3 rounded-lg border border-border bg-card p-4"
                >
                  <button
                    type="button"
                    onClick={() => oeffne(eintrag.id)}
                    className="min-w-0 flex-1 text-left"
                  >
                    <p className="truncate font-medium text-foreground">{eintrag.kunde}</p>
                    <p className="truncate text-sm text-muted-foreground">
                      {eintrag.gepruefteUrl.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      <span className="tabular font-medium text-foreground">
                        {eintrag.gesamtscore}/100
                      </span>
                      <span className="px-1.5 text-border" aria-hidden="true">·</span>
                      {eintrag.anzahlMassnahmen} Maßnahmen
                      {eintrag.anzahlKritisch > 0 && (
                        <>
                          <span className="px-1.5 text-border" aria-hidden="true">·</span>
                          <span className="text-kritisch">
                            {eintrag.anzahlKritisch} dringend
                          </span>
                        </>
                      )}
                      <span className="px-1.5 text-border" aria-hidden="true">·</span>
                      {new Date(eintrag.gesichertAm).toLocaleDateString("de-DE")}
                    </p>
                    {eintrag.notiz !== "" && (
                      <p className="mt-1 truncate text-xs italic text-muted-foreground">
                        {eintrag.notiz}
                      </p>
                    )}
                  </button>

                  <Button
                    variant="ghost"
                    onClick={() => void loesche(eintrag.id)}
                    aria-label={`Prüfung für ${eintrag.kunde} löschen`}
                    className="size-11 shrink-0 p-0 text-muted-foreground hover:text-kritisch"
                  >
                    <Trash2 className="size-4" aria-hidden="true" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
