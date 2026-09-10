import type { Metadata } from "next";
import { Lock } from "lucide-react";
import { PitchArbeitsplatz } from "@/components/pitch/pitch-arbeitsplatz";
import { PitchLogin } from "@/components/pitch/pitch-login";
import { istAngemeldet, pitchEingerichtet } from "@/lib/pitch-auth";
import { speicherAktiv } from "@/lib/pitch-speicher";

export const metadata: Metadata = {
  title: "Pitch-Modus",
  // Interner Bereich — gehört in keinen Suchindex.
  robots: { index: false, follow: false, nocache: true },
};

export const dynamic = "force-dynamic";

export default async function PitchSeite() {
  // Ohne vollständige Konfiguration bleibt der Bereich zu. Ein halb
  // eingerichteter Passwortschutz ist kein Passwortschutz.
  if (!pitchEingerichtet()) {
    return (
      <div className="mx-auto w-full max-w-md px-5 pb-24 pt-20 sm:px-8">
        <div className="rounded-xl border border-border bg-card p-6 sm:p-8">
          <Lock className="size-6 text-muted-foreground" aria-hidden="true" />
          <h1 className="mt-4 font-heading text-2xl font-medium">
            Pitch-Modus nicht eingerichtet
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Für diesen Bereich müssen zwei Umgebungsvariablen gesetzt sein:
          </p>
          <ul className="mt-3 space-y-1 font-mono text-xs text-foreground">
            <li>PITCH_PASSWORT</li>
            <li>PITCH_SESSION_SECRET</li>
          </ul>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Solange eine davon fehlt, bleibt der Bereich vollständig gesperrt.
            Der öffentliche Website-Check ist davon nicht betroffen.
          </p>
        </div>
      </div>
    );
  }

  if (!(await istAngemeldet())) {
    return <PitchLogin />;
  }

  return <PitchArbeitsplatz speicherAktiv={speicherAktiv} />;
}
