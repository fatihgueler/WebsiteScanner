import type { PruefKontext } from "@/lib/kontext";
import type { Befund, KategorieId } from "@/lib/types";
import { performanceModul } from "@/lib/module/performance";
import { rechtModul } from "@/lib/module/recht";
import { seoModul } from "@/lib/module/seo";
import { technikModul } from "@/lib/module/technik";

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
 */
export const MODULE: PruefModul[] = [
  technikModul,
  rechtModul,
  performanceModul,
  seoModul,
];
