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
  CreditCard
} from 'lucide-react';
import { SettleBillModal } from './SettleBillModal';
import { TableTransferModal } from './TableTransferModal';
import { TableQRModal } from '../guest/TableQRModal';

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

  // Filters
  const [selectedSection, setSelectedSection] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  // Modals & Drawers
  const [settleTable, setSettleTable] = useState<Table | null>(null);
  const [transferFromTable, setTransferFromTable] = useState<Table | null>(null);
  const [qrModalTableNum, setQrModalTableNum] = useState<number | null>(null);
  const [inspectTable, setInspectTable] = useState<Table | null>(null);

  const getEffectiveTableOrderStatus = (activeOrders: Order[]): 'placed' | 'confirmed' | 'served' => {
    if (activeOrders.length === 0) return 'placed';
    const nonCancelled = activeOrders.filter(o => (o.status || '').toLowerCase() !== 'cancelled');
    if (nonCancelled.length === 0) return 'placed';
    const allServed = nonCancelled.every(o => {
      const s = (o.status || '').toLowerCase();
      return s === 'served' || s === 'completed';
    });
    if (allServed) return 'served';
    const anyConfirmed = nonCancelled.some(o => {
      const s = (o.status || '').toLowerCase();
      return s === 'confirmed' || s === 'preparing' || s === 'cooking' || s === 'ready';
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

  const sections: TableSection[] = ['Indoor AC', 'Terrace Lounge', 'Cafe Patio', 'VIP Dining'];

  const filteredTables = tables.filter(t => {
    if (selectedSection !== 'all' && t.section !== selectedSection) return false;
    if (selectedStatus !== 'all' && (t.status || '').toLowerCase() !== selectedStatus.toLowerCase()) return false;
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
        label: 'Occupied',
        dot: 'bg-rose-500',
        badge: 'bg-rose-500/20 text-rose-700 border-rose-500/30',
        border: 'border-rose-300 bg-rose-50/40'
      };
    }
    if (s === 'BILLING') {
      return {
        label: 'Billing',
        dot: 'bg-purple-500 animate-pulse',
        badge: 'bg-purple-500/20 text-purple-700 border-purple-500/30',
        border: 'border-purple-300 bg-purple-50/40'
      };
    }
    if (s === 'RESERVED') {
      return {
        label: 'Reserved',
        dot: 'bg-blue-500',
        badge: 'bg-blue-500/20 text-blue-700 border-blue-500/30',
        border: 'border-blue-300 bg-blue-50/40'
      };
    }
    if (s === 'CLEANING') {
      return {
        label: 'Cleaning',
        dot: 'bg-yellow-500',
        badge: 'bg-yellow-500/20 text-yellow-700 border-yellow-500/30',
        border: 'border-yellow-300 bg-yellow-50/40'
      };
    }
    return {
      label: 'Available',
      dot: 'bg-emerald-500',
      badge: 'bg-emerald-500/15 text-emerald-700 border-emerald-500/30',
      border: 'border-gray-200 hover:border-emerald-500/40 bg-white'
    };
  };

  const getTableActiveKots = (tableNum: number) => {
    return kots.filter(k => k.tableNumber === tableNum && (k.status === 'pending' || k.status === 'in_progress'));
  };

  return (
    <div className="space-y-6">
      {/* Floor Overview Header & Filters */}
      <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-gray-900 tracking-tight">
              Table Management
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200 font-mono">
              10 Tables
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">
            Real-time occupancy status, running tabs, kitchen orders, and table bill settlements.
          </p>
        </div>

        {/* Status Filters */}
        <div className="flex items-center gap-1.5 flex-wrap text-xs">
          <button
            onClick={() => setSelectedStatus('all')}
            className={`px-3 py-1.5 rounded-lg border font-semibold transition ${
              selectedStatus === 'all'
                ? 'bg-amber-500 text-white border-amber-500 shadow-xs'
                : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
            }`}
          >
            All ({tables.length})
          </button>
          <button
            onClick={() => setSelectedStatus(selectedStatus === 'available' ? 'all' : 'available')}
            className={`px-3 py-1.5 rounded-lg border flex items-center gap-1.5 font-semibold transition ${
              selectedStatus === 'available'
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Available ({availableCount})</span>
          </button>
          <button
            onClick={() => setSelectedStatus(selectedStatus === 'occupied' ? 'all' : 'occupied')}
            className={`px-3 py-1.5 rounded-lg border flex items-center gap-1.5 font-semibold transition ${
              selectedStatus === 'occupied'
                ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-rose-500" />
            <span>Occupied ({occupiedCount})</span>
          </button>
          <button
            onClick={() => setSelectedStatus(selectedStatus === 'billing' ? 'all' : 'billing')}
            className={`px-3 py-1.5 rounded-lg border flex items-center gap-1.5 font-semibold transition ${
              selectedStatus === 'billing'
                ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-purple-500" />
            <span>Billing ({billingCount})</span>
          </button>
        </div>
      </div>

      {/* Section Filter Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 bg-white p-3 rounded-xl border border-gray-200 shadow-xs">
        <span className="text-xs font-semibold text-gray-400 pl-1">Section:</span>
        <button
          onClick={() => setSelectedSection('all')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
            selectedSection === 'all'
              ? 'bg-gray-900 text-white shadow-xs'
              : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
          }`}
        >
          All Sections
        </button>
        {sections.map(sec => (
          <button
            key={sec}
            onClick={() => setSelectedSection(sec)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
              selectedSection === sec
                ? 'bg-gray-900 text-white shadow-xs'
                : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
            }`}
          >
            {sec}
          </button>
        ))}
      </div>

      {/* 10 Tables Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {filteredTables.map(table => {
          const isOccupied = (table.status || '').toUpperCase() === 'OCCUPIED' || (table.status || '').toUpperCase() === 'BILLING' ||
            Boolean((table.activeOrdersCount && table.activeOrdersCount > 0) || (table.totalBill && table.totalBill > 0));
          const meta = getTableStatusMeta(table.status, isOccupied);
          const tableOrders = getTableOrders(table.number);
          const activeKots = getTableActiveKots(table.number);
          const effectiveOrderStatus = getEffectiveTableOrderStatus(tableOrders);

          return (
            <div
              key={table.id}
              onClick={() => setInspectTable(table)}
              className={`bg-white rounded-xl border p-4 transition-all duration-200 cursor-pointer hover:shadow-md flex flex-col justify-between ${meta.border}`}
            >
              {/* Top Row: Table Name & Status Badge */}
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-base font-bold text-gray-900">
                      Table {table.number < 10 ? `0${table.number}` : table.number}
                    </span>
                    <span className={`w-2.5 h-2.5 rounded-full ${meta.dot}`} />
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${meta.badge}`}>
                    {meta.label}
                  </span>
                </div>

                {/* Middle Details */}
                <div className="my-3 space-y-1.5 text-xs text-gray-500">
                  <div className="flex items-center justify-between text-[11px]">
                    <span>{table.section}</span>
                    <span className="flex items-center gap-1">
                      <Users className="w-3 h-3 text-gray-400" />
                      <span>{table.capacity} seats</span>
                    </span>
                  </div>

                  {isOccupied ? (
                    <div className="pt-2 border-t border-gray-100 space-y-1">
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
                    <div className="pt-2 border-t border-gray-100 text-[11px] text-emerald-600 font-semibold">
                      Ready for guests
                    </div>
                  )}
                </div>
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
                    disabled={!isOccupied && tableOrders.length === 0}
                    onClick={(e) => handleSetTableOrderStatus(table.number, 'served', e)}
                    className={`py-1 rounded-md text-[10px] font-bold transition flex items-center justify-center gap-1 ${
                      isOccupied && effectiveOrderStatus === 'served'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : isOccupied
                        ? 'text-gray-700 hover:bg-gray-200'
                        : 'text-gray-400 opacity-40 cursor-not-allowed'
                    }`}
                    title="Mark all active orders on Table as Served"
                  >
                    Served
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
                  <p className="text-xs text-gray-500">
                    {inspectTable.section} • Capacity {inspectTable.capacity} Guests
                  </p>
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
                    getEffectiveTableOrderStatus(getTableOrders(inspectTable.number)) === 'served'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : getEffectiveTableOrderStatus(getTableOrders(inspectTable.number)) === 'confirmed'
                      ? 'bg-blue-50 text-blue-700 border-blue-200'
                      : 'bg-amber-50 text-amber-800 border-amber-200'
                  }`}>
                    {getEffectiveTableOrderStatus(getTableOrders(inspectTable.number))}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 p-1 bg-gray-100 rounded-xl border border-gray-200">
                  <button
                    type="button"
                    onClick={() => handleSetTableOrderStatus(inspectTable.number, 'placed')}
                    className={`py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                      getEffectiveTableOrderStatus(getTableOrders(inspectTable.number)) === 'placed'
                        ? 'bg-amber-500 text-white shadow-sm'
                        : 'text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <span>1. Placed</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSetTableOrderStatus(inspectTable.number, 'confirmed')}
                    className={`py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                      getEffectiveTableOrderStatus(getTableOrders(inspectTable.number)) === 'confirmed'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <span>2. Confirmed</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSetTableOrderStatus(inspectTable.number, 'served')}
                    className={`py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                      getEffectiveTableOrderStatus(getTableOrders(inspectTable.number)) === 'served'
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'text-gray-700 hover:bg-gray-200'
                    }`}
                  >
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

                        {/* Order Status Controller buttons for this specific order */}
                        <div className="grid grid-cols-3 gap-1 p-0.5 bg-gray-100 rounded-lg">
                          <button
                            type="button"
                            onClick={(e) => handleSetIndividualOrderStatus(ord.id, 'placed', e)}
                            className={`py-1 rounded text-[10px] font-bold transition ${
                              isPlaced
                                ? 'bg-amber-500 text-white shadow-xs'
                                : 'text-gray-600 hover:bg-gray-200'
                            }`}
                          >
                            Placed
                          </button>
                          <button
                            type="button"
                            onClick={(e) => handleSetIndividualOrderStatus(ord.id, 'confirmed', e)}
                            className={`py-1 rounded text-[10px] font-bold transition ${
                              isConfirmed
                                ? 'bg-blue-600 text-white shadow-xs'
                                : 'text-gray-600 hover:bg-gray-200'
                            }`}
                          >
                            Confirmed
                          </button>
                          <button
                            type="button"
                            onClick={(e) => handleSetIndividualOrderStatus(ord.id, 'served', e)}
                            className={`py-1 rounded text-[10px] font-bold transition ${
                              isServed
                                ? 'bg-emerald-600 text-white shadow-xs'
                                : 'text-gray-600 hover:bg-gray-200'
                            }`}
                          >
                            Served
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
              const consolidatedOrder: Order = {
                id: `BILL-T${settleTable.number}-${Date.now().toString().slice(-4)}`,
                orderNumber: `INV-T${settleTable.number < 10 ? '0' + settleTable.number : settleTable.number}`,
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
                source: 'ADMIN_MANUAL',
                createdBy: 'Cashier POS',
                createdAt: new Date().toISOString(),
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
