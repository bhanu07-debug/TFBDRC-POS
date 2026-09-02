import React, { useState } from 'react';
import { usePOS } from '../../context/POSContext';
import { Order, OrderStatus, OrderType, PaymentMethod } from '../../types';
import {
  Search,
  Receipt,
  Printer,
  CheckCircle2,
  Clock,
  AlertCircle,
  Banknote,
  Smartphone,
  CreditCard,
  X,
  Sparkles
} from 'lucide-react';

interface OrdersViewProps {
  onOpenReceipt?: (order: Order) => void;
}

export const OrdersView: React.FC<OrdersViewProps> = ({ onOpenReceipt }) => {
  const { orders, updateOrderStatus, markOrderPaid, settings } = usePOS();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [paymentFilter, setPaymentFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [inspectOrder, setInspectOrder] = useState<Order | null>(null);
  const [selectedPayMethod, setSelectedPayMethod] = useState<PaymentMethod>('cash');
  const [isSettleSubmitting, setIsSettleSubmitting] = useState(false);

  const unpaidOrdersCount = orders.filter(
    o => (o.status || '').toLowerCase() !== 'cancelled' && (o.paymentStatus || '').toLowerCase() !== 'paid'
  ).length;

  const paidOrdersCount = orders.filter(
    o => (o.paymentStatus || '').toLowerCase() === 'paid'
  ).length;

  const totalRevenue = orders
    .filter(o => (o.paymentStatus || '').toLowerCase() === 'paid')
    .reduce((sum, o) => sum + (o.finalAmount ?? o.total ?? o.subtotal ?? 0), 0);

  const filteredOrders = orders.filter(ord => {
    if (statusFilter !== 'all') {
      const s = (ord.status || '').toLowerCase();
      const f = statusFilter.toLowerCase();
      if (f === 'placed' && (s === 'placed' || s === 'new')) {
        // Match placed/new
      } else if (s !== f) {
        return false;
      }
    }
    if (typeFilter !== 'all' && ord.orderType && ord.orderType.toLowerCase() !== typeFilter.toLowerCase()) return false;
    if (paymentFilter === 'paid' && (ord.paymentStatus || '').toLowerCase() !== 'paid') return false;
    if (paymentFilter === 'unpaid' && (ord.paymentStatus || '').toLowerCase() === 'paid') return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchOrder = ord.orderNumber.toLowerCase().includes(q);
      const matchTable = `table ${ord.tableNumber}`.toLowerCase().includes(q);
      const matchGuest = (ord.guestName || '').toLowerCase().includes(q);
      const matchItem = ord.items.some(it => (it.name || it.nameSnapshot || '').toLowerCase().includes(q));
      const matchPay = (ord.paymentStatus || 'unpaid').toLowerCase().includes(q);
      const matchSource = (ord.source || '').toLowerCase().includes(q);
      if (!matchOrder && !matchTable && !matchGuest && !matchItem && !matchPay && !matchSource) return false;
    }
    return true;
  });

  const getOrderStatusStyle = (status: OrderStatus) => {
    switch (status) {
      case 'placed':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'confirmed':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'preparing':
        return 'bg-orange-50 text-orange-700 border-orange-200';
      case 'ready':
        return 'bg-teal-50 text-teal-700 border-teal-200';
      case 'served':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'completed':
        return 'bg-gray-100 text-gray-700 border-gray-200';
      case 'cancelled':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const handleQuickPay = async (orderId: string, method: PaymentMethod) => {
    setIsSettleSubmitting(true);
    try {
      await markOrderPaid(orderId, method);
      if (inspectOrder && inspectOrder.id === orderId) {
        setInspectOrder({
          ...inspectOrder,
          status: 'completed',
          paymentStatus: 'paid',
          paymentMethod: method,
          paidAt: new Date().toISOString()
        });
      }
    } catch (err) {
      console.error('Error marking order paid:', err);
    } finally {
      setIsSettleSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Quick Stats Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div
          onClick={() => { setPaymentFilter('all'); setStatusFilter('all'); }}
          className={`p-4 rounded-xl border cursor-pointer transition ${
            paymentFilter === 'all' && statusFilter === 'all'
              ? 'bg-amber-50/70 border-amber-300 ring-1 ring-amber-400'
              : 'bg-white border-gray-200 hover:border-gray-300'
          }`}
        >
          <div className="text-xs text-gray-500 font-semibold">Total Orders</div>
          <div className="text-xl font-bold font-mono text-gray-900 mt-1">{orders.length}</div>
        </div>

        <div
          onClick={() => setPaymentFilter('unpaid')}
          className={`p-4 rounded-xl border cursor-pointer transition ${
            paymentFilter === 'unpaid'
              ? 'bg-amber-100/70 border-amber-400 ring-1 ring-amber-400'
              : 'bg-white border-amber-200 hover:bg-amber-50/50'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs text-amber-800 font-bold">Unpaid Orders</span>
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
          </div>
          <div className="text-xl font-bold font-mono text-amber-900 mt-1">{unpaidOrdersCount}</div>
        </div>

        <div
          onClick={() => setPaymentFilter('paid')}
          className={`p-4 rounded-xl border cursor-pointer transition ${
            paymentFilter === 'paid'
              ? 'bg-emerald-50 border-emerald-400 ring-1 ring-emerald-400'
              : 'bg-white border-emerald-200 hover:bg-emerald-50/50'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs text-emerald-800 font-bold">Paid & Settled</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <div className="text-xl font-bold font-mono text-emerald-900 mt-1">{paidOrdersCount}</div>
        </div>

        <div className="p-4 rounded-xl border border-gray-200 bg-white">
          <div className="text-xs text-gray-500 font-semibold">Collected Revenue</div>
          <div className="text-xl font-bold font-mono text-gray-900 mt-1">
            Rs. {totalRevenue.toLocaleString()}.00
          </div>
        </div>
      </div>

      {/* Header & Controls */}
      <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-gray-900 tracking-tight">
              Live & Historic Restaurant Orders
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              POS order management with payment status tracking, bill settlement, and thermal receipts.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-lg text-xs font-mono font-bold">
              {filteredOrders.length} Orders Listed
            </span>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search Order #, Table, Guest, Item..."
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <select
              value={paymentFilter}
              onChange={e => setPaymentFilter(e.target.value)}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-800 focus:outline-none focus:border-amber-500 font-semibold"
            >
              <option value="all">Payment: All Statuses</option>
              <option value="unpaid">Payment: Unpaid Only</option>
              <option value="paid">Payment: Paid Only</option>
            </select>
          </div>

          <div>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-800 focus:outline-none focus:border-amber-500 font-semibold"
            >
              <option value="all">Kitchen/Order Status: All</option>
              <option value="placed">Placed (New)</option>
              <option value="confirmed">Confirmed</option>
              <option value="preparing">Preparing</option>
              <option value="ready">Ready</option>
              <option value="served">Served to Table</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <div>
            <select
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value)}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-800 focus:outline-none focus:border-amber-500 font-semibold"
            >
              <option value="all">All Types (Dine-in / Parcel)</option>
              <option value="dine_in">Dine-In</option>
              <option value="takeaway">Takeaway / Parcel</option>
              <option value="delivery">Delivery</option>
            </select>
          </div>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-gray-400 uppercase tracking-wider text-[10px] font-bold">
                <th className="p-3.5">Order ID</th>
                <th className="p-3.5">Table</th>
                <th className="p-3.5">Source</th>
                <th className="p-3.5">Items Ordered</th>
                <th className="p-3.5">Amount</th>
                <th className="p-3.5">Payment</th>
                <th className="p-3.5">Order Status</th>
                <th className="p-3.5">Time</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 font-medium">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-gray-400 text-xs">
                    No orders match your filter criteria.
                  </td>
                </tr>
              ) : (
                filteredOrders.map(order => {
                  const isPaid = (order.paymentStatus || '').toLowerCase() === 'paid';
                  const payMethodStr = order.paymentMethod ? order.paymentMethod.toUpperCase() : '';

                  return (
                    <tr
                      key={order.id}
                      onClick={() => setInspectOrder(order)}
                      className="hover:bg-gray-50/80 transition cursor-pointer"
                    >
                      <td className="p-3.5 font-mono font-bold text-gray-900 text-xs">
                        {order.orderNumber}
                      </td>

                      <td className="p-3.5 font-bold text-gray-800">
                        Table {order.tableNumber < 10 ? `0${order.tableNumber}` : order.tableNumber}
                      </td>

                      <td className="p-3.5">
                        {(order.source || '').toUpperCase() === 'GUEST_QR' ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                            <Smartphone className="w-3 h-3" />
                            <span>Guest QR</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-gray-700 bg-gray-100 px-2 py-0.5 rounded-full">
                            <Receipt className="w-3 h-3" />
                            <span>POS Manual</span>
                          </span>
                        )}
                      </td>

                      <td className="p-3.5 text-gray-600 max-w-xs truncate">
                        {order.items.map(i => `${i.quantity || 1}x ${i.name || i.nameSnapshot || 'Item'}`).join(', ')}
                      </td>

                      <td className="p-3.5 font-mono font-bold text-gray-900 text-xs">
                        Rs. {((order.finalAmount ?? order.total ?? order.subtotal ?? 0) || 0).toLocaleString()}.00
                      </td>

                      {/* Payment Status Column */}
                      <td className="p-3.5">
                        {isPaid ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>PAID {payMethodStr ? `(${payMethodStr})` : ''}</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-300">
                            <Clock className="w-3 h-3 text-amber-600 animate-pulse" />
                            <span>UNPAID</span>
                          </span>
                        )}
                      </td>

                      {/* Kitchen / Order Status Column */}
                      <td className="p-3.5">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border capitalize ${getOrderStatusStyle(
                            order.status
                          )}`}
                        >
                          {order.status}
                        </span>
                      </td>

                      <td className="p-3.5 font-mono text-gray-500 text-[11px]">
                        {new Date(order.createdAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </td>

                      <td className="p-3.5 text-right space-x-1" onClick={e => e.stopPropagation()}>
                        <button
                          onClick={() => onOpenReceipt?.(order)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-amber-600 hover:bg-amber-50 transition"
                          title="Print Receipt"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Order Detail Modal / Slide-over */}
      {inspectOrder && (
        <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
            onClick={() => setInspectOrder(null)}
          />
          <div className="relative w-full max-w-md bg-white h-full shadow-2xl z-10 flex flex-col border-l border-gray-200">
            <div className="p-5 border-b border-gray-200 flex items-center justify-between bg-gray-50">
              <div>
                <h3 className="font-bold text-base text-gray-900 font-mono">
                  {inspectOrder.orderNumber}
                </h3>
                <p className="text-xs text-gray-500">
                  Table {inspectOrder.tableNumber < 10 ? `0${inspectOrder.tableNumber}` : inspectOrder.tableNumber} • {inspectOrder.orderType}
                </p>
              </div>
              <button
                onClick={() => setInspectOrder(null)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {/* Payment Status Card & Quick Settlement */}
              <div
                className={`p-4 rounded-xl border space-y-3 ${
                  (inspectOrder.paymentStatus || '').toLowerCase() === 'paid'
                    ? 'bg-emerald-50/70 border-emerald-200'
                    : 'bg-amber-50/80 border-amber-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {(inspectOrder.paymentStatus || '').toLowerCase() === 'paid' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <Clock className="w-4 h-4 text-amber-600 animate-pulse" />
                    )}
                    <span className="text-xs font-bold uppercase tracking-wider text-gray-900">
                      Payment Status:{' '}
                      <span
                        className={
                          (inspectOrder.paymentStatus || '').toLowerCase() === 'paid'
                            ? 'text-emerald-700'
                            : 'text-amber-800 font-black'
                        }
                      >
                        {(inspectOrder.paymentStatus || 'unpaid').toUpperCase()}
                      </span>
                    </span>
                  </div>
                  {(inspectOrder.paymentStatus || '').toLowerCase() === 'paid' && inspectOrder.paymentMethod && (
                    <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-md uppercase">
                      {inspectOrder.paymentMethod}
                    </span>
                  )}
                </div>

                {(inspectOrder.paymentStatus || '').toLowerCase() !== 'paid' ? (
                  <div className="space-y-2 pt-2 border-t border-amber-200">
                    <label className="text-[11px] font-bold text-gray-700">Select Settlement Method:</label>
                    <div className="grid grid-cols-3 gap-1.5">
                      {[
                        { id: 'cash', label: 'Cash' },
                        { id: 'esewa', label: 'eSewa' },
                        { id: 'khalti', label: 'Khalti' },
                        { id: 'fonepay', label: 'Fonepay' },
                        { id: 'card', label: 'Card' },
                        { id: 'qr_wallet', label: 'QR Wallet' }
                      ].map(m => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => setSelectedPayMethod(m.id as PaymentMethod)}
                          className={`px-2 py-1.5 rounded-lg text-xs font-bold border transition ${
                            selectedPayMethod === m.id
                              ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                              : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                          }`}
                        >
                          {m.label}
                        </button>
                      ))}
                    </div>

                    <button
                      disabled={isSettleSubmitting}
                      onClick={() => handleQuickPay(inspectOrder.id, selectedPayMethod)}
                      className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-xs disabled:opacity-50"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>
                        Mark as Paid (Rs. {((inspectOrder.finalAmount ?? inspectOrder.total ?? 0) || 0).toLocaleString()})
                      </span>
                    </button>
                  </div>
                ) : (
                  <p className="text-[11px] text-emerald-700">
                    Order bill settled and completed. Table availability updated.
                  </p>
                )}
              </div>

              {/* Status Selector */}
              <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-200 space-y-2">
                <label className="text-xs font-bold text-gray-700">Update Kitchen Status</label>
                <div className="flex flex-wrap gap-1.5">
                  {(['placed', 'preparing', 'ready', 'served', 'completed'] as OrderStatus[]).map(st => (
                    <button
                      key={st}
                      onClick={() => {
                        updateOrderStatus(inspectOrder.id, st);
                        setInspectOrder({ ...inspectOrder, status: st });
                      }}
                      className={`px-3 py-1 rounded-lg text-xs font-bold capitalize transition border ${
                        inspectOrder.status === st
                          ? 'bg-amber-500 text-white border-amber-500 shadow-xs'
                          : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-100'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              {/* Items List */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                  Itemized Order
                </h4>
                <div className="p-3.5 rounded-xl border border-gray-200 divide-y divide-gray-100 text-xs bg-white">
                  {inspectOrder.items.map(item => (
                    <div key={item.id} className="py-2 first:pt-0 last:pb-0 flex items-start justify-between">
                      <div>
                        <p className="font-bold text-gray-900">
                          {item.quantity}x {item.name}
                        </p>
                        {item.instructions && (
                          <p className="text-[11px] text-amber-700">Note: {item.instructions}</p>
                        )}
                      </div>
                      <span className="font-mono font-bold text-gray-900">
                        Rs. {(((item.price ?? item.priceSnapshot ?? 0) * (item.quantity || 1)) || 0).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Total Breakdown */}
              <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 space-y-2 text-xs">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal</span>
                  <span className="font-mono">{settings.currencySymbol || 'Rs.'} {((inspectOrder.subtotal ?? inspectOrder.total ?? 0) || 0).toLocaleString()}</span>
                </div>
                {((inspectOrder.discountAmount ?? inspectOrder.discount ?? 0) > 0) && (
                  <div className="flex justify-between text-emerald-600 font-semibold">
                    <span>Discount ({inspectOrder.discountReason || 'Promo'})</span>
                    <span className="font-mono">-{settings.currencySymbol || 'Rs.'} {((inspectOrder.discountAmount ?? inspectOrder.discount ?? 0) || 0).toLocaleString()}</span>
                  </div>
                )}
                {(settings.serviceChargeEnabled || (inspectOrder.serviceCharge ?? 0) > 0) && (
                  <div className="flex justify-between text-gray-600">
                    <span>Service Charge ({settings.serviceChargePercent || 10}%)</span>
                    <span className="font-mono">{settings.currencySymbol || 'Rs.'} {((inspectOrder.serviceCharge ?? 0) || 0).toLocaleString()}</span>
                  </div>
                )}
                {settings.vatEnabled && ((inspectOrder.taxAmount ?? inspectOrder.vat ?? 0) > 0) && (
                  <div className="flex justify-between text-gray-600 font-semibold">
                    <span>VAT ({settings.vatRate || 13}%)</span>
                    <span className="font-mono">{settings.currencySymbol || 'Rs.'} {((inspectOrder.taxAmount ?? inspectOrder.vat ?? 0) || 0).toLocaleString()}</span>
                  </div>
                )}
                <div className="pt-2 border-t border-gray-200 flex justify-between font-bold text-sm text-gray-900">
                  <span>Grand Total</span>
                  <span className="font-mono text-base text-amber-600">
                    {settings.currencySymbol || 'Rs.'} {((inspectOrder.finalAmount ?? inspectOrder.total ?? 0) || 0).toLocaleString()}.00
                  </span>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-gray-200 bg-gray-50 flex items-center gap-2">
              <button
                onClick={() => {
                  onOpenReceipt?.(inspectOrder);
                  setInspectOrder(null);
                }}
                className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-xs"
              >
                <Printer className="w-4 h-4" />
                <span>Print Thermal Bill</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
