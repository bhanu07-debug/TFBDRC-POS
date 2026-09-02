const fs = require('fs');
const path = require('path');
const { app } = require('electron');

class LogStore {
  constructor() {
    try {
      this.userDataPath = app.getPath('userData');
    } catch {
      this.userDataPath = path.join(process.cwd(), '.agent-data');
    }

    if (!fs.existsSync(this.userDataPath)) {
      fs.mkdirSync(this.userDataPath, { recursive: true });
    }

    this.logFilePath = path.join(this.userDataPath, 'kot_agent_logs.json');
    this.maxLogs = 300;
    this.logs = this.loadLogs();
  }

  loadLogs() {
    try {
      if (fs.existsSync(this.logFilePath)) {
        const raw = fs.readFileSync(this.logFilePath, 'utf8');
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      }
    } catch (err) {
      console.error('[LogStore] Error loading logs:', err);
    }
    return [];
  }

  addLog(entry) {
    const logItem = {
      id: `log_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString(),
      timeFormatted: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      kotId: entry.kotId || 'N/A',
      kotNumber: entry.kotNumber || 'N/A',
      tableNumber: entry.tableNumber !== undefined ? entry.tableNumber : 'N/A',
      destination: entry.destination || 'KITCHEN',
      printer: entry.printer || 'Default',
      status: entry.status || 'PRINTED', // 'PRINTED' | 'FAILED' | 'PENDING' | 'SKIPPED' | 'TEST'
      error: entry.error || null,
      details: entry.details || null
    };

    this.logs.unshift(logItem);
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(0, this.maxLogs);
    }

    this.persistLogs();
    return logItem;
  }

  persistLogs() {
    try {
      fs.writeFileSync(this.logFilePath, JSON.stringify(this.logs, null, 2), 'utf8');
    } catch (err) {
      console.error('[LogStore] Failed to write logs to disk:', err);
    }
  }

  getLogs(limit = 100) {
    return this.logs.slice(0, limit);
  }

  clearLogs() {
    this.logs = [];
    try {
      if (fs.existsSync(this.logFilePath)) {
        fs.writeFileSync(this.logFilePath, JSON.stringify([], null, 2), 'utf8');
      }
    } catch (err) {
      console.error('[LogStore] Failed to clear logs:', err);
    }
    return { success: true };
  }
}

module.exports = new LogStore();
