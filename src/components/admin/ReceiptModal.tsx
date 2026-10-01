import React, { useState } from 'react';
import { Order, RestaurantSettings } from '../../types';
import { usePOS } from '../../context/POSContext';
import { DEFAULT_SETTINGS } from '../../services/firebaseService';
import {
  X,
  Printer,
  Receipt,
  MessageCircle,
  Smartphone,
  Phone,
  QrCode,
  Copy,
  Check,
  ChefHat,
  Send
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { ThermalReceiptDocument } from '../common/ThermalReceiptDocument';
import { ThermalKOTDocument } from '../common/ThermalKOTDocument';
import { ThermalPrintPortal } from '../common/ThermalPrintPortal';
import { triggerThermalPrint } from '../../utils/printUtils';
import {
  openWhatsAppReceipt,
  openSMSReceipt,
  copyReceiptText,
  generateDigitalReceiptUrl
} from '../../utils/receiptShareUtils';

interface ReceiptModalProps {
  order: Order | null;
  settings?: RestaurantSettings;
  isOpen: boolean;
  onClose: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  order,
  settings: propSettings,
  isOpen,
  onClose
}) => {
  const { settings: contextSettings, updateOrderStatus } = usePOS();
  const settings = propSettings || contextSettings || DEFAULT_SETTINGS;
  const [paperWidth, setPaperWidth] = useState<'80mm' | '58mm'>('80mm');
  const [activePrintDoc, setActivePrintDoc] = useState<'receipt' | 'kot'>('receipt');
  const [recipientPhone, setRecipientPhone] = useState(order?.guestPhone || '');
  const [copied, setCopied] = useState(false);
  const [showQrScan, setShowQrScan] = useState(false);

  // Sync recipient phone when order changes
  React.useEffect(() => {
    if (order?.guestPhone) {
      setRecipientPhone(order.guestPhone);
    }
  }, [order?.guestPhone, order?.id]);

  if (!isOpen || !order) return null;

  const handlePrint = async () => {
    setActivePrintDoc('receipt');
    if (order && (order.status === 'placed' || (order.status as string) === 'pending')) {
      await updateOrderStatus(order.id, 'preparing');
    }
    setTimeout(() => {
      triggerThermalPrint(paperWidth);
    }, 50);
  };

  const handlePrintKOT = () => {
    setActivePrintDoc('kot');
    setTimeout(() => {
      triggerThermalPrint(paperWidth);
    }, 50);
  };

  const handleWhatsAppSend = () => {
    openWhatsAppReceipt(order, settings, recipientPhone);
  };

  const handleSMSSend = () => {
    openSMSReceipt(order, settings, recipientPhone);
  };

  const handleCopy = async () => {
    const ok = await copyReceiptText(order, settings);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const digitalReceiptUrl = generateDigitalReceiptUrl(order);

  return (
    <>
      {/* Root portal for thermal printing directly under <body> */}
      <ThermalPrintPortal active={isOpen}>
        {activePrintDoc === 'kot' ? (
          <ThermalKOTDocument
            ticket={{
              kotNumber: `KOT-${order.orderNumber || order.id}`,
              tableNumber: order.tableNumber,
              orderNumber: order.orderNumber,
              waiterName: order.waiterName || order.cashierName,
              station: 'kitchen',
              createdAt: order.createdAt,
              items: order.items
            }}
            settings={settings}
            linkedOrder={order}
            paperWidth={paperWidth}
            id="printable-kot"
          />
        ) : (
          <ThermalReceiptDocument
            order={order}
            settings={settings}
            paperWidth={paperWidth}
            id="printable-receipt"
          />
        )}
      </ThermalPrintPortal>

      {/* Screen Interactive Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="bg-white border border-gray-200 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
          {/* Modal Top Bar */}
          <div className="p-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-2">
              <Printer className="w-4 h-4 text-amber-500" />
              <div>
                <span className="text-sm font-bold text-gray-900 uppercase tracking-wider block">
                  Thermal Bill & Digital Receipt
                </span>
                <span className="text-[11px] text-gray-500">
                  Order #{order.orderNumber || order.id} • Table {order.tableNumber < 10 ? '0' + order.tableNumber : order.tableNumber}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Paper Width Selector (80mm standard vs 58mm compact) */}
              <div className="flex bg-gray-200 p-0.5 rounded-lg text-[10px] font-bold">
                <button
                  type="button"
                  onClick={() => setPaperWidth('80mm')}
                  className={`px-2.5 py-1 rounded-md transition ${paperWidth === '80mm' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-600 hover:text-gray-900'}`}
                >
                  80mm
                </button>
                <button
                  type="button"
                  onClick={() => setPaperWidth('58mm')}
                  className={`px-2.5 py-1 rounded-md transition ${paperWidth === '58mm' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-600 hover:text-gray-900'}`}
                >
                  58mm
                </button>
              </div>

              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition"
                title="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Paperless Digital Sharing Strip (WhatsApp & SMS) */}
          <div className="bg-emerald-50/80 border-b border-emerald-200 px-4 py-3 space-y-2 flex-shrink-0">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-900 flex items-center gap-1.5">
                <Send className="w-3.5 h-3.5 text-emerald-600" />
                <span>Send Paperless E-Receipt</span>
              </span>
              <button
                type="button"
                onClick={() => setShowQrScan(!showQrScan)}
                className="text-[10px] font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 cursor-pointer"
              >
                <QrCode className="w-3 h-3" />
                <span>{showQrScan ? 'Hide QR' : 'Scan QR'}</span>
              </button>
            </div>

            <div className="flex items-center gap-1.5">
              <div className="relative flex-1">
                <Phone className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="tel"
                  value={recipientPhone}
                  onChange={e => setRecipientPhone(e.target.value)}
                  placeholder="Guest Mobile (e.g. 9841234567)"
                  className="w-full pl-8 pr-2.5 py-1.5 text-xs font-mono font-bold bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-emerald-500 text-gray-900"
                />
              </div>
              <button
                type="button"
                onClick={handleWhatsAppSend}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg shadow-xs transition flex items-center gap-1 cursor-pointer"
                title="Send via WhatsApp"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span>WhatsApp</span>
              </button>
              <button
                type="button"
                onClick={handleSMSSend}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg shadow-xs transition flex items-center gap-1 cursor-pointer"
                title="Send via SMS"
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>SMS</span>
              </button>
              <button
                type="button"
                onClick={handleCopy}
                className="p-1.5 bg-white hover:bg-gray-100 text-gray-700 border border-gray-300 rounded-lg transition"
                title="Copy receipt text and link"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>

            {showQrScan && (
              <div className="p-3 bg-white border border-emerald-200 rounded-xl flex flex-col items-center text-center space-y-1 animate-in fade-in">
                <QRCodeSVG value={digitalReceiptUrl} size={100} level="M" />
                <span className="text-[10px] text-gray-500 font-mono">
                  Customer can scan to open digital bill on phone
                </span>
              </div>
            )}
          </div>

          {/* Receipt Scrollable Preview Container */}
          <div className="p-4 sm:p-5 overflow-y-auto bg-neutral-100 flex justify-center flex-1">
            <div className="p-4 sm:p-5 bg-white rounded-xl shadow-md border border-gray-300">
              <ThermalReceiptDocument
                order={order}
                settings={settings}
                paperWidth={paperWidth}
                id="receipt-screen-preview"
              />
            </div>
          </div>

          {/* Modal Footer Controls */}
          <div className="p-3.5 bg-gray-50 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-2.5 flex-shrink-0">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                onClick={onClose}
                className="flex-1 sm:flex-initial px-4 py-2 bg-white border border-gray-300 hover:bg-gray-100 text-gray-700 text-xs font-semibold rounded-xl shadow-2xs"
              >
                Close
              </button>
              <button
                type="button"
                onClick={handlePrintKOT}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-black text-amber-300 font-bold text-xs shadow-xs transition border border-slate-800"
                title="Print Kitchen Ticket (KOT Slip) on Thermal Printer"
              >
                <ChefHat className="w-4 h-4 text-amber-400" />
                <span>Print KOT Slip</span>
              </button>
            </div>

            <button
              id="btn-print-receipt-action"
              onClick={handlePrint}
              className="w-full sm:flex-1 flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-xs transition transform active:scale-98"
            >
              <Printer className="w-4 h-4" />
              <span>Print Bill ({paperWidth})</span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
};
