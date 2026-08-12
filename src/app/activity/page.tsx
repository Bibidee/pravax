"use client";

import { TimelineEvent } from "@/components/TimelineEvent";
import { EmptyState } from "@/components/EmptyState";
import { formatUtc } from "@/lib/format";
import Link from "next/link";
import { useWallet } from "@/lib/wallet/useWallet";
import { useMyMarkets } from "@/lib/hooks/useMyMarkets";

export default function ActivityPage() {
  const { address } = useWallet();
  const { markets: myMarkets, loading } = useMyMarkets(address);

  const markets = myMarkets;

  const events = markets
    .flatMap((m) => [
      { marketId: m.id, question: m.market.question, label: "Market created", ts: m.market.created_at },
      ...(m.market.locked_at ? [{ marketId: m.id, question: m.market.question, label: "Rules locked", ts: m.market.locked_at }] : []),
      ...(m.resolution ? [{ marketId: m.id, question: m.market.question, label: `Resolved: ${m.resolution.verdict}`, ts: m.resolution.resolved_at }] : []),
    ])
    .sort((a, b) => (a.ts < b.ts ? 1 : -1));

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="font-display mb-6 text-2xl">Activity</h1>
      {!address && (
        <p className="mb-6 rounded border border-border bg-canvas-raised px-3 py-2 text-xs text-ink-muted">
          Connect a wallet to see activity for markets associated with your address.
        </p>
      )}
      {loading && <p className="mb-4 text-xs text-ink-faint">Loading your activity…</p>}
      {events.length === 0 ? (
        <EmptyState title="No activity yet" description="Protocol activity will appear here once markets are created on-chain." />
      ) : (
        <div>
          {events.map((e, i) => (
            <Link key={i} href={`/markets/${e.marketId}`} className="block hover:opacity-80">
              <TimelineEvent label={`${e.label} — ${e.question}`} timestamp={formatUtc(e.ts)} isLast={i === events.length - 1} />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
