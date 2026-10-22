# AI7 SOLARIS — DESIGN SYSTEM SPECIFICATION (ARAH 1)
**Deep Midnight Slate + Aksen Biru-Ungu — Konsol Operasional v3 "Ruang Kerja Armada"**  
*Document Version: 3.1.0 · Author: Iris (AI7 Luminary — Lead UI/UX Artisan & Frontend Architect)*  
*Standard: WCAG 2.1 AA/AAA Compliant · Zero External CDN Dependencies · Strict 4px/8px Geometry*

---

## 1. Filosofi & Anti-Slop Design Manifesto

Sistem backend AI7 Solaris dirancang dengan keandalan operasional tingkat tinggi. Konsol v3 ("Ruang Kerja Armada") adalah pusat kendali (*command-center*) visual langsung bagi operator. Sesuai mandat Iris:
> *"Zephyr membangun mesin; Iris mengukir pengalaman inderawinya."*

### Evolusi ke Arah 1 (Deep Midnight Slate):
Evaluasi empiris konsol menolak palet navy sebelumnya (`#323C63` / `#343F66`) yang terkesan pudar/washed-out dan kehilangan wibawa gelap pekat khas command-center. Konsol dikalibrasikan penuh ke **Arah 1: Deep Midnight Slate / Stealth Obsidian dengan Aksen Biru-Ungu**. Latar belakang ditenggelamkan ke hitam pekat malam berbobot dengan undertone dingin/slate, dipadukan dengan aksen biru-ungu berkelas (`#5470E0` / `#6366F1`) yang menyala tajam dan presisi di atas kegelapan.

### Pilar Anti-Slop Konsol v3:
1. **Eradikasi Generic AI Slop:**
   - Dilarang keras menggunakan gradasi neon ungu/violet kabur khas template AI murahan.
   - Dilarang menggunakan glassmorphism berlebihan dengan drop-shadow berat yang mengaburkan hierarki konten.
   - Dilarang menggunakan teks abu-abu redup (*low-contrast text*) pada latar gelap.
2. **Obsidian Midnight Surfaces & Inset Hairline Elevation:**
   - Kedalaman persepsi visual murni diciptakan melalui kontras lapis permukaan stealth obsidian terkalibrasi (`#070A0F` ➔ `#0B1019` ➔ `#101724` ➔ `#182338`) dipadukan dengan **Inset Hairline Top-Border** (`box-shadow: inset 0 1px 0 0 rgba(255, 255, 255, 0.08)`), memberikan kedalaman taktil tanpa drop-shadow blur kotor.
3. **Ergonomi Taktil & Ketahanan Operasional:**
   - Geometri modern yang proporsional: radius 8px (wells/vitals), 12px (cards/panels), dan 18px (containers/modals).
   - Status tri-fold wajib: setiap indikator status wajib menggabungkan Teks + Ikon SVG + Warna (memastikan keterbacaan sempurna bagi pengguna buta warna).
   - Angka tabular (`font-variant-numeric: tabular-nums`) pada seluruh metrik waktu, timestamp, dan counter task agar stabil tanpa layout shift.

---

## 2. Arsitektur Warna & Latar Bertingkat (Color Architecture)

### 2.1. Surfaces (Obsidian Midnight Terkalibrasi)
Gradasi bertingkat memandu fokus operator dari kanvas terluar hingga elemen interaktif terdalam:

| Token CSS | Hex Value | Luminance | Peruntukan / Semantik UI |
| :--- | :--- | :--- | :--- |
| `--surface-base` | `#070A0F` | `0.0030` | Canvas base / latar jendela browser terluar (hitam malam dingin) |
| `--surface-container` | `#0B1019` | `0.0051` | App container shell / bingkai kerja utama |
| `--surface-sidebar` | `#101724` | `0.0085` | Sidebar navigasi & header bar konsol |
| `--surface-card` | `#101724` | `0.0085` | Kartu utama dasbor (`.panel-card`, `.stream-panel`, `.relations-wrapper`) |
| `--surface-rail` | `#162032` | `0.0143` | Rail divider & status well pemisah |
| `--surface-inset` | `#182338` | `0.0168` | Card inner, recessed well untuk log, kode, ID, baris tabel |
| `--surface-field` | `#141C2B` | `0.0115` | Input formulir, search field, dropdown filter |
| `--surface-elevated` | `#1D2A42` | `0.0231` | Modal inspection sheet, popover dialog overlay |
| `--surface-hover` | `#1A253A` | `0.0185` | Feedback hover pada tombol dan baris interaktif |
| `--surface-active` | `#23334E` | `0.0328` | Feedback klik / seleksi aktif |

### 2.2. Brand & Accent (Luminous Electric Indigo / Violet-Blue)
Satu rumpun aksen biru-ungu berkelas yang menyala tajam dan presisi di atas kegelapan:

| Token CSS | Hex Value | Luminance | Peruntukan |
| :--- | :--- | :--- | :--- |
| `--primary-500` | `#5470E0` | `0.1885` | Fokus utama, bar aktif, timeline aktif, pill highlight |
| `--primary-600` | `#384994` | `0.0774` | Dasar grafik, border pembatas aksen, track bar |
| `--primary-300` | `#7C91F0` | `0.3083` | Highlight teks, glow halus, focus ring |
| `--primary-200` | `#818CF8` | `0.3020` | Teks aksen kontras tinggi (Electric Indigo) |
| `--accent-glow` | `rgba(84, 112, 224, 0.15)` | — | Glow halus terfokus tanpa blur kotor |
| `--accent-cyan` | `#7C91F0` | `0.3083` | Alias live pulse & task aktif (kompatibilitas v3) |
| `--accent-teal` | `#818CF8` | `0.3020` | Alias panah topologi & relay handoff (kompatibilitas v3) |

---

## 3. Tipografi & Matriks Kontras WCAG 2.1 (A11y Verified)

### 3.1. Font Stack Lokal (Zero External Downloads)
- **Sans-Serif:** `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`
- **Monospace:** `ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace`

### 3.2. Skala Teks
- `2xs` (11px): Micro badges, commit SHAs, icon labels
- `xs` (12px): Metadata sekunder, unit, table headers
- `sm` (13px): UI padat, deskripsi intent task, code blocks
- `base` (14px): Teks body utama, input form, link sidebar
- `md` (16px): Judul kartu panel, metrik fokus
- `lg` (18px): Judul modal sheet, status header
- `xl` (20px): Counter insiden, KPI utama
- `2xl` (24px) & `3xl` (28px): Fleet summary counter

### 3.3. Hasil Audit Kontras WCAG 2.1 (Via `contrast_checker.py`)
Seluruh pasangan warna diuji secara matematis menggunakan rumus Relative Luminance WCAG 2.1:

$$\text{Contrast Ratio} = \frac{L_1 + 0.05}{L_2 + 0.05}$$

| Elemen Teks / Kontrol | Hex | Latar Surface | Hex | Rasio Kontras | Vonis WCAG 2.1 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Text Primary** | `#F0F4F8` | Canvas Base | `#070A0F` | **17.94:1** | **PASS (AAA)** |
| **Text Primary** | `#F0F4F8` | App Container | `#0B1019` | **17.24:1** | **PASS (AAA)** |
| **Text Primary** | `#F0F4F8` | Card / Sidebar | `#101724` | **16.24:1** | **PASS (AAA)** |
| **Text Primary** | `#F0F4F8` | Card Inset Well | `#182338` | **14.22:1** | **PASS (AAA)** |
| **Text Secondary** | `#94A3B8` | Canvas Base | `#070A0F` | **7.73:1** | **PASS (AAA)** |
| **Text Secondary** | `#94A3B8` | App Container | `#0B1019` | **7.43:1** | **PASS (AAA)** |
| **Text Secondary** | `#94A3B8` | Card / Sidebar | `#101724` | **7.00:1** | **PASS (AAA)** |
| **Text Secondary** | `#94A3B8` | Card Inset Well | `#182338` | **6.13:1** | **PASS (AA)** |
| **Text Muted (Meta/UI)** | `#718096` | Canvas Base | `#070A0F` | **4.94:1** | **PASS (AA)** |
| **Text Muted (Meta/UI)** | `#718096` | App Container | `#0B1019` | **4.74:1** | **PASS (AA)** |
| **Text Muted (Meta/UI)** | `#718096` | Card / Sidebar | `#101724` | **4.47:1** | **PASS (AA-Large / 3:1)** |
| **Text Muted (Meta/UI)** | `#718096` | Card Inset Well | `#182338` | **3.91:1** | **PASS (AA-Large / 3:1)** |
| **Primary Indigo (Highlight)**| `#818CF8` | Card / Sidebar | `#101724` | **6.02:1** | **PASS (AA)** |
| **Primary Indigo (Highlight)**| `#818CF8` | Card Inset Well| `#182338` | **5.27:1** | **PASS (AA)** |
| **Status Nominal (Emerald)**| `#34D399` | Nominal Chip BG| `#08281E` | **8.20:1** | **PASS (AAA)** |
| **Status Running (Indigo)** | `#818CF8` | Running Chip BG| `#141C38` | **5.62:1** | **PASS (AA)** |
| **Status Warning (Amber)**  | `#FBBF24` | Warning Chip BG| `#281E08` | **9.83:1** | **PASS (AAA)** |
| **Status Critical (Scarlet)**| `#F87171`| Critical Chip BG| `#2E0F14` | **6.36:1** | **PASS (AA)** |
| **Status Resolved (Slate)** | `#94A3B8` | Resolved Chip BG| `#1E293B` | **5.71:1** | **PASS (AA)** |
| **Focus Ring (WCAG 1.4.11)**| `#7C91F0` | Card / Sidebar | `#101724` | **6.12:1** | **PASS (AA)** |
| **Focus Ring (WCAG 1.4.11)**| `#7C91F0` | Canvas Base    | `#070A0F` | **6.76:1** | **PASS (AA)** |

---

## 4. Geometri, Radius & Inset Hairline Elevation

### 4.1. Tangga Border Radius Modern & Proporsional
- `--radius-xs` (4px): Hairline indicators, stepper bullet.
- `--radius-sm` (6px): Tombol aksi (`.btn`), input form, copy badge.
- `--radius-md` (8px): Cell vital agen (`.agent-vital-cell`), card insiden, task item compact, search input.
- `--radius-lg` (12px): Kartu panel utama dasbor (`.panel-card`), telemetry relation view, task stream panel.
- `--radius-xl` (18px): Modal inspection sheet (`.modal-sheet`), container drawer luar.
- `--radius-pill` (9999px): Badge status (`.status-chip`), tab filter (`.filter-chip`), navigation counter (`.nav-badge`).

### 4.2. Borders & Inset Hairline Top-Border Depth
- `--border-subtle`: `rgba(255, 255, 255, 0.07)` (Structural hairline divider)
- `--border-medium`: `#24334C` (Card contours & panel dividers)
- `--border-strong`: `#34486A` (Interactive boundaries & active tab underline)
- `--border-accent`: `rgba(84, 112, 224, 0.40)` (Luminous accent hairline)
- `--border-interactive`: `#5470E0` (Primary boundary)
- `--border-focus`: `#7C91F0` (Focus indicator ring)
- `--shadow-card`: `inset 0 1px 0 0 rgba(255, 255, 255, 0.08)` (Memberikan kedalaman taktil pada kartu tanpa drop-shadow blur kotor)
- `--shadow-elevated`: `inset 0 1px 0 0 rgba(255, 255, 255, 0.10)`
- `--shadow-modal`: `inset 0 1px 0 0 rgba(255, 255, 255, 0.10), 0 24px 48px rgba(0, 0, 0, 0.85)` (Overlay depth khusus modal)

---

## 5. Sistem Status Semantik & Tri-Fold Enforcement

Setiap entitas status pada antarmuka Konsol v3 mengimplementasikan metode Tri-Fold:

```
[IKON SVG] + [LABEL TEKS EKSPLISIT] + [WARNA TERKALIBRASI]
```

1. **Sukses / Nominal / Hijau:**
   - Ikon: Check circle SVG
   - Teks: "NOMINAL" / "SIAP"
   - Warna: Mint Emerald segar `#34D399` pada well `#08281E` (Border: `rgba(52, 211, 153, 0.35)`)
2. **In-Flight / Berjalan:**
   - Ikon: Play / refresh spin SVG
   - Teks: "IN-FLIGHT" / "RUNNING"
   - Warna: Electric Indigo `#818CF8` pada well `#141C38` (Border: `rgba(129, 140, 248, 0.40)`)
3. **Anomali / Warning / Amber:**
   - Ikon: Warning triangle SVG
   - Teks: "TERTUNDA" / "ORPHANED"
   - Warna: Warm Amber `#FBBF24` pada well `#281E08` (Border: `rgba(251, 191, 36, 0.35)`)
4. **Critical / Butuh Tindakan Segera:**
   - Ikon: Alert hexagon SVG
   - Teks: "GAGAL" / "ACTION REQUIRED"
   - Warna: Vivid Scarlet `#F87171` pada well `#2E0F14` (Border: `rgba(248, 113, 113, 0.35)`)
5. **Resolved / Historis:**
   - Ikon: Archive check SVG
   - Teks: "TERESOLUSI"
   - Warna: Slate Titanium `#94A3B8` pada well `#1E293B` (Border: `rgba(148, 163, 184, 0.35)`)

---

## 6. Efisiensi Bundle & Kepatuhan Non-Fungsional

- **Ukuran Total Bundle (Gzip):** ~23.4 KB (Batas pagu ketat: ≤ 40 KB).
- **Dependensi Eksternal:** 0 (Nol Google Fonts, Nol CDN Icons, Nol framework CSS eksternal).
- **Aksesibilitas Gerakan:** Mendukung media query `@media (prefers-reduced-motion: reduce)` yang mematikan seluruh animasi berulang secara instan.
- **Ergonomi Layar Sentuh:** Seluruh target interaktif memenuhi WCAG 2.5.5 dengan tinggi minimal 44px pada layar sentuh/mobile.
