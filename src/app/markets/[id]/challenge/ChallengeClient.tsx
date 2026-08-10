"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { MarketView } from "@/lib/data/market";
import { ChallengeFormSchema } from "@/lib/schemas/challenge";
import { VerdictPanel } from "@/components/VerdictPanel";
import { EmptyState } from "@/components/EmptyState";
import { TransactionStatus, type TxState } from "@/components/TransactionStatus";
import { useWallet } from "@/lib/wallet/useWallet";
import { pravax, TransactionPendingError } from "@/lib/genlayer/contracts/pravax";

export function ChallengeClient({ view }: { view: MarketView }) {
  const router = useRouter();
  const { address, connect } = useWallet();
  const [claimedVerdict, setClaimedVerdict] = useState<"YES" | "NO" | "INVALID" | "UNRESOLVED">("YES");
  const [disputedRule, setDisputedRule] = useState("");
  const [explanation, setExplanation] = useState("");
  const [evidenceUrls, setEvidenceUrls] = useState("");
  const [state, setState] = useState<TxState>("idle");
  const [error, setError] = useState<string | null>(null);

  if (!view.resolution) {
    return <EmptyState title="No verdict to challenge yet" description="A market can only be challenged after it has a provisional resolution." />;
  }

  if (view.market.state !== "CHALLENGE_WINDOW") {
    return (
      <EmptyState
        title="Challenge window is not open"
        description="Challenges may only be filed while the market is in its provisional challenge window."
      />
    );
  }

  if (view.isDemo) {
    return (
      <EmptyState
        title="Demo template — challenges disabled"
        description="This is an illustrative template. Deploy PravaxResolver and resolve a real market to open a live challenge window."
      />
    );
  }

  async function handleSubmit() {
    setError(null);
    if (!address) {
      await connect();
      return;
    }
    const parsed = ChallengeFormSchema.safeParse({
      challenged_verdict: view.resolution!.verdict,
      claimed_verdict: claimedVerdict,
      disputed_rule: disputedRule,
      explanation,
      evidence_urls: evidenceUrls.split("\n").map((u) => u.trim()).filter(Boolean),
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Invalid challenge");
      return;
    }
    setState("signing");
    try {
      await pravax.submitChallenge(
        address,
        (window as unknown as { ethereum: unknown }).ethereum,
        view.id,
        `ch-${Date.now()}`,
        JSON.stringify(parsed.data)
      );
      setState("finalized");
      router.refresh();
    } catch (err) {
      if (err instanceof TransactionPendingError) {
        setState("pending");
        setError("Still processing on-chain — refresh the page shortly to check.");
        router.refresh();
        return;
      }
      setState("failed");
      setError(err instanceof Error ? err.message : "Challenge submission failed");
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <div>
        <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-ink-faint">Original verdict</h2>
        <VerdictPanel resolution={view.resolution} provisional />
      </div>
      <div className="space-y-4 rounded-lg border border-border bg-canvas-raised p-6">
        <h2 className="font-display text-xl">File an evidence objection</h2>
        <label className="block text-xs text-ink-muted">
          Proposed outcome
          <select
            value={claimedVerdict}
            onChange={(e) => setClaimedVerdict(e.target.value as typeof claimedVerdict)}
            className="mt-1 w-full rounded border border-border bg-canvas px-3 py-2 text-sm"
          >
            {["YES", "NO", "INVALID", "UNRESOLVED"].map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-xs text-ink-muted">
          Exact disputed rule
          <textarea
            value={disputedRule}
            onChange={(e) => setDisputedRule(e.target.value)}
            className="mt-1 w-full rounded border border-border bg-canvas px-3 py-2 text-sm"
            rows={2}
          />
        </label>
        <label className="block text-xs text-ink-muted">
          Counter-evidence URLs (one per line)
          <textarea
            value={evidenceUrls}
            onChange={(e) => setEvidenceUrls(e.target.value)}
            className="mt-1 w-full rounded border border-border bg-canvas px-3 py-2 text-sm"
            rows={3}
          />
        </label>
        <label className="block text-xs text-ink-muted">
          Explanation
          <textarea
            value={explanation}
            onChange={(e) => setExplanation(e.target.value)}
            className="mt-1 w-full rounded border border-border bg-canvas px-3 py-2 text-sm"
            rows={3}
          />
        </label>
        <button type="button" onClick={handleSubmit} className="rounded bg-ink px-4 py-2 text-sm font-semibold text-canvas">
          {address ? "Submit challenge" : "Connect wallet to challenge"}
        </button>
        <TransactionStatus state={state} detail={error ?? undefined} />
      </div>
    </div>
  );
}
