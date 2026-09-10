import { NextResponse } from "next/server";
import { z } from "zod";
import { istAngemeldet } from "@/lib/pitch-auth";
import { listeEintraege, loesche, sichere, speicherAktiv } from "@/lib/pitch-speicher";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const sicherSchema = z.object({
  kunde: z.string().trim().min(1, "Bitte einen Namen für den Betrieb angeben.").max(120),
  notiz: z.string().trim().max(2000).default(""),
  // Der Report wird unverändert durchgereicht. Er stammt aus unserer eigenen
  // /api/check-Antwort, deshalb prüfen wir hier nur grob auf Struktur.
  report: z
    .object({
      gepruefteUrl: z.string().min(1),
      gesamtscore: z.number(),
      kategorien: z.array(z.unknown()),
      massnahmen: z.array(z.unknown()),
    })
    .passthrough(),
});

async function verweigert() {
  return NextResponse.json({ ok: false, meldung: "Nicht angemeldet." }, { status: 401 });
}

export async function GET() {
  if (!(await istAngemeldet())) return verweigert();

  if (!speicherAktiv) {
    return NextResponse.json(
      {
        ok: false,
        meldung:
          "Es ist keine Ablage eingerichtet. Für gesicherte Prüfungen werden die Upstash-Zugangsdaten benötigt.",
      },
      { status: 503 },
    );
  }

  return NextResponse.json({ ok: true, eintraege: await listeEintraege() });
}

export async function POST(anfrage: Request) {
  if (!(await istAngemeldet())) return verweigert();

  if (!speicherAktiv) {
    return NextResponse.json(
      {
        ok: false,
        meldung:
          "Es ist keine Ablage eingerichtet. Für gesicherte Prüfungen werden die Upstash-Zugangsdaten benötigt.",
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

  const geparst = sicherSchema.safeParse(rohdaten);
  if (!geparst.success) {
    return NextResponse.json(
      { ok: false, meldung: geparst.error.issues[0]?.message ?? "Eingabe unvollständig." },
      { status: 400 },
    );
  }

  const { kunde, notiz, report } = geparst.data;
  const id = await sichere(kunde, notiz, report as never);

  if (id === null) {
    return NextResponse.json(
      { ok: false, meldung: "Sichern hat nicht geklappt. Bitte noch einmal versuchen." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, id });
}

export async function DELETE(anfrage: Request) {
  if (!(await istAngemeldet())) return verweigert();

  const id = new URL(anfrage.url).searchParams.get("id");
  if (id === null || id === "") {
    return NextResponse.json({ ok: false, meldung: "Keine Kennung angegeben." }, { status: 400 });
  }

  const erfolg = await loesche(id);
  return NextResponse.json(
    { ok: erfolg, meldung: erfolg ? undefined : "Löschen hat nicht geklappt." },
    { status: erfolg ? 200 : 500 },
  );
}
