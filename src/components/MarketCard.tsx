import Link from "next/link";
import type { MarketCategory, MarketRecord } from "@/lib/schemas/market";
import { MarketStatus } from "./MarketStatus";
import { ProbabilityBar } from "./ProbabilityBar";
import { closesInLabel } from "@/lib/format";

const CATEGORY_TONE: Record<MarketCategory, string> = {
  SOFTWARE: "text-hue-blue bg-hue-blue/10",
  SPORTS: "text-hue-orange bg-hue-orange/10",
  ANNOUNCEMENT: "text-hue-violet bg-hue-violet/10",
  OTHER: "text-hue-pink bg-hue-pink/10",
};

export function MarketCard({
  id,
  market,
  isDemo,
  yesPercent,
}: {
  id: string;
  market: MarketRecord;
  isDemo?: boolean;
  yesPercent?: number;
}) {
  const binary = market.outcomes.length === 2;
  const yp = yesPercent ?? 50;

  return (
    <Link
      href={`/markets/${id}`}
      className="block rounded-lg border border-border bg-canvas-raised p-4 transition-colors hover:border-border-strong"
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="flex items-center gap-2">
          <span
            className={`rounded px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider ${CATEGORY_TONE[market.category]}`}
          >
            {market.category}
          </span>
          {isDemo && <span className="rounded bg-accent-soft px-1.5 py-0.5 text-[11px] text-accent">Template</span>}
        </span>
        <MarketStatus state={market.state} />
      </div>
      <p className="font-display text-lg leading-snug">{market.question}</p>
      <div className="mt-4">
        {binary ? (
          <ProbabilityBar
            outcomes={[
              { label: market.outcomes[0], percent: yp, tone: "yes" },
              { label: market.outcomes[1], percent: 100 - yp, tone: "no" },
            ]}
          />
        ) : (
          <p className="text-sm text-ink-muted">{market.outcomes.length} outcomes</p>
        )}
      </div>
      <div className="mt-4 flex items-center justify-between text-xs text-ink-muted">
        <span>{closesInLabel(market.close_at)}</span>
        <span className="truncate">{new URL(market.primary_sources[0]).hostname}</span>
      </div>
    </Link>
  );
}
