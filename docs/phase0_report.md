# AI7 Solaris — Laporan Audit Asumsi Fase 0 (Read-Only)

**Tanggal:** 2026-10-20  
**Pemeriksa:** AI7 Nexus (Orchestrator)  
**Metode:** Inspeksi statis kode sumber Hermes Agent v0.9.0 (`~/.hermes/hermes-agent`), konfigurasi Linux systemd/pm2, SQLite 9router, izin berkas (read-only mode), dan repo ekosistem (`ai7-solaris`, `ai7-finance`, `ai7-warden`, `SecondBrainAI7`).

---

## 1. Tabel Evaluasi Asumsi A1–A12 (Ground Truth vs Spec v3.1)

| ID | Asumsi Spec v3.1 Claude | Status | Bukti Perintah & Temuan Lapangan |
|---|---|---|---|
| **A1** | Hermes mendukung pembatasan toolset per invocasi lewat `--toolsets` | ✔ **TERBUKTI** | `hermes chat -t/--toolsets <list>` didukung natively di CLI (`hermes_cli/_parser.py:173,250`) dan `run_oneshot(..., toolsets=...)`. Konfigurasi permanen per platform juga didukung via `hermes tools enable/disable --platform <name>`. |
| **A2** | Hermes mendukung allowlist perintah terminal per profil | ✔ **TERBUKTI** | Fitur `command_allowlist` ada di `tools/approval.py` dan `approval_floors.py`. Allowlist mendukung string eksak atau shell glob (`fnmatchcase`). Karakter ekspansi shell (`;&|<>`$()`) otomatis mendiskualifikasi allowlist. |
| **A3** | `hermes mcp add` berfungsi dan tersimpan di `config.yaml` | ✔ **TERBUKTI** | CLI `hermes mcp add --help` tersedia, mengarahkan konfigurasi ke `config.yaml` (`mcp_servers` section) dengan probing schema berkala. |
| **A4** | Hermes membaca `HERMES_HOME` dari env var untuk isolasi profil | ✔ **TERBUKTI** | Terbukti di `tools/approval.py:336` (`get_hermes_home_override()`). Hermes juga native mendukung multi-profil via flag `-p <profile>` (`~/.hermes/profiles/<profile>`). Semua 10 Luminaries telah terdaftar di `hermes profile list`. |
| **A5** | Profil tanpa toolset tertentu menolak pemanggilan tool | ✔ **TERBUKTI** | Terbukti di `toolsets.py` dan `cron/scheduler.py`. Tool yang tidak ada di allowlist `enabled_toolsets` tidak dimasukkan ke dalam schema tools model (`agent.tools`), sehingga model tidak memiliki definisi tool untuk dipanggil. |
| **A6** | User `solaris` punya `sudo` tanpa password | ✘ **SALAH** | `sudo -n -l` mengembalikan `a password is required`. User `solaris` memiliki hak sudo, namun **wajib password**. Aturan keras Spec 0.1 bahwa agent tidak menjalankan sudo terpenuhi secara alami. |
| **A7** | Berkas rahasia tersimpan dengan izin aman (`chmod 600`) | ✘ **SALAH / PERLU PERBAIKAN** | `stat -c '%U %a %n' ~/.hermes/.env` = `solaris 664 ~/.hermes/.env`. Belum 600 (masih readable oleh grup). Perlu diamankan menjadi `600`. |
| **A8** | `ai7-solaris.service` berjalan sebagai user service | ✔ **TERBUKTI** | `systemctl --user list-units --type=service` membuktikan `ai7-solaris.service` aktif (`running`) di port 8082 di bawah konteks user `solaris`. `loginctl show-user solaris -p Linger` bernilai `Linger=yes`. |
| **A9** | Default systemd `StartLimitBurst` mencegah deteksi crash | ✔ **TERBUKTI** | `systemctl show -p DefaultStartLimitBurst -p DefaultStartLimitIntervalUSec` menghasilkan `Interval=10s, Burst=5`. Jika service crash dengan `RestartSec=5`, counter ter-reset tiap 10s dan loop restart tidak pernah menyentuh burst. Rekomendasi `StartLimitIntervalSec=120`, `StartLimitBurst=3` valid. |
| **A10**| Jam sistem WIB / UTC+7 sinkron | ✔ **TERBUKTI** | `timedatectl` menunjukkan: `Time zone: Asia/Jakarta (WIB, +0700)`, `Local time: 22:22:58 WIB`, `NTP service: active`. |
| **A11**| Script alert Telegram yang sudah ada bisa dipakai ulang | ✔ **TERBUKTI** | Script alert Telegram operasional ada di `ai7-finance/scripts/finance_sub_alert.py` dan `ai7-finance/scripts/finance_pacing_digest.py` menggunakan endpoint resmi Telegram bot API. |
| **A12**| `tasks.jsonl` dan `deploy.sh` belum ada di working tree | ✘ **SALAH ASUMSI AUDIT** | `tasks.jsonl` dan `deploy.sh` **sama sekali belum pernah dibuat/ada** di `/srv/solaris/`. Asumsi audit Claude bahwa "tasks.jsonl dipalsukan" berasal dari spekulasi draf matriks v3.0, bukan kondisi file riil di disk. |

---

## 2. Temuan Tak Terduga (Unexpected Findings)

1. **`sudo` memerlukan password:** Agent tidak bisa menjalankan eskalasi root secara sembunyi-sembunyi bahkan jika ada prompt injection, karena kernel/PAM menolak sudo tanpa password interaktif.
2. **Ketiadaan `tasks.jsonl` & `deploy.sh`:** Kekhawatiran F4 ("gate dipalsukan karena deploy.sh bisa diedit") adalah *phantom issue* (isu bayangan); filenya belum ada di repo.
3. **9router Terisolasi di PM2 & SQLite:** 9router berjalan via pm2 di port 20128 (`nine-router-service`). Combos disimpan dalam database SQLite `~/.9router/db/data.sqlite`. Port terbuka 20128 merespons cepat, namun pengecekan kesehatan memang perlu probe token riil bukan sekadar cek port TCP.

---

## 3. Usulan Penyesuaian Spec v3.1 (Pemangkasan Over-Engineering)

1. **Batalkan Pembuatan User Linux Terpisah (Drop Phase 2 Linux Multi-user):**  
   Hermes sudah memiliki isolasi native per profil (`~/.hermes/profiles/<name>/config.yaml`) dan flag per-invocasi (`-t/--toolsets`). Membuat user Linux terpisah (`ai7-zephyr`, `ai7-aegis`, dll) memicu overhead izin file, venv, dan database tanpa menambah nilai signifikan pada VPS single-user.
2. **Implementasikan Dispatcher Asinkron Ringan (`ai7-dispatch`):**  
   F2 & F3 sangat krusial. Nexus tidak boleh menjalankan `hermes chat -q` secara sinkron lewat tool `terminal`. Dispatcher Python mandiri dengan queue dan lock flock di `/srv/solaris/dispatcher/` menyelesaikan masalah hang bot Telegram dan injeksi parameter.
3. **Koreksi Toolset Profil (Phase 5 Prioritas):**  
   Beri `write_file` untuk Chronos dan Nacht (dibatasi direktori kerja masing-masing) agar deliverable briefing dan intel bisa diproduksi.
