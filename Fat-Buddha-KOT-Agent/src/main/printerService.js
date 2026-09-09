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
   * Optimized for 80mm (72mm printable) and 58mm (48mm printable) thermal ESC/POS Windows print spoolers.
   */
  formatThermalKOTHtml(kotData, options = {}) {
    const restaurantName = options.restaurantName || 'The Fat Buddha Delight Restro & Cafe';
    const tagline = options.tagline || 'Taste the joy, Feel the Delight.';
    const paperWidth = options.paperWidth || '80mm';
    const is58mm = paperWidth === '58mm';
    const widthStyle = is58mm ? 'width: 44mm; max-width: 44mm;' : 'width: 66mm; max-width: 66mm;';

    const kotNumber = kotData.kotNumber || kotData.id || 'KOT-000';
    const tableNum = kotData.tableNumber !== undefined ? (kotData.tableNumber < 10 ? `TABLE 0${kotData.tableNumber}` : `TABLE ${kotData.tableNumber}`) : 'TABLE --';
    const orderNumber = kotData.orderNumber ? `#${kotData.orderNumber}` : '';
    const destination = (kotData.destination || kotData.station || 'KITCHEN').toUpperCase();
    const stationBanner = destination.includes('RECEPTION') || destination.includes('BAR') ? '★ RECEPTION / BARISTA KOT ★' : '★ KITCHEN FOOD KOT ★';
    const timestamp = kotData.timestamp || new Date().toISOString();
    const timeFormatted = new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const dateFormatted = new Date(timestamp).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
    const exactPrintTime = new Date().toLocaleTimeString();

    const waiterName = kotData.waiterName || kotData.captainName || 'Staff (Captain)';
    const orderType = (kotData.orderType || 'DINE_IN').replace('_', ' ').toUpperCase();
    const orderSource = kotData.source === 'GUEST_QR' ? 'Guest Self-Order (QR)' : 'POS Counter';
    const items = Array.isArray(kotData.items) ? kotData.items : [];
    const notes = kotData.notes || '';
    const totalQty = items.reduce((sum, it) => sum + (it.quantity || 1), 0);

    const itemsHtml = items.map(it => {
      const qty = it.quantity || 1;
      const name = it.name || it.nameSnapshot || 'Item';
      const variant = it.variant || it.variantName ? `<div style="font-size: 10px; color: #222; margin-top: 1px;">↳ Variant: ${it.variant || it.variantName}</div>` : '';
      const itemNote = (it.instructions || it.notes) ? `<div style="font-size: 10.5px; font-weight: bold; font-style: italic; background: #eee; padding: 2px 4px; border: 1px solid #333; margin-top: 3px;">*** NOTE: ${it.instructions || it.notes} ***</div>` : '';
      const isCancelled = it.cancelled === true || it.status === 'CANCELLED';
      const cancelBanner = isCancelled ? `<div style="font-size: 10px; font-weight: bold; color: red; margin-top: 2px;">*** CANCELLED ${it.cancellationReason ? ': ' + it.cancellationReason : ''} ***</div>` : '';

      return `
        <div style="padding: 4px 0; border-bottom: 1px dashed #999; page-break-inside: avoid; ${isCancelled ? 'text-decoration: line-through;' : ''}">
          <div style="display: flex; align-items: flex-start;">
            <span style="min-width: 32px; font-size: 14px; font-weight: 900; color: #000;">[${qty}]</span>
            <div style="flex: 1; text-align: left; padding-left: 4px;">
              <div style="font-weight: 900; font-size: 12px; line-height: 1.25; word-break: break-word;">${name}</div>
              ${variant}
              ${itemNote}
              ${cancelBanner}
            </div>
          </div>
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
          @page { margin: 0; size: auto; }
          * { box-sizing: border-box; -webkit-print-color-adjust: exact; }
          body {
            margin: 0;
            padding: 4px 10px 18mm 4px;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, monospace;
            color: #000;
            background: #fff;
            font-size: 11px;
            line-height: 1.3;
            ${widthStyle}
          }
          .center { text-align: center; }
          .bold { font-weight: bold; }
          .black { font-weight: 900; }
          .header-box {
            border-bottom: 2px dashed #000;
            padding-bottom: 6px;
            text-align: center;
          }
          .title {
            font-size: 14px;
            font-weight: 900;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .tagline {
            font-size: 9px;
            color: #333;
            margin-top: 2px;
          }
          .badge {
            font-size: 12px;
            font-weight: 900;
            margin-top: 6px;
            text-transform: uppercase;
            border: 2px solid #000;
            display: inline-block;
            padding: 3px 8px;
            letter-spacing: 0.5px;
          }
          .meta-box {
            padding: 6px 0;
            border-bottom: 2px dashed #000;
            font-size: 10.5px;
          }
          .meta-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 2px;
          }
          .table-highlight {
            font-size: 16px;
            font-weight: 900;
            letter-spacing: 0.5px;
          }
          .items-header {
            display: flex;
            justify-content: space-between;
            font-weight: 900;
            font-size: 10.5px;
            padding: 4px 0 2px 0;
            border-bottom: 1px solid #000;
            text-transform: uppercase;
          }
          .notes-box {
            border: 1px solid #000;
            padding: 4px;
            margin: 6px 0;
            font-size: 10.5px;
            font-weight: bold;
            background: #f4f4f4;
          }
          .footer {
            border-top: 2px dashed #000;
            padding-top: 6px;
            margin-top: 6px;
            text-align: center;
            font-size: 9.5px;
          }
        </style>
      </head>
      <body>
        <div class="header-box">
          <div class="title">${restaurantName}</div>
          <div class="tagline">${tagline}</div>
          <div class="badge">${stationBanner}</div>
        </div>

        <div class="meta-box">
          <div class="meta-row">
            <span class="bold">TABLE:</span>
            <span class="table-highlight">${tableNum}</span>
          </div>
          <div class="meta-row">
            <span>KOT #: <strong class="black">${kotNumber}</strong></span>
            ${orderNumber ? `<span>ORDER: <strong class="bold">${orderNumber}</strong></span>` : ''}
          </div>
          <div class="meta-row" style="font-size: 10px;">
            <span>DATE: ${dateFormatted}</span>
            <span>TIME: ${timeFormatted}</span>
          </div>
          <div class="meta-row" style="font-size: 10px;">
            <span>TYPE: <strong class="bold">${orderType}</strong></span>
            <span>SRC: <strong class="bold">${orderSource}</strong></span>
          </div>
          <div class="meta-row" style="border-top: 1px dotted #666; padding-top: 2px; margin-top: 2px;">
            <span>CAPTAIN / WAITER:</span>
            <span class="black">${waiterName}</span>
          </div>
          ${kotData.guestName ? `
            <div class="meta-row" style="font-size: 9.5px;">
              <span>GUEST:</span>
              <span class="bold">${kotData.guestName}</span>
            </div>
          ` : ''}
          ${notes ? `
            <div class="notes-box">
              ⚠️ TICKET NOTE: ${notes}
            </div>
          ` : ''}
        </div>

        <div class="items-header">
          <span style="min-width: 32px;">QTY</span>
          <span style="flex: 1; padding-left: 4px;">ITEM & SPECIFICATIONS</span>
        </div>

        <div>
          ${itemsHtml || '<div class="center bold" style="padding: 8px 0;">NO ITEMS</div>'}
        </div>

        <div style="display: flex; justify-content: space-between; font-weight: 900; font-size: 11px; padding: 6px 0;">
          <span>TOTAL ITEMS:</span>
          <span>${totalQty} Items</span>
        </div>

        <div class="footer">
          <div class="black uppercase">*** TICKET DISPATCHED ***</div>
          <div style="color: #444; margin-top: 2px;">Printed at ${exactPrintTime}</div>
          <div style="font-size: 8px; color: #666; margin-top: 2px;">The Fat Buddha Delight KOT System</div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Generates formatted thermal HTML slip for a complete customer Bill / Receipt.
   * Optimized for 80mm (72mm printable) and 58mm (48mm printable).
   */
  formatThermalBillHtml(orderData, options = {}) {
    const restaurantName = options.restaurantName || 'The Fat Buddha Delight Restro & Cafe';
    const tagline = options.tagline || 'Taste the joy, Feel the Delight.';
    const address = options.address || 'Lumbini Road, Nepal';
    const phone = options.phone || '+977-9800000000';
    const panNumber = options.panNumber || options.panNo || '302194821';
    const currency = options.currencySymbol || 'Rs.';
    const paperWidth = options.paperWidth || '80mm';
    const is58mm = paperWidth === '58mm';
    const widthStyle = is58mm ? 'width: 44mm; max-width: 44mm;' : 'width: 66mm; max-width: 66mm;';

    const orderNumber = orderData.orderNumber || orderData.id || 'ORD-000';
    const tableNum = orderData.tableNumber !== undefined ? (orderData.tableNumber < 10 ? `T0${orderData.tableNumber}` : `T${orderData.tableNumber}`) : 'T--';
    const orderDate = new Date(orderData.createdAt || Date.now()).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
    const orderTime = new Date(orderData.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const waiterName = orderData.waiterName || 'Staff (Captain)';
    const orderType = (orderData.orderType || 'DINE_IN').replace('_', ' ').toUpperCase();
    const source = (orderData.source || 'POS').replace('_', ' ').toUpperCase();

    const subtotal = orderData.subtotal ?? orderData.total ?? 0;
    const discount = orderData.discountAmount ?? orderData.discount ?? 0;
    const discountedSubtotal = Math.max(0, subtotal - discount);
    const serviceCharge = orderData.serviceCharge ?? 0;
    const vat = orderData.vat ?? orderData.taxAmount ?? 0;
    const grandTotal = orderData.finalAmount ?? (discountedSubtotal + serviceCharge + vat);
    const isPaid = (orderData.paymentStatus || '').toLowerCase() === 'paid';

    const items = Array.isArray(orderData.items) ? orderData.items : [];
    const totalQty = items.reduce((s, i) => s + (i.quantity || 1), 0);

    const itemsHtml = items.map(it => {
      const qty = it.quantity || 1;
      const name = it.name || it.nameSnapshot || 'Item';
      const rate = (it.price || it.priceSnapshot || 0).toFixed(0);
      const amt = ((it.price || it.priceSnapshot || 0) * qty).toFixed(0);
      const variant = it.variantName ? `<div style="font-size: 8.5px; color: #444; padding-left: 20px;">* Size: ${it.variantName}</div>` : '';
      const note = it.instructions ? `<div style="font-size: 8.5px; font-style: italic; color: #333; padding-left: 20px;">↳ Note: ${it.instructions}</div>` : '';

      return `
        <div style="padding: 3px 0; border-bottom: 1px dashed #ccc; page-break-inside: avoid;">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; font-size: 10px;">
            <span style="width: 20px; font-weight: 900; text-align: center;">${qty}</span>
            <span style="flex: 1; font-weight: bold; padding: 0 4px; word-break: break-word;">${name}</span>
            <span style="width: 38px; text-align: right; color: #333;">${rate}</span>
            <span style="width: 42px; text-align: right; font-weight: 900; padding-right: 2px;">${amt}</span>
          </div>
          ${variant}
          ${note}
        </div>
      `;
    }).join('');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Receipt Slip</title>
        <style>
          @page { margin: 0; size: auto; }
          * { box-sizing: border-box; -webkit-print-color-adjust: exact; }
          body {
            margin: 0;
            padding: 4px 10px 18mm 4px;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, monospace;
            color: #000;
            background: #fff;
            font-size: 10.5px;
            line-height: 1.3;
            ${widthStyle}
          }
          .center { text-align: center; }
          .bold { font-weight: bold; }
          .black { font-weight: 900; }
          .header {
            border-bottom: 2px dashed #000;
            padding-bottom: 6px;
            text-align: center;
          }
          .meta-box {
            padding: 6px 0;
            border-bottom: 1px dashed #000;
            font-size: 9.5px;
          }
          .meta-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 2px;
          }
          .table-header {
            display: flex;
            justify-content: space-between;
            font-weight: 900;
            font-size: 9.5px;
            padding: 4px 0 2px 0;
            border-bottom: 1px solid #000;
            text-transform: uppercase;
          }
          .totals-box {
            padding: 6px 0;
            border-bottom: 2px dashed #000;
            font-size: 10px;
          }
          .total-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 2px;
          }
          .grand-total {
            display: flex;
            justify-content: space-between;
            border-top: 2px solid #000;
            padding-top: 4px;
            margin-top: 4px;
            font-size: 13px;
            font-weight: 900;
          }
          .footer {
            text-align: center;
            padding-top: 8px;
            font-size: 8.5px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div style="font-size: 13px; font-weight: 900; text-transform: uppercase;">${restaurantName}</div>
          <div style="font-size: 9px; color: #333; margin-top: 1px;">${tagline}</div>
          <div style="font-size: 9px; margin-top: 2px;">${address}</div>
          <div style="font-size: 9px; font-weight: bold;">Tel: ${phone}</div>
          <div style="font-size: 9.5px; font-weight: 900; margin-top: 2px; text-transform: uppercase;">PAN No.: ${panNumber}</div>
        </div>

        <div class="meta-box">
          <div class="meta-row">
            <span>INVOICE: <strong class="black">${orderNumber}</strong></span>
            <span class="black" style="font-size: 11px; padding-right: 4px;">TABLE: ${tableNum}</span>
          </div>
          <div class="meta-row">
            <span>DATE: ${orderDate}</span>
            <span style="padding-right: 4px;">TIME: ${orderTime}</span>
          </div>
          <div class="meta-row">
            <span>TYPE: <strong class="bold">${orderType}</strong></span>
            <span style="padding-right: 4px;">SRC: <strong class="bold">${source}</strong></span>
          </div>
          <div class="meta-row">
            <span>CAPTAIN: <strong class="bold">${waiterName}</strong></span>
            ${orderData.kotNumber ? `<span style="padding-right: 4px;">KOT: ${orderData.kotNumber}</span>` : ''}
          </div>
        </div>

        <div class="table-header">
          <span style="width: 20px; text-align: center;">QTY</span>
          <span style="flex: 1; padding: 0 4px;">ITEM</span>
          <span style="width: 38px; text-align: right;">RATE</span>
          <span style="width: 42px; text-align: right; padding-right: 2px;">AMT</span>
        </div>

        <div>
          ${itemsHtml}
        </div>

        <div class="totals-box">
          <div class="total-row">
            <span>Subtotal (${totalQty} items):</span>
            <span class="bold" style="padding-right: 4px;">${currency} ${subtotal.toFixed(2)}</span>
          </div>
          ${discount > 0 ? `
            <div class="total-row">
              <span>Discount:</span>
              <span style="padding-right: 4px;">-${currency} ${discount.toFixed(2)}</span>
            </div>
            <div class="total-row" style="font-size: 9px; color: #444;">
              <span>Taxable Subtotal:</span>
              <span style="padding-right: 4px;">${currency} ${discountedSubtotal.toFixed(2)}</span>
            </div>
          ` : ''}
          ${serviceCharge > 0 ? `
            <div class="total-row">
              <span>Service Charge:</span>
              <span style="padding-right: 4px;">${currency} ${serviceCharge.toFixed(2)}</span>
            </div>
          ` : ''}
          ${vat > 0 ? `
            <div class="total-row">
              <span>VAT:</span>
              <span style="padding-right: 4px;">${currency} ${vat.toFixed(2)}</span>
            </div>
          ` : ''}
          <div class="grand-total">
            <span>GRAND TOTAL:</span>
            <span style="padding-right: 4px;">${currency} ${grandTotal.toFixed(2)}</span>
          </div>
        </div>

        <div style="padding: 4px 0; border-bottom: 1px dashed #000; text-align: center; font-size: 9.5px;">
          PAYMENT STATUS: <strong class="black uppercase">${orderData.paymentStatus || 'UNPAID'}</strong>
          ${orderData.paymentMethod ? ` (${orderData.paymentMethod.toUpperCase()})` : ''}
        </div>

        <div class="footer">
          <div style="font-weight: 900; text-transform: uppercase;">*** THANK YOU FOR DINING WITH US ***</div>
          <div style="margin-top: 2px;">Please Come Again! May Buddha Bless Your Day!</div>
          <div style="font-size: 7.5px; color: #777; margin-top: 2px;">The Fat Buddha Cloud POS System</div>
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
