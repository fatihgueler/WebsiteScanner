import { z } from "zod";

/**
 * Nutzer tippen "meinbetrieb.de", nicht "https://meinbetrieb.de". Wir ergänzen
 * das Schema still, statt eine Fehlermeldung über ein Detail auszuspielen, das
 * die Zielgruppe zu Recht nicht interessiert.
 */
export function normalisiereUrl(eingabe: string): string {
  const roh = eingabe.trim();
  if (roh === "") return roh;
  if (/^https?:\/\//i.test(roh)) return roh;
  // Ein anderes Protokoll (ftp:, javascript:, file:) lassen wir unangetastet
  // durchlaufen, damit die Validierung es sichtbar ablehnt.
  if (/^[a-z][a-z0-9+.-]*:/i.test(roh)) return roh;
  return `https://${roh}`;
}

const VERBOTENE_HOSTNAMEN = new Set([
  "localhost",
  "localhost.localdomain",
  "ip6-localhost",
  "ip6-loopback",
]);

export const urlSchema = z
  .string()
  .trim()
  .min(1, { message: "Bitte geben Sie die Adresse Ihrer Website ein." })
  .transform(normalisiereUrl)
  .superRefine((wert, ctx) => {
    let url: URL;
    try {
      url = new URL(wert);
    } catch {
      ctx.addIssue({
        code: "custom",
        message:
          "Das sieht nicht nach einer Internetadresse aus. Beispiel: meinbetrieb.de",
      });
      return;
    }

    if (url.protocol !== "http:" && url.protocol !== "https:") {
      ctx.addIssue({
        code: "custom",
        message: "Es lassen sich nur Adressen prüfen, die mit http oder https beginnen.",
      });
      return;
    }

    const host = url.hostname.toLowerCase().replace(/\.$/, "");

    if (VERBOTENE_HOSTNAMEN.has(host) || host.endsWith(".localhost")) {
      ctx.addIssue({
        code: "custom",
        message:
          "Diese Adresse zeigt auf den eigenen Rechner und ist von außen nicht erreichbar. Bitte geben Sie die öffentliche Adresse Ihrer Website ein.",
      });
      return;
    }

    // Ein Punkt im Hostnamen ist das Mindeste, was eine öffentliche Domain hat.
    // IPv6 in eckigen Klammern prüfen wir hier nicht — das übernimmt der
    // SSRF-Schutz serverseitig anhand der aufgelösten IP.
    const istIpv6Literal = host.startsWith("[") || url.hostname.includes(":");
    if (!istIpv6Literal && !host.includes(".")) {
      ctx.addIssue({
        code: "custom",
        message:
          "Da fehlt noch die Endung. Beispiel: meinbetrieb.de statt meinbetrieb",
      });
    }
  });

export const checkAnfrageSchema = z.object({
  url: urlSchema,
});

export type CheckAnfrage = z.infer<typeof checkAnfrageSchema>;

/**
 * Gibt die erste Fehlermeldung zurück oder null, wenn die Eingabe passt.
 * Für die Live-Validierung im Formular.
 */
export function pruefeUrlEingabe(eingabe: string): string | null {
  const ergebnis = urlSchema.safeParse(eingabe);
  return ergebnis.success ? null : (ergebnis.error.issues[0]?.message ?? "Ungültige Adresse.");
}
