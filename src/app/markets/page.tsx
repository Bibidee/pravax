"use client";

import { MarketCard } from "@/components/MarketCard";
import { EmptyState } from "@/components/EmptyState";
import Link from "next/link";
import { DEMO_MARKETS } from "@/lib/demo/seedMarkets";
import { useWallet } from "@/lib/wallet/useWallet";
import { useMyMarkets } from "@/lib/hooks/useMyMarkets";

export default function MarketsPage() {
  const { address } = useWallet();
  const { markets: myMarkets, loading } = useMyMarkets(address);

  const demo = DEMO_MARKETS.map((d) => ({
    id: d.id,
    market: d.market,
    resolution: d.resolution,
    challenges: d.challenges ?? [],
    isDemo: true,
  }));
  const markets = [...myMarkets, ...demo];

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-display text-2xl">Markets</h1>
        <Link href="/markets/new" className="rounded border border-border px-3 py-1.5 text-sm font-semibold">
          Create a market
        </Link>
      </div>

      {!address && (
        <p className="mb-6 rounded border border-border bg-canvas-raised px-3 py-2 text-xs text-ink-muted">
          Connect a wallet to see your own on-chain markets here — the contract has no global market
          index yet, so only demo templates show for anonymous visitors.
        </p>
      )}
      {loading && <p className="mb-4 text-xs text-ink-faint">Loading your markets…</p>}

      {markets.length === 0 ? (
        <EmptyState title="No markets yet" description="No markets have been created on this network yet." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {markets.map((m) => (
            <MarketCard key={m.id} id={m.id} market={m.market} isDemo={m.isDemo} />
          ))}
        </div>
      )}
    </div>
  );
}
