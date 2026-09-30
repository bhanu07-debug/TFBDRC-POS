import React, { useState } from 'react';
import { usePOS } from '../../context/POSContext';
import { Table, TableSection, TableStatus, Order } from '../../types';
import {
  Layers,
  Plus,
  Receipt,
  ArrowRightLeft,
  QrCode,
  Users,
  Clock,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  Filter,
  X,
  ChefHat,
  UtensilsCrossed,
  CreditCard,
  Flame,
  Sparkles
} from 'lucide-react';
import { SettleBillModal } from './SettleBillModal';
import { TableTransferModal } from './TableTransferModal';
import { TableQRModal } from '../guest/TableQRModal';
import { OrderElapsedTimer } from '../common/OrderElapsedTimer';

interface TablesViewProps {
  onPunchOrder: (tableNumber: number) => void;
  onOpenReceipt?: (order: any) => void;
}

export const TablesView: React.FC<TablesViewProps> = ({
  onPunchOrder,
  onOpenReceipt
}) => {
  const {
    tables,
    setTableStatus,
    occupyTable,
    getTableOrders,
    setCurrentGuestTableNumber,
    setActiveInterface,
    updateTableOrdersStatus,
    updateOrderStatus,
    kots
  } = usePOS();

  // Status Filter for real-time monitoring
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  // Modals & Drawers
  const [settleTable, setSettleTable] = useState<Table | null>(null);
  const [transferFromTable, setTransferFromTable] = useState<Table | null>(null);
  const [qrModalTableNum, setQrModalTableNum] = useState<number | null>(null);
  const [inspectTable, setInspectTable] = useState<Table | null>(null);

  const getEffectiveTableOrderStatus = (activeOrders: Order[], tableNumber?: number): 'placed' | 'confirmed' | 'served' => {
    const tableKots = tableNumber !== undefined ? kots.filter(
      k => (Number(k.tableNumber) === Number(tableNumber) || k.tableId === `T${tableNumber < 10 ? '0' + tableNumber : tableNumber}`) &&
           (k.status || '').toLowerCase() !== 'cancelled'
    ) : [];

    if (activeOrders.length === 0 && tableKots.length === 0) return 'placed';
    const nonCancelled = activeOrders.filter(o => (o.status || '').toLowerCase() !== 'cancelled');

    // Check if orders are all served
    const allOrdersServed = nonCancelled.length > 0 && nonCancelled.every(o => {
      const s = (o.status || '').toLowerCase();
      return s === 'served' || s === 'completed';
    });

    // Check if KOTs are all served
    const allKotsServed = tableKots.length > 0 && tableKots.every(k => {
      const s = (k.status || '').toLowerCase();
      return s === 'served' || s === 'ready' || s === 'completed';
    });

    if ((allOrdersServed && (allKotsServed || tableKots.length === 0)) || (allKotsServed && nonCancelled.length === 0)) {
      return 'served';
    }

    const anyConfirmed = nonCancelled.some(o => {
      const s = (o.status || '').toLowerCase();
      return s === 'confirmed' || s === 'preparing' || s === 'cooking' || s === 'ready';
    }) || tableKots.some(k => {
      const s = (k.status || '').toLowerCase();
      return s === 'in_progress' || s === 'preparing' || s === 'cooking';
    });
    if (anyConfirmed) return 'confirmed';
    return 'placed';
  };

  const handleSetTableOrderStatus = async (tableNumber: number, status: 'placed' | 'confirmed' | 'served', e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      await updateTableOrdersStatus(tableNumber, status);
    } catch (err) {
      console.error('Failed to update table order status:', err);
    }
  };

  const handleSetIndividualOrderStatus = async (orderId: string, status: 'placed' | 'confirmed' | 'served', e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      await updateOrderStatus(orderId, status);
    } catch (err) {
      console.error('Failed to update individual order status:', err);
    }
  };

  const handleQuickStatusChange = async (tableNumber: number, newStatus: TableStatus, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      await setTableStatus(tableNumber, newStatus);
    } catch (err) {
      console.error('Failed to update table status:', err);
    }
  };

  const filteredTables = tables.filter(t => {
    if (selectedStatus === 'all') return true;
    const isOccupied = (t.status || '').toUpperCase() === 'OCCUPIED' || (t.status || '').toUpperCase() === 'BILLING' ||
      Boolean((t.activeOrdersCount && t.activeOrdersCount > 0) || (t.totalBill && t.totalBill > 0));
    const s = (t.status || '').toUpperCase();
    if (selectedStatus === 'occupied') {
      return s === 'OCCUPIED' || isOccupied;
    }
    if (selectedStatus === 'available') {
      return (s === 'AVAILABLE' || !s) && !isOccupied && s !== 'BILLING';
    }
    if (selectedStatus === 'billing') {
      return s === 'BILLING';
    }
    if (selectedStatus === 'reserved') {
      return s === 'RESERVED';
    }
    if (selectedStatus === 'cleaning') {
      return s === 'CLEANING';
    }
    return true;
  });

  const occupiedCount = tables.filter(t => (t.status || '').toUpperCase() === 'OCCUPIED' || Boolean((t.activeOrdersCount && t.activeOrdersCount > 0) || (t.totalBill && t.totalBill > 0))).length;
  const billingCount = tables.filter(t => (t.status || '').toUpperCase() === 'BILLING').length;
  const availableCount = tables.filter(t => {
    const s = (t.status || '').toUpperCase();
    return (s === 'AVAILABLE' || !s) && (!t.activeOrdersCount && !t.totalBill && s !== 'OCCUPIED' && s !== 'BILLING');
  }).length;
  const reservedCount = tables.filter(t => (t.status || '').toUpperCase() === 'RESERVED').length;
  const cleaningCount = tables.filter(t => (t.status || '').toUpperCase() === 'CLEANING').length;

  const getTableStatusMeta = (status: TableStatus, isOccupied: boolean = false) => {
    const s = (status || '').toUpperCase();
    if (s === 'OCCUPIED' || isOccupied) {
      return {
        key: 'occupied',
        label: 'Occupied',
        indicatorTag: 'OCCUPIED',
        subLabel: 'Active Dine-In',
        statusColor: 'rose',
        Icon: Users,
        iconBg: 'bg-rose-50 border-2 border-rose-300 ring-4 ring-rose-500/10 shadow-sm shadow-rose-500/10',
        surfaceBg: 'bg-rose-100 text-rose-800 border border-rose-300',
        chairColor: 'bg-rose-400',
        iconColor: 'text-rose-600',
        textColor: 'text-rose-700',
        beaconDot: 'bg-rose-500',
        beaconPing: 'bg-rose-400',
        dot: 'bg-rose-500 animate-pulse',
        badge: 'bg-rose-50 text-rose-700 border-rose-300 font-extrabold',
        indicatorChip: 'bg-rose-600 text-white border-rose-700 font-black',
        border: 'border-rose-300 bg-white hover:border-rose-500 hover:shadow-lg hover:shadow-rose-500/10',
        glow: 'ring-1 ring-rose-500/30'
      };
    }
    if (s === 'BILLING') {
      return {
        key: 'billing',
        label: 'Billing',
        indicatorTag: 'BILLING',
        subLabel: 'Bill Requested',
        statusColor: 'purple',
        Icon: Receipt,
        iconBg: 'bg-purple-50 border-2 border-purple-300 ring-4 ring-purple-500/10 shadow-sm shadow-purple-500/10',
        surfaceBg: 'bg-purple-100 text-purple-800 border border-purple-300',
        chairColor: 'bg-purple-400',
        iconColor: 'text-purple-600',
        textColor: 'text-purple-700',
        beaconDot: 'bg-purple-500',
        beaconPing: 'bg-purple-400',
        dot: 'bg-purple-500 animate-pulse',
        badge: 'bg-purple-50 text-purple-700 border-purple-300 font-extrabold',
        indicatorChip: 'bg-purple-600 text-white border-purple-700 font-black animate-pulse',
        border: 'border-purple-300 bg-white hover:border-purple-500 hover:shadow-lg hover:shadow-purple-500/10',
        glow: 'ring-1 ring-purple-500/30'
      };
    }
    if (s === 'RESERVED') {
      return {
        key: 'reserved',
        label: 'Reserved',
        indicatorTag: 'RESERVED',
        subLabel: 'Pre-Booked Table',
        statusColor: 'blue',
        Icon: Clock,
        iconBg: 'bg-blue-50 border-2 border-blue-300 ring-4 ring-blue-500/10 shadow-sm shadow-blue-500/10',
        surfaceBg: 'bg-blue-100 text-blue-800 border border-blue-300',
        chairColor: 'bg-blue-400',
        iconColor: 'text-blue-600',
        textColor: 'text-blue-700',
        beaconDot: 'bg-blue-500',
        beaconPing: 'bg-blue-400',
        dot: 'bg-blue-500',
        badge: 'bg-blue-50 text-blue-700 border-blue-300 font-extrabold',
        indicatorChip: 'bg-blue-600 text-white border-blue-700 font-black',
        border: 'border-blue-300 bg-white hover:border-blue-500 hover:shadow-lg hover:shadow-blue-500/10',
        glow: 'ring-1 ring-blue-500/30'
      };
    }
    if (s === 'CLEANING') {
      return {
        key: 'cleaning',
        label: 'Cleaning',
        indicatorTag: 'CLEANING',
        subLabel: 'Turnover Prep',
        statusColor: 'amber',
        Icon: Sparkles,
        iconBg: 'bg-amber-50 border-2 border-amber-300 ring-4 ring-amber-500/10 shadow-sm shadow-amber-500/10',
        surfaceBg: 'bg-amber-100 text-amber-800 border border-amber-300',
        chairColor: 'bg-amber-400',
        iconColor: 'text-amber-700',
        textColor: 'text-amber-800',
        beaconDot: 'bg-amber-500',
        beaconPing: 'bg-amber-400',
        dot: 'bg-amber-500',
        badge: 'bg-amber-50 text-amber-800 border-amber-300 font-extrabold',
        indicatorChip: 'bg-amber-600 text-white border-amber-700 font-black',
        border: 'border-amber-300 bg-white hover:border-amber-500 hover:shadow-lg hover:shadow-amber-500/10',
        glow: 'ring-1 ring-amber-500/30'
      };
    }
    return {
      key: 'available',
      label: 'Active / Available',
      indicatorTag: 'ACTIVE',
      subLabel: 'Clean & Ready',
      statusColor: 'emerald',
      Icon: UtensilsCrossed,
      iconBg: 'bg-emerald-50 border-2 border-emerald-300 ring-4 ring-emerald-500/10 shadow-sm shadow-emerald-500/10',
      surfaceBg: 'bg-emerald-100 text-emerald-800 border border-emerald-300',
      chairColor: 'bg-emerald-400',
      iconColor: 'text-emerald-600',
      textColor: 'text-emerald-700',
      beaconDot: 'bg-emerald-500',
      beaconPing: 'bg-emerald-400',
      dot: 'bg-emerald-500',
      badge: 'bg-emerald-50 text-emerald-700 border-emerald-300 font-extrabold',
      indicatorChip: 'bg-emerald-600 text-white border-emerald-700 font-black',
      border: 'border-emerald-300 bg-white hover:border-emerald-500 hover:shadow-lg hover:shadow-emerald-500/10',
      glow: 'ring-1 ring-emerald-500/30'
    };
  };

  const getTableActiveKots = (tableNum: number) => {
    return kots.filter(k => {
      if (k.tableNumber !== tableNum) return false;
      const s = (k.status || '').toLowerCase();
      return s === 'pending' || s === 'in_progress' || s === 'preparing' || s === 'cooking' || s === 'printing';
    });
  };

  return (
    <div className="space-y-6">
      {/* Floor Overview Header & Real-time Status Monitoring Bar */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-200 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-lg font-bold text-gray-900 tracking-tight">
              Table Management
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-gray-900 text-white font-mono shadow-xs">
              10 Tables
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Real-time visual table status monitoring, active orders, and bill settlements.
          </p>
        </div>

        {/* Real-time Status Indicators & Quick Filter Badges */}
        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap text-xs">
          <button
            onClick={() => setSelectedStatus('all')}
            className={`px-3 py-1.5 rounded-xl border font-bold transition flex items-center gap-1.5 cursor-pointer ${
              selectedStatus === 'all'
                ? 'bg-gray-900 text-white border-gray-900 shadow-xs'
                : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
            }`}
          >
            <span>All Tables</span>
            <span className="px-1.5 py-0.2 rounded-full bg-gray-200 text-gray-700 text-[10px] font-mono">
              {tables.length}
            </span>
          </button>

          <button
            onClick={() => setSelectedStatus(selectedStatus === 'available' ? 'all' : 'available')}
            className={`px-3 py-1.5 rounded-xl border flex items-center gap-2 font-bold transition cursor-pointer ${
              selectedStatus === 'available'
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                : 'bg-emerald-50/60 border-emerald-200 text-emerald-700 hover:bg-emerald-100/60'
            }`}
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span>Active / Ready</span>
            <span className="px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-mono">
              {availableCount}
            </span>
          </button>

          <button
            onClick={() => setSelectedStatus(selectedStatus === 'occupied' ? 'all' : 'occupied')}
            className={`px-3 py-1.5 rounded-xl border flex items-center gap-2 font-bold transition cursor-pointer ${
              selectedStatus === 'occupied'
                ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                : 'bg-rose-50/60 border-rose-200 text-rose-700 hover:bg-rose-100/60'
            }`}
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500" />
            </span>
            <span>Occupied</span>
            <span className="px-1.5 py-0.2 rounded-full bg-rose-100 text-rose-800 text-[10px] font-mono">
              {occupiedCount}
            </span>
          </button>

          <button
            onClick={() => setSelectedStatus(selectedStatus === 'billing' ? 'all' : 'billing')}
            className={`px-3 py-1.5 rounded-xl border flex items-center gap-2 font-bold transition cursor-pointer ${
              selectedStatus === 'billing'
                ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                : 'bg-purple-50/60 border-purple-200 text-purple-700 hover:bg-purple-100/60'
            }`}
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-purple-500" />
            </span>
            <span>Billing</span>
            <span className="px-1.5 py-0.2 rounded-full bg-purple-100 text-purple-800 text-[10px] font-mono">
              {billingCount}
            </span>
          </button>

          <button
            onClick={() => setSelectedStatus(selectedStatus === 'reserved' ? 'all' : 'reserved')}
            className={`px-3 py-1.5 rounded-xl border flex items-center gap-2 font-bold transition cursor-pointer ${
              selectedStatus === 'reserved'
                ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                : 'bg-blue-50/60 border-blue-200 text-blue-700 hover:bg-blue-100/60'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-blue-500" />
            <span>Reserved</span>
            <span className="px-1.5 py-0.2 rounded-full bg-blue-100 text-blue-800 text-[10px] font-mono">
              {reservedCount}
            </span>
          </button>

          {cleaningCount > 0 && (
            <button
              onClick={() => setSelectedStatus(selectedStatus === 'cleaning' ? 'all' : 'cleaning')}
              className={`px-3 py-1.5 rounded-xl border flex items-center gap-2 font-bold transition cursor-pointer ${
                selectedStatus === 'cleaning'
                  ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                  : 'bg-amber-50/60 border-amber-200 text-amber-700 hover:bg-amber-100/60'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              <span>Cleaning</span>
              <span className="px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-800 text-[10px] font-mono">
                {cleaningCount}
              </span>
            </button>
          )}
        </div>
      </div>

      {/* 10 Tables Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {filteredTables.map(table => {
          const isOccupied = (table.status || '').toUpperCase() === 'OCCUPIED' || (table.status || '').toUpperCase() === 'BILLING' ||
            Boolean((table.activeOrdersCount && table.activeOrdersCount > 0) || (table.totalBill && table.totalBill > 0));
          const meta = getTableStatusMeta(table.status, isOccupied);
          const tableOrders = getTableOrders(table.number);
          const activeKots = getTableActiveKots(table.number);
          const effectiveOrderStatus = getEffectiveTableOrderStatus(tableOrders, table.number);
          const hasHighPriority = activeKots.some(k => k.priority === 'HIGH' || k.items?.some(i => i.priority === 'HIGH')) ||
            tableOrders.some(o => o.priority === 'HIGH' || o.items?.some(i => i.priority === 'HIGH'));

          return (
            <div
              key={table.id}
              onClick={() => setInspectTable(table)}
              className={`bg-white rounded-2xl border p-4 transition-all duration-200 cursor-pointer hover:shadow-md flex flex-col justify-between ${
                hasHighPriority
                  ? 'border-2 border-rose-500 shadow-md shadow-rose-500/10 ring-2 ring-rose-500/20'
                  : meta.border
              }`}
            >
              {/* Top Row: Table Number & Status Badge */}
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-base font-black text-gray-900 tracking-tight">
                      Table {table.number < 10 ? `0${table.number}` : table.number}
                    </span>
                    {hasHighPriority && (
                      <span className="inline-flex items-center gap-0.5 text-[9px] font-black uppercase bg-rose-600 text-white px-1.5 py-0.2 rounded-full shadow-2xs animate-pulse">
                        <Flame className="w-2.5 h-2.5 fill-current" />
                        <span>RUSH</span>
                      </span>
                    )}
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border flex items-center gap-1 ${meta.badge}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${meta.beaconDot}`} />
                    <span>{meta.label}</span>
                  </span>
                </div>

                {/* Enhanced Visual Table Icon with Status Indicator Beacon & Layout */}
                <div className={`my-2.5 flex items-center gap-3 p-2.5 rounded-xl border transition-all ${meta.glow} bg-gray-50/90 border-gray-100`}>
                  {/* Visual Restaurant Table Graphic with 4 Chairs & Status Theme */}
                  <div className="relative flex flex-col items-center flex-shrink-0">
                    <div className={`relative w-12 h-12 rounded-xl flex items-center justify-center p-1 transition-all ${meta.iconBg}`}>
                      {/* 4 Surrounding Table Chairs Representation */}
                      <span className={`absolute -top-1 w-4 h-1 rounded-full ${meta.chairColor}`} />
                      <span className={`absolute -bottom-1 w-4 h-1 rounded-full ${meta.chairColor}`} />
                      <span className={`absolute -left-1 h-4 w-1 rounded-full ${meta.chairColor}`} />
                      <span className={`absolute -right-1 h-4 w-1 rounded-full ${meta.chairColor}`} />

                      {/* Central Table Top Surface with Status Icon & Table ID */}
                      <div className={`w-full h-full rounded-lg flex flex-col items-center justify-center ${meta.surfaceBg}`}>
                        <meta.Icon className="w-4 h-4" />
                        <span className="text-[8px] font-mono font-black leading-none mt-0.5">
                          T{table.number < 10 ? `0${table.number}` : table.number}
                        </span>
                      </div>

                      {/* Real-time Status Beacon on Table Icon */}
                      <span className="absolute -top-1.5 -right-1.5 flex h-3.5 w-3.5 items-center justify-center z-10">
                        <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${meta.beaconPing}`} />
                        <span className={`relative inline-flex rounded-full h-2 w-2 ${meta.beaconDot} ring-2 ring-white shadow-xs`} />
                      </span>
                    </div>

                    {/* Prominent Visual Status Tag attached directly to Table Icon */}
                    <span className={`mt-1 text-[8px] font-black uppercase tracking-wider px-1.5 py-0.2 rounded shadow-2xs ${meta.indicatorChip}`}>
                      {meta.indicatorTag}
                    </span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-black ${meta.textColor}`}>
                        {meta.label}
                      </span>
                      <span className="text-[10px] font-medium text-gray-400">
                        {meta.subLabel}
                      </span>
                    </div>

                    {/* Quick Status Selector Pills */}
                    <div className="flex items-center gap-1 mt-1.5" onClick={e => e.stopPropagation()}>
                      {(['AVAILABLE', 'OCCUPIED', 'BILLING', 'RESERVED'] as TableStatus[]).map(st => {
                        const isCurrent = (table.status || 'AVAILABLE').toUpperCase() === st;
                        const labelShort = st === 'AVAILABLE' ? 'Active' : st === 'OCCUPIED' ? 'Occ' : st === 'BILLING' ? 'Bill' : 'Res';
                        const activeColor = st === 'AVAILABLE'
                          ? 'bg-emerald-600 text-white shadow-xs border-emerald-600'
                          : st === 'OCCUPIED'
                          ? 'bg-rose-600 text-white shadow-xs border-rose-600'
                          : st === 'BILLING'
                          ? 'bg-purple-600 text-white shadow-xs border-purple-600'
                          : 'bg-blue-600 text-white shadow-xs border-blue-600';

                        return (
                          <button
                            key={st}
                            type="button"
                            onClick={(e) => handleQuickStatusChange(table.number, st, e)}
                            className={`px-1.5 py-0.5 rounded text-[9px] font-bold transition cursor-pointer border ${
                              isCurrent
                                ? activeColor
                                : 'bg-white hover:bg-gray-100 text-gray-500 border-gray-200'
                            }`}
                            title={`Switch Table ${table.number} to ${st}`}
                          >
                            {labelShort}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Running Tab Details / Available State */}
                {isOccupied ? (
                  <div className="mb-3 pt-2 border-t border-gray-100 space-y-1">
                    <div className="flex items-center justify-between font-mono font-bold text-gray-900 text-sm">
                      <span className="text-gray-500 font-sans text-xs font-normal">Current Tab</span>
                      <span>Rs. {(table.totalBill || 0).toLocaleString()}.00</span>
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-gray-500">
                      <span>{tableOrders.length} {tableOrders.length === 1 ? 'order' : 'orders'}</span>
                      {activeKots.length > 0 && (
                        <span className="text-amber-600 font-bold flex items-center gap-1">
                          <ChefHat className="w-3 h-3" />
                          <span>{activeKots.length} KOT</span>
                        </span>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="mb-3 pt-2 border-t border-gray-100 text-[11px] text-emerald-600 font-semibold flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Ready for guests</span>
                  </div>
                )}
              </div>

              {/* Status Management Section (Placed, Confirmed, Served) */}
              <div className="space-y-2 pt-2 border-t border-gray-100" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                    Order Status
                  </span>
                  {isOccupied && (
                    <span className={`text-[10px] font-bold uppercase px-1.5 py-0.2 rounded ${
                      effectiveOrderStatus === 'served'
                        ? 'text-emerald-700 bg-emerald-50'
                        : effectiveOrderStatus === 'confirmed'
                        ? 'text-blue-700 bg-blue-50'
                        : 'text-amber-700 bg-amber-50'
                    }`}>
                      {effectiveOrderStatus}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-1 p-0.5 bg-gray-100 rounded-lg border border-gray-200">
                  <button
                    type="button"
                    disabled={!isOccupied && tableOrders.length === 0}
                    onClick={(e) => handleSetTableOrderStatus(table.number, 'placed', e)}
                    className={`py-1 rounded-md text-[10px] font-bold transition flex items-center justify-center gap-1 ${
                      isOccupied && effectiveOrderStatus === 'placed'
                        ? 'bg-amber-500 text-white shadow-xs'
                        : isOccupied
                        ? 'text-gray-700 hover:bg-gray-200'
                        : 'text-gray-400 opacity-40 cursor-not-allowed'
                    }`}
                    title="Mark all active orders on Table as Placed"
                  >
                    Placed
                  </button>

                  <button
                    type="button"
                    disabled={!isOccupied && tableOrders.length === 0}
                    onClick={(e) => handleSetTableOrderStatus(table.number, 'confirmed', e)}
                    className={`py-1 rounded-md text-[10px] font-bold transition flex items-center justify-center gap-1 ${
                      isOccupied && effectiveOrderStatus === 'confirmed'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : isOccupied
                        ? 'text-gray-700 hover:bg-gray-200'
                        : 'text-gray-400 opacity-40 cursor-not-allowed'
                    }`}
                    title="Mark all active orders on Table as Confirmed"
                  >
                    Confirmed
                  </button>

                  <button
                    type="button"
                    disabled={!isOccupied && tableOrders.length === 0 && activeKots.length === 0}
                    onClick={(e) => handleSetTableOrderStatus(table.number, 'served', e)}
                    className={`py-1 rounded-md text-[10px] font-bold transition flex items-center justify-center gap-1 cursor-pointer ${
                      effectiveOrderStatus === 'served'
                        ? 'bg-emerald-600 text-white shadow-xs font-bold'
                        : isOccupied || tableOrders.length > 0 || activeKots.length > 0
                        ? 'text-gray-700 hover:bg-gray-200 hover:text-emerald-700'
                        : 'text-gray-400 opacity-40 cursor-not-allowed'
                    }`}
                    title="Mark all active orders on Table as Served (syncs with KOT section)"
                  >
                    {effectiveOrderStatus === 'served' && <CheckCircle2 className="w-3 h-3 text-white" />}
                    <span>Served</span>
                  </button>
                </div>

                {/* Bottom Quick Actions */}
                <div className="flex items-center justify-between gap-1.5 pt-1">
                  {isOccupied ? (
                    <>
                      <button
                        onClick={() => onPunchOrder(table.number)}
                        className="flex-1 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1"
                        title="Add more items to this table"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Order</span>
                      </button>
                      <button
                        onClick={() => setSettleTable(table)}
                        className="flex-1 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-800 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1"
                        title="Settle Bill"
                      >
                        <CreditCard className="w-3.5 h-3.5" />
                        <span>Settle</span>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setQrModalTableNum(table.number);
                        }}
                        className="p-1.5 bg-gray-50 hover:bg-gray-100 text-gray-600 rounded-lg border border-gray-200 transition"
                        title="Table & WiFi QR"
                      >
                        <QrCode className="w-3.5 h-3.5" />
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => onPunchOrder(table.number)}
                        className="flex-1 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-bold transition flex items-center justify-center gap-1 shadow-xs"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Punch Order</span>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setQrModalTableNum(table.number);
                        }}
                        className="p-1.5 bg-gray-50 hover:bg-gray-100 text-gray-600 rounded-lg border border-gray-200 transition"
                        title="View Table & WiFi QR"
                      >
                        <QrCode className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Table Details Slide-over Drawer */}
      {inspectTable && (
        <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
            onClick={() => setInspectTable(null)}
          />
          <div className="relative w-full max-w-md bg-white h-full shadow-2xl z-10 flex flex-col border-l border-gray-200">
            {/* Drawer Header */}
            <div className="p-5 border-b border-gray-200 flex items-center justify-between bg-gray-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold text-sm">
                  T{inspectTable.number < 10 ? `0${inspectTable.number}` : inspectTable.number}
                </div>
                <div>
                  <h3 className="font-bold text-base text-gray-900">
                    Table {inspectTable.number < 10 ? `0${inspectTable.number}` : inspectTable.number} Overview
                  </h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md border ${
                      getTableStatusMeta(
                        inspectTable.status,
                        (inspectTable.status || '').toUpperCase() === 'OCCUPIED' ||
                        (inspectTable.status || '').toUpperCase() === 'BILLING' ||
                        Boolean((inspectTable.activeOrdersCount && inspectTable.activeOrdersCount > 0) || (inspectTable.totalBill && inspectTable.totalBill > 0))
                      ).badge
                    }`}>
                      {getTableStatusMeta(
                        inspectTable.status,
                        (inspectTable.status || '').toUpperCase() === 'OCCUPIED' ||
                        (inspectTable.status || '').toUpperCase() === 'BILLING' ||
                        Boolean((inspectTable.activeOrdersCount && inspectTable.activeOrdersCount > 0) || (inspectTable.totalBill && inspectTable.totalBill > 0))
                      ).label}
                    </span>
                    <span className="text-[11px] text-gray-400 font-mono">
                      Table ID: T{inspectTable.number < 10 ? `0${inspectTable.number}` : inspectTable.number}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setQrModalTableNum(inspectTable.number)}
                  className="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-lg text-xs font-bold border border-amber-200 transition flex items-center gap-1.5 shadow-xs"
                  title="View Menu & WiFi QR"
                >
                  <QrCode className="w-3.5 h-3.5" />
                  <span>QR & WiFi</span>
                </button>
                <button
                  onClick={() => setInspectTable(null)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Drawer Content */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {/* Status & Session */}
              <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-between text-xs">
                <div>
                  <span className="text-gray-500">Table State: </span>
                  <span className="font-bold capitalize text-gray-900">{inspectTable.status}</span>
                </div>
                {inspectTable.openedAt && (
                  <div className="text-gray-500 font-mono">
                    Opened: {new Date(inspectTable.openedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                )}
              </div>

              {/* Table Order Status Controller (Placed, Confirmed, Served) */}
              <div className="p-4 rounded-xl border border-gray-200 bg-white shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                      Table Order Status
                    </h4>
                    <p className="text-[11px] text-gray-500">
                      Manage progress for Table {inspectTable.number < 10 ? `0${inspectTable.number}` : inspectTable.number}
                    </p>
                  </div>
                  <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                    getEffectiveTableOrderStatus(getTableOrders(inspectTable.number), inspectTable.number) === 'served'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : getEffectiveTableOrderStatus(getTableOrders(inspectTable.number), inspectTable.number) === 'confirmed'
                      ? 'bg-blue-50 text-blue-700 border-blue-200'
                      : 'bg-amber-50 text-amber-800 border-amber-200'
                  }`}>
                    {getEffectiveTableOrderStatus(getTableOrders(inspectTable.number), inspectTable.number)}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 p-1 bg-gray-100 rounded-xl border border-gray-200">
                  <button
                    type="button"
                    onClick={() => handleSetTableOrderStatus(inspectTable.number, 'placed')}
                    className={`py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                      getEffectiveTableOrderStatus(getTableOrders(inspectTable.number), inspectTable.number) === 'placed'
                        ? 'bg-amber-500 text-white shadow-sm'
                        : 'text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <span>1. Placed</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSetTableOrderStatus(inspectTable.number, 'confirmed')}
                    className={`py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                      getEffectiveTableOrderStatus(getTableOrders(inspectTable.number), inspectTable.number) === 'confirmed'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <span>2. Confirmed</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSetTableOrderStatus(inspectTable.number, 'served')}
                    className={`py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                      getEffectiveTableOrderStatus(getTableOrders(inspectTable.number), inspectTable.number) === 'served'
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'text-gray-700 hover:bg-gray-200 hover:text-emerald-700'
                    }`}
                  >
                    {getEffectiveTableOrderStatus(getTableOrders(inspectTable.number), inspectTable.number) === 'served' && (
                      <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                    )}
                    <span>3. Served</span>
                  </button>
                </div>
              </div>

              {/* Active Orders List */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                    Active Orders on Table
                  </h4>
                  <span className="text-xs text-gray-500 font-mono">
                    {getTableOrders(inspectTable.number).length} orders
                  </span>
                </div>

                {getTableOrders(inspectTable.number).length === 0 ? (
                  <div className="p-6 text-center rounded-xl bg-gray-50 border border-gray-200 text-gray-400 text-xs">
                    No active orders placed on this table.
                  </div>
                ) : (
                  getTableOrders(inspectTable.number).map(ord => {
                    const ordStatus = (ord.status || '').toLowerCase();
                    const isServed = ordStatus === 'served' || ordStatus === 'completed';
                    const isConfirmed = ordStatus === 'confirmed' || ordStatus === 'preparing' || ordStatus === 'cooking' || ordStatus === 'ready';
                    const isPlaced = !isServed && !isConfirmed;

                    return (
                      <div
                        key={ord.id}
                        className="p-3.5 rounded-xl border border-gray-200 bg-white space-y-3 shadow-xs"
                      >
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-gray-900">{ord.orderNumber}</span>
                            {ord.kotNumber && (
                              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-gray-100 text-gray-700 border border-gray-200">
                                {ord.kotNumber}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5">
                            {!isServed && (
                              <OrderElapsedTimer
                                receivedAt={ord.createdAt}
                                status={isConfirmed ? 'preparing' : 'active'}
                                variant="badge"
                              />
                            )}
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border capitalize ${
                              isServed
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : isConfirmed
                                ? 'bg-blue-50 text-blue-700 border-blue-200'
                                : 'bg-amber-50 text-amber-800 border-amber-200'
                            }`}>
                              {isServed ? 'Served' : isConfirmed ? 'Confirmed' : 'Placed'}
                            </span>
                          </div>
                        </div>

                        {!isServed && (
                          <OrderElapsedTimer
                            receivedAt={ord.createdAt}
                            status={isConfirmed ? 'preparing' : 'active'}
                            variant="banner"
                            className="rounded-lg border my-1"
                          />
                        )}

                        {/* Order Status Controller buttons for this specific order */}
                        <div className="grid grid-cols-3 gap-1 p-0.5 bg-gray-100 rounded-lg">
                          <button
                            type="button"
                            onClick={(e) => handleSetIndividualOrderStatus(ord.id, 'placed', e)}
                            className={`py-1 rounded text-[10px] font-bold transition flex items-center justify-center gap-1 cursor-pointer ${
                              isPlaced
                                ? 'bg-amber-500 text-white shadow-xs'
                                : 'text-gray-600 hover:bg-gray-200'
                            }`}
                            title="Set order status to Placed"
                          >
                            <span>Placed</span>
                          </button>
                          <button
                            type="button"
                            onClick={(e) => handleSetIndividualOrderStatus(ord.id, 'confirmed', e)}
                            className={`py-1 rounded text-[10px] font-bold transition flex items-center justify-center gap-1 cursor-pointer ${
                              isConfirmed
                                ? 'bg-blue-600 text-white shadow-xs'
                                : 'text-gray-600 hover:bg-gray-200'
                            }`}
                            title="Set order status to Confirmed / Preparing"
                          >
                            <span>Confirmed</span>
                          </button>
                          <button
                            type="button"
                            onClick={(e) => handleSetIndividualOrderStatus(ord.id, 'served', e)}
                            className={`py-1 rounded text-[10px] font-bold transition flex items-center justify-center gap-1 cursor-pointer ${
                              isServed
                                ? 'bg-emerald-600 text-white shadow-xs'
                                : 'text-gray-600 hover:bg-gray-200 hover:text-emerald-700'
                            }`}
                            title="Mark order as Served (synchronizes with KOT ticket)"
                          >
                            {isServed && <CheckCircle2 className="w-3 h-3 text-white" />}
                            <span>Served</span>
                          </button>
                        </div>

                        {/* Items list */}
                        <div className="space-y-1 divide-y divide-gray-100 text-xs">
                          {ord.items.map(item => (
                            <div key={item.id} className="pt-1 flex items-start justify-between gap-2">
                              <div className="flex-1">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="font-bold text-gray-900">{item.quantity || 1}x</span>
                                  <span className="text-gray-800 font-medium">{item.name || item.nameSnapshot || 'Item'}</span>
                                  {item.variantName && (
                                    <span className="px-1.5 py-0.2 rounded text-[10px] font-extrabold bg-amber-100 text-amber-900 border border-amber-200">
                                      {item.variantName}
                                    </span>
                                  )}
                                </div>
                                {(item.quantity && item.quantity > 1) && (
                                  <span className="text-[10px] text-gray-400 font-mono block">
                                    @ Rs. {(item.price ?? item.priceSnapshot ?? 0).toLocaleString()} each
                                  </span>
                                )}
                              </div>
                              <span className="font-mono font-bold text-gray-900">
                                Rs. {(((item.price ?? item.priceSnapshot ?? 0) * (item.quantity || 1)) || 0).toLocaleString()}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Running Tab Summary */}
              {Boolean(inspectTable.totalBill && inspectTable.totalBill > 0) && (
                <div className="p-4 rounded-xl bg-amber-50/60 border border-amber-200 space-y-2">
                  <div className="flex items-center justify-between text-xs text-gray-700">
                    <span>Subtotal</span>
                    <span className="font-mono">Rs. {(inspectTable.totalBill || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-700">
                    <span>Tax & Charges (5%)</span>
                    <span className="font-mono">Rs. {Math.round((inspectTable.totalBill || 0) * 0.05)}</span>
                  </div>
                  <div className="pt-2 border-t border-amber-200 flex items-center justify-between text-sm font-bold text-gray-900">
                    <span>Total Running Tab</span>
                    <span className="font-mono text-base text-amber-950">
                      Rs. {((inspectTable.totalBill || 0) + Math.round((inspectTable.totalBill || 0) * 0.05)).toLocaleString()}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Drawer Footer Actions */}
            <div className="p-4 border-t border-gray-200 bg-gray-50 flex items-center gap-2">
              <button
                onClick={() => {
                  onPunchOrder(inspectTable.number);
                  setInspectTable(null);
                }}
                className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-xs"
              >
                <Plus className="w-4 h-4" />
                <span>Add Order</span>
              </button>

              {Boolean(
                ((inspectTable.status || '').toUpperCase() === 'OCCUPIED' || (inspectTable.status || '').toUpperCase() === 'BILLING') &&
                ((inspectTable.activeOrdersCount && inspectTable.activeOrdersCount > 0) || (inspectTable.totalBill && inspectTable.totalBill > 0))
              ) ? (
                <button
                  onClick={() => {
                    setSettleTable(inspectTable);
                    setInspectTable(null);
                  }}
                  className="flex-1 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-xs"
                >
                  <CreditCard className="w-4 h-4" />
                  <span>Settle Bill</span>
                </button>
              ) : (
                <button
                  onClick={() => {
                    setQrModalTableNum(inspectTable.number);
                    setInspectTable(null);
                  }}
                  className="px-4 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-xl text-xs font-bold transition hover:bg-gray-100 flex items-center justify-center gap-1.5"
                >
                  <QrCode className="w-4 h-4" />
                  <span>QR Code</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Settle Bill Modal */}
      {settleTable && (
        <SettleBillModal
          table={settleTable}
          isOpen={!!settleTable}
          onClose={() => setSettleTable(null)}
          onReceiptOpen={(order?: Order) => {
            if (order) {
              onOpenReceipt?.(order);
              return;
            }
            const tableOrders = getTableOrders(settleTable.number);
            if (tableOrders.length === 1) {
              onOpenReceipt?.(tableOrders[0]);
            } else if (tableOrders.length > 1) {
              const allItems = tableOrders.flatMap(o => o.items);
              const subtotal = tableOrders.reduce((sum, o) => sum + (o.subtotal ?? o.total ?? 0), 0);
              const primaryOrder = tableOrders[0];
              const billOrderNum = primaryOrder?.orderNumber || 'ORD-0001';
              const resolvedGuestName = primaryOrder?.guestName || tableOrders.find(o => o.guestName)?.guestName;
              const resolvedGuestPhone = primaryOrder?.guestPhone || tableOrders.find(o => o.guestPhone)?.guestPhone;
              const consolidatedOrder: Order = {
                id: `BILL-${billOrderNum}`,
                orderNumber: billOrderNum,
                sessionId: settleTable.currentSessionId || `SES-${settleTable.number}`,
                tableId: settleTable.id || `T${settleTable.number}`,
                tableNumber: settleTable.number,
                items: allItems,
                subtotal: subtotal,
                discount: 0,
                vat: 0,
                total: subtotal,
                finalAmount: subtotal,
                status: 'completed',
                paymentStatus: 'unpaid',
                orderType: 'dine_in',
                createdBy: primaryOrder?.createdBy || 'Cashier POS',
                cashierName: primaryOrder?.cashierName || 'Dilip Chaudhary',
                waiterName: primaryOrder?.waiterName || 'Dilip Chaudhary',
                guestName: resolvedGuestName,
                guestPhone: resolvedGuestPhone,
                createdAt: primaryOrder?.createdAt || new Date().toISOString(),
                updatedAt: new Date().toISOString()
              };
              onOpenReceipt?.(consolidatedOrder);
            }
          }}
          onSettled={() => {
            // Keep modal open so cashier sees Payment Successful and Print Bill options
          }}
        />
      )}

      {/* Table QR Modal */}
      {qrModalTableNum !== null && (
        <TableQRModal
          tableNumber={qrModalTableNum}
          isOpen={qrModalTableNum !== null}
          onClose={() => setQrModalTableNum(null)}
        />
      )}
    </div>
  );
};
