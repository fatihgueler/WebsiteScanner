import {
  type Befund,
  type Kategorie,
  KATEGORIE_DEFINITION,
  type KategorieId,
  type Report,
} from "@/lib/types";

/**
 * Bewertung. Jeder bewertbare Befund zählt gleich viel; die Schwere steckt im
 * Status, nicht in einem versteckten Gewicht. Befunde mit Status `unklar`
 * werden komplett übergangen — ein nicht geprüfter Punkt darf den Score weder
 * heben noch senken.
 */
const PUNKTE: Record<Befund["status"], number | null> = {
  gut: 1,
  verbesserbar: 0.5,
  kritisch: 0,
  unklar: null,
};

export function berechneKategorieScore(befunde: Befund[]): number | null {
  const bewertbare = befunde
    .map((befund) => PUNKTE[befund.status])
    .filter((punkte): punkte is number => punkte !== null);

  if (bewertbare.length === 0) return null;

  const summe = bewertbare.reduce((a, b) => a + b, 0);
  return Math.round((summe / bewertbare.length) * 100);
}

/**
 * Gesamtscore nach den festgelegten Gewichten: Recht 25 %, Technik 20 %,
 * Performance 20 %, GEO 15 %, SEO 15 %, Inhalt 5 %. Kategorien ohne bewertbare
 * Befunde fallen heraus, die übrigen Gewichte werden entsprechend normiert.
 */
export function berechneGesamtscore(kategorien: Kategorie[]): number {
  const bewertbare = kategorien.filter((kategorie) => kategorie.score !== null);
  if (bewertbare.length === 0) return 0;

  const gewichtSumme = bewertbare.reduce((summe, k) => summe + k.gewicht, 0);
  if (gewichtSumme === 0) return 0;

  const gewichtet = bewertbare.reduce(
    (summe, k) => summe + (k.score as number) * k.gewicht,
    0,
  );
  return Math.round(gewichtet / gewichtSumme);
}

export function zaehle(kategorien: Kategorie[], status: Befund["status"]): number {
  return kategorien.reduce(
    (summe, kategorie) =>
      summe + kategorie.befunde.filter((befund) => befund.status === status).length,
    0,
  );
}

/**
 * Ein Satz über dem Report. Beraterton: erst einordnen, dann benennen, was
 * ansteht. Nie dramatisieren — und nie so tun, als wäre alles in Ordnung.
 */
export function formuliereZusammenfassung(
  gesamtscore: number,
  kategorien: Kategorie[],
): string {
  const kritische = zaehle(kategorien, "kritisch");
  const verbesserbare = zaehle(kategorien, "verbesserbar");
  const gute = zaehle(kategorien, "gut");

  if (gute + kritische + verbesserbare === 0) {
    return "Zu dieser Seite ließ sich kein einziger Punkt sicher bewerten. Bitte prüfen Sie die Adresse oder melden Sie sich — wir schauen es uns von Hand an.";
  }

  const lobTeil =
    gute > 0
      ? `${gute} von ${gute + kritische + verbesserbare} geprüften Punkten sind bereits in Ordnung`
      : "Bei den geprüften Punkten gibt es noch keinen, der ohne Anmerkung durchgeht";

  if (kritische === 0 && verbesserbare === 0) {
    return `Sehr saubere Website — ${lobTeil}. Wir haben nichts gefunden, das dringend geändert werden müsste.`;
  }

  if (kritische === 0) {
    return `Solide Grundlage: ${lobTeil}, und nichts davon ist kritisch. ${verbesserbare === 1 ? "Ein Punkt" : `${verbesserbare} Punkte`} bringen zusätzlich etwas.`;
  }

  const dringlichkeit =
    gesamtscore >= 70
      ? "Insgesamt steht die Seite gut da"
      : gesamtscore >= 45
        ? "Die Seite hat eine brauchbare Basis"
        : "Bei der Seite ist einiges liegen geblieben";

  return `${dringlichkeit} — ${lobTeil}. ${kritische === 1 ? "Ein Punkt sollte" : `${kritische} Punkte sollten`} zeitnah angegangen werden, ${verbesserbare === 1 ? "ein weiterer lohnt" : `${verbesserbare} weitere lohnen`} sich.`;
}

/** Setzt die Befunde der Module zu einem fertigen Report zusammen. */
export function baueReport(input: {
  eingabeUrl: string;
  gepruefteUrl: string;
  befundeProKategorie: Record<KategorieId, Befund[]>;
  manuelleHinweise: string[];
  ausCache: boolean;
}): Report {
  const kategorien: Kategorie[] = KATEGORIE_DEFINITION.map((definition) => {
    const befunde = input.befundeProKategorie[definition.id] ?? [];
    return {
      id: definition.id,
      titel: definition.titel,
      beschreibung: definition.beschreibung,
      gewicht: definition.gewicht,
      score: berechneKategorieScore(befunde),
      befunde,
    };
  });

  const gesamtscore = berechneGesamtscore(kategorien);

  return {
    eingabeUrl: input.eingabeUrl,
    gepruefteUrl: input.gepruefteUrl,
    zeitpunkt: new Date().toISOString(),
    gesamtscore,
    zusammenfassung: formuliereZusammenfassung(gesamtscore, kategorien),
    kategorien,
    manuelleHinweise: input.manuelleHinweise,
    ausCache: input.ausCache,
  };
}
