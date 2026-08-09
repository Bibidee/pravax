import { TransactionStatus } from "genlayer-js/types";
import { getReadClient, getWriteClient } from "../client";
import { PRAVAX_CONTRACT_ADDRESS } from "../config";

export class NoContractAddressError extends Error {
  constructor() {
    super(
      "No PravaxResolver contract address is configured. Set NEXT_PUBLIC_PRAVAX_CONTRACT_ADDRESS after deployment."
    );
    this.name = "NoContractAddressError";
  }
}

function requireAddress(): `0x${string}` {
  if (!PRAVAX_CONTRACT_ADDRESS) throw new NoContractAddressError();
  return PRAVAX_CONTRACT_ADDRESS;
}

async function read<T = string>(functionName: string, args: string[] = []): Promise<T> {
  const client = getReadClient();
  return client.readContract({
    address: requireAddress(),
    functionName,
    args,
  }) as Promise<T>;
}

async function write(
  account: `0x${string}`,
  provider: unknown,
  functionName: string,
  args: string[] = []
): Promise<`0x${string}`> {
  const client = getWriteClient(account, provider);
  const hash = await client.writeContract({
    address: requireAddress(),
    functionName,
    args,
    value: BigInt(0),
  });
  await client.waitForTransactionReceipt({ hash, status: TransactionStatus.ACCEPTED });
  return hash;
}

export const pravax = {
  // ---- deterministic writes ----
  createMarket: (account: `0x${string}`, provider: unknown, marketId: string, marketJson: string, constitutionHash: string) =>
    write(account, provider, "create_market", [marketId, marketJson, constitutionHash]),

  lockMarket: (account: `0x${string}`, provider: unknown, marketId: string) =>
    write(account, provider, "lock_market", [marketId]),

  recordPosition: (account: `0x${string}`, provider: unknown, positionId: string, marketId: string, positionJson: string) =>
    write(account, provider, "record_position", [positionId, marketId, positionJson]),

  submitChallenge: (account: `0x${string}`, provider: unknown, marketId: string, challengeId: string, challengeJson: string) =>
    write(account, provider, "submit_challenge", [marketId, challengeId, challengeJson]),

  finalizeResolution: (account: `0x${string}`, provider: unknown, marketId: string) =>
    write(account, provider, "finalize_resolution", [marketId]),

  // ---- non-deterministic resolution ----
  resolveMarket: (account: `0x${string}`, provider: unknown, marketId: string, resolutionPayloadJson: string) =>
    write(account, provider, "resolve_market", [marketId, resolutionPayloadJson]),

  reviewChallenge: (account: `0x${string}`, provider: unknown, marketId: string, reviewPayloadJson: string) =>
    write(account, provider, "review_challenge", [marketId, reviewPayloadJson]),

  // ---- views ----
  getMarket: (marketId: string) => read<string>("get_market", [marketId]),
  getResolution: (marketId: string) => read<string>("get_resolution", [marketId]),
  getChallenges: (marketId: string) => read<string>("get_challenges", [marketId]),
  getPositions: (marketId: string) => read<string>("get_positions", [marketId]),
  getUserMarkets: (user: string) => read<string>("get_user_markets", [user]),
  getProtocolStats: () => read<string>("get_protocol_stats", []),

  isConfigured: () => Boolean(PRAVAX_CONTRACT_ADDRESS),
};
