const { createClient, createAccount } = require("genlayer-js");
const { studionet } = require("genlayer-js/chains");
const { TransactionStatus } = require("genlayer-js/types");
const CONTRACT = "0x84aA2fA0832dc5C2716ae5818D5149BD2699b159";
const ID = "live-round-1786571853";
const client = createClient({ chain: studionet, account: createAccount() });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function read(f, args = []) { const v = await client.readContract({ address: CONTRACT, functionName: f, args }); console.log(f, v); return v; }
async function write(f, args) {
  const hash = await client.writeContract({ address: CONTRACT, functionName: f, args, value: BigInt(0) });
  const r = await client.waitForTransactionReceipt({ hash, status: TransactionStatus.ACCEPTED, retries: 80, interval: 6000 });
  console.log(f, hash, r.statusName ?? r.status, r.result_name ?? r.result); return r;
}
(async () => {
  await read("get_market", [ID]);
  await sleep(65000);
  const receipt = await write("resolve_market", [ID]);
  await read("get_market", [ID]);
  if ((receipt.statusName ?? "") !== "TIMEOUT") {
    const resolution = JSON.parse(await read("get_resolution", [ID]));
    const claimed = resolution.verdict === "YES" ? "NO" : "YES";
    await write("submit_challenge", [ID, `${ID}-challenge-2`, JSON.stringify({ challenged_verdict: resolution.verdict, claimed_verdict: claimed, disputed_rule: "The primary source must explicitly state the conclusion.", explanation: "Independent review requested with counter-evidence.", evidence_urls: ["https://solarsystem.nasa.gov/solar-system/our-solar-system/overview/"] })]);
    await read("get_challenges", [ID]);
    await write("review_challenge", [ID]);
    await read("get_resolution", [ID]);
    await read("get_market", [ID]);
  }
  await read("get_positions", [ID]); await read("get_protocol_stats");
})().catch((e) => { console.error(e); process.exitCode = 1; });
