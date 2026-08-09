import { notFound } from "next/navigation";
import { getMarketView } from "@/lib/data/market";
import { MarketStatus } from "@/components/MarketStatus";
import { closesInLabel } from "@/lib/format";
import { MarketTabs } from "./MarketTabs";

export default async function MarketDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const view = await getMarketView(id);
  if (!view) notFound();

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      {view.isDemo && (
        <p className="mb-4 inline-block rounded bg-accent-soft px-2 py-1 text-xs font-semibold text-accent">
          Template — illustrative, not on-chain
        </p>
      )}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <h1 className="font-display max-w-2xl text-3xl leading-tight">{view.market.question}</h1>
        <div className="flex flex-col items-end gap-2">
          <MarketStatus state={view.market.state} />
          <span className="text-xs text-ink-muted">{closesInLabel(view.market.close_at)}</span>
        </div>
      </div>
      <MarketTabs view={view} />
    </div>
  );
}
