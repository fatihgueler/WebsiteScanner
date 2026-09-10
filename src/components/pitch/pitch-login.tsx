"use client";

import { useId, useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function PitchLogin() {
  const router = useRouter();
  const feldId = useId();
  const fehlerId = `${feldId}-fehler`;
  const [passwort, setPasswort] = useState("");
  const [laeuft, setLaeuft] = useState(false);
  const [fehler, setFehler] = useState<string | null>(null);

  async function absenden(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (passwort === "") {
      setFehler("Bitte das Passwort eingeben.");
      return;
    }

    setLaeuft(true);
    setFehler(null);

    try {
      const antwort = await fetch("/api/pitch/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ passwort }),
      });
      const daten = (await antwort.json()) as { ok?: boolean; meldung?: string };

      if (daten.ok !== true) {
        setFehler(daten.meldung ?? "Passwort stimmt nicht.");
        setLaeuft(false);
        return;
      }

      router.refresh();
    } catch {
      setFehler("Die Verbindung ist abgebrochen. Bitte noch einmal versuchen.");
      setLaeuft(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-md px-5 pb-24 pt-20 sm:px-8">
      <div className="rounded-xl border border-border bg-card p-6 sm:p-8">
        <KeyRound className="size-6 text-primary" aria-hidden="true" />
        <h1 className="mt-4 font-heading text-2xl font-medium">Pitch-Modus</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Interner Bereich: Prüfungen für Kunden durchführen, sichern und im
          Gespräch aufrufen.
        </p>

        <form onSubmit={absenden} noValidate className="mt-6">
          <Label htmlFor={feldId} className="mb-2 block text-sm font-medium">
            Passwort
          </Label>
          <Input
            id={feldId}
            type="password"
            autoComplete="current-password"
            autoFocus
            value={passwort}
            disabled={laeuft}
            aria-invalid={fehler !== null}
            aria-describedby={fehler !== null ? fehlerId : undefined}
            onChange={(event) => {
              setPasswort(event.target.value);
              if (fehler !== null) setFehler(null);
            }}
            className="h-12 bg-background text-base sm:text-base"
          />

          <p
            id={fehlerId}
            role="alert"
            aria-live="polite"
            className="mt-2 min-h-5 text-sm text-kritisch"
          >
            {fehler}
          </p>

          <Button type="submit" disabled={laeuft} className="mt-2 h-12 w-full text-base">
            {laeuft ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                Wird geprüft
              </>
            ) : (
              "Anmelden"
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
