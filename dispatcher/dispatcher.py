#!/usr/bin/env python3
"""
AI7 Solaris — Deterministic Core Dispatcher (Phase 1)
Menjalankan tugas agen Luminaries secara deterministik, asinkron, non-shell subprocess,
dengan flock-based concurrency per profil, idempotency check, batas harian,
dan single source of truth log event append-only tasks.jsonl.
"""

from __future__ import annotations

import datetime
import fcntl
import hashlib
import json
import os
import re
import signal
import subprocess
import sys
import threading
import time
from pathlib import Path
from typing import Any, Dict, List, Optional
import yaml

BASE_DIR = Path(__file__).resolve().parent.parent
DISPATCHER_DIR = BASE_DIR / "dispatcher"
HANDOFF_DIR = BASE_DIR / "handoff"
LOCKS_DIR = DISPATCHER_DIR / "locks"
TASKS_LOG_FILE = DISPATCHER_DIR / "tasks.jsonl"
REGISTRY_FILE = DISPATCHER_DIR / "agents.yaml"
ACTIVE_TASKS_FILE = DISPATCHER_DIR / "active_tasks.json"

MAX_TASK_FILE_BYTES = 16 * 1024  # 16 KB max per spec §3.2
DISPATCH_MUTEX = threading.Lock()


def ensure_directories():
    LOCKS_DIR.mkdir(parents=True, exist_ok=True)
    HANDOFF_DIR.mkdir(parents=True, exist_ok=True)


def load_registry() -> Dict[str, Any]:
    if not REGISTRY_FILE.exists():
        raise FileNotFoundError(f"Registry not found: {REGISTRY_FILE}")
    with open(REGISTRY_FILE, "r", encoding="utf-8") as f:
        data = yaml.safe_load(f) or {}
    return data.get("agents", {})


def get_wib_timestamp() -> str:
    # UTC+7
    tz = datetime.timezone(datetime.timedelta(hours=7))
    return datetime.datetime.now(tz).isoformat()


_EMAIL_RE = re.compile(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b")
_TG_TOKEN_RE = re.compile(r"\b\d{8,10}:[A-Za-z0-9_-]{35}\b")
_OPENAI_KEY_RE = re.compile(r"\b(sk-[A-Za-z0-9_-]{20,})\b")
_BEARER_RE = re.compile(r"(?i)\b(bearer\s+)[A-Za-z0-9_.-]{20,}\b")
_SENSITIVE_KEY_RE = re.compile(r"(?i)\b(token|secret|password|api[_-]?key)\s*[:=]\s*['\"]?([A-Za-z0-9_.-]{16,})['\"]?")
_CHAT_ID_RE = re.compile(r"\b\d{9,11}\b")


def sanitize_text(text: Optional[str]) -> str:
    """Sanitize internal paths and sensitive user data from text strings."""
    if not text or not isinstance(text, str):
        return ""

    # Redact tokens before chat ID so token numeric prefixes are not partially replaced
    res = _TG_TOKEN_RE.sub("[REDACTED_TOKEN]", text)
    res = _OPENAI_KEY_RE.sub("[REDACTED_TOKEN]", res)
    res = _BEARER_RE.sub(r"\1[REDACTED_TOKEN]", res)
    res = _SENSITIVE_KEY_RE.sub(r"\1: [REDACTED_TOKEN]", res)
    res = _CHAT_ID_RE.sub("[REDACTED_CHAT_ID]", res)
    res = _EMAIL_RE.sub("[REDACTED_EMAIL]", res)

    # Redact internal paths
    base_str = str(BASE_DIR)
    home_str = str(Path.home())
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
                rel = p.relative_to(BASE_DIR)
                return str(rel)
            except ValueError:
                pass
        else:
            return p_str
    except Exception:
        pass

    try:
        p = Path(p_str).expanduser()
        home = Path.home()
        if p.is_absolute():
            try:
                rel = p.relative_to(home)
                return f"~/{rel}"
            except ValueError:
                pass
    except Exception:
        pass

    home_str = str(Path.home())
    if p_str.startswith(home_str + "/"):
        return "~/" + p_str[len(home_str) + 1:]
    if p_str == home_str:
        return "~"
    return p_str


def append_task_event(
    task_id: str,
    status: str,
    target: str,
    intent: str,
    origin: str = "nexus",
    parent_task_id: Optional[str] = None,
    commit: str = "",
    attempt: int = 1,
    artifacts: Optional[List[str]] = None,
    error: Optional[str] = None,
    task_type: str = "dispatch",
    spec: Optional[str] = None,
    spec_sha256: Optional[str] = None,
    artifact_sha256: Optional[str] = None,
    timeout_s: Optional[int] = None,
) -> Dict[str, Any]:
    norm_intent = sanitize_text(intent)[:2000] if intent else ""
    norm_artifacts = [normalize_path(a) for a in (artifacts or [])]
    norm_error = sanitize_text(error) if error else error
    event = {
        "v": "3.1",
        "ts": get_wib_timestamp(),
        "task_id": task_id,
        "parent_task_id": parent_task_id,
        "type": task_type,
        "from": origin,
        "to": target,
        "commit": commit,
        "attempt": attempt,
        "status": status,
        "intent": norm_intent,
        "artifacts": norm_artifacts,
        "error": norm_error,
        "timeout_s": timeout_s,
    }
    if spec:
        event["spec"] = normalize_path(spec)
    if spec_sha256:
        event["spec_sha256"] = spec_sha256
    if artifact_sha256:
        event["artifact_sha256"] = artifact_sha256

    with DISPATCH_MUTEX:
        with open(TASKS_LOG_FILE, "a", encoding="utf-8") as f:
            f.write(json.dumps(event, ensure_ascii=False) + "\n")
            f.flush()

    return event


def load_active_tasks() -> Dict[str, Any]:
    with DISPATCH_MUTEX:
        if not ACTIVE_TASKS_FILE.exists():
            return {}
        try:
            with open(ACTIVE_TASKS_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return {}


def save_active_tasks(active: Dict[str, Any]):
    with DISPATCH_MUTEX:
        temp_file = ACTIVE_TASKS_FILE.with_suffix(".tmp")
        with open(temp_file, "w", encoding="utf-8") as f:
            json.dump(active, f, indent=2)
            f.flush()
        temp_file.replace(ACTIVE_TASKS_FILE)


def compute_idempotency_key(task_type: str, to_profile: str, commit: str, intent_normalized: str) -> str:
    norm = intent_normalized.strip().lower()
    payload = f"{task_type}|{to_profile}|{commit}|{norm}".encode("utf-8")
    return hashlib.sha256(payload).hexdigest()


def check_daily_limit(to_profile: str, max_runs_per_day: int) -> bool:
    """Periksa log tasks.jsonl untuk melihat jumlah task status QUEUED/RUNNING hari ini"""
    if not TASKS_LOG_FILE.exists():
        return True

    today_str = get_wib_timestamp()[:10]  # YYYY-MM-DD
    count = 0
    with open(TASKS_LOG_FILE, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                ev = json.loads(line)
                if ev.get("to") == to_profile and ev.get("status") in {"QUEUED", "RUNNING"}:
                    if str(ev.get("ts", "")).startswith(today_str):
                        count += 1
            except json.JSONDecodeError:
                continue
    return count < max_runs_per_day


class ProfileLock:
    def __init__(self, profile: str):
        ensure_directories()
        self.lock_file = LOCKS_DIR / f"{profile}.lock"
        self.fd = None

    def acquire(self) -> bool:
        self.fd = open(self.lock_file, "a")
        try:
            fcntl.flock(self.fd, fcntl.LOCK_EX | fcntl.LOCK_NB)
            return True
        except (IOError, OSError):
            self.fd.close()
            self.fd = None
            return False

    def release(self):
        if self.fd:
            try:
                fcntl.flock(self.fd, fcntl.LOCK_UN)
                self.fd.close()
            except Exception:
                pass
            self.fd = None


def run_worker_process(
    task_id: str,
    profile_name: str,
    hermes_profile: str,
    toolsets: List[str],
    task_text: str,
    timeout_s: int,
    intent: str,
    origin: str,
    parent_task_id: Optional[str],
    commit: str,
    attempt: int,
    task_type: str,
    idempotency_key: str,
):
    lock = ProfileLock(profile_name)
    if not lock.acquire():
        # Profil sedang sibuk
        append_task_event(
            task_id=task_id,
            status="REJECTED",
            target=profile_name,
            intent=intent,
            origin=origin,
            parent_task_id=parent_task_id,
            commit=commit,
            attempt=attempt,
            error=f"Profile '{profile_name}' is currently busy with another active execution",
            task_type=task_type,
            timeout_s=timeout_s,
        )
        active = load_active_tasks()
        active.pop(task_id, None)
        save_active_tasks(active)
        return

    try:
        # Update event ke RUNNING
        append_task_event(
            task_id=task_id,
            status="RUNNING",
            target=profile_name,
            intent=intent,
            origin=origin,
            parent_task_id=parent_task_id,
            commit=commit,
            attempt=attempt,
            task_type=task_type,
            timeout_s=timeout_s,
        )

        out_dir = HANDOFF_DIR / profile_name / "out"
        out_dir.mkdir(parents=True, exist_ok=True)
        out_file = out_dir / f"{task_id}.out.md"

        # Bersihkan lingkungan eksekusi
        user_home = os.environ.get("HOME", str(Path.home()))
        user_name = os.environ.get("USER", os.environ.get("LOGNAME", "solaris"))
        local_bin = str(Path(user_home) / ".local" / "bin")
        current_path = os.environ.get("PATH", "/usr/local/bin:/usr/bin:/bin")
        path_val = f"{local_bin}:{current_path}" if local_bin not in current_path else current_path

        safe_env = {
            "PATH": path_val,
            "HOME": user_home,
            "USER": user_name,
            "LANG": "C.UTF-8",
            "LC_ALL": "C.UTF-8",
            "TZ": "Asia/Jakarta",
        }
        # Oper HERMES keys jika ada
        for k in ["OPENAI_API_BASE", "OPENAI_BASE_URL", "9ROUTER_URL", "HERMES_MAX_ITERATIONS"]:
            if k in os.environ:
                safe_env[k] = os.environ[k]

        cmd = [
            "hermes",
            "-p",
            hermes_profile,
            "chat",
            "-q",
            task_text,
            "-Q",
        ]
        if toolsets:
            cmd.extend(["-t", ",".join(toolsets)])

        proc = None
        status = "FAILED"
        err_msg = None
        stdout_data = ""

        try:
            proc = subprocess.Popen(
                cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                env=safe_env,
                start_new_session=True,  # Buat process group mandiri agar SIGTERM/SIGKILL membunuh anak
            )

            active = load_active_tasks()
            if task_id in active:
                active[task_id]["pid"] = proc.pid
                save_active_tasks(active)

            stdout_data, stderr_data = proc.communicate(timeout=timeout_s)
            rc = proc.returncode

            if rc == 0:
                status = "SUCCEEDED"
            else:
                status = "FAILED"
                err_msg = f"Process exited with code {rc}: {stderr_data.strip()[:300]}"

        except subprocess.TimeoutExpired:
            status = "TIMEOUT"
            err_msg = f"Task timed out after {timeout_s}s"
            if proc:
                try:
                    os.killpg(os.getpgid(proc.pid), signal.SIGTERM)
                    time.sleep(1)
                    os.killpg(os.getpgid(proc.pid), signal.SIGKILL)
                except Exception:
                    pass
        except Exception as e:
            status = "FAILED"
            err_msg = str(e)
        finally:
            # Simpan output dengan header UNTRUSTED_AGENT_OUTPUT (badan di-hash untuk deteksi ubahan)
            body = stdout_data or err_msg or ""
            body_sha = hashlib.sha256(body.encode("utf-8")).hexdigest()
            header = (
                f"# UNTRUSTED_AGENT_OUTPUT — Task {task_id}\n"
                f"# Profile: {profile_name}\n"
                f"# Timestamp: {get_wib_timestamp()}\n"
                f"# Written-by: dispatcher pid {os.getpid()} (never by the agent)\n"
                f"# Body-sha256: {body_sha}\n\n"
            )
            with open(out_file, "w", encoding="utf-8") as f:
                f.write(header + body)

            # Perlakuan khusus Chronos briefing (best-effort: ekstraksi briefing_today.json tanpa mengubah status)
            if profile_name == "chronos" and status == "SUCCEEDED":
                try:
                    parsed = json.loads(stdout_data.strip())
                    if isinstance(parsed, dict) and "date" in parsed:
                        briefing_target = BASE_DIR / "briefing_today.json"
                        tmp_target = briefing_target.with_suffix(".tmp")
                        with open(tmp_target, "w", encoding="utf-8") as bf:
                            json.dump(parsed, bf, indent=2)
                        tmp_target.replace(briefing_target)
                except Exception:
                    pass

            # Log event akhir
            append_task_event(
                task_id=task_id,
                status=status,
                target=profile_name,
                intent=intent,
                origin=origin,
                parent_task_id=parent_task_id,
                commit=commit,
                attempt=attempt,
                artifacts=[str(out_file)],
                error=err_msg,
                task_type=task_type,
                artifact_sha256=body_sha,
                timeout_s=timeout_s,
            )
    finally:
        try:
            active = load_active_tasks()
            active.pop(task_id, None)
            save_active_tasks(active)
        except Exception:
            pass
        finally:
            lock.release()


def _load_routing_module():
    """Muat routing.py dari direktori yang sama (modul berdiri sendiri)."""
    import importlib.util

    spec = importlib.util.spec_from_file_location(
        "ai7_routing", DISPATCHER_DIR / "routing.py"
    )
    if spec is None or spec.loader is None:
        raise RuntimeError("routing.py tidak dapat dimuat")
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


ROUTE_TICKET_TTL_MIN = 30


def find_route_ticket(
    target_profile: str, ttl_min: int = ROUTE_TICKET_TTL_MIN
) -> Optional[Dict[str, Any]]:
    """Cari tiket ALLOW terakhir untuk profil ini dalam jendela TTL."""
    wib = datetime.timezone(datetime.timedelta(hours=7))
    routing_log = DISPATCHER_DIR / "routing.jsonl"
    if not routing_log.exists():
        return None
    cutoff = datetime.datetime.now(wib) - datetime.timedelta(minutes=ttl_min)
    ticket: Optional[Dict[str, Any]] = None
    for line in routing_log.read_text(encoding="utf-8").splitlines():
        try:
            entry = json.loads(line)
        except json.JSONDecodeError:
            continue
        if (
            entry.get("verdict") != "ALLOW"
            or entry.get("target") != target_profile
            or entry.get("mode") != "delegate"
        ):
            continue
        try:
            ts = datetime.datetime.fromisoformat(entry["ts"])
        except (KeyError, ValueError):
            continue
        if ts >= cutoff:
            ticket = entry
    return ticket


def evaluate_and_log_route(
    target_profile: str, reason: str, trigger: str
) -> Dict[str, Any]:
    """Jalankan gate + catat keputusan. Return dict hasil evaluate()."""
    mod = _load_routing_module()
    expect = [f"handoff/{target_profile}/out/*.out.md"]
    result = mod.evaluate(target_profile, "delegate", reason, trigger or "", expect)
    mod._log(
        {
            "type": "route",
            "ts": mod._now(),
            "decided_by": "nexus",
            "target": target_profile,
            "mode": "delegate",
            "reason": reason,
            "trigger": trigger or "",
            "expect": expect,
            "verdict": "ALLOW" if result["ok"] else "DENY",
            "violation": result.get("violation"),
        }
    )
    return result


def dispatch_task(
    target_profile: str,
    task_file_path: str,
    timeout_s: Optional[int] = None,
    intent: Optional[str] = None,
    origin: str = "nexus",
    parent_task_id: Optional[str] = None,
    commit: str = "",
    task_type: str = "dispatch",
) -> Dict[str, Any]:
    """
    Dispatcher API:
    1. Validasi keberadaan profil di registry.
    2. Validasi berkas handoff (wajib ada, <= 16KB).
    3. Cek batas harian dan idempotency.
    4. Spawn background thread/subprocess non-blocking.
    5. Return task_id seketika.
    """
    ensure_directories()
    registry = load_registry()

    if target_profile not in registry:
        return {
            "ok": False,
            "error": f"Profile '{target_profile}' is not registered in agents.yaml",
            "task_id": None,
        }

    agent_info = registry[target_profile]
    hermes_prof = agent_info.get("profile", target_profile)
    toolsets = agent_info.get("toolsets", [])
    max_runtime = timeout_s or agent_info.get("max_runtime_s", 600)
    max_runs = agent_info.get("max_runs_per_day", 100)

    # Validasi task file
    task_path = Path(task_file_path).resolve()
    if not task_path.exists():
        return {
            "ok": False,
            "error": f"Task file does not exist: {task_file_path}",
            "task_id": None,
        }

    if task_path.stat().st_size > MAX_TASK_FILE_BYTES:
        return {
            "ok": False,
            "error": f"Task file exceeds max size limit of 16KB ({task_path.stat().st_size} bytes)",
            "task_id": None,
        }

    # Berkas spesifikasi tidak boleh diambil dari folder artefak mana pun.
    try:
        rel = task_path.relative_to(HANDOFF_DIR.resolve())
        if "out" in rel.parts:
            return {
                "ok": False,
                "error": "SPEC_IN_ARTIFACT_DIR",
                "task_id": None,
                "advice": "Task spec tidak boleh berada di handoff/<profil>/out/. Tulis spec di handoff/<profil>/in/.",
            }
    except ValueError:
        pass

    with open(task_path, "r", encoding="utf-8") as f:
        task_text = f.read()

    if intent and intent.strip():
        intent_text = sanitize_text(intent.strip())[:2000]
    else:
        intent_text = sanitize_text(task_text.strip())[:2000]

    # Idempotency check
    idem_key = compute_idempotency_key(task_type, target_profile, commit, intent_text)
    active = load_active_tasks()
    for tid, tinfo in active.items():
        if tinfo.get("idempotency_key") == idem_key:
            return {
                "ok": False,
                "error": f"Duplicate active task detected with same idempotency key (task_id: {tid})",
                "task_id": tid,
                "status": "REJECTED",
            }

    # Batas harian
    if not check_daily_limit(target_profile, max_runs):
        return {
            "ok": False,
            "error": f"Daily limit reached for profile '{target_profile}' ({max_runs} runs/day)",
            "task_id": None,
            "status": "REJECTED",
        }

    # Generate Task ID
    now_tag = datetime.datetime.now().strftime("%Y%m%d-%H%M%S")
    rand_suffix = hashlib.md5(f"{time.time()}_{os.getpid()}".encode()).hexdigest()[:4]
    task_id = f"TSK-{now_tag}-{rand_suffix}"

    # Snapshot spesifikasi ke handoff/<profil>/in/ supaya terbaca sebagai artefak, bukan chat
    spec_dir = HANDOFF_DIR / target_profile / "in"
    spec_dir.mkdir(parents=True, exist_ok=True)
    
    # Invariant Anti-Slop Permanen Berbasis Domain Luminary
    task_lower = task_text.lower()
    if target_profile == "iris" and "anti-slop" not in task_lower:
        task_text = (
            "<!-- MANDAT DOKTRIN SOLARIS: ANTI-SLOP UI/UX AKTIF -->\n"
            "anti-slop mode active: after. Terapkan aturan antislop, antislop-ui, dan antislop-human secara ketat:\n"
            "- Validasi rasio kontras WCAG AA/AAA (uji via contrast-check.py).\n"
            "- Dilarang keras gradien ungu/biru AI generik, glassmorphism murahan, atau border-radius berlebihan.\n"
            "- Target ketukan mobile wajib minimal 44x44px. Desain wajib terasa crafted by a human designer.\n\n"
            + task_text
        )
    elif target_profile == "zephyr" and "antislop-code" not in task_lower and "anti-slop" not in task_lower:
        task_text = (
            "<!-- MANDAT DOKTRIN SOLARIS: ANTI-SLOP CODE AKTIF -->\n"
            "anti-slop mode active (antislop-code):\n"
            "- Terapkan kode yang lean, bersih, deterministik, dan zero dead code.\n"
            "- Dilarang over-engineering, boilerplates fiktif, dependensi berlebihan, atau helper functions tak berguna.\n"
            "- Prioritaskan idiomatic patterns, strict error handling, dan performa tinggi.\n\n"
            + task_text
        )
    elif target_profile == "athena" and "antislop-copywriting" not in task_lower and "anti-slop" not in task_lower:
        task_text = (
            "<!-- MANDAT DOKTRIN SOLARIS: ANTI-SLOP ACADEMIC PROSE AKTIF -->\n"
            "anti-slop mode active (antislop-copywriting & humanizer):\n"
            "- Bebaskan naskah dari klise AI (hindari: 'delve into', 'testament to', 'tapestry', 'multifaceted', 'beacon', dsb).\n"
            "- Gunakan ritme kalimat asimetris, argumen grounded berbasis bukti/sitasi riil, dan gaya bahasa akademisi manusia yang berbobot tajam.\n"
            "- Dilarang menghasilkan kalimat pasif berulang atau retorika hampa tanpa substansi.\n\n"
            + task_text
        )
    elif target_profile == "sage" and "antislop-copywriting" not in task_lower and "anti-slop" not in task_lower:
        task_text = (
            "<!-- MANDAT DOKTRIN SOLARIS: ANTI-SLOP RESEARCH FRAMING AKTIF -->\n"
            "anti-slop mode active (antislop-copywriting):\n"
            "- Fokus pada first-principles reasoning dengan rasio sinyal terhadap noise yang sangat tinggi (high-signal).\n"
            "- Dilarang basa-basi korporat AI, pembukaan generik, atau struktur bullet point seragam yang miskin analisis kritis.\n\n"
            + task_text
        )
    elif target_profile == "aegis" and "antislop-human" not in task_lower and "anti-slop" not in task_lower:
        task_text = (
            "<!-- MANDAT DOKTRIN SOLARIS: ANTI-SLOP QUALITY GATE AKTIF -->\n"
            "anti-slop mode active (antislop-human quality gate):\n"
            "- Untuk setiap audit UI/web, audit wajib memverifikasi kepatuhan terhadap standar antislop-human.\n"
            "- Tegakkan hard gate terhadap tap target < 44px, teks kontras rendah (< 4.5:1), dan font scaling responsif.\n\n"
            + task_text
        )

    spec_copy = spec_dir / f"{task_id}.task.md"
    spec_copy.write_text(task_text, encoding="utf-8")
    spec_sha = hashlib.sha256(task_text.encode("utf-8")).hexdigest()

    # Log awal QUEUED
    append_task_event(
        task_id=task_id,
        status="QUEUED",
        target=target_profile,
        intent=intent_text,
        origin=origin,
        parent_task_id=parent_task_id,
        commit=commit,
        task_type=task_type,
        spec=str(spec_copy),
        spec_sha256=spec_sha,
        timeout_s=max_runtime,
    )

    # Catat active task
    active[task_id] = {
        "target": target_profile,
        "idempotency_key": idem_key,
        "pid": None,
        "started_at": get_wib_timestamp(),
        "intent": intent_text,
        "timeout_s": max_runtime,
    }
    save_active_tasks(active)

    # Jalankan worker di background thread
    worker_th = threading.Thread(
        target=run_worker_process,
        kwargs={
            "task_id": task_id,
            "profile_name": target_profile,
            "hermes_profile": hermes_prof,
            "toolsets": toolsets,
            "task_text": task_text,
            "timeout_s": max_runtime,
            "intent": intent_text,
            "origin": origin,
            "parent_task_id": parent_task_id,
            "commit": commit,
            "attempt": 1,
            "task_type": task_type,
            "idempotency_key": idem_key,
        },
        daemon=False,
    )
    worker_th.start()

    return {
        "ok": True,
        "task_id": task_id,
        "status": "QUEUED",
        "target": target_profile,
        "message": f"Task {task_id} successfully dispatched to {target_profile}",
    }


def get_task_status(task_id: str) -> Dict[str, Any]:
    if not TASKS_LOG_FILE.exists():
        return {"ok": False, "error": "No tasks log found"}

    events = []
    with open(TASKS_LOG_FILE, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                ev = json.loads(line)
                if ev.get("task_id") == task_id:
                    events.append(ev)
            except json.JSONDecodeError:
                continue

    if not events:
        return {"ok": False, "error": f"Task {task_id} not found"}

    latest = events[-1]
    return {
        "ok": True,
        "task_id": task_id,
        "status": latest.get("status"),
        "history": events,
        "latest_event": latest,
    }


def list_tasks(limit: int = 20) -> List[Dict[str, Any]]:
    if not TASKS_LOG_FILE.exists():
        return []

    lines = []
    with open(TASKS_LOG_FILE, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                lines.append(line)

    results = []
    for line in lines[-limit:]:
        try:
            results.append(json.loads(line))
        except Exception:
            pass
    return results


def cancel_task(task_id: str) -> Dict[str, Any]:
    active = load_active_tasks()
    if task_id not in active:
        return {"ok": False, "error": f"Task {task_id} is not currently running"}

    task_info = active[task_id]
    pid = task_info.get("pid")
    if pid:
        try:
            os.killpg(os.getpgid(pid), signal.SIGTERM)
        except Exception:
            pass

    append_task_event(
        task_id=task_id,
        status="CANCELLED",
        target=task_info.get("target", "unknown"),
        intent=task_info.get("intent", ""),
        error="Cancelled by user request",
        timeout_s=task_info.get("timeout_s"),
    )

    active.pop(task_id, None)
    save_active_tasks(active)

    return {"ok": True, "task_id": task_id, "status": "CANCELLED"}


def diff_artifact(task_id: str) -> Dict[str, Any]:
    """Bandingkan task spec vs artefak: deteksi artefak yang cuma mengulang spec."""
    import difflib

    specs = list(HANDOFF_DIR.glob(f"*/in/{task_id}.task.md"))
    arts = list(HANDOFF_DIR.glob(f"*/out/{task_id}.out.md"))
    if not arts:
        return {"ok": False, "error": "ARTIFACT_NOT_FOUND", "task_id": task_id}

    spec_text = specs[0].read_text(encoding="utf-8") if specs else ""
    raw = arts[0].read_text(encoding="utf-8")
    lines = raw.split("\n")
    idx = 0
    while idx < len(lines) and lines[idx].startswith("#"):
        idx += 1
    body = "\n".join(lines[idx + 1:]) if idx < len(lines) else raw

    norm = lambda s: " ".join(s.lower().split())
    ratio = difflib.SequenceMatcher(None, norm(spec_text), norm(body)).ratio() if spec_text else 0.0

    return {
        "ok": True,
        "task_id": task_id,
        "spec": str(specs[0]) if specs else None,
        "artifact": str(arts[0]),
        "spec_chars": len(spec_text),
        "body_chars": len(body),
        "overlap": round(ratio, 3),
        "verdict": (
            "REPEATS_SPEC" if ratio >= 0.70
            else "THIN" if len(body) < 200
            else "INDEPENDENT"
        ),
        "spec_text": spec_text,
        "body": body,
    }


def verify_artifacts() -> Dict[str, Any]:
    """Bandingkan berkas di handoff/<profil>/out/ dengan catatan tasks.jsonl."""
    registered: Dict[str, str] = {}
    if TASKS_LOG_FILE.exists():
        with open(TASKS_LOG_FILE, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                try:
                    ev = json.loads(line)
                except Exception:
                    continue
                for a in ev.get("artifacts") or []:
                    if "/out/" in a and ev.get("artifact_sha256"):
                        registered[a] = ev["artifact_sha256"]

    report: Dict[str, Any] = {
        "checked": 0,
        "ok": [],
        "tampered": [],
        "unregistered": [],
        "missing": [],
        "legacy": [],
    }
    seen = set()
    for out_dir in sorted(HANDOFF_DIR.glob("*/out")):
        for f in sorted(out_dir.glob("*.out.md")):
            seen.add(str(f))
            report["checked"] += 1
            raw = f.read_text(encoding="utf-8", errors="replace")
            lines = raw.split("\n")
            idx = 0
            digest = None
            while idx < len(lines) and lines[idx].startswith("#"):
                if lines[idx].lower().startswith("# body-sha256:"):
                    digest = lines[idx].split(":", 1)[1].strip()
                idx += 1
            body = "\n".join(lines[idx + 1:]) if idx < len(lines) else ""
            actual = hashlib.sha256(body.encode("utf-8")).hexdigest()

            if digest is None:
                report.setdefault("legacy", []).append(str(f))
            elif actual != digest:
                report["tampered"].append({"file": str(f), "header": digest, "actual": actual})
            elif str(f) in registered and registered[str(f)] != digest:
                report["tampered"].append({"file": str(f), "why": "hash tidak cocok dengan tasks.jsonl"})
            else:
                report["ok"].append(str(f))

    for path in registered:
        if path not in seen:
            report["missing"].append(path)

    report["verdict"] = "TAMPERED" if (report["tampered"] or report["unregistered"]) else "CLEAN"
    report["note"] = "legacy = artefak sebelum header hash diperkenalkan; tidak dihitung sebagai pelanggaran."
    return report


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="AI7 Solaris Core Dispatcher CLI")
    sub = parser.add_subparsers(dest="cmd")

    d_parser = sub.add_parser("dispatch")
    d_parser.add_argument("profile")
    d_parser.add_argument("task_file")
    d_parser.add_argument("--timeout", type=int, default=None)
    d_parser.add_argument("--intent", type=str, default=None)
    d_parser.add_argument("--sync", action="store_true", help="Wait for task to complete")
    d_parser.add_argument("--reason", type=str, default=None,
                          help="Alasan routing (memicu gate otomatis + tiket ALLOW)")
    d_parser.add_argument("--trigger", type=str, default="",
                          help="Perintah asli user, untuk deteksi domain")

    s_parser = sub.add_parser("status")
    s_parser.add_argument("task_id")

    sub.add_parser("list")
    sub.add_parser("verify")
    p_diff = sub.add_parser("diff")
    p_diff.add_argument("task_id")

    c_parser = sub.add_parser("cancel")
    c_parser.add_argument("task_id")

    args = parser.parse_args()
    if args.cmd == "dispatch":
        # ── Routing Gate ────────────────────────────────────────────────
        if args.reason:
            gate = evaluate_and_log_route(args.profile, args.reason, args.trigger)
            if not gate["ok"]:
                print(json.dumps({
                    "ok": False,
                    "error": "ROUTE_DENIED",
                    "violation": gate.get("violation"),
                    "advice": gate.get("advice"),
                }, indent=2))
                sys.exit(2)
        else:
            ticket = find_route_ticket(args.profile)
            if not ticket:
                print(json.dumps({
                    "ok": False,
                    "error": "NO_ROUTE_TICKET",
                    "advice": (f"Tidak ada keputusan routing ALLOW untuk '{args.profile}' "
                               f"dalam {ROUTE_TICKET_TTL_MIN} menit terakhir. "
                               f"Tambahkan --reason '...' --trigger '...' pada dispatch, "
                               f"atau jalankan: routing.py check --target {args.profile} "
                               f"--mode delegate --reason '...'"),
                }, indent=2))
                sys.exit(2)

        res = dispatch_task(args.profile, args.task_file, timeout_s=args.timeout, intent=args.intent)
        print(json.dumps(res, indent=2))
        if not res.get("ok"):
            sys.exit(3)
        if args.sync and res.get("ok"):
            tid = res["task_id"]
            while True:
                time.sleep(1)
                st = get_task_status(tid)
                cur = st.get("status")
                if cur in {"SUCCEEDED", "FAILED", "TIMEOUT", "CANCELLED", "REJECTED"}:
                    print(json.dumps(st, indent=2))
                    break
    elif args.cmd == "status":
        print(json.dumps(get_task_status(args.task_id), indent=2))
    elif args.cmd == "list":
        print(json.dumps(list_tasks(), indent=2))
    elif args.cmd == "verify":
        print(json.dumps(verify_artifacts(), indent=2))
    elif args.cmd == "diff":
        d = diff_artifact(args.task_id)
        if not d.get("ok"):
            print(json.dumps(d, indent=2))
            sys.exit(3)
        print("=" * 60)
        print(f"SPEC   {d['spec']}  ({d['spec_chars']} kar)")
        print("=" * 60)
        print(d["spec_text"].strip())
        print("\n" + "=" * 60)
        print(f"OUTPUT {d['artifact']}  ({d['body_chars']} kar)")
        print("=" * 60)
        print(d["body"].strip())
        print("\n" + "-" * 60)
        print(f"KEMIRIPAN: {d['overlap']:.0%}  ->  {d['verdict']}")
    elif args.cmd == "cancel":
        print(json.dumps(cancel_task(args.task_id), indent=2))
    else:
        parser.print_help()
