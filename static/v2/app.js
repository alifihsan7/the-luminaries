/**
 * AI7 Solaris — Exception-First Operational Console (v2)
 * Pure Vanilla JavaScript Client Architecture
 * Anti-Slop, Zero-CDN, Resilient Offline Degradation, Thumb Ergonomics
 * Iris (Lead UI/UX Artisan & Frontend Architect)
 */

(function () {
  'use strict';

  // --- Configuration & Constants ---
  const CONFIG = {
    pollIntervalMs: 3000,
    staleThresholdMs: 12000,
    apiStatusUrl: '/api/status',
    apiTasksUrl: '/api/tasks',
  };

  // --- Scalable Vector Icons (Zero-CDN, Immune to Missing System Fonts) ---
  const ICONS = {
    copy: '<svg class="copy-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>',
    check: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"></polyline></svg>',
    alert: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>',
    x: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>',
    bolt: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>',
    star: '<svg class="agent-kind-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>',
    satellite: '<svg class="agent-kind-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"></path></svg>',
    luminary: '<svg class="agent-kind-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2" transform="rotate(45 12 12)"></rect></svg>',
    history: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 14 14"></polyline></svg>'
  };

  // --- Application State ---
  const state = {
    fleetData: null,
    tasksData: null,
    lastSuccessfulSync: null,
    lastPayloadHash: null,
    isPollingActive: true,
    pollTimer: null,
    watchdogTimer: null,
    isFetching: false,
    networkErrorCount: 0,
    
    // UI Filters
    exceptionFilter: 'all', // 'all' | 'live' | 'historical'
    fleetFilter: 'all', // 'all' | 'active' | 'anomalies'
    taskStatusFilter: 'all', // 'all' | 'stuck' | 'failed' | 'running' | 'unverified'
    taskAgentFilter: 'all',
    taskSearchQuery: '',
  };

  // --- DOM Elements Cache ---
  const dom = {
    srAnnouncements: document.getElementById('sr-announcements'),
    connectionPill: document.getElementById('connection-pill'),
    connectionLabel: document.getElementById('connection-label'),
    syncClock: document.getElementById('sync-clock'),
    staleBanner: document.getElementById('stale-banner'),
    staleMessage: document.getElementById('stale-message'),
    offlineBanner: document.getElementById('offline-banner'),
    offlineMessage: document.getElementById('offline-message'),
    bannerReconnectBtn: document.getElementById('banner-reconnect-btn'),
    bannerRetryBtn: document.getElementById('banner-retry-btn'),
    
    // Exception Deck
    exceptionTotalBadge: document.getElementById('exception-total-badge'),
    exceptionsContainer: document.getElementById('exceptions-container'),
    exFilterAll: document.getElementById('ex-filter-all'),
    exFilterLive: document.getElementById('ex-filter-live'),
    exFilterHistorical: document.getElementById('ex-filter-historical'),
    
    // Fleet Matrix
    fleetStatsBadge: document.getElementById('fleet-stats-badge'),
    fleetGrid: document.getElementById('fleet-grid'),
    fleetFilterButtons: document.querySelectorAll('[data-fleet-filter]'),
    
    // Task Stream
    taskCountBadge: document.getElementById('task-count-badge'),
    taskStream: document.getElementById('task-stream'),
    taskEmptyState: document.getElementById('task-empty-state'),
    taskStatusButtons: document.querySelectorAll('[data-task-status]'),
    taskSearchInput: document.getElementById('task-search-input'),
    taskSearchClear: document.getElementById('task-search-clear'),
    taskAgentSelect: document.getElementById('task-agent-select'),
    filterChipStuck: document.getElementById('filter-chip-stuck'),
    filterChipFailed: document.getElementById('filter-chip-failed'),
    filterChipRunning: document.getElementById('filter-chip-running'),
    filterChipUnverified: document.getElementById('filter-chip-unverified'),
    
    // Thumb Dock
    dockBtnExceptions: document.getElementById('dock-btn-exceptions'),
    dockBadgeExceptions: document.getElementById('dock-badge-exceptions'),
    dockBtnFleet: document.getElementById('dock-btn-fleet'),
    dockBtnTasks: document.getElementById('dock-btn-tasks'),
    dockBtnRefresh: document.getElementById('dock-btn-refresh'),
    refreshIcon: document.getElementById('refresh-icon'),
    dockBtnPause: document.getElementById('dock-btn-pause'),
    pauseBullet: document.getElementById('pause-bullet'),
    pauseLabel: document.getElementById('pause-label'),
    
    toastContainer: document.getElementById('toast-container'),
  };

  // --- Utility Functions ---

  function announce(msg) {
    if (dom.srAnnouncements) {
      dom.srAnnouncements.textContent = msg;
    }
  }

  function showToast(message) {
    if (!dom.toastContainer) return;
    const toast = document.createElement('div');
    toast.className = 'toast-message';
    toast.textContent = message;
    dom.toastContainer.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(6px)';
      toast.style.transition = 'all 150ms cubic-bezier(0.16, 1, 0.3, 1)';
      setTimeout(() => toast.remove(), 160);
    }, 2000);
  }

  function copyToClipboard(text, label = 'Teks') {
    if (!navigator.clipboard) {
      const input = document.createElement('textarea');
      input.value = text;
      input.style.position = 'fixed';
      input.style.opacity = '0';
      document.body.appendChild(input);
      input.select();
      try {
        document.execCommand('copy');
        showToast(`${label} disalin`);
      } catch (e) {
        showToast('Gagal menyalin');
      }
      document.body.removeChild(input);
      return;
    }
    navigator.clipboard.writeText(text).then(() => {
      showToast(`${label} disalin`);
    }).catch(() => {
      showToast('Gagal menyalin');
    });
  }

  function escapeHtml(str) {
    if (!str && str !== 0) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function formatDecimal(num, digits = 1) {
    if (typeof num !== 'number' || isNaN(num)) return '';
    const str = num.toLocaleString('id-ID', {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits
    });
    if (!str.includes(',') && str.includes('.')) {
      return str.replace('.', ',');
    }
    return str;
  }

  function formatThousands(num) {
    if (typeof num !== 'number' || isNaN(num)) return '';
    const rounded = Math.round(num);
    const str = rounded.toLocaleString('id-ID');
    if (str.includes(',')) {
      return String(rounded).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    }
    return str;
  }

  function formatTimeAgo(ageSeconds) {
    if (ageSeconds === null || ageSeconds === undefined || isNaN(ageSeconds)) {
      return 'Durasi tidak diketahui';
    }
    const s = Math.max(0, Math.round(ageSeconds));
    if (s < 60) return `${formatThousands(s)} dtk lalu`;
    const m = Math.floor(s / 60);
    const rem = s % 60;
    if (m < 60) return `${m} mnt ${rem} dtk lalu`;
    const h = s / 3600;
    if (s < 86400) return `${formatDecimal(h, 1)} jam lalu`;
    const d = s / 86400;
    return `${formatDecimal(d, 1)} hari lalu`;
  }

  function formatDuration(seconds) {
    if (seconds === null || seconds === undefined || isNaN(seconds)) {
      return null;
    }
    const s = Math.max(0, Math.round(seconds));
    if (s < 60) return `${formatThousands(s)} dtk`;
    const m = Math.floor(s / 60);
    const rem = s % 60;
    if (m < 60) return `${m} mnt ${rem} dtk`;
    const h = s / 3600;
    return `${formatDecimal(h, 1)} jam (${formatThousands(s)} dtk)`;
  }

  function formatResolvedDate(isoStr) {
    if (!isoStr) return '–';
    try {
      const d = new Date(isoStr);
      if (isNaN(d.getTime())) return String(isoStr);
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
      const day = d.getDate();
      const mon = months[d.getMonth()];
      const yr = d.getFullYear();
      const hh = String(d.getHours()).padStart(2, '0');
      const mm = String(d.getMinutes()).padStart(2, '0');
      return `${day} ${mon} ${yr}, ${hh}:${mm} WIB`;
    } catch (_) {
      return String(isoStr);
    }
  }

  function unescapeJsonString(str) {
    return str
      .replace(/\\n/g, '\n')
      .replace(/\\r/g, '\r')
      .replace(/\\t/g, '\t')
      .replace(/\\"/g, '"')
      .replace(/\\\\/g, '\\');
  }

  function cleanFallbackText(text) {
    let s = text.replace(/\\n/g, ' ').replace(/[\r\n]+/g, ' ');
    s = s.replace(/\\"/g, '"').replace(/\\\\/g, '\\');
    s = s.replace(/\s+/g, ' ').trim();
    s = s.replace(/^\{\s*/, '').replace(/\s*\}$/, '');
    if (s.length > 140) {
      s = s.slice(0, 137) + '...';
    }
    return s;
  }

  function extractKeyPhrase(text) {
    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);

    const explicitErr = lines.find(l => /^error:\s+/i.test(l));
    const rgParseErr = lines.find(l => /regex parse error/i.test(l));

    if (explicitErr && rgParseErr) {
      const cleanExplicit = explicitErr.replace(/^error:\s+/i, '');
      return `regex parse error: ${cleanExplicit}`;
    }

    if (explicitErr) {
      return explicitErr.replace(/^error:\s+/i, '');
    }

    if (rgParseErr) {
      return rgParseErr;
    }

    if (lines.length > 0 && lines[0].startsWith('Traceback (most recent call last)')) {
      const excLine = lines.find(l => /^[A-Za-z0-9_]+(?:Error|Exception):/.test(l));
      if (excLine) return excLine;
      return 'Traceback saat eksekusi kode';
    }

    if (lines.length > 0 && lines[0].startsWith('BLOCKED:')) {
      let blk = lines[0].replace(/^BLOCKED:\s*/, '');
      let dotIdx = blk.indexOf('.');
      if (dotIdx > 0 && dotIdx < 100) return `BLOCKED: ${blk.slice(0, dotIdx)}`;
      return `BLOCKED: ${blk.slice(0, 100)}`;
    }

    if (lines.length > 0) {
      return cleanFallbackText(lines[0]);
    }

    return cleanFallbackText(text);
  }

  function parseAgentDiagnostic(tail, lastAt, isFatal) {
    if (!tail || typeof tail !== 'string') return null;

    const rawTail = tail.trim();

    // Pattern: ... agent.tool_executor: Tool <name> returned error (0.06s): <payload>
    const toolMatch = rawTail.match(/Tool\s+['"]?([a-zA-Z0-9_-]+)['"]?\s+returned error(?:\s*\([^)]*\))?:\s*(.+)$/s);

    let toolName = null;
    let reason = '';

    if (toolMatch) {
      toolName = toolMatch[1];
      let payload = toolMatch[2].trim();

      if (payload.startsWith('{')) {
        const errorFieldMatch = payload.match(/"error"\s*:\s*"((?:[^"\\]|\\.)*)/);
        const outputFieldMatch = payload.match(/"output"\s*:\s*"((?:[^"\\]|\\.)*)/);

        if (errorFieldMatch) {
          reason = extractKeyPhrase(unescapeJsonString(errorFieldMatch[1]));
        } else if (outputFieldMatch) {
          reason = extractKeyPhrase(unescapeJsonString(outputFieldMatch[1]));
        } else {
          reason = cleanFallbackText(payload);
        }
      } else {
        reason = cleanFallbackText(payload);
      }
    } else {
      let cleaned = rawTail.replace(/^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}(?:,\d+)?\s+(?:WARNING|ERROR|CRITICAL|INFO)\s+(?:\[[^\]]*\]\s+)?/, '');
      cleaned = cleaned.replace(/^(?:cli|agent\.[a-z_.]+):\s+/i, '');
      reason = cleanFallbackText(cleaned);
    }

    let timeStr = '';
    if (lastAt) {
      try {
        const d = new Date(lastAt);
        if (!isNaN(d.getTime())) {
          const hh = String(d.getHours()).padStart(2, '0');
          const mm = String(d.getMinutes()).padStart(2, '0');
          const ss = String(d.getSeconds()).padStart(2, '0');
          timeStr = `${hh}:${mm}:${ss} WIB`;
        }
      } catch (_) {}
    }
    if (!timeStr) {
      const timeMatch = rawTail.match(/\b(\d{2}:\d{2}:\d{2})\b/);
      if (timeMatch) timeStr = `${timeMatch[1]} WIB`;
    }

    return {
      tool: toolName,
      reason: reason,
      time: timeStr,
      full: rawTail,
      isFatal: Boolean(isFatal)
    };
  }

  // --- Network & Polling Engine ---

  async function fetchTelemetry() {
    if (state.isFetching) return;
    state.isFetching = true;

    if (dom.refreshIcon) dom.refreshIcon.classList.add('is-spinning');

    try {
      const [resStatus, resTasks] = await Promise.all([
        fetch(CONFIG.apiStatusUrl, { cache: 'no-store' }),
        fetch(CONFIG.apiTasksUrl, { cache: 'no-store' })
      ]);

      if (!resStatus.ok) throw new Error(`HTTP ${resStatus.status} on /api/status`);
      if (!resTasks.ok) throw new Error(`HTTP ${resTasks.status} on /api/tasks`);

      const statusData = await resStatus.json();
      const tasksData = await resTasks.json();

      // Successful fetch: single source of truth
      state.networkErrorCount = 0;
      state.lastSuccessfulSync = Date.now();
      state.fleetData = statusData;
      state.tasksData = tasksData;

      // Update Header Sync Clock
      const now = new Date();
      if (dom.syncClock) {
        dom.syncClock.textContent = now.toLocaleTimeString('id-ID', { hour12: false });
      }

      // Check Payload Fingerprint to Avoid Unnecessary DOM Reflows
      const payloadHash = `${statusData.generated_at || ''}_${statusData.count || 0}_${tasksData.generated_at || ''}_${tasksData.count || 0}_${tasksData.stuck_count || 0}`;
      
      // Enforce zero alarm false positives: hide both banners immediately upon 200 OK
      hideBanners();
      setConnectionState('online', 'Aktif · 3 dtk');

      // Render views
      renderApp(payloadHash !== state.lastPayloadHash);
      state.lastPayloadHash = payloadHash;

    } catch (err) {
      state.networkErrorCount++;
      setConnectionState('offline', 'Terputus');
      showOfflineBanner(err.message || 'Jaringan tidak dapat diakses');
    } finally {
      state.isFetching = false;
      if (dom.refreshIcon) dom.refreshIcon.classList.remove('is-spinning');
    }
  }

  function setConnectionState(stateName, labelText) {
    if (dom.connectionPill) {
      dom.connectionPill.setAttribute('data-state', stateName);
    }
    if (dom.connectionLabel) {
      dom.connectionLabel.textContent = labelText;
    }
  }

  function showOfflineBanner(detail) {
    // Offline banner takes absolute priority over stale
    if (dom.staleBanner) {
      dom.staleBanner.hidden = true;
    }
    if (dom.offlineBanner) {
      dom.offlineBanner.hidden = false;
      if (dom.offlineMessage) {
        dom.offlineMessage.textContent = `Koneksi backend terputus (${detail}). Memeriksa ulang otomatis...`;
      }
    }
  }

  function showStaleBanner(seconds) {
    // Do not show stale banner if backend is already marked offline
    if (dom.offlineBanner && !dom.offlineBanner.hidden) return;
    
    if (dom.staleBanner) {
      dom.staleBanner.hidden = false;
      if (dom.staleMessage) {
        dom.staleMessage.textContent = `Data telemetri belum diperbarui selama ${formatThousands(seconds)} dtk (melebihi ambang batas 12 dtk). Menghubungi ulang backend...`;
      }
    }
    // Truth invariant: status pill cannot say 'Aktif' when telemetry is stale!
    setConnectionState('stale', `Basi · ${formatThousands(seconds)} dtk`);
  }

  function hideBanners() {
    if (dom.offlineBanner) dom.offlineBanner.hidden = true;
    if (dom.staleBanner) dom.staleBanner.hidden = true;
  }

  function startPolling() {
    stopPolling();
    state.isPollingActive = true;
    if (dom.dockBtnPause) dom.dockBtnPause.setAttribute('data-state', 'running');
    if (dom.pauseLabel) dom.pauseLabel.textContent = '3s';
    fetchTelemetry();
    state.pollTimer = setInterval(fetchTelemetry, CONFIG.pollIntervalMs);
  }

  function stopPolling() {
    state.isPollingActive = false;
    if (state.pollTimer) {
      clearInterval(state.pollTimer);
      state.pollTimer = null;
    }
    if (dom.dockBtnPause) dom.dockBtnPause.setAttribute('data-state', 'paused');
    if (dom.pauseLabel) dom.pauseLabel.textContent = 'Jeda';
    setConnectionState('paused', 'Dijeda');
  }

  function startWatchdog() {
    if (state.watchdogTimer) clearInterval(state.watchdogTimer);
    state.watchdogTimer = setInterval(() => {
      if (!state.lastSuccessfulSync || !state.isPollingActive) return;
      const elapsed = Date.now() - state.lastSuccessfulSync;
      if (elapsed > CONFIG.staleThresholdMs) {
        const secs = Math.round(elapsed / 1000);
        showStaleBanner(secs);
      }
    }, 1000);
  }

  // --- Rendering Pipeline ---

  function renderApp(hasDataChanged) {
    renderExceptionDeck();
    renderFleetMatrix(hasDataChanged);
    renderTaskStream();
    populateAgentDropdown();
  }

  // 1. EXCEPTION COMMAND DECK (FIRST FOLD — CRITICAL)
  // Architecture Decision: Distinctly separate live operational failures (action required now)
  // from historical data debt (tasks succeeded in pre-hashing era).
  function renderExceptionDeck() {
    if (!dom.exceptionsContainer) return;

    const allExceptions = [];

    // Check Fleet Status for Anomalies
    if (state.fleetData && Array.isArray(state.fleetData.agents)) {
      state.fleetData.agents.forEach(agent => {
        if (agent.status === 'error' || (agent.errors && agent.errors.fatal)) {
          allExceptions.push({
            id: `agent-error-${agent.id}`,
            category: 'live',
            type: 'agent_error',
            severity: 'severity-agent-error',
            pillClass: 'pill-agent-error',
            pillIcon: ICONS.x,
            pillLabel: 'Galat Agen',
            entityId: agent.id,
            target: agent.name || agent.id,
            title: `Agen ${agent.name} (${agent.id}) mengalami kegagalan proses daemon.`,
            errorText: agent.errors?.tail || 'Galat sistem terdeteksi pada daemon agen.',
            timestamp: agent.errors?.last_at || agent.last_active,
            meta: [
              { label: 'Role', value: agent.role },
              { label: 'PIDs', value: agent.pids?.join(', ') || 'Nol' }
            ]
          });
        } else if (agent.status === 'stale') {
          allExceptions.push({
            id: `agent-stale-${agent.id}`,
            category: 'live',
            type: 'agent_stale',
            severity: 'severity-stuck',
            pillClass: 'pill-stuck',
            pillIcon: ICONS.alert,
            pillLabel: 'Agen Stale',
            entityId: agent.id,
            target: agent.name || agent.id,
            title: `Agen ${agent.name} tidak merespons melebihi batas toleransi.`,
            errorText: null,
            timestamp: agent.last_active,
            meta: [
              { label: 'Role', value: agent.role },
              { label: 'Terakhir Aktif', value: formatTimeAgo(agent.age_seconds) }
            ]
          });
        }
      });
    }

    // Check Tasks for Anomalies (Stuck, Failed, Unverified Artifact)
    if (state.tasksData && Array.isArray(state.tasksData.tasks)) {
      state.tasksData.tasks.forEach(task => {
        // Condition A: Stuck Tasks (Live Operational Failure)
        if (task.stuck) {
          const stuckReason = task.stuck_reason ? ` (${task.stuck_reason})` : '';
          allExceptions.push({
            id: `task-stuck-${task.task_id}`,
            category: 'live',
            type: 'task_stuck',
            severity: 'severity-stuck',
            pillClass: 'pill-stuck',
            pillIcon: ICONS.bolt,
            pillLabel: `MACET${stuckReason}`,
            entityId: task.task_id,
            target: `→ ${task.to || 'fleet'}`,
            title: task.intent || `Task ${task.task_id}`,
            errorText: task.stuck_reason ? `Alasan macet: ${task.stuck_reason}. Melebihi batas timeout operasional dispatcher.` : null,
            timestamp: task.ts,
            elapsed: task.elapsed_seconds,
            meta: [
              { label: 'Dari', value: task.from || '–' },
              { label: 'Status', value: task.status },
              { label: 'Attempt', value: String(task.attempt || 1) }
            ]
          });
        }
        // Condition B: Failed or Timeout Tasks (Live Operational Failure or Resolved Fix)
        else if (task.status === 'FAILED' || task.status === 'TIMEOUT' || task.status === 'CANCELLED') {
          const isResolved = Boolean(task.resolved && typeof task.resolved === 'object');

          if (isResolved) {
            allExceptions.push({
              id: `task-resolved-${task.task_id}`,
              category: 'historical',
              type: 'task_resolved',
              severity: 'severity-resolved',
              pillClass: 'pill-resolved',
              pillIcon: ICONS.check,
              pillLabel: `Penyebab Diperbaiki · ${task.resolved.commit || 'Fix'}`,
              entityId: task.task_id,
              target: `→ ${task.to || 'fleet'}`,
              title: task.intent || `Task ${task.task_id}`,
              errorText: task.error || null,
              errorLabel: 'Jejak Galat Asal (Sebelum Perbaikan)',
              resolvedInfo: task.resolved,
              timestamp: task.ts,
              elapsed: task.elapsed_seconds,
              meta: [
                { label: 'Dari', value: task.from || '–' },
                { label: 'Status Asal', value: task.status },
                { label: 'Commit Perbaikan', value: task.resolved.commit ? `commit ${task.resolved.commit}` : '–' },
                { label: 'Waktu Ditutup', value: task.resolved.at ? formatResolvedDate(task.resolved.at) : '–' }
              ]
            });
          } else {
            allExceptions.push({
              id: `task-failed-${task.task_id}`,
              category: 'live',
              type: 'task_failed',
              severity: 'severity-failed',
              pillClass: 'pill-failed',
              pillIcon: ICONS.x,
              pillLabel: task.status,
              entityId: task.task_id,
              target: `→ ${task.to || 'fleet'}`,
              title: task.intent || `Task ${task.task_id}`,
              errorText: task.error || 'Eksekusi gagal tanpa jejak error terstruktur.',
              errorLabel: 'Jejak Galat Dispatcher',
              timestamp: task.ts,
              elapsed: task.elapsed_seconds,
              meta: [
                { label: 'Dari', value: task.from || '–' },
                { label: 'Tipe', value: task.type || 'standard' }
              ]
            });
          }
        }
        // Condition C: Unverified Artifacts (Classify between live missing file vs historical legacy unhashed)
        else if (task.artifact_verified === false && task.status === 'SUCCEEDED') {
          const reason = task.artifact_verification_reason || 'unverified';
          const isLegacy = reason === 'no_hash_recorded' || !task.artifact_sha256;

          allExceptions.push({
            id: `task-unverified-${task.task_id}`,
            category: isLegacy ? 'historical' : 'live',
            type: 'artifact_unverified',
            severity: isLegacy ? 'severity-unverified-legacy' : 'severity-unverified',
            pillClass: isLegacy ? 'pill-unverified-legacy' : 'pill-unverified',
            pillIcon: isLegacy ? ICONS.history : ICONS.alert,
            pillLabel: isLegacy ? 'Utang Historis: Pra-Hashing' : `Cacat: ${reason}`,
            entityId: task.task_id,
            target: `→ ${task.to || 'fleet'}`,
            title: task.intent || `Task ${task.task_id}`,
            errorText: isLegacy 
              ? 'Task selesai pada era sebelum penegakan checksum SHA-256 dispatcher. Artefak ada di disk tetapi tidak memiliki hash pembanding di metadata task.' 
              : `Alasan verifikasi: ${reason}. Checksum artefak tidak cocok dengan hash terdaftar.`,
            timestamp: task.ts,
            elapsed: task.elapsed_seconds,
            meta: [
              { label: 'Artefak', value: (task.artifacts && task.artifacts[0]) || '–' },
              { label: 'Hash Terdaftar', value: task.artifact_sha256 ? `${task.artifact_sha256.slice(0, 12)}...` : 'Nol (Pra-Hashing)' }
            ]
          });
        }
      });
    }

    const liveCount = allExceptions.filter(e => e.category === 'live').length;
    const historicalCount = allExceptions.filter(e => e.category === 'historical').length;
    const totalCount = allExceptions.length;

    // Update Subfilter Chip Labels
    if (dom.exFilterAll) dom.exFilterAll.textContent = `Semua (${totalCount})`;
    if (dom.exFilterLive) dom.exFilterLive.textContent = `Perlu Tindakan (${liveCount})`;
    if (dom.exFilterHistorical) dom.exFilterHistorical.textContent = `Historis & Teratasi (${historicalCount})`;

    // Update Counter Badges
    if (dom.exceptionTotalBadge) {
      if (liveCount > 0) {
        dom.exceptionTotalBadge.textContent = `${liveCount} Butuh Tindakan · ${historicalCount} Historis`;
        dom.exceptionTotalBadge.className = 'section-badge badge-exception-count mono tabular has-critical';
      } else if (totalCount > 0) {
        dom.exceptionTotalBadge.textContent = `${totalCount} Anomali Historis`;
        dom.exceptionTotalBadge.className = 'section-badge badge-exception-count mono tabular';
      } else {
        dom.exceptionTotalBadge.textContent = '0 Anomali';
        dom.exceptionTotalBadge.className = 'section-badge badge-exception-count mono tabular is-zero';
      }
    }

    if (dom.dockBadgeExceptions) {
      dom.dockBadgeExceptions.textContent = String(liveCount > 0 ? liveCount : totalCount);
      dom.dockBadgeExceptions.className = 'dock-pill-badge mono tabular ' +
        (totalCount === 0 ? 'is-zero' : (liveCount > 0 ? 'has-critical' : ''));
    }

    // Filter displayed exceptions based on active subfilter
    let displayed = allExceptions;
    if (state.exceptionFilter === 'live') {
      displayed = allExceptions.filter(e => e.category === 'live');
    } else if (state.exceptionFilter === 'historical') {
      displayed = allExceptions.filter(e => e.category === 'historical');
    }

    // Render Serene Nominal State if nothing matches
    if (displayed.length === 0) {
      const msg = totalCount === 0 
        ? 'Tidak ada task macet (stuck), tidak ada artefak cacat/hilang, dan seluruh agen dalam parameter wajar.' 
        : (state.exceptionFilter === 'live' ? 'Bagus! Nol kegagalan operasional yang membutuhkan tindakan langsung.' : 'Tidak ada catatan historis atau terselesaikan.');
      
      dom.exceptionsContainer.innerHTML = `
        <div class="nominal-card" id="nominal-placeholder">
          <div class="nominal-badge">
            <span class="nominal-icon">${ICONS.check}</span>
            <span class="nominal-text">ARMADA BERJALAN NORMAL</span>
          </div>
          <p class="nominal-desc">${escapeHtml(msg)}</p>
        </div>
      `;
      return;
    }

    // Render Exception Deck with clear hierarchical grouping
    let html = '';
    const renderCard = (ex) => {
      const elapsedDisplay = ex.elapsed !== undefined 
        ? (ex.elapsed !== null ? formatDuration(ex.elapsed) : '<span class="unknown-duration">Durasi tidak diketahui</span>')
        : (ex.timestamp ? formatTimeAgo(ex.timestamp) : '');

      let metaHtml = '';
      if (ex.meta && ex.meta.length) {
        metaHtml = `
          <div class="exception-meta-grid">
            ${ex.meta.map(m => `
              <div class="meta-item">
                <span class="stats-label">${escapeHtml(m.label)}:</span>
                <strong class="stats-value mono">${escapeHtml(m.value)}</strong>
              </div>
            `).join('')}
          </div>
        `;
      }

      let errorHtml = '';
      if (ex.errorText) {
        errorHtml = `
          <div class="exception-error-box">
            <div class="error-box-header">
              <span class="error-box-label">${escapeHtml(ex.errorLabel || 'Jejak Diagnostik / Alasan')}</span>
              <button type="button" class="btn-copy-mini" data-copy="${escapeHtml(ex.errorText)}" title="Salin Catatan">Salin</button>
            </div>
            <pre class="error-text"><code>${escapeHtml(ex.errorText)}</code></pre>
          </div>
        `;
      }

      let resolvedHtml = '';
      if (ex.resolvedInfo) {
        resolvedHtml = `
          <div class="exception-resolved-box">
            <div class="resolved-box-header">
              <span class="resolved-box-icon">${ICONS.check}</span>
              <strong class="resolved-box-title">Penyebab Sudah Diperbaiki</strong>
              ${ex.resolvedInfo.commit ? `<span class="resolved-commit mono">commit ${escapeHtml(ex.resolvedInfo.commit)}</span>` : ''}
              ${ex.resolvedInfo.at ? `<span class="resolved-date mono">${escapeHtml(formatResolvedDate(ex.resolvedInfo.at))}</span>` : ''}
            </div>
            <p class="resolved-box-reason">${escapeHtml(ex.resolvedInfo.reason || 'Penyebab kegagalan telah diperbaiki.')}</p>
          </div>
        `;
      }

      return `
        <article class="exception-card ${ex.severity}" role="alert">
          <div class="exception-header-row">
            <div class="exception-badge-group">
              <span class="severity-pill ${ex.pillClass}">
                ${ex.pillIcon}
                <span>${escapeHtml(ex.pillLabel)}</span>
              </span>
              <button type="button" class="task-id-btn" data-copy="${escapeHtml(ex.entityId)}" title="Salin ID">
                <span>${escapeHtml(ex.entityId)}</span>
                ${ICONS.copy}
              </button>
              <span class="entity-target-pill mono">${escapeHtml(ex.target)}</span>
            </div>
            <div class="exception-timing mono tabular">
              ${elapsedDisplay}
            </div>
          </div>

          <div class="exception-body">
            <h3 class="exception-title">${escapeHtml(ex.title)}</h3>
            ${resolvedHtml}
            ${errorHtml}
            ${metaHtml}
          </div>
        </article>
      `;
    };

    if (state.exceptionFilter === 'all') {
      const liveList = allExceptions.filter(e => e.category === 'live');
      const histList = allExceptions.filter(e => e.category === 'historical');

      if (liveList.length > 0) {
        html += `
          <div class="exception-group-header group-live">
            <span>Kegagalan Aktif (${liveList.length}) — Perlu Tindakan Sekarang</span>
            <div class="exception-group-line"></div>
          </div>
        `;
        liveList.forEach(ex => { html += renderCard(ex); });
      }

      if (histList.length > 0) {
        html += `
          <div class="exception-group-header group-historical">
            <span>Catatan Historis & Teratasi (${histList.length}) — Non-Blocking</span>
            <div class="exception-group-line"></div>
          </div>
        `;
        histList.forEach(ex => { html += renderCard(ex); });
      }
    } else {
      displayed.forEach(ex => { html += renderCard(ex); });
    }

    dom.exceptionsContainer.innerHTML = html;
  }

  // 2. FLEET MATRIX
  function renderFleetMatrix(force) {
    if (!dom.fleetGrid || !state.fleetData || !Array.isArray(state.fleetData.agents)) return;

    let agents = state.fleetData.agents;
    const totalCount = agents.length;
    const activeCount = agents.filter(a => a.status === 'running' || a.status === 'recent').length;

    if (dom.fleetStatsBadge) {
      dom.fleetStatsBadge.textContent = `${activeCount}/${totalCount} Aktif`;
    }

    // Apply Filter
    if (state.fleetFilter === 'active') {
      agents = agents.filter(a => a.status === 'running' || a.status === 'recent');
    } else if (state.fleetFilter === 'anomalies') {
      agents = agents.filter(a => a.status === 'error' || a.status === 'stale' || (a.errors && a.errors.fatal));
    }

    let html = '';
    agents.forEach(agent => {
      const isRunning = agent.status === 'running';
      const isFatal = agent.status === 'error' || Boolean(agent.errors && agent.errors.fatal);
      const isWarning = !isFatal && Boolean(agent.errors && agent.errors.tail && agent.errors.fatal === false);
      const isStale = agent.status === 'stale';

      let cardClass = 'fleet-card';
      if (isRunning) cardClass += ' status-running';
      if (isFatal) cardClass += ' status-error';

      let statusBadgeClass = 'status-badge-idle';
      let dotClass = 'dot-idle';
      if (isRunning) {
        statusBadgeClass = 'status-badge-running';
        dotClass = 'dot-running';
      } else if (agent.status === 'recent') {
        statusBadgeClass = 'status-badge-recent';
        dotClass = 'dot-recent';
      } else if (isStale) {
        statusBadgeClass = 'status-badge-stale';
        dotClass = 'dot-stale';
      } else if (isFatal) {
        statusBadgeClass = 'status-badge-error';
        dotClass = 'dot-error';
      }

      // Kind Icon (SVG)
      let kindIconSvg = ICONS.luminary;
      if (agent.kind === 'orchestrator') kindIconSvg = ICONS.star;
      if (agent.kind === 'satellite') kindIconSvg = ICONS.satellite;

      let pidsStr = agent.pids && agent.pids.length ? agent.pids.join(', ') : '–';
      let serviceState = agent.service ? `${agent.service.state} (${agent.service.restarts || 0} restart)` : 'Manual / None';

      let errorHtml = '';
      if (isFatal || isWarning) {
        const diag = parseAgentDiagnostic(agent.errors?.tail, agent.errors?.last_at, isFatal);
        if (diag) {
          const alertClass = isFatal ? 'is-fatal' : 'is-warning';
          const iconSvg = isFatal ? ICONS.x : ICONS.alert;
          const label = isFatal ? 'Galat:' : (diag.tool ? 'Peringatan Alat:' : 'Peringatan:');

          errorHtml = `
            <div class="agent-diag-alert ${alertClass} mono" role="${isFatal ? 'alert' : 'status'}">
              <div class="agent-diag-header">
                <div class="agent-diag-label-wrap">
                  <span class="agent-diag-icon" aria-hidden="true">${iconSvg}</span>
                  <strong class="agent-diag-label">${escapeHtml(label)}</strong>
                  ${diag.tool ? `<span class="agent-diag-tool">${escapeHtml(diag.tool)}</span>` : ''}
                </div>
                <div class="agent-diag-actions">
                  ${diag.time ? `<span class="agent-diag-time tabular">${escapeHtml(diag.time)}</span>` : ''}
                  <button type="button" class="btn-copy-mini" data-copy="${escapeHtml(diag.full)}" title="Salin Log Utuh">Salin</button>
                </div>
              </div>
              <div class="agent-diag-body">
                <span class="agent-diag-reason">${escapeHtml(diag.reason)}</span>
              </div>
            </div>
          `;
        }
      }

      html += `
        <div class="${cardClass}" role="listitem">
          <div class="fleet-card-top">
            <div class="agent-identity">
              <span class="agent-kind-glyph" title="${escapeHtml(agent.kind || 'luminary')}">${kindIconSvg}</span>
              <div>
                <h3 class="agent-name">${escapeHtml(agent.name || agent.id)}</h3>
                <span class="agent-role">${escapeHtml(agent.role || 'Luminary')}</span>
              </div>
            </div>
            <span class="agent-status-badge ${statusBadgeClass} mono tabular">
              <span class="agent-status-dot ${dotClass}" aria-hidden="true"></span>
              <span>${escapeHtml(agent.status.toUpperCase())}</span>
            </span>
          </div>

          <p class="fleet-card-desc">${escapeHtml(agent.desc || 'Entitas subsistem Solaris.')}</p>

          ${errorHtml}

          <div class="fleet-card-stats">
            <div class="stats-row">
              <span class="stats-label">Proses / PIDs:</span>
              <span class="stats-value mono">${escapeHtml(pidsStr)}</span>
            </div>
            <div class="stats-row">
              <span class="stats-label">Layanan Systemd:</span>
              <span class="stats-value mono">${escapeHtml(serviceState)}</span>
            </div>
            <div class="stats-row">
              <span class="stats-label">Terakhir Aktif:</span>
              <span class="stats-value mono tabular">${formatTimeAgo(agent.age_seconds)}</span>
            </div>
          </div>
        </div>
      `;
    });

    dom.fleetGrid.innerHTML = html;
  }

  // 3. NORMALIZED TASK STREAM
  function renderTaskStream() {
    if (!dom.taskStream || !state.tasksData || !Array.isArray(state.tasksData.tasks)) return;

    let tasks = state.tasksData.tasks;
    const totalCount = tasks.length;

    // Update Filter Chip Badges
    const stuckCount = tasks.filter(t => t.stuck).length;
    const failedCount = tasks.filter(t => t.status === 'FAILED' || t.status === 'TIMEOUT' || t.status === 'CANCELLED').length;
    const runningCount = tasks.filter(t => t.status === 'RUNNING').length;
    const unverifiedCount = tasks.filter(t => t.artifact_verified === false).length;

    if (dom.filterChipStuck) dom.filterChipStuck.textContent = `Macet (${stuckCount})`;
    if (dom.filterChipFailed) dom.filterChipFailed.textContent = `Gagal/Timeout (${failedCount})`;
    if (dom.filterChipRunning) dom.filterChipRunning.textContent = `Running (${runningCount})`;
    if (dom.filterChipUnverified) dom.filterChipUnverified.textContent = `Artefak Cacat (${unverifiedCount})`;

    // Filter by Status
    if (state.taskStatusFilter === 'stuck') {
      tasks = tasks.filter(t => t.stuck);
    } else if (state.taskStatusFilter === 'failed') {
      tasks = tasks.filter(t => t.status === 'FAILED' || t.status === 'TIMEOUT' || t.status === 'CANCELLED');
    } else if (state.taskStatusFilter === 'running') {
      tasks = tasks.filter(t => t.status === 'RUNNING');
    } else if (state.taskStatusFilter === 'unverified') {
      tasks = tasks.filter(t => t.artifact_verified === false);
    }

    // Filter by Agent
    if (state.taskAgentFilter !== 'all') {
      tasks = tasks.filter(t => t.to === state.taskAgentFilter || t.from === state.taskAgentFilter);
    }

    // Filter by Search Query
    if (state.taskSearchQuery.trim()) {
      const q = state.taskSearchQuery.toLowerCase().trim();
      tasks = tasks.filter(t => {
        const idMatch = (t.task_id || '').toLowerCase().includes(q);
        const intentMatch = (t.intent || '').toLowerCase().includes(q);
        const toMatch = (t.to || '').toLowerCase().includes(q);
        const fromMatch = (t.from || '').toLowerCase().includes(q);
        return idMatch || intentMatch || toMatch || fromMatch;
      });
    }

    if (dom.taskCountBadge) {
      dom.taskCountBadge.textContent = `${tasks.length}/${totalCount} Task`;
    }

    if (tasks.length === 0) {
      dom.taskStream.innerHTML = '';
      if (dom.taskEmptyState) dom.taskEmptyState.hidden = false;
      return;
    }

    if (dom.taskEmptyState) dom.taskEmptyState.hidden = true;

    let html = '';
    tasks.forEach(task => {
      const isStuck = !!task.stuck;
      const isFailed = task.status === 'FAILED' || task.status === 'TIMEOUT' || task.status === 'CANCELLED';
      const isRunning = task.status === 'RUNNING';
      const isResolved = Boolean(task.resolved && typeof task.resolved === 'object');

      let cardClass = 'task-card';
      if (isStuck) cardClass += ' is-stuck';
      else if (isFailed && isResolved) cardClass += ' is-resolved';
      else if (isFailed) cardClass += ' is-failed';
      else if (isRunning) cardClass += ' is-running';

      // Duration & Elapsed
      let timingDisplay = '';
      if (task.elapsed_seconds !== null && task.elapsed_seconds !== undefined) {
        timingDisplay = `<span class="mono tabular">${formatDuration(task.elapsed_seconds)}</span>`;
      } else {
        timingDisplay = `<span class="unknown-duration mono">Durasi tidak diketahui</span>`;
      }

      // Resolved Strip if present
      let resolvedBlock = '';
      if (isResolved) {
        resolvedBlock = `
          <div class="task-resolved-strip">
            <div class="resolved-strip-header">
              <span class="resolved-strip-label">${ICONS.check} Penyebab Sudah Diperbaiki di Commit ${escapeHtml(task.resolved.commit || 'Fix')}</span>
              ${task.resolved.at ? `<span class="mono tabular text-tertiary">${formatResolvedDate(task.resolved.at)}</span>` : ''}
            </div>
            <p class="resolved-strip-reason">${escapeHtml(task.resolved.reason || 'Masalah telah diselesaikan.')}</p>
          </div>
        `;
      }

      // Artifact Audit Strip
      let artifactHtml = '';
      if (task.artifacts && task.artifacts.length > 0) {
        const firstArt = task.artifacts[0];
        let badgeHtml = '';
        if (task.artifact_verified === true) {
          badgeHtml = `<span class="artifact-badge verified mono">${ICONS.check} Terverifikasi SHA-256</span>`;
        } else if (task.artifact_verified === false) {
          const reason = task.artifact_verification_reason || 'unverified';
          const isLegacy = reason === 'no_hash_recorded' || !task.artifact_sha256;
          badgeHtml = isLegacy 
            ? `<span class="artifact-badge none mono">${ICONS.history} Pra-Hashing Dispatcher</span>`
            : `<span class="artifact-badge unverified mono">${ICONS.alert} Cacat: ${escapeHtml(reason)}</span>`;
        } else {
          badgeHtml = `<span class="artifact-badge none mono">? Status Verifikasi Tidak Tersedia</span>`;
        }

        artifactHtml = `
          <div class="artifact-strip">
            <div class="artifact-strip-header">
              <span class="stats-label">Artefak Hasil:</span>
              ${badgeHtml}
            </div>
            <div class="artifact-path-row">
              <span class="mono">${escapeHtml(firstArt)}</span>
              <button type="button" class="btn-copy-mini" data-copy="${escapeHtml(firstArt)}" title="Salin Path Artefak">Salin Path</button>
            </div>
            ${task.artifact_sha256 ? `
              <div class="artifact-path-row">
                <span class="mono text-tertiary">SHA: ${escapeHtml(task.artifact_sha256.slice(0, 16))}...</span>
                <button type="button" class="btn-copy-mini" data-copy="${escapeHtml(task.artifact_sha256)}" title="Salin Full SHA256">Salin SHA</button>
              </div>
            ` : ''}
          </div>
        `;
      }

      // Error block if present
      let errorBlock = '';
      if (task.error) {
        errorBlock = `
          <div class="exception-error-box">
            <div class="error-box-header">
              <span class="error-box-label">${isResolved ? 'Jejak Galat Asal (Sebelum Perbaikan)' : 'Jejak Galat Dispatcher'}</span>
              <button type="button" class="btn-copy-mini" data-copy="${escapeHtml(task.error)}">Salin Galat</button>
            </div>
            <pre class="error-text"><code>${escapeHtml(task.error)}</code></pre>
          </div>
        `;
      }

      html += `
        <article class="${cardClass}" role="article">
          <div class="task-card-header">
            <div class="task-id-badge-group">
              <button type="button" class="task-id-btn" data-copy="${escapeHtml(task.task_id)}" title="Salin Task ID">
                <span>${escapeHtml(task.task_id)}</span>
                ${ICONS.copy}
              </button>
              <span class="task-target-pill mono">${escapeHtml(task.from || '–')} → ${escapeHtml(task.to || '–')}</span>
              <span class="task-status-pill status-${task.status} mono">${escapeHtml(task.status)}</span>
              ${isResolved ? `<span class="task-status-pill status-RESOLVED mono">${ICONS.check} Sebab Diperbaiki</span>` : ''}
              ${isStuck ? `<span class="severity-pill pill-stuck mono">MACET</span>` : ''}
            </div>
            <div class="task-timing">
              ${timingDisplay}
            </div>
          </div>

          <p class="task-intent">${escapeHtml(task.intent || 'Tanpa deskripsi intent.')}</p>

          ${resolvedBlock}
          ${errorBlock}
          ${artifactHtml}
        </article>
      `;
    });

    dom.taskStream.innerHTML = html;
  }

  function populateAgentDropdown() {
    if (!dom.taskAgentSelect || !state.fleetData || !Array.isArray(state.fleetData.agents)) return;
    if (dom.taskAgentSelect.children.length > 1) return;

    state.fleetData.agents.forEach(agent => {
      const opt = document.createElement('option');
      opt.value = agent.id;
      opt.textContent = `${agent.name} (${agent.id})`;
      dom.taskAgentSelect.appendChild(opt);
    });
  }

  // --- Event Listeners & Ergonomics ---

  function initEventListeners() {
    // 1. Thermal & Visibility Management (Quiet Idle)
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        stopPolling();
      } else {
        startPolling();
      }
    });

    // 2. Global Delegated Click Handler for Clipboard Copy
    document.addEventListener('click', (e) => {
      const copyBtn = e.target.closest('[data-copy]');
      if (copyBtn) {
        const text = copyBtn.getAttribute('data-copy');
        if (text) {
          copyToClipboard(text, 'Konten');
        }
      }
    });

    // 3. Thumb Dock Navigation
    if (dom.dockBtnExceptions) {
      dom.dockBtnExceptions.addEventListener('click', () => {
        const el = document.getElementById('section-exceptions');
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      });
    }

    if (dom.dockBtnFleet) {
      dom.dockBtnFleet.addEventListener('click', () => {
        const el = document.getElementById('section-fleet');
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      });
    }

    if (dom.dockBtnTasks) {
      dom.dockBtnTasks.addEventListener('click', () => {
        const el = document.getElementById('section-tasks');
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      });
    }

    if (dom.dockBtnRefresh) {
      dom.dockBtnRefresh.addEventListener('click', () => {
        fetchTelemetry();
      });
    }

    if (dom.dockBtnPause) {
      dom.dockBtnPause.addEventListener('click', () => {
        if (state.isPollingActive) {
          stopPolling();
          showToast('Polling dijeda');
        } else {
          startPolling();
          showToast('Polling dilanjutkan');
        }
      });
    }

    // 4. Banners Retry
    if (dom.bannerReconnectBtn) dom.bannerReconnectBtn.addEventListener('click', fetchTelemetry);
    if (dom.bannerRetryBtn) dom.bannerRetryBtn.addEventListener('click', fetchTelemetry);

    // 5. Exception Subfilters
    [dom.exFilterAll, dom.exFilterLive, dom.exFilterHistorical].forEach(btn => {
      if (!btn) return;
      btn.addEventListener('click', () => {
        [dom.exFilterAll, dom.exFilterLive, dom.exFilterHistorical].forEach(b => b?.classList.remove('active'));
        btn.classList.add('active');
        state.exceptionFilter = btn.getAttribute('data-exception-filter') || 'all';
        renderExceptionDeck();
      });
    });

    // 6. Fleet Filter Chips
    if (dom.fleetFilterButtons) {
      dom.fleetFilterButtons.forEach(btn => {
        btn.addEventListener('click', () => {
          dom.fleetFilterButtons.forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          state.fleetFilter = btn.getAttribute('data-fleet-filter') || 'all';
          renderFleetMatrix(true);
        });
      });
    }

    // 7. Task Status Chips
    if (dom.taskStatusButtons) {
      dom.taskStatusButtons.forEach(btn => {
        btn.addEventListener('click', () => {
          dom.taskStatusButtons.forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          state.taskStatusFilter = btn.getAttribute('data-task-status') || 'all';
          renderTaskStream();
        });
      });
    }

    // 8. Task Agent Select
    if (dom.taskAgentSelect) {
      dom.taskAgentSelect.addEventListener('change', (e) => {
        state.taskAgentFilter = e.target.value;
        renderTaskStream();
      });
    }

    // 9. Task Search Input
    if (dom.taskSearchInput) {
      dom.taskSearchInput.addEventListener('input', (e) => {
        state.taskSearchQuery = e.target.value;
        if (dom.taskSearchClear) {
          dom.taskSearchClear.hidden = !e.target.value;
        }
        renderTaskStream();
      });
    }

    if (dom.taskSearchClear) {
      dom.taskSearchClear.addEventListener('click', () => {
        if (dom.taskSearchInput) {
          dom.taskSearchInput.value = '';
          state.taskSearchQuery = '';
          dom.taskSearchClear.hidden = true;
          renderTaskStream();
          dom.taskSearchInput.focus();
        }
      });
    }

    // 10. Keyboard Shortcuts for Operators
    window.addEventListener('keydown', (e) => {
      if (document.activeElement === dom.taskSearchInput) {
        if (e.key === 'Escape') {
          dom.taskSearchInput.blur();
        }
        return;
      }

      if (e.key === 'r' || e.key === 'R') {
        fetchTelemetry();
      } else if (e.key === 'p' || e.key === 'P') {
        if (state.isPollingActive) stopPolling();
        else startPolling();
      } else if (e.key === '/') {
        e.preventDefault();
        if (dom.taskSearchInput) dom.taskSearchInput.focus();
      } else if (e.key === '1') {
        document.getElementById('section-exceptions')?.scrollIntoView({ behavior: 'smooth' });
      } else if (e.key === '2') {
        document.getElementById('section-fleet')?.scrollIntoView({ behavior: 'smooth' });
      } else if (e.key === '3') {
        document.getElementById('section-tasks')?.scrollIntoView({ behavior: 'smooth' });
      }
    });
  }

  // --- Bootstrap Console ---
  function init() {
    initEventListeners();
    startPolling();
    startWatchdog();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
