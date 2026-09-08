/** Bewertung eines einzelnen Befunds. */
export type Status = "kritisch" | "verbesserbar" | "gut" | "unklar";

/** Geschätzter Aufwand für die Behebung. Nur bei kritisch und verbesserbar. */
export type Aufwand = "klein" | "mittel" | "groß";

export type KategorieId =
  | "technik"
  | "recht"
  | "performance"
  | "seo"
  | "geo"
  | "inhalt";

export type Befund = {
  /** Stabile Kennung, damit React-Listen und Anker eindeutig bleiben. */
  id: string;
  /** Knapp, in Alltagssprache. Kein Fachbegriff im Titel. */
  titel: string;
  status: Status;
  /**
   * Höchstens zwei Sätze, kein Fachjargon. Erklärt die Auswirkung fürs
   * Geschäft, nicht die Technik. Bei `gut`: konkret loben.
   */
  klartext: string;
  /** Fachdetails inklusive gefundener Werte. In der UI eingeklappt. */
  technisch: string;
  /** Entfällt bei `gut` und `unklar`. */
  aufwand?: Aufwand;
};

export type Kategorie = {
  id: KategorieId;
  /** Anzeigename, z. B. "Recht & DSGVO". */
  titel: string;
  /** Ein Satz, was die Kategorie überhaupt bedeutet. */
  beschreibung: string;
  /** Anteil am Gesamtscore in Prozent. */
  gewicht: number;
  /** 0–100. `null`, wenn nichts Bewertbares geprüft werden konnte. */
  score: number | null;
  befunde: Befund[];
};

export type Report = {
  /** Die tatsächlich geprüfte Adresse nach allen Weiterleitungen. */
  gepruefteUrl: string;
  /** Die Adresse, die der Nutzer eingegeben hat. */
  eingabeUrl: string;
  /** ISO-Zeitstempel der Prüfung. */
  zeitpunkt: string;
  /** 0–100, gewichtet über alle Kategorien. */
  gesamtscore: number;
  /** Ein zusammenfassender Satz über dem Report. */
  zusammenfassung: string;
  kategorien: Kategorie[];
  /**
   * Hinweise auf Dinge, die sich grundsätzlich nicht automatisch prüfen
   * lassen (z. B. Google-Unternehmensprofil).
   */
  manuelleHinweise: string[];
  /** true, wenn das Ergebnis aus dem 24-Stunden-Cache kam. */
  ausCache: boolean;
};

/** Fehlerarten, die die Oberfläche unterschiedlich behandeln muss. */
export type FehlerCode =
  | "ungueltige_url"
  | "nicht_erreichbar"
  | "zeitueberschreitung"
  | "rate_limit"
  | "kein_html"
  | "intern";

export type CheckFehler = {
  fehler: true;
  code: FehlerCode;
  /** Verständliche Meldung für die Zielgruppe. Nie ein Stacktrace. */
  meldung: string;
  /** Sekunden bis zum nächsten Versuch. Nur bei rate_limit. */
  wiederholenIn?: number;
};

export type CheckAntwort = Report | CheckFehler;

export function istFehler(antwort: CheckAntwort): antwort is CheckFehler {
  return (antwort as CheckFehler).fehler === true;
}

/** Reihenfolge und Gewichtung sind im Auftrag festgelegt. */
export const KATEGORIE_DEFINITION: ReadonlyArray<{
  id: KategorieId;
  titel: string;
  beschreibung: string;
  gewicht: number;
}> = [
  {
    id: "recht",
    titel: "Recht & DSGVO",
    beschreibung:
      "Pflichtangaben und der Umgang mit Besucherdaten — hier drohen Abmahnungen.",
    gewicht: 25,
  },
  {
    id: "technik",
    titel: "Technik & Sicherheit",
    beschreibung:
      "Verschlüsselung, Erreichbarkeit und der Schutz Ihrer Seite vor Missbrauch.",
    gewicht: 20,
  },
  {
    id: "performance",
    titel: "Performance & Darstellung",
    beschreibung:
      "Wie schnell und stabil Ihre Seite lädt — besonders auf dem Handy.",
    gewicht: 20,
  },
  {
    id: "geo",
    titel: "Sichtbarkeit in KI-Suchen",
    beschreibung:
      "Ob ChatGPT, Claude und Perplexity Ihren Betrieb finden und empfehlen können.",
    gewicht: 15,
  },
  {
    id: "seo",
    titel: "Sichtbarkeit bei Google",
    beschreibung:
      "Ob Suchmaschinen verstehen, worum es auf Ihrer Seite geht.",
    gewicht: 15,
  },
  {
    id: "inhalt",
    titel: "Inhalt & Vertrauen",
    beschreibung:
      "Ob Besucher schnell finden, was sie suchen, und Ihnen glauben.",
    gewicht: 5,
  },
];
