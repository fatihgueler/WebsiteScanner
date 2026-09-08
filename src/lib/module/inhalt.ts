import { gut, ungeprueft, verbesserbar } from "@/lib/befund";
import type { PruefKontext } from "@/lib/kontext";
import type { ModulErgebnis, PruefModul } from "@/lib/module";
import type { Befund } from "@/lib/types";

/**
 * Modul 6 — Inhalt & Vertrauen.
 *
 * Die leichteste Kategorie (5 %), aber die mit den greifbarsten Befunden:
 * Hier geht es darum, ob ein Interessent auf dem Handy in zehn Sekunden
 * anrufen kann. Deshalb gibt es hier bewusst kein `kritisch` — nichts davon
 * ist ein Notfall, alles davon kostet Anfragen.
 */

/** Ortsteile von Telefonnummern, an denen sich ein tel:-Link erkennen lässt. */
const TELEFON_TEXT_MUSTER =
  /(?:\+49|0)\s?(?:\(0?\)|\d)[\d\s/()-]{6,}\d/;

function pruefeInhalt(kontext: PruefKontext): ModulErgebnis {
  const befunde: Befund[] = [];
  const { $, html } = kontext;

  const seitenText = $("body").text().replace(/\s+/g, " ").trim();

  // --- Telefonnummer als tel:-Link --------------------------------------
  const telLinks = $('a[href^="tel:"]').toArray();
  const telefonImText = TELEFON_TEXT_MUSTER.test(seitenText);

  if (telLinks.length > 0) {
    befunde.push(
      gut(
        "inhalt-telefon-link",
        "Ihre Telefonnummer ist auf dem Handy anklickbar",
        "Wer Ihre Seite auf dem Handy öffnet, tippt einmal auf die Nummer und ist im Gespräch. Das ist der kürzeste Weg von der Website zum Auftrag — sehr gut gelöst.",
        `${telLinks.length} Link(s) mit tel:-Schema gefunden, z. B. "${$(telLinks[0]).attr("href")}".`,
      ),
    );
  } else if (telefonImText) {
    befunde.push(
      verbesserbar(
        "inhalt-telefon-link",
        "Ihre Telefonnummer lässt sich nicht antippen",
        "Ihre Nummer steht auf der Seite, aber nur als Text. Auf dem Handy muss sie jeder abtippen — ein Teil der Interessenten macht sich diese Mühe nicht.",
        "Telefonnummer im Text erkannt, aber kein `<a href=\"tel:...\">`. Lösung: Nummer als Link auszeichnen, z. B. `<a href=\"tel:+4951112345678\">0511 123456 78</a>`. Im href die internationale Schreibweise ohne Leerzeichen verwenden.",
        "klein",
      ),
    );
  } else {
    befunde.push(
      verbesserbar(
        "inhalt-telefon",
        "Auf Ihrer Startseite steht keine Telefonnummer",
        "Auf der Startseite ist keine Telefonnummer zu finden. Gerade bei Handwerk, Praxis und Gastronomie ist das Telefon der Weg, den die meisten Kunden nehmen wollen.",
        "Weder ein tel:-Link noch eine Zeichenfolge, die einer deutschen Telefonnummer entspricht, im sichtbaren Text der Startseite gefunden.",
        "klein",
      ),
    );
  }

  // --- E-Mail-Adresse ----------------------------------------------------
  const mailLinks = $('a[href^="mailto:"]').toArray();
  const mailImText = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i.test(seitenText);

  if (mailLinks.length > 0 || mailImText) {
    befunde.push(
      gut(
        "inhalt-email",
        "Sie sind auch per E-Mail erreichbar",
        "Wer lieber schreibt als anruft — und das sind mehr Menschen, als man denkt — findet bei Ihnen eine E-Mail-Adresse. Gut, dass beide Wege offen sind.",
        mailLinks.length > 0
          ? `${mailLinks.length} mailto:-Link(s) gefunden.`
          : "E-Mail-Adresse im sichtbaren Text gefunden (kein mailto:-Link).",
      ),
    );
  } else {
    befunde.push(
      verbesserbar(
        "inhalt-email",
        "Auf Ihrer Startseite steht keine E-Mail-Adresse",
        "Auf der Startseite ist keine E-Mail-Adresse zu finden. Wer abends oder am Wochenende anfragen möchte, findet keinen Weg zu Ihnen.",
        "Weder ein mailto:-Link noch eine E-Mail-Adresse im sichtbaren Text der Startseite gefunden. Falls die Adresse aus Spam-Gründen als Bild oder per JavaScript eingebunden ist: Ein Kontaktformular ist die bessere Lösung.",
        "klein",
      ),
    );
  }

  // --- Vollständige Postadresse auf der Startseite ----------------------
  // Deutsche Postadresse: fünfstellige PLZ mit nachfolgendem Ortsnamen.
  const plzOrt = /\b(\d{5})\s+([A-ZÄÖÜ][a-zäöüß.-]+(?:\s[A-ZÄÖÜ][a-zäöüß.-]+)?)/.exec(seitenText);
  const strasse = /\b[A-ZÄÖÜ][a-zäöüß.-]*(?:straße|strasse|str\.|weg|platz|allee|gasse|ring|damm)\s*\d+/i.test(
    seitenText,
  );

  if (plzOrt !== null && strasse) {
    befunde.push(
      gut(
        "inhalt-adresse",
        "Ihre vollständige Adresse steht auf der Startseite",
        `Straße, Postleitzahl und Ort sind direkt auf der Startseite zu finden (${plzOrt[1]} ${plzOrt[2]}). Das schafft Vertrauen und hilft Google dabei, Sie regional einzuordnen.`,
        `Straßenangabe mit Hausnummer und PLZ/Ort im sichtbaren Text gefunden: "${plzOrt[0]}".`,
      ),
    );
  } else if (plzOrt !== null) {
    befunde.push(
      verbesserbar(
        "inhalt-adresse",
        "Ihre Adresse ist unvollständig",
        `Postleitzahl und Ort stehen auf der Startseite (${plzOrt[1]} ${plzOrt[2]}), die Straße fehlt aber. Für Kunden, die vorbeikommen wollen, ist das zu wenig.`,
        `PLZ/Ort gefunden ("${plzOrt[0]}"), aber keine Straßenangabe mit Hausnummer im sichtbaren Text der Startseite.`,
        "klein",
      ),
    );
  } else {
    befunde.push(
      verbesserbar(
        "inhalt-adresse",
        "Auf Ihrer Startseite steht keine Adresse",
        "Auf der Startseite ist keine vollständige Anschrift zu finden. Besucher müssen erst ins Impressum klicken, um zu erfahren, wo Sie überhaupt sitzen.",
        "Keine Kombination aus fünfstelliger Postleitzahl und Ortsnamen im sichtbaren Text der Startseite gefunden. Die Anschrift gehört sichtbar in den Fußbereich — nicht nur ins Impressum.",
        "klein",
      ),
    );
  }

  // --- Öffnungszeiten ----------------------------------------------------
  const zeitenBegriff = /öffnungszeit|geschäftszeit|sprechzeit|wir sind für sie da|erreichbarkeit|servicezeit/i.test(
    seitenText,
  );
  const zeitAngabe = /\b(?:mo|di|mi|do|fr|sa|so|montag|dienstag|mittwoch|donnerstag|freitag|samstag|sonntag)\b[^.]{0,40}\b\d{1,2}[:.]\d{2}\b/i.test(
    seitenText,
  );

  if (zeitenBegriff && zeitAngabe) {
    befunde.push(
      gut(
        "inhalt-oeffnungszeiten",
        "Ihre Öffnungszeiten stehen auf der Startseite",
        "Besucher sehen sofort, wann sie Sie erreichen. Das erspart Ihnen Anrufe außerhalb der Zeiten und Ihren Kunden vergebliche Wege.",
        "Sowohl ein Begriff für Öffnungszeiten als auch konkrete Wochentag-Uhrzeit-Angaben im sichtbaren Text gefunden.",
      ),
    );
  } else if (zeitenBegriff || zeitAngabe) {
    befunde.push(
      verbesserbar(
        "inhalt-oeffnungszeiten",
        "Ihre Öffnungszeiten sind schwer zu finden",
        "Es gibt Hinweise auf Ihre Erreichbarkeit, aber keine klare Aufstellung. Besucher müssen suchen — und rufen dann lieber gar nicht erst an.",
        `Erkannt wurde ${zeitenBegriff ? "ein Begriff wie \"Öffnungszeiten\", aber keine konkreten Wochentag-Uhrzeit-Angaben" : "eine Uhrzeitangabe, aber keine Überschrift, die sie als Öffnungszeit ausweist"}. Empfehlung: Zeiten als klare Liste im Fußbereich.`,
        "klein",
      ),
    );
  } else {
    befunde.push(
      verbesserbar(
        "inhalt-oeffnungszeiten",
        "Auf Ihrer Startseite stehen keine Öffnungszeiten",
        "Besucher erfahren nicht, wann Sie erreichbar sind. Gerade wer kurzfristig etwas braucht, sucht genau diese Information zuerst.",
        "Weder ein Begriff für Öffnungszeiten noch konkrete Wochentag-Uhrzeit-Angaben im sichtbaren Text der Startseite gefunden. Falls Sie keine festen Zeiten haben, ist auch das eine hilfreiche Angabe (z. B. \"Termine nach Vereinbarung\").",
        "klein",
      ),
    );
  }

  // --- Handlungsaufruf oberhalb des Falzes ------------------------------
  // Näherung: die ersten Links und Buttons im Dokument. Ohne Rendering lässt
  // sich der Falz nicht exakt bestimmen — das sagen wir im Technikteil auch so.
  const fruehe = $("a, button")
    .slice(0, 15)
    .toArray()
    .map((element) => $(element).text().replace(/\s+/g, " ").trim())
    .filter((text) => text !== "");

  const ctaMuster =
    /anfrag|angebot|termin|kontakt|anrufen|jetzt\s|beratung|buchen|bestellen|reservier|tisch|probefahrt|kostenlos|rückruf|schreiben|mail/i;
  const ctaTreffer = fruehe.filter((text) => ctaMuster.test(text));
  const hatFruehenTelLink = $('a[href^="tel:"]').slice(0, 1).length > 0;

  if (ctaTreffer.length > 0 || hatFruehenTelLink) {
    befunde.push(
      gut(
        "inhalt-cta",
        "Besucher sehen sofort, wie sie Sie erreichen",
        "Gleich im oberen Bereich Ihrer Seite gibt es einen deutlichen Weg zur Kontaktaufnahme. Genau das entscheidet darüber, ob aus einem Besucher eine Anfrage wird.",
        `Handlungsaufrufe unter den ersten 15 Links/Schaltflächen: ${ctaTreffer.slice(0, 5).map((t) => `"${t}"`).join(", ") || "tel:-Link"}. Hinweis: Ohne die Seite zu rendern lässt sich der sichtbare Bereich nur annähern — bewertet werden die ersten Elemente im Quelltext.`,
      ),
    );
  } else {
    befunde.push(
      verbesserbar(
        "inhalt-cta",
        "Im oberen Bereich fehlt ein klarer nächster Schritt",
        "Ganz oben auf Ihrer Seite steht nichts, was Besucher zur Kontaktaufnahme einlädt. Wer nicht von selbst weiterscrollt, geht wieder — ohne dass Sie davon erfahren.",
        `Unter den ersten 15 Links und Schaltflächen kein Handlungsaufruf gefunden (gesucht wurde nach Formulierungen wie "Anfrage", "Termin", "Kontakt", "Angebot", "Beratung", "Rückruf" sowie nach tel:-Links). Gefunden wurde stattdessen: ${fruehe.slice(0, 6).map((t) => `"${t}"`).join(", ") || "nichts"}. Hinweis: Ohne die Seite zu rendern lässt sich der sichtbare Bereich nur annähern.`,
        "klein",
      ),
    );
  }

  // --- Copyright-Jahr im Footer -----------------------------------------
  const jetzt = new Date().getFullYear();
  const jahre = [...html.matchAll(/(?:©|&copy;|copyright)[^\d]{0,20}(\d{4})(?:\s*[–-]\s*(\d{4}))?/gi)]
    .map((treffer) => Number(treffer[2] ?? treffer[1]))
    .filter((jahr) => jahr >= 1995 && jahr <= jetzt + 1);

  const juengstes = jahre.length > 0 ? Math.max(...jahre) : null;

  if (juengstes === null) {
    befunde.push(
      ungeprueft(
        "inhalt-copyright",
        "Jahresangabe im Fußbereich",
        "Im Fußbereich wurde keine Jahresangabe gefunden. Das ist kein Mangel — viele gute Seiten verzichten bewusst darauf.",
        "Kein Copyright-Vermerk mit Jahreszahl im HTML gefunden. Nicht bewertet.",
      ),
    );
  } else if (juengstes >= jetzt - 1) {
    befunde.push(
      gut(
        "inhalt-copyright",
        "Die Jahresangabe im Fußbereich ist aktuell",
        `Im Fußbereich steht ${juengstes}. Eine veraltete Jahreszahl ist eines der ersten Dinge, an denen Besucher eine vernachlässigte Website erkennen — bei Ihnen stimmt sie.`,
        `Jüngste gefundene Copyright-Jahreszahl: ${juengstes} (aktuelles Jahr: ${jetzt}).`,
      ),
    );
  } else {
    befunde.push(
      verbesserbar(
        "inhalt-copyright",
        `Im Fußbereich steht noch ${juengstes}`,
        `Unten auf Ihrer Seite steht die Jahreszahl ${juengstes}. Besucher schließen daraus, dass sich seither niemand mehr um die Seite gekümmert hat — auch wenn das gar nicht stimmt.`,
        `Jüngste gefundene Copyright-Jahreszahl: ${juengstes}, aktuelles Jahr: ${jetzt}. Am besten automatisch setzen lassen, dann veraltet die Angabe nie wieder.`,
        "klein",
      ),
    );
  }

  // --- Hinweise auf lange nicht aktualisierte Inhalte -------------------
  const datumsTreffer = [
    ...seitenText.matchAll(/\b(\d{1,2})\.(\d{1,2})\.(20\d{2})\b/g),
  ].map((treffer) => Number(treffer[3]));
  const jahresTreffer = [...seitenText.matchAll(/\b(20\d{2})\b/g)]
    .map((treffer) => Number(treffer[1]))
    .filter((jahr) => jahr <= jetzt);

  const inhaltsJahre = [...datumsTreffer, ...jahresTreffer];
  const juengsterInhalt = inhaltsJahre.length > 0 ? Math.max(...inhaltsJahre) : null;

  if (juengsterInhalt === null) {
    befunde.push(
      ungeprueft(
        "inhalt-aktualitaet",
        "Aktualität Ihrer Inhalte",
        "Auf der Startseite stehen keine Jahreszahlen, aus denen sich das Alter der Inhalte ableiten ließe.",
        "Keine Datums- oder Jahresangaben im sichtbaren Text gefunden. Das lässt keinen Rückschluss zu — weder in die eine noch in die andere Richtung. Nicht bewertet.",
      ),
    );
  } else if (juengsterInhalt >= jetzt - 1) {
    befunde.push(
      gut(
        "inhalt-aktualitaet",
        "Ihre Inhalte wirken gepflegt",
        `Die jüngste Jahresangabe auf Ihrer Seite ist ${juengsterInhalt}. Für Besucher — und für Google — sieht das nach einem Betrieb aus, bei dem jemand hinschaut.`,
        `Jüngste Jahresangabe im sichtbaren Text: ${juengsterInhalt} (aktuelles Jahr: ${jetzt}).`,
      ),
    );
  } else if (juengsterInhalt >= jetzt - 3) {
    befunde.push(
      verbesserbar(
        "inhalt-aktualitaet",
        "Ihre Inhalte sind ein paar Jahre alt",
        `Die jüngste Jahresangabe auf Ihrer Seite ist ${juengsterInhalt}. Das ist noch kein Drama, wirkt aber langsam angestaubt.`,
        `Jüngste Jahresangabe im sichtbaren Text: ${juengsterInhalt}, aktuelles Jahr: ${jetzt}. Hinweis: Diese Erkennung stützt sich allein auf Jahreszahlen im Text und kann bei zeitlosen Inhalten danebenliegen.`,
        "klein",
      ),
    );
  } else {
    befunde.push(
      verbesserbar(
        "inhalt-aktualitaet",
        "Ihre Inhalte wirken deutlich veraltet",
        `Die jüngste Jahresangabe auf Ihrer Seite ist ${juengsterInhalt} — das ist über ${jetzt - juengsterInhalt} Jahre her. Besucher schließen daraus schnell, dass es den Betrieb so vielleicht gar nicht mehr gibt.`,
        `Jüngste Jahresangabe im sichtbaren Text: ${juengsterInhalt}, aktuelles Jahr: ${jetzt}. Hinweis: Diese Erkennung stützt sich allein auf Jahreszahlen im Text und kann bei zeitlosen Inhalten danebenliegen.`,
        "mittel",
      ),
    );
  }

  return { befunde };
}

export const inhaltModul: PruefModul = {
  id: "inhalt",
  pruefe: pruefeInhalt,
};
