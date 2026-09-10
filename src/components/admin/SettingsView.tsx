import React, { useState, useEffect } from 'react';
import { usePOS } from '../../context/POSContext';
import {
  Store,
  Printer,
  QrCode,
  Save,
  CheckCircle2,
  Database,
  Cloud,
  RotateCcw,
  Wifi,
  ShieldCheck,
  Building2,
  Phone,
  Mail,
  ReceiptText
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { FatBuddhaLogo } from '../common/FatBuddhaLogo';
import { WifiQRModal } from '../guest/WifiQRModal';

export const SettingsView: React.FC = () => {
  const { settings, updateSettings, resetToDemoData, tables, isCloudSynced } = usePOS();
  const [formData, setFormData] = useState({ ...settings });
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [isQrSheetVisible, setIsQrSheetVisible] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [batchMode, setBatchMode] = useState<'order' | 'wifi' | 'dual'>('dual');
  const [isWifiPreviewOpen, setIsWifiPreviewOpen] = useState(false);

  useEffect(() => {
    setFormData({
      ...settings,
      name: settings.name ?? settings.restaurantName ?? '',
      tagline: settings.tagline ?? '',
      address: settings.address ?? '',
      phone: settings.phone ?? '',
      panNumber: settings.panNumber ?? settings.panNo ?? '302194821',
      panNo: settings.panNumber ?? settings.panNo ?? '302194821',
      gstNumber: settings.gstNumber ?? '',
      wifiSsid: settings.wifiSsid ?? '',
      wifiPassword: settings.wifiPassword ?? '',
      currencySymbol: settings.currencySymbol ?? 'Rs.',
      autoPrintKOT: settings.autoPrintKOT ?? true,
      soundAlerts: settings.soundAlerts ?? true,
    });
  }, [settings]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateSettings(formData);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  const handleReset = async () => {
    if (confirm('Reset all 10 tables to Available and clear test orders, payments, and KOTs for a clean initial development slate?')) {
      setIsResetting(true);
      await resetToDemoData();
      setIsResetting(false);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2000);
    }
  };

  const originUrl = typeof window !== 'undefined' ? window.location.origin : 'https://fatbuddha.cafe';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-gray-900 tracking-tight">
              Restaurant & Cloud Configuration
            </h2>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Firebase Firestore Active
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">
            Configure business profile, PAN number, Firestore real-time cloud sync, and print Table 01-10 QR codes.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="btn-batch-qr-print"
            onClick={() => setIsQrSheetVisible(!isQrSheetVisible)}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-xs transition"
          >
            <QrCode className="w-4 h-4" />
            <span>{isQrSheetVisible ? 'Hide Table QR Sheets' : 'Print Table 01-10 QR Codes'}</span>
          </button>
        </div>
      </div>

      {/* Firebase Cloud Live Status Banner */}
      <div className="p-4 bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 text-white rounded-xl shadow-xs border border-gray-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Cloud className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-white">Google Cloud Firestore Connected</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                foody-rest (asia-south1)
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-0.5">
              Multi-device real-time sync enabled for Guest QR Ordering, Reception POS, and Kitchen KDS.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleReset}
          disabled={isResetting}
          className="px-3.5 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-200 border border-gray-700 rounded-lg text-xs font-semibold flex items-center gap-2 transition"
        >
          <RotateCcw className={`w-3.5 h-3.5 ${isResetting ? 'animate-spin' : ''}`} />
          <span>{isResetting ? 'Syncing...' : 'Reset 10 Tables to Clean Slate'}</span>
        </button>
      </div>

      {/* Batch Table QR Codes Sheet for Printing */}
      {isQrSheetVisible && (
        <div id="printable-qr-sheet" className="p-6 bg-white text-gray-900 rounded-xl shadow-md border border-gray-200 space-y-6 animate-in fade-in duration-200 print:m-0 print:p-0 print:border-none">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-200 print:hidden">
            <div>
              <h3 className="text-sm font-bold uppercase text-gray-900">
                Ready-to-Print Standee QR Sheet (Table 01 to Table 10)
              </h3>
              <p className="text-xs text-gray-500">
                Print on cardstock or acrylic. Diners scan to order and connect to Guest Wi-Fi directly from every table.
              </p>
            </div>
            
            <div className="flex items-center gap-2">
              {/* Standee Mode Selector */}
              <div className="bg-gray-100 rounded-lg p-1 border border-gray-200 flex items-center gap-1 text-xs">
                <button
                  type="button"
                  onClick={() => setBatchMode('order')}
                  className={`px-2.5 py-1 rounded font-bold transition ${
                    batchMode === 'order' ? 'bg-amber-500 text-white shadow-xs' : 'text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  Order QRs
                </button>
                <button
                  type="button"
                  onClick={() => setBatchMode('wifi')}
                  className={`px-2.5 py-1 rounded font-bold transition ${
                    batchMode === 'wifi' ? 'bg-amber-500 text-white shadow-xs' : 'text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  WiFi QRs
                </button>
                <button
                  type="button"
                  onClick={() => setBatchMode('dual')}
                  className={`px-2.5 py-1 rounded font-bold transition ${
                    batchMode === 'dual' ? 'bg-amber-500 text-white shadow-xs' : 'text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  Dual (Order + WiFi)
                </button>
              </div>

              <button
                onClick={() => window.print()}
                className="px-4 py-2 bg-gray-900 hover:bg-black text-white font-bold rounded-lg text-xs flex items-center gap-2 shadow-xs transition"
              >
                <Printer className="w-4 h-4" />
                <span>Print All 10 Standees</span>
              </button>
            </div>
          </div>

          <div className={`grid gap-4 ${batchMode === 'dual' ? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3' : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5'}`}>
            {tables.map(tbl => {
              const tableUrl = `${originUrl}/?table=${tbl.number}`;
              const ssid = formData.wifiSsid || settings.wifiSsid || 'Fat_Buddha_Guest_WiFi';
              const pass = formData.wifiPassword || settings.wifiPassword || 'fatbuddhadelight';
              const wifiPayload = `WIFI:T:WPA;S:${ssid};P:${pass};;`;

              if (batchMode === 'order') {
                return (
                  <div
                    key={tbl.id}
                    className="p-4 bg-white border border-gray-300 rounded-xl flex flex-col items-center text-center space-y-2 shadow-xs break-inside-avoid"
                  >
                    <FatBuddhaLogo size={28} alt="The Fat Buddha Delight" />
                    <div className="text-[10px] font-bold tracking-wider uppercase text-amber-600">
                      The Fat Buddha Delight
                    </div>

                    <div className="p-2 bg-white border border-gray-200 rounded-lg">
                      <QRCodeSVG
                        value={tableUrl}
                        size={100}
                        level="H"
                        includeMargin={false}
                      />
                    </div>

                    <div>
                      <div className="text-base font-bold font-mono text-gray-900 leading-tight">
                        {tbl.label}
                      </div>
                      <div className="text-[10px] text-gray-500 font-semibold">
                        {tbl.section} • {tbl.capacity} Seats
                      </div>
                    </div>

                    <div className="text-[9px] font-bold text-gray-500 pt-1 border-t border-gray-200 w-full">
                      SCAN TO ORDER
                    </div>
                  </div>
                );
              }

              if (batchMode === 'wifi') {
                return (
                  <div
                    key={tbl.id}
                    className="p-4 bg-white border-2 border-amber-400 rounded-xl flex flex-col items-center text-center space-y-2 shadow-xs break-inside-avoid"
                  >
                    <FatBuddhaLogo size={28} alt="The Fat Buddha Delight" />
                    <div className="text-[10px] font-bold tracking-wider uppercase text-amber-600">
                      Guest Free Wi-Fi
                    </div>

                    <div className="p-2 bg-white border border-gray-200 rounded-lg">
                      <QRCodeSVG
                        value={wifiPayload}
                        size={100}
                        level="M"
                        includeMargin={false}
                      />
                    </div>

                    <div>
                      <div className="text-sm font-bold font-mono text-gray-900 leading-tight">
                        {tbl.label} Access
                      </div>
                      <div className="text-[10px] text-gray-600 font-mono">
                        {ssid}
                      </div>
                    </div>

                    <div className="text-[9px] font-bold text-amber-700 pt-1 border-t border-gray-200 w-full">
                      SCAN TO CONNECT
                    </div>
                  </div>
                );
              }

              // Dual mode: both Order and WiFi
              return (
                <div
                  key={tbl.id}
                  className="p-3 bg-white border-2 border-amber-500/80 rounded-2xl flex flex-col items-center text-center space-y-2 shadow-xs break-inside-avoid"
                >
                  <div className="flex items-center gap-2">
                    <FatBuddhaLogo size={24} alt="The Fat Buddha Delight" />
                    <div className="text-left">
                      <div className="text-[11px] font-black font-serif text-gray-900 leading-none">
                        The Fat Buddha Delight
                      </div>
                      <div className="text-[9px] font-bold uppercase text-amber-600">
                        {tbl.label} Standee
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 w-full pt-1">
                    {/* Order Food */}
                    <div className="p-2 bg-gray-50 rounded-lg border border-gray-200 flex flex-col items-center">
                      <span className="text-[8px] font-extrabold uppercase text-gray-700 mb-1">
                        Order Food
                      </span>
                      <QRCodeSVG
                        value={tableUrl}
                        size={78}
                        level="H"
                        includeMargin={false}
                      />
                      <span className="text-[7px] text-gray-500 mt-1 font-bold">Scan Menu</span>
                    </div>

                    {/* Free WiFi */}
                    <div className="p-2 bg-amber-50/70 rounded-lg border border-amber-200 flex flex-col items-center">
                      <span className="text-[8px] font-extrabold uppercase text-amber-800 mb-1">
                        Free WiFi
                      </span>
                      <QRCodeSVG
                        value={wifiPayload}
                        size={78}
                        level="M"
                        includeMargin={false}
                      />
                      <span className="text-[7px] text-amber-700 mt-1 font-bold">Scan to Join</span>
                    </div>
                  </div>

                  <div className="text-[8px] text-gray-500 font-mono w-full border-t border-gray-200 pt-1">
                    WiFi: {ssid} • Pass: {pass}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Main Settings Form */}
      <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Business Profile */}
        <div className="p-5 bg-white rounded-xl border border-gray-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-gray-200">
            <div className="flex items-center gap-2 text-gray-900 font-bold text-xs uppercase tracking-wider">
              <Store className="w-4 h-4 text-amber-500" />
              <span>Restaurant Brand Profile</span>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-amber-700 font-medium">
              <FatBuddhaLogo size={26} alt="Official Logo" />
              <span className="hidden sm:inline font-bold">Official Logo Active</span>
            </div>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <label className="block text-gray-700 font-bold mb-1">Restaurant Name</label>
              <input
                type="text"
                value={formData.name ?? ''}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-800 focus:outline-none focus:border-amber-500 font-semibold"
              />
            </div>

            <div>
              <label className="block text-gray-700 font-bold mb-1">Brand Tagline</label>
              <input
                type="text"
                value={formData.tagline ?? ''}
                onChange={e => setFormData({ ...formData, tagline: e.target.value })}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-800 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-gray-700 font-bold mb-1">Address / Location</label>
              <input
                type="text"
                value={formData.address ?? ''}
                onChange={e => setFormData({ ...formData, address: e.target.value })}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-800 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-gray-700 font-bold mb-1">Phone Helpline</label>
                <input
                  type="text"
                  value={formData.phone ?? ''}
                  onChange={e => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-800 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-bold mb-1">PAN NO</label>
                <input
                  type="text"
                  value={formData.panNumber ?? formData.panNo ?? ''}
                  onChange={e => setFormData({ ...formData, panNumber: e.target.value, panNo: e.target.value, gstNumber: e.target.value })}
                  placeholder="e.g. 302194821"
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-800 focus:outline-none focus:border-amber-500 font-mono font-bold"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-gray-700 font-bold mb-1">Guest WiFi SSID</label>
                <input
                  type="text"
                  value={formData.wifiSsid ?? ''}
                  onChange={e => setFormData({ ...formData, wifiSsid: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-800 focus:outline-none focus:border-amber-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-bold mb-1">WiFi Password</label>
                <input
                  type="text"
                  value={formData.wifiPassword ?? ''}
                  onChange={e => setFormData({ ...formData, wifiPassword: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-800 focus:outline-none focus:border-amber-500 font-mono"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsWifiPreviewOpen(true)}
              className="w-full py-2 px-3 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <Wifi className="w-4 h-4 text-amber-600" />
              <span>Preview & Print Guest WiFi QR Code</span>
            </button>
          </div>
        </div>

        {/* Taxes & Hardware */}
        <div className="p-5 bg-white rounded-xl border border-gray-200 shadow-xs space-y-4">
          <div className="flex items-center gap-2 text-gray-900 font-bold text-xs uppercase tracking-wider pb-2 border-b border-gray-200">
            <Printer className="w-4 h-4 text-amber-500" />
            <span>Taxes & KOT Printing</span>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <label className="block text-gray-700 font-bold mb-1">Currency Symbol</label>
              <input
                type="text"
                value={formData.currencySymbol ?? 'Rs.'}
                onChange={e => setFormData({ ...formData, currencySymbol: e.target.value })}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-800 focus:outline-none focus:border-amber-500 font-mono font-bold"
              />
            </div>

            {/* Sound alert switch */}
            <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 flex items-center justify-between">
              <div>
                <span className="font-bold text-gray-900 block">KOT Audio Chime Alert</span>
                <span className="text-[11px] text-gray-500">Play chime when new order arrives</span>
              </div>
              <input
                type="checkbox"
                checked={formData.soundAlerts ?? true}
                onChange={e => setFormData({ ...formData, soundAlerts: e.target.checked })}
                className="w-4 h-4 text-amber-500 rounded border-gray-300 focus:ring-amber-400"
              />
            </div>

            {/* Auto Print KOT */}
            <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 flex items-center justify-between">
              <div>
                <span className="font-bold text-gray-900 block">Auto-Print KOT</span>
                <span className="text-[11px] text-gray-500">Auto-spool kitchen tickets upon confirmation</span>
              </div>
              <input
                type="checkbox"
                checked={formData.autoPrintKOT}
                onChange={e => setFormData({ ...formData, autoPrintKOT: e.target.checked })}
                className="w-4 h-4 text-amber-500 rounded border-gray-300 focus:ring-amber-400"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-xs"
              >
                {savedSuccess ? (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Settings Saved to Cloud Firestore</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Save All System Changes</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </form>

      {/* WiFi QR Modal Preview */}
      <WifiQRModal
        isOpen={isWifiPreviewOpen}
        onClose={() => setIsWifiPreviewOpen(false)}
      />
    </div>
  );
};
