import fs from 'fs';
import path from 'path';
import QRCode from 'qrcode';
import JSZip from 'jszip';

const APP_URL = process.env.APP_URL || 'https://ais-pre-ywhjvyolefofw2rsqoxy7i-903792435886.asia-southeast1.run.app';
const WIFI_SSID = 'FatBuddha_Guest_5G';
const WIFI_PASS = 'Newdelight@123';
const RESTAURANT_NAME = 'The Fat Buddha Delight';

// Check if logo exists
const logoSvgPath = path.resolve('public/logo.svg');
let logoBase64 = '';
if (fs.existsSync(logoSvgPath)) {
  const logoData = fs.readFileSync(logoSvgPath);
  logoBase64 = `data:image/svg+xml;base64,${logoData.toString('base64')}`;
}

async function generateAll() {
  console.log('Generating QR Codes and Standee Flyers for all 11 tables...');
  const zip = new JSZip();

  // Create subfolders in zip
  const orderQrFolder = zip.folder('01_Order_Menu_QRs_Only');
  const wifiQrFolder = zip.folder('02_WiFi_Access_QRs_Only');
  const orderFlyersFolder = zip.folder('03_Printable_Flyers_Order_Menu');
  const wifiFlyersFolder = zip.folder('04_Printable_Flyers_WiFi_Access');
  const dualFlyersFolder = zip.folder('05_Printable_Flyers_Dual_Both');

  const allFlyersHtmlCards = [];

  for (let tableNum = 1; tableNum <= 11; tableNum++) {
    const tableNumStr = tableNum < 10 ? `0${tableNum}` : `${tableNum}`;
    const tableUrl = `${APP_URL}?table=${tableNum}`;
    const wifiPayload = `WIFI:T:WPA;S:${WIFI_SSID};P:${WIFI_PASS};;`;

    // 1. Generate High-Res PNG QR (1000x1000)
    const orderPngBuffer = await QRCode.toBuffer(tableUrl, {
      width: 1000,
      margin: 2,
      errorCorrectionLevel: 'H',
      color: { dark: '#111827', light: '#ffffff' }
    });
    orderQrFolder.file(`Table_${tableNumStr}_Order_QR.png`, orderPngBuffer);

    const wifiPngBuffer = await QRCode.toBuffer(wifiPayload, {
      width: 1000,
      margin: 2,
      errorCorrectionLevel: 'H',
      color: { dark: '#111827', light: '#ffffff' }
    });
    wifiQrFolder.file(`Table_${tableNumStr}_WiFi_QR.png`, wifiPngBuffer);

    // 2. Generate SVG QR
    const orderSvgString = await QRCode.toString(tableUrl, {
      type: 'svg',
      margin: 1,
      errorCorrectionLevel: 'H',
      color: { dark: '#111827', light: '#ffffff' }
    });
    orderQrFolder.file(`Table_${tableNumStr}_Order_QR.svg`, orderSvgString);

    const wifiSvgString = await QRCode.toString(wifiPayload, {
      type: 'svg',
      margin: 1,
      errorCorrectionLevel: 'H',
      color: { dark: '#111827', light: '#ffffff' }
    });
    wifiQrFolder.file(`Table_${tableNumStr}_WiFi_QR.svg`, wifiSvgString);

    const orderDataUrl = await QRCode.toDataURL(tableUrl, {
      width: 500,
      margin: 1,
      errorCorrectionLevel: 'H'
    });
    const wifiDataUrl = await QRCode.toDataURL(wifiPayload, {
      width: 500,
      margin: 1,
      errorCorrectionLevel: 'H'
    });

    // 3. Generate HTML Standee Flyer for Order Menu
    const orderFlyerHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Table ${tableNumStr} - Order Menu Flyer - ${RESTAURANT_NAME}</title>
  <style>
    @page { size: auto; margin: 10mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background: #f3f4f6;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      padding: 20px;
    }
    .flyer {
      width: 360px;
      background: #ffffff;
      border: 5px solid #f59e0b;
      border-radius: 28px;
      padding: 32px 24px 24px;
      text-align: center;
      box-shadow: 0 20px 40px rgba(0,0,0,0.12);
      position: relative;
    }
    .logo-container {
      width: 72px;
      height: 72px;
      margin: 0 auto 12px;
      border-radius: 50%;
      border: 3px solid #f59e0b;
      box-shadow: 0 4px 12px rgba(245,158,11,0.25);
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #111827;
    }
    .logo-container img { width: 100%; height: 100%; object-fit: contain; }
    .brand-title {
      font-family: Georgia, Cambria, "Times New Roman", Times, serif;
      font-size: 22px;
      font-weight: 900;
      color: #111827;
      margin-bottom: 4px;
    }
    .brand-sub {
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 2px;
      color: #d97706;
      margin-bottom: 18px;
    }
    .qr-box {
      background: #fafaf9;
      border: 2px solid #e7e5e4;
      border-radius: 20px;
      padding: 16px;
      margin: 0 auto;
      width: 240px;
      height: 240px;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: inset 0 2px 4px rgba(0,0,0,0.04);
    }
    .qr-box img { width: 100%; height: 100%; display: block; }
    .table-pill {
      display: inline-block;
      margin-top: 18px;
      background: #1e293b;
      color: #fbbf24;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 16px;
      font-weight: 900;
      letter-spacing: 2px;
      padding: 6px 24px;
      border-radius: 9999px;
      box-shadow: 0 4px 10px rgba(0,0,0,0.15);
    }
    .scan-title {
      font-size: 14px;
      font-weight: 800;
      color: #1f2937;
      margin-top: 12px;
    }
    .scan-desc {
      font-size: 11px;
      font-weight: 500;
      color: #6b7280;
      margin-top: 2px;
    }
    .wifi-footer {
      margin-top: 16px;
      padding-top: 10px;
      border-top: 1px solid #f3f4f6;
      font-size: 11px;
      color: #6b7280;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
    }
    .wifi-footer strong { color: #1f2937; }
    @media print {
      body { background: transparent; padding: 0; }
      .flyer { box-shadow: none; page-break-inside: avoid; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="flyer">
    <div class="logo-container">
      <img src="${logoBase64 || '/logo.svg'}" alt="Logo" />
    </div>
    <h1 class="brand-title">${RESTAURANT_NAME}</h1>
    <div class="brand-sub">Restro & Cafe</div>
    <div class="qr-box">
      <img src="${orderDataUrl}" alt="Table ${tableNumStr} QR" />
    </div>
    <div class="table-pill">TABLE ${tableNumStr}</div>
    <div class="scan-title">Scan to View Menu & Place Order</div>
    <div class="scan-desc">No App Required • Live Kitchen Status</div>
    <div class="wifi-footer">
      <span>📶 Access WiFi: <strong>${WIFI_SSID}</strong></span>
    </div>
  </div>
</body>
</html>`;
    orderFlyersFolder.file(`Table_${tableNumStr}_Order_Menu_Flyer.html`, orderFlyerHtml);

    // 4. Generate HTML Standee Flyer for WiFi Access
    const wifiFlyerHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Table ${tableNumStr} - Access WiFi Flyer - ${RESTAURANT_NAME}</title>
  <style>
    @page { size: auto; margin: 10mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background: #f3f4f6;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      padding: 20px;
    }
    .flyer {
      width: 360px;
      background: #ffffff;
      border: 5px solid #f59e0b;
      border-radius: 28px;
      padding: 32px 24px 24px;
      text-align: center;
      box-shadow: 0 20px 40px rgba(0,0,0,0.12);
      position: relative;
    }
    .logo-container {
      width: 72px;
      height: 72px;
      margin: 0 auto 12px;
      border-radius: 50%;
      border: 3px solid #f59e0b;
      box-shadow: 0 4px 12px rgba(245,158,11,0.25);
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #111827;
    }
    .logo-container img { width: 100%; height: 100%; object-fit: contain; }
    .brand-title {
      font-family: Georgia, Cambria, "Times New Roman", Times, serif;
      font-size: 22px;
      font-weight: 900;
      color: #111827;
      margin-bottom: 4px;
    }
    .brand-sub {
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 2px;
      color: #d97706;
      margin-bottom: 18px;
    }
    .qr-box {
      background: #fafaf9;
      border: 2px solid #e7e5e4;
      border-radius: 20px;
      padding: 16px;
      margin: 0 auto;
      width: 240px;
      height: 240px;
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
      box-shadow: inset 0 2px 4px rgba(0,0,0,0.04);
    }
    .qr-box img { width: 100%; height: 100%; display: block; }
    .bracket-tl { position: absolute; top: 8px; left: 8px; width: 16px; height: 16px; border-top: 3px solid #f59e0b; border-left: 3px solid #f59e0b; }
    .bracket-tr { position: absolute; top: 8px; right: 8px; width: 16px; height: 16px; border-top: 3px solid #f59e0b; border-right: 3px solid #f59e0b; }
    .bracket-bl { position: absolute; bottom: 8px; left: 8px; width: 16px; height: 16px; border-bottom: 3px solid #f59e0b; border-left: 3px solid #f59e0b; }
    .bracket-br { position: absolute; bottom: 8px; right: 8px; width: 16px; height: 16px; border-bottom: 3px solid #f59e0b; border-right: 3px solid #f59e0b; }
    .table-pill {
      display: inline-block;
      margin-top: 18px;
      background: #1e293b;
      color: #fbbf24;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 15px;
      font-weight: 900;
      letter-spacing: 2px;
      padding: 6px 20px;
      border-radius: 9999px;
      box-shadow: 0 4px 10px rgba(0,0,0,0.15);
    }
    .scan-title {
      font-size: 13px;
      font-weight: 800;
      color: #1f2937;
      margin-top: 10px;
    }
    .wifi-credentials-box {
      margin-top: 12px;
      background: #fffbeb;
      border: 1px solid #fef3c7;
      border-radius: 12px;
      padding: 10px 14px;
      font-size: 11px;
      color: #4b5563;
      line-height: 1.6;
    }
    .wifi-credentials-box strong { color: #111827; }
    @media print {
      body { background: transparent; padding: 0; }
      .flyer { box-shadow: none; page-break-inside: avoid; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="flyer">
    <div class="logo-container">
      <img src="${logoBase64 || '/logo.svg'}" alt="Logo" />
    </div>
    <h1 class="brand-title">${RESTAURANT_NAME}</h1>
    <div class="brand-sub">Access WiFi</div>
    <div class="qr-box">
      <div class="bracket-tl"></div>
      <div class="bracket-tr"></div>
      <div class="bracket-bl"></div>
      <div class="bracket-br"></div>
      <img src="${wifiDataUrl}" alt="WiFi QR" />
    </div>
    <div class="table-pill">TABLE ${tableNumStr} ACCESS</div>
    <div class="scan-title">Point Phone Camera to Connect</div>
    <div class="wifi-credentials-box">
      <div>SSID: <strong>${WIFI_SSID}</strong></div>
      <div>Pass: <strong>${WIFI_PASS}</strong></div>
    </div>
  </div>
</body>
</html>`;
    wifiFlyersFolder.file(`Table_${tableNumStr}_Access_WiFi_Flyer.html`, wifiFlyerHtml);

    // 5. Dual Standee HTML
    const dualFlyerHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Table ${tableNumStr} - Dual Standee (Order & WiFi) - ${RESTAURANT_NAME}</title>
  <style>
    @page { size: auto; margin: 10mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background: #f3f4f6;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      padding: 20px;
    }
    .flyer {
      width: 440px;
      background: #ffffff;
      border: 5px solid #f59e0b;
      border-radius: 28px;
      padding: 26px 20px 20px;
      text-align: center;
      box-shadow: 0 20px 40px rgba(0,0,0,0.12);
    }
    .logo-container {
      width: 60px;
      height: 60px;
      margin: 0 auto 8px;
      border-radius: 50%;
      border: 3px solid #f59e0b;
      box-shadow: 0 4px 12px rgba(245,158,11,0.25);
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #111827;
    }
    .logo-container img { width: 100%; height: 100%; object-fit: contain; }
    .brand-title {
      font-family: Georgia, Cambria, "Times New Roman", Times, serif;
      font-size: 20px;
      font-weight: 900;
      color: #111827;
    }
    .brand-sub {
      font-size: 10px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 2px;
      color: #d97706;
      margin-bottom: 14px;
    }
    .dual-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      margin: 8px 0;
    }
    .qr-card {
      background: #fafaf9;
      border: 2px solid #e7e5e4;
      border-radius: 18px;
      padding: 12px;
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    .qr-card.wifi-card {
      background: #fffbeb;
      border-color: #fef3c7;
    }
    .qr-tag {
      font-size: 10px;
      font-weight: 800;
      text-transform: uppercase;
      color: #111827;
      margin-bottom: 8px;
    }
    .qr-img { width: 140px; height: 140px; }
    .qr-sub { font-size: 9px; font-weight: 700; color: #6b7280; margin-top: 6px; }
    .table-pill {
      display: inline-block;
      margin-top: 14px;
      background: #1e293b;
      color: #fbbf24;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 15px;
      font-weight: 900;
      letter-spacing: 2px;
      padding: 5px 20px;
      border-radius: 9999px;
    }
    .wifi-footer {
      margin-top: 10px;
      font-size: 10px;
      color: #6b7280;
      font-family: monospace;
    }
    @media print {
      body { background: transparent; padding: 0; }
      .flyer { box-shadow: none; page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="flyer">
    <div class="logo-container">
      <img src="${logoBase64 || '/logo.svg'}" alt="Logo" />
    </div>
    <h1 class="brand-title">${RESTAURANT_NAME}</h1>
    <div class="brand-sub">Table ${tableNumStr} Standee</div>
    <div class="dual-grid">
      <div class="qr-card">
        <div class="qr-tag">🍽️ Order Food</div>
        <img class="qr-img" src="${orderDataUrl}" alt="Order QR" />
        <div class="qr-sub">Scan Menu to Order</div>
      </div>
      <div class="qr-card wifi-card">
        <div class="qr-tag">📶 Free WiFi</div>
        <img class="qr-img" src="${wifiDataUrl}" alt="WiFi QR" />
        <div class="qr-sub">Scan to Connect</div>
      </div>
    </div>
    <div class="table-pill">TABLE ${tableNumStr}</div>
    <div class="wifi-footer">WiFi: ${WIFI_SSID} • Pass: ${WIFI_PASS}</div>
  </div>
</body>
</html>`;
    dualFlyersFolder.file(`Table_${tableNumStr}_Dual_Standee_Flyer.html`, dualFlyerHtml);

    // Save cards for the master print page
    allFlyersHtmlCards.push({
      tableNumStr,
      orderDataUrl,
      wifiDataUrl
    });
  }

  // 6. Master All-In-One Printable HTML Document (All 11 tables in 1 file ready for Ctrl+P)
  const masterPrintHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>ALL 11 TABLE STANDEES & WIFI FLYERS - ${RESTAURANT_NAME}</title>
  <style>
    @page { size: A4; margin: 10mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background: #e5e7eb;
      padding: 20px;
    }
    .print-bar {
      position: sticky;
      top: 0;
      z-index: 100;
      background: #111827;
      color: #ffffff;
      padding: 16px 24px;
      border-radius: 16px;
      margin-bottom: 24px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      box-shadow: 0 10px 25px rgba(0,0,0,0.2);
    }
    .print-btn {
      background: #f59e0b;
      color: #ffffff;
      border: none;
      font-size: 14px;
      font-weight: 800;
      padding: 10px 24px;
      border-radius: 10px;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .print-btn:hover { background: #d97706; }
    .grid-container {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
      gap: 24px;
      justify-content: center;
    }
    .flyer {
      background: #ffffff;
      border: 4px solid #f59e0b;
      border-radius: 24px;
      padding: 24px 18px 18px;
      text-align: center;
      box-shadow: 0 8px 20px rgba(0,0,0,0.08);
      page-break-inside: avoid;
    }
    .logo-container {
      width: 56px;
      height: 56px;
      margin: 0 auto 8px;
      border-radius: 50%;
      border: 2px solid #f59e0b;
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #111827;
    }
    .logo-container img { width: 100%; height: 100%; object-fit: contain; }
    .brand-title {
      font-family: Georgia, Cambria, "Times New Roman", Times, serif;
      font-size: 17px;
      font-weight: 900;
      color: #111827;
    }
    .brand-sub {
      font-size: 9px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      color: #d97706;
      margin-bottom: 12px;
    }
    .qr-box {
      background: #fafaf9;
      border: 1.5px solid #e7e5e4;
      border-radius: 16px;
      padding: 10px;
      margin: 0 auto;
      width: 170px;
      height: 170px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .qr-box img { width: 100%; height: 100%; display: block; }
    .table-pill {
      display: inline-block;
      margin-top: 12px;
      background: #1e293b;
      color: #fbbf24;
      font-family: monospace;
      font-size: 13px;
      font-weight: 900;
      letter-spacing: 1.5px;
      padding: 4px 18px;
      border-radius: 9999px;
    }
    .scan-title { font-size: 11px; font-weight: 800; color: #1f2937; margin-top: 8px; }
    .scan-desc { font-size: 9px; color: #6b7280; margin-top: 1px; }
    .wifi-footer {
      margin-top: 10px;
      padding-top: 8px;
      border-top: 1px solid #f3f4f6;
      font-size: 9px;
      color: #6b7280;
    }
    @media print {
      body { background: transparent; padding: 0; }
      .print-bar { display: none; }
      .grid-container {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 15mm;
      }
      .flyer {
        box-shadow: none;
        page-break-inside: avoid;
        margin-bottom: 10mm;
      }
    }
  </style>
</head>
<body>
  <div class="print-bar">
    <div>
      <h2 style="font-size: 16px; font-weight: bold;">The Fat Buddha Delight - All 11 Table Standee Flyers</h2>
      <p style="font-size: 12px; color: #9ca3af; margin-top: 2px;">Click Print to print all 11 Dine-In Menu Order Standees or WiFi Standees</p>
    </div>
    <button class="print-btn" onclick="window.print()">
      🖨️ Print All Standees
    </button>
  </div>

  <div class="grid-container">
    ${allFlyersHtmlCards.map(c => `
      <div class="flyer">
        <div class="logo-container">
          <img src="${logoBase64 || '/logo.svg'}" alt="Logo" />
        </div>
        <h1 class="brand-title">${RESTAURANT_NAME}</h1>
        <div class="brand-sub">Restro & Cafe</div>
        <div class="qr-box">
          <img src="${c.orderDataUrl}" alt="Table ${c.tableNumStr} QR" />
        </div>
        <div class="table-pill">TABLE ${c.tableNumStr}</div>
        <div class="scan-title">Scan to View Menu & Place Order</div>
        <div class="scan-desc">No App Required • Live Kitchen Status</div>
        <div class="wifi-footer">📶 WiFi: <strong>${WIFI_SSID}</strong> • Pass: <strong>${WIFI_PASS}</strong></div>
      </div>
    `).join('')}
  </div>
</body>
</html>`;

  zip.file('00_PRINT_ALL_11_TABLES_FLYERS.html', masterPrintHtml);

  // Readme instructions
  const readmeText = `=====================================================
THE FAT BUDDHA DELIGHT - ALL TABLE & WIFI QR CODES
=====================================================

Included in this ZIP file:

📁 00_PRINT_ALL_11_TABLES_FLYERS.html
   Double-click to open in any browser and press Ctrl+P (or Cmd+P)
   to print all 11 table standee flyers at once on standard A4 or 4x6 paper!

📁 01_Order_Menu_QRs_Only/
   - High-Resolution (1000x1000) PNG QR codes for Tables T01 to T11
   - Scalable Vector Graphics (SVG) for professional printing & Canva

📁 02_WiFi_Access_QRs_Only/
   - High-Resolution (1000x1000) PNG QR codes for Tables T01 to T11
   - WiFi SSID: ${WIFI_SSID}
   - WiFi Password: ${WIFI_PASS}

📁 03_Printable_Flyers_Order_Menu/
   - Individual Standee Flyers for Tables T01 to T11 (Matches your gold border standee card)

📁 04_Printable_Flyers_WiFi_Access/
   - Individual WiFi Access Standee Flyers with corner accents for Tables T01 to T11

📁 05_Printable_Flyers_Dual_Both/
   - Dual 2-in-1 Standee Flyers showing both Food Menu QR & Free WiFi QR on one flyer

=====================================================
Restaurant: ${RESTAURANT_NAME}
Tables: Table 01 through Table 11
=====================================================
`;
  zip.file('README_INSTRUCTIONS.txt', readmeText);

  // Generate zip buffer
  const zipBuffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });

  // Save to public and root
  const publicZipPath = path.resolve('public/Fat_Buddha_Delight_All_Table_and_WiFi_QRs.zip');
  fs.writeFileSync(publicZipPath, zipBuffer);
  console.log('Saved to:', publicZipPath);

  const rootZipPath = path.resolve('Fat_Buddha_Delight_All_Table_and_WiFi_QRs.zip');
  fs.writeFileSync(rootZipPath, zipBuffer);
  console.log('Saved to:', rootZipPath);

  // Also save master print html to public for direct link
  fs.writeFileSync(path.resolve('public/all_table_qr_flyers.html'), masterPrintHtml);
  console.log('Saved master print html to public/all_table_qr_flyers.html');

  console.log('Done generating all QR codes and flyers successfully!');
}

generateAll().catch(err => {
  console.error('Error generating QRs:', err);
  process.exit(1);
});
