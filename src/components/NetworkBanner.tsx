import { DEFAULT_NETWORK, PRAVAX_CONTRACT_ADDRESS } from "@/lib/genlayer/config";

export function NetworkBanner() {
  if (PRAVAX_CONTRACT_ADDRESS) return null;
  return (
    <div className="border-b border-unresolved/30 bg-unresolved/10 px-4 py-2 text-center text-xs text-unresolved">
      Demo mode — no PravaxResolver contract is deployed on <strong>{DEFAULT_NETWORK}</strong> yet. Markets shown
      below are illustrative templates, not on-chain data.
    </div>
  );
}
