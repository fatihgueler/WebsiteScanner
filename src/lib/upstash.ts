import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import type { Report } from "@/lib/types";

/**
 * Rate-Limit und Ergebnis-Cache. Beides ist optional: fehlen die Upstash-Werte
 * (z. B. lokal beim Entwickeln), läuft die App weiter — ohne Limit und ohne
 * Cache. Ein fehlender Schlüssel darf niemals den Check blockieren.
 */

const url = process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN;

const istKonfiguriert =
  typeof url === "string" &&
  url.startsWith("http") &&
  typeof token === "string" &&
  token.length > 0 &&
  !url.includes("{{");

const redis = istKonfiguriert ? new Redis({ url: url as string, token: token as string }) : null;

/** 8 Prüfungen pro IP pro Stunde — so steht es im Auftrag. */
export const PRUEFUNGEN_PRO_STUNDE = 8;

/** Ergebnisse werden 24 Stunden je URL zwischengespeichert. */
const CACHE_SEKUNDEN = 24 * 60 * 60;

const ratelimit =
  redis !== null
    ? new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(PRUEFUNGEN_PRO_STUNDE, "1 h"),
        prefix: "websitecheck:rl",
        analytics: false,
      })
    : null;

export type LimitErgebnis = {
  erlaubt: boolean;
  uebrig: number;
  /** Sekunden bis zum Zurücksetzen des Fensters. */
  wiederholenIn: number;
};

export async function pruefeRateLimit(kennung: string): Promise<LimitErgebnis> {
  if (ratelimit === null) {
    return { erlaubt: true, uebrig: PRUEFUNGEN_PRO_STUNDE, wiederholenIn: 0 };
  }

  try {
    const { success, remaining, reset } = await ratelimit.limit(kennung);
    return {
      erlaubt: success,
      uebrig: remaining,
      wiederholenIn: Math.max(0, Math.ceil((reset - Date.now()) / 1000)),
    };
  } catch (fehler) {
    // Redis nicht erreichbar: lieber prüfen lassen als den Nutzer aussperren.
    // Aber nicht stillschweigend — sonst verschwindet das Rate-Limit im
    // Betrieb unbemerkt und niemand erfährt davon.
    console.error("Rate-Limit nicht auswertbar, Anfrage wird durchgelassen:", fehler);
    return { erlaubt: true, uebrig: PRUEFUNGEN_PRO_STUNDE, wiederholenIn: 0 };
  }
}

function cacheSchluessel(url: string): string {
  return `websitecheck:report:${url.toLowerCase()}`;
}

export async function holeAusCache(url: string): Promise<Report | null> {
  if (redis === null) return null;
  try {
    const treffer = await redis.get<Report>(cacheSchluessel(url));
    return treffer ?? null;
  } catch (fehler) {
    console.error("Cache nicht lesbar, Prüfung läuft neu:", fehler);
    return null;
  }
}

export async function legeInCache(url: string, report: Report): Promise<void> {
  if (redis === null) return;
  try {
    await redis.set(cacheSchluessel(url), report, { ex: CACHE_SEKUNDEN });
  } catch (fehler) {
    // Ein fehlgeschlagener Cache-Schreibvorgang ist kein Grund, dem Nutzer
    // sein fertiges Ergebnis vorzuenthalten.
    console.error("Cache nicht beschreibbar:", fehler);
  }
}

export const cacheAktiv = redis !== null;
