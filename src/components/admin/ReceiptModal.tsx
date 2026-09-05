import React, { useState } from 'react';
import { Order, RestaurantSettings } from '../../types';
import { usePOS } from '../../context/POSContext';
import { DEFAULT_SETTINGS } from '../../services/firebaseService';
import { X, Printer, Check, Smartphone, Utensils, Receipt } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

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
  const { settings: contextSettings } = usePOS();
  const settings = propSettings || contextSettings || DEFAULT_SETTINGS;
  const [paperWidth, setPaperWidth] = useState<'80mm' | '58mm'>('80mm');

  if (!isOpen || !order) return null;

  const handlePrint = () => {
    window.print();
  };

  const originUrl = typeof window !== 'undefined' ? window.location.origin : 'https://fatbuddha.cafe';
  const feedbackUrl = `${originUrl}/feedback?order=${order.orderNumber || order.id}`;

  const subtotal = order.subtotal ?? order.total ?? 0;
  const discount = order.discountAmount ?? order.discount ?? 0;
  const discountedSubtotal = Math.max(0, subtotal - discount);
  const serviceCharge = order.serviceCharge ?? (settings.serviceChargeEnabled ? Math.round(discountedSubtotal * (settings.serviceChargePercent || 10) / 100) : 0);
  const vat = order.vat ?? order.taxAmount ?? (settings.vatEnabled ? Math.round((discountedSubtotal + serviceCharge) * (settings.vatRate || 13) / 100) : 0);
  const grandTotal = order.finalAmount ?? (discountedSubtotal + serviceCharge + vat);

  const isPaid = (order.paymentStatus || '').toLowerCase() === 'paid';
  const currency = settings.currencySymbol || 'Rs.';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white border border-gray-200 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Modal Top Bar */}
        <div className="p-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2">
            <Printer className="w-4 h-4 text-amber-500" />
            <div>
              <span className="text-sm font-bold text-gray-900 uppercase tracking-wider block">
                Thermal Bill / Receipt Preview
              </span>
              <span className="text-[11px] text-gray-500">
                Order #{order.orderNumber || order.id} • Table {order.tableNumber < 10 ? '0' + order.tableNumber : order.tableNumber}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Paper Width Selector */}
            <div className="flex bg-gray-200 p-0.5 rounded-lg text-[10px] font-bold">
              <button
                type="button"
                onClick={() => setPaperWidth('80mm')}
                className={`px-2 py-1 rounded-md transition ${paperWidth === '80mm' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-600 hover:text-gray-900'}`}
              >
                80mm
              </button>
              <button
                type="button"
                onClick={() => setPaperWidth('58mm')}
                className={`px-2 py-1 rounded-md transition ${paperWidth === '58mm' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-600 hover:text-gray-900'}`}
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

        {/* Receipt Scrollable Container */}
        <div className="p-4 sm:p-6 overflow-y-auto bg-neutral-100 flex justify-center flex-1">
          <div
            id="printable-receipt"
            className={`w-full ${paperWidth === '58mm' ? 'max-w-[260px] text-[10px]' : 'max-w-[340px] text-[11px]'} bg-white text-black p-4 sm:p-5 rounded-lg shadow-md font-mono border border-gray-300 leading-relaxed`}
          >
            {/* Restaurant Header */}
            <div className="text-center pb-3 border-b-2 border-dashed border-neutral-600">
              <div className="text-base sm:text-lg font-black tracking-tight uppercase text-black">
                {settings.restaurantName || settings.name || 'The Fat Buddha Delight Restro & Cafe'}
              </div>
              {settings.tagline && (
                <div className="text-[10px] text-neutral-700 font-sans mt-0.5 leading-tight font-medium">
                  {settings.tagline}
                </div>
              )}
              <div className="text-[10px] text-neutral-800 mt-1 leading-snug break-words">
                {settings.address || 'Kathmandu, Nepal'}
              </div>
              <div className="text-[10px] text-neutral-900 mt-0.5 font-medium">
                Tel: {settings.phone || '+977-9800000000'}
              </div>
              {settings.email && (
                <div className="text-[9px] text-neutral-700 break-words">
                  Email: {settings.email}
                </div>
              )}
              <div className="text-[10px] text-neutral-900 font-bold mt-1 tracking-wider uppercase">
                PAN No.: {settings.panNumber || settings.panNo || '302194821'}
              </div>
            </div>

            {/* Bill / Invoice Metadata */}
            <div className="py-2.5 border-b border-dashed border-neutral-500 text-[10px] space-y-1">
              <div className="flex justify-between items-center">
                <span>INVOICE: <strong className="text-black font-bold">{order.orderNumber || order.id}</strong></span>
                <span>TABLE: <strong className="text-black font-bold font-mono">T{order.tableNumber < 10 ? '0' + order.tableNumber : order.tableNumber}</strong></span>
              </div>
              <div className="flex justify-between items-center">
                <span>DATE: {new Date(order.createdAt || Date.now()).toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                <span>TIME: {new Date(order.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              <div className="flex justify-between items-center">
                <span>TYPE: <strong className="uppercase">{(order.orderType || 'DINE_IN').replace('_', ' ')}</strong></span>
                <span>SRC: <strong className="uppercase">{(order.source || 'POS').replace('_', ' ')}</strong></span>
              </div>
              {order.guestName && (
                <div className="flex justify-between items-center pt-0.5">
                  <span className="truncate max-w-[150px]">GUEST: {order.guestName}</span>
                  {order.guestPhone && <span>TEL: {order.guestPhone}</span>}
                </div>
              )}
              <div className="flex justify-between items-center text-[9px] text-neutral-700">
                <span>CAPTAIN: {order.waiterName || 'Staff (Captain)'}</span>
                {order.kotNumber && <span>KOT: {order.kotNumber}</span>}
              </div>
            </div>

            {/* Itemized Order Table */}
            <div className="py-3 border-b-2 border-dashed border-neutral-600">
              <div className="flex justify-between text-[10px] font-black pb-1.5 border-b border-black uppercase tracking-wider">
                <span className="flex-1 pr-1">ITEM</span>
                <span className="w-8 text-center">QTY</span>
                <span className="w-14 text-right">RATE</span>
                <span className="w-16 text-right">AMT</span>
              </div>
              <div className="space-y-2 pt-2">
                {order.items.map((item, idx) => {
                  const qty = item.quantity || 1;
                  const unitPrice = item.price ?? item.priceSnapshot ?? 0;
                  const itemTotal = unitPrice * qty;
                  const itemName = item.name || item.nameSnapshot || 'Menu Item';

                  return (
                    <div key={item.id || idx} className="space-y-0.5 avoid-break">
                      <div className="flex justify-between items-start text-[10.5px]">
                        <span className="flex-1 font-bold text-black pr-1 leading-snug break-words">
                          {itemName}
                        </span>
                        <span className="w-8 text-center font-bold">{qty}</span>
                        <span className="w-14 text-right text-neutral-800">{unitPrice}</span>
                        <span className="w-16 text-right font-bold text-black">{itemTotal}</span>
                      </div>

                      {/* Variant Size */}
                      {item.variantName && (
                        <div className="text-[9px] text-neutral-700 pl-2">
                          * Variant: {item.variantName}
                        </div>
                      )}

                      {/* Add-ons */}
                      {item.addOns && item.addOns.length > 0 && (
                        <div className="text-[9px] text-neutral-700 pl-2">
                          + Add-ons: {item.addOns.join(', ')}
                        </div>
                      )}

                      {/* Instructions */}
                      {item.instructions && (
                        <div className="text-[9px] text-neutral-800 font-semibold pl-2 italic">
                          ↳ Note: {item.instructions}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Totals & Tax Calculations */}
            <div className="py-2.5 border-b-2 border-dashed border-neutral-600 space-y-1 text-[11px]">
              <div className="flex justify-between">
                <span>Subtotal ({order.items.reduce((s, i) => s + (i.quantity || 1), 0)} items):</span>
                <span className="font-semibold">{currency} {subtotal.toFixed(2)}</span>
              </div>

              {discount > 0 && (
                <div className="flex justify-between text-neutral-900 font-medium">
                  <span>Discount {order.discountReason ? `(${order.discountReason})` : ''}:</span>
                  <span>-{currency} {discount.toFixed(2)}</span>
                </div>
              )}

              {discount > 0 && (
                <div className="flex justify-between text-[10px] text-neutral-700">
                  <span>Taxable Amount:</span>
                  <span>{currency} {discountedSubtotal.toFixed(2)}</span>
                </div>
              )}

              {(settings.serviceChargeEnabled || serviceCharge > 0) && (
                <div className="flex justify-between text-[10px] text-neutral-800">
                  <span>Service Charge ({settings.serviceChargePercent || 10}%):</span>
                  <span>{currency} {serviceCharge.toFixed(2)}</span>
                </div>
              )}

              {(settings.vatEnabled || vat > 0) && (
                <div className="flex justify-between text-[10px] text-neutral-800">
                  <span>VAT ({settings.vatRate || 13}%):</span>
                  <span>{currency} {vat.toFixed(2)}</span>
                </div>
              )}

              <div className="flex justify-between text-sm font-black pt-1.5 border-t border-black text-black">
                <span>GRAND TOTAL:</span>
                <span className="text-base">{currency} {grandTotal.toFixed(2)}</span>
              </div>
            </div>

            {/* Payment Mode & Status */}
            <div className="py-2 text-[10px] text-center border-b border-dashed border-neutral-500 space-y-0.5">
              <div>
                <span>PAYMENT STATUS: </span>
                <strong className={`uppercase ${isPaid ? 'font-black' : 'font-bold'}`}>
                  {order.paymentStatus || 'UNPAID'}
                </strong>
                {order.paymentMethod && (
                  <span> ({order.paymentMethod.toUpperCase()})</span>
                )}
              </div>
              {order.paidAt && (
                <div className="text-[9px] text-neutral-600">
                  Settled: {new Date(order.paidAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              )}
            </div>

            {/* Footer QR & Feedback */}
            <div className="pt-3 text-center flex flex-col items-center space-y-1.5 avoid-break">
              <div className="p-1.5 bg-white border border-black rounded inline-block">
                <QRCodeSVG value={feedbackUrl} size={64} level="M" />
              </div>
              <div className="text-[9px] font-bold tracking-tight">
                Scan to Rate Your Experience & Digital Bill
              </div>
              <div className="text-[10px] font-black pt-1 uppercase">
                *** THANK YOU FOR VISITING ***
              </div>
              <div className="text-[8px] text-neutral-700">
                Please Come Again! May Buddha Bless Your Day!
              </div>
              <div className="text-[7px] text-neutral-500 pt-0.5">
                The Fat Buddha Cloud POS System
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer Controls */}
        <div className="p-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between gap-3 flex-shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl bg-white border border-gray-200 hover:bg-gray-100 text-gray-700 text-xs font-semibold shadow-xs"
          >
            Close
          </button>
          <button
            id="btn-print-receipt-action"
            onClick={handlePrint}
            className="flex-1 flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-xs transition transform active:scale-98"
          >
            <Printer className="w-4 h-4" />
            <span>Print Bill ({paperWidth})</span>
          </button>
        </div>
      </div>
    </div>
  );
};

