"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BefundKarte } from "@/components/befund-karte";
import { ScoreRing, einordnungText } from "@/components/score-ring";
import { Button, buttonVariants } from "@/components/ui/button";
import { DRUCK_SPEICHER_SCHLUESSEL } from "@/lib/report-uebergabe";
import { site } from "@/lib/site";
import type { Report, Status } from "@/lib/types";

/**
 * Druckansicht. Kein PDF-Werkzeug — der Browser druckt selbst, gesteuert über
 * das Print-CSS in globals.css (A4, Seitenränder, keine zerrissenen Befunde).
 *
 * Der Report kommt über den sessionStorage, weil er nirgends gespeichert wird.
 * Im Druck stehen Klartext UND Fachdetails untereinander: Das Papier hat
 * keinen Umschalter, und der Ausdruck landet oft bei jemandem, der die
 * Technik einordnen kann.
 */

const REIHENFOLGE: { status: Status; titel: string; einleitung: string }[] = [
  {
    status: "gut",
    titel: "Das machen Sie richtig",
    einleitung: "Diese Punkte sind bereits in Ordnung und sollen so bleiben.",
  },
  {
    status: "kritisch",
    titel: "Dringend",
    einleitung: "Diese Punkte sollten zeitnah angegangen werden.",
  },
  {
    status: "verbesserbar",
    titel: "Lohnt sich",
    einleitung: "Diese Punkte bringen zusätzlich etwas.",
  },
  {
    status: "unklar",
    titel: "Nicht automatisch prüfbar",
    einleitung:
      "Zu diesen Punkten lässt sich keine belastbare Aussage treffen. Sie fließen nicht in die Bewertung ein.",
  },
];

export default function DruckSeite() {
  const [report, setReport] = useState<Report | null>(null);
  const [geladen, setGeladen] = useState(false);

  useEffect(() => {
    try {
      const roh = sessionStorage.getItem(DRUCK_SPEICHER_SCHLUESSEL);
      if (roh !== null) setReport(JSON.parse(roh) as Report);
    } catch {
      // Kein Zugriff auf sessionStorage oder kaputter Inhalt — unten
      // erscheint der Hinweis, die Prüfung erneut zu starten.
    }
    setGeladen(true);
  }, []);

  if (!geladen) return null;

  if (report === null) {
    return (
      <div className="mx-auto max-w-xl px-5 py-20 text-center">
        <h1 className="font-heading text-2xl font-medium">
          Kein Report zum Drucken vorhanden
        </h1>
        <p className="mt-3 text-muted-foreground">
          Die Druckansicht greift auf das Ergebnis Ihrer letzten Prüfung im
          selben Browserfenster zu. Bitte starten Sie die Prüfung erneut und
          öffnen Sie die Druckansicht aus dem Report heraus.
        </p>
        <Link href="/" className={`${buttonVariants()} mt-6 h-11`}>
          Zur Prüfung
        </Link>
      </div>
    );
  }

  const zeitpunkt = new Date(report.zeitpunkt).toLocaleString("de-DE", {
    dateStyle: "long",
    timeStyle: "short",
  });

  return (
    <div className="mx-auto max-w-3xl px-5 py-10 sm:px-8 print:max-w-none print:px-0 print:py-0">
      <div className="print-hidden mb-8 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card px-5 py-4">
        <p className="text-sm text-muted-foreground">
          Über &bdquo;Drucken&ldquo; können Sie den Report auch als PDF
          speichern — im Druckdialog unter &bdquo;Ziel&ldquo; bzw.
          &bdquo;Als PDF sichern&ldquo;.
        </p>
        <Button onClick={() => window.print()} className="h-10">
          Drucken
        </Button>
      </div>

      {/* ---------- Briefkopf ---------- */}
      <header className="print-block border-b border-border pb-6">
        <div className="flex items-baseline justify-between gap-4">
          <p className="font-heading text-lg font-medium">
            Güler<span className="text-primary">.dev</span>
            <span className="ml-2 font-sans text-sm font-normal text-muted-foreground">
              Website-Check
            </span>
          </p>
          <p className="text-xs text-muted-foreground">{zeitpunkt}</p>
        </div>

        <h1 className="mt-5 break-all font-heading text-2xl font-medium leading-tight">
          {report.gepruefteUrl.replace(/^https?:\/\//, "").replace(/\/$/, "")}
        </h1>

        <div className="mt-5 flex items-center gap-6">
          <ScoreRing score={report.gesamtscore} groesse={118} />
          <div className="min-w-0 flex-1">
            <p className="font-heading text-lg font-medium">
              {einordnungText(report.gesamtscore)}
            </p>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
              {report.zusammenfassung}
            </p>
          </div>
        </div>

        <table className="mt-6 w-full text-sm">
          <caption className="sr-only">Teilbewertungen je Kategorie</caption>
          <tbody>
            {report.kategorien.map((kategorie) => (
              <tr key={kategorie.id} className="border-t border-border/60">
                <th scope="row" className="py-1.5 text-left font-normal">
                  {kategorie.titel}
                </th>
                <td className="py-1.5 text-right text-muted-foreground">
                  {kategorie.gewicht} %
                </td>
                <td className="tabular w-16 py-1.5 text-right font-medium">
                  {kategorie.score === null ? "—" : `${kategorie.score}/100`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </header>

      {/* ---------- Befunde ---------- */}
      {REIHENFOLGE.map(({ status, titel, einleitung }) => {
        const gruppen = report.kategorien
          .map((kategorie) => ({
            kategorie,
            befunde: kategorie.befunde.filter((befund) => befund.status === status),
          }))
          .filter((gruppe) => gruppe.befunde.length > 0);

        if (gruppen.length === 0) return null;

        return (
          <section key={status} className="mt-10">
            <h2 className="font-heading text-xl font-medium">{titel}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{einleitung}</p>

            <div className="mt-4 space-y-6">
              {gruppen.map((gruppe) => (
                <div key={gruppe.kategorie.id}>
                  <h3 className="mb-2 text-xs font-medium uppercase tracking-[0.1em] text-muted-foreground">
                    {gruppe.kategorie.titel}
                  </h3>
                  <div className="space-y-2.5">
                    {gruppe.befunde.map((befund) => (
                      <BefundKarte key={befund.id} befund={befund} technischeAnsicht={false} fuerDruck />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        );
      })}

      {/* ---------- Manuelle Hinweise ---------- */}
      {report.manuelleHinweise.length > 0 && (
        <section className="mt-10">
          <h2 className="font-heading text-xl font-medium">
            Was ein Programm nicht sehen kann
          </h2>
          <ul className="mt-4 space-y-2.5">
            {report.manuelleHinweise.map((hinweis) => (
              <li
                key={hinweis}
                className="print-block rounded-lg border border-border p-3 text-sm leading-relaxed"
              >
                {hinweis}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ---------- Fußzeile ---------- */}
      <footer className="print-block mt-12 border-t border-border pt-5 text-xs leading-relaxed text-muted-foreground">
        <p>
          Erstellt am {zeitpunkt} über {site.domain}. Geprüft wurde die
          öffentlich abrufbare Startseite; Unterseiten können abweichen. Dieser
          Report ist eine technische Einschätzung und keine Rechtsberatung.
        </p>
        <p className="mt-2">
          {site.marke} · {site.betreiber.name} · {site.betreiber.email}
        </p>
      </footer>
    </div>
  );
}
