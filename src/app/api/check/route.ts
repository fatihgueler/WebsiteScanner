import { NextResponse } from "next/server";
import { AbrufFehler } from "@/lib/http-client";
import { sammleKontext } from "@/lib/kontext";
import { MODULE } from "@/lib/module";
import { baueReport } from "@/lib/scoring";
import { SsrfFehler } from "@/lib/ssrf";
import {
  type Befund,
  type CheckAntwort,
  type CheckFehler,
  type KategorieId,
  KATEGORIE_DEFINITION,
} from "@/lib/types";
import { holeAusCache, legeInCache, pruefeRateLimit } from "@/lib/upstash";
import { checkAnfrageSchema } from "@/lib/url-schema";

// node:dns, node:https und node:tls sind hier Pflicht — der SSRF-Schutz und die
// Zertifikatsprüfung gehen ohne sie nicht.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
/** Die PageSpeed-API braucht Zeit; Vercel-Standard von 10 s reicht nicht. */
export const maxDuration = 60;

function fehler(
  code: CheckFehler["code"],
  meldung: string,
  status: number,
  wiederholenIn?: number,
): NextResponse<CheckFehler> {
  return NextResponse.json({ fehler: true, code, meldung, wiederholenIn }, { status });
}

/** Ermittelt die aufrufende IP für das Rate-Limit. */
function ermittleIp(anfrage: Request): string {
  const weitergeleitet = anfrage.headers.get("x-forwarded-for");
  if (weitergeleitet !== null && weitergeleitet.trim() !== "") {
    // Der erste Eintrag ist der ursprüngliche Client.
    return weitergeleitet.split(",")[0].trim();
  }
  return anfrage.headers.get("x-real-ip")?.trim() ?? "unbekannt";
}

export async function POST(anfrage: Request): Promise<NextResponse<CheckAntwort>> {
  let rohdaten: unknown;
  try {
    rohdaten = await anfrage.json();
  } catch {
    return fehler("ungueltige_url", "Die Anfrage war unvollständig. Bitte laden Sie die Seite neu.", 400);
  }

  const geparst = checkAnfrageSchema.safeParse(rohdaten);
  if (!geparst.success) {
    return fehler(
      "ungueltige_url",
      geparst.error.issues[0]?.message ??
        "Das sieht nicht nach einer Internetadresse aus. Beispiel: meinbetrieb.de",
      400,
    );
  }

  const { url } = geparst.data;

  // Rate-Limit vor allem anderen — auch vor dem Cache, damit sich das Limit
  // nicht durch wiederholte Abfragen derselben URL aushebeln lässt.
  const limit = await pruefeRateLimit(ermittleIp(anfrage));
  if (!limit.erlaubt) {
    const minuten = Math.max(1, Math.ceil(limit.wiederholenIn / 60));
    return fehler(
      "rate_limit",
      `Sie haben das Prüflimit erreicht (8 Prüfungen pro Stunde). In etwa ${minuten} ${minuten === 1 ? "Minute" : "Minuten"} geht es weiter.`,
      429,
      limit.wiederholenIn,
    );
  }

  const zwischengespeichert = await holeAusCache(url);
  if (zwischengespeichert !== null) {
    return NextResponse.json({ ...zwischengespeichert, ausCache: true });
  }

  try {
    const kontext = await sammleKontext(url);

    const befundeProKategorie = Object.fromEntries(
      KATEGORIE_DEFINITION.map((definition) => [definition.id, [] as Befund[]]),
    ) as Record<KategorieId, Befund[]>;
    const manuelleHinweise: string[] = [];

    for (const modul of MODULE) {
      try {
        const ergebnis = await modul.pruefe(kontext);
        befundeProKategorie[modul.id].push(...ergebnis.befunde);
        if (ergebnis.manuelleHinweise !== undefined) {
          manuelleHinweise.push(...ergebnis.manuelleHinweise);
        }
      } catch (modulFehler) {
        // Ein einzelnes Modul darf den ganzen Report nicht mitreißen. Der
        // Nutzer bekommt lieber fünf Kategorien als eine Fehlerseite.
        console.error(`Modul ${modul.id} fehlgeschlagen:`, modulFehler);
      }
    }

    const report = baueReport({
      eingabeUrl: url,
      gepruefteUrl: kontext.seite.url,
      befundeProKategorie,
      manuelleHinweise,
      ausCache: false,
    });

    await legeInCache(url, report);

    return NextResponse.json(report);
  } catch (unbekannt) {
    if (unbekannt instanceof SsrfFehler) {
      return fehler("ungueltige_url", unbekannt.klartext, 400);
    }

    if (unbekannt instanceof AbrufFehler) {
      if (unbekannt.art === "zeitueberschreitung") {
        return fehler("zeitueberschreitung", unbekannt.klartext, 504);
      }
      return fehler("nicht_erreichbar", unbekannt.klartext, 502);
    }

    console.error("Unerwarteter Fehler in /api/check:", unbekannt);
    return fehler(
      "intern",
      "Bei der Prüfung ist etwas schiefgelaufen. Bitte versuchen Sie es in einem Moment noch einmal.",
      500,
    );
  }
}
