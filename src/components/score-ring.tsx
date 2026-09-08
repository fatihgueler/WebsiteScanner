type ScoreRingProps = {
  /** 0–100. */
  score: number;
  groesse?: number;
};

/** Farbschwelle. Bewusst dieselbe Logik wie bei den Statusfarben. */
function ringFarbe(score: number): string {
  if (score >= 80) return "var(--gut)";
  if (score >= 50) return "var(--verbesserbar)";
  return "var(--kritisch)";
}

export function einordnungText(score: number): string {
  if (score >= 80) return "Sehr guter Stand";
  if (score >= 60) return "Solide Grundlage";
  if (score >= 40) return "Deutlich Luft nach oben";
  return "Erheblicher Nachholbedarf";
}

/**
 * Gesamtscore als Ring. Reines SVG ohne Bibliothek — der Ring wird auch
 * gedruckt, und gedruckte Canvas-Grafiken sind eine Wissenschaft für sich.
 */
export function ScoreRing({ score, groesse = 148 }: ScoreRingProps) {
  const radius = groesse / 2 - 10;
  const umfang = 2 * Math.PI * radius;
  const gefuellt = (Math.max(0, Math.min(100, score)) / 100) * umfang;

  return (
    <div
      className="relative shrink-0"
      style={{ width: groesse, height: groesse }}
      role="img"
      aria-label={`Gesamtbewertung ${score} von 100 Punkten. ${einordnungText(score)}.`}
    >
      <svg
        width={groesse}
        height={groesse}
        viewBox={`0 0 ${groesse} ${groesse}`}
        aria-hidden="true"
      >
        <circle
          cx={groesse / 2}
          cy={groesse / 2}
          r={radius}
          fill="none"
          stroke="var(--border)"
          strokeWidth={8}
        />
        <circle
          cx={groesse / 2}
          cy={groesse / 2}
          r={radius}
          fill="none"
          stroke={ringFarbe(score)}
          strokeWidth={8}
          strokeLinecap="round"
          strokeDasharray={`${gefuellt} ${umfang}`}
          transform={`rotate(-90 ${groesse / 2} ${groesse / 2})`}
        />
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className="tabular font-heading text-4xl leading-none"
          style={{ color: ringFarbe(score) }}
        >
          {score}
        </span>
        <span className="mt-1 text-xs text-muted-foreground">von 100</span>
      </div>
    </div>
  );
}

/** Kleiner Balken für die Teilscores je Kategorie. */
export function ScoreBalken({ score }: { score: number | null }) {
  if (score === null) {
    return (
      <span className="text-sm text-muted-foreground">nicht bewertbar</span>
    );
  }

  return (
    <span className="flex items-center gap-2">
      <span
        className="h-1.5 w-20 overflow-hidden rounded-full bg-border"
        aria-hidden="true"
      >
        <span
          className="block h-full rounded-full"
          style={{ width: `${score}%`, background: ringFarbe(score) }}
        />
      </span>
      <span className="tabular text-sm font-medium text-foreground">
        {score}
        <span className="font-normal text-muted-foreground">/100</span>
      </span>
    </span>
  );
}
