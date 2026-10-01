import React, { useState, useMemo } from 'react';
import { usePOS } from '../../context/POSContext';
import { QRCodeSVG } from 'qrcode.react';
import {
  Receipt,
  Printer,
  Share2,
  CheckCircle2,
  ArrowLeft,
  Copy,
  Check,
  Sparkles,
  Wifi,
  Phone,
  MapPin,
  Clock,
  User,
  UtensilsCrossed
} from 'lucide-react';
import { FatBuddhaLogo } from '../common/FatBuddhaLogo';
import {
  openWhatsAppReceipt,
  openSMSReceipt,
  copyReceiptText,
  generateDigitalReceiptUrl
} from '../../utils/receiptShareUtils';

interface GuestDigitalReceiptViewProps {
  orderIdentifier: string;
  onBackToMenu?: () => void;
}

export const GuestDigitalReceiptView: React.FC<GuestDigitalReceiptViewProps> = ({
  orderIdentifier,
  onBackToMenu
}) => {
  const { orders, settings } = usePOS();
  const [copied, setCopied] = useState(false);

  // Find order by orderNumber or ID
  const matchedOrder = useMemo(() => {
    const cleanId = orderIdentifier.trim().toLowerCase();
    return orders.find(o =>
      (o.orderNumber && o.orderNumber.toLowerCase() === cleanId) ||
      (o.id && o.id.toLowerCase() === cleanId) ||
      (o.id && o.id.toLowerCase().includes(cleanId))
    );
  }, [orders, orderIdentifier]);

  const currency = settings.currencySymbol || 'Rs.';

  const handleCopyLink = async () => {
    if (typeof window !== 'undefined') {
      try {
        await navigator.clipboard.writeText(window.location.href);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error('Failed to copy URL:', err);
      }
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (!matchedOrder) {
    return (
      <div className="min-h-screen bg-neutral-900 text-white flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-neutral-800 border border-neutral-700 rounded-3xl p-6 text-center space-y-4 shadow-2xl">
          <FatBuddhaLogo size={64} className="mx-auto" alt="Logo" />
          <h2 className="text-xl font-bold text-amber-400">Digital Receipt Not Found</h2>
          <p className="text-sm text-neutral-400">
            Could not find an active or completed receipt matching invoice #{orderIdentifier}.
          </p>
          <button
            onClick={() => {
              if (onBackToMenu) onBackToMenu();
              else if (typeof window !== 'undefined') window.location.href = '/';
            }}
            className="w-full py-3 px-4 bg-amber-500 hover:bg-amber-600 text-black font-bold text-sm rounded-xl transition flex items-center justify-center gap-2 cursor-pointer shadow-md"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Go to Restaurant Menu</span>
          </button>
        </div>
      </div>
    );
  }

  const subtotal = matchedOrder.subtotal ?? matchedOrder.total ?? 0;
  const discount = matchedOrder.discountAmount ?? matchedOrder.discount ?? 0;
  const discountedSubtotal = Math.max(0, subtotal - discount);
  const serviceCharge = matchedOrder.serviceCharge ?? 0;
  const vat = matchedOrder.vat ?? matchedOrder.taxAmount ?? 0;
  const grandTotal = matchedOrder.finalAmount ?? (discountedSubtotal + serviceCharge + vat);
  const orderNum = matchedOrder.orderNumber || matchedOrder.id;
  const tableNum = matchedOrder.tableNumber < 10 ? `0${matchedOrder.tableNumber}` : `${matchedOrder.tableNumber}`;
  const receiptUrl = generateDigitalReceiptUrl(matchedOrder);

  const orderDate = new Date(matchedOrder.createdAt || Date.now()).toLocaleDateString([], {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
  const orderTime = new Date(matchedOrder.createdAt || Date.now()).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit'
  });

  return (
    <div className="min-h-screen bg-[#0F172A] text-slate-100 flex flex-col items-center justify-start p-3 sm:p-6 print:p-0 print:bg-white print:text-black">
      {/* Top Bar for Mobile & Screen View (hidden on print) */}
      <div className="w-full max-w-md flex items-center justify-between py-3 mb-2 print:hidden">
        <button
          onClick={() => {
            if (onBackToMenu) onBackToMenu();
            else if (typeof window !== 'undefined') window.location.href = `/?table=${matchedOrder.tableNumber}`;
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition border border-slate-700"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Table {tableNum} Menu</span>
        </button>

        <div className="flex items-center gap-1.5">
          <button
            onClick={handleCopyLink}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition border border-slate-700"
            title="Copy digital receipt link"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs shadow-md transition"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print</span>
          </button>
        </div>
      </div>

      {/* Main Digital Receipt Card */}
      <div className="w-full max-w-md bg-white text-gray-900 rounded-3xl shadow-2xl overflow-hidden border border-slate-700/50 print:border-none print:shadow-none print:max-w-full">
        {/* Receipt Header Banner */}
        <div className="bg-gradient-to-br from-amber-500 via-amber-600 to-amber-700 p-6 text-white text-center relative overflow-hidden">
          <div className="absolute -top-12 -right-12 w-32 h-32 bg-white/10 rounded-full blur-xl pointer-events-none" />
          <div className="relative z-10 space-y-2">
            <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-md p-1.5 mx-auto border border-white/20 shadow-md">
              <FatBuddhaLogo size={52} className="mx-auto" alt="Logo" />
            </div>
            <h1 className="text-xl font-black tracking-tight uppercase">
              {settings.restaurantName || 'The Fat Buddha Delight'}
            </h1>
            <p className="text-xs text-amber-100 font-medium">
              {settings.address || 'Delight Cafe & Dining, Nepal'}
            </p>
            {settings.panNumber && (
              <span className="inline-block text-[10px] font-mono px-2 py-0.5 rounded bg-black/20 text-amber-100 border border-white/20">
                PAN / VAT: {settings.panNumber}
              </span>
            )}
          </div>
        </div>

        {/* Verified Paid Status Badge */}
        <div className="bg-emerald-50 border-y border-emerald-200 py-3 px-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-emerald-500 text-white flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-black text-emerald-800 uppercase tracking-wider block">
                Official E-Receipt Verified
              </span>
              <span className="text-[10px] text-emerald-600 font-medium">
                Payment Received & Closed
              </span>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-full text-xs font-black bg-emerald-600 text-white font-mono shadow-xs">
            {currency} {grandTotal.toLocaleString()}.00
          </span>
        </div>

        {/* Meta Details Grid */}
        <div className="p-5 border-b border-gray-100 bg-gray-50/50 grid grid-cols-2 gap-3 text-xs">
          <div>
            <span className="text-[10px] uppercase font-bold text-gray-400 block tracking-wider">
              Bill / Invoice #
            </span>
            <span className="font-mono font-bold text-gray-900">{orderNum}</span>
          </div>
          <div className="text-right">
            <span className="text-[10px] uppercase font-bold text-gray-400 block tracking-wider">
              Table #
            </span>
            <span className="font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-md inline-block font-mono">
              Table {tableNum}
            </span>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-gray-400 block tracking-wider">
              Date & Time
            </span>
            <span className="text-gray-700 font-medium">{orderDate}, {orderTime}</span>
          </div>
          <div className="text-right">
            <span className="text-[10px] uppercase font-bold text-gray-400 block tracking-wider">
              Payment Method
            </span>
            <span className="font-bold uppercase text-gray-900">
              {(matchedOrder.paymentMethod || 'Cash').replace('_', ' ')}
            </span>
          </div>
          {matchedOrder.cashierName && (
            <div className="col-span-2 pt-1 border-t border-gray-200/60 flex items-center justify-between text-[11px] text-gray-500">
              <span>Served / Billed By:</span>
              <span className="font-bold text-gray-800">{matchedOrder.cashierName}</span>
            </div>
          )}
        </div>

        {/* Itemized Order List */}
        <div className="p-5 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-gray-200 text-[11px] font-bold uppercase tracking-wider text-gray-400">
            <span>Item & Quantity</span>
            <span>Price</span>
          </div>

          <div className="divide-y divide-gray-100 text-xs">
            {matchedOrder.items.map((item, idx) => {
              const qty = item.quantity || 1;
              const unitPrice = item.price ?? item.priceSnapshot ?? 0;
              const lineTotal = unitPrice * qty;

              return (
                <div key={item.id || idx} className="py-2.5 flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-bold text-gray-900 font-mono">{qty}x</span>
                      <span className="font-medium text-gray-800">{item.name || item.nameSnapshot || 'Dish Item'}</span>
                      {item.variantName && (
                        <span className="px-1.5 py-0.2 rounded text-[10px] font-extrabold bg-amber-100 text-amber-900 border border-amber-200">
                          {item.variantName}
                        </span>
                      )}
                    </div>
                    {qty > 1 && (
                      <span className="text-[10px] text-gray-400 font-mono block mt-0.5">
                        @ {currency} {unitPrice.toLocaleString()} each
                      </span>
                    )}
                  </div>
                  <span className="font-mono font-bold text-gray-900 text-right">
                    {currency} {lineTotal.toLocaleString()}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Totals Summary */}
          <div className="pt-3 border-t-2 border-dashed border-gray-200 space-y-1.5 text-xs text-gray-600">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span className="font-mono text-gray-900 font-semibold">{currency} {subtotal.toLocaleString()}.00</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-rose-600 font-medium">
                <span>Discount:</span>
                <span className="font-mono">-{currency} {discount.toLocaleString()}.00</span>
              </div>
            )}
            {serviceCharge > 0 && (
              <div className="flex justify-between">
                <span>Service Charge:</span>
                <span className="font-mono text-gray-900">{currency} {serviceCharge.toLocaleString()}.00</span>
              </div>
            )}
            {vat > 0 && (
              <div className="flex justify-between">
                <span>VAT (13%):</span>
                <span className="font-mono text-gray-900">{currency} {vat.toLocaleString()}.00</span>
              </div>
            )}
            <div className="pt-2 border-t border-gray-200 flex justify-between items-center text-sm font-black text-gray-900">
              <span className="text-base uppercase tracking-tight">Total Paid:</span>
              <span className="font-mono text-lg text-emerald-700">
                {currency} {grandTotal.toLocaleString()}.00
              </span>
            </div>
          </div>
        </div>

        {/* QR Code & Share Options */}
        <div className="p-5 bg-gray-50 border-t border-gray-100 flex flex-col items-center text-center space-y-4 print:hidden">
          <div className="p-3 bg-white rounded-2xl border border-gray-200 shadow-xs flex flex-col items-center">
            <QRCodeSVG value={receiptUrl} size={110} level="M" />
            <span className="text-[10px] text-gray-400 mt-2 font-mono uppercase tracking-wider">
              Scan to Save E-Receipt
            </span>
          </div>

          {/* Quick Sharing Action Chips */}
          <div className="w-full grid grid-cols-2 gap-2 text-xs">
            <button
              type="button"
              onClick={() => openWhatsAppReceipt(matchedOrder, settings)}
              className="py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-xs transition cursor-pointer"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Share WhatsApp</span>
            </button>
            <button
              type="button"
              onClick={() => openSMSReceipt(matchedOrder, settings)}
              className="py-2.5 px-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-xs transition cursor-pointer"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Share SMS</span>
            </button>
          </div>

          {/* Guest WiFi Info */}
          {settings.wifiSsid && (
            <div className="w-full p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-left flex items-center justify-between text-xs text-amber-950">
              <div className="flex items-center gap-2">
                <Wifi className="w-4 h-4 text-amber-600" />
                <div>
                  <span className="font-bold block text-[11px]">Restaurant WiFi</span>
                  <span className="font-mono text-[10px] text-amber-800">{settings.wifiSsid}</span>
                </div>
              </div>
              <span className="font-mono text-[10px] font-bold bg-white px-2 py-0.5 rounded border border-amber-200">
                {settings.wifiPassword || 'Newdelight@123'}
              </span>
            </div>
          )}

          <p className="text-[11px] text-gray-400 font-medium">
            Thank you for dining at The Fat Buddha Delight! 🌿
          </p>
        </div>
      </div>
    </div>
  );
};
