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
  ArrowRight,
  XCircle,
  AlertTriangle
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
    markTableNotificationRead,
    cancelOrderItem,
    kots
  } = usePOS();

  const [billRequested, setBillRequested] = useState(false);
  const [itemToCancel, setItemToCancel] = useState<{
    orderId: string;
    item: { id: string; name: string; quantity: number; price: number };
  } | null>(null);
  const [cancelReason, setCancelReason] = useState('Changed mind / No longer needed');
  const [cancelNotice, setCancelNotice] = useState<string | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);

  if (!isOpen) return null;

  const currentTable = getCurrentTable();
  const tableOrders = getTableOrders(currentGuestTableNumber);
  const unreadTableAlerts = (tableNotifications || []).filter(
    n => n.tableNumber === currentGuestTableNumber && !n.read
  );

  // Recalculate session running total considering only non-cancelled items
  const totalSessionAmount = tableOrders
    .filter(o => o.status !== 'cancelled')
    .reduce((sum, o) => {
      const activeItems = (o.items || []).filter(it => !it.cancelled && it.status !== 'CANCELLED');
      const activeSubtotal = activeItems.reduce(
        (acc, it) => acc + ((it.priceSnapshot ?? it.price ?? 0) * (it.quantity || 1)),
        0
      );
      const orderDiscount = Math.min(o.discount || 0, activeSubtotal);
      const discountedSub = Math.max(0, activeSubtotal - orderDiscount);
      const sc = (o.serviceChargeEnabled ?? settings.serviceChargeEnabled)
        ? Math.round((discountedSub * (o.serviceChargePercent ?? settings.serviceChargePercent ?? 10)) / 100)
        : 0;
      const vat = (o.vatEnabled ?? settings.vatEnabled)
        ? Math.round(((discountedSub + sc) * (o.vatRate ?? settings.vatRate ?? 13)) / 100)
        : 0;
      return sum + (discountedSub + sc + vat);
    }, 0);

  const handleRequestBill = () => {
    addServiceRequest(currentGuestTableNumber, 'request_bill', 'Guest requested total bill');
    setBillRequested(true);
    setTimeout(() => setBillRequested(false), 8000);
  };

  const handleConfirmCancelItem = async () => {
    if (!itemToCancel) return;

    // Check if order or linked KOTs have been marked ready by the kitchen/admin
    const targetOrder = tableOrders.find(o => o.id === itemToCancel.orderId);
    const linkedKots = (kots || []).filter(
      k =>
        k.orderId === itemToCancel.orderId ||
        (k.tableNumber === currentGuestTableNumber &&
          targetOrder &&
          ((targetOrder.orderNumber && k.orderNumber === targetOrder.orderNumber) ||
            (targetOrder.kotNumber && k.kotNumber === targetOrder.kotNumber)))
    );
    const isReadyNow =
      (targetOrder?.status || '').toLowerCase() === 'ready' ||
      (targetOrder?.status || '').toLowerCase() === 'served' ||
      linkedKots.some(
        k =>
          (k.status || '').toLowerCase() === 'ready' ||
          (k.status || '').toLowerCase() === 'completed' ||
          (k.status || '').toLowerCase() === 'bumped'
      );

    if (isReadyNow) {
      setCancelNotice(
        `Cannot cancel: Kitchen has already marked "${itemToCancel.item.name}" as Ready!`
      );
      setItemToCancel(null);
      setTimeout(() => setCancelNotice(null), 8000);
      return;
    }

    setIsCancelling(true);
    try {
      await cancelOrderItem(itemToCancel.orderId, itemToCancel.item.id, cancelReason);
      setCancelNotice(
        `"${itemToCancel.item.quantity}x ${itemToCancel.item.name}" has been cancelled from the kitchen KOT. Table ${currentGuestTableNumber < 10 ? '0' + currentGuestTableNumber : currentGuestTableNumber} remains occupied for your other items.`
      );
      setItemToCancel(null);
      setTimeout(() => setCancelNotice(null), 8000);
    } catch (err) {
      console.error('Failed to cancel item:', err);
    } finally {
      setIsCancelling(false);
    }
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
          {/* Item Cancellation Success Toast */}
          {cancelNotice && (
            <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-xs text-emerald-950 flex items-start justify-between gap-2 animate-in fade-in shadow-xs">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                <p className="font-medium leading-relaxed">{cancelNotice}</p>
              </div>
              <button
                type="button"
                onClick={() => setCancelNotice(null)}
                className="p-0.5 text-gray-400 hover:text-gray-700"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

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
                const linkedKots = (kots || []).filter(
                  k =>
                    k.orderId === order.id ||
                    (k.tableNumber === currentGuestTableNumber &&
                      ((order.orderNumber && k.orderNumber === order.orderNumber) ||
                        (order.kotNumber && k.kotNumber === order.kotNumber)))
                );
                const isKotReady = linkedKots.some(
                  k =>
                    (k.status || '').toLowerCase() === 'ready' ||
                    (k.status || '').toLowerCase() === 'completed' ||
                    (k.status || '').toLowerCase() === 'bumped'
                );
                const isKotPreparing = linkedKots.some(
                  k => {
                    const st = (k.status || '').toLowerCase();
                    return st === 'in_progress' || st === 'preparing' || st === 'cooking';
                  }
                );
                const orderStatusLower = (order.status || '').toLowerCase();
                const isOrderReady = orderStatusLower === 'ready' || isKotReady;
                const isOrderPreparing =
                  orderStatusLower === 'preparing' ||
                  orderStatusLower === 'cooking' ||
                  orderStatusLower === 'confirmed' ||
                  isKotPreparing;

                let effectiveStatus: string = order.status;
                if (orderStatusLower === 'cancelled') {
                  effectiveStatus = 'cancelled';
                } else if (orderStatusLower === 'served' || orderStatusLower === 'completed') {
                  effectiveStatus = order.status;
                } else if (isOrderReady) {
                  effectiveStatus = 'ready';
                } else if (isOrderPreparing) {
                  effectiveStatus = 'preparing';
                } else {
                  effectiveStatus = order.status;
                }

                const step = getStatusStep(effectiveStatus);
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
                            effectiveStatus === 'cancelled'
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
                          {effectiveStatus === 'cancelled'
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
                                step === 2
                                  ? 'bg-blue-600 text-white shadow-xs animate-pulse ring-2 ring-blue-300'
                                  : step > 2
                                  ? 'bg-blue-600 text-white shadow-xs'
                                  : 'bg-gray-200 text-gray-500'
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
                        {step === 2 && (
                          <div className="mt-2.5 px-3 py-1.5 bg-blue-50/90 border border-blue-200/80 rounded-lg text-[11px] text-blue-900 flex items-center justify-between animate-in fade-in duration-300">
                            <span className="font-semibold flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-blue-600 animate-ping inline-block" />
                              Kitchen staff is preparing your order fresh right now!
                            </span>
                            <span className="text-[10px] font-mono text-blue-700 bg-blue-100 px-1.5 py-0.5 rounded font-bold">
                              In Kitchen
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Item list in this order */}
                    <div className="divide-y divide-gray-100 pt-1">
                      {order.items.map(item => {
                        const isCancelled = item.cancelled === true || item.status === 'CANCELLED';
                        const itemStatusLower = (item.status || '').toLowerCase();

                        // Check if this item is in a KOT ticket that the admin marked as ready
                        const isItemInReadyKot = linkedKots.some(k => {
                          const kotStatus = (k.status || '').toLowerCase();
                          const kotIsReady =
                            kotStatus === 'ready' || kotStatus === 'completed' || kotStatus === 'bumped';
                          if (!kotIsReady) return false;
                          const hasItem = (k.items || []).some(
                            ki =>
                              ki.orderItemId === item.id ||
                              ki.id === item.id ||
                              (ki.nameSnapshot && ki.nameSnapshot === (item.nameSnapshot || item.name)) ||
                              ((ki as any).name && (ki as any).name === (item.nameSnapshot || item.name))
                          );
                          return hasItem || (k.items || []).length === 0;
                        });

                        const isItemReady =
                          isOrderReady ||
                          itemStatusLower === 'ready' ||
                          itemStatusLower === 'served' ||
                          isItemInReadyKot;

                        const canCancel =
                          !isCancelled &&
                          !isItemReady &&
                          effectiveStatus !== 'cancelled' &&
                          effectiveStatus !== 'ready' &&
                          effectiveStatus !== 'served' &&
                          effectiveStatus !== 'completed';

                        if (isCancelled) {
                          return (
                            <div
                              key={item.id}
                              className="py-2 px-2.5 my-1 rounded-lg bg-rose-50/60 border border-rose-200/60 flex items-center justify-between text-xs"
                            >
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-bold text-rose-700 text-[11px] line-through">
                                  {item.quantity}x
                                </span>
                                <div>
                                  <span className="text-gray-400 line-through font-medium">
                                    {item.name || item.nameSnapshot}
                                  </span>
                                  <div className="flex items-center gap-2 mt-0.5">
                                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-rose-100 text-rose-800 border border-rose-300">
                                      CANCELLED FROM KOT
                                    </span>
                                    <span className="text-[10px] text-emerald-700 font-semibold">
                                      Table remains occupied
                                    </span>
                                  </div>
                                </div>
                              </div>
                              <div className="text-right">
                                <span className="font-mono text-gray-400 line-through text-[11px] block">
                                  {settings.currencySymbol || 'Rs.'} {(item.price ?? item.priceSnapshot ?? 0) * item.quantity}
                                </span>
                                <span className="text-[10px] font-bold text-rose-600">Not Charged (Rs. 0)</span>
                              </div>
                            </div>
                          );
                        }

                        return (
                          <div key={item.id} className="py-2 flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-amber-700 text-[11px]">
                                {item.quantity}x
                              </span>
                              <div>
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="text-gray-900 font-medium">
                                    {item.name || item.nameSnapshot}
                                  </span>
                                  {item.department === 'SHOP' && (
                                    <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-indigo-100 text-indigo-800 border border-indigo-200">
                                      SHOP
                                    </span>
                                  )}
                                </div>
                                {(item.size || item.color || item.variantName || item.sku) && (
                                  <div className="text-[10px] text-gray-500 mt-0.5 space-x-1.5">
                                    {item.size && <span>Size: <strong className="text-gray-700">{item.size}</strong></span>}
                                    {item.color && <span>Color: <strong className="text-gray-700">{item.color}</strong></span>}
                                    {item.variantName && <span>({item.variantName})</span>}
                                    {item.sku && <span className="font-mono text-gray-400">[{item.sku}]</span>}
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-3">
                              <span className="font-mono text-gray-800 font-semibold">
                                {settings.currencySymbol || 'Rs.'}{' '}
                                {(item.price ?? item.priceSnapshot ?? 0) * item.quantity}
                              </span>

                              {isItemReady ? (
                                <span
                                  className="px-2 py-1 rounded-lg text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 flex items-center gap-1 shadow-2xs select-none"
                                  title="Item is ready and being served — cancellation is disabled"
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                  <span>Ready</span>
                                </span>
                              ) : canCancel ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setItemToCancel({
                                      orderId: order.id,
                                      item: {
                                        id: item.id,
                                        name: item.name || item.nameSnapshot || 'Dish Item',
                                        quantity: item.quantity || 1,
                                        price: item.price ?? item.priceSnapshot ?? 0
                                      }
                                    });
                                    setCancelReason('Changed mind / No longer needed');
                                  }}
                                  className="px-2 py-1 rounded-lg text-[11px] font-bold text-rose-600 hover:text-white bg-rose-50 hover:bg-rose-600 border border-rose-200 hover:border-rose-600 transition flex items-center gap-1 shadow-2xs cursor-pointer"
                                  title="Cancel this item from kitchen KOT"
                                >
                                  <XCircle className="w-3.5 h-3.5" />
                                  <span>Cancel</span>
                                </button>
                              ) : null}
                            </div>
                          </div>
                        );
                      })}
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

      {/* Confirmation Modal to Cancel Item */}
      {itemToCancel && (
        <div className="fixed inset-0 z-60 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-gray-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2 text-rose-600 font-bold text-sm">
                <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0" />
                <span>Cancel Item from Order?</span>
              </div>
              <button
                type="button"
                onClick={() => setItemToCancel(null)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl">
              <p className="text-amber-950 font-bold text-sm">
                {itemToCancel.item.quantity}x {itemToCancel.item.name}
              </p>
              <p className="text-[11px] text-amber-800 mt-0.5">
                Item subtotal: {settings.currencySymbol || 'Rs.'} {itemToCancel.item.price * itemToCancel.item.quantity}
              </p>
            </div>

            {/* Crucial status guarantee notice */}
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl space-y-1.5 text-blue-900 text-xs">
              <p className="font-bold flex items-center gap-1.5 text-blue-950">
                <CheckCircle2 className="w-4 h-4 text-blue-600 flex-shrink-0" />
                Kitchen Sync & Table Status:
              </p>
              <ul className="list-disc list-inside space-y-1 text-[11px] text-blue-800 pl-1">
                <li>This item is automatically removed from the admin kitchen KOT.</li>
                <li>
                  <strong className="text-blue-950">Table {currentGuestTableNumber < 10 ? '0' + currentGuestTableNumber : currentGuestTableNumber} will remain Occupied</strong> because your other items are still being served.
                </li>
                <li>Your total bill will be automatically deducted.</li>
              </ul>
            </div>

            <div>
              <label className="block font-bold text-gray-700 mb-1 text-[11px]">
                Reason for cancellation:
              </label>
              <select
                value={cancelReason}
                onChange={e => setCancelReason(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg text-xs bg-gray-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-amber-500"
              >
                <option value="Changed mind / No longer needed">Changed mind / No longer needed</option>
                <option value="Ordered by mistake">Ordered by mistake</option>
                <option value="Taking too long">Taking too long</option>
                <option value="Order modified">Order modified</option>
                <option value="Other">Other reason</option>
              </select>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
              <button
                type="button"
                disabled={isCancelling}
                onClick={() => setItemToCancel(null)}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 transition"
              >
                Keep Item
              </button>
              <button
                type="button"
                disabled={isCancelling}
                onClick={handleConfirmCancelItem}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 transition flex items-center gap-1.5 shadow-sm disabled:opacity-50 cursor-pointer"
              >
                <XCircle className="w-4 h-4" />
                <span>{isCancelling ? 'Cancelling...' : 'Confirm Cancel Item'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
