import React, { useState, useMemo } from 'react';
import { usePOS } from '../../context/POSContext';
import { AdminTab, Table, Order } from '../../types';
import {
  TrendingUp,
  ShoppingBag,
  Layers,
  ChefHat,
  Package,
  ArrowRight,
  CreditCard,
  Banknote,
  QrCode,
  AlertCircle,
  Clock,
  Sparkles,
  CheckCircle2,
  Receipt,
  Utensils,
  RotateCcw,
  RefreshCw
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer
} from 'recharts';

interface DashboardViewProps {
  onNavigateTab: (tabId: AdminTab) => void;
  onOpenTable?: (tableNumber: number) => void;
  onOpenReceipt?: (order: Order) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onNavigateTab,
  onOpenTable,
  onOpenReceipt
}) => {
  const { tables, orders, kots, inventory, payments, isCloudSynced, resetToDemoData } = usePOS();
  const [salesTimeframe, setSalesTimeframe] = useState<'today' | 'week' | 'month'>('today');
  const [isResetting, setIsResetting] = useState(false);

  // Dynamic greeting based on time
  const currentHour = new Date().getHours();
  const timeGreeting = currentHour < 12 ? 'Good morning' : currentHour < 17 ? 'Good afternoon' : 'Good evening';

  // Handle fresh slate reset
  const handleFreshReset = async () => {
    if (window.confirm('Reset all 10 tables to Available and clear transaction orders/KOTs for a clean initial development slate?')) {
      try {
        setIsResetting(true);
        await resetToDemoData();
      } finally {
        setIsResetting(false);
      }
    }
  };

  // Real-time Metrics Calculation with strictly real Firestore data
  const activeTablesCount = tables.filter(
    t => {
      const statusUpper = (t.status || '').toUpperCase();
      return (statusUpper === 'OCCUPIED' || statusUpper === 'BILLING') &&
        Boolean((t.totalBill && t.totalBill > 0) || (t.activeOrdersCount && t.activeOrdersCount > 0));
    }
  ).length;

  const totalTablesCount = 10;
  const occupiedPercent = Math.round((activeTablesCount / totalTablesCount) * 100);

  // Today's non-cancelled real orders from Firestore
  const todayOrders = orders.filter(o => o.status !== 'CANCELLED' && (o.status as any) !== 'cancelled');
  const todayOrdersCount = todayOrders.length;

  // Real-time revenue from actual paid payment records
  const completedPayments = payments.filter(p => p.status === 'PAID' || (p.status as any) === 'completed');
  const totalRevenue = completedPayments.reduce((sum, p) => sum + (p.amount || 0), 0);

  // Pending KOTs in progress or awaiting preparation
  const pendingKots = kots.filter(k => {
    const st = (k.status || '').toUpperCase();
    return st === 'PENDING' || st === 'PREPARING' || st === 'PRINTING' || st === 'IN_PROGRESS';
  });
  const pendingKotsCount = pendingKots.length;

  const kitchenKotsCount = pendingKots.filter(
    k => (k.destination || '').toUpperCase() === 'KITCHEN' || k.station === 'Wok & Pan' || k.station === 'Tandoor & Clay' || k.station === 'Main Kitchen'
  ).length;

  const receptionKotsCount = pendingKots.filter(
    k => (k.destination || '').toUpperCase() === 'RECEPTION' || k.station === 'Beverage & Barista' || k.station === 'Dessert & Bakery'
  ).length;

  // Actual items sold from non-cancelled real orders
  const totalItemsSold = todayOrders.reduce(
    (sum, o) => sum + (o.items || []).reduce((iSum, it) => iSum + (it.quantity || 0), 0),
    0
  );

  // Actual payment breakdown
  const cashPayments = completedPayments
    .filter(p => (p.method || '').toUpperCase() === 'CASH')
    .reduce((sum, p) => sum + (p.amount || 0), 0);

  const cardPayments = completedPayments
    .filter(p => (p.method || '').toUpperCase() === 'CARD')
    .reduce((sum, p) => sum + (p.amount || 0), 0);

  const qrPayments = completedPayments
    .filter(p => (p.method || '').toUpperCase() === 'QR_WALLET' || (p.method || '').toLowerCase() === 'upi')
    .reduce((sum, p) => sum + (p.amount || 0), 0);

  // Real-time low stock items from inventory
  const lowStockList = inventory.filter(
    item => (item.currentStock || 0) <= (item.minimumStock || item.minThreshold || 0) || (item.status as any) === 'low_stock' || (item.status as any) === 'out_of_stock'
  );
  const lowStockCount = lowStockList.length;

  // Hourly sales buckets based purely on actual completed payments
  const hourlySalesData = useMemo(() => {
    const buckets = [
      { time: '10 AM', hour: 10, amount: 0 },
      { time: '12 PM', hour: 12, amount: 0 },
      { time: '2 PM', hour: 14, amount: 0 },
      { time: '4 PM', hour: 16, amount: 0 },
      { time: '6 PM', hour: 18, amount: 0 },
      { time: '8 PM', hour: 20, amount: 0 },
      { time: '10 PM', hour: 22, amount: 0 }
    ];

    if (completedPayments.length === 0) {
      return buckets.map(b => ({ time: b.time, amount: 0 }));
    }

    completedPayments.forEach(p => {
      let paymentHour = -1;
      if (p.createdAt) {
        const d = new Date(p.createdAt);
        if (!isNaN(d.getTime())) {
          paymentHour = d.getHours();
        }
      }
      if (paymentHour === -1) {
        const timeStr = (p.createdAt || (p as any).timestamp || '').toUpperCase();
        if (timeStr.includes('10') && timeStr.includes('AM')) paymentHour = 10;
        else if (timeStr.includes('12') && timeStr.includes('PM')) paymentHour = 12;
        else if (timeStr.includes('2') && timeStr.includes('PM')) paymentHour = 14;
        else if (timeStr.includes('4') && timeStr.includes('PM')) paymentHour = 16;
        else if (timeStr.includes('6') && timeStr.includes('PM')) paymentHour = 18;
        else if (timeStr.includes('8') && timeStr.includes('PM')) paymentHour = 20;
        else if (timeStr.includes('10') && timeStr.includes('PM')) paymentHour = 22;
      }

      if (paymentHour >= 0) {
        let closest = buckets[0];
        let minDiff = Math.abs(buckets[0].hour - paymentHour);
        for (let i = 1; i < buckets.length; i++) {
          const diff = Math.abs(buckets[i].hour - paymentHour);
          if (diff < minDiff) {
            minDiff = diff;
            closest = buckets[i];
          }
        }
        closest.amount += p.amount || 0;
      }
    });

    return buckets.map(({ time, amount }) => ({ time, amount }));
  }, [completedPayments]);

  const hasSalesData = totalRevenue > 0;

  // Table status style helper
  const getTableStatusStyle = (table: Table) => {
    const statusUpper = (table.status || '').toUpperCase();
    const isOccupied = (statusUpper === 'OCCUPIED' || statusUpper === 'BILLING') &&
      Boolean(table.activeSessionId || table.currentSessionId || (table.totalBill && table.totalBill > 0) || (table.activeOrdersCount && table.activeOrdersCount > 0));

    if (!isOccupied) {
      return {
        bg: 'bg-emerald-500',
        border: 'border-slate-800 hover:border-emerald-500/40',
        badgeBg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
        text: 'Available'
      };
    }

    if (statusUpper === 'BILLING') {
      return {
        bg: 'bg-amber-400 animate-pulse',
        border: 'border-amber-500/40 bg-amber-500/10',
        badgeBg: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
        text: 'Billing'
      };
    }

    return {
      bg: 'bg-rose-500',
      border: 'border-rose-500/40 bg-rose-500/10',
      badgeBg: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
      text: 'Occupied'
    };
  };

  // Order status badge helper
  const getOrderStatusBadge = (status: Order['status']) => {
    switch (status) {
      case 'placed':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
      case 'preparing':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/40';
      case 'ready':
        return 'bg-purple-500/20 text-purple-300 border-purple-500/40';
      case 'served':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
      case 'completed':
        return 'bg-slate-700/50 text-slate-300 border-slate-600';
      case 'cancelled':
        return 'bg-rose-500/20 text-rose-300 border-rose-500/40';
      default:
        return 'bg-slate-800 text-slate-400 border-slate-700';
    }
  };

  return (
    <div id="admin-dashboard" className="space-y-6 text-slate-100">
      {/* Top Greeting Bar matching Navigation Panel */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-[#111827] via-[#161F30] to-[#111827] border border-slate-800 shadow-lg shadow-black/20">
        <div>
          <div className="flex items-center gap-3">
            <h1 id="dashboard-title" className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              {timeGreeting}, Admin
            </h1>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Firestore Live</span>
            </div>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Real-time live operational overview for <span className="text-amber-400 font-semibold">The Fat Buddha Delight Restro &amp; Cafe</span> (10 Tables).
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          <button
            id="btn-dashboard-fresh-slate"
            onClick={handleFreshReset}
            disabled={isResetting}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#161F30] hover:bg-[#1f2b42] text-slate-200 border border-slate-700 hover:border-amber-500/40 shadow-xs transition"
            title="Reset tables to Available and clear test orders for a clean slate"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${isResetting ? 'animate-spin text-amber-400' : 'text-amber-400'}`} />
            <span>{isResetting ? 'Resetting...' : 'Fresh Slate'}</span>
          </button>
          <div className="flex items-center gap-2 text-xs text-amber-400/90 font-medium px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20">
            <Clock className="w-3.5 h-3.5" />
            <span>
              {new Date().toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
                year: 'numeric'
              })}
            </span>
          </div>
        </div>
      </div>

      {/* 6 Top Operational KPI Cards - Dark & Amber Palette */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3.5">
        {/* KPI 1: Today's Sales */}
        <div id="kpi-today-sales" className="bg-[#111827] p-4 rounded-xl border border-slate-800 hover:border-amber-500/30 shadow-md flex flex-col justify-between transition group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Today's Sales</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center group-hover:scale-105 transition">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-xl font-bold text-white font-mono">
              Rs. {(totalRevenue || 0).toFixed(2)}
            </div>
            <div className="text-[11px] text-slate-400 font-medium mt-1">
              {completedPayments.length} completed bills
            </div>
          </div>
        </div>

        {/* KPI 2: Today's Orders */}
        <div id="kpi-today-orders" className="bg-[#111827] p-4 rounded-xl border border-slate-800 hover:border-amber-500/30 shadow-md flex flex-col justify-between transition group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Today's Orders</span>
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center group-hover:scale-105 transition">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-xl font-bold text-white font-mono">
              {todayOrdersCount}
            </div>
            <div className="text-[11px] text-slate-400 font-medium mt-1">
              Active order tickets
            </div>
          </div>
        </div>

        {/* KPI 3: Active Tables */}
        <div id="kpi-active-tables" className="bg-[#111827] p-4 rounded-xl border border-slate-800 hover:border-amber-500/30 shadow-md flex flex-col justify-between transition group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Active Tables</span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center group-hover:scale-105 transition">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-xl font-bold text-amber-400 font-mono">
              {activeTablesCount} / {totalTablesCount}
            </div>
            <div className="text-[11px] text-slate-400 font-medium mt-1">
              {occupiedPercent}% Occupied
            </div>
          </div>
        </div>

        {/* KPI 4: Pending KOT */}
        <div id="kpi-pending-kot" className="bg-[#111827] p-4 rounded-xl border border-slate-800 hover:border-amber-500/30 shadow-md flex flex-col justify-between transition group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Pending KOT</span>
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center justify-center group-hover:scale-105 transition">
              <ChefHat className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <div className="text-xl font-bold text-white font-mono">
              {pendingKotsCount}
            </div>
            <button
              id="btn-view-kot-dashboard"
              onClick={() => onNavigateTab('kot')}
              className="text-[11px] text-amber-400 hover:text-amber-300 font-bold flex items-center gap-0.5"
            >
              <span>View KOT</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* KPI 5: Total Items Sold */}
        <div id="kpi-items-sold" className="bg-[#111827] p-4 rounded-xl border border-slate-800 hover:border-amber-500/30 shadow-md flex flex-col justify-between transition group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Total Items Sold</span>
            <div className="w-8 h-8 rounded-lg bg-teal-500/10 text-teal-400 border border-teal-500/20 flex items-center justify-center group-hover:scale-105 transition">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <div className="text-xl font-bold text-white font-mono">
              {totalItemsSold}
            </div>
            <button
              id="btn-view-reports-dashboard"
              onClick={() => onNavigateTab('reports')}
              className="text-[11px] text-teal-400 hover:text-teal-300 font-bold flex items-center gap-0.5"
            >
              <span>Reports</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* KPI 6: Low Stock Alerts */}
        <div id="kpi-low-stock" className="bg-[#111827] p-4 rounded-xl border border-slate-800 hover:border-amber-500/30 shadow-md flex flex-col justify-between transition group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Low Stock Alerts</span>
            <div className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center justify-center group-hover:scale-105 transition">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <div className="text-xl font-bold text-white font-mono">
              {lowStockCount}
            </div>
            <button
              id="btn-view-inventory-dashboard"
              onClick={() => onNavigateTab('inventory')}
              className="text-[11px] text-rose-400 hover:text-rose-300 font-bold flex items-center gap-0.5"
            >
              <span>Inventory</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* 3 Column Grid Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* COLUMN 1: Table Status & KOT Summary */}
        <div className="space-y-5">
          {/* Table Status Block */}
          <div className="bg-[#111827] p-4 sm:p-5 rounded-2xl border border-slate-800 shadow-md space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-amber-400" />
                <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                  Table Status
                </h2>
              </div>
              <button
                id="btn-view-all-tables"
                onClick={() => onNavigateTab('tables')}
                className="text-xs font-bold text-amber-400 hover:text-amber-300 transition"
              >
                View All
              </button>
            </div>

            {/* Status Color Legend */}
            <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400 pt-1 pb-1 border-b border-slate-800/80">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>Available</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-rose-500" />
                <span>Occupied</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                <span>Billing</span>
              </div>
            </div>

            {/* Table Grid for all 10 tables (T01 to T10) */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-1">
              {tables.map(table => {
                const style = getTableStatusStyle(table);
                const num = table.tableNumber || table.number || parseInt(table.id.replace(/\D/g, ''), 10) || 1;
                const isOccupied = ((table.status || '').toUpperCase() === 'OCCUPIED' || (table.status || '').toUpperCase() === 'BILLING') &&
                  Boolean((table.totalBill && table.totalBill > 0) || (table.activeOrdersCount && table.activeOrdersCount > 0));

                const tableLabel = `T${num < 10 ? `0${num}` : num}`;

                return (
                  <button
                    key={table.id}
                    id={`dashboard-table-btn-${num}`}
                    onClick={() => {
                      if (onOpenTable) {
                        onOpenTable(num);
                      } else {
                        onNavigateTab('tables');
                      }
                    }}
                    className={`p-2.5 rounded-xl border text-left transition hover:scale-[1.02] flex flex-col justify-between bg-[#161F30] ${style.border}`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white font-mono">
                        {tableLabel}
                      </span>
                      <span className={`w-2 h-2 rounded-full ${style.bg}`} />
                    </div>
                    <div className="mt-1.5">
                      {isOccupied && table.totalBill && table.totalBill > 0 ? (
                        <span className="text-[10px] font-mono font-bold text-amber-400">
                          Rs. {table.totalBill}
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400">
                          {style.text}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* KOT Summary Block */}
          <div className="bg-[#111827] p-4 sm:p-5 rounded-2xl border border-slate-800 shadow-md space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-amber-400" />
                <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                  KOT Summary
                </h2>
              </div>
              <button
                id="btn-view-all-kot"
                onClick={() => onNavigateTab('kot')}
                className="text-xs font-bold text-amber-400 hover:text-amber-300 transition"
              >
                View KOT
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="p-3.5 bg-[#161F30] rounded-xl border border-amber-500/20 flex flex-col justify-between">
                <span className="text-xs font-semibold text-amber-300">Kitchen KOT</span>
                <div className="mt-2 flex items-baseline justify-between">
                  <span className="text-2xl font-bold font-mono text-white">
                    {kitchenKotsCount}
                  </span>
                  <button
                    onClick={() => onNavigateTab('kot')}
                    className="text-[11px] font-bold text-amber-400 hover:underline"
                  >
                    View
                  </button>
                </div>
              </div>

              <div className="p-3.5 bg-[#161F30] rounded-xl border border-purple-500/20 flex flex-col justify-between">
                <span className="text-xs font-semibold text-purple-300">Reception KOT</span>
                <div className="mt-2 flex items-baseline justify-between">
                  <span className="text-2xl font-bold font-mono text-white">
                    {receptionKotsCount}
                  </span>
                  <button
                    onClick={() => onNavigateTab('kot')}
                    className="text-[11px] font-bold text-purple-400 hover:underline"
                  >
                    View
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* COLUMN 2: Recent Orders & Payment Summary */}
        <div className="space-y-5">
          {/* Recent Orders Block */}
          <div className="bg-[#111827] p-4 sm:p-5 rounded-2xl border border-slate-800 shadow-md space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-amber-400" />
                <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                  Recent Orders
                </h2>
              </div>
              <button
                id="btn-view-all-recent-orders"
                onClick={() => onNavigateTab('orders')}
                className="text-xs font-bold text-amber-400 hover:text-amber-300 transition"
              >
                View All
              </button>
            </div>

            <div className="overflow-x-auto min-h-[140px] flex flex-col justify-center">
              {orders.length === 0 ? (
                <div className="py-10 text-center text-slate-400 text-xs font-medium space-y-1.5 bg-[#161F30]/50 rounded-xl border border-slate-800">
                  <Utensils className="w-6 h-6 text-slate-500 mx-auto" />
                  <p className="font-semibold text-slate-300">No orders yet</p>
                  <p className="text-[11px] text-slate-500">Orders placed by guests or staff will show here in real-time.</p>
                </div>
              ) : (
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="text-[10px] uppercase font-bold text-slate-400 border-b border-slate-800">
                      <th className="pb-2">Order ID</th>
                      <th className="pb-2">Table</th>
                      <th className="pb-2">Items</th>
                      <th className="pb-2">Amount</th>
                      <th className="pb-2">Status</th>
                      <th className="pb-2 text-right">Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 font-medium">
                    {[...orders]
                      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                      .slice(0, 5)
                      .map(order => {
                        const itemCount = (order.items || []).reduce((s, it) => s + (it.quantity || 1), 0);

                        return (
                          <tr
                            key={order.id}
                            onClick={() => (onOpenReceipt ? onOpenReceipt(order) : onNavigateTab('orders'))}
                            className="hover:bg-[#161F30] cursor-pointer transition"
                            title="Click to view order details & receipt"
                          >
                            <td className="py-2.5 font-mono font-bold text-amber-400">
                              {order.orderNumber}
                            </td>
                            <td className="py-2.5 text-slate-300">
                              T{order.tableNumber < 10 ? `0${order.tableNumber}` : order.tableNumber}
                            </td>
                            <td className="py-2.5 text-slate-400">{itemCount} items</td>
                            <td className="py-2.5 font-mono font-bold text-white">
                              Rs. {((order.total ?? (order as any).totalAmount ?? order.subtotal ?? 0) || 0).toFixed(2)}
                            </td>
                            <td className="py-2.5">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getOrderStatusBadge(
                                  order.status
                                )}`}
                              >
                                {order.status}
                              </span>
                            </td>
                            <td className="py-2.5 text-right font-mono text-[10px] text-slate-500">
                              {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Payment Summary Block */}
          <div className="bg-[#111827] p-4 sm:p-5 rounded-2xl border border-slate-800 shadow-md space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-amber-400" />
                <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                  Payment Summary
                </h2>
              </div>
              <button
                id="btn-view-payments-dashboard"
                onClick={() => onNavigateTab('payments')}
                className="text-xs font-bold text-amber-400 hover:text-amber-300 transition"
              >
                View Payments
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              <div className="p-3 bg-[#161F30] rounded-xl border border-slate-800 text-center">
                <div className="flex items-center justify-center w-6 h-6 rounded-md bg-emerald-500/10 text-emerald-400 mx-auto mb-1.5">
                  <Banknote className="w-3.5 h-3.5" />
                </div>
                <div className="text-[10px] text-slate-400 font-semibold uppercase">Cash</div>
                <div className="text-xs font-mono font-bold text-white mt-1">
                  Rs. {(cashPayments || 0).toFixed(2)}
                </div>
              </div>

              <div className="p-3 bg-[#161F30] rounded-xl border border-slate-800 text-center">
                <div className="flex items-center justify-center w-6 h-6 rounded-md bg-blue-500/10 text-blue-400 mx-auto mb-1.5">
                  <CreditCard className="w-3.5 h-3.5" />
                </div>
                <div className="text-[10px] text-slate-400 font-semibold uppercase">Card</div>
                <div className="text-xs font-mono font-bold text-white mt-1">
                  Rs. {(cardPayments || 0).toFixed(2)}
                </div>
              </div>

              <div className="p-3 bg-[#161F30] rounded-xl border border-slate-800 text-center">
                <div className="flex items-center justify-center w-6 h-6 rounded-md bg-purple-500/10 text-purple-400 mx-auto mb-1.5">
                  <QrCode className="w-3.5 h-3.5" />
                </div>
                <div className="text-[10px] text-slate-400 font-semibold uppercase">QR / Digital</div>
                <div className="text-xs font-mono font-bold text-white mt-1">
                  Rs. {(qrPayments || 0).toFixed(2)}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* COLUMN 3: Sales Overview Chart & Low Stock Alert */}
        <div className="space-y-5">
          {/* Sales Summary Real-Time Chart Block */}
          <div className="bg-[#111827] p-4 sm:p-5 rounded-2xl border border-slate-800 shadow-md space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-amber-400" />
                <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                  Sales Summary
                </h2>
              </div>
              <div className="flex items-center gap-1 bg-[#161F30] p-1 rounded-lg border border-slate-800">
                <button
                  onClick={() => setSalesTimeframe('today')}
                  className={`px-2 py-0.5 text-[10px] font-bold rounded-md transition ${
                    salesTimeframe === 'today'
                      ? 'bg-amber-500 text-white shadow-xs'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Today
                </button>
              </div>
            </div>

            {hasSalesData ? (
              <div className="h-44 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={hourlySalesData}>
                    <defs>
                      <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#F59E0B" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <XAxis
                      dataKey="time"
                      stroke="#64748B"
                      fontSize={10}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      stroke="#64748B"
                      fontSize={10}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={val => `${val}`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1E293B',
                        borderColor: '#334155',
                        borderRadius: '8px',
                        fontSize: '11px',
                        color: '#F8FAFC'
                      }}
                      formatter={(value: any) => [`Rs. ${value}`, 'Revenue']}
                    />
                    <Area
                      type="monotone"
                      dataKey="amount"
                      stroke="#F59E0B"
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#salesGrad)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-44 w-full flex flex-col items-center justify-center bg-[#161F30]/40 rounded-xl border border-dashed border-slate-800 text-center p-4">
                <TrendingUp className="w-7 h-7 text-slate-600 mb-2" />
                <p className="text-xs font-semibold text-slate-300">No sales data yet</p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Sales analytics will render dynamically after the first completed transaction.
                </p>
              </div>
            )}
          </div>

          {/* Low Stock Alert Block */}
          <div className="bg-[#111827] p-4 sm:p-5 rounded-2xl border border-slate-800 shadow-md space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-rose-500" />
                <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                  Low Stock Alert
                </h2>
              </div>
              <button
                id="btn-view-inventory-alerts"
                onClick={() => onNavigateTab('inventory')}
                className="text-xs font-bold text-amber-400 hover:text-amber-300 transition"
              >
                View All
              </button>
            </div>

            {lowStockList.length === 0 ? (
              <div className="py-6 text-center text-slate-400 text-xs font-medium bg-[#161F30]/40 rounded-xl border border-slate-800">
                <CheckCircle2 className="w-6 h-6 text-emerald-400 mx-auto mb-1.5" />
                <p className="text-slate-300 font-semibold">All items well stocked</p>
                <p className="text-[11px] text-slate-500">Zero inventory items below threshold.</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[160px] overflow-y-auto">
                {lowStockList.map(item => (
                  <div
                    key={item.id}
                    className="p-2.5 bg-rose-500/10 rounded-xl border border-rose-500/20 flex items-center justify-between"
                  >
                    <div>
                      <div className="text-xs font-bold text-white">{item.name}</div>
                      <div className="text-[10px] text-rose-300">
                        Remaining: {item.currentStock} {item.unit}
                      </div>
                    </div>
                    <span className="px-2 py-0.5 text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-md">
                      Low
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
