"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { site } from "@/lib/site";

/**
 * Fußzeile. Der Satz über Anmeldung und Speicherung gilt für den öffentlichen
 * Check — im Pitch-Modus ist er schlicht falsch, denn dort gibt es eine
 * Anmeldung und gesicherte Ergebnisse. Eine Zusicherung, die auf der einen
 * Seite stimmt und auf der anderen nicht, darf nicht pauschal dastehen.
 */
export function SiteFooter() {
  const pfad = usePathname();
  const imPitchModus = pfad?.startsWith("/pitch") ?? false;

  return (
    <footer className="site-footer print-hidden mt-20 border-t border-border/70">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-3 px-5 py-6 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <p>
          {imPitchModus
            ? `Interner Bereich von ${site.marke}. Gesicherte Prüfungen werden nach 180 Tagen automatisch gelöscht.`
            : `Ein kostenloses Werkzeug von ${site.marke}. Keine Anmeldung, keine Speicherung der Prüfergebnisse.`}
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
  );
}
