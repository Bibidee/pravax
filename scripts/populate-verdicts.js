// One-off script: creates real markets on the live PravaxResolver deployment,
// locks each, and triggers real resolution — designed (not guaranteed) to
// naturally elicit specific verdicts from real GenVM web evidence + validator
// consensus. No verdict is hardcoded; each comes back from the actual contract.
//
// Paced conservatively to stay under studionet's public RPC rate limit
// (30 requests/minute) after the first run got rate-limited.
const { createClient, createAccount } = require("genlayer-js");
const { studionet } = require("genlayer-js/chains");
const { TransactionStatus } = require("genlayer-js/types");

const CONTRACT = "0x638e4DdEDDFa964D714C1C1a952C4f95149FC9aB";

const account = createAccount();
const client = createClient({ chain: studionet, account });

function log(...args) {
  console.log(new Date().toISOString(), ...args);
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function withRateLimitRetry(fn, label) {
  for (let attempt = 1; attempt <= 8; attempt++) {
    try {
      return await fn();
    } catch (e) {
      const msg = String(e?.message ?? e);
      if (msg.includes("Rate limit") && attempt < 8) {
        const wait = 20000;
        log(`   rate limited during ${label}, waiting ${wait / 1000}s (attempt ${attempt})`);
        await sleep(wait);
        continue;
      }
      throw e;
    }
  }
}

async function writeAndWait(functionName, args, label) {
  log(`-> ${label}: submitting ${functionName}(${args[0]})`);
  const hash = await withRateLimitRetry(
    () =>
      client.writeContract({
        address: CONTRACT,
        functionName,
        args,
        value: BigInt(0),
      }),
    `${label} submit`
  );
  log(`   tx ${hash}`);
  const receipt = await withRateLimitRetry(
    () =>
      client.waitForTransactionReceipt({
        hash,
        status: TransactionStatus.ACCEPTED,
        retries: 40,
        interval: 6000,
      }),
    `${label} wait`
  );
  log(`   status=${receipt.statusName ?? receipt.status} result=${receipt.result}`);
  await sleep(4000);
  return receipt;
}

const ALL_MARKETS = [
  {
    id: "pravax-no-1",
    label: "NO scenario",
    market: {
      question: "According to NASA's official website, has NASA confirmed that the Sun orbits the Earth?",
      category: "ANNOUNCEMENT",
      outcomes: ["YES", "NO"],
      close_at: "2026-01-01T00:00:00Z",
      resolve_after: "2026-01-01T00:05:00Z",
      event_deadline: "2026-01-01T00:00:00Z",
      primary_sources: ["https://www.nasa.gov/"],
      secondary_sources: [],
      definition:
        "YES only if NASA's official site explicitly confirms a geocentric claim; NO if it describes the heliocentric model or does not confirm the claim.",
      invalid_if: [],
      ambiguity_policy: "Return UNRESOLVED if the primary source is unclear or unreachable.",
    },
  },
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
  log("Account:", account.address, "(ephemeral, gasless studionet, no funding needed)");

  for (const m of ALL_MARKETS) {
    const marketJson = JSON.stringify(m.market);
    await writeAndWait("create_market", [m.id, marketJson], `${m.label} create`);
    await writeAndWait("lock_market", [m.id], `${m.label} lock`);
    await writeAndWait("resolve_market", [m.id], `${m.label} resolve`);

    const resolution = await withRateLimitRetry(
      () =>
        client.readContract({
          address: CONTRACT,
          functionName: "get_resolution",
          args: [m.id],
        }),
      "read resolution"
    );
    log(`   RESOLUTION for ${m.id}:`, resolution);
    console.log("=====");
    await sleep(5000);
  }

  const stats = await withRateLimitRetry(
    () => client.readContract({ address: CONTRACT, functionName: "get_protocol_stats", args: [] }),
    "read stats"
  );
  log("Final protocol stats:", stats);
})().catch((e) => {
  console.error("FATAL", e);
  process.exit(1);
});
