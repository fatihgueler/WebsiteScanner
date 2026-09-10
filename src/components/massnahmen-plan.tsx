import { AlertTriangle, Wrench } from "lucide-react";
import { GEWERK_ANZEIGE } from "@/components/gewerk-abzeichen";
import { type Aufwand, GEWERK_DEFINITION, type Massnahme } from "@/lib/types";

/**
 * Der Maßnahmenplan am Ende des Reports: dieselben Befunde, aber nach Gewerk
 * sortiert statt nach Kategorie. Damit lässt sich ablesen, was am Server zu
 * tun ist, was im Code, und was der Betrieb selbst beisteuern muss — die
 * Grundlage für ein Angebot.
 */

const AUFWAND_TEXT: Record<Aufwand, string> = {
  klein: "klein",
  mittel: "mittel",
  groß: "groß",
};

export function MassnahmenPlan({ massnahmen }: { massnahmen: Massnahme[] }) {
  if (massnahmen.length === 0) return null;

  const kritische = massnahmen.filter((m) => m.status === "kritisch").length;

  // Nach Gewerk gruppieren, in der Reihenfolge der Definition.
  const gruppen = GEWERK_DEFINITION.map((definition) => ({
    definition,
    eintraege: massnahmen.filter((m) => m.gewerk === definition.id),
  })).filter((gruppe) => gruppe.eintraege.length > 0);

  return (
    <section className="print-break-before mt-14" aria-labelledby="plan-titel">
      <header>
        <h2
          id="plan-titel"
          className="font-heading text-2xl font-medium leading-tight"
        >
          Was konkret zu tun ist
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {massnahmen.length}{" "}
          {massnahmen.length === 1 ? "Maßnahme" : "Maßnahmen"}, gebündelt nach
          Zuständigkeit
          {kritische > 0 && ` — davon ${kritische} dringend`}. Innerhalb jeder
          Gruppe steht oben, was am schnellsten erledigt ist.
        </p>
      </header>

      <div className="mt-6 space-y-8">
        {gruppen.map(({ definition, eintraege }) => {
          const Icon = GEWERK_ANZEIGE[definition.id].icon;

          return (
            <div key={definition.id} className="print-block">
              <div className="flex items-start gap-3 border-b border-border pb-3">
                <Icon
                  className="mt-0.5 size-5 shrink-0 text-primary"
                  aria-hidden="true"
                />
                <div className="min-w-0 flex-1">
                  <h3 className="font-heading text-lg font-medium leading-snug">
                    {definition.titel}
                    <span className="ml-2 font-sans text-sm font-normal text-muted-foreground">
                      {eintraege.length}{" "}
                      {eintraege.length === 1 ? "Punkt" : "Punkte"}
                    </span>
                  </h3>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {definition.beschreibung}
                  </p>
                </div>
              </div>

              <ol className="mt-3 space-y-3">
                {eintraege.map((eintrag) => (
                  <li
                    key={eintrag.befundId}
                    className="print-block rounded-lg border border-border bg-card p-4"
                  >
                    <div className="flex items-start gap-2.5">
                      {eintrag.status === "kritisch" ? (
                        <AlertTriangle
                          className="mt-0.5 size-4 shrink-0 text-kritisch"
                          aria-hidden="true"
                        />
                      ) : (
                        <Wrench
                          className="mt-0.5 size-4 shrink-0 text-verbesserbar"
                          aria-hidden="true"
                        />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="font-medium leading-snug text-foreground">
                          {eintrag.titel}
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          <span
                            className={
                              eintrag.status === "kritisch"
                                ? "font-medium text-kritisch"
                                : "font-medium text-verbesserbar"
                            }
                          >
                            {eintrag.status === "kritisch" ? "Dringend" : "Lohnt sich"}
                          </span>
                          <span className="px-1.5 text-border" aria-hidden="true">
                            ·
                          </span>
                          Aufwand {AUFWAND_TEXT[eintrag.aufwand]}
                          <span className="px-1.5 text-border" aria-hidden="true">
                            ·
                          </span>
                          {eintrag.kategorie}
                        </p>
                        <p className="mt-2 text-[0.95rem] leading-relaxed text-foreground">
                          {eintrag.massnahme}
                        </p>
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          );
        })}
      </div>
    </section>
  );
}
