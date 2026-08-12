// Continuation: retry resolve on pravax-no-1 (previous attempt CANCELED /
// NO_MAJORITY — state untouched, so a retry is valid and permissionless),
// then create+lock+resolve the INVALID and UNRESOLVED scenario markets.
const { createClient, createAccount } = require("genlayer-js");
const { studionet } = require("genlayer-js/chains");
const { TransactionStatus } = require("genlayer-js/types");

const CONTRACT = "0x638e4DdEDDFa964D714C1C1a952C4f95149FC9aB";
const account = createAccount();
const client = createClient({ chain: studionet, account });

function log(...a) {
  console.log(new Date().toISOString(), ...a);
}
function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function withRetry(fn, label, { rateLimitWait = 20000, maxAttempts = 8 } = {}) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (e) {
      const msg = String(e?.message ?? e);
      if (msg.includes("Rate limit") && attempt < maxAttempts) {
        log(`   rate limited during ${label}, waiting ${rateLimitWait / 1000}s (attempt ${attempt})`);
        await sleep(rateLimitWait);
        continue;
      }
      throw e;
    }
  }
}

async function writeAndWait(functionName, args, label) {
  log(`-> ${label}: submitting ${functionName}(${args[0]})`);
  const hash = await withRetry(
    () => client.writeContract({ address: CONTRACT, functionName, args, value: BigInt(0) }),
    `${label} submit`
  );
  log(`   tx ${hash}`);
  let receipt;
  try {
    receipt = await withRetry(
      () => client.waitForTransactionReceipt({ hash, status: TransactionStatus.ACCEPTED, retries: 30, interval: 6000 }),
      `${label} wait`
    );
  } catch {
    // Timed out polling for ACCEPTED specifically; keep polling the same tx
    // via getTransaction until it reaches a terminal status instead of
    // resubmitting (resubmitting would double the on-chain action).
    log(`   still pending after initial wait, continuing to poll tx directly...`);
    for (let i = 0; i < 20; i++) {
      await sleep(6000);
      const tx = await withRetry(() => client.getTransaction({ hash }), `${label} poll`);
      if ([5, 6, 7, 8].includes(tx.status)) {
        receipt = tx;
        break;
      }
    }
    if (!receipt) throw new Error(`${label}: gave up waiting for terminal status`);
  }
  log(`   status=${receipt.statusName ?? receipt.status} result=${receipt.result_name ?? receipt.result}`);
  await sleep(4000);
  return receipt;
}

async function resolveWithRetries(marketId, maxTries = 3) {
  for (let i = 1; i <= maxTries; i++) {
    const receipt = await writeAndWait("resolve_market", [marketId], `${marketId} resolve (try ${i})`);
    const statusName = receipt.statusName ?? "";
    const resultName = receipt.result_name ?? "";
    if (statusName === "CANCELED" || resultName === "NO_MAJORITY") {
      log(`   ${marketId}: validators did not reach consensus (NO_MAJORITY), state untouched, retrying...`);
      await sleep(5000);
      continue;
    }
    return receipt;
  }
  log(`   ${marketId}: gave up after ${maxTries} resolve attempts (persistent NO_MAJORITY)`);
  return null;
}

const NEW_MARKETS = [
  {
    id: "pravax-invalid-1",
    label: "INVALID scenario",
    market: {
      question: "Did the resource at the specified (deliberately broken) URL officially confirm a new product launch?",
      category: "OTHER",
      outcomes: ["YES", "NO"],
      close_at: "2026-01-01T00:00:00Z",
      resolve_after: "2026-01-01T00:05:00Z",
      event_deadline: "2026-01-01T00:00:00Z",
      primary_sources: ["https://www.python.org/pravax-nonexistent-page-test-404"],
      secondary_sources: [],
      definition: "YES if the primary source page confirms a product launch announcement.",
      invalid_if: ["the primary source URL is inaccessible or returns an error at resolution time"],
      ambiguity_policy:
        "Return UNRESOLVED if evidence is materially conflicting, but return INVALID if an invalidation condition is met.",
    },
  },
  {
    id: "pravax-unresolved-1",
    label: "UNRESOLVED scenario",
    market: {
      question:
        "Did an anonymous open-source contributor privately email the Python Software Foundation board on 15 June 2026 proposing to deprecate a module?",
      category: "OTHER",
      outcomes: ["YES", "NO"],
      close_at: "2026-01-01T00:00:00Z",
      resolve_after: "2026-01-01T00:05:00Z",
      event_deadline: "2026-01-01T00:00:00Z",
      primary_sources: ["https://www.python.org/"],
      secondary_sources: [],
      definition:
        "YES only if there is public confirmation of this specific private email; NO only if there is public confirmation it did not happen.",
      invalid_if: [],
      ambiguity_policy:
        "Return UNRESOLVED when there is no public evidence available to confirm or deny a private, unverifiable event.",
    },
  },
];

(async () => {
  log("Retry account:", account.address);

  log("=== Retrying resolution for pravax-no-1 ===");
  await resolveWithRetries("pravax-no-1");
  const noRes = await withRetry(
    () => client.readContract({ address: CONTRACT, functionName: "get_resolution", args: ["pravax-no-1"] }),
    "read no resolution"
  );
  log("RESOLUTION pravax-no-1:", noRes);
  console.log("=====");
  await sleep(5000);

  for (const m of NEW_MARKETS) {
    const marketJson = JSON.stringify(m.market);
    await writeAndWait("create_market", [m.id, marketJson], `${m.label} create`);
    await writeAndWait("lock_market", [m.id], `${m.label} lock`);
    await resolveWithRetries(m.id);
    const resolution = await withRetry(
      () => client.readContract({ address: CONTRACT, functionName: "get_resolution", args: [m.id] }),
      "read resolution"
    );
    log(`RESOLUTION ${m.id}:`, resolution);
    console.log("=====");
    await sleep(5000);
  }

  const stats = await withRetry(
    () => client.readContract({ address: CONTRACT, functionName: "get_protocol_stats", args: [] }),
    "read stats"
  );
  log("Final protocol stats:", stats);
})().catch((e) => {
  console.error("FATAL", e);
  process.exit(1);
});
