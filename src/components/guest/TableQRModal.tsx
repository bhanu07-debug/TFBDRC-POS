import React, { useState, useMemo } from 'react';
import { usePOS } from '../../context/POSContext';
import { Table } from '../../types';
import { QRCodeSVG } from 'qrcode.react';
import { X, QrCode, Download, Printer, Check, Copy, Sparkles, ExternalLink, Wifi, Utensils, FileArchive } from 'lucide-react';
import { FatBuddhaLogo } from '../common/FatBuddhaLogo';
import { downloadAllTableQRsZip, downloadSingleTableFlyer } from '../../utils/qrDownloadUtils';

interface TableQRModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTableNum?: number;
  tableNumber?: number;
  lockTable?: boolean;
}

export const TableQRModal: React.FC<TableQRModalProps> = ({
  isOpen,
  onClose,
  initialTableNum,
  tableNumber,
  lockTable
}) => {
  const {
    tables,
    settings,
    currentGuestTableNumber,
    setCurrentGuestTableNumber,
    setActiveInterface,
    activeInterface
  } = usePOS();

  const targetTable = initialTableNum || tableNumber || currentGuestTableNumber || 1;
  const [selectedTable, setSelectedTable] = useState(targetTable);
  const [copied, setCopied] = useState(false);
  const [cardMode, setCardMode] = useState<'order' | 'wifi' | 'dual'>('order');
  const [isDownloadingZip, setIsDownloadingZip] = useState(false);
  const [isDownloadingSingle, setIsDownloadingSingle] = useState(false);

  // Keep in sync if prop changes
  React.useEffect(() => {
    if (targetTable) {
      setSelectedTable(targetTable);
    }
  }, [targetTable]);

  const availableTables: Table[] = useMemo(() => {
    // Strictly and exclusively 11 tables (T01 through T11) - strictly no T12..T21
    const validTables = (tables || []).filter(t => {
      const num = t.tableNumber || t.number || parseInt(t.id.replace(/\D/g, ''), 10) || 0;
      return num >= 1 && num <= 11;
    });

    const existing = new Map(validTables.map(t => [t.number || t.tableNumber, t]));
    return Array.from({ length: 11 }, (_, i) => {
      const num = i + 1;
      const numStr = num < 10 ? `0${num}` : `${num}`;
      return existing.get(num) || {
        id: `T${numStr}`,
        number: num,
        tableNumber: num,
        name: `Table T${numStr}`,
        label: `Table ${numStr}`,
        section: num === 11 ? 'Garden Cabana' : (num === 10 ? 'VIP Dining' : 'Indoor AC'),
        capacity: num === 11 ? 6 : (num === 10 ? 8 : 4),
        status: 'AVAILABLE',
        activeSessionId: null,
        isActive: true,
        qrToken: `qr-tbl-t${numStr}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        totalBill: 0,
        activeOrdersCount: 0
      } as Table;
    });
  }, [tables]);

  if (!isOpen) return null;

  const activeTableNum = selectedTable || targetTable || 1;
  const originUrl = typeof window !== 'undefined' ? window.location.origin : 'https://fatbuddha.cafe';
  const tableUrl = `${originUrl}?table=${activeTableNum}`;
  
  const ssid = settings.wifiSsid || 'FatBuddha_Guest_5G';
  const wifiPass = (settings.wifiPassword && settings.wifiPassword !== 'fatbuddhadelight' && settings.wifiPassword !== 'delightnature')
    ? settings.wifiPassword
    : 'Newdelight@123';
  const wifiPayload = `WIFI:T:WPA;S:${ssid};P:${wifiPass};;`;

  const handleCopy = () => {
    navigator.clipboard.writeText(tableUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  const handlePrintAll = () => {
    window.open('/all_table_qr_flyers.html', '_blank');
  };

  const handleDownloadAllZip = async () => {
    try {
      setIsDownloadingZip(true);
      await downloadAllTableQRsZip({
        restaurantName: settings.restaurantName || 'The Fat Buddha Delight',
        wifiSsid: ssid,
        wifiPassword: wifiPass,
        tableCount: 11
      });
    } catch (err) {
      console.error('Failed to download QRs zip:', err);
    } finally {
      setIsDownloadingZip(false);
    }
  };

  const handleDownloadCurrent = async () => {
    try {
      setIsDownloadingSingle(true);
      await downloadSingleTableFlyer(
        activeTableNum,
        cardMode,
        settings.restaurantName || 'The Fat Buddha Delight',
        ssid,
        wifiPass
      );
    } catch (err) {
      console.error('Failed to download flyer:', err);
    } finally {
      setIsDownloadingSingle(false);
    }
  };

  const tableNumStr = activeTableNum < 10 ? `0${activeTableNum}` : `${activeTableNum}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#FDFCF0] border border-gray-200 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Top Header */}
        <div className="p-4 bg-white border-b border-gray-200 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center shadow-2xs">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
                Table {tableNumStr} QR Standee & WiFi
              </h3>
              <p className="text-[11px] text-gray-500">
                Official Dine-In QR Standees for Tables T01 to T11
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick ZIP Download Banner */}
        <div className="mx-4 mt-3 p-3 bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 rounded-2xl text-white shadow-md flex items-center justify-between gap-3 flex-shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0 shadow-inner">
              <FileArchive className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-black tracking-wide truncate">All 11 Table & WiFi QRs (.ZIP)</p>
              <p className="text-[10px] text-amber-100 font-medium truncate">Ready for print flyers, PNGs & SVGs</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <button
              type="button"
              onClick={handleDownloadAllZip}
              disabled={isDownloadingZip}
              className="px-3 py-1.5 bg-white hover:bg-amber-50 text-amber-900 rounded-xl text-xs font-black shadow-xs transition flex items-center gap-1.5 cursor-pointer active:scale-95 disabled:opacity-75"
              title="Download full ZIP with all 11 table QRs, WiFi QRs, and printable flyers"
            >
              <Download className="w-3.5 h-3.5 text-amber-600" />
              <span>{isDownloadingZip ? 'Zipping...' : 'Download ZIP'}</span>
            </button>
            <button
              type="button"
              onClick={handlePrintAll}
              className="px-2.5 py-1.5 bg-amber-800/60 hover:bg-amber-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer"
              title="Open all 11 flyers in printable sheet"
            >
              <Printer className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Print All</span>
            </button>
          </div>
        </div>

        {/* Table Selector - All 11 tables T01 to T11 clearly visible and switchable */}
        <div className="p-3 bg-white/80 border-b border-gray-200 flex flex-col gap-1.5 flex-shrink-0">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-700">
              Select Table (T01 - T11):
            </span>
            <span className="text-[11px] font-mono font-bold text-amber-600 bg-amber-50 px-2.5 py-0.5 rounded-md border border-amber-200">
              Active: Table {tableNumStr}
            </span>
          </div>
          <div className="flex items-center gap-1.5 overflow-x-auto py-1 scrollbar-thin">
            {availableTables.map(tbl => {
              const num = tbl.number || tbl.tableNumber;
              const isSelected = activeTableNum === num;
              const label = num < 10 ? `T0${num}` : `T${num}`;
              return (
                <button
                  key={tbl.id}
                  type="button"
                  onClick={() => {
                    setSelectedTable(num);
                    if (setCurrentGuestTableNumber && activeInterface === 'guest') {
                      setCurrentGuestTableNumber(num);
                    }
                    if (typeof window !== 'undefined') {
                      const url = new URL(window.location.href);
                      url.searchParams.set('table', String(num));
                      window.history.replaceState({}, '', url.toString());
                    }
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition flex-shrink-0 cursor-pointer ${
                    isSelected
                      ? 'bg-amber-500 text-white shadow-sm ring-2 ring-amber-600'
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                  }`}
                  title={`View QR Code for ${label}`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Standee Mode Switcher */}
        <div className="px-4 py-2 bg-amber-50/80 border-b border-amber-200 flex items-center justify-center gap-1.5 text-xs flex-shrink-0">
          <button
            onClick={() => setCardMode('order')}
            className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition cursor-pointer ${
              cardMode === 'order'
                ? 'bg-amber-500 text-white shadow-xs'
                : 'bg-white text-gray-700 hover:bg-amber-100/70 border border-gray-200'
            }`}
          >
            <Utensils className="w-3.5 h-3.5" />
            <span>Order Menu QR</span>
          </button>
          <button
            onClick={() => setCardMode('wifi')}
            className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition cursor-pointer ${
              cardMode === 'wifi'
                ? 'bg-amber-500 text-white shadow-xs'
                : 'bg-white text-gray-700 hover:bg-amber-100/70 border border-gray-200'
            }`}
          >
            <Wifi className="w-3.5 h-3.5" />
            <span>Access WiFi QR</span>
          </button>
          <button
            onClick={() => setCardMode('dual')}
            className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition cursor-pointer ${
              cardMode === 'dual'
                ? 'bg-amber-500 text-white shadow-xs'
                : 'bg-white text-gray-700 hover:bg-amber-100/70 border border-gray-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Dual Standee</span>
          </button>
        </div>

        {/* Printable Standee Card */}
        <div className="p-6 flex flex-col items-center justify-center bg-[#FDFCF0] overflow-y-auto">
          {cardMode === 'order' && (
            <div className="w-full max-w-[280px] p-6 bg-white rounded-2xl shadow-xl border-4 border-amber-500 text-center flex flex-col items-center relative print:border-black">
              {/* Top Brand Logo */}
              <div className="mb-2">
                <FatBuddhaLogo size={52} alt="The Fat Buddha Delight Logo" />
              </div>
              <h4 className="font-serif font-black text-gray-900 text-base leading-tight">
                The Fat Buddha Delight
              </h4>
              <p className="text-[9px] font-semibold uppercase tracking-wider text-amber-700 mb-3">
                Restro & Cafe
              </p>

              {/* QR Code Container */}
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 shadow-inner my-1">
                <QRCodeSVG
                  value={tableUrl}
                  size={160}
                  level="H"
                  includeMargin={false}
                  fgColor="#171717"
                />
              </div>

              {/* Table Number Pill */}
              <div className="mt-3 px-4 py-1 rounded-full bg-[#1F2937] text-amber-400 font-mono font-black text-sm tracking-wider uppercase shadow flex items-center gap-1.5">
                <span>TABLE {tableNumStr}</span>
              </div>

              <p className="text-[10px] font-bold text-gray-800 mt-2">
                Scan to View Menu & Place Order
              </p>
              <p className="text-[8px] text-gray-500">
                No App Required • Live Kitchen Status
              </p>
              <div className="mt-2 text-[8px] text-gray-400 border-t border-gray-100 pt-1 w-full flex items-center justify-center gap-1">
                <Wifi className="w-2.5 h-2.5 text-amber-600" />
                <span>Access WiFi: <span className="font-semibold text-gray-700">{ssid}</span></span>
              </div>
            </div>
          )}

          {cardMode === 'wifi' && (
            <div className="w-full max-w-[280px] p-6 bg-white rounded-2xl shadow-xl border-4 border-amber-500 text-center flex flex-col items-center relative print:border-black">
              {/* Top Brand Logo */}
              <div className="mb-2">
                <FatBuddhaLogo size={52} alt="The Fat Buddha Delight Logo" />
              </div>
              <h4 className="font-serif font-black text-gray-900 text-base leading-tight">
                The Fat Buddha Delight
              </h4>
              <p className="text-[10px] font-bold uppercase tracking-wider text-amber-700 mb-3">
                Access WiFi
              </p>

              {/* QR Code Container with Corner Brackets */}
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 shadow-inner my-1 relative group">
                <QRCodeSVG
                  value={wifiPayload}
                  size={160}
                  level="M"
                  includeMargin={false}
                  fgColor="#171717"
                />
                <div className="absolute top-1.5 left-1.5 w-3 h-3 border-t-2 border-l-2 border-amber-500" />
                <div className="absolute top-1.5 right-1.5 w-3 h-3 border-t-2 border-r-2 border-amber-500" />
                <div className="absolute bottom-1.5 left-1.5 w-3 h-3 border-b-2 border-l-2 border-amber-500" />
                <div className="absolute bottom-1.5 right-1.5 w-3 h-3 border-b-2 border-r-2 border-amber-500" />
              </div>

              {/* Table Number Pill */}
              <div className="mt-3 px-4 py-1 rounded-full bg-[#1F2937] text-amber-400 font-mono font-black text-sm tracking-wider uppercase shadow flex items-center gap-1.5">
                <span>TABLE {tableNumStr} ACCESS</span>
              </div>

              <p className="text-[10px] font-bold text-gray-800 mt-2">
                Point Phone Camera to Connect
              </p>
              <div className="mt-2 text-[9px] text-gray-600 bg-amber-50 rounded-lg p-2 border border-amber-200 w-full space-y-0.5">
                <div>SSID: <span className="font-mono font-bold text-gray-900">{ssid}</span></div>
                <div>Pass: <span className="font-mono font-bold text-gray-900">{wifiPass}</span></div>
              </div>
            </div>
          )}

          {cardMode === 'dual' && (
            <div className="w-full max-w-[340px] p-5 bg-white rounded-2xl shadow-xl border-4 border-amber-500 text-center flex flex-col items-center relative print:border-black">
              <div className="flex items-center gap-2 mb-2">
                <FatBuddhaLogo size={38} alt="The Fat Buddha Delight" />
                <div className="text-left">
                  <h4 className="font-serif font-black text-gray-900 text-sm leading-tight">
                    The Fat Buddha Delight
                  </h4>
                  <p className="text-[9px] font-bold text-amber-700 uppercase">
                    Table {tableNumStr} Standee
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 my-2 w-full">
                {/* Order QR */}
                <div className="p-2.5 bg-gray-50 rounded-xl border border-gray-200 flex flex-col items-center">
                  <div className="text-[9px] font-extrabold uppercase text-gray-900 mb-1 flex items-center gap-1">
                    <Utensils className="w-2.5 h-2.5 text-amber-600" />
                    <span>Order Food</span>
                  </div>
                  <QRCodeSVG
                    value={tableUrl}
                    size={96}
                    level="H"
                    includeMargin={false}
                    fgColor="#171717"
                  />
                  <span className="text-[8px] font-bold text-gray-500 mt-1">Scan Menu</span>
                </div>

                {/* WiFi QR */}
                <div className="p-2.5 bg-amber-50/60 rounded-xl border border-amber-200 flex flex-col items-center">
                  <div className="text-[9px] font-extrabold uppercase text-amber-900 mb-1 flex items-center gap-1">
                    <Wifi className="w-2.5 h-2.5 text-amber-600" />
                    <span>Access WiFi</span>
                  </div>
                  <QRCodeSVG
                    value={wifiPayload}
                    size={96}
                    level="M"
                    includeMargin={false}
                    fgColor="#171717"
                  />
                  <span className="text-[8px] font-bold text-amber-800 mt-1">Scan to Join</span>
                </div>
              </div>

              <div className="mt-1 text-[9px] text-gray-500 font-mono">
                WiFi: {ssid} • Pass: {wifiPass}
              </div>
            </div>
          )}
        </div>

        {/* Action Controls */}
        <div className="p-4 bg-white border-t border-gray-200 flex flex-wrap items-center justify-between gap-2 flex-shrink-0">
          {activeInterface !== 'guest' ? (
            <button
              onClick={() => {
                setCurrentGuestTableNumber(activeTableNum);
                setActiveInterface('guest');
                onClose();
              }}
              className="flex-1 min-w-[140px] flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-sm transition cursor-pointer active:scale-95"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Preview Menu</span>
            </button>
          ) : (
            <button
              onClick={() => {
                setCurrentGuestTableNumber(activeTableNum);
                if (typeof window !== 'undefined') {
                  const url = new URL(window.location.href);
                  url.searchParams.set('table', String(activeTableNum));
                  window.history.replaceState({}, '', url.toString());
                }
                onClose();
              }}
              className="flex-1 min-w-[140px] flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-sm transition cursor-pointer active:scale-95"
            >
              <span>Order for T{tableNumStr}</span>
            </button>
          )}

          <button
            onClick={handleDownloadCurrent}
            disabled={isDownloadingSingle}
            className="flex items-center gap-1 px-3 py-2.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-bold border border-amber-300 transition cursor-pointer"
            title="Download high-resolution QR image for this table"
          >
            <Download className="w-3.5 h-3.5 text-amber-600" />
            <span>Download PNG</span>
          </button>

          <button
            onClick={handleCopy}
            className="flex items-center gap-1 px-3 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold border border-gray-200 transition cursor-pointer"
            title="Copy QR Link"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-gray-600" />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>

          <button
            onClick={handlePrint}
            className="px-3 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold border border-gray-200 transition cursor-pointer"
            title="Print This Standee"
          >
            <Printer className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

