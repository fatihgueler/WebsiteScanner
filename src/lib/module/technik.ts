import { gut, kritisch, ungeprueft, verbesserbar } from "@/lib/befund";
import type { PruefKontext } from "@/lib/kontext";
import type { Befund } from "@/lib/types";
import type { ModulErgebnis, PruefModul } from "@/lib/module";

/**
 * Modul 1 — Technik & Sicherheit.
 *
 * Alle Texte im Feld `klartext` richten sich an Betriebsinhaber ohne
 * IT-Hintergrund: höchstens zwei Sätze, kein Fachwort, und sie erklären die
 * Auswirkung fürs Geschäft. Die Fachdetails stehen in `technisch`.
 */

/** Security-Header, einzeln geprüft. */
const SICHERHEITS_HEADER = [
  {
    id: "csp",
    header: "content-security-policy",
    titel: "Schutz vor eingeschleustem Fremdcode",
    fehltKlartext:
      "Ihre Seite sagt dem Browser nicht, welche Inhalte er laden darf. Wird die Seite einmal manipuliert, kann fremder Code ungehindert mitlaufen.",
    gutKlartext:
      "Ihre Seite gibt dem Browser klare Regeln, welche Inhalte er laden darf. Das erschwert es Angreifern erheblich, etwas unterzuschieben — bitte so beibehalten.",
    aufwand: "mittel" as const,
    schwere: "verbesserbar" as const,
  },
  {
    id: "hsts",
    header: "strict-transport-security",
    titel: "Dauerhaft verschlüsselte Verbindung erzwungen",
    fehltKlartext:
      "Beim ersten Aufruf kann die Verbindung noch unverschlüsselt zustande kommen. In fremden WLANs lässt sich das ausnutzen.",
    gutKlartext:
      "Browser merken sich, dass Ihre Seite nur verschlüsselt aufgerufen werden darf. Genau so soll es sein.",
    aufwand: "klein" as const,
    schwere: "verbesserbar" as const,
  },
  {
    id: "nosniff",
    header: "x-content-type-options",
    titel: "Browser rät nicht am Dateityp herum",
    fehltKlartext:
      "Der Browser darf selbst raten, um was für eine Datei es sich handelt. Das lässt sich missbrauchen, um harmlos aussehende Uploads als Programmcode auszuführen.",
    gutKlartext:
      "Der Browser hält sich strikt an die angegebenen Dateitypen. Ein kleiner, wirksamer Schutz, der bei Ihnen sitzt.",
    aufwand: "klein" as const,
    schwere: "verbesserbar" as const,
  },
  {
    id: "referrer",
    header: "referrer-policy",
    titel: "Sparsam mit Herkunftsdaten Ihrer Besucher",
    fehltKlartext:
      "Beim Klick auf einen externen Link erfährt die fremde Seite, von welcher Ihrer Unterseiten der Besucher kam. Das ist unnötig und datenschutzrechtlich unschön.",
    gutKlartext:
      "Ihre Seite gibt beim Wechsel auf fremde Seiten nur das Nötigste über die Herkunft preis. Datensparsam und richtig eingestellt.",
    aufwand: "klein" as const,
    schwere: "verbesserbar" as const,
  },
  {
    id: "permissions",
    header: "permissions-policy",
    titel: "Kamera, Mikrofon und Standort abgeschaltet",
    fehltKlartext:
      "Ihre Seite regelt nicht ausdrücklich, ob eingebundene fremde Inhalte auf Kamera, Mikrofon oder Standort zugreifen dürfen.",
    gutKlartext:
      "Ihre Seite regelt ausdrücklich, welche Gerätefunktionen genutzt werden dürfen. Vorbildlich.",
    aufwand: "klein" as const,
    schwere: "verbesserbar" as const,
  },
];

function headerWert(kontext: PruefKontext, name: string): string | null {
  const wert = kontext.seite.headers[name];
  return typeof wert === "string" && wert.trim() !== "" ? wert : null;
}

/** Bekannte JS-Bibliotheken mit Versionsnummer im Quelltext. */
function findeVeralteteBibliotheken(html: string): {
  name: string;
  version: string;
  quelle: string;
  veraltet: boolean;
  hinweis: string;
}[] {
  const funde: {
    name: string;
    version: string;
    quelle: string;
    veraltet: boolean;
    hinweis: string;
  }[] = [];

  const muster = [
    {
      name: "jQuery",
      regex: /jquery[.-]?(?:v)?(\d+)\.(\d+)(?:\.(\d+))?(?:\.min)?\.js/gi,
      istVeraltet: (haupt: number, neben: number) =>
        haupt < 3 || (haupt === 3 && neben < 5),
      hinweis:
        "jQuery unter 3.5 enthält bekannte XSS-Lücken (CVE-2020-11022 / CVE-2020-11023).",
    },
    {
      name: "Bootstrap",
      regex: /bootstrap[.-]?(?:v)?(\d+)\.(\d+)(?:\.(\d+))?(?:\.min)?\.(?:js|css)/gi,
      istVeraltet: (haupt: number) => haupt < 4,
      hinweis: "Bootstrap 3 und älter bekommen keine Sicherheitsupdates mehr.",
    },
    {
      name: "AngularJS",
      regex: /angular[.-]?(?:v)?(1)\.(\d+)(?:\.(\d+))?(?:\.min)?\.js/gi,
      istVeraltet: () => true,
      hinweis: "AngularJS 1.x hat seit Anfang 2022 keinen Support mehr.",
    },
  ];

  for (const eintrag of muster) {
    let treffer: RegExpExecArray | null;
    eintrag.regex.lastIndex = 0;
    while ((treffer = eintrag.regex.exec(html)) !== null) {
      const haupt = Number(treffer[1]);
      const neben = Number(treffer[2] ?? 0);
      const patch = treffer[3] ?? "0";
      const version = `${haupt}.${neben}.${patch}`;
      if (funde.some((f) => f.name === eintrag.name && f.version === version)) continue;
      funde.push({
        name: eintrag.name,
        version,
        quelle: treffer[0],
        veraltet: eintrag.istVeraltet(haupt, neben),
        hinweis: eintrag.hinweis,
      });
    }
  }

  return funde;
}

function pruefeTechnik(kontext: PruefKontext): ModulErgebnis {
  const befunde: Befund[] = [];
  const { seite, basisUrl, $ } = kontext;

  // --- HTTPS erreichbar --------------------------------------------------
  if (basisUrl.protocol === "https:") {
    befunde.push(
      gut(
        "technik-https",
        "Ihre Seite ist verschlüsselt erreichbar",
        "Die Verbindung zu Ihrer Website ist verschlüsselt. Besucher sehen das Schloss-Symbol im Browser und keine Warnung — das ist die Grundlage für Vertrauen und bleibt so.",
        `Die Seite ist unter ${basisUrl.origin} per HTTPS erreichbar. Status ${seite.status}.`,
      ),
    );
  } else {
    befunde.push(
      kritisch(
        "technik-https",
        "Ihre Seite läuft ohne Verschlüsselung",
        "Browser zeigen bei Ihrer Seite eine Warnung „Nicht sicher“ an. Das schreckt Besucher ab, und Google stuft solche Seiten schlechter ein.",
        `Die Seite wird über ${basisUrl.protocol}// ausgeliefert. Ein TLS-Zertifikat (z. B. kostenlos über Let's Encrypt) und eine dauerhafte Weiterleitung auf HTTPS sind erforderlich.`,
        "klein",
      ),
    );
  }

  // --- Weiterleitung von HTTP auf HTTPS ----------------------------------
  if (basisUrl.protocol !== "https:") {
    // Ohne HTTPS ergibt die Weiterleitungsprüfung keinen eigenständigen Sinn.
  } else if (kontext.httpVariante === null) {
    befunde.push(
      ungeprueft(
        "technik-http-weiterleitung",
        "Weiterleitung von unverschlüsselt auf verschlüsselt",
        "Ob der unverschlüsselte Aufruf automatisch auf die sichere Adresse umgeleitet wird, ließ sich nicht feststellen.",
        `Der Abruf von http://${basisUrl.host}/ war nicht möglich (Zeitlimit, geschlossener Port 80 oder Anfragebudget). Nicht bewertet.`,
      ),
    );
  } else {
    const status = kontext.httpVariante.status;
    const ziel = kontext.httpVariante.headers.location ?? "";
    const leitetAufHttps = status >= 300 && status < 400 && ziel.startsWith("https://");

    if (leitetAufHttps) {
      befunde.push(
        gut(
          "technik-http-weiterleitung",
          "Unverschlüsselte Aufrufe werden umgeleitet",
          "Wer Ihre Adresse ohne „https“ eintippt, landet automatisch auf der sicheren Version. Genau richtig eingerichtet.",
          `http://${basisUrl.host}/ antwortet mit ${status} und leitet auf ${ziel} weiter.`,
        ),
      );
    } else if (status >= 200 && status < 300) {
      befunde.push(
        kritisch(
          "technik-http-weiterleitung",
          "Ihre Seite ist auch unverschlüsselt abrufbar",
          "Ihre Website lässt sich weiterhin ohne Verschlüsselung aufrufen. Besucher können unbemerkt auf der unsicheren Fassung landen, und Google wertet das als doppelten Inhalt.",
          `http://${basisUrl.host}/ antwortet direkt mit Status ${status}, ohne Weiterleitung auf HTTPS. Eine dauerhafte Weiterleitung (301) auf die HTTPS-Adresse ist erforderlich.`,
          "klein",
        ),
      );
    } else {
      befunde.push(
        verbesserbar(
          "technik-http-weiterleitung",
          "Unverschlüsselte Aufrufe laufen ins Leere",
          "Wer Ihre Adresse ohne „https“ eintippt, bekommt keine saubere Weiterleitung, sondern eine Fehlermeldung. Ein Teil dieser Besucher springt ab.",
          `http://${basisUrl.host}/ antwortet mit Status ${status}${ziel !== "" ? `, Ziel: ${ziel}` : ", ohne Location-Header"}. Erwartet wird 301 auf die HTTPS-Adresse.`,
          "klein",
        ),
      );
    }
  }

  // --- TLS-Zertifikat ----------------------------------------------------
  const tls = seite.tls;
  if (tls === null) {
    if (basisUrl.protocol === "https:") {
      befunde.push(
        ungeprueft(
          "technik-zertifikat",
          "Zustand des Sicherheitszertifikats",
          "Die Angaben zum Zertifikat ließen sich nicht auslesen.",
          "Es konnten keine TLS-Informationen zur Verbindung ermittelt werden. Nicht bewertet.",
        ),
      );
    }
  } else if (!tls.gueltig) {
    befunde.push(
      kritisch(
        "technik-zertifikat",
        "Das Sicherheitszertifikat wird nicht akzeptiert",
        "Browser zeigen bei Ihrer Seite eine ganzseitige Sicherheitswarnung. Die allermeisten Besucher brechen an dieser Stelle ab.",
        `TLS-Validierung fehlgeschlagen: ${tls.fehler}. Aussteller: ${tls.aussteller ?? "unbekannt"}, gültig bis ${tls.gueltigBis ?? "unbekannt"}.`,
        "klein",
      ),
    );
  } else if (tls.restlaufzeitTage !== null && tls.restlaufzeitTage < 0) {
    befunde.push(
      kritisch(
        "technik-zertifikat",
        "Das Sicherheitszertifikat ist abgelaufen",
        "Ihre Seite zeigt Besuchern eine Sicherheitswarnung statt Ihrer Startseite. Das muss sofort erneuert werden.",
        `Zertifikat abgelaufen am ${tls.gueltigBis} (${Math.abs(tls.restlaufzeitTage)} Tage her). Aussteller: ${tls.aussteller ?? "unbekannt"}.`,
        "klein",
      ),
    );
  } else if (tls.restlaufzeitTage !== null && tls.restlaufzeitTage < 21) {
    befunde.push(
      verbesserbar(
        "technik-zertifikat",
        "Das Sicherheitszertifikat läuft bald ab",
        `Ihr Zertifikat ist noch ${tls.restlaufzeitTage} Tage gültig. Erneuert es sich nicht automatisch, sehen Besucher danach eine Sicherheitswarnung.`,
        `Restlaufzeit ${tls.restlaufzeitTage} Tage, gültig bis ${tls.gueltigBis}. Aussteller: ${tls.aussteller ?? "unbekannt"}, Protokoll: ${tls.protokoll ?? "unbekannt"}. Automatische Erneuerung prüfen.`,
        "klein",
      ),
    );
  } else {
    befunde.push(
      gut(
        "technik-zertifikat",
        "Ihr Sicherheitszertifikat ist gültig",
        `Das Zertifikat Ihrer Seite ist einwandfrei und läuft erst in ${tls.restlaufzeitTage ?? "vielen"} Tagen ab. Hier ist alles in Ordnung.`,
        `Gültig bis ${tls.gueltigBis}, Aussteller ${tls.aussteller ?? "unbekannt"}, Protokoll ${tls.protokoll ?? "unbekannt"}.`,
      ),
    );
  }

  // --- Weiterleitungskette www / non-www ---------------------------------
  const kettenLaenge = seite.weiterleitungen.length;
  if (kettenLaenge >= 3) {
    befunde.push(
      verbesserbar(
        "technik-weiterleitungskette",
        "Zu viele Zwischenstationen beim Aufruf",
        "Bis Ihre Seite erscheint, wird der Besucher mehrfach weitergereicht. Das kostet Ladezeit, besonders auf dem Handy.",
        `${kettenLaenge} Weiterleitungen: ${seite.weiterleitungen.map((w) => `${w.status} → ${w.nach}`).join(" | ")}. Ziel sollte höchstens ein Sprung sein.`,
        "klein",
      ),
    );
  } else if (kontext.hostGegenstueck === null) {
    befunde.push(
      ungeprueft(
        "technik-weiterleitungskette",
        "Einheitliche Adresse mit und ohne „www“",
        "Ob beide Schreibweisen Ihrer Adresse auf dieselbe Seite führen, ließ sich nicht abschließend feststellen.",
        `Das Gegenstück zu ${basisUrl.hostname} war nicht abrufbar (Zeitlimit oder Anfragebudget). Nicht bewertet.`,
      ),
    );
  } else {
    const gegenStatus = kontext.hostGegenstueck.status;
    const gegenZiel = kontext.hostGegenstueck.headers.location ?? "";
    const leitetKorrektUm =
      gegenStatus >= 300 &&
      gegenStatus < 400 &&
      gegenZiel.includes(basisUrl.hostname);

    if (leitetKorrektUm) {
      befunde.push(
        gut(
          "technik-weiterleitungskette",
          "Ihre Adresse ist eindeutig",
          "Egal ob mit oder ohne „www“ — Besucher landen immer auf derselben Seite. Das ist sauber gelöst und hilft auch bei Google.",
          `${kontext.hostGegenstueck.url} antwortet mit ${gegenStatus} und leitet auf ${gegenZiel} weiter. Weiterleitungskette der Startseite: ${kettenLaenge} Sprung/Sprünge.`,
        ),
      );
    } else if (gegenStatus >= 200 && gegenStatus < 300) {
      befunde.push(
        verbesserbar(
          "technik-weiterleitungskette",
          "Ihre Seite gibt es doppelt — mit und ohne „www“",
          "Beide Schreibweisen liefern eigenständig Ihre Seite aus. Google sieht darin zwei konkurrierende Websites, was Ihre Position in den Suchergebnissen schwächt.",
          `${kontext.hostGegenstueck.url} antwortet direkt mit Status ${gegenStatus}, statt auf ${basisUrl.hostname} weiterzuleiten. Eine der beiden Varianten sollte per 301 auf die andere zeigen.`,
          "klein",
        ),
      );
    } else {
      befunde.push(
        gut(
          "technik-weiterleitungskette",
          "Ihre Adresse ist eindeutig",
          "Ihre Website ist unter genau einer Adresse erreichbar, ohne verwirrende Doppelungen. Das ist sauber gelöst.",
          `${kontext.hostGegenstueck.url} antwortet mit Status ${gegenStatus} (keine konkurrierende Auslieferung). Weiterleitungskette der Startseite: ${kettenLaenge} Sprung/Sprünge.`,
        ),
      );
    }
  }

  // --- Antwortzeit des Servers -------------------------------------------
  const dauer = seite.dauerMs;
  if (dauer < 600) {
    befunde.push(
      gut(
        "technik-antwortzeit",
        "Ihr Server antwortet schnell",
        `Ihr Server meldet sich nach ${dauer} Millisekunden — das ist zügig. Besucher merken keine Verzögerung, und das soll so bleiben.`,
        `Zeit bis zum ersten Byte der finalen Antwort: ${dauer} ms (gemessen ab Verbindungsaufbau, inklusive Weiterleitungen: ${kettenLaenge}).`,
      ),
    );
  } else if (dauer < 1500) {
    befunde.push(
      verbesserbar(
        "technik-antwortzeit",
        "Ihr Server lässt sich etwas Zeit",
        `Bis Ihr Server antwortet, vergeht knapp ${(dauer / 1000).toFixed(1)} Sekunde. Spürbar, aber nicht dramatisch — schneller wäre besser.`,
        `Zeit bis zum ersten Byte: ${dauer} ms. Ursachen sind meist fehlendes Caching, ein überbuchter Shared-Hoster oder langsame Datenbankabfragen.`,
        "mittel",
      ),
    );
  } else {
    befunde.push(
      kritisch(
        "technik-antwortzeit",
        "Ihr Server braucht zu lange zum Antworten",
        `Es dauert ${(dauer / 1000).toFixed(1)} Sekunden, bis überhaupt etwas passiert. Ein spürbarer Teil der Besucher bricht vorher ab.`,
        `Zeit bis zum ersten Byte: ${dauer} ms. Ab etwa 1,5 s wird die Wartezeit deutlich wahrgenommen. Hosting, Caching und Datenbankabfragen prüfen.`,
        "mittel",
      ),
    );
  }

  // --- HTTP-Statuscode ---------------------------------------------------
  if (seite.status >= 200 && seite.status < 300) {
    befunde.push(
      gut(
        "technik-status",
        "Ihre Startseite wird sauber ausgeliefert",
        "Ihre Startseite antwortet so, wie es sein soll. Suchmaschinen und Besucher bekommen ohne Umwege den richtigen Inhalt.",
        `HTTP-Status ${seite.status} unter ${seite.url}.`,
      ),
    );
  } else {
    befunde.push(
      kritisch(
        "technik-status",
        "Ihre Startseite meldet einen Fehler",
        "Ihre Startseite liefert eine Fehlermeldung statt Inhalt. Suchmaschinen nehmen die Seite dann aus dem Index.",
        `HTTP-Status ${seite.status} unter ${seite.url}. Erwartet wird 200.`,
        "mittel",
      ),
    );
  }

  // --- Security-Header, einzeln ------------------------------------------
  for (const eintrag of SICHERHEITS_HEADER) {
    const wert = headerWert(kontext, eintrag.header);
    if (wert !== null) {
      befunde.push(
        gut(
          `technik-header-${eintrag.id}`,
          eintrag.titel,
          eintrag.gutKlartext,
          `${eintrag.header}: ${wert.length > 220 ? `${wert.slice(0, 220)}…` : wert}`,
        ),
      );
    } else {
      befunde.push(
        verbesserbar(
          `technik-header-${eintrag.id}`,
          eintrag.titel,
          eintrag.fehltKlartext,
          `Der HTTP-Header \`${eintrag.header}\` fehlt in der Antwort. Er lässt sich meist ohne Eingriff in die Website in der Serverkonfiguration ergänzen.`,
          eintrag.aufwand,
        ),
      );
    }
  }

  // --- Klickjacking-Schutz: X-Frame-Options ODER frame-ancestors ---------
  const xfo = headerWert(kontext, "x-frame-options");
  const csp = headerWert(kontext, "content-security-policy");
  const hatFrameAncestors = csp !== null && /frame-ancestors/i.test(csp);

  if (xfo !== null || hatFrameAncestors) {
    befunde.push(
      gut(
        "technik-header-frames",
        "Fremde Seiten können Ihre Website nicht einbetten",
        "Ihre Seite lässt sich nicht unbemerkt in eine fremde Website einbauen. Das schützt Ihre Besucher vor untergeschobenen Klicks — gut so.",
        xfo !== null
          ? `x-frame-options: ${xfo}`
          : `content-security-policy enthält eine frame-ancestors-Direktive: ${csp?.match(/frame-ancestors[^;]*/i)?.[0] ?? ""}`,
      ),
    );
  } else {
    befunde.push(
      verbesserbar(
        "technik-header-frames",
        "Fremde Seiten können Ihre Website einbetten",
        "Ihre Website lässt sich in eine fremde Seite einbauen, ohne dass Besucher es merken. Damit lassen sich Klicks auf Ihre Schaltflächen erschleichen.",
        "Weder `x-frame-options` noch eine `frame-ancestors`-Direktive in der Content-Security-Policy vorhanden. Empfehlung: `Content-Security-Policy: frame-ancestors 'self'`.",
        "klein",
      ),
    );
  }

  // --- Preisgegebene Versionsinformationen -------------------------------
  const server = headerWert(kontext, "server");
  const poweredBy = headerWert(kontext, "x-powered-by");
  const verraeterisch: string[] = [];
  if (server !== null && /\d+\.\d+/.test(server)) verraeterisch.push(`server: ${server}`);
  if (poweredBy !== null) verraeterisch.push(`x-powered-by: ${poweredBy}`);

  if (verraeterisch.length > 0) {
    befunde.push(
      verbesserbar(
        "technik-versionsangaben",
        "Ihr Server verrät, welche Software er nutzt",
        "Ihre Seite gibt die genaue Version ihrer Software preis. Angreifer suchen gezielt nach Seiten mit veralteten Versionen — das macht Sie unnötig auffindbar.",
        `Preisgegeben wird: ${verraeterisch.join(" | ")}. Diese Header lassen sich in der Serverkonfiguration abschalten oder kürzen.`,
        "klein",
      ),
    );
  } else {
    befunde.push(
      gut(
        "technik-versionsangaben",
        "Ihr Server hält sich mit Auskünften zurück",
        "Ihre Seite verrät nicht, mit welcher Softwareversion sie läuft. Das ist unauffällig und richtig so.",
        `Kein \`x-powered-by\`, und \`server\` enthält keine Versionsnummer${server !== null ? ` (Wert: ${server})` : ""}.`,
      ),
    );
  }

  // --- CMS-Erkennung über <meta name="generator"> ------------------------
  const generator = $('meta[name="generator"]').attr("content")?.trim() ?? "";
  const generatorVersion = /(\d+\.\d+(?:\.\d+)?)/.exec(generator)?.[1] ?? null;

  if (generator !== "" && generatorVersion !== null) {
    befunde.push(
      verbesserbar(
        "technik-cms-version",
        "Ihre Website nennt ihre eigene Versionsnummer",
        "Im Quelltext Ihrer Seite steht offen, welches System in welcher Version sie betreibt. Wird für diese Version eine Lücke bekannt, sind Sie leicht als Ziel zu finden.",
        `\`<meta name="generator" content="${generator}">\` — erkannte Version: ${generatorVersion}. Die Angabe lässt sich in den meisten Systemen abschalten (bei WordPress z. B. über das Entfernen der \`wp_generator\`-Aktion).`,
        "klein",
      ),
    );
  } else if (generator !== "") {
    befunde.push(
      gut(
        "technik-cms-version",
        "Ihr System nennt sich, aber ohne Versionsnummer",
        "Im Quelltext steht zwar, womit Ihre Seite gebaut ist, aber nicht in welcher Version. Damit ist das Wichtigste bereits zurückgehalten.",
        `\`<meta name="generator" content="${generator}">\` ohne erkennbare Versionsnummer.`,
      ),
    );
  } else {
    befunde.push(
      gut(
        "technik-cms-version",
        "Ihre Website verrät ihr System nicht",
        "Im Quelltext steht nicht, mit welchem System Ihre Seite gebaut ist. Das ist die zurückhaltendste Variante.",
        "Kein `<meta name=\"generator\">` im HTML gefunden.",
      ),
    );
  }

  // --- Veraltete JavaScript-Bibliotheken ---------------------------------
  const bibliotheken = findeVeralteteBibliotheken(kontext.html);
  const veraltete = bibliotheken.filter((b) => b.veraltet);

  if (veraltete.length > 0) {
    befunde.push(
      kritisch(
        "technik-bibliotheken",
        "Veraltete Zusatzprogramme auf Ihrer Seite",
        `Ihre Seite lädt ${veraltete.length === 1 ? "ein Zusatzprogramm" : `${veraltete.length} Zusatzprogramme`} in einer Fassung mit bekannten Sicherheitslücken. Solche Lücken werden automatisiert ausgenutzt.`,
        veraltete
          .map((b) => `${b.name} ${b.version} (gefunden als "${b.quelle}") — ${b.hinweis}`)
          .join("\n"),
        "mittel",
      ),
    );
  } else if (bibliotheken.length > 0) {
    befunde.push(
      gut(
        "technik-bibliotheken",
        "Ihre Zusatzprogramme sind aktuell genug",
        "Die erkennbaren Zusatzprogramme auf Ihrer Seite sind in einer Fassung ohne bekannte Sicherheitslücken eingebunden. Bitte beim nächsten Update dabei bleiben.",
        bibliotheken.map((b) => `${b.name} ${b.version} — keine bekannte kritische Lücke in dieser Version`).join("\n"),
      ),
    );
  } else {
    befunde.push(
      ungeprueft(
        "technik-bibliotheken",
        "Alter der eingebundenen Zusatzprogramme",
        "Im Quelltext ließen sich keine Versionsnummern von Zusatzprogrammen ablesen. Das ist weder gut noch schlecht — es lässt sich nur nicht automatisch beurteilen.",
        "Keine Treffer für die geprüften Muster (jQuery, Bootstrap, AngularJS) mit erkennbarer Version im HTML. Gebündelte oder umbenannte Dateien lassen sich ohne Ausführung nicht zuordnen. Nicht bewertet.",
      ),
    );
  }

  // --- security.txt ------------------------------------------------------
  const securityAntwort = kontext.securityTxt.antwort;
  if (securityAntwort === null) {
    befunde.push(
      ungeprueft(
        "technik-security-txt",
        "Kontaktweg für Sicherheitshinweise",
        "Ob es einen hinterlegten Meldeweg für Sicherheitshinweise gibt, ließ sich nicht prüfen.",
        `${kontext.securityTxt.url} war nicht abrufbar (Zeitlimit oder Anfragebudget). Nicht bewertet.`,
      ),
    );
  } else if (securityAntwort.status >= 200 && securityAntwort.status < 300) {
    befunde.push(
      gut(
        "technik-security-txt",
        "Sie haben einen Meldeweg für Sicherheitshinweise",
        "Wer eine Schwachstelle auf Ihrer Seite entdeckt, findet hinterlegt, an wen er sich wenden kann. Das ist vorbildlich und ungewöhnlich für einen kleineren Betrieb.",
        `${kontext.securityTxt.url} antwortet mit Status ${securityAntwort.status}.`,
      ),
    );
  } else {
    befunde.push(
      verbesserbar(
        "technik-security-txt",
        "Kein hinterlegter Meldeweg für Sicherheitshinweise",
        "Wer auf Ihrer Seite ein Sicherheitsproblem entdeckt, weiß nicht, wohin damit. Im Zweifel erfahren Sie es gar nicht oder zu spät.",
        `${kontext.securityTxt.url} antwortet mit Status ${securityAntwort.status}. Eine security.txt nach RFC 9116 mit einer Kontaktadresse genügt und ist in wenigen Minuten angelegt.`,
        "klein",
      ),
    );
  }

  return { befunde };
}

export const technikModul: PruefModul = {
  id: "technik",
  pruefe: pruefeTechnik,
};
