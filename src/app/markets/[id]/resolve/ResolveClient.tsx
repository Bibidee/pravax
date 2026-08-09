"use client";

import { useState } from "react";
import type { MarketView } from "@/lib/data/market";
import { TransactionStatus, type TxState } from "@/components/TransactionStatus";
import { EmptyState } from "@/components/EmptyState";
import { VerdictPanel } from "@/components/VerdictPanel";
import { useWallet } from "@/lib/wallet/useWallet";
import { pravax } from "@/lib/genlayer/contracts/pravax";
import { formatUtc, countdownLabel } from "@/lib/format";
import { isPast } from "date-fns";

export function ResolveClient({ view }: { view: MarketView }) {
  const { address, connect } = useWallet();
  const [state, setState] = useState<TxState>("idle");
  const [error, setError] = useState<string | null>(null);

  if (view.resolution) {
    return <VerdictPanel resolution={view.resolution} provisional={view.market.state === "CHALLENGE_WINDOW"} />;
  }

  const eligible = isPast(new Date(view.market.resolve_after));

  if (!eligible) {
    return (
      <EmptyState
        title="Awaiting resolution window"
        description={`This market becomes eligible for resolution after ${formatUtc(view.market.resolve_after)} (in ${countdownLabel(view.market.resolve_after)}).`}
      />
    );
  }

  if (view.isDemo) {
    return (
      <EmptyState
        title="Demo template — resolution disabled"
        description="This is an illustrative template, not a deployed market. Deploy PravaxResolver and create a real market to trigger a live GenLayer resolution."
      />
    );
  }

  async function handleResolve() {
    setError(null);
    if (!address) {
      await connect();
      return;
    }
    setState("signing");
    try {
      await pravax.resolveMarket(
        address,
        (window as unknown as { ethereum: unknown }).ethereum,
        view.id,
        JSON.stringify({})
      );
      setState("finalized");
    } catch (err) {
      setState("failed");
      setError(err instanceof Error ? err.message : "Resolution failed");
    }
  }

  return (
    <div className="max-w-xl space-y-4 rounded-lg border border-border bg-canvas-raised p-6">
      <p className="font-display text-xl">Run resolution</p>
      <p className="text-sm text-ink-muted">
        Resolution is permissionless once the window opens. This invokes GenLayer&apos;s non-deterministic
        block, which retrieves the market&apos;s configured public sources and asks validators to interpret
        them against the locked constitution.
      </p>
      <button
        type="button"
        onClick={handleResolve}
        className="rounded bg-ink px-4 py-2 text-sm font-semibold text-canvas"
      >
        {address ? "Resolve market" : "Connect wallet to resolve"}
      </button>
      <TransactionStatus state={state} detail={error ?? undefined} />
    </div>
  );
}
