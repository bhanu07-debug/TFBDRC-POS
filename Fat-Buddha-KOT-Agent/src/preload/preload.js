const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Config
  getConfig: () => ipcRenderer.invoke('get-config'),
  saveConfig: (config) => ipcRenderer.invoke('save-config', config),
  resetConfig: () => ipcRenderer.invoke('reset-config'),

  // Printers
  getPrinters: () => ipcRenderer.invoke('get-printers'),
  checkPrinterStatus: (printerName) => ipcRenderer.invoke('check-printer-status', printerName),

  // Printing
  printKOT: (kotData, printerName, options) => ipcRenderer.invoke('print-kot', { kotData, printerName, options }),
  printTestKOT: (destination, printerName) => ipcRenderer.invoke('print-test-kot', { destination, printerName }),

  // Logs
  getLogs: (limit) => ipcRenderer.invoke('get-logs', limit),
  clearLogs: () => ipcRenderer.invoke('clear-logs'),
  addLog: (entry) => ipcRenderer.invoke('add-custom-log', entry),

  // Firebase config
  getFirebaseConfig: () => ipcRenderer.invoke('get-firebase-config'),

  // Window & System
  minimize: () => ipcRenderer.send('window-minimize'),
  hideToTray: () => ipcRenderer.send('window-hide'),
  quitApp: () => ipcRenderer.send('app-quit'),

  // Listeners from Main
  onConfigUpdated: (callback) => {
    const handler = (_event, config) => callback(config);
    ipcRenderer.on('config-updated', handler);
    return () => ipcRenderer.removeListener('config-updated', handler);
  },
  onTriggerTestPrint: (callback) => {
    const handler = () => callback();
    ipcRenderer.on('trigger-test-print', handler);
    return () => ipcRenderer.removeListener('trigger-test-print', handler);
  },
  onNavigateTo: (callback) => {
    const handler = (_event, route) => callback(route);
    ipcRenderer.on('navigate-to', handler);
    return () => ipcRenderer.removeListener('navigate-to', handler);
  }
});
