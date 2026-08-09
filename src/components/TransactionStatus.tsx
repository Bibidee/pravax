export type TxState =
  | "idle"
  | "wallet-required"
  | "wrong-network"
  | "validating"
  | "signing"
  | "submitted"
  | "pending"
  | "finalized"
  | "failed";

const COPY: Record<TxState, { label: string; tone: string }> = {
  idle: { label: "", tone: "" },
  "wallet-required": { label: "Connect a wallet to continue.", tone: "text-ink-muted" },
  "wrong-network": { label: "Switch your wallet to the configured GenLayer network.", tone: "text-danger" },
  validating: { label: "Validating…", tone: "text-ink-muted" },
  signing: { label: "Confirm the transaction in your wallet…", tone: "text-ink-muted" },
  submitted: { label: "Transaction submitted, waiting for confirmation…", tone: "text-unresolved" },
  pending: { label: "Pending consensus…", tone: "text-unresolved" },
  finalized: { label: "Confirmed.", tone: "text-yes" },
  failed: { label: "Transaction failed.", tone: "text-danger" },
};

export function TransactionStatus({ state, detail }: { state: TxState; detail?: string }) {
  if (state === "idle") return null;
  const copy = COPY[state];
  return (
    <div className={`flex items-center gap-2 text-sm ${copy.tone}`} role="status">
      {(state === "signing" || state === "submitted" || state === "pending" || state === "validating") && (
        <span className="h-3 w-3 animate-pulse rounded-full bg-current" />
      )}
      <span>{copy.label}</span>
      {detail && <span className="text-ink-faint">{detail}</span>}
    </div>
  );
}
