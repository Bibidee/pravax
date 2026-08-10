"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { MarketView } from "@/lib/data/market";
import { ConstitutionPanel } from "@/components/ConstitutionPanel";
import { EvidenceCard } from "@/components/EvidenceCard";
import { VerdictPanel } from "@/components/VerdictPanel";
import { ChallengeCard } from "@/components/ChallengeCard";
import { TimelineEvent } from "@/components/TimelineEvent";
import { EmptyState } from "@/components/EmptyState";
import { PositionSheet } from "@/components/PositionSheet";
import { ProbabilityBar } from "@/components/ProbabilityBar";
import { TransactionStatus, type TxState } from "@/components/TransactionStatus";
import { formatUtc } from "@/lib/format";
import { useWallet } from "@/lib/wallet/useWallet";
import { pravax, TransactionPendingError } from "@/lib/genlayer/contracts/pravax";
import Link from "next/link";

const TABS = ["MARKET", "RULES", "EVIDENCE", "RESOLUTION", "CHALLENGES", "ACTIVITY"] as const;
type Tab = (typeof TABS)[number];

export function MarketTabs({ view }: { view: MarketView }) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("MARKET");
  const { address } = useWallet();
  const { market, resolution, challenges, isDemo, id } = view;
  const [lockState, setLockState] = useState<TxState>("idle");
  const [lockError, setLockError] = useState<string | null>(null);

  async function handleLock() {
    if (!address) return;
    setLockState("signing");
    setLockError(null);
    try {
      await pravax.lockMarket(address, (window as unknown as { ethereum: unknown }).ethereum, id);
      setLockState("finalized");
      router.refresh();
    } catch (err) {
      if (err instanceof TransactionPendingError) {
        setLockState("pending");
        setLockError("Still processing on-chain — refresh shortly to check.");
        router.refresh();
        return;
      }
      setLockState("failed");
      setLockError(err instanceof Error ? err.message : "Locking failed");
    }
  }

  return (
    <div>
      <div className="mb-6 flex gap-1 border-b border-border">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`relative px-3 py-2 text-sm font-medium transition-colors ${
              tab === t ? "text-ink" : "text-ink-faint hover:text-ink-muted"
            }`}
          >
            {t}
            {tab === t && <span className="absolute inset-x-0 -bottom-px h-0.5 bg-accent" />}
          </button>
        ))}
      </div>

      {tab === "MARKET" && (
        <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
          <div className="space-y-6">
            {market.outcomes.length === 2 ? (
              <ProbabilityBar
                outcomes={[
                  { label: market.outcomes[0], percent: 64, tone: "yes" },
                  { label: market.outcomes[1], percent: 36, tone: "no" },
                ]}
              />
            ) : (
              <p className="text-sm text-ink-muted">Outcomes: {market.outcomes.join(", ")}</p>
            )}
            <div className="text-sm text-ink-muted">
              <p>Creator: {market.creator}</p>
              <p>Created {formatUtc(market.created_at)}</p>
            </div>
            {market.state === "OPEN" && address?.toLowerCase() === market.creator.toLowerCase() && !isDemo && (
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={handleLock}
                  disabled={lockState === "signing"}
                  className="rounded border border-border px-3 py-1.5 text-sm font-semibold disabled:opacity-50"
                >
                  {lockState === "signing" ? "Locking…" : "Lock rules"}
                </button>
                <TransactionStatus state={lockState === "finalized" ? "idle" : lockState} detail={lockError ?? undefined} />
              </div>
            )}
          </div>
          <PositionSheet
            market={market}
            walletConnected={Boolean(address)}
            contractConfigured={pravax.isConfigured() && !isDemo}
            onSubmit={async (outcome, amount) => {
              if (!address) throw new Error("wallet required");
              await pravax.recordPosition(
                address,
                (window as unknown as { ethereum: unknown }).ethereum,
                `${id}-${Date.now()}`,
                id,
                JSON.stringify({ outcome, amount })
              );
              router.refresh();
            }}
          />
        </div>
      )}

      {tab === "RULES" && <ConstitutionPanel market={market} />}

      {tab === "EVIDENCE" &&
        (resolution && resolution.evidence.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {resolution.evidence.map((e, i) => (
              <EvidenceCard key={`${e.url}-${i}`} item={e} />
            ))}
          </div>
        ) : (
          <EmptyState
            title="No evidence has been collected yet."
            description={`Resolution begins after ${formatUtc(market.resolve_after)}.`}
          />
        ))}

      {tab === "RESOLUTION" &&
        (resolution ? (
          <VerdictPanel resolution={resolution} provisional={market.state === "CHALLENGE_WINDOW"} />
        ) : (
          <EmptyState
            title="Not resolved yet"
            description={`Resolution begins after ${formatUtc(market.resolve_after)}.`}
            action={
              <Link href={`/markets/${id}/resolve`} className="text-sm font-semibold text-accent underline underline-offset-2">
                Go to resolve
              </Link>
            }
          />
        ))}

      {tab === "CHALLENGES" &&
        (challenges.length > 0 ? (
          <div className="space-y-3">
            {challenges.map((c) => (
              <ChallengeCard key={c.challenge_id} challenge={c} />
            ))}
          </div>
        ) : (
          <EmptyState
            title="No challenges filed"
            description="If a verdict looks wrong, file a structured challenge with counter-evidence during the challenge window."
            action={
              market.state === "CHALLENGE_WINDOW" ? (
                <Link href={`/markets/${id}/challenge`} className="text-sm font-semibold text-accent underline underline-offset-2">
                  File a challenge
                </Link>
              ) : undefined
            }
          />
        ))}

      {tab === "ACTIVITY" && (
        <div>
          <TimelineEvent label="Market created" timestamp={formatUtc(market.created_at)} />
          {market.locked_at && <TimelineEvent label="Rules locked" timestamp={formatUtc(market.locked_at)} />}
          {resolution && <TimelineEvent label={`Resolved: ${resolution.verdict}`} timestamp={formatUtc(resolution.resolved_at)} />}
          {challenges.map((c) => (
            <TimelineEvent key={c.challenge_id} label="Challenge filed" timestamp={formatUtc(c.submitted_at)} />
          ))}
          {market.state === "FINAL" && market.challenge_deadline && (
            <TimelineEvent label="Finalized" timestamp={formatUtc(market.challenge_deadline)} isLast />
          )}
        </div>
      )}
    </div>
  );
}
