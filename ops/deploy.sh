#!/usr/bin/env bash
# AI7 Solaris — Immutable Release & Deployment Engine (SRE Hardened)
# Arsitektur: Rilis Imutabel, Jalur Staging Eksplisit, Symlink Atomik, Auto-Rollback.

set -euo pipefail

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
REPO_DIR="$( dirname "$SCRIPT_DIR" )"
RELEASES_DIR="$REPO_DIR/releases"
CURRENT_SYMLINK="$REPO_DIR/current"
VERDICTS_DIR="$REPO_DIR/verdicts"
PORT=8082

# Jamin konektivitas bus systemd user di semua lingkungan subshell/agent
export XDG_RUNTIME_DIR="${XDG_RUNTIME_DIR:-/run/user/$(id -u)}"
if [ -z "${DBUS_SESSION_BUS_ADDRESS:-}" ] && [ -S "$XDG_RUNTIME_DIR/bus" ]; then
  export DBUS_SESSION_BUS_ADDRESS="unix:path=$XDG_RUNTIME_DIR/bus"
fi

mkdir -p "$RELEASES_DIR" "$VERDICTS_DIR"

MODE="commit"
OVERRIDE=0
ROLLBACK_TARGET=""

while [ $# -gt 0 ]; do
  case "$1" in
    --staging|staging)
      MODE="staging"
      shift
      ;;
    --override)
      OVERRIDE=1
      shift
      ;;
    --rollback|rollback)
      MODE="rollback"
      shift
      if [ $# -gt 0 ] && [[ "$1" != --* ]]; then
        ROLLBACK_TARGET="$1"
        shift
      fi
      ;;
    --help|-h)
      cat <<'EOF'
Penggunaan:
  ops/deploy.sh [OPSI]

Opsi:
  --staging, staging        Deploy salinan utuh working tree ke rilis staging imutabel baru (releases/staging-YYYYMMDD-HHMMSS)
  --override                Abaikan verifikasi verdict Aegis untuk deploy produksi (hanya darurat)
  --rollback [TARGET]       Rollback symlink current ke rilis sebelumnya (atau target direktori rilis tertentu)
  --help, -h                Tampilkan panduan ini

Prinsip Operasional (SRE AI7 Solaris):
  1. Imutabilitas: Direktori releases/<id> tidak pernah ditimpa atau diedit di tempat setelah aktif.
  2. Atomisitas: Pengalihan versi dilakukan satu langkah via ln -sfn.
  3. Kejujuran: releases/<commit> murni dari git commit bersih; staging ditandai staging-<timestamp>.
EOF
      exit 0
      ;;
    *)
      echo "[-] Parameter tidak dikenal: $1"
      echo "    Jalankan 'ops/deploy.sh --help' untuk bantuan."
      exit 1
      ;;
  esac
done

# ==============================================================================
# FUNGSI ROLLBACK
# ==============================================================================
if [ "$MODE" = "rollback" ]; then
  echo "=== Memulai Prosedur Rollback AI7 Solaris ==="
  CURRENT_ACTIVE=""
  if [ -L "$CURRENT_SYMLINK" ]; then
    CURRENT_ACTIVE=$(readlink -f "$CURRENT_SYMLINK" || true)
  fi

  if [ -n "$ROLLBACK_TARGET" ]; then
    if [ -d "$ROLLBACK_TARGET" ]; then
      TARGET_RELEASE=$(readlink -f "$ROLLBACK_TARGET")
    elif [ -d "$RELEASES_DIR/$ROLLBACK_TARGET" ]; then
      TARGET_RELEASE="$RELEASES_DIR/$ROLLBACK_TARGET"
    else
      echo "[-] Target rollback tidak valid atau direktori tidak ditemukan: $ROLLBACK_TARGET"
      exit 1
    fi
  else
    if [ -f "$RELEASES_DIR/.previous_release" ] && [ -d "$(cat "$RELEASES_DIR/.previous_release")" ]; then
      TARGET_RELEASE=$(cat "$RELEASES_DIR/.previous_release")
    else
      CANDIDATE=$(ls -1td "$RELEASES_DIR"/*/ 2>/dev/null | grep -v "${CURRENT_ACTIVE:-__NONE__}" | head -n 1 | sed 's:/*$::' || true)
      if [ -n "$CANDIDATE" ] && [ -d "$CANDIDATE" ]; then
        TARGET_RELEASE="$CANDIDATE"
      else
        echo "[-] Tidak ditemukan rilis alternatif di $RELEASES_DIR untuk rollback otomatis!"
        exit 1
      fi
    fi
  fi

  echo "[*] Rilis aktif saat ini : ${CURRENT_ACTIVE:-<none>}"
  echo "[*] Target rilis rollback: $TARGET_RELEASE"

  if [ "$CURRENT_ACTIVE" = "$TARGET_RELEASE" ]; then
    echo "[!] Target rollback sama dengan rilis yang sedang aktif. Tidak ada perubahan yang dilakukan."
    exit 0
  fi

  # Simpan rilis aktif saat ini ke riwayat sebelum beralih
  if [ -n "$CURRENT_ACTIVE" ]; then
    echo "$CURRENT_ACTIVE" > "$RELEASES_DIR/.previous_release"
  fi

  # 1. Alihkan symlink atomik
  echo "[*] Mengalihkan symlink current secara atomik..."
  ln -sfn "$TARGET_RELEASE" "$CURRENT_SYMLINK"

  # 2. Restart unit systemd
  echo "[*] Me-restart unit ai7-solaris.service..."
  systemctl --user restart ai7-solaris.service

  # 3. Health check
  echo "[*] Menjalankan health check ke port $PORT..."
  HEALTHY=0
  for i in {1..15}; do
    if curl -s -f "http://127.0.0.1:$PORT/health" > /dev/null 2>&1; then
      HEALTHY=1
      break
    fi
    sleep 1
  done

  if [ $HEALTHY -eq 1 ]; then
    echo "$TARGET_RELEASE" > "$RELEASES_DIR/.current_release"
    CODE_ROOT=$(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:$PORT/")
    CODE_V2=$(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:$PORT/v2/")
    echo "[+] Rollback BERHASIL! Solaris Dashboard aktif di: $TARGET_RELEASE (/health: 200, /: $CODE_ROOT, /v2/: $CODE_V2)"
    exit 0
  else
    echo "[-] Rollback GAGAL! Unit tidak sehat setelah pengalihan ke $TARGET_RELEASE"
    exit 1
  fi
fi

# ==============================================================================
# PERSIAPAN RILIS BARU (STAGING vs PRODUKSI)
# ==============================================================================
PREVIOUS_RELEASE=""
if [ -L "$CURRENT_SYMLINK" ]; then
  PREVIOUS_RELEASE=$(readlink -f "$CURRENT_SYMLINK" || true)
fi

if [ "$MODE" = "staging" ]; then
  echo "=== Memulai Deploy Release AI7 Solaris [JALUR: STAGING] ==="
  TIMESTAMP=$(date +%Y%m%d-%H%M%S)
  RELEASE_TAG="staging-$TIMESTAMP"
  TARGET_RELEASE="$RELEASES_DIR/$RELEASE_TAG"

  echo "[*] Target Rilis Staging: $TARGET_RELEASE"

  if [ -e "$TARGET_RELEASE" ]; then
    echo "[-] DITOLAK: Direktori rilis $TARGET_RELEASE sudah ada. Rilis imutabel tidak boleh ditimpa."
    exit 1
  fi

  echo "[1/4] Memeriksa sintaks Python working tree..."
  "$REPO_DIR/.venv/bin/python3" -m py_compile "$REPO_DIR/app.py"
  echo "[+] Sintaks Python terverifikasi valid."

  echo "[2/4] Membuat direktori dan menyalin working tree secara utuh..."
  mkdir -p "$TARGET_RELEASE"

  rsync -a \
    --exclude='.git' \
    --exclude='releases' \
    --exclude='current' \
    --exclude='.venv' \
    --exclude='dispatcher' \
    --exclude='handoff' \
    --exclude='__pycache__' \
    --exclude='*.pyc' \
    --exclude='.pytest_cache' \
    "$REPO_DIR/" "$TARGET_RELEASE/"

  # Sambungkan isolasi runtime & state
  ln -sfn "$REPO_DIR/.venv" "$TARGET_RELEASE/.venv"
  ln -sfn "$REPO_DIR/dispatcher" "$TARGET_RELEASE/dispatcher"
  ln -sfn "$REPO_DIR/handoff" "$TARGET_RELEASE/handoff"

  cat <<EOF > "$TARGET_RELEASE/.release_info"
RELEASE_TYPE=staging
RELEASE_TAG=$RELEASE_TAG
CREATED_AT=$(date -Iseconds)
BASE_COMMIT=$(git -C "$REPO_DIR" rev-parse HEAD 2>/dev/null || echo "unknown")
DEPLOYER=daemon
EOF

else
  echo "=== Memulai Deploy Release AI7 Solaris [JALUR: PRODUKSI] ==="

  # Pastikan working tree bersih untuk rilis produksi
  DIRTY_FILES=$(git -C "$REPO_DIR" status --porcelain)
  if [ -n "$DIRTY_FILES" ]; then
    echo "[-] DITOLAK: Working tree kotor! Terdapat berkas uncommitted / untracked:"
    echo "$DIRTY_FILES"
    echo ""
    echo "    Prinsip SRE Kejujuran Rilis:"
    echo "    Deploy produksi murni hanya diizinkan dari git commit bersih."
    echo "    Untuk menguji perubahan lokal, gunakan jalur staging:"
    echo "      ops/deploy.sh --staging"
    echo "    Atau minta AI7 Nexus untuk me-review dan commit perubahan terlebih dahulu."
    exit 1
  fi

  COMMIT=$(git -C "$REPO_DIR" rev-parse HEAD)
  TARGET_RELEASE="$RELEASES_DIR/$COMMIT"
  VERDICT_FILE="$VERDICTS_DIR/${COMMIT}.json"

  echo "[*] Target Commit: $COMMIT"

  if [ $OVERRIDE -eq 0 ]; then
    if [ ! -f "$VERDICT_FILE" ]; then
      echo "[-] DITOLAK: Commit $COMMIT belum memiliki berkas audit verdict di $VERDICT_FILE"
      echo "    Jalankan $REPO_DIR/ops/audit_gate.sh terlebih dahulu."
      exit 1
    fi

    STATUS=$(grep -Po '"status": *\K"[^"]*"' "$VERDICT_FILE" | tr -d '"')
    if [ "$STATUS" != "PASSED" ]; then
      echo "[-] DITOLAK: Status audit adalah '$STATUS', bukan 'PASSED'!"
      exit 1
    fi
    echo "[+] Verifikasi Verdict Aegis: PASSED"
  else
    echo "[!] OVERRIDE AKTIF: Menjalankan deploy manual tanpa blokir verdict."
  fi

  if [ -e "$TARGET_RELEASE" ]; then
    CURRENT_ACTIVE=""
    if [ -L "$CURRENT_SYMLINK" ]; then
      CURRENT_ACTIVE=$(readlink -f "$CURRENT_SYMLINK" || true)
    fi
    if [ "$CURRENT_ACTIVE" = "$TARGET_RELEASE" ]; then
      echo "[*] Rilis $COMMIT sudah aktif sebagai rilis saat ini. Tidak ada perubahan."
      exit 0
    else
      echo "[*] Rilis $COMMIT sudah ada di $TARGET_RELEASE. Beralih ke rilis terverifikasi..."
    fi
  else
    echo "[*] Mempersiapkan rilis imutabel baru di: $TARGET_RELEASE"
    mkdir -p "$TARGET_RELEASE"
    git -C "$REPO_DIR" archive "$COMMIT" | tar -x -C "$TARGET_RELEASE"
    ln -sfn "$REPO_DIR/.venv" "$TARGET_RELEASE/.venv"
    ln -sfn "$REPO_DIR/dispatcher" "$TARGET_RELEASE/dispatcher"
    ln -sfn "$REPO_DIR/handoff" "$TARGET_RELEASE/handoff"
    cat <<EOF > "$TARGET_RELEASE/.release_info"
RELEASE_TYPE=production
RELEASE_TAG=$COMMIT
CREATED_AT=$(date -Iseconds)
COMMIT=$COMMIT
DEPLOYER=daemon
EOF
  fi
fi

# ==============================================================================
# PENGALIHAN ATOMIK, RESTART & HEALTH CHECK
# ==============================================================================
echo "[3/4] Mengarahkan current symlink secara atomik ke $TARGET_RELEASE..."
ln -sfn "$TARGET_RELEASE" "$CURRENT_SYMLINK"

echo "[4/4] Me-restart unit ai7-solaris.service..."
systemctl --user restart ai7-solaris.service

echo "[*] Menjalankan health check ke port $PORT..."
HEALTHY=0
for i in {1..15}; do
  if curl -s -f "http://127.0.0.1:$PORT/health" > /dev/null 2>&1; then
    HEALTHY=1
    break
  fi
  sleep 1
done

if [ $HEALTHY -eq 1 ]; then
  CODE_ROOT=$(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:$PORT/")
  CODE_V2=$(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:$PORT/v2/")
  echo "[+] Health check PASSED: /health (200 OK), / ($CODE_ROOT), /v2/ ($CODE_V2)"

  if [ -n "$PREVIOUS_RELEASE" ] && [ "$PREVIOUS_RELEASE" != "$TARGET_RELEASE" ]; then
    echo "$PREVIOUS_RELEASE" > "$RELEASES_DIR/.previous_release"
  fi
  echo "$TARGET_RELEASE" > "$RELEASES_DIR/.current_release"

  echo "[+] Deployment SUCCEEDED! Solaris Dashboard aktif dan sehat di: $TARGET_RELEASE"
  exit 0
else
  echo "[-] Health check GAGAL! Memulai otomatis ROLLBACK..."
  if [ -n "$PREVIOUS_RELEASE" ] && [ -d "$PREVIOUS_RELEASE" ]; then
    echo "[!] Memulihkan symlink ke: $PREVIOUS_RELEASE"
    ln -sfn "$PREVIOUS_RELEASE" "$CURRENT_SYMLINK"
    systemctl --user restart ai7-solaris.service
    echo "[!] Rollback ke rilis sebelumnya selesai: $PREVIOUS_RELEASE"
    for j in {1..10}; do
      if curl -s -f "http://127.0.0.1:$PORT/health" > /dev/null 2>&1; then
        echo "[+] Rilis rollback kembali sehat."
        break
      fi
      sleep 1
    done
  else
    echo "[-] Tidak ada rilis sebelumnya untuk rollback otomatis. Periksa status unit!"
  fi
  exit 1
fi
