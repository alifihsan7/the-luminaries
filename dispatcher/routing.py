#!/usr/bin/env python3
"""
AI7 Solaris — Routing Gate
==========================
Gate deterministik yang memaksa Nexus memutuskan SIAPA pemilik sebuah task
sebelum eksekusi, dan menolak Nexus memproduksi artefak domain Luminary.

Prinsip:
  - Nexus boleh:      triage (baca secukupnya untuk klasifikasi), verify (uji klaim).
  - Nexus dilarang:   memproduksi artefak analisis/desain/kode/dokumen milik Luminary.
  - Setiap keputusan dicatat append-only di routing.jsonl → bisa diaudit user.

Pemakaian:
  routing.py check --target iris --mode delegate --reason "audit frontend" --trigger "cek repo portofolio"
  routing.py stats [--days 7]
  routing.py domains

Exit code: 0 = diizinkan, 2 = DITOLAK.
"""

from __future__ import annotations

import argparse
import datetime
import json
import sys
from pathlib import Path
from typing import Any, Dict, List, Optional

DISPATCHER_DIR = Path(__file__).resolve().parent
ROUTING_LOG = DISPATCHER_DIR / "routing.jsonl"

VALID_MODES = {"delegate", "triage", "verify"}
# mode=direct sengaja tidak ada di VALID_MODES — dipertahankan hanya untuk pesan penolakan.
DENIED_MODE = "direct"

# Domain artefak → pemilik yang sah. Keyword dipakai untuk mendeteksi mismatch.
DOMAINS: Dict[str, Dict[str, Any]] = {
    "ariadne": {
        "desc": "Vault Obsidian / PARA / catatan / rangkuman / transkrip",
        "keywords": ["vault", "obsidian", "catatan", "note", "rangkum", "para",
                     "transkrip", "moc", "inbox", "knowledge base"],
    },
    "athena": {
        "desc": "Naskah akademik, skripsi, sitasi, tinjauan pustaka",
        "keywords": ["skripsi", "bab", "naskah", "sitasi", "citation", "abstrak",
                     "tinjauan pustaka", "jurnal", "manuskrip", "proposal"],
    },
    "sage": {
        "desc": "Landasan teori, metodologi, penalaran first-principles",
        "keywords": ["landasan", "teori", "framework", "metodologi", "first-principles",
                     "bandingkan pendekatan", "konsep", "literatur review"],
    },
    "zephyr": {
        "desc": "Kode backend, algoritma, API, benchmark, test",
        "keywords": ["kode", "backend", "api", "endpoint", "refactor", "bug",
                     "benchmark", "unit test", "algoritma", "implementasi", "patch"],
    },
    "daemon": {
        "desc": "Linux VPS, systemd, nginx, backup, port, uptime",
        "keywords": ["systemd", "nginx", "server", "vps", "backup", "cron",
                     "port", "firewall", "reboot", "service", "uptime"],
    },
    "aegis": {
        "desc": "Audit keamanan, pentest, QA gate, release readiness",
        "keywords": ["audit", "keamanan", "security", "pentest", "celah",
                     "vulnerability", "cors", "xss", "injection", "sebelum rilis"],
    },
    "nacht": {
        "desc": "Recon eksternal, tren, kompetitor, scouting tooling",
        "keywords": ["recon", "tren", "trending", "kompetitor", "scout",
                     "repo of the day", "arxiv", "cari di luar", "riset pasar"],
    },
    "iris": {
        "desc": "Frontend, design system, UI/UX, a11y, perf web",
        "keywords": ["frontend", "ui", "ux", "design", "desain", "layout",
                     "komponen", "css", "a11y", "aksesibilitas", "seo", "responsive"],
    },
    "chronos": {
        "desc": "Sprint pacing, jadwal, review mingguan, telemetri hidup",
        "keywords": ["sprint", "jadwal", "schedule", "weekly", "mingguan",
                     "deadline", "progress harian", "alignment"],
    },
}


def _now() -> str:
    tz = datetime.timezone(datetime.timedelta(hours=7))
    return datetime.datetime.now(tz).isoformat(timespec="seconds")


def _log(entry: Dict[str, Any]) -> None:
    with open(ROUTING_LOG, "a", encoding="utf-8") as f:
        f.write(json.dumps(entry, ensure_ascii=False) + "\n")


def detect_domain(*texts: str) -> Optional[str]:
    """Kembalikan nama Luminary yang paling cocok dengan teks, atau None."""
    import re

    blob = " ".join(t for t in texts if t).lower()
    if not blob.strip():
        return None
    scores: Dict[str, int] = {}
    for agent, meta in DOMAINS.items():
        hits = 0
        for kw in meta["keywords"]:
            # word-boundary match supaya "port" tidak cocok ke "portofolio"
            if re.search(r"(?<![a-z0-9])" + re.escape(kw) + r"(?![a-z0-9])", blob):
                hits += 1
        if hits:
            scores[agent] = hits
    if not scores:
        return None
    best = max(scores.items(), key=lambda kv: (kv[1], kv[0]))
    # Seri → ambigu, jangan menebak
    if list(scores.values()).count(best[1]) > 1:
        return "ambiguous"
    return best[0]


def evaluate(target: str, mode: str, reason: str, trigger: str = "",
             expect: Optional[List[str]] = None) -> Dict[str, Any]:
    """Terapkan aturan gate. Return dict berisi ok, violation, advice."""
    expect = expect or []
    reason = (reason or "").strip()
    trigger = (trigger or "").strip()

    if not reason:
        return {"ok": False, "violation": "REASON_REQUIRED",
                "advice": "Isi --reason: kenapa task ini milik target tersebut."}

    if mode == DENIED_MODE:
        return {"ok": False, "violation": "MODE_DIRECT_FORBIDDEN",
                "advice": ("mode=direct dihapus. Nexus tidak memproduksi artefak domain. "
                           "Pakai delegate ke Luminary, atau triage/verify kalau memang "
                           "kerjaan Nexus.")}

    if mode not in VALID_MODES:
        return {"ok": False, "violation": "MODE_UNKNOWN",
                "advice": f"mode harus salah satu dari {sorted(VALID_MODES)}."}

    if mode == "delegate":
        if target == "nexus":
            return {"ok": False, "violation": "SELF_DELEGATION",
                    "advice": ("Delegasi ke nexus = tidak mendelegasikan apa pun. "
                               "Pilih Luminary pemilik domain, atau ubah mode ke triage/verify.")}
        if target not in DOMAINS:
            return {"ok": False, "violation": "UNKNOWN_TARGET",
                    "advice": f"target '{target}' bukan Luminary terdaftar: {sorted(DOMAINS)}."}
        owner = detect_domain(trigger, reason)
        if owner not in (None, "ambiguous", target):
            return {"ok": False, "violation": "DOMAIN_MISMATCH",
                    "advice": (f"Sinyal domain menunjuk ke '{owner}', bukan '{target}'. "
                               f"Perbaiki target atau perjelas --reason.")}
        if not expect:
            return {"ok": False, "violation": "EXPECT_REQUIRED",
                    "advice": "Sebutkan --expect (artefak yang diharapkan), mis. handoff/iris/*.out.md."}
        return {"ok": True}

    # mode == triage / verify → hanya untuk Nexus
    if target != "nexus":
        return {"ok": False, "violation": "MODE_TARGET_MISMATCH",
                "advice": f"mode={mode} hanya valid untuk target=nexus, bukan '{target}'."}

    if mode == "triage" and expect:
        return {"ok": False, "violation": "TRIAGE_NOT_ALLOWED_TO_PRODUCE",
                "advice": ("triage hanya baca + klasifikasi, tidak menghasilkan artefak. "
                           "Kalau ada artefak → itu delegate ke Luminary.")}

    owner = detect_domain(trigger, reason)
    if mode == "triage" and owner not in (None, "ambiguous"):
        return {"ok": False, "violation": "TRIAGE_SCOPE_EXCEEDED",
                "advice": (f"Materi ini milik '{owner}'. Triage maksimal: buka, klasifikasi, "
                           f"lalu delegate ke '{owner}'.")}

    return {"ok": True}


def cmd_check(args: argparse.Namespace) -> int:
    result = evaluate(args.target, args.mode, args.reason, args.trigger, args.expect)
    entry = {
        "type": "route",
        "ts": _now(),
        "decided_by": "nexus",
        "target": args.target,
        "mode": args.mode,
        "reason": args.reason,
        "trigger": args.trigger or "",
        "expect": args.expect or [],
        "verdict": "ALLOW" if result["ok"] else "DENY",
        "violation": result.get("violation"),
    }
    _log(entry)

    print(json.dumps(entry, ensure_ascii=False, indent=2))
    if not result["ok"]:
        print(f"\nROUTE_DENIED: {result['violation']}\n  → {result['advice']}", file=sys.stderr)
        return 2
    print("\nROUTE_ALLOW", file=sys.stderr)
    return 0


def cmd_stats(args: argparse.Namespace) -> int:
    if not ROUTING_LOG.exists():
        print("Belum ada keputusan routing tercatat.")
        return 0
    cutoff = datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(days=args.days)
    counts = {"delegations": 0, "nexus_triage": 0, "nexus_verify": 0,
              "nexus_domain_direct": 0, "denied": 0}
    per_target: Dict[str, int] = {}
    for line in ROUTING_LOG.read_text(encoding="utf-8").splitlines():
        try:
            e = json.loads(line)
        except json.JSONDecodeError:
            continue
        try:
            ts = datetime.datetime.fromisoformat(e["ts"])
        except (KeyError, ValueError):
            continue
        if ts < cutoff:
            continue
        if e.get("verdict") == "DENY":
            counts["denied"] += 1
            # Penolakan = gate bekerja, bukan pelanggaran. Jangan dihitung sebagai
            # nexus_domain_direct, tapi tetap dicatat agar keputusan bisa diaudit.
            continue
        if e.get("mode") == "delegate" and e.get("target") != "nexus":
            counts["delegations"] += 1
            per_target[e["target"]] = per_target.get(e["target"], 0) + 1
        elif e.get("mode") == "triage":
            counts["nexus_triage"] += 1
        elif e.get("mode") == "verify":
            counts["nexus_verify"] += 1
        # Kerja domain yang benar-benar dilakukan Nexus sendiri = pelanggaran nyata
        if e.get("target") == "nexus" and e.get("mode") == "delegate":
            counts["nexus_domain_direct"] += 1

    print(f"=== Routing stats ({args.days} hari terakhir) ===")
    for k, v in counts.items():
        flag = "  ← ALARM" if k == "nexus_domain_direct" and v > 0 else ""
        print(f"{k:<22}: {v}{flag}")
    if per_target:
        print("\nDelegasi per Luminary:")
        for agent, n in sorted(per_target.items(), key=lambda kv: -kv[1]):
            print(f"  {agent:<10}: {n}")
    return 0


def cmd_domains(_: argparse.Namespace) -> int:
    print("=== Yurisdiksi Domain ===")
    for agent, meta in DOMAINS.items():
        print(f"\n{agent:<9} {meta['desc']}")
        print(f"          {' · '.join(meta['keywords'])}")
    print("\nnexus      triage (baca+klasifikasi) & verify (uji klaim). TIDAK produksi artefak.")
    return 0


def main() -> int:
    p = argparse.ArgumentParser(description="AI7 Solaris Routing Gate")
    sub = p.add_subparsers(dest="cmd", required=True)

    c = sub.add_parser("check", help="Validasi keputusan routing sebelum eksekusi")
    c.add_argument("--target", required=True, help="Luminary tujuan, atau 'nexus'")
    c.add_argument("--mode", required=True, help="delegate | triage | verify")
    c.add_argument("--reason", required=True, help="Alasan keputusan routing")
    c.add_argument("--trigger", default="", help="Perintah asli user (untuk deteksi domain)")
    c.add_argument("--expect", nargs="*", default=[], help="Artefak yang diharapkan")
    c.set_defaults(func=cmd_check)

    s = sub.add_parser("stats", help="Statistik keputusan routing")
    s.add_argument("--days", type=int, default=7)
    s.set_defaults(func=cmd_stats)

    d = sub.add_parser("domains", help="Tampilkan peta yurisdiksi")
    d.set_defaults(func=cmd_domains)

    args = p.parse_args()
    return args.func(args)


if __name__ == "__main__":
    sys.exit(main())
