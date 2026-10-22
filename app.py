"""AI7 Solaris — status collector + API.

Scope: 13-Entity Fleet (Nexus Orchestrator + 9 Luminaries + 3 Satellites).
Normalized Task Telemetry derived from dispatcher event log.

Status model (honest to how Luminaries actually run — on demand, not as daemons):
  running  — a `hermes --profile <name>` process exists right now (or active systemd unit)
  recent   — agent.log touched within the last 15 minutes
  idle     — touched within 24 hours (or inactive systemd unit)
  stale    — touched more than 24 hours ago
  error    — errors.log newer than agent.log with fatal/exception traffic (or failed systemd unit)
  unknown  — no log at all yet
"""
from __future__ import annotations

import json
import os
import re
import subprocess
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from fastapi import FastAPI, Query
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

HOME = Path.home()
PROFILES = HOME / ".hermes" / "profiles"
BASE = Path(__file__).resolve().parent
STATIC = BASE / "static"
TASKS_FILE = Path(os.environ.get("SOLARIS_TASKS_FILE", str(BASE / "dispatcher" / "tasks.jsonl")))
ACTIVE_TASKS_FILE = Path(os.environ.get("SOLARIS_ACTIVE_TASKS_FILE", str(BASE / "dispatcher" / "active_tasks.json")))
RESOLVED_FILE = Path(os.environ.get("SOLARIS_RESOLVED_FILE", str(BASE / "dispatcher" / "resolved.json")))

RECENT_SEC = 15 * 60
IDLE_SEC = 24 * 3600

# Configurable stuck thresholds
STUCK_QUEUED_THRESHOLD_SEC = int(os.environ.get("SOLARIS_STUCK_QUEUED_THRESHOLD_SEC", "600"))
STUCK_RUNNING_THRESHOLD_SEC = int(os.environ.get("SOLARIS_STUCK_RUNNING_THRESHOLD_SEC", "3600"))

LUMINARIES = [
    ("sage", "Research strategist", "First-principles analysis, planning, research"),
    ("athena", "Academic scholar", "Thesis co-pilot, manuscript craft, literature defense"),
    ("chronos", "Chief of staff", "Daily momentum, sprint pacing, life telemetry, operations"),
    ("zephyr", "Core software engineer", "FastAPI backend, data layer, algorithm benchmarks"),
    ("daemon", "SRE & Systems guardian", "Linux runtime, 24/7 reliability, systemd, maintenance"),
    ("iris", "UI/UX designer", "Anti-slop interface, design systems"),
    ("aegis", "Security & QA", "Audit, hardening, test coverage"),
    ("nacht", "Shadow recon", "arXiv, papers, deep web research"),
    ("ariadne", "Knowledge synthesis", "Obsidian PARA, note weaving"),
]

SATELLITES = [
    ("steward", "Fiscal overseer", "Personal finance bot & Mandiri cash pacing", "ai7-finance.service", ["ai7-finance-web.service"]),
    ("warden", "Gym & nutrition sentinel", "Gym checklist & nutrition logger", "ai7-warden.service", []),
    ("sentinel", "System radar & email briefing", "IMAP live email radar & morning/night briefs", "ai7-email-live.service", []),
]

AGENT_META: dict[str, dict[str, str]] = {
    "nexus": {"name": "Nexus", "role": "Orchestrator"},
    **{name: {"name": name.capitalize(), "role": role} for name, role, _ in LUMINARIES},
    **{name: {"name": name.capitalize(), "role": role} for name, role, _, _, *rest in SATELLITES},
}

_EMAIL_RE = re.compile(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b")
_TG_TOKEN_RE = re.compile(r"\b\d{8,10}:[A-Za-z0-9_-]{35}\b")
_OPENAI_KEY_RE = re.compile(r"\b(sk-[A-Za-z0-9_-]{20,})\b")
_BEARER_RE = re.compile(r"(?i)\b(bearer\s+)[A-Za-z0-9_.-]{20,}\b")
_SENSITIVE_KEY_RE = re.compile(r"(?i)\b(token|secret|password|api[_-]?key)\s*[:=]\s*['\"]?([A-Za-z0-9_.-]{16,})['\"]?")
_CHAT_ID_RE = re.compile(r"\b\d{9,11}\b")


def sanitize_text(text: str | None) -> str | None:
    """Sanitize internal paths and sensitive user data from text strings."""
    if not text or not isinstance(text, str):
        return text

    # Redact tokens before chat ID so token numeric prefixes are not partially replaced
    res = _TG_TOKEN_RE.sub("[REDACTED_TOKEN]", text)
    res = _OPENAI_KEY_RE.sub("[REDACTED_TOKEN]", res)
    res = _BEARER_RE.sub(r"\1[REDACTED_TOKEN]", res)
    res = _SENSITIVE_KEY_RE.sub(r"\1: [REDACTED_TOKEN]", res)
    res = _CHAT_ID_RE.sub("[REDACTED_CHAT_ID]", res)
    res = _EMAIL_RE.sub("[REDACTED_EMAIL]", res)

    base_str = str(BASE)
    home_str = str(HOME)
    if base_str in res:
        res = res.replace(base_str + "/", "~/ai7-solaris/")
        res = res.replace(base_str, "~/ai7-solaris")
    if home_str in res:
        res = res.replace(home_str + "/", "~/")
        res = res.replace(home_str, "~")

    return res


def normalize_path(path_val: str | Path | None) -> str:
    """Normalize internal file paths to repo-relative or home-relative paths."""
    if not path_val:
        return ""
    p_str = str(path_val).strip()
    if not p_str:
        return ""

    try:
        p = Path(p_str).expanduser()
        if p.is_absolute():
            try:
                rel = p.relative_to(BASE)
                return str(rel)
            except ValueError:
                pass
        else:
            return p_str
    except Exception:
        pass

    try:
        p = Path(p_str).expanduser()
        if p.is_absolute():
            try:
                rel = p.relative_to(HOME)
                return f"~/{rel}"
            except ValueError:
                pass
    except Exception:
        pass

    home_str = str(HOME)
    if p_str.startswith(home_str + "/"):
        return "~/" + p_str[len(home_str) + 1:]
    if p_str == home_str:
        return "~"
    return p_str


app = FastAPI(title="AI7 Solaris", docs_url=None, redoc_url=None)


def _iso(ts: float | None) -> str | None:
    if not ts:
        return None
    return datetime.fromtimestamp(ts, timezone.utc).isoformat(timespec="seconds")


def _parse_iso_ts(ts_val: Any) -> datetime | None:
    """Parse ISO 8601 or common timestamp formats safely without failing.
    
    Returns None for invalid strings like 'now', 'unknown', empty, or malformed values.
    """
    if not ts_val or not isinstance(ts_val, str):
        return None
    s = ts_val.strip()
    if s.lower() in ("now", "unknown", "none", "null", "n/a", "0", ""):
        return None
    try:
        dt = datetime.fromisoformat(s)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt
    except (ValueError, TypeError):
        pass

    for fmt in (
        "%Y-%m-%dT%H:%M:%S%z",
        "%Y-%m-%d %H:%M:%S%z",
        "%Y-%m-%dT%H:%M:%S",
        "%Y-%m-%d %H:%M:%S",
    ):
        try:
            dt = datetime.strptime(s, fmt)
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
            return dt
        except ValueError:
            continue
    return None


def _parse_systemd_timestamp(ts_str: str | None) -> str | None:
    """Normalize systemd timestamp into standard ISO 8601 UTC string."""
    if not ts_str or ts_str in ("n/a", "N/A", "0"):
        return None
    s = ts_str.strip()
    try:
        dt = datetime.fromisoformat(s)
        return dt.astimezone(timezone.utc).isoformat(timespec="seconds")
    except ValueError:
        pass

    parts = s.split()
    if len(parts) >= 3 and "-" in parts[1] and ":" in parts[2]:
        date_part, time_part = parts[1], parts[2]
        tz_part = parts[3] if len(parts) > 3 else None
    elif len(parts) >= 2 and "-" in parts[0] and ":" in parts[1]:
        date_part, time_part = parts[0], parts[1]
        tz_part = parts[2] if len(parts) > 2 else None
    else:
        return None

    if tz_part:
        tz_upper = tz_part.upper()
        if tz_upper in ("UTC", "Z", "GMT"):
            tz = timezone.utc
        elif tz_part in time.tzname:
            tz = datetime.now().astimezone().tzinfo
        else:
            tz = datetime.now().astimezone().tzinfo
    else:
        tz = datetime.now().astimezone().tzinfo

    try:
        dt = datetime.strptime(f"{date_part} {time_part}", "%Y-%m-%d %H:%M:%S")
        dt = dt.replace(tzinfo=tz)
        return dt.astimezone(timezone.utc).isoformat(timespec="seconds")
    except (ValueError, OSError):
        return None


def _mtime(p: Path) -> float | None:
    try:
        return p.stat().st_mtime
    except OSError:
        return None


def _file_size(p: Path) -> int | None:
    try:
        return p.stat().st_size
    except OSError:
        return None


def running_profiles() -> dict[str, list[int]]:
    """Map profile name -> pids, by scanning /proc for hermes invocations."""
    found: dict[str, list[int]] = {}
    me = os.getpid()
    proc = Path("/proc")
    if not proc.is_dir():
        return found
    try:
        entries = list(proc.iterdir())
    except OSError:
        return found

    target_profiles = {name for name, _, _ in LUMINARIES}

    for entry in entries:
        if not entry.name.isdigit():
            continue
        try:
            pid = int(entry.name)
        except ValueError:
            continue
        if pid == me:
            continue
        try:
            raw = (entry / "cmdline").read_bytes()
        except OSError:
            continue

        parts = [p.decode("utf-8", "replace") for p in raw.split(b"\0") if p]
        if not parts:
            continue

        exe = Path(parts[0]).name.lower()
        if not (exe.startswith("python") or "hermes" in exe):
            continue

        if exe.startswith("python"):
            has_hermes_context = any(
                "hermes" in part.lower() or part in ("-c", "-m")
                for part in parts[1:]
            )
            if not has_hermes_context:
                continue

        matched_profiles = set()
        num_parts = len(parts)
        for i, token in enumerate(parts):
            if token in ("-p", "--profile"):
                if i + 1 < num_parts and parts[i + 1] in target_profiles:
                    matched_profiles.add(parts[i + 1])
            elif token.startswith("--profile="):
                val = token.split("=", 1)[1]
                if val in target_profiles:
                    matched_profiles.add(val)

        for name in matched_profiles:
            found.setdefault(name, []).append(pid)
    return found


def _systemd(unit: str) -> dict:
    for scope in (["--user"], []):
        try:
            out = subprocess.run(
                ["systemctl", *scope, "show", unit,
                 "-p", "LoadState", "-p", "ActiveState", "-p", "ActiveEnterTimestamp", "-p", "NRestarts", "-p", "MainPID"],
                capture_output=True, text=True, timeout=4,
            ).stdout
        except (OSError, subprocess.SubprocessError):
            out = ""
        kv = {}
        for line in out.splitlines():
            if "=" in line:
                k, v = line.split("=", 1)
                kv[k] = v.strip()
        load_state = kv.get("LoadState")
        active_state = kv.get("ActiveState")
        if load_state == "loaded" or active_state in ("active", "activating", "deactivating", "failed"):
            main_pid_val = kv.get("MainPID")
            main_pid = int(main_pid_val) if main_pid_val and main_pid_val.isdigit() and int(main_pid_val) > 0 else None
            return {
                "unit": unit,
                "scope": "user" if scope else "system",
                "state": active_state or "unknown",
                "since": _parse_systemd_timestamp(kv.get("ActiveEnterTimestamp")),
                "restarts": kv.get("NRestarts") or None,
                "main_pid": main_pid,
            }
    return {"unit": unit, "scope": None, "state": "unknown", "since": None, "restarts": None, "main_pid": None}


def _cron_count(profile_dir: Path) -> int:
    f = profile_dir / "cron" / "jobs.json"
    try:
        data = json.loads(f.read_text())
        jobs = data.get("jobs", data) if isinstance(data, dict) else data
        return len(jobs) if isinstance(jobs, list) else 0
    except (OSError, json.JSONDecodeError):
        return 0


def _check_error_log(path: Path) -> tuple[bool, str | None]:
    """Inspect errors.log to distinguish fatal exceptions from harmless warnings.

    Returns (has_fatal_error, tail_line).
    """
    try:
        if not path.is_file():
            return False, None
        with path.open("rb") as fh:
            fh.seek(0, os.SEEK_END)
            size = fh.tell()
            fh.seek(max(0, size - 4000))
            chunk = fh.read().decode("utf-8", "replace")
        lines = [ln.strip() for ln in chunk.splitlines() if ln.strip()]
        if not lines:
            return False, None

        last_line = lines[-1][:300]

        for ln in reversed(lines):
            m = re.match(r"^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2},\d+\s+([A-Z]+)", ln)
            if m:
                level = m.group(1)
                if level in ("ERROR", "CRITICAL", "FATAL"):
                    return True, last_line
                elif level in ("WARNING", "INFO", "DEBUG"):
                    return False, last_line

            if ln.startswith("Traceback (most recent call last):") or re.match(r"^[A-Za-z0-9_]+(Error|Exception):", ln):
                return True, last_line

        lower = last_line.lower()
        if "warning" in lower and "error" not in lower and "exception" not in lower:
            return False, last_line
        if any(k in lower for k in ("error", "exception", "critical", "fatal", "traceback")):
            return True, last_line

        return False, last_line
    except OSError:
        return False, None


def _tail(path: Path, n: int = 1) -> str | None:
    try:
        with path.open("rb") as fh:
            fh.seek(0, os.SEEK_END)
            size = fh.tell()
            fh.seek(max(0, size - 4000))
            lines = [ln for ln in fh.read().decode("utf-8", "replace").splitlines() if ln.strip()]
        return lines[-n][:300] if lines else None
    except OSError:
        return None


def derive_status(
    has_proc: bool,
    log_age: float | None,
    err_age: float | None = None,
    has_error: bool = False,
) -> str:
    if has_proc:
        return "running"
    if log_age is None:
        return "unknown"
    if has_error and err_age is not None and err_age < log_age and (log_age - err_age) < IDLE_SEC:
        return "error"
    if log_age <= RECENT_SEC:
        return "recent"
    if log_age <= IDLE_SEC:
        return "idle"
    return "stale"


def collect(scope: str = "fleet") -> dict:
    """Collect status for all fleet entities (Nexus, Luminaries, Satellites).
    
    Guarantees consistent key shapes across all entries:
    id, name, role, desc, kind, status, running, pids, last_active, age_seconds,
    log_size, errors, cron_jobs, service.
    """
    now = time.time()
    procs = running_profiles()

    gateway = _systemd("hermes-gateway")
    gateway_ok = gateway["state"] == "active"
    nexus_pids = [gateway["main_pid"]] if gateway_ok and gateway.get("main_pid") else []

    agents = [{
        "id": "nexus",
        "name": "Nexus",
        "role": "Orchestrator",
        "desc": "Single entry point, delegation, coordination",
        "kind": "orchestrator",
        "status": "running" if gateway_ok else "error",
        "running": gateway_ok,
        "pids": nexus_pids,
        "last_active": gateway["since"],
        "age_seconds": None,
        "log_size": None,
        "errors": None,
        "cron_jobs": _cron_count(HOME / ".hermes"),
        "service": gateway,
        "extra_services": [],
    }]

    for name, role, desc in LUMINARIES:
        pdir = PROFILES / name
        log = pdir / "logs" / "agent.log"
        err = pdir / "logs" / "errors.log"
        log_ts, err_ts = _mtime(log), _mtime(err)
        log_age = (now - log_ts) if log_ts else None
        err_age = (now - err_ts) if err_ts else None
        pids = procs.get(name, [])

        has_fatal_err, err_tail = _check_error_log(err)

        agents.append({
            "id": name,
            "name": name.capitalize(),
            "role": role,
            "desc": desc,
            "kind": "luminary",
            "status": derive_status(bool(pids), log_age, err_age, has_error=has_fatal_err),
            "running": bool(pids),
            "pids": pids,
            "last_active": _iso(log_ts),
            "age_seconds": int(log_age) if log_age is not None else None,
            "log_size": _file_size(log),
            "errors": {
                "last_at": _iso(err_ts),
                "tail": err_tail,
                "fatal": True,
            } if has_fatal_err else None,
            "cron_jobs": _cron_count(pdir),
            "service": None,
            "extra_services": [],
        })

    if scope != "luminaries":
        for sat in SATELLITES:
            sat_id, role, desc, primary_unit = sat[0], sat[1], sat[2], sat[3]
            extra_unit_names = sat[4] if len(sat) > 4 else []

            svc = _systemd(primary_unit)
            extra_svcs = [_systemd(u) for u in extra_unit_names]

            all_svcs = [svc] + extra_svcs
            active_svcs = [s for s in all_svcs if s.get("state") == "active"]
            failed_svcs = [s for s in all_svcs if s.get("state") == "failed"]

            if active_svcs:
                sat_status = "running"
                sat_running = True
            elif failed_svcs:
                sat_status = "error"
                sat_running = False
            elif svc.get("state") == "inactive":
                sat_status = "idle"
                sat_running = False
            else:
                sat_status = "unknown"
                sat_running = False

            sat_pids = []
            for s in all_svcs:
                if s.get("state") == "active" and s.get("main_pid"):
                    sat_pids.append(s["main_pid"])

            sat_errors = None
            if failed_svcs:
                first_failed = failed_svcs[0]
                sat_errors = {
                    "last_at": first_failed.get("since"),
                    "tail": f"Service unit {first_failed.get('unit')} failed",
                    "fatal": True,
                }

            agents.append({
                "id": sat_id,
                "name": sat_id.capitalize(),
                "role": role,
                "desc": desc,
                "kind": "satellite",
                "status": sat_status,
                "running": sat_running,
                "pids": sat_pids,
                "last_active": svc.get("since"),
                "age_seconds": None,
                "log_size": None,
                "errors": sat_errors,
                "cron_jobs": 0,
                "service": svc,
                "extra_services": extra_svcs,
            })

    return {
        "generated_at": _iso(now),
        "scope": scope,
        "count": len(agents),
        "agents": agents,
    }


def derive_tasks(
    tasks_file: Path | str | None = None,
    active_tasks_file: Path | str | None = None,
    resolved_file: Path | str | None = None,
) -> list[dict]:
    """Derive task states from append-only tasks.jsonl event log.

    Implements:
      C-1: State per task derived from the final event entry.
      C-2: Server-calculated elapsed_seconds with explicit null on invalid timestamps.
      C-3: Honest artifact verification (missing_file, empty_file, no_hash).
      C-4: Configurable stuck task detection for hanging QUEUED/RUNNING tasks.
      D-7: Orphaned task reconciliation (QUEUED exceeding threshold without active worker).
      D-7: timeout_s exposure from dispatch event metadata.
      D-7: resolved annotation layer from dispatcher/resolved.json.
    """
    p = Path(tasks_file) if tasks_file else TASKS_FILE
    if not p.is_file():
        return []

    act_p = Path(active_tasks_file) if active_tasks_file else ACTIVE_TASKS_FILE
    active_tasks: dict = {}
    if act_p.is_file():
        try:
            with open(act_p, "r", encoding="utf-8") as af:
                data = json.load(af)
                if isinstance(data, dict):
                    active_tasks = data
        except Exception:
            active_tasks = {}

    res_p = Path(resolved_file) if resolved_file else RESOLVED_FILE
    resolved_map: dict[str, dict] = {}
    if res_p.is_file():
        try:
            with open(res_p, "r", encoding="utf-8") as rf:
                data = json.load(rf)
                if isinstance(data, dict):
                    resolved_map = data
        except Exception:
            resolved_map = {}

    tasks_events: dict[str, list[dict]] = {}
    try:
        with open(p, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                try:
                    event = json.loads(line)
                except Exception:
                    # Ignore corrupted log lines without breaking endpoint
                    continue
                if isinstance(event, dict) and "task_id" in event and event["task_id"]:
                    tid = str(event["task_id"]).strip()
                    tasks_events.setdefault(tid, []).append(event)
    except OSError:
        return []

    now_utc = datetime.now(timezone.utc)
    now_ts = now_utc.timestamp()

    if "SOLARIS_STUCK_THRESHOLD_SEC" in os.environ:
        queued_thresh = int(os.environ["SOLARIS_STUCK_THRESHOLD_SEC"])
        running_thresh = int(os.environ["SOLARIS_STUCK_THRESHOLD_SEC"])
    else:
        queued_thresh = STUCK_QUEUED_THRESHOLD_SEC
        running_thresh = STUCK_RUNNING_THRESHOLD_SEC

    derived: list[dict] = []

    for tid, events in tasks_events.items():
        if not events:
            continue
        first = events[0]
        last = events[-1]

        parent_task_id = last.get("parent_task_id") if "parent_task_id" in last else first.get("parent_task_id")
        to_agent = last.get("to") or first.get("to")
        from_agent = last.get("from") or first.get("from")
        task_type = last.get("type") or first.get("type")
        status = last.get("status", "UNKNOWN")
        intent = last.get("intent") or first.get("intent")
        raw_ts = last.get("ts")
        error = last.get("error")
        attempt = last.get("attempt") or first.get("attempt") or 1

        # D-7: timeout_s from last or first event, or None
        raw_timeout = last.get("timeout_s") if "timeout_s" in last else first.get("timeout_s")
        timeout_s = int(raw_timeout) if isinstance(raw_timeout, (int, float)) else None

        artifacts = last.get("artifacts") if "artifacts" in last else first.get("artifacts", [])
        if isinstance(artifacts, str):
            artifacts = [artifacts]
        elif not isinstance(artifacts, list):
            artifacts = []

        artifact_sha256 = last.get("artifact_sha256") or first.get("artifact_sha256")
        spec = last.get("spec") or first.get("spec")
        spec_sha256 = last.get("spec_sha256") or first.get("spec_sha256")

        # C-2: Timestamp parsing & elapsed_seconds calculation
        last_dt = _parse_iso_ts(raw_ts)
        ts_valid = last_dt is not None

        elapsed_seconds: float | None = None
        if not ts_valid:
            elapsed_seconds = None
        else:
            if status in ("QUEUED", "RUNNING", "ORPHANED"):
                # Non-terminal: calculated against current server time
                elapsed_seconds = max(0.0, round(now_ts - last_dt.astimezone(timezone.utc).timestamp(), 2))
            else:
                # Terminal: duration between earliest valid event ts and terminal ts
                first_dt = None
                for ev in events:
                    dt = _parse_iso_ts(ev.get("ts"))
                    if dt is not None:
                        first_dt = dt
                        break
                if first_dt is not None:
                    elapsed_seconds = max(0.0, round(last_dt.astimezone(timezone.utc).timestamp() - first_dt.astimezone(timezone.utc).timestamp(), 2))
                else:
                    elapsed_seconds = 0.0

        # D-7: Orphaned task reconciliation
        # A task QUEUED with no entry in active_tasks exceeding queued_thresh is ORPHANED
        if status == "QUEUED" and elapsed_seconds is not None and elapsed_seconds > queued_thresh:
            if tid not in active_tasks:
                status = "ORPHANED"
                if not error:
                    error = "Worker tidak pernah mulai (tidak ada entri di active_tasks.json dan batas antre 600s terlampaui)"

        # D-1 & D-2: Honest artifact verification & legacy path resolution
        artifact_verified = False
        artifact_verification_reason: str | None = None
        artifact_path_source: str | None = None

        if status == "SUCCEEDED":
            if not artifacts:
                artifact_verified = False
                artifact_verification_reason = "missing_file"
                artifact_path_source = None
            else:
                has_missing = False
                has_empty = False
                sources: list[str] = []

                for art_str in artifacts:
                    try:
                        art_p = Path(art_str).expanduser()
                        if not art_p.is_absolute():
                            if p != TASKS_FILE and (p.parent / art_p).is_file():
                                art_p = (p.parent / art_p).resolve()
                            elif p != TASKS_FILE and (p.parent.parent / art_p).is_file():
                                art_p = (p.parent.parent / art_p).resolve()
                            else:
                                art_p = (BASE / art_p).resolve()

                        resolved_p = None
                        src = None
                        if art_p.is_file():
                            resolved_p = art_p
                            src = "recorded"
                        elif art_p.parent.name != "out":
                            legacy_p = art_p.parent / "out" / art_p.name
                            if legacy_p.is_file():
                                resolved_p = legacy_p
                                src = "legacy_out"

                        if resolved_p is None or src is None:
                            has_missing = True
                            break
                        sources.append(src)
                        if resolved_p.stat().st_size == 0:
                            has_empty = True
                            break
                    except (OSError, PermissionError):
                        has_missing = True
                        break

                if has_missing:
                    artifact_verified = False
                    artifact_verification_reason = "missing_file"
                    artifact_path_source = None
                elif has_empty:
                    artifact_verified = False
                    artifact_verification_reason = "empty_file"
                    artifact_path_source = "legacy_out" if any(s == "legacy_out" for s in sources) else "recorded"
                elif not artifact_sha256 or not str(artifact_sha256).strip():
                    artifact_verified = False
                    artifact_verification_reason = "no_hash"
                    artifact_path_source = "legacy_out" if any(s == "legacy_out" for s in sources) else "recorded"
                else:
                    artifact_verified = True
                    artifact_verification_reason = None
                    artifact_path_source = "legacy_out" if any(s == "legacy_out" for s in sources) else "recorded"
        else:
            artifact_verified = False
            artifact_verification_reason = None
            artifact_path_source = None

        # C-4: Stuck detection
        stuck = False
        stuck_reason: str | None = None

        if status in ("QUEUED", "RUNNING") and elapsed_seconds is not None:
            thresh = queued_thresh if status == "QUEUED" else running_thresh
            if elapsed_seconds > thresh:
                stuck = True
                stuck_reason = f"{status.lower()}_exceeded_{thresh}s"
        elif status == "ORPHANED":
            stuck = True
            stuck_reason = "orphaned_no_worker"

        # D-7: Resolved mapping from resolved.json
        raw_res = resolved_map.get(tid)
        task_resolved = raw_res if isinstance(raw_res, dict) else None

        norm_artifacts = [normalize_path(a) for a in artifacts]
        norm_spec = normalize_path(spec) if spec else None

        derived.append({
            "task_id": tid,
            "parent_task_id": parent_task_id,
            "to": to_agent,
            "from": from_agent,
            "type": task_type,
            "status": status,
            "intent": sanitize_text(intent),
            "ts": raw_ts,
            "ts_valid": ts_valid,
            "elapsed_seconds": elapsed_seconds,
            "timeout_s": timeout_s,
            "artifacts": norm_artifacts,
            "artifact_sha256": artifact_sha256,
            "artifact_verified": artifact_verified,
            "artifact_verification_reason": artifact_verification_reason,
            "artifact_path_source": artifact_path_source,
            "spec": norm_spec,
            "spec_sha256": spec_sha256,
            "error": sanitize_text(error),
            "attempt": attempt,
            "stuck": stuck,
            "stuck_reason": stuck_reason,
            "resolved": task_resolved,
        })

    return derived


def _file_stat_key(p: Path | None) -> tuple[int, int]:
    if not p:
        return (0, 0)
    try:
        st = p.stat()
        return (st.st_mtime_ns, st.st_size)
    except OSError:
        return (0, 0)


_RELATIONS_CACHE: dict[str, Any] = {
    "cache_key": None,
    "cached_at": 0.0,
    "tasks": None,
}


def derive_relations(
    tasks_file: Path | str | None = None,
    active_tasks_file: Path | str | None = None,
    resolved_file: Path | str | None = None,
    days: float | None = None,
    use_cache: bool = True,
) -> dict[str, Any]:
    """Derive directed handoff relations graph from task event history (D-8).

    Honest derivation:
      - Edges created strictly from recorded from -> to pairs.
      - Missing or empty from/to ignored (no ghost nodes).
      - Self-loops (from == to) are discarded.
      - No inferred relations from temporal proximity.
      - Output is deterministically ordered (edges by -task_count, nodes by -activity).
      - In-memory stat cache with TTL to avoid re-scanning on every request.
    """
    p = Path(tasks_file) if tasks_file else TASKS_FILE
    act_p = Path(active_tasks_file) if active_tasks_file else ACTIVE_TASKS_FILE
    res_p = Path(resolved_file) if resolved_file else RESOLVED_FILE

    # If custom paths are supplied, bypass cache to ensure test fixture isolation
    if tasks_file is not None or active_tasks_file is not None or resolved_file is not None:
        use_cache = False

    now_dt = datetime.now(timezone.utc)
    now_ts = now_dt.timestamp()

    tasks: list[dict] | None = None
    if use_cache:
        cache_key = (
            str(p),
            _file_stat_key(p),
            str(act_p),
            _file_stat_key(act_p),
            str(res_p),
            _file_stat_key(res_p),
        )
        if (
            _RELATIONS_CACHE["cache_key"] == cache_key
            and (now_ts - _RELATIONS_CACHE["cached_at"]) < 5.0
            and _RELATIONS_CACHE["tasks"] is not None
        ):
            tasks = _RELATIONS_CACHE["tasks"]

    if tasks is None:
        tasks = derive_tasks(tasks_file=p, active_tasks_file=act_p, resolved_file=res_p)
        if use_cache:
            _RELATIONS_CACHE["cache_key"] = (
                str(p),
                _file_stat_key(p),
                str(act_p),
                _file_stat_key(act_p),
                str(res_p),
                _file_stat_key(res_p),
            )
            _RELATIONS_CACHE["cached_at"] = now_ts
            _RELATIONS_CACHE["tasks"] = tasks

    # Filter tasks by time window (?days=)
    filtered_tasks: list[dict] = []
    for t in tasks:
        if days is not None:
            raw_ts = t.get("ts")
            t_dt = _parse_iso_ts(raw_ts)
            if t_dt is None:
                continue
            age_s = now_ts - t_dt.astimezone(timezone.utc).timestamp()
            # Must be within window, tolerating up to 60s slight clock skew
            if age_s > (days * 86400.0) or age_s < -60.0:
                continue
        filtered_tasks.append(t)

    edges_map: dict[tuple[str, str], dict[str, Any]] = {}
    nodes_map: dict[str, dict[str, Any]] = {}
    total_valid_tasks = 0
    total_active_tasks = 0
    global_status_counts: dict[str, int] = {}

    for t in filtered_tasks:
        f = t.get("from")
        to = t.get("to")
        if not f or not to or not isinstance(f, str) or not isinstance(to, str):
            continue
        u = f.strip()
        v = to.strip()
        if not u or not v or u == v:
            continue
        if u.lower() in ("null", "none", "unknown") or v.lower() in ("null", "none", "unknown"):
            continue

        status = t.get("status") or "UNKNOWN"
        raw_ts = t.get("ts")
        t_dt = _parse_iso_ts(raw_ts)
        is_stuck = bool(t.get("stuck"))
        is_resolved = bool(t.get("resolved"))
        is_waiting_or_running = status in ("QUEUED", "RUNNING")

        total_valid_tasks += 1
        if is_waiting_or_running:
            total_active_tasks += 1
        global_status_counts[status] = global_status_counts.get(status, 0) + 1

        # Node sender (u) initialization
        if u not in nodes_map:
            meta = AGENT_META.get(u, {"name": u.capitalize(), "role": "Agent"})
            nodes_map[u] = {
                "id": u,
                "name": meta["name"],
                "role": meta.get("role"),
                "tasks_received": 0,
                "tasks_sent": 0,
                "waiting_or_running": 0,
                "queued_count": 0,
                "running_count": 0,
                "stuck_count": 0,
                "last_active": None,
                "status_counts": {},
                "_latest_dt": None,
            }

        # Node receiver (v) initialization
        if v not in nodes_map:
            meta = AGENT_META.get(v, {"name": v.capitalize(), "role": "Agent"})
            nodes_map[v] = {
                "id": v,
                "name": meta["name"],
                "role": meta.get("role"),
                "tasks_received": 0,
                "tasks_sent": 0,
                "waiting_or_running": 0,
                "queued_count": 0,
                "running_count": 0,
                "stuck_count": 0,
                "last_active": None,
                "status_counts": {},
                "_latest_dt": None,
            }

        # Update sender stats
        nodes_map[u]["tasks_sent"] += 1
        if t_dt:
            if nodes_map[u]["_latest_dt"] is None or t_dt > nodes_map[u]["_latest_dt"]:
                nodes_map[u]["_latest_dt"] = t_dt
                nodes_map[u]["last_active"] = _iso(t_dt.timestamp())

        # Update receiver stats
        nodes_map[v]["tasks_received"] += 1
        if status == "QUEUED":
            nodes_map[v]["queued_count"] += 1
        elif status == "RUNNING":
            nodes_map[v]["running_count"] += 1
        if is_waiting_or_running:
            nodes_map[v]["waiting_or_running"] += 1
        if is_stuck:
            nodes_map[v]["stuck_count"] += 1
        nodes_map[v]["status_counts"][status] = nodes_map[v]["status_counts"].get(status, 0) + 1
        if t_dt:
            if nodes_map[v]["_latest_dt"] is None or t_dt > nodes_map[v]["_latest_dt"]:
                nodes_map[v]["_latest_dt"] = t_dt
                nodes_map[v]["last_active"] = _iso(t_dt.timestamp())

        # Edge (u -> v)
        edge_key = (u, v)
        if edge_key not in edges_map:
            edges_map[edge_key] = {
                "from": u,
                "to": v,
                "task_count": 0,
                "last_active": None,
                "status_counts": {},
                "stuck_count": 0,
                "resolved_count": 0,
                "_latest_dt": None,
            }

        edge_entry = edges_map[edge_key]
        edge_entry["task_count"] += 1
        edge_entry["status_counts"][status] = edge_entry["status_counts"].get(status, 0) + 1
        if is_stuck:
            edge_entry["stuck_count"] += 1
        if is_resolved:
            edge_entry["resolved_count"] += 1
        if t_dt:
            if edge_entry["_latest_dt"] is None or t_dt > edge_entry["_latest_dt"]:
                edge_entry["_latest_dt"] = t_dt
                edge_entry["last_active"] = _iso(t_dt.timestamp())

    # Clean up internal tracking datetimes
    for node in nodes_map.values():
        node.pop("_latest_dt", None)
    for edge in edges_map.values():
        edge.pop("_latest_dt", None)

    # Deterministic sorting
    nodes_list = sorted(
        nodes_map.values(),
        key=lambda n: (-n["tasks_received"] - n["tasks_sent"], n["id"]),
    )
    edges_list = sorted(
        edges_map.values(),
        key=lambda e: (-e["task_count"], e["from"], e["to"]),
    )

    counts = {
        "nodes": len(nodes_list),
        "edges": len(edges_list),
        "tasks": total_valid_tasks,
        "waiting_or_running": total_active_tasks,
        "status_counts": dict(sorted(global_status_counts.items())),
    }

    return {
        "generated_at": _iso(now_ts),
        "counts": counts,
        "nodes": nodes_list,
        "edges": edges_list,
    }


@app.get("/api/status")
def status(scope: str = "fleet"):
    try:
        return JSONResponse(collect(scope=scope))
    except Exception as exc:  # never let the UI go blind
        return JSONResponse({"error": str(exc), "generated_at": _iso(time.time())}, status_code=500)


@app.get("/api/tasks")
def get_tasks(
    status: str | None = None,
    to: str | None = None,
    from_agent: str | None = Query(default=None, alias="from"),
    agent: str | None = None,
    stuck: bool | None = None,
    limit: int | None = None,
):
    try:
        tasks = derive_tasks()
        if status:
            tasks = [t for t in tasks if t.get("status") == status]
        if to:
            tasks = [t for t in tasks if t.get("to") == to]
        if from_agent:
            tasks = [t for t in tasks if t.get("from") == from_agent]
        if agent:
            tasks = [t for t in tasks if t.get("to") == agent or t.get("from") == agent]
        if stuck is not None:
            tasks = [t for t in tasks if t.get("stuck") == stuck]
        if limit and limit > 0:
            tasks = tasks[:limit]
        return JSONResponse({
            "generated_at": _iso(time.time()),
            "count": len(tasks),
            "stuck_count": sum(1 for t in tasks if t.get("stuck")),
            "tasks": tasks,
        })
    except Exception as exc:
        return JSONResponse({"error": str(exc), "generated_at": _iso(time.time())}, status_code=500)


@app.get("/api/tasks/{task_id}")
def get_task(task_id: str):
    try:
        tasks = derive_tasks()
        for t in tasks:
            if t["task_id"] == task_id:
                return JSONResponse(t)
        return JSONResponse({"error": f"Task '{task_id}' not found"}, status_code=404)
    except Exception as exc:
        return JSONResponse({"error": str(exc), "generated_at": _iso(time.time())}, status_code=500)


@app.get("/api/relations")
def get_relations(days: float | None = Query(default=None, gt=0)):
    try:
        data = derive_relations(days=days)
        return JSONResponse(data)
    except Exception as exc:
        return JSONResponse({"error": str(exc), "generated_at": _iso(time.time())}, status_code=500)


@app.get("/health")
def health():
    return {"ok": True}


@app.get("/")
def index():
    idx_v3 = STATIC / "v3" / "index.html"
    if idx_v3.exists():
        return FileResponse(idx_v3)
    return JSONResponse(
        {"service": "ai7-solaris", "hint": "static/v3/index.html not found", "api": "/api/status"},
        status_code=404,
    )


@app.get("/tokens.css")
def root_tokens_css():
    target = STATIC / "v3" / "tokens.css"
    if target.exists():
        return FileResponse(target, media_type="text/css")
    return JSONResponse({"error": "tokens.css not found"}, status_code=404)


@app.get("/style.css")
def root_style_css():
    target = STATIC / "v3" / "style.css"
    if target.exists():
        return FileResponse(target, media_type="text/css")
    return JSONResponse({"error": "style.css not found"}, status_code=404)


@app.get("/app.js")
def root_app_js():
    target = STATIC / "v3" / "app.js"
    if target.exists():
        return FileResponse(target, media_type="application/javascript")
    return JSONResponse({"error": "app.js not found"}, status_code=404)


app.mount("/v3", StaticFiles(directory=str(STATIC / "v3"), html=True), name="v3")
app.mount("/static", StaticFiles(directory=str(STATIC)), name="static")
