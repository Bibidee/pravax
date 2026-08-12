"use client";

import Link from "next/link";
import { MarketCard } from "@/components/MarketCard";
import { useWallet } from "@/lib/wallet/useWallet";
import { useAllMarkets } from "@/lib/hooks/useMyMarkets";

export default function Home() {
  useWallet();
  const { markets: myMarkets } = useAllMarkets();

  const markets = myMarkets;
  const open = markets.filter((m) => m.market.state === "OPEN");
  const resolved = markets.filter((m) => ["FINAL", "UNRESOLVED", "INVALID"].includes(m.market.state));

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <section className="relative max-w-2xl overflow-hidden rounded-2xl p-8">
        <div
          aria-hidden
          className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_15%_20%,var(--accent)_0%,transparent_38%),radial-gradient(circle_at_85%_15%,var(--hue-violet)_0%,transparent_40%),radial-gradient(circle_at_75%_85%,var(--hue-orange)_0%,transparent_38%),radial-gradient(circle_at_15%_85%,var(--hue-pink)_0%,transparent_38%)] opacity-20 blur-2xl"
        />
        <span className="mb-3 inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent-soft px-3 py-1 text-xs font-semibold uppercase tracking-wide text-accent">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
          </span>
          Live on GenLayer studionet
        </span>
        <h1 className="font-display text-4xl leading-tight sm:text-5xl">
          Markets that can{" "}
          <span className="bg-gradient-to-r from-accent via-hue-violet to-hue-pink bg-clip-text text-transparent">
            explain how they resolve.
          </span>
        </h1>
        <p className="mt-4 text-lg text-ink-muted">
          Create future-event markets with locked rules, explicit sources, and GenLayer-powered evidence
          resolution.
        </p>
        <div className="mt-6 flex gap-3">
          <Link
            href="/markets"
            className="rounded bg-gradient-to-r from-accent via-hue-violet to-hue-pink px-4 py-2 text-sm font-semibold text-white transition-transform hover:-translate-y-0.5 hover:shadow-lg"
          >
            Explore markets
          </Link>
          <Link
            href="/markets/new"
            className="rounded border border-hue-orange/50 px-4 py-2 text-sm font-semibold text-hue-orange transition-transform hover:-translate-y-0.5 hover:bg-hue-orange/10"
          >
            Create a market
          </Link>
        </div>
      </section>

      <section className="mt-14">
        <h2 className="mb-4 inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest text-hue-blue">
          <span className="h-1.5 w-4 rounded-full bg-gradient-to-r from-hue-blue to-accent" />
          Open markets
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {open.map((m) => (
            <MarketCard key={m.id} id={m.id} market={m.market} />
          ))}
        </div>
      </section>

      <section className="mt-14">
        <h2 className="mb-4 inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest text-hue-violet">
          <span className="h-1.5 w-4 rounded-full bg-gradient-to-r from-hue-violet to-hue-pink" />
          Recently resolved
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {resolved.map((m) => (
            <MarketCard key={m.id} id={m.id} market={m.market} />
          ))}
        </div>
      </section>

      <section className="mt-14 overflow-hidden rounded-lg border border-border bg-canvas-raised p-6">
        <h2 className="font-display text-xl">How resolution works</h2>
        <ol className="mt-4 grid gap-4 text-sm text-ink-muted sm:grid-cols-4">
          <li className="rounded-lg border-t-2 border-accent pt-2">
            <strong className="block text-accent">1. Rules lock</strong>The resolution constitution becomes immutable at close.
          </li>
          <li className="rounded-lg border-t-2 border-hue-blue pt-2">
            <strong className="block text-hue-blue">2. Evidence is retrieved</strong>Configured public sources are fetched after the event deadline.
          </li>
          <li className="rounded-lg border-t-2 border-hue-violet pt-2">
            <strong className="block text-hue-violet">3. Validators interpret</strong>GenLayer validators judge the evidence against the locked rule.
          </li>
          <li className="rounded-lg border-t-2 border-hue-pink pt-2">
            <strong className="block text-hue-pink">4. Consensus resolves</strong>The Equivalence Principle produces one inspectable verdict.
          </li>
        </ol>
      </section>
    </div>
  );
}
