import { gut, kritisch, ungeprueft, verbesserbar } from "@/lib/befund";
import type { PruefKontext } from "@/lib/kontext";
import type { ModulErgebnis, PruefModul } from "@/lib/module";
import type { Befund } from "@/lib/types";

/**
 * Modul 5 — Sichtbarkeit in KI-Suchen (GEO).
 *
 * Das Alleinstellungsmerkmal des Reports: Fast kein anderer kostenloser Check
 * prüft, ob ein Betrieb für ChatGPT, Claude und Perplexity überhaupt
 * auffindbar ist. Die Klartexte müssen deshalb besonders sorgfältig erklären,
 * WARUM das inzwischen zählt — die Zielgruppe hat davon meist noch nie gehört.
 */

/** KI-Crawler, deren Blockade den Betrieb aus KI-Antworten verschwinden lässt. */
const KI_CRAWLER = [
  { name: "GPTBot", betreiber: "ChatGPT (OpenAI)" },
  { name: "ClaudeBot", betreiber: "Claude (Anthropic)" },
  { name: "Claude-Web", betreiber: "Claude (Anthropic)" },
  { name: "PerplexityBot", betreiber: "Perplexity" },
  { name: "Google-Extended", betreiber: "Google Gemini und KI-Übersichten" },
  { name: "CCBot", betreiber: "Common Crawl — Datenbasis vieler KI-Systeme" },
  { name: "Applebot-Extended", betreiber: "Apple Intelligence" },
];

/**
 * Wertet aus, welche der KI-Crawler in der robots.txt gesperrt sind.
 * Ausgewertet wird der jeweilige User-agent-Block bis zum nächsten Block.
 */
function findeGesperrteCrawler(robotsInhalt: string): {
  gesperrt: { name: string; betreiber: string; regel: string }[];
  alleGesperrt: boolean;
} {
  const zeilen = robotsInhalt.split(/\r?\n/).map((zeile) => zeile.trim());
  const gesperrt: { name: string; betreiber: string; regel: string }[] = [];

  // Blöcke aufbauen: mehrere aufeinanderfolgende User-agent-Zeilen teilen sich
  // dieselben Regeln.
  const bloecke: { agents: string[]; disallows: string[] }[] = [];
  let aktuell: { agents: string[]; disallows: string[] } | null = null;
  let zuletztAgent = false;

  for (const zeile of zeilen) {
    if (zeile === "" || zeile.startsWith("#")) continue;
    const agentTreffer = /^user-agent:\s*(.+)$/i.exec(zeile);
    const disallowTreffer = /^disallow:\s*(.*)$/i.exec(zeile);

    if (agentTreffer !== null) {
      const agent = agentTreffer[1].trim();
      if (aktuell !== null && zuletztAgent) {
        aktuell.agents.push(agent);
      } else {
        aktuell = { agents: [agent], disallows: [] };
        bloecke.push(aktuell);
      }
      zuletztAgent = true;
      continue;
    }

    zuletztAgent = false;
    if (disallowTreffer !== null && aktuell !== null) {
      aktuell.disallows.push(disallowTreffer[1].trim());
    }
  }

  for (const crawler of KI_CRAWLER) {
    const block = bloecke.find((b) =>
      b.agents.some((agent) => agent.toLowerCase() === crawler.name.toLowerCase()),
    );
    if (block === undefined) continue;
    // "Disallow: /" sperrt die ganze Seite. Ein leerer Disallow erlaubt alles.
    const sperrt = block.disallows.some((regel) => regel === "/");
    if (sperrt) {
      gesperrt.push({ ...crawler, regel: `User-agent: ${crawler.name} → Disallow: /` });
    }
  }

  // Wildcard-Block mit Disallow: / sperrt implizit auch alle KI-Crawler,
  // sofern sie keinen eigenen, erlaubenden Block haben.
  const stern = bloecke.find((b) => b.agents.includes("*"));
  const sternSperrt = stern !== undefined && stern.disallows.some((regel) => regel === "/");

  return {
    gesperrt,
    alleGesperrt: sternSperrt && gesperrt.length === 0,
  };
}

type JsonLdKnoten = Record<string, unknown>;

/** Sammelt alle JSON-LD-Objekte, auch aus @graph-Strukturen. */
function sammleJsonLd(bloecke: string[]): JsonLdKnoten[] {
  const knoten: JsonLdKnoten[] = [];

  const einsammeln = (wert: unknown): void => {
    if (Array.isArray(wert)) {
      for (const eintrag of wert) einsammeln(eintrag);
      return;
    }
    if (wert === null || typeof wert !== "object") return;
    const objekt = wert as JsonLdKnoten;
    knoten.push(objekt);
    if ("@graph" in objekt) einsammeln(objekt["@graph"]);
  };

  for (const block of bloecke) {
    try {
      einsammeln(JSON.parse(block));
    } catch {
      // Kaputtes JSON-LD kommt vor. Wir überspringen es, statt zu scheitern —
      // und melden weiter unten, wenn dadurch gar nichts übrig bleibt.
    }
  }

  return knoten;
}

function typenAus(knoten: JsonLdKnoten[]): string[] {
  const typen = new Set<string>();
  for (const eintrag of knoten) {
    const typ = eintrag["@type"];
    if (typeof typ === "string") typen.add(typ);
    else if (Array.isArray(typ)) {
      for (const einzeln of typ) if (typeof einzeln === "string") typen.add(einzeln);
    }
  }
  return [...typen];
}

/** Sucht rekursiv nach einem Schlüssel in den JSON-LD-Knoten. */
function hatFeld(knoten: JsonLdKnoten[], feld: string): boolean {
  const suche = (wert: unknown, tiefe: number): boolean => {
    if (tiefe > 6 || wert === null || typeof wert !== "object") return false;
    if (Array.isArray(wert)) return wert.some((eintrag) => suche(eintrag, tiefe + 1));
    const objekt = wert as JsonLdKnoten;
    if (feld in objekt) {
      const inhalt = objekt[feld];
      if (typeof inhalt === "string") return inhalt.trim() !== "";
      return inhalt !== null && inhalt !== undefined;
    }
    return Object.values(objekt).some((eintrag) => suche(eintrag, tiefe + 1));
  };
  return knoten.some((eintrag) => suche(eintrag, 0));
}

const RELEVANTE_TYPEN = [
  "LocalBusiness",
  "Organization",
  "Service",
  "FAQPage",
  "Person",
  "Review",
];

/** Subtypen von LocalBusiness zählen als LocalBusiness. */
const LOCALBUSINESS_SUBTYPEN =
  /Business|Store|Shop|Restaurant|Salon|Clinic|Practice|Dentist|Physician|Attorney|LegalService|ProfessionalService|HomeAndConstruction|Plumber|Electrician|Roofing|AutoRepair|RealEstateAgent|TravelAgency|Lodging|Hotel|Bakery|Cafe|Bar|DrivingSchool|ChildCare|Veterinary/i;

function pruefeGeo(kontext: PruefKontext): ModulErgebnis {
  const befunde: Befund[] = [];
  const { $ } = kontext;

  // --- llms.txt ----------------------------------------------------------
  const llms = kontext.llmsTxt.antwort;
  if (llms === null) {
    befunde.push(
      ungeprueft(
        "geo-llms-txt",
        "Kurzfassung Ihres Angebots für KI-Systeme",
        "Ob Ihre Seite eine maschinenlesbare Kurzfassung bereitstellt, ließ sich nicht prüfen.",
        `${kontext.llmsTxt.url} war nicht abrufbar. Nicht bewertet.`,
      ),
    );
  } else if (llms.status >= 200 && llms.status < 300 && llms.body.trim().length > 50) {
    befunde.push(
      gut(
        "geo-llms-txt",
        "Sie liefern KI-Systemen eine Kurzfassung",
        "Ihre Seite stellt eine kompakte Zusammenfassung Ihres Angebots bereit, die KI-Systeme direkt auslesen können. Das haben die wenigsten — bitte aktuell halten.",
        `${kontext.llmsTxt.url} antwortet mit Status ${llms.status} und ${llms.body.trim().length} Zeichen Inhalt.`,
      ),
    );
  } else {
    befunde.push(
      verbesserbar(
        "geo-llms-txt",
        "KI-Systemen fehlt eine Kurzfassung Ihres Angebots",
        "Eine kleine Textdatei mit Ihren Leistungen, Ihrem Einzugsgebiet und Ihren Kontaktdaten macht es ChatGPT und Perplexity deutlich leichter, Sie korrekt zu empfehlen. Aufwand: eine halbe Stunde.",
        `${kontext.llmsTxt.url} antwortet mit Status ${llms.status}. Eine llms.txt ist eine schlichte Textdatei im Wurzelverzeichnis: Angebot, Leistungen mit je einem Satz, Einzugsgebiet, Kontakt, Seitenliste. Fakten statt Werbetext.`,
        "klein",
      ),
    );
  }

  // --- KI-Crawler in robots.txt -----------------------------------------
  const robots = kontext.robotsTxt.antwort;
  if (robots === null) {
    befunde.push(
      ungeprueft(
        "geo-ki-crawler",
        "Zugang für KI-Suchmaschinen",
        "Ob Ihre Seite KI-Suchmaschinen aussperrt, ließ sich nicht prüfen.",
        `${kontext.robotsTxt.url} war nicht abrufbar. Nicht bewertet.`,
      ),
    );
  } else if (robots.status < 200 || robots.status >= 300 || robots.body.trim() === "") {
    befunde.push(
      gut(
        "geo-ki-crawler",
        "KI-Suchmaschinen dürfen Ihre Seite lesen",
        "Ihre Website sperrt keine KI-Suchmaschine aus. ChatGPT, Claude und Perplexity können Ihren Betrieb also grundsätzlich finden und weiterempfehlen.",
        `Keine robots.txt vorhanden (Status ${robots.status}) — damit gilt für alle Crawler die Standardannahme "erlaubt". Geprüft wurden: ${KI_CRAWLER.map((c) => c.name).join(", ")}.`,
      ),
    );
  } else {
    const { gesperrt, alleGesperrt } = findeGesperrteCrawler(robots.body);

    if (alleGesperrt) {
      befunde.push(
        kritisch(
          "geo-ki-crawler",
          "Ihre Seite sperrt alle automatischen Besucher aus",
          "Ihre Website weist pauschal alle Crawler ab — damit auch ChatGPT, Claude und Perplexity. Fragt jemand eine KI nach einem Betrieb wie Ihrem, kommen Sie schlicht nicht vor.",
          `Die robots.txt enthält "User-agent: *" mit "Disallow: /". Das schließt neben Google auch sämtliche KI-Crawler aus: ${KI_CRAWLER.map((c) => c.name).join(", ")}.`,
          "klein",
        ),
      );
    } else if (gesperrt.length > 0) {
      befunde.push(
        kritisch(
          "geo-ki-crawler",
          `Sie sperren ${gesperrt.length} KI-Suchmaschine${gesperrt.length === 1 ? "" : "n"} aus`,
          `Ihre Website verbietet ${gesperrt.map((c) => c.betreiber).filter((wert, i, alle) => alle.indexOf(wert) === i).join(" und ")} ausdrücklich den Zugriff. Fragt ein Kunde dort nach einem Betrieb wie Ihrem, können Sie nicht empfohlen werden — Ihr Wettbewerb schon.`,
          `Gesperrte KI-Crawler laut ${kontext.robotsTxt.url}:\n${gesperrt.map((c) => `• ${c.name} (${c.betreiber}) — ${c.regel}`).join("\n")}\n\nNicht gesperrt: ${KI_CRAWLER.filter((c) => !gesperrt.some((g) => g.name === c.name)).map((c) => c.name).join(", ") || "keine"}.\n\nHinweis: Manche Betriebe sperren KI-Crawler bewusst, um ihre Inhalte nicht als Trainingsmaterial herzugeben. Das ist eine legitime Entscheidung — sie kostet aber Sichtbarkeit in KI-Antworten. Wenn die Sperre nicht bewusst gesetzt wurde (häufig durch ein Plugin oder eine Hoster-Voreinstellung), sollte sie weg.`,
          "klein",
        ),
      );
    } else {
      befunde.push(
        gut(
          "geo-ki-crawler",
          "KI-Suchmaschinen dürfen Ihre Seite lesen",
          "ChatGPT, Claude, Perplexity und Google Gemini dürfen Ihre Website auslesen. Damit sind Sie überhaupt erst empfehlbar, wenn jemand eine KI nach einem Betrieb wie Ihrem fragt — bitte so lassen.",
          `Keiner der geprüften KI-Crawler ist in ${kontext.robotsTxt.url} gesperrt. Geprüft: ${KI_CRAWLER.map((c) => `${c.name} (${c.betreiber})`).join(", ")}.`,
        ),
      );
    }
  }

  // --- Schema.org JSON-LD ------------------------------------------------
  const jsonLdBloecke = $('script[type="application/ld+json"]')
    .toArray()
    .map((element) => $(element).text().trim())
    .filter((inhalt) => inhalt !== "");

  const knoten = sammleJsonLd(jsonLdBloecke);
  const gefundeneTypen = typenAus(knoten);
  const relevanteTypen = gefundeneTypen.filter(
    (typ) => RELEVANTE_TYPEN.includes(typ) || LOCALBUSINESS_SUBTYPEN.test(typ),
  );

  if (jsonLdBloecke.length === 0) {
    befunde.push(
      kritisch(
        "geo-jsonld",
        "Ihre Seite erklärt Maschinen nicht, wer Sie sind",
        "Für einen Menschen ist auf Ihrer Seite klar, dass Sie ein Betrieb mit Adresse und Öffnungszeiten sind. Für ChatGPT und Google ist das nur Fließtext — es fehlt die maschinenlesbare Auszeichnung, die daraus verwertbare Fakten macht.",
        "Kein `<script type=\"application/ld+json\">` im HTML gefunden. Empfehlung: Ein LocalBusiness-Schema (oder passender Subtyp wie HairSalon, Electrician, ProfessionalService) mit name, address, telephone, openingHoursSpecification, areaServed und url. Anschließend mit dem Google Rich Results Test prüfen.",
        "mittel",
      ),
    );
  } else if (knoten.length === 0) {
    befunde.push(
      verbesserbar(
        "geo-jsonld",
        "Ihre maschinenlesbaren Angaben sind fehlerhaft",
        "Ihre Seite enthält Angaben für Suchmaschinen und KI-Systeme, die sich aber nicht auslesen lassen — sie sind fehlerhaft aufgebaut. Damit bringen sie derzeit nichts.",
        `${jsonLdBloecke.length} JSON-LD-Block/Blöcke gefunden, aber keiner ließ sich als gültiges JSON verarbeiten. Mit dem Google Rich Results Test oder validator.schema.org prüfen.`,
        "klein",
      ),
    );
  } else if (relevanteTypen.length === 0) {
    befunde.push(
      verbesserbar(
        "geo-jsonld",
        "Ihre maschinenlesbaren Angaben beschreiben nicht Ihren Betrieb",
        "Ihre Seite liefert zwar Angaben für Maschinen, aber keine, die Ihren Betrieb als solchen beschreiben. Für eine Empfehlung durch eine KI fehlt damit das Wichtigste.",
        `Gefundene Typen: ${gefundeneTypen.join(", ") || "keine"}. Erwartet wird mindestens einer aus: ${RELEVANTE_TYPEN.join(", ")} (oder ein LocalBusiness-Subtyp).`,
        "mittel",
      ),
    );
  } else {
    befunde.push(
      gut(
        "geo-jsonld",
        "Ihre Seite erklärt Maschinen, wer Sie sind",
        `Ihre Website liefert Suchmaschinen und KI-Systemen strukturierte Angaben zu Ihrem Betrieb (${relevanteTypen.join(", ")}). Das ist genau die Grundlage dafür, in KI-Antworten korrekt genannt zu werden.`,
        `${jsonLdBloecke.length} JSON-LD-Block/Blöcke, ${knoten.length} Objekt(e). Relevante Typen: ${relevanteTypen.join(", ")}. Alle gefundenen Typen: ${gefundeneTypen.join(", ")}.`,
      ),
    );
  }

  // --- Adresse, Telefon, Öffnungszeiten maschinenlesbar ------------------
  if (knoten.length === 0) {
    befunde.push(
      ungeprueft(
        "geo-nap",
        "Adresse, Telefon und Öffnungszeiten für Maschinen",
        "Ohne auslesbare Angaben ließ sich nicht prüfen, ob Ihre Kontaktdaten maschinenlesbar hinterlegt sind.",
        "Keine verwertbaren JSON-LD-Objekte vorhanden. Nicht bewertet.",
      ),
    );
  } else {
    const hatAdresse = hatFeld(knoten, "address") || hatFeld(knoten, "streetAddress");
    const hatTelefon = hatFeld(knoten, "telephone");
    const hatZeiten =
      hatFeld(knoten, "openingHours") || hatFeld(knoten, "openingHoursSpecification");

    const vorhanden = [
      hatAdresse ? "Adresse" : null,
      hatTelefon ? "Telefon" : null,
      hatZeiten ? "Öffnungszeiten" : null,
    ].filter((wert): wert is string => wert !== null);
    const fehlend = [
      hatAdresse ? null : "Adresse",
      hatTelefon ? null : "Telefonnummer",
      hatZeiten ? null : "Öffnungszeiten",
    ].filter((wert): wert is string => wert !== null);

    const technisch = `Im JSON-LD gefunden: ${vorhanden.join(", ") || "nichts davon"}. Fehlend: ${fehlend.join(", ") || "nichts"}. Erwartete Felder: address/streetAddress, telephone, openingHoursSpecification.`;

    if (fehlend.length === 0) {
      befunde.push(
        gut(
          "geo-nap",
          "Ihre Kontaktdaten sind maschinenlesbar hinterlegt",
          "Adresse, Telefonnummer und Öffnungszeiten stehen bei Ihnen nicht nur als Text da, sondern in einer Form, die Google und KI-Systeme direkt übernehmen können. Genau so gehört es sich.",
          technisch,
        ),
      );
    } else if (vorhanden.length > 0) {
      befunde.push(
        verbesserbar(
          "geo-nap",
          `Maschinenlesbar fehlt noch: ${fehlend.join(", ")}`,
          `Ein Teil Ihrer Kontaktdaten ist für Maschinen hinterlegt, ${fehlend.join(" und ")} aber nicht. Fragt jemand eine KI „Hat der Betrieb heute offen?“, fehlt genau die Antwort.`,
          technisch,
          "klein",
        ),
      );
    } else {
      befunde.push(
        verbesserbar(
          "geo-nap",
          "Ihre Kontaktdaten sind nur Fließtext",
          "Adresse, Telefonnummer und Öffnungszeiten stehen auf Ihrer Seite, aber nur als normaler Text. Maschinen müssen raten, statt die Angaben sicher zu übernehmen.",
          technisch,
          "klein",
        ),
      );
    }
  }

  // --- Anteil echter Fließtext ------------------------------------------
  // KI-Systeme lesen keine Bilder und keine Slider-Grafiken. Entscheidend ist,
  // wie viel echter Text überhaupt da ist.
  const körper = $("body").clone();
  körper.find("script, style, noscript, nav, footer, header").remove();
  const fliesstext = körper.text().replace(/\s+/g, " ").trim();
  const woerter = fliesstext === "" ? 0 : fliesstext.split(/\s+/).length;
  const bilderAnzahl = $("img").length;

  if (woerter >= 300) {
    befunde.push(
      gut(
        "geo-textanteil",
        "Ihre Seite hat genug lesbaren Text",
        `Auf Ihrer Startseite stehen rund ${woerter} Wörter echter Text. KI-Systeme können daraus tatsächlich etwas über Sie lernen — bei Seiten, die alles in Bilder packen, geht das nicht.`,
        `${woerter} Wörter Fließtext im <body> (ohne Skripte, Navigation, Kopf- und Fußbereich), bei ${bilderAnzahl} Bild(ern). Ab etwa 300 Wörtern lässt sich ein Angebot inhaltlich erfassen.`,
      ),
    );
  } else if (woerter >= 120) {
    befunde.push(
      verbesserbar(
        "geo-textanteil",
        "Auf Ihrer Seite steht wenig lesbarer Text",
        `Ihre Startseite kommt auf etwa ${woerter} Wörter. Für Menschen mag das reichen — KI-Systeme haben damit zu wenig, um Ihr Angebot zu verstehen und Sie gezielt zu empfehlen.`,
        `Nur ${woerter} Wörter Fließtext bei ${bilderAnzahl} Bild(ern). Text in Bildern, Slidern oder Videos ist für KI-Systeme unsichtbar. Empfehlung: Leistungen und Einzugsgebiet in zwei bis drei Absätzen ausschreiben.`,
        "mittel",
      ),
    );
  } else {
    befunde.push(
      kritisch(
        "geo-textanteil",
        "Ihre Seite ist für KI-Systeme fast leer",
        `Auf Ihrer Startseite stehen nur rund ${woerter} Wörter. Was in Bildern oder Slidern steht, können KI-Systeme nicht lesen — für sie ist Ihre Seite damit praktisch inhaltslos.`,
        `Nur ${woerter} Wörter Fließtext bei ${bilderAnzahl} Bild(ern). Häufige Ursache: Der Inhalt steckt in Grafiken oder wird erst per JavaScript nachgeladen. Dieser Check liest das HTML so, wie es der Server ausliefert — genau wie die meisten KI-Crawler auch.`,
        "mittel",
      ),
    );
  }

  // --- FAQ-Abschnitt -----------------------------------------------------
  const hatFaqSchema = gefundeneTypen.includes("FAQPage") || gefundeneTypen.includes("Question");
  const faqUeberschrift = $("h1, h2, h3, h4")
    .toArray()
    .some((element) =>
      /faq|häufige fragen|häufig gestellte|fragen und antworten|gute frage/i.test(
        $(element).text(),
      ),
    );
  const fragezeichenUeberschriften = $("h2, h3, h4")
    .toArray()
    .filter((element) => $(element).text().trim().endsWith("?")).length;

  if (hatFaqSchema) {
    befunde.push(
      gut(
        "geo-faq",
        "Ihre Fragen und Antworten sind KI-tauglich ausgezeichnet",
        "Sie haben einen Frage-Antwort-Bereich, und er ist maschinenlesbar hinterlegt. Das ist der stärkste einzelne Hebel für KI-Sichtbarkeit, weil KI-Systeme solche Paare direkt übernehmen.",
        `FAQPage- bzw. Question-Schema im JSON-LD gefunden. Sichtbare FAQ-Überschrift auf der Seite: ${faqUeberschrift ? "ja" : "nein"}.`,
      ),
    );
  } else if (faqUeberschrift || fragezeichenUeberschriften >= 3) {
    befunde.push(
      verbesserbar(
        "geo-faq",
        "Ihr Frage-Antwort-Bereich ist nicht ausgezeichnet",
        "Sie beantworten auf Ihrer Seite typische Kundenfragen — das ist genau richtig. Es fehlt nur die maschinenlesbare Auszeichnung, damit KI-Systeme diese Antworten auch als solche erkennen und zitieren.",
        `Sichtbarer FAQ-Bereich erkannt (${faqUeberschrift ? "Überschrift mit FAQ-Bezug" : `${fragezeichenUeberschriften} Überschriften enden mit einem Fragezeichen`}), aber kein FAQPage-Schema im JSON-LD. Ergänzen — aber nur für tatsächlich sichtbare Fragen, sonst droht eine Google-Abwertung.`,
        "klein",
      ),
    );
  } else {
    befunde.push(
      verbesserbar(
        "geo-faq",
        "Es fehlt ein Bereich mit häufigen Fragen",
        "Ein kurzer Abschnitt mit den fünf Fragen, die Ihnen Kunden ständig am Telefon stellen, ist der wirksamste einzelne Schritt für KI-Sichtbarkeit. KI-Systeme übernehmen solche Antworten fast wörtlich.",
        "Weder ein FAQPage-Schema noch eine erkennbare Frage-Antwort-Struktur auf der Startseite gefunden. Empfehlung: 5–8 echte Kundenfragen mit knappen, konkreten Antworten, sichtbar auf der Seite und zusätzlich als FAQPage-Schema ausgezeichnet.",
        "klein",
      ),
    );
  }

  // --- Erster Absatz: Was und Wo ----------------------------------------
  const ersterAbsatz =
    $("main p, article p, body p")
      .toArray()
      .map((element) => $(element).text().replace(/\s+/g, " ").trim())
      .find((text) => text.length > 60) ?? "";

  const h1Text = $("h1").first().text().replace(/\s+/g, " ").trim();
  const einstieg = `${h1Text} ${ersterAbsatz}`.trim();

  if (einstieg.length < 40) {
    befunde.push(
      verbesserbar(
        "geo-einstieg",
        "Ihr Einstiegstext sagt nicht, was Sie anbieten",
        "Ganz oben auf Ihrer Seite steht kein Satz, der klar sagt, was Sie tun und wo. Genau diesen Satz zitieren KI-Systeme, wenn sie jemandem Ihren Betrieb erklären sollen.",
        `Weder eine aussagekräftige H1 noch ein erster Absatz mit mehr als 60 Zeichen gefunden. Empfehlung: zwei bis drei Sätze ganz oben, die Leistung, Zielgruppe und Einzugsgebiet konkret benennen.`,
        "klein",
      ),
    );
  } else {
    // Ortsbezug: PLZ, "in <Ort>", Region, oder typische Umkreis-Formulierungen.
    const hatOrtsbezug =
      /\b\d{5}\b|\bin\s+[A-ZÄÖÜ][a-zäöüß]{2,}|\bumkreis\b|\bumgebung\b|\bregion\b|\braum\s+[A-ZÄÖÜ]|\blandkreis\b|\bkreis\s+[A-ZÄÖÜ]/i.test(
        einstieg,
      );
    // Leistungsbezug: Verben und Substantive, die ein Angebot benennen.
    const hatLeistungsbezug =
      /\b(?:bieten|anbieten|beraten|beratung|montage|installation|reparatur|service|leistungen|spezialisiert|betreuen|planen|fertigen|liefern|behandlung|praxis|kanzlei|werkstatt|meisterbetrieb|seit\s+\d{4})\b/i.test(
        einstieg,
      );

    if (hatOrtsbezug && hatLeistungsbezug) {
      befunde.push(
        gut(
          "geo-einstieg",
          "Ihr Einstiegstext sagt klar, was Sie wo anbieten",
          "Gleich oben auf Ihrer Seite steht, welche Leistung Sie in welcher Gegend erbringen. Das ist genau der Satz, den eine KI zitiert, wenn sie jemandem Ihren Betrieb empfiehlt.",
          `Einstieg enthält sowohl einen Orts- als auch einen Leistungsbezug. Ausgewertet wurden H1 und der erste Absatz mit mehr als 60 Zeichen:\n"${einstieg.slice(0, 300)}${einstieg.length > 300 ? "…" : ""}"`,
        ),
      );
    } else {
      const fehlt = [
        hatLeistungsbezug ? null : "was Sie konkret anbieten",
        hatOrtsbezug ? null : "wo Sie tätig sind",
      ].filter((wert): wert is string => wert !== null);

      befunde.push(
        verbesserbar(
          "geo-einstieg",
          `Ihrem Einstiegstext fehlt: ${fehlt.join(" und ")}`,
          `Der Text ganz oben auf Ihrer Seite lässt offen, ${fehlt.join(" und ")}. Eine KI kann Sie dann nur vage erwähnen statt gezielt zu empfehlen.`,
          `Ausgewertet wurden H1 und der erste Absatz mit mehr als 60 Zeichen:\n"${einstieg.slice(0, 300)}${einstieg.length > 300 ? "…" : ""}"\n\nOrtsbezug erkannt: ${hatOrtsbezug ? "ja" : "nein"}. Leistungsbezug erkannt: ${hatLeistungsbezug ? "ja" : "nein"}. Diese Erkennung arbeitet mit Stichworten und kann bei ungewöhnlichen Formulierungen danebenliegen — der Text ist oben mit abgedruckt, damit Sie das selbst beurteilen können.`,
          "klein",
        ),
      );
    }
  }

  return {
    befunde,
    manuelleHinweise: [
      "Ein gepflegtes Google-Unternehmensprofil zahlt stark auf die Sichtbarkeit in KI-Suchen ein, lässt sich von außen aber nicht automatisch prüfen. Falls noch nicht geschehen: Profil anlegen, Kategorie exakt wählen, alle Felder ausfüllen, mindestens fünf Fotos hinterlegen und Bewertungen aktiv einholen.",
      "Auch die Bing Webmaster Tools lohnen sich, weil die Suche in ChatGPT unter anderem auf den Bing-Index zurückgreift. Der Import aus der Google Search Console dauert wenige Minuten und wird fast immer vergessen.",
    ],
  };
}

export const geoModul: PruefModul = {
  id: "geo",
  pruefe: pruefeGeo,
};
