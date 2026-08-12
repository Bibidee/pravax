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

export class TransactionPendingError extends Error {
  constructor(public hash: `0x${string}`) {
    super(
      `Transaction ${hash} is still being processed by GenLayer validators. It has not failed — check its status before retrying.`
    );
    this.name = "TransactionPendingError";
  }
}

// Non-deterministic methods (resolve_market, review_challenge) involve a real
// web fetch + LLM call + multi-round validator consensus, which routinely
// takes well over a minute — much longer than deterministic writes. Waiting
// with too short a timeout doesn't mean the transaction failed, it just means
// we stopped watching too early; the write() helper below distinguishes
// "genuinely failed/canceled" from "still pending, stopped polling" so the UI
// never falsely reports success as failure.
const NONDET_METHODS = new Set(["resolve_market", "review_challenge"]);

type LeaderReceiptLike = {
  mode?: string;
  execution_result?: string;
  genvm_result?: { error_description?: string | null; raw_error?: unknown; stderr?: string | null };
};

type ReceiptLike = {
  result_name?: string;
  consensus_data?: { leader_receipt?: LeaderReceiptLike[] };
};

function stringifyDetail(value: unknown): string | undefined {
  if (!value) return undefined;
  if (typeof value === "string") return value;
  try {
    const json = JSON.stringify(value);
    // {"fatal":false,"causes":[]} carries no useful information — skip it
    // rather than showing noise in the error message.
    return json && json !== "{}" && json !== '{"fatal":false,"causes":[]}' ? json : undefined;
  } catch {
    return undefined;
  }
}

// A transaction reaching ACCEPTED/FINALIZED consensus status only means
// validators agreed on *an* outcome — that outcome can still be a rejected
// execution (e.g. the contract raised on invalid input) that leaves state
// unchanged. `result_name` (e.g. "MAJORITY_AGREE") only confirms validators
// agreed with each other — they can just as easily agree that execution
// *failed* (e.g. a genuine contract validation error), so it must NOT be
// used as a success shortcut; the leader's own `execution_result` is the
// only field that actually says whether the write succeeded.
//
// `leader_receipt` can contain multiple entries across rounds — one per
// validator/leader attempt, including transient per-validator failures
// (e.g. an LLM provider timeout) that are unrelated to whether the
// transaction as a whole actually succeeded. The entry with mode "leader"
// is the one that reflects the committed outcome.
function assertExecutionSucceeded(hash: `0x${string}`, receipt: ReceiptLike): void {
  const leaderReceipts = receipt.consensus_data?.leader_receipt ?? [];
  const leaderEntry = leaderReceipts.find((r) => r.mode === "leader") ?? leaderReceipts[0];
  if (!leaderEntry) return; // nothing to check against, don't block on missing data

  if (leaderEntry.execution_result && leaderEntry.execution_result !== "SUCCESS") {
    const detail =
      stringifyDetail(leaderEntry.genvm_result?.error_description) ??
      stringifyDetail(leaderEntry.genvm_result?.raw_error) ??
      stringifyDetail(leaderEntry.genvm_result?.stderr);
    throw new Error(
      `Transaction ${hash} was accepted by consensus but execution failed${detail ? `: ${detail}` : ` (${leaderEntry.execution_result})`}.`
    );
  }
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

  const isNondet = NONDET_METHODS.has(functionName);
  const retries = isNondet ? 40 : 15;
  const interval = isNondet ? 6000 : 3000;

  try {
    const receipt = await client.waitForTransactionReceipt({
      hash,
      status: TransactionStatus.ACCEPTED,
      retries,
      interval,
    });
    assertExecutionSucceeded(hash, receipt as ReceiptLike);
  } catch (err) {
    if (err instanceof Error && err.message.includes("execution failed")) throw err;
    // waitForTransactionReceipt only throws on a client-side timeout, not on
    // an actual on-chain failure — check the real status directly rather
    // than assuming the write failed.
    const tx = await client.getTransaction({ hash });
    const terminalFailureStatuses = new Set(["CANCELED", "UNDETERMINED"]);
    if (tx.statusName && terminalFailureStatuses.has(tx.statusName)) {
      throw new Error(`Transaction ${hash} did not reach consensus (${tx.statusName}). It may be safe to retry.`);
    }
    if (tx.statusName === "ACCEPTED" || tx.statusName === "FINALIZED") {
      assertExecutionSucceeded(hash, tx as ReceiptLike);
      return hash; // actually succeeded, we just stopped polling too early
    }
    throw new TransactionPendingError(hash);
  }
  return hash;
}

export const pravax = {
  // ---- deterministic writes ----
  createMarket: (account: `0x${string}`, provider: unknown, marketId: string, marketJson: string) =>
    write(account, provider, "create_market", [marketId, marketJson]),

  lockMarket: (account: `0x${string}`, provider: unknown, marketId: string) =>
    write(account, provider, "lock_market", [marketId]),

  recordPosition: (account: `0x${string}`, provider: unknown, positionId: string, marketId: string, positionJson: string) =>
    write(account, provider, "record_position", [positionId, marketId, positionJson]),

  submitChallenge: (account: `0x${string}`, provider: unknown, marketId: string, challengeId: string, challengeJson: string) =>
    write(account, provider, "submit_challenge", [marketId, challengeId, challengeJson]),

  finalizeResolution: (account: `0x${string}`, provider: unknown, marketId: string) =>
    write(account, provider, "finalize_resolution", [marketId]),

  // ---- non-deterministic resolution ----
  resolveMarket: (account: `0x${string}`, provider: unknown, marketId: string) =>
    write(account, provider, "resolve_market", [marketId]),

  reviewChallenge: (account: `0x${string}`, provider: unknown, marketId: string) =>
    write(account, provider, "review_challenge", [marketId]),

  // ---- views ----
  getMarket: (marketId: string) => read<string>("get_market", [marketId]),
  getResolution: (marketId: string) => read<string>("get_resolution", [marketId]),
  getChallenges: (marketId: string) => read<string>("get_challenges", [marketId]),
  getPositions: (marketId: string) => read<string>("get_positions", [marketId]),
  getUserMarkets: (user: string) => read<string>("get_user_markets", [user]),
  getProtocolStats: () => read<string>("get_protocol_stats", []),

  isConfigured: () => Boolean(PRAVAX_CONTRACT_ADDRESS),
};
