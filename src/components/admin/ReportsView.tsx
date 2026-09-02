import React, { useState, useMemo } from 'react';
import { usePOS } from '../../context/POSContext';
import {
  TrendingUp,
  BarChart3,
  PieChart,
  Calendar,
  Download,
  Users,
  Clock,
  DollarSign
} from 'lucide-react';

export const ReportsView: React.FC = () => {
  const { orders, payments } = usePOS();
  const [reportRange, setReportRange] = useState<'today' | 'week' | 'month'>('today');

  const validOrders = orders.filter(
    o => o.status !== 'cancelled' && (o.status as any) !== 'CANCELLED'
  );
  const totalSales = payments
    .filter(p => p.status === 'completed' || p.status === 'PAID')
    .reduce((sum, p) => sum + (p.amount || 0), 0);

  const avgOrderValue = validOrders.length > 0 ? Math.round(totalSales / validOrders.length) : 0;

  // Real Category sales breakdown dynamically computed from actual orders
  const categorySales = useMemo(() => {
    const categoryTotals: Record<string, number> = {};
    let totalItemsRevenue = 0;

    validOrders.forEach(o => {
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
  }, [validOrders]);

  // Real Hourly rush dynamically calculated from actual orders
  const hourlyRush = useMemo(() => {
    const hourMap: Record<string, { orders: number; sales: number }> = {
      '10:00 AM': { orders: 0, sales: 0 },
      '12:00 PM': { orders: 0, sales: 0 },
      '02:00 PM': { orders: 0, sales: 0 },
      '04:00 PM': { orders: 0, sales: 0 },
      '06:00 PM': { orders: 0, sales: 0 },
      '08:00 PM': { orders: 0, sales: 0 },
      '10:00 PM': { orders: 0, sales: 0 }
    };

    validOrders.forEach(o => {
      const time = (o.createdAt || '').toUpperCase();
      let matchedKey = '12:00 PM';
      if (time.includes('10') && time.includes('AM')) matchedKey = '10:00 AM';
      else if (time.includes('12') && time.includes('PM')) matchedKey = '12:00 PM';
      else if (time.includes('02') || (time.includes('2') && time.includes('PM'))) matchedKey = '02:00 PM';
      else if (time.includes('04') || (time.includes('4') && time.includes('PM'))) matchedKey = '04:00 PM';
      else if (time.includes('06') || (time.includes('6') && time.includes('PM'))) matchedKey = '06:00 PM';
      else if (time.includes('08') || (time.includes('8') && time.includes('PM'))) matchedKey = '08:00 PM';
      else if (time.includes('10') && time.includes('PM')) matchedKey = '10:00 PM';

      hourMap[matchedKey].orders += 1;
      hourMap[matchedKey].sales += (o.finalAmount ?? o.total ?? o.subtotal ?? 0);
    });

    return Object.entries(hourMap).map(([hour, data]) => ({
      hour,
      orders: data.orders || 0,
      sales: data.sales || 0
    }));
  }, [validOrders]);

  const maxHourlySales = Math.max(1, ...hourlyRush.map(h => h.sales));

  return (
    <div id="reports-view" className="space-y-6">
      {/* Header */}
      <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-gray-900 tracking-tight">
            Restaurant Performance &amp; Analytics
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Key financial insights, kitchen velocity, table turnover and category sales mix.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex bg-gray-100 p-1 rounded-lg border border-gray-200 text-xs">
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
          </div>

          <button
            onClick={() => window.print()}
            className="px-3.5 py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 border border-gray-200 transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Report</span>
          </button>
        </div>
      </div>

      {/* Top metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-white rounded-xl border border-gray-200 shadow-xs">
          <span className="text-xs font-semibold text-gray-500">Gross Sales</span>
          <div className="mt-2 text-2xl font-bold text-gray-900 font-mono">
            Rs. {totalSales.toFixed(2)}
          </div>
          <span className="text-[11px] text-gray-400 font-medium">Real-time settled revenue</span>
        </div>

        <div className="p-4 bg-white rounded-xl border border-gray-200 shadow-xs">
          <span className="text-xs font-semibold text-gray-500">Average Ticket (AOV)</span>
          <div className="mt-2 text-2xl font-bold text-amber-600 font-mono">
            Rs. {avgOrderValue.toFixed(2)}
          </div>
          <span className="text-[11px] text-gray-400 font-medium">Across {validOrders.length} order covers</span>
        </div>

        <div className="p-4 bg-white rounded-xl border border-gray-200 shadow-xs">
          <span className="text-xs font-semibold text-gray-500">Total Orders</span>
          <div className="mt-2 text-2xl font-bold text-blue-600 font-mono">{validOrders.length}</div>
          <span className="text-[11px] text-gray-400 font-medium">Completed &amp; in-progress</span>
        </div>

        <div className="p-4 bg-white rounded-xl border border-gray-200 shadow-xs">
          <span className="text-xs font-semibold text-gray-500">Total Items Sold</span>
          <div className="mt-2 text-2xl font-bold text-teal-600 font-mono">
            {validOrders.reduce((s, o) => s + o.items.reduce((is, it) => is + it.quantity, 0), 0)}
          </div>
          <span className="text-[11px] text-gray-400 font-medium">Food &amp; beverage items</span>
        </div>
      </div>

      {/* 2-Column: Hourly Rush & Category Mix */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Hourly Rush Bar Chart */}
        <div className="p-5 bg-white rounded-xl border border-gray-200 shadow-xs space-y-4">
          <div>
            <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
              Hourly Sales &amp; Customer Rush Peak
            </h3>
            <p className="text-xs text-gray-500">Peak dining hours for staffing and prep</p>
          </div>

          <div className="space-y-3 pt-2">
            {hourlyRush.map((h, i) => (
              <div key={i} className="space-y-1">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-gray-700">{h.hour}</span>
                  <span className="font-mono text-amber-600 font-bold">
                    Rs. {h.sales.toFixed(2)} ({h.orders} orders)
                  </span>
                </div>
                <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber-500 rounded-full transition-all duration-500"
                    style={{ width: `${(h.sales / maxHourlySales) * 100}%` }}
                  />
                </div>
              </div>
            ))}
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
                No category sales recorded yet
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
    </div>
  );
};
