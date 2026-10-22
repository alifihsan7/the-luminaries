#!/usr/bin/env python3
"""
Unit tests untuk AI7 Solaris Core Dispatcher (Phase 1)
Menguji:
1. Validasi keberadaan task file
2. Validasi batas ukuran task file (16KB)
3. Validasi profil tak terdaftar di registry
4. Idempotency check
5. Concurrency lock (flock) per profil
6. Append-only logging ke tasks.jsonl dengan format valid Lampiran A
"""

import os
import sys
import json
import time
import unittest
from unittest.mock import patch
from pathlib import Path

# Setup path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "dispatcher"))
import dispatcher


class TestDispatcher(unittest.TestCase):
    def setUp(self):
        self.tmp_dir = Path("/tmp/test_ai7_dispatcher")
        self.tmp_dir.mkdir(parents=True, exist_ok=True)
        self.test_task_file = self.tmp_dir / "sample_task.md"
        with open(self.test_task_file, "w", encoding="utf-8") as f:
            f.write("Task content for testing unit capabilities.")

    def tearDown(self):
        if self.test_task_file.exists():
            self.test_task_file.unlink()

    def test_nonexistent_profile(self):
        res = dispatcher.dispatch_task("nonexistent_luminary", str(self.test_task_file))
        self.assertFalse(res["ok"])
        self.assertIn("not registered", res["error"])

    def test_nonexistent_task_file(self):
        res = dispatcher.dispatch_task("zephyr", "/tmp/definitely_not_found_file.md")
        self.assertFalse(res["ok"])
        self.assertIn("does not exist", res["error"])

    def test_task_file_size_limit(self):
        huge_file = self.tmp_dir / "huge_task.md"
        with open(huge_file, "w", encoding="utf-8") as f:
            f.write("A" * (17 * 1024))  # 17 KB > 16 KB

        res = dispatcher.dispatch_task("zephyr", str(huge_file))
        self.assertFalse(res["ok"])
        self.assertIn("exceeds max size limit", res["error"])
        if huge_file.exists():
            huge_file.unlink()

    def test_idempotency_key(self):
        k1 = dispatcher.compute_idempotency_key("dispatch", "zephyr", "abc", "Test Task")
        k2 = dispatcher.compute_idempotency_key("dispatch", "zephyr", "abc", "test task ")
        self.assertEqual(k1, k2)

    def test_profile_lock(self):
        lock1 = dispatcher.ProfileLock("test_prof")
        lock2 = dispatcher.ProfileLock("test_prof")

        self.assertTrue(lock1.acquire())
        self.assertFalse(lock2.acquire())  # Harus gagal karena lock1 sedang pegang

        lock1.release()
        self.assertTrue(lock2.acquire())
        lock2.release()

    def test_append_task_event_timeout_s(self):
        # Verify append_task_event stores timeout_s as given using a temporary log file
        temp_log = self.tmp_dir / f"test_tasks_{time.time_ns()}.jsonl"
        if temp_log.exists():
            temp_log.unlink()
        with patch.object(dispatcher, "TASKS_LOG_FILE", temp_log):
            ev1 = dispatcher.append_task_event(
                task_id="TSK-TEST-TIMEOUT-1",
                status="QUEUED",
                target="zephyr",
                intent="Test timeout recording",
                timeout_s=240,
            )
            self.assertEqual(ev1.get("timeout_s"), 240)

            ev2 = dispatcher.append_task_event(
                task_id="TSK-TEST-TIMEOUT-2",
                status="QUEUED",
                target="zephyr",
                intent="Test null timeout",
                timeout_s=None,
            )
            self.assertIsNone(ev2.get("timeout_s"))

            # Also verify persistence in JSON lines
            lines = [json.loads(l) for l in temp_log.read_text(encoding="utf-8").splitlines() if l.strip()]
            self.assertEqual(len(lines), 2)
            self.assertEqual(lines[0]["timeout_s"], 240)
            self.assertIsNone(lines[1]["timeout_s"])
        if temp_log.exists():
            temp_log.unlink()

    def test_full_intent_capture_and_no_200_truncation(self):
        temp_log = self.tmp_dir / f"test_intent_{time.time_ns()}.jsonl"
        with patch.object(dispatcher, "TASKS_LOG_FILE", temp_log):
            long_intent = "A" * 600
            ev = dispatcher.append_task_event(
                task_id="TSK-LONG-INTENT",
                status="QUEUED",
                target="zephyr",
                intent=long_intent,
            )
            self.assertEqual(len(ev["intent"]), 600)
            self.assertEqual(ev["intent"], long_intent)

            # Max cap is 2000
            huge_intent = "B" * 2500
            ev2 = dispatcher.append_task_event(
                task_id="TSK-HUGE-INTENT",
                status="QUEUED",
                target="zephyr",
                intent=huge_intent,
            )
            self.assertEqual(len(ev2["intent"]), 2000)
        if temp_log.exists():
            temp_log.unlink()

    def test_privacy_sanitization_in_append_task_event(self):
        temp_log = self.tmp_dir / f"test_privacy_{time.time_ns()}.jsonl"
        fake_home = Path("/home/operator")
        raw_chat_id = "9876543210"
        raw_email = "user@example.com"
        raw_path = f"{fake_home}/project"
        raw_token = "8123456789:ABCdefGHIjklMNOpqrSTUvwxYZ123456789"
        raw_bearer = "Bearer MOCK_BEARER_TOKEN_ABCD12345678901234"

        sensitive_intent = (
            f"Deploy to {raw_path} with chat id {raw_chat_id} "
            f"and email {raw_email} and token {raw_token}"
        )
        raw_art = str(dispatcher.BASE_DIR / "handoff" / "zephyr" / "out" / "TSK-PRIV.out.md")
        raw_spec = str(dispatcher.BASE_DIR / "handoff" / "zephyr" / "in" / "TSK-PRIV.task.md")
        raw_error = f"Failure at {dispatcher.BASE_DIR}/dispatcher/worker.py with {raw_bearer}"

        with patch.object(dispatcher, "TASKS_LOG_FILE", temp_log), \
             patch("pathlib.Path.home", return_value=fake_home):
            ev = dispatcher.append_task_event(
                task_id="TSK-PRIV-TEST",
                status="FAILED",
                target="zephyr",
                intent=sensitive_intent,
                artifacts=[raw_art],
                spec=raw_spec,
                error=raw_error,
            )

            # Assert sanitization
            self.assertNotIn(raw_path, ev["intent"])
            self.assertNotIn(str(fake_home), ev["intent"])
            self.assertIn("~/project", ev["intent"])
            self.assertIn("[REDACTED_CHAT_ID]", ev["intent"])
            self.assertNotIn(raw_chat_id, ev["intent"])
            self.assertIn("[REDACTED_EMAIL]", ev["intent"])
            self.assertNotIn(raw_email, ev["intent"])
            self.assertIn("[REDACTED_TOKEN]", ev["intent"])

            # Assert path normalization
            self.assertEqual(ev["artifacts"], ["handoff/zephyr/out/TSK-PRIV.out.md"])
            self.assertEqual(ev["spec"], "handoff/zephyr/in/TSK-PRIV.task.md")

            # Assert error sanitization
            self.assertNotIn(str(dispatcher.BASE_DIR), ev["error"])
            self.assertIn("[REDACTED_TOKEN]", ev["error"])
            self.assertNotIn("MOCK_BEARER_TOKEN_ABCD12345678901234", ev["error"])
        if temp_log.exists():
            temp_log.unlink()

    def test_dispatch_task_full_intent_capture_from_file(self):
        # Create a spec file longer than 120 chars with multiple lines
        multiline_task = (
            "# TASK: Complex Backend Optimization\n\n"
            "## Description\n"
            "This is a comprehensive description exceeding 120 characters to guarantee that "
            "the dispatcher no longer truncates intent or flattens lines prematurely."
        )
        task_f = self.tmp_dir / "multiline_task.md"
        task_f.write_text(multiline_task, encoding="utf-8")

        temp_log = self.tmp_dir / f"test_dispatch_{time.time_ns()}.jsonl"
        with patch.object(dispatcher, "TASKS_LOG_FILE", temp_log), \
             patch.object(dispatcher, "run_worker_process"):
            res = dispatcher.dispatch_task("zephyr", str(task_f))
            self.assertTrue(res["ok"])
            tid = res["task_id"]

            active = dispatcher.load_active_tasks()
            active_intent = active.get(tid, {}).get("intent", "")
            self.assertGreater(len(active_intent), 150)
            self.assertIn("Complex Backend Optimization", active_intent)
            self.assertIn("guarantee that the dispatcher no longer truncates", active_intent)

            # Cleanup active task
            active.pop(tid, None)
            dispatcher.save_active_tasks(active)

        if task_f.exists():
            task_f.unlink()
        if temp_log.exists():
            temp_log.unlink()


if __name__ == "__main__":
    unittest.main()
