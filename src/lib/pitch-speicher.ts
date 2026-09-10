import { randomUUID } from "node:crypto";
import { Redis } from "@upstash/redis";
import type { Report } from "@/lib/types";

/**
 * Ablage der gespeicherten Prüfungen für den Pitch-Modus.
 *
 * Nutzt das bereits vorhandene Upstash-Redis — keine zusätzliche Datenbank und
 * keine neue Abhängigkeit. Jede Prüfung bekommt ein Ablaufdatum, damit die
 * Ablage nicht unbegrenzt wächst und alte Kundendaten von selbst verschwinden.
 *
 * Der öffentliche Check bleibt davon unberührt: Dort wird weiterhin nichts
 * gespeichert. Hier landet nur, was der Betreiber bewusst sichert.
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

/** Gesicherte Prüfungen laufen nach 180 Tagen ab. */
const ABLAUF_SEKUNDEN = 180 * 24 * 60 * 60;

const EINTRAG_PREFIX = "websitecheck:pitch:eintrag:";
const INDEX_SCHLUESSEL = "websitecheck:pitch:index";

export type PitchEintrag = {
  id: string;
  /** Name des Betriebs, frei vergeben. */
  kunde: string;
  /** Freie Notiz für das Gespräch. */
  notiz: string;
  /** ISO-Zeitstempel der Sicherung. */
  gesichertAm: string;
  report: Report;
};

/** Kurzfassung für die Übersichtsliste — ohne den vollen Report. */
export type PitchUebersicht = {
  id: string;
  kunde: string;
  notiz: string;
  gesichertAm: string;
  gepruefteUrl: string;
  gesamtscore: number;
  anzahlMassnahmen: number;
  anzahlKritisch: number;
};

export const speicherAktiv = redis !== null;

export async function sichere(
  kunde: string,
  notiz: string,
  report: Report,
): Promise<string | null> {
  if (redis === null) return null;

  const id = randomUUID();
  const eintrag: PitchEintrag = {
    id,
    kunde: kunde.trim(),
    notiz: notiz.trim(),
    gesichertAm: new Date().toISOString(),
    report,
  };

  try {
    await redis.set(`${EINTRAG_PREFIX}${id}`, eintrag, { ex: ABLAUF_SEKUNDEN });
    // Der Index hält nur die Reihenfolge. Ein fehlender Eintrag im Index wäre
    // ärgerlich, ein verwaister Index-Eintrag ist harmlos — deshalb erst der
    // Eintrag, dann der Index.
    await redis.zadd(INDEX_SCHLUESSEL, { score: Date.now(), member: id });
    return id;
  } catch (fehler) {
    console.error("Pitch-Eintrag konnte nicht gesichert werden:", fehler);
    return null;
  }
}

export async function holeEintrag(id: string): Promise<PitchEintrag | null> {
  if (redis === null) return null;
  try {
    return (await redis.get<PitchEintrag>(`${EINTRAG_PREFIX}${id}`)) ?? null;
  } catch (fehler) {
    console.error("Pitch-Eintrag nicht lesbar:", fehler);
    return null;
  }
}

export async function listeEintraege(): Promise<PitchUebersicht[]> {
  if (redis === null) return [];

  try {
    // Neueste zuerst.
    const ids = await redis.zrange<string[]>(INDEX_SCHLUESSEL, 0, 199, { rev: true });
    if (ids.length === 0) return [];

    const eintraege = await Promise.all(ids.map((id) => holeEintrag(id)));
    const uebersicht: PitchUebersicht[] = [];
    const abgelaufen: string[] = [];

    for (let i = 0; i < ids.length; i += 1) {
      const eintrag = eintraege[i];
      if (eintrag === null) {
        // Eintrag ist abgelaufen, der Index hinkt hinterher.
        abgelaufen.push(ids[i]);
        continue;
      }
      uebersicht.push({
        id: eintrag.id,
        kunde: eintrag.kunde,
        notiz: eintrag.notiz,
        gesichertAm: eintrag.gesichertAm,
        gepruefteUrl: eintrag.report.gepruefteUrl,
        gesamtscore: eintrag.report.gesamtscore,
        anzahlMassnahmen: eintrag.report.massnahmen.length,
        anzahlKritisch: eintrag.report.massnahmen.filter((m) => m.status === "kritisch")
          .length,
      });
    }

    if (abgelaufen.length > 0) {
      await redis.zrem(INDEX_SCHLUESSEL, ...abgelaufen);
    }

    return uebersicht;
  } catch (fehler) {
    console.error("Pitch-Liste nicht lesbar:", fehler);
    return [];
  }
}

export async function loesche(id: string): Promise<boolean> {
  if (redis === null) return false;
  try {
    await redis.del(`${EINTRAG_PREFIX}${id}`);
    await redis.zrem(INDEX_SCHLUESSEL, id);
    return true;
  } catch (fehler) {
    console.error("Pitch-Eintrag nicht löschbar:", fehler);
    return false;
  }
}
