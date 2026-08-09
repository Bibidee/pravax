# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }
#
# PravaxResolver — GenLayer Intelligent Contract
#
# Evidence-native prediction market resolution protocol.
# Deterministic methods own state transitions and validation.
# `resolve_market` is the single non-deterministic entry point: it renders
# live public evidence and asks GenLayer validators to interpret the
# market's LOCKED resolution constitution against that evidence, reaching
# consensus via the Equivalence Principle. The contract never decides
# real-world truth itself — it only enforces the state machine around
# whatever the validators agree happened.

from genlayer import *

from datetime import datetime, timedelta, timezone
import json

# ---------------------------------------------------------------------------
# State machine
# ---------------------------------------------------------------------------
# DRAFT -> OPEN -> LOCKED -> AWAITING_RESOLUTION -> PROVISIONAL
#       -> CHALLENGE_WINDOW -> FINAL
# Exceptional: UNRESOLVED, INVALID, CANCELLED_BEFORE_LOCK
# UNRESOLVED is a genuine terminal state and must never collapse into NO.

VALID_OUTCOMES_MIN = 2
VALID_OUTCOMES_MAX = 6
CHALLENGE_WINDOW_SECONDS = 24 * 60 * 60
MAX_SOURCES_FETCHED = 6

# Deterministic error-code prefixes (see write-contract guidance): EXPECTED
# for ordinary validation failures a caller can act on, EXTERNAL for
# problems in third-party data (unreachable/empty source pages), LLM_ERROR
# for malformed or out-of-schema model output.
ERR_EXPECTED = "EXPECTED"
ERR_EXTERNAL = "EXTERNAL"
ERR_LLM = "LLM_ERROR"

VERDICTS = ("YES", "NO", "INVALID", "UNRESOLVED")

RESOLUTION_PROMPT_HEADER = """You are resolving a prediction market according to its LOCKED resolution constitution.

Do not decide what "should" count.
Decide what counts under the written rule.

Use the source hierarchy.
Distinguish event time from publication time.
Identify conflicting evidence.
Do not force a binary answer if the evidence or rule is materially insufficient.
Return only the required JSON schema."""

VERDICT_EQUIVALENCE_PRINCIPLE = (
    "The `verdict` field must match exactly. The material conclusion in "
    "`rule_interpretation` (what the rule was found to require) and the "
    "material conclusion drawn from the cited evidence must be equivalent "
    "in substance even if the wording differs. Differences in phrasing, "
    "ordering of evidence entries, or the exact text of `reasoning_summary` "
    "are not disagreements."
)


def _now_iso() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def _add_seconds_iso(iso_ts: str, seconds: int) -> str:
    dt = datetime.fromisoformat(iso_ts.replace("Z", "+00:00"))
    return (dt + timedelta(seconds=seconds)).astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def _fail(prefix: str, message: str) -> None:
    raise Exception(f"{prefix}: {message}")


def _require(condition: bool, message: str, prefix: str = ERR_EXPECTED) -> None:
    if not condition:
        _fail(prefix, message)


def _parse_json_object(raw: str, what: str) -> dict:
    try:
        data = json.loads(raw)
    except (ValueError, TypeError):
        _fail(ERR_EXPECTED, f"{what} is not valid JSON")
        return {}
    if not isinstance(data, dict):
        _fail(ERR_EXPECTED, f"{what} must be a JSON object")
    return data


def _validate_verdict_shape(parsed: dict) -> None:
    _require(isinstance(parsed, dict), "model response was not a JSON object", ERR_LLM)
    _require(parsed.get("verdict") in VERDICTS, "verdict missing or out of range", ERR_LLM)
    _require(isinstance(parsed.get("rule_interpretation"), str), "rule_interpretation missing", ERR_LLM)
    _require(isinstance(parsed.get("reasoning_summary"), str), "reasoning_summary missing", ERR_LLM)
    parsed.setdefault("evidence", [])
    parsed.setdefault("conflicts", [])
    parsed.setdefault("confidence", 0)


class PravaxResolver(gl.Contract):
    # canonical-JSON records keyed by id; container storage fields are
    # auto-initialized empty by GenVM and must not be reassigned in
    # __init__ (see genlayer's own intelligent-oracle example).
    markets: TreeMap[str, str]
    resolutions: TreeMap[str, str]
    challenges: TreeMap[str, str]  # market_id -> JSON array of challenge records
    positions: TreeMap[str, str]  # market_id -> JSON array of position records
    user_markets: TreeMap[str, str]  # lowercase address -> JSON array of market ids
    market_state: TreeMap[str, str]  # market_id -> state machine value
    resolved_flag: TreeMap[str, str]  # market_id -> "1" once finalized
    stats: TreeMap[str, str]  # single key "protocol" -> JSON stats blob

    def __init__(self):
        self.stats["protocol"] = json.dumps(
            {
                "markets_created": 0,
                "markets_locked": 0,
                "markets_resolved": 0,
                "markets_finalized": 0,
                "challenges_filed": 0,
            }
        )

    # ------------------------------------------------------------------
    # internal helpers
    # ------------------------------------------------------------------

    def _bump_stat(self, key: str) -> None:
        blob = json.loads(self.stats["protocol"])
        blob[key] = blob.get(key, 0) + 1
        self.stats["protocol"] = json.dumps(blob)

    def _track_user_market(self, user: str, market_id: str) -> None:
        key = user.lower()
        existing = json.loads(self.user_markets[key]) if key in self.user_markets else []
        if market_id not in existing:
            existing.append(market_id)
        self.user_markets[key] = json.dumps(existing)

    def _validate_constitution(self, market: dict) -> None:
        _require(isinstance(market.get("question"), str) and len(market["question"]) > 0, "question is required")
        outcomes = market.get("outcomes")
        _require(
            isinstance(outcomes, list) and VALID_OUTCOMES_MIN <= len(outcomes) <= VALID_OUTCOMES_MAX,
            f"outcomes must contain between {VALID_OUTCOMES_MIN} and {VALID_OUTCOMES_MAX} entries",
        )
        for field in ("close_at", "resolve_after", "event_deadline"):
            _require(isinstance(market.get(field), str) and len(market[field]) > 0, f"{field} is required")
        _require(market["resolve_after"] >= market["event_deadline"], "resolve_after must not precede event_deadline")
        _require(market["event_deadline"] >= market["close_at"], "event_deadline must not precede close_at")
        primary_sources = market.get("primary_sources")
        _require(
            isinstance(primary_sources, list) and len(primary_sources) > 0,
            "at least one primary source is required",
        )
        _require(isinstance(market.get("definition"), str) and len(market["definition"]) > 0, "definition is required")
        _require(
            isinstance(market.get("ambiguity_policy"), str) and len(market["ambiguity_policy"]) > 0,
            "ambiguity_policy is required",
        )
        _require(isinstance(market.get("invalid_if"), list), "invalid_if must be a list (may be empty)")
        harmful_terms = ("assassinat", "murder of", "death of", "kill ")
        lowered = market["question"].lower()
        _require(
            not any(term in lowered for term in harmful_terms),
            "harmful event framing is not permitted",
        )

    # ------------------------------------------------------------------
    # deterministic writes
    # ------------------------------------------------------------------

    @gl.public.write
    def create_market(self, market_id: str, market_json: str, constitution_hash: str) -> None:
        _require(len(market_id) > 0, "market_id is required")
        _require(market_id not in self.markets, "market_id already exists")
        _require(len(constitution_hash) > 0, "constitution_hash is required")

        market = _parse_json_object(market_json, "market_json")
        self._validate_constitution(market)

        creator = str(gl.message.sender_address)
        market["creator"] = creator
        market["constitution_hash"] = constitution_hash
        market["created_at"] = _now_iso()

        self.markets[market_id] = json.dumps(market, sort_keys=True)
        self.market_state[market_id] = "OPEN"
        self._track_user_market(creator, market_id)
        self._bump_stat("markets_created")

    @gl.public.write
    def lock_market(self, market_id: str) -> None:
        _require(market_id in self.markets, "unknown market_id")
        state = self.market_state.get(market_id, "")
        _require(state == "OPEN", f"market must be OPEN to lock (current: {state})")

        market = json.loads(self.markets[market_id])
        caller = str(gl.message.sender_address)
        _require(caller.lower() == market["creator"].lower(), "only the creator may lock the market")

        market["locked_at"] = _now_iso()
        self.markets[market_id] = json.dumps(market, sort_keys=True)
        self.market_state[market_id] = "LOCKED"
        self._bump_stat("markets_locked")

    @gl.public.write
    def record_position(self, position_id: str, market_id: str, position_json: str) -> None:
        _require(market_id in self.markets, "unknown market_id")
        state = self.market_state.get(market_id, "")
        _require(state == "OPEN", f"positions may only be recorded while OPEN (current: {state})")

        position = _parse_json_object(position_json, "position_json")
        _require(isinstance(position.get("outcome"), str), "outcome is required")
        _require(isinstance(position.get("amount"), (int, float)) and position["amount"] > 0, "amount must be positive")

        holder = str(gl.message.sender_address)
        position["position_id"] = position_id
        position["holder"] = holder
        position["recorded_at"] = _now_iso()

        existing = json.loads(self.positions[market_id]) if market_id in self.positions else []
        _require(all(p.get("position_id") != position_id for p in existing), "duplicate position_id")
        existing.append(position)
        self.positions[market_id] = json.dumps(existing)
        self._track_user_market(holder, market_id)

    @gl.public.write
    def submit_challenge(self, market_id: str, challenge_id: str, challenge_json: str) -> None:
        _require(market_id in self.markets, "unknown market_id")
        state = self.market_state.get(market_id, "")
        _require(state == "CHALLENGE_WINDOW", f"challenges are only accepted during CHALLENGE_WINDOW (current: {state})")

        challenge = _parse_json_object(challenge_json, "challenge_json")
        for field in ("challenged_verdict", "claimed_verdict", "disputed_rule", "explanation", "evidence_urls"):
            _require(field in challenge, f"{field} is required in challenge")
        _require(
            isinstance(challenge["evidence_urls"], list) and len(challenge["evidence_urls"]) > 0,
            "at least one counter-evidence URL is required",
        )
        _require(market_id in self.resolutions, "market has no provisional resolution to challenge")

        challenge["challenge_id"] = challenge_id
        challenge["challenger"] = str(gl.message.sender_address)
        challenge["submitted_at"] = _now_iso()

        existing = json.loads(self.challenges[market_id]) if market_id in self.challenges else []
        _require(all(c.get("challenge_id") != challenge_id for c in existing), "duplicate challenge_id")
        existing.append(challenge)
        self.challenges[market_id] = json.dumps(existing)
        self.market_state[market_id] = "CHALLENGED"
        self._bump_stat("challenges_filed")

    @gl.public.write
    def finalize_resolution(self, market_id: str) -> None:
        _require(market_id in self.markets, "unknown market_id")
        state = self.market_state.get(market_id, "")
        _require(
            state in ("CHALLENGE_WINDOW", "CHALLENGED"),
            f"market must have a provisional verdict awaiting finalization (current: {state})",
        )
        _require(market_id not in self.resolved_flag, "resolution already finalized")

        market = json.loads(self.markets[market_id])
        challenge_deadline = market.get("challenge_deadline")
        if state == "CHALLENGE_WINDOW" and challenge_deadline:
            _require(_now_iso() >= challenge_deadline, "challenge window has not yet closed")

        self.market_state[market_id] = "FINAL"
        self.resolved_flag[market_id] = "1"
        self._bump_stat("markets_finalized")

    # ------------------------------------------------------------------
    # non-deterministic resolution
    # ------------------------------------------------------------------

    @gl.public.write
    def resolve_market(self, market_id: str, resolution_payload_json: str) -> None:
        _require(market_id in self.markets, "unknown market_id")
        state = self.market_state.get(market_id, "")
        _require(state == "LOCKED", f"market must be LOCKED before resolution (current: {state})")

        market = json.loads(self.markets[market_id])
        resolve_after = market.get("resolve_after", "")
        _require(_now_iso() >= resolve_after, "resolution time has not been reached")

        payload = _parse_json_object(resolution_payload_json, "resolution_payload_json")
        constitution = payload.get("constitution", market)

        def nondet_resolution() -> dict:
            sources = list(constitution.get("primary_sources", [])) + list(constitution.get("secondary_sources", []))
            evidence_snippets = []
            for url in sources[:MAX_SOURCES_FETCHED]:
                try:
                    rendered_text = gl.nondet.web.render(url, mode="text")
                    evidence_snippets.append({"url": url, "excerpt": rendered_text[:6000]})
                except Exception as exc:
                    # An unreachable or empty source is itself evidence the
                    # model should weigh (e.g. against invalidation rules).
                    evidence_snippets.append({"url": url, "error": f"{ERR_EXTERNAL}: {exc}"})

            task = (
                RESOLUTION_PROMPT_HEADER
                + "\n\nRESOLUTION CONSTITUTION:\n"
                + json.dumps(constitution, sort_keys=True)
                + "\n\nRETRIEVED SOURCE MATERIAL:\n"
                + json.dumps(evidence_snippets)[:16000]
                + "\n\nRETURN A JSON OBJECT WITH EXACTLY THESE FIELDS:\n"
                + json.dumps(
                    {
                        "verdict": "YES | NO | INVALID | UNRESOLVED",
                        "confidence": 0,
                        "rule_interpretation": "string",
                        "evidence": [
                            {
                                "url": "string",
                                "source_role": "PRIMARY | SECONDARY",
                                "claim": "string",
                                "published_at": "string|null",
                                "event_time": "string|null",
                            }
                        ],
                        "conflicts": ["string"],
                        "reasoning_summary": "string",
                    }
                )
            )

            parsed = gl.nondet.exec_prompt(task, response_format="json")
            _validate_verdict_shape(parsed)
            parsed["resolved_at"] = _now_iso()
            return parsed

        verdict = gl.eq_principle.prompt_comparative(nondet_resolution, principle=VERDICT_EQUIVALENCE_PRINCIPLE)

        market["challenge_deadline"] = payload.get(
            "challenge_deadline_override", _add_seconds_iso(_now_iso(), CHALLENGE_WINDOW_SECONDS)
        )
        self.markets[market_id] = json.dumps(market, sort_keys=True)
        self.resolutions[market_id] = json.dumps(verdict, sort_keys=True)
        self.market_state[market_id] = "CHALLENGE_WINDOW"
        self._bump_stat("markets_resolved")

    @gl.public.write
    def review_challenge(self, market_id: str, review_payload_json: str) -> None:
        # Independent second GenLayer review triggered after a challenge is
        # filed: it sees the original constitution, provisional verdict,
        # original evidence, and challenger evidence together, and may
        # preserve or overturn the result.
        _require(market_id in self.markets, "unknown market_id")
        state = self.market_state.get(market_id, "")
        _require(state == "CHALLENGED", f"no open challenge to review (current: {state})")

        market = json.loads(self.markets[market_id])
        original_verdict = json.loads(self.resolutions[market_id])
        challenges = json.loads(self.challenges.get(market_id, "[]"))
        _require(len(challenges) > 0, "no challenge on record")
        latest_challenge = challenges[-1]

        payload = _parse_json_object(review_payload_json, "review_payload_json")

        def nondet_review() -> dict:
            task = (
                RESOLUTION_PROMPT_HEADER
                + "\n\nThis is an INDEPENDENT SECOND REVIEW of a challenged provisional verdict."
                + " You may preserve or change the verdict. Do not defer to the original verdict merely because it exists.\n\n"
                + "ORIGINAL CONSTITUTION:\n" + json.dumps(market, sort_keys=True)
                + "\n\nPROVISIONAL VERDICT:\n" + json.dumps(original_verdict, sort_keys=True)
                + "\n\nDISPUTED RULE:\n" + str(latest_challenge.get("disputed_rule"))
                + "\n\nCHALLENGER COUNTER-EVIDENCE URLS:\n" + json.dumps(latest_challenge.get("evidence_urls"))
                + "\n\nCHALLENGER EXPLANATION:\n" + str(latest_challenge.get("explanation"))
                + "\n\nADDITIONAL CONTEXT:\n" + json.dumps(payload)[:4000]
                + "\n\nRETURN A JSON OBJECT WITH THE SAME FIELDS AS THE ORIGINAL VERDICT."
            )
            parsed = gl.nondet.exec_prompt(task, response_format="json")
            _validate_verdict_shape(parsed)
            parsed["resolved_at"] = _now_iso()
            parsed["reviewed_challenge_id"] = latest_challenge.get("challenge_id")
            return parsed

        reviewed = gl.eq_principle.prompt_comparative(nondet_review, principle=VERDICT_EQUIVALENCE_PRINCIPLE)

        self.resolutions[market_id] = json.dumps(reviewed, sort_keys=True)
        self.market_state[market_id] = "CHALLENGE_WINDOW"

    # ------------------------------------------------------------------
    # views
    # ------------------------------------------------------------------

    @gl.public.view
    def get_market(self, market_id: str) -> str:
        if market_id not in self.markets:
            return json.dumps({"error": "not_found"})
        market = json.loads(self.markets[market_id])
        market["state"] = self.market_state.get(market_id, "UNKNOWN")
        return json.dumps(market, sort_keys=True)

    @gl.public.view
    def get_resolution(self, market_id: str) -> str:
        if market_id not in self.resolutions:
            return json.dumps({"error": "no_resolution_yet"})
        return self.resolutions[market_id]

    @gl.public.view
    def get_challenges(self, market_id: str) -> str:
        return self.challenges.get(market_id, "[]")

    @gl.public.view
    def get_positions(self, market_id: str) -> str:
        return self.positions.get(market_id, "[]")

    @gl.public.view
    def get_user_markets(self, user: str) -> str:
        return self.user_markets.get(user.lower(), "[]")

    @gl.public.view
    def get_protocol_stats(self) -> str:
        return self.stats["protocol"]
