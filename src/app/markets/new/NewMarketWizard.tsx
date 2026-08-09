"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ResolutionConstitutionSchema, type ResolutionConstitution } from "@/lib/schemas/market";
import { TransactionStatus, type TxState } from "@/components/TransactionStatus";
import { useWallet } from "@/lib/wallet/useWallet";
import { pravax } from "@/lib/genlayer/contracts/pravax";

const STEPS = ["QUESTION", "OUTCOMES", "TIME", "SOURCES", "RESOLUTION RULES"] as const;

const EMPTY: ResolutionConstitution = {
  question: "",
  category: "OTHER",
  outcomes: ["YES", "NO"],
  close_at: "",
  resolve_after: "",
  event_deadline: "",
  primary_sources: [""],
  secondary_sources: [],
  definition: "",
  invalid_if: [],
  ambiguity_policy: "",
};

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function NewMarketWizard() {
  const router = useRouter();
  const { address, connect } = useWallet();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<ResolutionConstitution>(EMPTY);
  const [confirmed, setConfirmed] = useState(false);
  const [txState, setTxState] = useState<TxState>("idle");
  const [error, setError] = useState<string | null>(null);

  function update<K extends keyof ResolutionConstitution>(key: K, value: ResolutionConstitution[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  const parsed = ResolutionConstitutionSchema.safeParse(form);
  const isLastStep = step === STEPS.length - 1;

  async function handleCreate() {
    if (!parsed.success) return;
    setError(null);
    if (!address) {
      await connect();
      return;
    }
    if (!pravax.isConfigured()) {
      setError("No PravaxResolver contract is deployed yet — creation is disabled until deployment.");
      return;
    }
    setTxState("signing");
    try {
      const marketJson = JSON.stringify(parsed.data);
      const hash = await sha256Hex(marketJson);
      const marketId = `m-${Date.now()}`;
      await pravax.createMarket(address, (window as unknown as { ethereum: unknown }).ethereum, marketId, marketJson, hash);
      setTxState("finalized");
      router.push(`/markets/${marketId}`);
    } catch (err) {
      setTxState("failed");
      setError(err instanceof Error ? err.message : "Market creation failed");
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
      <div>
        <div className="mb-6 flex gap-1">
          {STEPS.map((s, i) => (
            <div key={s} className={`h-1 flex-1 rounded-full ${i <= step ? "bg-accent" : "bg-border"}`} />
          ))}
        </div>
        <p className="mb-1 text-[11px] font-semibold uppercase tracking-widest text-ink-faint">
          Step {step + 1} of {STEPS.length}
        </p>
        <h2 className="font-display mb-4 text-2xl">{STEPS[step]}</h2>

        {step === 0 && (
          <div className="space-y-3">
            <textarea
              value={form.question}
              onChange={(e) => update("question", e.target.value)}
              placeholder="Will Atlas publish a stable v2.0 release before 00:00 UTC on 1 Dec 2026?"
              className="w-full rounded border border-border bg-canvas-raised px-3 py-2 text-sm"
              rows={3}
            />
            <div className="rounded border border-border bg-canvas-raised p-3 text-xs text-ink-muted">
              <p className="mb-1 text-danger">Weak: &ldquo;Will Atlas do well this year?&rdquo;</p>
              <p className="text-yes">Strong: &ldquo;Will Atlas publish a stable v2.0 release before 00:00 UTC on 1 Dec 2026?&rdquo;</p>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-2">
            {form.outcomes.map((o, i) => (
              <input
                key={i}
                value={o}
                onChange={(e) => {
                  const next = [...form.outcomes];
                  next[i] = e.target.value;
                  update("outcomes", next);
                }}
                className="w-full rounded border border-border bg-canvas-raised px-3 py-2 text-sm"
              />
            ))}
            {form.outcomes.length < 6 && (
              <button
                type="button"
                onClick={() => update("outcomes", [...form.outcomes, ""])}
                className="text-sm text-accent underline underline-offset-2"
              >
                + add outcome
              </button>
            )}
          </div>
        )}

        {step === 2 && (
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="text-xs text-ink-muted">
              Close at
              <input
                type="datetime-local"
                onChange={(e) => update("close_at", new Date(e.target.value).toISOString())}
                className="mt-1 w-full rounded border border-border bg-canvas-raised px-3 py-2 text-sm"
              />
            </label>
            <label className="text-xs text-ink-muted">
              Event deadline
              <input
                type="datetime-local"
                onChange={(e) => update("event_deadline", new Date(e.target.value).toISOString())}
                className="mt-1 w-full rounded border border-border bg-canvas-raised px-3 py-2 text-sm"
              />
            </label>
            <label className="text-xs text-ink-muted">
              Resolves after
              <input
                type="datetime-local"
                onChange={(e) => update("resolve_after", new Date(e.target.value).toISOString())}
                className="mt-1 w-full rounded border border-border bg-canvas-raised px-3 py-2 text-sm"
              />
            </label>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-3">
            <label className="block text-xs text-ink-muted">
              Primary sources (one per line)
              <textarea
                value={form.primary_sources.join("\n")}
                onChange={(e) => update("primary_sources", e.target.value.split("\n").filter(Boolean))}
                className="mt-1 w-full rounded border border-border bg-canvas-raised px-3 py-2 text-sm"
                rows={2}
              />
            </label>
            <label className="block text-xs text-ink-muted">
              Secondary sources (one per line, optional)
              <textarea
                value={form.secondary_sources.join("\n")}
                onChange={(e) => update("secondary_sources", e.target.value.split("\n").filter(Boolean))}
                className="mt-1 w-full rounded border border-border bg-canvas-raised px-3 py-2 text-sm"
                rows={2}
              />
            </label>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-3">
            <label className="block text-xs text-ink-muted">
              Definition — what exactly counts?
              <textarea
                value={form.definition}
                onChange={(e) => update("definition", e.target.value)}
                className="mt-1 w-full rounded border border-border bg-canvas-raised px-3 py-2 text-sm"
                rows={3}
              />
            </label>
            <label className="block text-xs text-ink-muted">
              Ambiguity policy
              <textarea
                value={form.ambiguity_policy}
                onChange={(e) => update("ambiguity_policy", e.target.value)}
                className="mt-1 w-full rounded border border-border bg-canvas-raised px-3 py-2 text-sm"
                rows={2}
              />
            </label>
            <label className="block text-xs text-ink-muted">
              Invalidation conditions (one per line)
              <textarea
                value={form.invalid_if.join("\n")}
                onChange={(e) => update("invalid_if", e.target.value.split("\n").filter(Boolean))}
                className="mt-1 w-full rounded border border-border bg-canvas-raised px-3 py-2 text-sm"
                rows={2}
              />
            </label>
          </div>
        )}

        <div className="mt-6 flex justify-between">
          <button
            type="button"
            disabled={step === 0}
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            className="rounded border border-border px-3 py-1.5 text-sm disabled:opacity-30"
          >
            Back
          </button>
          {!isLastStep && (
            <button
              type="button"
              onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}
              className="rounded bg-ink px-3 py-1.5 text-sm text-canvas"
            >
              Next
            </button>
          )}
        </div>
      </div>

      <aside className="h-fit rounded-lg border border-border bg-canvas-raised p-5">
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-ink-faint">
          Resolution constitution preview
        </p>
        <dl className="space-y-2 text-xs">
          <div><dt className="text-ink-faint">Question</dt><dd>{form.question || "—"}</dd></div>
          <div><dt className="text-ink-faint">Outcomes</dt><dd>{form.outcomes.filter(Boolean).join(", ") || "—"}</dd></div>
          <div><dt className="text-ink-faint">Event deadline</dt><dd>{form.event_deadline || "—"}</dd></div>
          <div><dt className="text-ink-faint">Primary sources</dt><dd>{form.primary_sources.filter(Boolean).join(", ") || "—"}</dd></div>
          <div><dt className="text-ink-faint">Ambiguity policy</dt><dd>{form.ambiguity_policy || "—"}</dd></div>
        </dl>
        {!parsed.success && (
          <p className="mt-3 text-xs text-danger">{parsed.error.issues[0]?.message}</p>
        )}
        {isLastStep && (
          <div className="mt-4 space-y-3 border-t border-border pt-4">
            <label className="flex items-start gap-2 text-xs">
              <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} className="mt-0.5" />
              I understand these rules become immutable after lock.
            </label>
            <button
              type="button"
              disabled={!parsed.success || !confirmed}
              onClick={handleCreate}
              className="w-full rounded bg-ink px-3 py-2 text-sm font-semibold text-canvas disabled:opacity-40"
            >
              {address ? "Create market" : "Connect wallet to create"}
            </button>
            <TransactionStatus state={txState} detail={error ?? undefined} />
          </div>
        )}
      </aside>
    </div>
  );
}
