#!/usr/bin/env bash
# AI7 Solaris — Audit Verdict Generator (Aegis Security Gate)
# Mengaudit kode sebelum deployment dan menghasilkan verdict JSON terenkapsulasi

set -euo pipefail

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
REPO_DIR="$( dirname "$SCRIPT_DIR" )"
VERDICTS_DIR="$REPO_DIR/verdicts"
mkdir -p "$VERDICTS_DIR"

COMMIT=$(git -C "$REPO_DIR" rev-parse HEAD)
TIMESTAMP=$(date -Iseconds)
VERDICT_FILE="$VERDICTS_DIR/${COMMIT}.json"

echo "=== Memulai Audit Gate AI7 Solaris (Commit: $COMMIT) ==="

PYTEST_BIN="$REPO_DIR/.venv/bin/pytest"
if [ ! -x "$PYTEST_BIN" ]; then
  PYTEST_BIN="pytest"
fi
PYTHON_BIN="$REPO_DIR/.venv/bin/python"
if [ ! -x "$PYTHON_BIN" ]; then
  PYTHON_BIN="python3"
fi

# 1. Jalankan unit test pytest / unittest
echo "[1/3] Menjalankan test suite..."
set +e
"$PYTEST_BIN" "$REPO_DIR/tests" -q > /dev/null 2>&1
TEST_EXIT=$?
set -e

if [ $TEST_EXIT -ne 0 ]; then
  echo "[-] Tests FAILED!"
  cat <<EOF > "$VERDICT_FILE"
{
  "commit": "$COMMIT",
  "status": "REJECTED",
  "auditor": "aegis",
  "ts": "$TIMESTAMP",
  "reason": "Test suite failed with exit code $TEST_EXIT"
}
EOF
  exit 1
fi
echo "[+] Tests PASSED."

# 2. Secret scanning sederhana (memastikan tidak ada credential telanjang)
echo "[2/3] Memeriksa paparan rahasia/token telanjang di source tree..."
DIRTY_SECRETS=0
if git -C "$REPO_DIR" diff HEAD~1 HEAD 2>/dev/null | grep -E "(sk-[a-zA-Z0-9]{20,}|ghp_[a-zA-Z0-9]{20,}|telegram_bot_token)" > /dev/null; then
  DIRTY_SECRETS=1
fi

if [ $DIRTY_SECRETS -ne 0 ]; then
  echo "[-] Deteksi secret telanjang dalam commit!"
  cat <<EOF > "$VERDICT_FILE"
{
  "commit": "$COMMIT",
  "status": "REJECTED",
  "auditor": "aegis",
  "ts": "$TIMESTAMP",
  "reason": "Secret scan failed: found plain credentials in git diff"
}
EOF
  exit 1
fi
echo "[+] Secret scan PASSED."

# 3. Syntax & lint check dasar
echo "[3/3] Memeriksa sintaks Python..."
"$PYTHON_BIN" -m py_compile "$REPO_DIR/app.py" "$REPO_DIR/dispatcher/dispatcher.py"
echo "[+] Syntax PASSED."

# Tulis verdict PASSED
cat <<EOF > "$VERDICT_FILE"
{
  "commit": "$COMMIT",
  "status": "PASSED",
  "auditor": "aegis",
  "ts": "$TIMESTAMP",
  "reason": "All automated gates passed: unit tests, secret scan, syntax verification"
}
EOF

echo "[*] Verdict PASSED tersimpan di: $VERDICT_FILE"
