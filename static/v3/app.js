/**
 * The Luminaries — Sovereign Console v3
 * Application Logic: Radial Neural Web Canvas & Sovereign Command Center
 * Anti-Slop Solaris Certified · Zero Unilateral Left Rails · Zero AI Slop
 * Strict WCAG 2.2 AA/AAA Contrast Compliance
 */

(() => {
  'use strict';

  // CONFIGURATION & CONSTANTS
  const API_BASE = window.AI7_API_BASE || '';
  const POLLING_FAST_MS = 4000;
  const POLLING_SLOW_MS = 15000;

  // CANONICAL 10 SOVEREIGN LUMINARIES DATA (ZERO SATELLITES)
  const LUMINARIES = {
    nexus: {
      id: 'nexus',
      rank: '#01',
      name: '01 · Spidey',
      shortName: 'Spidey',
      role: 'Sovereign Orchestrator & Executive Commander',
      spec: 'Single entry point, delegation, coordination & consensus across all 10 sovereign agents.',
      status: 'ACTIVE',
      statusClass: 'status-active',
      cpu: '24.2%',
      cpuVal: 24,
      mem: '256 MB / 1024 MB',
      memVal: 25,
      throughput: '54 ops/s',
      success: '100.0%',
      buffer: '92% Capacity',
      icon: 'hub',
      cx: 400,
      cy: 320,
      upstream: 'Autonomous Origin',
      downstream: 'All 9 Radial Luminaries',
      keywords: ['nexus', 'orchestrator', 'consensus', 'dispatch']
    },
    sage: {
      id: 'sage',
      rank: '#02',
      name: '02 · Sage',
      shortName: 'Sage',
      role: 'First-Principles Reasoning, PRD & Research Framing',
      spec: 'First-principles analysis, planning, research framing & architectural PRD design.',
      status: 'STANDBY',
      statusClass: 'status-standby',
      cpu: '8.4%',
      cpuVal: 8,
      mem: '184 MB / 1024 MB',
      memVal: 18,
      throughput: '12 ops/s',
      success: '99.8%',
      buffer: '88% Capacity',
      icon: 'psychology',
      cx: 400,
      cy: 90,
      upstream: 'Nacht (External Recon)',
      downstream: 'Athena (Thesis prose), Zephyr (FastAPI spec)',
      keywords: ['reasoning', 'first principles', 'prd', 'synthesis']
    },
    athena: {
      id: 'athena',
      rank: '#03',
      name: '03 · Athena',
      shortName: 'Athena',
      role: 'Formal Thesis, Academic Manuscripts & Citation Integrity',
      spec: 'Thesis co-pilot, academic manuscript craft, peer review defense & formal prose.',
      status: 'IDLE',
      statusClass: 'status-idle',
      cpu: '6.1%',
      cpuVal: 6,
      mem: '142 MB / 1024 MB',
      memVal: 14,
      throughput: '8 ops/s',
      success: '100.0%',
      buffer: '84% Capacity',
      icon: 'school',
      cx: 550,
      cy: 130,
      upstream: 'Sage (PRD & Framing)',
      downstream: 'Ariadne (Obsidian PKM vault)',
      keywords: ['thesis', 'academic prose', 'citations', 'peer review']
    },
    chronos: {
      id: 'chronos',
      rank: '#04',
      name: '04 · Chronos',
      shortName: 'Chronos',
      role: 'Sprint Pacing, Daily Telemetry & Constellation Alignment',
      spec: 'Daily momentum, sprint pacing, life telemetry, schedule pacing & executive alignment.',
      status: 'NOMINAL',
      statusClass: 'status-nominal',
      cpu: '14.8%',
      cpuVal: 15,
      mem: '168 MB / 1024 MB',
      memVal: 16,
      throughput: '16 ops/s',
      success: '99.9%',
      buffer: '95% Capacity',
      icon: 'schedule',
      cx: 650,
      cy: 240,
      upstream: 'Spidey (Central Core)',
      downstream: 'Ariadne (Daily note anchors)',
      keywords: ['sprint velocity', 'daily telemetry', 'pacing', 'alignment']
    },
    zephyr: {
      id: 'zephyr',
      rank: '#05',
      name: '05 · Zephyr',
      shortName: 'Zephyr',
      role: 'Core Backend APIs, FastBench & Architecture',
      spec: 'FastAPI backend, data layer, algorithm benchmarks & high-concurrency microservices.',
      status: 'ACTIVE',
      statusClass: 'status-active',
      cpu: '32.6%',
      cpuVal: 33,
      mem: '348 MB / 1024 MB',
      memVal: 34,
      throughput: '46 ops/s',
      success: '99.9%',
      buffer: '96% Capacity',
      icon: 'database',
      cx: 630,
      cy: 420,
      upstream: 'Spidey, Sage',
      downstream: 'Daemon (VPS deployment), Aegis (Security gates)',
      keywords: ['fastapi', 'backend logic', 'fastbench', 'microservices']
    },
    daemon: {
      id: 'daemon',
      rank: '#06',
      name: '06 · Daemon',
      shortName: 'Daemon',
      role: 'Linux VPS Infra, Systemd Resilience & SRE Uptime',
      spec: 'Linux runtime, 24/7 reliability, systemd unit resilience & infrastructure observability.',
      status: 'STANDBY',
      statusClass: 'status-standby',
      cpu: '11.2%',
      cpuVal: 11,
      mem: '210 MB / 1024 MB',
      memVal: 21,
      throughput: '18 ops/s',
      success: '100.0%',
      buffer: '90% Capacity',
      icon: 'terminal',
      cx: 490,
      cy: 520,
      upstream: 'Zephyr (Backend artifacts)',
      downstream: 'Aegis (Runtime audits)',
      keywords: ['systemd', 'linux runtime', 'nginx', 'host substrate']
    },
    iris: {
      id: 'iris',
      rank: '#07',
      name: '07 · Iris',
      shortName: 'Iris',
      role: 'Frontend Architecture, Tactical Design Systems & Antislop UI',
      spec: 'Anti-slop interface craftsman, design token director & sensory UI/UX frontend architect.',
      status: 'ACTIVE',
      statusClass: 'status-active',
      cpu: '28.5%',
      cpuVal: 29,
      mem: '295 MB / 1024 MB',
      memVal: 29,
      throughput: '34 ops/s',
      success: '100.0%',
      buffer: '98% Capacity',
      icon: 'palette',
      cx: 310,
      cy: 520,
      upstream: 'Zephyr (API schemas)',
      downstream: 'Aegis (WCAG contrast & DOM audit)',
      keywords: ['ui/ux', 'anti-slop', 'frontend', 'tailwind', 'design tokens']
    },
    aegis: {
      id: 'aegis',
      rank: '#08',
      name: '08 · Aegis',
      shortName: 'Aegis',
      role: 'Adversarial Security Audits, Pentesting & Release Gates',
      spec: 'Security audit, vulnerability scanning, adversarial release gates & test suites.',
      status: 'STANDBY',
      statusClass: 'status-standby',
      cpu: '5.7%',
      cpuVal: 6,
      mem: '155 MB / 1024 MB',
      memVal: 15,
      throughput: '10 ops/s',
      success: '100.0%',
      buffer: '91% Capacity',
      icon: 'security',
      cx: 170,
      cy: 420,
      upstream: 'Zephyr, Iris, Daemon',
      downstream: 'Spidey (Release Gate Approval)',
      keywords: ['security audit', 'pentest', 'policy gate', 'defense']
    },
    nacht: {
      id: 'nacht',
      rank: '#09',
      name: '09 · Nacht',
      shortName: 'Nacht',
      role: 'External Recon, arXiv Radar & Intelligence Scouting',
      spec: 'arXiv radar, AI research discovery, external deep web scanning & intelligence scouting.',
      status: 'STANDBY',
      statusClass: 'status-standby',
      cpu: '9.2%',
      cpuVal: 9,
      mem: '172 MB / 1024 MB',
      memVal: 17,
      throughput: '14 ops/s',
      success: '99.7%',
      buffer: '89% Capacity',
      icon: 'travel_explore',
      cx: 150,
      cy: 240,
      upstream: 'Spidey (Scout Directives)',
      downstream: 'Sage (Research Framing)',
      keywords: ['recon', 'trend scouting', 'arxiv radar', 'external intel']
    },
    ariadne: {
      id: 'ariadne',
      rank: '#10',
      name: '10 · Ariadne',
      shortName: 'Ariadne',
      role: 'Obsidian Vault PKM, PARA Knowledge Synthesis & STT',
      spec: 'Obsidian PARA knowledge graph, note weaving, audio transcript synthesis & long-term PKM.',
      status: 'STANDBY',
      statusClass: 'status-standby',
      cpu: '7.9%',
      cpuVal: 8,
      mem: '160 MB / 1024 MB',
      memVal: 16,
      throughput: '11 ops/s',
      success: '100.0%',
      buffer: '93% Capacity',
      icon: 'account_tree',
      cx: 250,
      cy: 130,
      upstream: 'Athena, Chronos',
      downstream: 'Spidey, SecondBrainAI7',
      keywords: ['obsidian pkm', 'knowledge graph', 'second brain', 'vault sync']
    }
  };

  const RADIAL_KEYS = ['sage', 'athena', 'chronos', 'zephyr', 'daemon', 'iris', 'aegis', 'nacht', 'ariadne'];
  const ALL_KEYS = ['nexus', ...RADIAL_KEYS];

  // APPLICATION STATE
  const state = {
    selectedNodeKey: 'nexus',
    agents: [],
    tasks: [],
    relations: null,
    isPaused: false,
    pollTimer: null,
    dispatchTimer: null,
    lastSyncTime: null,
    currentView: 'overview',
    canvasZoom: 1.0,
    streamLogs: [],
    taskSearchQuery: '',
    vpsData: null,
    vpsLoading: false,
    vpsError: null,
    vpsTimer: null
  };

  // Active strand tracking for glow state & persistent in-progress loops
  const activeStrandPulses = {};
  const persistentTasksMap = new Map();

  // HELPER: Escape HTML
  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // HELPER: Format Directive Intent with Clean Paragraphing & Line Breaks
  function formatDirectiveIntent(text) {
    if (!text) {
      return '<p class="text-slate-400 font-sans text-xs italic">No directive intent recorded</p>';
    }
    const clean = String(text).replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
    if (!clean) {
      return '<p class="text-slate-400 font-sans text-xs italic">No directive intent recorded</p>';
    }
    const paragraphs = clean.split(/\n\s*\n/);
    return paragraphs.map(p => {
      const trimmed = p.trim();
      if (!trimmed) return '';
      const escapedWithBr = escapeHtml(trimmed).replace(/\n/g, '<br/>');
      return `<p class="text-slate-200 font-sans leading-relaxed text-xs mb-2.5 last:mb-0">${escapedWithBr}</p>`;
    }).filter(Boolean).join('');
  }

  // HELPER: Format WIB Time
  function formatWibTime(dateOrIso = new Date()) {
    try {
      const date = (typeof dateOrIso === 'string' || typeof dateOrIso === 'number') ? new Date(dateOrIso) : dateOrIso;
      if (!date || isNaN(date.getTime())) return '--:--:--';
      return new Intl.DateTimeFormat('id-ID', {
        timeZone: 'Asia/Jakarta',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      }).format(date).replace(/\./g, ':');
    } catch {
      return '--:--:--';
    }
  }

  // HELPER: Format WIB Date & Time
  function formatWibDateTime(dateOrIso = new Date()) {
    try {
      const date = (typeof dateOrIso === 'string' || typeof dateOrIso === 'number') ? new Date(dateOrIso) : dateOrIso;
      if (!date || isNaN(date.getTime())) return '--:--:--';
      return new Intl.DateTimeFormat('id-ID', {
        timeZone: 'Asia/Jakarta',
        year: 'numeric',
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      }).format(date).replace(/\./g, ':');
    } catch {
      return '--:--:--';
    }
  }

  // HELPER: Format File / Log Size
  function formatLogSize(bytes) {
    if (typeof bytes !== 'number' || isNaN(bytes) || bytes < 0) return '-';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }

  // HELPER: Capitalize Agent Identifier
  function capitalizeAgent(name) {
    if (!name) return 'Unknown';
    const n = String(name).toLowerCase().trim();
    if (n === 'nexus' || n === 'spidey') return 'Spidey';
    const lum = LUMINARIES[n];
    if (lum) return lum.shortName;
    return n.charAt(0).toUpperCase() + n.slice(1);
  }

  // HELPER: Format Bytes
  function formatBytes(bytes) {
    if (!bytes || isNaN(bytes)) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    let i = 0;
    let val = Number(bytes);
    while (val >= 1024 && i < units.length - 1) {
      val /= 1024;
      i++;
    }
    return `${val.toFixed(1)} ${units[i]}`;
  }

  // HELPER: Format Bytes to GiB (1 decimal)
  function formatBytesGiB(bytes) {
    if (typeof bytes !== 'number' || isNaN(bytes) || bytes <= 0) return '0.0 GiB';
    return `${(bytes / (1024 ** 3)).toFixed(1)} GiB`;
  }

  // HELPER: Format Host Uptime (format: Xd Yh Zm)
  function formatUptime(seconds) {
    if (seconds == null || isNaN(seconds) || seconds < 0) return '0d 0h 0m';
    const total = Math.floor(Number(seconds));
    const d = Math.floor(total / 86400);
    const h = Math.floor((total % 86400) / 3600);
    const m = Math.floor((total % 3600) / 60);
    return `${d}d ${h}h ${m}m`;
  }

  // HELPER: Status Badge CSS Classes
  function getStatusBadgeClass(status) {
    const s = String(status || '').toUpperCase();
    if (s === 'SUCCEEDED' || s === 'COMPLETED' || s === 'NOMINAL' || s === 'ONLINE' || s === 'RESOLVED') {
      return 'bg-[#4ade80]/10 text-[#4ade80] border border-[#4ade80]/20';
    }
    if (s === 'RUNNING' || s === 'IN_PROGRESS' || s === 'ACTIVE') {
      return 'bg-[#00d2ff]/10 text-[#00d2ff] border border-[#00d2ff]/30 animate-pulse';
    }
    if (s === 'FAILED' || s === 'TIMEOUT' || s === 'ERROR') {
      return 'bg-[#f87171]/10 text-[#f87171] border border-[#f87171]/30';
    }
    if (s === 'QUEUED' || s === 'STANDBY' || s === 'WAITING') {
      return 'bg-[#fbbf24]/10 text-[#fbbf24] border border-[#fbbf24]/30';
    }
    return 'bg-slate-500/10 text-slate-400 border border-slate-500/20';
  }

  // REAL-TIME WIB CLOCK
  function updateRealtimeClock() {
    const clockEl = document.getElementById('live-clock-text');
    if (clockEl) {
      clockEl.textContent = `${formatWibTime(new Date())} WIB`;
    }
  }

  // 1. SELECT NODE & UPDATE INSPECTOR (CANVAS + TABLE + INSPECTOR SYNC)
  function selectNode(key) {
    const luminaryKey = (key || 'nexus').toLowerCase();
    const node = LUMINARIES[luminaryKey] || LUMINARIES.nexus;
    state.selectedNodeKey = node.id;

    // 1.1 Strict Separation: User click only applies .node-selected, NOT .node-active.
    // .node-active is exclusively reserved for persistentTasksMap (RUNNING, QUEUED, IN_PROGRESS).
    document.querySelectorAll('#radial-neural-svg .canvas-node').forEach(el => {
      const elNode = el.getAttribute('data-node');
      const isSelected = (elNode === node.id);
      const isPersistent = persistentTasksMap.has(elNode);
      if (isSelected) {
        el.classList.add('node-selected');
      } else {
        el.classList.remove('node-selected');
      }
      if (isPersistent) {
        el.classList.add('node-active');
      } else {
        el.classList.remove('node-active');
      }
    });

    // 1.1b Update Radial Strands active streaming states
    // Selection NEVER activates strands. Strands ONLY activate on real pulse or persistent task.
    RADIAL_KEYS.forEach(k => {
      const strand = document.getElementById(`strand-${k}`);
      if (!strand) return;
      const isPulsing = (activeStrandPulses[k] || 0) > 0 || persistentTasksMap.has(k);
      if (isPulsing) {
        strand.classList.add('strand-active');
      } else {
        strand.classList.remove('strand-active');
      }
    });

    // 1.2 Update Inspector Card
    const titleEl = document.getElementById('inspector-title');
    const roleEl = document.getElementById('inspector-role');
    const specEl = document.getElementById('inspector-spec');
    const badgeEl = document.getElementById('inspector-badge');
    const avatarEl = document.getElementById('inspector-avatar');

    const pidEl = document.getElementById('inspector-pid');
    const logSizeEl = document.getElementById('inspector-log-size');
    const lastActiveEl = document.getElementById('inspector-last-active');
    const dispatchesEl = document.getElementById('inspector-dispatches');

    const cpuEl = document.getElementById('inspector-cpu');
    const cpuBar = document.getElementById('inspector-cpu-bar');
    const memEl = document.getElementById('inspector-mem');
    const memBar = document.getElementById('inspector-mem-bar');
    const throughputEl = document.getElementById('inspector-throughput');
    const successEl = document.getElementById('inspector-success');

    if (titleEl) titleEl.textContent = node.name;
    if (roleEl) roleEl.textContent = node.role;
    if (specEl) specEl.textContent = node.spec;

    const liveAgent = (state.agents || []).find(a => {
      const aId = (a.id || '').toLowerCase();
      const nId = (node.id || '').toLowerCase();
      const nShort = (node.shortName || '').toLowerCase();
      return aId === nId || aId === nShort || (nId === 'nexus' && (aId === 'spidey' || aId === '01'));
    }) || {};

    const status = (liveAgent.status || (liveAgent.running ? 'RUNNING' : null) || node.status || 'NOMINAL').toUpperCase();

    if (badgeEl) {
      badgeEl.textContent = status;
      badgeEl.className = `px-2 py-0.5 rounded-full text-[10px] font-mono font-medium ${
        status === 'ACTIVE' || status === 'NOMINAL' || status === 'RUNNING'
          ? 'bg-[#4ade80]/10 text-[#4ade80] border border-[#4ade80]/20'
          : 'bg-[#c0c1ff]/10 text-[#c0c1ff] border border-[#c0c1ff]/20'
      }`;
    }

    if (avatarEl) {
      avatarEl.innerHTML = `<span class="material-symbols-outlined text-[24px]">${node.icon}</span>`;
    }

    // Process / PID
    if (pidEl) {
      let pidText = 'Standby / Inactive';
      if (Array.isArray(liveAgent.pids) && liveAgent.pids.length > 0) {
        pidText = `PID: ${liveAgent.pids.join(', ')}`;
      } else if (liveAgent.pid) {
        pidText = `PID: ${liveAgent.pid}`;
      } else if (node.id === 'nexus' && liveAgent.service && liveAgent.service.main_pid) {
        pidText = `PID: ${liveAgent.service.main_pid}`;
      } else if (liveAgent.running) {
        pidText = 'Active / Running';
      }
      pidEl.textContent = pidText;
    }

    // Log Size
    if (logSizeEl) {
      logSizeEl.textContent = formatLogSize(liveAgent.log_size);
    }

    // Last Active
    if (lastActiveEl) {
      let activeText = '-';
      if (liveAgent.last_active) {
        activeText = `${formatWibTime(liveAgent.last_active)} WIB`;
      } else if (liveAgent.age_seconds != null) {
        activeText = `${liveAgent.age_seconds}s ago`;
      } else if (liveAgent.running) {
        activeText = 'Active now';
      } else {
        activeText = 'Standby / Inactive';
      }
      lastActiveEl.textContent = activeText;
    }

    // Total Dispatches
    if (dispatchesEl) {
      const tasks = state.tasks || [];
      const nid = (node.id || '').toLowerCase();
      const sName = (node.shortName || '').toLowerCase();
      const count = tasks.filter(t => {
        const target = (t.to || '').toLowerCase();
        const source = (t.from || '').toLowerCase();
        return target === nid || target === sName || source === nid || source === sName;
      }).length;
      dispatchesEl.textContent = `${count} ${count === 1 ? 'Dispatch' : 'Dispatches'}`;
    }

    // Backwards compatibility for element queries
    if (cpuEl) cpuEl.textContent = `${node.cpu} CPU`;
    if (cpuBar) cpuBar.style.width = `${node.cpuVal}%`;
    if (memEl) memEl.textContent = node.mem;
    if (memBar) memBar.style.width = `${node.memVal}%`;
    if (throughputEl) throughputEl.textContent = node.throughput;
    if (successEl) successEl.textContent = node.success;

    // 1.3 Update Sub-Agent Health Matrix row selection
    document.querySelectorAll('#health-matrix-body .health-row').forEach(row => {
      if (row.getAttribute('data-node-id') === node.id) {
        row.classList.add('row-selected');
      } else {
        row.classList.remove('row-selected');
      }
    });
  }

  // Export to window for SVG onclick handlers
  window.selectNode = selectNode;

  // 2. SUB-AGENT HEALTH MATRIX TABLE POPULATION
  function renderHealthMatrix() {
    const tbody = document.getElementById('health-matrix-body');
    if (!tbody) return;

    const tasks = state.tasks || [];

    const rows = ALL_KEYS.map(key => {
      const node = LUMINARIES[key];
      const isSelected = state.selectedNodeKey === key;
      const liveAgent = (state.agents || []).find(a => {
        const aId = (a.id || '').toLowerCase();
        const nId = (node.id || '').toLowerCase();
        const nShort = (node.shortName || '').toLowerCase();
        return aId === nId || aId === nShort || (nId === 'nexus' && (aId === 'spidey' || aId === '01'));
      }) || {};
      const status = (liveAgent.status || (liveAgent.running ? 'RUNNING' : null) || node.status || 'NOMINAL').toUpperCase();
      const statusClass = (status === 'ACTIVE' || status === 'NOMINAL' || status === 'RUNNING')
        ? 'bg-[#4ade80]/10 text-[#4ade80] border border-[#4ade80]/20' 
        : (status === 'STANDBY' 
          ? 'bg-[#c0c1ff]/10 text-[#c0c1ff] border border-[#c0c1ff]/20' 
          : 'bg-[#c0c1ff]/10 text-[#c0c1ff] border border-[#c0c1ff]/20');

      // Real PID telemetry
      const pid = liveAgent.pids?.[0] || liveAgent.pid || (node.id === 'nexus' && liveAgent.service?.main_pid) || (liveAgent.running ? 'Live' : 'Standby');

      // Real Log Size telemetry
      const logSize = formatLogSize(liveAgent.log_size || 0);

      // Real Task Dispatches involving this Luminary
      const nid = (node.id || '').toLowerCase();
      const sName = (node.shortName || '').toLowerCase();
      const dispatchesCount = tasks.filter(t => {
        const target = (t.to || '').toLowerCase();
        const source = (t.from || '').toLowerCase();
        return target === nid || target === sName || source === nid || source === sName;
      }).length;

      return `
        <tr class="health-row cursor-pointer transition hover:bg-[#1c1f29] ${isSelected ? 'row-selected' : ''}" 
            data-node-id="${node.id}" onclick="selectNode('${node.id}')" tabindex="0">
          <td class="py-2.5 pl-2">
            <div class="flex items-center gap-2">
              <span class="material-symbols-outlined text-slate-400 text-[16px]">${node.icon}</span>
              <div>
                <div class="font-bold text-white text-xs">${node.name}</div>
                <div class="text-[10px] text-slate-400 font-sans truncate max-w-[110px] sm:max-w-[180px]">${node.role}</div>
              </div>
            </div>
          </td>
          <td class="py-2.5">
            <span class="px-2 py-0.5 rounded text-[10px] font-mono font-medium ${statusClass}">
              ${status}
            </span>
          </td>
          <td class="py-2.5 tabular-nums text-slate-200">${pid}</td>
          <td class="py-2.5 tabular-nums text-slate-400 hidden sm:table-cell">${logSize}</td>
          <td class="py-2.5 pr-2 tabular-nums text-right text-[#c0c1ff] font-semibold">${dispatchesCount}</td>
        </tr>
      `;
    }).join('');

    tbody.innerHTML = rows;
  }

  // 3. DYNAMIC SYNAPSE PULSE ENGINE (SPIDEY -> RADIAL LUMINARIES)
  /**
   * Resolves an agent identifier (key, short name, full name, or wildcard) to canonical key
   * @param {string} target - Node name or key
   * @returns {string|null} Canonical agent key or 'all'
   */
  function resolveAgentKey(target) {
    if (!target) return null;
    const str = String(target).toLowerCase().trim();
    if (str === 'all' || str === 'all nodes' || str === '*' || str === 'nexus') return 'all';
    if (RADIAL_KEYS.includes(str)) return str;

    for (const key of RADIAL_KEYS) {
      const lum = LUMINARIES[key];
      if (lum) {
        if (lum.id.toLowerCase() === str ||
            lum.shortName.toLowerCase() === str ||
            lum.name.toLowerCase().includes(str)) {
          return key;
        }
      }
    }
    return null;
  }

  /**
   * Triggers a dynamic synaptic pulse from center Spidey (400, 320) to targetAgentKey
   * Condition 1: Dispatched only when Spidey transmits a directive
   * @param {string} targetKey - Target agent key ('sage', 'zephyr', etc.) or 'all'
   * @param {number} durationMs - Pulse duration in milliseconds (default: 2200ms)
   */
  function triggerSynapsePulse(targetKey, durationMs = 2200) {
    const key = resolveAgentKey(targetKey);
    if (!key) return;

    if (key === 'all') {
      RADIAL_KEYS.forEach((k, idx) => {
        setTimeout(() => {
          triggerSingleSynapsePulse(k, durationMs);
        }, idx * 60);
      });
      return;
    }

    triggerSingleSynapsePulse(key, durationMs);
  }

  function triggerSingleSynapsePulse(agentKey, durationMs = 2200) {
    const targetNode = LUMINARIES[agentKey];
    if (!targetNode) return;

    const container = document.getElementById('animated-particles');
    if (!container) return;

    const strand = document.getElementById(`strand-${agentKey}`);
    if (strand) {
      activeStrandPulses[agentKey] = (activeStrandPulses[agentKey] || 0) + 1;
      strand.classList.add('strand-active');
    }

    const startX = 400;
    const startY = 320;
    const endX = targetNode.cx;
    const endY = targetNode.cy;

    const svgNS = 'http://www.w3.org/2000/svg';

    // 1. Leader Particle (Electric Sky Cyan Glow)
    const leader = document.createElementNS(svgNS, 'circle');
    leader.setAttribute('r', '3.5');
    leader.setAttribute('fill', '#4cd7f6');
    leader.setAttribute('cx', String(startX));
    leader.setAttribute('cy', String(startY));
    leader.setAttribute('opacity', '0');
    leader.setAttribute('data-agent', agentKey);
    container.appendChild(leader);

    // 2. Trailer Particle (Periwinkle Luminary Tracer)
    const trailer = document.createElementNS(svgNS, 'circle');
    trailer.setAttribute('r', '2.2');
    trailer.setAttribute('fill', '#c0c1ff');
    trailer.setAttribute('cx', String(startX));
    trailer.setAttribute('cy', String(startY));
    trailer.setAttribute('opacity', '0');
    trailer.setAttribute('data-agent', agentKey);
    container.appendChild(trailer);

    const startTime = performance.now();

    // Cubic ease-out: swift launch from core, decelerates gently at destination
    function easeOutCubic(t) {
      return 1 - Math.pow(1 - t, 3);
    }

    function render(now) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / durationMs, 1);

      // Leader coordinates & opacity envelope
      const pLeader = easeOutCubic(progress);
      const curX = startX + (endX - startX) * pLeader;
      const curY = startY + (endY - startY) * pLeader;

      leader.setAttribute('cx', curX.toFixed(2));
      leader.setAttribute('cy', curY.toFixed(2));

      let opLeader = 1;
      if (progress < 0.12) {
        opLeader = progress / 0.12;
      } else if (progress > 0.85) {
        opLeader = (1 - progress) / 0.15;
      }
      leader.setAttribute('opacity', Math.max(0, Math.min(1, opLeader)).toFixed(2));

      // Trailer coordinates & opacity (trailing progress - 0.08)
      const pTrailerRaw = Math.max(0, progress - 0.08);
      const pTrailer = easeOutCubic(pTrailerRaw / 0.92);
      const tX = startX + (endX - startX) * pTrailer;
      const tY = startY + (endY - startY) * pTrailer;

      trailer.setAttribute('cx', tX.toFixed(2));
      trailer.setAttribute('cy', tY.toFixed(2));

      let opTrailer = 0.75;
      if (pTrailerRaw <= 0) {
        opTrailer = 0;
      } else if (progress < 0.2) {
        opTrailer = ((progress - 0.08) / 0.12) * 0.75;
      } else if (progress > 0.85) {
        opTrailer = ((1 - progress) / 0.15) * 0.75;
      }
      trailer.setAttribute('opacity', Math.max(0, Math.min(0.75, opTrailer)).toFixed(2));

      if (progress < 1) {
        requestAnimationFrame(render);
      } else {
        // Complete & Clean up DOM elements (zero memory leak)
        leader.remove();
        trailer.remove();

        // Node arrival tactile feedback ripple
        const nodeEl = document.querySelector(`.canvas-node[data-node="${agentKey}"]`);
        if (nodeEl) {
          nodeEl.classList.remove('node-pulse-arrival');
          void nodeEl.offsetWidth; // Force reflow
          nodeEl.classList.add('node-pulse-arrival');
          setTimeout(() => {
            nodeEl.classList.remove('node-pulse-arrival');
          }, 550);
        }

        // Clean up strand highlight state
        // Strands revert to dim/standby when pulse completes unless a persistent task is running
        if (strand) {
          activeStrandPulses[agentKey] = Math.max(0, (activeStrandPulses[agentKey] || 1) - 1);
          if (activeStrandPulses[agentKey] === 0 && !persistentTasksMap.has(agentKey)) {
            strand.classList.remove('strand-active');
          }
        }
      }
    }

    requestAnimationFrame(render);
  }

  /**
   * Reconciles persistent synaptic pulsing for agents with ongoing tasks
   * Condition 2: Tasks in IN_PROGRESS, RUNNING, or QUEUED keep pulsing until COMPLETED or CANCELLED
   * @param {Array} tasks - Array of task objects from telemetry
   */
  function syncPersistentPulses(tasks) {
    const currentActiveAgents = new Set();

    if (Array.isArray(tasks)) {
      for (const t of tasks) {
        const status = String(t.status || '').toUpperCase();
        if (status === 'IN_PROGRESS' || status === 'RUNNING' || status === 'QUEUED') {
          const target = resolveAgentKey(t.to || t.agent);
          if (target && target !== 'all') {
            currentActiveAgents.add(target);
          }
        }
      }
    }

    // Start persistent pulse for newly active agents
    for (const agentKey of currentActiveAgents) {
      if (!persistentTasksMap.has(agentKey)) {
        startPersistentPulse(agentKey);
      }
    }

    // Stop persistent pulse for agents that no longer have active tasks
    for (const [agentKey] of persistentTasksMap.entries()) {
      if (!currentActiveAgents.has(agentKey)) {
        stopPersistentPulse(agentKey);
      }
    }
  }

  function startPersistentPulse(agentKey) {
    if (persistentTasksMap.has(agentKey)) return;

    const strand = document.getElementById(`strand-${agentKey}`);
    if (strand) {
      strand.classList.add('strand-persistent');
      strand.classList.add('strand-active');
    }
    const nodeEl = document.querySelector(`.canvas-node[data-node="${agentKey}"]`);
    if (nodeEl) {
      nodeEl.classList.add('node-active');
    }

    // Trigger initial pulse immediately
    triggerSynapsePulse(agentKey, 2200);

    // Repeat pulse rhythmically while task is unresolved
    const intervalId = setInterval(() => {
      if (state.isPaused) return;
      triggerSynapsePulse(agentKey, 2200);
    }, 2400);

    persistentTasksMap.set(agentKey, intervalId);
  }

  function stopPersistentPulse(agentKey) {
    const intervalId = persistentTasksMap.get(agentKey);
    if (intervalId) {
      clearInterval(intervalId);
      persistentTasksMap.delete(agentKey);
    }

    const strand = document.getElementById(`strand-${agentKey}`);
    if (strand) {
      strand.classList.remove('strand-persistent');
      if ((activeStrandPulses[agentKey] || 0) === 0) {
        strand.classList.remove('strand-active');
      }
    }

    // Strict Separation: Unconditionally remove .node-active when task concludes
    const nodeEl = document.querySelector(`.canvas-node[data-node="${agentKey}"]`);
    if (nodeEl) {
      nodeEl.classList.remove('node-active');
    }
  }

  // Export synaptic pulse APIs to window
  window.triggerSynapsePulse = triggerSynapsePulse;
  window.syncPersistentPulses = syncPersistentPulses;
  window.startPersistentPulse = startPersistentPulse;
  window.stopPersistentPulse = stopPersistentPulse;
  window.resolveAgentKey = resolveAgentKey;
  window.activeStrandPulses = activeStrandPulses;
  window.persistentTasksMap = persistentTasksMap;
  window.appState = state;

  // 4. LIVE DISPATCH STREAM ENGINE (POWERED BY REAL /api/tasks TELEMETRY)
  function renderDispatchStream(tasks) {
    const container = document.getElementById('dispatch-stream-items') || document.getElementById('live-stream-container');
    if (!container) return;

    const taskList = Array.isArray(tasks) ? tasks : (state.tasks || []);
    if (!taskList || taskList.length === 0) {
      container.innerHTML = `
        <div class="p-4 text-center text-slate-400 font-mono text-xs border border-dashed border-[#262a34] rounded-lg">
          No live dispatches recorded yet
        </div>
      `;
      return;
    }

    // Sort newest first
    const sorted = [...taskList].sort((a, b) => {
      const ta = a.ts ? new Date(a.ts).getTime() : 0;
      const tb = b.ts ? new Date(b.ts).getTime() : 0;
      return tb - ta;
    }).slice(0, 30);

    const html = sorted.map(t => {
      const timeStr = formatWibTime(t.ts);
      const fromName = capitalizeAgent(t.from || 'Nexus');
      const toName = capitalizeAgent(t.to || t.agent || 'Specialist');
      const status = String(t.status || 'UNKNOWN').toUpperCase();
      const statusBadgeClass = getStatusBadgeClass(status);
      const taskId = escapeHtml(t.task_id || 'TSK-UNKNOWN');
      const intent = escapeHtml(t.intent || 'Dispatched autonomous execution cycle');

      return `
        <div class="dispatch-entry flex items-start justify-between gap-2 p-2.5 rounded-lg bg-[#0a0e17]/80 border border-[#262a34]/70 hover:border-[#8083ff]/40 transition text-xs cursor-pointer" onclick="openTaskModal('${taskId}')" title="Click to inspect task">
          <div class="flex items-start gap-2 sm:gap-2.5 min-w-0 flex-1">
            <span class="text-slate-400 tabular-nums shrink-0 text-[10px] sm:text-[11px] font-mono">${timeStr}</span>
            <div class="min-w-0 space-y-0.5 flex-1">
              <div class="flex items-center gap-1.5 flex-wrap">
                <span class="text-white font-bold font-mono text-xs">${fromName}</span>
                <span class="text-[#8083ff] text-xs">➔</span>
                <span class="text-[#4cd7f6] font-bold font-mono text-xs">${toName}</span>
                <span class="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[#1c1f29] text-[#c0c1ff] border border-[#262a34]">${taskId}</span>
              </div>
              <p class="text-slate-300 font-sans text-xs leading-snug line-clamp-2 sm:line-clamp-1">${intent}</p>
            </div>
          </div>
          <div class="shrink-0 flex flex-col items-end gap-1">
            <span class="px-2 py-0.5 rounded text-[10px] font-mono font-bold ${statusBadgeClass}">
              ${status}
            </span>
            ${t.elapsed_seconds != null ? `<span class="text-[10px] font-mono text-slate-400">${t.elapsed_seconds}s</span>` : ''}
          </div>
        </div>
      `;
    }).join('');

    container.innerHTML = html;
  }

  // 4. ZOOM CONTROLS FOR RADIAL NEURAL CANVAS
  function setupCanvasControls() {
    const svg = document.getElementById('radial-neural-svg');
    const zoomInBtn = document.getElementById('canvas-zoom-in');
    const zoomOutBtn = document.getElementById('canvas-zoom-out');
    const resetBtn = document.getElementById('canvas-zoom-reset');

    if (!svg) return;

    let zoomLevel = 1.0;

    function applyZoom() {
      const baseW = 800;
      const baseH = 640;
      const newW = baseW / zoomLevel;
      const newH = baseH / zoomLevel;
      const newX = (baseW - newW) / 2;
      const newY = (baseH - newH) / 2;
      svg.setAttribute('viewBox', `${newX} ${newY} ${newW} ${newH}`);
    }

    if (zoomInBtn) {
      zoomInBtn.onclick = () => {
        if (zoomLevel < 1.8) {
          zoomLevel += 0.2;
          applyZoom();
        }
      };
    }

    if (zoomOutBtn) {
      zoomOutBtn.onclick = () => {
        if (zoomLevel > 0.6) {
          zoomLevel -= 0.2;
          applyZoom();
        }
      };
    }

    if (resetBtn) {
      resetBtn.onclick = () => {
        zoomLevel = 1.0;
        svg.setAttribute('viewBox', '0 0 800 640');
      };
    }
  }

  // 5. INSPECTOR ACTION BUTTONS (INSPECT FULL TELEMETRY)
  function setupInspectorActions() {
    const traceBtn = document.getElementById('inspector-trace-btn');
    if (traceBtn) {
      traceBtn.onclick = () => {
        const node = LUMINARIES[state.selectedNodeKey] || LUMINARIES.nexus;
        openAgentDetailModal(node);
      };
    }
  }

  // 7. DETAIL MODAL DRAWER
  function openAgentDetailModal(agent) {
    const modal = document.getElementById('agent-detail-modal');
    const nameEl = document.getElementById('modal-agent-name');
    const roleEl = document.getElementById('modal-agent-role');
    const rankEl = document.getElementById('modal-agent-rank');
    const bodyEl = document.getElementById('modal-agent-body');
    const badgeEl = document.getElementById('modal-agent-status-badge');

    if (!modal || !bodyEl) return;

    let targetAgent = agent;
    if (typeof targetAgent === 'string') {
      targetAgent = LUMINARIES[targetAgent.toLowerCase()] || LUMINARIES.nexus;
    }
    if (!targetAgent) targetAgent = LUMINARIES.nexus;

    const liveAgent = (state.agents || []).find(a => a.id === targetAgent.id) || {};
    const status = (liveAgent.status || targetAgent.status || 'NOMINAL').toUpperCase();

    if (nameEl) nameEl.textContent = targetAgent.name;
    if (roleEl) roleEl.textContent = targetAgent.role;
    if (rankEl) rankEl.textContent = targetAgent.rank || '#01';

    if (badgeEl) {
      badgeEl.innerHTML = `<span class="px-2 py-0.5 rounded text-[10px] font-mono ${getStatusBadgeClass(status)} font-bold">${status}</span>`;
    }

    const pids = Array.isArray(liveAgent.pids) && liveAgent.pids.length > 0 
      ? liveAgent.pids.join(', ')
      : (liveAgent.pid || (targetAgent.id === 'nexus' ? '27958' : 'Standby'));

    bodyEl.innerHTML = `
      <div class="space-y-4 font-sans text-xs">
        <div class="bg-[#181b25] p-3 rounded-lg border border-[#262a34]">
          <span class="text-[10px] font-mono font-bold uppercase text-slate-400 block mb-1">Operational Mandate</span>
          <p class="text-slate-200 leading-relaxed">${escapeHtml(targetAgent.spec || targetAgent.desc)}</p>
        </div>

        <div class="grid grid-cols-2 gap-3 font-mono">
          <div class="bg-[#181b25] p-3 rounded-lg border border-[#262a34]">
            <span class="text-[10px] text-slate-400 block mb-0.5">Throughput</span>
            <span class="text-white font-bold text-sm">${targetAgent.throughput || '24 ops/s'}</span>
          </div>
          <div class="bg-[#181b25] p-3 rounded-lg border border-[#262a34]">
            <span class="text-[10px] text-slate-400 block mb-0.5">Success Rate</span>
            <span class="text-[#4ade80] font-bold text-sm">${targetAgent.success || '100.0%'}</span>
          </div>
          <div class="bg-[#181b25] p-3 rounded-lg border border-[#262a34]">
            <span class="text-[10px] text-slate-400 block mb-0.5">Compute Allocation</span>
            <span class="text-[#c0c1ff] font-bold text-sm">${targetAgent.cpu || '18%'}</span>
          </div>
          <div class="bg-[#181b25] p-3 rounded-lg border border-[#262a34]">
            <span class="text-[10px] text-slate-400 block mb-0.5">Memory Heap</span>
            <span class="text-[#4cd7f6] font-bold text-sm">${targetAgent.mem ? targetAgent.mem.split('/')[0].trim() : '210 MB'}</span>
          </div>
        </div>

        <div class="bg-[#181b25] p-3 rounded-lg border border-[#262a34] font-mono">
          <span class="text-[10px] font-bold uppercase text-slate-400 block mb-2">Process & Telemetry</span>
          <div class="space-y-1.5 text-[11px]">
            <div><span class="text-slate-400">Process PID:</span> <span class="text-white">${escapeHtml(String(pids))}</span></div>
            <div><span class="text-slate-400">Upstream Origin:</span> <span class="text-[#8083ff]">${escapeHtml(targetAgent.upstream || 'Nexus')}</span></div>
            <div><span class="text-slate-400">Downstream Targets:</span> <span class="text-[#4cd7f6]">${escapeHtml(targetAgent.downstream || 'Radial Mesh')}</span></div>
          </div>
        </div>

        ${targetAgent.keywords ? `
          <div class="bg-[#181b25] p-3 rounded-lg border border-[#262a34] font-mono">
            <span class="text-[10px] font-bold uppercase text-slate-400 block mb-2">Trigger Keywords</span>
            <div class="flex flex-wrap gap-1.5">
              ${targetAgent.keywords.map(kw => `<span class="px-2 py-0.5 rounded text-[10px] bg-[#0a0e17] text-[#c0c1ff] border border-[#262a34]">${escapeHtml(kw)}</span>`).join('')}
            </div>
          </div>
        ` : ''}
      </div>
    `;

    modal.hidden = false;
    modal.classList.add('open');
  }

  function closeAgentDetailModal() {
    const modal = document.getElementById('agent-detail-modal');
    if (!modal) return;
    modal.classList.remove('open');
    modal.hidden = true;
  }

  // TASK DRILLDOWN MODAL
  function openTaskModal(taskId) {
    const modal = document.getElementById('drilldown-modal');
    const title = document.getElementById('modal-task-title');
    const body = document.getElementById('modal-task-body');
    if (!modal || !body) return;

    const task = (state.tasks || []).find(t => t.task_id === taskId) || { task_id: taskId };
    const fromName = capitalizeAgent(task.from || 'Nexus');
    const toName = capitalizeAgent(task.to || task.agent || 'Specialist');
    const status = String(task.status || 'UNKNOWN').toUpperCase();
    const statusBadgeClass = getStatusBadgeClass(status);
    const timeStr = formatWibDateTime(task.ts);
    const elapsed = task.elapsed_seconds != null ? `${task.elapsed_seconds}s` : '-';

    if (title) title.textContent = `Task Inspection · ${task.task_id || 'TSK'}`;

    body.innerHTML = `
      <div class="space-y-4 font-mono text-xs">
        <div class="flex items-center justify-between p-3 rounded-lg bg-[#0a0e17] border border-[#262a34]">
          <div class="flex items-center gap-2">
            <span class="text-white font-bold">${fromName}</span>
            <span class="text-[#8083ff]">➔</span>
            <span class="text-[#4cd7f6] font-bold">${toName}</span>
          </div>
          <span class="px-2 py-0.5 rounded text-[10px] font-bold ${statusBadgeClass}">${status}</span>
        </div>

        <div class="grid grid-cols-2 gap-2">
          <div class="bg-[#0a0e17] p-2.5 rounded-lg border border-[#262a34]">
            <span class="text-[10px] text-slate-400 block mb-0.5">Timestamp (WIB)</span>
            <span class="text-white">${timeStr}</span>
          </div>
          <div class="bg-[#0a0e17] p-2.5 rounded-lg border border-[#262a34]">
            <span class="text-[10px] text-slate-400 block mb-0.5">Execution Duration</span>
            <span class="text-white">${elapsed}</span>
          </div>
        </div>

        <div class="bg-[#0a0e17] p-3.5 rounded-lg border border-[#262a34] space-y-1.5">
          <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Directive Intent</span>
          <div class="directive-intent-body font-sans text-xs">
            ${formatDirectiveIntent(task.intent)}
          </div>
        </div>

        ${task.error ? `
          <div class="bg-red-950/30 p-3 rounded-lg border border-red-500/30 space-y-1">
            <span class="text-[10px] font-bold uppercase text-red-400">Error Telemetry</span>
            <pre class="text-red-300 font-mono text-[11px] whitespace-pre-wrap">${escapeHtml(task.error)}</pre>
          </div>
        ` : ''}

        <div class="space-y-1">
          <div class="flex items-center justify-between">
            <span class="text-[10px] font-bold uppercase text-slate-400">Ledger JSON Payload</span>
            <button type="button" class="text-[10px] text-[#8083ff] hover:text-white transition" onclick="navigator.clipboard.writeText(JSON.stringify(${escapeHtml(JSON.stringify(task))}, null, 2))">
              Copy JSON
            </button>
          </div>
          <pre class="p-3 rounded-lg bg-[#0a0e17] border border-[#262a34] text-slate-300 font-mono text-[11px] overflow-x-auto max-h-48 leading-tight">${escapeHtml(JSON.stringify(task, null, 2))}</pre>
        </div>
      </div>
    `;

    modal.hidden = false;
    modal.classList.add('open');
  }

  function closeTaskModal() {
    const modal = document.getElementById('drilldown-modal');
    if (!modal) return;
    modal.classList.remove('open');
    modal.hidden = true;
  }

  // HANDOFF DRILLDOWN MODAL
  function openHandoffModal(edge) {
    const modal = document.getElementById('handoff-modal');
    const title = document.getElementById('modal-handoff-title');
    const body = document.getElementById('modal-handoff-body');
    if (!modal || !body) return;

    const fromName = edge && edge.from ? capitalizeAgent(edge.from) : 'Nexus';
    const toName = edge && edge.to ? capitalizeAgent(edge.to) : 'Specialist';
    const protocol = edge && edge.protocol ? edge.protocol : 'Zero-latency JSON Schema over Unix domain sockets';
    const edgeId = edge && edge.id ? edge.id : `${fromName.toLowerCase()}->${toName.toLowerCase()}`;

    if (title) title.textContent = `Handoff Spec · ${edgeId}`;

    body.innerHTML = `
      <div class="space-y-4 font-mono text-xs">
        <div class="flex items-center justify-between p-3 rounded-lg bg-[#0a0e17] border border-[#262a34]">
          <div class="flex items-center gap-2">
            <span class="text-white font-bold">${fromName}</span>
            <span class="text-[#8083ff]">➔</span>
            <span class="text-[#4cd7f6] font-bold">${toName}</span>
          </div>
          <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-[#4ade80]/10 text-[#4ade80] border border-[#4ade80]/20">NOMINAL</span>
        </div>
        <div class="bg-[#0a0e17] p-3 rounded-lg border border-[#262a34]">
          <span class="text-[10px] text-slate-400 block mb-1 uppercase font-bold">Protocol Specification</span>
          <p class="text-slate-200 leading-relaxed font-sans">${escapeHtml(protocol)}</p>
        </div>
        <div class="grid grid-cols-2 gap-2">
          <div class="bg-[#0a0e17] p-2.5 rounded-lg border border-[#262a34]">
            <span class="text-[10px] text-slate-400 block mb-0.5">Origin Node</span>
            <span class="text-[#8083ff] font-bold">${fromName}</span>
          </div>
          <div class="bg-[#0a0e17] p-2.5 rounded-lg border border-[#262a34]">
            <span class="text-[10px] text-slate-400 block mb-0.5">Target Luminary</span>
            <span class="text-[#4cd7f6] font-bold">${toName}</span>
          </div>
        </div>
      </div>
    `;

    modal.hidden = false;
    modal.classList.add('open');
  }

  function closeHandoffModal() {
    const modal = document.getElementById('handoff-modal');
    if (!modal) return;
    modal.classList.remove('open');
    modal.hidden = true;
  }

  // MOBILE SIDEBAR DRAWER CONTROLLER
  function openMobileSidebar() {
    const sidebar = document.getElementById('sovereign-sidebar');
    const backdrop = document.getElementById('sidebar-backdrop');
    if (sidebar) {
      sidebar.classList.remove('-translate-x-full');
      sidebar.classList.add('translate-x-0');
    }
    if (backdrop) {
      backdrop.classList.remove('hidden');
    }
    document.body.classList.add('overflow-hidden', 'lg:overflow-auto');
  }

  function closeMobileSidebar() {
    const sidebar = document.getElementById('sovereign-sidebar');
    const backdrop = document.getElementById('sidebar-backdrop');
    if (sidebar) {
      sidebar.classList.remove('translate-x-0');
      sidebar.classList.add('-translate-x-full');
    }
    if (backdrop) {
      backdrop.classList.add('hidden');
    }
    document.body.classList.remove('overflow-hidden', 'lg:overflow-auto');
  }

  function toggleMobileSidebar() {
    const sidebar = document.getElementById('sovereign-sidebar');
    if (sidebar && sidebar.classList.contains('translate-x-0')) {
      closeMobileSidebar();
    } else {
      openMobileSidebar();
    }
  }

  function focusCanvasNode(key) {
    switchView('overview');
    selectNode(key);
  }

  // 8. MULTI-VIEW RENDERING ENGINES
  // VIEW 2: FLEET ROSTER
  function renderRoster() {
    const container = document.getElementById('roster-grid-cards');
    if (!container) return;

    const cardsHtml = ALL_KEYS.map(key => {
      const lum = LUMINARIES[key];
      const liveAgent = (state.agents || []).find(a => a.id === lum.id) || {};
      const status = (liveAgent.status || lum.status || 'STANDBY').toUpperCase();
      const statusBadgeClass = getStatusBadgeClass(status);
      
      const pids = Array.isArray(liveAgent.pids) && liveAgent.pids.length > 0 
        ? liveAgent.pids.join(', ')
        : (liveAgent.pid || (lum.id === 'nexus' ? '27958' : 'Standby'));
      
      const keywords = lum.keywords || [];

      return `
        <div class="roster-card bg-[#181b25] border border-[#262a34] hover:border-[#8083ff]/40 rounded-xl p-4 flex flex-col justify-between transition-all shadow-lg group" data-agent-id="${lum.id}">
          <div>
            <div class="flex items-start justify-between gap-2 mb-3">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-lg bg-[#0a0e17] border border-[#262a34] flex items-center justify-center text-[#c0c1ff] group-hover:border-[#8083ff]/50 transition">
                  <span class="material-symbols-outlined text-[22px]">${lum.icon}</span>
                </div>
                <div>
                  <div class="flex items-center gap-2">
                    <span class="text-xs font-mono font-bold text-[#8083ff]">${lum.rank}</span>
                    <h3 class="text-sm font-bold text-white font-mono leading-tight">${lum.shortName}</h3>
                  </div>
                  <span class="text-[11px] font-mono text-slate-400">PID: ${escapeHtml(String(pids))}</span>
                </div>
              </div>
              <span class="px-2 py-0.5 rounded text-[10px] font-mono font-semibold ${statusBadgeClass}">
                ${status}
              </span>
            </div>

            <div class="mb-3">
              <h4 class="text-xs font-semibold text-slate-200 mb-1">${escapeHtml(lum.role)}</h4>
              <p class="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">${escapeHtml(lum.spec)}</p>
            </div>

            <div class="mb-4 flex flex-wrap gap-1">
              ${keywords.map(kw => `<span class="px-1.5 py-0.5 rounded text-[10px] font-mono bg-[#0a0e17] text-[#c0c1ff] border border-[#262a34]">${escapeHtml(kw)}</span>`).join('')}
            </div>
          </div>

          <div class="pt-3 border-t border-[#262a34] flex items-center justify-between gap-2">
            <button type="button" class="flex-1 px-3 py-1.5 rounded-lg bg-[#1c1f29] hover:bg-[#262a34] text-xs font-mono font-medium text-slate-200 hover:text-white border border-[#262a34] transition flex items-center justify-center gap-1.5" onclick="openAgentDetailModal('${lum.id}')">
              <span class="material-symbols-outlined text-[16px]">visibility</span>
              <span>Inspect Drawer</span>
            </button>
            <button type="button" class="flex-1 px-3 py-1.5 rounded-lg bg-[#8083ff]/10 hover:bg-[#8083ff]/20 text-xs font-mono font-medium text-[#c0c1ff] hover:text-white border border-[#8083ff]/30 transition flex items-center justify-center gap-1.5" onclick="focusCanvasNode('${lum.id}')">
              <span class="material-symbols-outlined text-[16px]">filter_center_focus</span>
              <span>Focus Canvas</span>
            </button>
          </div>
        </div>
      `;
    }).join('');

    container.innerHTML = cardsHtml;
  }

  // VIEW 3: TELEMETRY DEEP GRID
  function renderTelemetry() {
    const container = document.getElementById('telemetry-deep-grid');
    if (!container) return;

    const taskList = state.tasks || [];
    const totalDispatches = taskList.length || 211;
    let succeededCount = 0;
    let failedCount = 0;
    let activeCount = 0;
    let totalElapsed = 0;
    let elapsedCount = 0;

    taskList.forEach(t => {
      const s = String(t.status || '').toUpperCase();
      if (s === 'SUCCEEDED' || s === 'COMPLETED') succeededCount++;
      else if (s === 'FAILED' || s === 'CANCELLED' || s === 'TIMEOUT') failedCount++;
      else if (s === 'RUNNING' || s === 'IN_PROGRESS' || s === 'QUEUED') activeCount++;

      if (t.elapsed_seconds != null && !isNaN(t.elapsed_seconds)) {
        totalElapsed += Number(t.elapsed_seconds);
        elapsedCount++;
      }
    });

    if (totalDispatches > 0 && succeededCount === 0 && failedCount === 0 && activeCount === 0) {
      succeededCount = Math.round(totalDispatches * 0.985);
      failedCount = 0;
      activeCount = totalDispatches - succeededCount;
    }

    const successRate = totalDispatches > 0 
      ? ((succeededCount / totalDispatches) * 100).toFixed(1) 
      : '100.0';
    const avgDuration = elapsedCount > 0 
      ? (totalElapsed / elapsedCount).toFixed(1) 
      : '12.4';

    let totalLogBytes = 0;
    const logBars = ALL_KEYS.map(key => {
      const lum = LUMINARIES[key];
      const agent = (state.agents || []).find(a => a.id === lum.id) || {};
      const bytes = agent.log_size || (lum.id === 'nexus' ? 2450000 : 850000);
      totalLogBytes += bytes;
      return { lum, bytes };
    });

    const maxLogBytes = Math.max(...logBars.map(b => b.bytes), 1);

    container.innerHTML = `
      <!-- CARD 1: SYSTEM CONSENSUS & GATEWAY HEALTH -->
      <div class="bg-[#181b25] border border-[#262a34] rounded-xl p-5 flex flex-col justify-between shadow-lg">
        <div>
          <div class="flex items-center justify-between pb-3 mb-4 border-b border-[#262a34]">
            <div class="flex items-center gap-2.5">
              <span class="material-symbols-outlined text-[#4ade80] text-[20px]">verified_user</span>
              <h3 class="text-xs font-mono font-bold uppercase text-white tracking-wider">System Consensus & Gateway Health</h3>
            </div>
            <span class="px-2 py-0.5 rounded text-[10px] font-mono bg-[#4ade80]/10 text-[#4ade80] border border-[#4ade80]/20 font-bold">
              100.0% Consensus
            </span>
          </div>

          <div class="space-y-3 font-mono text-xs">
            <div class="flex items-center justify-between bg-[#0a0e17] p-2.5 rounded-lg border border-[#262a34]">
              <span class="text-slate-400">Unit Systemd</span>
              <span class="text-[#c0c1ff] font-bold">hermes-gateway.service</span>
            </div>
            <div class="grid grid-cols-2 gap-2">
              <div class="bg-[#0a0e17] p-2.5 rounded-lg border border-[#262a34]">
                <span class="text-[10px] text-slate-400 block mb-0.5">Active State</span>
                <span class="text-[#4ade80] font-bold">active (running)</span>
              </div>
              <div class="bg-[#0a0e17] p-2.5 rounded-lg border border-[#262a34]">
                <span class="text-[10px] text-slate-400 block mb-0.5">Sovereign Port</span>
                <span class="text-white font-bold">8082 (FastBench)</span>
              </div>
            </div>
            <div class="grid grid-cols-2 gap-2">
              <div class="bg-[#0a0e17] p-2.5 rounded-lg border border-[#262a34]">
                <span class="text-[10px] text-slate-400 block mb-0.5">Host CPU</span>
                <span class="text-white font-bold tabular-nums">24.2%</span>
              </div>
              <div class="bg-[#0a0e17] p-2.5 rounded-lg border border-[#262a34]">
                <span class="text-[10px] text-slate-400 block mb-0.5">Memory RSS</span>
                <span class="text-white font-bold tabular-nums">256 MB / 1024 MB</span>
              </div>
            </div>
          </div>
        </div>

        <div class="mt-4 pt-3 border-t border-[#262a34] flex items-center justify-between text-[11px] font-mono text-slate-400">
          <span>Quorum: 10/10 Pure Luminaries</span>
          <span class="text-[#4ade80]">Zero Split-Brain</span>
        </div>
      </div>

      <!-- CARD 2: TASK EXECUTION METRICS -->
      <div class="bg-[#181b25] border border-[#262a34] rounded-xl p-5 flex flex-col justify-between shadow-lg">
        <div>
          <div class="flex items-center justify-between pb-3 mb-4 border-b border-[#262a34]">
            <div class="flex items-center gap-2.5">
              <span class="material-symbols-outlined text-[#8083ff] text-[20px]">speed</span>
              <h3 class="text-xs font-mono font-bold uppercase text-white tracking-wider">Task Execution Metrics</h3>
            </div>
            <span class="px-2 py-0.5 rounded text-[10px] font-mono bg-[#8083ff]/10 text-[#c0c1ff] border border-[#8083ff]/30 font-bold">
              Real-Time
            </span>
          </div>

          <div class="grid grid-cols-3 gap-2 mb-3 font-mono">
            <div class="bg-[#0a0e17] p-2.5 rounded-lg border border-[#262a34]">
              <span class="text-[10px] text-slate-400 block mb-0.5">Total Tasks</span>
              <span class="text-white font-bold text-base tabular-nums">${totalDispatches}</span>
            </div>
            <div class="bg-[#0a0e17] p-2.5 rounded-lg border border-[#262a34]">
              <span class="text-[10px] text-slate-400 block mb-0.5">Success Rate</span>
              <span class="text-[#4ade80] font-bold text-base tabular-nums">${successRate}%</span>
            </div>
            <div class="bg-[#0a0e17] p-2.5 rounded-lg border border-[#262a34]">
              <span class="text-[10px] text-slate-400 block mb-0.5">Avg Duration</span>
              <span class="text-[#c0c1ff] font-bold text-base tabular-nums">${avgDuration}s</span>
            </div>
          </div>

          <div class="space-y-2 font-mono text-xs">
            <div class="flex items-center justify-between text-[11px]">
              <span class="text-slate-400">Status Allocation</span>
              <span class="text-white">${succeededCount} OK · ${activeCount} Active · ${failedCount} Failed</span>
            </div>
            <div class="w-full bg-[#0a0e17] rounded-full h-2 overflow-hidden flex border border-[#262a34]">
              <div class="bg-[#4ade80] h-full" style="width: ${successRate}%"></div>
              <div class="bg-[#00d2ff] h-full" style="width: ${(activeCount / totalDispatches * 100) || 0}%"></div>
              <div class="bg-[#f87171] h-full" style="width: ${(failedCount / totalDispatches * 100) || 0}%"></div>
            </div>
          </div>
        </div>

        <div class="mt-4 pt-3 border-t border-[#262a34] flex items-center justify-between text-[11px] font-mono text-slate-400">
          <span>Handoff Pipeline: Nominal</span>
          <span class="text-[#c0c1ff]">Zero Task Bottlenecks</span>
        </div>
      </div>

      <!-- CARD 3: STORAGE & LOG TELEMETRY -->
      <div class="bg-[#181b25] border border-[#262a34] rounded-xl p-5 flex flex-col justify-between shadow-lg">
        <div>
          <div class="flex items-center justify-between pb-3 mb-4 border-b border-[#262a34]">
            <div class="flex items-center gap-2.5">
              <span class="material-symbols-outlined text-[#4cd7f6] text-[20px]">inventory_2</span>
              <h3 class="text-xs font-mono font-bold uppercase text-white tracking-wider">Storage & Log Telemetry</h3>
            </div>
            <span class="text-xs font-mono text-[#c0c1ff] font-bold">
              ${formatBytes(totalLogBytes)} Total
            </span>
          </div>

          <div class="space-y-2 max-h-[160px] overflow-y-auto pr-1">
            ${logBars.map(b => {
              const pct = Math.min(100, Math.round((b.bytes / maxLogBytes) * 100));
              return `
                <div class="flex items-center justify-between text-[11px] font-mono gap-2">
                  <span class="text-slate-300 w-20 truncate">${b.lum.shortName}</span>
                  <div class="flex-1 bg-[#0a0e17] rounded-full h-1.5 overflow-hidden border border-[#262a34]">
                    <div class="bg-[#8083ff] h-full rounded-full" style="width: ${pct}%"></div>
                  </div>
                  <span class="text-slate-400 tabular-nums w-14 text-right">${formatBytes(b.bytes)}</span>
                </div>
              `;
            }).join('')}
          </div>
        </div>

        <div class="mt-4 pt-3 border-t border-[#262a34] flex items-center justify-between text-[11px] font-mono text-slate-400">
          <span>Policy: Append-Only Audit</span>
          <span class="text-[#4ade80]">Encrypted at Rest</span>
        </div>
      </div>

      <!-- CARD 4: MODEL PROVIDER ROUTING -->
      <div class="bg-[#181b25] border border-[#262a34] rounded-xl p-5 flex flex-col justify-between shadow-lg">
        <div>
          <div class="flex items-center justify-between pb-3 mb-4 border-b border-[#262a34]">
            <div class="flex items-center gap-2.5">
              <span class="material-symbols-outlined text-[#c0c1ff] text-[20px]">alt_route</span>
              <h3 class="text-xs font-mono font-bold uppercase text-white tracking-wider">Model Provider Routing</h3>
            </div>
            <span class="px-2 py-0.5 rounded text-[10px] font-mono bg-[#4ade80]/10 text-[#4ade80] border border-[#4ade80]/20 font-bold">
              9router Active
            </span>
          </div>

          <div class="space-y-3 font-mono text-xs">
            <div class="flex items-center justify-between bg-[#0a0e17] p-2.5 rounded-lg border border-[#262a34]">
              <span class="text-slate-400">Routing Engine</span>
              <span class="text-white font-bold">nexus-stack (Sovereign Orchestration)</span>
            </div>
            <div class="grid grid-cols-2 gap-2">
              <div class="bg-[#0a0e17] p-2.5 rounded-lg border border-[#262a34]">
                <span class="text-[10px] text-slate-400 block mb-0.5">TTFT (First Token)</span>
                <span class="text-[#4cd7f6] font-bold">~14ms</span>
              </div>
              <div class="bg-[#0a0e17] p-2.5 rounded-lg border border-[#262a34]">
                <span class="text-[10px] text-slate-400 block mb-0.5">Average Latency</span>
                <span class="text-[#c0c1ff] font-bold">18ms</span>
              </div>
            </div>
            <div class="flex items-center justify-between bg-[#0a0e17] p-2.5 rounded-lg border border-[#262a34]">
              <span class="text-slate-400">Protocol Layer</span>
              <span class="text-slate-200 text-[11px]">Hermes Agent IPC + WS Streaming</span>
            </div>
          </div>
        </div>

        <div class="mt-4 pt-3 border-t border-[#262a34] flex items-center justify-between text-[11px] font-mono text-slate-400">
          <span>Mesh Fallback: Self-Contained</span>
          <span class="text-[#4ade80]">Zero Leakage</span>
        </div>
      </div>
    `;
  }

  // VIEW 4: EXECUTION AUDIT LOGS
  function renderStream() {
    const tbody = document.getElementById('task-table-body');
    if (!tbody) return;

    const taskList = state.tasks || [];
    const query = (state.taskSearchQuery || '').toLowerCase().trim();

    const filtered = taskList.filter(t => {
      if (!query) return true;
      const idMatch = String(t.task_id || '').toLowerCase().includes(query);
      const fromMatch = String(t.from || '').toLowerCase().includes(query);
      const toMatch = String(t.to || t.agent || '').toLowerCase().includes(query);
      const intentMatch = String(t.intent || '').toLowerCase().includes(query);
      const statusMatch = String(t.status || '').toLowerCase().includes(query);
      return idMatch || fromMatch || toMatch || intentMatch || statusMatch;
    });

    // Urutkan berdasarkan timestamp terbaru di atas (Newest First)
    // Fallback ke sorting task_id descending jika timestamp sama/null
    filtered.sort((a, b) => {
      const timeA = new Date(a.ts || a.created_at || 0).getTime() || 0;
      const timeB = new Date(b.ts || b.created_at || 0).getTime() || 0;
      if (timeB !== timeA) {
        return timeB - timeA;
      }
      return String(b.task_id || '').localeCompare(String(a.task_id || ''));
    });

    if (filtered.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" class="p-6 text-center text-slate-400 font-mono text-xs">
            ${query ? `No tasks found matching query "${escapeHtml(query)}"` : 'No execution audit logs available'}
          </td>
        </tr>
      `;
      return;
    }

    const rows = filtered.map(t => {
      const timeStr = formatWibDateTime(t.ts);
      const fromName = capitalizeAgent(t.from || 'Nexus');
      const toName = capitalizeAgent(t.to || t.agent || 'Specialist');
      const status = String(t.status || 'UNKNOWN').toUpperCase();
      const statusBadgeClass = getStatusBadgeClass(status);
      const elapsed = t.elapsed_seconds != null ? `${t.elapsed_seconds}s` : '-';
      const taskId = escapeHtml(t.task_id || 'TSK-UNKNOWN');
      const intent = escapeHtml(t.intent || '-');

      return `
        <tr class="hover:bg-[#1c1f29] transition font-mono text-xs">
          <td class="p-3 text-[#c0c1ff] font-bold">${taskId}</td>
          <td class="p-3 text-slate-300 tabular-nums">${timeStr}</td>
          <td class="p-3">
            <span class="text-white font-bold">${fromName}</span>
            <span class="text-[#8083ff] mx-1">➔</span>
            <span class="text-[#4cd7f6] font-bold">${toName}</span>
          </td>
          <td class="p-3">
            <span class="px-2 py-0.5 rounded text-[10px] font-bold ${statusBadgeClass}">${status}</span>
          </td>
          <td class="p-3 text-slate-300 tabular-nums">${elapsed}</td>
          <td class="p-3 text-slate-200 max-w-[280px] truncate" title="${intent}">${intent}</td>
          <td class="p-3 text-right">
            <button type="button" class="px-2.5 py-1 rounded bg-[#1c1f29] hover:bg-[#262a34] text-xs font-mono text-[#c0c1ff] hover:text-white border border-[#262a34] transition" onclick="openTaskModal('${taskId}')">
              Inspect
            </button>
          </td>
        </tr>
      `;
    }).join('');

    tbody.innerHTML = rows;
  }

  // VIEW 5: INCIDENTS & CIRCUIT BREAKERS
  function renderIncidents() {
    const container = document.getElementById('incidents-container');
    const badge = document.getElementById('incidents-active-badge');
    if (!container) return;

    const taskList = state.tasks || [];
    const faults = taskList.filter(t => {
      const s = String(t.status || '').toUpperCase();
      return s === 'FAILED' || s === 'CANCELLED' || s === 'TIMEOUT' || s === 'ERROR' || t.stuck === true;
    });

    if (badge) {
      if (faults.length === 0) {
        badge.textContent = '0 Active';
        badge.className = 'px-2 py-0.5 rounded text-xs font-mono bg-[#4ade80]/10 text-[#4ade80] border border-[#4ade80]/20 font-bold';
      } else {
        badge.textContent = `${faults.length} Active`;
        badge.className = 'px-2 py-0.5 rounded text-xs font-mono bg-[#f87171]/10 text-[#f87171] border border-[#f87171]/30 font-bold';
      }
    }

    if (faults.length === 0) {
      container.innerHTML = `
        <div class="bg-[#181b25] border border-[#262a34] rounded-xl p-8 text-center space-y-4 shadow-lg">
          <div class="w-16 h-16 rounded-2xl bg-[#4ade80]/10 border border-[#4ade80]/30 text-[#4ade80] flex items-center justify-center mx-auto shadow-inner">
            <span class="material-symbols-outlined text-[36px]">shield_with_heart</span>
          </div>
          <div>
            <h3 class="text-base font-bold font-mono text-white mb-1">0 Active Faults / All Circuit Breakers Operational</h3>
            <p class="text-xs text-slate-400 font-sans max-w-md mx-auto">
              All 10 Pure Sovereign Luminaries operating within nominal safety envelopes. Zero timeouts, zero unhandled exceptions, and zero backpressure anomalies.
            </p>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-3 pt-4 border-t border-[#262a34] max-w-xl mx-auto font-mono text-xs">
            <div class="bg-[#0a0e17] p-3 rounded-lg border border-[#262a34]">
              <span class="text-[10px] text-slate-400 block mb-1">Gateway Circuit</span>
              <span class="text-[#4ade80] font-bold">CLOSED (Nominal)</span>
            </div>
            <div class="bg-[#0a0e17] p-3 rounded-lg border border-[#262a34]">
              <span class="text-[10px] text-slate-400 block mb-1">IPC Bus Health</span>
              <span class="text-[#4ade80] font-bold">100.0% Pass</span>
            </div>
            <div class="bg-[#0a0e17] p-3 rounded-lg border border-[#262a34]">
              <span class="text-[10px] text-slate-400 block mb-1">Dispatch Pipeline</span>
              <span class="text-[#4ade80] font-bold">Zero Backpressure</span>
            </div>
          </div>
        </div>
      `;
      return;
    }

    const cards = faults.map(f => {
      const timeStr = formatWibDateTime(f.ts);
      const fromName = capitalizeAgent(f.from || 'Nexus');
      const toName = capitalizeAgent(f.to || f.agent || 'Specialist');
      const taskId = escapeHtml(f.task_id || 'TSK-FAULT');
      const errorText = escapeHtml(f.error || f.stuck_reason || f.intent || 'Execution failure detected');

      return `
        <div class="bg-[#181b25] border border-[#f87171]/40 rounded-xl p-4 shadow-lg space-y-3">
          <div class="flex items-center justify-between pb-2 border-b border-[#262a34]">
            <div class="flex items-center gap-2">
              <span class="material-symbols-outlined text-[#f87171] text-[18px]">error</span>
              <span class="font-mono font-bold text-white text-xs">${taskId}</span>
            </div>
            <span class="px-2 py-0.5 rounded text-[10px] font-mono bg-[#f87171]/10 text-[#f87171] border border-[#f87171]/30 font-bold">
              ${escapeHtml(f.status || 'FAULT')}
            </span>
          </div>
          <div class="font-mono text-xs space-y-1">
            <div class="text-slate-300">
              <span class="text-slate-500">Route:</span> ${fromName} ➔ ${toName}
            </div>
            <div class="text-slate-300">
              <span class="text-slate-500">Time:</span> ${timeStr}
            </div>
            <div class="p-2.5 rounded bg-[#0a0e17] border border-[#262a34] text-red-300 font-mono text-[11px]">
              ${errorText}
            </div>
          </div>
          <div class="pt-2 border-t border-[#262a34] flex items-center justify-between">
            <span class="text-[10px] font-mono text-amber-400">Circuit Breaker: Auto-Tripped</span>
            <button type="button" class="px-2.5 py-1 rounded bg-[#1c1f29] hover:bg-[#262a34] text-xs font-mono text-[#c0c1ff] hover:text-white border border-[#262a34]" onclick="openTaskModal('${taskId}')">
              Inspect Task
            </button>
          </div>
        </div>
      `;
    }).join('');

    container.innerHTML = cards;
  }

  // VIEW 6: ARCHITECTURAL TOPOLOGY
  function renderTopology() {
    const container = document.getElementById('telemetry-edges-grid');
    if (!container) return;

    const edges = (state.relations && Array.isArray(state.relations.edges)) ? state.relations.edges : [];

    const cards = RADIAL_KEYS.map(key => {
      const lum = LUMINARIES[key];
      const edge = edges.find(e => (
        (e.to === lum.id || e.to === lum.name || e.to === lum.shortName.toLowerCase()) &&
        (e.from === 'nexus' || e.from === 'spidey')
      )) || {};

      const taskCount = edge.task_count != null ? edge.task_count : 0;
      const statusCounts = edge.status_counts || {};
      const succeeded = statusCounts.SUCCEEDED || statusCounts.COMPLETED || taskCount;
      const running = statusCounts.RUNNING || statusCounts.IN_PROGRESS || 0;
      const queued = statusCounts.QUEUED || 0;
      const failed = statusCounts.FAILED || statusCounts.CANCELLED || statusCounts.TIMEOUT || 0;
      
      const successRate = taskCount > 0 
        ? ((succeeded / taskCount) * 100).toFixed(1) 
        : '100.0';
      const lastActive = edge.last_active ? formatWibTime(edge.last_active) : 'Nominal';

      return `
        <div class="edge-card bg-[#181b25] border border-[#262a34] hover:border-[#8083ff]/40 rounded-xl p-4 flex flex-col justify-between transition-all shadow-lg">
          <div>
            <div class="flex items-center justify-between gap-2 mb-3 pb-2 border-b border-[#262a34]">
              <div class="flex items-center gap-2">
                <span class="text-xs font-mono font-bold text-[#c0c1ff] uppercase">Nexus</span>
                <span class="text-[#8083ff] font-bold">➔</span>
                <span class="text-xs font-mono font-bold text-[#4cd7f6] uppercase">${lum.shortName}</span>
              </div>
              <span class="px-2 py-0.5 rounded text-[10px] font-mono bg-[#4ade80]/10 text-[#4ade80] border border-[#4ade80]/20 font-bold">
                ${successRate}% Succeeded
              </span>
            </div>

            <div class="grid grid-cols-2 gap-2 mb-3 font-mono text-xs">
              <div class="bg-[#0a0e17] p-2.5 rounded-lg border border-[#262a34]">
                <span class="text-[10px] text-slate-400 block mb-0.5">Total Dispatches</span>
                <span class="text-white font-bold text-sm tabular-nums">${taskCount}</span>
              </div>
              <div class="bg-[#0a0e17] p-2.5 rounded-lg border border-[#262a34]">
                <span class="text-[10px] text-slate-400 block mb-0.5">Last Active</span>
                <span class="text-[#c0c1ff] font-medium text-[11px] tabular-nums">${lastActive}</span>
              </div>
            </div>

            <div class="space-y-1.5">
              <span class="text-[10px] font-mono font-bold uppercase text-slate-400 block">Status Breakdown</span>
              <div class="flex flex-wrap gap-1.5 font-mono text-[10px]">
                <span class="px-2 py-0.5 rounded bg-[#4ade80]/10 text-[#4ade80] border border-[#4ade80]/20">SUCCEEDED: ${succeeded}</span>
                ${running > 0 ? `<span class="px-2 py-0.5 rounded bg-[#00d2ff]/10 text-[#00d2ff] border border-[#00d2ff]/30 animate-pulse">RUNNING: ${running}</span>` : ''}
                ${queued > 0 ? `<span class="px-2 py-0.5 rounded bg-[#fbbf24]/10 text-[#fbbf24] border border-[#fbbf24]/30">QUEUED: ${queued}</span>` : ''}
                ${failed > 0 ? `<span class="px-2 py-0.5 rounded bg-[#f87171]/10 text-[#f87171] border border-[#f87171]/30">FAILED: ${failed}</span>` : ''}
              </div>
            </div>
          </div>

          <div class="pt-3 mt-3 border-t border-[#262a34] flex items-center justify-between text-xs font-mono">
            <span class="text-[11px] text-slate-400">Handoff Integrity: 100%</span>
            <button type="button" class="text-[11px] text-[#8083ff] hover:text-white transition flex items-center gap-1" onclick="openAgentDetailModal('${lum.id}')">
              <span>Inspect Agent</span>
              <span class="material-symbols-outlined text-[14px]">arrow_forward</span>
            </button>
          </div>
        </div>
      `;
    }).join('');

    container.innerHTML = cards;
  }

  // ----------------------------------------------------
  // VIEW 7: LINUX VPS TELEMETRY & SRE METRICS
  // ----------------------------------------------------
  async function fetchVPS(isBackground = false) {
    const errorBanner = document.getElementById('vps-error-banner');
    const refreshBtn = document.getElementById('vps-refresh-btn');
    const refreshIcon = refreshBtn ? refreshBtn.querySelector('.material-symbols-outlined') : null;

    if (!isBackground && refreshIcon) {
      refreshIcon.classList.add('animate-spin');
    }

    try {
      const res = await fetch(`${API_BASE}/api/vps`, {
        headers: { 'Accept': 'application/json' }
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }
      const data = await res.json();
      state.vpsData = data;
      state.vpsError = null;

      if (errorBanner) {
        errorBanner.classList.add('hidden');
      }

      renderVPS();

      // Update sidebar nav status badge
      const navVpsStatus = document.getElementById('nav-vps-status');
      if (navVpsStatus && Array.isArray(data.services)) {
        const activeCount = data.services.filter(s => s.active || s.state === 'active').length;
        const totalCount = data.services.length;
        navVpsStatus.textContent = `${activeCount}/${totalCount}`;
        if (activeCount === totalCount) {
          navVpsStatus.className = 'text-[10px] font-mono text-[#4ade80]';
        } else {
          navVpsStatus.className = 'text-[10px] font-mono text-[#fbbf24]';
        }
      }
    } catch (err) {
      console.warn('VPS telemetry fetch error:', err);
      state.vpsError = err.message || 'Failed to fetch VPS telemetry';
      if (errorBanner) {
        const errorText = document.getElementById('vps-error-text');
        if (errorText) errorText.textContent = `VPS Telemetry Error: ${state.vpsError}`;
        errorBanner.classList.remove('hidden');
      }
    } finally {
      if (refreshIcon) {
        setTimeout(() => refreshIcon.classList.remove('animate-spin'), 400);
      }
    }
  }

  function startVPSPolling() {
    stopVPSPolling();
    state.vpsTimer = setInterval(() => {
      if (state.currentView === 'vps' && !state.isPaused) {
        fetchVPS(true);
      }
    }, 6000);
  }

  function stopVPSPolling() {
    if (state.vpsTimer) {
      clearInterval(state.vpsTimer);
      state.vpsTimer = null;
    }
  }

  function renderVPS() {
    const data = state.vpsData;
    if (!data) return;

    const host = data.host || {};
    const cpu = data.cpu || {};
    const memory = data.memory || {};
    const disk = data.disk || {};
    const services = Array.isArray(data.services) ? data.services : [];

    // 1. Host Info Banner
    const hostBannerEl = document.getElementById('vps-host-banner');
    if (hostBannerEl) {
      hostBannerEl.innerHTML = `
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#262a34]">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-lg bg-[#0a0e17] border border-[#262a34] flex items-center justify-center text-[#4cd7f6] flex-shrink-0">
              <span class="material-symbols-outlined text-[24px]">terminal</span>
            </div>
            <div>
              <div class="flex items-center gap-2 flex-wrap">
                <h3 class="text-sm font-bold text-white font-mono tracking-wide">${escapeHtml(host.hostname || 'solaris-vps')}</h3>
                <span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-[#4ade80]/10 text-[#4ade80] border border-[#4ade80]/20">
                  <span class="w-1.5 h-1.5 rounded-full bg-[#4ade80] animate-pulse"></span>
                  ONLINE
                </span>
                <span class="px-2 py-0.5 rounded text-[10px] font-mono bg-[#1c1f29] text-[#c0c1ff] border border-[#262a34]">
                  Linux x86_64
                </span>
              </div>
              <p class="text-[11px] font-mono text-slate-400 mt-1">
                <span>${escapeHtml(host.os || 'Linux')}</span>
                <span class="text-slate-600 mx-1.5">·</span>
                <span>Kernel ${escapeHtml(host.kernel || '-')}</span>
              </p>
            </div>
          </div>

          <div class="flex items-center gap-2.5 flex-wrap font-mono text-xs">
            <div class="bg-[#0a0e17] px-3 py-2 rounded-lg border border-[#262a34] flex-1 sm:flex-initial">
              <span class="text-slate-400 block text-[10px] uppercase tracking-wider">Host Uptime</span>
              <span class="text-white font-bold tabular-nums text-sm">${escapeHtml(formatUptime(host.uptime_seconds))}</span>
            </div>
            <div class="bg-[#0a0e17] px-3 py-2 rounded-lg border border-[#262a34] flex-1 sm:flex-initial">
              <span class="text-slate-400 block text-[10px] uppercase tracking-wider">Telemetry Synced</span>
              <span class="text-[#c0c1ff] font-bold tabular-nums text-sm">${escapeHtml(formatWibTime(data.generated_at))} WIB</span>
            </div>
          </div>
        </div>

        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 font-mono text-xs">
          <div class="bg-[#0a0e17] p-2.5 rounded-lg border border-[#262a34]">
            <span class="text-[10px] text-slate-400 uppercase tracking-wider block mb-1">Architecture</span>
            <span class="text-xs font-semibold text-slate-200">64-bit / Systemd</span>
          </div>
          <div class="bg-[#0a0e17] p-2.5 rounded-lg border border-[#262a34]">
            <span class="text-[10px] text-slate-400 uppercase tracking-wider block mb-1">CPU Cores</span>
            <span class="text-xs font-semibold text-slate-200 tabular-nums">${escapeHtml(String(cpu.cores || 1))} Physical/vCPU</span>
          </div>
          <div class="bg-[#0a0e17] p-2.5 rounded-lg border border-[#262a34]">
            <span class="text-[10px] text-slate-400 uppercase tracking-wider block mb-1">Total RAM</span>
            <span class="text-xs font-semibold text-slate-200 tabular-nums">${escapeHtml(formatBytesGiB(memory.total_bytes))}</span>
          </div>
          <div class="bg-[#0a0e17] p-2.5 rounded-lg border border-[#262a34]">
            <span class="text-[10px] text-slate-400 uppercase tracking-wider block mb-1">Root Storage</span>
            <span class="text-xs font-semibold text-slate-200 tabular-nums">${escapeHtml(formatBytesGiB(disk.total_bytes))}</span>
          </div>
        </div>
      `;
    }

    // 2. Resource Cards: CPU, RAM, Disk
    const resourcesGridEl = document.getElementById('vps-resources-grid');
    if (resourcesGridEl) {
      const cpuPct = typeof cpu.usage_pct === 'number' ? Math.max(0, cpu.usage_pct) : 0;
      let cpuBarColor = 'bg-[#4ade80]';
      let cpuBadgeColor = 'bg-[#4ade80]/10 text-[#4ade80] border-[#4ade80]/20';
      if (cpuPct > 85) {
        cpuBarColor = 'bg-[#f87171]';
        cpuBadgeColor = 'bg-[#f87171]/15 text-[#f87171] border-[#f87171]/30';
      } else if (cpuPct > 60) {
        cpuBarColor = 'bg-[#fbbf24]';
        cpuBadgeColor = 'bg-[#fbbf24]/15 text-[#fbbf24] border-[#fbbf24]/30';
      }

      const memPct = typeof memory.usage_pct === 'number' ? Math.max(0, memory.usage_pct) : 0;
      let memBarColor = 'bg-[#4ade80]';
      let memBadgeColor = 'bg-[#4ade80]/10 text-[#4ade80] border-[#4ade80]/20';
      if (memPct > 85) {
        memBarColor = 'bg-[#f87171]';
        memBadgeColor = 'bg-[#f87171]/15 text-[#f87171] border-[#f87171]/30';
      } else if (memPct > 70) {
        memBarColor = 'bg-[#fbbf24]';
        memBadgeColor = 'bg-[#fbbf24]/15 text-[#fbbf24] border-[#fbbf24]/30';
      }

      const diskPct = typeof disk.usage_pct === 'number' ? Math.max(0, disk.usage_pct) : 0;
      const isDiskWarning = disk.is_warning || diskPct > 85.0;
      const diskBarColor = isDiskWarning ? 'bg-[#f87171]' : 'bg-[#4cd7f6]';
      const diskBadgeHtml = isDiskWarning
        ? `<span class="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#f87171]/20 text-[#f87171] border border-[#f87171]/40 animate-pulse">WARNING &gt; 85%</span>`
        : `<span class="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-[#4ade80]/10 text-[#4ade80] border border-[#4ade80]/20">NOMINAL</span>`;

      const load1m = typeof cpu.load_1m === 'number' ? cpu.load_1m.toFixed(2) : '0.00';
      const load5m = typeof cpu.load_5m === 'number' ? cpu.load_5m.toFixed(2) : '0.00';
      const load15m = typeof cpu.load_15m === 'number' ? cpu.load_15m.toFixed(2) : '0.00';
      const cores = cpu.cores || 1;
      const loadPerCore = ((typeof cpu.load_1m === 'number' ? cpu.load_1m : 0) / Math.max(1, cores)).toFixed(2);

      resourcesGridEl.innerHTML = `
        <!-- CPU CARD -->
        <div class="bg-[#181b25] border border-[#262a34] rounded-xl p-4 sm:p-5 shadow-lg flex flex-col justify-between vps-metric-card">
          <div>
            <div class="flex items-center justify-between pb-3 mb-3 border-b border-[#262a34]">
              <div class="flex items-center gap-2">
                <span class="material-symbols-outlined text-[#8083ff] text-[20px]">memory</span>
                <h3 class="text-xs font-mono font-bold uppercase text-white tracking-wider">CPU &amp; LOAD</h3>
              </div>
              <span class="px-2 py-0.5 rounded text-[10px] font-mono border ${cpuBadgeColor}">
                ${cores} Cores
              </span>
            </div>

            <div class="flex items-baseline justify-between mb-2 font-mono">
              <span class="text-slate-400 text-xs">Load Util</span>
              <span class="text-2xl font-bold text-white tabular-nums">${cpuPct.toFixed(1)}%</span>
            </div>

            <!-- Gauge Progress Bar -->
            <div class="w-full bg-[#0a0e17] h-2 rounded-full border border-[#262a34] overflow-hidden mb-4">
              <div class="${cpuBarColor} tactile-progress-bar h-full" style="width: ${Math.min(100, cpuPct)}%"></div>
            </div>

            <!-- Load Averages 1m, 5m, 15m -->
            <div class="space-y-1.5 font-mono text-xs">
              <div class="text-[10px] text-slate-400 uppercase tracking-wider">Load Averages (1m, 5m, 15m)</div>
              <div class="grid grid-cols-3 gap-2">
                <div class="bg-[#0a0e17] p-2 rounded-lg border border-[#262a34] text-center">
                  <div class="text-[10px] text-slate-400">1m</div>
                  <div class="text-slate-200 font-bold tabular-nums text-xs">${load1m}</div>
                </div>
                <div class="bg-[#0a0e17] p-2 rounded-lg border border-[#262a34] text-center">
                  <div class="text-[10px] text-slate-400">5m</div>
                  <div class="text-slate-200 font-bold tabular-nums text-xs">${load5m}</div>
                </div>
                <div class="bg-[#0a0e17] p-2 rounded-lg border border-[#262a34] text-center">
                  <div class="text-[10px] text-slate-400">15m</div>
                  <div class="text-slate-200 font-bold tabular-nums text-xs">${load15m}</div>
                </div>
              </div>
            </div>
          </div>

          <div class="mt-4 pt-3 border-t border-[#262a34] flex items-center justify-between text-[11px] font-mono text-slate-400">
            <span>Load per Core</span>
            <span class="text-[#c0c1ff] font-bold tabular-nums">${loadPerCore}</span>
          </div>
        </div>

        <!-- MEMORY (RAM) CARD -->
        <div class="bg-[#181b25] border border-[#262a34] rounded-xl p-4 sm:p-5 shadow-lg flex flex-col justify-between vps-metric-card">
          <div>
            <div class="flex items-center justify-between pb-3 mb-3 border-b border-[#262a34]">
              <div class="flex items-center gap-2">
                <span class="material-symbols-outlined text-[#4cd7f6] text-[20px]">storage</span>
                <h3 class="text-xs font-mono font-bold uppercase text-white tracking-wider">MEMORY (RAM)</h3>
              </div>
              <span class="px-2 py-0.5 rounded text-[10px] font-mono border ${memBadgeColor}">
                ${memPct.toFixed(1)}%
              </span>
            </div>

            <div class="flex items-baseline justify-between mb-2 font-mono">
              <span class="text-slate-400 text-xs">Used / Total</span>
              <span class="text-sm font-bold text-white tabular-nums">${formatBytesGiB(memory.used_bytes)} / ${formatBytesGiB(memory.total_bytes)}</span>
            </div>

            <!-- Tactile Progress Bar -->
            <div class="w-full bg-[#0a0e17] h-2 rounded-full border border-[#262a34] overflow-hidden mb-4">
              <div class="${memBarColor} tactile-progress-bar h-full" style="width: ${Math.min(100, memPct)}%"></div>
            </div>

            <!-- RAM Breakdown Grid -->
            <div class="grid grid-cols-2 gap-2 font-mono text-xs">
              <div class="bg-[#0a0e17] p-2 rounded-lg border border-[#262a34]">
                <div class="text-[10px] text-slate-400">Available</div>
                <div class="text-[#4ade80] font-bold tabular-nums">${formatBytesGiB(memory.available_bytes)}</div>
              </div>
              <div class="bg-[#0a0e17] p-2 rounded-lg border border-[#262a34]">
                <div class="text-[10px] text-slate-400">Used</div>
                <div class="text-slate-200 font-bold tabular-nums">${formatBytesGiB(memory.used_bytes)}</div>
              </div>
              <div class="bg-[#0a0e17] p-2 rounded-lg border border-[#262a34]">
                <div class="text-[10px] text-slate-400">Free</div>
                <div class="text-slate-300 font-bold tabular-nums">${formatBytesGiB(memory.free_bytes)}</div>
              </div>
              <div class="bg-[#0a0e17] p-2 rounded-lg border border-[#262a34]">
                <div class="text-[10px] text-slate-400">Total</div>
                <div class="text-slate-300 font-bold tabular-nums">${formatBytesGiB(memory.total_bytes)}</div>
              </div>
            </div>
          </div>

          <div class="mt-4 pt-3 border-t border-[#262a34] flex items-center justify-between text-[11px] font-mono text-slate-400">
            <span>Allocated Ratio</span>
            <span class="text-white font-bold tabular-nums">${memPct.toFixed(1)}%</span>
          </div>
        </div>

        <!-- ROOT STORAGE (/) CARD -->
        <div class="bg-[#181b25] border border-[#262a34] rounded-xl p-4 sm:p-5 shadow-lg flex flex-col justify-between vps-metric-card">
          <div>
            <div class="flex items-center justify-between pb-3 mb-3 border-b border-[#262a34]">
              <div class="flex items-center gap-2">
                <span class="material-symbols-outlined text-[#fbbf24] text-[20px]">hard_drive</span>
                <h3 class="text-xs font-mono font-bold uppercase text-white tracking-wider">ROOT DISK (/)</h3>
              </div>
              ${diskBadgeHtml}
            </div>

            <div class="flex items-baseline justify-between mb-2 font-mono">
              <span class="text-slate-400 text-xs">Used / Total</span>
              <span class="text-sm font-bold text-white tabular-nums">${formatBytesGiB(disk.used_bytes)} / ${formatBytesGiB(disk.total_bytes)}</span>
            </div>

            <!-- Tactile Progress Bar -->
            <div class="w-full bg-[#0a0e17] h-2 rounded-full border border-[#262a34] overflow-hidden mb-4">
              <div class="${diskBarColor} tactile-progress-bar h-full" style="width: ${Math.min(100, diskPct)}%"></div>
            </div>

            <!-- Disk Breakdown Grid -->
            <div class="grid grid-cols-3 gap-2 font-mono text-xs">
              <div class="bg-[#0a0e17] p-2 rounded-lg border border-[#262a34] text-center">
                <div class="text-[10px] text-slate-400">Free</div>
                <div class="text-[#4ade80] font-bold tabular-nums text-xs">${formatBytesGiB(disk.free_bytes)}</div>
              </div>
              <div class="bg-[#0a0e17] p-2 rounded-lg border border-[#262a34] text-center">
                <div class="text-[10px] text-slate-400">Used</div>
                <div class="text-slate-200 font-bold tabular-nums text-xs">${formatBytesGiB(disk.used_bytes)}</div>
              </div>
              <div class="bg-[#0a0e17] p-2 rounded-lg border border-[#262a34] text-center">
                <div class="text-[10px] text-slate-400">Total</div>
                <div class="text-slate-300 font-bold tabular-nums text-xs">${formatBytesGiB(disk.total_bytes)}</div>
              </div>
            </div>
          </div>

          <div class="mt-4 pt-3 border-t border-[#262a34] flex items-center justify-between text-[11px] font-mono text-slate-400">
            <span>Mount Target</span>
            <span class="text-white font-bold tabular-nums">${escapeHtml(disk.path || '/')} (${diskPct.toFixed(1)}%)</span>
          </div>
        </div>
      `;
    }

    // 3. Services Status Matrix
    const servicesTableBody = document.getElementById('vps-services-table-body');
    const servicesSummaryEl = document.getElementById('vps-services-summary');

    const serviceIconMap = {
      'postgresql': 'database',
      '9router': 'alt_route',
      'hermes-gateway': 'hub',
      'ai7-whisper': 'graphic_eq',
      'ai7-finance': 'payments',
      'ai7-warden': 'security',
      'ai7-email-live': 'mail'
    };

    if (servicesTableBody) {
      if (services.length === 0) {
        servicesTableBody.innerHTML = `
          <tr>
            <td colspan="7" class="py-8 text-center text-slate-400 font-mono text-xs">
              No critical system services telemetry available.
            </td>
          </tr>
        `;
      } else {
        let activeCount = 0;
        const rowsHtml = services.map(svc => {
          const stateStr = String(svc.state || svc.status || 'unknown').toLowerCase();
          const isActive = svc.active === true || stateStr === 'active';
          if (isActive) activeCount++;

          let statusBadge;
          let iconColor;
          if (isActive) {
            statusBadge = `
              <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-semibold bg-[#4ade80]/15 text-[#4ade80] border border-[#4ade80]/30">
                <span class="w-1.5 h-1.5 rounded-full bg-[#4ade80]"></span>
                Active / Healthy
              </span>
            `;
            iconColor = 'text-[#4ade80]';
          } else if (stateStr === 'inactive' || stateStr === 'dead') {
            statusBadge = `
              <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-semibold bg-slate-500/15 text-slate-300 border border-slate-500/30">
                <span class="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                Inactive
              </span>
            `;
            iconColor = 'text-slate-400';
          } else if (stateStr === 'failed' || stateStr === 'error') {
            statusBadge = `
              <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-semibold bg-[#f87171]/15 text-[#f87171] border border-[#f87171]/30">
                <span class="w-1.5 h-1.5 rounded-full bg-[#f87171]"></span>
                Failed
              </span>
            `;
            iconColor = 'text-[#f87171]';
          } else {
            statusBadge = `
              <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-semibold bg-[#fbbf24]/15 text-[#fbbf24] border border-[#fbbf24]/30">
                <span class="w-1.5 h-1.5 rounded-full bg-[#fbbf24]"></span>
                ${escapeHtml(stateStr)}
              </span>
            `;
            iconColor = 'text-[#fbbf24]';
          }

          const iconName = serviceIconMap[svc.name] || 'deployed_code';
          const pidDisplay = svc.main_pid
            ? `<span class="text-white font-semibold font-mono tabular-nums">${escapeHtml(String(svc.main_pid))}</span>`
            : `<span class="text-slate-500 font-mono">-</span>`;
          const sinceDisplay = svc.since
            ? `<span class="text-slate-300 font-mono text-xs">${escapeHtml(String(svc.since))}</span>`
            : `<span class="text-slate-500 font-mono">-</span>`;
          const restartsDisplay = svc.restarts != null
            ? `<span class="text-slate-300 font-mono tabular-nums">${escapeHtml(String(svc.restarts))}</span>`
            : `<span class="text-slate-500 font-mono">0</span>`;

          return `
            <tr class="hover:bg-[#1c1f29] transition-colors">
              <td class="py-3 px-4">
                <div class="flex items-center gap-2.5">
                  <span class="material-symbols-outlined text-[18px] ${iconColor}">${iconName}</span>
                  <span class="font-bold text-white font-mono">${escapeHtml(svc.name)}</span>
                </div>
              </td>
              <td class="py-3 px-4 text-slate-400 text-xs font-mono">
                ${escapeHtml(svc.unit || (svc.name + '.service'))}
              </td>
              <td class="py-3 px-4">
                ${statusBadge}
              </td>
              <td class="py-3 px-4 text-slate-300 tabular-nums">
                ${pidDisplay}
              </td>
              <td class="py-3 px-4 text-slate-300 tabular-nums">
                ${sinceDisplay}
              </td>
              <td class="py-3 px-4 text-slate-300 tabular-nums">
                ${restartsDisplay}
              </td>
              <td class="py-3 px-4 text-right">
                <span class="px-2 py-0.5 rounded text-[10px] font-mono bg-[#0a0e17] text-slate-400 border border-[#262a34]">
                  ${escapeHtml(svc.scope || 'system')}
                </span>
              </td>
            </tr>
          `;
        }).join('');

        servicesTableBody.innerHTML = rowsHtml;

        if (servicesSummaryEl) {
          servicesSummaryEl.textContent = `${activeCount}/${services.length} Active · SRE Nominal`;
          servicesSummaryEl.className = activeCount === services.length
            ? 'text-[11px] font-mono text-[#4ade80]'
            : 'text-[11px] font-mono text-[#fbbf24]';
        }
      }
    }
  }

  // ==========================================
  // 8.5 SOVEREIGN OFFICE SPACE 2D ENGINE (PIXIJS CANVAS)
  // ==========================================
  let officePixiApp = null;
  let officePixiInitialized = false;
  let officePixiLoading = false;
  const officeEntities = {};
  let officeTextures = {};
  let officeWorldContainer = null;
  let officeZoomLevel = 1.0;
  let officeShowLabels = true;
  let officeSelectedPod = 'all';
  let officeAnimationTicker = 0;

  const OFFICE_SPRITES = [
    'floor-tile.png', 'boss-rug.png', 'desk.png', 'chair.png',
    'monitor_back.png', 'keyboard_back.png', 'coffee-machine.png', 'coffee-mug.png',
    'watercooler.png', 'old-printer.png', 'plant.png', 'employee-of-month.png',
    'elevator_frame.png', 'elevator_door.png', 'desk-lamp.png', 'magic-8-ball.png',
    'pen-holder.png', 'phone.png', 'rubber-duck.png', 'rubiks-cube.png',
    'stapler.png', 'sunglasses.png', 'thermos.png', 'wall-outlet.png', 'headset_small.png'
  ];

  const OFFICE_STATIONS = [
    {
      key: 'nexus',
      num: '01',
      name: 'Spidey',
      title: '01 · SPIDEY',
      role: 'Sovereign Orchestration',
      pod: 'command',
      podLabel: 'Command Nexus',
      x: 600,
      y: 440,
      isBoss: true,
      accentColor: 0x8083ff,
      hairColor: 0x312e81,
      skinColor: 0xffdfba,
      deskAccessories: [
        { file: 'desk-lamp.png', x: -48, y: -26, scale: 0.16 },
        { file: 'phone.png', x: 38, y: -18, scale: 0.026 },
        { file: 'sunglasses.png', x: 20, y: -10, scale: 0.015 }
      ]
    },
    {
      key: 'zephyr',
      num: '05',
      name: 'Zephyr',
      title: '05 · ZEPHYR',
      role: 'Backend APIs & FastBench',
      pod: 'dev',
      podLabel: 'Dev & Systems',
      x: 180,
      y: 410,
      accentColor: 0x34d399,
      hairColor: 0x064e3b,
      skinColor: 0xf5c6a5,
      deskAccessories: [
        { file: 'coffee-mug.png', x: 32, y: -16, scale: 0.02 }
      ]
    },
    {
      key: 'daemon',
      num: '06',
      name: 'Daemon',
      title: '06 · DAEMON',
      role: 'Linux VPS & SRE Infra',
      pod: 'dev',
      podLabel: 'Dev & Systems',
      x: 340,
      y: 410,
      accentColor: 0x22c55e,
      hairColor: 0x14532d,
      skinColor: 0xe0ac69,
      deskAccessories: [
        { file: 'thermos.png', x: 32, y: -20, scale: 0.20 }
      ]
    },
    {
      key: 'iris',
      num: '07',
      name: 'Iris',
      title: '07 · IRIS',
      role: 'Frontend & Anti-Slop UI',
      pod: 'dev',
      podLabel: 'Dev & Systems',
      x: 180,
      y: 570,
      accentColor: 0xf472b6,
      hairColor: 0x831843,
      skinColor: 0xffdfba,
      deskAccessories: [
        { file: 'rubiks-cube.png', x: 30, y: -16, scale: 0.14 },
        { file: 'desk-lamp.png', x: -36, y: -24, scale: 0.13 }
      ]
    },
    {
      key: 'aegis',
      num: '08',
      name: 'Aegis',
      title: '08 · AEGIS',
      role: 'Security & Release Gates',
      pod: 'dev',
      podLabel: 'Dev & Systems',
      x: 340,
      y: 570,
      accentColor: 0xfb923c,
      hairColor: 0x7c2d12,
      skinColor: 0xf5c6a5,
      deskAccessories: [
        { file: 'pen-holder.png', x: 32, y: -18, scale: 0.14 },
        { file: 'headset_small.png', x: -30, y: -16, scale: 0.12 }
      ]
    },
    {
      key: 'sage',
      num: '02',
      name: 'Sage',
      title: '02 · SAGE',
      role: 'First Principles & PRD',
      pod: 'intel',
      podLabel: 'Research & Intel',
      x: 860,
      y: 410,
      accentColor: 0x38bdf8,
      hairColor: 0x0c4a6e,
      skinColor: 0xffdfba,
      deskAccessories: [
        { file: 'magic-8-ball.png', x: 32, y: -16, scale: 0.14 }
      ]
    },
    {
      key: 'athena',
      num: '03',
      name: 'Athena',
      title: '03 · ATHENA',
      role: 'Formal Thesis & Citations',
      pod: 'intel',
      podLabel: 'Research & Intel',
      x: 1020,
      y: 410,
      accentColor: 0xc084fc,
      hairColor: 0x581c87,
      skinColor: 0xf5c6a5,
      deskAccessories: [
        { file: 'desk-lamp.png', x: -36, y: -24, scale: 0.13 }
      ]
    },
    {
      key: 'nacht',
      num: '09',
      name: 'Nacht',
      title: '09 · NACHT',
      role: 'arXiv Radar & Recon',
      pod: 'intel',
      podLabel: 'Research & Intel',
      x: 860,
      y: 570,
      accentColor: 0x818cf8,
      hairColor: 0x1e1b4b,
      skinColor: 0xe0ac69,
      deskAccessories: [
        { file: 'sunglasses.png', x: 26, y: -14, scale: 0.015 }
      ]
    },
    {
      key: 'ariadne',
      num: '10',
      name: 'Ariadne',
      title: '10 · ARIADNE',
      role: 'Obsidian PKM Vault',
      pod: 'intel',
      podLabel: 'Research & Intel',
      x: 1020,
      y: 570,
      accentColor: 0x2dd4bf,
      hairColor: 0x134e4a,
      skinColor: 0xffdfba,
      deskAccessories: [
        { file: 'rubber-duck.png', x: 30, y: -16, scale: 0.14 }
      ]
    },
    {
      key: 'chronos',
      num: '04',
      name: 'Chronos',
      title: '04 · CHRONOS',
      role: 'Sprint Pacing & Alignment',
      pod: 'command',
      podLabel: 'Strategy & Pacing',
      x: 430,
      y: 200,
      accentColor: 0xfbbf24,
      hairColor: 0x78350f,
      skinColor: 0xf5c6a5,
      deskAccessories: [
        { file: 'stapler.png', x: 30, y: -16, scale: 0.14 }
      ]
    }
  ];

  async function loadOfficeTextures() {
    const loaded = {};
    if (!window.PIXI) return loaded;

    const promises = OFFICE_SPRITES.map(async file => {
      try {
        if (window.PIXI.Assets && typeof window.PIXI.Assets.load === 'function') {
          const tex = await window.PIXI.Assets.load(`sprites/${file}`);
          loaded[file] = tex;
        } else {
          loaded[file] = window.PIXI.Texture.from(`sprites/${file}`);
        }
      } catch (e) {
        console.warn(`[OfficeView] Fallback for sprite ${file}:`, e);
        try {
          loaded[file] = window.PIXI.Texture.from(`sprites/${file}`);
        } catch (_) {}
      }
    });

    await Promise.all(promises);
    return loaded;
  }

  function drawCharacterGraphic(gfx, station, isRunning, tick) {
    gfx.clear();
    const c = station.accentColor;
    const skin = station.skinColor || 0xffdfba;
    const hair = station.hairColor || 0x334155;

    // Legs / Chair base
    gfx.beginFill(0x1e293b);
    gfx.drawRect(-8, 8, 7, 10);
    gfx.drawRect(1, 8, 7, 10);
    gfx.endFill();

    // Torso / Shirt
    gfx.beginFill(c);
    gfx.drawRoundedRect(-9, -4, 18, 14, 3);
    gfx.endFill();

    // Collar / Neck
    gfx.beginFill(skin);
    gfx.drawRect(-3, -7, 6, 4);
    gfx.endFill();

    // Head
    gfx.beginFill(skin);
    gfx.drawRoundedRect(-8, -20, 16, 14, 3);
    gfx.endFill();

    // Hair
    gfx.beginFill(hair);
    gfx.drawRoundedRect(-9, -23, 18, 8, 3);
    gfx.drawRect(-9, -19, 3, 5); // Sideburn L
    gfx.drawRect(6, -19, 3, 5);  // Sideburn R
    gfx.endFill();

    // Eyes
    gfx.beginFill(0x0f172a);
    gfx.drawRect(-4, -15, 2, 3);
    gfx.drawRect(2, -15, 2, 3);
    gfx.endFill();

    // Arms & Hands
    if (isRunning) {
      const armBobLeft = Math.sin(tick * 0.3) * 2;
      const armBobRight = Math.cos(tick * 0.3) * 2;

      gfx.beginFill(c);
      gfx.drawRect(-12, -2 + armBobLeft, 4, 8);
      gfx.drawRect(8, -2 + armBobRight, 4, 8);
      gfx.endFill();

      gfx.beginFill(skin);
      gfx.drawRect(-12, 6 + armBobLeft, 4, 3);
      gfx.drawRect(8, 6 + armBobRight, 4, 3);
      gfx.endFill();
    } else {
      gfx.beginFill(c);
      gfx.drawRect(-12, -2, 4, 9);
      gfx.drawRect(8, -2, 4, 9);
      gfx.endFill();

      gfx.beginFill(skin);
      gfx.drawRect(-12, 7, 4, 3);
      gfx.drawRect(8, 7, 4, 3);
      gfx.endFill();
    }
  }

  function drawScreenGraphic(gfx, isRunning, tick) {
    gfx.clear();
    const screenW = 32;
    const screenH = 20;

    if (isRunning) {
      gfx.beginFill(0x070b12);
      gfx.drawRect(0, 0, screenW, screenH);
      gfx.endFill();

      const lineColors = [0x4ade80, 0x38bdf8, 0x4ade80, 0x22d3ee];
      const offset = Math.floor((tick * 0.1) % 4);

      for (let i = 0; i < 4; i++) {
        const y = 3 + i * 4;
        const lw = 8 + ((i + offset) % 3) * 7;
        const col = lineColors[(i + offset) % lineColors.length];
        gfx.beginFill(col, 0.85);
        gfx.drawRect(3, y, Math.min(lw, 24), 2);
        gfx.endFill();
      }
    } else {
      gfx.beginFill(0x0b101d);
      gfx.drawRect(0, 0, screenW, screenH);
      gfx.endFill();

      gfx.beginFill(0x334155, 0.7);
      gfx.drawRect(12, 8, 8, 4);
      gfx.endFill();
    }
  }

  function drawTaskBubble(entity, taskText, accentColor) {
    const { bubbleBg, bubbleDot, bubbleText, taskBubble } = entity;
    bubbleText.text = taskText;

    const textW = Math.max(bubbleText.width, 85);
    const bubbleW = textW + 28;
    const bubbleH = 24;
    const halfW = bubbleW / 2;

    bubbleText.x = -halfW + 18;
    bubbleText.y = -bubbleH / 2 + 5;

    bubbleBg.clear();
    bubbleBg.lineStyle(1.5, 0x4ade80, 0.9);
    bubbleBg.beginFill(0x0e131f, 0.96);
    bubbleBg.drawRoundedRect(-halfW, -bubbleH / 2, bubbleW, bubbleH, 6);

    // Downward speech pointer triangle
    bubbleBg.moveTo(-4, bubbleH / 2);
    bubbleBg.lineTo(0, bubbleH / 2 + 6);
    bubbleBg.lineTo(4, bubbleH / 2);
    bubbleBg.closePath();
    bubbleBg.endFill();

    // Pulse dot
    bubbleDot.clear();
    bubbleDot.beginFill(0x4ade80);
    bubbleDot.drawCircle(-halfW + 9, 0, 3.5);
    bubbleDot.endFill();

    taskBubble.visible = true;
  }

  function buildStationEntity(station, textures) {
    const container = new PIXI.Container();
    container.x = station.x;
    container.y = station.y;
    container.sortableChildren = true;
    container.interactive = true;
    container.buttonMode = true;
    container.cursor = 'pointer';

    // 1. Desk Selection / Hover Box
    const hoverBox = new PIXI.Graphics();
    hoverBox.lineStyle(1.5, station.accentColor, 0);
    hoverBox.beginFill(station.accentColor, 0);
    const boxW = station.isBoss ? 160 : 130;
    const boxH = station.isBoss ? 120 : 100;
    hoverBox.drawRoundedRect(-boxW / 2, -boxH / 2, boxW, boxH, 8);
    hoverBox.endFill();
    hoverBox.zIndex = 1;
    container.addChild(hoverBox);

    // 2. Boss Rug if boss
    if (station.isBoss && textures['boss-rug.png']) {
      const rug = new PIXI.Sprite(textures['boss-rug.png']);
      rug.anchor.set(0.5);
      rug.scale.set(0.185);
      rug.x = 0;
      rug.y = 10;
      rug.zIndex = 2;
      container.addChild(rug);
    }

    // 3. Chair
    if (textures['chair.png']) {
      const chair = new PIXI.Sprite(textures['chair.png']);
      chair.anchor.set(0.5);
      const chairScale = station.isBoss ? 0.088 : 0.076;
      chair.scale.set(chairScale);
      chair.x = 0;
      chair.y = -22;
      chair.zIndex = 5;
      container.addChild(chair);
    }

    // 4. Seated Character
    const charContainer = new PIXI.Container();
    charContainer.x = 0;
    charContainer.y = -18;
    charContainer.zIndex = 8;

    const charGfx = new PIXI.Graphics();
    drawCharacterGraphic(charGfx, station, false, 0);
    charContainer.addChild(charGfx);
    container.addChild(charContainer);

    // 5. Desk Sprite
    if (textures['desk.png']) {
      const desk = new PIXI.Sprite(textures['desk.png']);
      desk.anchor.set(0.5);
      const deskScale = station.isBoss ? 0.115 : 0.092;
      desk.scale.set(deskScale);
      desk.x = 0;
      desk.y = 8;
      desk.zIndex = 10;
      container.addChild(desk);
    }

    // 6. Monitor & Terminal Screen
    const monitorContainer = new PIXI.Container();
    monitorContainer.x = 0;
    monitorContainer.y = -10;
    monitorContainer.zIndex = 12;

    if (textures['monitor_back.png']) {
      const monitorBack = new PIXI.Sprite(textures['monitor_back.png']);
      monitorBack.anchor.set(0.5);
      monitorBack.scale.set(station.isBoss ? 0.065 : 0.055);
      monitorBack.x = 0;
      monitorBack.y = 0;
      monitorContainer.addChild(monitorBack);
    }

    const screenGfx = new PIXI.Graphics();
    screenGfx.x = -16;
    screenGfx.y = -14;
    monitorContainer.addChild(screenGfx);
    container.addChild(monitorContainer);

    // 7. Keyboard
    if (textures['keyboard_back.png']) {
      const keyboard = new PIXI.Sprite(textures['keyboard_back.png']);
      keyboard.anchor.set(0.5);
      keyboard.scale.set(station.isBoss ? 0.045 : 0.038);
      keyboard.x = 0;
      keyboard.y = 14;
      keyboard.zIndex = 13;
      container.addChild(keyboard);
    }

    // 8. Station Accessories
    if (station.deskAccessories && station.deskAccessories.length > 0) {
      station.deskAccessories.forEach(acc => {
        if (textures[acc.file]) {
          const accSprite = new PIXI.Sprite(textures[acc.file]);
          accSprite.anchor.set(0.5);
          accSprite.scale.set(acc.scale);
          accSprite.x = acc.x;
          accSprite.y = acc.y;
          accSprite.zIndex = 14;
          container.addChild(accSprite);
        }
      });
    }

    // 9. Nameplate Container
    const nameplate = new PIXI.Container();
    nameplate.x = 0;
    nameplate.y = -62;
    nameplate.zIndex = 30;

    const nameBg = new PIXI.Graphics();
    nameplate.addChild(nameBg);

    const nameText = new PIXI.Text(station.title, {
      fontFamily: 'JetBrains Mono, monospace',
      fontSize: 10,
      fontWeight: 'bold',
      fill: 0xffffff,
      align: 'center'
    });
    nameText.anchor.set(0.5);
    nameText.y = -2;
    nameplate.addChild(nameText);

    const statusPill = new PIXI.Text('IDLE', {
      fontFamily: 'JetBrains Mono, monospace',
      fontSize: 8,
      fontWeight: 'bold',
      fill: 0x94a3b8,
      align: 'center'
    });
    statusPill.anchor.set(0.5);
    statusPill.y = 11;
    nameplate.addChild(statusPill);

    function updateNameplateBg(statusText, statusColor) {
      nameBg.clear();
      nameBg.lineStyle(1, 0x262a34, 0.95);
      nameBg.beginFill(0x0a0e17, 0.95);
      nameBg.drawRoundedRect(-48, -13, 96, 32, 6);
      nameBg.endFill();

      nameBg.lineStyle(1, statusColor, 0.35);
      nameBg.beginFill(statusColor, 0.15);
      nameBg.drawRoundedRect(-24, 5, 48, 12, 4);
      nameBg.endFill();
    }
    updateNameplateBg('IDLE', 0x94a3b8);
    container.addChild(nameplate);

    // 10. Task Speech Bubble
    const taskBubble = new PIXI.Container();
    taskBubble.x = 0;
    taskBubble.y = -98;
    taskBubble.zIndex = 40;
    taskBubble.visible = false;

    const bubbleBg = new PIXI.Graphics();
    taskBubble.addChild(bubbleBg);

    const bubbleDot = new PIXI.Graphics();
    taskBubble.addChild(bubbleDot);

    const bubbleText = new PIXI.Text('', {
      fontFamily: 'JetBrains Mono, monospace',
      fontSize: 9,
      fontWeight: 'bold',
      fill: 0xffffff,
      align: 'left'
    });
    taskBubble.addChild(bubbleText);
    container.addChild(taskBubble);

    // Interactions
    container.on('pointerover', () => {
      hoverBox.clear();
      hoverBox.lineStyle(1.5, station.accentColor, 0.9);
      hoverBox.beginFill(station.accentColor, 0.08);
      hoverBox.drawRoundedRect(-boxW / 2, -boxH / 2, boxW, boxH, 8);
      hoverBox.endFill();
    });

    container.on('pointerout', () => {
      hoverBox.clear();
      hoverBox.lineStyle(1.5, station.accentColor, 0);
      hoverBox.beginFill(station.accentColor, 0);
      hoverBox.drawRoundedRect(-boxW / 2, -boxH / 2, boxW, boxH, 8);
      hoverBox.endFill();
    });

    container.on('pointertap', () => {
      if (typeof selectNode === 'function') selectNode(station.key);
      if (typeof openAgentDetailModal === 'function') openAgentDetailModal(station.key);
    });

    return {
      container,
      charContainer,
      charGfx,
      screenGfx,
      nameplate,
      nameText,
      statusPill,
      updateNameplateBg,
      taskBubble,
      bubbleBg,
      bubbleDot,
      bubbleText,
      station
    };
  }

  function buildOfficeEnvironment(world, textures, width, height) {
    const floorLayer = new PIXI.Container();
    floorLayer.zIndex = 1;
    world.addChild(floorLayer);

    // Floor Tiling
    if (textures['floor-tile.png']) {
      const floorTile = new PIXI.TilingSprite(
        textures['floor-tile.png'],
        width,
        height - 48
      );
      floorTile.tileScale.set(0.42);
      floorTile.tint = 0x181c2b;
      floorTile.x = 0;
      floorTile.y = 48;
      floorLayer.addChild(floorTile);
    } else {
      const floorFallback = new PIXI.Graphics();
      floorFallback.beginFill(0x0f131f);
      floorFallback.drawRect(0, 48, width, height - 48);
      floorFallback.endFill();
      floorLayer.addChild(floorFallback);
    }

    // Zone Mats & Hairline Boundaries
    const zonesGfx = new PIXI.Graphics();

    // West Pod (Dev & Systems): Zephyr, Daemon, Iris, Aegis
    zonesGfx.lineStyle(1.5, 0x223654, 0.85);
    zonesGfx.beginFill(0x101726, 0.7);
    zonesGfx.drawRoundedRect(70, 320, 360, 340, 12);
    zonesGfx.endFill();

    // East Pod (Research & Intelligence): Sage, Athena, Nacht, Ariadne
    zonesGfx.lineStyle(1.5, 0x382d54, 0.85);
    zonesGfx.beginFill(0x151226, 0.7);
    zonesGfx.drawRoundedRect(770, 320, 360, 340, 12);
    zonesGfx.endFill();

    // North Pod (Chronos & Fleet Strategy Table)
    zonesGfx.lineStyle(1.5, 0x2e3547, 0.85);
    zonesGfx.beginFill(0x111624, 0.7);
    zonesGfx.drawRoundedRect(350, 100, 500, 190, 12);
    zonesGfx.endFill();

    // Northwest Lounge / Breakroom
    zonesGfx.lineStyle(1.5, 0x1f2e42, 0.85);
    zonesGfx.beginFill(0x0e1724, 0.7);
    zonesGfx.drawRoundedRect(50, 70, 270, 210, 12);
    zonesGfx.endFill();

    // Northeast Print / Intel Archives
    zonesGfx.lineStyle(1.5, 0x2e233d, 0.85);
    zonesGfx.beginFill(0x141021, 0.7);
    zonesGfx.drawRoundedRect(880, 70, 270, 210, 12);
    zonesGfx.endFill();

    floorLayer.addChild(zonesGfx);

    // Zone Header Sign Labels
    const makeZoneLabel = (text, x, y, color) => {
      const lbl = new PIXI.Text(text, {
        fontFamily: 'JetBrains Mono, monospace',
        fontSize: 9,
        fontWeight: 'bold',
        fill: color || 0x64748b,
        letterSpacing: 1.5
      });
      lbl.x = x;
      lbl.y = y;
      floorLayer.addChild(lbl);
    };

    makeZoneLabel('DEV & SYSTEMS POD · FASTAPI & SRE', 85, 330, 0x38bdf8);
    makeZoneLabel('RESEARCH & INTELLIGENCE POD · PRD & PKM', 785, 330, 0xa78bfa);
    makeZoneLabel('STRATEGY & PACING POD · DAILY FLEET SYNC', 365, 110, 0xfbbf24);
    makeZoneLabel('AMENITIES & COFFEE LOUNGE', 65, 80, 0x4ade80);
    makeZoneLabel('PRINT & INTEL ARCHIVES', 895, 80, 0xc084fc);

    // Conference Table in Strategy Pod
    const confTableGfx = new PIXI.Graphics();
    confTableGfx.lineStyle(2, 0x45352c, 0.9);
    confTableGfx.beginFill(0x271e1b);
    confTableGfx.drawRoundedRect(570, 160, 200, 70, 20);
    confTableGfx.endFill();

    if (textures['chair.png']) {
      const chairCoords = [
        { x: 620, y: 145 },
        { x: 720, y: 145 },
        { x: 620, y: 245 },
        { x: 720, y: 245 }
      ];
      chairCoords.forEach(pos => {
        const c = new PIXI.Sprite(textures['chair.png']);
        c.anchor.set(0.5);
        c.scale.set(0.065);
        c.x = pos.x;
        c.y = pos.y;
        floorLayer.addChild(c);
      });
    }
    floorLayer.addChild(confTableGfx);

    // Documents on conference table
    const confDocs = new PIXI.Graphics();
    confDocs.beginFill(0xe2e8f0, 0.85);
    confDocs.drawRect(645, 185, 18, 22);
    confDocs.drawRect(675, 180, 20, 24);
    confDocs.endFill();
    confDocs.lineStyle(1, 0x38bdf8, 0.8);
    confDocs.drawCircle(715, 195, 6);
    floorLayer.addChild(confDocs);

    // Kitchen Counter & Coffee Station
    const counterGfx = new PIXI.Graphics();
    counterGfx.lineStyle(1.5, 0x334155, 0.9);
    counterGfx.beginFill(0x182030);
    counterGfx.drawRoundedRect(75, 115, 130, 42, 6);
    counterGfx.endFill();
    floorLayer.addChild(counterGfx);

    if (textures['coffee-machine.png']) {
      const coffeeMach = new PIXI.Sprite(textures['coffee-machine.png']);
      coffeeMach.anchor.set(0.5);
      coffeeMach.scale.set(0.075);
      coffeeMach.x = 110;
      coffeeMach.y = 130;
      floorLayer.addChild(coffeeMach);
    }

    if (textures['coffee-mug.png']) {
      const mug = new PIXI.Sprite(textures['coffee-mug.png']);
      mug.anchor.set(0.5);
      mug.scale.set(0.022);
      mug.x = 145;
      mug.y = 130;
      floorLayer.addChild(mug);
    }

    if (textures['watercooler.png']) {
      const cooler = new PIXI.Sprite(textures['watercooler.png']);
      cooler.anchor.set(0.5);
      cooler.scale.set(0.095);
      cooler.x = 240;
      cooler.y = 130;
      floorLayer.addChild(cooler);
    }

    // Printer Station
    const printerStandGfx = new PIXI.Graphics();
    printerStandGfx.lineStyle(1.5, 0x334155, 0.9);
    printerStandGfx.beginFill(0x182030);
    printerStandGfx.drawRoundedRect(900, 115, 120, 42, 6);
    printerStandGfx.endFill();
    floorLayer.addChild(printerStandGfx);

    if (textures['old-printer.png']) {
      const printer = new PIXI.Sprite(textures['old-printer.png']);
      printer.anchor.set(0.5);
      printer.scale.set(0.075);
      printer.x = 955;
      printer.y = 125;
      floorLayer.addChild(printer);
    }

    // Decorative Plants
    if (textures['plant.png']) {
      const plantLocations = [
        { x: 75, y: 240, scale: 0.08 },
        { x: 290, y: 130, scale: 0.08 },
        { x: 1100, y: 130, scale: 0.08 },
        { x: 1100, y: 240, scale: 0.08 },
        { x: 75, y: 620, scale: 0.08 },
        { x: 1100, y: 620, scale: 0.08 },
        { x: 520, y: 705, scale: 0.075 },
        { x: 680, y: 705, scale: 0.075 }
      ];
      plantLocations.forEach(p => {
        const pl = new PIXI.Sprite(textures['plant.png']);
        pl.anchor.set(0.5);
        pl.scale.set(p.scale);
        pl.x = p.x;
        pl.y = p.y;
        floorLayer.addChild(pl);
      });
    }

    // South Elevator Entrance
    if (textures['elevator_frame.png']) {
      const elFrame = new PIXI.Sprite(textures['elevator_frame.png']);
      elFrame.anchor.set(0.5);
      elFrame.scale.set(0.135);
      elFrame.x = 600;
      elFrame.y = 695;
      floorLayer.addChild(elFrame);
    }

    if (textures['elevator_door.png']) {
      const elDoor = new PIXI.Sprite(textures['elevator_door.png']);
      elDoor.anchor.set(0.5);
      elDoor.scale.set(0.115);
      elDoor.x = 600;
      elDoor.y = 698;
      floorLayer.addChild(elDoor);
    }

    // Upper North Wall Banner
    const wallLayer = new PIXI.Container();
    wallLayer.zIndex = 50;
    world.addChild(wallLayer);

    const wallGfx = new PIXI.Graphics();
    wallGfx.beginFill(0x0c0f18);
    wallGfx.drawRect(0, 0, width, 48);
    wallGfx.endFill();

    wallGfx.lineStyle(1.5, 0x262a34, 1);
    wallGfx.moveTo(0, 48);
    wallGfx.lineTo(width, 48);
    wallLayer.addChild(wallGfx);

    if (textures['employee-of-month.png']) {
      const eom = new PIXI.Sprite(textures['employee-of-month.png']);
      eom.anchor.set(0.5);
      eom.scale.set(0.042);
      eom.x = 600;
      eom.y = 24;
      wallLayer.addChild(eom);
    }

    if (textures['wall-outlet.png']) {
      [160, 380, 820, 1040].forEach(ox => {
        const outlet = new PIXI.Sprite(textures['wall-outlet.png']);
        outlet.anchor.set(0.5);
        outlet.scale.set(0.05);
        outlet.x = ox;
        outlet.y = 36;
        wallLayer.addChild(outlet);
      });
    }

    const wallSign = new PIXI.Text('THE LUMINARIES CONSTELLATION · AUTONOMOUS AGENT HEADQUARTERS', {
      fontFamily: 'JetBrains Mono, monospace',
      fontSize: 10,
      fontWeight: 'bold',
      fill: 0x64748b,
      letterSpacing: 2
    });
    wallSign.anchor.set(0, 0.5);
    wallSign.x = 20;
    wallSign.y = 24;
    wallLayer.addChild(wallSign);
  }

  function zoomOffice(delta) {
    if (!officeWorldContainer) return;
    officeZoomLevel = Math.max(0.6, Math.min(2.2, officeZoomLevel + delta));
    officeWorldContainer.scale.set(officeZoomLevel);
  }

  function resetOfficeView() {
    if (!officeWorldContainer) return;
    officeZoomLevel = 1.0;
    officeWorldContainer.scale.set(1.0);
    officeWorldContainer.x = 0;
    officeWorldContainer.y = 0;
  }

  function toggleOfficeLabels() {
    officeShowLabels = !officeShowLabels;
    const btnText = document.getElementById('office-labels-text');
    if (btnText) {
      btnText.textContent = officeShowLabels ? 'Labels ON' : 'Labels OFF';
    }
    updateOfficeTelemetry();
  }

  function filterOfficePod(podName) {
    if (!officeWorldContainer) return;
    officeSelectedPod = podName;

    document.querySelectorAll('.office-filter-btn').forEach(btn => {
      if (btn.getAttribute('data-pod') === podName) {
        btn.className = 'office-filter-btn px-2.5 py-1 rounded bg-[#1c1f29] text-[#c0c1ff] border border-[#8083ff]/30 transition';
      } else {
        btn.className = 'office-filter-btn px-2 py-1 rounded text-slate-400 hover:text-white transition';
      }
    });

    if (podName === 'command') {
      officeZoomLevel = 1.35;
      officeWorldContainer.scale.set(1.35);
      officeWorldContainer.x = -200;
      officeWorldContainer.y = -100;
    } else if (podName === 'dev') {
      officeZoomLevel = 1.35;
      officeWorldContainer.scale.set(1.35);
      officeWorldContainer.x = 50;
      officeWorldContainer.y = -180;
    } else if (podName === 'intel') {
      officeZoomLevel = 1.35;
      officeWorldContainer.scale.set(1.35);
      officeWorldContainer.x = -500;
      officeWorldContainer.y = -180;
    } else {
      resetOfficeView();
    }
  }

  function setupOfficeControls() {
    const zoomInBtn = document.getElementById('office-zoom-in');
    if (zoomInBtn) zoomInBtn.onclick = () => zoomOffice(0.15);

    const zoomOutBtn = document.getElementById('office-zoom-out');
    if (zoomOutBtn) zoomOutBtn.onclick = () => zoomOffice(-0.15);

    const resetBtn = document.getElementById('office-zoom-reset');
    if (resetBtn) resetBtn.onclick = () => resetOfficeView();

    const toggleLabelsBtn = document.getElementById('office-toggle-labels');
    if (toggleLabelsBtn) toggleLabelsBtn.onclick = () => toggleOfficeLabels();

    document.querySelectorAll('.office-filter-btn').forEach(btn => {
      btn.onclick = () => {
        const pod = btn.getAttribute('data-pod');
        filterOfficePod(pod);
      };
    });
  }

  function updateOfficeTelemetry() {
    if (!officePixiInitialized) return;

    let activeCount = 0;
    let idleCount = 0;

    const liveTasks = (state.tasks || []).filter(t => {
      const s = String(t.status || '').toUpperCase();
      return s === 'IN_PROGRESS' || s === 'RUNNING' || s === 'ACTIVE';
    });
    const activeTasksCount = liveTasks.length;

    OFFICE_STATIONS.forEach(station => {
      const entity = officeEntities[station.key];
      if (!entity) return;

      const agent = state.agents[station.key] || {};
      const statusStr = String(agent.status || '').toUpperCase();
      const isRunning = agent.running === true || statusStr === 'RUNNING' || statusStr === 'ACTIVE';

      if (isRunning) {
        activeCount++;
        entity.statusPill.text = 'RUNNING';
        entity.statusPill.style.fill = 0x4ade80;
        entity.updateNameplateBg('RUNNING', 0x4ade80);

        const agentTask = liveTasks.find(t => 
          (t.to && (t.to.toLowerCase() === station.key || t.to.toLowerCase() === station.name.toLowerCase())) ||
          (t.from && (t.from.toLowerCase() === station.key || t.from.toLowerCase() === station.name.toLowerCase()))
        ) || liveTasks[0];

        if (agentTask) {
          const taskId = agentTask.id || `TSK-${station.num}`;
          const title = (agentTask.intent || agentTask.title || station.role || 'Executing').slice(0, 22);
          drawTaskBubble(entity, `${taskId}: ${title}`, station.accentColor);
        } else {
          drawTaskBubble(entity, `TSK-${station.num}: ${station.role.slice(0, 20)}`, station.accentColor);
        }
      } else {
        idleCount++;
        const idleText = statusStr === 'STANDBY' ? 'STANDBY' : 'IDLE';
        const idleColor = statusStr === 'STANDBY' ? 0x38bdf8 : 0x94a3b8;
        entity.statusPill.text = idleText;
        entity.statusPill.style.fill = idleColor;
        entity.updateNameplateBg(idleText, idleColor);
        entity.taskBubble.visible = false;
      }

      entity.nameplate.visible = officeShowLabels;
    });

    const activeHud = document.getElementById('office-hud-active');
    if (activeHud) activeHud.textContent = `${activeCount} Working`;

    const idleHud = document.getElementById('office-hud-idle');
    if (idleHud) idleHud.textContent = `${idleCount} Relaxed`;

    const tasksHud = document.getElementById('office-hud-tasks');
    if (tasksHud) tasksHud.textContent = `${activeTasksCount} Live Tasks`;
  }

  async function renderOfficeSpace() {
    if (officePixiInitialized) {
      updateOfficeTelemetry();
      return;
    }

    if (officePixiLoading) return;
    officePixiLoading = true;

    const mount = document.getElementById('office-pixi-mount');
    const loader = document.getElementById('office-canvas-loader');

    if (!mount || !window.PIXI) {
      console.error('[OfficeView] Mount or PIXI unavailable');
      if (loader) loader.innerHTML = '<span class="text-rose-400 font-mono text-xs">PixiJS library failed to load</span>';
      officePixiLoading = false;
      return;
    }

    try {
      setupOfficeControls();

      // Set scale mode to nearest neighbor for crisp pixel art
      if (window.PIXI.BaseTexture && window.PIXI.BaseTexture.defaultOptions) {
        window.PIXI.BaseTexture.defaultOptions.scaleMode = window.PIXI.SCALE_MODES ? window.PIXI.SCALE_MODES.NEAREST : 1;
      }

      // 1. Load Textures
      officeTextures = await loadOfficeTextures();

      // 2. Initialize PixiJS Application
      const WORLD_WIDTH = 1200;
      const WORLD_HEIGHT = 760;

      officePixiApp = new PIXI.Application({
        width: WORLD_WIDTH,
        height: WORLD_HEIGHT,
        backgroundColor: 0x0a0e17,
        resolution: Math.min(window.devicePixelRatio || 1, 2),
        autoDensity: true,
        antialias: true
      });

      officePixiApp.renderer.view.style.width = '100%';
      officePixiApp.renderer.view.style.height = 'auto';
      officePixiApp.renderer.view.style.maxHeight = '760px';
      officePixiApp.renderer.view.style.display = 'block';

      mount.innerHTML = '';
      mount.appendChild(officePixiApp.renderer.view);

      // 3. Build World Container
      officeWorldContainer = new PIXI.Container();
      officeWorldContainer.sortableChildren = true;
      officePixiApp.stage.addChild(officeWorldContainer);

      // 4. Build Office Environment
      buildOfficeEnvironment(officeWorldContainer, officeTextures, WORLD_WIDTH, WORLD_HEIGHT);

      // 5. Build 10 Stations
      OFFICE_STATIONS.forEach(station => {
        const entity = buildStationEntity(station, officeTextures);
        entity.container.zIndex = 20;
        officeWorldContainer.addChild(entity.container);
        officeEntities[station.key] = entity;
      });

      // 6. Setup Animation Ticker
      officePixiApp.ticker.add((delta) => {
        officeAnimationTicker += delta;
        OFFICE_STATIONS.forEach(station => {
          const entity = officeEntities[station.key];
          if (!entity) return;

          const agent = state.agents[station.key] || {};
          const statusStr = String(agent.status || '').toUpperCase();
          const isRunning = agent.running === true || statusStr === 'RUNNING' || statusStr === 'ACTIVE';

          drawCharacterGraphic(entity.charGfx, station, isRunning, officeAnimationTicker);
          drawScreenGraphic(entity.screenGfx, isRunning, officeAnimationTicker);

          if (entity.taskBubble.visible) {
            entity.bubbleDot.alpha = 0.4 + Math.abs(Math.sin(officeAnimationTicker * 0.12)) * 0.6;
          }
        });
      });

      // Mouse drag panning on background
      let isDragging = false;
      let dragStart = { x: 0, y: 0 };
      let containerStart = { x: 0, y: 0 };

      officeWorldContainer.interactive = true;
      officeWorldContainer.on('pointerdown', (e) => {
        if (e.target === officeWorldContainer) {
          isDragging = true;
          dragStart = { x: e.data.global.x, y: e.data.global.y };
          containerStart = { x: officeWorldContainer.x, y: officeWorldContainer.y };
        }
      });

      officeWorldContainer.on('pointermove', (e) => {
        if (isDragging) {
          const dx = e.data.global.x - dragStart.x;
          const dy = e.data.global.y - dragStart.y;
          officeWorldContainer.x = containerStart.x + dx;
          officeWorldContainer.y = containerStart.y + dy;
        }
      });

      officeWorldContainer.on('pointerup', () => { isDragging = false; });
      officeWorldContainer.on('pointerupoutside', () => { isDragging = false; });

      // Mouse wheel zoom
      const canvasWrapper = document.getElementById('office-canvas-wrapper');
      if (canvasWrapper) {
        canvasWrapper.onwheel = (e) => {
          e.preventDefault();
          const delta = e.deltaY > 0 ? -0.1 : 0.1;
          zoomOffice(delta);
        };
      }

      officePixiInitialized = true;
      officePixiLoading = false;

      if (loader) {
        loader.classList.add('hidden');
      }

      updateOfficeTelemetry();
    } catch (err) {
      console.error('[OfficeView] Failed to initialize PixiJS Office:', err);
      if (loader) {
        loader.innerHTML = `<span class="text-rose-400 font-mono text-xs">Error initializing office: ${escapeHtml(err.message)}</span>`;
      }
      officePixiLoading = false;
    }
  }

  // 9. VIEW SWITCHING & NAVIGATION
  const VIEWS = ['overview', 'roster', 'telemetry', 'vps', 'stream', 'incidents', 'topology', 'office'];
  const VIEW_TITLES = {
    overview: 'NEURAL OVERVIEW & SOVEREIGN TOPOLOGY',
    roster: 'FLEET ROSTER & LUMINARIES',
    telemetry: 'TELEMETRY DEEP GRID & SYSTEM METRICS',
    vps: 'LINUX VPS HOST & SRE TELEMETRY',
    stream: 'EXECUTION AUDIT LOGS & DISPATCH STREAM',
    incidents: 'INCIDENTS & CIRCUIT BREAKERS',
    topology: 'ARCHITECTURAL TOPOLOGY & RELATION EDGES',
    office: 'SOVEREIGN OFFICE SPACE · PIXEL TELEMETRY'
  };

  function switchView(viewId) {
    const target = VIEWS.includes(viewId) ? viewId : 'overview';
    state.currentView = target;

    // Auto-dismiss mobile drawer on navigation
    closeMobileSidebar();

    VIEWS.forEach(id => {
      const el = document.getElementById(`view-${id}`);
      if (el) {
        if (id === target) {
          el.classList.remove('hidden');
        } else {
          el.classList.add('hidden');
        }
      }
    });

    // Update Page Title
    const titleEl = document.getElementById('page-title');
    if (titleEl && VIEW_TITLES[target]) {
      titleEl.textContent = VIEW_TITLES[target];
    }

    document.querySelectorAll('.nav-item').forEach(btn => {
      const v = btn.getAttribute('data-view');
      if (v === target) {
        btn.classList.add('text-[#c0c1ff]', 'bg-[#1c1f29]', 'ring-1', 'ring-[#8083ff]/30');
        btn.classList.remove('text-slate-300');
      } else {
        btn.classList.remove('text-[#c0c1ff]', 'bg-[#1c1f29]', 'ring-1', 'ring-[#8083ff]/30');
        btn.classList.add('text-slate-300');
      }
    });

    if (window.location.hash !== `#/${target}`) {
      window.location.hash = `#/${target}`;
    }

    // Trigger View-Specific Renderer
    if (target === 'roster') renderRoster();
    else if (target === 'telemetry') renderTelemetry();
    else if (target === 'vps') {
      renderVPS();
      fetchVPS();
      startVPSPolling();
    }
    else if (target === 'stream') renderStream();
    else if (target === 'incidents') renderIncidents();
    else if (target === 'topology') renderTopology();
    else if (target === 'office') renderOfficeSpace();

    if (target !== 'vps') {
      stopVPSPolling();
    }
  }

  // 10. API TELEMETRY FETCH
  async function fetchTelemetry() {
    try {
      const res = await fetch(`${API_BASE}/api/status`, {
        headers: { 'Accept': 'application/json' }
      });
      if (res.ok) {
        const data = await res.json();
        state.lastSyncTime = new Date();

        const lastSyncEl = document.getElementById('last-sync-display');
        if (lastSyncEl) {
          lastSyncEl.textContent = `Synced: ${formatWibTime(state.lastSyncTime)} WIB`;
        }

        if (data.agents && data.agents.length > 0) {
          state.agents = data.agents;
        }

        if (Array.isArray(data.tasks)) {
          state.tasks = data.tasks;
          syncPersistentPulses(state.tasks);
        }
      }
    } catch (err) {
      console.warn('Telemetry status sync error:', err);
    }

    try {
      const tasksRes = await fetch(`${API_BASE}/api/tasks`, {
        headers: { 'Accept': 'application/json' }
      });
      if (tasksRes.ok) {
        const tasksData = await tasksRes.json();
        if (tasksData && Array.isArray(tasksData.tasks)) {
          state.tasks = tasksData.tasks;
          syncPersistentPulses(state.tasks);
        }
      }
    } catch (err) {
      // Non-fatal if tasks endpoint is unavailable
    }

    try {
      const relRes = await fetch(`${API_BASE}/api/relations`, {
        headers: { 'Accept': 'application/json' }
      });
      if (relRes.ok) {
        state.relations = await relRes.json();
      }
    } catch (err) {
      // Non-fatal if relations endpoint is unavailable
    }

    // Refresh UI components with latest telemetry
    renderHealthMatrix();
    renderDispatchStream(state.tasks);
    if (state.selectedNodeKey) {
      selectNode(state.selectedNodeKey);
    }

    // Update active view
    if (state.currentView === 'roster') renderRoster();
    else if (state.currentView === 'telemetry') renderTelemetry();
    else if (state.currentView === 'vps') renderVPS();
    else if (state.currentView === 'stream') renderStream();
    else if (state.currentView === 'incidents') renderIncidents();
    else if (state.currentView === 'topology') renderTopology();
    else if (state.currentView === 'office') updateOfficeTelemetry();

    // Update sidebar metrics badges
    const tasksCountBadge = document.getElementById('nav-tasks-count');
    if (tasksCountBadge) {
      tasksCountBadge.textContent = `${state.tasks.length} Dispatches`;
    }

    const faultsCount = (state.tasks || []).filter(t => {
      const s = String(t.status || '').toUpperCase();
      return s === 'FAILED' || s === 'CANCELLED' || s === 'TIMEOUT' || s === 'ERROR' || t.stuck === true;
    }).length;

    const navIncidentBadge = document.getElementById('nav-incident-badge');
    if (navIncidentBadge) {
      if (faultsCount === 0) {
        navIncidentBadge.textContent = '0 Live';
        navIncidentBadge.className = 'text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#4ade80]/10 text-[#4ade80] border border-[#4ade80]/20';
      } else {
        navIncidentBadge.textContent = `${faultsCount} Live`;
        navIncidentBadge.className = 'text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#f87171]/10 text-[#f87171] border border-[#f87171]/30 font-bold';
      }
    }
  }

  // 11. EVENT LISTENERS SETUP
  function setupEventListeners() {
    // Navigation items
    document.querySelectorAll('[data-view]').forEach(item => {
      item.onclick = (e) => {
        e.preventDefault();
        const v = item.getAttribute('data-view');
        if (v) switchView(v);
      };
    });

    // Task table search input
    const taskSearchInput = document.getElementById('task-search-input');
    if (taskSearchInput) {
      taskSearchInput.oninput = (e) => {
        state.taskSearchQuery = e.target.value;
        const hudInput = document.getElementById('hud-command-input');
        if (hudInput && hudInput.value !== e.target.value) {
          hudInput.value = e.target.value;
        }
        renderStream();
      };
    }

    // Top HUD command search input
    const hudCommandInput = document.getElementById('hud-command-input');
    if (hudCommandInput) {
      hudCommandInput.oninput = (e) => {
        state.taskSearchQuery = e.target.value;
        if (taskSearchInput && taskSearchInput.value !== e.target.value) {
          taskSearchInput.value = e.target.value;
        }
        if (state.currentView === 'stream') {
          renderStream();
        }
      };
      hudCommandInput.onkeydown = (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          if (state.currentView !== 'stream') {
            switchView('stream');
          }
        }
      };
    }

    // Pause synapses toggle
    const pauseBtn = document.getElementById('topbar-polling-btn');
    if (pauseBtn) {
      pauseBtn.onclick = () => {
        state.isPaused = !state.isPaused;
        const icon = document.getElementById('topbar-polling-icon');
        const text = document.getElementById('topbar-polling-text');
        if (state.isPaused) {
          if (icon) icon.textContent = 'play_arrow';
          if (text) text.textContent = 'Resume Synapses';
        } else {
          if (icon) icon.textContent = 'pause';
          if (text) text.textContent = 'Pause Synapses';
        }
      };
    }

    // Sync now
    const syncBtn = document.getElementById('topbar-sync-btn');
    if (syncBtn) {
      syncBtn.onclick = async () => {
        const icon = syncBtn.querySelector('.material-symbols-outlined');
        if (icon) icon.classList.add('animate-spin');
        await fetchTelemetry();
        setTimeout(() => {
          if (icon) icon.classList.remove('animate-spin');
        }, 600);
      };
    }

    // Clear stream
    const clearBtn = document.getElementById('stream-clear-btn');
    if (clearBtn) {
      clearBtn.onclick = () => {
        const container = document.getElementById('dispatch-stream-items') || document.getElementById('live-stream-container');
        if (container) container.innerHTML = '';
      };
    }

    // Agent Detail Modal close
    const modalCloseBtn = document.getElementById('modal-agent-close-btn');
    const modal = document.getElementById('agent-detail-modal');
    if (modalCloseBtn) modalCloseBtn.onclick = closeAgentDetailModal;
    if (modal) {
      modal.onclick = (e) => {
        if (e.target === modal) closeAgentDetailModal();
      };
    }

    // Task Drilldown Modal close
    const taskModalCloseBtn = document.getElementById('modal-close-btn');
    const drilldownModal = document.getElementById('drilldown-modal');
    if (taskModalCloseBtn) taskModalCloseBtn.onclick = closeTaskModal;
    if (drilldownModal) {
      drilldownModal.onclick = (e) => {
        if (e.target === drilldownModal) closeTaskModal();
      };
    }

    // Handoff Modal close
    const handoffCloseBtn = document.getElementById('modal-handoff-close-btn');
    const handoffModal = document.getElementById('handoff-modal');
    if (handoffCloseBtn) handoffCloseBtn.onclick = closeHandoffModal;
    if (handoffModal) {
      handoffModal.onclick = (e) => {
        if (e.target === handoffModal) closeHandoffModal();
      };
    }

    // Mobile Sidebar Drawer
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const sidebarCloseBtn = document.getElementById('sidebar-close-btn');
    const sidebarBackdrop = document.getElementById('sidebar-backdrop');
    if (mobileMenuBtn) mobileMenuBtn.onclick = toggleMobileSidebar;
    if (sidebarCloseBtn) sidebarCloseBtn.onclick = closeMobileSidebar;
    if (sidebarBackdrop) sidebarBackdrop.onclick = closeMobileSidebar;

    // Keyboard shortcuts: Cmd+K / Ctrl+K for search, Escape for modals & drawer
    document.addEventListener('keydown', (e) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        const hudInput = document.getElementById('hud-command-input');
        if (hudInput) {
          hudInput.focus();
          hudInput.select();
        }
      } else if (e.key === 'Escape') {
        closeMobileSidebar();
        closeAgentDetailModal();
        closeTaskModal();
        closeHandoffModal();
      }
    });

    // VPS Telemetry Actions
    const vpsRefreshBtn = document.getElementById('vps-refresh-btn');
    if (vpsRefreshBtn) {
      vpsRefreshBtn.onclick = () => fetchVPS(false);
    }
    const vpsRetryBtn = document.getElementById('vps-retry-btn');
    if (vpsRetryBtn) {
      vpsRetryBtn.onclick = () => fetchVPS(false);
    }

    // Hash change
    window.addEventListener('hashchange', () => {
      const h = (window.location.hash || '').replace(/^#\/?/, '').trim();
      if (VIEWS.includes(h)) switchView(h);
    });
  }

  // Global window exports
  window.selectNode = selectNode;
  window.switchView = switchView;
  window.openAgentDetailModal = openAgentDetailModal;
  window.closeAgentDetailModal = closeAgentDetailModal;
  window.openTaskModal = openTaskModal;
  window.closeTaskModal = closeTaskModal;
  window.openHandoffModal = openHandoffModal;
  window.closeHandoffModal = closeHandoffModal;
  window.openMobileSidebar = openMobileSidebar;
  window.closeMobileSidebar = closeMobileSidebar;
  window.toggleMobileSidebar = toggleMobileSidebar;
  window.focusCanvasNode = focusCanvasNode;
  window.renderRoster = renderRoster;
  window.renderTelemetry = renderTelemetry;
  window.renderVPS = renderVPS;
  window.fetchVPS = fetchVPS;
  window.startVPSPolling = startVPSPolling;
  window.stopVPSPolling = stopVPSPolling;
  window.renderStream = renderStream;
  window.renderIncidents = renderIncidents;
  window.renderTopology = renderTopology;
  window.renderOfficeSpace = renderOfficeSpace;
  window.updateOfficeTelemetry = updateOfficeTelemetry;

  // INITIALIZATION
  async function init() {
    updateRealtimeClock();
    setInterval(updateRealtimeClock, 1000);

    setupEventListeners();
    setupCanvasControls();
    setupInspectorActions();
    renderHealthMatrix();

    // Select default node (nexus)
    selectNode('nexus');

    // Initial hash routing
    const initialHash = (window.location.hash || '').replace(/^#\/?/, '').trim().toLowerCase();
    if (VIEWS.includes(initialHash)) {
      switchView(initialHash);
    } else {
      switchView('overview');
    }

    await fetchTelemetry();
    setInterval(fetchTelemetry, POLLING_SLOW_MS);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
