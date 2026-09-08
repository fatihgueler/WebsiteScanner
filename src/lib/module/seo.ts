import { gut, kritisch, ungeprueft, verbesserbar } from "@/lib/befund";
import type { PruefKontext } from "@/lib/kontext";
import type { ModulErgebnis, PruefModul } from "@/lib/module";
import type { Befund } from "@/lib/types";

/**
 * Modul 4 — Sichtbarkeit bei Google.
 *
 * Klassisches technisches SEO: verstehen Suchmaschinen, worum es auf der Seite
 * geht, und finden sie überhaupt alle Unterseiten.
 */

function pruefeSeo(kontext: PruefKontext): ModulErgebnis {
  const befunde: Befund[] = [];
  const { $, basisUrl } = kontext;

  // --- Title-Tag ---------------------------------------------------------
  const title = $("head title").first().text().replace(/\s+/g, " ").trim();

  if (title === "") {
    befunde.push(
      kritisch(
        "seo-title",
        "Ihrer Seite fehlt die Überschrift für Google",
        "In den Google-Ergebnissen ist das die blaue, anklickbare Zeile. Fehlt sie, denkt sich Google selbst etwas aus — meist etwas Unpassendes.",
        "Kein oder leerer `<title>` im `<head>`. Empfohlen sind 30–60 Zeichen nach dem Muster: Leistung + Ort + Firmenname.",
        "klein",
      ),
    );
  } else if (title.length < 30) {
    befunde.push(
      verbesserbar(
        "seo-title",
        "Ihre Google-Überschrift ist sehr kurz",
        `„${title}“ steht als Überschrift in den Suchergebnissen. Da ist Platz für Ihre Leistung und Ihren Ort — das bringt zusätzliche Anfragen.`,
        `\`<title>\` mit ${title.length} Zeichen: "${title}". Empfohlen sind 30–60 Zeichen, z. B. "Elektroinstallation in Hannover | Mustermann GmbH".`,
        "klein",
      ),
    );
  } else if (title.length > 60) {
    befunde.push(
      verbesserbar(
        "seo-title",
        "Ihre Google-Überschrift wird abgeschnitten",
        "Google zeigt nur den Anfang Ihrer Überschrift und schneidet den Rest mit drei Punkten ab. Das Wichtigste sollte vorne stehen.",
        `\`<title>\` mit ${title.length} Zeichen: "${title}". Google schneidet je nach Breite ab etwa 60 Zeichen ab.`,
        "klein",
      ),
    );
  } else {
    befunde.push(
      gut(
        "seo-title",
        "Ihre Google-Überschrift hat die richtige Länge",
        `„${title}“ erscheint vollständig in den Suchergebnissen, ohne abgeschnitten zu werden. Das passt so.`,
        `\`<title>\` mit ${title.length} Zeichen (Zielbereich 30–60).`,
      ),
    );
  }

  // --- Meta-Description --------------------------------------------------
  const description =
    $('meta[name="description"]').attr("content")?.replace(/\s+/g, " ").trim() ?? "";

  if (description === "") {
    befunde.push(
      verbesserbar(
        "seo-description",
        "Ihrer Seite fehlt der Beschreibungstext für Google",
        "Unter dem Link in den Suchergebnissen stehen zwei Zeilen Text. Ohne eigene Angabe pflückt Google sich irgendetwas von der Seite zusammen — selten das Beste.",
        "Kein `<meta name=\"description\">` gefunden. Empfohlen sind 70–160 Zeichen mit konkretem Nutzen und Ort.",
        "klein",
      ),
    );
  } else if (description.length < 70) {
    befunde.push(
      verbesserbar(
        "seo-description",
        "Ihr Beschreibungstext ist zu kurz",
        "Der Text unter Ihrem Link in den Suchergebnissen verschenkt Platz. Ein Satz mehr über Ihr Angebot bringt messbar mehr Klicks.",
        `\`<meta name="description">\` mit ${description.length} Zeichen: "${description}". Zielbereich: 70–160 Zeichen.`,
        "klein",
      ),
    );
  } else if (description.length > 160) {
    befunde.push(
      verbesserbar(
        "seo-description",
        "Ihr Beschreibungstext wird abgeschnitten",
        "Google zeigt Ihren Beschreibungstext nur bis zu einer bestimmten Länge. Der Rest fällt weg — kürzen lohnt sich.",
        `\`<meta name="description">\` mit ${description.length} Zeichen. Google zeigt je nach Gerät etwa 160 Zeichen.`,
        "klein",
      ),
    );
  } else {
    befunde.push(
      gut(
        "seo-description",
        "Ihr Beschreibungstext hat die richtige Länge",
        "Der Text, der unter Ihrem Link in den Suchergebnissen steht, ist passend lang und wird vollständig angezeigt. Gut gemacht.",
        `\`<meta name="description">\` mit ${description.length} Zeichen (Zielbereich 70–160): "${description}"`,
      ),
    );
  }

  // --- Genau eine H1 -----------------------------------------------------
  const h1Liste = $("h1")
    .toArray()
    .map((element) => $(element).text().replace(/\s+/g, " ").trim())
    .filter((text) => text !== "");

  if (h1Liste.length === 0) {
    befunde.push(
      verbesserbar(
        "seo-h1",
        "Ihrer Seite fehlt die Hauptüberschrift",
        "Es gibt keine erkennbare Hauptüberschrift. Google nutzt sie, um zu verstehen, worum es auf der Seite geht.",
        "Kein `<h1>` mit Inhalt gefunden. Genau eine H1 pro Seite ist die Regel — idealerweise mit Leistung und Ort.",
        "klein",
      ),
    );
  } else if (h1Liste.length > 1) {
    befunde.push(
      verbesserbar(
        "seo-h1",
        "Ihre Seite hat mehrere Hauptüberschriften",
        `Auf Ihrer Seite stehen ${h1Liste.length} gleichrangige Hauptüberschriften. Für Google ist damit unklar, was das eigentliche Thema ist.`,
        `${h1Liste.length} <h1>-Elemente: ${h1Liste.map((t) => `"${t}"`).join(", ")}. Genau eine H1 behalten, die übrigen zu H2 herabstufen.`,
        "klein",
      ),
    );
  } else {
    befunde.push(
      gut(
        "seo-h1",
        "Ihre Seite hat genau eine Hauptüberschrift",
        `„${h1Liste[0]}“ ist die Hauptüberschrift Ihrer Seite. Genau eine zu haben ist richtig — das hilft Google beim Einordnen.`,
        `Ein <h1>: "${h1Liste[0]}"`,
      ),
    );
  }

  // --- Überschriftenhierarchie ------------------------------------------
  const ueberschriften = $("h1, h2, h3, h4, h5, h6")
    .toArray()
    .map((element) => ({
      ebene: Number((element as { tagName?: string }).tagName?.slice(1) ?? "0"),
      text: $(element).text().replace(/\s+/g, " ").trim(),
    }))
    .filter((eintrag) => eintrag.ebene > 0);

  const spruenge: string[] = [];
  for (let i = 1; i < ueberschriften.length; i += 1) {
    const vorher = ueberschriften[i - 1];
    const jetzt = ueberschriften[i];
    if (jetzt.ebene > vorher.ebene + 1) {
      spruenge.push(`H${vorher.ebene} → H${jetzt.ebene} bei "${jetzt.text.slice(0, 50)}"`);
    }
  }

  if (ueberschriften.length === 0) {
    befunde.push(
      ungeprueft(
        "seo-hierarchie",
        "Gliederung Ihrer Überschriften",
        "Auf der Seite wurden keine Überschriften gefunden, deren Gliederung sich prüfen ließe.",
        "Keine <h1>–<h6>-Elemente im HTML. Nicht bewertet.",
      ),
    );
  } else if (spruenge.length === 0) {
    befunde.push(
      gut(
        "seo-hierarchie",
        "Ihre Überschriften sind sauber gegliedert",
        "Ihre Überschriften bauen ordentlich aufeinander auf, ohne Ebenen zu überspringen. Das hilft Google und auch Menschen, die Ihre Seite vorlesen lassen.",
        `${ueberschriften.length} Überschriften ohne übersprungene Ebene. Reihenfolge: ${ueberschriften.map((u) => `H${u.ebene}`).join(" ")}`,
      ),
    );
  } else {
    befunde.push(
      verbesserbar(
        "seo-hierarchie",
        "Ihre Überschriften überspringen Ebenen",
        "In Ihrer Gliederung fehlen Zwischenebenen — etwa wenn nach einer Hauptüberschrift direkt eine Unter-Unter-Überschrift kommt. Wer die Seite vorlesen lässt, verliert dadurch den Faden.",
        `${spruenge.length} Sprung/Sprünge: ${spruenge.join(" | ")}. Vollständige Reihenfolge: ${ueberschriften.map((u) => `H${u.ebene}`).join(" ")}`,
        "klein",
      ),
    );
  }

  // --- robots.txt --------------------------------------------------------
  const robots = kontext.robotsTxt.antwort;
  const robotsInhalt = robots?.body ?? "";
  const robotsVorhanden =
    robots !== null && robots.status >= 200 && robots.status < 300 && robotsInhalt.trim() !== "";

  if (robots === null) {
    befunde.push(
      ungeprueft(
        "seo-robots",
        "Wegweiser für Suchmaschinen (robots.txt)",
        "Ob Ihre Seite einen Wegweiser für Suchmaschinen hat, ließ sich nicht prüfen.",
        `${kontext.robotsTxt.url} war nicht abrufbar. Nicht bewertet.`,
      ),
    );
  } else if (!robotsVorhanden) {
    befunde.push(
      verbesserbar(
        "seo-robots",
        "Es fehlt der Wegweiser für Suchmaschinen",
        "Suchmaschinen suchen beim Besuch zuerst nach einer kleinen Wegweiser-Datei. Sie fehlt bei Ihnen — das ist kein Beinbruch, aber eine verschenkte Gelegenheit.",
        `${kontext.robotsTxt.url} antwortet mit Status ${robots.status}${robotsInhalt.trim() === "" ? " bzw. ist leer" : ""}. Eine robots.txt mit Sitemap-Verweis ist in fünf Minuten angelegt.`,
        "klein",
      ),
    );
  } else {
    // Blockiert die robots.txt versehentlich die ganze Seite?
    const blocktAlles = /User-agent:\s*\*[\s\S]*?Disallow:\s*\/\s*(?:\n|$)/i.test(robotsInhalt);

    if (blocktAlles) {
      befunde.push(
        kritisch(
          "seo-robots",
          "Ihre Seite sperrt Suchmaschinen komplett aus",
          "Ihre Wegweiser-Datei sagt allen Suchmaschinen, sie sollen die gesamte Website ignorieren. Damit taucht Ihr Betrieb bei Google praktisch nicht auf.",
          `${kontext.robotsTxt.url} enthält für "User-agent: *" ein "Disallow: /". Das schließt die vollständige Website von der Indexierung aus. Häufige Ursache: Die Datei stammt noch aus der Bauphase der Website.`,
          "klein",
        ),
      );
    } else {
      befunde.push(
        gut(
          "seo-robots",
          "Ihr Wegweiser für Suchmaschinen ist da",
          "Ihre Seite hat die kleine Wegweiser-Datei, nach der Suchmaschinen zuerst schauen, und sie sperrt nichts Wichtiges aus. Passt.",
          `${kontext.robotsTxt.url} antwortet mit Status ${robots.status}, ${robotsInhalt.trim().split(/\r?\n/).length} Zeile(n), kein pauschales "Disallow: /".`,
        ),
      );
    }
  }

  // --- sitemap.xml -------------------------------------------------------
  const sitemap = kontext.sitemapXml.antwort;
  const inRobotsReferenziert = /^\s*sitemap:\s*\S+/im.test(robotsInhalt);

  if (sitemap === null) {
    befunde.push(
      ungeprueft(
        "seo-sitemap",
        "Inhaltsverzeichnis für Suchmaschinen (sitemap.xml)",
        "Ob Ihre Seite ein Inhaltsverzeichnis für Suchmaschinen hat, ließ sich nicht prüfen.",
        `${kontext.sitemapXml.url} war nicht abrufbar. Nicht bewertet.`,
      ),
    );
  } else if (sitemap.status >= 200 && sitemap.status < 300) {
    if (inRobotsReferenziert) {
      befunde.push(
        gut(
          "seo-sitemap",
          "Ihr Inhaltsverzeichnis für Suchmaschinen ist vorbildlich",
          "Ihre Seite hat ein Inhaltsverzeichnis aller Unterseiten und weist Suchmaschinen sogar aktiv darauf hin. So finden auch neue Seiten schnell in den Index.",
          `${kontext.sitemapXml.url} antwortet mit Status ${sitemap.status} und ist in der robots.txt per "Sitemap:"-Zeile referenziert.`,
        ),
      );
    } else {
      befunde.push(
        verbesserbar(
          "seo-sitemap",
          "Ihr Inhaltsverzeichnis ist da, aber nicht angemeldet",
          "Ihre Seite hat ein Inhaltsverzeichnis für Suchmaschinen, weist aber nicht darauf hin. Eine einzige Zeile mehr, und neue Unterseiten werden schneller gefunden.",
          `${kontext.sitemapXml.url} antwortet mit Status ${sitemap.status}, aber die robots.txt enthält keine "Sitemap:"-Zeile. Ergänzen: "Sitemap: ${kontext.sitemapXml.url}".`,
          "klein",
        ),
      );
    }
  } else {
    befunde.push(
      verbesserbar(
        "seo-sitemap",
        "Es fehlt das Inhaltsverzeichnis für Suchmaschinen",
        "Suchmaschinen müssen sich jede Unterseite selbst zusammensuchen. Mit einem Inhaltsverzeichnis geht das schneller und vollständiger.",
        `${kontext.sitemapXml.url} antwortet mit Status ${sitemap.status}. Die meisten Systeme erzeugen eine sitemap.xml auf Knopfdruck oder per Erweiterung.`,
        "klein",
      ),
    );
  }

  // --- Canonical ---------------------------------------------------------
  const canonical = $('link[rel="canonical"]').attr("href")?.trim() ?? "";
  if (canonical === "") {
    befunde.push(
      verbesserbar(
        "seo-canonical",
        "Ihre Seite benennt nicht ihre eigene Hauptadresse",
        "Ist dieselbe Seite unter mehreren Adressen erreichbar, weiß Google nicht, welche die richtige ist. Eine Angabe im Quelltext klärt das ein für alle Mal.",
        "Kein `<link rel=\"canonical\">` im `<head>`. Empfehlung: auf jeder Seite die bevorzugte Adresse angeben.",
        "klein",
      ),
    );
  } else {
    let stimmt = false;
    try {
      const kanonisch = new URL(canonical, basisUrl);
      stimmt = kanonisch.hostname === basisUrl.hostname;
    } catch {
      stimmt = false;
    }

    if (stimmt) {
      befunde.push(
        gut(
          "seo-canonical",
          "Ihre Seite benennt ihre eigene Hauptadresse",
          "Im Quelltext steht eindeutig, welche Adresse für diese Seite die maßgebliche ist. Damit kann Google gar nicht erst durcheinanderkommen.",
          `\`<link rel="canonical" href="${canonical}">\``,
        ),
      );
    } else {
      befunde.push(
        verbesserbar(
          "seo-canonical",
          "Ihre Seite verweist auf eine fremde Adresse",
          "Im Quelltext steht, dass die maßgebliche Fassung dieser Seite woanders liegt. Falls das nicht beabsichtigt ist, verschenken Sie damit Ihre gesamte Sichtbarkeit.",
          `\`<link rel="canonical" href="${canonical}">\` zeigt auf eine andere Domain als ${basisUrl.hostname}. Bitte prüfen, ob das gewollt ist — häufig ein Kopierfehler aus einer Vorlage.`,
          "klein",
        ),
      );
    }
  }

  // --- Open Graph / Twitter Card ----------------------------------------
  const ogTitle = $('meta[property="og:title"]').attr("content")?.trim() ?? "";
  const ogBeschreibung = $('meta[property="og:description"]').attr("content")?.trim() ?? "";
  const ogBild = $('meta[property="og:image"]').attr("content")?.trim() ?? "";
  const twitterCard = $('meta[name="twitter:card"]').attr("content")?.trim() ?? "";
  const twitterBild = $('meta[name="twitter:image"]').attr("content")?.trim() ?? "";

  const hatBild = ogBild !== "" || twitterBild !== "";
  const hatText = ogTitle !== "" || ogBeschreibung !== "";

  if (hatBild && hatText) {
    befunde.push(
      gut(
        "seo-social-vorschau",
        "Geteilte Links zeigen eine schöne Vorschau",
        "Wenn jemand Ihre Seite bei WhatsApp oder Facebook teilt, erscheint eine ordentliche Vorschau mit Bild und Text statt einer nackten Adresse. Das wird deutlich häufiger angeklickt.",
        `og:title: ${ogTitle !== "" ? "vorhanden" : "fehlt"}, og:description: ${ogBeschreibung !== "" ? "vorhanden" : "fehlt"}, og:image: ${ogBild !== "" ? ogBild : "fehlt"}, twitter:card: ${twitterCard !== "" ? twitterCard : "fehlt"}.`,
      ),
    );
  } else if (hatText) {
    befunde.push(
      verbesserbar(
        "seo-social-vorschau",
        "Geteilten Links fehlt das Vorschaubild",
        "Teilt jemand Ihre Seite bei WhatsApp, erscheint Text ohne Bild. Mit Bild wird ein geteilter Link deutlich häufiger angeklickt.",
        `og:image und twitter:image fehlen beide. Ein Bild mit 1200×630 Pixeln ergänzen und per \`<meta property="og:image" content="...">\` einbinden.`,
        "klein",
      ),
    );
  } else {
    befunde.push(
      verbesserbar(
        "seo-social-vorschau",
        "Geteilte Links sehen unattraktiv aus",
        "Schickt jemand Ihre Adresse per WhatsApp weiter, erscheint nur die nackte Adresse ohne Bild und Beschreibung. Das sieht nach nichts aus und wird selten angeklickt.",
        "Weder Open-Graph- noch Twitter-Card-Angaben gefunden. Mindestens og:title, og:description und og:image (1200×630 Pixel) ergänzen.",
        "klein",
      ),
    );
  }

  // --- Alt-Texte ---------------------------------------------------------
  const bilder = $("img").toArray();
  if (bilder.length === 0) {
    befunde.push(
      ungeprueft(
        "seo-alt",
        "Bildbeschreibungen",
        "Auf Ihrer Startseite wurden keine Bilder gefunden, deren Beschreibungen sich prüfen ließen.",
        "Keine <img>-Elemente im HTML. Nicht bewertet.",
      ),
    );
  } else {
    // Dekorative Bilder mit alt="" sind korrekt ausgezeichnet und zählen als
    // in Ordnung — nicht als fehlender Alt-Text.
    const ohneAltAttribut = bilder.filter((element) => $(element).attr("alt") === undefined);
    const anteilOk = Math.round(
      ((bilder.length - ohneAltAttribut.length) / bilder.length) * 100,
    );

    if (ohneAltAttribut.length === 0) {
      befunde.push(
        gut(
          "seo-alt",
          "Alle Ihre Bilder sind beschrieben",
          "Jedes Bild auf Ihrer Seite hat eine Textbeschreibung. Das hilft blinden Besuchern, der Google-Bildersuche — und ist obendrein Pflicht für barrierefreie Seiten.",
          `${bilder.length} von ${bilder.length} Bildern (100 %) haben ein alt-Attribut. Leere alt="" bei rein dekorativen Bildern sind korrekt und zählen mit.`,
        ),
      );
    } else if (anteilOk >= 80) {
      befunde.push(
        verbesserbar(
          "seo-alt",
          "Einigen Bildern fehlt die Beschreibung",
          `${anteilOk} Prozent Ihrer Bilder sind beschrieben — bei ${ohneAltAttribut.length} fehlt der Text noch. Für blinde Besucher sind diese Bilder unsichtbar.`,
          `${ohneAltAttribut.length} von ${bilder.length} <img>-Elementen ohne alt-Attribut. Rein dekorative Bilder bekommen alt="" (leer), inhaltstragende eine kurze Beschreibung.`,
          "klein",
        ),
      );
    } else {
      befunde.push(
        verbesserbar(
          "seo-alt",
          "Den meisten Bildern fehlt die Beschreibung",
          `Nur ${anteilOk} Prozent Ihrer Bilder haben eine Textbeschreibung. Blinde Besucher erfahren nicht, was darauf zu sehen ist, und die Google-Bildersuche findet sie nicht.`,
          `${ohneAltAttribut.length} von ${bilder.length} <img>-Elementen ohne alt-Attribut (${anteilOk} % versorgt).`,
          "mittel",
        ),
      );
    }
  }

  // --- lang-Attribut -----------------------------------------------------
  const lang = $("html").attr("lang")?.trim() ?? "";
  if (lang === "") {
    befunde.push(
      verbesserbar(
        "seo-lang",
        "Ihre Seite sagt nicht, in welcher Sprache sie ist",
        "Im Quelltext fehlt die Angabe der Sprache. Vorleseprogramme sprechen deutsche Texte dann womöglich mit englischer Aussprache aus.",
        "Kein `lang`-Attribut am `<html>`-Element. Ergänzen: `<html lang=\"de\">`.",
        "klein",
      ),
    );
  } else {
    befunde.push(
      gut(
        "seo-lang",
        "Ihre Seite gibt ihre Sprache an",
        "Im Quelltext steht, dass Ihre Seite deutschsprachig ist. Vorleseprogramme und Übersetzer verstehen sie dadurch richtig.",
        `\`<html lang="${lang}">\``,
      ),
    );
  }

  // --- Sprechende URLs ---------------------------------------------------
  const interneLinks = $("a[href]")
    .toArray()
    .map((element) => $(element).attr("href") ?? "")
    .filter((href) => href !== "" && !/^(mailto:|tel:|javascript:|#)/i.test(href))
    .map((href) => {
      try {
        return new URL(href, basisUrl);
      } catch {
        return null;
      }
    })
    .filter((url): url is URL => url !== null && url.hostname === basisUrl.hostname)
    .map((url) => url.pathname)
    .filter((pfad, index, alle) => pfad !== "/" && alle.indexOf(pfad) === index);

  if (interneLinks.length < 3) {
    befunde.push(
      ungeprueft(
        "seo-sprechende-urls",
        "Verständliche Adressen Ihrer Unterseiten",
        "Es wurden zu wenige Links auf Unterseiten gefunden, um das sinnvoll zu beurteilen.",
        `Nur ${interneLinks.length} unterscheidbare interne Pfade auf der Startseite gefunden. Nicht bewertet.`,
      ),
    );
  } else {
    // Kryptisch = Parameter-IDs, reine Zahlen oder Dateiendungen wie .php?id=
    const kryptisch = interneLinks.filter((pfad) =>
      /\/(?:index|page|artikel|seite|p|id)?[-_]?\d{2,}(?:\.\w+)?$|\.(?:php|asp|aspx|jsp|cfm)$|\/\?/i.test(
        pfad,
      ),
    );
    const anteilOk = Math.round(((interneLinks.length - kryptisch.length) / interneLinks.length) * 100);

    if (kryptisch.length === 0) {
      befunde.push(
        gut(
          "seo-sprechende-urls",
          "Ihre Adressen sind lesbar",
          "Die Adressen Ihrer Unterseiten sagen, was dort zu finden ist, statt aus Zahlen und Kürzeln zu bestehen. Das schafft Vertrauen und hilft bei Google.",
          `${interneLinks.length} interne Pfade geprüft, keiner mit ID-Nummern oder Technik-Endungen. Beispiele: ${interneLinks.slice(0, 4).join(", ")}`,
        ),
      );
    } else {
      befunde.push(
        verbesserbar(
          "seo-sprechende-urls",
          "Manche Ihrer Adressen sind kryptisch",
          `${kryptisch.length} Ihrer Unterseiten haben Adressen aus Zahlen oder Technik-Kürzeln. Wer so einen Link weitergibt, kann nicht erkennen, was ihn erwartet.`,
          `${anteilOk} % der ${interneLinks.length} internen Pfade sind sprechend. Auffällig: ${kryptisch.slice(0, 5).join(", ")}. Beim Umstellen unbedingt 301-Weiterleitungen von den alten Adressen einrichten.`,
          "mittel",
        ),
      );
    }
  }

  // --- Eigene 404-Seite --------------------------------------------------
  const vierNullVier = kontext.vierNullVier.antwort;
  if (vierNullVier === null) {
    befunde.push(
      ungeprueft(
        "seo-404",
        "Ihre Fehlerseite",
        "Was passiert, wenn jemand sich vertippt, ließ sich nicht prüfen.",
        `${kontext.vierNullVier.url} war nicht abrufbar. Nicht bewertet.`,
      ),
    );
  } else if (vierNullVier.status === 404) {
    const text = vierNullVier.body.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    const wirktGestaltet = text.length > 200;

    if (wirktGestaltet) {
      befunde.push(
        gut(
          "seo-404",
          "Ihre Fehlerseite fängt Besucher auf",
          "Wer sich vertippt oder einem alten Link folgt, landet bei Ihnen auf einer richtigen Seite statt auf einer nackten Fehlermeldung. Das hält Besucher da, statt sie zu verlieren.",
          `${kontext.vierNullVier.url} antwortet korrekt mit Status 404 und liefert ${text.length} Zeichen Inhalt — also eine gestaltete Seite, keine Standard-Fehlermeldung.`,
        ),
      );
    } else {
      befunde.push(
        verbesserbar(
          "seo-404",
          "Ihre Fehlerseite ist eine Sackgasse",
          "Wer sich vertippt, sieht bei Ihnen eine nackte Fehlermeldung ohne Weg zurück. Diese Besucher sind damit meistens verloren.",
          `${kontext.vierNullVier.url} antwortet mit Status 404, liefert aber nur ${text.length} Zeichen Inhalt. Eine eigene 404-Seite mit Suchfeld und Link zur Startseite hält Besucher auf der Website.`,
          "klein",
        ),
      );
    }
  } else if (vierNullVier.status >= 200 && vierNullVier.status < 300) {
    befunde.push(
      verbesserbar(
        "seo-404",
        "Ihre Seite meldet Tippfehler nicht als Fehler",
        "Ruft jemand eine Adresse auf, die es bei Ihnen gar nicht gibt, antwortet Ihre Website trotzdem mit „alles in Ordnung“. Google füllt sich dadurch mit Seiten, die es nicht gibt.",
        `${kontext.vierNullVier.url} existiert nicht, antwortet aber mit Status ${vierNullVier.status} statt 404 ("Soft 404"). Der Server muss für unbekannte Adressen den Status 404 senden.`,
        "klein",
      ),
    );
  } else {
    befunde.push(
      gut(
        "seo-404",
        "Nicht vorhandene Adressen werden korrekt gemeldet",
        "Ruft jemand bei Ihnen eine Adresse auf, die es nicht gibt, meldet Ihre Website das auch als solches. Damit sammelt Google keine Geisterseiten an.",
        `${kontext.vierNullVier.url} antwortet mit Status ${vierNullVier.status} (kein "Soft 404").`,
      ),
    );
  }

  return { befunde };
}

export const seoModul: PruefModul = {
  id: "seo",
  pruefe: pruefeSeo,
};
