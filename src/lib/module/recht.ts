import { gut, kritisch, ungeprueft, verbesserbar } from "@/lib/befund";
import type { PruefKontext, RechtsSeite } from "@/lib/kontext";
import type { ModulErgebnis, PruefModul } from "@/lib/module";
import type { Befund } from "@/lib/types";

/**
 * Modul 2 — Recht & DSGVO.
 *
 * Das ist die schwerste Kategorie (25 %), weil hier echtes Geld hängt:
 * Abmahnungen wegen Google Fonts und fehlender Pflichtangaben treffen in
 * Deutschland regelmäßig genau die Betriebe, die dieses Tool ansprechen soll.
 *
 * Wichtig für den Ton: Wir stellen fest, was technisch der Fall ist, und
 * ordnen das Risiko ein. Wir geben keine Rechtsberatung und behaupten keine
 * Rechtsverstöße — im Zweifel lautet der Status `unklar`.
 */

/** Dienste aus Drittländern, die ohne Einwilligung problematisch sind. */
const US_DIENSTE = [
  {
    id: "google-analytics",
    name: "Google Analytics",
    muster: /google-analytics\.com|googletagmanager\.com\/gtag\/js|\bga\(\s*['"]create|gtag\(\s*['"]config/i,
    klartext:
      "Ihre Seite misst Besucherzahlen mit einem Dienst von Google, der Daten in die USA überträgt. Ohne vorher eingeholte Einwilligung ist das angreifbar.",
    technisch:
      "Google Analytics / gtag.js erkannt. Der Dienst darf erst nach aktiver Einwilligung geladen werden; ein Hinweisbanner ohne Ladeblockade genügt nicht.",
  },
  {
    id: "gtm",
    name: "Google Tag Manager",
    muster: /googletagmanager\.com\/gtm\.js|GTM-[A-Z0-9]{4,}/,
    klartext:
      "Ihre Seite lädt einen Google-Dienst, über den weitere Messwerkzeuge nachgeladen werden. Startet er vor der Einwilligung, gilt das rechtlich als problematisch.",
    technisch:
      "Google Tag Manager erkannt. Der Container muss bis zur Einwilligung blockiert bleiben (Consent Mode allein ersetzt die Blockade nicht).",
  },
  {
    id: "google-maps",
    name: "Google Maps",
    muster: /(?:www\.)?google\.[a-z.]{2,6}\/maps\/embed|maps\.googleapis\.com|maps\.google\.[a-z.]{2,6}\/maps/i,
    klartext:
      "Die eingebundene Google-Karte überträgt die Adresse Ihrer Besucher an Google, sobald die Seite lädt. Genau dafür wurden schon Betriebe abgemahnt.",
    technisch:
      "Google-Maps-Einbindung erkannt. Empfehlung: Karte erst nach Klick laden (Zwei-Klick-Lösung) oder auf einen Kartendienst ohne Drittlandübermittlung wechseln.",
  },
  {
    id: "facebook-pixel",
    name: "Facebook Pixel",
    muster: /connect\.facebook\.net|fbq\(\s*['"]init|facebook\.com\/tr\?/i,
    klartext:
      "Ihre Seite meldet Besuche an Facebook, auch bei Menschen ohne Facebook-Konto. Ohne Einwilligung ist das rechtlich heikel.",
    technisch:
      "Facebook-Pixel erkannt. Darf ausschließlich nach ausdrücklicher Einwilligung geladen werden.",
  },
  {
    id: "recaptcha",
    name: "Google reCAPTCHA",
    muster: /google\.com\/recaptcha|recaptcha\/api\.js|gstatic\.com\/recaptcha/i,
    klartext:
      "Der Spam-Schutz Ihrer Formulare läuft über Google und überträgt dabei Besucherdaten. Es gibt Alternativen, die ohne diese Übertragung auskommen.",
    technisch:
      "Google reCAPTCHA erkannt. Datensparsame Alternativen: Friendly Captcha, hCaptcha (EU-Hosting), Honeypot-Felder oder eine einfache Rechenaufgabe.",
  },
];

function hatConsentHinweis(html: string): { gefunden: boolean; treffer: string[] } {
  const muster: { name: string; regex: RegExp }[] = [
    { name: "Cookiebot", regex: /cookiebot/i },
    { name: "Usercentrics", regex: /usercentrics/i },
    { name: "Borlabs Cookie", regex: /borlabs-cookie|borlabs/i },
    { name: "Complianz", regex: /complianz|cmplz/i },
    { name: "CookieYes / Cookie Notice", regex: /cookieyes|cookie-notice|cookie-law-info/i },
    { name: "Klaro", regex: /klaro/i },
    { name: "Osano / Cookie Consent", regex: /osano|cookieconsent/i },
    { name: "Allgemeiner Banner-Hinweis", regex: /consent-?(?:banner|manager|modal)|cookie-?(?:banner|consent|hinweis)/i },
  ];

  const treffer = muster.filter((m) => m.regex.test(html)).map((m) => m.name);
  return { gefunden: treffer.length > 0, treffer };
}

/** Cookies, die üblicherweise technisch notwendig sind. */
const TECHNISCH_NOTWENDIG =
  /^(PHPSESSID|JSESSIONID|ASP\.NET_SessionId|ASPSESSION|SESS[a-f0-9]*|laravel_session|wordpress_(?:test_cookie|logged_in|sec)|wp-settings|csrftoken|XSRF-TOKEN|cf_clearance|__cf_bm|__Host-|__Secure-|AWSALB|incap_ses|visid_incap)/i;

function pruefeRechtsSeite(
  seite: RechtsSeite | null,
  konfig: {
    id: string;
    titelVorhanden: string;
    titelFehlt: string;
    was: string;
    klartextFehlt: string;
    klartextGut: string;
    /** Mindestanzahl Zeichen, ab der die Seite als inhaltlich gefüllt gilt. */
    mindestLaenge: number;
    /** Begriffe, die auf der Zielseite stehen sollten. */
    stichworte: RegExp;
  },
): Befund {
  if (seite === null) {
    return kritisch(
      konfig.id,
      konfig.titelFehlt,
      konfig.klartextFehlt,
      `Auf der Startseite wurde kein Link gefunden, dessen Text oder Adresse auf ${konfig.was} hindeutet. Geprüft wurden Linktext, aria-label, title und href aller <a>-Elemente.`,
      "klein",
    );
  }

  if (seite.antwort === null) {
    return ungeprueft(
      konfig.id,
      konfig.titelVorhanden,
      `Der Link ist vorhanden, die Seite selbst ließ sich beim automatischen Durchlauf aber nicht abrufen. Bitte kurz von Hand öffnen.`,
      `Link gefunden: ${seite.url} (Linktext: "${seite.linktext}"). Der Abruf war nicht möglich — entweder liegt die Seite auf einer anderen Domain (wird bewusst nicht abgerufen) oder das Anfragebudget war erschöpft. Nicht bewertet.`,
    );
  }

  const status = seite.antwort.status;
  if (status < 200 || status >= 300) {
    return kritisch(
      konfig.id,
      `${konfig.titelVorhanden} — Link führt ins Leere`,
      `Der Link zu ${konfig.was} ist zwar da, aber die Seite dahinter lädt nicht. Rechtlich zählt das wie ein fehlendes ${konfig.was}.`,
      `${seite.url} antwortet mit HTTP-Status ${status}. Erwartet wird 200.`,
      "klein",
    );
  }

  const text = seite.antwort.body.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

  if (text.length < konfig.mindestLaenge || !konfig.stichworte.test(text)) {
    return verbesserbar(
      konfig.id,
      `${konfig.titelVorhanden} — wirkt unvollständig`,
      `Die Seite ist erreichbar, enthält aber auffällig wenig Inhalt. Fehlen Pflichtangaben, hilft die Seite im Ernstfall nicht.`,
      `${seite.url} liefert Status ${status}, aber nur ${text.length} Zeichen Text${konfig.stichworte.test(text) ? "" : " und keines der erwarteten Stichworte"}. Automatisch lässt sich nur der Umfang beurteilen, nicht die inhaltliche Vollständigkeit — bitte inhaltlich prüfen lassen.`,
      "klein",
    );
  }

  return gut(
    konfig.id,
    konfig.titelVorhanden,
    konfig.klartextGut,
    `Link gefunden (Linktext: "${seite.linktext}"), Ziel ${seite.url} antwortet mit Status ${status} und enthält ${text.length} Zeichen Text. Geprüft wurde Erreichbarkeit und Umfang, nicht die inhaltliche Vollständigkeit im Sinne von § 5 DDG bzw. Art. 13 DSGVO.`,
  );
}

function pruefeRecht(kontext: PruefKontext): ModulErgebnis {
  const befunde: Befund[] = [];
  const { $, html, seite, basisUrl } = kontext;

  // --- Impressum ---------------------------------------------------------
  befunde.push(
    pruefeRechtsSeite(kontext.impressum, {
      id: "recht-impressum",
      titelVorhanden: "Ihr Impressum ist verlinkt und erreichbar",
      titelFehlt: "Es fehlt ein Impressum",
      was: "ein Impressum",
      klartextFehlt:
        "Auf Ihrer Startseite ist kein Impressum verlinkt. Das ist für geschäftliche Websites in Deutschland Pflicht und wird regelmäßig abgemahnt.",
      klartextGut:
        "Ihr Impressum ist von der Startseite aus verlinkt und lädt einwandfrei. Das ist Pflicht und bei Ihnen erledigt — bitte so lassen.",
      mindestLaenge: 200,
      stichworte: /(?:verantwortlich|vertreten durch|umsatzsteuer|ust[- ]?id|telefon|anschrift|geschäftsführ|inhaber|kontakt)/i,
    }),
  );

  // --- Datenschutzerklärung ---------------------------------------------
  befunde.push(
    pruefeRechtsSeite(kontext.datenschutz, {
      id: "recht-datenschutz",
      titelVorhanden: "Ihre Datenschutzerklärung ist verlinkt und erreichbar",
      titelFehlt: "Es fehlt eine Datenschutzerklärung",
      was: "eine Datenschutzerklärung",
      klartextFehlt:
        "Auf Ihrer Startseite ist keine Datenschutzerklärung verlinkt. Sobald Ihre Seite auch nur Besucherdaten im Serverprotokoll speichert — und das tut praktisch jede — ist sie Pflicht.",
      klartextGut:
        "Ihre Datenschutzerklärung ist von der Startseite aus verlinkt und lädt einwandfrei. Genau so muss es sein.",
      mindestLaenge: 500,
      stichworte: /(?:personenbezogen|datenschutz|verarbeitung|dsgvo|betroffenenrecht|einwilligung|art\.?\s*6)/i,
    }),
  );

  // --- Google Fonts vom Google-CDN --------------------------------------
  const fontsTreffer: string[] = [];
  if (/fonts\.googleapis\.com/i.test(html)) fontsTreffer.push("fonts.googleapis.com");
  if (/fonts\.gstatic\.com/i.test(html)) fontsTreffer.push("fonts.gstatic.com");

  if (fontsTreffer.length > 0) {
    befunde.push(
      kritisch(
        "recht-google-fonts",
        "Ihre Schriftarten werden von Google geladen",
        "Ihre Seite holt die Schriften bei jedem Aufruf direkt bei Google und übermittelt dabei die Adresse Ihrer Besucher in die USA. Genau dafür verschicken Abmahnkanzleien seit dem Urteil des Landgerichts München I serienweise Schreiben.",
        `Gefunden: ${fontsTreffer.join(", ")}. Lösung: Schriftdateien herunterladen, im eigenen Webspace ablegen und per @font-face lokal einbinden. Aufwand üblicherweise unter einer Stunde. (LG München I, Urteil vom 20.01.2022, Az. 3 O 17493/20.)`,
        "klein",
      ),
    );
  } else {
    befunde.push(
      gut(
        "recht-google-fonts",
        "Ihre Schriftarten kommen vom eigenen Server",
        "Ihre Seite lädt keine Schriften bei Google. Damit fällt das häufigste Abmahnrisiko für Websites in Deutschland bei Ihnen weg — bitte unbedingt so beibehalten.",
        "Keine Verweise auf fonts.googleapis.com oder fonts.gstatic.com im HTML der Startseite gefunden.",
      ),
    );
  }

  // --- US-Dienste ohne Einwilligung -------------------------------------
  const consent = hatConsentHinweis(html);
  const gefundeneDienste = US_DIENSTE.filter((dienst) => dienst.muster.test(html));

  for (const dienst of gefundeneDienste) {
    // Mit erkanntem Consent-Werkzeug lässt sich nicht automatisch feststellen,
    // ob der Dienst tatsächlich erst nach Einwilligung startet. Dann gilt:
    // nicht behaupten, sondern als ungeprüft ausweisen.
    if (consent.gefunden) {
      befunde.push(
        ungeprueft(
          `recht-dienst-${dienst.id}`,
          `${dienst.name} ist eingebunden — Einwilligung nicht automatisch prüfbar`,
          `Ihre Seite nutzt ${dienst.name} und hat gleichzeitig ein Einwilligungs-Banner. Ob der Dienst wirklich erst nach dem Klick startet, lässt sich von außen nicht sicher feststellen.`,
          `${dienst.technisch}\n\nErkanntes Consent-Werkzeug: ${consent.treffer.join(", ")}. Für eine belastbare Aussage müsste das Ladeverhalten vor und nach der Einwilligung im Browser verglichen werden — das leistet dieser automatische Check bewusst nicht. Nicht bewertet.`,
        ),
      );
    } else {
      befunde.push(
        kritisch(
          `recht-dienst-${dienst.id}`,
          `${dienst.name} lädt ohne Einwilligung`,
          dienst.klartext,
          `${dienst.technisch}\n\nAuf der Seite wurde kein Einwilligungs-Werkzeug gefunden, das den Start verhindern könnte.`,
          "mittel",
        ),
      );
    }
  }

  if (gefundeneDienste.length === 0) {
    befunde.push(
      gut(
        "recht-us-dienste",
        "Keine kritischen US-Dienste auf Ihrer Startseite",
        "Ihre Startseite bindet keine der üblichen US-Werkzeuge ein, die Besucherdaten ohne Einwilligung übertragen. Das ist datenschutzrechtlich die entspannteste Ausgangslage.",
        "Geprüft und nicht gefunden: Google Analytics, Google Tag Manager, Google Maps, Facebook Pixel, Google reCAPTCHA. Geprüft wurde ausschließlich das HTML der Startseite; Unterseiten können abweichen.",
      ),
    );
  }

  // --- YouTube ohne nocookie --------------------------------------------
  const youtubeNormal = /(?:www\.)?youtube\.com\/(?:embed|watch)/i.test(html);
  const youtubeNocookie = /youtube-nocookie\.com/i.test(html);

  if (youtubeNormal && !youtubeNocookie) {
    befunde.push(
      kritisch(
        "recht-youtube",
        "Eingebundene Videos setzen Google-Cookies",
        "Ihre Seite bindet YouTube-Videos in der Fassung ein, die Besucher schon beim Laden bei Google registriert. Es gibt eine datensparsame Variante, die genauso aussieht.",
        "YouTube-Einbindung über youtube.com erkannt, ohne den erweiterten Datenschutzmodus. Lösung: In der Einbettungsadresse `www.youtube.com` durch `www.youtube-nocookie.com` ersetzen. Noch besser ist eine Zwei-Klick-Lösung mit Vorschaubild.",
        "klein",
      ),
    );
  } else if (youtubeNocookie) {
    befunde.push(
      gut(
        "recht-youtube",
        "Ihre Videos sind datensparsam eingebunden",
        "Sie nutzen bei YouTube die Variante mit erweitertem Datenschutz. Das ist genau der richtige Weg, wenn Videos auf der Seite sein sollen.",
        "Einbindung über youtube-nocookie.com erkannt (erweiterter Datenschutzmodus).",
      ),
    );
  }

  // --- Cookies vor Einwilligung -----------------------------------------
  const cookies = seite.setCookie;
  const cookieNamen = cookies
    .map((eintrag) => eintrag.split("=")[0]?.trim() ?? "")
    .filter((name) => name !== "");
  const heikleCookies = cookieNamen.filter((name) => !TECHNISCH_NOTWENDIG.test(name));

  if (cookieNamen.length === 0) {
    befunde.push(
      gut(
        "recht-cookies",
        "Beim ersten Aufruf werden keine Cookies gesetzt",
        "Wer Ihre Seite zum ersten Mal öffnet, bekommt keine Cookies untergeschoben. Das ist die sauberste Ausgangslage, die eine Website haben kann.",
        "Die erste Antwort der Startseite enthält keinen `Set-Cookie`-Header. Von JavaScript nachträglich gesetzte Cookies erfasst dieser Check nicht.",
      ),
    );
  } else if (heikleCookies.length === 0) {
    befunde.push(
      gut(
        "recht-cookies",
        "Nur technisch notwendige Cookies beim ersten Aufruf",
        "Ihre Seite setzt beim ersten Aufruf nur Cookies, die für den Betrieb nötig sind. Dafür braucht es keine Einwilligung — das passt so.",
        `Gesetzte Cookies: ${cookieNamen.join(", ")}. Alle wurden als technisch notwendig eingestuft (Sitzung, Sicherheit, Lastverteilung). Von JavaScript nachträglich gesetzte Cookies erfasst dieser Check nicht.`,
      ),
    );
  } else {
    befunde.push(
      kritisch(
        "recht-cookies",
        "Cookies werden vor jeder Einwilligung gesetzt",
        "Ihre Seite speichert schon beim ersten Aufruf Daten auf dem Gerät Ihrer Besucher, bevor irgendjemand zustimmen konnte. Das ist der Punkt, an dem Aufsichtsbehörden ansetzen.",
        `Beim ersten Aufruf gesetzt: ${heikleCookies.join(", ")}. Diese Namen fallen nicht unter die üblichen technisch notwendigen Cookies. Vollständige Liste: ${cookieNamen.join(", ")}. Diese Cookies dürfen erst nach aktiver Einwilligung gesetzt werden (§ 25 TDDDG).`,
        "mittel",
      ),
    );
  }

  // --- Hinweise auf ein Consent-Banner ----------------------------------
  if (consent.gefunden) {
    befunde.push(
      gut(
        "recht-consent-banner",
        "Ein Einwilligungs-Banner ist vorhanden",
        "Ihre Seite fragt Besucher nach ihrer Einwilligung, bevor optionale Dienste starten sollen. Der Baustein ist da — wichtig ist, dass er auch wirklich blockiert.",
        `Erkannt: ${consent.treffer.join(", ")}. Ob das Werkzeug die Dienste tatsächlich bis zur Einwilligung blockiert, lässt sich nur im Browser prüfen, nicht am HTML.`,
      ),
    );
  } else if (gefundeneDienste.length > 0 || heikleCookies.length > 0) {
    befunde.push(
      kritisch(
        "recht-consent-banner",
        "Es fehlt eine Einwilligungs-Abfrage",
        "Ihre Seite lädt Dienste oder setzt Cookies, die eine Einwilligung brauchen — fragt aber niemanden. Das ist die Konstellation, die am häufigsten Ärger macht.",
        "Kein Consent-Werkzeug im HTML erkannt, während einwilligungspflichtige Einbindungen vorhanden sind. Geprüfte Werkzeuge: Cookiebot, Usercentrics, Borlabs, Complianz, CookieYes, Klaro, Osano sowie allgemeine Banner-Muster.",
        "mittel",
      ),
    );
  } else {
    befunde.push(
      gut(
        "recht-consent-banner",
        "Sie brauchen kein Cookie-Banner",
        "Ihre Seite lädt nichts, wofür eine Einwilligung nötig wäre — deshalb muss sie ihre Besucher auch nicht mit einem Banner behelligen. Das ist die eleganteste Lösung.",
        "Weder einwilligungspflichtige Drittdienste noch nicht-notwendige Cookies gefunden. Ein Consent-Banner ist damit entbehrlich.",
      ),
    );
  }

  // --- Kontaktformular ausschließlich über HTTPS ------------------------
  const formulare = $("form").toArray();
  if (formulare.length === 0) {
    befunde.push(
      ungeprueft(
        "recht-formular-https",
        "Verschlüsselte Übertragung von Formulardaten",
        "Auf Ihrer Startseite gibt es kein Formular. Falls Sie auf einer Unterseite ein Kontaktformular haben, prüfen wir das hier nicht mit.",
        "Kein <form>-Element auf der Startseite gefunden. Nicht bewertet.",
      ),
    );
  } else {
    const unsichere: string[] = [];
    for (const formular of formulare) {
      const action = $(formular).attr("action") ?? "";
      if (action === "") continue;
      try {
        const ziel = new URL(action, basisUrl);
        if (ziel.protocol === "http:") unsichere.push(ziel.href);
      } catch {
        // Unparsbare action — nicht bewerten.
      }
    }

    if (unsichere.length > 0) {
      befunde.push(
        kritisch(
          "recht-formular-https",
          "Formulardaten werden unverschlüsselt verschickt",
          "Was Besucher in Ihr Formular eintippen — Name, Telefonnummer, Anliegen — geht unverschlüsselt durchs Netz und ist unterwegs mitlesbar.",
          `Formular-Ziele über http:// gefunden: ${unsichere.join(", ")}. Die action-Adresse muss auf https:// zeigen.`,
          "klein",
        ),
      );
    } else if (basisUrl.protocol === "https:") {
      befunde.push(
        gut(
          "recht-formular-https",
          "Ihre Formulardaten werden verschlüsselt übertragen",
          `Was Besucher in Ihr Formular eintragen, ist auf dem Weg zu Ihnen geschützt. Bei ${formulare.length === 1 ? "dem Formular" : `allen ${formulare.length} Formularen`} auf der Startseite ist das der Fall.`,
          `${formulare.length} Formular(e) geprüft, keines sendet an eine http://-Adresse. Die Seite selbst läuft über HTTPS.`,
        ),
      );
    } else {
      befunde.push(
        kritisch(
          "recht-formular-https",
          "Formulardaten werden unverschlüsselt verschickt",
          "Ihre Seite läuft ohne Verschlüsselung. Alles, was Besucher in ein Formular eintippen, ist unterwegs mitlesbar.",
          `${formulare.length} Formular(e) auf einer Seite ohne HTTPS. Auch ohne explizite http://-action landen die Daten unverschlüsselt beim Server.`,
          "klein",
        ),
      );
    }
  }

  return {
    befunde,
    manuelleHinweise: [
      "Ob Impressum und Datenschutzerklärung inhaltlich vollständig sind, lässt sich nicht automatisch beurteilen. Geprüft wurden nur Erreichbarkeit und Umfang. Dieser Report ist keine Rechtsberatung.",
    ],
  };
}

export const rechtModul: PruefModul = {
  id: "recht",
  pruefe: pruefeRecht,
};
