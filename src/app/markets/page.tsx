import { listMarketViews } from "@/lib/data/market";
import { MarketCard } from "@/components/MarketCard";
import { EmptyState } from "@/components/EmptyState";
import Link from "next/link";

export default async function MarketsPage() {
  const markets = await listMarketViews();

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-display text-2xl">Markets</h1>
        <Link href="/markets/new" className="rounded border border-border px-3 py-1.5 text-sm font-semibold">
          Create a market
        </Link>
      </div>
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
