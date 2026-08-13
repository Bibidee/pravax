// Reproducible Studionet lifecycle. It fails fast whenever GenVM execution
// fails or state does not advance, preventing later calls from masking a bad write.
const { createClient, createAccount } = require("genlayer-js");
const { studionet } = require("genlayer-js/chains");
const { TransactionStatus } = require("genlayer-js/types");

const CONTRACT = "0x30bd9c57Aa4E28a071da4AaBF4B8c4293A96150D";
const account = createAccount();
const client = createClient({ chain: studionet, account });
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const iso = (date) => new Date(date).toISOString().replace(/\.\d{3}Z$/, "Z");

function executionResult(receipt) {
  const entries = receipt.consensus_data?.leader_receipt ?? [];
  return entries.find((entry) => entry.mode === "leader")?.execution_result ?? entries[0]?.execution_result;
}

async function write(functionName, args, value = 0n) {
  const hash = await client.writeContract({ address: CONTRACT, functionName, args, value });
  const receipt = await client.waitForTransactionReceipt({ hash, status: TransactionStatus.ACCEPTED, retries: 100, interval: 6000 });
  const result = executionResult(receipt);
  console.log(functionName, { hash, executionResult: result, status: receipt.statusName ?? receipt.status });
  if (result && result !== "SUCCESS") throw new Error(`${functionName} execution failed: ${result}`);
  return hash;
}

async function read(functionName, args = []) {
  return client.readContract({ address: CONTRACT, functionName, args });
}

async function requireState(id, expected) {
  const market = JSON.parse(await read("get_market", [id]));
  console.log("market", market);
  if (market.state !== expected) throw new Error(`expected ${expected}, got ${market.state ?? market.error}`);
  return market;
}

(async () => {
  const now = Date.now();
  const id = `escrow-round-${Math.floor(now / 1000)}`;
  console.log({ account: account.address, contract: CONTRACT, id });
  const market = {
    question: "Does NASA describe the Sun as the center of the solar system?",
    category: "OTHER", outcomes: ["YES", "NO"],
    close_at: iso(now + 120000), event_deadline: iso(now + 120000), resolve_after: iso(now + 130000),
    primary_sources: ["https://science.nasa.gov/solar-system/solar-system-facts/"],
    secondary_sources: [],
    definition: "YES if the official NASA source describes the Sun as the center of the solar system; otherwise NO.",
    invalid_if: [], ambiguity_policy: "Return UNRESOLVED if evidence is unavailable or materially conflicting.",
  };
  await write("create_market", [id, JSON.stringify(market)]);
  await requireState(id, "OPEN");
  await write("record_position", [`${id}-yes`, id, JSON.stringify({ outcome: "YES" })], 10n);
  await write("record_position", [`${id}-no`, id, JSON.stringify({ outcome: "NO" })], 3n);
  console.log("escrow", await read("get_escrow", [id]));
  console.log("positions", await read("get_positions", [id]));
  await sleep(135000);
  await write("lock_market", [id]);
  await requireState(id, "LOCKED");
  await write("resolve_market", [id]);
  const resolved = await requireState(id, "CHALLENGE_WINDOW");
  const verdict = JSON.parse(await read("get_resolution", [id])).verdict;
  const claimed = verdict === "YES" ? "NO" : "YES";
  await write("submit_challenge", [id, `${id}-challenge`, JSON.stringify({
    challenged_verdict: verdict, claimed_verdict: claimed,
    disputed_rule: "The resolution must be grounded in the locked primary source.",
    explanation: "Requesting independent review with counter-evidence.",
    evidence_urls: ["https://solarsystem.nasa.gov/solar-system/our-solar-system/overview/"],
  })]);
  await requireState(id, "CHALLENGED");
  await write("review_challenge", [id]);
  await requireState(id, "FINAL");
  console.log("claimable", await read("get_claimable", [id, account.address]));
  await write("claim", [id]);
  console.log("escrow-after-claim", await read("get_escrow", [id]));
  console.log("FULL ROUND COMPLETE", id);
})().catch((error) => { console.error("FULL ROUND FAILED", error); process.exitCode = 1; });
