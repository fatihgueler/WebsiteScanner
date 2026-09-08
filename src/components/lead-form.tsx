"use client";

import { useId, useState } from "react";
import { CheckCircle2, Loader2, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type LeadFormProps = {
  gepruefteUrl: string;
  gesamtscore: number;
};

type Zustand = "bereit" | "sendet" | "gesendet" | "fehler";

export function LeadForm({ gepruefteUrl, gesamtscore }: LeadFormProps) {
  const feldId = useId();
  const fehlerId = `${feldId}-fehler`;
  const [email, setEmail] = useState("");
  const [zustand, setZustand] = useState<Zustand>("bereit");
  const [meldung, setMeldung] = useState<string | null>(null);

  async function absenden(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) {
      setMeldung("Bitte prüfen Sie die E-Mail-Adresse — da fehlt noch etwas.");
      setZustand("fehler");
      return;
    }

    setZustand("sendet");
    setMeldung(null);

    try {
      const antwort = await fetch("/api/lead", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: email.trim(), url: gepruefteUrl, gesamtscore }),
      });

      const daten = (await antwort.json()) as { ok?: boolean; meldung?: string };

      if (!antwort.ok || daten.ok !== true) {
        setMeldung(
          daten.meldung ??
            "Das hat gerade nicht geklappt. Bitte versuchen Sie es noch einmal.",
        );
        setZustand("fehler");
        return;
      }

      setZustand("gesendet");
    } catch {
      setMeldung(
        "Die Verbindung ist abgebrochen. Bitte versuchen Sie es noch einmal.",
      );
      setZustand("fehler");
    }
  }

  if (zustand === "gesendet") {
    return (
      <div className="flex items-start gap-3 rounded-lg border border-gut/25 bg-gut-soft p-4">
        <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-gut" aria-hidden="true" />
        <div>
          <p className="font-medium text-foreground">Ist notiert.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Sie bekommen den Report in Kürze als PDF an {email}. Falls nichts
            ankommt, schauen Sie bitte kurz im Spam-Ordner nach.
          </p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={absenden} noValidate>
      <Label htmlFor={feldId} className="mb-2 block text-sm font-medium">
        Ihre E-Mail-Adresse
      </Label>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Input
          id={feldId}
          type="email"
          name="email"
          inputMode="email"
          autoComplete="email"
          placeholder="name@ihrbetrieb.de"
          value={email}
          disabled={zustand === "sendet"}
          aria-invalid={zustand === "fehler"}
          aria-describedby={meldung !== null ? fehlerId : undefined}
          onChange={(event) => {
            setEmail(event.target.value);
            if (zustand === "fehler") {
              setZustand("bereit");
              setMeldung(null);
            }
          }}
          className="h-12 flex-1 bg-card text-base sm:text-base"
        />
        <Button
          type="submit"
          disabled={zustand === "sendet"}
          className="h-12 shrink-0 px-5 text-base"
        >
          {zustand === "sendet" ? (
            <>
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              Wird gesendet
            </>
          ) : (
            <>
              <Mail className="size-4" aria-hidden="true" />
              Report zuschicken
            </>
          )}
        </Button>
      </div>

      <p
        id={fehlerId}
        role="alert"
        aria-live="polite"
        className="mt-2 min-h-5 text-sm text-kritisch"
      >
        {meldung}
      </p>

      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
        Wir verwenden Ihre Adresse ausschließlich, um Ihnen diesen Report zu
        schicken und einmal nachzufragen, ob Sie Unterstützung möchten. Kein
        Newsletter, keine Weitergabe. Näheres in der{" "}
        <a
          href="/datenschutz"
          className="underline underline-offset-2 hover:text-foreground"
        >
          Datenschutzerklärung
        </a>
        .
      </p>
    </form>
  );
}
