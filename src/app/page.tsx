"use client";

import { useState } from "react";
import { Lock, ShieldCheck, Timer } from "lucide-react";
import { UrlForm } from "@/components/url-form";

const MODULE = [
  "Technik & Sicherheit",
  "Recht & DSGVO",
  "Performance",
  "SEO",
  "Sichtbarkeit in KI-Suchen",
  "Inhalt & Vertrauen",
];

const VERSPRECHEN = [
  { icon: Lock, text: "Ohne Anmeldung, ohne E-Mail-Adresse" },
  { icon: ShieldCheck, text: "Ergebnis wird nicht gespeichert" },
  { icon: Timer, text: "Dauert etwa 30 Sekunden" },
];

export default function StartSeite() {
  const [laeuft, setLaeuft] = useState(false);

  // Wird in Meilenstein 6 an die Prüf-Engine und die Report-Ansicht angeschlossen.
  function startePruefung(url: string) {
    setLaeuft(true);
    void url;
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-5 pb-24 pt-16 sm:px-8 sm:pt-24">
      <p className="mb-5 text-sm font-medium uppercase tracking-[0.14em] text-primary">
        Kostenloser Website-Check
      </p>

      <h1 className="max-w-2xl text-balance font-heading text-4xl font-normal leading-[1.1] tracking-tight sm:text-5xl">
        Ist Ihre Website noch auf dem Stand?
      </h1>

      <p className="mt-5 max-w-xl text-lg leading-relaxed text-muted-foreground">
        Geben Sie Ihre Adresse ein und Sie bekommen einen verständlichen Bericht:
        was gut läuft, was sich lohnt und was rechtlich heikel ist. Vollständig
        und ohne Bezahlschranke.
      </p>

      <div className="mt-10 rounded-xl border border-border bg-card p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)] sm:p-7">
        <UrlForm onSubmit={startePruefung} laeuft={laeuft} autoFocus />

        <ul className="mt-1 flex flex-col gap-2 text-sm text-muted-foreground sm:flex-row sm:flex-wrap sm:gap-x-6">
          {VERSPRECHEN.map(({ icon: Icon, text }) => (
            <li key={text} className="flex items-center gap-2">
              <Icon className="size-4 shrink-0 text-primary" aria-hidden="true" />
              {text}
            </li>
          ))}
        </ul>
      </div>

      <section className="mt-12" aria-labelledby="geprueft-titel">
        <h2
          id="geprueft-titel"
          className="font-sans text-sm font-medium uppercase tracking-[0.14em] text-muted-foreground"
        >
          Geprüft werden
        </h2>
        <p className="mt-3 text-base leading-relaxed text-foreground">
          {MODULE.map((modul, index) => (
            <span key={modul}>
              {modul}
              {index < MODULE.length - 1 && (
                <span className="px-2 text-border" aria-hidden="true">
                  ·
                </span>
              )}
            </span>
          ))}
        </p>
      </section>

      <p className="mt-10 max-w-xl border-l-2 border-border pl-4 text-sm leading-relaxed text-muted-foreground">
        Der Check ruft nur öffentlich abrufbare Seiten Ihrer Website auf — so wie
        es jeder Besucher und jede Suchmaschine auch tut. Es werden keine
        Formulare abgeschickt, keine Zugänge getestet und keine Daten verändert.
      </p>
    </div>
  );
}
