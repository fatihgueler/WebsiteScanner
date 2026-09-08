import { NextResponse } from "next/server";
import { Resend } from "resend";
import { z } from "zod";
import { site } from "@/lib/site";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const leadSchema = z.object({
  email: z.string().trim().email({ message: "Bitte prüfen Sie die E-Mail-Adresse." }),
  url: z.string().trim().min(1).max(2048),
  gesamtscore: z.number().int().min(0).max(100),
});

type Antwort = { ok: boolean; meldung?: string };

function fehlendeKonfiguration(): string | null {
  const werte = {
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    RESEND_ABSENDER: process.env.RESEND_ABSENDER,
    LEAD_EMPFAENGER: process.env.LEAD_EMPFAENGER,
  };

  const fehlend = Object.entries(werte)
    .filter(([, wert]) => typeof wert !== "string" || wert === "" || wert.includes("{{"))
    .map(([name]) => name);

  return fehlend.length > 0 ? fehlend.join(", ") : null;
}

export async function POST(anfrage: Request): Promise<NextResponse<Antwort>> {
  let rohdaten: unknown;
  try {
    rohdaten = await anfrage.json();
  } catch {
    return NextResponse.json(
      { ok: false, meldung: "Die Anfrage war unvollständig." },
      { status: 400 },
    );
  }

  const geparst = leadSchema.safeParse(rohdaten);
  if (!geparst.success) {
    return NextResponse.json(
      {
        ok: false,
        meldung: geparst.error.issues[0]?.message ?? "Bitte prüfen Sie Ihre Eingabe.",
      },
      { status: 400 },
    );
  }

  const { email, url, gesamtscore } = geparst.data;

  const fehlend = fehlendeKonfiguration();
  if (fehlend !== null) {
    // Ehrlich bleiben: Wir tun nicht so, als wäre die Mail unterwegs.
    console.error(`Lead-Versand nicht konfiguriert. Fehlende Werte: ${fehlend}`);
    return NextResponse.json(
      {
        ok: false,
        meldung: `Der Versand ist gerade nicht eingerichtet. Bitte melden Sie sich direkt unter ${site.betreiber.email} — wir schicken den Report von Hand.`,
      },
      { status: 503 },
    );
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const zeitpunkt = new Date().toLocaleString("de-DE", { timeZone: "Europe/Berlin" });

  try {
    // Benachrichtigung an den Betreiber. Der Report selbst wird nicht
    // gespeichert (keine Datenbank), deshalb enthält die Mail die geprüfte
    // Adresse — der Betreiber ruft den Check bei Bedarf erneut auf.
    const { error } = await resend.emails.send({
      from: process.env.RESEND_ABSENDER as string,
      to: process.env.LEAD_EMPFAENGER as string,
      replyTo: email,
      subject: `Website-Check: Report angefordert für ${url}`,
      text: [
        "Über den Website-Check wurde ein Report als PDF angefordert.",
        "",
        `Geprüfte Adresse: ${url}`,
        `Gesamtscore:      ${gesamtscore} von 100`,
        `E-Mail-Adresse:   ${email}`,
        `Zeitpunkt:        ${zeitpunkt}`,
        "",
        "Der Report selbst wird nicht gespeichert. Für den Versand die Adresse",
        `unter ${site.url} erneut prüfen und die Druckansicht als PDF sichern.`,
      ].join("\n"),
    });

    if (error !== null) {
      console.error("Resend meldete einen Fehler:", error);
      return NextResponse.json(
        {
          ok: false,
          meldung: `Der Versand hat gerade nicht geklappt. Bitte melden Sie sich direkt unter ${site.betreiber.email}.`,
        },
        { status: 502 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (unbekannt) {
    console.error("Unerwarteter Fehler beim Lead-Versand:", unbekannt);
    return NextResponse.json(
      {
        ok: false,
        meldung: `Der Versand hat gerade nicht geklappt. Bitte melden Sie sich direkt unter ${site.betreiber.email}.`,
      },
      { status: 500 },
    );
  }
}
