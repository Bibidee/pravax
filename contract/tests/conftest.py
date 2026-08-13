# Lightweight GenVM stub for logic-level unit testing.
#
# The real GenLayer runtime (GenVM / genlayer-studio) provides `gl.Contract`,
# non-deterministic web/LLM primitives, and the Equivalence Principle
# consensus mechanism. Those require a running Studionet/localnet node and
# are exercised separately via `gltest` integration tests (see README).
#
# This stub exists so PravaxResolver's deterministic state-machine logic —
# validation, locking, challenge lifecycle, finalization — can be unit
# tested in plain pytest without a live GenLayer node. Non-deterministic
# methods (`resolve_market`, `review_challenge`) are monkeypatched per-test
# to return fixed evidence/verdicts instead of hitting the real web/LLM.

import sys
import types
import datetime as _real_datetime_module


class _FakeMessage:
    sender_address = "0xCREATOR000000000000000000000000000001"
    value = 25


class _FakeNondetWeb:
    responses = {}

    @staticmethod
    def render(url, mode="text"):
        return _FakeNondetWeb.responses.get(url, "")


class _FakeNondet:
    """Overridden per-test via monkeypatch to control web/LLM output."""

    web = _FakeNondetWeb
    prompt_response = None
    last_task = None

    @staticmethod
    def exec_prompt(task: str, response_format: str = "text"):
        _FakeNondet.last_task = task
        if _FakeNondet.prompt_response is None:
            raise RuntimeError("prompt_response not configured for this test")
        return _FakeNondet.prompt_response


class _FakeEqPrinciple:
    @staticmethod
    def strict_eq(fn):
        return fn()

    @staticmethod
    def prompt_comparative(fn, principle: str = ""):
        return fn()


class _PublicNamespace:
    class _Write:
        def __call__(self, fn):
            return fn

        @staticmethod
        def payable(fn):
            return fn

    write = _Write()

    @staticmethod
    def view(fn):
        return fn


class _FakeEvm:
    @staticmethod
    def contract_interface(cls):
        return cls


class _FakeEOA:
    transfers = []

    def __init__(self, address):
        self.address = address

    def emit_transfer(self, value):
        self.transfers.append((str(self.address), int(value)))


class _FakeAddress(str):
    pass


class _FakeVm:
    class UserError(Exception):
        pass

    @staticmethod
    def view(fn):
        return fn


class _FakeTreeMap(dict):
    """Plain-dict stand-in for GenVM's persistent TreeMap[K, V]."""


class _FakeContract:
    """Minimal stand-in for gl.Contract.

    Real GenVM auto-initializes annotated container storage fields (TreeMap,
    DynArray) to empty before the user's __init__ runs, which is why
    contracts never assign them explicitly. This stub reproduces just that
    behavior so PravaxResolver's __init__ (which only touches `self.stats`)
    works the same way here as it will on-chain.
    """

    def __init_subclass__(cls, **kwargs):
        super().__init_subclass__(**kwargs)
        original_init = cls.__init__

        def patched_init(self, *args, **kw):
            for name, annotation in getattr(cls, "__annotations__", {}).items():
                if getattr(annotation, "__origin__", None) is _FakeTreeMap or annotation is _FakeTreeMap:
                    setattr(self, name, _FakeTreeMap())
            original_init(self, *args, **kw)

        cls.__init__ = patched_init


gl_module = types.ModuleType("genlayer")
gl_ns = types.SimpleNamespace(
    Contract=_FakeContract,
    public=_PublicNamespace,
    evm=_FakeEvm,
    vm=_FakeVm,
    message=_FakeMessage,
    nondet=_FakeNondet,
    eq_principle=_FakeEqPrinciple,
)
gl_module.gl = gl_ns
gl_module.TreeMap = _FakeTreeMap
gl_module.u256 = int
gl_module.Address = _FakeAddress
gl_module._EOA = _FakeEOA
gl_module.__all__ = ["gl", "TreeMap", "u256", "Address"]

sys.modules["genlayer"] = gl_module


class _FakeClock:
    now_iso = "2026-01-01T00:00:00Z"


class _FakeDateTime(_real_datetime_module.datetime):
    """Subclass of the real datetime so fromisoformat/timedelta arithmetic
    in the contract keeps working; only `now()` is overridden to return the
    test-controlled instant."""

    @classmethod
    def now(cls, tz=None):
        real = _real_datetime_module.datetime.fromisoformat(
            _FakeClock.now_iso.replace("Z", "+00:00")
        )
        return real.astimezone(tz) if tz else real


def set_clock(iso: str) -> None:
    _FakeClock.now_iso = iso


def install_fake_datetime(contract_module) -> None:
    contract_module.datetime = _FakeDateTime
