import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

/**
 * Zugangsschutz für den Pitch-Modus.
 *
 * Bewusst kein Anmeldesystem und keine Nutzerverwaltung: Es gibt genau einen
 * Zugang, den des Betreibers. Passwort und Signaturschlüssel stehen in
 * Umgebungsvariablen, die Sitzung steckt in einem signierten httpOnly-Cookie.
 * Damit kommt keine neue Abhängigkeit und kein neuer Dienst dazu — node:crypto
 * ist eingebaut.
 *
 * Das schützt den Bereich vor Neugierigen und Suchmaschinen. Es ist kein
 * Schutz gegen einen entschlossenen Angreifer mit Zugriff auf den Server.
 */

const COOKIE_NAME = "guelerdev_pitch";
/** Sitzungsdauer: 30 Tage. Danach ist erneut das Passwort fällig. */
const GUELTIGKEIT_SEKUNDEN = 30 * 24 * 60 * 60;

function signaturSchluessel(): string | null {
  const wert = process.env.PITCH_SESSION_SECRET;
  if (typeof wert !== "string" || wert.length < 16 || wert.includes("{{")) return null;
  return wert;
}

function passwort(): string | null {
  const wert = process.env.PITCH_PASSWORT;
  if (typeof wert !== "string" || wert === "" || wert.includes("{{")) return null;
  return wert;
}

/**
 * Ist der Pitch-Modus überhaupt eingerichtet? Ohne Passwort UND
 * Signaturschlüssel bleibt der Bereich vollständig gesperrt — sonst wäre er
 * bei einem vergessenen Wert offen für jeden.
 */
export function pitchEingerichtet(): boolean {
  return passwort() !== null && signaturSchluessel() !== null;
}

/** Zeitkonstanter Vergleich, damit sich das Passwort nicht erraten lässt. */
function gleich(a: string, b: string): boolean {
  const pufferA = Buffer.from(a, "utf8");
  const pufferB = Buffer.from(b, "utf8");
  if (pufferA.length !== pufferB.length) {
    // timingSafeEqual verlangt gleiche Länge. Trotzdem einen Vergleich
    // durchführen, damit die Laufzeit nicht von der Länge abhängt.
    timingSafeEqual(pufferA, pufferA);
    return false;
  }
  return timingSafeEqual(pufferA, pufferB);
}

export function passwortStimmt(eingabe: string): boolean {
  const erwartet = passwort();
  if (erwartet === null) return false;
  return gleich(eingabe, erwartet);
}

function signiere(ablaufMs: number, schluessel: string): string {
  return createHmac("sha256", schluessel).update(String(ablaufMs)).digest("hex");
}

/** Baut den Cookie-Wert: Ablaufzeitpunkt plus Signatur darüber. */
export function baueSitzungsWert(): { wert: string; maxAge: number } | null {
  const schluessel = signaturSchluessel();
  if (schluessel === null) return null;

  const ablaufMs = Date.now() + GUELTIGKEIT_SEKUNDEN * 1000;
  return {
    wert: `${ablaufMs}.${signiere(ablaufMs, schluessel)}`,
    maxAge: GUELTIGKEIT_SEKUNDEN,
  };
}

function wertIstGueltig(wert: string): boolean {
  const schluessel = signaturSchluessel();
  if (schluessel === null) return false;

  const [ablaufText, signatur] = wert.split(".");
  if (ablaufText === undefined || signatur === undefined) return false;

  const ablaufMs = Number(ablaufText);
  if (!Number.isFinite(ablaufMs) || ablaufMs < Date.now()) return false;

  return gleich(signatur, signiere(ablaufMs, schluessel));
}

/** Prüft die Sitzung des aktuellen Aufrufs. */
export async function istAngemeldet(): Promise<boolean> {
  if (!pitchEingerichtet()) return false;
  const speicher = await cookies();
  const wert = speicher.get(COOKIE_NAME)?.value;
  return typeof wert === "string" && wertIstGueltig(wert);
}

export const PITCH_COOKIE = COOKIE_NAME;
