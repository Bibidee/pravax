"""Direct Mode compatibility helpers.

The current genlayer-test loader unlinks its stdin tempfile while Windows still
holds the duplicated handle. Keep the official plugin/fixtures, but use a
Windows-safe equivalent for message injection.
"""

import os
import tempfile

import gltest.direct.loader as loader


def _windows_safe_inject(vm):
    try:
        from genlayer.py import calldata
        from genlayer.py.types import Address
    except ImportError:
        return

    def address(value):
        return Address(value) if isinstance(value, bytes) else value

    message_data = {
        "contract_address": address(vm._contract_address),
        "sender_address": address(vm.sender),
        "origin_address": address(vm.origin),
        "stack": [],
        "value": vm._value,
        "datetime": vm._datetime,
        "is_init": False,
        "chain_id": vm._chain_id,
        "entry_kind": 0,
        "entry_data": b"",
        "entry_stage_data": None,
    }
    encoded = calldata.encode(message_data)
    fd, path = tempfile.mkstemp()
    os.write(fd, encoded)
    os.lseek(fd, 0, os.SEEK_SET)
    vm._original_stdin_fd = os.dup(0)
    os.dup2(fd, 0)
    os.close(fd)
    # Do not unlink here: Windows keeps the duplicated stdin handle open until
    # the contract loader restores it.


if os.name == "nt":
    loader._inject_message_to_fd0 = _windows_safe_inject
