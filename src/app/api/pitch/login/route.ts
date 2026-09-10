import { NextResponse } from "next/server";
import { z } from "zod";
import {
  baueSitzungsWert,
  passwortStimmt,
  pitchEingerichtet,
  PITCH_COOKIE,
} from "@/lib/pitch-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({ passwort: z.string().min(1) });

type Antwort = { ok: boolean; meldung?: string };

export async function POST(anfrage: Request): Promise<NextResponse<Antwort>> {
  if (!pitchEingerichtet()) {
    return NextResponse.json(
      {
        ok: false,
        meldung:
          "Der Pitch-Modus ist auf diesem Server nicht eingerichtet. Es fehlen PITCH_PASSWORT und PITCH_SESSION_SECRET.",
      },
      { status: 503 },
    );
  }

  let rohdaten: unknown;
  try {
    rohdaten = await anfrage.json();
  } catch {
    return NextResponse.json({ ok: false, meldung: "Anfrage unvollständig." }, { status: 400 });
  }

  const geparst = schema.safeParse(rohdaten);
  if (!geparst.success || !passwortStimmt(geparst.data.passwort)) {
    // Bewusst dieselbe Meldung für "leer" und "falsch" — keine Hinweise geben.
    return NextResponse.json(
      { ok: false, meldung: "Passwort stimmt nicht." },
      { status: 401 },
    );
  }

  const sitzung = baueSitzungsWert();
  if (sitzung === null) {
    return NextResponse.json(
      { ok: false, meldung: "Sitzung konnte nicht angelegt werden." },
      { status: 500 },
    );
  }

  const antwort = NextResponse.json<Antwort>({ ok: true });
  antwort.cookies.set(PITCH_COOKIE, sitzung.wert, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: sitzung.maxAge,
  });
  return antwort;
}

/** Abmelden. */
export async function DELETE(): Promise<NextResponse<Antwort>> {
  const antwort = NextResponse.json<Antwort>({ ok: true });
  antwort.cookies.set(PITCH_COOKIE, "", { path: "/", maxAge: 0 });
  return antwort;
}
