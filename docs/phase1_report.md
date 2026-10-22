# AI7 Solaris — Laporan Eksekusi Fase 1

**Tanggal:** 2026-10-20  
**Pelaksana:** AI7 Nexus (Orchestrator)  
**Tujuan:** Menghentikan pemanggilan `hermes` mentah oleh LLM, menutup kelemahan F2 (blocking wait), F3 (argument injection), dan F7 (log tugas palsu).

---

## 1. Komponen yang Dibangun & Terverifikasi

1. **Registry Agen (`dispatcher/agents.yaml`):**
   - Mendefinisikan profil, alokasi toolsets, timeout runtime, dan batas tugas harian untuk 10 Luminaries.
2. **Core Dispatcher Deterministik (`dispatcher/dispatcher.py`):**
   - Menggunakan `subprocess.Popen` non-shell dengan isolasi argumen daftar (mencegah command/argument injection).
   - Sanitasi variabel lingkungan (`PATH`, `HOME`, `USER`, `TZ=Asia/Jakarta`).
   - Concurrency lock per profil berbasis `fcntl.flock` (mencegah tabrakan eksekusi ganda pada profil yang sama).
   - Deteksi idempotency berbasis hash SHA-256 (`task_type`, `to`, `commit`, `intent`).
   - Batas harian task per profil (`max_runs_per_day`).
   - Batas ukuran berkas handoff maksimal 16 KB (menolak flooding konteks).
   - Output agen ditandai dengan header `# UNTRUSTED_AGENT_OUTPUT` di `handoff/<profile>/<task_id>.out.md`.
3. **Audit Log Append-Only (`dispatcher/tasks.jsonl`):**
   - Mematuhi skema Lampiran A (`v: "3.1"`, `ts` format ISO 8601 WIB UTC+7, status `QUEUED` -> `RUNNING` -> `SUCCEEDED`/`FAILED`/`TIMEOUT`/`CANCELLED`/`REJECTED`).
   - Thread-safe dengan Python mutex.
4. **Unit Test Suite (`tests/test_dispatcher.py`):**
   - 5 pengujian otomatis lolos (profil tak terdaftar, berkas tidak ditemukan, batas 16KB, hash idempotency, isolasi flock).
5. **Uji Integrasi End-to-End dengan Zephyr:**
   - Task `TSK-20261020-224517-59b8` berhasil di-dispatch ke Luminaries Zephyr (`12345 + 54321`).
   - Transisi status: `QUEUED` -> `RUNNING` -> `SUCCEEDED` dalam 12 detik.
   - Hasil terekam bersih di `handoff/zephyr/TSK-20261020-224517-59b8.out.md` bernilai `66666`.

---

## 2. Status Kelemahan (Vulnerabilities Closed)

- **F2 (Nexus blocking wait):** TERTUTUP. Dispatcher mengembalikan `task_id` seketika secara non-blocking; agen pemanggil tidak terblokir menunggu subproses selesai.
- **F3 (Argument injection):** TERTUTUP. Argumen dikirim sebagai list terpisah ke `Popen`, bukan string shell. Task teks dibaca dari berkas disk handoff (maks 16KB).
- **F7 (Log tugas palsu):** TERTUTUP. Agen LLM tidak bisa memanipulasi log tugas; hanya dispatcher lokal yang menulis `tasks.jsonl`.
