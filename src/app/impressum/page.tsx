import type { Metadata } from "next";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Impressum",
  description: `Anbieterkennzeichnung für ${site.name}.`,
  robots: { index: false, follow: true },
};

export default function ImpressumSeite() {
  const { betreiber } = site;

  return (
    <article className="mx-auto w-full max-w-2xl px-5 pb-24 pt-14 sm:px-8">
      <h1 className="font-heading text-3xl font-medium">Impressum</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Angaben gemäß § 5 Digitale-Dienste-Gesetz (DDG)
      </p>

      <section className="mt-10">
        <h2 className="font-heading text-xl font-medium">Diensteanbieter</h2>
        <address className="mt-3 not-italic leading-relaxed">
          {betreiber.name}
          <br />
          {betreiber.strasse}
          <br />
          {betreiber.plzOrt}
          <br />
          {betreiber.land}
        </address>
      </section>

      <section className="mt-8">
        <h2 className="font-heading text-xl font-medium">Kontakt</h2>
        <dl className="mt-3 space-y-1 leading-relaxed">
          <div className="flex gap-2">
            <dt className="text-muted-foreground">Telefon:</dt>
            <dd>{betreiber.telefon}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="text-muted-foreground">E-Mail:</dt>
            <dd>
              <a
                href={`mailto:${betreiber.email}`}
                className="underline underline-offset-2"
              >
                {betreiber.email}
              </a>
            </dd>
          </div>
        </dl>
      </section>

      <section className="mt-8">
        <h2 className="font-heading text-xl font-medium">Umsatzsteuer-Identifikationsnummer</h2>
        <p className="mt-3 leading-relaxed">
          Gemäß § 27 a Umsatzsteuergesetz: {betreiber.umsatzsteuerId}
        </p>
      </section>

      <section className="mt-8">
        <h2 className="font-heading text-xl font-medium">
          Verantwortlich für den Inhalt
        </h2>
        <p className="mt-3 leading-relaxed">
          {betreiber.name}, Anschrift wie oben.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="font-heading text-xl font-medium">
          Verbraucherstreitbeilegung
        </h2>
        <p className="mt-3 leading-relaxed text-muted-foreground">
          Wir sind nicht bereit und nicht verpflichtet, an Streitbeilegungs-
          verfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="font-heading text-xl font-medium">Haftung für Inhalte</h2>
        <p className="mt-3 leading-relaxed text-muted-foreground">
          Dieses Werkzeug erstellt eine automatisierte technische Einschätzung
          öffentlich abrufbarer Websites. Die Ergebnisse werden nach bestem
          Wissen ermittelt, sind aber weder vollständig noch verbindlich und
          stellen insbesondere keine Rechtsberatung dar. Für Entscheidungen, die
          auf Grundlage eines Reports getroffen werden, wird keine Haftung
          übernommen.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="font-heading text-xl font-medium">Haftung für Links</h2>
        <p className="mt-3 leading-relaxed text-muted-foreground">
          Ein Report kann Verweise auf die geprüfte Website und auf externe
          Angebote enthalten. Auf deren Inhalte haben wir keinen Einfluss und
          übernehmen dafür keine Gewähr. Für die Inhalte der verlinkten Seiten
          ist stets deren jeweiliger Anbieter verantwortlich.
        </p>
      </section>
    </article>
  );
}
