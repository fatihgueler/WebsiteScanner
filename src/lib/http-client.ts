import dns from "node:dns";
import http from "node:http";
import https from "node:https";
import type { TLSSocket } from "node:tls";
import zlib from "node:zlib";
import { ipVerbotsgrund, pruefeUrlErlaubt, SsrfFehler } from "@/lib/ssrf";

export const USER_AGENT = "GuelerDev-WebsiteCheck/1.0";
export const ZEITLIMIT_MS = 10_000;
export const MAX_WEITERLEITUNGEN = 3;
export const MAX_ANTWORTGROESSE = 5 * 1024 * 1024; // 5 MB
export const MAX_ANFRAGEN_PRO_PRUEFUNG = 12;

export type TlsInfo = {
  gueltig: boolean;
  /** Grund, falls das Zertifikat nicht akzeptiert wurde. */
  fehler: string | null;
  aussteller: string | null;
  gueltigAb: string | null;
  gueltigBis: string | null;
  /** Verbleibende Tage bis zum Ablauf. Negativ, wenn bereits abgelaufen. */
  restlaufzeitTage: number | null;
  protokoll: string | null;
};

export type Weiterleitung = {
  von: string;
  nach: string;
  status: number;
};

export type Antwort = {
  /** Endgültige URL nach allen Weiterleitungen. */
  url: string;
  /** Ursprünglich angefragte URL. */
  angefragteUrl: string;
  status: number;
  headers: Record<string, string>;
  /** `Set-Cookie` kommt mehrfach vor und braucht deshalb ein eigenes Feld. */
  setCookie: string[];
  body: string;
  bytes: number;
  /** true, wenn bei 5 MB abgeschnitten wurde. */
  abgeschnitten: boolean;
  contentType: string;
  /** Zeit bis zum ersten Byte der finalen Antwort, in Millisekunden. */
  dauerMs: number;
  weiterleitungen: Weiterleitung[];
  tls: TlsInfo | null;
};

export class AbrufFehler extends Error {
  constructor(
    message: string,
    readonly klartext: string,
    readonly art: "nicht_erreichbar" | "zeitueberschreitung" | "kein_html" | "budget",
  ) {
    super(message);
    this.name = "AbrufFehler";
  }
}

/**
 * Zählt die Anfragen einer Prüfung. Der Auftrag begrenzt sie auf 12 — das
 * Budget wird durch alle Module gereicht, damit sich niemand daran vorbeimogelt.
 */
export class AnfrageBudget {
  private verbraucht = 0;

  constructor(private readonly limit: number = MAX_ANFRAGEN_PRO_PRUEFUNG) {}

  get uebrig(): number {
    return Math.max(0, this.limit - this.verbraucht);
  }

  /** true, wenn noch mindestens eine Anfrage frei ist. */
  hatBudget(): boolean {
    return this.uebrig > 0;
  }

  verbrauche(): void {
    if (!this.hatBudget()) {
      throw new AbrufFehler(
        "Anfragebudget aufgebraucht",
        "Die Prüfung hat ihr Anfragelimit erreicht.",
        "budget",
      );
    }
    this.verbraucht += 1;
  }
}

/**
 * DNS-Auflösung mit Sperre für private Bereiche. Wird von Node unmittelbar vor
 * dem Verbindungsaufbau aufgerufen — dadurch greift die Prüfung auf genau der
 * IP, mit der auch verbunden wird (kein DNS-Rebinding-Fenster).
 */
const gepruefterLookup: NonNullable<https.RequestOptions["lookup"]> = (
  hostname,
  optionen,
  callback,
) => {
  // Node ruft den Hook mit `all: true` auf, wenn autoSelectFamily aktiv ist
  // (Standard ab Node 20), und erwartet dann ein Array zurück. Diese Form
  // müssen wir durchreichen, sonst kommt keine Verbindung zustande.
  const willAlle = (optionen as dns.LookupOptions).all === true;

  // Wir lösen immer vollständig auf: eine einzige öffentliche IP darf nicht
  // darüber hinwegtäuschen, dass derselbe Name auch auf 127.0.0.1 zeigt.
  dns.lookup(hostname, { ...(optionen as dns.LookupOptions), all: true }, (fehler, adressen) => {
    type Rueckgabe = (
      fehler: NodeJS.ErrnoException | null,
      adresse: string | dns.LookupAddress[],
      family?: number,
    ) => void;
    const antworte = callback as unknown as Rueckgabe;

    if (fehler) {
      antworte(fehler, "", 0);
      return;
    }

    const liste = Array.isArray(adressen) ? adressen : [adressen];
    if (liste.length === 0) {
      antworte(new Error(`Keine IP-Adresse für ${hostname}`), "", 0);
      return;
    }

    for (const eintrag of liste) {
      const grund = ipVerbotsgrund(eintrag.address);
      if (grund !== null) {
        antworte(
          new SsrfFehler(
            `${hostname} löst auf ${eintrag.address} auf: ${grund}`,
            "Diese Adresse zeigt auf ein privates oder internes Netz und lässt sich nicht von außen prüfen.",
          ),
          "",
          0,
        );
        return;
      }
    }

    if (willAlle) {
      antworte(null, liste);
      return;
    }
    antworte(null, liste[0].address, liste[0].family);
  });
};

function entpacke(rohdaten: Buffer, encoding: string): Buffer {
  try {
    switch (encoding.trim().toLowerCase()) {
      case "gzip":
      case "x-gzip":
        return zlib.gunzipSync(rohdaten);
      case "deflate":
        return zlib.inflateSync(rohdaten);
      case "br":
        return zlib.brotliDecompressSync(rohdaten);
      default:
        return rohdaten;
    }
  } catch {
    // Abgeschnittene Antworten lassen sich nicht entpacken. Lieber die
    // Rohdaten zurückgeben als die ganze Prüfung scheitern lassen.
    return rohdaten;
  }
}

function zeichensatzAus(contentType: string, rohdaten: Buffer): string {
  const ausHeader = /charset=["']?([a-z0-9_-]+)/i.exec(contentType)?.[1];
  if (ausHeader !== undefined) return ausHeader.toLowerCase();

  // Ersten Kilobyte nach <meta charset> absuchen — reicht, das steht im <head>.
  const anfang = rohdaten.subarray(0, 2048).toString("latin1");
  const ausMeta =
    /<meta[^>]+charset=["']?([a-z0-9_-]+)/i.exec(anfang)?.[1] ??
    /<meta[^>]+content=["'][^"']*charset=([a-z0-9_-]+)/i.exec(anfang)?.[1];
  return (ausMeta ?? "utf-8").toLowerCase();
}

function dekodiere(rohdaten: Buffer, contentType: string): string {
  const zeichensatz = zeichensatzAus(contentType, rohdaten);
  try {
    return new TextDecoder(zeichensatz, { fatal: false }).decode(rohdaten);
  } catch {
    return rohdaten.toString("utf8");
  }
}

/** Felder im Zertifikat können laut Node-Typen auch Arrays sein. */
function alsText(wert: string | string[] | undefined): string | null {
  if (typeof wert === "string") return wert;
  if (Array.isArray(wert)) return wert[0] ?? null;
  return null;
}

function tlsInfoAus(socket: TLSSocket): TlsInfo {
  const zertifikat = socket.getPeerCertificate(false);
  const hatZertifikat =
    zertifikat !== null &&
    typeof zertifikat === "object" &&
    Object.keys(zertifikat).length > 0;

  const gueltigBis = hatZertifikat && zertifikat.valid_to ? zertifikat.valid_to : null;
  const ablauf = gueltigBis !== null ? new Date(gueltigBis) : null;
  const restlaufzeitTage =
    ablauf !== null && !Number.isNaN(ablauf.getTime())
      ? Math.floor((ablauf.getTime() - Date.now()) / 86_400_000)
      : null;

  return {
    gueltig: socket.authorized === true,
    fehler: socket.authorized === true ? null : (socket.authorizationError?.toString() ?? "unbekannt"),
    aussteller: hatZertifikat
      ? (alsText(zertifikat.issuer?.O) ?? alsText(zertifikat.issuer?.CN))
      : null,
    gueltigAb: hatZertifikat && zertifikat.valid_from ? zertifikat.valid_from : null,
    gueltigBis,
    restlaufzeitTage,
    protokoll: socket.getProtocol(),
  };
}

type EinzelAntwort = {
  status: number;
  headers: Record<string, string>;
  setCookie: string[];
  location: string | null;
  rohdaten: Buffer;
  abgeschnitten: boolean;
  tls: TlsInfo | null;
  dauerMs: number;
};

/** Eine einzelne Anfrage ohne Weiterleitungslogik. */
function einzelAbruf(
  url: URL,
  methode: "GET" | "HEAD",
  koerperLesen: boolean,
): Promise<EinzelAntwort> {
  return new Promise((aufloesen, ablehnen) => {
    const istHttps = url.protocol === "https:";
    const modul = istHttps ? https : http;
    const start = Date.now();

    const anfrage = modul.request(
      url,
      {
        method: methode,
        lookup: gepruefterLookup,
        headers: {
          "User-Agent": USER_AGENT,
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "de-DE,de;q=0.9",
          "Accept-Encoding": "gzip, deflate, br",
        },
        // Wir wollen ein abgelaufenes oder falsch ausgestelltes Zertifikat
        // BENENNEN können, statt an ihm zu scheitern. Node prüft trotzdem und
        // setzt `authorized` — das lesen wir unten aus. Es werden keinerlei
        // Zugangsdaten übertragen, das Risiko bleibt beim reinen Lesen.
        rejectUnauthorized: false,
        // Keine Verbindungswiederverwendung: jede Anfrage soll den lookup-Hook
        // erneut durchlaufen.
        agent: false,
      },
      (antwort) => {
        const headers: Record<string, string> = {};
        for (const [name, wert] of Object.entries(antwort.headers)) {
          if (name === "set-cookie") continue;
          if (typeof wert === "string") headers[name] = wert;
          else if (Array.isArray(wert)) headers[name] = wert.join(", ");
        }

        const tls = istHttps ? tlsInfoAus(antwort.socket as TLSSocket) : null;
        const dauerMs = Date.now() - start;

        const fertig = (rohdaten: Buffer, abgeschnitten: boolean) => {
          aufloesen({
            status: antwort.statusCode ?? 0,
            headers,
            setCookie: antwort.headers["set-cookie"] ?? [],
            location: typeof antwort.headers.location === "string" ? antwort.headers.location : null,
            rohdaten,
            abgeschnitten,
            tls,
            dauerMs,
          });
        };

        if (!koerperLesen) {
          antwort.resume();
          antwort.on("end", () => fertig(Buffer.alloc(0), false));
          return;
        }

        const stuecke: Buffer[] = [];
        let groesse = 0;
        let abgeschnitten = false;

        antwort.on("data", (stueck: Buffer) => {
          if (abgeschnitten) return;
          groesse += stueck.length;
          if (groesse > MAX_ANTWORTGROESSE) {
            // Bis zur Grenze behalten, dann Verbindung kappen.
            const rest = MAX_ANTWORTGROESSE - (groesse - stueck.length);
            if (rest > 0) stuecke.push(stueck.subarray(0, rest));
            abgeschnitten = true;
            antwort.destroy();
            fertig(Buffer.concat(stuecke), true);
            return;
          }
          stuecke.push(stueck);
        });

        antwort.on("end", () => {
          if (abgeschnitten) return;
          const roh = Buffer.concat(stuecke);
          const encoding = antwort.headers["content-encoding"];
          fertig(typeof encoding === "string" ? entpacke(roh, encoding) : roh, false);
        });

        antwort.on("error", (fehler) => {
          if (abgeschnitten) return;
          ablehnen(fehler);
        });
      },
    );

    anfrage.setTimeout(ZEITLIMIT_MS, () => {
      anfrage.destroy(
        new AbrufFehler(
          `Zeitüberschreitung nach ${ZEITLIMIT_MS} ms`,
          "Der Server hat zu lange nicht geantwortet.",
          "zeitueberschreitung",
        ),
      );
    });

    anfrage.on("error", (fehler) => ablehnen(fehler));
    anfrage.end();
  });
}

function uebersetzeFehler(fehler: unknown, url: URL): never {
  if (fehler instanceof SsrfFehler) throw fehler;
  if (fehler instanceof AbrufFehler) throw fehler;

  const code = (fehler as NodeJS.ErrnoException)?.code;
  const host = url.hostname;

  if (code === "ENOTFOUND" || code === "EAI_AGAIN") {
    throw new AbrufFehler(
      `DNS-Auflösung fehlgeschlagen: ${host}`,
      `Unter ${host} ist keine Website zu finden. Bitte prüfen Sie die Schreibweise.`,
      "nicht_erreichbar",
    );
  }
  if (code === "ECONNREFUSED" || code === "ECONNRESET" || code === "EHOSTUNREACH") {
    throw new AbrufFehler(
      `Verbindung abgelehnt: ${host}`,
      `Der Server von ${host} hat die Verbindung abgelehnt. Möglicherweise ist die Seite gerade nicht erreichbar.`,
      "nicht_erreichbar",
    );
  }
  if (code === "ETIMEDOUT" || code === "ESOCKETTIMEDOUT") {
    throw new AbrufFehler(
      `Zeitüberschreitung: ${host}`,
      "Der Server hat zu lange nicht geantwortet.",
      "zeitueberschreitung",
    );
  }

  throw new AbrufFehler(
    `Abruf fehlgeschlagen: ${String((fehler as Error)?.message ?? fehler)}`,
    `Die Seite ${host} ließ sich nicht abrufen.`,
    "nicht_erreichbar",
  );
}

export type AbrufOptionen = {
  methode?: "GET" | "HEAD";
  /** Bei false wird der Antwortkörper verworfen (spart Zeit und Speicher). */
  koerperLesen?: boolean;
  /** Bei false endet der Abruf bei der ersten Weiterleitung. */
  folgeWeiterleitungen?: boolean;
};

/**
 * Abruf einer öffentlich erreichbaren Ressource — SSRF-geprüft, mit Zeitlimit,
 * Größenbegrenzung und manueller Weiterleitungskette.
 */
export async function rufeAb(
  eingabeUrl: string | URL,
  budget: AnfrageBudget,
  optionen: AbrufOptionen = {},
): Promise<Antwort> {
  const {
    methode = "GET",
    koerperLesen = methode === "GET",
    folgeWeiterleitungen = true,
  } = optionen;

  let aktuell = typeof eingabeUrl === "string" ? new URL(eingabeUrl) : new URL(eingabeUrl.href);
  const angefragteUrl = aktuell.href;
  const weiterleitungen: Weiterleitung[] = [];
  let tls: TlsInfo | null = null;

  for (let sprung = 0; sprung <= MAX_WEITERLEITUNGEN; sprung += 1) {
    pruefeUrlErlaubt(aktuell);
    budget.verbrauche();

    let antwort: EinzelAntwort;
    try {
      antwort = await einzelAbruf(aktuell, methode, koerperLesen);
    } catch (fehler) {
      uebersetzeFehler(fehler, aktuell);
    }

    // Das TLS des ersten HTTPS-Sprungs ist das, was den Besucher betrifft.
    if (tls === null && antwort.tls !== null) tls = antwort.tls;

    const istWeiterleitung =
      antwort.status >= 300 && antwort.status < 400 && antwort.location !== null;

    if (!istWeiterleitung || !folgeWeiterleitungen) {
      const contentType = antwort.headers["content-type"] ?? "";
      return {
        url: aktuell.href,
        angefragteUrl,
        status: antwort.status,
        headers: antwort.headers,
        setCookie: antwort.setCookie,
        body: koerperLesen ? dekodiere(antwort.rohdaten, contentType) : "",
        bytes: antwort.rohdaten.length,
        abgeschnitten: antwort.abgeschnitten,
        contentType,
        dauerMs: antwort.dauerMs,
        weiterleitungen,
        tls,
      };
    }

    if (sprung === MAX_WEITERLEITUNGEN) {
      throw new AbrufFehler(
        `Mehr als ${MAX_WEITERLEITUNGEN} Weiterleitungen`,
        "Die Seite leitet zu oft weiter. Das deutet auf einen Konfigurationsfehler hin.",
        "nicht_erreichbar",
      );
    }

    let ziel: URL;
    try {
      ziel = new URL(antwort.location as string, aktuell);
    } catch {
      throw new AbrufFehler(
        `Ungültige Weiterleitung: ${antwort.location}`,
        "Die Seite leitet auf eine ungültige Adresse weiter.",
        "nicht_erreichbar",
      );
    }

    weiterleitungen.push({ von: aktuell.href, nach: ziel.href, status: antwort.status });
    aktuell = ziel;
  }

  // Unerreichbar — die Schleife kehrt in jedem Durchlauf zurück oder wirft.
  throw new AbrufFehler(
    "Weiterleitungsschleife",
    "Die Seite leitet zu oft weiter.",
    "nicht_erreichbar",
  );
}

/**
 * Abruf, der einen Fehlschlag nicht weiterreicht. Für optionale Ressourcen wie
 * robots.txt oder llms.txt — deren Fehlen ist ein Befund, kein Abbruchgrund.
 */
export async function rufeAbOptional(
  url: string | URL,
  budget: AnfrageBudget,
  optionen: AbrufOptionen = {},
): Promise<Antwort | null> {
  if (!budget.hatBudget()) return null;
  try {
    return await rufeAb(url, budget, optionen);
  } catch {
    return null;
  }
}
