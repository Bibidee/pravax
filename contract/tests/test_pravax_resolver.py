import json
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import conftest  # noqa: E402  (installs the genlayer stub before contract import)
import pravax_resolver  # noqa: E402
from pravax_resolver import PravaxResolver  # noqa: E402

conftest.install_fake_datetime(pravax_resolver)

CREATOR = "0xCREATOR000000000000000000000000000001"
PARTICIPANT = "0xPARTICIPANT0000000000000000000000002"
CHALLENGER = "0xCHALLENGER00000000000000000000000003"


def set_sender(addr: str) -> None:
    conftest._FakeMessage.sender_address = addr


def set_clock(iso: str) -> None:
    conftest.set_clock(iso)


def set_prompt_response(payload: dict) -> None:
    conftest._FakeNondet.prompt_response = payload


def valid_market(**overrides) -> dict:
    market = {
        "question": "Will Atlas publish stable v2.0 before 2026-12-01T00:00:00Z?",
        "outcomes": ["YES", "NO"],
        "close_at": "2026-11-25T00:00:00Z",
        "resolve_after": "2026-12-01T00:15:00Z",
        "event_deadline": "2026-12-01T00:00:00Z",
        "primary_sources": ["https://github.com/example/atlas/releases"],
        "secondary_sources": [],
        "definition": "Release means a public stable v2.0 release, not alpha/beta/RC.",
        "invalid_if": ["repository becomes permanently inaccessible before close"],
        "ambiguity_policy": "Return UNRESOLVED when evidence is insufficient or materially conflicting.",
    }
    market.update(overrides)
    return market


def new_contract():
    set_sender(CREATOR)
    set_clock("2026-01-01T00:00:00Z")
    return PravaxResolver()


def create_and_lock(contract, market_id="m1", **overrides):
    set_sender(CREATOR)
    contract.create_market(market_id, json.dumps(valid_market(**overrides)))
    contract.lock_market(market_id)
    return market_id


# ---------------------------------------------------------------------------
# creation validation
# ---------------------------------------------------------------------------


def test_create_market_success():
    c = new_contract()
    c.create_market("m1", json.dumps(valid_market()))
    market = json.loads(c.get_market("m1"))
    assert market["state"] == "OPEN"
    assert market["creator"].lower() == CREATOR.lower()
    assert "constitution_hash" not in market


def test_create_market_duplicate_id_rejected():
    c = new_contract()
    c.create_market("m1", json.dumps(valid_market()))
    try:
        c.create_market("m1", json.dumps(valid_market()))
        assert False, "expected duplicate rejection"
    except Exception as e:
        assert "already exists" in str(e)


def test_create_market_rejects_missing_deadline():
    c = new_contract()
    bad = valid_market()
    del bad["resolve_after"]
    try:
        c.create_market("m1", json.dumps(bad))
        assert False
    except Exception as e:
        assert "resolve_after" in str(e)


def test_create_market_rejects_empty_outcomes():
    c = new_contract()
    try:
        c.create_market("m1", json.dumps(valid_market(outcomes=[])))
        assert False
    except Exception as e:
        assert "outcomes" in str(e)


def test_create_market_rejects_impossible_source_policy():
    c = new_contract()
    try:
        c.create_market("m1", json.dumps(valid_market(primary_sources=[])))
        assert False
    except Exception as e:
        assert "primary source" in str(e)


def test_create_market_rejects_invalid_timestamps_and_source_urls():
    c = new_contract()
    for invalid in (valid_market(close_at="tomorrow"), valid_market(primary_sources=["file:///etc/passwd"])):
        try:
            c.create_market("m" + str(len(c.markets)), json.dumps(invalid))
            assert False
        except Exception as e:
            assert "ISO-8601" in str(e) or "http(s)" in str(e)


def test_create_market_rejects_harmful_framing():
    c = new_contract()
    try:
        c.create_market("m1", json.dumps(valid_market(question="Will the assassination of X happen?")))
        assert False
    except Exception as e:
        assert "harmful" in str(e)


def test_malformed_json_rejected():
    c = new_contract()
    try:
        c.create_market("m1", "{not valid json")
        assert False
    except Exception as e:
        assert "not valid JSON" in str(e)


def test_unauthorized_lock_rejected():
    c = new_contract()
    c.create_market("m1", json.dumps(valid_market()))
    set_sender(PARTICIPANT)
    try:
        c.lock_market("m1")
        assert False
    except Exception as e:
        assert "only the creator" in str(e)


# ---------------------------------------------------------------------------
# immutability + timing
# ---------------------------------------------------------------------------


def test_locked_constitution_is_immutable_snapshot():
    c = new_contract()
    market_id = create_and_lock(c)
    before = json.loads(c.get_market(market_id))
    # No mutation API exists post-lock; re-fetching must be stable.
    after = json.loads(c.get_market(market_id))
    assert before["question"] == after["question"]
    assert after["state"] == "LOCKED"


def test_cannot_resolve_before_resolution_time():
    c = new_contract()
    market_id = create_and_lock(c)
    set_clock("2026-11-30T00:00:00Z")  # before resolve_after
    conftest._FakeNondet.prompt_response = {"verdict": "YES", "confidence": 90, "reasoning_summary": "x"}
    try:
        c.resolve_market(market_id)
        assert False
    except Exception as e:
        assert "resolution time" in str(e)


def test_cannot_resolve_market_not_locked():
    c = new_contract()
    c.create_market("m1", json.dumps(valid_market()))
    set_clock("2026-12-02T00:00:00Z")
    try:
        c.resolve_market("m1")
        assert False
    except Exception as e:
        assert "LOCKED" in str(e)


# ---------------------------------------------------------------------------
# resolution outcomes
# ---------------------------------------------------------------------------


def _resolve_with(c, market_id, verdict_payload):
    conftest._FakeNondet.prompt_response = verdict_payload
    set_clock("2026-12-01T01:00:00Z")
    c.resolve_market(market_id)


def test_valid_yes_resolution():
    c = new_contract()
    market_id = create_and_lock(c)
    _resolve_with(
        c,
        market_id,
        {
            "verdict": "YES",
            "confidence": 95,
            "rule_interpretation": "stable release counts",
            "evidence": [],
            "conflicts": [],
            "reasoning_summary": "release tag found",
        },
    )
    resolution = json.loads(c.get_resolution(market_id))
    assert resolution["verdict"] == "YES"
    market = json.loads(c.get_market(market_id))
    assert market["state"] == "CHALLENGE_WINDOW"


def test_valid_no_resolution():
    c = new_contract()
    market_id = create_and_lock(c)
    _resolve_with(c, market_id, {"verdict": "NO", "confidence": 80, "rule_interpretation": "x", "evidence": [], "conflicts": [], "reasoning_summary": "x"})
    assert json.loads(c.get_resolution(market_id))["verdict"] == "NO"


def test_conflicting_evidence_yields_unresolved():
    c = new_contract()
    market_id = create_and_lock(c)
    _resolve_with(
        c,
        market_id,
        {
            "verdict": "UNRESOLVED",
            "confidence": 40,
            "rule_interpretation": "ambiguous",
            "evidence": [],
            "conflicts": ["source A says released, source B says delayed"],
            "reasoning_summary": "conflicting reports",
        },
    )
    resolution = json.loads(c.get_resolution(market_id))
    assert resolution["verdict"] == "UNRESOLVED"


def test_invalidation_condition_yields_invalid():
    c = new_contract()
    market_id = create_and_lock(c)
    _resolve_with(c, market_id, {"verdict": "INVALID", "confidence": 70, "rule_interpretation": "repo deleted", "evidence": [], "conflicts": [], "reasoning_summary": "x"})
    assert json.loads(c.get_resolution(market_id))["verdict"] == "INVALID"


def test_duplicate_resolution_prevented():
    c = new_contract()
    market_id = create_and_lock(c)
    _resolve_with(c, market_id, {"verdict": "YES", "confidence": 90, "rule_interpretation": "x", "evidence": [], "conflicts": [], "reasoning_summary": "x"})
    try:
        c.resolve_market(market_id)
        assert False
    except Exception as e:
        assert "LOCKED" in str(e)


def test_resolution_uses_only_the_stored_constitution_and_fixed_deadline():
    c = new_contract()
    market_id = create_and_lock(c)
    conftest._FakeNondet.prompt_response = {"verdict": "YES", "confidence": 90, "rule_interpretation": "x", "evidence": [], "conflicts": [], "reasoning_summary": "x"}
    set_clock("2026-12-01T01:00:00Z")
    c.resolve_market(market_id)
    market = json.loads(c.get_market(market_id))
    assert market["challenge_deadline"] == "2026-12-02T01:00:00Z"
    assert "github.com/example/atlas/releases" in conftest._FakeNondet.last_task
    assert "attacker.example" not in conftest._FakeNondet.last_task


# ---------------------------------------------------------------------------
# challenge lifecycle
# ---------------------------------------------------------------------------


def test_challenge_lifecycle_and_review():
    c = new_contract()
    market_id = create_and_lock(c)
    _resolve_with(c, market_id, {"verdict": "NO", "confidence": 60, "rule_interpretation": "no evidence found", "evidence": [], "conflicts": [], "reasoning_summary": "x"})

    set_sender(CHALLENGER)
    c.submit_challenge(
        market_id,
        "ch1",
        json.dumps(
            {
                "challenged_verdict": "NO",
                "claimed_verdict": "YES",
                "disputed_rule": "definition of stable release",
                "explanation": "release was published under a different tag",
                "evidence_urls": ["https://github.com/example/atlas/releases/tag/v2.0.0"],
            }
        ),
    )
    assert json.loads(c.get_market(market_id))["state"] == "CHALLENGED"
    assert len(json.loads(c.get_challenges(market_id))) == 1

    conftest._FakeNondet.prompt_response = {
        "verdict": "YES",
        "confidence": 88,
        "rule_interpretation": "tag counts as stable release",
        "evidence": [],
        "conflicts": [],
        "reasoning_summary": "reviewed challenger evidence",
    }
    c.review_challenge(market_id)
    resolution = json.loads(c.get_resolution(market_id))
    assert resolution["verdict"] == "YES"
    assert json.loads(c.get_market(market_id))["state"] == "CHALLENGE_WINDOW"


def test_challenge_requires_counter_evidence():
    c = new_contract()
    market_id = create_and_lock(c)
    _resolve_with(c, market_id, {"verdict": "NO", "confidence": 60, "rule_interpretation": "x", "evidence": [], "conflicts": [], "reasoning_summary": "x"})
    set_sender(CHALLENGER)
    try:
        c.submit_challenge(
            market_id,
            "ch1",
            json.dumps(
                {
                    "challenged_verdict": "NO",
                    "claimed_verdict": "YES",
                    "disputed_rule": "x",
                    "explanation": "x",
                    "evidence_urls": [],
                }
            ),
        )
        assert False
    except Exception as e:
        assert "counter-evidence" in str(e)


def test_challenge_after_deadline_and_finalizing_a_challenge_are_rejected():
    c = new_contract()
    market_id = create_and_lock(c)
    _resolve_with(c, market_id, {"verdict": "NO", "confidence": 60, "rule_interpretation": "x", "evidence": [], "conflicts": [], "reasoning_summary": "x"})
    market = json.loads(c.get_market(market_id))
    set_clock(market["challenge_deadline"])
    set_sender(CHALLENGER)
    payload = {"challenged_verdict": "NO", "claimed_verdict": "YES", "disputed_rule": "x", "explanation": "x", "evidence_urls": ["https://example.com/evidence"]}
    try:
        c.submit_challenge(market_id, "late", json.dumps(payload))
        assert False
    except Exception as e:
        assert "closed" in str(e)

    set_clock("2026-12-01T02:00:00Z")
    c.submit_challenge(market_id, "timely", json.dumps(payload))
    try:
        c.finalize_resolution(market_id)
        assert False
    except Exception as e:
        assert "CHALLENGED" in str(e)


def test_review_fetches_counter_evidence_and_opens_a_new_window():
    c = new_contract()
    market_id = create_and_lock(c)
    _resolve_with(c, market_id, {"verdict": "NO", "confidence": 60, "rule_interpretation": "x", "evidence": [], "conflicts": [], "reasoning_summary": "x"})
    set_sender(CHALLENGER)
    url = "https://example.com/evidence"
    c.submit_challenge(market_id, "ch1", json.dumps({"challenged_verdict": "NO", "claimed_verdict": "YES", "disputed_rule": "x", "explanation": "x", "evidence_urls": [url]}))
    conftest._FakeNondetWeb.responses[url] = "Counter evidence contents"
    conftest._FakeNondet.prompt_response = {"verdict": "YES", "confidence": 88, "rule_interpretation": "x", "evidence": [], "conflicts": [], "reasoning_summary": "x"}
    c.review_challenge(market_id)
    assert "Counter evidence contents" in conftest._FakeNondet.last_task
    assert json.loads(c.get_market(market_id))["challenge_deadline"] == "2026-12-02T01:00:00Z"


# ---------------------------------------------------------------------------
# finalization
# ---------------------------------------------------------------------------


def test_finalize_after_challenge_window():
    c = new_contract()
    market_id = create_and_lock(c)
    _resolve_with(c, market_id, {"verdict": "YES", "confidence": 95, "rule_interpretation": "x", "evidence": [], "conflicts": [], "reasoning_summary": "x"})
    market = json.loads(c.get_market(market_id))
    set_clock(market["challenge_deadline"])
    c.finalize_resolution(market_id)
    assert json.loads(c.get_market(market_id))["state"] == "FINAL"


def test_finalize_before_challenge_window_closes_rejected():
    c = new_contract()
    market_id = create_and_lock(c)
    _resolve_with(c, market_id, {"verdict": "YES", "confidence": 95, "rule_interpretation": "x", "evidence": [], "conflicts": [], "reasoning_summary": "x"})
    set_clock("2026-12-01T01:30:00Z")  # well before the 24h challenge window closes
    try:
        c.finalize_resolution(market_id)
        assert False
    except Exception as e:
        assert "challenge window" in str(e)


def test_duplicate_finalization_prevented():
    c = new_contract()
    market_id = create_and_lock(c)
    _resolve_with(c, market_id, {"verdict": "YES", "confidence": 95, "rule_interpretation": "x", "evidence": [], "conflicts": [], "reasoning_summary": "x"})
    market = json.loads(c.get_market(market_id))
    set_clock(market["challenge_deadline"])
    c.finalize_resolution(market_id)
    try:
        c.finalize_resolution(market_id)
        assert False
    except Exception as e:
        assert "FINAL" in str(e) or "already finalized" in str(e)


def test_unauthorized_position_mutation_rejected_after_lock():
    c = new_contract()
    market_id = create_and_lock(c)
    set_sender(PARTICIPANT)
    try:
        c.record_position("p1", market_id, json.dumps({"outcome": "YES", "amount": 10}))
        assert False, "positions should not be recordable once locked"
    except Exception as e:
        assert "OPEN" in str(e)


def test_record_position_while_open():
    c = new_contract()
    c.create_market("m1", json.dumps(valid_market()))
    set_sender(PARTICIPANT)
    c.record_position("p1", "m1", json.dumps({"outcome": "YES", "amount": 25}))
    positions = json.loads(c.get_positions("m1"))
    assert len(positions) == 1
    assert positions[0]["holder"].lower() == PARTICIPANT.lower()


def test_position_rejects_unknown_outcomes_and_non_finite_amounts():
    c = new_contract()
    c.create_market("m1", json.dumps(valid_market()))
    set_sender(PARTICIPANT)
    for payload in ({"outcome": "MAYBE", "amount": 1}, {"outcome": "YES", "amount": True}):
        try:
            c.record_position("p" + str(len(c.get_positions("m1"))), "m1", json.dumps(payload))
            assert False
        except Exception as e:
            assert "outcome" in str(e) or "positive" in str(e)


def test_protocol_stats_track_lifecycle():
    c = new_contract()
    market_id = create_and_lock(c)
    _resolve_with(c, market_id, {"verdict": "YES", "confidence": 95, "rule_interpretation": "x", "evidence": [], "conflicts": [], "reasoning_summary": "x"})
    market = json.loads(c.get_market(market_id))
    set_clock(market["challenge_deadline"])
    c.finalize_resolution(market_id)
    stats = json.loads(c.get_protocol_stats())
    assert stats["markets_created"] == 1
    assert stats["markets_locked"] == 1
    assert stats["markets_resolved"] == 1
    assert stats["markets_finalized"] == 1
