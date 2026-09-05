import React, { useState } from 'react';
import { usePOS } from '../../context/POSContext';
import { Table, PaymentMethod } from '../../types';
import {
  X,
  CreditCard,
  Banknote,
  Smartphone,
  Split,
  Percent,
  CheckCircle2,
  Receipt,
  Sparkles
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface SettleBillModalProps {
  table: Table | null;
  isOpen: boolean;
  onClose: () => void;
  onReceiptOpen?: () => void;
  onSettled?: () => void;
}

export const SettleBillModal: React.FC<SettleBillModalProps> = ({
  table,
  isOpen,
  onClose,
  onReceiptOpen,
  onSettled
}) => {
  const { settleTableBill, getTableOrders, settings } = usePOS();

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [cashierName, setCashierName] = useState('Sunil Verma (Captain)');
  const [notes, setNotes] = useState('');
  const [isSettled, setIsSettled] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen || !table) return null;

  const tableOrders = getTableOrders(table.number);

  const rawSubtotal = tableOrders.reduce((sum, o) => sum + (o.subtotal ?? o.total ?? 0), 0);
  const discountAmount = settings.discountEnabled ? Math.round((rawSubtotal * discountPercent) / 100) : 0;
  const discountedSubtotal = Math.max(0, rawSubtotal - discountAmount);
  const serviceCharge = settings.serviceChargeEnabled
    ? Math.round((discountedSubtotal * (settings.serviceChargePercent || 10)) / 100)
    : 0;
  const vatAmount = settings.vatEnabled
    ? Math.round(((discountedSubtotal + serviceCharge) * (settings.vatRate || 13)) / 100)
    : 0;
  const finalPayable = discountedSubtotal + serviceCharge + vatAmount;

  const handleSettle = async () => {
    setIsProcessing(true);
    try {
      await settleTableBill(table.number, paymentMethod, cashierName, discountAmount, notes || undefined);
      setIsSettled(true);

      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.7 }
      });

      setTimeout(() => {
        setIsSettled(false);
        setIsProcessing(false);
        onSettled?.();
        onClose();
      }, 1200);
    } catch (err) {
      console.error("Settlement error:", err);
      setIsProcessing(false);
    }
  };

  const paymentOptions: { id: PaymentMethod; label: string; icon: React.ReactNode; color: string }[] = [
    { id: 'cash', label: 'Cash', icon: <Banknote className="w-4 h-4" />, color: 'emerald' },
    { id: 'card', label: 'Card POS', icon: <CreditCard className="w-4 h-4" />, color: 'blue' },
    { id: 'qr_wallet', label: 'QR / Wallet', icon: <Smartphone className="w-4 h-4" />, color: 'purple' },
    { id: 'esewa', label: 'eSewa', icon: <Smartphone className="w-4 h-4 text-emerald-500" />, color: 'green' },
    { id: 'khalti', label: 'Khalti', icon: <Smartphone className="w-4 h-4 text-purple-600" />, color: 'purple' },
    { id: 'fonepay', label: 'Fonepay', icon: <Smartphone className="w-4 h-4 text-red-600" />, color: 'red' }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white border border-gray-200 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="p-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Receipt className="w-5 h-5 text-amber-500" />
            <div>
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
                Settle Check & Bill
              </h3>
              <p className="text-[11px] text-gray-500">
                Table {table.number < 10 ? '0' + table.number : table.number} • {table.section}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {isSettled ? (
          <div className="p-8 text-center space-y-3">
            <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h4 className="text-lg font-bold text-gray-900">Payment Settled Successfully!</h4>
            <p className="text-xs text-gray-500">
              {settings.currencySymbol || 'Rs.'} {finalPayable} received via {paymentMethod.toUpperCase()}. Table {table.number} is now cleared.
            </p>
          </div>
        ) : (
          <div className="p-5 space-y-4 overflow-y-auto max-h-[75vh]">
            {/* Orders summary */}
            <div className="bg-gray-50 p-3 rounded-xl border border-gray-200 space-y-2">
              <div className="flex justify-between items-center text-xs font-bold text-gray-800">
                <span>Active Unpaid Orders ({tableOrders.length})</span>
                <span className="font-mono text-amber-600">Session ID: {table.currentSessionId || 'N/A'}</span>
              </div>
              <div className="max-h-28 overflow-y-auto space-y-1 divide-y divide-gray-200 text-[11px]">
                {tableOrders.map(ord => (
                  <div key={ord.id} className="pt-1 flex justify-between text-gray-600">
                    <span>{ord.orderNumber} ({ord.items.length} items)</span>
                    <span className="font-mono text-gray-900 font-bold">{settings.currencySymbol || 'Rs.'} {ord.finalAmount || ord.total}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Discount selector (if enabled) */}
            {settings.discountEnabled && (
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Apply Discount / Promo
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[0, 5, 10, 15].map(disc => (
                    <button
                      key={disc}
                      type="button"
                      onClick={() => setDiscountPercent(disc)}
                      className={`py-2 rounded-xl text-xs font-bold border transition ${
                        discountPercent === disc
                          ? 'bg-amber-500 text-white border-amber-500 shadow-sm'
                          : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {disc === 0 ? 'No Disc' : `${disc}% OFF`}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Payment method selector */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                Select Nepal Payment Mode
              </label>
              <div className="grid grid-cols-3 gap-2">
                {paymentOptions.map(opt => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setPaymentMethod(opt.id)}
                    className={`p-2.5 rounded-xl border flex flex-col items-center gap-1 transition ${
                      paymentMethod === opt.id
                        ? 'bg-amber-500 text-white border-amber-500 shadow-sm'
                        : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {opt.icon}
                    <span className="text-[11px] font-bold">{opt.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Bill summary math */}
            <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200 space-y-1 text-xs">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal</span>
                <span className="font-mono text-gray-900 font-bold">{settings.currencySymbol || 'Rs.'} {rawSubtotal}</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-emerald-600 font-semibold">
                  <span>Discount ({discountPercent}%)</span>
                  <span className="font-mono">-{settings.currencySymbol || 'Rs.'} {discountAmount}</span>
                </div>
              )}
              {settings.serviceChargeEnabled && (
                <div className="flex justify-between text-gray-600">
                  <span>Service Charge ({settings.serviceChargePercent || 10}%)</span>
                  <span className="font-mono text-gray-900">{settings.currencySymbol || 'Rs.'} {serviceCharge}</span>
                </div>
              )}
              {settings.vatEnabled && (
                <div className="flex justify-between text-gray-600 font-semibold">
                  <span>VAT ({settings.vatRate || 13}%)</span>
                  <span className="font-mono text-gray-900">{settings.currencySymbol || 'Rs.'} {vatAmount}</span>
                </div>
              )}
              <div className="pt-2 border-t border-gray-200 flex justify-between font-bold text-sm text-gray-900">
                <span>Grand Total</span>
                <span className="font-mono text-amber-600 font-black text-base">{settings.currencySymbol || 'Rs.'} {finalPayable}</span>
              </div>
            </div>

            {/* Footer action buttons */}
            <div className="flex items-center gap-2 pt-1">
              {onReceiptOpen && tableOrders.length > 0 && (
                <button
                  type="button"
                  onClick={() => onReceiptOpen()}
                  className="px-4 py-3 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold text-xs transition flex items-center justify-center gap-1.5 border border-gray-300"
                  title="Preview & Print Thermal Bill"
                >
                  <Receipt className="w-4 h-4 text-amber-600" />
                  <span>Print Bill</span>
                </button>
              )}
              <button
                id="btn-confirm-settle-bill"
                onClick={handleSettle}
                disabled={tableOrders.length === 0 || isProcessing}
                className="flex-1 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-black text-sm shadow-sm transition transform active:scale-98 disabled:opacity-40 flex items-center justify-center gap-2"
              >
                {isProcessing ? (
                  <span>Processing...</span>
                ) : (
                  <span>Collect & Settle {settings.currencySymbol || 'Rs.'} {finalPayable} ({paymentMethod.toUpperCase()})</span>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
