import React, { useState } from 'react';
import { usePOS } from '../../context/POSContext';
import {
  X,
  Clock,
  ChefHat,
  CheckCircle2,
  AlertCircle,
  PlusCircle,
  Receipt,
  Bell,
  Sparkles,
  UtensilsCrossed,
  ArrowRight
} from 'lucide-react';

interface GuestLiveOrderTrackerProps {
  isOpen: boolean;
  onClose: () => void;
  onOrderMore: () => void;
  onCallService: () => void;
}

export const GuestLiveOrderTracker: React.FC<GuestLiveOrderTrackerProps> = ({
  isOpen,
  onClose,
  onOrderMore,
  onCallService
}) => {
  const {
    currentGuestTableNumber,
    getTableOrders,
    getCurrentTable,
    addServiceRequest,
    settings,
    tableNotifications,
    markTableNotificationRead
  } = usePOS();

  const [billRequested, setBillRequested] = useState(false);

  if (!isOpen) return null;

  const currentTable = getCurrentTable();
  const tableOrders = getTableOrders(currentGuestTableNumber);
  const unreadTableAlerts = (tableNotifications || []).filter(
    n => n.tableNumber === currentGuestTableNumber && !n.read
  );

  const totalSessionAmount = tableOrders
    .filter(o => o.status !== 'cancelled')
    .reduce((sum, o) => sum + o.finalAmount, 0);

  const handleRequestBill = () => {
    addServiceRequest(currentGuestTableNumber, 'request_bill', 'Guest requested total bill');
    setBillRequested(true);
    setTimeout(() => setBillRequested(false), 8000);
  };

  const getStatusStep = (status: string) => {
    const s = (status || '').toLowerCase();
    switch (s) {
      case 'placed':
      case 'new':
      case 'pending':
        return 1;
      case 'confirmed':
      case 'preparing':
      case 'cooking':
      case 'in_progress':
        return 2;
      case 'ready':
        return 3;
      case 'served':
      case 'completed':
        return 4;
      default:
        return 1;
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#FDFCF0] border border-gray-200 rounded-2xl w-full max-w-xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-4 bg-white border-b border-gray-200 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center">
              <UtensilsCrossed className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
                  Live Order Tracker
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                  Table {currentGuestTableNumber < 10 ? '0' + currentGuestTableNumber : currentGuestTableNumber}
                </span>
              </div>
              <p className="text-[11px] text-gray-500">
                {tableOrders.length} {tableOrders.length === 1 ? 'order' : 'orders'} placed in this active session
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

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Real-time Notifications for this Table */}
          {unreadTableAlerts.length > 0 && (
            <div className="space-y-2">
              {unreadTableAlerts.map(alert => (
                <div
                  key={alert.id}
                  className={`p-3.5 rounded-xl border text-xs flex items-start justify-between gap-3 shadow-xs ${
                    alert.type === 'order_ready'
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                      : 'bg-rose-50 border-rose-300 text-rose-950'
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    {alert.type === 'order_ready' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-rose-600 mt-0.5 flex-shrink-0" />
                    )}
                    <div>
                      <p className="font-bold">{alert.title}</p>
                      <p className="text-[11px] mt-0.5 opacity-90">{alert.message}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => markTableNotificationRead(alert.id)}
                    className="p-1 text-gray-400 hover:text-gray-700 rounded-md"
                    title="Dismiss alert"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
          {tableOrders.length === 0 ? (
            <div className="text-center py-10">
              <Clock className="w-12 h-12 text-gray-400 mx-auto mb-2" />
              <p className="text-sm font-semibold text-gray-800">No active orders placed yet</p>
              <p className="text-xs text-gray-500 mt-1 max-w-xs mx-auto">
                Items you order from the menu will appear here with live kitchen status updates.
              </p>
              <button
                onClick={onOrderMore}
                className="mt-4 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-sm"
              >
                Browse Menu & Order
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {tableOrders.map(order => {
                const step = getStatusStep(order.status);
                return (
                  <div
                    key={order.id}
                    className="p-4 bg-white rounded-xl border border-gray-200 shadow-sm space-y-3"
                  >
                    {/* Order header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-xs text-gray-900">{order.orderNumber}</span>
                        {order.kotNumber && (
                          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-gray-100 text-gray-700 border border-gray-200">
                            {order.kotNumber}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-gray-400">{order.createdAt}</span>
                        <span
                          className={`text-[10px] uppercase tracking-wider font-bold px-2.5 py-0.5 rounded-full ${
                            order.status === 'cancelled'
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : step === 4
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : step === 3
                              ? 'bg-emerald-100 text-emerald-900 border border-emerald-300 font-black'
                              : step === 2
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : 'bg-amber-50 text-amber-800 border border-amber-200'
                          }`}
                        >
                          {order.status === 'cancelled'
                            ? 'Cancelled'
                            : step === 4
                            ? 'Served'
                            : step === 3
                            ? 'Ready to Serve'
                            : step === 2
                            ? 'Preparing'
                            : 'Placed'}
                        </span>
                      </div>
                    </div>

                    {order.status === 'cancelled' ? (
                      <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-bold">Item Not Available</p>
                          <p className="text-[11px] mt-0.5 opacity-90">
                            {order.cancellationReason || 'Order cancelled by kitchen staff due to availability.'}
                          </p>
                        </div>
                      </div>
                    ) : (
                      /* Visual Progress Stepper (Placed -> Preparing -> Ready -> Served) */
                      <div className="py-2.5 px-2 bg-gray-50/70 rounded-xl border border-gray-100">
                        <div className="grid grid-cols-4 gap-1 text-center relative">
                          {/* Connecting track */}
                          <div className="absolute top-3 left-[12%] right-[12%] h-0.5 bg-gray-200 -z-0">
                            <div
                              className="h-full bg-amber-500 transition-all duration-300"
                              style={{
                                width:
                                  step === 1
                                    ? '0%'
                                    : step === 2
                                    ? '33%'
                                    : step === 3
                                    ? '66%'
                                    : '100%'
                              }}
                            />
                          </div>

                          {/* Step 1: Placed */}
                          <div className="flex flex-col items-center relative z-10">
                            <div
                              className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold mb-1 transition-all ${
                                step >= 1 ? 'bg-amber-500 text-white shadow-xs' : 'bg-gray-200 text-gray-500'
                              }`}
                            >
                              {step > 1 ? '✓' : '1'}
                            </div>
                            <span className={`text-[10px] font-bold ${step >= 1 ? 'text-amber-800' : 'text-gray-400'}`}>
                              Placed
                            </span>
                          </div>

                          {/* Step 2: Preparing */}
                          <div className="flex flex-col items-center relative z-10">
                            <div
                              className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold mb-1 transition-all ${
                                step >= 2 ? 'bg-blue-600 text-white shadow-xs' : 'bg-gray-200 text-gray-500'
                              }`}
                            >
                              {step > 2 ? '✓' : '2'}
                            </div>
                            <span className={`text-[10px] font-bold ${step >= 2 ? 'text-blue-800' : 'text-gray-400'}`}>
                              Preparing
                            </span>
                          </div>

                          {/* Step 3: Ready */}
                          <div className="flex flex-col items-center relative z-10">
                            <div
                              className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold mb-1 transition-all ${
                                step >= 3 ? 'bg-emerald-600 text-white shadow-xs animate-pulse' : 'bg-gray-200 text-gray-500'
                              }`}
                            >
                              {step > 3 ? '✓' : '3'}
                            </div>
                            <span className={`text-[10px] font-bold ${step >= 3 ? 'text-emerald-800' : 'text-gray-400'}`}>
                              Ready
                            </span>
                          </div>

                          {/* Step 4: Served */}
                          <div className="flex flex-col items-center relative z-10">
                            <div
                              className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold mb-1 transition-all ${
                                step >= 4 ? 'bg-emerald-600 text-white shadow-xs' : 'bg-gray-200 text-gray-500'
                              }`}
                            >
                              ✓
                            </div>
                            <span className={`text-[10px] font-bold ${step >= 4 ? 'text-emerald-800' : 'text-gray-400'}`}>
                              Served
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Item list in this order */}
                    <div className="divide-y divide-gray-100 pt-1">
                      {order.items.map(item => (
                        <div key={item.id} className="py-1.5 flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-amber-700 text-[11px]">{item.quantity}x</span>
                            <span className="text-gray-800">{item.name || item.nameSnapshot}</span>
                            {item.variantName && (
                              <span className="text-[10px] text-gray-500">({item.variantName})</span>
                            )}
                          </div>
                          <span className="font-mono text-gray-700 font-semibold">{settings.currencySymbol || 'Rs.'} {(item.price ?? item.priceSnapshot ?? 0) * item.quantity}</span>
                        </div>
                      ))}
                    </div>

                    <div className="pt-2 border-t border-gray-100 flex justify-between text-xs font-bold text-gray-700">
                      <span>Order Subtotal (incl. taxes)</span>
                      <span className="font-mono text-amber-700">{settings.currencySymbol || 'Rs.'} {order.finalAmount ?? order.total ?? 0}</span>
                    </div>
                  </div>
                );
              })}

              {/* Running Table Session Bill Total Card */}
              <div className="p-4 bg-white rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-gray-800">
                    Table {currentGuestTableNumber < 10 ? '0' + currentGuestTableNumber : currentGuestTableNumber} Running Bill
                  </span>
                  <p className="text-[11px] text-gray-500">
                    All session orders combined
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-black font-mono text-amber-600">{settings.currencySymbol || 'Rs.'} {totalSessionAmount}</span>
                  <span className="block text-[10px] text-gray-400">
                    {settings.vatEnabled ? `Includes VAT (${settings.vatRate || 13}%)` : 'Taxes applied at settlement'}
                  </span>
                </div>
              </div>

              {billRequested && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-emerald-800 text-xs animate-in fade-in">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span>Bill request received! A captain will bring the invoice and payment machine shortly.</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-white border-t border-gray-200 flex items-center justify-between gap-3 flex-shrink-0">
          <button
            onClick={onCallService}
            className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-semibold border border-gray-200 transition"
          >
            <Bell className="w-3.5 h-3.5 text-amber-600" />
            <span>Call Service</span>
          </button>

          <button
            onClick={handleRequestBill}
            disabled={tableOrders.length === 0}
            className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-semibold border border-amber-200 transition disabled:opacity-40"
          >
            <Receipt className="w-3.5 h-3.5 text-amber-600" />
            <span>Request Bill</span>
          </button>

          <button
            onClick={onOrderMore}
            className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-sm transition"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Add More Food</span>
          </button>
        </div>
      </div>
    </div>
  );
};
