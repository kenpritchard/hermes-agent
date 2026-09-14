"""Launcher identity stays stable across wall-clock corrections and fails closed when untrusted."""

from pathlib import Path

import pytest

from tools.bot_desktop import runtime


BOOT = "b84a8fe8-10eb-42f8-960b-2a925f41aa8e"
OTHER_BOOT = "15d2e32f-8615-445b-99f4-dd9207118484"
PID, TICKS = 524, 1961357


def _stat(comm="bash", state="S", ticks=str(TICKS)):
    # fields 3 (state) through 22 (starttime), followed by the remaining kernel fields
    return f"{PID} ({comm}) " + " ".join([state, *(["0"] * 18), ticks, *(["0"] * 30)])


@pytest.fixture
def identity(tmp_path, monkeypatch):
    sd = tmp_path / "screen"
    sd.mkdir()
    proc = tmp_path / "proc"
    boot = proc / "sys/kernel/random/boot_id"
    boot.parent.mkdir(parents=True)
    boot.write_text(BOOT, encoding="ascii")
    stat = proc / str(PID) / "stat"
    stat.parent.mkdir()
    stat.write_text(_stat(), encoding="utf-8")
    (sd / "launcher.pid").write_text(f"{PID} {TICKS} {BOOT}", encoding="ascii")
    (sd / "env").write_text("DISPLAY=:42\n", encoding="ascii")
    (sd / "rfb.sock").touch()
    monkeypatch.setattr(runtime, "state_dir", lambda: sd)
    monkeypatch.setattr(runtime, "_PROC", proc)
    monkeypatch.setattr(runtime, "missing_binaries", lambda: [])
    return sd, stat, boot


@pytest.mark.parametrize("comm", ["bash", "has spaces", "a (b) c", "a) S 0 (b))", "("])
def test_identity_ignores_epoch_and_comm_but_rejects_reuse_and_zombies(identity, monkeypatch, comm):
    import psutil

    sd, stat, boot = identity
    stat.write_text(_stat(comm), encoding="utf-8")
    for epoch in (1789399185.57, 1789399202.57, 1789399220.57):
        monkeypatch.setattr(psutil, "boot_time", lambda: epoch - TICKS / 100)
        monkeypatch.setattr(psutil.Process, "create_time", lambda self: epoch)
        assert runtime._launcher_pid() == PID
        assert runtime.published_env() == {"DISPLAY": ":42"}
        assert runtime.rfb_socket_path() == sd / "rfb.sock"
    stat.write_text(_stat(comm, ticks=str(TICKS + 1)), encoding="utf-8")
    assert runtime._launcher_pid() is None
    assert runtime._recorded_launcher_pid() is None, "a reused PID is not an orphan group identity"
    for state in ("Z", "X", "x"):
        stat.write_text(_stat(comm, state), encoding="utf-8")
        assert runtime._launcher_pid() is None
        assert runtime._recorded_launcher_pid() == PID
    stat.unlink()
    stat.parent.rmdir()  # a genuinely departed launcher still permits same-boot orphan cleanup
    assert runtime._launcher_pid(strict=True) is None
    assert runtime._recorded_launcher_pid() == PID


@pytest.mark.linux_only
@pytest.mark.parametrize("damage", [
    "pid-only", "epoch", "epoch-integer", "empty", "extra-field", "bad-pid", "huge-pid",
    "negative-ticks", "fractional-ticks", "nonascii", "reboot", "bad-boot", "missing-boot",
    "missing-proc", "missing-stat", "denied-stat", "denied-record", "truncated-stat", "bad-comm",
    "wrong-pid", "bad-state", "bad-ticks", "binary-stat",
])
def test_unknown_identity_never_adopts_signals_spawns_or_discards_state(identity, monkeypatch, damage):
    sd, stat, boot = identity
    record = sd / "launcher.pid"
    bad_records = {
        "pid-only": str(PID), "epoch": f"{PID} 1789399185.57", "epoch-integer": f"{PID} 1789399185",
        "empty": "", "extra-field": f"{PID} {TICKS} {BOOT} extra", "bad-pid": f"0 {TICKS} {BOOT}",
        "huge-pid": f"{'9' * 40} {TICKS} {BOOT}", "negative-ticks": f"{PID} -1 {BOOT}",
        "fractional-ticks": f"{PID} 1.5 {BOOT}", "nonascii": "\ufffd",
    }
    bad_stats = {
        "truncated-stat": f"{PID} (a (b)) S 0", "bad-comm": _stat().replace("(bash)", "bash"),
        "wrong-pid": _stat().replace(str(PID), "525", 1), "bad-state": _stat(state="?"),
        "bad-ticks": _stat(ticks="1.5"),
    }
    if damage in bad_records:
        record.write_text(bad_records[damage], encoding="utf-8")
    elif damage in bad_stats:
        stat.write_text(bad_stats[damage], encoding="utf-8")
    elif damage == "reboot":
        boot.write_text(OTHER_BOOT, encoding="ascii")
    elif damage == "bad-boot":
        boot.write_text("not-a-boot-id", encoding="ascii")
    elif damage == "missing-boot":
        boot.unlink()
    elif damage == "missing-proc":
        monkeypatch.setattr(runtime, "_PROC", stat.parent / "unmounted")
    elif damage == "missing-stat":
        stat.unlink()  # PID directory remains: unavailable, not proven dead
    elif damage == "binary-stat":
        stat.write_bytes(b"\xff")
    else:
        denied = stat if damage == "denied-stat" else record
        read_text = Path.read_text

        def read(path, *args, **kwargs):
            if path == denied:
                raise PermissionError("test denied read")
            return read_text(path, *args, **kwargs)

        monkeypatch.setattr(Path, "read_text", read)

    def forbidden(*args, **kwargs):
        pytest.fail("unknown identity reached a spawn/signal path")

    monkeypatch.setattr(runtime, "_kill_group_then_wait", forbidden)
    monkeypatch.setattr(runtime, "_spawn_and_wait", forbidden)
    before = {p.name: p.read_bytes() for p in sd.iterdir()}
    assert runtime._launcher_pid() is None
    assert runtime._recorded_launcher_pid() is None
    assert runtime.published_env() == {}
    assert runtime.rfb_socket_path() is None
    for action in (runtime.start, runtime.stop, lambda: runtime._reap_orphaned_server(sd)):
        with pytest.raises(RuntimeError, match="archive generated bot-desktop state"):
            action()
    assert {name: (sd / name).read_bytes() for name in before} == before
