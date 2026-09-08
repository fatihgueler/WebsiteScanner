import type { Aufwand, Befund } from "@/lib/types";

/**
 * Kleine Helfer, damit die Module lesbar bleiben und der Status nie versehentlich
 * falsch gesetzt wird.
 */

export function gut(
  id: string,
  titel: string,
  klartext: string,
  technisch: string,
): Befund {
  return { id, titel, status: "gut", klartext, technisch };
}

export function verbesserbar(
  id: string,
  titel: string,
  klartext: string,
  technisch: string,
  aufwand: Aufwand,
): Befund {
  return { id, titel, status: "verbesserbar", klartext, technisch, aufwand };
}

export function kritisch(
  id: string,
  titel: string,
  klartext: string,
  technisch: string,
  aufwand: Aufwand,
): Befund {
  return { id, titel, status: "kritisch", klartext, technisch, aufwand };
}

/**
 * Für alles, was sich nicht sicher feststellen ließ. Ausdrücklich KEIN Mangel:
 * dieser Status geht nicht in die Bewertung ein. Lieber ehrlich "nicht geprüft"
 * als ein behaupteter Fehler, der keiner ist.
 */
export function ungeprueft(
  id: string,
  titel: string,
  klartext: string,
  technisch: string,
): Befund {
  return {
    id,
    titel,
    status: "unklar",
    klartext,
    technisch,
  };
}

/** Kurzform für den häufigsten Ungeprüft-Fall: Ressource nicht abrufbar. */
export function nichtAbrufbar(id: string, titel: string, was: string): Befund {
  return ungeprueft(
    id,
    titel,
    `Das konnte beim automatischen Durchlauf nicht sicher festgestellt werden. Ein kurzer Blick von Hand klärt es.`,
    `${was} war innerhalb des Anfragebudgets oder des Zeitlimits nicht abrufbar. Der Punkt wurde deshalb nicht bewertet und fließt nicht in den Score ein.`,
  );
}
