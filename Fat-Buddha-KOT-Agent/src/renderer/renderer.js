import { firebaseService } from './firebaseService.js';

// Application State
const state = {
  config: null,
  printers: [],
  firebaseConnected: false,
  printerReady: false,
  activeTab: 'dashboard',
  stats: {
    pending: 0,
    printed: 0,
    failed: 0,
    lastKot: 'None',
    lastPrintTime: 'None'
  },
  recentJobs: [],
  failedJobs: []
};

// DOM Element References
const elements = {
  // Tabs & Views
  navTabs: document.querySelectorAll('.nav-tab'),
  viewDashboard: document.getElementById('viewDashboard'),
  viewLogs: document.getElementById('viewLogs'),
  viewSettings: document.getElementById('viewSettings'),

  // Header
  headerRestaurantName: document.getElementById('headerRestaurantName'),
  headerFirebasePill: document.getElementById('headerFirebasePill'),
  headerFirebaseDot: document.getElementById('headerFirebaseDot'),
  headerFirebaseText: document.getElementById('headerFirebaseText'),
  headerPrinterPill: document.getElementById('headerPrinterPill'),
  headerPrinterDot: document.getElementById('headerPrinterDot'),
  headerPrinterText: document.getElementById('headerPrinterText'),
  headerDestinationTag: document.getElementById('headerDestinationTag'),

  // Window actions
  btnMinimize: document.getElementById('btnMinimize'),
  btnHideToTray: document.getElementById('btnHideToTray'),

  // Banners
  pausedBanner: document.getElementById('pausedBanner'),
  btnResumeBanner: document.getElementById('btnResumeBanner'),
  connectionErrorBanner: document.getElementById('connectionErrorBanner'),
  connectionErrorText: document.getElementById('connectionErrorText'),
  btnRetryConnection: document.getElementById('btnRetryConnection'),

  // Dashboard
  dashDestBadge: document.getElementById('dashDestBadge'),
  dashRestaurantName: document.getElementById('dashRestaurantName'),
  dashPrinterName: document.getElementById('dashPrinterName'),
  dashPaperWidth: document.getElementById('dashPaperWidth'),
  statPendingCount: document.getElementById('statPendingCount'),
  statPrintedCount: document.getElementById('statPrintedCount'),
  statFailedCount: document.getElementById('statFailedCount'),
  statLastKot: document.getElementById('statLastKot'),
  statLastPrintTime: document.getElementById('statLastPrintTime'),
  filterDestinationLabel: document.getElementById('filterDestinationLabel'),
  activityTableBody: document.getElementById('activityTableBody'),

  // Action buttons
  btnTogglePause: document.getElementById('btnTogglePause'),
  btnPauseIcon: document.getElementById('btnPauseIcon'),
  btnPauseLabel: document.getElementById('btnPauseLabel'),
  btnTestPrint: document.getElementById('btnTestPrint'),
  btnRetryFailed: document.getElementById('btnRetryFailed'),
  retryFailedCount: document.getElementById('retryFailedCount'),
  btnOpenSettings: document.getElementById('btnOpenSettings'),

  // Logs
  logsTableBody: document.getElementById('logsTableBody'),
  btnClearLogs: document.getElementById('btnClearLogs'),
  btnRefreshLogs: document.getElementById('btnRefreshLogs'),

  // Settings
  settingsForm: document.getElementById('settingsForm'),
  inputRestaurantName: document.getElementById('inputRestaurantName'),
  selectDestination: document.getElementById('selectDestination'),
  selectPrinter: document.getElementById('selectPrinter'),
  selectPaperWidth: document.getElementById('selectPaperWidth'),
  btnRefreshPrinters: document.getElementById('btnRefreshPrinters'),
  diagFirebaseDot: document.getElementById('diagFirebaseDot'),
  diagFirebaseText: document.getElementById('diagFirebaseText'),
  diagPrinterDot: document.getElementById('diagPrinterDot'),
  diagPrinterText: document.getElementById('diagPrinterText'),
  checkStartWithWindows: document.getElementById('checkStartWithWindows'),
  checkAutoRetry: document.getElementById('checkAutoRetry'),
  checkSoundAlerts: document.getElementById('checkSoundAlerts'),
  btnSettingsTestPrint: document.getElementById('btnSettingsTestPrint'),
  btnResetConfig: document.getElementById('btnResetConfig'),
  setupStatusBadge: document.getElementById('setupStatusBadge'),

  // Audio & Footer
  kotAudioChime: document.getElementById('kotAudioChime'),
  footerStatusSummary: document.getElementById('footerStatusSummary')
};

// ------------------------------------------------------------------
// Initialization
// ------------------------------------------------------------------
async function initApp() {
  setupEventListeners();

  // 1. Load Local Configuration
  state.config = await window.electronAPI.getConfig();
  populateSettingsForm(state.config);
  updateDashboardUI();

  // 2. Enumerate Windows Printers
  await refreshPrintersList();

  // 3. Initialize Firebase Connection
  const firebaseConfig = await window.electronAPI.getFirebaseConfig();
  if (firebaseConfig) {
    const initialized = await firebaseService.init(firebaseConfig);
    if (initialized) {
      startPrintJobListener();
    }
  }

  // 4. Register Firebase status listener
  firebaseService.onConnectionChange((connected, error) => {
    state.firebaseConnected = connected;
    updateStatusIndicators(error);
  });

  // 5. Load Initial Logs
  await refreshLogsTable();

  // 6. Check if first run
  if (!state.config.isSetupComplete || !state.config.selectedPrinter) {
    switchTab('settings');
    elements.setupStatusBadge.textContent = 'First-Run Setup';
    elements.setupStatusBadge.className = 'badge badge-amber';
  } else {
    elements.setupStatusBadge.textContent = 'Configured';
    elements.setupStatusBadge.className = 'badge badge-green';
  }

  // Periodic heartbeat checks
  setInterval(async () => {
    if (state.config && state.config.selectedPrinter) {
      await checkCurrentPrinterStatus();
    }
  }, 10000);
}

// ------------------------------------------------------------------
// Event Listeners
// ------------------------------------------------------------------
function setupEventListeners() {
  // Navigation Tabs
  elements.navTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      switchTab(tab.getAttribute('data-tab'));
    });
  });

  // Window Controls
  elements.btnMinimize.addEventListener('click', () => window.electronAPI.minimize());
  elements.btnHideToTray.addEventListener('click', () => window.electronAPI.hideToTray());

  // Action Bar Controls
  elements.btnTogglePause.addEventListener('click', togglePausePrinting);
  elements.btnResumeBanner.addEventListener('click', togglePausePrinting);
  elements.btnTestPrint.addEventListener('click', handleTestPrint);
  elements.btnSettingsTestPrint.addEventListener('click', handleTestPrint);
  elements.btnRetryFailed.addEventListener('click', handleRetryFailedJobs);
  elements.btnOpenSettings.addEventListener('click', () => switchTab('settings'));
  elements.btnRetryConnection.addEventListener('click', async () => {
    await firebaseService.checkConnection();
  });

  // Logs Controls
  elements.btnClearLogs.addEventListener('click', async () => {
    if (confirm('Are you sure you want to clear local print logs?')) {
      await window.electronAPI.clearLogs();
      await refreshLogsTable();
    }
  });
  elements.btnRefreshLogs.addEventListener('click', refreshLogsTable);

  // Settings Form
  elements.btnRefreshPrinters.addEventListener('click', refreshPrintersList);
  elements.selectPrinter.addEventListener('change', () => {
    checkCurrentPrinterStatus();
  });
  elements.settingsForm.addEventListener('submit', handleSaveSettings);
  elements.btnResetConfig.addEventListener('click', handleResetConfig);

  // IPC Event hooks from Main process / Tray
  window.electronAPI.onConfigUpdated((newConfig) => {
    state.config = newConfig;
    updateDashboardUI();
  });

  window.electronAPI.onTriggerTestPrint(() => {
    handleTestPrint();
  });

  window.electronAPI.onNavigateTo((route) => {
    switchTab(route);
  });
}

// ------------------------------------------------------------------
// UI View Switching
// ------------------------------------------------------------------
function switchTab(tabId) {
  state.activeTab = tabId;
  elements.navTabs.forEach(tab => {
    tab.classList.toggle('active', tab.getAttribute('data-tab') === tabId);
  });

  elements.viewDashboard.classList.toggle('active', tabId === 'dashboard');
  elements.viewLogs.classList.toggle('active', tabId === 'logs');
  elements.viewSettings.classList.toggle('active', tabId === 'settings');

  if (tabId === 'logs') {
    refreshLogsTable();
  }
}

// ------------------------------------------------------------------
// Status Indicators
// ------------------------------------------------------------------
function updateStatusIndicators(errorMsg = null) {
  // Firebase Status
  if (state.firebaseConnected) {
    elements.headerFirebaseDot.className = 'status-dot connected';
    elements.headerFirebaseText.textContent = 'Firebase: Connected';
    elements.diagFirebaseDot.className = 'status-dot connected';
    elements.diagFirebaseText.textContent = 'Connected (Live)';
    elements.connectionErrorBanner.classList.add('hidden');
  } else {
    elements.headerFirebaseDot.className = 'status-dot disconnected';
    elements.headerFirebaseText.textContent = 'Firebase: Offline';
    elements.diagFirebaseDot.className = 'status-dot disconnected';
    elements.diagFirebaseText.textContent = 'Disconnected';
    elements.connectionErrorBanner.classList.remove('hidden');
    if (errorMsg) {
      elements.connectionErrorText.textContent = `Connection error: ${errorMsg}`;
    }
  }

  // Printer Status
  if (state.printerReady) {
    elements.headerPrinterDot.className = 'status-dot ready';
    elements.headerPrinterText.textContent = 'Printer: Ready';
    elements.diagPrinterDot.className = 'status-dot ready';
    elements.diagPrinterText.textContent = 'Ready';
  } else {
    elements.headerPrinterDot.className = 'status-dot offline';
    elements.headerPrinterText.textContent = state.config?.selectedPrinter ? 'Printer: Offline' : 'Printer: None';
    elements.diagPrinterDot.className = 'status-dot offline';
    elements.diagPrinterText.textContent = state.config?.selectedPrinter ? 'Offline / Unreachable' : 'No Printer Selected';
  }

  // Destination Tag
  const dest = state.config?.destination || 'KITCHEN';
  elements.headerDestinationTag.textContent = dest;
  elements.dashDestBadge.textContent = `${dest} AGENT`;
  elements.filterDestinationLabel.textContent = dest;
}

// ------------------------------------------------------------------
// Printer Enumeration & Validation
// ------------------------------------------------------------------
async function refreshPrintersList() {
  try {
    elements.selectPrinter.innerHTML = '<option value="">Scanning Windows printers...</option>';
    const printers = await window.electronAPI.getPrinters();
    state.printers = printers;

    elements.selectPrinter.innerHTML = '<option value="">-- Select Windows Thermal Printer --</option>';

    if (printers.length === 0) {
      const opt = document.createElement('option');
      opt.value = '';
      opt.textContent = 'No printers detected in Windows';
      elements.selectPrinter.appendChild(opt);
    } else {
      printers.forEach(p => {
        const opt = document.createElement('option');
        opt.value = p.name;
        opt.textContent = `${p.displayName || p.name} ${p.isDefault ? '(Windows Default)' : ''}`;
        if (state.config && state.config.selectedPrinter === p.name) {
          opt.selected = true;
        }
        elements.selectPrinter.appendChild(opt);
      });
    }

    await checkCurrentPrinterStatus();
  } catch (err) {
    console.error('Failed to enumerate printers:', err);
  }
}

async function checkCurrentPrinterStatus() {
  const selectedName = elements.selectPrinter.value || state.config?.selectedPrinter;
  if (!selectedName) {
    state.printerReady = false;
    updateStatusIndicators();
    return;
  }

  try {
    const status = await window.electronAPI.checkPrinterStatus(selectedName);
    state.printerReady = !!status.ready;
  } catch {
    state.printerReady = false;
  }
  updateStatusIndicators();
}

// ------------------------------------------------------------------
// Real-Time Print Job Listener & Idempotent Processing
// ------------------------------------------------------------------
function startPrintJobListener() {
  const dest = state.config?.destination || 'KITCHEN';

  firebaseService.subscribeToPrintJobs(
    dest,
    async (job) => {
      // New PENDING job detected!
      state.stats.pending += 1;
      updateStatsDisplay();

      // Play audio chime if enabled
      if (state.config?.soundAlerts && elements.kotAudioChime) {
        elements.kotAudioChime.play().catch(() => {});
      }

      // Add to live UI table
      addJobToActivityTable(job, 'PENDING');

      // Check if paused
      if (state.config?.isPaused) {
        console.log(`[Agent] Printing is PAUSED. Job ${job.id} will remain pending in Firestore.`);
        return;
      }

      // Check printer readiness
      if (!state.config?.selectedPrinter) {
        console.warn(`[Agent] No printer configured. Cannot process job ${job.id}`);
        addJobToActivityTable(job, 'FAILED', 'No printer configured in settings');
        return;
      }

      // Execute ATOMIC claim and print
      await processPrintJob(job);
    },
    (err) => {
      console.error('[Agent] Firestore listener error:', err);
      updateStatusIndicators(err.message);
    }
  );
}

async function processPrintJob(job) {
  const jobId = job.id;
  updateJobRowStatus(jobId, 'PRINTING');

  const result = await firebaseService.claimAndPrintJob(jobId, async (claimedJob) => {
    // Invoke Electron Main Print Engine
    const payload = claimedJob.payload || {};
    return await window.electronAPI.printKOT(
      payload,
      state.config.selectedPrinter,
      { paperWidth: state.config.paperWidth }
    );
  });

  if (result.success) {
    state.stats.pending = Math.max(0, state.stats.pending - 1);
    state.stats.printed += 1;
    state.stats.lastKot = `${job.payload?.kotNumber || job.id} (Table T${job.payload?.tableNumber || '--'})`;
    state.stats.lastPrintTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    updateStatsDisplay();
    updateJobRowStatus(jobId, 'PRINTED');
  } else if (!result.skipped) {
    state.stats.pending = Math.max(0, state.stats.pending - 1);
    state.stats.failed += 1;
    updateStatsDisplay();
    updateJobRowStatus(jobId, 'FAILED', result.error);

    // Track for retry
    if (!state.failedJobs.includes(jobId)) {
      state.failedJobs.push(jobId);
    }
    updateRetryButton();
  }
}

// ------------------------------------------------------------------
// Activity Table Management
// ------------------------------------------------------------------
function addJobToActivityTable(job, status, error = null) {
  const tbody = elements.activityTableBody;
  const emptyRow = tbody.querySelector('.empty-row');
  if (emptyRow) emptyRow.remove();

  const existingRow = document.getElementById(`job-row-${job.id}`);
  if (existingRow) {
    updateJobRowStatus(job.id, status, error);
    return;
  }

  const row = document.createElement('tr');
  row.id = `job-row-${job.id}`;

  const timeFormatted = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const kotNumber = job.payload?.kotNumber || job.kotId || job.id;
  const tableNum = job.payload?.tableNumber ? `T${job.payload.tableNumber < 10 ? '0' + job.payload.tableNumber : job.payload.tableNumber}` : 'N/A';
  const dest = job.destination || state.config.destination;

  row.innerHTML = `
    <td>${timeFormatted}</td>
    <td class="font-mono font-bold">${kotNumber}</td>
    <td class="font-bold">${tableNum}</td>
    <td><span class="badge badge-amber">${dest}</span></td>
    <td>${getStatusBadgeHtml(status)}</td>
    <td>
      <button class="btn btn-secondary btn-sm" onclick="window.retrySpecificJob('${job.id}')">
        Retry
      </button>
    </td>
  `;

  tbody.insertBefore(row, tbody.firstChild);

  // Keep max 20 rows in active monitor
  if (tbody.children.length > 20) {
    tbody.lastElementChild.remove();
  }
}

function updateJobRowStatus(jobId, status, error = null) {
  const row = document.getElementById(`job-row-${jobId}`);
  if (!row) return;
  const statusCell = row.children[4];
  if (statusCell) {
    statusCell.innerHTML = getStatusBadgeHtml(status, error);
  }
}

function getStatusBadgeHtml(status, error = null) {
  const s = (status || '').toUpperCase();
  if (s === 'PRINTED') {
    return '<span class="badge badge-green">PRINTED</span>';
  } else if (s === 'PRINTING') {
    return '<span class="badge badge-amber">PRINTING...</span>';
  } else if (s === 'FAILED') {
    return `<span class="badge badge-red" title="${error || 'Print Failed'}">FAILED</span>`;
  }
  return '<span class="badge badge-neutral">PENDING</span>';
}

window.retrySpecificJob = async (jobId) => {
  try {
    await firebaseService.retryJob(jobId);
    updateJobRowStatus(jobId, 'PENDING');
  } catch (err) {
    alert(`Failed to reset job: ${err.message}`);
  }
};

// ------------------------------------------------------------------
// Action Handlers (Test Print, Pause, Retry)
// ------------------------------------------------------------------
async function handleTestPrint() {
  const printerName = elements.selectPrinter.value || state.config?.selectedPrinter;
  if (!printerName) {
    alert('Please select an installed Windows printer in Settings before running Test Print.');
    switchTab('settings');
    return;
  }

  const dest = elements.selectDestination.value || state.config?.destination || 'KITCHEN';

  elements.footerStatusSummary.textContent = 'Sending Test Print slip to Windows printer...';

  try {
    const result = await window.electronAPI.printTestKOT(dest, printerName);
    if (result.success) {
      elements.footerStatusSummary.textContent = 'Test Print sent successfully!';
      alert(`Test Print successfully sent to "${printerName}"!`);
      await refreshLogsTable();
    } else {
      elements.footerStatusSummary.textContent = `Test print failed: ${result.error}`;
      alert(`Test print failed:\n${result.error}`);
    }
  } catch (err) {
    alert(`Error printing test ticket: ${err.message}`);
  }
}

async function togglePausePrinting() {
  const nextPaused = !state.config.isPaused;
  state.config.isPaused = nextPaused;
  await window.electronAPI.saveConfig({ isPaused: nextPaused });
  updateDashboardUI();
}

async function handleRetryFailedJobs() {
  if (state.failedJobs.length === 0) {
    alert('No failed print jobs to retry.');
    return;
  }

  const count = state.failedJobs.length;
  elements.footerStatusSummary.textContent = `Retrying ${count} failed print jobs...`;

  for (const jobId of [...state.failedJobs]) {
    try {
      await firebaseService.retryJob(jobId);
    } catch (err) {
      console.error(`Failed to retry job ${jobId}:`, err);
    }
  }

  state.failedJobs = [];
  updateRetryButton();
  elements.footerStatusSummary.textContent = `Queued ${count} jobs for retry.`;
}

function updateRetryButton() {
  const count = state.failedJobs.length;
  elements.retryFailedCount.textContent = count;
  elements.btnRetryFailed.style.display = count > 0 ? 'inline-flex' : 'none';
}

// ------------------------------------------------------------------
// Settings & Config Management
// ------------------------------------------------------------------
function populateSettingsForm(config) {
  elements.inputRestaurantName.value = config.restaurantName || 'The Fat Buddha Delight Restro & Cafe';
  elements.selectDestination.value = config.destination || 'KITCHEN';
  elements.selectPaperWidth.value = config.paperWidth || '80mm';
  elements.checkStartWithWindows.checked = !!config.startWithWindows;
  elements.checkAutoRetry.checked = !!config.autoRetry;
  elements.checkSoundAlerts.checked = !!config.soundAlerts;
}

async function handleSaveSettings(e) {
  e.preventDefault();

  const newConfig = {
    restaurantName: elements.inputRestaurantName.value.trim(),
    destination: elements.selectDestination.value,
    selectedPrinter: elements.selectPrinter.value,
    paperWidth: elements.selectPaperWidth.value,
    startWithWindows: elements.checkStartWithWindows.checked,
    autoRetry: elements.checkAutoRetry.checked,
    soundAlerts: elements.checkSoundAlerts.checked,
    isSetupComplete: true
  };

  const oldDest = state.config?.destination;
  const result = await window.electronAPI.saveConfig(newConfig);

  if (result.success) {
    state.config = result.config;
    updateDashboardUI();
    await checkCurrentPrinterStatus();

    // Re-subscribe if destination changed
    if (oldDest !== newConfig.destination) {
      startPrintJobListener();
    }

    elements.setupStatusBadge.textContent = 'Configured';
    elements.setupStatusBadge.className = 'badge badge-green';
    alert('Configuration saved successfully!');
    switchTab('dashboard');
  } else {
    alert(`Failed to save configuration: ${result.error}`);
  }
}

async function handleResetConfig() {
  if (confirm('Are you sure you want to reset the agent configuration to defaults?')) {
    const res = await window.electronAPI.resetConfig();
    if (res.success) {
      state.config = res.config;
      populateSettingsForm(state.config);
      updateDashboardUI();
      switchTab('settings');
      elements.setupStatusBadge.textContent = 'Setup Mode';
      elements.setupStatusBadge.className = 'badge badge-amber';
    }
  }
}

// ------------------------------------------------------------------
// UI Updates & Logs Table
// ------------------------------------------------------------------
function updateDashboardUI() {
  if (!state.config) return;

  elements.headerRestaurantName.textContent = state.config.restaurantName;
  elements.dashRestaurantName.textContent = state.config.restaurantName;
  elements.dashPrinterName.textContent = state.config.selectedPrinter || 'None (Configure in Settings)';
  elements.dashPaperWidth.textContent = state.config.paperWidth === '58mm' ? '58mm Compact' : '80mm Standard';

  // Paused banner & toggle button
  if (state.config.isPaused) {
    elements.pausedBanner.classList.remove('hidden');
    elements.btnPauseIcon.textContent = '▶';
    elements.btnPauseLabel.textContent = 'Resume Printing';
    elements.btnTogglePause.className = 'btn btn-amber';
  } else {
    elements.pausedBanner.classList.add('hidden');
    elements.btnPauseIcon.textContent = '⏸';
    elements.btnPauseLabel.textContent = 'Pause Printing';
    elements.btnTogglePause.className = 'btn btn-primary';
  }

  updateStatusIndicators();
  updateStatsDisplay();
  updateRetryButton();
}

function updateStatsDisplay() {
  elements.statPendingCount.textContent = state.stats.pending;
  elements.statPrintedCount.textContent = state.stats.printed;
  elements.statFailedCount.textContent = state.stats.failed;
  elements.statLastKot.textContent = state.stats.lastKot;
  elements.statLastPrintTime.textContent = state.stats.lastPrintTime;
}

async function refreshLogsTable() {
  try {
    const logs = await window.electronAPI.getLogs(100);
    const tbody = elements.logsTableBody;
    tbody.innerHTML = '';

    if (!logs || logs.length === 0) {
      tbody.innerHTML = '<tr class="empty-row"><td colspan="7">No logs recorded yet.</td></tr>';
      return;
    }

    logs.forEach(log => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${log.timeFormatted || log.timestamp}</td>
        <td class="font-mono font-bold">${log.kotNumber || log.kotId}</td>
        <td>${log.tableNumber !== 'N/A' ? 'T' + log.tableNumber : 'N/A'}</td>
        <td><span class="badge badge-amber">${log.destination}</span></td>
        <td class="font-mono">${log.printer}</td>
        <td>${getStatusBadgeHtml(log.status)}</td>
        <td class="subtext">${log.error || log.details || '--'}</td>
      `;
      tbody.appendChild(row);
    });
  } catch (err) {
    console.error('Failed to load logs:', err);
  }
}

// ------------------------------------------------------------------
// Boot Application
// ------------------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
  initApp().catch(err => console.error('[Renderer] App boot error:', err));
});
