import type { Metadata } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans, Newsreader } from "next/font/google";
import Link from "next/link";
import { site } from "@/lib/site";
import "./globals.css";

/*
  next/font lädt die Schriften zur Buildzeit herunter und liefert sie vom
  eigenen Server aus. Das ist hier kein Detail, sondern Pflicht: dieses Tool
  bemängelt selbst Google Fonts vom Google-CDN als Abmahnrisiko.
*/
const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

const plexSans = IBM_Plex_Sans({
  variable: "--font-plex-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: `${site.name} — kostenlos prüfen lassen`,
    template: `%s — ${site.name}`,
  },
  description: site.beschreibung,
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="de">
      <body
        className={`${newsreader.variable} ${plexSans.variable} ${plexMono.variable} min-h-dvh flex flex-col`}
      >
        <a
          href="#inhalt"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
        >
          Zum Inhalt springen
        </a>

        <header className="print-hidden border-b border-border/70">
          <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-5 py-4 sm:px-8">
            <Link
              href="/"
              className="font-heading text-lg font-medium tracking-tight text-foreground"
            >
              Güler<span className="text-primary">.dev</span>
              <span className="ml-2 font-sans text-sm font-normal text-muted-foreground">
                Website-Check
              </span>
            </Link>
            <a
              href={site.hauptseite}
              className="hidden text-sm text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline sm:inline"
            >
              Zur Hauptseite
            </a>
          </div>
        </header>

        <main id="inhalt" className="flex-1">
          {children}
        </main>

        <footer className="site-footer print-hidden mt-20 border-t border-border/70">
          <div className="mx-auto flex w-full max-w-5xl flex-col gap-3 px-5 py-6 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-8">
            <p>
              Ein kostenloses Werkzeug von {site.marke}. Keine Anmeldung, keine
              Speicherung der Prüfergebnisse.
            </p>
            <nav className="flex gap-5" aria-label="Rechtliches">
              <Link
                href="/impressum"
                className="underline-offset-4 transition-colors hover:text-foreground hover:underline"
              >
                Impressum
              </Link>
              <Link
                href="/datenschutz"
                className="underline-offset-4 transition-colors hover:text-foreground hover:underline"
              >
                Datenschutz
              </Link>
            </nav>
          </div>
        </footer>
      </body>
    </html>
  );
}
