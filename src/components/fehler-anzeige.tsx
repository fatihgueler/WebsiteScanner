"use client";

import { AlertCircle, Clock, Link2Off, RotateCcw, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CheckFehler } from "@/lib/types";

const DARSTELLUNG: Record<
  CheckFehler["code"],
  { icon: typeof AlertCircle; ueberschrift: string }
> = {
  ungueltige_url: { icon: Link2Off, ueberschrift: "Diese Adresse geht so nicht" },
  nicht_erreichbar: { icon: Link2Off, ueberschrift: "Die Seite war nicht erreichbar" },
  zeitueberschreitung: { icon: Clock, ueberschrift: "Der Server hat zu lange gebraucht" },
  rate_limit: { icon: ShieldAlert, ueberschrift: "Genug geprüft für den Moment" },
  kein_html: { icon: Link2Off, ueberschrift: "Dahinter liegt keine Webseite" },
  intern: { icon: AlertCircle, ueberschrift: "Da ist bei uns etwas schiefgelaufen" },
};

export function FehlerAnzeige({
  fehler,
  onErneutVersuchen,
}: {
  fehler: CheckFehler;
  onErneutVersuchen: () => void;
}) {
  const { icon: Icon, ueberschrift } = DARSTELLUNG[fehler.code];
  // Beim Rate-Limit hilft ein sofortiger neuer Versuch nicht weiter.
  const wiederholenSinnvoll = fehler.code !== "rate_limit";

  return (
    <div
      role="alert"
      className="rounded-xl border border-kritisch/25 bg-kritisch-soft p-5 sm:p-7"
    >
      <div className="flex items-start gap-3">
        <Icon className="mt-0.5 size-6 shrink-0 text-kritisch" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <h2 className="font-heading text-xl font-medium leading-tight">
            {ueberschrift}
          </h2>
          <p className="mt-2 text-[0.95rem] leading-relaxed text-foreground">
            {fehler.meldung}
          </p>

          <div className="mt-5 flex flex-wrap gap-2">
            <Button onClick={onErneutVersuchen} className="h-11">
              <RotateCcw className="size-4" aria-hidden="true" />
              {wiederholenSinnvoll ? "Noch einmal versuchen" : "Andere Adresse eingeben"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
