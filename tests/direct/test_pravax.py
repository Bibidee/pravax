import json
from datetime import datetime, timedelta, timezone


def market(close_at: str) -> dict:
    return {
        "question": "Will Atlas publish stable v2.0 before the deadline?",
        "outcomes": ["YES", "NO"],
        "close_at": close_at,
        "event_deadline": "2026-12-01T00:00:00Z",
        "resolve_after": "2026-12-01T00:15:00Z",
        "primary_sources": ["https://example.com/primary"],
        "secondary_sources": [],
        "definition": "A stable release is a public stable v2.0 release.",
        "invalid_if": [],
        "ambiguity_policy": "Return UNRESOLVED when evidence is insufficient.",
    }


def test_direct_binary_market_and_global_index(direct_vm, direct_deploy):
    contract = direct_deploy("contract/pravax_resolver.py")
    direct_vm.sender = "0x0000000000000000000000000000000000000001"
    contract.create_market("m1", json.dumps(market("2026-11-25T00:00:00Z")))
    assert json.loads(contract.get_market_ids(0, 10)) == ["m1"]
    assert json.loads(contract.get_market("m1"))["outcomes"] == ["YES", "NO"]


def test_direct_position_boundary_is_closed_at_close(direct_vm, direct_deploy):
    contract = direct_deploy("contract/pravax_resolver.py")
    direct_vm.sender = "0x0000000000000000000000000000000000000001"
    contract.create_market("m1", json.dumps(market("2026-11-25T00:00:00Z")))
    direct_vm._datetime = "2026-11-25T00:00:00Z"
    try:
        contract.record_position("p1", "m1", json.dumps({"outcome": "YES", "amount": 1}))
        assert False
    except Exception as exc:
        assert "closed" in str(exc)
