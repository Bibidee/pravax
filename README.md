# Pravax

**Markets resolve on evidence, not guesswork.**

Pravax is a GenLayer-native prediction resolution protocol for creating precisely specified
future-event markets and resolving them from live public evidence through decentralized
AI-validator consensus. It is not a Polymarket clone, sportsbook, or generic oracle dashboard —
the product surface is the **resolution constitution**: locked rules, explicit source policy, and
an inspectable evidence trail for every verdict.

> **MVP disclaimer:** Pravax uses test credits, not real money. It is a resolution-protocol
> showcase, not a licensed wagering venue.

## Why GenLayer is necessary

Deterministic contracts can enforce timestamps, balances, and payout formulas, but they cannot
interpret open-web evidence against nuanced natural-language rules. Pravax's `resolve_market`
method is the one place the contract makes a genuinely non-deterministic judgment call:

1. It renders the market's configured public sources as clean text (`gl.nondet.web.render(url,
   mode="text")` — browser-like rendering rather than raw HTTP body, so validators reason over
   readable page content instead of markup noise).
2. It asks GenLayer validators to interpret that evidence against the market's locked constitution
   (`gl.nondet.exec_prompt(task, response_format="json")`).
3. It reaches consensus across validators via the **Equivalence Principle**, specifically
   `gl.eq_principle.prompt_comparative` — an NLP-based comparison, not `strict_eq`. LLM output
   varies in exact wording between validator runs even for the same underlying judgment, so
   requiring byte-identical output (`strict_eq`) would cause spurious consensus failures. The
   comparison principle instead pins down the fields that must actually agree: the `verdict`
   itself, and the material conclusions in `rule_interpretation` and the evidence assessment —
   while allowing phrasing, evidence ordering, and `reasoning_summary` wording to differ.

Everything else — validation, state transitions, challenge bookkeeping — is ordinary deterministic
contract logic using `TreeMap[str, str]` storage (GenVM's persistent map type; plain `dict`/`list`
are rejected by GenVM's own linter). GenLayer is used for the one part that actually needs
judgment.

## Architecture

```
contract/
  pravax_resolver.py      GenLayer Intelligent Contract (Python, gl.Contract)
  tests/                  Logic-level pytest suite against a GenVM stub

src/
  app/                    Next.js App Router routes
  components/             Design-system components (MarketCard, VerdictPanel, ...)
  lib/
    genlayer/
      config.ts           Network + contract address configuration
      client.ts            genlayer-js read/write client factories
      contracts/pravax.ts  Single service layer — all contract calls go through here
    schemas/               Zod schemas mirroring the contract's JSON records
    data/market.ts          Live-contract data access with schema validation
    wallet/useWallet.ts     Minimal injected-wallet (window.ethereum) hook
```

UI components never call RPC helpers directly — every read/write goes through
`src/lib/genlayer/contracts/pravax.ts`.

## Contract: `PravaxResolver`

### State machine

```
OPEN -> LOCKED -> CHALLENGE_WINDOW -> FINAL
CHALLENGED is a pending independent review; YES/NO/INVALID/UNRESOLVED are verdicts.
```

`UNRESOLVED` is a first-class terminal state, not an error and never collapsed into `NO`.

### Methods

Deterministic:

```python
create_market(market_id, market_json) -> None
lock_market(market_id) -> None
record_position(position_id, market_id, position_json) -> None
submit_challenge(market_id, challenge_id, challenge_json) -> None
finalize_resolution(market_id) -> None

get_market(market_id) -> str
get_resolution(market_id) -> str
get_challenges(market_id) -> str
get_positions(market_id) -> str
get_user_markets(user) -> str
get_protocol_stats() -> str
```

Non-deterministic:

```python
resolve_market(market_id) -> None
review_challenge(market_id) -> None
```

`resolve_market` fetches the market's `primary_sources` / `secondary_sources`, prompts validators
with the locked constitution and retrieved material, and requires the returned JSON to match the
schema below before accepting a verdict. `review_challenge` runs a second, independent review that
sees the original constitution, the provisional verdict, the original evidence, and the
challenger's counter-evidence — it can preserve or overturn the result.

### Verdict schema

```json
{
  "verdict": "YES | NO | INVALID | UNRESOLVED",
  "confidence": 0,
  "rule_interpretation": "string",
  "evidence": [
    { "url": "string", "source_role": "PRIMARY | SECONDARY", "claim": "string", "published_at": "string|null", "event_time": "string|null" }
  ],
  "conflicts": ["string"],
  "reasoning_summary": "string",
  "resolved_at": "string"
}
```

### Evidence hierarchy

1. Official primary source
2. Authoritative regulator / government / league / company source
3. Direct source material
4. Multiple reputable independent reports
5. Secondary commentary, only when primary evidence is unavailable

A search snippet, anonymous social post, uncited AI summary, or user assertion is never sufficient
authoritative evidence on its own.

### Challenge flow

1. A provisional verdict opens a 24-hour `CHALLENGE_WINDOW`.
2. `submit_challenge` requires a challenged verdict, claimed verdict, exact disputed rule,
   at least one counter-evidence URL, and an explanation — not a free-text comment.
3. `review_challenge` runs an independent second GenLayer review with the original constitution,
   provisional verdict, original evidence, and the challenger's packet.
4. `finalize_resolution` is permissionless once the challenge window has closed.

## Local setup

```bash
npm install
npm run dev
```

Contract lint + validation (real GenVM linter/SDK, not a stub):

```bash
pip install genvm-linter
genvm-lint check contract/pravax_resolver.py --json
```

Contract logic tests (GenVM stub — see "Testing" below):

```bash
cd contract
pip install pytest
python -m pytest tests/ -q
```

```bash
npm run lint
npx tsc --noEmit
npm run build
```

## Studionet / deployment setup

Set the network and, once deployed, the contract address:

```bash
# .env.local
NEXT_PUBLIC_GENLAYER_NETWORK=studionet
NEXT_PUBLIC_PRAVAX_CONTRACT_ADDRESS=0x...
```

The contract header pins an exact GenVM runner (`# { "Depends": "py-genlayer:<hash>" }` — never
`test` or `latest`), resolved against GenVM v0.2.16 via `genvm-lint download`. `genvm-lint check`
reports one informational note that a newer runner hash is available upstream; re-pin by rerunning
`genvm-lint check` after `genvm-lint download -v <newer-version>` if you want to move onto it.

Intended deploy path (via the GenLayer CLI, once a funded Studionet account is available):

```bash
npm install -g genlayer
genlayer network set studionet
genlayer deploy contract/pravax_resolver.py --account <funded-account>
genlayer schema <deployed-address>   # verify the ABI matches src/lib/genlayer/contracts/pravax.ts
```

## Deployment status — **deployed to Studionet**

`PravaxResolver` is deployed on **studionet** at:

```
0x8800130991E29923642f1274695849712F87418b
```

The current contract was deployed from the unlocked `faultline-dev` Studionet CLI account and independently
verified with a live `get_protocol_stats` read and schema query before being wired in.

Deployment proof: git commit `d1f9849`; source SHA-256
`DC8F249D6DF89591D1609950D2CC8A28329D43E9B4789C00EA05153636A87367`; network `studionet`;
transaction `0x09b16beac6b0bfb609881187801c703154a9e93e7b1c7d366eb0856938415bfa`.

```js
const client = createClient({ chain: studionet });
await client.readContract({
  address: "0x8800130991E29923642f1274695849712F87418b",
  functionName: "get_protocol_stats",
  args: [],
});
// -> {"markets_created":0,"markets_locked":0,"markets_resolved":0,"markets_finalized":0,"challenges_filed":0}
```

That response matches `PravaxResolver.__init__`'s exact initial stats shape, confirming this is a
live instance of this contract responding on studionet, not a fabricated address.

`NEXT_PUBLIC_GENLAYER_NETWORK=studionet` and `NEXT_PUBLIC_PRAVAX_CONTRACT_ADDRESS` are set in
`.env.local` (and mirrored in `.env.example`). The frontend now reads real contract state via
`pravax.isConfigured()` returning `true`; the UI renders only schema-validated on-chain markets.

No market has been created against this deployment yet from this session — `markets_created` is
`0` as shown above. Creating one requires a connected wallet with a funded studionet account (get
one via the standard studionet flow, since studionet is gasless) exercising the `/markets/new`
composer.

## Testing

**Contract lint/validate** (`genvm-lint check contract/pravax_resolver.py --json`, real GenVM
SDK loaded from the pinned runner, not a stub): `{"ok": true}` — 0 lint errors, 0 validation
errors, one informational note about a newer runner hash being available upstream.

**Contract logic tests** (`contract/tests/test_pravax_resolver.py`, 24 tests, all passing):
creation validation, rejecting malformed JSON / empty outcomes / missing deadlines / impossible
source policy / harmful framing, unauthorized lock rejection, cannot-resolve-before-window,
YES/NO/UNRESOLVED/INVALID verdicts, duplicate-resolution prevention, full
challenge → review → finalize lifecycle, duplicate finalization prevention, and protocol stats
tracking.

These run against a lightweight GenVM stub (`contract/tests/conftest.py`) rather than a live
GenLayer node, so they verify the contract's deterministic logic and state machine, not real
validator consensus or the Equivalence Principle's cross-validator agreement — that requires a
running Studionet/localnet node and is the natural next step once a funded account is available,
via `gltest` (GenLayer's own consensus-aware contract-testing tool, installed but not yet run
against a live node from this environment).

**Frontend**: `npm run lint`, `npx tsc --noEmit`, and `npm run build` all pass. UI states were
verified manually in-browser: wallet-disconnected, no-contract-configured, empty states, a full
YES verdict dossier, and a full UNRESOLVED verdict dossier with its own non-error visual treatment.

### What changed in the contract-correctness pass

An initial draft of `pravax_resolver.py` was written against inferred GenLayer APIs before the
real `genvm-linter` and bundled `genlayer-test` example contracts (`intelligent_oracle.py`,
`football_prediction_market.py`) were available to verify against. Running `genvm-lint check`
against the real SDK and downloaded GenVM runner surfaced concrete errors, all now fixed:

- **Storage typing**: `dict[str, str]` fields (`E016`, 8 occurrences) → `TreeMap[str, str]`,
  GenVM's actual persistent map type. Container storage fields are auto-initialized empty by GenVM
  and must not be assigned in `__init__` (confirmed against the bundled oracle example).
- **Missing dependency header** (`W010`) → pinned
  `# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }` as the
  literal first line, resolved from the downloaded GenVM v0.2.16 runner index rather than using
  the `test`/`latest` aliases.
- **`_add_seconds` missing `self`** (`E022`) → GenVM's structural check requires every method,
  including `@staticmethod`s, to take `self`; converted to a plain instance method.
- **`strict_eq` on LLM output** (correctness bug, not a lint error) → switched to
  `gl.eq_principle.prompt_comparative` with an explicit principle string, per the spec's own
  requirement not to demand byte-exact validator agreement on natural-language fields. `strict_eq`
  would have caused near-constant spurious consensus failures in practice.
- **Manual ```json fence stripping** → replaced with `exec_prompt(task, response_format="json")`,
  which returns a parsed dict directly and removes a whole class of malformed-output bugs.
- **Raw HTTP fetch of evidence pages** (`gl.nondet.web.get(url).body`) → switched to
  `gl.nondet.web.render(url, mode="text")`, matching GenLayer's own oracle example; this renders
  pages browser-like and returns clean text instead of raw HTML markup, which matters a lot for
  real news/release pages and for staying inside prompt budget.
- **Dead/incorrect check in `submit_challenge`** (compared a verdict against the string
  `"FINAL_LOCKED"`, which the contract never produces) → replaced with a real check that a
  resolution exists before a challenge can be filed against it.
- **Deterministic error classification** added (`EXPECTED` / `EXTERNAL` / `LLM_ERROR` prefixes) so
  validation failures, unreachable sources, and malformed model output are distinguishable by
  callers instead of all raising a bare `Exception`.
- Test suite (`contract/tests/conftest.py`, `test_pravax_resolver.py`) updated to match: a fake
  `TreeMap`, an `Address`-realistic message stub, `prompt_comparative`, and a monkeypatchable
  `datetime.now()` so timing tests stay deterministic without depending on wall-clock time.

## Known limitations

- **Deployment was not performed from this environment** — the studionet address was supplied
  directly and independently verified with a live read call (see above), but this session never
  had a funded/signing account itself, so the deploy transaction, `resolve_market`'s live web/LLM
  path, and cross-validator Equivalence Principle behavior have not been exercised end-to-end from
  here yet.
- **No on-chain market index** — the contract is keyed by market id, not enumerable. `/markets`
  currently discovers markets through `get_user_markets`; global anonymous discovery requires the
  on-chain market-id index planned for the next contract deployment.
- **Wallet layer is intentionally minimal** — a direct `window.ethereum` hook rather than a full
  wagmi provider tree, since `genlayer-js` already owns chain switching (`client.connect()`) and
  transaction signing. `wagmi`/`viem`/`@tanstack/react-query` are installed and available if a
  fuller multi-wallet stack is wanted later.
- **No `gltest` integration run yet** — `genvm-lint` validates the contract loads correctly
  against the real SDK, and the direct pytest suite validates deterministic logic against a stub,
  but no test in this repo has exercised real multi-validator consensus (the Equivalence
  Principle actually reaching agreement across independent LLM calls) against a live
  Studionet/localnet node. That requires the funded account described above.
- **`datetime.now(timezone.utc)`** is used for `_now_iso()`, matching the pattern in GenLayer's own
  bundled `intelligent_oracle.py` example contract. This assumes GenVM patches `datetime.now()` to
  a consensus-safe value inside contract execution (as the official example relies on); this
  repo has not independently verified that patching against a live node.
