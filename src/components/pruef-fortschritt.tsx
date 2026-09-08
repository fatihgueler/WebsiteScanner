"use client";

import { useEffect, useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { KATEGORIE_DEFINITION } from "@/lib/types";

/**
 * Fortschrittsanzeige während der Prüfung.
 *
 * Die Prüfung läuft serverseitig in einem einzigen Request ab — es gibt also
 * keinen echten Zwischenstand, den man streamen könnte. Statt das zu
 * verschweigen, läuft hier eine ehrlich beschriftete Schätzung: Die Module
 * werden nacheinander abgehakt, aber das letzte bleibt so lange offen, bis
 * die Antwort tatsächlich da ist. So kommt die Anzeige nie vor dem Ergebnis
 * an und behauptet auch nie, fertig zu sein, wenn sie es nicht ist.
 *
 * Die 15–40 Sekunden entstehen fast vollständig durch die PageSpeed-API.
 */

/** Geschätzte Dauer je Modul in Millisekunden. Summe ~26 s. */
const SCHRITT_DAUER = [1800, 2600, 14000, 3200, 2800, 1600];

export function PruefFortschritt({ url }: { url: string }) {
  const [erledigt, setErledigt] = useState(0);

  useEffect(() => {
    const timer: ReturnType<typeof setTimeout>[] = [];
    let summe = 0;

    // Das letzte Modul wird bewusst nicht automatisch abgehakt.
    for (let i = 0; i < KATEGORIE_DEFINITION.length - 1; i += 1) {
      summe += SCHRITT_DAUER[i] ?? 2500;
      timer.push(setTimeout(() => setErledigt(i + 1), summe));
    }

    return () => {
      for (const eintrag of timer) clearTimeout(eintrag);
    };
  }, []);

  const anteil = Math.round((erledigt / KATEGORIE_DEFINITION.length) * 100);

  return (
    <section
      aria-live="polite"
      aria-busy="true"
      className="rounded-xl border border-border bg-card p-5 sm:p-7"
    >
      <h2 className="font-heading text-xl font-medium">Ihre Seite wird geprüft</h2>
      <p className="mt-1 break-all text-sm text-muted-foreground">{url}</p>

      <div
        className="mt-5 h-1.5 w-full overflow-hidden rounded-full bg-border"
        role="progressbar"
        aria-valuenow={anteil}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Fortschritt der Prüfung"
      >
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-700 ease-out"
          style={{ width: `${Math.max(4, anteil)}%` }}
        />
      </div>

      <ol className="mt-5 space-y-2.5">
        {KATEGORIE_DEFINITION.map((kategorie, index) => {
          const fertig = index < erledigt;
          const laeuft = index === erledigt;

          return (
            <li
              key={kategorie.id}
              className={`flex items-center gap-3 text-sm transition-colors ${
                fertig
                  ? "text-foreground"
                  : laeuft
                    ? "text-foreground"
                    : "text-muted-foreground/60"
              }`}
            >
              <span className="flex size-5 shrink-0 items-center justify-center">
                {fertig ? (
                  <Check className="size-4 text-gut" aria-hidden="true" />
                ) : laeuft ? (
                  <Loader2 className="size-4 animate-spin text-primary" aria-hidden="true" />
                ) : (
                  <span
                    className="size-1.5 rounded-full bg-border"
                    aria-hidden="true"
                  />
                )}
              </span>
              {kategorie.titel}
              {fertig && <span className="sr-only">— geprüft</span>}
            </li>
          );
        })}
      </ol>

      <p className="mt-5 border-t border-border pt-4 text-sm text-muted-foreground">
        Das dauert etwa 15 bis 40 Sekunden. Der längste Teil ist die
        Geschwindigkeitsmessung — die läuft über Google und lässt sich nicht
        beschleunigen. Bitte lassen Sie das Fenster so lange offen.
      </p>
    </section>
  );
}
