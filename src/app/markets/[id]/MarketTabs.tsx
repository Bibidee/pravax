"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { MarketView } from "@/lib/data/market";
import { ConstitutionPanel } from "@/components/ConstitutionPanel";
import { EvidenceCard } from "@/components/EvidenceCard";
import { VerdictPanel } from "@/components/VerdictPanel";
import { ChallengeCard } from "@/components/ChallengeCard";
import { TimelineEvent } from "@/components/TimelineEvent";
import { EmptyState } from "@/components/EmptyState";
import { PositionSheet } from "@/components/PositionSheet";
import { TransactionStatus, type TxState } from "@/components/TransactionStatus";
import { formatUtc } from "@/lib/format";
import { useWallet } from "@/lib/wallet/useWallet";
import { pravax, TransactionPendingError } from "@/lib/genlayer/contracts/pravax";
import Link from "next/link";
import { formatGen } from "@/lib/gen";

const TABS = ["MARKET", "RULES", "EVIDENCE", "RESOLUTION", "CHALLENGES", "ACTIVITY"] as const;
type Tab = (typeof TABS)[number];

export function MarketTabs({ view }: { view: MarketView }) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("MARKET");
  const { address } = useWallet();
  const { market, resolution, challenges, isDemo, id } = view;
  const positions = view.positions ?? [];
  const zero = BigInt(0);
  const yes = positions.filter((p) => p.outcome === "YES").reduce((sum, p) => sum + BigInt(p.amount), zero);
  const no = positions.filter((p) => p.outcome === "NO").reduce((sum, p) => sum + BigInt(p.amount), zero);
  const total = yes + no;
  const [lockState, setLockState] = useState<TxState>("idle");
  const [lockError, setLockError] = useState<string | null>(null);
  const [claimable, setClaimable] = useState<bigint>(BigInt(0));
  const [claimState, setClaimState] = useState<TxState>("idle");
  const [claimError, setClaimError] = useState<string | null>(null);

  useEffect(() => {
    if (market.state !== "FINAL" || !address || isDemo) return;
    pravax.getClaimable(id, address).then((value) => setClaimable(BigInt(value))).catch(() => setClaimable(BigInt(0)));
  }, [address, id, isDemo, market.state]);

  async function handleClaim() {
    if (!address) return;
    setClaimState("signing"); setClaimError(null);
    try {
      await pravax.claim(address, (window as unknown as { ethereum: unknown }).ethereum, id);
      setClaimable(BigInt(0)); setClaimState("finalized"); router.refresh();
    } catch (err) {
      setClaimState(err instanceof TransactionPendingError ? "pending" : "failed");
      setClaimError(err instanceof Error ? err.message : "Claim failed");
    }
  }

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
            {total > zero ? <div className="space-y-1 text-sm text-ink-muted"><p>YES escrow share — {(yes * BigInt(100) / total).toString()}%</p><p>NO escrow share — {(no * BigInt(100) / total).toString()}%</p><p>Total escrow: {formatGen(total)} GEN</p></div> : <p className="text-sm text-ink-muted">No positions yet.</p>}
            <div className="text-sm text-ink-muted">
              <p>Creator: {market.creator}</p>
              <p>Created {formatUtc(market.created_at)}</p>
            </div>
            {market.state === "OPEN" && !isDemo && (
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
            {market.state === "FINAL" && !isDemo && (
              <div className="space-y-2 rounded-lg border border-border bg-canvas-raised p-4">
                <p className="text-sm text-ink-muted">Your settlement: <span className="font-semibold text-ink">{formatGen(claimable)} GEN</span></p>
                <button type="button" onClick={handleClaim} disabled={!address || claimable === BigInt(0) || claimState === "signing"} className="rounded bg-ink px-3 py-1.5 text-sm font-semibold text-canvas disabled:opacity-40">
                  {!address ? "Connect wallet to claim" : claimable > BigInt(0) ? `Claim ${formatGen(claimable)} GEN` : "No claim available"}
                </button>
                <TransactionStatus state={claimState} detail={claimError ?? undefined} />
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
                JSON.stringify({ outcome }),
                amount
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
          <VerdictPanel resolution={resolution} provisional={market.state === "CHALLENGE_WINDOW" || market.state === "CHALLENGED"} />
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
          {market.state === "FINAL" && market.finalized_at && (
            <TimelineEvent label="Finalized" timestamp={formatUtc(market.finalized_at)} isLast />
          )}
        </div>
      )}
    </div>
  );
}
