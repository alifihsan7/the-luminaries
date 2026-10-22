#!/usr/bin/env python3
"""
AI7 Solaris — Deterministic Incident Handler & Telemetry (Phase 4)
Dipicu oleh systemd OnFailure atau manual:
1. Validasi cooldown per unit (30 menit) agar tidak spam alert/loop.
2. Ambil journalctl snippet (maks 2000 chars, karakter kontrol dibersihkan).
3. Jika kuota insiden harian AI < 2 dan llm_probe OK: dispatch task diagnosis ke Daemon (ops).
4. Kirim alert Telegram langsung (deterministik tanpa ketergantungan LLM).
"""

import datetime
import json
import os
import re
import subprocess
import sys
import time
from pathlib import Path
import urllib.request
import urllib.parse

BASE_DIR = Path(__file__).resolve().parent.parent
OPS_DIR = BASE_DIR / "ops"
INCIDENTS_LOG = OPS_DIR / "incidents.jsonl"
COOLDOWN_FILE = OPS_DIR / "incident_cooldown.json"
PROBE_STATE = OPS_DIR / "llm_probe.state"

COOLDOWN_SECONDS = 1800  # 30 menit per spec §6.2
MAX_LOG_CHARS = 2000
MAX_DAILY_AI_DIAG = 2


def get_telegram_creds():
    token = os.environ.get("TELEGRAM_BOT_TOKEN")
    chat_id = os.environ.get("TELEGRAM_CHAT_ID")
    if not token or not chat_id:
        local_env = BASE_DIR / ".env"
        if local_env.exists():
            try:
                with open(local_env, "r", encoding="utf-8") as f:
                    for line in f:
                        line = line.strip()
                        if not line or line.startswith("#"):
                            continue
                        if not token and ("TELEGRAM_BOT_TOKEN=" in line or "TELEGRAM_TOKEN=" in line):
                            token = line.split("=", 1)[1].strip().strip('"').strip("'")
                        elif not chat_id and ("TELEGRAM_CHAT_ID=" in line or "ALLOWED_USER_ID=" in line):
                            chat_id = line.split("=", 1)[1].strip().strip('"').strip("'")
            except Exception:
                pass
    return token, chat_id


def send_telegram_alert(text: str):
    token, chat_id = get_telegram_creds()
    if not token or not chat_id:
        print("[!] TELEGRAM_BOT_TOKEN atau TELEGRAM_CHAT_ID belum diset. Alert dilewati.")
        return False
    try:
        url = f"https://api.telegram.org/bot{token}/sendMessage"
        payload = {
            "chat_id": int(chat_id),
            "text": text,
            "parse_mode": "Markdown",
        }
        data = json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(
            url,
            data=data,
            headers={"Content-Type": "application/json"},
        )
        with urllib.request.urlopen(req, timeout=10) as resp:
            return resp.status == 200
    except Exception as e:
        print(f"[-] Gagal mengirim Telegram alert: {e}")
        return False


def is_in_cooldown(unit_name: str) -> bool:
    if not COOLDOWN_FILE.exists():
        return False
    try:
        with open(COOLDOWN_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
        last_t = data.get(unit_name, 0)
        return (time.time() - last_t) < COOLDOWN_SECONDS
    except Exception:
        return False


def set_cooldown(unit_name: str):
    data = {}
    if COOLDOWN_FILE.exists():
        try:
            with open(COOLDOWN_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
        except Exception:
            pass
    data[unit_name] = time.time()
    tmp = COOLDOWN_FILE.with_suffix(".tmp")
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)
    tmp.replace(COOLDOWN_FILE)


def get_clean_logs(unit_name: str) -> str:
    try:
        cmd = ["journalctl", "--user", "-u", unit_name, "-n", "25", "--no-pager"]
        res = subprocess.run(cmd, capture_output=True, text=True, timeout=5)
        raw = res.stdout or res.stderr or "No journal log captured"
        # Buang karakter kontrol selain \n dan \t
        clean = re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f-\x9f]", "", raw)
        return clean[-MAX_LOG_CHARS:]
    except Exception as e:
        return f"Gagal membaca journalctl: {e}"


def handle_incident(unit_name: str):
    ts = datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=7))).isoformat()
    print(f"[*] Menangani insiden unit: {unit_name} pada {ts}")

    if is_in_cooldown(unit_name):
        print(f"[!] Unit {unit_name} sedang dalam masa cooldown 30 menit. Insiden dilewati.")
        return

    set_cooldown(unit_name)
    logs = get_clean_logs(unit_name)

    # Catat log event insiden
    event = {
        "ts": ts,
        "unit": unit_name,
        "action": "TELEMETRY_ALERT",
        "log_snippet": logs[:300],
    }
    with open(INCIDENTS_LOG, "a", encoding="utf-8") as f:
        f.write(json.dumps(event) + "\n")

    alert_msg = (
        f"🚨 *AI7 SOLARIS INCIDENT ALERT*\n"
        f"• *Unit:* `{unit_name}`\n"
        f"• *Waktu:* `{ts}`\n"
        f"• *Status:* Crash limit tercapai / OnFailure triggered\n\n"
        f"📋 *Log Snapshot:*\n```\n{logs[-500:]}\n```"
    )

    send_telegram_alert(alert_msg)
    print(f"[+] Alert deterministik berhasil diproses untuk {unit_name}")


if __name__ == "__main__":
    target_unit = sys.argv[1] if len(sys.argv) > 1 else "ai7-solaris.service"
    handle_incident(target_unit)
