"use client";

import { useState } from "react";
import type { MarketRecord } from "@/lib/schemas/market";
import { TransactionStatus, type TxState } from "./TransactionStatus";

export function PositionSheet({
  market,
  onSubmit,
  walletConnected,
  contractConfigured,
}: {
  market: MarketRecord;
  onSubmit: (outcome: string, amount: number) => Promise<void>;
  walletConnected: boolean;
  contractConfigured: boolean;
}) {
  const [outcome, setOutcome] = useState<"YES" | "NO">("YES");
  const [amount, setAmount] = useState(10);
  const [txState, setTxState] = useState<TxState>("idle");

  if (market.state !== "OPEN") {
    return <p className="text-sm text-ink-muted">Positions can only be taken while the market is open.</p>;
  }

  const disabled = !walletConnected || !contractConfigured;

  async function handleSubmit() {
    setTxState("signing");
    try {
      await onSubmit(outcome, amount);
      setTxState("finalized");
    } catch {
      setTxState("failed");
    }
  }

  return (
    <div className="space-y-3 rounded-lg border border-border bg-canvas-raised p-4">
      <p className="text-[11px] font-semibold uppercase tracking-widest text-ink-faint">Take a position (test credits)</p>
      <div className="flex gap-2">
        {market.outcomes.map((o) => (
          <button
            key={o}
            type="button"
            onClick={() => setOutcome(o)}
            className={`flex-1 rounded border px-3 py-2 text-sm font-medium ${
              outcome === o ? "border-accent bg-accent-soft text-accent" : "border-border text-ink-muted"
            }`}
          >
            {o}
          </button>
        ))}
      </div>
      <label className="block text-xs text-ink-muted">
        Test credits
        <input
          type="number"
          min={1}
          value={amount}
          onChange={(e) => setAmount(Number(e.target.value))}
          className="mt-1 w-full rounded border border-border bg-canvas px-3 py-2 text-sm"
        />
      </label>
      <button
        type="button"
        disabled={disabled}
        onClick={handleSubmit}
        className="w-full rounded bg-ink px-3 py-2 text-sm font-semibold text-canvas disabled:opacity-40"
      >
        {contractConfigured ? "Take position" : "Contract not deployed"}
      </button>
      <TransactionStatus state={!walletConnected ? "wallet-required" : txState} />
      <p className="text-[11px] text-ink-faint">Test credits only. This is not real-money wagering.</p>
    </div>
  );
}
