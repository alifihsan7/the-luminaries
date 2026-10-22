"""Tests for GET /api/relations and derive_relations (Task D-8).

Verification of mathematical invariants, honest derivation, edge cases,
and endpoint HTTP contract.
"""
import json
import time
from datetime import datetime, timedelta, timezone
from pathlib import Path
from unittest.mock import patch

import httpx
import pytest

from app import TASKS_FILE, app, derive_relations, derive_tasks


# ---------------------------------------------------------------------------
# 1. Production Invariant Tests (No hardcoded today-counts)
# ---------------------------------------------------------------------------

def test_relations_production_invariants():
    """Verify core graph invariants against whatever is currently in production tasks.jsonl."""
    if not TASKS_FILE.is_file():
        pytest.skip("Production tasks.jsonl not found")

    res = derive_relations(use_cache=False)
    tasks = derive_tasks(TASKS_FILE)

    # 1. Independent count of valid tasks with explicit from and to (and from != to)
    valid_tasks = []
    for t in tasks:
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
        valid_tasks.append(t)

    # Invariant: Total task count matches valid tasks
    assert res["counts"]["tasks"] == len(valid_tasks)
    assert sum(e["task_count"] for e in res["edges"]) == len(valid_tasks)

    # Invariant: Node closure — every edge endpoint exists in nodes list
    node_ids = {n["id"] for n in res["nodes"]}
    for edge in res["edges"]:
        assert edge["from"] in node_ids, f"Edge source {edge['from']} missing from nodes"
        assert edge["to"] in node_ids, f"Edge target {edge['to']} missing from nodes"
        # Invariant: No self loops
        assert edge["from"] != edge["to"], f"Self loop detected on edge {edge}"

    # Invariant: No ghost nodes — every node participated in at least one valid task
    for node in res["nodes"]:
        assert (node["tasks_received"] + node["tasks_sent"]) > 0, f"Ghost node {node['id']} has 0 total tasks"

    # Invariant: Conservation of task volume across nodes
    total_received = sum(n["tasks_received"] for n in res["nodes"])
    total_sent = sum(n["tasks_sent"] for n in res["nodes"])
    assert total_received == len(valid_tasks), "Sum of tasks_received must equal total valid tasks"
    assert total_sent == len(valid_tasks), "Sum of tasks_sent must equal total valid tasks"

    # Invariant: Sum of status breakdown per edge equals edge task_count
    for edge in res["edges"]:
        status_sum = sum(edge["status_counts"].values())
        assert status_sum == edge["task_count"], f"Edge {edge['from']}->{edge['to']} status sum mismatch"
        assert edge["task_count"] > 0

    # Invariant: Sum of node status breakdown equals tasks received
    for node in res["nodes"]:
        status_sum = sum(node["status_counts"].values())
        assert status_sum == node["tasks_received"], f"Node {node['id']} status sum mismatch"
        assert node["waiting_or_running"] == (node["queued_count"] + node["running_count"])

    # Invariant: Output ordering is deterministic
    # Edges sorted by (-task_count, from, to)
    for i in range(len(res["edges"]) - 1):
        e1, e2 = res["edges"][i], res["edges"][i + 1]
        k1 = (-e1["task_count"], e1["from"], e1["to"])
        k2 = (-e2["task_count"], e2["from"], e2["to"])
        assert k1 <= k2, f"Edges not sorted deterministically: {k1} > {k2}"

    # Nodes sorted by (-tasks_received - tasks_sent, id)
    for i in range(len(res["nodes"]) - 1):
        n1, n2 = res["nodes"][i], res["nodes"][i + 1]
        k1 = (-n1["tasks_received"] - n1["tasks_sent"], n1["id"])
        k2 = (-n2["tasks_received"] - n2["tasks_sent"], n2["id"])
        assert k1 <= k2, f"Nodes not sorted deterministically: {k1} > {k2}"


def test_relations_deterministic_output():
    """Verify multiple consecutive calls return identical data."""
    r1 = derive_relations(use_cache=False)
    r2 = derive_relations(use_cache=False)
    assert r1["counts"] == r2["counts"]
    assert r1["nodes"] == r2["nodes"]
    assert r1["edges"] == r2["edges"]


# ---------------------------------------------------------------------------
# 2. Honest Derivation & Edge Case Tests (Synthetic Fixtures)
# ---------------------------------------------------------------------------

def test_relations_missing_from_or_to_no_ghost_nodes(tmp_path: Path):
    """Tasks without from or to must not create ghost nodes or edges."""
    tasks_file = tmp_path / "tasks.jsonl"
    lines = [
        # Valid task
        {"v": "3.1", "ts": "2026-10-21T01:00:00+07:00", "task_id": "T1", "from": "nexus", "to": "zephyr", "status": "SUCCEEDED"},
        # Missing from
        {"v": "3.1", "ts": "2026-10-21T01:01:00+07:00", "task_id": "T2", "to": "daemon", "status": "SUCCEEDED"},
        # Missing to
        {"v": "3.1", "ts": "2026-10-21T01:02:00+07:00", "task_id": "T3", "from": "nexus", "status": "SUCCEEDED"},
        # None from/to
        {"v": "3.1", "ts": "2026-10-21T01:03:00+07:00", "task_id": "T4", "from": None, "to": "sage", "status": "SUCCEEDED"},
        {"v": "3.1", "ts": "2026-10-21T01:04:00+07:00", "task_id": "T5", "from": "sage", "to": None, "status": "SUCCEEDED"},
        # Ghost keyword names
        {"v": "3.1", "ts": "2026-10-21T01:05:00+07:00", "task_id": "T6", "from": "unknown", "to": "zephyr", "status": "SUCCEEDED"},
        {"v": "3.1", "ts": "2026-10-21T01:06:00+07:00", "task_id": "T7", "from": "nexus", "to": "null", "status": "SUCCEEDED"},
    ]
    tasks_file.write_text("\n".join(json.dumps(ln) for ln in lines) + "\n")

    res = derive_relations(tasks_file=tasks_file)
    assert res["counts"]["tasks"] == 1
    assert res["counts"]["edges"] == 1
    assert res["counts"]["nodes"] == 2

    node_ids = {n["id"] for n in res["nodes"]}
    assert node_ids == {"nexus", "zephyr"}
    assert "daemon" not in node_ids
    assert "sage" not in node_ids
    assert "unknown" not in node_ids
    assert "null" not in node_ids


def test_relations_self_loops_rejected(tmp_path: Path):
    """Tasks where from == to must not create self edges."""
    tasks_file = tmp_path / "tasks.jsonl"
    lines = [
        {"v": "3.1", "ts": "2026-10-21T01:00:00+07:00", "task_id": "T-SELF", "from": "zephyr", "to": "zephyr", "status": "SUCCEEDED"},
        {"v": "3.1", "ts": "2026-10-21T01:05:00+07:00", "task_id": "T-VALID", "from": "nexus", "to": "zephyr", "status": "SUCCEEDED"},
    ]
    tasks_file.write_text("\n".join(json.dumps(ln) for ln in lines) + "\n")

    res = derive_relations(tasks_file=tasks_file)
    assert res["counts"]["tasks"] == 1
    assert res["counts"]["edges"] == 1
    edge = res["edges"][0]
    assert edge["from"] == "nexus"
    assert edge["to"] == "zephyr"
    assert edge["task_count"] == 1


def test_relations_empty_file_and_corrupted_lines(tmp_path: Path):
    """Graceful handling of empty or corrupted tasks.jsonl."""
    empty_file = tmp_path / "empty.jsonl"
    empty_file.write_text("")
    res_empty = derive_relations(tasks_file=empty_file)
    assert res_empty["counts"] == {"nodes": 0, "edges": 0, "tasks": 0, "waiting_or_running": 0, "status_counts": {}}
    assert res_empty["nodes"] == []
    assert res_empty["edges"] == []

    corrupted_file = tmp_path / "corrupt.jsonl"
    corrupted_file.write_text(
        "INVALID JSON NONCE\n"
        '{"broken": 1}\n'
        '{"v": "3.1", "ts": "2026-10-21T01:00:00+07:00", "task_id": "T1", "from": "nexus", "to": "iris", "status": "SUCCEEDED"}\n'
    )
    res_corrupt = derive_relations(tasks_file=corrupted_file)
    assert res_corrupt["counts"]["tasks"] == 1
    assert res_corrupt["counts"]["edges"] == 1
    assert res_corrupt["edges"][0]["to"] == "iris"


def test_relations_multi_event_task_deduplication(tmp_path: Path):
    """Multiple lifecycle events for the same task_id should count as 1 task on edge."""
    tasks_file = tmp_path / "tasks.jsonl"
    lines = [
        {"v": "3.1", "ts": "2026-10-21T01:00:00+07:00", "task_id": "T1", "from": "nexus", "to": "zephyr", "status": "QUEUED"},
        {"v": "3.1", "ts": "2026-10-21T01:00:05+07:00", "task_id": "T1", "from": "nexus", "to": "zephyr", "status": "RUNNING"},
        {"v": "3.1", "ts": "2026-10-21T01:00:20+07:00", "task_id": "T1", "from": "nexus", "to": "zephyr", "status": "SUCCEEDED"},
    ]
    tasks_file.write_text("\n".join(json.dumps(ln) for ln in lines) + "\n")

    res = derive_relations(tasks_file=tasks_file)
    assert res["counts"]["tasks"] == 1
    assert res["counts"]["edges"] == 1
    edge = res["edges"][0]
    assert edge["task_count"] == 1
    assert edge["status_counts"] == {"SUCCEEDED": 1}
    assert res["counts"]["waiting_or_running"] == 0

    node_zephyr = next(n for n in res["nodes"] if n["id"] == "zephyr")
    assert node_zephyr["tasks_received"] == 1
    assert node_zephyr["waiting_or_running"] == 0
    assert node_zephyr["status_counts"] == {"SUCCEEDED": 1}


def test_relations_orphaned_and_stuck_status_breakdown(tmp_path: Path):
    """Edge and node reflect stuck and orphaned tasks properly."""
    tasks_file = tmp_path / "tasks.jsonl"
    active_file = tmp_path / "active_tasks.json"
    lines = [
        # Hanging QUEUED > 600s with no worker in active_tasks -> ORPHANED
        {"v": "3.1", "ts": "2026-10-20T22:00:00+07:00", "task_id": "T-ORPHAN", "from": "nexus", "to": "chronos", "status": "QUEUED"},
        # Hanging QUEUED > 600s WITH worker in active_tasks -> stuck QUEUED
        {"v": "3.1", "ts": "2026-10-20T22:00:00+07:00", "task_id": "T-STUCK", "from": "nexus", "to": "chronos", "status": "QUEUED"},
    ]
    tasks_file.write_text("\n".join(json.dumps(ln) for ln in lines) + "\n")
    active_file.write_text(json.dumps({"T-STUCK": {"target": "chronos"}}))

    res = derive_relations(tasks_file=tasks_file, active_tasks_file=active_file)
    assert res["counts"]["tasks"] == 2
    assert res["counts"]["waiting_or_running"] == 1  # only T-STUCK is QUEUED, T-ORPHAN is ORPHANED

    edge = res["edges"][0]
    assert edge["task_count"] == 2
    assert edge["stuck_count"] == 2
    assert edge["status_counts"]["ORPHANED"] == 1
    assert edge["status_counts"]["QUEUED"] == 1

    node_chronos = next(n for n in res["nodes"] if n["id"] == "chronos")
    assert node_chronos["tasks_received"] == 2
    assert node_chronos["stuck_count"] == 2
    assert node_chronos["waiting_or_running"] == 1
    assert node_chronos["queued_count"] == 1


def test_relations_resolved_annotation(tmp_path: Path):
    """Resolved metadata reflects in edge resolved_count."""
    tasks_file = tmp_path / "tasks.jsonl"
    resolved_file = tmp_path / "resolved.json"
    lines = [
        {"v": "3.1", "ts": "2026-10-21T01:00:00+07:00", "task_id": "T-FAIL", "from": "nexus", "to": "sage", "status": "FAILED", "error": "timeout"},
    ]
    tasks_file.write_text("\n".join(json.dumps(ln) for ln in lines) + "\n")
    resolved_file.write_text(json.dumps({"T-FAIL": {"commit": "abc1234", "reason": "fixed", "at": "2026-10-21T02:00:00Z"}}))

    res = derive_relations(tasks_file=tasks_file, resolved_file=resolved_file)
    edge = res["edges"][0]
    assert edge["task_count"] == 1
    assert edge["resolved_count"] == 1
    assert edge["status_counts"] == {"FAILED": 1}


def test_relations_days_time_window_filter(tmp_path: Path):
    """Verify ?days= filter correctly gates tasks based on timestamp."""
    tasks_file = tmp_path / "tasks.jsonl"
    now = datetime.now(timezone.utc)
    recent_ts = (now - timedelta(hours=2)).isoformat()
    old_ts = (now - timedelta(days=10)).isoformat()

    lines = [
        {"v": "3.1", "ts": recent_ts, "task_id": "T-RECENT", "from": "nexus", "to": "zephyr", "status": "SUCCEEDED"},
        {"v": "3.1", "ts": old_ts, "task_id": "T-OLD", "from": "nexus", "to": "iris", "status": "SUCCEEDED"},
    ]
    tasks_file.write_text("\n".join(json.dumps(ln) for ln in lines) + "\n")

    # With days=5: only T-RECENT is within window
    res_recent = derive_relations(tasks_file=tasks_file, days=5)
    assert res_recent["counts"]["tasks"] == 1
    assert res_recent["edges"][0]["to"] == "zephyr"
    assert {n["id"] for n in res_recent["nodes"]} == {"nexus", "zephyr"}

    # With days=15: both are within window
    res_all = derive_relations(tasks_file=tasks_file, days=15)
    assert res_all["counts"]["tasks"] == 2
    assert len(res_all["edges"]) == 2

    # With days=0.01 (approx 14 mins): neither
    res_none = derive_relations(tasks_file=tasks_file, days=0.01)
    assert res_none["counts"]["tasks"] == 0
    assert len(res_none["edges"]) == 0


# ---------------------------------------------------------------------------
# 3. HTTP API Endpoint Tests (/api/relations)
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_endpoint_api_relations_success():
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.get("/api/relations")
        assert res.status_code == 200
        body = res.json()
        assert "generated_at" in body
        assert "counts" in body
        assert "nodes" in body
        assert "edges" in body

        # Check structure of counts
        counts = body["counts"]
        assert "nodes" in counts
        assert "edges" in counts
        assert "tasks" in counts
        assert "waiting_or_running" in counts
        assert "status_counts" in counts

        # Check node structure
        for node in body["nodes"]:
            assert "id" in node
            assert "name" in node
            assert "role" in node
            assert "tasks_received" in node
            assert "tasks_sent" in node
            assert "waiting_or_running" in node
            assert "queued_count" in node
            assert "running_count" in node
            assert "stuck_count" in node
            assert "last_active" in node

        # Check edge structure
        for edge in body["edges"]:
            assert "from" in edge
            assert "to" in edge
            assert "task_count" in edge
            assert "last_active" in edge
            assert "status_counts" in edge
            assert "stuck_count" in edge
            assert "resolved_count" in edge


@pytest.mark.asyncio
async def test_endpoint_api_relations_with_days_param():
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.get("/api/relations?days=7")
        assert res.status_code == 200
        body = res.json()
        assert "counts" in body


@pytest.mark.asyncio
async def test_endpoint_api_relations_invalid_days():
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        # gt=0 validation
        res_zero = await client.get("/api/relations?days=0")
        assert res_zero.status_code == 422
        res_neg = await client.get("/api/relations?days=-5")
        assert res_neg.status_code == 422


@pytest.mark.asyncio
async def test_endpoint_api_relations_error_handling():
    with patch("app.derive_relations", side_effect=RuntimeError("simulated error")):
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
            res = await client.get("/api/relations")
            assert res.status_code == 500
            body = res.json()
            assert "error" in body
            assert "simulated error" in body["error"]
            assert "generated_at" in body


# ---------------------------------------------------------------------------
# 4. Latency Benchmark & Production Snapshot
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_endpoint_latency_benchmark_and_snapshot():
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        # Cold request (cache miss)
        t_cold_0 = time.perf_counter()
        res_cold = await client.get("/api/relations")
        t_cold_1 = time.perf_counter()
        cold_latency_ms = (t_cold_1 - t_cold_0) * 1000

        # Warm requests (cache hit)
        rounds = 100
        t0 = time.perf_counter()
        for _ in range(rounds):
            res = await client.get("/api/relations")
            assert res.status_code == 200
        t1 = time.perf_counter()

        warm_latency_ms = ((t1 - t0) / rounds) * 1000

        # Pure Python function latency (isolated from HTTP overhead)
        fn_rounds = 500
        t_fn0 = time.perf_counter()
        for _ in range(fn_rounds):
            derive_relations(use_cache=True)
        t_fn1 = time.perf_counter()
        fn_latency_us = ((t_fn1 - t_fn0) / fn_rounds) * 1_000_000

        body = res_cold.json()
        print("\n================ PRODUCTION SNAPSHOT ================")
        print(f"Generated at: {body['generated_at']}")
        print(f"Node count: {body['counts']['nodes']}")
        print(f"Edge count: {body['counts']['edges']}")
        print(f"Task count: {body['counts']['tasks']}")
        print(f"Active tasks (waiting/running): {body['counts']['waiting_or_running']}")
        print(f"Global status counts: {body['counts']['status_counts']}")
        print("Nodes:")
        for n in body["nodes"]:
            print(f"  [{n['id']}] {n['name']} ({n['role']}): recv={n['tasks_received']}, sent={n['tasks_sent']}, active={n['waiting_or_running']}, last={n['last_active']}")
        print("Edges:")
        for e in body["edges"]:
            print(f"  {e['from']} -> {e['to']}: {e['task_count']} tasks | statuses={e['status_counts']} | last={e['last_active']}")
        print("Top 3 edges:")
        for e in body["edges"][:3]:
            print(f"  {e['from']} -> {e['to']}: {e['task_count']}")
        print("---------------- LATENCY METRICS ----------------")
        print(f"Cold HTTP request latency: {cold_latency_ms:.3f} ms")
        print(f"Warm HTTP request latency ({rounds} rounds): {warm_latency_ms:.3f} ms")
        print(f"Pure Python cached derive_relations() ({fn_rounds} rounds): {fn_latency_us:.1f} µs ({fn_latency_us / 1000:.3f} ms)")
        print("=====================================================")

        assert warm_latency_ms < 10.0
