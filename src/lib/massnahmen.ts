import type { Gewerk } from "@/lib/types";

/**
 * Zentrale Sammlung aller Maßnahmen — was bei einem Mangel konkret zu tun ist
 * und wer es tut.
 *
 * Bewusst EINE Datei statt verstreut in den sechs Prüfmodulen: Die
 * Formulierungen sind Verkaufsargumente und werden häufiger nachgeschärft als
 * die Prüflogik. Hier lassen sie sich am Stück lesen und anpassen, ohne die
 * Module anzufassen.
 *
 * Angehängt werden sie in scoring.ts, und zwar nur an Befunde mit Status
 * `kritisch` oder `verbesserbar`. Bei einem guten Befund ist nichts zu tun,
 * und bei einem ungeprüften wäre jede Maßnahme geraten.
 *
 * Der Ton bleibt beratend: Was zu tun ist, nicht was versäumt wurde.
 */

type MassnahmeEintrag = {
  gewerk: Gewerk;
  /** Ein bis drei Sätze. Konkret genug, dass ein Dienstleister loslegen kann. */
  text: string;
};

const MASSNAHMEN: Record<string, MassnahmeEintrag> = {
  // ---------------------------------------------------------------- Technik
  "technik-https": {
    gewerk: "backend",
    text: "Ein TLS-Zertifikat einrichten — bei den allermeisten Hostern ein Schalter im Kundenmenü, kostenlos über Let's Encrypt. Anschließend alle Aufrufe dauerhaft auf die verschlüsselte Adresse umleiten.",
  },
  "technik-http-weiterleitung": {
    gewerk: "backend",
    text: "Eine dauerhafte Weiterleitung (301) von der unverschlüsselten auf die verschlüsselte Adresse einrichten — je nach Server in der .htaccess oder der nginx-Konfiguration. Danach zusätzlich den HSTS-Header setzen, damit Browser gar nicht erst unverschlüsselt anfragen.",
  },
  "technik-zertifikat": {
    gewerk: "backend",
    text: "Das Zertifikat erneuern und vor allem die automatische Verlängerung aktivieren. Läuft sie, muss danach nie wieder jemand daran denken — genau daran scheitert es sonst alle drei Monate.",
  },
  "technik-weiterleitungskette": {
    gewerk: "backend",
    text: "Eine Schreibweise als die maßgebliche festlegen (mit oder ohne „www\") und die andere per 301 dorthin umleiten. Zusätzlich prüfen, dass zwischen Aufruf und Ziel höchstens ein Sprung liegt.",
  },
  "technik-antwortzeit": {
    gewerk: "backend",
    text: "Zuerst einen Seiten-Cache aktivieren — das bringt bei den meisten Systemen den größten Sprung. Bleibt es langsam, sind langsame Datenbankabfragen oder ein überbuchter Shared-Hoster die üblichen Ursachen; dann lohnt der Wechsel auf ein besseres Paket.",
  },
  "technik-status": {
    gewerk: "backend",
    text: "Die Fehlerursache am Server beheben — das Fehlerprotokoll des Hosters zeigt, woran es hängt. Solange die Startseite einen Fehler meldet, nimmt Google die Seite aus dem Index.",
  },
  "technik-header-csp": {
    gewerk: "backend",
    text: "Eine Content-Security-Policy als Antwort-Header setzen. Zunächst im Beobachtungsmodus (report-only) mitlaufen lassen, damit nichts Bestehendes bricht, dann scharf schalten.",
  },
  "technik-header-hsts": {
    gewerk: "backend",
    text: "Den Header Strict-Transport-Security setzen, Laufzeit ein Jahr. Vorher sicherstellen, dass wirklich alle Unterseiten über HTTPS erreichbar sind — danach ist die Entscheidung für ein Jahr bindend.",
  },
  "technik-header-nosniff": {
    gewerk: "backend",
    text: "Den Header X-Content-Type-Options mit dem Wert nosniff ergänzen. Eine Zeile in der Serverkonfiguration, keine Nebenwirkungen.",
  },
  "technik-header-referrer": {
    gewerk: "backend",
    text: "Den Header Referrer-Policy auf strict-origin-when-cross-origin setzen. Fremde Seiten erfahren dann nicht mehr, von welcher Ihrer Unterseiten ein Besucher kam.",
  },
  "technik-header-permissions": {
    gewerk: "backend",
    text: "Einen Permissions-Policy-Header setzen, der Kamera, Mikrofon und Standort abschaltet, solange Sie sie nicht brauchen.",
  },
  "technik-header-frames": {
    gewerk: "backend",
    text: "Content-Security-Policy um die Direktive frame-ancestors 'self' ergänzen — oder ersatzweise den älteren Header X-Frame-Options auf SAMEORIGIN setzen. Damit lässt sich Ihre Seite nicht mehr in eine fremde einbauen.",
  },
  "technik-versionsangaben": {
    gewerk: "backend",
    text: "Die Versionsangaben in den Antwort-Headern abschalten: bei Apache ServerTokens auf Prod, bei PHP expose_php ausschalten. Das nimmt Angreifern die einfachste Vorauswahl.",
  },
  "technik-cms-version": {
    gewerk: "frontend",
    text: "Die Generator-Angabe aus dem Quelltext entfernen — bei WordPress durch Abmelden der wp_generator-Aktion, bei anderen Systemen meist eine Einstellung im Template. Wichtiger als das Verstecken bleibt allerdings, das System aktuell zu halten.",
  },
  "technik-bibliotheken": {
    gewerk: "frontend",
    text: "Die betroffenen Bibliotheken auf eine gepflegte Fassung heben und danach die Seite durchklicken — ältere Erweiterungen hängen manchmal an der alten Version. Das ist der Punkt aus diesem Bericht, der am ehesten aktiv ausgenutzt wird.",
  },
  "technik-security-txt": {
    gewerk: "backend",
    text: "Eine Datei security.txt unter /.well-known/ ablegen, mit einer Kontaktadresse und einem Ablaufdatum. Fünf Zeilen Text — danach weiß jeder Finder einer Lücke, an wen er sich wendet.",
  },

  // ------------------------------------------------------------------ Recht
  "recht-impressum": {
    gewerk: "recht",
    text: "Ein vollständiges Impressum anlegen und von jeder Seite aus verlinken, üblicherweise im Fußbereich. Inhalt: Name, Anschrift, Telefon, E-Mail, Rechtsform, Vertretungsberechtigte, Umsatzsteuer-ID und gegebenenfalls Kammer und Berufsbezeichnung.",
  },
  "recht-datenschutz": {
    gewerk: "recht",
    text: "Eine Datenschutzerklärung erstellen, die zu den tatsächlich eingesetzten Diensten passt — eine Mustervorlage ohne Anpassung schafft eher neue Angriffsfläche. Ebenfalls von jeder Seite aus verlinken.",
  },
  "recht-google-fonts": {
    gewerk: "frontend",
    text: "Die Schriftdateien herunterladen, in den eigenen Webspace legen und per @font-face lokal einbinden. Danach den Quelltext nach übrig gebliebenen Verweisen auf fonts.googleapis.com durchsuchen. Aufwand meist unter einer Stunde — und der wirksamste einzelne Schritt gegen Abmahnungen.",
  },
  "recht-dienst-google-analytics": {
    gewerk: "recht",
    text: "Entweder das Laden bis zur ausdrücklichen Einwilligung blockieren — ein Banner ohne echte Ladesperre genügt dafür nicht — oder auf eine cookiefreie Auswertung mit EU-Hosting wechseln. Für die meisten Betriebe reicht Letzteres völlig aus und spart das Banner gleich mit.",
  },
  "recht-dienst-gtm": {
    gewerk: "recht",
    text: "Den Tag-Manager-Container bis zur Einwilligung blockieren. Der Consent Mode allein reicht nicht, weil der Container dann trotzdem schon geladen wird.",
  },
  "recht-dienst-google-maps": {
    gewerk: "frontend",
    text: "Die Karte erst nach einem Klick laden (Zwei-Klick-Lösung mit Vorschaubild) oder durch ein statisches Bild mit Link zur Route ersetzen. Für „so finden Sie uns\" ist das Bild ohnehin meist die bessere Lösung.",
  },
  "recht-dienst-facebook-pixel": {
    gewerk: "recht",
    text: "Den Pixel bis zur ausdrücklichen Einwilligung blockieren. Wird ohnehin keine Werbung geschaltet, ist das ersatzlose Entfernen der sauberste Weg.",
  },
  "recht-dienst-recaptcha": {
    gewerk: "frontend",
    text: "Auf einen datensparsamen Spam-Schutz wechseln: Friendly Captcha, hCaptcha mit EU-Hosting, ein verstecktes Honeypot-Feld oder eine einfache Rechenaufgabe. Für ein Kontaktformular mit überschaubarem Aufkommen genügt der Honeypot.",
  },
  "recht-youtube": {
    gewerk: "frontend",
    text: "In der Einbettungsadresse www.youtube.com durch www.youtube-nocookie.com ersetzen. Noch besser: Vorschaubild anzeigen und das Video erst nach einem Klick nachladen — das ist zugleich schneller.",
  },
  "recht-cookies": {
    gewerk: "recht",
    text: "Ermitteln, welches Werkzeug die Cookies setzt, und dessen Start bis zur Einwilligung unterbinden. Cookies, die keiner Funktion zuzuordnen sind, ersatzlos abschalten.",
  },
  "recht-consent-banner": {
    gewerk: "recht",
    text: "Ein Einwilligungswerkzeug einrichten, das die betroffenen Dienste tatsächlich blockiert, bis zugestimmt wurde. Ablehnen muss dabei genauso einfach sein wie Zustimmen. Prüfen lässt sich das nur im Browser: vor der Zustimmung darf keine Anfrage an die Drittanbieter hinausgehen.",
  },
  "recht-formular-https": {
    gewerk: "frontend",
    text: "Das Ziel des Formulars (action) auf eine https-Adresse umstellen. Läuft die Seite insgesamt noch unverschlüsselt, ist zuerst der HTTPS-Punkt weiter oben zu erledigen.",
  },

  // ------------------------------------------------------------ Performance
  "performance-bildformate": {
    gewerk: "frontend",
    text: "Die Bilder nach WebP konvertieren und über ein picture-Element mit Rückfallebene einbinden. Das spart bei gleicher Bildqualität meist ein Viertel bis die Hälfte der Dateigröße — im Mobilfunknetz der spürbarste Einzeleffekt.",
  },
  "performance-bildmasse": {
    gewerk: "frontend",
    text: "Jedem Bild die tatsächlichen Maße als width und height mitgeben, alternativ ein aspect-ratio im Stylesheet. Der Browser reserviert den Platz dann vorab, und beim Laden verrutscht nichts mehr.",
  },
  "performance-lazy": {
    gewerk: "frontend",
    text: "Bildern unterhalb des sichtbaren Bereichs loading=\"lazy\" mitgeben. Beim obersten Bild genau umgekehrt verfahren: dort kein lazy, stattdessen fetchpriority=\"high\", denn es wird sofort gebraucht.",
  },
  "performance-dateien": {
    gewerk: "frontend",
    text: "Eine Bestandsaufnahme der eingebundenen Erweiterungen machen — erfahrungsgemäß sind mehrere ungenutzt. Was bleibt, zusammenfassen und minifizieren, nicht kritische Skripte mit defer laden.",
  },
  "performance-viewport": {
    gewerk: "frontend",
    text: "Das viewport-Meta-Tag mit width=device-width, initial-scale=1 ergänzen und dabei user-scalable=no sowie maximum-scale entfernen, damit Besucher weiterhin vergrößern können.",
  },
  "performance-icons": {
    gewerk: "design",
    text: "Ein Favicon in 32×32 und ein Apple-Touch-Icon in 180×180 Pixeln aus dem Logo ableiten und einbinden. Kleiner Aufwand, aber im Browser-Tab und auf dem Handy-Startbildschirm sofort sichtbar.",
  },
  "performance-score": {
    gewerk: "frontend",
    text: "Die Ladezeit an den größten Hebeln angehen: Bilder verkleinern und in modernen Formaten ausliefern, blockierendes JavaScript entschlacken, Caching einschalten. Nach jedem Schritt neu messen — meist bringen zwei Änderungen den Großteil.",
  },
  "performance-a11y": {
    gewerk: "design",
    text: "Die Barrierefreiheit an den üblichen Stellen nachbessern: ausreichende Farbkontraste, beschriftete Formularfelder, sichtbare Fokusmarkierung beim Bedienen mit der Tastatur, Alternativtexte für Bilder. Das betrifft das Farb- und Gestaltungssystem, nicht nur einzelne Stellen im Code.",
  },
  "performance-bp": {
    gewerk: "frontend",
    text: "Die von Lighthouse gemeldeten Punkte abarbeiten — meist Fehlermeldungen in der Browserkonsole, veraltete Schnittstellen oder Bilder in falscher Auflösung. Einzeln je klein, in Summe der Unterschied zwischen gepflegt und zusammengeflickt.",
  },
  "performance-seo": {
    gewerk: "frontend",
    text: "Die technischen Grundlagen aus dem Google-Abschnitt dieses Berichts abarbeiten — Titel, Beschreibung, Überschriften und Canonical decken den Großteil davon ab.",
  },
  "performance-lcp": {
    gewerk: "frontend",
    text: "Das große Bild oben auf der Seite verkleinern, in WebP ausliefern und vorab laden lassen (preload). Zusätzlich Stylesheets und Skripte entschlacken, die den Aufbau blockieren.",
  },
  "performance-cls": {
    gewerk: "frontend",
    text: "Für alles, was nachträglich hereinkommt, vorab Platz reservieren: Bilder mit Maßen, feste Höhen für Banner und Anzeigen. Schriften mit font-display: swap laden und vorab anfordern, damit der Text beim Wechsel nicht springt.",
  },
  "performance-inp": {
    gewerk: "frontend",
    text: "Die JavaScript-Last reduzieren — ungenutzte Erweiterungen entfernen, lange Berechnungen aufteilen, Skripte von Drittanbietern nachrangig laden. Die Seite fühlt sich danach unmittelbar flüssiger an.",
  },

  // -------------------------------------------------------------------- SEO
  "seo-title": {
    gewerk: "inhalt",
    text: "Für jede Seite einen eigenen Titel zwischen 30 und 60 Zeichen vergeben, nach dem Muster Leistung + Ort + Firmenname. Das Wichtigste nach vorn, denn hinten wird abgeschnitten.",
  },
  "seo-description": {
    gewerk: "inhalt",
    text: "Je Seite eine Beschreibung zwischen 70 und 160 Zeichen schreiben, die einen konkreten Nutzen und den Ort nennt. Das ist der Text, der über den Klick in den Suchergebnissen entscheidet.",
  },
  "seo-h1": {
    gewerk: "frontend",
    text: "Genau eine Hauptüberschrift je Seite behalten, die übrigen zu Unterüberschriften herabstufen. Die H1 sollte Leistung und Ort enthalten.",
  },
  "seo-hierarchie": {
    gewerk: "frontend",
    text: "Die Überschriftenebenen lückenlos aufeinander aufbauen lassen, ohne Ebenen zu überspringen. Überschriften nach Aussehen statt nach Rangfolge zu wählen ist die häufigste Ursache — dafür ist das Stylesheet zuständig, nicht die Ebene.",
  },
  "seo-robots": {
    gewerk: "backend",
    text: "Eine robots.txt im Wurzelverzeichnis anlegen, die nichts Wichtiges aussperrt und auf die Sitemap verweist. Steht dort noch ein pauschales Disallow aus der Bauphase, muss es weg — sonst bleibt die Seite bei Google unsichtbar.",
  },
  "seo-sitemap": {
    gewerk: "backend",
    text: "Eine sitemap.xml erzeugen lassen — die meisten Systeme können das auf Knopfdruck — und sie in der robots.txt mit einer Sitemap-Zeile bekannt machen. Danach in der Google Search Console einreichen.",
  },
  "seo-canonical": {
    gewerk: "frontend",
    text: "Auf jeder Seite die bevorzugte Adresse als Canonical angeben. Zeigt der Verweis auf eine fremde Domain, ist das fast immer ein Kopierfehler aus einer Vorlage und kostet die gesamte Sichtbarkeit dieser Seite.",
  },
  "seo-social-vorschau": {
    gewerk: "design",
    text: "Ein Vorschaubild in 1200×630 Pixeln gestalten und zusammen mit og:title und og:description einbinden. Danach mit dem Sharing-Debugger prüfen, wie der Link bei WhatsApp und Facebook aussieht.",
  },
  "seo-alt": {
    gewerk: "inhalt",
    text: "Inhaltstragenden Bildern eine kurze Beschreibung als alt-Text geben, rein dekorativen ein leeres alt=\"\". Beschreiben, was zu sehen ist — keine Stichwortsammlung.",
  },
  "seo-lang": {
    gewerk: "frontend",
    text: "Am html-Element lang=\"de\" ergänzen. Eine Änderung an einer einzigen Stelle in der Vorlage.",
  },
  "seo-sprechende-urls": {
    gewerk: "backend",
    text: "Die Adressen auf lesbare Pfade umstellen. Entscheidend dabei: für jede alte Adresse eine 301-Weiterleitung einrichten, sonst geht die aufgebaute Sichtbarkeit verloren und alle geteilten Links laufen ins Leere.",
  },
  "seo-404": {
    gewerk: "backend",
    text: "Den Server für unbekannte Adressen einen echten 404 senden lassen und eine eigene Fehlerseite gestalten — mit Suchfeld und Weg zurück zur Startseite, damit diese Besucher nicht verloren gehen.",
  },

  // -------------------------------------------------------------------- GEO
  "geo-llms-txt": {
    gewerk: "inhalt",
    text: "Eine Datei llms.txt im Wurzelverzeichnis anlegen: Angebot in einem Satz, Leistungen mit je einer Zeile, Einzugsgebiet, Kontaktdaten, Liste der wichtigsten Seiten. Nüchterne Fakten, kein Werbetext — Werbesprache ist genau das, was KI-Systeme nicht zitieren.",
  },
  "geo-ki-crawler": {
    gewerk: "backend",
    text: "Die Sperreinträge für die KI-Crawler aus der robots.txt entfernen. Vorher kurz klären, ob die Sperre bewusst gesetzt wurde — meist stammt sie von einem Plugin oder einer Hoster-Voreinstellung und niemand hat sie je entschieden.",
  },
  "geo-jsonld": {
    gewerk: "frontend",
    text: "Ein LocalBusiness-Schema als JSON-LD einbauen, besser noch den passenden Untertyp (etwa Elektriker, Friseur, Kanzlei), mit Name, Anschrift, Telefon, Öffnungszeiten und Einzugsgebiet. Danach mit dem Google Rich Results Test prüfen — Fehlerfreiheit ist hier Abnahmekriterium.",
  },
  "geo-nap": {
    gewerk: "frontend",
    text: "Die fehlenden Angaben im JSON-LD ergänzen: address, telephone und openingHoursSpecification. Erst dann kann eine KI die Frage „hat der Betrieb heute offen?\" überhaupt beantworten.",
  },
  "geo-textanteil": {
    gewerk: "inhalt",
    text: "Die Leistungen als echten Fließtext ausschreiben, statt sie in Bildern, Schiebereglern oder Videos zu transportieren — beides liest kein KI-System. Zwei bis drei Absätze je Leistung mit Einzugsgebiet reichen aus.",
  },
  "geo-faq": {
    gewerk: "inhalt",
    text: "Die fünf bis acht Fragen sammeln, die Ihnen Kunden ständig am Telefon stellen, und knapp beantworten. Sichtbar auf der Seite und zusätzlich als FAQPage-Schema auszeichnen. Das ist der wirksamste einzelne Schritt für die Sichtbarkeit in KI-Antworten, weil solche Frage-Antwort-Paare fast wörtlich übernommen werden.",
  },
  "geo-einstieg": {
    gewerk: "inhalt",
    text: "Ganz oben zwei bis drei Sätze setzen, die ohne Umschweife sagen, welche Leistung Sie für wen in welcher Gegend erbringen. Genau dieser Absatz wird zitiert, wenn eine KI Ihren Betrieb erklären soll — Adjektive durch überprüfbare Fakten ersetzen (seit wann, wie viele, welche Qualifikation).",
  },

  // ----------------------------------------------------------------- Inhalt
  "inhalt-telefon-link": {
    gewerk: "frontend",
    text: "Die Telefonnummer als Link auszeichnen, im href die internationale Schreibweise ohne Leerzeichen. Auf dem Handy wird daraus ein Antippen statt Abtippen — der kürzeste Weg von der Website zum Auftrag.",
  },
  "inhalt-telefon": {
    gewerk: "inhalt",
    text: "Eine Telefonnummer sichtbar auf der Startseite unterbringen, am besten im Kopfbereich und im Fußbereich, und gleich als anklickbaren Link.",
  },
  "inhalt-email": {
    gewerk: "inhalt",
    text: "Eine E-Mail-Adresse ergänzen oder ein Kontaktformular anbieten. Wer abends oder am Wochenende anfragen möchte, braucht einen Weg, der nicht das Telefon ist.",
  },
  "inhalt-adresse": {
    gewerk: "inhalt",
    text: "Die vollständige Anschrift in den Fußbereich aufnehmen — nicht nur ins Impressum. Das schafft Vertrauen und hilft Google, Sie regional zuzuordnen.",
  },
  "inhalt-oeffnungszeiten": {
    gewerk: "inhalt",
    text: "Die Öffnungszeiten als klare Liste im Fußbereich zeigen. Gibt es keine festen Zeiten, ist auch das eine hilfreiche Angabe — etwa „Termine nach Vereinbarung\".",
  },
  "inhalt-cta": {
    gewerk: "design",
    text: "Im oberen sichtbaren Bereich eine deutliche Handlungsaufforderung platzieren — anrufen, Termin anfragen, Rückruf anfordern. Eine primäre Aktion je Seite, optisch klar hervorgehoben; alles Weitere ordnet sich unter.",
  },
  "inhalt-copyright": {
    gewerk: "frontend",
    text: "Die Jahreszahl im Fußbereich automatisch aus dem Systemdatum setzen lassen. Dann veraltet sie nie wieder — und eine veraltete Jahreszahl ist eines der ersten Dinge, an denen Besucher eine vernachlässigte Seite erkennen.",
  },
  "inhalt-aktualitaet": {
    gewerk: "inhalt",
    text: "Die Inhalte durchgehen und auf Stand bringen: Referenzen, Leistungen, Jahreszahlen, Teamseite. Ein sichtbares Zeichen von Pflege wirkt auf Besucher stärker als die meisten technischen Verbesserungen.",
  },
};

/**
 * Sucht die Maßnahme zu einer Befund-Kennung.
 *
 * Manche Kennungen tragen einen Zusatz für Mobil bzw. Desktop
 * (`performance-lcp-mobile`). Der Zusatz ändert nichts an der Maßnahme, wird
 * hier also abgeschnitten, bevor erneut gesucht wird.
 */
export function findeMassnahme(befundId: string): MassnahmeEintrag | null {
  const treffer = MASSNAHMEN[befundId];
  if (treffer !== undefined) return treffer;

  const ohneStrategie = befundId.replace(/-(?:mobile|desktop)$/, "");
  return MASSNAHMEN[ohneStrategie] ?? null;
}
