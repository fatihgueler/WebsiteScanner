import { NextResponse } from "next/server";
import { istAngemeldet } from "@/lib/pitch-auth";
import { holeEintrag } from "@/lib/pitch-speicher";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _anfrage: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await istAngemeldet())) {
    return NextResponse.json({ ok: false, meldung: "Nicht angemeldet." }, { status: 401 });
  }

  const { id } = await params;
  const eintrag = await holeEintrag(id);

  if (eintrag === null) {
    return NextResponse.json(
      {
        ok: false,
        meldung: "Diese Prüfung gibt es nicht mehr. Gesicherte Prüfungen laufen nach 180 Tagen ab.",
      },
      { status: 404 },
    );
  }

  return NextResponse.json({ ok: true, eintrag });
}
