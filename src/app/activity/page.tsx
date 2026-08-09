import { listMarketViews } from "@/lib/data/market";
import { TimelineEvent } from "@/components/TimelineEvent";
import { EmptyState } from "@/components/EmptyState";
import { formatUtc } from "@/lib/format";
import Link from "next/link";

export default async function ActivityPage() {
  const markets = await listMarketViews();
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
