# Güler.dev Website-Check

Kostenloses Website-Analyse-Tool für Akquise. Ein Betriebsinhaber gibt seine
URL ein und bekommt einen vollständigen, verständlichen Report: was gut läuft,
was sich lohnt, was kritisch ist — technisch, rechtlich und sichtbarkeitsseitig.

Der Report ist vollständig ohne Bezahlschranke und ohne E-Mail-Eingabe sichtbar.

## Stack

- Next.js 15 (App Router), TypeScript strict
- Tailwind CSS v4, shadcn/ui, lucide-react
- `cheerio` für HTML-Parsing, `zod` für Validierung
- Google PageSpeed Insights API v5 für Performance-Werte
- Upstash Redis für Rate-Limit und 24-Stunden-Cache
- Resend für den E-Mail-Versand

Bewusst **nicht** enthalten: Headless-Chrome/Puppeteer/Playwright, Datenbank,
Anmeldung, Dark-Mode-Umschalter, Mehrsprachigkeit.

## Setup

Voraussetzung: Node.js 20 oder neuer. Es sind keine globalen Installationen und
keine Administratorrechte nötig.

```bash
npm install
cp .env.example .env.local   # unter Windows: copy .env.example .env.local
```

Danach `.env.local` ausfüllen — welche Schlüssel wo herkommen, steht als
Kommentar in `.env.example`. Die App startet auch mit leeren Werten; einzelne
Funktionen (Rate-Limit, Cache, Performance-Modul, E-Mail-Versand) sind dann
abgeschaltet, der Rest läuft.

```bash
npm run dev     # Entwicklungsserver auf http://localhost:3000
npm run build   # Produktionsbuild
npx tsc --noEmit  # Typprüfung
```

## Platzhalter

Betreiberdaten für Impressum und Datenschutzerklärung stehen zentral in
`src/lib/site.ts` und sind mit `{{PLATZHALTER}}` markiert. Vor dem ersten Deploy
müssen sie durch die echten Angaben ersetzt werden. Die Platzhalter für
Umgebungsvariablen stehen in `.env.example`.

## Deployment

Vercel. Repository verbinden, die Variablen aus `.env.example` in den
Projekteinstellungen hinterlegen, Subdomain zuweisen.

## Pitch-Modus (`/pitch`)

Interner, passwortgeschützter Bereich für den Betreiber: Kundenwebsite prüfen,
Ergebnis unter einem Betriebsnamen mit Notiz sichern und im Verkaufsgespräch
wieder aufrufen. Gesicherte Prüfungen laufen nach 180 Tagen ab.

Aktiviert wird der Bereich über `PITCH_PASSWORT` und `PITCH_SESSION_SECRET`
(siehe `.env.example`). Fehlt eine der beiden Variablen, bleibt `/pitch`
vollständig gesperrt — ein halb eingerichteter Passwortschutz ist keiner. Für
das Sichern werden zusätzlich die Upstash-Zugangsdaten benötigt; ohne sie
funktionieren Prüfung und Druckansicht trotzdem.

Der öffentliche Check bleibt davon unberührt: dort wird weiterhin nichts
gespeichert und nichts abgefragt.

## Maßnahmen

Jeder Befund mit Status `kritisch` oder `verbesserbar` bekommt eine konkrete
Maßnahme und die Angabe, wer sie umsetzt (Server, Code, Gestaltung, Inhalt,
Recht). Am Ende des Reports steht ein nach Gewerk gruppierter Maßnahmenplan.

Die Texte liegen gesammelt in `src/lib/massnahmen.ts` — dort lassen sie sich
für Angebote und Gespräche nachschärfen, ohne die Prüfmodule anzufassen.

## Was das Tool prüft

Sechs Module, jedes mit eigenem Teilscore:

| Modul | Gewicht | Inhalt |
| --- | --- | --- |
| Recht & DSGVO | 25 % | Impressum, Datenschutzerklärung, Google Fonts, US-Dienste, Cookies vor Einwilligung |
| Technik & Sicherheit | 20 % | HTTPS, Zertifikat, Weiterleitungen, Security-Header, veraltete Bibliotheken |
| Performance & Frontend | 20 % | PageSpeed Insights (mobil und Desktop), Bildformate, Ladeverhalten |
| Sichtbarkeit in KI-Suchen (GEO) | 15 % | `llms.txt`, KI-Crawler in `robots.txt`, JSON-LD, maschinenlesbare Kontaktdaten |
| SEO | 15 % | Title, Description, Überschriften, `robots.txt`, Sitemap, Open Graph, `alt`-Texte |
| Inhalt & Vertrauen | 5 % | Telefon als Link, Adresse, Öffnungszeiten, Handlungsaufruf, Aktualität |

## Fairness gegenüber der geprüften Seite

Der Check verhält sich wie ein normaler Besucher:

- Nur passive, öffentlich abrufbare Ressourcen: die Seite selbst, `robots.txt`,
  `sitemap.xml`, `llms.txt`, `security.txt`, Favicon sowie die im HTML
  verlinkten Impressum- und Datenschutzseiten.
- Keine Port-Scans, kein Durchprobieren von Verzeichnissen oder Adminpfaden,
  keine Login-Versuche, keine abgeschickten Formulare.
- Höchstens 12 Anfragen pro Prüfung, 10 Sekunden Zeitlimit, höchstens 3
  Weiterleitungen, Antwortgröße auf 5 MB begrenzt.
- Eigener User-Agent: `GuelerDev-WebsiteCheck/1.0`.
- SSRF-Schutz: nur `http`/`https`, IP-Auflösung vor dem Abruf, private und
  reservierte Adressbereiche werden abgelehnt.
- Rate-Limit: 8 Prüfungen pro IP und Stunde.
