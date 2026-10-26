from __future__ import annotations

import json
import os
import sys
import time
from datetime import datetime, timezone, timedelta
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from unittest.mock import MagicMock, patch

import httpx
import pytest

from app import (
    CRITICAL_SERVICES,
    IDLE_SEC,
    LUMINARIES,
    RECENT_SEC,
    SATELLITES,
    _check_error_log,
    _cron_count,
    _file_size,
    _iso,
    _parse_iso_ts,
    _parse_systemd_timestamp,
    _systemd,
    app,
    collect,
    collect_vps_telemetry,
    derive_status,
    derive_tasks,
    running_profiles,
)


# ---------------------------------------------------------------------------
# Unit tests: derive_status
# ---------------------------------------------------------------------------

def test_derive_status_unknown_when_no_log():
    assert derive_status(has_proc=False, log_age=None, err_age=None) == "unknown"
    assert derive_status(has_proc=False, log_age=None, err_age=10.0, has_error=True) == "unknown"


def test_derive_status_running_preempts_ages():
    assert derive_status(has_proc=True, log_age=None) == "running"
    assert derive_status(has_proc=True, log_age=5.0) == "running"
    assert derive_status(has_proc=True, log_age=500.0, err_age=10.0, has_error=True) == "running"


def test_derive_status_fatal_error_active():
    log_age = 300.0
    err_age = 50.0
    assert derive_status(has_proc=False, log_age=log_age, err_age=err_age, has_error=True) == "error"


def test_derive_status_ignores_warning_even_if_newer():
    log_age = 300.0
    err_age = 50.0
    assert derive_status(has_proc=False, log_age=log_age, err_age=err_age, has_error=False) == "recent"


def test_derive_status_recovered_after_error():
    log_age = 50.0
    err_age = 300.0
    assert derive_status(has_proc=False, log_age=log_age, err_age=err_age, has_error=True) == "recent"


def test_derive_status_expired_error():
    log_age = IDLE_SEC + 1000.0
    err_age = 500.0
    assert derive_status(has_proc=False, log_age=log_age, err_age=err_age, has_error=True) == "stale"


def test_derive_status_threshold_buckets():
    assert derive_status(has_proc=False, log_age=0.0) == "recent"
    assert derive_status(has_proc=False, log_age=RECENT_SEC) == "recent"
    assert derive_status(has_proc=False, log_age=RECENT_SEC + 1.0) == "idle"
    assert derive_status(has_proc=False, log_age=IDLE_SEC) == "idle"
    assert derive_status(has_proc=False, log_age=IDLE_SEC + 1.0) == "stale"


# ---------------------------------------------------------------------------
# Unit tests: _parse_systemd_timestamp & _parse_iso_ts
# ---------------------------------------------------------------------------

def test_parse_systemd_timestamp_valid_formats():
    parsed_wib = _parse_systemd_timestamp("Tue 2026-10-20 14:22:06 WIB")
    assert parsed_wib is not None
    assert parsed_wib.endswith("+00:00")

    parsed_iso = _parse_systemd_timestamp("2026-10-20T07:22:06Z")
    assert parsed_iso == "2026-10-20T07:22:06+00:00"

    parsed_date_time = _parse_systemd_timestamp("2026-10-20 07:22:06")
    assert parsed_date_time is not None
    assert parsed_date_time.endswith("+00:00")


def test_parse_systemd_timestamp_invalid():
    assert _parse_systemd_timestamp("n/a") is None
    assert _parse_systemd_timestamp("N/A") is None
    assert _parse_systemd_timestamp("0") is None
    assert _parse_systemd_timestamp(None) is None
    assert _parse_systemd_timestamp("") is None
    assert _parse_systemd_timestamp("invalid garbage date") is None


def test_parse_iso_ts_valid_and_invalid():
    dt = _parse_iso_ts("2026-10-20T22:40:19.274982+07:00")
    assert dt is not None
    assert dt.tzinfo is not None

    # Invalid cases must safely return None without throwing
    assert _parse_iso_ts("now") is None
    assert _parse_iso_ts("unknown") is None
    assert _parse_iso_ts("") is None
    assert _parse_iso_ts(None) is None
    assert _parse_iso_ts("not a timestamp") is None


# ---------------------------------------------------------------------------
# Unit tests: _check_error_log
# ---------------------------------------------------------------------------

def test_check_error_log_missing_and_empty(tmp_path: Path):
    missing_file = tmp_path / "errors.log"
    assert _check_error_log(missing_file) == (False, None)

    empty_file = tmp_path / "empty_errors.log"
    empty_file.write_text("")
    assert _check_error_log(empty_file) == (False, None)


def test_check_error_log_warning_only(tmp_path: Path):
    log_file = tmp_path / "warn.log"
    log_file.write_text(
        "2026-10-20 01:35:12,753 WARNING cli: Background MCP discovery previously exited with no connected servers\n"
        "2026-10-20 01:36:00,100 WARNING adapter: Polling heartbeat retry\n"
    )
    has_err, tail = _check_error_log(log_file)
    assert has_err is False
    assert "Polling heartbeat retry" in tail


def test_check_error_log_tool_execution_warning(tmp_path: Path):
    log_file = tmp_path / "tool_warn.log"
    log_file.write_text(
        '2026-10-20 12:12:57,474 WARNING [session_id] agent.tool_executor: '
        'Tool terminal returned error (0.07s): {"output": "fatal: not a git repo", "exit_code": 128}\n'
    )
    has_err, tail = _check_error_log(log_file)
    assert has_err is False
    assert "exit_code" in tail


def test_check_error_log_fatal_error(tmp_path: Path):
    log_file = tmp_path / "fatal.log"
    log_file.write_text(
        "2026-10-20 01:35:12,753 WARNING cli: Background MCP discovery\n"
        "2026-10-20 02:00:00,000 ERROR agent.conversation: Model protocol failure 500\n"
    )
    has_err, tail = _check_error_log(log_file)
    assert has_err is True
    assert "Model protocol failure 500" in tail


def test_check_error_log_unhandled_traceback(tmp_path: Path):
    log_file = tmp_path / "traceback.log"
    log_file.write_text(
        "2026-10-20 01:35:12,753 WARNING cli: ok\n"
        "Traceback (most recent call last):\n"
        '  File "app.py", line 42, in run\n'
        "RuntimeError: connection lost\n"
    )
    has_err, tail = _check_error_log(log_file)
    assert has_err is True
    assert "RuntimeError: connection lost" in tail


# ---------------------------------------------------------------------------
# Unit tests: _file_size
# ---------------------------------------------------------------------------

def test_file_size_safety(tmp_path: Path):
    f = tmp_path / "sample.txt"
    f.write_text("hello solaris")
    assert _file_size(f) == len("hello solaris")
    assert _file_size(tmp_path / "nonexistent.log") is None


# ---------------------------------------------------------------------------
# Unit tests: running_profiles
# ---------------------------------------------------------------------------

def test_running_profiles_detection(tmp_path: Path):
    fake_proc = tmp_path / "proc"
    fake_proc.mkdir()

    p1 = fake_proc / "101"
    p1.mkdir()
    (p1 / "cmdline").write_bytes(
        b"/usr/bin/python3\0-I\0-c\0import sys; sys.exit()\0-p\0daemon\0chat\0"
    )

    p2 = fake_proc / "102"
    p2.mkdir()
    (p2 / "cmdline").write_bytes(
        b"/home/user/.local/bin/hermes\0--profile\0sage\0chat\0"
    )

    p3 = fake_proc / "103"
    p3.mkdir()
    (p3 / "cmdline").write_bytes(
        b"/usr/bin/hermes\0--profile=iris\0run\0"
    )

    p4 = fake_proc / "104"
    p4.mkdir()
    (p4 / "cmdline").write_bytes(
        b"/bin/bash\0-lic\0set +m; cd /workspace && hermes -p daemon chat\0"
    )

    p5 = fake_proc / "105"
    p5.mkdir()
    (p5 / "cmdline").write_bytes(
        b"/usr/bin/python3\0worker.py\0-p\0daemon\0"
    )

    p_me = fake_proc / str(os.getpid())
    p_me.mkdir()
    (p_me / "cmdline").write_bytes(
        b"/usr/bin/hermes\0-p\0daemon\0"
    )

    with patch("app.Path", side_effect=lambda p: fake_proc if str(p) == "/proc" else Path(p)):
        found = running_profiles()

    assert found.get("daemon") == [101]
    assert found.get("sage") == [102]
    assert found.get("iris") == [103]
    assert "aegis" not in found
    assert "nacht" not in found
    assert "ariadne" not in found


# ---------------------------------------------------------------------------
# Unit tests: Fleet collection (Nexus + 9 Luminaries + 3 Satellites = 13)
# ---------------------------------------------------------------------------

def test_collect_fleet_all_thirteen_entities(tmp_path: Path):
    mock_profiles = tmp_path / "profiles"
    for name, _, _ in LUMINARIES:
        pdir = mock_profiles / name / "logs"
        pdir.mkdir(parents=True)
        (pdir / "agent.log").write_text("agent heartbeat")

    def mock_systemd_call(unit: str):
        if unit == "hermes-gateway":
            return {
                "unit": "hermes-gateway", "scope": "user", "state": "active",
                "since": "2026-10-20T07:22:06+00:00", "restarts": "3", "main_pid": 489224,
            }
        elif unit == "ai7-warden.service":
            return {
                "unit": "ai7-warden.service", "scope": "system", "state": "active",
                "since": "2026-10-20T06:22:56+00:00", "restarts": "0", "main_pid": 482532,
            }
        elif unit == "ai7-finance.service":
            return {
                "unit": "ai7-finance.service", "scope": "system", "state": "active",
                "since": "2026-10-19T08:35:09+00:00", "restarts": "0", "main_pid": 292673,
            }
        elif unit == "ai7-finance-web.service":
            return {
                "unit": "ai7-finance-web.service", "scope": "system", "state": "active",
                "since": "2026-10-20T18:45:23+00:00", "restarts": "2", "main_pid": 603666,
            }
        elif unit == "ai7-email-live.service":
            return {
                "unit": "ai7-email-live.service", "scope": "system", "state": "active",
                "since": "2026-10-19T17:00:22+00:00", "restarts": "0", "main_pid": 369778,
            }
        return {"unit": unit, "scope": None, "state": "unknown", "since": None, "restarts": None, "main_pid": None}

    with patch("app.PROFILES", mock_profiles), \
         patch("app._systemd", side_effect=mock_systemd_call), \
         patch("app.running_profiles", return_value={"daemon": [526036]}):
        data = collect(scope="fleet")

    assert data["scope"] == "fleet"
    assert data["count"] == 13
    assert len(data["agents"]) == 13

    expected_keys = {
        "id", "name", "role", "desc", "kind", "status", "running",
        "pids", "last_active", "age_seconds", "log_size", "errors",
        "cron_jobs", "service", "extra_services",
    }
    for agent in data["agents"]:
        assert set(agent.keys()) == expected_keys, f"Agent {agent['id']} keys mismatch"

    nexus = data["agents"][0]
    assert nexus["id"] == "nexus"
    assert nexus["name"] == "Spidey"
    assert nexus["kind"] == "orchestrator"
    assert nexus["service"] is not None

    luminaries = [a for a in data["agents"] if a["kind"] == "luminary"]
    assert len(luminaries) == 9
    for lum in luminaries:
        assert lum["service"] is None

    satellites = [a for a in data["agents"] if a["kind"] == "satellite"]
    assert len(satellites) == 3
    sat_map = {s["id"]: s for s in satellites}
    assert "steward" in sat_map
    assert "warden" in sat_map
    assert "sentinel" in sat_map
    assert sat_map["warden"]["status"] == "running"
    assert sat_map["warden"]["service"]["unit"] == "ai7-warden.service"
    assert sat_map["warden"]["service"]["state"] == "active"
    assert sat_map["steward"]["status"] == "running"
    assert sat_map["steward"]["running"] is True
    assert sat_map["steward"]["service"]["unit"] == "ai7-finance.service"
    assert sat_map["steward"]["service"]["state"] == "active"
    assert isinstance(sat_map["steward"]["service"]["main_pid"], int)
    assert len(sat_map["steward"]["extra_services"]) == 1
    assert sat_map["steward"]["extra_services"][0]["unit"] == "ai7-finance-web.service"
    assert sat_map["steward"]["extra_services"][0]["state"] == "active"
    assert sat_map["sentinel"]["status"] == "running"
    assert sat_map["sentinel"]["service"]["unit"] == "ai7-email-live.service"
    assert sat_map["sentinel"]["service"]["state"] == "active"


def test_collect_scope_luminaries_isolation(tmp_path: Path):
    mock_profiles = tmp_path / "profiles"
    for name, _, _ in LUMINARIES:
        pdir = mock_profiles / name / "logs"
        pdir.mkdir(parents=True)
        (pdir / "agent.log").write_text("heartbeat")

    with patch("app.PROFILES", mock_profiles), \
         patch("app._systemd", return_value={"unit": "hermes-gateway", "state": "active", "main_pid": 1234, "since": None, "restarts": None, "scope": "user"}), \
         patch("app.running_profiles", return_value={}):
        data = collect(scope="luminaries")

    assert data["scope"] == "luminaries"
    assert data["count"] == 10
    assert len(data["agents"]) == 10


def test_collect_missing_log_graceful(tmp_path: Path):
    mock_profiles = tmp_path / "profiles"
    mock_profiles.mkdir()

    mock_gateway = {
        "unit": "hermes-gateway",
        "scope": "user",
        "state": "inactive",
        "since": None,
        "restarts": None,
        "main_pid": None,
    }

    with patch("app.PROFILES", mock_profiles), \
         patch("app._systemd", return_value=mock_gateway), \
         patch("app.running_profiles", return_value={}):
        data = collect()

    assert data["count"] == 13
    assert data["agents"][0]["status"] == "error"
    assert data["agents"][0]["running"] is False

    for lum in [a for a in data["agents"] if a["kind"] == "luminary"]:
        assert lum["status"] == "unknown"
        assert lum["running"] is False
        assert lum["last_active"] is None
        assert lum["errors"] is None


def test_collect_luminary_errors_handling(tmp_path: Path):
    mock_profiles = tmp_path / "profiles"
    for name, _, _ in LUMINARIES:
        pdir = mock_profiles / name / "logs"
        pdir.mkdir(parents=True)
        (pdir / "agent.log").write_text("agent heartbeat")

    # Zephyr has only warning in errors.log (false-alarm prevention)
    zephyr_err = mock_profiles / "zephyr" / "logs" / "errors.log"
    zephyr_err.write_text("2026-10-22 11:00:03,668 WARNING cli: harmless rmdir warning\n")

    # Aegis has fatal error in errors.log
    aegis_err = mock_profiles / "aegis" / "logs" / "errors.log"
    aegis_err.write_text("2026-10-22 11:00:03,668 ERROR agent.runner: Critical runtime failure\n")

    with patch("app.PROFILES", mock_profiles), \
         patch("app._systemd", return_value={"unit": "hermes-gateway", "state": "active", "main_pid": 1234, "since": None, "restarts": None, "scope": "user"}), \
         patch("app.running_profiles", return_value={}):
        data = collect(scope="luminaries")

    agent_map = {a["id"]: a for a in data["agents"]}
    # Zephyr must NOT have errors attached (errors is None)
    assert agent_map["zephyr"]["errors"] is None

    # Sage (no errors.log) must NOT have errors attached (errors is None)
    assert agent_map["sage"]["errors"] is None

    # Aegis has genuine fatal error
    assert agent_map["aegis"]["errors"] is not None
    assert agent_map["aegis"]["errors"]["fatal"] is True
    assert "Critical runtime failure" in agent_map["aegis"]["errors"]["tail"]


# ---------------------------------------------------------------------------
# Unit tests: Tasks Telemetry Derivation (C-1, C-2, C-3, C-4)
# ---------------------------------------------------------------------------

def test_derive_tasks_single_entry_per_task(tmp_path: Path):
    tasks_file = tmp_path / "tasks.jsonl"
    recent_ts = datetime.now(timezone.utc).isoformat()
    lines = [
        {"v": "3.1", "ts": "2026-10-21T01:00:00+07:00", "task_id": "TSK-001", "to": "zephyr", "status": "QUEUED", "intent": "Task 1", "attempt": 1},
        {"v": "3.1", "ts": "2026-10-21T01:00:05+07:00", "task_id": "TSK-001", "to": "zephyr", "status": "RUNNING", "intent": "Task 1", "attempt": 1},
        {"v": "3.1", "ts": "2026-10-21T01:00:15+07:00", "task_id": "TSK-001", "to": "zephyr", "status": "SUCCEEDED", "intent": "Task 1", "artifacts": [], "attempt": 1},
        {"v": "3.1", "ts": recent_ts, "task_id": "TSK-002", "to": "sage", "status": "QUEUED", "intent": "Task 2", "attempt": 1},
    ]
    tasks_file.write_text("\n".join(json.dumps(ln) for ln in lines))

    tasks = derive_tasks(tasks_file)
    assert len(tasks) == 2
    t1 = next(t for t in tasks if t["task_id"] == "TSK-001")
    assert t1["status"] == "SUCCEEDED"
    assert t1["to"] == "zephyr"
    assert t1["elapsed_seconds"] == 15.0

    t2 = next(t for t in tasks if t["task_id"] == "TSK-002")
    assert t2["status"] == "QUEUED"


def test_derive_tasks_invalid_ts_explicit_null(tmp_path: Path):
    tasks_file = tmp_path / "tasks.jsonl"
    lines = [
        {"v": "3.1", "ts": "2026-10-20T23:44:44+07:00", "task_id": "TSK-ba4f", "to": "aegis", "status": "QUEUED"},
        {"v": "3.1", "ts": "now", "task_id": "TSK-ba4f", "to": "aegis", "status": "FAILED", "error": "agent process exited without artifact"},
    ]
    tasks_file.write_text("\n".join(json.dumps(ln) for ln in lines))

    tasks = derive_tasks(tasks_file)
    assert len(tasks) == 1
    t = tasks[0]
    assert t["task_id"] == "TSK-ba4f"
    assert t["status"] == "FAILED"
    assert t["ts"] == "now"
    assert t["ts_valid"] is False
    assert t["elapsed_seconds"] is None


def test_derive_tasks_artifact_verification_cases(tmp_path: Path):
    valid_art = tmp_path / "valid.md"
    valid_art.write_text("valid content")

    empty_art = tmp_path / "empty.md"
    empty_art.touch()

    # Legacy sibling directory setup: handoff/zephyr/out/legacy.out.md
    legacy_dir = tmp_path / "handoff" / "zephyr"
    legacy_out_dir = legacy_dir / "out"
    legacy_out_dir.mkdir(parents=True)
    legacy_art = legacy_out_dir / "legacy.out.md"
    legacy_art.write_text("legacy output content")

    legacy_empty = legacy_out_dir / "empty.out.md"
    legacy_empty.touch()

    tasks_file = tmp_path / "tasks.jsonl"
    lines = [
        {"v": "3.1", "ts": "2026-10-21T01:00:00+07:00", "task_id": "T-OK", "status": "SUCCEEDED", "artifacts": [str(valid_art)], "artifact_sha256": "abcdef"},
        {"v": "3.1", "ts": "2026-10-21T01:00:00+07:00", "task_id": "T-NO-ART", "status": "SUCCEEDED", "artifacts": [], "artifact_sha256": "abcdef"},
        {"v": "3.1", "ts": "2026-10-21T01:00:00+07:00", "task_id": "T-MISSING", "status": "SUCCEEDED", "artifacts": ["/tmp/nonexistent_xyz.md"], "artifact_sha256": "abcdef"},
        {"v": "3.1", "ts": "2026-10-21T01:00:00+07:00", "task_id": "T-EMPTY", "status": "SUCCEEDED", "artifacts": [str(empty_art)], "artifact_sha256": "abcdef"},
        {"v": "3.1", "ts": "2026-10-21T01:00:00+07:00", "task_id": "T-NOHASH", "status": "SUCCEEDED", "artifacts": [str(valid_art)], "artifact_sha256": None},
        # Legacy path resolution: recorded path without /out/
        {"v": "3.1", "ts": "2026-10-21T01:00:00+07:00", "task_id": "T-LEGACY-OK", "status": "SUCCEEDED", "artifacts": [str(legacy_dir / "legacy.out.md")], "artifact_sha256": "legacyhash"},
        {"v": "3.1", "ts": "2026-10-21T01:00:00+07:00", "task_id": "T-LEGACY-NOHASH", "status": "SUCCEEDED", "artifacts": [str(legacy_dir / "legacy.out.md")], "artifact_sha256": None},
        {"v": "3.1", "ts": "2026-10-21T01:00:00+07:00", "task_id": "T-LEGACY-EMPTY", "status": "SUCCEEDED", "artifacts": [str(legacy_dir / "empty.out.md")], "artifact_sha256": "emptyhash"},
        {"v": "3.1", "ts": "2026-10-21T01:00:00+07:00", "task_id": "T-LEGACY-MISSING", "status": "SUCCEEDED", "artifacts": [str(legacy_dir / "never_existed.out.md")], "artifact_sha256": "neverhash"},
    ]
    tasks_file.write_text("\n".join(json.dumps(ln) for ln in lines))

    tasks = derive_tasks(tasks_file)
    t_map = {t["task_id"]: t for t in tasks}

    assert t_map["T-OK"]["artifact_verified"] is True
    assert t_map["T-OK"]["artifact_verification_reason"] is None
    assert t_map["T-OK"]["artifact_path_source"] == "recorded"

    assert t_map["T-NO-ART"]["artifact_verified"] is False
    assert t_map["T-NO-ART"]["artifact_verification_reason"] == "missing_file"
    assert t_map["T-NO-ART"]["artifact_path_source"] is None

    assert t_map["T-MISSING"]["artifact_verified"] is False
    assert t_map["T-MISSING"]["artifact_verification_reason"] == "missing_file"
    assert t_map["T-MISSING"]["artifact_path_source"] is None

    assert t_map["T-EMPTY"]["artifact_verified"] is False
    assert t_map["T-EMPTY"]["artifact_verification_reason"] == "empty_file"
    assert t_map["T-EMPTY"]["artifact_path_source"] == "recorded"

    assert t_map["T-NOHASH"]["artifact_verified"] is False
    assert t_map["T-NOHASH"]["artifact_verification_reason"] == "no_hash"
    assert t_map["T-NOHASH"]["artifact_path_source"] == "recorded"

    # Legacy path assertions
    assert t_map["T-LEGACY-OK"]["artifact_verified"] is True
    assert t_map["T-LEGACY-OK"]["artifact_verification_reason"] is None
    assert t_map["T-LEGACY-OK"]["artifact_path_source"] == "legacy_out"

    assert t_map["T-LEGACY-NOHASH"]["artifact_verified"] is False
    assert t_map["T-LEGACY-NOHASH"]["artifact_verification_reason"] == "no_hash"
    assert t_map["T-LEGACY-NOHASH"]["artifact_path_source"] == "legacy_out"

    assert t_map["T-LEGACY-EMPTY"]["artifact_verified"] is False
    assert t_map["T-LEGACY-EMPTY"]["artifact_verification_reason"] == "empty_file"
    assert t_map["T-LEGACY-EMPTY"]["artifact_path_source"] == "legacy_out"

    assert t_map["T-LEGACY-MISSING"]["artifact_verified"] is False
    assert t_map["T-LEGACY-MISSING"]["artifact_verification_reason"] == "missing_file"
    assert t_map["T-LEGACY-MISSING"]["artifact_path_source"] is None


def test_derive_tasks_production_invariants():
    """Verify invariant rules on production tasks.jsonl (if present):
    1. No SUCCEEDED task has artifact_verified: false with reason 'missing_file' while the file exists on disk.
    2. Every task with artifact_verified: true has a non-empty artifact_sha256 and no verification reason.
    3. Every task with artifact_verified: false has a valid reason ('missing_file', 'empty_file', 'no_hash').
    """
    from app import TASKS_FILE
    if not TASKS_FILE.is_file():
        return
    tasks = derive_tasks(TASKS_FILE)
    succeeded = [t for t in tasks if t["status"] == "SUCCEEDED"]

    for t in succeeded:
        if t["artifact_verified"] is True:
            assert t.get("artifact_sha256"), f"Task {t['task_id']} verified true without sha256"
            assert t.get("artifact_verification_reason") is None
        else:
            reason = t.get("artifact_verification_reason")
            assert reason in {"missing_file", "empty_file", "no_hash"}
            # Invariant: Never flag missing_file if the artifact actually exists on disk
            if reason == "missing_file":
                for art in t.get("artifacts", []):
                    assert not Path(art).is_file(), f"Task {t['task_id']} marked missing_file but {art} exists on disk"


def test_derive_tasks_stuck_detection(tmp_path: Path):
    tasks_file = tmp_path / "tasks.jsonl"
    active_file = tmp_path / "active_tasks.json"
    lines = [
        {"v": "3.1", "ts": "2026-10-20T22:40:19+07:00", "task_id": "TSK-c49c", "to": "zephyr", "status": "QUEUED"},
        {"v": "3.1", "ts": "2026-10-20T22:40:19+07:00", "task_id": "TSK-ACTIVE-STUCK", "to": "zephyr", "status": "QUEUED"},
    ]
    tasks_file.write_text("\n".join(json.dumps(ln) for ln in lines))
    # TSK-ACTIVE-STUCK is present in active_tasks; TSK-c49c is not (orphaned)
    active_file.write_text(json.dumps({"TSK-ACTIVE-STUCK": {"target": "zephyr"}}))

    tasks = derive_tasks(tasks_file, active_tasks_file=active_file)
    assert len(tasks) == 2
    t_orphan = next(t for t in tasks if t["task_id"] == "TSK-c49c")
    assert t_orphan["status"] == "ORPHANED"
    assert t_orphan["stuck"] is True
    assert t_orphan["stuck_reason"] == "orphaned_no_worker"

    t_active = next(t for t in tasks if t["task_id"] == "TSK-ACTIVE-STUCK")
    assert t_active["status"] == "QUEUED"
    assert t_active["stuck"] is True
    assert t_active["stuck_reason"] is not None
    assert "queued_exceeded" in t_active["stuck_reason"]


def test_derive_tasks_corrupted_lines_resilient(tmp_path: Path):
    tasks_file = tmp_path / "tasks.jsonl"
    content = (
        '{"v": "3.1", "ts": "2026-10-21T01:00:00+07:00", "task_id": "T1", "to": "zephyr", "status": "QUEUED"}\n'
        'CORRUPTED GARBAGE JSON LINE THAT WOULD BREAK NAIVE PARSER\n'
        '{"broken": true}\n'
        '{"v": "3.1", "ts": "2026-10-21T01:01:00+07:00", "task_id": "T1", "to": "zephyr", "status": "SUCCEEDED", "artifacts": []}\n'
    )
    tasks_file.write_text(content)

    tasks = derive_tasks(tasks_file)
    assert len(tasks) == 1
    assert tasks[0]["task_id"] == "T1"
    assert tasks[0]["status"] == "SUCCEEDED"


# ---------------------------------------------------------------------------
# Unit tests: FastAPI Endpoints (/health, /api/status, /api/tasks, /)
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_endpoint_health():
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.get("/health")
        assert res.status_code == 200
        assert res.json() == {"ok": True}


@pytest.mark.asyncio
async def test_endpoint_api_status_success():
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.get("/api/status")
        assert res.status_code == 200
        body = res.json()
        assert body["scope"] == "fleet"
        assert body["count"] == 13
        assert len(body["agents"]) == 13
        assert "generated_at" in body


@pytest.mark.asyncio
async def test_endpoint_api_tasks(tmp_path: Path):
    mock_tasks = tmp_path / "tasks.jsonl"
    lines = [
        {"v": "3.1", "ts": "2026-10-20T22:40:19+07:00", "task_id": "TSK-FIXTURE-STUCK", "to": "zephyr", "status": "QUEUED"},
        {"v": "3.1", "ts": "2026-10-21T01:00:00+07:00", "task_id": "TSK-FIXTURE-DONE", "to": "zephyr", "status": "SUCCEEDED", "artifacts": []},
    ]
    mock_tasks.write_text("\n".join(json.dumps(ln) for ln in lines) + "\n")

    with patch("app.TASKS_FILE", mock_tasks):
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
            res = await client.get("/api/tasks")
            assert res.status_code == 200
            body = res.json()
            assert "tasks" in body
            assert body["count"] == 2
            assert len(body["tasks"]) == 2
            assert body["stuck_count"] == 1
            assert "generated_at" in body

            # Query single existing stuck task
            res_single = await client.get("/api/tasks/TSK-FIXTURE-STUCK")
            assert res_single.status_code == 200
            t = res_single.json()
            assert t["task_id"] == "TSK-FIXTURE-STUCK"
            assert t["stuck"] is True

            # Query nonexistent task -> 404
            res_404 = await client.get("/api/tasks/TSK-NONEXISTENT")
            assert res_404.status_code == 404


@pytest.mark.asyncio
async def test_endpoint_api_status_error_handling():
    with patch("app.collect", side_effect=RuntimeError("simulated system failure")):
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
            res = await client.get("/api/status")
            assert res.status_code == 500
            body = res.json()
            assert "error" in body
            assert "simulated system failure" in body["error"]
            assert "generated_at" in body


@pytest.mark.asyncio
async def test_endpoint_index_serves_static_html():
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.get("/")
        assert res.status_code == 200
        assert "text/html" in res.headers.get("content-type", "")
        assert res.headers.get("cache-control") == "no-cache, no-store, must-revalidate"
        assert res.headers.get("pragma") == "no-cache"
        assert res.headers.get("expires") == "0"
        # Verify root / delivers Sovereign Console v3
        assert ("<title>The Luminaries — Sovereign Console v3</title>" in res.text or "<title>AI7 Solaris — Constellation Workspace v3</title>" in res.text or "<title>AI7 Solaris — Ruang Kerja Armada</title>" in res.text)
        assert ("The Luminaries" in res.text or "AI7 Solaris — Constellation Workspace v3" in res.text or "AI7 Solaris — Ruang Kerja Armada" in res.text or "CONSOLE v3" in res.text)
        assert ("CONSOLE v3" in res.text or "KONSOL v3" in res.text)
        assert "THE LUMINARIES" in res.text
        assert 'id="luminaries-container"' in res.text
        assert 'id="agent-detail-modal"' in res.text
        assert 'id="realtime-clock-display"' in res.text

        # Verify static assets linked from console v3 resolve cleanly at root
        res_tokens = await client.get("/tokens.css")
        assert res_tokens.status_code == 200
        assert res_tokens.headers.get("cache-control") == "no-cache, no-store, must-revalidate"
        assert len(res_tokens.text) > 0

        res_css = await client.get("/style.css")
        assert res_css.status_code == 200
        assert res_css.headers.get("cache-control") == "no-cache, no-store, must-revalidate"
        assert len(res_css.text) > 0

        res_js = await client.get("/app.js")
        assert res_js.status_code == 200
        assert res_js.headers.get("cache-control") == "no-cache, no-store, must-revalidate"
        assert len(res_js.text) > 0


@pytest.mark.asyncio
async def test_endpoint_index_serves_v3_or_404_when_missing(tmp_path: Path):
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        with patch("app.STATIC", tmp_path):
            # 1. v3 index does not exist -> 404
            res_404 = await client.get("/")
            assert res_404.status_code == 404
            assert res_404.json()["hint"] == "static/v3/index.html not found"

            # 2. Legacy v2 directory exists only -> still 404 (zero v2 fallback)
            v2_dir = tmp_path / "v2"
            v2_dir.mkdir(parents=True)
            (v2_dir / "index.html").write_text("<title>Legacy v2</title>", encoding="utf-8")
            res_still_404 = await client.get("/")
            assert res_still_404.status_code == 404
            assert res_still_404.json()["hint"] == "static/v3/index.html not found"

            # 3. v3 exists -> serves v3
            v3_dir = tmp_path / "v3"
            v3_dir.mkdir(parents=True)
            (v3_dir / "index.html").write_text("<title>Priority v3 Console</title>", encoding="utf-8")
            res_v3 = await client.get("/")
            assert res_v3.status_code == 200
            assert "<title>Priority v3 Console</title>" in res_v3.text


@pytest.mark.asyncio
async def test_endpoint_v2_deprecated_returns_404():
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        # Legacy v2 mount and assets are completely removed; returns 404
        res = await client.get("/v2/")
        assert res.status_code == 404

        res_css = await client.get("/v2/style.css")
        assert res_css.status_code == 404

        res_js = await client.get("/v2/app.js")
        assert res_js.status_code == 404

        res_redir = await client.get("/v2", follow_redirects=True)
        assert res_redir.status_code == 404

        # Invariant: Root / strictly serves v3
        res_root = await client.get("/")
        assert res_root.status_code == 200
        assert ("<title>The Luminaries — Sovereign Console v3</title>" in res_root.text or "THE LUMINARIES" in res_root.text)


@pytest.mark.asyncio
async def test_endpoint_v3_serves_console_v3_html():
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Clean path /v3/ returns 200 and serves v3 console
        res = await client.get("/v3/")
        assert res.status_code == 200
        assert "text/html" in res.headers.get("content-type", "")
        # Check text markers specific to Iris's v3 console
        assert ("<title>The Luminaries — Sovereign Console v3</title>" in res.text or "<title>AI7 Solaris — Constellation Workspace v3</title>" in res.text or "<title>AI7 Solaris — Ruang Kerja Armada</title>" in res.text)
        assert ("The Luminaries" in res.text or "AI7 Solaris — Constellation Workspace v3" in res.text or "AI7 Solaris — Ruang Kerja Armada" in res.text or "CONSOLE v3" in res.text)
        assert ("CONSOLE v3" in res.text or "KONSOL v3" in res.text)
        assert "THE LUMINARIES" in res.text
        assert 'id="luminaries-container"' in res.text
        assert 'id="agent-detail-modal"' in res.text
        assert 'id="realtime-clock-display"' in res.text

        # 2. Check assets resolve under /v3 mount
        res_tokens = await client.get("/v3/tokens.css")
        assert res_tokens.status_code == 200
        assert len(res_tokens.text) > 0

        res_css = await client.get("/v3/style.css")
        assert res_css.status_code == 200
        assert len(res_css.text) > 0

        res_js = await client.get("/v3/app.js")
        assert res_js.status_code == 200
        assert len(res_js.text) > 0

        # 3. Path /v3 without trailing slash redirects cleanly to /v3/
        res_no_follow = await client.get("/v3", follow_redirects=False)
        assert res_no_follow.status_code in (307, 308, 301, 302)
        assert res_no_follow.headers["location"].endswith("/v3/")

        res_redir = await client.get("/v3", follow_redirects=True)
        assert res_redir.status_code == 200
        assert ("<title>The Luminaries — Sovereign Console v3</title>" in res_redir.text or "<title>AI7 Solaris — Constellation Workspace v3</title>" in res_redir.text or "<title>AI7 Solaris — Ruang Kerja Armada</title>" in res_redir.text)
        assert ("The Luminaries" in res_redir.text or "AI7 Solaris — Constellation Workspace v3" in res_redir.text or "AI7 Solaris — Ruang Kerja Armada" in res_redir.text or "CONSOLE v3" in res_redir.text)

        # 4. Invariant: Root / serves v3 and legacy /v2/ returns 404
        res_root = await client.get("/")
        assert res_root.status_code == 200
        assert ("<title>The Luminaries — Sovereign Console v3</title>" in res_root.text or "THE LUMINARIES" in res_root.text)

        res_v2 = await client.get("/v2/")
        assert res_v2.status_code == 404


def test_endpoint_v3_with_testclient():
    from fastapi.testclient import TestClient

    with TestClient(app) as client:
        # 1. Clean path /v3/ returns 200 and serves v3 console
        res = client.get("/v3/")
        assert res.status_code == 200
        assert "text/html" in res.headers.get("content-type", "")
        assert ("<title>The Luminaries — Sovereign Console v3</title>" in res.text or "<title>AI7 Solaris — Constellation Workspace v3</title>" in res.text or "<title>AI7 Solaris — Ruang Kerja Armada</title>" in res.text)
        assert ("The Luminaries" in res.text or "AI7 Solaris — Constellation Workspace v3" in res.text or "AI7 Solaris — Ruang Kerja Armada" in res.text or "CONSOLE v3" in res.text)

        # 2. Path /v3 redirects cleanly to /v3/
        res_no_follow = client.get("/v3", follow_redirects=False)
        assert res_no_follow.status_code in (307, 308, 301, 302)
        assert res_no_follow.headers["location"].endswith("/v3/")

        res_redir = client.get("/v3", follow_redirects=True)
        assert res_redir.status_code == 200
        assert ("<title>The Luminaries — Sovereign Console v3</title>" in res_redir.text or "<title>AI7 Solaris — Constellation Workspace v3</title>" in res_redir.text or "<title>AI7 Solaris — Ruang Kerja Armada</title>" in res_redir.text)
        assert ("The Luminaries" in res_redir.text or "AI7 Solaris — Constellation Workspace v3" in res_redir.text or "AI7 Solaris — Ruang Kerja Armada" in res_redir.text or "CONSOLE v3" in res_redir.text)

        # 3. Path / also serves v3 console
        res_root = client.get("/")
        assert res_root.status_code == 200
        assert ("<title>The Luminaries — Sovereign Console v3</title>" in res_root.text or "THE LUMINARIES" in res_root.text)



# ---------------------------------------------------------------------------
# D-7 Telemetry Hygiene Tests: Orphaned, timeout_s, resolved.json
# ---------------------------------------------------------------------------

def test_derive_tasks_orphaned_reconciliation_logic(tmp_path: Path):
    """Test D-7 orphaned task reconciliation rules:
    - QUEUED task exceeding 600s without worker in active_tasks -> ORPHANED
    - QUEUED task exceeding 600s with worker in active_tasks -> QUEUED (stuck)
    - QUEUED task under 600s -> QUEUED (not stuck)
    """
    tasks_file = tmp_path / "tasks.jsonl"
    active_file = tmp_path / "active_tasks.json"

    now_dt = datetime.now(timezone.utc)
    old_ts = (now_dt - timedelta(seconds=1200)).isoformat()
    recent_ts = (now_dt - timedelta(seconds=100)).isoformat()

    lines = [
        {"v": "3.1", "ts": old_ts, "task_id": "TSK-ORPHAN-1", "to": "zephyr", "status": "QUEUED"},
        {"v": "3.1", "ts": old_ts, "task_id": "TSK-ACTIVE-1", "to": "daemon", "status": "QUEUED"},
        {"v": "3.1", "ts": recent_ts, "task_id": "TSK-FRESH-1", "to": "sage", "status": "QUEUED"},
    ]
    tasks_file.write_text("\n".join(json.dumps(ln) for ln in lines) + "\n")
    active_file.write_text(json.dumps({
        "TSK-ACTIVE-1": {"target": "daemon", "pid": 1234}
    }))

    tasks = derive_tasks(tasks_file=tasks_file, active_tasks_file=active_file)
    task_map = {t["task_id"]: t for t in tasks}

    # 1. Orphaned task: no worker in active_tasks, age > 600s
    t_orphan = task_map["TSK-ORPHAN-1"]
    assert t_orphan["status"] == "ORPHANED"
    assert t_orphan["stuck"] is True
    assert t_orphan["stuck_reason"] == "orphaned_no_worker"
    assert "Worker tidak pernah mulai" in (t_orphan["error"] or "")

    # 2. Active queued task: worker registered in active_tasks, age > 600s
    t_active = task_map["TSK-ACTIVE-1"]
    assert t_active["status"] == "QUEUED"
    assert t_active["stuck"] is True
    assert "queued_exceeded" in (t_active["stuck_reason"] or "")

    # 3. Fresh queued task: age < 600s
    t_fresh = task_map["TSK-FRESH-1"]
    assert t_fresh["status"] == "QUEUED"
    assert t_fresh["stuck"] is False
    assert t_fresh["stuck_reason"] is None


def test_derive_tasks_resolved_support_logic(tmp_path: Path):
    """Test D-7 resolved declaration file support (dispatcher/resolved.json):
    - When resolved.json is absent -> all tasks have resolved: null (no error)
    - When resolved.json has matching entry -> exposes {commit, reason, at}
    - Non-matching tasks -> resolved: null
    - Status FAILED remains untouched in task object
    - When resolved.json contains invalid JSON -> graceful null fallback, no crash
    """
    tasks_file = tmp_path / "tasks.jsonl"
    resolved_file = tmp_path / "resolved.json"

    lines = [
        {"v": "3.1", "ts": "2026-10-21T00:37:19+07:00", "task_id": "TSK-20261021-003719-e14c", "to": "chronos", "status": "FAILED", "error": "validation error"},
        {"v": "3.1", "ts": "2026-10-21T01:22:01+07:00", "task_id": "TSK-20261021-012201-3c2c", "to": "chronos", "status": "FAILED", "error": "validation error"},
        {"v": "3.1", "ts": "2026-10-21T02:00:00+07:00", "task_id": "TSK-UNRESOLVED", "to": "zephyr", "status": "FAILED", "error": "unrelated failure"},
    ]
    tasks_file.write_text("\n".join(json.dumps(ln) for ln in lines) + "\n")

    # Case A: resolved.json does not exist
    tasks_no_res = derive_tasks(tasks_file=tasks_file, resolved_file=tmp_path / "nonexistent.json")
    for t in tasks_no_res:
        assert t["resolved"] is None
        assert t["status"] == "FAILED"

    # Case B: resolved.json populated
    resolved_data = {
        "TSK-20261021-003719-e14c": {
            "commit": "ab9850b",
            "reason": "validator chronos tidak lagi menggagalkan keluaran non-JSON",
            "at": "2026-10-21T12:00:00+07:00"
        },
        "TSK-20261021-012201-3c2c": {
            "commit": "ab9850b",
            "reason": "validator chronos tidak lagi menggagalkan keluaran non-JSON",
            "at": "2026-10-21T12:00:00+07:00"
        }
    }
    resolved_file.write_text(json.dumps(resolved_data))

    tasks = derive_tasks(tasks_file=tasks_file, resolved_file=resolved_file)
    task_map = {t["task_id"]: t for t in tasks}

    t_e14c = task_map["TSK-20261021-003719-e14c"]
    assert t_e14c["status"] == "FAILED"  # Historical status NOT modified
    assert t_e14c["resolved"] is not None
    assert t_e14c["resolved"]["commit"] == "ab9850b"
    assert "validator chronos" in t_e14c["resolved"]["reason"]
    assert t_e14c["resolved"]["at"] == "2026-10-21T12:00:00+07:00"

    t_3c2c = task_map["TSK-20261021-012201-3c2c"]
    assert t_3c2c["status"] == "FAILED"
    assert t_3c2c["resolved"]["commit"] == "ab9850b"

    t_unres = task_map["TSK-UNRESOLVED"]
    assert t_unres["status"] == "FAILED"
    assert t_unres["resolved"] is None

    # Case C: resolved.json contains malformed/corrupted content
    corrupt_file = tmp_path / "corrupt_resolved.json"
    corrupt_file.write_text("{NOT VALID JSON CONTENT!}")
    tasks_corrupt = derive_tasks(tasks_file=tasks_file, resolved_file=corrupt_file)
    for t in tasks_corrupt:
        assert t["resolved"] is None


def test_derive_tasks_timeout_s_logic(tmp_path: Path):
    """Test D-7 timeout_s exposure:
    - Events with timeout_s expose integer timeout_s
    - Legacy events without timeout_s expose explicit null (None)
    """
    tasks_file = tmp_path / "tasks.jsonl"
    lines = [
        {"v": "3.1", "ts": "2026-10-21T01:00:00+07:00", "task_id": "TSK-WITH-TIMEOUT", "to": "zephyr", "status": "TIMEOUT", "timeout_s": 240, "error": "Task timed out after 240s"},
        {"v": "3.1", "ts": "2026-10-21T01:00:00+07:00", "task_id": "TSK-LEGACY-NULL", "to": "chronos", "status": "FAILED", "error": "old failure"},
    ]
    tasks_file.write_text("\n".join(json.dumps(ln) for ln in lines) + "\n")

    tasks = derive_tasks(tasks_file=tasks_file)
    task_map = {t["task_id"]: t for t in tasks}

    assert task_map["TSK-WITH-TIMEOUT"]["timeout_s"] == 240
    assert task_map["TSK-LEGACY-NULL"]["timeout_s"] is None


@pytest.mark.asyncio
async def test_endpoint_api_tasks_orphaned_and_resolved_filtering(tmp_path: Path):
    """Test FastAPI /api/tasks endpoint with ORPHANED filter and resolved object."""
    mock_tasks = tmp_path / "tasks.jsonl"
    mock_active = tmp_path / "active_tasks.json"
    mock_resolved = tmp_path / "resolved.json"

    now_dt = datetime.now(timezone.utc)
    old_ts = (now_dt - timedelta(seconds=1000)).isoformat()

    lines = [
        {"v": "3.1", "ts": old_ts, "task_id": "TSK-ORPHAN-ENDPOINT", "to": "zephyr", "status": "QUEUED"},
        {"v": "3.1", "ts": "2026-10-21T00:37:19+07:00", "task_id": "TSK-RESOLVED-ENDPOINT", "to": "chronos", "status": "FAILED", "error": "val err"},
    ]
    mock_tasks.write_text("\n".join(json.dumps(ln) for ln in lines) + "\n")
    mock_active.write_text(json.dumps({}))
    mock_resolved.write_text(json.dumps({
        "TSK-RESOLVED-ENDPOINT": {"commit": "ab9850b", "reason": "fixed validator", "at": "2026-10-21T12:00:00+07:00"}
    }))

    with patch("app.TASKS_FILE", mock_tasks), \
         patch("app.ACTIVE_TASKS_FILE", mock_active), \
         patch("app.RESOLVED_FILE", mock_resolved):

        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
            # 1. Fetch all tasks
            res = await client.get("/api/tasks")
            assert res.status_code == 200
            data = res.json()
            assert data["count"] == 2
            assert data["stuck_count"] >= 1

            tasks_by_id = {t["task_id"]: t for t in data["tasks"]}
            assert tasks_by_id["TSK-ORPHAN-ENDPOINT"]["status"] == "ORPHANED"
            assert tasks_by_id["TSK-ORPHAN-ENDPOINT"]["stuck"] is True
            assert tasks_by_id["TSK-RESOLVED-ENDPOINT"]["resolved"]["commit"] == "ab9850b"
            assert tasks_by_id["TSK-ORPHAN-ENDPOINT"]["resolved"] is None

            # 2. Filter by status=ORPHANED
            res_orphan = await client.get("/api/tasks?status=ORPHANED")
            assert res_orphan.status_code == 200
            orphan_data = res_orphan.json()
            assert orphan_data["count"] == 1
            assert orphan_data["tasks"][0]["task_id"] == "TSK-ORPHAN-ENDPOINT"
            assert orphan_data["tasks"][0]["status"] == "ORPHANED"

            # 3. Query single task by ID
            res_single = await client.get("/api/tasks/TSK-RESOLVED-ENDPOINT")
            assert res_single.status_code == 200
            single_data = res_single.json()
            assert single_data["task_id"] == "TSK-RESOLVED-ENDPOINT"
            assert single_data["status"] == "FAILED"
            assert single_data["resolved"]["commit"] == "ab9850b"


@pytest.mark.asyncio
async def test_endpoint_api_tasks_agent_filter(tmp_path: Path):
    """Test GET /api/tasks?agent=<agent_id> matches to == agent OR from == agent."""
    mock_tasks = tmp_path / "mock_agent_tasks.jsonl"
    lines = [
        {"v": "3.1", "ts": "2026-10-21T01:00:00+07:00", "task_id": "T-ZEPHYR-TO", "from": "nexus", "to": "zephyr", "status": "SUCCEEDED", "artifacts": []},
        {"v": "3.1", "ts": "2026-10-21T01:05:00+07:00", "task_id": "T-ZEPHYR-FROM", "from": "zephyr", "to": "daemon", "status": "RUNNING", "artifacts": []},
        {"v": "3.1", "ts": "2026-10-21T01:10:00+07:00", "task_id": "T-SAGE-IRIS", "from": "sage", "to": "iris", "status": "SUCCEEDED", "artifacts": []},
    ]
    mock_tasks.write_text("\n".join(json.dumps(ln) for ln in lines) + "\n")

    with patch("app.TASKS_FILE", mock_tasks):
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
            # 1. Filter by agent=zephyr should match both T-ZEPHYR-TO and T-ZEPHYR-FROM
            res_agent = await client.get("/api/tasks?agent=zephyr")
            assert res_agent.status_code == 200
            data_agent = res_agent.json()
            assert data_agent["count"] == 2
            ids = {t["task_id"] for t in data_agent["tasks"]}
            assert ids == {"T-ZEPHYR-TO", "T-ZEPHYR-FROM"}

            # 2. Filter by to=zephyr matches only T-ZEPHYR-TO
            res_to = await client.get("/api/tasks?to=zephyr")
            assert res_to.status_code == 200
            data_to = res_to.json()
            assert data_to["count"] == 1
            assert data_to["tasks"][0]["task_id"] == "T-ZEPHYR-TO"

            # 3. Filter by agent=daemon matches T-ZEPHYR-FROM (to=daemon)
            res_daemon = await client.get("/api/tasks?agent=daemon")
            assert res_daemon.status_code == 200
            data_daemon = res_daemon.json()
            assert data_daemon["count"] == 1
            assert data_daemon["tasks"][0]["task_id"] == "T-ZEPHYR-FROM"

            # 4. Filter by agent=zephyr and status=SUCCEEDED matches only T-ZEPHYR-TO
            res_combo = await client.get("/api/tasks?agent=zephyr&status=SUCCEEDED")
            assert res_combo.status_code == 200
            data_combo = res_combo.json()
            assert data_combo["count"] == 1
            assert data_combo["tasks"][0]["task_id"] == "T-ZEPHYR-TO"


@pytest.mark.asyncio
async def test_endpoint_api_tasks_privacy_sanitization(tmp_path: Path):
    """Test that /api/tasks and /api/tasks/{task_id} sanitize sensitive tokens and internal paths."""
    dummy_home = Path("/home/operator")
    raw_chat_id = "9876543210"
    raw_email = "user@example.com"
    raw_path = f"{dummy_home}/project"
    raw_token = "9876543210:ABCdefGHIjklMNOpqrSTUvwxYZ123456789"
    raw_bearer = "Bearer MOCK_BEARER_TOKEN_ABCD12345678901234"

    mock_tasks = tmp_path / "mock_privacy_tasks.jsonl"
    lines = [
        {
            "v": "3.1",
            "ts": "2026-10-21T02:00:00+07:00",
            "task_id": "T-PRIVACY",
            "from": "nexus",
            "to": "zephyr",
            "status": "SUCCEEDED",
            "intent": f"Run security audit on {raw_path} for chat ID {raw_chat_id}, email {raw_email}, and bot token {raw_token}",
            "artifacts": [f"{dummy_home}/ai7-solaris/handoff/zephyr/out/T-PRIVACY.out.md"],
            "spec": f"{dummy_home}/ai7-solaris/handoff/zephyr/in/T-PRIVACY.task.md",
            "error": f"Error at {dummy_home}/ai7-solaris/dispatcher/core.py with {raw_bearer}",
            "artifact_sha256": "fakehash",
        }
    ]
    mock_tasks.write_text("\n".join(json.dumps(ln) for ln in lines) + "\n")

    with patch("app.TASKS_FILE", mock_tasks), \
         patch("app.HOME", dummy_home), \
         patch("app.BASE", dummy_home / "ai7-solaris"):
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
            res = await client.get("/api/tasks")
            assert res.status_code == 200
            task = res.json()["tasks"][0]

            # Verify no naked paths or sensitive credentials
            assert raw_path not in task["intent"]
            assert str(dummy_home) not in task["intent"]
            assert "~/project" in task["intent"]
            assert raw_chat_id not in task["intent"]
            assert "[REDACTED_CHAT_ID]" in task["intent"]
            assert raw_email not in task["intent"]
            assert "[REDACTED_EMAIL]" in task["intent"]
            assert raw_token not in task["intent"]
            assert "[REDACTED_TOKEN]" in task["intent"]

            # Normalized artifacts & spec
            assert task["artifacts"] == ["handoff/zephyr/out/T-PRIVACY.out.md"]
            assert task["spec"] == "handoff/zephyr/in/T-PRIVACY.task.md"

            # Sanitized error
            assert str(dummy_home) not in task["error"]
            assert "MOCK_BEARER_TOKEN_ABCD12345678901234" not in task["error"]
            assert "[REDACTED_TOKEN]" in task["error"]

            # Verify single-task endpoint also serves sanitized task
            res_single = await client.get("/api/tasks/T-PRIVACY")
            assert res_single.status_code == 200
            single_task = res_single.json()
            assert single_task["task_id"] == "T-PRIVACY"
            assert single_task["artifacts"] == ["handoff/zephyr/out/T-PRIVACY.out.md"]
            assert str(dummy_home) not in single_task["intent"]
            assert raw_path not in single_task["intent"]


# ---------------------------------------------------------------------------
# Sovereign Console HTTP Basic Authentication Tests
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_basic_auth_disabled_when_env_unset(monkeypatch):
    """When CONSOLE_AUTH_USER and CONSOLE_AUTH_PASS are not configured, requests succeed without auth."""
    monkeypatch.delenv("CONSOLE_AUTH_USER", raising=False)
    monkeypatch.delenv("CONSOLE_AUTH_PASS", raising=False)

    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        res_health = await client.get("/health")
        assert res_health.status_code == 200

        res_root = await client.get("/")
        assert res_root.status_code in (200, 404)

        res_api = await client.get("/api/status")
        assert res_api.status_code == 200


@pytest.mark.asyncio
async def test_basic_auth_unauthorized_when_auth_enabled(monkeypatch):
    """When credentials are configured, unauthenticated requests to protected routes return 401."""
    monkeypatch.setenv("CONSOLE_AUTH_USER", "alif")
    monkeypatch.setenv("CONSOLE_AUTH_PASS", "supersecret123")

    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        # /health is exempt
        res_health = await client.get("/health")
        assert res_health.status_code == 200
        assert res_health.json() == {"ok": True}

        # Protected endpoints return 401 and challenge header
        for endpoint in ["/", "/v3/", "/api/status", "/api/tasks", "/api/vps"]:
            res = await client.get(endpoint)
            assert res.status_code == 401
            assert res.headers.get("www-authenticate") == 'Basic realm="The Luminaries Sovereign Console"'
            assert res.json() == {"detail": "Unauthorized"}


@pytest.mark.asyncio
async def test_basic_auth_invalid_credentials(monkeypatch):
    """Requests with invalid credentials or malformed auth headers return 401."""
    monkeypatch.setenv("CONSOLE_AUTH_USER", "alif")
    monkeypatch.setenv("CONSOLE_AUTH_PASS", "supersecret123")

    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Wrong password
        res_wrong_pw = await client.get("/api/status", auth=("alif", "wrongpassword"))
        assert res_wrong_pw.status_code == 401
        assert res_wrong_pw.headers.get("www-authenticate") == 'Basic realm="The Luminaries Sovereign Console"'

        # 2. Wrong username
        res_wrong_user = await client.get("/api/status", auth=("intruder", "supersecret123"))
        assert res_wrong_user.status_code == 401

        # 3. Non-Basic authorization scheme
        res_bearer = await client.get("/api/status", headers={"Authorization": "Bearer some-token"})
        assert res_bearer.status_code == 401

        # 4. Malformed Base64
        res_malformed_b64 = await client.get("/api/status", headers={"Authorization": "Basic !!!not-valid-b64!!!"})
        assert res_malformed_b64.status_code == 401

        # 5. Base64 without username:password separator
        res_no_sep = await client.get("/api/status", headers={"Authorization": "Basic bm9zZXBhcmF0b3I="})
        assert res_no_sep.status_code == 401


@pytest.mark.asyncio
async def test_basic_auth_valid_credentials(monkeypatch):
    """Requests with valid credentials succeed on all endpoints."""
    monkeypatch.setenv("CONSOLE_AUTH_USER", "alif")
    monkeypatch.setenv("CONSOLE_AUTH_PASS", "supersecret123")

    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        # Root endpoint
        res_root = await client.get("/", auth=("alif", "supersecret123"))
        assert res_root.status_code in (200, 404)

        # Status endpoint
        res_status = await client.get("/api/status", auth=("alif", "supersecret123"))
        assert res_status.status_code == 200
        assert res_status.json()["scope"] == "fleet"

        # Tasks endpoint
        res_tasks = await client.get("/api/tasks", auth=("alif", "supersecret123"))
        assert res_tasks.status_code == 200
        assert "tasks" in res_tasks.json()

        # Mounted v3 console
        res_v3 = await client.get("/v3/", auth=("alif", "supersecret123"))
        assert res_v3.status_code == 200

        # VPS endpoint
        res_vps = await client.get("/api/vps", auth=("alif", "supersecret123"))
        assert res_vps.status_code == 200
        assert "host" in res_vps.json()


# ---------------------------------------------------------------------------
# Unit tests: /api/vps Endpoint & VPS Telemetry
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_endpoint_api_vps_success():
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.get("/api/vps")
        assert res.status_code == 200
        body = res.json()

        # Success criteria 1 & 3: root keys
        for key in ("host", "cpu", "memory", "disk", "services"):
            assert key in body, f"Missing root key: {key}"
        assert "generated_at" in body

        # Host schema
        host = body["host"]
        assert isinstance(host["hostname"], str) and len(host["hostname"]) > 0
        assert isinstance(host["uptime_seconds"], (int, float)) and host["uptime_seconds"] >= 0
        assert isinstance(host["os"], str) and len(host["os"]) > 0
        assert isinstance(host["kernel"], str) and len(host["kernel"]) > 0

        # CPU schema
        cpu = body["cpu"]
        assert isinstance(cpu["load_1m"], (int, float)) and cpu["load_1m"] >= 0
        assert isinstance(cpu["load_5m"], (int, float)) and cpu["load_5m"] >= 0
        assert isinstance(cpu["load_15m"], (int, float)) and cpu["load_15m"] >= 0
        assert isinstance(cpu["cores"], int) and cpu["cores"] >= 1
        assert isinstance(cpu["usage_pct"], (int, float)) and cpu["usage_pct"] >= 0

        # Memory schema
        mem = body["memory"]
        assert isinstance(mem["total_bytes"], int) and mem["total_bytes"] >= 0
        assert isinstance(mem["used_bytes"], int) and mem["used_bytes"] >= 0
        assert isinstance(mem["free_bytes"], int) and mem["free_bytes"] >= 0
        assert isinstance(mem["available_bytes"], int) and mem["available_bytes"] >= 0
        assert isinstance(mem["usage_pct"], (int, float)) and 0 <= mem["usage_pct"] <= 100

        # Disk schema
        disk = body["disk"]
        assert disk["path"] == "/"
        assert isinstance(disk["total_bytes"], int) and disk["total_bytes"] >= 0
        assert isinstance(disk["used_bytes"], int) and disk["used_bytes"] >= 0
        assert isinstance(disk["free_bytes"], int) and disk["free_bytes"] >= 0
        assert isinstance(disk["usage_pct"], (int, float)) and 0 <= disk["usage_pct"] <= 100
        assert isinstance(disk["is_warning"], bool)

        # Services schema
        services = body["services"]
        assert isinstance(services, list)
        assert len(services) == len(CRITICAL_SERVICES)
        service_names = [s["name"] for s in services]
        for expected_svc in CRITICAL_SERVICES:
            assert expected_svc in service_names

        for s in services:
            assert "name" in s
            assert "unit" in s
            assert "state" in s
            assert "status" in s
            assert "active" in s
            assert isinstance(s["active"], bool)


@pytest.mark.asyncio
async def test_endpoint_api_vps_disk_warning_logic():
    from collections import namedtuple
    Usage = namedtuple("Usage", ["total", "used", "free"])

    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        # Case 1: usage > 85% -> is_warning is True
        with patch("shutil.disk_usage", return_value=Usage(total=100_000, used=86_000, free=14_000)):
            res = await client.get("/api/vps")
            assert res.status_code == 200
            disk = res.json()["disk"]
            assert disk["usage_pct"] == 86.0
            assert disk["is_warning"] is True

        # Case 2: usage <= 85% -> is_warning is False
        with patch("shutil.disk_usage", return_value=Usage(total=100_000, used=85_000, free=15_000)):
            res = await client.get("/api/vps")
            assert res.status_code == 200
            disk = res.json()["disk"]
            assert disk["usage_pct"] == 85.0
            assert disk["is_warning"] is False

        # Case 3: low usage -> is_warning is False
        with patch("shutil.disk_usage", return_value=Usage(total=100_000, used=30_000, free=70_000)):
            res = await client.get("/api/vps")
            assert res.status_code == 200
            disk = res.json()["disk"]
            assert disk["usage_pct"] == 30.0
            assert disk["is_warning"] is False


@pytest.mark.asyncio
async def test_endpoint_api_vps_error_handling():
    with patch("app.collect_vps_telemetry", side_effect=RuntimeError("telemetry collection failed")):
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
            res = await client.get("/api/vps")
            assert res.status_code == 500
            body = res.json()
            assert "error" in body
            assert "telemetry collection failed" in body["error"]
            assert "generated_at" in body


def test_collect_vps_telemetry_calculations():
    with patch("os.getloadavg", return_value=(2.0, 1.5, 1.0)), patch("os.cpu_count", return_value=4):
        from app import _get_cpu_info
        cpu_data = _get_cpu_info()
        assert cpu_data["load_1m"] == 2.0
        assert cpu_data["cores"] == 4
        assert cpu_data["usage_pct"] == 50.0

    data = collect_vps_telemetry()
    assert all(k in data for k in ("generated_at", "host", "cpu", "memory", "disk", "services"))
