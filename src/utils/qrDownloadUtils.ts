import JSZip from 'jszip';
import QRCode from 'qrcode';

export interface QRDownloadOptions {
  restaurantName?: string;
  wifiSsid?: string;
  wifiPassword?: string;
  tableCount?: number;
}

export const downloadAllTableQRsZip = async (options: QRDownloadOptions = {}) => {
  const RESTAURANT_NAME = options.restaurantName || 'The Fat Buddha Delight';
  const WIFI_SSID = options.wifiSsid || 'FatBuddha_Guest_5G';
  const WIFI_PASS = options.wifiPassword || 'Newdelight@123';
  const TABLE_COUNT = options.tableCount || 11;
  const originUrl = typeof window !== 'undefined' ? window.location.origin : 'https://fatbuddha.cafe';

  // 1. First attempt: direct fetch of pre-generated zip if available
  try {
    const response = await fetch('/Fat_Buddha_Delight_All_Table_and_WiFi_QRs.zip', { method: 'HEAD' });
    if (response.ok) {
      const a = document.createElement('a');
      a.href = '/Fat_Buddha_Delight_All_Table_and_WiFi_QRs.zip';
      a.download = `Fat_Buddha_Delight_All_Table_and_WiFi_QRs.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      return;
    }
  } catch {
    // Fall back to client-side JSZip generation
  }

  // 2. Client-side JSZip generation fallback
  const zip = new JSZip();
  const orderFolder = zip.folder('01_Order_Menu_QRs_Only');
  const wifiFolder = zip.folder('02_WiFi_Access_QRs_Only');
  const flyerOrderFolder = zip.folder('03_Printable_Flyers_Order_Menu');
  const flyerWifiFolder = zip.folder('04_Printable_Flyers_WiFi_Access');
  const flyerDualFolder = zip.folder('05_Printable_Flyers_Dual_Both');

  for (let i = 1; i <= TABLE_COUNT; i++) {
    const tableNumStr = i < 10 ? `0${i}` : `${i}`;
    const tableUrl = `${originUrl}?table=${i}`;
    const wifiPayload = `WIFI:T:WPA;S:${WIFI_SSID};P:${WIFI_PASS};;`;

    // Data URLs
    const orderDataUrl = await QRCode.toDataURL(tableUrl, { width: 1000, margin: 2, errorCorrectionLevel: 'H' });
    const wifiDataUrl = await QRCode.toDataURL(wifiPayload, { width: 1000, margin: 2, errorCorrectionLevel: 'H' });

    // Base64 PNGs
    const orderBase64 = orderDataUrl.replace(/^data:image\/png;base64,/, '');
    const wifiBase64 = wifiDataUrl.replace(/^data:image\/png;base64,/, '');

    orderFolder?.file(`Table_${tableNumStr}_Order_QR.png`, orderBase64, { base64: true });
    wifiFolder?.file(`Table_${tableNumStr}_WiFi_QR.png`, wifiBase64, { base64: true });

    // HTML Flyers
    flyerOrderFolder?.file(`Table_${tableNumStr}_Order_Flyer.html`, createOrderFlyerHtml(i, tableNumStr, RESTAURANT_NAME, WIFI_SSID, orderDataUrl));
    flyerWifiFolder?.file(`Table_${tableNumStr}_WiFi_Flyer.html`, createWifiFlyerHtml(i, tableNumStr, RESTAURANT_NAME, WIFI_SSID, WIFI_PASS, wifiDataUrl));
    flyerDualFolder?.file(`Table_${tableNumStr}_Dual_Standee.html`, createDualFlyerHtml(i, tableNumStr, RESTAURANT_NAME, WIFI_SSID, WIFI_PASS, orderDataUrl, wifiDataUrl));
  }

  // Add Readme
  zip.file('README_INSTRUCTIONS.txt', `=====================================================
${RESTAURANT_NAME} - ALL 11 TABLE & WIFI QR CODES
=====================================================
WiFi SSID: ${WIFI_SSID}
WiFi Password: ${WIFI_PASS}
Tables: Table 01 to Table ${TABLE_COUNT}
=====================================================`);

  const blob = await zip.generateAsync({ type: 'blob' });
  const downloadUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = downloadUrl;
  a.download = `Fat_Buddha_Delight_All_Table_and_WiFi_QRs.zip`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(downloadUrl);
};

export const downloadSingleTableFlyer = async (tableNum: number, type: 'order' | 'wifi' | 'dual', restaurantName = 'The Fat Buddha Delight', wifiSsid = 'FatBuddha_Guest_5G', wifiPass = 'Newdelight@123') => {
  const originUrl = typeof window !== 'undefined' ? window.location.origin : 'https://fatbuddha.cafe';
  const tableNumStr = tableNum < 10 ? `0${tableNum}` : `${tableNum}`;
  const tableUrl = `${originUrl}?table=${tableNum}`;
  const wifiPayload = `WIFI:T:WPA;S:${wifiSsid};P:${wifiPass};;`;

  if (type === 'order') {
    const dataUrl = await QRCode.toDataURL(tableUrl, { width: 1200, margin: 2, errorCorrectionLevel: 'H' });
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `Table_${tableNumStr}_Order_Menu_QR.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  } else if (type === 'wifi') {
    const dataUrl = await QRCode.toDataURL(wifiPayload, { width: 1200, margin: 2, errorCorrectionLevel: 'H' });
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `Table_${tableNumStr}_WiFi_Access_QR.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  } else {
    const dataUrl = await QRCode.toDataURL(tableUrl, { width: 1000, margin: 2, errorCorrectionLevel: 'H' });
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `Table_${tableNumStr}_QR.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }
};

function createOrderFlyerHtml(tableNum: number, tableNumStr: string, brand: string, ssid: string, qrDataUrl: string) {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Table ${tableNumStr} - ${brand}</title>
  <style>
    body { font-family: system-ui, sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; background: #f3f4f6; margin: 0; }
    .flyer { width: 340px; background: #fff; border: 5px solid #f59e0b; border-radius: 28px; padding: 28px 20px 20px; text-align: center; }
    .brand { font-family: serif; font-size: 20px; font-weight: 900; color: #111827; }
    .sub { font-size: 10px; font-weight: 800; color: #d97706; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 16px; }
    .qr { width: 220px; height: 220px; margin: 0 auto; display: block; border-radius: 16px; border: 2px solid #e5e7eb; padding: 12px; background: #fafaf9; }
    .pill { display: inline-block; margin-top: 16px; background: #1e293b; color: #fbbf24; font-family: monospace; font-size: 15px; font-weight: 900; letter-spacing: 2px; padding: 5px 22px; border-radius: 9999px; }
    .title { font-size: 13px; font-weight: 800; color: #1f2937; margin-top: 10px; }
    .desc { font-size: 10px; color: #6b7280; margin-top: 2px; }
    .wifi { margin-top: 14px; border-top: 1px solid #f3f4f6; padding-top: 8px; font-size: 10px; color: #6b7280; }
  </style>
</head>
<body>
  <div class="flyer">
    <div class="brand">${brand}</div>
    <div class="sub">Restro & Cafe</div>
    <img class="qr" src="${qrDataUrl}" alt="Table ${tableNumStr} QR" />
    <div class="pill">TABLE ${tableNumStr}</div>
    <div class="title">Scan to View Menu & Place Order</div>
    <div class="desc">No App Required • Live Kitchen Status</div>
    <div class="wifi">📶 Access WiFi: <strong>${ssid}</strong></div>
  </div>
</body>
</html>`;
}

function createWifiFlyerHtml(tableNum: number, tableNumStr: string, brand: string, ssid: string, pass: string, qrDataUrl: string) {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Table ${tableNumStr} WiFi - ${brand}</title>
  <style>
    body { font-family: system-ui, sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; background: #f3f4f6; margin: 0; }
    .flyer { width: 340px; background: #fff; border: 5px solid #f59e0b; border-radius: 28px; padding: 28px 20px 20px; text-align: center; }
    .brand { font-family: serif; font-size: 20px; font-weight: 900; color: #111827; }
    .sub { font-size: 10px; font-weight: 800; color: #d97706; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 16px; }
    .qr { width: 220px; height: 220px; margin: 0 auto; display: block; border-radius: 16px; border: 2px solid #e5e7eb; padding: 12px; background: #fafaf9; }
    .pill { display: inline-block; margin-top: 16px; background: #1e293b; color: #fbbf24; font-family: monospace; font-size: 14px; font-weight: 900; letter-spacing: 2px; padding: 5px 20px; border-radius: 9999px; }
    .title { font-size: 13px; font-weight: 800; color: #1f2937; margin-top: 10px; }
    .box { margin-top: 10px; background: #fffbeb; border: 1px solid #fef3c7; border-radius: 10px; padding: 8px 12px; font-size: 10px; color: #4b5563; }
  </style>
</head>
<body>
  <div class="flyer">
    <div class="brand">${brand}</div>
    <div class="sub">Access WiFi</div>
    <img class="qr" src="${qrDataUrl}" alt="WiFi QR" />
    <div class="pill">TABLE ${tableNumStr} ACCESS</div>
    <div class="title">Point Phone Camera to Connect</div>
    <div class="box">
      <div>SSID: <strong>${ssid}</strong></div>
      <div>Pass: <strong>${pass}</strong></div>
    </div>
  </div>
</body>
</html>`;
}

function createDualFlyerHtml(tableNum: number, tableNumStr: string, brand: string, ssid: string, pass: string, orderQr: string, wifiQr: string) {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Table ${tableNumStr} Dual Standee - ${brand}</title>
  <style>
    body { font-family: system-ui, sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; background: #f3f4f6; margin: 0; }
    .flyer { width: 440px; background: #fff; border: 5px solid #f59e0b; border-radius: 28px; padding: 24px 18px; text-align: center; }
    .brand { font-family: serif; font-size: 20px; font-weight: 900; color: #111827; }
    .sub { font-size: 10px; font-weight: 800; color: #d97706; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 12px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    .card { background: #fafaf9; border: 1.5px solid #e5e7eb; border-radius: 16px; padding: 10px; }
    .card img { width: 130px; height: 130px; display: block; margin: 0 auto; }
    .tag { font-size: 10px; font-weight: 800; margin-bottom: 6px; }
    .pill { display: inline-block; margin-top: 14px; background: #1e293b; color: #fbbf24; font-family: monospace; font-size: 14px; font-weight: 900; padding: 4px 20px; border-radius: 9999px; }
    .wifi { margin-top: 8px; font-size: 10px; color: #6b7280; }
  </style>
</head>
<body>
  <div class="flyer">
    <div class="brand">${brand}</div>
    <div class="sub">Table ${tableNumStr} Standee</div>
    <div class="grid">
      <div class="card">
        <div class="tag">🍽️ Order Food</div>
        <img src="${orderQr}" alt="Order QR" />
      </div>
      <div class="card">
        <div class="tag">📶 Free WiFi</div>
        <img src="${wifiQr}" alt="WiFi QR" />
      </div>
    </div>
    <div class="pill">TABLE ${tableNumStr}</div>
    <div class="wifi">WiFi: ${ssid} • Pass: ${pass}</div>
  </div>
</body>
</html>`;
}
