import type { PruefKontext } from "@/lib/kontext";
import type { Befund, KategorieId } from "@/lib/types";

export type ModulErgebnis = {
  befunde: Befund[];
  /** Hinweise, die sich grundsätzlich nicht automatisch prüfen lassen. */
  manuelleHinweise?: string[];
};

export type PruefModul = {
  id: KategorieId;
  pruefe: (kontext: PruefKontext) => ModulErgebnis | Promise<ModulErgebnis>;
};

/**
 * Registrierte Prüfmodule. Die Reihenfolge bestimmt, in welcher Reihenfolge sie
 * laufen — die Anzeigereihenfolge im Report steuert KATEGORIE_DEFINITION.
 * Wird in den Meilensteinen 3 bis 5 gefüllt.
 */
export const MODULE: PruefModul[] = [];
