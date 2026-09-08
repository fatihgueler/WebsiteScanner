import * as cheerio from "cheerio";
import type { CheerioAPI } from "cheerio";
import {
  AbrufFehler,
  AnfrageBudget,
  type Antwort,
  rufeAb,
  rufeAbOptional,
} from "@/lib/http-client";

/** Eine im HTML gefundene Rechtsseite samt Abrufergebnis. */
export type RechtsSeite = {
  /** Linktext, wie er auf der Seite steht. */
  linktext: string;
  url: string;
  /** null, wenn der Abruf nicht möglich war oder das Budget nicht reichte. */
  antwort: Antwort | null;
};

export type ZusatzRessource = {
  url: string;
  /** null, wenn nicht abgerufen (Budget) — dann gilt "nicht geprüft". */
  antwort: Antwort | null;
};

export type PruefKontext = {
  /** Was der Nutzer eingegeben hat. */
  eingabeUrl: string;
  /** Die Startadresse nach Normalisierung, vor Weiterleitungen. */
  startUrl: URL;
  /** Die Adresse, bei der wir gelandet sind. Basis für alle relativen Links. */
  basisUrl: URL;

  seite: Antwort;
  html: string;
  $: CheerioAPI;

  /**
   * Abruf von http:// (nicht https) ohne Weiterleitungsverfolgung. Zeigt, ob
   * unverschlüsselter Zugriff auf HTTPS umgeleitet wird. null, wenn die
   * Eingabe schon http war oder der Abruf scheiterte.
   */
  httpVariante: Antwort | null;
  /** Abruf des www/non-www-Gegenstücks, für die Weiterleitungsprüfung. */
  hostGegenstueck: Antwort | null;

  robotsTxt: ZusatzRessource;
  sitemapXml: ZusatzRessource;
  llmsTxt: ZusatzRessource;
  securityTxt: ZusatzRessource;
  /** Abruf eines mit Sicherheit nicht existierenden Pfads, für die 404-Prüfung. */
  vierNullVier: ZusatzRessource;

  impressum: RechtsSeite | null;
  datenschutz: RechtsSeite | null;

  budget: AnfrageBudget;
};

/** Findet den ersten Link, dessen Text oder Adresse auf die Seite hindeutet. */
function findeRechtsLink(
  $: CheerioAPI,
  basis: URL,
  muster: RegExp,
): { linktext: string; url: string } | null {
  let treffer: { linktext: string; url: string } | null = null;

  $("a[href]").each((_, element) => {
    if (treffer !== null) return;
    const knoten = $(element);
    const href = knoten.attr("href") ?? "";
    const text = knoten.text().replace(/\s+/g, " ").trim();
    // aria-label und title zählen mit — manche Seiten verlinken nur ein Icon.
    const beschriftung = `${text} ${knoten.attr("aria-label") ?? ""} ${knoten.attr("title") ?? ""}`;

    if (!muster.test(beschriftung) && !muster.test(href)) return;
    if (/^(mailto:|tel:|javascript:|#)/i.test(href)) return;

    try {
      const ziel = new URL(href, basis);
      if (ziel.protocol !== "http:" && ziel.protocol !== "https:") return;
      treffer = { linktext: text === "" ? beschriftung.trim() : text, url: ziel.href };
    } catch {
      // Kaputte Adresse im href — überspringen.
    }
  });

  return treffer;
}

const IMPRESSUM_MUSTER = /impressum|imprint|anbieterkennzeichnung|legal[-\s]?notice/i;
const DATENSCHUTZ_MUSTER = /datenschutz|privacy|privacypolicy|privacy[-\s]?policy/i;

async function holeRechtsSeite(
  $: CheerioAPI,
  basis: URL,
  muster: RegExp,
  budget: AnfrageBudget,
): Promise<RechtsSeite | null> {
  const link = findeRechtsLink($, basis, muster);
  if (link === null) return null;

  // Nur Seiten der geprüften Domain abrufen. Ein Impressum bei einem externen
  // Dienstleister verlinken wir zwar, rufen es aber nicht ab.
  let gleicheSeite = false;
  try {
    gleicheSeite = new URL(link.url).hostname === basis.hostname;
  } catch {
    gleicheSeite = false;
  }

  const antwort = gleicheSeite ? await rufeAbOptional(link.url, budget, { koerperLesen: true }) : null;

  return { ...link, antwort };
}

function mitPfad(basis: URL, pfad: string): string {
  return new URL(pfad, `${basis.protocol}//${basis.host}/`).href;
}

/**
 * Baut den gemeinsamen Datenstand für alle sechs Module. Ruft jede Ressource
 * genau einmal ab und hält sich dabei an das Anfragebudget: geht es zur Neige,
 * bleiben die hinteren Ressourcen ungeprüft (`antwort: null`) statt das Limit
 * zu sprengen. Die Module melden das dann als "konnte nicht automatisch
 * geprüft werden" — und nicht als Mangel.
 */
export async function sammleKontext(eingabeUrl: string): Promise<PruefKontext> {
  const budget = new AnfrageBudget();
  const startUrl = new URL(eingabeUrl);

  // 1. Die Seite selbst. Scheitert das, ist die ganze Prüfung hinfällig.
  const seite = await rufeAb(startUrl, budget, { koerperLesen: true });

  const contentType = seite.contentType.toLowerCase();
  const siehtNachHtmlAus =
    contentType.includes("html") ||
    contentType === "" ||
    /<html|<!doctype html/i.test(seite.body.slice(0, 1000));

  if (!siehtNachHtmlAus) {
    throw new AbrufFehler(
      `Kein HTML: ${seite.contentType}`,
      "Unter dieser Adresse liegt keine Webseite, sondern eine Datei. Bitte geben Sie die Startseite Ihrer Website ein.",
      "nicht_erreichbar",
    );
  }

  const basisUrl = new URL(seite.url);
  const $ = cheerio.load(seite.body);

  // 2. Unverschlüsselter Zugriff: leitet http auf https um?
  let httpVariante: Antwort | null = null;
  if (basisUrl.protocol === "https:") {
    const httpUrl = new URL(basisUrl.href);
    httpUrl.protocol = "http:";
    httpVariante = await rufeAbOptional(httpUrl, budget, {
      methode: "HEAD",
      koerperLesen: false,
      folgeWeiterleitungen: false,
    });
  }

  // 3. robots.txt — Grundlage für SEO und für die KI-Crawler-Prüfung.
  const robotsUrl = mitPfad(basisUrl, "/robots.txt");
  const robotsTxt: ZusatzRessource = {
    url: robotsUrl,
    antwort: await rufeAbOptional(robotsUrl, budget, { koerperLesen: true }),
  };

  // 4. + 5. Die beiden Pflichtseiten nach deutschem Recht.
  const impressum = await holeRechtsSeite($, basisUrl, IMPRESSUM_MUSTER, budget);
  const datenschutz = await holeRechtsSeite($, basisUrl, DATENSCHUTZ_MUSTER, budget);

  // 6. llms.txt — das Alleinstellungsmerkmal des Reports.
  const llmsUrl = mitPfad(basisUrl, "/llms.txt");
  const llmsTxt: ZusatzRessource = {
    url: llmsUrl,
    antwort: await rufeAbOptional(llmsUrl, budget, { koerperLesen: true }),
  };

  // 7. sitemap.xml
  const sitemapUrl = mitPfad(basisUrl, "/sitemap.xml");
  const sitemapXml: ZusatzRessource = {
    url: sitemapUrl,
    antwort: await rufeAbOptional(sitemapUrl, budget, {
      methode: "HEAD",
      koerperLesen: false,
    }),
  };

  // 8. security.txt
  const securityUrl = mitPfad(basisUrl, "/.well-known/security.txt");
  const securityTxt: ZusatzRessource = {
    url: securityUrl,
    antwort: await rufeAbOptional(securityUrl, budget, {
      methode: "HEAD",
      koerperLesen: false,
    }),
  };

  // 9. Eigene 404-Seite. Ein einziger Aufruf eines mit Sicherheit nicht
  //    existierenden Pfads — kein Durchprobieren von Verzeichnissen.
  const vierNullVierUrl = mitPfad(basisUrl, "/gueler-dev-check-404-test");
  const vierNullVier: ZusatzRessource = {
    url: vierNullVierUrl,
    antwort: await rufeAbOptional(vierNullVierUrl, budget, {
      koerperLesen: true,
      folgeWeiterleitungen: false,
    }),
  };

  // 10. www/non-www-Gegenstück, für die Prüfung der Weiterleitungskette.
  const gegenHost = basisUrl.hostname.startsWith("www.")
    ? basisUrl.hostname.slice(4)
    : `www.${basisUrl.hostname}`;
  const gegenUrl = new URL(basisUrl.href);
  gegenUrl.hostname = gegenHost;
  const hostGegenstueck = await rufeAbOptional(gegenUrl, budget, {
    methode: "HEAD",
    koerperLesen: false,
    folgeWeiterleitungen: false,
  });

  return {
    eingabeUrl,
    startUrl,
    basisUrl,
    seite,
    html: seite.body,
    $,
    httpVariante,
    hostGegenstueck,
    robotsTxt,
    sitemapXml,
    llmsTxt,
    securityTxt,
    vierNullVier,
    impressum,
    datenschutz,
    budget,
  };
}
