const { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage, Notification, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const configStore = require('./configStore');
const logStore = require('./logStore');
const printerService = require('./printerService');

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  app.quit();
}

let mainWindow = null;
let tray = null;
let isQuitting = false;

// Single Instance Lock
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 960,
    height: 680,
    minWidth: 840,
    minHeight: 580,
    title: 'Fat Buddha KOT Printer Agent',
    backgroundColor: '#0f172a', // Slate 900
    webPreferences: {
      preload: path.join(__dirname, '../preload/preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false
    }
  });

  const rendererHtmlPath = path.join(__dirname, '../renderer/index.html');
  mainWindow.loadFile(rendererHtmlPath);

  // Configure Auto-Start with Windows based on saved config
  const config = configStore.getConfig();
  try {
    app.setLoginItemSettings({
      openAtLogin: !!config.startWithWindows,
      path: process.execPath
    });
  } catch (err) {
    console.warn('[Main] Could not set login item settings:', err);
  }

  // Intercept window close to minimize to system tray instead of terminating
  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow.hide();
      if (Notification.isSupported()) {
        new Notification({
          title: 'Fat Buddha KOT Agent',
          body: 'Agent is running in the background. KOT monitoring is active.'
        }).show();
      }
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function createTray() {
  // Create simple icon or load from assets
  let iconPath = path.join(__dirname, '../../assets/icon.png');
  let trayIcon = null;

  if (fs.existsSync(iconPath)) {
    trayIcon = nativeImage.createFromPath(iconPath);
  } else {
    // Generate a clean 16x16 icon programmatically if asset not found
    trayIcon = nativeImage.createEmpty();
  }

  try {
    tray = new Tray(trayIcon);
  } catch {
    // Fallback on platform
    return;
  }

  tray.setToolTip('Fat Buddha KOT Printer Agent');

  updateTrayMenu();

  tray.on('double-click', () => {
    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

function updateTrayMenu() {
  if (!tray) return;

  const config = configStore.getConfig();
  const isPaused = !!config.isPaused;

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Fat Buddha KOT Agent',
      enabled: false
    },
    { type: 'separator' },
    {
      label: 'Open Agent Dashboard',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        }
      }
    },
    {
      label: isPaused ? '▶ Resume Printing' : '⏸ Pause Printing',
      click: () => {
        const nextState = !isPaused;
        configStore.saveConfig({ isPaused: nextState });
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('config-updated', configStore.getConfig());
        }
        updateTrayMenu();
      }
    },
    {
      label: 'Print Test Ticket',
      click: async () => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('trigger-test-print');
        }
      }
    },
    {
      label: 'Settings',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
          mainWindow.webContents.send('navigate-to', 'settings');
        }
      }
    },
    { type: 'separator' },
    {
      label: 'Exit Agent',
      click: () => {
        isQuitting = true;
        app.quit();
      }
    }
  ]);

  tray.setContextMenu(contextMenu);
}

// -------------------------------------------------------------
// IPC Handlers
// -------------------------------------------------------------

// 1. Config management
ipcMain.handle('get-config', () => {
  return configStore.getConfig();
});

ipcMain.handle('save-config', (event, newConfig) => {
  const result = configStore.saveConfig(newConfig);
  if (result.success && newConfig.startWithWindows !== undefined) {
    try {
      app.setLoginItemSettings({
        openAtLogin: !!newConfig.startWithWindows,
        path: process.execPath
      });
    } catch (err) {
      console.warn('[Main] Failed to update login item settings:', err);
    }
  }
  updateTrayMenu();
  return result;
});

ipcMain.handle('reset-config', () => {
  const result = configStore.resetConfig();
  updateTrayMenu();
  return result;
});

// 2. Printer enumeration & validation
ipcMain.handle('get-printers', async () => {
  if (!mainWindow || mainWindow.isDestroyed()) return [];
  return await printerService.getAvailablePrinters(mainWindow.webContents);
});

ipcMain.handle('check-printer-status', async (event, printerName) => {
  if (!mainWindow || mainWindow.isDestroyed()) {
    return { ready: false, message: 'Window not initialized' };
  }
  return await printerService.checkPrinterStatus(mainWindow.webContents, printerName);
});

// 3. Print execution
ipcMain.handle('print-kot', async (event, { kotData, printerName, options }) => {
  try {
    const config = configStore.getConfig();
    const effectivePrinter = printerName || config.selectedPrinter;
    const effectiveOptions = {
      restaurantName: config.restaurantName,
      paperWidth: config.paperWidth,
      ...options
    };

    const html = printerService.formatThermalKOTHtml(kotData, effectiveOptions);
    const printResult = await printerService.printSlip(html, effectivePrinter, effectiveOptions);

    logStore.addLog({
      kotId: kotData.kotId || kotData.id,
      kotNumber: kotData.kotNumber,
      tableNumber: kotData.tableNumber,
      destination: kotData.destination || config.destination,
      printer: effectivePrinter,
      status: 'PRINTED'
    });

    return { success: true };
  } catch (err) {
    console.error('[Main] print-kot error:', err);
    logStore.addLog({
      kotId: kotData.kotId || kotData.id,
      kotNumber: kotData.kotNumber,
      tableNumber: kotData.tableNumber,
      destination: kotData.destination || configStore.getConfig().destination,
      printer: printerName || configStore.getConfig().selectedPrinter,
      status: 'FAILED',
      error: err.message
    });
    return { success: false, error: err.message };
  }
});

ipcMain.handle('print-test-kot', async (event, { destination, printerName }) => {
  try {
    const config = configStore.getConfig();
    const effectiveDest = destination || config.destination || 'KITCHEN';
    const effectivePrinter = printerName || config.selectedPrinter;

    const html = printerService.formatTestKOTHtml(
      config.restaurantName,
      effectiveDest,
      { paperWidth: config.paperWidth }
    );

    const printResult = await printerService.printSlip(html, effectivePrinter);

    logStore.addLog({
      kotId: 'TEST-PRINT',
      kotNumber: 'TEST',
      destination: effectiveDest,
      printer: effectivePrinter,
      status: 'TEST',
      details: 'Test KOT printed successfully'
    });

    return { success: true };
  } catch (err) {
    console.error('[Main] print-test-kot error:', err);
    logStore.addLog({
      kotId: 'TEST-PRINT',
      kotNumber: 'TEST',
      destination: destination || configStore.getConfig().destination,
      printer: printerName || configStore.getConfig().selectedPrinter,
      status: 'FAILED',
      error: err.message
    });
    return { success: false, error: err.message };
  }
});

// 4. Logs management
ipcMain.handle('get-logs', (event, limit) => {
  return logStore.getLogs(limit);
});

ipcMain.handle('clear-logs', () => {
  return logStore.clearLogs();
});

ipcMain.handle('add-custom-log', (event, entry) => {
  return logStore.addLog(entry);
});

// 5. Firebase configuration loader
ipcMain.handle('get-firebase-config', () => {
  try {
    const configPath = path.join(__dirname, '../../firebase-config.json');
    if (fs.existsSync(configPath)) {
      const content = fs.readFileSync(configPath, 'utf8');
      return JSON.parse(content);
    }
  } catch (err) {
    console.error('[Main] Could not load firebase-config.json:', err);
  }
  return null;
});

// 6. Window actions
ipcMain.on('window-minimize', () => {
  if (mainWindow) mainWindow.minimize();
});

ipcMain.on('window-hide', () => {
  if (mainWindow) mainWindow.hide();
});

ipcMain.on('app-quit', () => {
  isQuitting = true;
  app.quit();
});

// App lifecycle
app.whenReady().then(() => {
  createMainWindow();
  createTray();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    } else if (mainWindow) {
      mainWindow.show();
    }
  });
});

app.on('before-quit', () => {
  isQuitting = true;
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    // Keep running in tray unless explicit quit
    if (isQuitting) {
      app.quit();
    }
  }
});
