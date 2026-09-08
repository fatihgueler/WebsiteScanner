import { isIP } from "node:net";

/**
 * SSRF-Schutz. Das Tool ruft Adressen ab, die Fremde eingeben — ohne diese
 * Prüfung ließe sich damit das interne Netz des Servers abklopfen.
 *
 * Die Klassifizierung arbeitet auf der aufgelösten IP, nicht auf dem Namen.
 * Angewendet wird sie im `lookup`-Hook des HTTP-Clients, also unmittelbar beim
 * Verbindungsaufbau. Ein Hostname, der beim ersten Auflösen öffentlich
 * aussieht und beim zweiten auf 127.0.0.1 zeigt (DNS-Rebinding), kommt so
 * nicht durch.
 */

export class SsrfFehler extends Error {
  constructor(
    message: string,
    /** Verständliche Meldung für die Oberfläche. */
    readonly klartext: string,
  ) {
    super(message);
    this.name = "SsrfFehler";
  }
}

function ipv4ZuBytes(ip: string): [number, number, number, number] | null {
  const teile = ip.split(".");
  if (teile.length !== 4) return null;
  const bytes: number[] = [];
  for (const teil of teile) {
    if (!/^\d{1,3}$/.test(teil)) return null;
    const zahl = Number(teil);
    if (zahl > 255) return null;
    bytes.push(zahl);
  }
  return bytes as [number, number, number, number];
}

/** Expandiert eine IPv6-Adresse zu 16 Bytes. Behandelt auch ::ffff:1.2.3.4. */
function ipv6ZuBytes(ip: string): number[] | null {
  let adresse = ip.trim();
  if (adresse.startsWith("[") && adresse.endsWith("]")) {
    adresse = adresse.slice(1, -1);
  }
  // Zone-Index (fe80::1%eth0) abschneiden.
  const prozent = adresse.indexOf("%");
  if (prozent !== -1) adresse = adresse.slice(0, prozent);

  let eingebettetesV4: number[] | null = null;
  const letzterDoppelpunkt = adresse.lastIndexOf(":");
  const schwanz = adresse.slice(letzterDoppelpunkt + 1);
  if (schwanz.includes(".")) {
    const v4 = ipv4ZuBytes(schwanz);
    if (v4 === null) return null;
    eingebettetesV4 = v4;
    adresse = adresse.slice(0, letzterDoppelpunkt + 1) + "0:0";
  }

  const teile = adresse.split("::");
  if (teile.length > 2) return null;

  const zuGruppen = (text: string): number[] | null => {
    if (text === "") return [];
    const gruppen: number[] = [];
    for (const stueck of text.split(":")) {
      if (!/^[0-9a-fA-F]{1,4}$/.test(stueck)) return null;
      gruppen.push(parseInt(stueck, 16));
    }
    return gruppen;
  };

  const vorne = zuGruppen(teile[0] ?? "");
  const hinten = teile.length === 2 ? zuGruppen(teile[1] ?? "") : [];
  if (vorne === null || hinten === null) return null;

  let gruppen: number[];
  if (teile.length === 2) {
    const luecke = 8 - vorne.length - hinten.length;
    if (luecke < 0) return null;
    gruppen = [...vorne, ...Array<number>(luecke).fill(0), ...hinten];
  } else {
    gruppen = vorne;
  }
  if (gruppen.length !== 8) return null;

  const bytes: number[] = [];
  for (const gruppe of gruppen) {
    bytes.push((gruppe >> 8) & 0xff, gruppe & 0xff);
  }
  if (eingebettetesV4 !== null) {
    bytes[12] = eingebettetesV4[0];
    bytes[13] = eingebettetesV4[1];
    bytes[14] = eingebettetesV4[2];
    bytes[15] = eingebettetesV4[3];
  }
  return bytes;
}

/**
 * Grund, warum eine IP abgelehnt wird — oder null, wenn sie öffentlich ist.
 */
export function ipVerbotsgrund(ip: string): string | null {
  const art = isIP(ip);

  if (art === 4) {
    const bytes = ipv4ZuBytes(ip);
    if (bytes === null) return "keine gültige IP-Adresse";
    return ipv4Verbotsgrund(bytes);
  }

  if (art === 6) {
    const bytes = ipv6ZuBytes(ip);
    if (bytes === null) return "keine gültige IP-Adresse";

    // IPv4-mapped (::ffff:0:0/96) und IPv4-compatible: nach v4-Regeln prüfen.
    const ersteZehnNull = bytes.slice(0, 10).every((b) => b === 0);
    if (ersteZehnNull && bytes[10] === 0xff && bytes[11] === 0xff) {
      return ipv4Verbotsgrund([bytes[12], bytes[13], bytes[14], bytes[15]]);
    }
    if (ersteZehnNull && bytes[10] === 0 && bytes[11] === 0) {
      const istLoopback =
        bytes[12] === 0 && bytes[13] === 0 && bytes[14] === 0 && bytes[15] === 1;
      if (istLoopback) return "Loopback (::1)";
      const istUnspezifiziert = bytes.every((b) => b === 0);
      if (istUnspezifiziert) return "unspezifizierte Adresse (::)";
      return ipv4Verbotsgrund([bytes[12], bytes[13], bytes[14], bytes[15]]);
    }

    // fc00::/7 — Unique Local Addresses
    if ((bytes[0] & 0xfe) === 0xfc) return "privates IPv6-Netz (fc00::/7)";
    // fe80::/10 — Link-Local
    if (bytes[0] === 0xfe && (bytes[1] & 0xc0) === 0x80)
      return "Link-Local (fe80::/10)";
    // ff00::/8 — Multicast
    if (bytes[0] === 0xff) return "Multicast (ff00::/8)";
    // 64:ff9b::/96 — NAT64
    if (bytes[0] === 0x00 && bytes[1] === 0x64 && bytes[2] === 0xff && bytes[3] === 0x9b)
      return "NAT64-Bereich (64:ff9b::/96)";
    // 100::/64 — Discard-Only
    if (bytes[0] === 0x01 && bytes[1] === 0x00 && bytes.slice(2, 8).every((b) => b === 0))
      return "Discard-Bereich (100::/64)";
    // 2001:db8::/32 — Dokumentation
    if (bytes[0] === 0x20 && bytes[1] === 0x01 && bytes[2] === 0x0d && bytes[3] === 0xb8)
      return "Dokumentationsbereich (2001:db8::/32)";

    return null;
  }

  return "keine gültige IP-Adresse";
}

function ipv4Verbotsgrund(bytes: [number, number, number, number] | number[]): string | null {
  const [a, b] = bytes;

  if (a === 0) return "reserviertes Netz (0.0.0.0/8)";
  if (a === 10) return "privates Netz (10.0.0.0/8)";
  if (a === 127) return "Loopback (127.0.0.0/8)";
  if (a === 100 && b >= 64 && b <= 127) return "Carrier-Grade-NAT (100.64.0.0/10)";
  if (a === 169 && b === 254) return "Link-Local (169.254.0.0/16)";
  if (a === 172 && b >= 16 && b <= 31) return "privates Netz (172.16.0.0/12)";
  if (a === 192 && b === 168) return "privates Netz (192.168.0.0/16)";
  if (a === 192 && b === 0 && bytes[2] === 0) return "IETF-Protokollbereich (192.0.0.0/24)";
  if (a === 192 && b === 0 && bytes[2] === 2) return "Dokumentationsbereich (192.0.2.0/24)";
  if (a === 198 && (b === 18 || b === 19)) return "Benchmark-Bereich (198.18.0.0/15)";
  if (a === 198 && b === 51 && bytes[2] === 100)
    return "Dokumentationsbereich (198.51.100.0/24)";
  if (a === 203 && b === 0 && bytes[2] === 113)
    return "Dokumentationsbereich (203.0.113.0/24)";
  if (a >= 224 && a <= 239) return "Multicast (224.0.0.0/4)";
  if (a >= 240) return "reserviertes Netz (240.0.0.0/4)";

  return null;
}

const VERBOTENE_HOSTNAMEN = new Set([
  "localhost",
  "localhost.localdomain",
  "ip6-localhost",
  "ip6-loopback",
]);

/**
 * Prüft eine Adresse, bevor überhaupt aufgelöst wird. Fängt die offensichtlichen
 * Fälle früh ab und liefert eine Meldung, die der Zielgruppe etwas sagt.
 */
export function pruefeUrlErlaubt(url: URL): void {
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new SsrfFehler(
      `Protokoll ${url.protocol} nicht erlaubt`,
      "Es lassen sich nur Adressen prüfen, die mit http oder https beginnen.",
    );
  }

  if (url.username !== "" || url.password !== "") {
    throw new SsrfFehler(
      "Zugangsdaten in der URL",
      "Bitte geben Sie die Adresse ohne Benutzername und Passwort ein.",
    );
  }

  const host = url.hostname.toLowerCase().replace(/\.$/, "");

  if (VERBOTENE_HOSTNAMEN.has(host) || host.endsWith(".localhost")) {
    throw new SsrfFehler(
      `Hostname ${host} verboten`,
      "Diese Adresse zeigt auf den Rechner selbst und ist von außen nicht erreichbar. Bitte geben Sie die öffentliche Adresse Ihrer Website ein.",
    );
  }

  // Direkt eingegebene IP-Adressen sofort klassifizieren.
  const alsIp = host.startsWith("[") ? host.slice(1, -1) : host;
  if (isIP(alsIp) !== 0) {
    const grund = ipVerbotsgrund(alsIp);
    if (grund !== null) {
      throw new SsrfFehler(
        `IP abgelehnt: ${grund}`,
        "Diese Adresse gehört zu einem privaten oder reservierten Netzbereich und ist aus dem Internet nicht erreichbar. Bitte geben Sie die öffentliche Adresse Ihrer Website ein.",
      );
    }
  }
}
