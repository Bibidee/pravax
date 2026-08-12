import type { MarketState } from "@/lib/schemas/market";

const LABELS: Record<MarketState, string> = {
  OPEN: "Open",
  LOCKED: "Locked",
  CHALLENGE_WINDOW: "Challenge window",
  CHALLENGED: "Challenged",
  FINAL: "Final",
};

const TONE: Record<MarketState, string> = {
  OPEN: "text-accent border-accent/40 bg-accent-soft",
  LOCKED: "text-hue-blue border-hue-blue/40 bg-hue-blue/10",
  CHALLENGE_WINDOW: "text-hue-orange border-hue-orange/40 bg-hue-orange/10",
  CHALLENGED: "text-hue-pink border-hue-pink/40 bg-hue-pink/10",
  FINAL: "text-yes border-yes/40 bg-accent-soft",
};

export function MarketStatus({ state }: { state: MarketState }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wide ${TONE[state]}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {LABELS[state]}
    </span>
  );
}
