import React, { useState, useMemo } from 'react';
import { usePOS } from '../../context/POSContext';
import { PaymentRecord, PaymentMethod, Order } from '../../types';
import {
  CreditCard,
  Banknote,
  Smartphone,
  Search,
  CheckCircle2,
  Calendar,
  Clock,
  Printer,
  Download,
  Filter,
  RotateCcw,
  Sparkles,
  CalendarDays,
  FileSpreadsheet,
  AlertCircle,
  UserCheck,
  User
} from 'lucide-react';

export type PaymentDateFilter = 'today' | 'yesterday' | 'week' | 'month' | 'all' | 'custom';

interface PaymentsViewProps {
  onOpenReceipt?: (order: Order) => void;
}

export const PaymentsView: React.FC<PaymentsViewProps> = ({ onOpenReceipt }) => {
  const { payments, orders, settings } = usePOS();
  const [searchQuery, setSearchQuery] = useState('');
  const [methodFilter, setMethodFilter] = useState<string>('all');
  const [cashierFilter, setCashierFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<PaymentDateFilter>('today');
  const [revenueMode, setRevenueMode] = useState<'shift' | 'all'>('shift');
  const [exportNotice, setExportNotice] = useState<string | null>(null);

  // Local calendar date (YYYY-MM-DD)
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });

  // 1. Merge & synthesize payment records so no settled order (like Table 01) is ever omitted
  const mergedPayments = useMemo<PaymentRecord[]>(() => {
    const list: PaymentRecord[] = [...(payments || [])];
    const existingOrderRefs = new Set(
      (payments || []).map(p => (p.orderNumber || '').trim()).filter(Boolean)
    );
    const existingIds = new Set((payments || []).map(p => p.id));

    (orders || []).forEach(ord => {
      const isPaid =
        (ord.paymentStatus || '').toLowerCase() === 'paid' ||
        ((ord.status as any) === 'completed' && Boolean(ord.paidAt || ord.paymentMethod));

      if (isPaid) {
        const ordRef = ord.orderNumber || ord.id;
        if (!existingOrderRefs.has(ordRef) && !existingIds.has(ord.id)) {
          const effectiveTime =
            ord.paidAt || ord.updatedAt || ord.createdAt || new Date().toISOString();
          const effectiveCashier = ord.cashierName || (ord as any).settledBy || ord.createdBy || 'Cashier';
          list.push({
            id: `PAY-ORD-${ord.id}`,
            sessionId: ord.sessionId || `SES-${ord.tableNumber}`,
            billId: `BILL-${ord.orderNumber || ord.id}`,
            amount: ord.finalAmount || ord.total || ord.subtotal || 0,
            method: (ord.paymentMethod as any) || 'cash',
            status: 'PAID',
            transactionReference: `TX-${ord.orderNumber || ord.id}`,
            transactionRef: `TX-${ord.orderNumber || ord.id}`,
            createdAt: effectiveTime,
            timestamp: effectiveTime,
            paidAt: effectiveTime,
            createdBy: effectiveCashier,
            tableNumber: ord.tableNumber,
            orderNumber: ord.orderNumber || `ORD-${ord.tableNumber}`,
            orderId: ord.id,
            cashierName: effectiveCashier
          });
        }
      }
    });

    return list.sort((a, b) => {
      const tA = new Date(a.timestamp || a.createdAt || 0).getTime();
      const tB = new Date(b.timestamp || b.createdAt || 0).getTime();
      return tB - tA;
    });
  }, [payments, orders]);

  // Unique Cashiers for quick filter dropdown
  const uniqueCashiers = useMemo(() => {
    const names = new Set<string>();
    mergedPayments.forEach(p => {
      const c = p.cashierName || (p as any).settledBy || p.createdBy;
      if (c && c.trim()) names.add(c.trim());
    });
    return Array.from(names).sort();
  }, [mergedPayments]);

  // 2. Date filtering helper
  const isDateInFilter = (dateStr?: string, filter?: PaymentDateFilter): boolean => {
    const activeFilter = filter || dateFilter;
    if (activeFilter === 'all') return true;
    if (!dateStr) return false;

    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return false;

    const now = new Date();

    if (activeFilter === 'today') {
      return (
        d.getFullYear() === now.getFullYear() &&
        d.getMonth() === now.getMonth() &&
        d.getDate() === now.getDate()
      );
    }

    if (activeFilter === 'yesterday') {
      const yesterday = new Date(now);
      yesterday.setDate(now.getDate() - 1);
      return (
        d.getFullYear() === yesterday.getFullYear() &&
        d.getMonth() === yesterday.getMonth() &&
        d.getDate() === yesterday.getDate()
      );
    }

    if (activeFilter === 'custom') {
      if (!selectedDate) return true;
      const [y, m, day] = selectedDate.split('-').map(Number);
      return (
        d.getFullYear() === y &&
        d.getMonth() === m - 1 &&
        d.getDate() === day
      );
    }

    if (activeFilter === 'week') {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(now.getDate() - 7);
      return d >= oneWeekAgo;
    }

    if (activeFilter === 'month') {
      const oneMonthAgo = new Date();
      oneMonthAgo.setDate(now.getDate() - 30);
      return d >= oneMonthAgo;
    }

    return true;
  };

  // 3. Filtered Payments based on date, method, and search query
  const filteredPayments = useMemo(() => {
    return mergedPayments.filter(p => {
      // Date filter (check timestamp, createdAt, or paidAt)
      const timeField = p.timestamp || p.createdAt || p.paidAt;
      if (!isDateInFilter(timeField, dateFilter)) return false;

      // Method filter
      if (methodFilter !== 'all') {
        const m = (p.method || '').toLowerCase();
        if (methodFilter === 'qr_wallet') {
          const isDigital = m === 'qr_wallet' || m === 'esewa' || m === 'khalti' || m === 'fonepay' || m === 'upi';
          if (!isDigital) return false;
        } else if (m !== methodFilter.toLowerCase()) {
          return false;
        }
      }

      // Cashier filter
      if (cashierFilter !== 'all') {
        const c = (p.cashierName || (p as any).settledBy || p.createdBy || '').toLowerCase();
        if (c !== cashierFilter.toLowerCase()) return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchInv = (p.transactionRef || p.transactionReference || p.id || '').toLowerCase().includes(q);
        const matchOrd = (p.orderNumber || '').toLowerCase().includes(q);
        const matchTable = `table ${p.tableNumber}`.toLowerCase().includes(q);
        const matchMethod = (p.method || '').toLowerCase().includes(q);
        const matchCashier = (p.cashierName || p.createdBy || '').toLowerCase().includes(q);
        if (!matchInv && !matchOrd && !matchTable && !matchMethod && !matchCashier) return false;
      }

      return true;
    });
  }, [mergedPayments, dateFilter, selectedDate, methodFilter, searchQuery]);

  // 4. Financial metrics: Shift-specific vs. All-Time
  const allTimeCollected = useMemo(() => {
    return mergedPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
  }, [mergedPayments]);

  const shiftCollected = useMemo(() => {
    // Only payments matching the current date filter
    return filteredPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
  }, [filteredPayments]);

  // Current metric based on selected revenue mode
  const activeRevenue = revenueMode === 'shift' ? shiftCollected : allTimeCollected;

  // Breakdown for the active scope (shift or all)
  const activeDataset = revenueMode === 'shift' ? filteredPayments : mergedPayments;

  const digitalCollected = useMemo(() => {
    return activeDataset
      .filter(p => {
        const m = (p.method || '').toLowerCase();
        return m === 'qr_wallet' || m === 'esewa' || m === 'khalti' || m === 'fonepay' || m === 'upi';
      })
      .reduce((sum, p) => sum + (p.amount || 0), 0);
  }, [activeDataset]);

  const cardCollected = useMemo(() => {
    return activeDataset
      .filter(p => (p.method || '').toLowerCase() === 'card')
      .reduce((sum, p) => sum + (p.amount || 0), 0);
  }, [activeDataset]);

  const cashCollected = useMemo(() => {
    return activeDataset
      .filter(p => (p.method || '').toLowerCase() === 'cash')
      .reduce((sum, p) => sum + (p.amount || 0), 0);
  }, [activeDataset]);

  // Format date helper for display
  const formatPaymentDateTime = (dateStr?: string) => {
    if (!dateStr) return { time: 'Recorded', date: 'Just now', full: 'Recorded' };
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return { time: dateStr, date: '', full: dateStr };

    const time = d.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
    const date = d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
    return { time, date, full: `${date} at ${time}` };
  };

  // Helper for human-readable label of current date filter
  const getDateFilterLabel = () => {
    switch (dateFilter) {
      case 'today':
        return 'Today\'s Shift';
      case 'yesterday':
        return 'Yesterday\'s Shift';
      case 'custom': {
        const [y, m, d] = selectedDate.split('-').map(Number);
        const parsed = new Date(y, m - 1, d);
        return isNaN(parsed.getTime())
          ? `Date: ${selectedDate}`
          : `Date: ${parsed.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
      }
      case 'week':
        return 'Past 7 Days';
      case 'month':
        return 'Past 30 Days';
      case 'all':
        return 'All Time History';
      default:
        return 'Selected Period';
    }
  };

  // Export to CSV
  const handleExportCSV = () => {
    try {
      const headers = [
        'Transaction Ref',
        'Order Number',
        'Table',
        'Payment Date',
        'Payment Time',
        'Method',
        'Amount (NPR)',
        'Cashier / Recorded By',
        'Status'
      ];

      const rows = filteredPayments.map(p => {
        const timeObj = formatPaymentDateTime(p.timestamp || p.createdAt || p.paidAt);
        return [
          `"${p.transactionRef || p.transactionReference || p.id}"`,
          `"${p.orderNumber || ''}"`,
          `"${p.tableNumber ? `Table ${p.tableNumber}` : 'Direct'}"`,
          `"${timeObj.date}"`,
          `"${timeObj.time}"`,
          `"${(p.method || 'cash').toUpperCase()}"`,
          (p.amount || 0).toFixed(2),
          `"${p.cashierName || p.createdBy || 'Cashier'}"`,
          `"${p.status || 'PAID'}"`
        ].join(',');
      });

      const periodStr = dateFilter === 'custom' ? `Date_${selectedDate}` : dateFilter;
      const csvContent = [headers.join(','), ...rows].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Fat_Buddha_Payments_${periodStr}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setExportNotice(`Payments CSV for ${getDateFilterLabel()} downloaded!`);
      setTimeout(() => setExportNotice(null), 3500);
    } catch (err) {
      console.error('Error exporting payments CSV:', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with Title and Action Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
            Payment Transactions &amp; Cashflow
            <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-amber-500/20 text-white border border-amber-500/40">
              Shift Audit
            </span>
          </h2>
          <p className="text-xs text-white mt-0.5">
            Audit payment times, settlement records, Nepal digital payments (eSewa, Khalti, Fonepay), and register revenue.
          </p>
        </div>

        {/* Date Presets & Calendar Selector */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Quick Date Presets */}
          <div className="flex flex-wrap items-center bg-gray-100 p-1 rounded-xl border border-gray-200 text-xs gap-1">
            <button
              id="btn-pay-date-today"
              onClick={() => setDateFilter('today')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition ${
                dateFilter === 'today'
                  ? 'bg-white text-gray-900 shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Today
            </button>
            <button
              id="btn-pay-date-yesterday"
              onClick={() => setDateFilter('yesterday')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition ${
                dateFilter === 'yesterday'
                  ? 'bg-white text-gray-900 shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Yesterday
            </button>
            <button
              id="btn-pay-date-week"
              onClick={() => setDateFilter('week')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition ${
                dateFilter === 'week'
                  ? 'bg-white text-gray-900 shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Week
            </button>
            <button
              id="btn-pay-date-all"
              onClick={() => setDateFilter('all')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition ${
                dateFilter === 'all'
                  ? 'bg-white text-gray-900 shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              All Time
            </button>

            {/* Interactive Calendar Date Picker */}
            <div
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border transition ${
                dateFilter === 'custom'
                  ? 'bg-white text-gray-900 border-amber-400 shadow-xs ring-1 ring-amber-400/40'
                  : 'bg-white/80 text-gray-600 border-gray-300 hover:border-gray-400'
              }`}
              title="Pick a specific calendar date to audit payments"
            >
              <Calendar
                className={`w-3.5 h-3.5 ${
                  dateFilter === 'custom' ? 'text-amber-600' : 'text-gray-500'
                }`}
              />
              <input
                id="payment-calendar-picker"
                type="date"
                value={selectedDate}
                onChange={e => {
                  if (e.target.value) {
                    setSelectedDate(e.target.value);
                    setDateFilter('custom');
                  }
                }}
                className="bg-transparent text-xs font-semibold text-gray-800 focus:outline-none cursor-pointer"
                title="Select date via calendar"
              />
              {dateFilter === 'custom' && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">
                  Active
                </span>
              )}
            </div>
          </div>

          {/* Export CSV Button */}
          <button
            id="btn-export-payments-csv"
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-gray-50 text-gray-700 text-xs font-semibold rounded-xl border border-gray-200 shadow-xs transition"
            title="Download CSV report of filtered payments"
          >
            <Download className="w-3.5 h-3.5 text-gray-500" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Export Toast Notice */}
      {exportNotice && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span className="font-semibold">{exportNotice}</span>
        </div>
      )}

      {/* Shift Revenue Scope Selector Bar */}
      <div className="bg-amber-500/10 border border-amber-500/30 p-3 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center flex-shrink-0">
            <CalendarDays className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-white flex items-center gap-2">
              <span className="text-white">Auditing Period:</span>
              <span className="text-white underline font-black decoration-amber-400">{getDateFilterLabel()}</span>
              {dateFilter === 'custom' && (
                <span className="text-[10px] bg-amber-500/30 text-white border border-amber-400/40 font-bold px-2 py-0.5 rounded-md">
                  Calendar Picked
                </span>
              )}
            </div>
            <p className="text-[11px] text-white">
              Showing <strong className="text-white">{filteredPayments.length}</strong> transactions for this period totaling{' '}
              <strong className="text-white font-mono font-bold">
                Rs. {shiftCollected.toLocaleString()}.00
              </strong>
            </p>
          </div>
        </div>

        {/* Toggle between Shift Revenue (Selected Date) and All-Time Revenue */}
        <div className="flex items-center gap-1.5 bg-white p-1 rounded-xl border border-gray-200 shadow-xs self-stretch sm:self-auto justify-center">
          <button
            id="btn-mode-shift"
            onClick={() => setRevenueMode('shift')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              revenueMode === 'shift'
                ? 'bg-amber-500 text-white shadow-xs'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Shift Revenue ({dateFilter === 'custom' ? selectedDate : dateFilter})</span>
          </button>
          <button
            id="btn-mode-all"
            onClick={() => setRevenueMode('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              revenueMode === 'all'
                ? 'bg-gray-900 text-white shadow-xs'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>All-Time Cumulative</span>
          </button>
        </div>
      </div>

      {/* KPI Cards: Dynamic Shift Revenue on Specific Calendar Date */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Shift Revenue Card */}
        <div className="p-4 bg-white rounded-xl border border-gray-200 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500">
              {revenueMode === 'shift' ? 'Total Shift Revenue' : 'All-Time Revenue'}
            </span>
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                revenueMode === 'shift'
                  ? 'bg-amber-100 text-amber-800'
                  : 'bg-slate-100 text-slate-700'
              }`}
            >
              {revenueMode === 'shift' ? dateFilter : 'All-Time'}
            </span>
          </div>
          <div className="mt-2 text-2xl font-bold text-gray-900 font-mono tracking-tight">
            Rs. {activeRevenue.toLocaleString()}.00
          </div>
          <div className="mt-1 flex items-center justify-between text-[11px]">
            <span className="text-emerald-600 font-semibold">
              {activeDataset.length} Transactions Settled
            </span>
            {revenueMode === 'shift' && dateFilter !== 'all' && (
              <span className="text-gray-400 font-mono">
                All: Rs. {allTimeCollected.toLocaleString()}
              </span>
            )}
          </div>
        </div>

        {/* Digital / Wallets Card */}
        <div className="p-4 bg-white rounded-xl border border-gray-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 flex items-center gap-1">
              <Smartphone className="w-3.5 h-3.5 text-purple-500" /> Digital / Wallets
            </span>
            <span className="text-[10px] font-bold text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded">
              eSewa/Khalti/QR
            </span>
          </div>
          <div className="mt-2 text-2xl font-bold text-purple-600 font-mono tracking-tight">
            Rs. {digitalCollected.toLocaleString()}.00
          </div>
          <span className="text-[11px] text-gray-400">
            {Math.round((digitalCollected / (activeRevenue || 1)) * 100)}% of {revenueMode === 'shift' ? 'shift' : 'total'}
          </span>
        </div>

        {/* POS Card EDC */}
        <div className="p-4 bg-white rounded-xl border border-gray-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 flex items-center gap-1">
              <CreditCard className="w-3.5 h-3.5 text-blue-500" /> POS Card EDC
            </span>
            <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
              Visa/MasterCard
            </span>
          </div>
          <div className="mt-2 text-2xl font-bold text-blue-600 font-mono tracking-tight">
            Rs. {cardCollected.toLocaleString()}.00
          </div>
          <span className="text-[11px] text-gray-400">
            {Math.round((cardCollected / (activeRevenue || 1)) * 100)}% of {revenueMode === 'shift' ? 'shift' : 'total'}
          </span>
        </div>

        {/* Cash Drawer Card */}
        <div className="p-4 bg-white rounded-xl border border-gray-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 flex items-center gap-1">
              <Banknote className="w-3.5 h-3.5 text-emerald-500" /> Cash Drawer
            </span>
            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
              Physical Cash
            </span>
          </div>
          <div className="mt-2 text-2xl font-bold text-emerald-600 font-mono tracking-tight">
            Rs. {cashCollected.toLocaleString()}.00
          </div>
          <span className="text-[11px] text-gray-400">
            {Math.round((cashCollected / (activeRevenue || 1)) * 100)}% of {revenueMode === 'shift' ? 'shift' : 'total'}
          </span>
        </div>
      </div>

      {/* Search & Method Filter Bar */}
      <div className="p-4 bg-white rounded-xl border border-gray-200 shadow-xs flex flex-col sm:flex-row gap-3 items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            id="search-payments-input"
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search by Transaction Ref, Order ID, Table #, Cashier..."
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:border-amber-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs font-bold"
            >
              ✕
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
          {/* Method Filter */}
          <select
            id="filter-payment-method"
            value={methodFilter}
            onChange={e => setMethodFilter(e.target.value)}
            className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-700 focus:outline-none focus:border-amber-500 font-semibold"
          >
            <option value="all">All Payment Methods</option>
            <option value="cash">Cash Only</option>
            <option value="card">Card POS</option>
            <option value="qr_wallet">All Digital / Wallets</option>
            <option value="esewa">eSewa</option>
            <option value="khalti">Khalti</option>
            <option value="fonepay">Fonepay</option>
          </select>

          {/* Dedicated Cashier Name Filter */}
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-semibold text-gray-700">
            <UserCheck className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
            <select
              id="filter-cashier-name"
              value={cashierFilter}
              onChange={e => setCashierFilter(e.target.value)}
              className="bg-transparent text-xs text-gray-800 font-semibold focus:outline-none cursor-pointer"
              title="Filter by Cashier / Staff member who settled the payment"
            >
              <option value="all">All Cashiers</option>
              {uniqueCashiers.map(c => (
                <option key={c} value={c}>
                  Cashier: {c}
                </option>
              ))}
            </select>
          </div>

          {(methodFilter !== 'all' || cashierFilter !== 'all' || searchQuery || dateFilter !== 'today') && (
            <button
              onClick={() => {
                setMethodFilter('all');
                setCashierFilter('all');
                setSearchQuery('');
                setDateFilter('today');
              }}
              className="px-2.5 py-2 text-xs font-semibold text-gray-500 hover:text-amber-600 hover:bg-gray-100 rounded-lg transition flex items-center gap-1 flex-shrink-0"
              title="Reset all filters to Today"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Reset</span>
            </button>
          )}
        </div>
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
                <th className="p-3.5">Payment Time</th>
                <th className="p-3.5">Method</th>
                <th className="p-3.5">Amount</th>
                <th className="p-3.5">Cashier</th>
                <th className="p-3.5 text-right">Receipt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 font-medium">
              {filteredPayments.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-12 text-center text-gray-400 text-xs">
                    <div className="max-w-sm mx-auto flex flex-col items-center">
                      <AlertCircle className="w-8 h-8 text-gray-300 mb-2" />
                      <p className="font-bold text-gray-600">No payment transactions found</p>
                      <p className="text-[11px] text-gray-400 mt-1">
                        No settlements recorded matching {getDateFilterLabel()}
                        {methodFilter !== 'all' ? ` and method "${methodFilter}"` : ''}.
                      </p>
                      <div className="mt-4 flex gap-2">
                        <button
                          onClick={() => setDateFilter('today')}
                          className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-amber-500 text-white hover:bg-amber-600 transition"
                        >
                          View Today
                        </button>
                        <button
                          onClick={() => setDateFilter('all')}
                          className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition"
                        >
                          View All Time
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredPayments.map(p => {
                  // Find linked order for table or receipt reprint
                  const linkedOrder = orders.find(
                    o =>
                      o.orderNumber === p.orderNumber ||
                      (p.orderNumber && p.orderNumber.includes(o.orderNumber)) ||
                      (p.orderId && o.id === p.orderId)
                  );

                  const tableNum = p.tableNumber ?? linkedOrder?.tableNumber;
                  const timeField = p.timestamp || p.createdAt || p.paidAt || linkedOrder?.paidAt || linkedOrder?.createdAt;
                  const timeInfo = formatPaymentDateTime(timeField);

                  return (
                    <tr key={p.id} className="hover:bg-gray-50/80 transition">
                      {/* Transaction Ref */}
                      <td className="p-3.5 font-mono font-bold text-gray-900">
                        <div className="flex items-center gap-1.5">
                          <span>{p.transactionRef || p.transactionReference || p.id}</span>
                        </div>
                      </td>

                      {/* Order Ref */}
                      <td className="p-3.5 font-mono text-gray-600">
                        {p.orderNumber || (linkedOrder ? linkedOrder.orderNumber : 'POS')}
                      </td>

                      {/* Table */}
                      <td className="p-3.5">
                        {tableNum != null ? (
                          <span className="font-bold text-gray-800 px-2 py-0.5 rounded-md bg-gray-100 border border-gray-200 font-mono text-[11px]">
                            Table {tableNum < 10 ? '0' + tableNum : tableNum}
                          </span>
                        ) : (
                          <span className="text-gray-400 italic text-[11px]">Direct / POS</span>
                        )}
                      </td>

                      {/* Payment Time - Recorded & Highlighted */}
                      <td className="p-3.5 font-mono">
                        <div className="flex items-center gap-1 text-gray-900 font-bold text-xs">
                          <Clock className="w-3 h-3 text-amber-500 flex-shrink-0" />
                          <span>{timeInfo.time}</span>
                        </div>
                        <div className="text-[10px] text-gray-400 font-medium pl-4">
                          {timeInfo.date}
                        </div>
                      </td>

                      {/* Method */}
                      <td className="p-3.5">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                            p.method === 'upi' || p.method === 'qr_wallet' || p.method === 'esewa' || p.method === 'khalti' || p.method === 'fonepay'
                              ? 'bg-purple-50 text-purple-700 border-purple-200'
                              : p.method === 'card'
                              ? 'bg-blue-50 text-blue-700 border-blue-200'
                              : p.method === 'cash'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}
                        >
                          {p.method}
                        </span>
                      </td>

                      {/* Amount */}
                      <td className="p-3.5 font-mono font-bold text-gray-900">
                        Rs. {(p.amount || 0).toLocaleString()}.00
                      </td>

                      {/* Cashier - Prominently Displayed */}
                      <td className="p-3.5">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-amber-100 text-amber-800 font-bold text-[10px] flex items-center justify-center flex-shrink-0 border border-amber-300">
                            {((p.cashierName || (p as any).settledBy || p.createdBy || 'C').charAt(0)).toUpperCase()}
                          </div>
                          <div>
                            <span className="font-bold text-gray-900 block text-xs">
                              {p.cashierName || (p as any).settledBy || p.createdBy || 'Cashier'}
                            </span>
                            <span className="text-[10px] text-gray-400 block -mt-0.5">
                              Settled By
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Receipt Action */}
                      <td className="p-3.5 text-right">
                        {linkedOrder ? (
                          <button
                            onClick={() => onOpenReceipt?.(linkedOrder)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-amber-600 hover:bg-amber-50 transition"
                            title="Reprint Customer Bill / Receipt"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              // Synthetic order for receipt printing if not found
                              const effectiveCashier = p.cashierName || (p as any).settledBy || p.createdBy || 'Cashier';
                              const synthOrder: Order = {
                                id: p.id,
                                orderNumber: p.orderNumber || p.id,
                                sessionId: p.sessionId || '',
                                tableId: `T${tableNum || 1}`,
                                tableNumber: tableNum || 1,
                                source: 'ADMIN_MANUAL',
                                status: 'completed',
                                subtotal: p.amount || 0,
                                discount: 0,
                                vat: 0,
                                total: p.amount || 0,
                                items: [],
                                createdAt: p.createdAt || p.timestamp || new Date().toISOString(),
                                updatedAt: p.createdAt || p.timestamp || new Date().toISOString(),
                                createdBy: effectiveCashier,
                                cashierName: effectiveCashier,
                                settledBy: effectiveCashier,
                                paymentStatus: 'paid',
                                paymentMethod: p.method as any,
                                paidAt: p.timestamp || p.createdAt,
                                finalAmount: p.amount || 0
                              };
                              onOpenReceipt?.(synthOrder);
                            }}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-amber-600 hover:bg-amber-50 transition"
                            title="Print Settlement Voucher"
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
