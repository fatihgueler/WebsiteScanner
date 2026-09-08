"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Info,
  Printer,
  RotateCcw,
  Wrench,
} from "lucide-react";
import { BefundKarte } from "@/components/befund-karte";
import { LeadForm } from "@/components/lead-form";
import { ScoreBalken, ScoreRing, einordnungText } from "@/components/score-ring";
import { Button, buttonVariants } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { site } from "@/lib/site";
import { DRUCK_SPEICHER_SCHLUESSEL } from "@/lib/report-uebergabe";
import type { Befund, Kategorie, Report, Status } from "@/lib/types";

type Gruppe = { kategorie: Kategorie; befunde: Befund[] };

/** Sammelt alle Befunde eines Status, gruppiert nach Kategorie. */
function gruppiere(kategorien: Kategorie[], status: Status): Gruppe[] {
  return kategorien
    .map((kategorie) => ({
      kategorie,
      befunde: kategorie.befunde.filter((befund) => befund.status === status),
    }))
    .filter((gruppe) => gruppe.befunde.length > 0);
}

function anzahl(gruppen: Gruppe[]): number {
  return gruppen.reduce((summe, gruppe) => summe + gruppe.befunde.length, 0);
}

export function ReportAnsicht({
  report,
  onNeueUrl,
}: {
  report: Report;
  onNeueUrl: () => void;
}) {
  const [technischeAnsicht, setTechnischeAnsicht] = useState(false);

  const gut = useMemo(() => gruppiere(report.kategorien, "gut"), [report]);
  const kritisch = useMemo(() => gruppiere(report.kategorien, "kritisch"), [report]);
  const verbesserbar = useMemo(
    () => gruppiere(report.kategorien, "verbesserbar"),
    [report],
  );
  const unklar = useMemo(() => gruppiere(report.kategorien, "unklar"), [report]);

  function oeffneDruckansicht() {
    try {
      sessionStorage.setItem(DRUCK_SPEICHER_SCHLUESSEL, JSON.stringify(report));
      // Bewusst ohne "noopener": Ein neuer Tab erbt nur dann eine Kopie des
      // sessionStorage, wenn die Verbindung zum Öffner bestehen bleibt. Mit
      // noopener käme die Druckansicht ohne Report an. Das Ziel liegt auf
      // derselben Domain und ist unsere eigene Seite.
      window.open("/report/print", "_blank");
    } catch {
      // Wenn der Browser sessionStorage sperrt (privater Modus mit strengen
      // Einstellungen), bleibt der Weg über das Drucken dieser Seite.
      window.print();
    }
  }

  const zeitpunkt = new Date(report.zeitpunkt).toLocaleString("de-DE", {
    dateStyle: "long",
    timeStyle: "short",
  });

  return (
    <div className="mx-auto w-full max-w-3xl px-5 pb-24 pt-10 sm:px-8 sm:pt-14">
      {/* ---------- Kopf mit Gesamtscore ---------- */}
      <header className="rounded-xl border border-border bg-card p-5 sm:p-7">
        <p className="text-sm text-muted-foreground">Ergebnis für</p>
        <h1 className="mt-1 break-all font-heading text-2xl font-medium leading-tight sm:text-3xl">
          {report.gepruefteUrl.replace(/^https?:\/\//, "").replace(/\/$/, "")}
        </h1>

        <div className="mt-6 flex flex-col items-center gap-6 sm:flex-row sm:items-center">
          <ScoreRing score={report.gesamtscore} />
          <div className="min-w-0 flex-1 text-center sm:text-left">
            <p className="font-heading text-xl font-medium">
              {einordnungText(report.gesamtscore)}
            </p>
            <p className="mt-2 text-base leading-relaxed text-muted-foreground">
              {report.zusammenfassung}
            </p>
          </div>
        </div>

        <dl className="mt-6 grid grid-cols-1 gap-3 border-t border-border pt-5 sm:grid-cols-3">
          {report.kategorien.map((kategorie) => (
            <div key={kategorie.id}>
              <dt className="text-sm text-muted-foreground">{kategorie.titel}</dt>
              <dd className="mt-1">
                <ScoreBalken score={kategorie.score} />
              </dd>
            </div>
          ))}
        </dl>
      </header>

      {/* ---------- Steuerung ---------- */}
      <div className="print-hidden mt-6 flex flex-col gap-4 rounded-xl border border-border bg-card px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Schalter und Beschriftung sind gemeinsam die Trefferfläche — der
            Schalter allein wäre für den Daumen zu klein. */}
        <div className="flex min-h-11 items-center gap-3">
          <Switch
            id="technisch-umschalter"
            checked={technischeAnsicht}
            onCheckedChange={setTechnischeAnsicht}
          />
          <label
            htmlFor="technisch-umschalter"
            className="flex min-h-11 cursor-pointer select-none flex-col justify-center text-sm sm:flex-row sm:items-center sm:gap-2"
          >
            <span className="font-medium text-foreground">
              {technischeAnsicht ? "Technische Fassung" : "Verständliche Fassung"}
            </span>
            <span className="text-muted-foreground">
              {technischeAnsicht
                ? "Fachdetails und Messwerte"
                : "zum Umschalten auf Fachdetails antippen"}
            </span>
          </label>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={oeffneDruckansicht} className="h-10">
            <Printer className="size-4" aria-hidden="true" />
            Druckansicht
          </Button>
          <Button variant="ghost" onClick={onNeueUrl} className="h-10">
            <RotateCcw className="size-4" aria-hidden="true" />
            Andere Adresse
          </Button>
        </div>
      </div>

      {/* ---------- Das machen Sie richtig ---------- */}
      {gut.length > 0 && (
        <Abschnitt
          id="gut"
          icon={CheckCircle2}
          farbe="text-gut"
          titel="Das machen Sie richtig"
          untertitel={`${anzahl(gut)} Punkte, die bereits stimmen und so bleiben sollen.`}
          gruppen={gut}
          technischeAnsicht={technischeAnsicht}
        />
      )}

      {/* ---------- Dringend ---------- */}
      {kritisch.length > 0 && (
        <Abschnitt
          id="dringend"
          icon={AlertTriangle}
          farbe="text-kritisch"
          titel="Dringend"
          untertitel={`${anzahl(kritisch)} Punkte, die zeitnah angegangen werden sollten.`}
          gruppen={kritisch}
          technischeAnsicht={technischeAnsicht}
        />
      )}

      {/* ---------- Lohnt sich ---------- */}
      {verbesserbar.length > 0 && (
        <Abschnitt
          id="lohnt-sich"
          icon={Wrench}
          farbe="text-verbesserbar"
          titel="Lohnt sich"
          untertitel={`${anzahl(verbesserbar)} Punkte, die Ihnen zusätzlich etwas bringen.`}
          gruppen={verbesserbar}
          technischeAnsicht={technischeAnsicht}
        />
      )}

      {/* ---------- Nicht automatisch prüfbar ---------- */}
      {unklar.length > 0 && (
        <Abschnitt
          id="ungeprueft"
          icon={Info}
          farbe="text-unklar"
          titel="Nicht automatisch prüfbar"
          untertitel={`${anzahl(unklar)} Punkte, zu denen wir keine belastbare Aussage treffen können. Sie fließen nicht in die Bewertung ein.`}
          gruppen={unklar}
          technischeAnsicht={technischeAnsicht}
        />
      )}

      {/* ---------- Manuelle Hinweise ---------- */}
      {report.manuelleHinweise.length > 0 && (
        <section className="mt-12" aria-labelledby="hinweise-titel">
          <h2
            id="hinweise-titel"
            className="font-heading text-xl font-medium text-foreground"
          >
            Was ein Programm nicht sehen kann
          </h2>
          <ul className="mt-4 space-y-3">
            {report.manuelleHinweise.map((hinweis) => (
              <li
                key={hinweis}
                className="print-block flex items-start gap-3 rounded-lg border border-border bg-card p-4 text-[0.95rem] leading-relaxed text-foreground"
              >
                <Info
                  className="mt-0.5 size-5 shrink-0 text-primary"
                  aria-hidden="true"
                />
                {hinweis}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ---------- Abschluss: PDF und Kontakt ---------- */}
      <section
        className="print-hidden mt-14 rounded-xl border border-border bg-card p-5 sm:p-7"
        aria-labelledby="abschluss-titel"
      >
        <h2 id="abschluss-titel" className="font-heading text-xl font-medium">
          Report als PDF zuschicken lassen
        </h2>
        <p className="mt-2 text-[0.95rem] leading-relaxed text-muted-foreground">
          Sie haben oben bereits alles gesehen — hier ist nichts verborgen. Wenn
          Sie den Report in Ruhe lesen oder jemandem weitergeben möchten,
          schicken wir ihn Ihnen zu.
        </p>

        <div className="mt-5">
          <LeadForm
            gepruefteUrl={report.gepruefteUrl}
            gesamtscore={report.gesamtscore}
          />
        </div>

        <div className="mt-7 border-t border-border pt-6">
          <h3 className="font-heading text-lg font-medium">
            Lieber beheben lassen?
          </h3>
          <p className="mt-2 text-[0.95rem] leading-relaxed text-muted-foreground">
            Die Punkte aus diesem Report lassen sich einzeln oder gemeinsam
            abarbeiten. Wenn Sie mögen, schauen wir uns das zusammen an — ohne
            Verpflichtung.
          </p>
          <a href={site.kontaktSeite} className={`${buttonVariants()} mt-4 h-11`}>
            Unverbindlich anfragen
            <ArrowRight className="size-4" aria-hidden="true" />
          </a>
        </div>
      </section>

      <p className="mt-8 text-xs leading-relaxed text-muted-foreground">
        Geprüft am {zeitpunkt}
        {report.ausCache && " (Ergebnis aus den letzten 24 Stunden)"}. Der Check
        wertet die öffentlich abrufbare Startseite aus; Unterseiten können
        abweichen. Dieser Report ist eine technische Einschätzung und keine
        Rechtsberatung.
      </p>
    </div>
  );
}

function Abschnitt({
  id,
  icon: Icon,
  farbe,
  titel,
  untertitel,
  gruppen,
  technischeAnsicht,
}: {
  id: string;
  icon: typeof CheckCircle2;
  farbe: string;
  titel: string;
  untertitel: string;
  gruppen: Gruppe[];
  technischeAnsicht: boolean;
}) {
  return (
    <section className="mt-12" aria-labelledby={`${id}-titel`}>
      <header className="flex items-start gap-3">
        <Icon className={`mt-1 size-6 shrink-0 ${farbe}`} aria-hidden="true" />
        <div>
          <h2
            id={`${id}-titel`}
            className="font-heading text-2xl font-medium leading-tight"
          >
            {titel}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">{untertitel}</p>
        </div>
      </header>

      <div className="mt-5 space-y-8">
        {gruppen.map((gruppe) => (
          <div key={gruppe.kategorie.id}>
            <h3 className="mb-3 text-sm font-medium uppercase tracking-[0.1em] text-muted-foreground">
              {gruppe.kategorie.titel}
            </h3>
            <div className="space-y-3">
              {gruppe.befunde.map((befund) => (
                <BefundKarte
                  key={befund.id}
                  befund={befund}
                  technischeAnsicht={technischeAnsicht}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
