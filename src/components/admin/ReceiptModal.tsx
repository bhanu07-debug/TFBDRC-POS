import React from 'react';
import { Order, RestaurantSettings } from '../../types';
import { usePOS } from '../../context/POSContext';
import { DEFAULT_SETTINGS } from '../../services/firebaseService';
import { X, Printer, Download, Sparkles, Check } from 'lucide-react';
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

  if (!isOpen || !order) return null;

  const handlePrint = () => {
    window.print();
  };

  const originUrl = typeof window !== 'undefined' ? window.location.origin : 'https://fatbuddha.cafe';
  const feedbackUrl = `${originUrl}/feedback?order=${order.orderNumber}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white border border-gray-200 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Modal Top Bar */}
        <div className="p-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2">
            <Printer className="w-4 h-4 text-amber-500" />
            <span className="text-sm font-bold text-gray-900 uppercase tracking-wider">
              Thermal Receipt Preview
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 80mm ESC/POS Receipt Content */}
        <div className="p-6 overflow-y-auto bg-gray-100 flex justify-center">
          <div
            id="printable-receipt"
            className="w-full max-w-[320px] bg-white text-neutral-900 p-5 rounded-lg shadow-md font-mono text-xs border border-gray-200 print:shadow-none print:border-none print:w-full"
          >
            {/* Restaurant Header */}
            <div className="text-center pb-3 border-b-2 border-dashed border-neutral-400">
              <div className="text-lg font-black tracking-tight uppercase text-gray-900">
                {settings.restaurantName || settings.name}
              </div>
              {settings.tagline && (
                <div className="text-[10px] text-neutral-600 font-sans mt-0.5 leading-tight">
                  {settings.tagline}
                </div>
              )}
              <div className="text-[9px] text-neutral-600 mt-1">
                {settings.address}
              </div>
              <div className="text-[9px] text-neutral-700 mt-0.5">
                Tel: {settings.phone}
              </div>
              {settings.email && (
                <div className="text-[9px] text-neutral-600">
                  Email: {settings.email}
                </div>
              )}
              <div className="text-[10px] text-neutral-800 font-bold mt-1 tracking-wider">
                PAN No.: {settings.panNumber || settings.panNo || '302194821'}
              </div>
            </div>

            {/* Bill Details */}
            <div className="py-2 border-b border-dashed border-neutral-400 text-[10px] space-y-0.5">
              <div className="flex justify-between">
                <span>INVOICE: <strong>{order.orderNumber || order.id}</strong></span>
                <span>TABLE: <strong>{order.tableNumber < 10 ? '0' + order.tableNumber : order.tableNumber}</strong></span>
              </div>
              <div className="flex justify-between">
                <span>DATE: {new Date().toLocaleDateString()}</span>
                <span>TIME: {order.createdAt ? new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              <div className="flex justify-between">
                <span>TYPE: {(order.orderType || 'DINE_IN').toUpperCase()}</span>
                <span>SOURCE: {(order.source || 'POS').toUpperCase()}</span>
              </div>
              {order.guestName && (
                <div className="flex justify-between">
                  <span>GUEST: {order.guestName}</span>
                  <span>CAPTAIN: {order.waiterName || 'Staff'}</span>
                </div>
              )}
            </div>

            {/* Items Table */}
            <div className="py-3 border-b-2 border-dashed border-neutral-400">
              <div className="flex justify-between text-[10px] font-bold pb-1 border-b border-neutral-300">
                <span className="w-1/2">ITEM</span>
                <span className="w-1/6 text-center">QTY</span>
                <span className="w-1/6 text-right">RATE</span>
                <span className="w-1/6 text-right">AMT</span>
              </div>
              <div className="space-y-1.5 pt-1.5">
                {order.items.map(item => (
                  <div key={item.id}>
                    <div className="flex justify-between text-[10px]">
                      <span className="w-1/2 font-semibold truncate">{item.name || item.nameSnapshot}</span>
                      <span className="w-1/6 text-center font-bold">{item.quantity}</span>
                      <span className="w-1/6 text-right">{settings.currencySymbol || 'Rs.'} {item.price || item.priceSnapshot || 0}</span>
                      <span className="w-1/6 text-right font-bold">{settings.currencySymbol || 'Rs.'} {(item.price || item.priceSnapshot || 0) * item.quantity}</span>
                    </div>
                    {item.variantName && (
                      <div className="text-[8px] text-neutral-500 pl-2">
                        * {item.variantName}
                      </div>
                    )}
                    {item.addOns && item.addOns.length > 0 && (
                      <div className="text-[8px] text-neutral-500 pl-2">
                        + {item.addOns.join(', ')}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Totals */}
            <div className="py-2.5 border-b-2 border-dashed border-neutral-400 space-y-1 text-[11px]">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>{settings.currencySymbol || 'Rs.'} {(order.subtotal ?? order.total ?? 0).toFixed(2)}</span>
              </div>
              {((order.discountAmount ?? order.discount ?? 0) > 0) && (
                <div className="flex justify-between text-neutral-700 font-semibold">
                  <span>Discount ({order.discountReason || 'Special'}):</span>
                  <span>-{settings.currencySymbol || 'Rs.'} {(order.discountAmount ?? order.discount ?? 0).toFixed(2)}</span>
                </div>
              )}
              {(settings.serviceChargeEnabled || (order.serviceCharge || 0) > 0) && (
                <div className="flex justify-between text-[10px] text-neutral-600">
                  <span>Service Charge ({settings.serviceChargePercent || 10}%):</span>
                  <span>{settings.currencySymbol || 'Rs.'} {(order.serviceCharge || Math.round(((order.subtotal ?? order.total ?? 0) - (order.discount ?? 0)) * (settings.serviceChargePercent || 10) / 100)).toFixed(2)}</span>
                </div>
              )}
              {settings.vatEnabled && (
                <div className="flex justify-between text-[10px] text-neutral-600 font-semibold">
                  <span>VAT ({settings.vatRate || 13}%):</span>
                  <span>{settings.currencySymbol || 'Rs.'} {(order.vat ?? order.taxAmount ?? Math.round(((order.subtotal ?? order.total ?? 0) - (order.discount ?? 0) + (order.serviceCharge ?? 0)) * (settings.vatRate || 13) / 100)).toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-black pt-1 border-t border-neutral-300">
                <span>GRAND TOTAL:</span>
                <span>{settings.currencySymbol || 'Rs.'} {(order.finalAmount ?? order.total ?? 0).toFixed(2)}</span>
              </div>
            </div>

            {/* Payment Mode */}
            <div className="py-2 text-[10px] text-center border-b border-dashed border-neutral-400">
              <span>PAYMENT STATUS: </span>
              <strong className="uppercase">{order.paymentStatus}</strong>
              {order.paymentMethod && (
                <span> ({order.paymentMethod.toUpperCase()})</span>
              )}
            </div>

            {/* Footer QR & Thank You */}
            <div className="pt-3 text-center flex flex-col items-center space-y-1">
              <div className="p-1 bg-white border border-neutral-300 rounded">
                <QRCodeSVG value={feedbackUrl} size={64} level="M" />
              </div>
              <div className="text-[9px] font-bold">Scan to Rate Your Experience</div>
              <div className="text-[10px] font-bold pt-1">
                *** THANK YOU FOR VISITING ***
              </div>
              <div className="text-[8px] text-neutral-500">
                May Buddha Bless Your Day!
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer Controls */}
        <div className="p-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between gap-3 flex-shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl bg-white border border-gray-200 hover:bg-gray-100 text-gray-700 text-xs font-semibold shadow-sm"
          >
            Close
          </button>
          <button
            id="btn-print-receipt-action"
            onClick={handlePrint}
            className="flex-1 flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-sm transition"
          >
            <Printer className="w-4 h-4" />
            <span>Print Thermal Receipt (80mm)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
