/**
 * Anbindung an die Google PageSpeed Insights API v5.
 *
 * Bewusst der einzige Weg zu Performance-Werten: eigene Messungen aus einer
 * Serverless-Funktion heraus wären wertlos, weil sie weder ein echtes Gerät
 * noch eine echte Leitung abbilden.
 *
 * Diese Aufrufe gehen an Google, nicht an die geprüfte Website — sie zählen
 * deshalb nicht gegen das Anfragebudget der geprüften Seite.
 */

export type Strategie = "mobile" | "desktop";

export type Metrik = {
  /** Anzeigewert, z. B. "2,4 s". */
  anzeige: string;
  /** Rohwert in der Einheit der Metrik (ms bzw. dimensionslos bei CLS). */
  wert: number;
  einordnung: "gut" | "mittel" | "schlecht";
};

export type PageSpeedErgebnis = {
  strategie: Strategie;
  /** Scores 0–100. null, wenn Lighthouse die Kategorie nicht liefern konnte. */
  performance: number | null;
  barrierefreiheit: number | null;
  bestPractices: number | null;
  seo: number | null;
  lcp: Metrik | null;
  cls: Metrik | null;
  inp: Metrik | null;
};

export type PageSpeedAntwort =
  | { ok: true; ergebnisse: PageSpeedErgebnis[] }
  | { ok: false; grund: string };

const ENDPUNKT = "https://www.googleapis.com/pagespeedonline/v5/runPagespeed";

/** Grenzwerte nach den Core-Web-Vitals-Vorgaben von Google. */
const GRENZWERTE = {
  lcp: { gut: 2500, mittel: 4000 },
  cls: { gut: 0.1, mittel: 0.25 },
  inp: { gut: 200, mittel: 500 },
} as const;

function einordnen(art: keyof typeof GRENZWERTE, wert: number): Metrik["einordnung"] {
  const grenze = GRENZWERTE[art];
  if (wert <= grenze.gut) return "gut";
  if (wert <= grenze.mittel) return "mittel";
  return "schlecht";
}

type LighthouseAudit = {
  numericValue?: number;
  displayValue?: string;
};

type LighthouseAntwort = {
  lighthouseResult?: {
    categories?: Record<string, { score?: number | null } | undefined>;
    audits?: Record<string, LighthouseAudit | undefined>;
  };
  error?: { message?: string };
};

function alsScore(kategorie: { score?: number | null } | undefined): number | null {
  const score = kategorie?.score;
  return typeof score === "number" ? Math.round(score * 100) : null;
}

function alsMetrik(
  audit: LighthouseAudit | undefined,
  art: keyof typeof GRENZWERTE,
): Metrik | null {
  const wert = audit?.numericValue;
  if (typeof wert !== "number" || Number.isNaN(wert)) return null;
  return {
    wert,
    anzeige:
      audit?.displayValue ??
      (art === "cls" ? wert.toFixed(2) : `${(wert / 1000).toFixed(1)} s`),
    einordnung: einordnen(art, wert),
  };
}

async function holeStrategie(
  url: string,
  strategie: Strategie,
  apiKey: string,
  signal: AbortSignal,
): Promise<PageSpeedErgebnis> {
  const anfrageUrl = new URL(ENDPUNKT);
  anfrageUrl.searchParams.set("url", url);
  anfrageUrl.searchParams.set("strategy", strategie);
  anfrageUrl.searchParams.set("key", apiKey);
  for (const kategorie of ["performance", "accessibility", "best-practices", "seo"]) {
    anfrageUrl.searchParams.append("category", kategorie);
  }

  const antwort = await fetch(anfrageUrl, { signal });
  if (!antwort.ok) {
    throw new Error(`PageSpeed API antwortete mit ${antwort.status}`);
  }

  const daten = (await antwort.json()) as LighthouseAntwort;
  if (daten.error !== undefined) {
    throw new Error(daten.error.message ?? "Unbekannter Fehler der PageSpeed-API");
  }

  const kategorien = daten.lighthouseResult?.categories ?? {};
  const audits = daten.lighthouseResult?.audits ?? {};

  return {
    strategie,
    performance: alsScore(kategorien.performance),
    barrierefreiheit: alsScore(kategorien.accessibility),
    bestPractices: alsScore(kategorien["best-practices"]),
    seo: alsScore(kategorien.seo),
    lcp: alsMetrik(audits["largest-contentful-paint"], "lcp"),
    cls: alsMetrik(audits["cumulative-layout-shift"], "cls"),
    // INP ersetzt FID. Lighthouse liefert im Labormodus ersatzweise TBT —
    // wir nehmen INP nur, wenn es tatsächlich da ist, und behaupten sonst nichts.
    inp: alsMetrik(
      audits["interaction-to-next-paint"] ?? audits["experimental-interaction-to-next-paint"],
      "inp",
    ),
  };
}

/**
 * Holt Mobil- und Desktop-Werte. Schlägt der Aufruf fehl oder fehlt der
 * API-Schlüssel, kommt `ok: false` zurück — das Modul macht daraus einen
 * "konnte nicht automatisch geprüft werden"-Befund statt eines Mangels.
 */
export async function holePageSpeed(url: string): Promise<PageSpeedAntwort> {
  const apiKey = process.env.PAGESPEED_API_KEY;

  if (typeof apiKey !== "string" || apiKey === "" || apiKey.includes("{{")) {
    return {
      ok: false,
      grund:
        "Es ist kein Schlüssel für die Google-PageSpeed-API hinterlegt (Umgebungsvariable PAGESPEED_API_KEY).",
    };
  }

  // Die API braucht pro Strategie gut und gerne 20 Sekunden. Beide parallel,
  // mit hartem Deckel, damit die Route nicht in ihr eigenes Limit läuft.
  const abbruch = AbortSignal.timeout(45_000);

  try {
    const ergebnisse = await Promise.all(
      (["mobile", "desktop"] as const).map((strategie) =>
        holeStrategie(url, strategie, apiKey, abbruch),
      ),
    );
    return { ok: true, ergebnisse };
  } catch (fehler) {
    const meldung = fehler instanceof Error ? fehler.message : String(fehler);
    return {
      ok: false,
      grund:
        meldung.includes("aborted") || meldung.includes("timeout")
          ? "Die Google-PageSpeed-API hat nicht rechtzeitig geantwortet."
          : `Die Google-PageSpeed-API war nicht erreichbar: ${meldung}`,
    };
  }
}
