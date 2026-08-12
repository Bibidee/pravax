import os

import pytest


pytestmark = pytest.mark.integration


@pytest.mark.skipif(
    not os.getenv("PRAVAX_RUN_INTEGRATION"),
    reason="set PRAVAX_RUN_INTEGRATION=1 with a configured GenLayer network to run live integration checks",
)
def test_live_integration_requires_explicit_network_configuration():
    """Reserved live-network gate; Direct Mode remains the deterministic default."""
    assert os.getenv("PRAVAX_CONTRACT_ADDRESS"), "PRAVAX_CONTRACT_ADDRESS is required"
