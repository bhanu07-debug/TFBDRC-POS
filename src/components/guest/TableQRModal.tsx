import React, { useState } from 'react';
import { usePOS } from '../../context/POSContext';
import { QRCodeSVG } from 'qrcode.react';
import { X, QrCode, Download, Printer, Check, Copy, Sparkles, ExternalLink } from 'lucide-react';

interface TableQRModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTableNum?: number;
}

export const TableQRModal: React.FC<TableQRModalProps> = ({
  isOpen,
  onClose,
  initialTableNum
}) => {
  const {
    tables,
    settings,
    currentGuestTableNumber,
    setCurrentGuestTableNumber,
    setActiveInterface
  } = usePOS();

  const [selectedTable, setSelectedTable] = useState(initialTableNum || currentGuestTableNumber);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const originUrl = typeof window !== 'undefined' ? window.location.origin : 'https://fatbuddha.cafe';
  const tableUrl = `${originUrl}?table=${selectedTable}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(tableUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

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
                Table QR Standee
              </h3>
              <p className="text-[11px] text-gray-500">
                Contactless Guest Ordering QR
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

        {/* Table Selector */}
        <div className="p-4 bg-white/60 border-b border-gray-200 flex items-center gap-2 overflow-x-auto py-2.5">
          <span className="text-xs font-bold text-gray-600 flex-shrink-0">Select Table:</span>
          {tables.map(tbl => (
            <button
              key={tbl.id}
              onClick={() => setSelectedTable(tbl.number)}
              className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition flex-shrink-0 ${
                selectedTable === tbl.number
                  ? 'bg-amber-500 text-white shadow-sm'
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
              }`}
            >
              T{tbl.number < 10 ? '0' + tbl.number : tbl.number}
            </button>
          ))}
        </div>

        {/* Printable Standee Card */}
        <div className="p-6 flex flex-col items-center justify-center bg-[#FDFCF0]">
          <div className="w-full max-w-[280px] p-6 bg-white rounded-2xl shadow-xl border-4 border-amber-500 text-center flex flex-col items-center relative print:border-black">
            {/* Top Brand Logo */}
            <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center text-white font-bold text-lg mb-1 shadow-md">
              佛
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
            <div className="mt-3 px-4 py-1 rounded-full bg-[#1F2937] text-amber-400 font-mono font-black text-sm tracking-wider uppercase shadow">
              Table {selectedTable < 10 ? '0' + selectedTable : selectedTable}
            </div>

            <p className="text-[10px] font-bold text-gray-800 mt-2">
              Scan to View Menu & Place Order
            </p>
            <p className="text-[8px] text-gray-500">
              No App Required • Live Kitchen Status
            </p>
            <div className="mt-2 text-[8px] text-gray-400 border-t border-gray-100 pt-1 w-full">
              Free Guest Wi-Fi: <span className="font-semibold text-gray-700">{settings.wifiSsid}</span>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="p-4 bg-white border-t border-gray-200 flex items-center justify-between gap-2">
          <button
            onClick={() => {
              setCurrentGuestTableNumber(selectedTable);
              setActiveInterface('guest');
              onClose();
            }}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-sm transition"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Open This Table's Menu</span>
          </button>

          <button
            onClick={handleCopy}
            className="px-3 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold border border-gray-200 transition"
            title="Copy QR Link"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
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
