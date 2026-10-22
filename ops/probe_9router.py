#!/usr/bin/env python3
"""
AI7 Solaris — 9router API Probe (Phase 4)
Melakukan probe endpoint model secara berkala (non-LLM script)
untuk memverifikasi respon riil port 20128, bukan sekadar cek port TCP.
Menyimpan status ke ops/llm_probe.state.
"""

import json
import time
from pathlib import Path
import urllib.request
import urllib.error

STATE_FILE = Path(__file__).resolve().parent / "llm_probe.state"
PROBE_URL = "http://127.0.0.1:20128/v1/models"
TIMEOUT_S = 10


def run_probe() -> dict:
    start_t = time.time()
    res = {
        "ts": time.strftime("%Y-%m-%dT%H:%M:%S+07:00"),
        "status": "DOWN",
        "latency_ms": 0,
        "error": None,
    }

    try:
        req = urllib.request.Request(PROBE_URL, headers={"User-Agent": "AI7-Solaris-Probe/1.0"})
        with urllib.request.urlopen(req, timeout=TIMEOUT_S) as resp:
            elapsed = int((time.time() - start_t) * 1000)
            if resp.status == 200:
                body = resp.read().decode("utf-8")
                data = json.loads(body)
                model_count = len(data.get("data", []))
                res["status"] = "OK"
                res["latency_ms"] = elapsed
                res["model_count"] = model_count
            else:
                res["error"] = f"HTTP {resp.status}"
    except urllib.error.URLError as e:
        res["error"] = f"Network/Connection error: {e.reason}"
    except Exception as e:
        res["error"] = str(e)

    tmp_file = STATE_FILE.with_suffix(".tmp")
    with open(tmp_file, "w", encoding="utf-8") as f:
        json.dump(res, f, indent=2)
    tmp_file.replace(STATE_FILE)

    return res


if __name__ == "__main__":
    result = run_probe()
    print(json.dumps(result, indent=2))
