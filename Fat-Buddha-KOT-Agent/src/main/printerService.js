const { BrowserWindow } = require('electron');

class PrinterService {
  /**
   * Retrieves the real list of installed Windows printers from Electron's webContents.
   * @param {Electron.WebContents} webContents 
   */
  async getAvailablePrinters(webContents) {
    try {
      if (!webContents) return [];
      const printers = await webContents.getPrintersAsync();
      return printers.map(p => ({
        name: p.name,
        displayName: p.displayName || p.name,
        description: p.description || '',
        status: p.status, // 0 = ready / idle
        isDefault: !!p.isDefault,
        options: p.options || {}
      }));
    } catch (err) {
      console.error('[PrinterService] Failed to enumerate printers:', err);
      return [];
    }
  }

  /**
   * Checks if a specific printer exists and is recognized by the OS.
   * @param {Electron.WebContents} webContents 
   * @param {string} printerName 
   */
  async checkPrinterStatus(webContents, printerName) {
    if (!printerName) {
      return { ready: false, message: 'No printer selected' };
    }
    try {
      const printers = await this.getAvailablePrinters(webContents);
      const matched = printers.find(p => p.name === printerName || p.displayName === printerName);
      if (!matched) {
        return { ready: false, message: `Printer "${printerName}" not found in Windows` };
      }
      return {
        ready: true,
        message: 'Printer Ready',
        printer: matched
      };
    } catch (err) {
      return { ready: false, message: err.message };
    }
  }

  /**
   * Generates formatted thermal HTML slip for a KOT ticket.
   * Optimized for 80mm and 58mm thermal ESC/POS Windows print spoolers.
   */
  formatThermalKOTHtml(kotData, options = {}) {
    const restaurantName = options.restaurantName || 'The Fat Buddha Delight Restro & Cafe';
    const paperWidth = options.paperWidth || '80mm';
    const widthStyle = paperWidth === '58mm' ? 'width: 48mm; max-width: 48mm;' : 'width: 72mm; max-width: 72mm;';

    const kotNumber = kotData.kotNumber || kotData.id || 'KOT-000';
    const tableNum = kotData.tableNumber !== undefined ? (kotData.tableNumber < 10 ? `T0${kotData.tableNumber}` : `T${kotData.tableNumber}`) : 'T--';
    const orderNumber = kotData.orderNumber || '';
    const destination = (kotData.destination || 'KITCHEN').toUpperCase();
    const timestamp = kotData.timestamp || new Date().toISOString();
    const timeFormatted = new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const dateFormatted = new Date(timestamp).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
    const items = Array.isArray(kotData.items) ? kotData.items : [];
    const notes = kotData.notes || '';

    const itemsHtml = items.map(it => {
      const qty = it.quantity || 1;
      const name = it.name || it.nameSnapshot || 'Item';
      const itemNote = it.notes ? `<div style="font-size: 11px; font-style: italic; color: #333; margin-left: 20px;">↳ Note: ${it.notes}</div>` : '';
      return `
        <div style="margin-bottom: 6px; page-break-inside: avoid;">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; font-weight: bold; font-size: 14px;">
            <span style="flex: 1; word-break: break-word;">${name}</span>
            <span style="min-width: 34px; text-align: right; font-size: 15px; font-weight: 900;">x${qty}</span>
          </div>
          ${itemNote}
        </div>
      `;
    }).join('');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>KOT Print Slip</title>
        <style>
          @page {
            margin: 0;
            size: auto;
          }
          * {
            box-sizing: border-box;
            -webkit-print-color-adjust: exact;
          }
          body {
            margin: 0;
            padding: 8px 4px;
            font-family: 'Courier New', Courier, monospace, sans-serif;
            color: #000;
            background: #fff;
            font-size: 13px;
            line-height: 1.25;
            ${widthStyle}
          }
          .center { text-align: center; }
          .bold { font-weight: bold; }
          .header-box {
            border-top: 2px dashed #000;
            border-bottom: 2px dashed #000;
            padding: 6px 0;
            margin: 4px 0 8px 0;
            text-align: center;
          }
          .title {
            font-size: 16px;
            font-weight: 900;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .subtitle {
            font-size: 12px;
            font-weight: bold;
            margin-top: 2px;
          }
          .badge {
            font-size: 15px;
            font-weight: 900;
            margin-top: 4px;
            text-transform: uppercase;
            border: 1px solid #000;
            display: inline-block;
            padding: 2px 8px;
          }
          .meta-grid {
            margin: 6px 0;
            font-size: 13px;
            font-weight: bold;
          }
          .meta-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 3px;
          }
          .table-highlight {
            font-size: 18px;
            font-weight: 900;
          }
          .divider {
            border-bottom: 1px solid #000;
            margin: 6px 0;
          }
          .double-divider {
            border-bottom: 2px dashed #000;
            margin: 8px 0 6px 0;
          }
          .items-container {
            margin: 8px 0;
          }
          .notes-box {
            border: 1px solid #000;
            padding: 4px;
            margin: 6px 0;
            font-size: 12px;
            background: #fafafa;
          }
          .footer {
            font-size: 11px;
            text-align: center;
            margin-top: 6px;
          }
        </style>
      </head>
      <body>
        <div class="header-box">
          <div class="title">${restaurantName}</div>
          <div class="subtitle">Order Ticket</div>
          <div class="badge">${destination} KOT</div>
        </div>

        <div class="meta-grid">
          <div class="meta-row">
            <span>KOT: <span class="bold">${kotNumber}</span></span>
            <span class="table-highlight">TABLE: ${tableNum}</span>
          </div>
          ${orderNumber ? `<div class="meta-row"><span style="font-size: 11px;">Order: ${orderNumber}</span></div>` : ''}
          <div class="meta-row" style="font-size: 11px;">
            <span>Date: ${dateFormatted}</span>
            <span>Time: ${timeFormatted}</span>
          </div>
        </div>

        <div class="divider"></div>

        <div class="items-container">
          ${itemsHtml || '<div class="center bold">NO ITEMS</div>'}
        </div>

        ${notes ? `
          <div class="notes-box">
            <strong>KOT NOTE:</strong> ${notes}
          </div>
        ` : ''}

        <div class="double-divider"></div>
        <div class="footer">
          <div>Time: ${timeFormatted}</div>
          <div style="margin-top: 2px; font-size: 10px;">-- The Fat Buddha Delight KOT System --</div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Generates exact test KOT slip format requested.
   */
  formatTestKOTHtml(restaurantName = 'The Fat Buddha Delight Restro & Cafe', destination = 'KITCHEN', options = {}) {
    const paperWidth = options.paperWidth || '80mm';
    const widthStyle = paperWidth === '58mm' ? 'width: 48mm; max-width: 48mm;' : 'width: 72mm; max-width: 72mm;';
    const timeFormatted = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Test KOT Slip</title>
        <style>
          @page { margin: 0; size: auto; }
          * { box-sizing: border-box; }
          body {
            margin: 0;
            padding: 8px 4px;
            font-family: 'Courier New', Courier, monospace, sans-serif;
            color: #000;
            background: #fff;
            font-size: 13px;
            line-height: 1.3;
            ${widthStyle}
          }
          .box {
            border-top: 2px dashed #000;
            border-bottom: 2px dashed #000;
            padding: 6px 0;
            text-align: center;
          }
          .title {
            font-size: 15px;
            font-weight: 900;
            text-transform: uppercase;
          }
          .subtitle {
            font-size: 13px;
            font-weight: bold;
          }
          .badge {
            font-size: 14px;
            font-weight: 900;
            margin-top: 4px;
          }
          .content {
            margin: 12px 0;
            text-align: center;
            font-size: 13px;
          }
          .success {
            font-size: 14px;
            font-weight: bold;
            margin: 8px 0;
          }
        </style>
      </head>
      <body>
        <div class="box">
          <div class="title">${restaurantName}</div>
          <div class="badge">TEST KOT</div>
        </div>

        <div class="content">
          <div style="font-weight: bold; font-size: 14px; margin-bottom: 6px;">
            Destination: ${destination.toUpperCase()}
          </div>
          <div class="success">
            Test print successful
          </div>
          <div style="font-size: 11px; color: #444; margin-top: 8px;">
            Time: ${timeFormatted}
          </div>
        </div>

        <div class="box">
          <div style="font-size: 10px; font-weight: bold;">-- PRINTER TEST OK --</div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Executes silent print to the specified Windows printer.
   * @param {string} htmlContent HTML content string
   * @param {string} printerName Windows deviceName
   * @param {object} options
   */
  async printSlip(htmlContent, printerName, options = {}) {
    return new Promise((resolve, reject) => {
      let printWindow = null;
      try {
        printWindow = new BrowserWindow({
          show: false,
          width: 320,
          height: 600,
          webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            sandbox: true
          }
        });

        const encodedData = `data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`;
        printWindow.loadURL(encodedData);

        printWindow.webContents.on('did-finish-load', () => {
          const printOptions = {
            silent: true,
            printBackground: true,
            margins: {
              marginType: 'none'
            }
          };

          if (printerName) {
            printOptions.deviceName = printerName;
          }

          printWindow.webContents.print(printOptions, (success, failureReason) => {
            if (printWindow && !printWindow.isDestroyed()) {
              printWindow.close();
              printWindow = null;
            }

            if (success) {
              resolve({ success: true });
            } else {
              const err = failureReason || 'Print spooler returned failure';
              console.error('[PrinterService] Print failed:', err);
              reject(new Error(err));
            }
          });
        });

        printWindow.webContents.on('did-fail-load', (e, errorCode, errorDescription) => {
          if (printWindow && !printWindow.isDestroyed()) {
            printWindow.close();
            printWindow = null;
          }
          reject(new Error(`Failed to render print slip: ${errorDescription}`));
        });
      } catch (err) {
        if (printWindow && !printWindow.isDestroyed()) {
          printWindow.close();
        }
        reject(err);
      }
    });
  }
}

module.exports = new PrinterService();
