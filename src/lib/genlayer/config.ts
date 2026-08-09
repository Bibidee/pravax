import { localnet, studionet, testnetAsimov, testnetBradbury } from "genlayer-js/chains";

type GenLayerChain = typeof localnet;

const CHAINS: Record<string, GenLayerChain> = {
  localnet,
  studionet,
  testnetAsimov,
  testnetBradbury,
};

export type GenLayerNetworkName = keyof typeof CHAINS;

export const DEFAULT_NETWORK: GenLayerNetworkName =
  (process.env.NEXT_PUBLIC_GENLAYER_NETWORK as GenLayerNetworkName) || "studionet";

export function resolveChain(network: GenLayerNetworkName = DEFAULT_NETWORK): GenLayerChain {
  const chain = CHAINS[network];
  if (!chain) {
    throw new Error(`Unknown GenLayer network "${network}". Expected one of: ${Object.keys(CHAINS).join(", ")}`);
  }
  return chain;
}

/**
 * Set via NEXT_PUBLIC_PRAVAX_CONTRACT_ADDRESS once PravaxResolver is deployed.
 * Left undefined by default — the app must surface a real "no contract
 * deployed" state rather than fabricate an address.
 */
export const PRAVAX_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_PRAVAX_CONTRACT_ADDRESS as
  | `0x${string}`
  | undefined;
