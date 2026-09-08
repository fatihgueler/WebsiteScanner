import { AlertTriangle, CheckCircle2, HelpCircle, Wrench } from "lucide-react";
import type { Befund, Status } from "@/lib/types";

/**
 * Statusdarstellung. Wichtig: Die Farbe ist nie das einzige Signal — jeder
 * Status hat zusätzlich ein eigenes Symbol und eine ausgeschriebene
 * Bezeichnung. Sonst wäre der Report für farbfehlsichtige Leser (und im
 * Schwarz-Weiß-Ausdruck) nicht zu entschlüsseln.
 */
const STATUS_DARSTELLUNG: Record<
  Status,
  { icon: typeof CheckCircle2; label: string; farbe: string; hintergrund: string }
> = {
  gut: {
    icon: CheckCircle2,
    label: "In Ordnung",
    farbe: "text-gut",
    hintergrund: "bg-gut-soft border-gut/25",
  },
  kritisch: {
    icon: AlertTriangle,
    label: "Dringend",
    farbe: "text-kritisch",
    hintergrund: "bg-kritisch-soft border-kritisch/25",
  },
  verbesserbar: {
    icon: Wrench,
    label: "Lohnt sich",
    farbe: "text-verbesserbar",
    hintergrund: "bg-verbesserbar-soft border-verbesserbar/25",
  },
  unklar: {
    icon: HelpCircle,
    label: "Nicht automatisch prüfbar",
    farbe: "text-unklar",
    hintergrund: "bg-unklar-soft border-unklar/25",
  },
};

const AUFWAND_TEXT = {
  klein: "Kleiner Aufwand",
  mittel: "Mittlerer Aufwand",
  groß: "Größerer Aufwand",
} as const;

type BefundKarteProps = {
  befund: Befund;
  /** true = technische Fassung anzeigen statt Klartext. */
  technischeAnsicht: boolean;
  /** In der Druckansicht sind beide Fassungen sichtbar. */
  fuerDruck?: boolean;
};

export function BefundKarte({
  befund,
  technischeAnsicht,
  fuerDruck = false,
}: BefundKarteProps) {
  const darstellung = STATUS_DARSTELLUNG[befund.status];
  const Icon = darstellung.icon;

  return (
    <article
      className={`print-block rounded-lg border ${darstellung.hintergrund} p-4 sm:p-5`}
    >
      <header className="flex items-start gap-3">
        <Icon
          className={`mt-0.5 size-5 shrink-0 ${darstellung.farbe}`}
          aria-hidden="true"
        />
        <div className="min-w-0 flex-1">
          <h4 className="font-heading text-base font-medium leading-snug text-foreground">
            {befund.titel}
          </h4>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
            <span className={`font-medium ${darstellung.farbe}`}>
              {darstellung.label}
            </span>
            {befund.aufwand !== undefined && (
              <>
                <span className="text-border" aria-hidden="true">
                  ·
                </span>
                <span className="text-muted-foreground">
                  {AUFWAND_TEXT[befund.aufwand]}
                </span>
              </>
            )}
          </p>
        </div>
      </header>

      <div className="mt-3 pl-8">
        {fuerDruck ? (
          <>
            <p className="text-[0.95rem] leading-relaxed text-foreground">
              {befund.klartext}
            </p>
            <p className="mt-2 whitespace-pre-line font-mono text-xs leading-relaxed text-muted-foreground">
              {befund.technisch}
            </p>
          </>
        ) : technischeAnsicht ? (
          <p className="whitespace-pre-line font-mono text-[0.8rem] leading-relaxed text-foreground">
            {befund.technisch}
          </p>
        ) : (
          <p className="text-[0.95rem] leading-relaxed text-foreground">
            {befund.klartext}
          </p>
        )}
      </div>
    </article>
  );
}
