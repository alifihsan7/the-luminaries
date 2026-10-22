# THE LUMINARIES

An operational mission-control console and asynchronous orchestration suite monitoring the **10 Luminaries** of the AI7 Solaris ecosystem.

---

## Fleet Roster (10 Luminaries)

| Luminary | Role | Kind | Core Responsibility |
| :--- | :--- | :--- | :--- |
| **Nexus** | Orchestrator | Primary Star | Single gateway entry point (`@your_solaris_bot`), delegation, intent routing |
| **Sage** | Research Strategist | Planet | First-principles analysis, arXiv recon, deep planning |
| **Athena** | Scholar & Synthesizer | Planet | Citation validation, literature rigor, scholarly synthesis |
| **Chronos** | Chief of Staff | Planet | Daily briefing compilation, temporal tracking, schedule coordination |
| **Zephyr** | Backend Architect | Planet | Core engine development, backend APIs, data models |
| **Daemon** | Systems Engineer | Planet | Infrastructure, systemd service supervision, runbook execution |
| **Iris** | UI/UX Artisan | Planet | Anti-slop frontend interfaces, sensory craftsmanship, design tokens |
| **Aegis** | Security & QA | Planet | Code auditing, security gates, immutable release verification |
| **Nacht** | Recon Scout | Planet | Open-source intelligence, deep web recon, external threat monitoring |
| **Ariadne** | Knowledge Architect | Planet | Taxonomy synthesis, long-term memory graph, knowledge vault |

---

## Architecture & Core Mechanics

The system decouples agent decision-making from infrastructure execution through four core subsystems:

1. **Asynchronous Dispatcher (`dispatcher/dispatcher.py`)**  
   Non-blocking task queue powered by an append-only ledger (`dispatcher/tasks.jsonl`). Utilizes kernel-level `flock` file locking to guarantee transactional state transitions (`QUEUED` → `RUNNING` → `SUCCEEDED` / `FAILED` / `TIMEOUT`) and task lifecycle watchdog enforcement.

2. **Handoff Artifact Protocol (`handoff/<agent>/`)**  
   Deterministic input/output communication layer. Inbound specifications arrive in `handoff/<agent>/in/`, while execution responses are captured verbatim into `handoff/<agent>/out/` and cryptographically hashed in `dispatcher/tasks.jsonl`. Agents never mutate external state directly.

3. **Routing Gate & Security Audits (`ops/audit_gate.sh`, `ops/deploy.sh`)**  
   Immutable release gate. Commit-level security auditing with signed JSON verdicts (`verdicts/<commit>.json`). Releases deploy atomically via symlink pointers with automated rollback triggers upon health check failure.

4. **Console v3 ("Ruang Kerja Armada") (`static/v3/`)**  
   Tactile, high-density operations dashboard built on the Solaris Anti-Slop Design Doctrine:
   - High-contrast accessible palette (WCAG AA/AAA compliant).
   - Zero generic AI purple/neon gradient slop; functional obsidian slate with disciplined amber and indigo accents.
   - Real-time agent status inspection, stuck task watchdog metrics, and tabular telemetry displays (`tabular-nums`).

---

## Quick Start

### Prerequisites
- Python 3.11+
- Virtual environment (`venv`)
- Modern web browser (Chrome, Firefox, Safari, Edge)

### 1. Installation
Clone the repository and install dependencies:
```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### 2. Configuration
Copy the configuration template and customize environment variables:
```bash
cp .env.example .env
```
Key variables in `.env` include file paths for task queues, timeout thresholds, and optional gateway endpoints.

### 3. Run the Dashboard
Start the FastAPI mission-control server:
```bash
uvicorn app:app --host 127.0.0.1 --port 8082
```
Access the console at `http://127.0.0.1:8082` (or `http://127.0.0.1:8082/v3/`).

### 4. Run the Asynchronous Dispatcher
In a dedicated terminal or systemd service, start the task worker loop:
```bash
python3 dispatcher/dispatcher.py --poll-interval 2.0
```

### 5. Run the Test Suite
Execute the full pytest suite to verify dispatcher queue concurrency, API endpoints, and system guarantees:
```bash
pytest -v
```

---

## Design Doctrine & Quality Compliance

The user interface adheres strictly to the **Anti-Slop Design Manifesto**:
- **Contrast Ratios:** Verified against WCAG 2.1 Level AA/AAA standards (`static/v3/_tools/contrast_checker.py`).
- **Tactile Feedback:** Strict 4px/8px rhythm, deliberate focus-visible outlines, zero cumulative layout shifts (CLS).
- **Industrial Utility:** Tabular figures for data tables, semantic color tokens, and instant optimistic state updates.

---

## License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.
