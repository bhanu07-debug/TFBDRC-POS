import React, { useState } from 'react';
import { usePOS } from '../../context/POSContext';
import { KOTTicket, KOTItem } from '../../types';
import {
  ChefHat,
  Coffee,
  CheckCircle2,
  Clock,
  Printer,
  Sparkles,
  Flame,
  Volume2,
  VolumeX,
  Filter,
  Check
} from 'lucide-react';

export const KOTView: React.FC = () => {
  const { kots, updateKOTStatus, settings, updateSettings } = usePOS();
  const [activeSection, setActiveSection] = useState<'all' | 'kitchen' | 'reception'>('all');
  const [statusFilter, setStatusFilter] = useState<'active' | 'completed'>('active');

  // Helper to determine if item belongs to Kitchen or Reception
  const isReceptionItem = (item: KOTItem | { category: string; name: string }) => {
    const cat = (item.category || '').toLowerCase();
    const name = (item.name || '').toLowerCase();
    return (
      cat.includes('cafe') ||
      cat.includes('drink') ||
      cat.includes('beverage') ||
      cat.includes('dessert') ||
      cat.includes('barista') ||
      name.includes('coffee') ||
      name.includes('shake') ||
      name.includes('tea') ||
      name.includes('ice cream') ||
      name.includes('cake')
    );
  };

  // Split KOT tickets into Kitchen and Reception
  const getTicketItemsForSection = (kot: KOTTicket, section: 'kitchen' | 'reception') => {
    return kot.items.filter(item => {
      const isRec = isReceptionItem(item);
      return section === 'reception' ? isRec : !isRec;
    });
  };

  // Kitchen tickets (tickets that have at least 1 kitchen item)
  const kitchenTickets = kots
    .filter(kot => {
      const items = getTicketItemsForSection(kot, 'kitchen');
      if (items.length === 0) return false;
      if (statusFilter === 'active' && (kot.status === 'completed' || kot.status === 'bumped')) return false;
      if (statusFilter === 'completed' && (kot.status !== 'completed' && kot.status !== 'bumped')) return false;
      return true;
    })
    .map(kot => ({
      ...kot,
      filteredItems: getTicketItemsForSection(kot, 'kitchen')
    }));

  // Reception tickets (tickets that have at least 1 reception item)
  const receptionTickets = kots
    .filter(kot => {
      const items = getTicketItemsForSection(kot, 'reception');
      if (items.length === 0) return false;
      if (statusFilter === 'active' && (kot.status === 'completed' || kot.status === 'bumped')) return false;
      if (statusFilter === 'completed' && (kot.status !== 'completed' && kot.status !== 'bumped')) return false;
      return true;
    })
    .map(kot => ({
      ...kot,
      filteredItems: getTicketItemsForSection(kot, 'reception')
    }));

  const activeKitchenCount = kots.filter(k => (k.status === 'pending' || k.status === 'in_progress') && getTicketItemsForSection(k, 'kitchen').length > 0).length;
  const activeReceptionCount = kots.filter(k => (k.status === 'pending' || k.status === 'in_progress') && getTicketItemsForSection(k, 'reception').length > 0).length;

  const handleBump = (kotId: string) => {
    updateKOTStatus(kotId, 'completed');
  };

  const handleStartCooking = (kotId: string) => {
    updateKOTStatus(kotId, 'in_progress');
  };

  return (
    <div className="space-y-6">
      {/* KOT Header & Controls */}
      <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-gray-900 tracking-tight">
              Kitchen Order Tickets (KOT)
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200 font-mono">
              {activeKitchenCount + activeReceptionCount} Active Tickets
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">
            Automated ticket routing separating Kitchen items from Cafe / Reception Barista orders.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* Active vs Bumped Toggle */}
          <div className="flex p-1 bg-gray-100 rounded-lg text-xs font-semibold">
            <button
              onClick={() => setStatusFilter('active')}
              className={`px-3 py-1.5 rounded-md transition ${
                statusFilter === 'active'
                  ? 'bg-white text-gray-900 shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Active Tickets
            </button>
            <button
              onClick={() => setStatusFilter('completed')}
              className={`px-3 py-1.5 rounded-md transition ${
                statusFilter === 'completed'
                  ? 'bg-white text-gray-900 shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Completed / Bumped
            </button>
          </div>

          <button
            onClick={() => updateSettings({ soundAlerts: !settings.soundAlerts })}
            className={`p-2 rounded-lg border transition ${
              settings.soundAlerts
                ? 'bg-amber-50 text-amber-700 border-amber-200'
                : 'bg-gray-50 text-gray-500 border-gray-200'
            }`}
            title="KOT Audio Chime"
          >
            {settings.soundAlerts ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Section Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-gray-200 pb-2">
        <button
          onClick={() => setActiveSection('all')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 ${
            activeSection === 'all'
              ? 'bg-gray-900 text-white shadow-xs'
              : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
          }`}
        >
          <span>All Stations</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-white/20">
            {activeKitchenCount + activeReceptionCount}
          </span>
        </button>

        <button
          onClick={() => setActiveSection('kitchen')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 ${
            activeSection === 'kitchen'
              ? 'bg-amber-500 text-white shadow-xs'
              : 'bg-white border border-gray-200 text-amber-800 hover:bg-amber-50'
          }`}
        >
          <ChefHat className="w-3.5 h-3.5" />
          <span>Kitchen KOT (Food, Wok, Tandoor)</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-white/20">
            {activeKitchenCount}
          </span>
        </button>

        <button
          onClick={() => setActiveSection('reception')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 ${
            activeSection === 'reception'
              ? 'bg-purple-600 text-white shadow-xs'
              : 'bg-white border border-gray-200 text-purple-800 hover:bg-purple-50'
          }`}
        >
          <Coffee className="w-3.5 h-3.5" />
          <span>Reception KOT (Drinks, Cafe, Desserts)</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-white/20">
            {activeReceptionCount}
          </span>
        </button>
      </div>

      {/* KOT Display Area */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* KITCHEN KOT COLUMN */}
        {(activeSection === 'all' || activeSection === 'kitchen') && (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-amber-50/70 border border-amber-200 rounded-xl">
              <div className="flex items-center gap-2">
                <ChefHat className="w-5 h-5 text-amber-600" />
                <h3 className="font-bold text-sm text-amber-950">
                  Kitchen KOT
                </h3>
              </div>
              <span className="text-xs font-bold text-amber-800 font-mono">
                {kitchenTickets.length} Tickets
              </span>
            </div>

            {kitchenTickets.length === 0 ? (
              <div className="p-8 bg-white rounded-xl border border-gray-200 text-center text-gray-400 text-xs">
                No active kitchen tickets.
              </div>
            ) : (
              kitchenTickets.map(kot => (
                <div
                  key={`kitchen-${kot.id}`}
                  className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden"
                >
                  {/* Ticket Header */}
                  <div className="p-3.5 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-sm text-gray-900">
                          {kot.kotNumber}
                        </span>
                        <span className="text-xs font-bold text-amber-800 px-2 py-0.5 rounded-full bg-amber-100">
                          Table {kot.tableNumber < 10 ? `0${kot.tableNumber}` : kot.tableNumber}
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-500 mt-0.5">
                        Order #{kot.orderNumber} • {new Date(kot.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>

                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize border ${
                        kot.status === 'completed'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : kot.status === 'in_progress'
                          ? 'bg-blue-50 text-blue-700 border-blue-200'
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}
                    >
                      {kot.status === 'in_progress' ? 'Cooking' : kot.status}
                    </span>
                  </div>

                  {/* Ticket Items (Only Kitchen Items) */}
                  <div className="p-4 space-y-2 divide-y divide-gray-100 text-xs">
                    {kot.filteredItems.map((item, idx) => (
                      <div key={idx} className="pt-2 first:pt-0 flex items-start justify-between">
                        <div className="flex items-start gap-2.5">
                          <span className="w-6 h-6 rounded-md bg-amber-100 text-amber-900 font-bold flex items-center justify-center font-mono text-xs flex-shrink-0">
                            {item.quantity}
                          </span>
                          <div>
                            <p className="font-bold text-gray-900">{item.name}</p>
                            {item.variant && (
                              <p className="text-[11px] text-gray-500">Size: {item.variant}</p>
                            )}
                            {item.instructions && (
                              <p className="text-[11px] text-rose-600 font-semibold bg-rose-50 px-1.5 py-0.5 rounded-sm inline-block mt-0.5">
                                Note: {item.instructions}
                              </p>
                            )}
                          </div>
                        </div>
                        <span className="text-[10px] font-semibold text-gray-400 bg-gray-50 px-2 py-0.5 rounded-md">
                          Kitchen
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Ticket Actions */}
                  <div className="p-3 bg-gray-50 border-t border-gray-200 flex items-center gap-2">
                    {kot.status === 'pending' && (
                      <button
                        onClick={() => handleStartCooking(kot.id)}
                        className="flex-1 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-xs"
                      >
                        <Flame className="w-3.5 h-3.5" />
                        <span>Start Cooking</span>
                      </button>
                    )}
                    {kot.status !== 'completed' && (
                      <button
                        onClick={() => handleBump(kot.id)}
                        className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-xs"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Mark Ready / Bump</span>
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* RECEPTION KOT COLUMN */}
        {(activeSection === 'all' || activeSection === 'reception') && (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-purple-50/70 border border-purple-200 rounded-xl">
              <div className="flex items-center gap-2">
                <Coffee className="w-5 h-5 text-purple-600" />
                <h3 className="font-bold text-sm text-purple-950">
                  Reception KOT
                </h3>
              </div>
              <span className="text-xs font-bold text-purple-800 font-mono">
                {receptionTickets.length} Tickets
              </span>
            </div>

            {receptionTickets.length === 0 ? (
              <div className="p-8 bg-white rounded-xl border border-gray-200 text-center text-gray-400 text-xs">
                No active reception / barista tickets.
              </div>
            ) : (
              receptionTickets.map(kot => (
                <div
                  key={`reception-${kot.id}`}
                  className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden"
                >
                  {/* Ticket Header */}
                  <div className="p-3.5 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-sm text-gray-900">
                          {kot.kotNumber}
                        </span>
                        <span className="text-xs font-bold text-purple-800 px-2 py-0.5 rounded-full bg-purple-100">
                          Table {kot.tableNumber < 10 ? `0${kot.tableNumber}` : kot.tableNumber}
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-500 mt-0.5">
                        Order #{kot.orderNumber} • {new Date(kot.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>

                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize border ${
                        kot.status === 'completed'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-purple-50 text-purple-700 border-purple-200'
                      }`}
                    >
                      {kot.status}
                    </span>
                  </div>

                  {/* Ticket Items (Only Reception Items) */}
                  <div className="p-4 space-y-2 divide-y divide-gray-100 text-xs">
                    {kot.filteredItems.map((item, idx) => (
                      <div key={idx} className="pt-2 first:pt-0 flex items-start justify-between">
                        <div className="flex items-start gap-2.5">
                          <span className="w-6 h-6 rounded-md bg-purple-100 text-purple-900 font-bold flex items-center justify-center font-mono text-xs flex-shrink-0">
                            {item.quantity}
                          </span>
                          <div>
                            <p className="font-bold text-gray-900">{item.name}</p>
                            {item.variant && (
                              <p className="text-[11px] text-gray-500">Size: {item.variant}</p>
                            )}
                            {item.instructions && (
                              <p className="text-[11px] text-rose-600 font-semibold bg-rose-50 px-1.5 py-0.5 rounded-sm inline-block mt-0.5">
                                Note: {item.instructions}
                              </p>
                            )}
                          </div>
                        </div>
                        <span className="text-[10px] font-semibold text-purple-600 bg-purple-50 px-2 py-0.5 rounded-md">
                          Reception Bar
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Ticket Actions */}
                  <div className="p-3 bg-gray-50 border-t border-gray-200 flex items-center gap-2">
                    {kot.status !== 'completed' && (
                      <button
                        onClick={() => handleBump(kot.id)}
                        className="flex-1 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-xs"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Mark Ready / Prepared</span>
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};
