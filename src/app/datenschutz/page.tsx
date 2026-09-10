import type { Metadata } from "next";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Datenschutzerklärung",
  description: `Wie ${site.name} mit Daten umgeht.`,
  robots: { index: false, follow: true },
};

/**
 * Datenschutzerklärung für das Werkzeug selbst.
 *
 * Sie beschreibt genau das, was der Code tatsächlich tut: keine Datenbank,
 * kein Tracking, selbst gehostete Schriften, Ergebnis-Cache bei Upstash,
 * E-Mail nur auf ausdrückliche Anforderung. Wer ein Prüfwerkzeug für DSGVO
 * betreibt, kann sich hier keine Unschärfe leisten.
 */
export default function DatenschutzSeite() {
  const { betreiber } = site;

  return (
    <article className="mx-auto w-full max-w-2xl px-5 pb-24 pt-14 sm:px-8">
      <h1 className="font-heading text-3xl font-medium">Datenschutzerklärung</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Für {site.name} unter {site.domain}
      </p>

      <section className="mt-10">
        <h2 className="font-heading text-xl font-medium">Kurz gefasst</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 leading-relaxed text-muted-foreground">
          <li>Es gibt keine Anmeldung und kein Nutzerkonto.</li>
          <li>
            Ihr Report wird nicht dauerhaft gespeichert und ist nicht über einen
            Link abrufbar.
          </li>
          <li>
            Es findet keine Analyse des Nutzungsverhaltens statt: kein Google
            Analytics, keine Werbenetzwerke, keine Cookies zu Marketingzwecken.
          </li>
          <li>
            Schriften werden von unserem eigenen Server geladen, nicht von
            Google.
          </li>
          <li>
            Eine E-Mail-Adresse wird nur abgefragt, wenn Sie den Report
            ausdrücklich zugeschickt haben möchten.
          </li>
        </ul>
      </section>

      <section className="mt-10">
        <h2 className="font-heading text-xl font-medium">Verantwortlicher</h2>
        <address className="mt-3 not-italic leading-relaxed">
          {betreiber.name}
          <br />
          {betreiber.strasse}
          <br />
          {betreiber.plzOrt}
          <br />
          <a
            href={`mailto:${betreiber.email}`}
            className="underline underline-offset-2"
          >
            {betreiber.email}
          </a>
        </address>
      </section>

      <section className="mt-10">
        <h2 className="font-heading text-xl font-medium">
          Aufruf dieser Website (Server-Protokolle)
        </h2>
        <p className="mt-3 leading-relaxed text-muted-foreground">
          Beim Aufruf werden technisch notwendige Daten verarbeitet: IP-Adresse,
          Zeitpunkt, aufgerufene Adresse, übertragene Datenmenge, Browsertyp und
          Betriebssystem. Diese Verarbeitung ist erforderlich, um die Seite
          auszuliefern und ihren Betrieb abzusichern.
        </p>
        <p className="mt-3 leading-relaxed text-muted-foreground">
          Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse
          am sicheren und störungsfreien Betrieb).
        </p>
        <p className="mt-3 leading-relaxed text-muted-foreground">
          Gehostet wird die Seite bei der Vercel Inc., 340 S Lemon Ave #4133,
          Walnut, CA 91789, USA, in einem Rechenzentrum innerhalb der EU. Mit
          Vercel besteht ein Auftragsverarbeitungsvertrag. Für Übermittlungen in
          die USA stützt sich Vercel auf die Standardvertragsklauseln der
          EU-Kommission.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="font-heading text-xl font-medium">Durchführung einer Prüfung</h2>
        <p className="mt-3 leading-relaxed text-muted-foreground">
          Wenn Sie eine Adresse eingeben und die Prüfung starten, ruft unser
          Server die öffentlich abrufbaren Seiten dieser Adresse ab und wertet
          sie aus. Das Ergebnis wird an Ihren Browser übertragen und dort
          angezeigt. Es entsteht kein Nutzerprofil und keine Zuordnung zu Ihrer
          Person.
        </p>
        <p className="mt-3 leading-relaxed text-muted-foreground">
          Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO (Durchführung der von
          Ihnen angeforderten Leistung).
        </p>

        <h3 className="mt-6 font-heading text-lg font-medium">
          Zwischenspeicherung des Ergebnisses
        </h3>
        <p className="mt-3 leading-relaxed text-muted-foreground">
          Das Prüfergebnis wird für 24 Stunden zwischengespeichert, damit
          dieselbe Adresse nicht mehrfach abgerufen werden muss. Gespeichert wird
          dabei ausschließlich die geprüfte Internetadresse zusammen mit dem
          Ergebnis — keine Angaben zu Ihrer Person. Zusätzlich wird eine
          gekürzte Form Ihrer IP-Adresse für die Zählung des Prüflimits (acht
          Prüfungen pro Stunde) für maximal eine Stunde vorgehalten.
        </p>
        <p className="mt-3 leading-relaxed text-muted-foreground">
          Dienstleister hierfür ist die Upstash, Inc., 3000 El Camino Real,
          Palo Alto, CA 94306, USA, mit Speicherung in einer EU-Region. Es
          besteht ein Auftragsverarbeitungsvertrag; für Übermittlungen in die
          USA gelten die Standardvertragsklauseln der EU-Kommission.
          Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse
          an einem funktionsfähigen, missbrauchsgeschützten Dienst).
        </p>

        <h3 className="mt-6 font-heading text-lg font-medium">
          Google PageSpeed Insights
        </h3>
        <p className="mt-3 leading-relaxed text-muted-foreground">
          Zur Messung der Ladegeschwindigkeit übermittelt unser Server die von
          Ihnen eingegebene Internetadresse an die PageSpeed-Insights-API der
          Google Ireland Limited, Gordon House, Barrow Street, Dublin 4, Irland.
          Übermittelt wird ausschließlich die zu prüfende Adresse. Ihre
          IP-Adresse wird dabei nicht an Google weitergegeben, da die Anfrage von
          unserem Server ausgeht und nicht aus Ihrem Browser.
        </p>
        <p className="mt-3 leading-relaxed text-muted-foreground">
          Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="font-heading text-xl font-medium">
          Zusendung des Reports per E-Mail
        </h2>
        <p className="mt-3 leading-relaxed text-muted-foreground">
          Der Report ist vollständig ohne Angabe einer E-Mail-Adresse sichtbar.
          Nur wenn Sie ihn zusätzlich zugeschickt haben möchten, geben Sie Ihre
          Adresse an. Wir verwenden sie, um Ihnen den Report zu senden und
          einmalig nachzufragen, ob Sie Unterstützung bei der Umsetzung
          wünschen. Es erfolgt kein Newsletter-Versand und keine Weitergabe an
          Dritte zu Werbezwecken.
        </p>
        <p className="mt-3 leading-relaxed text-muted-foreground">
          Für den Versand nutzen wir die Resend (Plus Five Five, Inc.),
          2261 Market Street #5039, San Francisco, CA 94114, USA. Es besteht ein
          Auftragsverarbeitungsvertrag; für die Übermittlung in die USA gelten
          die Standardvertragsklauseln der EU-Kommission.
        </p>
        <p className="mt-3 leading-relaxed text-muted-foreground">
          Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO für den Versand des
          Reports und Art. 6 Abs. 1 lit. f DSGVO für die einmalige Nachfrage
          (berechtigtes Interesse an der Ansprache von Interessenten). Ihre
          Adresse wird gelöscht, sobald sie für diese Zwecke nicht mehr benötigt
          wird, spätestens nach sechs Monaten — es sei denn, es entsteht daraus
          ein Auftragsverhältnis mit eigenen Aufbewahrungspflichten.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="font-heading text-xl font-medium">Interner Bereich</h2>
        <p className="mt-3 leading-relaxed text-muted-foreground">
          Unter <span className="font-mono text-sm">/pitch</span> gibt es einen
          passwortgeschützten Bereich, in dem ausschließlich der Betreiber
          Prüfungen durchführt und deren Ergebnisse für Beratungsgespräche
          sichert. Gespeichert werden dabei die geprüfte Internetadresse, das
          Prüfergebnis sowie ein selbst vergebener Betriebsname und eine Notiz —
          keine Daten von Besuchern dieser Website. Die Einträge werden nach 180
          Tagen automatisch gelöscht.
        </p>
        <p className="mt-3 leading-relaxed text-muted-foreground">
          Wenn Sie den öffentlichen Check oben benutzen, wird davon nichts
          gesichert. Die Zusicherung, dass Ihr Ergebnis nicht gespeichert wird,
          gilt unverändert.
        </p>
        <p className="mt-3 leading-relaxed text-muted-foreground">
          Für die Anmeldung in diesem Bereich wird ein technisch notwendiges
          Cookie gesetzt, das ausschließlich einen signierten Ablaufzeitpunkt
          enthält und nach 30 Tagen verfällt. Rechtsgrundlage ist Art. 6 Abs. 1
          lit. f DSGVO.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="font-heading text-xl font-medium">
          Cookies und Speicherung im Browser
        </h2>
        <p className="mt-3 leading-relaxed text-muted-foreground">
          Diese Seite setzt keine Cookies. Für die Druckansicht wird Ihr
          Prüfergebnis kurzzeitig im Sitzungsspeicher Ihres Browsers
          (sessionStorage) abgelegt, damit es sich im neuen Tab anzeigen lässt.
          Diese Daten verlassen Ihren Browser nicht und werden beim Schließen des
          Tabs automatisch gelöscht.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="font-heading text-xl font-medium">Schriftarten</h2>
        <p className="mt-3 leading-relaxed text-muted-foreground">
          Die verwendeten Schriften werden bei der Erstellung der Seite
          heruntergeladen und von unserem eigenen Server ausgeliefert. Beim
          Aufruf dieser Seite wird keine Verbindung zu Servern von Google
          hergestellt.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="font-heading text-xl font-medium">Ihre Rechte</h2>
        <p className="mt-3 leading-relaxed text-muted-foreground">
          Sie haben das Recht auf Auskunft (Art. 15 DSGVO), Berichtigung
          (Art. 16), Löschung (Art. 17), Einschränkung der Verarbeitung
          (Art. 18), Datenübertragbarkeit (Art. 20) sowie das Recht, einer
          Verarbeitung auf Grundlage berechtigter Interessen zu widersprechen
          (Art. 21 DSGVO). Wenden Sie sich dazu formlos an{" "}
          <a
            href={`mailto:${betreiber.email}`}
            className="underline underline-offset-2"
          >
            {betreiber.email}
          </a>
          .
        </p>
        <p className="mt-3 leading-relaxed text-muted-foreground">
          Ihnen steht außerdem ein Beschwerderecht bei einer
          Datenschutz-Aufsichtsbehörde zu, insbesondere in dem Mitgliedstaat
          Ihres Aufenthaltsorts oder des mutmaßlichen Verstoßes
          (Art. 77 DSGVO).
        </p>
      </section>

      <section className="mt-10">
        <h2 className="font-heading text-xl font-medium">Stand</h2>
        <p className="mt-3 leading-relaxed text-muted-foreground">
          Diese Erklärung beschreibt den Stand der eingesetzten Technik. Ändert
          sich der Funktionsumfang des Werkzeugs, wird sie angepasst.
        </p>
      </section>
    </article>
  );
}
