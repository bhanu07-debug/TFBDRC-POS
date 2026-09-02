import React, { useState } from 'react';
import { usePOS } from '../../context/POSContext';
import { PaymentRecord, PaymentMethod } from '../../types';
import {
  CreditCard,
  Banknote,
  Smartphone,
  Split,
  Search,
  CheckCircle2,
  DollarSign,
  TrendingUp,
  Download,
  Calendar,
  Receipt,
  Printer
} from 'lucide-react';

interface PaymentsViewProps {
  onOpenReceipt?: (order: any) => void;
}

export const PaymentsView: React.FC<PaymentsViewProps> = ({ onOpenReceipt }) => {
  const { payments, orders } = usePOS();
  const [searchQuery, setSearchQuery] = useState('');
  const [methodFilter, setMethodFilter] = useState<string>('all');

  const filteredPayments = payments.filter(p => {
    if (methodFilter !== 'all' && (p.method || '').toLowerCase() !== methodFilter.toLowerCase()) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchInv = (p.transactionRef || p.id || '').toLowerCase().includes(q);
      const matchOrd = (p.orderNumber || '').toLowerCase().includes(q);
      if (!matchInv && !matchOrd) return false;
    }
    return true;
  });

  const totalCollected = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
  const digitalCollected = payments.filter(p => {
    const m = (p.method || '').toLowerCase();
    return m === 'qr_wallet' || m === 'esewa' || m === 'khalti' || m === 'fonepay' || m === 'upi';
  }).reduce((sum, p) => sum + (p.amount || 0), 0);
  const cardCollected = payments.filter(p => (p.method || '').toLowerCase() === 'card').reduce((sum, p) => sum + (p.amount || 0), 0);
  const cashCollected = payments.filter(p => (p.method || '').toLowerCase() === 'cash').reduce((sum, p) => sum + (p.amount || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-lg font-bold text-gray-900 tracking-tight">
          Payment Transactions & Cashflow
        </h2>
        <p className="text-xs text-gray-500 mt-0.5">
          Settlement records, Nepal digital payments (eSewa, Khalti, Fonepay), and cashier transaction audit logs.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-white rounded-xl border border-gray-200 shadow-xs">
          <span className="text-xs font-semibold text-gray-500">Total Shift Revenue</span>
          <div className="mt-2 text-2xl font-bold text-gray-900 font-mono">
            Rs. {totalCollected.toLocaleString()}
          </div>
          <span className="text-[11px] text-emerald-600 font-semibold">
            {payments.length} Transactions Settled
          </span>
        </div>

        <div className="p-4 bg-white rounded-xl border border-gray-200 shadow-xs">
          <span className="text-xs font-semibold text-gray-500 flex items-center gap-1">
            <Smartphone className="w-3.5 h-3.5 text-amber-500" /> Digital / Wallets
          </span>
          <div className="mt-2 text-2xl font-bold text-amber-600 font-mono">
            Rs. {digitalCollected.toLocaleString()}
          </div>
          <span className="text-[11px] text-gray-400">
            {Math.round((digitalCollected / (totalCollected || 1)) * 100)}% of total
          </span>
        </div>

        <div className="p-4 bg-white rounded-xl border border-gray-200 shadow-xs">
          <span className="text-xs font-semibold text-gray-500 flex items-center gap-1">
            <CreditCard className="w-3.5 h-3.5 text-blue-500" /> POS Card EDC
          </span>
          <div className="mt-2 text-2xl font-bold text-blue-600 font-mono">
            Rs. {cardCollected.toLocaleString()}
          </div>
          <span className="text-[11px] text-gray-400">
            {Math.round((cardCollected / (totalCollected || 1)) * 100)}% of total
          </span>
        </div>

        <div className="p-4 bg-white rounded-xl border border-gray-200 shadow-xs">
          <span className="text-xs font-semibold text-gray-500 flex items-center gap-1">
            <Banknote className="w-3.5 h-3.5 text-emerald-500" /> Cash Drawer
          </span>
          <div className="mt-2 text-2xl font-bold text-emerald-600 font-mono">
            Rs. {cashCollected.toLocaleString()}
          </div>
          <span className="text-[11px] text-gray-400">
            {Math.round((cashCollected / (totalCollected || 1)) * 100)}% of total
          </span>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="p-4 bg-white rounded-xl border border-gray-200 shadow-xs flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search Reference #, Order ID..."
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:border-amber-500"
          />
        </div>

        <select
          value={methodFilter}
          onChange={e => setMethodFilter(e.target.value)}
          className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-700 focus:outline-none focus:border-amber-500 font-semibold"
        >
          <option value="all">All Payment Methods</option>
          <option value="cash">Cash</option>
          <option value="card">Card</option>
          <option value="qr_wallet">QR / Wallet</option>
          <option value="esewa">eSewa</option>
          <option value="khalti">Khalti</option>
          <option value="fonepay">Fonepay</option>
        </select>
      </div>

      {/* Transactions Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-gray-400 uppercase tracking-wider text-[10px] font-bold">
                <th className="p-3.5">Transaction Ref</th>
                <th className="p-3.5">Order Ref</th>
                <th className="p-3.5">Table</th>
                <th className="p-3.5">Time</th>
                <th className="p-3.5">Method</th>
                <th className="p-3.5">Amount</th>
                <th className="p-3.5">Cashier</th>
                <th className="p-3.5 text-right">Receipt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 font-medium">
              {filteredPayments.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-gray-400 text-xs">
                    No payment transactions recorded.
                  </td>
                </tr>
              ) : (
                filteredPayments.map(p => {
                  const linkedOrder = orders.find(o => o.orderNumber === p.orderNumber || p.orderNumber.includes(o.orderNumber));

                  return (
                    <tr key={p.id} className="hover:bg-gray-50/80 transition">
                      <td className="p-3.5 font-mono font-bold text-gray-900">
                        {p.transactionRef || p.id}
                      </td>
                      <td className="p-3.5 font-mono text-gray-600">
                        {p.orderNumber}
                      </td>
                      <td className="p-3.5 font-bold text-gray-800">
                        Table {p.tableNumber < 10 ? '0' + p.tableNumber : p.tableNumber}
                      </td>
                      <td className="p-3.5 text-gray-500 font-mono text-[11px]">
                        {p.timestamp}
                      </td>
                      <td className="p-3.5">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                            p.method === 'upi'
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : p.method === 'card'
                              ? 'bg-blue-50 text-blue-700 border-blue-200'
                              : p.method === 'cash'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-purple-50 text-purple-700 border-purple-200'
                          }`}
                        >
                          {p.method}
                        </span>
                      </td>
                      <td className="p-3.5 font-mono font-bold text-gray-900">
                        Rs. {((p.amount || 0)).toLocaleString()}.00
                      </td>
                      <td className="p-3.5 text-gray-600">
                        {p.cashierName || 'Counter Staff'}
                      </td>
                      <td className="p-3.5 text-right">
                        {linkedOrder && (
                          <button
                            onClick={() => onOpenReceipt?.(linkedOrder)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-amber-600 hover:bg-amber-50 transition"
                            title="Reprint Bill"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
