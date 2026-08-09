import { createClient } from "genlayer-js";
import { resolveChain, type GenLayerNetworkName } from "./config";

/**
 * Read client — talks directly to the GenLayer RPC, no wallet required.
 * Safe to use for every view call (get_market, get_resolution, etc).
 */
export function getReadClient(network?: GenLayerNetworkName) {
  return createClient({ chain: resolveChain(network) });
}

/**
 * Write client — signs transactions through the connected injected wallet.
 * Must only be constructed once a wallet address + provider are available.
 */
export function getWriteClient(
  account: `0x${string}`,
  provider: unknown,
  network?: GenLayerNetworkName
) {
  return createClient({
    chain: resolveChain(network),
    account,
    provider: provider as never,
  });
}
