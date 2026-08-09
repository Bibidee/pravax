import type { MarketState } from "@/lib/schemas/market";

const LABELS: Record<MarketState, string> = {
  DRAFT: "Draft",
  OPEN: "Open",
  LOCKED: "Locked",
  AWAITING_RESOLUTION: "Awaiting resolution",
  PROVISIONAL: "Provisional",
  CHALLENGE_WINDOW: "Challenge window",
  CHALLENGED: "Challenged",
  FINAL: "Final",
  UNRESOLVED: "Unresolved",
  INVALID: "Invalid",
  CANCELLED_BEFORE_LOCK: "Cancelled",
};

const TONE: Record<MarketState, string> = {
  DRAFT: "text-ink-faint border-border bg-canvas-raised",
  OPEN: "text-accent border-accent/40 bg-accent-soft",
  LOCKED: "text-hue-blue border-hue-blue/40 bg-hue-blue/10",
  AWAITING_RESOLUTION: "text-hue-blue border-hue-blue/40 bg-hue-blue/10",
  PROVISIONAL: "text-hue-orange border-hue-orange/40 bg-hue-orange/10",
  CHALLENGE_WINDOW: "text-hue-orange border-hue-orange/40 bg-hue-orange/10",
  CHALLENGED: "text-hue-pink border-hue-pink/40 bg-hue-pink/10",
  FINAL: "text-yes border-yes/40 bg-accent-soft",
  UNRESOLVED: "text-unresolved border-unresolved/40 bg-unresolved/10",
  INVALID: "text-hue-violet border-hue-violet/40 bg-hue-violet/10",
  CANCELLED_BEFORE_LOCK: "text-ink-faint border-border bg-canvas-raised",
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
