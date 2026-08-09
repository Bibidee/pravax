import type { Resolution } from "@/lib/schemas/resolution";
import { EvidenceCard } from "./EvidenceCard";
import { formatUtc } from "@/lib/format";

const VERDICT_COPY: Record<Resolution["verdict"], { label: string; tone: string; note: string }> = {
  YES: {
    label: "YES",
    tone: "text-white border-transparent bg-gradient-to-br from-yes to-hue-blue",
    note: "",
  },
  NO: {
    label: "NO",
    tone: "text-white border-transparent bg-gradient-to-br from-no to-hue-pink",
    note: "",
  },
  INVALID: {
    label: "INVALID",
    tone: "text-white border-transparent bg-gradient-to-br from-hue-violet to-invalid",
    note: "The market met an invalidation condition defined in its constitution.",
  },
  UNRESOLVED: {
    label: "UNRESOLVED",
    tone: "text-white border-transparent bg-gradient-to-br from-unresolved to-hue-orange",
    note: "Evidence was insufficient or materially conflicting under this market's ambiguity policy. This is a genuine outcome, not an error.",
  },
};

export function VerdictPanel({
  resolution,
  provisional,
  challengeClosesLabel,
}: {
  resolution: Resolution;
  provisional?: boolean;
  challengeClosesLabel?: string;
}) {
  const copy = VERDICT_COPY[resolution.verdict];

  return (
    <div className="space-y-6">
      <div className={`rounded-lg border p-6 ${copy.tone}`}>
        <p className="text-[11px] font-semibold uppercase tracking-widest">
          {provisional ? "Provisional resolution" : "Final resolution"}
        </p>
        <p className="font-display mt-1 text-4xl">{copy.label}</p>
        <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-xs text-white/80">
          <span>Confidence {resolution.confidence}</span>
          <span>Resolved {formatUtc(resolution.resolved_at)}</span>
          {provisional && challengeClosesLabel && <span>Challenge closes in {challengeClosesLabel}</span>}
        </div>
        {copy.note && <p className="mt-3 text-sm">{copy.note}</p>}
      </div>

      <section>
        <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-ink-faint">
          What the rule required
        </h3>
        <p className="text-sm leading-relaxed">{resolution.rule_interpretation}</p>
      </section>

      <section>
        <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-ink-faint">
          How the rule was applied
        </h3>
        <p className="text-sm leading-relaxed">{resolution.reasoning_summary}</p>
      </section>

      {resolution.conflicts.length > 0 && (
        <section>
          <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-ink-faint">
            Conflicts / limitations
          </h3>
          <ul className="list-disc space-y-1 pl-4 text-sm">
            {resolution.conflicts.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-ink-faint">Source record</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          {resolution.evidence.map((e, i) => (
            <EvidenceCard key={`${e.url}-${i}`} item={e} />
          ))}
        </div>
        {resolution.evidence.length === 0 && (
          <p className="text-sm text-ink-muted">No evidence citations were recorded with this verdict.</p>
        )}
      </section>
    </div>
  );
}
