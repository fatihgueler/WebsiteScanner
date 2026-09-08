import { gut, kritisch, ungeprueft, verbesserbar } from "@/lib/befund";
import type { PruefKontext } from "@/lib/kontext";
import type { ModulErgebnis, PruefModul } from "@/lib/module";
import { holePageSpeed, type Metrik, type PageSpeedErgebnis } from "@/lib/pagespeed";
import type { Befund } from "@/lib/types";

/**
 * Modul 3 — Performance & Darstellung.
 *
 * Zwei Quellen: die Google-PageSpeed-Werte für die eigentliche Messung und das
 * HTML für die Dinge, die man ohne Messung sehen kann (Bildformate, Größen,
 * Anzahl der eingebundenen Dateien).
 */

const STRATEGIE_NAME: Record<PageSpeedErgebnis["strategie"], string> = {
  mobile: "auf dem Handy",
  desktop: "am Computer",
};

function scoreBefund(
  id: string,
  titel: string,
  score: number | null,
  strategie: PageSpeedErgebnis["strategie"],
  texte: { gut: string; mittel: string; schlecht: string },
  technischerZusatz: string,
): Befund | null {
  if (score === null) return null;
  const wo = STRATEGIE_NAME[strategie];
  const technisch = `Lighthouse-Score ${score}/100 (${strategie}). ${technischerZusatz}`;

  if (score >= 90) {
    return gut(id, `${titel} ${wo}`, `${texte.gut} (Wert: ${score} von 100.)`, technisch);
  }
  if (score >= 50) {
    return verbesserbar(
      id,
      `${titel} ${wo}`,
      `${texte.mittel} (Wert: ${score} von 100.)`,
      technisch,
      "mittel",
    );
  }
  return kritisch(
    id,
    `${titel} ${wo}`,
    `${texte.schlecht} (Wert: ${score} von 100.)`,
    technisch,
    "mittel",
  );
}

function metrikBefund(
  id: string,
  titel: string,
  metrik: Metrik | null,
  strategie: PageSpeedErgebnis["strategie"],
  texte: { gut: string; mittel: string; schlecht: string },
  technischerZusatz: string,
): Befund | null {
  if (metrik === null) return null;
  const wo = STRATEGIE_NAME[strategie];
  const technisch = `Gemessen: ${metrik.anzeige} (${strategie}). ${technischerZusatz}`;

  if (metrik.einordnung === "gut") {
    return gut(id, `${titel} ${wo}`, `${texte.gut} (Gemessen: ${metrik.anzeige}.)`, technisch);
  }
  if (metrik.einordnung === "mittel") {
    return verbesserbar(
      id,
      `${titel} ${wo}`,
      `${texte.mittel} (Gemessen: ${metrik.anzeige}.)`,
      technisch,
      "mittel",
    );
  }
  return kritisch(
    id,
    `${titel} ${wo}`,
    `${texte.schlecht} (Gemessen: ${metrik.anzeige}.)`,
    technisch,
    "mittel",
  );
}

async function pruefePerformance(kontext: PruefKontext): Promise<ModulErgebnis> {
  const befunde: Befund[] = [];
  const { $, basisUrl } = kontext;

  // --- Google PageSpeed Insights ----------------------------------------
  const pageSpeed = await holePageSpeed(basisUrl.href);

  if (!pageSpeed.ok) {
    befunde.push(
      ungeprueft(
        "performance-pagespeed",
        "Ladezeit und Bedienbarkeit Ihrer Seite",
        "Die Messung der Ladezeit war bei diesem Durchlauf nicht möglich. Die übrigen Punkte in diesem Abschnitt stimmen trotzdem.",
        `Die Werte stammen normalerweise aus der Google-PageSpeed-Insights-API. ${pageSpeed.grund} Der Punkt wurde deshalb nicht bewertet und fließt nicht in den Score ein.`,
      ),
    );
  } else {
    for (const ergebnis of pageSpeed.ergebnisse) {
      const s = ergebnis.strategie;

      const kandidaten: (Befund | null)[] = [
        scoreBefund(
          `performance-score-${s}`,
          "Ladegeschwindigkeit",
          ergebnis.performance,
          s,
          {
            gut: "Ihre Seite lädt zügig. Besucher warten nicht — bitte bei künftigen Änderungen darauf achten, dass das so bleibt.",
            mittel:
              "Ihre Seite lädt spürbar langsam. Ein Teil der Besucher springt ab, bevor überhaupt etwas zu sehen ist.",
            schlecht:
              "Ihre Seite lädt sehr langsam. Das kostet Sie messbar Anfragen und wirkt sich auch auf Ihre Position bei Google aus.",
          },
          "Häufigste Ursachen: zu große Bilder, blockierendes JavaScript, fehlendes Caching.",
        ),
        scoreBefund(
          `performance-a11y-${s}`,
          "Barrierefreiheit",
          ergebnis.barrierefreiheit,
          s,
          {
            gut: "Ihre Seite lässt sich auch von Menschen mit Einschränkungen gut nutzen. Das ist mehr, als die meisten Websites schaffen.",
            mittel:
              "Bei der Barrierefreiheit gibt es Lücken — etwa zu schwache Kontraste oder Bedienelemente ohne Beschriftung. Das schließt einen Teil Ihrer Kundschaft aus.",
            schlecht:
              "Ihre Seite ist für Menschen mit Einschränkungen kaum nutzbar. Neben dem Geschäftsverlust wird das ab 2025 für viele Betriebe auch rechtlich relevant.",
          },
          "Details liefert der Lighthouse-Bericht (Kontraste, Alt-Texte, Formularbeschriftungen, Fokus-Reihenfolge).",
        ),
        scoreBefund(
          `performance-bp-${s}`,
          "Technische Sorgfalt",
          ergebnis.bestPractices,
          s,
          {
            gut: "Ihre Seite ist technisch sauber gebaut, ohne veraltete oder fehleranfällige Konstruktionen. Gute Arbeit.",
            mittel:
              "Bei der technischen Umsetzung gibt es Nachlässigkeiten. Nichts davon ist dramatisch, in Summe macht es die Seite aber anfälliger.",
            schlecht:
              "Ihre Seite setzt in mehreren Punkten auf veraltete oder fehleranfällige Technik. Das rächt sich beim nächsten Browser-Update.",
          },
          "Geprüft werden u. a. Konsolenfehler, veraltete APIs, Bildauflösung und unsichere Einbindungen.",
        ),
        scoreBefund(
          `performance-seo-${s}`,
          "Technische Suchmaschinen-Grundlagen",
          ergebnis.seo,
          s,
          {
            gut: "Die technischen Voraussetzungen dafür, dass Google Ihre Seite versteht, sind erfüllt. Das ist die halbe Miete.",
            mittel:
              "Bei den technischen Grundlagen für Google fehlt einiges. Ihre Seite wird dadurch schlechter gefunden, als sie könnte.",
            schlecht:
              "Google hat erhebliche Mühe, Ihre Seite auszulesen. Damit verschenken Sie Sichtbarkeit, die Sie sonst kostenlos hätten.",
          },
          "Ergänzt den ausführlichen SEO-Abschnitt weiter unten in diesem Report.",
        ),
        metrikBefund(
          `performance-lcp-${s}`,
          "Zeit bis zum Hauptinhalt",
          ergebnis.lcp,
          s,
          {
            gut: "Das Wichtigste auf Ihrer Seite — meist das große Bild oder die Überschrift — ist schnell da. Genau so soll es sein.",
            mittel:
              "Es dauert, bis Besucher den Hauptinhalt sehen. Auf dem Weg dahin sieht die Seite noch leer aus.",
            schlecht:
              "Besucher schauen lange auf eine weitgehend leere Seite, bevor der Hauptinhalt erscheint. Viele warten das nicht ab.",
          },
          "Largest Contentful Paint. Google bewertet bis 2,5 s als gut, bis 4,0 s als verbesserungswürdig.",
        ),
        metrikBefund(
          `performance-cls-${s}`,
          "Ruhiger Seitenaufbau",
          ergebnis.cls,
          s,
          {
            gut: "Beim Laden verrutscht nichts. Besucher tippen nicht versehentlich daneben — ein Detail, das viele Seiten falsch machen.",
            mittel:
              "Beim Laden verschieben sich Teile Ihrer Seite. Wer früh tippt, landet schon mal auf dem falschen Knopf.",
            schlecht:
              "Ihre Seite springt beim Laden deutlich herum. Das wirkt unfertig und führt zu Fehlklicks.",
          },
          "Cumulative Layout Shift. Meist Bilder ohne Größenangabe oder nachgeladene Schriften und Banner.",
        ),
        metrikBefund(
          `performance-inp-${s}`,
          "Reaktion auf Eingaben",
          ergebnis.inp,
          s,
          {
            gut: "Ihre Seite reagiert unmittelbar auf Klicks und Tipser. Sie fühlt sich flüssig an.",
            mittel:
              "Zwischen Klick und Reaktion vergeht spürbar Zeit. Besucher klicken dann gern ein zweites Mal.",
            schlecht:
              "Ihre Seite reagiert deutlich verzögert auf Eingaben. Das fühlt sich kaputt an, auch wenn technisch alles funktioniert.",
          },
          "Interaction to Next Paint. Ursache ist fast immer zu viel JavaScript, das den Browser blockiert.",
        ),
      ];

      for (const befund of kandidaten) {
        if (befund !== null) befunde.push(befund);
      }
    }
  }

  // --- Bilder: moderne Formate ------------------------------------------
  const bilder = $("img").toArray();
  const bildQuellen = bilder
    .map((element) => $(element).attr("src") ?? $(element).attr("data-src") ?? "")
    .filter((quelle) => quelle !== "");

  // <picture>/<source> zählt mit — dort stehen die modernen Formate oft drin.
  const quellenAusSource = $("source[srcset], source[type]")
    .toArray()
    .map((element) => `${$(element).attr("type") ?? ""} ${$(element).attr("srcset") ?? ""}`);
  const alleQuellen = [...bildQuellen, ...quellenAusSource].join(" ");

  if (bilder.length === 0) {
    befunde.push(
      ungeprueft(
        "performance-bildformate",
        "Bildformate auf Ihrer Seite",
        "Auf Ihrer Startseite wurden keine Bilder gefunden, die sich prüfen ließen.",
        "Keine <img>-Elemente im HTML. Über CSS eingebundene Hintergrundbilder erfasst dieser Check nicht. Nicht bewertet.",
      ),
    );
  } else {
    const hatModern = /\.(?:webp|avif)|image\/(?:webp|avif)/i.test(alleQuellen);
    const altformate = bildQuellen.filter((quelle) => /\.(?:jpe?g|png)(?:\?|$)/i.test(quelle));

    if (hatModern) {
      befunde.push(
        gut(
          "performance-bildformate",
          "Ihre Bilder nutzen moderne Formate",
          "Ihre Bilder sind in einem sparsamen Format eingebunden. Das macht die Seite spürbar schneller, besonders im Mobilfunknetz — bitte dabei bleiben.",
          `Moderne Bildformate (WebP/AVIF) im HTML gefunden. Insgesamt ${bilder.length} <img>-Element(e)${altformate.length > 0 ? `, davon ${altformate.length} weiterhin als JPEG/PNG` : ""}.`,
        ),
      );
    } else if (altformate.length > 0) {
      befunde.push(
        verbesserbar(
          "performance-bildformate",
          "Ihre Bilder sind unnötig groß",
          "Ihre Bilder liegen in älteren Formaten vor und sind dadurch deutlich schwerer als nötig. Moderne Formate sparen oft die Hälfte, ohne dass man einen Unterschied sieht.",
          `${altformate.length} von ${bilder.length} Bildern als JPEG/PNG, kein WebP oder AVIF gefunden. Umstellung auf WebP spart typischerweise 25–50 % Dateigröße bei gleicher Bildqualität.`,
          "klein",
        ),
      );
    } else {
      befunde.push(
        ungeprueft(
          "performance-bildformate",
          "Bildformate auf Ihrer Seite",
          "Die Dateiformate Ihrer Bilder ließen sich aus dem Quelltext nicht ablesen.",
          `${bilder.length} <img>-Element(e), aber keine erkennbare Dateiendung in den Adressen (z. B. weil ein Bilddienst die Adressen umschreibt). Nicht bewertet.`,
        ),
      );
    }

    // --- Bilder ohne width/height ---------------------------------------
    const ohneMasse = bilder.filter((element) => {
      const knoten = $(element);
      const hatBreite = (knoten.attr("width") ?? "") !== "";
      const hatHoehe = (knoten.attr("height") ?? "") !== "";
      const hatCssMasse = /(?:^|;)\s*(?:aspect-ratio|width|height)\s*:/i.test(
        knoten.attr("style") ?? "",
      );
      return !(hatBreite && hatHoehe) && !hatCssMasse;
    });

    if (ohneMasse.length === 0) {
      befunde.push(
        gut(
          "performance-bildmasse",
          "Ihre Bilder haben feste Platzhalter",
          "Beim Laden reserviert die Seite für jedes Bild den richtigen Platz. Dadurch verrutscht beim Aufbau nichts — genau richtig gemacht.",
          `Alle ${bilder.length} Bilder haben width- und height-Angaben oder eine Größe im style-Attribut.`,
        ),
      );
    } else {
      befunde.push(
        verbesserbar(
          "performance-bildmasse",
          "Beim Laden verrutscht die Seite",
          `${ohneMasse.length === bilder.length ? "Ihren Bildern" : `${ohneMasse.length} Ihrer Bilder`} fehlt die Größenangabe. Beim Laden springt der Text deshalb hin und her, und Besucher klicken daneben.`,
          `${ohneMasse.length} von ${bilder.length} <img>-Elementen ohne width/height. Beide Attribute setzen (die tatsächlichen Pixelmaße), dann reserviert der Browser den Platz vorab.`,
          "klein",
        ),
      );
    }

    // --- loading="lazy" unterhalb des Falzes ----------------------------
    // Die ersten drei Bilder sind mit hoher Wahrscheinlichkeit sichtbar und
    // sollen NICHT verzögert laden. Beurteilt werden nur die übrigen.
    const untereBilder = bilder.slice(3);
    if (untereBilder.length === 0) {
      befunde.push(
        gut(
          "performance-lazy",
          "Ihre Seite lädt keine überflüssigen Bilder",
          "Ihre Startseite kommt mit wenigen Bildern aus. Damit stellt sich die Frage nach verzögertem Nachladen gar nicht erst.",
          `Nur ${bilder.length} Bild(er) auf der Seite — zu wenige, als dass verzögertes Laden einen messbaren Unterschied machen würde.`,
        ),
      );
    } else {
      const ohneLazy = untereBilder.filter(
        (element) => ($(element).attr("loading") ?? "").toLowerCase() !== "lazy",
      );

      if (ohneLazy.length === 0) {
        befunde.push(
          gut(
            "performance-lazy",
            "Bilder weiter unten laden erst bei Bedarf",
            "Ihre Seite lädt nur, was gerade sichtbar ist. Das spart Ladezeit und im Mobilfunknetz auch Datenvolumen Ihrer Besucher.",
            `Alle ${untereBilder.length} Bilder unterhalb der ersten drei haben loading="lazy".`,
          ),
        );
      } else {
        befunde.push(
          verbesserbar(
            "performance-lazy",
            "Alle Bilder laden sofort, auch die unsichtbaren",
            "Ihre Seite lädt beim Aufruf auch Bilder, die weit unten stehen und die viele Besucher nie zu Gesicht bekommen. Das verzögert den Aufbau unnötig.",
            `${ohneLazy.length} von ${untereBilder.length} Bildern unterhalb des sichtbaren Bereichs ohne loading="lazy". Wichtig: Bei den obersten Bildern soll lazy gerade NICHT gesetzt sein — die werden sofort gebraucht.`,
            "klein",
          ),
        );
      }
    }
  }

  // --- Anzahl eingebundener JS- und CSS-Dateien --------------------------
  const skripte = $("script[src]").toArray();
  const stylesheets = $('link[rel="stylesheet"][href], link[rel~="stylesheet"][href]').toArray();
  const dateienGesamt = skripte.length + stylesheets.length;

  if (dateienGesamt <= 12) {
    befunde.push(
      gut(
        "performance-dateien",
        "Ihre Seite lädt wenige Zusatzdateien",
        `Ihre Seite kommt mit ${dateienGesamt} zusätzlichen Dateien aus. Jede einzelne kostet Ladezeit — hier wurde sparsam gearbeitet.`,
        `${skripte.length} <script src>-Einbindungen und ${stylesheets.length} Stylesheets. Die Dateigrößen selbst werden nicht abgerufen (das würde das Anfragebudget der geprüften Seite sprengen), gezählt wird die Anzahl der Einbindungen im HTML.`,
      ),
    );
  } else if (dateienGesamt <= 25) {
    befunde.push(
      verbesserbar(
        "performance-dateien",
        "Ihre Seite lädt viele Zusatzdateien",
        `Beim Aufruf holt Ihre Seite ${dateienGesamt} zusätzliche Dateien. Jede davon ist eine eigene Anfrage — in Summe kostet das spürbar Zeit.`,
        `${skripte.length} <script src>-Einbindungen und ${stylesheets.length} Stylesheets. Zusammenfassen und Ungenutztes entfernen bringt hier am meisten. Typische Ursache sind viele einzelne Plugins.`,
        "mittel",
      ),
    );
  } else {
    befunde.push(
      kritisch(
        "performance-dateien",
        "Ihre Seite lädt sehr viele Zusatzdateien",
        `Beim Aufruf holt Ihre Seite ${dateienGesamt} zusätzliche Dateien. Das ist deutlich zu viel und der wahrscheinlichste Grund, wenn sich die Seite zäh anfühlt.`,
        `${skripte.length} <script src>-Einbindungen und ${stylesheets.length} Stylesheets. Bei Zahlen in dieser Größenordnung lohnt eine Bestandsaufnahme der Plugins — meist sind mehrere davon ungenutzt.`,
        "mittel",
      ),
    );
  }

  // --- viewport-Meta -----------------------------------------------------
  const viewport = $('meta[name="viewport"]').attr("content")?.trim() ?? "";
  if (viewport === "") {
    befunde.push(
      kritisch(
        "performance-viewport",
        "Ihre Seite ist nicht auf Handys eingestellt",
        "Auf dem Handy erscheint Ihre Seite winzig, und Besucher müssen hineinzoomen. Die Mehrheit Ihrer Besucher kommt über das Handy.",
        "Kein `<meta name=\"viewport\">` im HTML. Erforderlich ist `<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">`.",
        "klein",
      ),
    );
  } else if (/user-scalable\s*=\s*no|maximum-scale\s*=\s*1(?:\.0)?\b/i.test(viewport)) {
    befunde.push(
      verbesserbar(
        "performance-viewport",
        "Besucher können auf Ihrer Seite nicht zoomen",
        "Ihre Seite verbietet das Vergrößern mit zwei Fingern. Für ältere Besucher und alle, die nicht mehr so gut sehen, ist das ein echtes Hindernis.",
        `\`<meta name="viewport" content="${viewport}">\` — die Angaben \`user-scalable=no\` bzw. \`maximum-scale=1\` sollten entfernt werden.`,
        "klein",
      ),
    );
  } else {
    befunde.push(
      gut(
        "performance-viewport",
        "Ihre Seite ist für Handys eingerichtet",
        "Ihre Seite passt sich der Bildschirmgröße an und lässt sich vergrößern. Das ist die Grundvoraussetzung dafür, dass sie mobil funktioniert.",
        `\`<meta name="viewport" content="${viewport}">\``,
      ),
    );
  }

  // --- Favicon und Apple-Touch-Icon --------------------------------------
  const faviconLink =
    $('link[rel="icon"], link[rel="shortcut icon"], link[rel~="icon"]').length > 0;
  const appleIcon = $('link[rel="apple-touch-icon"], link[rel~="apple-touch-icon"]').length > 0;

  if (faviconLink && appleIcon) {
    befunde.push(
      gut(
        "performance-icons",
        "Ihr Logo erscheint im Browser-Tab und auf dem Startbildschirm",
        "Ihre Seite bringt ein kleines Symbol mit, das im Browser-Tab und beim Speichern auf dem Handy erscheint. Ein Detail, das professionell wirkt — und bei Ihnen sitzt.",
        "Sowohl `link[rel=icon]` als auch `link[rel=apple-touch-icon]` vorhanden.",
      ),
    );
  } else if (faviconLink) {
    befunde.push(
      verbesserbar(
        "performance-icons",
        "Auf dem Handy-Startbildschirm fehlt Ihr Logo",
        "Im Browser-Tab erscheint Ihr Symbol, beim Speichern auf dem iPhone-Startbildschirm aber nicht. Dort steht dann ein leeres graues Kästchen.",
        "`link[rel=icon]` vorhanden, `link[rel=apple-touch-icon]` fehlt. Ein 180×180-Pixel-PNG ergänzen und per `<link rel=\"apple-touch-icon\" href=\"...\">` einbinden.",
        "klein",
      ),
    );
  } else {
    befunde.push(
      verbesserbar(
        "performance-icons",
        "Im Browser-Tab fehlt Ihr Logo",
        "Wer mehrere Tabs offen hat, erkennt Ihre Seite nicht wieder — dort steht nur ein leeres Blatt. Eine Kleinigkeit mit sichtbarer Wirkung.",
        "Weder `link[rel=icon]` noch `link[rel=apple-touch-icon]` im HTML gefunden. Ein Favicon (32×32 und 180×180 Pixel) ergänzen.",
        "klein",
      ),
    );
  }

  return { befunde };
}

export const performanceModul: PruefModul = {
  id: "performance",
  pruefe: pruefePerformance,
};
