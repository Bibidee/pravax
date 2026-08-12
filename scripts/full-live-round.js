const { createClient, createAccount } = require("genlayer-js");
const { studionet } = require("genlayer-js/chains");
const { TransactionStatus } = require("genlayer-js/types");

const CONTRACT = "0x84aA2fA0832dc5C2716ae5818D5149BD2699b159";
const account = createAccount();
const client = createClient({ chain: studionet, account });
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function write(functionName, args) {
  const hash = await client.writeContract({ address: CONTRACT, functionName, args, value: BigInt(0) });
  const receipt = await client.waitForTransactionReceipt({ hash, status: TransactionStatus.ACCEPTED, retries: 80, interval: 6000 });
  console.log(functionName, { hash, status: receipt.statusName ?? receipt.status, result: receipt.result_name ?? receipt.result });
  return receipt;
}

async function read(functionName, args = []) {
  const value = await client.readContract({ address: CONTRACT, functionName, args });
  console.log(functionName, value);
  return value;
}

(async () => {
  console.log("account", account.address, "contract", CONTRACT);
  const now = Date.now();
  const iso = (offset) => new Date(now + offset * 1000).toISOString().replace(/\.\d{3}Z$/, "Z");
  const id = `live-round-${Math.floor(now / 1000)}`;
  const market = {
    question: "Does the official NASA website describe the Sun as the center of the solar system?",
    category: "FACTUAL",
    outcomes: ["YES", "NO"],
    close_at: iso(90),
    event_deadline: iso(90),
    resolve_after: iso(100),
    primary_sources: ["https://science.nasa.gov/solar-system/solar-system-facts/"],
    secondary_sources: ["https://www.britannica.com/science/solar-system"],
    definition: "YES if the cited sources describe the Sun as the center of the solar system; otherwise NO.",
    invalid_if: [],
    ambiguity_policy: "Return UNRESOLVED if the sources are unavailable or materially conflicting.",
  };

  await write("create_market", [id, JSON.stringify(market)]);
  await read("get_market", [id]);
  await read("get_market_ids", [0, 100]);
  await read("get_user_markets", [account.address]);
  await read("get_protocol_stats");

  await write("record_position", [`${id}-position-yes`, id, JSON.stringify({ outcome: "YES", amount: 10 })]);
  await write("record_position", [`${id}-position-no`, id, JSON.stringify({ outcome: "NO", amount: 3 })]);
  await read("get_positions", [id]);

  console.log("waiting for close...");
  await sleep(95000);
  await write("lock_market", [id]);
  await read("get_market", [id]);

  console.log("waiting for resolution eligibility...");
  await sleep(15000);
  await write("resolve_market", [id]);
  await read("get_resolution", [id]);
  await read("get_market", [id]);

  const provisional = JSON.parse(await client.readContract({ address: CONTRACT, functionName: "get_resolution", args: [id] }));
  const challenged = provisional.verdict;
  const claimed = challenged === "YES" ? "NO" : "YES";
  await write("submit_challenge", [id, `${id}-challenge`, JSON.stringify({
    challenged_verdict: challenged,
    claimed_verdict: claimed,
    disputed_rule: "The rule requires an explicit statement in the primary source, not an inferred description.",
    explanation: "The challenger requests an independent review using the original sources and this counter-evidence.",
    evidence_urls: ["https://solarsystem.nasa.gov/solar-system/our-solar-system/overview/"],
  })]);
  await read("get_challenges", [id]);
  await read("get_market", [id]);

  await write("review_challenge", [id]);
  await read("get_resolution", [id]);
  await read("get_challenges", [id]);
  await read("get_market", [id]);
  await read("get_protocol_stats");
  console.log("FULL LIVE ROUND COMPLETE", id);
})().catch((error) => {
  console.error("FULL LIVE ROUND FAILED", error);
  process.exitCode = 1;
});
