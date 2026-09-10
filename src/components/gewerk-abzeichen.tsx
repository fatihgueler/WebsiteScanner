import { FileText, Paintbrush, Scale, Server, Code2 } from "lucide-react";
import type { Aufwand, Gewerk } from "@/lib/types";

/**
 * Kleines Abzeichen, das zeigt, wer eine Maßnahme umsetzt. Im Gespräch ist das
 * die wichtigste Information nach dem Befund selbst: Serverarbeit, Codearbeit
 * oder etwas, das der Betrieb selbst beisteuern muss.
 *
 * Wie bei den Statusfarben gilt auch hier: nie die Farbe allein — jedes Gewerk
 * hat ein eigenes Symbol und einen ausgeschriebenen Namen.
 */
const GEWERK_ANZEIGE: Record<Gewerk, { icon: typeof Server; kurz: string }> = {
  backend: { icon: Server, kurz: "Server" },
  frontend: { icon: Code2, kurz: "Code" },
  design: { icon: Paintbrush, kurz: "Gestaltung" },
  inhalt: { icon: FileText, kurz: "Inhalt" },
  recht: { icon: Scale, kurz: "Recht" },
};

const AUFWAND_TEXT: Record<Aufwand, string> = {
  klein: "kleiner Aufwand",
  mittel: "mittlerer Aufwand",
  groß: "größerer Aufwand",
};

export function GewerkAbzeichen({
  gewerk,
  aufwand,
}: {
  gewerk: Gewerk;
  aufwand?: Aufwand;
}) {
  const { icon: Icon, kurz } = GEWERK_ANZEIGE[gewerk];

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-2.5 py-1 text-xs text-muted-foreground">
      <Icon className="size-3.5 shrink-0" aria-hidden="true" />
      <span className="font-medium text-foreground">{kurz}</span>
      {aufwand !== undefined && (
        <>
          <span aria-hidden="true">·</span>
          {AUFWAND_TEXT[aufwand]}
        </>
      )}
    </span>
  );
}

export { GEWERK_ANZEIGE };
