"use client";

import { useId, useState } from "react";
import { ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { normalisiereUrl, pruefeUrlEingabe } from "@/lib/url-schema";

type UrlFormProps = {
  onSubmit: (url: string) => void;
  laeuft: boolean;
  /** Vorbelegung, wenn der Nutzer nach einem Fehler erneut startet. */
  startwert?: string;
  autoFocus?: boolean;
  /** Beschriftung des Felds. Im Pitch-Modus ist es die Adresse des Kunden. */
  beschriftung?: string;
  /** Beschriftung der Schaltfläche. */
  schaltflaeche?: string;
};

export function UrlForm({
  onSubmit,
  laeuft,
  startwert = "",
  autoFocus = false,
  beschriftung = "Adresse Ihrer Website",
  schaltflaeche = "Kostenlos prüfen",
}: UrlFormProps) {
  const feldId = useId();
  const fehlerId = `${feldId}-fehler`;
  const [wert, setWert] = useState(startwert);
  const [fehler, setFehler] = useState<string | null>(null);
  // Erst nach dem ersten Absenden live mitvalidieren — sonst meckert das
  // Formular schon beim zweiten getippten Buchstaben.
  const [beruehrt, setBeruehrt] = useState(false);

  function absenden(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBeruehrt(true);
    const meldung = pruefeUrlEingabe(wert);
    setFehler(meldung);
    if (meldung !== null) return;
    onSubmit(normalisiereUrl(wert.trim()));
  }

  return (
    <form onSubmit={absenden} noValidate className="w-full">
      <Label
        htmlFor={feldId}
        className="mb-2 block text-sm font-medium text-foreground"
      >
        {beschriftung}
      </Label>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Input
          id={feldId}
          name="url"
          type="url"
          inputMode="url"
          autoComplete="url"
          autoCapitalize="none"
          spellCheck={false}
          autoFocus={autoFocus}
          placeholder="meinbetrieb.de"
          value={wert}
          disabled={laeuft}
          aria-invalid={fehler !== null}
          aria-describedby={fehler !== null ? fehlerId : undefined}
          onChange={(event) => {
            setWert(event.target.value);
            if (beruehrt) setFehler(pruefeUrlEingabe(event.target.value));
          }}
          onBlur={() => {
            if (wert.trim() !== "") {
              setBeruehrt(true);
              setFehler(pruefeUrlEingabe(wert));
            }
          }}
          className="h-12 flex-1 bg-card text-base sm:text-base"
        />

        <Button
          type="submit"
          disabled={laeuft}
          className="h-12 shrink-0 px-6 text-base sm:w-auto"
        >
          {laeuft ? (
            <>
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              Wird geprüft
            </>
          ) : (
            <>
              {schaltflaeche}
              <ArrowRight className="size-4" aria-hidden="true" />
            </>
          )}
        </Button>
      </div>

      {/* Fehler direkt am Feld, per aria-live auch für Screenreader. */}
      <p
        id={fehlerId}
        role="alert"
        aria-live="polite"
        className="mt-2 min-h-5 text-sm text-kritisch"
      >
        {fehler}
      </p>
    </form>
  );
}
