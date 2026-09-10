import React, { useState, useMemo } from 'react';
import { usePOS } from '../../context/POSContext';
import {
  TrendingUp,
  BarChart3,
  Calendar,
  Download,
  Users,
  Clock,
  Printer,
  CheckCircle2,
  FileSpreadsheet,
  Layers,
  ArrowDownToLine,
  Receipt,
  Flame,
  Sparkles,
  Eye,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

export type ReportRange = 'today' | 'week' | 'month' | 'all' | 'custom';

// Accurate timestamp parser supporting ISO strings, numeric timestamps, and SQL formats
const parseOrderTimestamp = (ts?: string | number): Date | null => {
  if (!ts) return null;
  if (typeof ts === 'number') {
    const d = new Date(ts);
    return isNaN(d.getTime()) ? null : d;
  }
  let d = new Date(ts);
  if (!isNaN(d.getTime())) return d;
  d = new Date(String(ts).replace(' ', 'T'));
  if (!isNaN(d.getTime())) return d;
  return null;
};

// 12-hour range label format (e.g. "12:00 PM - 01:00 PM")
const formatHourRange = (hour: number): string => {
  const startPeriod = hour >= 12 ? 'PM' : 'AM';
  const startH = hour % 12 === 0 ? 12 : hour % 12;
  const nextH = (hour + 1) % 24;
  const nextPeriod = nextH >= 12 ? 'PM' : 'AM';
  const nextHDisplay = nextH % 12 === 0 ? 12 : nextH % 12;
  return `${String(startH).padStart(2, '0')}:00 ${startPeriod} - ${String(nextHDisplay).padStart(2, '0')}:00 ${nextPeriod}`;
};

const formatHourShort = (hour: number): string => {
  const period = hour >= 12 ? 'PM' : 'AM';
  const h = hour % 12 === 0 ? 12 : hour % 12;
  return `${String(h).padStart(2, '0')}:00 ${period}`;
};

export const ReportsView: React.FC = () => {
  const { orders, payments, settings } = usePOS();
  const [reportRange, setReportRange] = useState<ReportRange>('today');
  const [rushViewMode, setRushViewMode] = useState<'active' | 'all'>('active');
  const [expandedHour, setExpandedHour] = useState<number | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });
  const [exportNotice, setExportNotice] = useState<string | null>(null);

  // Date filtering helper
  const isDateInRange = (dateStr?: string, range?: ReportRange): boolean => {
    const activeRange = range || reportRange;
    if (activeRange === 'all') return true;
    if (!dateStr) return false;
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return false;

    const now = new Date();
    if (activeRange === 'today') {
      return (
        d.getFullYear() === now.getFullYear() &&
        d.getMonth() === now.getMonth() &&
        d.getDate() === now.getDate()
      );
    }
    if (activeRange === 'custom') {
      if (!selectedDate) return true;
      const [y, m, day] = selectedDate.split('-').map(Number);
      return (
        d.getFullYear() === y &&
        d.getMonth() === m - 1 &&
        d.getDate() === day
      );
    }
    if (activeRange === 'week') {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(now.getDate() - 7);
      return d >= oneWeekAgo;
    }
    if (activeRange === 'month') {
      const oneMonthAgo = new Date();
      oneMonthAgo.setDate(now.getDate() - 30);
      return d >= oneMonthAgo;
    }
    return true;
  };

  // Filter orders by range and non-cancelled status
  const filteredOrders = useMemo(() => {
    return (orders || []).filter(
      o => o.status !== 'cancelled' && (o.status as any) !== 'CANCELLED' && isDateInRange(o.createdAt)
    );
  }, [orders, reportRange, selectedDate]);

  // Filter payments by range and paid status
  const filteredPayments = useMemo(() => {
    return (payments || []).filter(
      p => (p.status === 'completed' || p.status === 'PAID') && isDateInRange(p.createdAt || p.timestamp)
    );
  }, [payments, reportRange, selectedDate]);

  // Total sales: calculate from payments or fallback to orders
  const totalSales = useMemo(() => {
    const paymentsSum = filteredPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
    if (paymentsSum > 0) return paymentsSum;
    return filteredOrders.reduce((sum, o) => sum + (o.finalAmount ?? o.total ?? o.subtotal ?? 0), 0);
  }, [filteredPayments, filteredOrders]);

  const avgOrderValue = filteredOrders.length > 0 ? Math.round(totalSales / filteredOrders.length) : 0;
  const totalItemsSold = useMemo(() => {
    return filteredOrders.reduce((sum, o) => sum + (o.items || []).reduce((is, it) => is + (it.quantity || 1), 0), 0);
  }, [filteredOrders]);

  // Real Category sales breakdown dynamically computed from filtered orders
  const categorySales = useMemo(() => {
    const categoryTotals: Record<string, number> = {};
    let totalItemsRevenue = 0;

    filteredOrders.forEach(o => {
      (o.items || []).forEach(it => {
        const cat = it.category || 'General';
        const revenue = (it.price ?? it.priceSnapshot ?? 0) * (it.quantity || 1);
        categoryTotals[cat] = (categoryTotals[cat] || 0) + revenue;
        totalItemsRevenue += revenue;
      });
    });

    if (totalItemsRevenue === 0) {
      return [];
    }

    return Object.entries(categoryTotals)
      .map(([name, amount]) => ({
        name,
        amount: amount || 0,
        percent: Math.round(((amount || 0) / totalItemsRevenue) * 100)
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [filteredOrders]);

  // Real Hourly rush dynamically and accurately synchronized from actual order timestamps
  const hourlyRush = useMemo(() => {
    const hourBuckets: Record<number, {
      orders: number;
      sales: number;
      orderNumbers: string[];
      sampleTimes: string[];
    }> = {};

    // Standard business hours: 8:00 AM to 11:00 PM (hours 8..23)
    for (let h = 8; h <= 23; h++) {
      hourBuckets[h] = { orders: 0, sales: 0, orderNumbers: [], sampleTimes: [] };
    }

    filteredOrders.forEach(o => {
      const d = parseOrderTimestamp(o.createdAt || o.paidAt || o.updatedAt);
      const hour = d ? d.getHours() : 12;
      if (!hourBuckets[hour]) {
        hourBuckets[hour] = { orders: 0, sales: 0, orderNumbers: [], sampleTimes: [] };
      }
      hourBuckets[hour].orders += 1;
      const orderVal = (o.finalAmount ?? o.total ?? o.subtotal ?? 0);
      hourBuckets[hour].sales += orderVal;
      const orderRef = o.orderNumber || (o.id ? o.id.slice(-5) : 'ORD');
      if (!hourBuckets[hour].orderNumbers.includes(orderRef)) {
        hourBuckets[hour].orderNumbers.push(orderRef);
      }
      if (d) {
        const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        if (!hourBuckets[hour].sampleTimes.includes(timeStr) && hourBuckets[hour].sampleTimes.length < 3) {
          hourBuckets[hour].sampleTimes.push(timeStr);
        }
      }
    });

    const sortedHours = Object.keys(hourBuckets).map(Number).sort((a, b) => a - b);

    return sortedHours.map(hour => {
      const data = hourBuckets[hour];
      return {
        hourIndex: hour,
        hour: formatHourRange(hour),
        shortHour: formatHourShort(hour),
        orders: data.orders || 0,
        sales: data.sales || 0,
        avgTicket: data.orders > 0 ? Math.round(data.sales / data.orders) : 0,
        orderNumbers: data.orderNumbers,
        sampleTimes: data.sampleTimes
      };
    });
  }, [filteredOrders]);

  const maxHourlySales = Math.max(1, ...hourlyRush.map(h => h.sales));

  // Peak rush hour info
  const peakRushHour = useMemo(() => {
    const withSales = hourlyRush.filter(h => h.sales > 0);
    if (withSales.length === 0) return null;
    return withSales.reduce((max, curr) => (curr.sales > max.sales ? curr : max), withSales[0]);
  }, [hourlyRush]);

  // Latest synced order info
  const latestOrderSync = useMemo(() => {
    if (filteredOrders.length === 0) return null;
    const sorted = [...filteredOrders].sort((a, b) => {
      const da = parseOrderTimestamp(a.createdAt || a.paidAt || a.updatedAt)?.getTime() || 0;
      const db = parseOrderTimestamp(b.createdAt || b.paidAt || b.updatedAt)?.getTime() || 0;
      return db - da;
    });
    const latest = sorted[0];
    const d = parseOrderTimestamp(latest.createdAt || latest.paidAt || latest.updatedAt);
    return {
      orderNumber: latest.orderNumber || latest.id,
      time: d ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recently',
      table: latest.tableNumber
    };
  }, [filteredOrders]);

  // Active hours (hours with orders)
  const activeHoursList = useMemo(() => {
    return hourlyRush.filter(h => h.orders > 0);
  }, [hourlyRush]);

  const displayedRush = useMemo(() => {
    if (rushViewMode === 'active' && activeHoursList.length > 0) {
      return activeHoursList;
    }
    return hourlyRush;
  }, [rushViewMode, activeHoursList, hourlyRush]);

  // Export report to CSV (Excel format)
  const handleExportCSV = () => {
    try {
      const panNo = settings.panNumber || settings.panNo || '302194821';
      const restaurantName = settings.restaurantName || settings.name || 'The Fat Buddha Delight Restro & Cafe';
      const nowStr = new Date().toLocaleString();

      const reportingPeriodStr = reportRange === 'custom' ? `Specific Date (${selectedDate})` : reportRange.toUpperCase();

      const summaryRows = [
        `"RESTAURANT PERFORMANCE & SALES REPORT"`,
        `"Restaurant:","${restaurantName.replace(/"/g, '""')}"`,
        `"PAN NO:","${panNo}"`,
        `"Reporting Period:","${reportingPeriodStr}"`,
        `"Generated On:","${nowStr}"`,
        `""`,
        `"--- EXECUTIVE SUMMARY ---"`,
        `"Gross Sales (Rs.)",${totalSales.toFixed(2)}`,
        `"Total Orders",${filteredOrders.length}`,
        `"Average Order Value (Rs.)",${avgOrderValue.toFixed(2)}`,
        `"Total Items Sold",${totalItemsSold}`,
        `""`,
        `"--- CATEGORY SALES MIX ---"`,
        `"Category","Sales Revenue (Rs.)","Contribution Share (%)"`,
        ...categorySales.map(c => `"${c.name.replace(/"/g, '""')}",${c.amount.toFixed(2)},${c.percent}%`),
        `""`,
        `"--- HOURLY RUSH BREAKDOWN ---"`,
        `"Time Slot","Order Count","Sales Volume (Rs.)"`,
        ...hourlyRush.map(h => `"${h.hour}",${h.orders},${h.sales.toFixed(2)}`),
        `""`,
        `"--- DETAILED ORDER TRANSACTIONS ---"`,
        `"Order ID","Table Number","Timestamp","Guest Name","Ordered Items","Subtotal (Rs.)","Discount (Rs.)","VAT (Rs.)","Final Total (Rs.)","Status","Payment Method"`
      ];

      const orderRows = filteredOrders.map(o => {
        const itemsText = (o.items || [])
          .map(it => `${it.nameSnapshot || it.name || 'Item'} x${it.quantity || 1}`)
          .join('; ');
        const dateText = o.createdAt ? new Date(o.createdAt).toLocaleString() : '-';

        return [
          `"${o.orderNumber || o.id}"`,
          `"Table ${o.tableNumber || '-'}"`,
          `"${dateText}"`,
          `"${(o.guestName || 'Walk-in Guest').replace(/"/g, '""')}"`,
          `"${itemsText.replace(/"/g, '""')}"`,
          (o.subtotal || 0).toFixed(2),
          (o.discount || o.discountAmount || 0).toFixed(2),
          (o.vat || o.taxAmount || 0).toFixed(2),
          (o.finalAmount ?? o.total ?? 0).toFixed(2),
          `"${o.status}"`,
          `"${o.paymentMethod || 'cash'}"`
        ].join(',');
      });

      const fullCsv = '\uFEFF' + [...summaryRows, ...orderRows].join('\r\n');
      const blob = new Blob([fullCsv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const filePeriod = reportRange === 'custom' ? `Date_${selectedDate}` : `${reportRange}_${new Date().toISOString().slice(0, 10)}`;
      link.download = `Fat_Buddha_Report_${filePeriod}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setExportNotice(`Report for ${reportRange === 'custom' ? selectedDate : reportRange} successfully exported as Excel/CSV!`);
      setTimeout(() => setExportNotice(null), 3500);
    } catch (err) {
      console.error('Failed to export CSV:', err);
      setExportNotice('Failed to generate CSV export. Please try again.');
    }
  };

  // Trigger Print / PDF document
  const handlePrintReport = () => {
    window.print();
  };

  return (
    <div id="reports-view" className="space-y-6">
      {/* Notification banner */}
      {exportNotice && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex items-center justify-between shadow-xs animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{exportNotice}</span>
          </div>
          <button
            onClick={() => setExportNotice(null)}
            className="text-emerald-700 hover:text-emerald-900 text-xs font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* Header */}
      <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-gray-900 tracking-tight">
              Restaurant Performance &amp; Analytics
            </h2>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-50 text-amber-700 border border-amber-200">
              PAN: {settings.panNumber || settings.panNo || '302194821'}
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">
            Key financial insights, kitchen velocity, table turnover and category sales mix.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Range Selector with Calendar Date Picker */}
          <div className="flex flex-wrap items-center bg-gray-100 p-1 rounded-lg border border-gray-200 text-xs gap-1">
            <button
              onClick={() => setReportRange('today')}
              className={`px-3 py-1.5 rounded-md font-semibold transition ${
                reportRange === 'today' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Today
            </button>
            <button
              onClick={() => setReportRange('week')}
              className={`px-3 py-1.5 rounded-md font-semibold transition ${
                reportRange === 'week' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              This Week
            </button>
            <button
              onClick={() => setReportRange('month')}
              className={`px-3 py-1.5 rounded-md font-semibold transition ${
                reportRange === 'month' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              This Month
            </button>
            <button
              onClick={() => setReportRange('all')}
              className={`px-3 py-1.5 rounded-md font-semibold transition ${
                reportRange === 'all' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              All Time
            </button>

            {/* Calendar Selector next to range buttons */}
            <div
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md border transition ${
                reportRange === 'custom'
                  ? 'bg-white text-gray-900 border-amber-400 shadow-xs ring-1 ring-amber-400/40'
                  : 'bg-white/80 text-gray-600 border-gray-300 hover:border-gray-400'
              }`}
            >
              <Calendar className={`w-3.5 h-3.5 ${reportRange === 'custom' ? 'text-amber-600' : 'text-gray-500'}`} />
              <input
                id="report-calendar-input"
                type="date"
                value={selectedDate}
                onChange={(e) => {
                  if (e.target.value) {
                    setSelectedDate(e.target.value);
                    setReportRange('custom');
                  }
                }}
                className="bg-transparent text-xs font-semibold text-gray-800 focus:outline-none cursor-pointer"
                title="Select specific date to view and export reports"
              />
              {reportRange === 'custom' && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">
                  Active
                </span>
              )}
            </div>
          </div>

          {/* Export Actions */}
          <div className="flex items-center gap-1.5">
            <button
              id="btn-export-csv"
              onClick={handleExportCSV}
              className="px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs transition"
              title="Download Excel / CSV spreadsheet"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV (Excel)</span>
            </button>

            <button
              id="btn-print-report"
              onClick={handlePrintReport}
              className="px-3 py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 border border-gray-200 transition"
              title="Print or Save as PDF"
            >
              <Printer className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Print / PDF</span>
            </button>
          </div>
        </div>
      </div>

      {/* Top metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-white rounded-xl border border-gray-200 shadow-xs">
          <span className="text-xs font-semibold text-gray-500">Gross Sales</span>
          <div className="mt-2 text-2xl font-bold text-gray-900 font-mono">
            Rs. {totalSales.toFixed(2)}
          </div>
          <span className="text-[11px] text-gray-400 font-medium">
            {reportRange === 'today'
              ? 'Today settled revenue'
              : reportRange === 'custom'
              ? `Settled on ${selectedDate}`
              : `Settled revenue (${reportRange})`}
          </span>
        </div>

        <div className="p-4 bg-white rounded-xl border border-gray-200 shadow-xs">
          <span className="text-xs font-semibold text-gray-500">Average Ticket (AOV)</span>
          <div className="mt-2 text-2xl font-bold text-amber-600 font-mono">
            Rs. {avgOrderValue.toFixed(2)}
          </div>
          <span className="text-[11px] text-gray-400 font-medium">Across {filteredOrders.length} order covers</span>
        </div>

        <div className="p-4 bg-white rounded-xl border border-gray-200 shadow-xs">
          <span className="text-xs font-semibold text-gray-500">Total Orders</span>
          <div className="mt-2 text-2xl font-bold text-blue-600 font-mono">{filteredOrders.length}</div>
          <span className="text-[11px] text-gray-400 font-medium">Completed &amp; in-progress</span>
        </div>

        <div className="p-4 bg-white rounded-xl border border-gray-200 shadow-xs">
          <span className="text-xs font-semibold text-gray-500">Total Items Sold</span>
          <div className="mt-2 text-2xl font-bold text-teal-600 font-mono">
            {totalItemsSold}
          </div>
          <span className="text-[11px] text-gray-400 font-medium">Food &amp; beverage items</span>
        </div>
      </div>

      {/* 2-Column: Hourly Rush & Category Mix */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Hourly Rush Bar Chart - Synchronized with actual order timestamps */}
        <div id="hourly-sales-rush-card" className="p-5 bg-white rounded-xl border border-gray-200 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2 border-b border-gray-100">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-amber-50 text-amber-700 flex items-center justify-center border border-amber-200/60">
                  <Clock className="w-3.5 h-3.5" />
                </div>
                <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                  Hourly Sales &amp; Customer Rush Peak
                </h3>
              </div>
              <p className="text-[11px] text-gray-500 mt-0.5 flex items-center gap-1.5 flex-wrap">
                <span>Synchronized in real-time with order timestamps</span>
                {latestOrderSync && (
                  <span className="text-gray-400">• Latest: Table {latestOrderSync.table || '-'} at {latestOrderSync.time}</span>
                )}
              </p>
            </div>

            {/* View Mode Toggle: Active Hours vs Full Timeline */}
            <div className="flex items-center gap-1 bg-gray-100 p-0.5 rounded-lg text-[11px] self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setRushViewMode('active')}
                className={`px-2.5 py-1 rounded-md font-semibold transition ${
                  rushViewMode === 'active'
                    ? 'bg-white text-gray-900 shadow-xs'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
                title="Show only time slots with recorded orders"
              >
                Active Rush ({activeHoursList.length})
              </button>
              <button
                type="button"
                onClick={() => setRushViewMode('all')}
                className={`px-2.5 py-1 rounded-md font-semibold transition ${
                  rushViewMode === 'all'
                    ? 'bg-white text-gray-900 shadow-xs'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
                title="Show full operational day timeline (8 AM - 11 PM)"
              >
                Full Day
              </button>
            </div>
          </div>

          {/* Peak Rush Highlight Banner if sales recorded */}
          {peakRushHour && peakRushHour.sales > 0 && (
            <div className="p-3 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/80 rounded-xl flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 min-w-0">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-500 text-white flex-shrink-0 shadow-xs">
                  <Flame className="w-3.5 h-3.5" />
                </span>
                <div className="truncate">
                  <span className="font-bold text-amber-950 block text-xs">
                    Peak Dining Rush: {peakRushHour.hour}
                  </span>
                  <span className="text-[11px] text-amber-800/80">
                    Highest volume with {peakRushHour.orders} {peakRushHour.orders === 1 ? 'order' : 'orders'}
                  </span>
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <span className="font-mono font-bold text-amber-900 text-xs block">
                  Rs. {peakRushHour.sales.toLocaleString()}.00
                </span>
                <span className="text-[10px] text-amber-700 font-medium">
                  Avg: Rs. {peakRushHour.avgTicket}/ticket
                </span>
              </div>
            </div>
          )}

          {/* Hourly Slots List */}
          <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
            {displayedRush.length === 0 ? (
              <div className="py-8 text-center text-gray-400 text-xs flex flex-col items-center justify-center">
                <Clock className="w-8 h-8 text-gray-300 mb-2 stroke-[1.5]" />
                <p className="font-semibold text-gray-600">No orders recorded for this period</p>
                <p className="text-[11px] text-gray-400 mt-0.5">Orders placed in the POS will automatically synchronize here by timestamp.</p>
              </div>
            ) : (
              displayedRush.map(h => {
                const isPeak = peakRushHour && peakRushHour.sales > 0 && h.hourIndex === peakRushHour.hourIndex;
                const isExpanded = expandedHour === h.hourIndex;
                const hasOrders = h.orders > 0;
                const percent = maxHourlySales > 0 ? (h.sales / maxHourlySales) * 100 : 0;

                return (
                  <div
                    key={h.hourIndex}
                    className={`p-2.5 rounded-lg border transition-all ${
                      isPeak
                        ? 'bg-amber-50/50 border-amber-200'
                        : hasOrders
                        ? 'bg-white border-gray-100 hover:border-gray-200'
                        : 'bg-gray-50/50 border-transparent opacity-60'
                    }`}
                  >
                    <div
                      className={`flex items-center justify-between text-xs ${hasOrders ? 'cursor-pointer select-none' : ''}`}
                      onClick={() => hasOrders && setExpandedHour(isExpanded ? null : h.hourIndex)}
                      title={hasOrders ? "Click to view synchronized orders for this hour" : undefined}
                    >
                      <div className="flex items-center gap-2">
                        <span className={`font-semibold ${hasOrders ? 'text-gray-900' : 'text-gray-500'}`}>
                          {h.hour}
                        </span>
                        {isPeak && (
                          <span className="px-1.5 py-0.5 bg-amber-500 text-white rounded text-[10px] font-bold tracking-wide uppercase flex items-center gap-0.5">
                            <Flame className="w-2.5 h-2.5" /> Peak
                          </span>
                        )}
                        {hasOrders && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 font-medium">
                            {h.orders} {h.orders === 1 ? 'order' : 'orders'}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <span className={`font-mono font-bold ${hasOrders ? 'text-amber-600' : 'text-gray-400'}`}>
                          Rs. {h.sales.toLocaleString()}.00
                        </span>
                        {hasOrders && (
                          <span className="text-gray-400">
                            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Progress Visualizer */}
                    <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden mt-1.5">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          isPeak
                            ? 'bg-gradient-to-r from-amber-500 to-orange-500'
                            : hasOrders
                            ? 'bg-amber-500'
                            : 'bg-transparent'
                        }`}
                        style={{ width: `${percent}%` }}
                      />
                    </div>

                    {/* Expandable Order Details for this hour */}
                    {isExpanded && hasOrders && (
                      <div className="mt-2 pt-2 border-t border-gray-100 text-[11px] text-gray-600 flex flex-wrap items-center gap-1.5 animate-in fade-in duration-150">
                        <span className="text-gray-400 font-medium">Synchronized Orders:</span>
                        {h.orderNumbers.map(ref => (
                          <span key={ref} className="px-1.5 py-0.5 bg-white border border-gray-200 rounded font-mono font-bold text-gray-800 text-[10px]">
                            #{ref}
                          </span>
                        ))}
                        {h.sampleTimes.length > 0 && (
                          <span className="text-gray-400 text-[10px] ml-auto">
                            Times: {h.sampleTimes.join(', ')}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Footer Sync Notice */}
          <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-[10.5px] text-gray-400">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Exact order timestamps mapped ({filteredOrders.length} total)</span>
            </span>
            <span>Avg Ticket: Rs. {avgOrderValue.toLocaleString()}</span>
          </div>
        </div>

        {/* Category Sales Breakdown */}
        <div className="p-5 bg-white rounded-xl border border-gray-200 shadow-xs space-y-4">
          <div>
            <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
              Category Sales Mix
            </h3>
            <p className="text-xs text-gray-500">Revenue contribution per menu department</p>
          </div>

          <div className="space-y-3.5 pt-2">
            {categorySales.length === 0 ? (
              <div className="py-12 text-center text-gray-400 text-xs">
                No category sales recorded for this period
              </div>
            ) : (
              categorySales.map((cat, i) => (
                <div key={i} className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-gray-800">{cat.name}</span>
                    <span className="font-mono text-gray-900">
                      Rs. {cat.amount.toFixed(2)} ({cat.percent}%)
                    </span>
                  </div>
                  <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-amber-500 rounded-full transition-all duration-500"
                      style={{ width: `${cat.percent}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Orders Ledger Summary Table */}
      <div className="p-5 bg-white rounded-xl border border-gray-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
              Order Transactions Ledger ({filteredOrders.length})
            </h3>
            <p className="text-xs text-gray-500">Detailed bills for the selected period</p>
          </div>
          <button
            onClick={handleExportCSV}
            className="text-xs font-bold text-amber-600 hover:text-amber-700 flex items-center gap-1"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Table as CSV</span>
          </button>
        </div>

        {filteredOrders.length === 0 ? (
          <div className="py-10 text-center text-gray-400 text-xs">
            No orders found for this range. Switch to "All Time" to view previous orders.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-gray-200 text-[11px] font-bold text-gray-500 uppercase">
                  <th className="pb-2">Order #</th>
                  <th className="pb-2">Table</th>
                  <th className="pb-2">Date / Time</th>
                  <th className="pb-2">Items</th>
                  <th className="pb-2 text-right">Amount (Rs.)</th>
                  <th className="pb-2 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium">
                {filteredOrders.slice(0, 15).map(o => (
                  <tr key={o.id} className="hover:bg-gray-50/80">
                    <td className="py-2.5 font-mono font-bold text-gray-900">
                      {o.orderNumber || o.id}
                    </td>
                    <td className="py-2.5 text-gray-700 font-semibold">
                      Table {o.tableNumber}
                    </td>
                    <td className="py-2.5 text-gray-500 text-[11px]">
                      {o.createdAt ? new Date(o.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}
                    </td>
                    <td className="py-2.5 text-gray-700 max-w-xs truncate">
                      {(o.items || []).map(i => `${i.nameSnapshot || i.name || 'Item'} (${i.quantity})`).join(', ')}
                    </td>
                    <td className="py-2.5 text-right font-mono font-bold text-gray-900">
                      Rs. {(o.finalAmount ?? o.total ?? 0).toFixed(2)}
                    </td>
                    <td className="py-2.5 text-center">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {o.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredOrders.length > 15 && (
              <div className="pt-3 text-center text-xs text-gray-500">
                Showing first 15 of {filteredOrders.length} orders. Export CSV to view all records.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Printable Report Document (visible ONLY during @media print) */}
      <div id="printable-report" className="hidden print:block space-y-6 text-black">
        <div className="border-b-2 border-black pb-4 flex justify-between items-start">
          <div>
            <h1 className="text-xl font-bold uppercase tracking-wide">
              {settings.restaurantName || settings.name || 'The Fat Buddha Delight Restro & Cafe'}
            </h1>
            <p className="text-xs text-gray-800">{settings.address || 'Kathmandu, Nepal'}</p>
            <p className="text-xs font-mono font-bold mt-1">
              PAN NO: {settings.panNumber || settings.panNo || '302194821'}
            </p>
          </div>
          <div className="text-right">
            <h2 className="text-sm font-bold uppercase">Performance &amp; Sales Report</h2>
            <p className="text-xs text-gray-700">
              Period: <span className="font-bold">{reportRange === 'custom' ? selectedDate : reportRange.toUpperCase()}</span>
            </p>
            <p className="text-[11px] text-gray-500">
              Generated: {new Date().toLocaleString()}
            </p>
          </div>
        </div>

        {/* Executive summary grid */}
        <div className="grid grid-cols-4 gap-4 py-3 border-b border-gray-300">
          <div className="p-3 border border-gray-300 rounded">
            <div className="text-[11px] text-gray-600 font-semibold uppercase">Gross Sales</div>
            <div className="text-lg font-bold font-mono mt-1">Rs. {totalSales.toFixed(2)}</div>
          </div>
          <div className="p-3 border border-gray-300 rounded">
            <div className="text-[11px] text-gray-600 font-semibold uppercase">Total Orders</div>
            <div className="text-lg font-bold font-mono mt-1">{filteredOrders.length}</div>
          </div>
          <div className="p-3 border border-gray-300 rounded">
            <div className="text-[11px] text-gray-600 font-semibold uppercase">Average Ticket (AOV)</div>
            <div className="text-lg font-bold font-mono mt-1">Rs. {avgOrderValue.toFixed(2)}</div>
          </div>
          <div className="p-3 border border-gray-300 rounded">
            <div className="text-[11px] text-gray-600 font-semibold uppercase">Items Sold</div>
            <div className="text-lg font-bold font-mono mt-1">{totalItemsSold}</div>
          </div>
        </div>

        {/* Category Sales Breakdown Table */}
        <div>
          <h3 className="text-xs font-bold uppercase mb-2">Category Sales Contribution</h3>
          <table className="w-full text-left text-xs border border-gray-300 border-collapse">
            <thead>
              <tr className="bg-gray-100 border-b border-gray-300">
                <th className="p-2">Category</th>
                <th className="p-2 text-right">Revenue (Rs.)</th>
                <th className="p-2 text-right">Contribution Share</th>
              </tr>
            </thead>
            <tbody>
              {categorySales.map((cat, i) => (
                <tr key={i} className="border-b border-gray-200">
                  <td className="p-2">{cat.name}</td>
                  <td className="p-2 text-right font-mono">Rs. {cat.amount.toFixed(2)}</td>
                  <td className="p-2 text-right">{cat.percent}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Hourly Rush */}
        <div>
          <h3 className="text-xs font-bold uppercase mb-2">Hourly Dining Rush</h3>
          <table className="w-full text-left text-xs border border-gray-300 border-collapse">
            <thead>
              <tr className="bg-gray-100 border-b border-gray-300">
                <th className="p-2">Hour Slot</th>
                <th className="p-2 text-center">Orders Count</th>
                <th className="p-2 text-right">Sales Amount (Rs.)</th>
              </tr>
            </thead>
            <tbody>
              {hourlyRush.map((h, i) => (
                <tr key={i} className="border-b border-gray-200">
                  <td className="p-2">{h.hour}</td>
                  <td className="p-2 text-center">{h.orders}</td>
                  <td className="p-2 text-right font-mono">Rs. {h.sales.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Orders Ledger */}
        <div>
          <h3 className="text-xs font-bold uppercase mb-2">Detailed Orders Ledger</h3>
          <table className="w-full text-left text-[11px] border border-gray-300 border-collapse">
            <thead>
              <tr className="bg-gray-100 border-b border-gray-300">
                <th className="p-1.5">Order #</th>
                <th className="p-1.5">Table</th>
                <th className="p-1.5">Time</th>
                <th className="p-1.5">Items</th>
                <th className="p-1.5 text-right">Total (Rs.)</th>
                <th className="p-1.5 text-center">Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map(o => (
                <tr key={o.id} className="border-b border-gray-200">
                  <td className="p-1.5 font-mono">{o.orderNumber || o.id}</td>
                  <td className="p-1.5">Table {o.tableNumber}</td>
                  <td className="p-1.5">{o.createdAt ? new Date(o.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}</td>
                  <td className="p-1.5 truncate max-w-[200px]">
                    {(o.items || []).map(it => `${it.nameSnapshot || it.name} (${it.quantity})`).join(', ')}
                  </td>
                  <td className="p-1.5 text-right font-mono">Rs. {(o.finalAmount ?? o.total ?? 0).toFixed(2)}</td>
                  <td className="p-1.5 text-center">{o.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="pt-4 border-t border-gray-300 text-center text-[10px] text-gray-500">
          Generated automatically by The Fat Buddha Delight POS &amp; Restaurant Operations Suite • All rights reserved.
        </div>
      </div>
    </div>
  );
};
