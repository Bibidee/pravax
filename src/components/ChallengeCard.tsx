import type { Challenge } from "@/lib/schemas/challenge";
import { formatUtc, truncateAddress } from "@/lib/format";

export function ChallengeCard({ challenge }: { challenge: Challenge }) {
  return (
    <div className="rounded-lg border border-hue-pink/40 bg-hue-pink/5 p-4">
      <div className="mb-2 flex items-center justify-between text-xs text-ink-muted">
        <span>Filed by {truncateAddress(challenge.challenger)}</span>
        <span>{formatUtc(challenge.submitted_at)}</span>
      </div>
      <p className="text-sm">
        Disputes <strong>{challenge.challenged_verdict}</strong> → claims <strong>{challenge.claimed_verdict}</strong>
      </p>
      <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-ink-faint">Disputed rule</p>
      <p className="text-sm">{challenge.disputed_rule}</p>
      <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-ink-faint">Explanation</p>
      <p className="text-sm">{challenge.explanation}</p>
      <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-ink-faint">Counter-evidence</p>
      <ul className="space-y-0.5">
        {challenge.evidence_urls.map((u) => (
          <li key={u}>
            <a href={u} target="_blank" rel="noreferrer" className="text-xs text-accent underline underline-offset-2">
              {u}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
