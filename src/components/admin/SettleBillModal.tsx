import React, { useState } from 'react';
import { usePOS } from '../../context/POSContext';
import { Table, PaymentMethod, Order } from '../../types';
import {
  X,
  CreditCard,
  Banknote,
  Smartphone,
  Split,
  Percent,
  CheckCircle2,
  Receipt,
  Sparkles,
  UserCheck,
  User,
  Check,
  Printer
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { ThermalReceiptDocument } from '../common/ThermalReceiptDocument';
import { ThermalPrintPortal } from '../common/ThermalPrintPortal';
import { triggerThermalPrint } from '../../utils/printUtils';

interface SettleBillModalProps {
  table: Table | null;
  isOpen: boolean;
  onClose: () => void;
  onReceiptOpen?: (order?: Order) => void;
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
  const [cashierName, setCashierName] = useState(() => localStorage.getItem('last_cashier_name') || 'Nischal Thapa');
  const [notes, setNotes] = useState('');
  const [isSettled, setIsSettled] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [settledOrder, setSettledOrder] = useState<Order | null>(null);
  const [settledSummary, setSettledSummary] = useState<{
    orderNumber: string;
    finalPayable: number;
    paymentMethod: string;
    cashierName: string;
    itemCount: number;
  } | null>(null);
  const [isPrintTriggered, setIsPrintTriggered] = useState(false);

  if (!isOpen || !table) return null;

  const isCashierValid = Boolean(cashierName && cashierName.trim().length > 0);
  const tableOrders = getTableOrders(table.number);

  const rawSubtotal = tableOrders.reduce((ordSum, o) => {
    const itemsSum = (o.items || []).reduce((itSum, it) => {
      const unit = it.price ?? it.priceSnapshot ?? 0;
      return itSum + (unit * (it.quantity || 1));
    }, 0);
    return ordSum + (itemsSum > 0 ? itemsSum : (o.subtotal ?? o.total ?? 0));
  }, 0);
  const discountAmount = settings.discountEnabled ? Math.round((rawSubtotal * discountPercent) / 100) : 0;
  const discountedSubtotal = Math.max(0, rawSubtotal - discountAmount);
  const serviceCharge = settings.serviceChargeEnabled
    ? Math.round((discountedSubtotal * (settings.serviceChargePercent || 10)) / 100)
    : 0;
  const vatAmount = settings.vatEnabled
    ? Math.round(((discountedSubtotal + serviceCharge) * (settings.vatRate || 13)) / 100)
    : 0;
  const finalPayable = discountedSubtotal + serviceCharge + vatAmount;

  // Collect all items across active orders for this table
  const allBillItems = tableOrders.flatMap(ord =>
    (ord.items || []).map(it => ({
      ...it,
      orderNumber: ord.orderNumber,
      resolvedPrice: it.price ?? it.priceSnapshot ?? 0,
      itemTotal: (it.price ?? it.priceSnapshot ?? 0) * (it.quantity || 1)
    }))
  );

  const handleClose = () => {
    if (isSettled) {
      onSettled?.();
    }
    setIsSettled(false);
    setIsProcessing(false);
    setSettledOrder(null);
    setSettledSummary(null);
    setIsPrintTriggered(false);
    onClose();
  };

  const handleSettle = async () => {
    if (!cashierName.trim()) {
      return;
    }
    setIsProcessing(true);
    try {
      const cleanCashier = cashierName.trim();
      localStorage.setItem('last_cashier_name', cleanCashier);

      // Snapshot complete bill order details for thermal receipt printing before clearing table
      const allItems = tableOrders.flatMap(o => o.items || []);
      const currentPayable = finalPayable;
      const currentOrderNumber = tableOrders.length === 1 && tableOrders[0].orderNumber
        ? tableOrders[0].orderNumber
        : `INV-T${table.number < 10 ? '0' + table.number : table.number}-${Date.now().toString().slice(-4)}`;

      const consolidatedOrder: Order = {
        id: `BILL-T${table.number}-${Date.now().toString().slice(-4)}`,
        orderNumber: currentOrderNumber,
        sessionId: table.currentSessionId || `SES-${table.number}`,
        tableId: table.id || `T${table.number}`,
        tableNumber: table.number,
        items: allItems,
        subtotal: rawSubtotal,
        discount: discountAmount,
        serviceCharge: serviceCharge,
        vat: vatAmount,
        total: currentPayable,
        finalAmount: currentPayable,
        status: 'completed',
        paymentStatus: 'paid',
        paymentMethod: paymentMethod,
        orderType: 'dine_in',
        source: 'ADMIN_MANUAL',
        cashierName: cleanCashier,
        waiterName: cleanCashier,
        createdBy: cleanCashier,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      setSettledOrder(consolidatedOrder);
      setSettledSummary({
        orderNumber: currentOrderNumber,
        finalPayable: currentPayable,
        paymentMethod: paymentMethod,
        cashierName: cleanCashier,
        itemCount: allItems.length
      });

      await settleTableBill(table.number, paymentMethod, cleanCashier, discountAmount, notes || undefined);
      setIsSettled(true);
      setIsProcessing(false);

      confetti({
        particleCount: 60,
        spread: 70,
        origin: { y: 0.6 }
      });
      // Do NOT auto-close modal or call onSettled here. The cashier will see the success view and choose to Print or Close.
    } catch (err) {
      console.error("Settlement error:", err);
      setIsProcessing(false);
    }
  };

  const handlePrintReceipt = () => {
    if (settledOrder) {
      triggerThermalPrint('80mm');
      setIsPrintTriggered(true);
    } else if (onReceiptOpen) {
      onReceiptOpen();
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
    <>
      {/* Root portal for thermal printing directly under <body> */}
      {isSettled && settledOrder && (
        <ThermalPrintPortal active={true}>
          <ThermalReceiptDocument
            order={settledOrder}
            settings={settings}
            paperWidth="80mm"
            id="printable-receipt"
          />
        </ThermalPrintPortal>
      )}

      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="bg-white border border-gray-200 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col">
          {/* Header */}
          <div className="p-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Receipt className="w-5 h-5 text-amber-500" />
              <div>
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
                  {isSettled ? 'Settlement Completed' : 'Settle Check & Bill'}
                </h3>
                <p className="text-[11px] text-gray-500">
                  Table {table.number < 10 ? '0' + table.number : table.number} • {table.section}
                </p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition cursor-pointer"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {isSettled ? (
            <div className="p-6 sm:p-8 flex flex-col items-center text-center space-y-4 animate-in fade-in zoom-in-95 duration-200">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shadow-inner">
                <CheckCircle2 className="w-10 h-10" />
              </div>

              <div className="space-y-1">
                <h4 className="text-xl font-bold text-gray-900">Payment Settled Successfully!</h4>
                <p className="text-xs text-gray-500">
                  Table {table.number < 10 ? '0' + table.number : table.number} bill is settled and table is cleared.
                </p>
              </div>

              {/* Bill Details Summary Card */}
              <div className="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 text-xs space-y-2 text-left">
                <div className="flex justify-between items-center pb-2 border-b border-gray-200 font-mono">
                  <span className="text-gray-500 font-sans font-medium">Invoice / Bill #</span>
                  <span className="font-bold text-gray-900">{settledSummary?.orderNumber || settledOrder?.orderNumber || `INV-T${table.number}`}</span>
                </div>
                <div className="flex justify-between items-center text-gray-600">
                  <span>Amount Collected:</span>
                  <span className="font-bold text-emerald-700 font-mono text-sm">
                    {settings.currencySymbol || 'Rs.'} {(settledSummary?.finalPayable ?? finalPayable).toLocaleString()}.00
                  </span>
                </div>
                <div className="flex justify-between items-center text-gray-600">
                  <span>Payment Mode:</span>
                  <span className="font-bold uppercase px-2 py-0.5 rounded bg-white border border-gray-200 text-gray-800 text-[10px]">
                    {settledSummary?.paymentMethod || paymentMethod}
                  </span>
                </div>
                <div className="flex justify-between items-center text-gray-600">
                  <span>Cashier / Staff:</span>
                  <span className="font-semibold text-gray-900">{settledSummary?.cashierName || cashierName.trim() || 'Nischal Thapa'}</span>
                </div>
                {(settledSummary || settledOrder) && (
                  <div className="flex justify-between items-center text-gray-600">
                    <span>Dishes / Items:</span>
                    <span className="font-semibold text-gray-900">{settledSummary?.itemCount ?? settledOrder?.items.length ?? 0} items</span>
                  </div>
                )}
              </div>

              {/* Action Buttons: Print Bill and Close */}
              <div className="w-full flex flex-col sm:flex-row items-center gap-2.5 pt-2">
                <button
                  id="btn-print-settled-bill"
                  type="button"
                  onClick={handlePrintReceipt}
                  className="w-full sm:flex-1 py-3 px-4 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>{isPrintTriggered ? 'Print Bill Again' : 'Print Bill'}</span>
                </button>

                {onReceiptOpen && settledOrder && (
                  <button
                    type="button"
                    onClick={() => {
                      onReceiptOpen(settledOrder);
                      handleClose();
                    }}
                    className="w-full sm:w-auto py-3 px-3.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs rounded-xl border border-gray-200 transition flex items-center justify-center gap-1.5 cursor-pointer"
                    title="View Full Thermal Receipt Preview"
                  >
                    <Receipt className="w-4 h-4 text-amber-600" />
                    <span>View Bill</span>
                  </button>
                )}

                <button
                  id="btn-close-settled-modal"
                  type="button"
                  onClick={handleClose}
                  className="w-full sm:w-28 py-3 px-4 bg-white hover:bg-gray-100 text-gray-800 font-bold text-xs rounded-xl border border-gray-300 transition flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  <X className="w-4 h-4 text-gray-500" />
                  <span>Close</span>
                </button>
              </div>
            </div>
          ) : (
          <div className="p-5 space-y-4 overflow-y-auto max-h-[75vh]">
            {/* Orders summary */}
            <div className="bg-gray-50 p-3 rounded-xl border border-gray-200 space-y-2">
              <div className="flex justify-between items-center text-xs font-bold text-gray-800">
                <span>Active Unpaid Orders ({tableOrders.length})</span>
                <span className="font-mono text-amber-600">Session ID: {table.currentSessionId || 'N/A'}</span>
              </div>
              <div className="max-h-24 overflow-y-auto space-y-1 divide-y divide-gray-200 text-[11px]">
                {tableOrders.map(ord => (
                  <div key={ord.id} className="pt-1 flex justify-between text-gray-600">
                    <span>{ord.orderNumber} ({ord.items.length} items)</span>
                    <span className="font-mono text-gray-900 font-bold">{settings.currencySymbol || 'Rs.'} {ord.finalAmount || ord.total}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Itemized Order & Portion Breakdown */}
            <div className="bg-amber-50/50 border border-amber-200/80 rounded-xl p-3 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-gray-900 border-b border-amber-200/60 pb-1.5">
                <span>Ordered Dishes & Portions ({allBillItems.length})</span>
                <span className="text-[10px] text-amber-700 font-medium">Portion Pricing Applied</span>
              </div>
              <div className="max-h-40 overflow-y-auto space-y-1.5 divide-y divide-amber-100 text-xs pr-1">
                {allBillItems.map((it, idx) => (
                  <div key={`${it.id || idx}`} className="pt-1 flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-gray-900">{it.quantity || 1}x</span>
                        <span className="text-gray-800 font-medium">{it.name || it.nameSnapshot || 'Dish'}</span>
                        {it.variantName && (
                          <span className="px-1.5 py-0.2 rounded text-[10px] font-extrabold bg-amber-200/80 text-amber-900 border border-amber-300">
                            {it.variantName}
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-gray-500 font-mono">
                        @ {settings.currencySymbol || 'Rs.'} {it.resolvedPrice.toLocaleString()} each
                      </div>
                    </div>
                    <span className="font-mono font-bold text-gray-900 text-xs">
                      {settings.currencySymbol || 'Rs.'} {it.itemTotal.toLocaleString()}
                    </span>
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

            {/* Cashier Name (Mandatory for settlement) */}
            <div className="space-y-2 p-3.5 rounded-xl bg-amber-50/70 border border-amber-200">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-1.5 text-xs font-bold text-amber-950 uppercase tracking-wider">
                  <UserCheck className="w-4 h-4 text-amber-600" />
                  <span>Settled By Cashier Name <span className="text-rose-600">*</span></span>
                </label>
                {!isCashierValid ? (
                  <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200 animate-pulse">
                    Required to settle
                  </span>
                ) : (
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 flex items-center gap-1">
                    <Check className="w-3 h-3" /> Ready
                  </span>
                )}
              </div>

              <div className="relative">
                <input
                  id="settle-cashier-name-input"
                  type="text"
                  value={cashierName}
                  onChange={e => setCashierName(e.target.value)}
                  placeholder="Enter cashier / captain name..."
                  className={`w-full pl-3 pr-8 py-2 bg-white rounded-lg text-xs font-bold text-gray-900 border transition placeholder-gray-400 focus:outline-none focus:ring-2 ${
                    !isCashierValid
                      ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-200'
                      : 'border-amber-300 focus:border-amber-500 focus:ring-amber-200'
                  }`}
                />
                {cashierName && (
                  <button
                    type="button"
                    onClick={() => setCashierName('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs font-bold"
                    title="Clear cashier name"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Quick cashier buttons */}
              <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                <span className="text-[10px] font-semibold text-amber-800">Quick Staff:</span>
                {['Nischal Thapa', 'Abhay Thapa', 'Dilip Chaudhary', 'Rohan Mishra'].map(name => (
                  <button
                    key={name}
                    type="button"
                    onClick={() => setCashierName(name)}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold border transition ${
                      cashierName === name
                        ? 'bg-amber-600 text-white border-amber-600 shadow-2xs'
                        : 'bg-white text-gray-700 border-gray-200 hover:bg-amber-50'
                    }`}
                  >
                    {name}
                  </button>
                ))}
              </div>
            </div>

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
                disabled={tableOrders.length === 0 || isProcessing || !isCashierValid}
                className="flex-1 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-black text-sm shadow-sm transition transform active:scale-98 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isProcessing ? (
                  <span>Processing...</span>
                ) : !isCashierValid ? (
                  <span>⚠️ Enter Cashier Name to Settle</span>
                ) : (
                  <span>Collect & Settle {settings.currencySymbol || 'Rs.'} {finalPayable} ({paymentMethod.toUpperCase()})</span>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  </>
);
};
