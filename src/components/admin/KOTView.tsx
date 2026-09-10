import React, { useState, useRef } from 'react';
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
  Check,
  XCircle,
  AlertTriangle,
  Send,
  X,
  RefreshCw,
  BellRing
} from 'lucide-react';
import {
  playReadySound,
  playCancelSound,
  playPrintSound,
  playNewOrderSound
} from '../../utils/sound';
import { ThermalKOTDocument } from '../common/ThermalKOTDocument';
import { ThermalPrintPortal } from '../common/ThermalPrintPortal';
import { triggerThermalPrint } from '../../utils/printUtils';

interface StationTicket extends KOTTicket {
  station: 'kitchen' | 'reception';
  filteredItems: Array<{
    id?: string;
    orderItemId?: string;
    quantity: number;
    name: string;
    variant?: string;
    size?: string;
    color?: string;
    sku?: string;
    department?: string;
    instructions?: string;
    category?: string;
    status?: string;
    cancelled?: boolean;
    cancellationReason?: string;
  }>;
}

export const KOTView: React.FC = () => {
  const {
    kots,
    menuItems,
    updateKOTStatus,
    updateOrderStatus,
    settings,
    updateSettings,
    sendTableNotification,
    orders
  } = usePOS();

  // Local filter states
  const [activeSection, setActiveSection] = useState<'all' | 'kitchen' | 'reception'>('all');
  const [statusFilter, setStatusFilter] = useState<'active' | 'ready' | 'cancelled' | 'all'>('active');

  // Cancel dialog state
  const [cancellingTicket, setCancellingTicket] = useState<{
    kot: KOTTicket;
    station: 'kitchen' | 'reception';
  } | null>(null);
  const [cancelReason, setCancelReason] = useState('Ingredients Out of Stock / Item Unavailable');
  const [customReason, setCustomReason] = useState('');

  // Print slip active state
  const [activePrintTicket, setActivePrintTicket] = useState<StationTicket | null>(null);
  const [actionNotice, setActionNotice] = useState<{
    type: 'ready' | 'cancel' | 'print';
    message: string;
  } | null>(null);

  // Helper to determine if an item belongs to Reception/Cafe or Kitchen
  const isReceptionItem = (item: any) => {
    // 1. Explicit kotDestination check
    if (item.kotDestination === 'RECEPTION') return true;
    if (item.kotDestination === 'KITCHEN') return false;

    // 2. Department check: SHOP items always route to RECEPTION
    if (item.department === 'SHOP') return true;

    const cat = (item.category || '').toLowerCase();
    const name = (item.name || item.nameSnapshot || '').toLowerCase();
    
    // Check linked menuItem in catalog if category is missing
    let catalogCat = '';
    if (item.menuItemId) {
      const found = menuItems.find(m => m.id === item.menuItemId);
      if (found) {
        if (found.kotDestination === 'RECEPTION') return true;
        if (found.kotDestination === 'KITCHEN') return false;
        if (found.department === 'SHOP') return true;
        catalogCat = (found.category || '').toLowerCase();
      }
    }

    const fullCategory = `${cat} ${catalogCat}`;
    return (
      fullCategory.includes('cafe') ||
      fullCategory.includes('drink') ||
      fullCategory.includes('beverage') ||
      fullCategory.includes('dessert') ||
      fullCategory.includes('barista') ||
      name.includes('coffee') ||
      name.includes('shake') ||
      name.includes('tea') ||
      name.includes('ice cream') ||
      name.includes('lassi') ||
      name.includes('smoothie') ||
      name.includes('cake')
    );
  };

  // Helper for status matching
  const isTicketActive = (status: string) => {
    const s = (status || '').toLowerCase();
    return s === 'pending' || s === 'in_progress' || s === 'preparing';
  };

  const isTicketReady = (status: string) => {
    const s = (status || '').toLowerCase();
    return s === 'ready' || s === 'completed' || s === 'bumped' || s === 'done';
  };

  const isTicketCancelled = (status: string) => {
    return (status || '').toLowerCase() === 'cancelled';
  };

  // Split KOT ticket items for a specific station
  const getTicketItemsForSection = (kot: KOTTicket, section: 'kitchen' | 'reception') => {
    return (kot.items || [])
      .filter(item => {
        const isRec = isReceptionItem(item);
        return section === 'reception' ? isRec : !isRec;
      })
      .map(item => ({
        id: item.id || item.orderItemId,
        orderItemId: item.orderItemId,
        quantity: item.quantity || 1,
        name: (item as any).name || item.nameSnapshot || 'Dish Item',
        variant: item.variant,
        size: (item as any).size,
        color: (item as any).color,
        sku: (item as any).sku,
        department: (item as any).department,
        instructions: item.instructions,
        category: (item as any).category,
        status: (item as any).status,
        cancelled: (item as any).cancelled === true || (item as any).status === 'CANCELLED',
        cancellationReason: (item as any).cancellationReason
      }));
  };

  // Filter KOTs for Kitchen
  const kitchenTickets: StationTicket[] = kots
    .filter(kot => {
      const items = getTicketItemsForSection(kot, 'kitchen');
      if (items.length === 0) return false;

      if (statusFilter === 'active') return isTicketActive(kot.status);
      if (statusFilter === 'ready') return isTicketReady(kot.status);
      if (statusFilter === 'cancelled') return isTicketCancelled(kot.status);
      return true; // 'all'
    })
    .map(kot => ({
      ...kot,
      station: 'kitchen' as const,
      filteredItems: getTicketItemsForSection(kot, 'kitchen')
    }));

  // Filter KOTs for Reception
  const receptionTickets: StationTicket[] = kots
    .filter(kot => {
      const items = getTicketItemsForSection(kot, 'reception');
      if (items.length === 0) return false;

      if (statusFilter === 'active') return isTicketActive(kot.status);
      if (statusFilter === 'ready') return isTicketReady(kot.status);
      if (statusFilter === 'cancelled') return isTicketCancelled(kot.status);
      return true; // 'all'
    })
    .map(kot => ({
      ...kot,
      station: 'reception' as const,
      filteredItems: getTicketItemsForSection(kot, 'reception')
    }));

  // Counts for badge counters
  const activeKitchenCount = kots.filter(
    k => isTicketActive(k.status) && getTicketItemsForSection(k, 'kitchen').length > 0
  ).length;
  const activeReceptionCount = kots.filter(
    k => isTicketActive(k.status) && getTicketItemsForSection(k, 'reception').length > 0
  ).length;

  const showToast = (type: 'ready' | 'cancel' | 'print', message: string) => {
    setActionNotice({ type, message });
    setTimeout(() => {
      setActionNotice(null);
    }, 4500);
  };

  // 1. ACTION: Print KOT for specific location (Kitchen / Reception)
  const handlePrintKOT = async (ticket: StationTicket) => {
    setActivePrintTicket(ticket);
    playPrintSound();

    // Automatically transition ticket to 'in_progress' (Preparing)
    await updateKOTStatus(ticket.id, 'in_progress');

    // Automatically transition linked order to 'preparing'
    let orderToUpdateId = ticket.orderId;
    if (!orderToUpdateId && ticket.kotNumber) {
      const matchOrder = orders.find(
        o => (o.kotNumber && o.kotNumber === ticket.kotNumber) ||
             (o.tableNumber === ticket.tableNumber && o.status === 'placed')
      );
      if (matchOrder) orderToUpdateId = matchOrder.id;
    }
    if (orderToUpdateId) {
      await updateOrderStatus(orderToUpdateId, 'preparing');
    }

    const tableNumStr = ticket.tableNumber < 10 ? `0${ticket.tableNumber}` : `${ticket.tableNumber}`;
    const stationLabel = ticket.station === 'kitchen' ? 'Kitchen Food' : 'Cafe & Reception Bar';

    // Send real-time notification to the guest table
    await sendTableNotification({
      tableNumber: ticket.tableNumber,
      type: 'order_preparing',
      title: `Order In Preparation: ${stationLabel}`,
      message: `Your ${stationLabel.toLowerCase()} order (${ticket.kotNumber}) is now being prepared fresh in the kitchen for Table ${tableNumStr}!`,
      kotId: ticket.id,
      orderId: ticket.orderId,
      station: ticket.station
    });

    showToast(
      'print',
      `Printing & Preparing ${ticket.station === 'kitchen' ? 'Kitchen' : 'Reception'} KOT (${ticket.kotNumber}) for Table ${tableNumStr}...`
    );

    // Give browser small render tick to populate thermal print DOM before window.print()
    setTimeout(() => {
      triggerThermalPrint('80mm');
    }, 100);
  };

  // 2. ACTION: Mark Ready & notify table number
  const handleMarkReady = async (ticket: StationTicket) => {
    const tableNumStr = ticket.tableNumber < 10 ? `0${ticket.tableNumber}` : `${ticket.tableNumber}`;
    const stationLabel = ticket.station === 'kitchen' ? 'Kitchen Food' : 'Cafe & Reception Bar';

    // Update KOT in POS context & Firestore
    await updateKOTStatus(ticket.id, 'ready');

    // Send real-time notification to the guest table
    await sendTableNotification({
      tableNumber: ticket.tableNumber,
      type: 'order_ready',
      title: `Order Ready: ${stationLabel}`,
      message: `Your ${stationLabel.toLowerCase()} order (${ticket.kotNumber}) is freshly prepared and ready to be served to Table ${tableNumStr}!`,
      kotId: ticket.id,
      orderId: ticket.orderId,
      station: ticket.station
    });

    playReadySound();

    showToast(
      'ready',
      `Table ${tableNumStr} notified: Order (${ticket.kotNumber}) is Ready!`
    );
  };

  // 3. ACTION: Open Cancel Dialog
  const handleOpenCancelDialog = (kot: KOTTicket, station: 'kitchen' | 'reception') => {
    setCancellingTicket({ kot, station });
    setCancelReason('Ingredients Out of Stock / Item Unavailable');
    setCustomReason('');
  };

  // 4. ACTION: Confirm Cancel & notify guest order not available
  const handleConfirmCancel = async () => {
    if (!cancellingTicket) return;

    const { kot, station } = cancellingTicket;
    const finalReason = customReason.trim() ? customReason.trim() : cancelReason;
    const tableNumStr = kot.tableNumber < 10 ? `0${kot.tableNumber}` : `${kot.tableNumber}`;
    const stationLabel = station === 'kitchen' ? 'Kitchen items' : 'Beverages / Cafe items';

    // Update KOT in POS context & Firestore
    await updateKOTStatus(kot.id, 'cancelled', finalReason);

    // Send real-time notification to the guest table that order is unavailable
    await sendTableNotification({
      tableNumber: kot.tableNumber,
      type: 'order_cancelled',
      title: `Order Update: ${stationLabel} Not Available`,
      message: `We apologize, ${stationLabel} in order (${kot.kotNumber}) cannot be prepared at this time: ${finalReason}. Please check with staff or choose an alternative from the menu.`,
      kotId: kot.id,
      orderId: kot.orderId,
      station
    });

    playCancelSound();

    showToast(
      'cancel',
      `KOT ${kot.kotNumber} cancelled. Table ${tableNumStr} received cancellation alert.`
    );

    setCancellingTicket(null);
  };

  // Test sound alert
  const handleTestChime = () => {
    playNewOrderSound();
    showToast('print', 'Testing speaker chime: Audio context is active!');
  };

  // Helper for time elapsed
  const getTimeElapsed = (createdAt: string) => {
    try {
      const created = new Date(createdAt).getTime();
      const diffMins = Math.max(0, Math.floor((Date.now() - created) / 60000));
      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      const hours = Math.floor(diffMins / 60);
      return `${hours}h ${diffMins % 60}m ago`;
    } catch {
      return '';
    }
  };

  return (
    <div className="space-y-6">
      {/* Real-time Notification Banner / Toast */}
      {actionNotice && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between shadow-md transition-all duration-300 animate-in slide-in-from-top-2 ${
            actionNotice.type === 'ready'
              ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
              : actionNotice.type === 'cancel'
              ? 'bg-rose-50 border-rose-300 text-rose-900'
              : 'bg-neutral-900 border-neutral-800 text-white'
          }`}
        >
          <div className="flex items-center gap-3">
            {actionNotice.type === 'ready' && <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />}
            {actionNotice.type === 'cancel' && <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0" />}
            {actionNotice.type === 'print' && <Printer className="w-5 h-5 text-amber-400 flex-shrink-0" />}
            <span className="text-xs sm:text-sm font-semibold">{actionNotice.message}</span>
          </div>
          <button
            onClick={() => setActionNotice(null)}
            className="text-xs opacity-70 hover:opacity-100 p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* KOT Top Bar & Filtering */}
      <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h2 className="text-lg font-bold text-gray-900 tracking-tight flex items-center gap-2">
              <ChefHat className="w-5 h-5 text-amber-600" />
              <span>Kitchen Order Tickets (KOT)</span>
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200 font-mono">
              {activeKitchenCount + activeReceptionCount} Active Orders
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Dispatch, print thermal slips, signal table readiness, and notify guests in real-time.
          </p>
        </div>

        {/* Action Controls & Sound Settings */}
        <div className="flex items-center flex-wrap gap-2.5">
          {/* Status Filter Buttons */}
          <div className="flex p-1 bg-gray-100 rounded-lg text-xs font-semibold">
            <button
              onClick={() => setStatusFilter('active')}
              className={`px-3 py-1.5 rounded-md transition ${
                statusFilter === 'active'
                  ? 'bg-white text-gray-900 shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Active ({activeKitchenCount + activeReceptionCount})
            </button>
            <button
              onClick={() => setStatusFilter('ready')}
              className={`px-3 py-1.5 rounded-md transition ${
                statusFilter === 'ready'
                  ? 'bg-white text-emerald-800 shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Ready
            </button>
            <button
              onClick={() => setStatusFilter('cancelled')}
              className={`px-3 py-1.5 rounded-md transition ${
                statusFilter === 'cancelled'
                  ? 'bg-white text-rose-800 shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Cancelled
            </button>
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-md transition ${
                statusFilter === 'all'
                  ? 'bg-white text-gray-900 shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              All
            </button>
          </div>

          {/* Sound alert toggle & test */}
          <div className="flex items-center gap-1 bg-gray-50 border border-gray-200 p-1 rounded-lg">
            <button
              onClick={() => updateSettings({ soundAlerts: !settings.soundAlerts })}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition ${
                settings.soundAlerts
                  ? 'bg-amber-100 text-amber-900'
                  : 'bg-transparent text-gray-400'
              }`}
              title={settings.soundAlerts ? 'Sound Alerts: Enabled' : 'Sound Alerts: Muted'}
            >
              {settings.soundAlerts ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
              <span>{settings.soundAlerts ? 'Sound On' : 'Muted'}</span>
            </button>

            <button
              onClick={handleTestChime}
              className="px-2 py-1 text-xs text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded transition flex items-center gap-1"
              title="Test audio chime on your speakers"
            >
              <BellRing className="w-3.5 h-3.5 text-amber-600" />
              <span>Test Chime</span>
            </button>
          </div>
        </div>
      </div>

      {/* Station Selector Sub-Tabs */}
      <div className="flex items-center gap-2 border-b border-gray-200 pb-3">
        <button
          onClick={() => setActiveSection('all')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 ${
            activeSection === 'all'
              ? 'bg-neutral-900 text-white shadow-xs'
              : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
          }`}
        >
          <Filter className="w-3.5 h-3.5" />
          <span>All Stations</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-neutral-700 text-neutral-200 font-mono">
            {kitchenTickets.length + receptionTickets.length}
          </span>
        </button>

        <button
          onClick={() => setActiveSection('kitchen')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 ${
            activeSection === 'kitchen'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
          }`}
        >
          <ChefHat className="w-3.5 h-3.5 text-amber-500" />
          <span>Kitchen Station</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-100 text-amber-800 font-mono">
            {kitchenTickets.length}
          </span>
        </button>

        <button
          onClick={() => setActiveSection('reception')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 ${
            activeSection === 'reception'
              ? 'bg-purple-600 text-white shadow-xs'
              : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
          }`}
        >
          <Coffee className="w-3.5 h-3.5 text-purple-500" />
          <span>Reception / Barista</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-purple-100 text-purple-800 font-mono">
            {receptionTickets.length}
          </span>
        </button>
      </div>

      {/* Main Dual-Station KOT Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ====================================================
            1. KITCHEN KOT COLUMN
           ==================================================== */}
        {(activeSection === 'all' || activeSection === 'kitchen') && (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3.5 bg-amber-50/80 border border-amber-200 rounded-xl">
              <div className="flex items-center gap-2">
                <ChefHat className="w-5 h-5 text-amber-700" />
                <div>
                  <h3 className="font-bold text-sm text-amber-950">Kitchen Station KOT</h3>
                  <p className="text-[11px] text-amber-800">Momos, Bowls, Tandoor, Asian Wok & Food</p>
                </div>
              </div>
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-white text-amber-900 border border-amber-300 font-mono">
                {kitchenTickets.length} Tickets
              </span>
            </div>

            {kitchenTickets.length === 0 ? (
              <div className="p-12 bg-white rounded-xl border border-gray-200 text-center text-gray-400 text-xs">
                <ChefHat className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="font-medium text-gray-600">No tickets found for Kitchen Station</p>
                <p className="text-gray-400 text-[11px] mt-0.5">
                  Orders placed by guests or staff will route here automatically.
                </p>
              </div>
            ) : (
              kitchenTickets.map(kot => {
                const tableNumStr = kot.tableNumber < 10 ? `0${kot.tableNumber}` : `${kot.tableNumber}`;
                const isReady = isTicketReady(kot.status);
                const isCancelled = isTicketCancelled(kot.status);

                return (
                  <div
                    key={`kitchen-${kot.id}`}
                    className={`bg-white rounded-xl border shadow-xs overflow-hidden transition-all ${
                      isReady
                        ? 'border-emerald-200 bg-emerald-50/10'
                        : isCancelled
                        ? 'border-rose-200 bg-rose-50/10 opacity-75'
                        : 'border-gray-200 hover:border-amber-300'
                    }`}
                  >
                    {/* Header */}
                    <div className="p-3.5 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-sm text-gray-900">
                            {kot.kotNumber}
                          </span>
                          <span className="text-xs font-bold text-amber-900 px-2.5 py-0.5 rounded-full bg-amber-100 border border-amber-200 font-mono">
                            Table {tableNumStr}
                          </span>
                        </div>
                        <p className="text-[11px] text-gray-500 mt-1 flex items-center gap-1.5">
                          <Clock className="w-3 h-3 text-gray-400" />
                          <span>Order #{kot.orderNumber}</span>
                          <span>•</span>
                          <span>{getTimeElapsed(kot.createdAt)}</span>
                          <span>({new Date(kot.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})</span>
                        </p>
                      </div>

                      <div className="flex flex-col items-end gap-1">
                        <span
                          className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full capitalize border ${
                            isReady
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : isCancelled
                              ? 'bg-rose-50 text-rose-700 border-rose-200'
                              : kot.status === 'PREPARING' || kot.status === 'in_progress'
                              ? 'bg-blue-50 text-blue-700 border-blue-200'
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}
                        >
                          {kot.status === 'PREPARING' || kot.status === 'in_progress' ? 'Preparing' : kot.status}
                        </span>
                        <span className="text-[10px] font-semibold text-gray-400">
                          {kot.orderSource === 'GUEST_QR' ? 'Guest Self-Order' : 'POS Waiter'}
                        </span>
                      </div>
                    </div>

                    {/* Cancellation alert banner if any items were cancelled */}
                    {kot.filteredItems.some(i => i.cancelled) && (
                      <div className="px-4 py-2 bg-rose-50 border-b border-rose-200/60 flex items-center gap-2 text-xs font-bold text-rose-800">
                        <AlertTriangle className="w-4 h-4 flex-shrink-0 text-rose-600" />
                        <span>Item Cancelled by Guest from Table {kot.tableNumber} - Do not prepare marked items</span>
                      </div>
                    )}

                    {/* Filtered Kitchen Items */}
                    <div className="p-4 space-y-2.5 divide-y divide-gray-100 text-xs">
                      {kot.filteredItems.map((item, idx) => (
                        <div
                          key={idx}
                          className={`pt-2.5 first:pt-0 flex items-start justify-between ${
                            item.cancelled ? 'opacity-65 bg-rose-50/60 -mx-2 px-2 py-1.5 rounded-lg border border-rose-200/50' : ''
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <span
                              className={`w-7 h-7 rounded-lg font-bold flex items-center justify-center font-mono text-xs flex-shrink-0 shadow-2xs ${
                                item.cancelled
                                  ? 'bg-rose-100 text-rose-700 line-through'
                                  : 'bg-amber-100 text-amber-900'
                              }`}
                            >
                              {item.quantity}
                            </span>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className={`font-bold text-sm ${item.cancelled ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
                                  {item.name}
                                </p>
                                {item.cancelled && (
                                  <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 border border-rose-300">
                                    CANCELLED BY GUEST
                                  </span>
                                )}
                              </div>
                              {item.cancelled && item.cancellationReason && (
                                <p className="text-[11px] text-rose-600 italic mt-0.5 font-medium">
                                  Reason: {item.cancellationReason}
                                </p>
                              )}
                              {!item.cancelled && item.variant && (
                                <p className="text-[11px] text-gray-500 font-medium">Variant: {item.variant}</p>
                              )}
                              {!item.cancelled && item.instructions && (
                                <p className="text-[11px] text-rose-700 font-semibold bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-md inline-block mt-1">
                                  Note: {item.instructions}
                                </p>
                              )}
                            </div>
                          </div>
                          <span
                            className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border flex-shrink-0 ${
                              item.cancelled
                                ? 'text-rose-700 bg-rose-100 border-rose-200'
                                : 'text-amber-800 bg-amber-50 border-amber-200'
                            }`}
                          >
                            {item.cancelled ? 'CANCELLED' : 'Kitchen'}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Cancellation Note if cancelled */}
                    {isCancelled && (kot as any).cancellationReason && (
                      <div className="px-4 py-2 bg-rose-50/70 border-t border-rose-100 text-[11px] text-rose-700">
                        <strong>Reason:</strong> {(kot as any).cancellationReason}
                      </div>
                    )}

                    {/* Three Separate Action Buttons: Print, Ready, and Cancel */}
                    <div className="p-3 bg-gray-50 border-t border-gray-200 flex items-center gap-2 flex-wrap">
                      {/* 1. PRINT BUTTON */}
                      <button
                        onClick={() => handlePrintKOT(kot)}
                        className="flex-1 min-w-[90px] py-2 px-3 bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                        title="Print Kitchen KOT thermal slip"
                      >
                        <Printer className="w-3.5 h-3.5 text-amber-400" />
                        <span>Print</span>
                      </button>

                      {/* 2. READY BUTTON */}
                      {!isReady && !isCancelled && (
                        <button
                          onClick={() => handleMarkReady(kot)}
                          className="flex-1 min-w-[90px] py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                          title="Mark KOT Ready and notify table"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Ready</span>
                        </button>
                      )}

                      {/* 3. CANCEL BUTTON */}
                      {!isCancelled && (
                        <button
                          onClick={() => handleOpenCancelDialog(kot, 'kitchen')}
                          className="py-2 px-3 bg-white hover:bg-rose-50 text-rose-700 border border-rose-200 hover:border-rose-300 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                          title="Cancel KOT and notify table item is not available"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Cancel</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* ====================================================
            2. RECEPTION / BARISTA KOT COLUMN
           ==================================================== */}
        {(activeSection === 'all' || activeSection === 'reception') && (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3.5 bg-purple-50/80 border border-purple-200 rounded-xl">
              <div className="flex items-center gap-2">
                <Coffee className="w-5 h-5 text-purple-700" />
                <div>
                  <h3 className="font-bold text-sm text-purple-950">Reception & Barista KOT</h3>
                  <p className="text-[11px] text-purple-800">Espresso, Drinks, Smoothies, Beverages & Bakery</p>
                </div>
              </div>
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-white text-purple-900 border border-purple-300 font-mono">
                {receptionTickets.length} Tickets
              </span>
            </div>

            {receptionTickets.length === 0 ? (
              <div className="p-12 bg-white rounded-xl border border-gray-200 text-center text-gray-400 text-xs">
                <Coffee className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="font-medium text-gray-600">No tickets found for Reception / Barista</p>
                <p className="text-gray-400 text-[11px] mt-0.5">
                  Beverages and cafe orders will appear here automatically.
                </p>
              </div>
            ) : (
              receptionTickets.map(kot => {
                const tableNumStr = kot.tableNumber < 10 ? `0${kot.tableNumber}` : `${kot.tableNumber}`;
                const isReady = isTicketReady(kot.status);
                const isCancelled = isTicketCancelled(kot.status);

                return (
                  <div
                    key={`reception-${kot.id}`}
                    className={`bg-white rounded-xl border shadow-xs overflow-hidden transition-all ${
                      isReady
                        ? 'border-emerald-200 bg-emerald-50/10'
                        : isCancelled
                        ? 'border-rose-200 bg-rose-50/10 opacity-75'
                        : 'border-gray-200 hover:border-purple-300'
                    }`}
                  >
                    {/* Header */}
                    <div className="p-3.5 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-sm text-gray-900">
                            {kot.kotNumber}
                          </span>
                          <span className="text-xs font-bold text-purple-900 px-2.5 py-0.5 rounded-full bg-purple-100 border border-purple-200 font-mono">
                            Table {tableNumStr}
                          </span>
                        </div>
                        <p className="text-[11px] text-gray-500 mt-1 flex items-center gap-1.5">
                          <Clock className="w-3 h-3 text-gray-400" />
                          <span>Order #{kot.orderNumber}</span>
                          <span>•</span>
                          <span>{getTimeElapsed(kot.createdAt)}</span>
                          <span>({new Date(kot.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})</span>
                        </p>
                      </div>

                      <div className="flex flex-col items-end gap-1">
                        <span
                          className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full capitalize border ${
                            isReady
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : isCancelled
                              ? 'bg-rose-50 text-rose-700 border-rose-200'
                              : kot.status === 'PREPARING' || kot.status === 'in_progress'
                              ? 'bg-blue-50 text-blue-700 border-blue-200'
                              : 'bg-purple-50 text-purple-700 border-purple-200'
                          }`}
                        >
                          {kot.status === 'PREPARING' || kot.status === 'in_progress' ? 'Preparing' : kot.status}
                        </span>
                        <span className="text-[10px] font-semibold text-gray-400">
                          {kot.orderSource === 'GUEST_QR' ? 'Guest Self-Order' : 'POS Waiter'}
                        </span>
                      </div>
                    </div>

                    {/* Cancellation alert banner if any items were cancelled */}
                    {kot.filteredItems.some(i => i.cancelled) && (
                      <div className="px-4 py-2 bg-rose-50 border-b border-rose-200/60 flex items-center gap-2 text-xs font-bold text-rose-800">
                        <AlertTriangle className="w-4 h-4 flex-shrink-0 text-rose-600" />
                        <span>Item Cancelled by Guest from Table {kot.tableNumber} - Do not prepare marked items</span>
                      </div>
                    )}

                    {/* Filtered Reception Items */}
                    <div className="p-4 space-y-2.5 divide-y divide-gray-100 text-xs">
                      {kot.filteredItems.map((item, idx) => (
                        <div
                          key={idx}
                          className={`pt-2.5 first:pt-0 flex items-start justify-between ${
                            item.cancelled ? 'opacity-65 bg-rose-50/60 -mx-2 px-2 py-1.5 rounded-lg border border-rose-200/50' : ''
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <span
                              className={`w-7 h-7 rounded-lg font-bold flex items-center justify-center font-mono text-xs flex-shrink-0 shadow-2xs ${
                                item.cancelled
                                  ? 'bg-rose-100 text-rose-700 line-through'
                                  : 'bg-purple-100 text-purple-900'
                              }`}
                            >
                              {item.quantity}
                            </span>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className={`font-bold text-sm ${item.cancelled ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
                                  {item.name}
                                </p>
                                {item.department === 'SHOP' && (
                                  <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-indigo-100 text-indigo-800 border border-indigo-200">
                                    SHOP
                                  </span>
                                )}
                                {item.cancelled && (
                                  <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 border border-rose-300">
                                    CANCELLED BY GUEST
                                  </span>
                                )}
                              </div>
                              {item.cancelled && item.cancellationReason && (
                                <p className="text-[11px] text-rose-600 italic mt-0.5 font-medium">
                                  Reason: {item.cancellationReason}
                                </p>
                              )}
                              {!item.cancelled && item.variant && (
                                <p className="text-[11px] text-gray-500 font-medium">Variant: {item.variant}</p>
                              )}
                              {!item.cancelled && (item.size || item.color) && (
                                <p className="text-[11px] text-gray-500 font-medium space-x-1.5">
                                  {item.size && <span>Size: <strong>{item.size}</strong></span>}
                                  {item.color && <span>Color: <strong>{item.color}</strong></span>}
                                </p>
                              )}
                              {!item.cancelled && item.sku && (
                                <p className="text-[10px] font-mono text-gray-400">SKU: {item.sku}</p>
                              )}
                              {!item.cancelled && item.instructions && (
                                <p className="text-[11px] text-rose-700 font-semibold bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-md inline-block mt-1">
                                  Note: {item.instructions}
                                </p>
                              )}
                            </div>
                          </div>
                          <span
                            className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border flex-shrink-0 ${
                              item.cancelled
                                ? 'text-rose-700 bg-rose-100 border-rose-200'
                                : 'text-purple-800 bg-purple-50 border-purple-200'
                            }`}
                          >
                            {item.cancelled ? 'CANCELLED' : 'Reception'}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Cancellation Note if cancelled */}
                    {isCancelled && (kot as any).cancellationReason && (
                      <div className="px-4 py-2 bg-rose-50/70 border-t border-rose-100 text-[11px] text-rose-700">
                        <strong>Reason:</strong> {(kot as any).cancellationReason}
                      </div>
                    )}

                    {/* Three Separate Action Buttons: Print, Ready, and Cancel */}
                    <div className="p-3 bg-gray-50 border-t border-gray-200 flex items-center gap-2 flex-wrap">
                      {/* 1. PRINT BUTTON */}
                      <button
                        onClick={() => handlePrintKOT(kot)}
                        className="flex-1 min-w-[90px] py-2 px-3 bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                        title="Print Reception KOT thermal slip"
                      >
                        <Printer className="w-3.5 h-3.5 text-purple-300" />
                        <span>Print</span>
                      </button>

                      {/* 2. READY BUTTON */}
                      {!isReady && !isCancelled && (
                        <button
                          onClick={() => handleMarkReady(kot)}
                          className="flex-1 min-w-[90px] py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                          title="Mark KOT Ready and notify table"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Ready</span>
                        </button>
                      )}

                      {/* 3. CANCEL BUTTON */}
                      {!isCancelled && (
                        <button
                          onClick={() => handleOpenCancelDialog(kot, 'reception')}
                          className="py-2 px-3 bg-white hover:bg-rose-50 text-rose-700 border border-rose-200 hover:border-rose-300 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                          title="Cancel KOT and notify table item is not available"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Cancel</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* ====================================================
          CANCELLATION REASON & TABLE NOTIFICATION MODAL
         ==================================================== */}
      {cancellingTicket && (
        <div className="fixed inset-0 z-50 overflow-hidden flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-2xl w-full max-w-md overflow-hidden">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-rose-50/50">
              <div className="flex items-center gap-2.5 text-rose-900">
                <AlertTriangle className="w-5 h-5 text-rose-600" />
                <h3 className="font-bold text-base">Cancel KOT & Notify Guest</h3>
              </div>
              <button
                onClick={() => setCancellingTicket(null)}
                className="p-1 text-gray-400 hover:text-gray-700 rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 flex items-center justify-between">
                <div>
                  <span className="text-gray-500 font-medium">Ticket:</span>{' '}
                  <strong className="font-mono text-gray-900">{cancellingTicket.kot.kotNumber}</strong>
                  <span className="mx-2 text-gray-300">•</span>
                  <span className="text-gray-500 font-medium">Station:</span>{' '}
                  <strong className="capitalize text-gray-900">{cancellingTicket.station}</strong>
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 font-bold font-mono">
                  Table {cancellingTicket.kot.tableNumber < 10 ? `0${cancellingTicket.kot.tableNumber}` : cancellingTicket.kot.tableNumber}
                </span>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-2">
                  Select Reason (Guest Notification):
                </label>
                <div className="space-y-2">
                  {[
                    'Ingredients Out of Stock / Item Unavailable',
                    'Kitchen Equipment Maintenance / Temporarily Unavailable',
                    'Guest Requested Cancellation',
                    'Duplicate Order Submitted by Mistake'
                  ].map(reason => (
                    <label
                      key={reason}
                      className={`flex items-center gap-2.5 p-2.5 rounded-lg border cursor-pointer transition ${
                        cancelReason === reason && !customReason
                          ? 'bg-rose-50 border-rose-300 text-rose-900 font-semibold'
                          : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <input
                        type="radio"
                        name="cancelReason"
                        checked={cancelReason === reason && !customReason}
                        onChange={() => {
                          setCancelReason(reason);
                          setCustomReason('');
                        }}
                        className="text-rose-600 focus:ring-rose-500"
                      />
                      <span>{reason}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">
                  Or Custom Reason to Guest:
                </label>
                <input
                  type="text"
                  placeholder="e.g., Momos freshly sold out today, chef recommends chowmein"
                  value={customReason}
                  onChange={e => setCustomReason(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-rose-500 focus:border-rose-500 outline-none"
                />
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-[11px] leading-relaxed">
                <strong>Real-Time Table Notice:</strong> When confirmed, Table{' '}
                {cancellingTicket.kot.tableNumber < 10 ? `0${cancellingTicket.kot.tableNumber}` : cancellingTicket.kot.tableNumber}{' '}
                will immediately receive an on-screen alert indicating this order is not available.
              </div>
            </div>

            <div className="p-4 bg-gray-50 border-t border-gray-200 flex items-center justify-end gap-2.5">
              <button
                onClick={() => setCancellingTicket(null)}
                className="px-4 py-2 bg-white hover:bg-gray-100 text-gray-700 border border-gray-300 rounded-lg text-xs font-bold transition"
              >
                Keep Order
              </button>
              <button
                onClick={handleConfirmCancel}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition shadow-xs flex items-center gap-1.5"
              >
                <XCircle className="w-3.5 h-3.5" />
                <span>Confirm Cancel & Notify Table</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ====================================================
          PRINTABLE THERMAL KOT DOCUMENT (Rendered at Root Portal for 80mm Print)
         ==================================================== */}
      {activePrintTicket && (
        <ThermalPrintPortal active={!!activePrintTicket}>
          <ThermalKOTDocument
            ticket={activePrintTicket}
            settings={settings}
            linkedOrder={orders.find(o => o.id === activePrintTicket.orderId)}
            paperWidth="80mm"
            id="printable-kot"
          />
        </ThermalPrintPortal>
      )}
    </div>
  );
};
