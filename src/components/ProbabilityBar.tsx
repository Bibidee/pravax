export function ProbabilityBar({
  outcomes,
}: {
  outcomes: { label: string; percent: number; tone?: "yes" | "no" | "neutral" }[];
}) {
  return (
    <div className="space-y-2" role="group" aria-label="Outcome probabilities">
      {outcomes.map((o) => (
        <div key={o.label} className="flex items-center gap-3 text-sm">
          <span className="w-16 shrink-0 font-medium">{o.label}</span>
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-accent-soft">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                o.tone === "no"
                  ? "bg-gradient-to-r from-no to-hue-pink"
                  : "bg-gradient-to-r from-accent to-hue-blue"
              }`}
              style={{ width: `${Math.max(0, Math.min(100, o.percent))}%` }}
            />
          </div>
          <span className="tabular w-12 shrink-0 text-right font-semibold">{o.percent.toFixed(0)}%</span>
        </div>
      ))}
    </div>
  );
}
