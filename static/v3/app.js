/**
 * The Luminaries — Sovereign Operational Console v3
 * Application Logic: Pure Vanilla ES6+ · Zero External Libraries
 * Strict Read-Only · Adaptive Thermal Polling · Resilient Error Boundaries
 * Anti-Slop Artisan Craftsmanship: Deep Obsidian & Electric Azure UI
 */

(() => {
  'use strict';

  // CONFIGURATION
  const API_BASE = window.AI7_API_BASE || '';
  const POLLING_FAST_MS = 3000;
  const POLLING_SLOW_MS = 15000;

  // VIEW ROUTING METADATA
  const VALID_VIEWS = ['overview', 'incidents', 'topology', 'stream'];
  const VIEW_TITLES = {
    overview: 'THE LUMINARIES / CONSTELLATION OVERVIEW',
    incidents: 'THE LUMINARIES / INCIDENTS & ANOMALIES',
    topology: 'THE LUMINARIES / TOPOLOGY & HANDOFFS',
    stream: 'THE LUMINARIES / TASK STREAM & AUDIT'
  };

  // APPLICATION STATE
  const state = {
    agents: [],
    tasks: [],
    relations: null,
    activeIncidentCount: 0,
    hasInFlight: false,
    isPaused: false,
    pollTimer: null,
    lastSyncTime: null,
    currentView: 'overview',
    incidentFilter: 'all',
    taskSearchQuery: '',
    taskStatusFilter: 'ALL',
    streamAgentFilter: 'ALL',
    taskPage: 1,
    taskPageSize: 15,
    relationsTab: 'data'
  };

  // SVG ICONS DICTIONARY (Zero CDN)
  const ICONS = {
    check: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>',
    alert: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>',
    triangle: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>',
    running: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>',
    clock: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>',
    copy: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>',
    arrowRight: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>',
    inspect: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>',
    closed: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line></svg>'
  };

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

  // HELPER: Format Duration (F-05.3: <60s -> Xs, <60m -> Xm Ys, >=1h -> X.Xh)
  function formatDuration(seconds) {
    if (seconds == null || isNaN(seconds) || seconds < 0) return '-';
    if (seconds < 60) {
      return `${Math.round(seconds * 10) / 10}s`;
    }
    if (seconds < 3600) {
      const mins = Math.floor(seconds / 60);
      const secs = Math.floor(seconds % 60);
      return `${mins}m ${secs}s`;
    }
    const hours = (seconds / 3600).toFixed(1);
    return `${hours}h`;
  }

  // HELPER: Word-boundary truncation with ellipsis
  function truncateAtWord(text, maxLength = 80) {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    const sub = text.slice(0, maxLength);
    const lastSpace = sub.lastIndexOf(' ');
    if (lastSpace > maxLength * 0.6) {
      return sub.slice(0, lastSpace) + '…';
    }
    return sub + '…';
  }

  // HELPER: Format Bytes
  function formatBytes(bytes) {
    if (bytes == null || isNaN(bytes)) return '-';
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  // HELPER: Format local time
  function formatTime(isoStr) {
    if (!isoStr || isoStr === 'now') return 'Now';
    try {
      const d = new Date(isoStr);
      if (isNaN(d.getTime())) return isoStr;
      return d.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch {
      return isoStr;
    }
  }

  // HELPER: Format WIB Time (HH:mm:ss WIB)
  function formatWibTime(date = new Date()) {
    try {
      return new Intl.DateTimeFormat('id-ID', {
        timeZone: 'Asia/Jakarta',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      }).format(date).replace(/\./g, ':');
    } catch {
      return date.toLocaleTimeString('id-ID').replace(/\./g, ':');
    }
  }

  // HELPER: Format WIB Full Date & Time
  function formatWibDateTime(isoStr) {
    if (!isoStr) return '-';
    try {
      const d = new Date(isoStr);
      if (isNaN(d.getTime())) return isoStr;
      return new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Asia/Jakarta',
        year: 'numeric',
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      }).format(d) + ' WIB';
    } catch {
      return isoStr;
    }
  }

  // HELPER: Format Relative Time Ago (English)
  function formatRelativeAgo(date) {
    if (!date) return 'loading';
    const now = new Date();
    const diffSec = Math.max(0, Math.floor((now.getTime() - date.getTime()) / 1000));
    if (diffSec < 3) return 'just now';
    if (diffSec < 60) return `${diffSec}s ago`;
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
    return `${Math.floor(diffSec / 3600)}h ago`;
  }

  // LIVE REAL-TIME WIB CLOCK & RELATIVE SYNC DISPLAY (ANTI-SLOP REALTIME DISCIPLINE)
  function updateChronosClocks() {
    const liveClockText = document.getElementById('live-clock-text');
    if (liveClockText) {
      liveClockText.textContent = `${formatWibTime(new Date())} WIB`;
    }

    const syncDisplay = document.getElementById('last-sync-display');
    if (syncDisplay) {
      if (state.lastSyncTime) {
        const timeStr = formatWibTime(state.lastSyncTime);
        const agoStr = formatRelativeAgo(state.lastSyncTime);
        syncDisplay.textContent = `Synced: ${timeStr} (${agoStr})`;
        syncDisplay.title = `Telemetry synchronized at ${timeStr} WIB (${agoStr})`;
      } else {
        syncDisplay.textContent = 'Synced: Loading...';
      }
    }
  }

  function startRealtimeClock() {
    updateChronosClocks();
    setInterval(updateChronosClocks, 1000);
  }

  // HELPER: Status Badge Renderer (NF-04: Tri-Fold Text + Icon + Color)
  function renderStatusBadge(status, customLabel = null) {
    const s = String(status || '').toUpperCase();
    let chipClass = 'chip-neutral';
    let icon = ICONS.clock;
    let label = customLabel || s;

    switch (s) {
      case 'SUCCEEDED':
      case 'NOMINAL':
      case 'RUNNING_OK':
        chipClass = 'chip-nominal';
        icon = ICONS.check;
        label = customLabel || 'SUCCEEDED';
        break;
      case 'RUNNING':
        chipClass = 'chip-running';
        icon = ICONS.running;
        label = customLabel || 'RUNNING';
        break;
      case 'TIMEOUT':
      case 'ORPHANED':
      case 'WARNING':
        chipClass = 'chip-warning';
        icon = ICONS.triangle;
        label = customLabel || (s === 'ORPHANED' ? 'ORPHANED' : 'TIMEOUT');
        break;
      case 'FAILED':
      case 'CRITICAL':
      case 'ERROR':
        chipClass = 'chip-critical';
        icon = ICONS.alert;
        label = customLabel || 'FAILED';
        break;
      case 'RESOLVED':
        chipClass = 'chip-resolved';
        icon = ICONS.check;
        label = customLabel || 'RESOLVED';
        break;
      case 'CANCELLED':
      case 'REJECTED':
        chipClass = 'chip-neutral';
        icon = ICONS.closed;
        label = customLabel || (s === 'CANCELLED' ? 'CANCELLED' : 'REJECTED');
        break;
      default:
        chipClass = 'chip-neutral';
        icon = ICONS.clock;
        label = customLabel || s;
    }

    return `<span class="status-chip ${chipClass}">${icon}<span>${escapeHtml(label)}</span></span>`;
  }

  // UNIVERSAL ONE-TOUCH COPY (F-03.1 + NF-05)
  function bindCopyButtons(container) {
    const buttons = container.querySelectorAll('.btn-copy');
    buttons.forEach(btn => {
      btn.onclick = async (e) => {
        e.stopPropagation();
        const raw = btn.getAttribute('data-copy');
        if (!raw) return;
        try {
          if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(raw);
          } else {
            const ta = document.createElement('textarea');
            ta.value = raw;
            ta.style.position = 'fixed';
            ta.style.opacity = '0';
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            document.body.removeChild(ta);
          }
          const origHtml = btn.innerHTML;
          btn.innerHTML = `${ICONS.check}<span>Copied!</span>`;
          btn.classList.add('copied');
          setTimeout(() => {
            btn.innerHTML = origHtml;
            btn.classList.remove('copied');
          }, 1500);
        } catch (err) {
          console.warn('Copy failed:', err);
        }
      };
    });
  }

  // SKELETON LOADING INFRASTRUCTURE
  function renderSkeletons() {
    const lumContainer = document.getElementById('luminaries-container');
    const inflightContainer = document.getElementById('inflight-container');
    const relayContainer = document.getElementById('relay-container');
    const incidentsContainer = document.getElementById('incidents-container');
    const edgesGrid = document.getElementById('telemetry-edges-grid');
    const taskTbody = document.getElementById('task-table-body');

    if (lumContainer && !lumContainer.children.length) {
      lumContainer.innerHTML = Array.from({ length: 10 }).map(() => `
        <div class="skeleton-card skeleton-shimmer">
          <div class="skeleton-card-head">
            <span class="skeleton-bar" style="width: 50px;"></span>
            <span class="skeleton-bar" style="width: 60px;"></span>
          </div>
          <div style="display:flex; flex-direction:column; gap:6px;">
            <span class="skeleton-bar" style="width: 110px; height: 14px;"></span>
            <span class="skeleton-bar" style="width: 80%;"></span>
          </div>
          <span class="skeleton-bar" style="width: 45%;"></span>
        </div>
      `).join('');
    }

    if (inflightContainer && !inflightContainer.children.length) {
      inflightContainer.innerHTML = `
        <div class="skeleton-card skeleton-shimmer" style="min-height: 54px; padding: 12px;">
          <span class="skeleton-bar" style="width: 60%;"></span>
        </div>
      `;
    }

    if (relayContainer && !relayContainer.children.length) {
      relayContainer.innerHTML = Array.from({ length: 3 }).map(() => `
        <div class="skeleton-card skeleton-shimmer" style="min-height: 48px; padding: 10px; margin-bottom: 6px;">
          <span class="skeleton-bar" style="width: 75%;"></span>
        </div>
      `).join('');
    }

    if (incidentsContainer && !incidentsContainer.children.length) {
      incidentsContainer.innerHTML = `
        <div class="skeleton-card skeleton-shimmer" style="min-height: 80px; padding: 16px;">
          <span class="skeleton-bar" style="width: 35%; height: 16px; margin-bottom: 8px;"></span>
          <span class="skeleton-bar" style="width: 75%;"></span>
        </div>
      `;
    }

    if (edgesGrid && !edgesGrid.children.length) {
      edgesGrid.innerHTML = Array.from({ length: 4 }).map(() => `
        <div class="skeleton-card skeleton-shimmer" style="min-height: 86px;">
          <span class="skeleton-bar" style="width: 50%;"></span>
          <span class="skeleton-bar" style="width: 80%;"></span>
        </div>
      `).join('');
    }

    if (taskTbody && !taskTbody.children.length) {
      taskTbody.innerHTML = Array.from({ length: 6 }).map(() => `
        <tr class="skeleton-table-row">
          <td><span class="skeleton-bar skeleton-shimmer" style="width: 80px; height: 14px;"></span></td>
          <td><span class="skeleton-bar skeleton-shimmer" style="width: 120px; height: 14px;"></span></td>
          <td><span class="skeleton-bar skeleton-shimmer" style="width: 70px; height: 18px; border-radius: 9999px;"></span></td>
          <td><span class="skeleton-bar skeleton-shimmer" style="width: 95px; height: 14px;"></span></td>
          <td><span class="skeleton-bar skeleton-shimmer" style="width: 220px; height: 14px;"></span></td>
          <td><span class="skeleton-bar skeleton-shimmer" style="width: 65px; height: 26px; border-radius: 4px;"></span></td>
        </tr>
      `).join('');
    }
  }

  // VIEW ROUTING (F-01 ARCHITECTURE)
  function switchView(viewId, updateHash = true) {
    const target = VALID_VIEWS.includes(viewId) ? viewId : 'overview';
    state.currentView = target;

    // 1. Activate matching section and hide others
    VALID_VIEWS.forEach(id => {
      const section = document.getElementById(`view-${id}`);
      if (section) {
        if (id === target) {
          section.classList.add('active-view');
          section.removeAttribute('hidden');
        } else {
          section.classList.remove('active-view');
          section.setAttribute('hidden', 'true');
        }
      }
    });

    // 2. Update navigation active state (Sidebar & Thumb dock)
    document.querySelectorAll('[data-nav]').forEach(el => {
      el.classList.toggle('active', el.getAttribute('data-nav') === target);
    });
    document.querySelectorAll('[data-dock]').forEach(el => {
      el.classList.toggle('active', el.getAttribute('data-dock') === target);
    });

    // 3. Dynamic topbar page title
    const pageTitle = document.getElementById('page-title');
    if (pageTitle && VIEW_TITLES[target]) {
      pageTitle.textContent = VIEW_TITLES[target];
    }

    // 4. Update hash if permitted
    if (updateHash && window.location.hash !== `#/${target}`) {
      window.location.hash = `#/${target}`;
    }

    // 5. Scroll container to top smoothly
    const mainWrapper = document.querySelector('.main-wrapper') || window;
    if (mainWrapper.scrollTo) {
      mainWrapper.scrollTo({ top: 0, behavior: 'instant' });
    }
    window.scrollTo({ top: 0, behavior: 'instant' });

    // 6. Close mobile drawer if open
    const sidebar = document.getElementById('app-sidebar');
    if (sidebar && sidebar.classList.contains('drawer-open')) {
      sidebar.classList.remove('drawer-open');
    }
  }

  function handleHashChange() {
    const rawHash = window.location.hash || '';
    const clean = rawHash.replace(/^#\/?/, '').trim().toLowerCase();
    const viewId = VALID_VIEWS.includes(clean) ? clean : 'overview';
    switchView(viewId, false);
  }

  // DATA FETCHING (Strictly Read-Only GET)
  async function fetchTelemetryData() {
    try {
      const [statusRes, tasksRes, relationsRes] = await Promise.all([
        fetch(`${API_BASE}/api/status`, { method: 'GET', headers: { 'Accept': 'application/json' } }),
        fetch(`${API_BASE}/api/tasks`, { method: 'GET', headers: { 'Accept': 'application/json' } }),
        fetch(`${API_BASE}/api/relations`, { method: 'GET', headers: { 'Accept': 'application/json' } })
      ]);

      if (!statusRes.ok || !tasksRes.ok) {
        throw new Error(`HTTP Error: status=${statusRes.status}, tasks=${tasksRes.status}`);
      }

      const statusData = await statusRes.json();
      const tasksData = await tasksRes.json();
      const relationsData = relationsRes.ok ? await relationsRes.json() : null;

      state.agents = statusData.agents || [];
      state.tasks = tasksData.tasks || [];
      state.relations = relationsData;
      state.lastSyncTime = new Date();

      processAndRender();
      updatePulse('nominal', 'Fleet Synchronized');
    } catch (err) {
      console.warn('Telemetry fetch failed:', err);
      updatePulse('incident', 'Connection Offline');
    }
  }

  // PROCESS DATA & DISPATCH RENDERING
  function processAndRender() {
    // 1. Identify in-flight running tasks
    const runningTasks = state.tasks.filter(t => t.status === 'RUNNING');
    state.hasInFlight = runningTasks.length > 0;

    // 2. Classify Incidents into THREE groups
    // Group 1: Live / Action Required (unresolved FAILED, TIMEOUT, ORPHANED / stuck)
    const liveIncidents = state.tasks.filter(t => {
      const isFailedOrTimeout = (t.status === 'FAILED' || t.status === 'TIMEOUT');
      const isOrphanedOrStuck = (t.status === 'ORPHANED' || t.stuck === true);
      return (isFailedOrTimeout || isOrphanedOrStuck) && !t.resolved;
    });

    // Group 2: Closed without Action (CANCELLED, REJECTED)
    const closedWithoutAction = state.tasks.filter(t => {
      return (t.status === 'CANCELLED' || t.status === 'REJECTED');
    });

    // Group 3: Resolved (have resolution metadata)
    const resolvedTasks = state.tasks.filter(t => !!t.resolved);

    state.activeIncidentCount = liveIncidents.length;

    // Update Topbar and Badges
    const sidebarIncCount = document.getElementById('sidebar-incident-count');
    if (sidebarIncCount) sidebarIncCount.textContent = state.activeIncidentCount;

    const sidebarTaskCount = document.getElementById('sidebar-task-count');
    if (sidebarTaskCount) sidebarTaskCount.textContent = state.tasks.length;

    const incActiveBadge = document.getElementById('incidents-active-badge');
    if (incActiveBadge) incActiveBadge.textContent = `${state.activeIncidentCount} Active`;

    const countAllInc = document.getElementById('count-all-inc');
    if (countAllInc) countAllInc.textContent = liveIncidents.length + closedWithoutAction.length + resolvedTasks.length;

    const countLiveInc = document.getElementById('count-live-inc');
    if (countLiveInc) countLiveInc.textContent = liveIncidents.length;

    const countClosedInc = document.getElementById('count-closed-inc');
    if (countClosedInc) countClosedInc.textContent = closedWithoutAction.length;

    const countResolvedInc = document.getElementById('count-resolved-inc');
    if (countResolvedInc) countResolvedInc.textContent = resolvedTasks.length;

    // Render Panels
    renderFleetMatrix(state.agents);
    renderInFlightCard(runningTasks);
    renderIncidentsDeck(liveIncidents, closedWithoutAction, resolvedTasks);
    renderRecentRelay(state.tasks);
    renderRelationsView(state.relations);
    renderTaskStream(state.tasks);
  }

  // RENDER 1: FLEET VITAL MATRIX (The Luminaries [10 Entities])
  const LUMINARY_ORDER = ['nexus', 'sage', 'athena', 'chronos', 'zephyr', 'daemon', 'iris', 'aegis', 'nacht', 'ariadne'];
  const SATELLITE_ORDER = ['steward', 'warden', 'sentinel'];
  const SATELLITE_SET = new Set(SATELLITE_ORDER);

  function isSatelliteAgent(agent) {
    if (!agent) return false;
    if (agent.kind === 'satellite') return true;
    return SATELLITE_SET.has(String(agent.id || '').toLowerCase());
  }

  function renderLuminaryCell(agent, index) {
    const isRunning = agent.running || agent.status === 'running';
    const isRecent = agent.status === 'recent';
    const statusLabel = isRunning ? 'RUNNING' : (isRecent ? 'RECENT' : 'IDLE');
    const badgeHtml = renderStatusBadge(isRunning ? 'RUNNING' : (isRecent ? 'NOMINAL' : 'NEUTRAL'), statusLabel);
    
    const serviceInfo = agent.service 
      ? `<span class="agent-service-tag" title="Systemd Unit: ${escapeHtml(agent.service.unit)}">${escapeHtml(agent.service.unit)}</span>`
      : `<span class="agent-service-tag">on-demand</span>`;

    const lastActiveFormatted = agent.last_active ? formatTime(agent.last_active) : '-';
    const isNexus = String(agent.id || '').toLowerCase() === 'nexus';
    const rankNum = String(index + 1).padStart(2, '0');
    const cellClass = `agent-vital-cell cell-luminary ${isNexus ? 'cell-orchestrator' : ''}`;

    return `
      <div class="${cellClass}" data-agent-id="${escapeHtml(agent.id)}" role="button" tabindex="0" aria-haspopup="dialog" aria-label="View entity details for ${escapeHtml(agent.name)}">
        <div class="agent-cell-top">
          <div class="agent-name-group">
            <span class="agent-rank-badge mono tabular" title="Luminary Rank #${index + 1}">${rankNum}</span>
            <div class="agent-title-stack">
              <span class="agent-name">${escapeHtml(agent.name)}</span>
              <span class="agent-role" title="${escapeHtml(agent.role || '')}">${escapeHtml(agent.role || '')}</span>
            </div>
          </div>
          ${badgeHtml}
        </div>
        <div class="agent-cell-meta">
          ${serviceInfo}
          <div style="display:flex; align-items:center; gap:8px;">
            <span class="mono tabular" title="Last active">${lastActiveFormatted}</span>
            <span class="agent-cell-action-hint" aria-hidden="true">Inspect ↗</span>
          </div>
        </div>
      </div>
    `;
  }

  function renderSatelliteCell(agent) {
    const isRunning = agent.running || agent.status === 'running';
    const isRecent = agent.status === 'recent';
    const statusLabel = isRunning ? 'ACTIVE' : (isRecent ? 'RECENT' : 'STANDBY');
    const badgeHtml = renderStatusBadge(isRunning ? 'RUNNING' : (isRecent ? 'NOMINAL' : 'NEUTRAL'), statusLabel);
    
    const serviceInfo = agent.service 
      ? `<span class="agent-service-tag service-tag-daemon" title="Systemd Unit: ${escapeHtml(agent.service.unit)}">${escapeHtml(agent.service.unit)}</span>`
      : `<span class="agent-service-tag">daemon</span>`;

    const lastActiveFormatted = agent.last_active ? formatTime(agent.last_active) : '-';
    const cellClass = 'agent-vital-cell cell-satellite';

    return `
      <div class="${cellClass}" data-agent-id="${escapeHtml(agent.id)}" role="button" tabindex="0" aria-haspopup="dialog" aria-label="View satellite details for ${escapeHtml(agent.name)}">
        <div class="agent-cell-top">
          <div class="agent-name-group">
            <span class="satellite-beacon-icon" title="Deterministic Telemetry Satellite Service" aria-hidden="true">
              <span class="satellite-beacon-dot"></span>
            </span>
            <div class="agent-title-stack">
              <span class="agent-name">${escapeHtml(agent.name)}</span>
              <span class="agent-role" title="${escapeHtml(agent.role || '')}">${escapeHtml(agent.role || '')}</span>
            </div>
          </div>
          ${badgeHtml}
        </div>
        <div class="agent-cell-meta">
          ${serviceInfo}
          <div style="display:flex; align-items:center; gap:8px;">
            <span class="mono tabular" title="Last active">${lastActiveFormatted}</span>
            <span class="agent-cell-action-hint" aria-hidden="true">Inspect ↗</span>
          </div>
        </div>
      </div>
    `;
  }

  function renderFleetMatrix(agents) {
    const lumContainer = document.getElementById('luminaries-container');
    const satContainer = document.getElementById('satellites-container');

    if (!lumContainer && !satContainer) return;

    if (!agents || agents.length === 0) {
      if (lumContainer) lumContainer.innerHTML = '<div class="empty-state">No Luminary data available.</div>';
      if (satContainer) satContainer.innerHTML = '';
      return;
    }

    const luminaries = agents.filter(a => !isSatelliteAgent(a));

    // Sort according to canonical Luminary roster order
    luminaries.sort((a, b) => {
      const ia = LUMINARY_ORDER.indexOf(String(a.id || '').toLowerCase());
      const ib = LUMINARY_ORDER.indexOf(String(b.id || '').toLowerCase());
      return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
    });

    const totalCountEl = document.getElementById('agents-total-count');
    if (totalCountEl) totalCountEl.textContent = `${luminaries.length} Luminaries`;

    const lumCountEl = document.getElementById('luminaries-count');
    if (lumCountEl) lumCountEl.textContent = `${luminaries.length} Luminaries`;

    if (satContainer) {
      satContainer.innerHTML = '';
    }

    if (lumContainer) {
      lumContainer.innerHTML = luminaries.map((agent, i) => renderLuminaryCell(agent, i)).join('');
    }

    // ATTACH TACTILE INTERACTION & CLICK-TO-DRILLDOWN ON EACH AGENT VITAL CELL (F-02.5)
    const cells = lumContainer ? lumContainer.querySelectorAll('.agent-vital-cell') : document.querySelectorAll('.agent-vital-cell');
    cells.forEach(cell => {
      cell.onclick = () => {
        const agentId = cell.getAttribute('data-agent-id');
        const agent = (state.agents || []).find(a => String(a.id || '').toLowerCase() === String(agentId || '').toLowerCase());
        if (agent) openAgentDetailModal(agent);
      };
      cell.onkeydown = (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          const agentId = cell.getAttribute('data-agent-id');
          const agent = (state.agents || []).find(a => String(a.id || '').toLowerCase() === String(agentId || '').toLowerCase());
          if (agent) openAgentDetailModal(agent);
        }
      };
    });
  }

  // RENDER 2: IN-FLIGHT EXECUTION CARD (F-02.3)
  function renderInFlightCard(runningTasks) {
    const container = document.getElementById('inflight-container');
    const badge = document.getElementById('inflight-count');
    if (!container || !badge) return;

    badge.textContent = runningTasks.length;

    if (runningTasks.length === 0) {
      container.innerHTML = '<div class="empty-state">No tasks currently running in-flight (Fleet Quiet).</div>';
      return;
    }

    const html = runningTasks.map(task => {
      const intentClean = truncateAtWord(task.intent || 'No intent description provided', 90);
      const elapsed = formatDuration(task.elapsed_seconds);
      const timeout = task.timeout_s ? `${task.timeout_s}s` : '∞';

      return `
        <div class="task-item-compact live-pulse">
          <div class="incident-card-top">
            <div class="incident-id-box">
              <span class="mono tabular" style="font-weight:600; color:var(--accent-cyan);">${escapeHtml(task.task_id)}</span>
              <button type="button" class="btn-copy" data-copy="${escapeHtml(task.task_id)}" aria-label="Copy Task ID">${ICONS.copy}<span>Copy</span></button>
            </div>
            ${renderStatusBadge('RUNNING')}
          </div>
          <div style="font-size:var(--text-xs); color:var(--text-primary);">${escapeHtml(intentClean)}</div>
          <div class="incident-meta-row">
            <span>Executor: <strong class="mono" style="color:var(--text-primary);">${escapeHtml(task.to)}</strong></span>
            <span class="mono tabular">Duration: ${elapsed} / limit: ${timeout}</span>
          </div>
        </div>
      `;
    }).join('');

    container.innerHTML = html;
    bindCopyButtons(container);
  }

  // RENDER 3: ACTIVE INCIDENTS DECK (F-02.2 + F-05.1 + Brief 3 Categories)
  function renderIncidentsDeck(liveIncidents, closedWithoutAction, resolvedTasks) {
    const container = document.getElementById('incidents-container');
    if (!container) return;

    const filter = state.incidentFilter;
    let itemsToRender = [];

    // Filter logic
    if (filter === 'all') {
      itemsToRender = [
        ...liveIncidents.map(t => ({ task: t, group: 'live' })),
        ...closedWithoutAction.map(t => ({ task: t, group: 'closed-no-action' })),
        ...resolvedTasks.map(t => ({ task: t, group: 'resolved' }))
      ];
    } else if (filter === 'live') {
      itemsToRender = liveIncidents.map(t => ({ task: t, group: 'live' }));
    } else if (filter === 'closed-no-action') {
      itemsToRender = closedWithoutAction.map(t => ({ task: t, group: 'closed-no-action' }));
    } else if (filter === 'resolved') {
      itemsToRender = resolvedTasks.map(t => ({ task: t, group: 'resolved' }));
    }

    if (itemsToRender.length === 0) {
      if (liveIncidents.length === 0 && filter === 'live') {
        container.innerHTML = `
          <div class="nominal-state">
            <div class="nominal-title">
              ${ICONS.check}
              <span>FLEET OPERATING NOMINALLY</span>
            </div>
            <div class="nominal-desc">Zero live anomalies or stuck tasks detected across all active entities.</div>
          </div>
        `;
        return;
      }
      container.innerHTML = '<div class="empty-state">No incident entries matching current filter.</div>';
      return;
    }

    // Grouping for render
    const groups = {};
    itemsToRender.forEach(item => {
      if (!groups[item.group]) groups[item.group] = [];
      groups[item.group].push(item.task);
    });

    let html = '';

    // Group: Live Action Required
    if (groups['live'] && groups['live'].length > 0) {
      html += `<div class="incident-group"><div class="group-title" style="color:var(--status-critical-text);">${ICONS.alert} Action Required (${groups['live'].length})</div>`;
      html += groups['live'].map(task => renderSingleIncidentCard(task, 'live')).join('');
      html += `</div>`;
    }

    // Group: Closed Without Action (CANCELLED, REJECTED)
    if (groups['closed-no-action'] && groups['closed-no-action'].length > 0) {
      html += `<div class="incident-group"><div class="group-title" style="color:var(--text-muted);">${ICONS.closed} Closed Without Action (${groups['closed-no-action'].length})</div>`;
      html += groups['closed-no-action'].map(task => renderSingleIncidentCard(task, 'closed-no-action')).join('');
      html += `</div>`;
    }

    // Group: Resolved
    if (groups['resolved'] && groups['resolved'].length > 0) {
      html += `<div class="incident-group"><div class="group-title" style="color:var(--status-resolved-text);">${ICONS.check} Remediated &amp; Resolved (${groups['resolved'].length})</div>`;
      html += groups['resolved'].map(task => renderSingleIncidentCard(task, 'resolved')).join('');
      html += `</div>`;
    }

    container.innerHTML = html;
    bindCopyButtons(container);
  }

  function renderSingleIncidentCard(task, type) {
    const errorFull = task.error || 'Unspecified error';
    const errorDisplay = truncateAtWord(errorFull, 110);
    const intentClean = truncateAtWord(task.intent || '-', 80);
    const durasi = formatDuration(task.elapsed_seconds);

    let statusDisplay = task.status;
    if (task.stuck) statusDisplay = 'ORPHANED';

    let cardClass = 'incident-live';
    if (type === 'closed-no-action') cardClass = 'incident-closed-no-action';
    if (type === 'resolved') cardClass = 'incident-resolved';

    let resolutionBlock = '';
    if (task.resolved) {
      resolutionBlock = `
        <div class="resolution-box">
          <div>Resolved in commit: <span class="mono" style="color:var(--accent-teal); font-weight:600;">${escapeHtml(task.resolved.commit)}</span></div>
          <div style="color:var(--text-muted);">${escapeHtml(task.resolved.reason)}</div>
        </div>
      `;
    } else if (type === 'closed-no-action') {
      resolutionBlock = `
        <div class="resolution-box">
          <div>Closure reason: <span style="color:var(--text-secondary);">${escapeHtml(task.error || 'Administrative event without execution')}</span></div>
        </div>
      `;
    }

    return `
      <div class="incident-card ${cardClass}" data-task-id="${escapeHtml(task.task_id)}">
        <div class="incident-card-top">
          <div class="incident-id-box">
            <span class="mono tabular" style="font-weight:600; color:var(--text-primary);">${escapeHtml(task.task_id)}</span>
            <button type="button" class="btn-copy" data-copy="${escapeHtml(task.task_id)}" aria-label="Copy Task ID">${ICONS.copy}<span>Copy</span></button>
          </div>
          ${renderStatusBadge(statusDisplay)}
        </div>

        <div style="font-size:var(--text-xs); color:var(--text-secondary);">
          Intent: <span style="color:var(--text-primary);">${escapeHtml(intentClean)}</span>
        </div>

        <div class="incident-error-msg" title="${escapeHtml(errorFull)}">
          <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:8px;">
            <span>${escapeHtml(errorDisplay)}</span>
            <button type="button" class="btn-copy" data-copy="${escapeHtml(errorFull)}" title="Copy full error message">${ICONS.copy}<span>Copy</span></button>
          </div>
        </div>

        ${resolutionBlock}

        <div class="incident-meta-row">
          <span>Target: <strong class="mono">${escapeHtml(task.to)}</strong> · From: <strong class="mono">${escapeHtml(task.from)}</strong></span>
          <span class="mono tabular">${formatTime(task.ts)} (${durasi})</span>
        </div>
      </div>
    `;
  }

  // RENDER 4: RECENT HANDOFF RELAY (F-02.4)
  function renderRecentRelay(tasks) {
    const container = document.getElementById('relay-container');
    const badge = document.getElementById('relay-count');
    if (!container || !badge) return;

    const recent = tasks.slice(0, 5);
    badge.textContent = recent.length;

    if (recent.length === 0) {
      container.innerHTML = '<div class="empty-state">No handoff relay events recorded yet.</div>';
      return;
    }

    const html = recent.map(t => {
      const intentClean = truncateAtWord(t.intent || '-', 60);
      return `
        <div class="task-item-compact">
          <div class="incident-card-top">
            <div class="edge-arrow-display">
              <span class="mono">${escapeHtml(t.from)}</span>
              <span class="edge-arrow-icon">${ICONS.arrowRight}</span>
              <span class="mono" style="color:var(--accent-cyan);">${escapeHtml(t.to)}</span>
            </div>
            ${renderStatusBadge(t.status)}
          </div>
          <div style="font-size:var(--text-xs); color:var(--text-secondary);">${escapeHtml(intentClean)}</div>
          <div class="incident-meta-row">
            <span class="mono tabular">${escapeHtml(t.task_id)}</span>
            <span class="mono tabular">${formatDuration(t.elapsed_seconds)}</span>
          </div>
        </div>
      `;
    }).join('');

    container.innerHTML = html;
  }

  // RENDER 5: RELATIONS & WORKFLOW VIEW (F-04 + Strict Brief Rule)
  function renderRelationsView(relations) {
    const dataContainer = document.getElementById('telemetry-edges-grid');
    if (!dataContainer) return;

    if (!relations || !relations.edges || relations.edges.length === 0) {
      dataContainer.innerHTML = '<div class="empty-state">No live telemetry edges recorded from /api/relations.</div>';
      return;
    }

    // Filter telemetry edges to focus purely on 10 Luminaries
    const luminaryEdges = relations.edges.filter(edge => {
      const from = String(edge.from || '').toLowerCase();
      const to = String(edge.to || '').toLowerCase();
      return LUMINARY_ORDER.includes(from) && LUMINARY_ORDER.includes(to);
    });

    if (luminaryEdges.length === 0) {
      dataContainer.innerHTML = '<div class="empty-state">No live telemetry edges recorded among The Luminaries.</div>';
      return;
    }

    // Render Data Layer: Real telemetry edges from /api/relations
    const edgesHtml = luminaryEdges.map(edge => {
      const hasStuck = (edge.stuck_count || 0) > 0;
      const stuckBadge = hasStuck ? `<span class="status-chip chip-critical">${ICONS.alert} 1 Stuck</span>` : '';
      const resolvedBadge = (edge.resolved_count || 0) > 0 ? `<span class="status-chip chip-resolved">${edge.resolved_count} Resolved</span>` : '';

      return `
        <div class="relay-edge-card">
          <div class="relay-edge-header">
            <div class="edge-arrow-display">
              <span class="mono">${escapeHtml(edge.from)}</span>
              <span class="edge-arrow-icon">${ICONS.arrowRight}</span>
              <span class="mono" style="color:var(--accent-teal);">${escapeHtml(edge.to)}</span>
            </div>
            <span class="mono tabular" style="font-size:var(--text-xs); color:var(--text-primary); font-weight:600;">${edge.task_count} Tasks</span>
          </div>

          <div class="edge-stats-row">
            <span>Last Activity:</span>
            <span class="mono tabular">${formatTime(edge.last_active)}</span>
          </div>

          <div style="display:flex; gap:6px; flex-wrap:wrap; margin-top:4px;">
            ${stuckBadge}
            ${resolvedBadge}
          </div>
        </div>
      `;
    }).join('');

    dataContainer.innerHTML = edgesHtml;
  }

  // RENDER 6: TASK STREAM & AUDIT LOG WITH PAGINATION & AGENT FILTER (F-03.3)
  function renderTaskStream(tasks) {
    const tbody = document.getElementById('task-table-body');
    if (!tbody) return;

    const query = (state.taskSearchQuery || '').toLowerCase().trim();
    const statusFilter = state.taskStatusFilter;
    const agentFilter = (state.streamAgentFilter || 'ALL').toLowerCase().trim();

    // 1. Multi-criteria Filtering
    let filtered = (tasks || []).filter(t => {
      // Status filter
      if (statusFilter !== 'ALL' && t.status !== statusFilter) {
        return false;
      }
      // Agent filter (matches either executor 'to' or dispatcher 'from')
      if (agentFilter !== 'all') {
        const toAgent = String(t.to || '').toLowerCase();
        const fromAgent = String(t.from || '').toLowerCase();
        if (toAgent !== agentFilter && fromAgent !== agentFilter) {
          return false;
        }
      }
      // Search query filter
      if (query) {
        const idMatch = (t.task_id || '').toLowerCase().includes(query);
        const intentMatch = (t.intent || '').toLowerCase().includes(query);
        const errorMatch = (t.error || '').toLowerCase().includes(query);
        const toMatch = (t.to || '').toLowerCase().includes(query);
        const fromMatch = (t.from || '').toLowerCase().includes(query);
        if (!idMatch && !intentMatch && !errorMatch && !toMatch && !fromMatch) {
          return false;
        }
      }
      return true;
    });

    const totalCount = filtered.length;
    const totalPages = Math.max(1, Math.ceil(totalCount / state.taskPageSize));

    // Clamp pagination bounds
    if (state.taskPage > totalPages) state.taskPage = totalPages;
    if (state.taskPage < 1) state.taskPage = 1;

    const startIndex = (state.taskPage - 1) * state.taskPageSize;
    const endIndex = Math.min(startIndex + state.taskPageSize, totalCount);
    const pagedTasks = filtered.slice(startIndex, endIndex);

    // Update Pagination Controls
    const rangeTextEl = document.getElementById('pagination-range-text');
    const pageInfoEl = document.getElementById('task-page-info');
    const prevBtn = document.getElementById('task-page-prev');
    const nextBtn = document.getElementById('task-page-next');

    if (rangeTextEl) {
      rangeTextEl.textContent = totalCount === 0
        ? 'Showing 0 of 0 tasks'
        : `Showing ${startIndex + 1}–${endIndex} of ${totalCount} tasks`;
    }
    if (pageInfoEl) {
      pageInfoEl.textContent = `Page ${state.taskPage} of ${totalPages}`;
    }
    if (prevBtn) {
      prevBtn.disabled = state.taskPage <= 1;
    }
    if (nextBtn) {
      nextBtn.disabled = state.taskPage >= totalPages;
    }

    if (totalCount === 0) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:32px; color:var(--text-disabled);">No tasks matching the selected criteria.</td></tr>';
      return;
    }

    const html = pagedTasks.map(t => {
      const intentClean = truncateAtWord(t.intent || '-', 50);
      const durasi = formatDuration(t.elapsed_seconds);

      return `
        <tr data-task-id="${escapeHtml(t.task_id)}">
          <td>
            <div style="display:flex; align-items:center; gap:6px;">
              <span class="mono tabular" style="font-weight:600; color:var(--text-primary);">${escapeHtml(t.task_id)}</span>
              <button type="button" class="btn-copy" data-copy="${escapeHtml(t.task_id)}" title="Copy ID">${ICONS.copy}</button>
            </div>
          </td>
          <td>
            <span class="mono">${escapeHtml(t.from)}</span> ➔ <span class="mono" style="color:var(--accent-cyan);">${escapeHtml(t.to)}</span>
          </td>
          <td>${renderStatusBadge(t.status)}</td>
          <td class="mono tabular">${formatTime(t.ts)} <span style="color:var(--text-muted);">(${durasi})</span></td>
          <td title="${escapeHtml(t.intent || '')}">${escapeHtml(intentClean)}</td>
          <td>
            <button type="button" class="btn btn-sm btn-ghost btn-inspect" data-inspect-id="${escapeHtml(t.task_id)}">
              ${ICONS.inspect}<span>Inspect</span>
            </button>
          </td>
        </tr>
      `;
    }).join('');

    tbody.innerHTML = html;
    bindCopyButtons(tbody);

    // Bind inspect buttons
    tbody.querySelectorAll('.btn-inspect').forEach(btn => {
      btn.onclick = () => {
        const id = btn.getAttribute('data-inspect-id');
        const task = state.tasks.find(t => t.task_id === id);
        if (task) openDrilldownModal(task);
      };
    });
  }

  // Alias for renderTasksStream for backward compatibility
  const renderTasksStream = renderTaskStream;

  // DRILL-DOWN INSPECTION MODAL (F-03.4)
  function openDrilldownModal(task) {
    const modal = document.getElementById('drilldown-modal');
    const body = document.getElementById('modal-task-body');
    const title = document.getElementById('modal-task-title');
    if (!modal || !body) return;

    if (title) title.textContent = `Inspection: ${task.task_id}`;

    const artifactPath = (task.artifacts && task.artifacts[0]) ? task.artifacts[0] : '-';
    const sha = task.artifact_sha256 || '-';
    const errorFull = task.error || 'Zero errors recorded';
    const intentFull = task.intent || '-';

    let resolutionInfo = '-';
    if (task.resolved) {
      resolutionInfo = `Commit: ${task.resolved.commit} · Reason: ${task.resolved.reason}`;
    }

    body.innerHTML = `
      <div class="inspect-grid">
        <span class="inspect-label">Task ID</span>
        <div class="inspect-val" style="display:flex; align-items:center; gap:8px;">
          <span class="mono">${escapeHtml(task.task_id)}</span>
          <button type="button" class="btn-copy" data-copy="${escapeHtml(task.task_id)}">${ICONS.copy}<span>Copy</span></button>
        </div>

        <span class="inspect-label">Status</span>
        <div class="inspect-val">${renderStatusBadge(task.status)}</div>

        <span class="inspect-label">Dispatch Route</span>
        <div class="inspect-val mono">${escapeHtml(task.from)} ➔ ${escapeHtml(task.to)}</div>

        <span class="inspect-label">Timestamp (WIB)</span>
        <div class="inspect-val mono tabular">${formatWibDateTime(task.ts)}</div>

        <span class="inspect-label">Duration / Timeout</span>
        <div class="inspect-val mono tabular">${formatDuration(task.elapsed_seconds)} (Limit: ${task.timeout_s ? task.timeout_s + 's' : '∞'})</div>

        <span class="inspect-label">Output Artifact</span>
        <div class="inspect-val">
          <div style="display:flex; align-items:center; gap:6px;">
            <span class="mono" style="font-size:var(--text-2xs);">${escapeHtml(artifactPath)}</span>
            ${artifactPath !== '-' ? `<button type="button" class="btn-copy" data-copy="${escapeHtml(artifactPath)}">${ICONS.copy}</button>` : ''}
          </div>
        </div>

        <span class="inspect-label">Artifact SHA-256</span>
        <div class="inspect-val">
          <div style="display:flex; align-items:center; gap:6px;">
            <span class="mono" style="font-size:var(--text-2xs);">${escapeHtml(sha)}</span>
            ${sha !== '-' ? `<button type="button" class="btn-copy" data-copy="${escapeHtml(sha)}">${ICONS.copy}</button>` : ''}
          </div>
        </div>

        <span class="inspect-label">Remediation Status</span>
        <div class="inspect-val">${escapeHtml(resolutionInfo)}</div>
      </div>

      <div style="display:flex; flex-direction:column; gap:6px;">
        <span class="inspect-label">Full Intent:</span>
        <div class="inspect-codeblock">${escapeHtml(intentFull)}</div>
      </div>

      <div style="display:flex; flex-direction:column; gap:6px;">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <span class="inspect-label">Error Message / Stack Trace:</span>
          ${task.error ? `<button type="button" class="btn-copy" data-copy="${escapeHtml(task.error)}">${ICONS.copy}<span>Copy Error</span></button>` : ''}
        </div>
        <div class="inspect-codeblock" style="color:var(--status-critical-text);">${escapeHtml(errorFull)}</div>
      </div>
    `;

    bindCopyButtons(body);
    modal.hidden = false;
    modal.classList.add('open');
  }

  function closeModal() {
    const modal = document.getElementById('drilldown-modal');
    if (!modal) return;
    modal.classList.remove('open');
    modal.hidden = true;
  }

  // AGENT DRILL-DOWN DETAIL MODAL (F-02.5 CRAFTSMANSHIP: 1 HERO TASK & TEXT UTUH)
  function openAgentDetailModal(agent) {
    const modal = document.getElementById('agent-detail-modal');
    const nameEl = document.getElementById('modal-agent-name');
    const roleEl = document.getElementById('modal-agent-role');
    const rankEl = document.getElementById('modal-agent-rank');
    const tierEl = document.getElementById('modal-agent-tier');
    const badgeContainer = document.getElementById('modal-agent-status-badge');
    const bodyEl = document.getElementById('modal-agent-body');

    if (!modal || !bodyEl) return;

    const isSat = isSatelliteAgent(agent);
    const isNexus = String(agent.id || '').toLowerCase() === 'nexus';

    // 1. Header Information
    if (nameEl) nameEl.textContent = agent.name;
    if (roleEl) roleEl.textContent = agent.role || 'The Luminaries Entity';

    if (rankEl) {
      if (isSat) {
        const satIdx = SATELLITE_ORDER.indexOf(String(agent.id || '').toLowerCase());
        rankEl.textContent = `SAT-${satIdx >= 0 ? String(satIdx + 1).padStart(2, '0') : '01'}`;
      } else {
        const lumIdx = LUMINARY_ORDER.indexOf(String(agent.id || '').toLowerCase());
        rankEl.textContent = lumIdx >= 0 ? `#${String(lumIdx + 1).padStart(2, '0')}` : '#--';
      }
    }

    if (tierEl) {
      if (isSat) {
        tierEl.textContent = 'THE SATELLITES';
        tierEl.className = 'modal-tier-tag tier-satellites';
      } else if (isNexus) {
        tierEl.textContent = 'SOVEREIGN ORCHESTRATOR';
        tierEl.className = 'modal-tier-tag tier-orchestrator';
      } else {
        tierEl.textContent = 'THE LUMINARIES';
        tierEl.className = 'modal-tier-tag tier-luminaries';
      }
    }

    const isRunning = agent.running || agent.status === 'running';
    const isRecent = agent.status === 'recent';
    const statusLabel = isRunning ? (isSat ? 'ACTIVE' : 'RUNNING') : (isRecent ? 'RECENT' : 'STANDBY');
    if (badgeContainer) {
      badgeContainer.innerHTML = renderStatusBadge(isRunning ? 'RUNNING' : (isRecent ? 'NOMINAL' : 'NEUTRAL'), statusLabel);
    }

    // 2. Compute Runtime & System Identities
    const handoffInPath = `handoff/${agent.id}/in/`;
    const handoffOutPath = `handoff/${agent.id}/out/`;
    const runtimeProfile = isNexus ? '~/.hermes (Gateway)' : (isSat ? 'Background Service / Satellite Daemon' : `~/.hermes/profiles/${agent.id}`);
    const unitName = agent.service?.unit || (isSat ? 'daemon service' : (isNexus ? 'hermes-gateway.service' : 'on-demand CLI profile'));
    const unitState = agent.service?.state || (isRunning ? 'active' : 'inactive');
    const pidsDisplay = agent.pids && agent.pids.length > 0 ? agent.pids.join(', ') : 'No active PID';
    const logSizeText = formatBytes(agent.log_size);
    const cronText = `${agent.cron_jobs || 0} scheduled jobs`;
    const lastActiveIso = agent.last_active || '-';
    const lastActiveWib = agent.last_active ? formatWibDateTime(agent.last_active) : 'No activity yet';
    const idleDuration = agent.age_seconds != null ? `${formatDuration(agent.age_seconds)} ago` : (isRunning ? 'Currently executing' : '-');

    // 3. Filter Tasks for this Agent (as target or origin)
    const agentTasks = (state.tasks || []).filter(t => 
      String(t.to || '').toLowerCase() === String(agent.id || '').toLowerCase() ||
      String(t.from || '').toLowerCase() === String(agent.id || '').toLowerCase()
    );

    agentTasks.sort((a, b) => {
      const ta = new Date(a.ts).getTime() || 0;
      const tb = new Date(b.ts).getTime() || 0;
      return tb - ta;
    });

    // Pangkas menjadi 1 Hero Task terakhir sesuai Doktrin Solaris
    const recentTasks = agentTasks.slice(0, 1);

    // Build Recent Tasks HTML (1 Hero Task)
    let tasksHtml = '';
    if (recentTasks.length === 0) {
      tasksHtml = `
        <div class="agent-empty-tasks">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
          <div class="empty-title">No Task History</div>
          <div class="empty-desc">No active tasks or historical execution recorded for this entity in current telemetry.</div>
          <button type="button" class="btn btn-sm btn-ghost btn-jump-to-stream" data-agent-filter-id="${escapeHtml(agent.id)}" style="margin-top:8px;">
            <span>View in Task Stream →</span>
          </button>
        </div>
      `;
    } else {
      tasksHtml = recentTasks.map(task => {
        const isTarget = String(task.to || '').toLowerCase() === String(agent.id || '').toLowerCase();
        const roleLabel = isTarget ? 'Executor (Target)' : 'Origin (Caller)';
        const roleClass = isTarget ? 'tag-target' : 'tag-origin';
        const artifactPath = (task.artifacts && task.artifacts[0]) ? task.artifacts[0] : null;
        const sha = task.artifact_sha256 || null;
        const hasError = !!task.error;
        const taskTimeWib = formatWibDateTime(task.ts);
        const elapsedText = formatDuration(task.elapsed_seconds);
        const timeoutText = task.timeout_s ? `${task.timeout_s}s` : '∞';

        return `
          <div class="agent-task-card ${hasError ? 'task-card-error' : ''}">
            <div class="agent-task-header">
              <div class="agent-task-id-group">
                <span class="mono tabular task-id-highlight">${escapeHtml(task.task_id)}</span>
                <button type="button" class="btn-copy" data-copy="${escapeHtml(task.task_id)}" aria-label="Copy Task ID">
                  ${ICONS.copy}<span>Copy ID</span>
                </button>
                <span class="agent-role-pill ${roleClass}">${roleLabel}</span>
              </div>
              <div class="agent-task-badges">
                ${renderStatusBadge(task.status)}
              </div>
            </div>

            <div class="agent-task-meta-bar mono tabular">
              <span title="Dispatch Route">${escapeHtml(task.from)} ➔ ${escapeHtml(task.to)}</span>
              <span>·</span>
              <span title="Execution Timestamp">${taskTimeWib}</span>
              <span>·</span>
              <span title="Execution Duration">${elapsedText} (Limit: ${timeoutText})</span>
            </div>

            <div class="agent-task-intent-wrap">
              <div class="agent-task-intent-head">
                <span class="agent-task-intent-label">Intent / Full Instructions:</span>
                <button type="button" class="btn-copy" data-copy="${escapeHtml(task.intent || '')}" aria-label="Copy Intent">
                  ${ICONS.copy}<span>Copy Intent</span>
                </button>
              </div>
              <div class="agent-task-intent-text">${escapeHtml(task.intent || 'No intent description provided')}</div>
            </div>

            ${artifactPath || sha ? `
              <div class="agent-task-artifact-row">
                <span class="inspect-label">Artifact:</span>
                <div class="artifact-meta-stack mono">
                  ${artifactPath ? `
                    <div class="artifact-line">
                      <span class="artifact-path-text">${escapeHtml(artifactPath)}</span>
                      <button type="button" class="btn-copy" data-copy="${escapeHtml(artifactPath)}" aria-label="Copy Artifact Path">${ICONS.copy}<span>Path</span></button>
                    </div>
                  ` : ''}
                  ${sha ? `
                    <div class="artifact-line">
                      <span class="artifact-sha-text">SHA: ${escapeHtml(sha)}</span>
                      <button type="button" class="btn-copy" data-copy="${escapeHtml(sha)}" aria-label="Copy Artifact SHA">${ICONS.copy}<span>SHA</span></button>
                    </div>
                  ` : ''}
                </div>
              </div>
            ` : ''}

            ${hasError ? `
              <div class="agent-task-error-box">
                <div class="error-box-head">
                  <span class="error-box-title">Error Message / Stack Trace:</span>
                  <button type="button" class="btn-copy" data-copy="${escapeHtml(task.error)}" aria-label="Copy Error Message">
                    ${ICONS.copy}<span>Copy Error</span>
                  </button>
                </div>
                <div class="inspect-codeblock error-codeblock">${escapeHtml(task.error)}</div>
              </div>
            ` : ''}

            <div class="agent-task-footer" style="display:flex; justify-content:space-between; align-items:center;">
              <button type="button" class="btn btn-sm btn-ghost btn-jump-to-stream" data-agent-filter-id="${escapeHtml(agent.id)}">
                <span>View in Task Stream →</span>
              </button>
              <button type="button" class="btn btn-sm btn-ghost btn-inspect-task" data-inspect-task-id="${escapeHtml(task.task_id)}">
                ${ICONS.inspect}<span>Full Inspection</span>
              </button>
            </div>
          </div>
        `;
      }).join('');
    }

    // Build modal body HTML
    bodyEl.innerHTML = `
      <!-- 1. OPERATIONAL MANDATE -->
      <div class="agent-modal-section">
        <div class="agent-section-label">OPERATIONAL MANDATE &amp; ROLE</div>
        <div class="agent-mandate-card">
          <p class="agent-mandate-text">${escapeHtml(agent.desc || 'Sovereign entity operating within The Luminaries ecosystem.')}</p>
        </div>
      </div>

      <!-- 2. SYSTEM IDENTITY & RUNTIME -->
      <div class="agent-modal-section">
        <div class="agent-section-label">SYSTEM IDENTITY &amp; RUNTIME SPECIFICATIONS</div>
        <div class="agent-specs-grid">
          <div class="spec-cell">
            <span class="spec-label">Service Unit / Daemon</span>
            <div class="spec-val">
              <span class="mono">${escapeHtml(unitName)}</span>
              <span class="spec-unit-state ${unitState === 'active' ? 'state-active' : 'state-inactive'}">${escapeHtml(unitState)}</span>
            </div>
          </div>

          <div class="spec-cell">
            <span class="spec-label">Gateway / Runtime Profile</span>
            <div class="spec-val mono">${escapeHtml(runtimeProfile)}</div>
          </div>

          <div class="spec-cell">
            <span class="spec-label">Active Process PIDs</span>
            <div class="spec-val mono tabular">${escapeHtml(pidsDisplay)}</div>
          </div>

          <div class="spec-cell">
            <span class="spec-label">Log Size &amp; Scheduled Cron</span>
            <div class="spec-val mono tabular">${escapeHtml(logSizeText)} · ${escapeHtml(cronText)}</div>
          </div>

          <div class="spec-cell spec-cell-wide">
            <span class="spec-label">Handoff Directories (In / Out)</span>
            <div class="spec-val-handoff">
              <div class="handoff-line">
                <span class="handoff-tag tag-in">IN</span>
                <span class="mono">${escapeHtml(handoffInPath)}</span>
                <button type="button" class="btn-copy" data-copy="${escapeHtml(handoffInPath)}" aria-label="Copy In Path">
                  ${ICONS.copy}<span>Copy</span>
                </button>
              </div>
              <div class="handoff-line">
                <span class="handoff-tag tag-out">OUT</span>
                <span class="mono">${escapeHtml(handoffOutPath)}</span>
                <button type="button" class="btn-copy" data-copy="${escapeHtml(handoffOutPath)}" aria-label="Copy Out Path">
                  ${ICONS.copy}<span>Copy</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 3. TIME TELEMETRY & LIVE METRICS -->
      <div class="agent-modal-section">
        <div class="agent-section-label">TIME TELEMETRY &amp; LIVE STATUS</div>
        <div class="agent-telemetry-strip">
          <div class="telem-item">
            <span class="telem-label">Last Active (WIB)</span>
            <span class="telem-val mono tabular">${escapeHtml(lastActiveWib)}</span>
          </div>
          <div class="telem-item">
            <span class="telem-label">ISO Timestamp</span>
            <span class="telem-val mono tabular">${escapeHtml(lastActiveIso)}</span>
          </div>
          <div class="telem-item">
            <span class="telem-label">Operating / Idle Duration</span>
            <span class="telem-val mono tabular">${escapeHtml(idleDuration)}</span>
          </div>
        </div>

        ${agent.errors && (agent.errors.fatal || agent.errors.tail) ? `
          <div class="agent-system-error-card">
            <div class="error-card-header">
              <span class="error-badge-live">System Log Error Recorded</span>
              <span class="mono tabular" style="font-size:var(--text-2xs); color:var(--text-muted);">${escapeHtml(agent.errors.last_at || '')}</span>
              ${agent.errors.tail ? `
                <button type="button" class="btn-copy" data-copy="${escapeHtml(agent.errors.tail)}" aria-label="Copy Log Error">
                  ${ICONS.copy}<span>Copy Error</span>
                </button>
              ` : ''}
            </div>
            <div class="inspect-codeblock error-codeblock">${escapeHtml(agent.errors.tail || 'Unknown system error')}</div>
          </div>
        ` : ''}
      </div>

      <!-- 4. LATEST TASK EXECUTION (1 HERO TASK) -->
      <div class="agent-modal-section">
        <div class="agent-tasks-section-header">
          <div class="agent-section-label">LATEST TASK EXECUTION</div>
          <span class="agent-tasks-count mono tabular">${agentTasks.length > 0 ? `1 of ${agentTasks.length} Tasks` : '0 Tasks'}</span>
        </div>
        <div class="agent-tasks-list">
          ${tasksHtml}
        </div>
      </div>
    `;

    bindCopyButtons(bodyEl);

    // Bind full drilldown switch from inside agent modal
    bodyEl.querySelectorAll('.btn-inspect-task').forEach(btn => {
      btn.onclick = () => {
        const taskId = btn.getAttribute('data-inspect-task-id');
        const task = (state.tasks || []).find(t => t.task_id === taskId);
        if (task) {
          closeAgentDetailModal();
          openDrilldownModal(task);
        }
      };
    });

    // Bind "View in Task Stream →" button inside agent modal
    bodyEl.querySelectorAll('.btn-jump-to-stream').forEach(btn => {
      btn.onclick = () => {
        const agentId = btn.getAttribute('data-agent-filter-id');
        closeAgentDetailModal();
        switchView('stream', true);
        const filterSelect = document.getElementById('stream-agent-filter');
        if (filterSelect && agentId) {
          const targetVal = agentId.toLowerCase();
          const matchingOpt = Array.from(filterSelect.options).find(opt => opt.value.toLowerCase() === targetVal);
          if (matchingOpt) {
            filterSelect.value = matchingOpt.value;
          }
        }
        state.streamAgentFilter = (agentId || 'ALL').toLowerCase();
        state.taskPage = 1;
        renderTaskStream(state.tasks);
      };
    });

    modal.hidden = false;
    modal.classList.add('open');
  }

  function closeAgentDetailModal() {
    const modal = document.getElementById('agent-detail-modal');
    if (!modal) return;
    modal.classList.remove('open');
    modal.hidden = true;
  }

  // PULSE PILL UPDATE
  function updatePulse(status, text) {
    const pill = document.getElementById('telemetry-pulse');
    const label = document.getElementById('pulse-text');
    if (!pill || !label) return;
    pill.setAttribute('data-status', status);
    label.textContent = text;
  }

  // THERMAL DISCIPLINE & ADAPTIVE POLLING (NF-03)
  function scheduleNextPoll() {
    if (state.pollTimer) clearTimeout(state.pollTimer);
    if (state.isPaused) return;

    // Zero fetch when page is hidden
    if (document.visibilityState === 'hidden') {
      return;
    }

    const interval = state.hasInFlight ? POLLING_FAST_MS : POLLING_SLOW_MS;
    state.pollTimer = setTimeout(async () => {
      await fetchTelemetryData();
      scheduleNextPoll();
    }, interval);
  }

  // EVENT BINDINGS
  function setupEventListeners() {
    // Page Visibility API (NF-03)
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        if (!state.isPaused) {
          fetchTelemetryData();
          scheduleNextPoll();
        }
      } else {
        if (state.pollTimer) clearTimeout(state.pollTimer);
      }
    });

    // Hash change routing
    window.addEventListener('hashchange', handleHashChange);

    // Polling pause/resume toggle (F-03.5)
    const pauseBtn = document.getElementById('polling-toggle-btn');
    if (pauseBtn) {
      pauseBtn.onclick = () => {
        state.isPaused = !state.isPaused;
        const icon = document.getElementById('polling-icon');
        const text = document.getElementById('polling-btn-text');
        if (state.isPaused) {
          if (state.pollTimer) clearTimeout(state.pollTimer);
          updatePulse('paused', 'Telemetry Paused');
          if (text) text.textContent = 'Resume Polling';
          if (icon) icon.innerHTML = '<polygon points="5 3 19 12 5 21 5 3"></polygon>';
        } else {
          updatePulse('nominal', 'Synchronizing...');
          if (text) text.textContent = 'Pause Polling';
          if (icon) icon.innerHTML = '<rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect>';
          fetchTelemetryData();
          scheduleNextPoll();
        }
      };
    }

    // Manual Refresh buttons
    const syncButtons = [
      document.getElementById('manual-refresh-btn'),
      document.getElementById('topbar-sync-btn'),
      document.getElementById('dock-btn-sync')
    ];
    syncButtons.forEach(btn => {
      if (btn) {
        btn.onclick = () => {
          fetchTelemetryData();
          if (!state.isPaused) scheduleNextPoll();
        };
      }
    });

    // Mobile drawer toggle
    const drawerBtn = document.getElementById('mobile-drawer-toggle');
    const sidebar = document.getElementById('app-sidebar');
    if (drawerBtn && sidebar) {
      drawerBtn.onclick = () => {
        sidebar.classList.toggle('drawer-open');
      };
    }

    // Modal close (Drilldown Task & Agent Detail)
    const modalCloseBtn = document.getElementById('modal-close-btn');
    const modal = document.getElementById('drilldown-modal');
    if (modalCloseBtn) modalCloseBtn.onclick = closeModal;
    if (modal) {
      modal.onclick = (e) => {
        if (e.target === modal) closeModal();
      };
    }

    const modalAgentCloseBtn = document.getElementById('modal-agent-close-btn');
    const agentModal = document.getElementById('agent-detail-modal');
    if (modalAgentCloseBtn) modalAgentCloseBtn.onclick = closeAgentDetailModal;
    if (agentModal) {
      agentModal.onclick = (e) => {
        if (e.target === agentModal) closeAgentDetailModal();
      };
    }

    // Keyboard Shortcuts (PRD F-03 / Anti-slop)
    document.addEventListener('keydown', (e) => {
      // Escape closes any open modal
      if (e.key === 'Escape') {
        closeModal();
        closeAgentDetailModal();
        return;
      }

      // If user is typing in an input/textarea/select, do not intercept single-key shortcuts
      const activeTag = document.activeElement ? document.activeElement.tagName.toLowerCase() : '';
      if (activeTag === 'input' || activeTag === 'textarea' || activeTag === 'select') {
        return;
      }

      // '/' focuses search
      if (e.key === '/') {
        e.preventDefault();
        const searchInput = document.getElementById('task-search-input');
        if (searchInput) {
          switchView('stream', true);
          searchInput.focus();
          searchInput.select();
        }
      }
    });

    // Sub-filters for incidents (Brief + F-03.2)
    const incidentFilterBtns = document.querySelectorAll('[data-incident-filter]');
    incidentFilterBtns.forEach(btn => {
      btn.onclick = () => {
        incidentFilterBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.incidentFilter = btn.getAttribute('data-incident-filter');
        // Re-classify and render
        const liveIncidents = state.tasks.filter(t => (t.status === 'FAILED' || t.status === 'TIMEOUT' || t.status === 'ORPHANED' || t.stuck) && !t.resolved);
        const closedWithoutAction = state.tasks.filter(t => t.status === 'CANCELLED' || t.status === 'REJECTED');
        const resolvedTasks = state.tasks.filter(t => !!t.resolved);
        renderIncidentsDeck(liveIncidents, closedWithoutAction, resolvedTasks);
      };
    });

    // Task stream search input (F-03.3)
    const searchInput = document.getElementById('task-search-input');
    if (searchInput) {
      searchInput.oninput = (e) => {
        state.taskSearchQuery = e.target.value;
        state.taskPage = 1;
        renderTaskStream(state.tasks);
      };
    }

    // Task stream agent filter dropdown
    const streamAgentSelect = document.getElementById('stream-agent-filter');
    if (streamAgentSelect) {
      streamAgentSelect.onchange = (e) => {
        state.streamAgentFilter = e.target.value;
        state.taskPage = 1;
        renderTaskStream(state.tasks);
      };
    }

    // Task stream pagination buttons
    const prevBtn = document.getElementById('task-page-prev');
    if (prevBtn) {
      prevBtn.onclick = () => {
        if (state.taskPage > 1) {
          state.taskPage--;
          renderTaskStream(state.tasks);
        }
      };
    }

    const nextBtn = document.getElementById('task-page-next');
    if (nextBtn) {
      nextBtn.onclick = () => {
        state.taskPage++;
        renderTaskStream(state.tasks);
      };
    }

    // Task stream status filters
    const statusFilterBtns = document.querySelectorAll('[data-task-status]');
    statusFilterBtns.forEach(btn => {
      btn.onclick = () => {
        statusFilterBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.taskStatusFilter = btn.getAttribute('data-task-status');
        state.taskPage = 1;
        renderTaskStream(state.tasks);
      };
    });

    // Relations Tab switcher (Data vs PRD Doc)
    const tabData = document.getElementById('tab-rel-data');
    const tabDoc = document.getElementById('tab-rel-doc');
    const panelData = document.getElementById('panel-rel-data');
    const panelDoc = document.getElementById('panel-rel-doc');

    if (tabData && tabDoc && panelData && panelDoc) {
      tabData.onclick = () => {
        tabData.classList.add('active');
        tabData.setAttribute('aria-selected', 'true');
        tabDoc.classList.remove('active');
        tabDoc.setAttribute('aria-selected', 'false');
        panelData.hidden = false;
        panelDoc.hidden = true;
      };
      tabDoc.onclick = () => {
        tabDoc.classList.add('active');
        tabDoc.setAttribute('aria-selected', 'true');
        tabData.classList.remove('active');
        tabData.setAttribute('aria-selected', 'false');
        panelDoc.hidden = false;
        panelData.hidden = true;
      };
    }

    // Brand link in sidebar (Returns to overview)
    const brandLink = document.querySelector('.brand');
    if (brandLink) {
      brandLink.onclick = (e) => {
        e.preventDefault();
        switchView('overview', true);
      };
    }

    // Navigation item clicks (Sidebar & Thumb Dock view routing)
    const navItems = document.querySelectorAll('[data-nav], [data-dock]');
    navItems.forEach(item => {
      item.onclick = (e) => {
        e.preventDefault();
        const targetView = item.getAttribute('data-nav') || item.getAttribute('data-dock');
        if (targetView) {
          switchView(targetView, true);
        }
      };
    });
  }

  // INITIALIZATION
  async function init() {
    startRealtimeClock();
    setupEventListeners();
    renderSkeletons();

    // Check initial URL hash
    const initialHash = (window.location.hash || '').replace(/^#\/?/, '').trim().toLowerCase();
    if (VALID_VIEWS.includes(initialHash)) {
      switchView(initialHash, false);
    } else {
      switchView('overview', false);
    }

    await fetchTelemetryData();
    scheduleNextPoll();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
