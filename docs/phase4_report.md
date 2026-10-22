# AI7 Solaris — Laporan Eksekusi Fase 4

**Tanggal:** 2026-10-20  
**Pelaksana:** AI7 Nexus (Orchestrator)  
**Tujuan:** Menutup F5 (crash-loop tak terdeteksi dan tidak ada eskalasi insiden).

---

## 1. Komponen yang Dikonfigurasi & Terverifikasi

1. **Hardening Systemd Unit (`ai7-solaris.service`):**
   - Menambahkan `StartLimitIntervalSec=120` dan `StartLimitBurst=3`.
   - Mengubah kebijakan restart menjadi `Restart=on-failure`, `RestartSec=5`.
   - Mengikat pemicu insiden otomatis: `OnFailure=ai7-incident@%n.service`.
   - Menghubungkan direktori eksekusi secara resmi ke pointer rilis imutabel: `/srv/solaris/current`.
2. **Template Incident Handler Systemd (`ai7-incident@.service`):**
   - Mengarahkan penanganan kegagalan unit ke `/srv/solaris/ops/incident.sh %i`.
3. **Deterministic Incident Telemetry Script (`ops/incident.sh`):**
   - **Cooldown Barrier:** Menolak eksekusi spam dalam jendela 30 menit per unit (`COOLDOWN_SECONDS=1800`), mencegah loop alerting tak terbatas.
   - **Log Cleansing:** Menangkap 25 baris terakhir dari `journalctl`, membersihkan karakter kontrol non-teks, dan membatasi ukuran snapshot maksimal 2000 karakter.
   - **Multi-Source Credential Detection:** Membaca token Telegram secara aman dari konfigurasi terisolasi (`ai7-warden`, `ai7-finance`, atau environment).
   - **Non-LLM Out-of-Band Alert:** Mengirim notifikasi darurat Telegram langsung ke chat operator tanpa ketergantungan pada kelangsungan hidup model LLM.
   - **Audit Trail:** Mencatat seluruh insiden ke berkas append-only `ops/incidents.jsonl`.
4. **9router API Health Probe (`ops/probe_9router.py` & timer):**
   - Menguji respons nyata endpoint `/v1/models` pada port `20128` (bukan sekadar tes socket TCP).
   - Berjalan berkala tiap 10 menit via systemd user timer `ai7-probe-9router.timer` (sudah aktif dan terverifikasi).
   - Menyimpan telemetri latensi dan jumlah model ke `ops/llm_probe.state`.

---

## 2. Status Kelemahan (Vulnerabilities Closed)

- **F5 (Crash-loop tak terdeteksi):** TERTUTUP. Jika service gagal 3 kali dalam 120 detik, systemd memutus loop restart dan langsung memicu unit `ai7-incident@.service` untuk mengirimkan log snapshot ke Telegram.
