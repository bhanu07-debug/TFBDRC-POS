const fs = require('fs');
const path = require('path');
const { app } = require('electron');

class ConfigStore {
  constructor() {
    try {
      this.userDataPath = app.getPath('userData');
    } catch {
      this.userDataPath = path.join(process.cwd(), '.agent-data');
    }

    if (!fs.existsSync(this.userDataPath)) {
      fs.mkdirSync(this.userDataPath, { recursive: true });
    }

    this.configFilePath = path.join(this.userDataPath, 'kot_agent_config.json');
    this.defaults = {
      restaurantName: 'The Fat Buddha Delight Restro & Cafe',
      destination: 'KITCHEN', // 'KITCHEN' | 'RECEPTION'
      selectedPrinter: '',
      startWithWindows: true,
      autoRetry: true,
      retryDelaySeconds: 15,
      paperWidth: '80mm', // '80mm' | '58mm'
      soundAlerts: true,
      isSetupComplete: false,
      isPaused: false
    };

    this.config = this.loadConfig();
  }

  loadConfig() {
    try {
      if (fs.existsSync(this.configFilePath)) {
        const raw = fs.readFileSync(this.configFilePath, 'utf8');
        const parsed = JSON.parse(raw);
        return { ...this.defaults, ...parsed };
      }
    } catch (err) {
      console.error('[ConfigStore] Failed to read config file, restoring defaults:', err);
    }
    return { ...this.defaults };
  }

  saveConfig(newConfig) {
    try {
      this.config = { ...this.config, ...newConfig };
      fs.writeFileSync(this.configFilePath, JSON.stringify(this.config, null, 2), 'utf8');
      return { success: true, config: this.config };
    } catch (err) {
      console.error('[ConfigStore] Failed to save config file:', err);
      return { success: false, error: err.message };
    }
  }

  getConfig() {
    return { ...this.config };
  }

  resetConfig() {
    this.config = { ...this.defaults };
    try {
      if (fs.existsSync(this.configFilePath)) {
        fs.unlinkSync(this.configFilePath);
      }
    } catch (err) {
      console.error('[ConfigStore] Error resetting config:', err);
    }
    return { success: true, config: this.config };
  }
}

module.exports = new ConfigStore();
