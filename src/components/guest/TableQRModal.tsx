import React, { useState } from 'react';
import { usePOS } from '../../context/POSContext';
import { QRCodeSVG } from 'qrcode.react';
import { X, QrCode, Download, Printer, Check, Copy, Sparkles, ExternalLink, Wifi, Utensils } from 'lucide-react';
import { FatBuddhaLogo } from '../common/FatBuddhaLogo';

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

  const isLocked = lockTable ?? (activeInterface === 'guest');
  const targetTable = initialTableNum || tableNumber || currentGuestTableNumber;
  const [selectedTable, setSelectedTable] = useState(targetTable);
  const [copied, setCopied] = useState(false);
  const [cardMode, setCardMode] = useState<'order' | 'wifi' | 'dual'>('order');

  // Keep in sync if prop changes
  React.useEffect(() => {
    if (targetTable) {
      setSelectedTable(targetTable);
    }
  }, [targetTable]);

  if (!isOpen) return null;

  const activeTableNum = isLocked ? targetTable : selectedTable;
  const originUrl = typeof window !== 'undefined' ? window.location.origin : 'https://fatbuddha.cafe';
  const tableUrl = `${originUrl}?table=${activeTableNum}`;
  
  const ssid = settings.wifiSsid || 'Delight_Restaurant_Guest';
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

  const tableNumStr = activeTableNum < 10 ? `0${activeTableNum}` : `${activeTableNum}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#FDFCF0] border border-gray-200 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col">
        {/* Top Header */}
        <div className="p-4 bg-white border-b border-gray-200 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center">
              <QrCode className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
                Table {tableNumStr} QR Code
              </h3>
              <p className="text-[11px] text-gray-500">
                {isLocked ? `Dedicated QR for Table ${tableNumStr} only` : 'Contactless Guest Ordering QR'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Table Selector (Only shown if NOT locked to a specific table) */}
        {!isLocked && (
          <div className="p-4 bg-white/60 border-b border-gray-200 flex items-center gap-2 overflow-x-auto py-2.5">
            <span className="text-xs font-bold text-gray-600 flex-shrink-0">Select Table:</span>
            {tables.map(tbl => (
              <button
                key={tbl.id}
                onClick={() => setSelectedTable(tbl.number)}
                className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition flex-shrink-0 ${
                  activeTableNum === tbl.number
                    ? 'bg-amber-500 text-white shadow-sm'
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                }`}
              >
                T{tbl.number < 10 ? '0' + tbl.number : tbl.number}
              </button>
            ))}
          </div>
        )}

        {/* Standee Mode Switcher */}
        <div className="px-4 py-2 bg-amber-50 border-b border-amber-200 flex items-center justify-center gap-1.5 text-xs">
          <button
            onClick={() => setCardMode('order')}
            className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition ${
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
            className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition ${
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
            className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition ${
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
        <div className="p-6 flex flex-col items-center justify-center bg-[#FDFCF0] max-h-[65vh] overflow-y-auto">
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
                <span>Table {tableNumStr}</span>
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

              {/* QR Code Container */}
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 shadow-inner my-1 relative group">
                <QRCodeSVG
                  value={wifiPayload}
                  size={160}
                  level="M"
                  includeMargin={false}
                  fgColor="#171717"
                />
                <div className="absolute top-1 left-1 w-2.5 h-2.5 border-t-2 border-l-2 border-amber-500" />
                <div className="absolute top-1 right-1 w-2.5 h-2.5 border-t-2 border-r-2 border-amber-500" />
                <div className="absolute bottom-1 left-1 w-2.5 h-2.5 border-b-2 border-l-2 border-amber-500" />
                <div className="absolute bottom-1 right-1 w-2.5 h-2.5 border-b-2 border-r-2 border-amber-500" />
              </div>

              {/* Table Number Pill */}
              <div className="mt-3 px-4 py-1 rounded-full bg-[#1F2937] text-amber-400 font-mono font-black text-sm tracking-wider uppercase shadow flex items-center gap-1.5">
                <span>Table {tableNumStr} Access</span>
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
        <div className="p-4 bg-white border-t border-gray-200 flex items-center justify-between gap-2">
          {!isLocked ? (
            <button
              onClick={() => {
                setCurrentGuestTableNumber(activeTableNum);
                setActiveInterface('guest');
                onClose();
              }}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-sm transition"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Open This Table's Menu</span>
            </button>
          ) : (
            <button
              onClick={onClose}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold text-xs transition"
            >
              <span>Back to Menu</span>
            </button>
          )}

          <button
            onClick={handleCopy}
            className="flex items-center gap-1 px-3 py-2.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-semibold border border-amber-200 transition"
            title="Copy QR Link"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-amber-700" />}
            <span>{copied ? 'Copied' : 'Copy Link'}</span>
          </button>

          <button
            onClick={handlePrint}
            className="px-3 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold border border-gray-200 transition"
            title="Print Standee"
          >
            <Printer className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
