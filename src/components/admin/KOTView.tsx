import React, { useState, useRef, useEffect, useMemo } from 'react';
import { usePOS } from '../../context/POSContext';
import { KOTTicket, KOTItem, KOTDestination } from '../../types';
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
  BellRing,
  Timer,
  Zap,
  Tag
} from 'lucide-react';
import {
  playReadySound,
  playCancelSound,
  playPrintSound,
  playNewOrderSound,
  playPrioritySound
} from '../../utils/sound';
import { ThermalKOTDocument } from '../common/ThermalKOTDocument';
import { ThermalPrintPortal } from '../common/ThermalPrintPortal';
import { triggerThermalPrint } from '../../utils/printUtils';
import { OrderElapsedTimer } from '../common/OrderElapsedTimer';

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
    priority?: 'HIGH' | 'STANDARD';
    cancelled?: boolean;
    cancellationReason?: string;
  }>;
}

export const KOTView: React.FC = () => {
  const {
    kots,
    menuItems,
    updateKOTStatus,
    updateKOTItemPriority,
    updateKOTPriority,
    updateOrderStatus,
    updateTableOrdersStatus,
    settings,
    updateSettings,
    sendTableNotification,
    orders
  } = usePOS();

  // Local filter states
  const [activeSection, setActiveSection] = useState<'all' | 'kitchen' | 'reception'>('all');
  const [statusFilter, setStatusFilter] = useState<'active' | 'preparing' | 'ready' | 'served' | 'cancelled' | 'all'>('active');
  const [priorityFilter, setPriorityFilter] = useState<'all' | 'high_only'>('all');

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

  // Track newly arrived KOT tickets in Live KOT Activity Stream for real-time alert and audio chime
  const knownKotIds = useRef<Set<string>>(new Set());
  const isKotsInitialized = useRef(false);

  useEffect(() => {
    if (!kots || kots.length === 0) return;

    if (!isKotsInitialized.current) {
      knownKotIds.current = new Set(kots.map(k => k.id));
      isKotsInitialized.current = true;
      return;
    }

    const newArrivals = kots.filter(k => !knownKotIds.current.has(k.id));
    if (newArrivals.length > 0) {
      newArrivals.forEach(k => knownKotIds.current.add(k.id));
      const freshest = newArrivals[0];
      const tableNumStr = freshest.tableNumber < 10 ? `0${freshest.tableNumber}` : `${freshest.tableNumber}`;

      // Play chime if audio alerts are enabled
      if (settings.soundAlerts !== false) {
        playNewOrderSound();
      }

      const stationName = freshest.destination === 'RECEPTION' ? 'Reception / Barista' : 'Kitchen';
      setActionNotice({
        type: 'print',
        message: `🔔 New Order Ticket #${freshest.kotNumber} received for Table ${tableNumStr}! Routed to ${stationName}.`
      });
    }
  }, [kots, settings.soundAlerts]);

  // Combine official kots with any active/preparing orders that don't yet have a KOT ticket
  const allTickets: KOTTicket[] = useMemo(() => {
    const list = [...kots];
    const existingOrderIds = new Set(kots.map(k => k.orderId).filter(Boolean));
    const existingOrderNumbers = new Set(kots.map(k => k.orderNumber).filter(Boolean));

    orders.forEach(ord => {
      const ordStatusLower = (ord.status || '').toLowerCase().trim();
      if (ordStatusLower === 'cancelled') return;
      const isAlreadyCovered =
        Boolean(ord.id && existingOrderIds.has(ord.id)) ||
        Boolean(ord.orderNumber && existingOrderNumbers.has(ord.orderNumber));

      if (!isAlreadyCovered && ord.items && ord.items.length > 0) {
        const tableNum = ord.tableNumber || 1;
        const numStr = tableNum < 10 ? `0${tableNum}` : `${tableNum}`;
        const synthesizedStatus =
          ordStatusLower === 'preparing' ||
          ordStatusLower === 'confirmed' ||
          ordStatusLower === 'cooking' ||
          ordStatusLower === 'in_progress' ||
          ordStatusLower === 'printing' ||
          ordStatusLower === 'in_preparation' ||
          ordStatusLower === 'in preparing' ||
          ordStatusLower === 'in_preparing'
            ? 'PREPARING'
            : ordStatusLower === 'served' ||
              ordStatusLower === 'ready' ||
              ordStatusLower === 'completed'
            ? 'SERVED'
            : 'PENDING';

        const kitchenItems = ord.items.filter(i => !isReceptionItem(i));
        const receptionItems = ord.items.filter(i => isReceptionItem(i));

        if (kitchenItems.length > 0) {
          list.push({
            id: `kot-sync-k-${ord.id}`,
            kotNumber: ord.kotNumber
              ? `${ord.kotNumber}-K`
              : `KOT-K-${(ord.orderNumber || '000').replace(/\D/g, '').slice(-3) || '101'}`,
            orderId: ord.id,
            orderNumber: ord.orderNumber,
            sessionId: ord.sessionId || `SES-${tableNum}`,
            tableId: ord.tableId || `T${numStr}`,
            tableNumber: tableNum,
            destination: 'KITCHEN',
            status: synthesizedStatus as any,
            priority:
              ord.priority ||
              (kitchenItems.some(i => i.priority === 'HIGH') ? 'HIGH' : 'STANDARD'),
            items: kitchenItems.map((it, idx) => ({
              id: `kot-it-${it.id || idx}`,
              orderItemId: it.id,
              menuItemId: it.menuItemId,
              nameSnapshot: it.name || (it as any).nameSnapshot || 'Dish',
              name: it.name || (it as any).nameSnapshot || 'Dish',
              quantity: it.quantity || 1,
              notes: it.instructions || (it as any).notes || '',
              status: 'PENDING',
              category: it.category,
              priority: it.priority || 'STANDARD',
              department: (it as any).department,
              kotDestination: 'KITCHEN' as const
            })),
            createdAt: ord.createdAt || new Date().toISOString(),
            updatedAt: ord.updatedAt || new Date().toISOString(),
            tableLabel: `Table T${numStr}`
          });
        }

        if (receptionItems.length > 0) {
          list.push({
            id: `kot-sync-r-${ord.id}`,
            kotNumber: ord.kotNumber
              ? `${ord.kotNumber}-R`
              : `KOT-R-${(ord.orderNumber || '000').replace(/\D/g, '').slice(-3) || '102'}`,
            orderId: ord.id,
            orderNumber: ord.orderNumber,
            sessionId: ord.sessionId || `SES-${tableNum}`,
            tableId: ord.tableId || `T${numStr}`,
            tableNumber: tableNum,
            destination: 'RECEPTION',
            status: synthesizedStatus as any,
            priority:
              ord.priority ||
              (receptionItems.some(i => i.priority === 'HIGH') ? 'HIGH' : 'STANDARD'),
            items: receptionItems.map((it, idx) => ({
              id: `kot-it-rec-${it.id || idx}`,
              orderItemId: it.id,
              menuItemId: it.menuItemId,
              nameSnapshot: it.name || (it as any).nameSnapshot || 'Dish',
              name: it.name || (it as any).nameSnapshot || 'Dish',
              quantity: it.quantity || 1,
              notes: it.instructions || (it as any).notes || '',
              status: 'PENDING',
              category: it.category,
              priority: it.priority || 'STANDARD',
              department: (it as any).department,
              kotDestination: 'RECEPTION' as const
            })),
            createdAt: ord.createdAt || new Date().toISOString(),
            updatedAt: ord.updatedAt || new Date().toISOString(),
            tableLabel: `Table T${numStr}`
          });
        }
      }
    });

    return list;
  }, [kots, orders]);

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

  // Helper for effective status matching across KOT and linked Order
  const getEffectiveTicketStatus = (kot: KOTTicket): string => {
    const kotStatus = (kot.status || '').toLowerCase().trim();
    if (kotStatus === 'cancelled') return 'cancelled';
    if (
      kotStatus === 'served' ||
      kotStatus === 'ready' ||
      kotStatus === 'completed' ||
      kotStatus === 'bumped' ||
      kotStatus === 'done'
    ) {
      return 'served';
    }
    if (
      kotStatus === 'preparing' ||
      kotStatus === 'in_progress' ||
      kotStatus === 'in-progress' ||
      kotStatus === 'cooking' ||
      kotStatus === 'printing' ||
      kotStatus === 'printed' ||
      kotStatus === 'confirmed' ||
      kotStatus === 'in_preparation' ||
      kotStatus === 'in preparation' ||
      kotStatus === 'in preparing' ||
      kotStatus === 'in_preparing'
    ) {
      return 'preparing';
    }
    if (
      kotStatus === 'pending' ||
      kotStatus === 'new' ||
      kotStatus === 'placed'
    ) {
      return 'pending';
    }

    // Only if ticket status is completely unassigned, check if linked order was cancelled
    let linkedOrder = kot.orderId ? orders.find(o => o.id === kot.orderId) : undefined;
    if (!linkedOrder && kot.orderNumber) {
      linkedOrder = orders.find(o => o.orderNumber === kot.orderNumber);
    }
    if (linkedOrder) {
      const ordStatus = (linkedOrder.status || '').toLowerCase().trim();
      if (ordStatus === 'cancelled') {
        return 'cancelled';
      }
    }

    return kotStatus || 'pending';
  };

  // Helper for status matching
  // 'active' represents newly received orders waiting to be sent to kitchen/bar or printed
  const isTicketActive = (status: string) => {
    const s = (status || '').toLowerCase().trim();
    return s === 'pending' || s === 'new' || s === 'placed';
  };

  // 'preparing' represents orders in progress / being prepared in kitchen or barista
  const isTicketPreparing = (status: string) => {
    const s = (status || '').toLowerCase().trim();
    return (
      s === 'preparing' ||
      s === 'in_progress' ||
      s === 'in-progress' ||
      s === 'cooking' ||
      s === 'printing' ||
      s === 'printed' ||
      s === 'confirmed' ||
      s === 'in_preparation' ||
      s === 'in-preparation' ||
      s === 'in preparation' ||
      s === 'in preparing' ||
      s === 'in_preparing'
    );
  };

  const isTicketReady = (status: string) => {
    const s = (status || '').toLowerCase().trim();
    return (
      s === 'ready' ||
      s === 'completed' ||
      s === 'bumped' ||
      s === 'done' ||
      s === 'served'
    );
  };

  const isTicketServed = (status: string) => {
    const s = (status || '').toLowerCase().trim();
    return (
      s === 'served' ||
      s === 'ready' ||
      s === 'completed' ||
      s === 'bumped' ||
      s === 'done'
    );
  };

  const isTicketCancelled = (status: string) => {
    return (status || '').toLowerCase().trim() === 'cancelled';
  };

  // Split KOT ticket items for a specific station
  const getTicketItemsForSection = (kot: KOTTicket, section: 'kitchen' | 'reception') => {
    const kotDest = (kot.destination || '').toUpperCase();
    if (kotDest === 'KITCHEN' && section !== 'kitchen') return [];
    if (kotDest === 'RECEPTION' && section !== 'reception') return [];

    let rawItems = kot.items;
    if (!rawItems || rawItems.length === 0) {
      const linked = orders.find(
        o => (kot.orderId && o.id === kot.orderId) ||
             (kot.orderNumber && o.orderNumber === kot.orderNumber)
      );
      if (linked?.items && linked.items.length > 0) {
        rawItems = linked.items.map((it, idx) => ({
          id: `kot-it-${it.id || idx}`,
          orderItemId: it.id,
          menuItemId: it.menuItemId,
          nameSnapshot: it.name || (it as any).nameSnapshot || 'Dish',
          name: it.name || (it as any).nameSnapshot || 'Dish',
          quantity: it.quantity || 1,
          notes: it.instructions || (it as any).notes || '',
          status: 'PENDING',
          category: it.category,
          priority: it.priority || 'STANDARD',
          department: (it as any).department,
          kotDestination: (it as any).kotDestination
        })) as any;
      }
    }

    return (rawItems || [])
      .filter(item => {
        if (kotDest === 'KITCHEN' && section === 'kitchen') return true;
        if (kotDest === 'RECEPTION' && section === 'reception') return true;

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
        priority: (item.priority || (kot.priority === 'HIGH' ? 'HIGH' : 'STANDARD')) as 'HIGH' | 'STANDARD',
        cancelled: (item as any).cancelled === true || (item as any).status === 'CANCELLED',
        cancellationReason: (item as any).cancellationReason
      }));
  };

  // Helper to determine if a ticket has High Priority
  const isTicketHighPriority = (ticket: StationTicket | KOTTicket) => {
    return ticket.priority === 'HIGH' ||
      Boolean((ticket as any).filteredItems?.some((i: any) => i.priority === 'HIGH')) ||
      Boolean(ticket.items?.some(i => i.priority === 'HIGH'));
  };

  // Filter KOTs for Kitchen
  const kitchenTickets: StationTicket[] = allTickets
    .filter(kot => {
      const items = getTicketItemsForSection(kot, 'kitchen');
      if (items.length === 0) return false;

      const effectiveStatus = getEffectiveTicketStatus(kot);
      if (statusFilter === 'active') return isTicketActive(effectiveStatus);
      if (statusFilter === 'preparing') return isTicketPreparing(effectiveStatus);
      if (statusFilter === 'ready' || statusFilter === 'served') return isTicketServed(effectiveStatus);
      if (statusFilter === 'cancelled') return isTicketCancelled(effectiveStatus);
      return true; // 'all'
    })
    .map(kot => ({
      ...kot,
      status: getEffectiveTicketStatus(kot) as any,
      station: 'kitchen' as const,
      filteredItems: getTicketItemsForSection(kot, 'kitchen')
    }))
    .filter(ticket => {
      if (priorityFilter === 'high_only') {
        return isTicketHighPriority(ticket);
      }
      return true;
    })
    .sort((a, b) => {
      const aHigh = isTicketHighPriority(a);
      const bHigh = isTicketHighPriority(b);
      if (aHigh && !bHigh) return -1;
      if (!aHigh && bHigh) return 1;
      return 0;
    });

  // Filter KOTs for Reception
  const receptionTickets: StationTicket[] = allTickets
    .filter(kot => {
      const items = getTicketItemsForSection(kot, 'reception');
      if (items.length === 0) return false;

      const effectiveStatus = getEffectiveTicketStatus(kot);
      if (statusFilter === 'active') return isTicketActive(effectiveStatus);
      if (statusFilter === 'preparing') return isTicketPreparing(effectiveStatus);
      if (statusFilter === 'ready' || statusFilter === 'served') return isTicketServed(effectiveStatus);
      if (statusFilter === 'cancelled') return isTicketCancelled(effectiveStatus);
      return true; // 'all'
    })
    .map(kot => ({
      ...kot,
      status: getEffectiveTicketStatus(kot) as any,
      station: 'reception' as const,
      filteredItems: getTicketItemsForSection(kot, 'reception')
    }))
    .filter(ticket => {
      if (priorityFilter === 'high_only') {
        return isTicketHighPriority(ticket);
      }
      return true;
    })
    .sort((a, b) => {
      const aHigh = isTicketHighPriority(a);
      const bHigh = isTicketHighPriority(b);
      if (aHigh && !bHigh) return -1;
      if (!aHigh && bHigh) return 1;
      return 0;
    });

  // Counts for badge counters
  const activeKitchenCount = allTickets.filter(
    k => isTicketActive(getEffectiveTicketStatus(k)) && getTicketItemsForSection(k, 'kitchen').length > 0
  ).length;
  const activeReceptionCount = allTickets.filter(
    k => isTicketActive(getEffectiveTicketStatus(k)) && getTicketItemsForSection(k, 'reception').length > 0
  ).length;
  const totalActiveCount = activeKitchenCount + activeReceptionCount;

  const preparingKitchenCount = allTickets.filter(
    k => isTicketPreparing(getEffectiveTicketStatus(k)) && getTicketItemsForSection(k, 'kitchen').length > 0
  ).length;
  const preparingReceptionCount = allTickets.filter(
    k => isTicketPreparing(getEffectiveTicketStatus(k)) && getTicketItemsForSection(k, 'reception').length > 0
  ).length;
  const totalPreparingCount = preparingKitchenCount + preparingReceptionCount;

  const readyKitchenCount = allTickets.filter(
    k => isTicketServed(getEffectiveTicketStatus(k)) && getTicketItemsForSection(k, 'kitchen').length > 0
  ).length;
  const readyReceptionCount = allTickets.filter(
    k => isTicketServed(getEffectiveTicketStatus(k)) && getTicketItemsForSection(k, 'reception').length > 0
  ).length;
  const totalReadyCount = readyKitchenCount + readyReceptionCount;

  // Total high priority tickets across both stations
  const totalHighPriorityCount = allTickets.filter(kot => isTicketHighPriority(kot)).length;

  const showToast = (type: 'ready' | 'cancel' | 'print', message: string) => {
    setActionNotice({ type, message });
    setTimeout(() => {
      setActionNotice(null);
    }, 4500);
  };

  // Toggle item priority between HIGH and STANDARD
  const handleToggleItemPriority = async (
    kotId: string,
    itemId: string,
    itemName: string,
    kotNumber: string,
    currentPriority: 'HIGH' | 'STANDARD' = 'STANDARD'
  ) => {
    const nextPriority: 'HIGH' | 'STANDARD' = currentPriority === 'HIGH' ? 'STANDARD' : 'HIGH';
    await updateKOTItemPriority(kotId, itemId, nextPriority);

    if (nextPriority === 'HIGH') {
      if (settings.soundAlerts !== false) {
        playPrioritySound();
      }
      showToast(
        'print',
        `⚡ High Priority tag set for "${itemName}" on #${kotNumber}! Card updated to Rush.`
      );
    } else {
      showToast(
        'print',
        `Priority set to Standard for "${itemName}" on #${kotNumber}.`
      );
    }
  };

  // Toggle ticket priority between HIGH and STANDARD
  const handleToggleTicketPriority = async (
    kotId: string,
    kotNumber: string,
    currentPriority?: 'HIGH' | 'STANDARD'
  ) => {
    const nextPriority: 'HIGH' | 'STANDARD' = currentPriority === 'HIGH' ? 'STANDARD' : 'HIGH';
    await updateKOTPriority(kotId, nextPriority);

    if (nextPriority === 'HIGH') {
      if (settings.soundAlerts !== false) {
        playPrioritySound();
      }
      showToast(
        'print',
        `🔥 Ticket #${kotNumber} marked as HIGH PRIORITY RUSH! All items expedited.`
      );
    } else {
      showToast(
        'print',
        `Ticket #${kotNumber} reset to Standard Priority.`
      );
    }
  };

  // 1. ACTION: Print KOT for specific location (Kitchen / Reception)
  // When printed, automatically transitions this ticket to 'in_progress' (PREPARING) without touching other stations
  const handlePrintKOT = async (ticket: StationTicket) => {
    setActivePrintTicket(ticket);
    playPrintSound();

    // Automatically transition ONLY this station ticket to 'in_progress' (Preparing)
    try {
      await updateKOTStatus(ticket.id, 'in_progress');
    } catch (err) {
      console.warn("Could not update KOT status:", err);
    }

    const tableNumStr = ticket.tableNumber < 10 ? `0${ticket.tableNumber}` : `${ticket.tableNumber}`;
    const stationLabel = ticket.station === 'kitchen' ? 'Kitchen Food' : 'Cafe & Reception Bar';

    // Send real-time notification to the guest table for THIS station
    await sendTableNotification({
      tableNumber: ticket.tableNumber,
      type: 'order_preparing',
      title: `Order In Preparation: ${stationLabel}`,
      message: `Your ${stationLabel.toLowerCase()} (${ticket.kotNumber}) is now being prepared fresh for Table ${tableNumStr}!`,
      kotId: ticket.id,
      orderId: ticket.orderId,
      station: ticket.station
    }).catch(err => console.warn("Table notification error:", err));

    showToast(
      'print',
      `Printing ${ticket.station === 'kitchen' ? 'Kitchen' : 'Reception'} KOT (${ticket.kotNumber}) for Table ${tableNumStr} — Moved to Preparing!`
    );

    // Switch view to 'preparing' section immediately so the preparing ticket is visible
    setStatusFilter('preparing');

    // Give browser small render tick to populate thermal print DOM before window.print()
    setTimeout(() => {
      triggerThermalPrint('80mm');
      const handleAfterPrint = () => {
        setActivePrintTicket(null);
        window.removeEventListener('afterprint', handleAfterPrint);
      };
      window.addEventListener('afterprint', handleAfterPrint);
    }, 100);
  };

  // ACTION: Move order to Preparing manually without printing
  const handleMoveToPreparing = async (ticket: StationTicket) => {
    // Transition ONLY this station ticket to 'in_progress' (PREPARING in POS context)
    try {
      await updateKOTStatus(ticket.id, 'in_progress');
    } catch (err) {
      console.warn("Could not update KOT status:", err);
    }

    const tableNumStr = ticket.tableNumber < 10 ? `0${ticket.tableNumber}` : `${ticket.tableNumber}`;
    const stationLabel = ticket.station === 'kitchen' ? 'Kitchen Food' : 'Cafe & Reception Bar';

    await sendTableNotification({
      tableNumber: ticket.tableNumber,
      type: 'order_preparing',
      title: `Order Preparing: ${stationLabel}`,
      message: `Your ${stationLabel.toLowerCase()} order (${ticket.kotNumber}) is now being prepared for Table ${tableNumStr}!`,
      kotId: ticket.id,
      orderId: ticket.orderId,
      station: ticket.station
    }).catch(err => console.warn("Table notification error:", err));

    showToast(
      'print',
      `${ticket.station === 'kitchen' ? 'Kitchen' : 'Reception'} KOT (${ticket.kotNumber}) for Table ${tableNumStr} moved to Preparing!`
    );

    // Switch view to 'preparing' section immediately so the preparing ticket is visible
    setStatusFilter('preparing');
  };

  // 2. ACTION: Mark Served & notify table number (operates individually for Kitchen vs Reception)
  const handleMarkServed = async (ticket: StationTicket) => {
    const tableNumStr = ticket.tableNumber < 10 ? `0${ticket.tableNumber}` : `${ticket.tableNumber}`;
    const stationLabel = ticket.station === 'kitchen' ? 'Kitchen Food' : 'Cafe & Reception Bar';

    // 1. Update ONLY this specific KOT ticket in POS context & Firestore to 'served'
    await updateKOTStatus(ticket.id, 'served');

    // 2. Check if all sibling station tickets for this table/order are also served
    const siblingTickets = allTickets.filter(
      k =>
        k.id !== ticket.id &&
        (k.orderId === ticket.orderId ||
         (ticket.orderNumber && k.orderNumber === ticket.orderNumber) ||
         (Number(k.tableNumber) === Number(ticket.tableNumber))) &&
        (k.status || '').toLowerCase() !== 'cancelled'
    );
    const allSiblingsServed = siblingTickets.length === 0 || siblingTickets.every(k => isTicketServed(k.status));

    // If all station tickets for this order are now served, we can complete the order
    if (allSiblingsServed) {
      let orderToUpdateId = ticket.orderId;
      if (!orderToUpdateId && ticket.orderNumber) {
        const matchOrder = orders.find(o => o.orderNumber === ticket.orderNumber);
        if (matchOrder) orderToUpdateId = matchOrder.id;
      }
      if (orderToUpdateId) {
        await updateOrderStatus(orderToUpdateId, 'served').catch(console.warn);
      }
    }

    // 3. Send real-time notification to the guest table specifically for this station
    await sendTableNotification({
      tableNumber: ticket.tableNumber,
      type: 'order_ready',
      title: `${stationLabel} Served!`,
      message: `Your ${stationLabel.toLowerCase()} (${ticket.kotNumber}) has been served to Table ${tableNumStr}!`,
      kotId: ticket.id,
      orderId: ticket.orderId,
      station: ticket.station
    }).catch(err => console.warn("Table notification error:", err));

    playReadySound();

    showToast(
      'ready',
      allSiblingsServed
        ? `Table ${tableNumStr} ${stationLabel} (${ticket.kotNumber}) Served! (All station items now served)`
        : `Table ${tableNumStr} ${stationLabel} (${ticket.kotNumber}) Served! (Other station ticket still in progress)`
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

      {/* Live KOT Activity Stream Header & Quick-Access Controls */}
      <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h2 className="text-lg font-bold text-gray-900 tracking-tight flex items-center gap-2">
              <ChefHat className="w-5 h-5 text-amber-600" />
              <span>Live KOT Activity Stream</span>
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200 font-mono">
              {totalActiveCount} Active • {totalPreparingCount} Preparing
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Real-time Kitchen Order Tickets dispatch, station routing, and kitchen audio alert controls.
          </p>
        </div>

        {/* Action Controls & Sound Settings */}
        <div className="flex items-center flex-wrap gap-2.5">
          {/* Quick-Access Audio Alerts Toggle for Live KOT Activity Stream */}
          <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 p-1.5 rounded-xl shadow-2xs">
            <button
              id="btn-toggle-kot-sound-alerts"
              type="button"
              onClick={async () => {
                const nextState = settings.soundAlerts === false;
                await updateSettings({ soundAlerts: nextState });
                if (nextState) {
                  playNewOrderSound();
                  showToast('print', 'Audio alerts ENABLED: Chime will sound when new orders are placed.');
                } else {
                  showToast('cancel', 'Audio alerts MUTED: Staff can manage quiet kitchen noise levels.');
                }
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 transition-all ${
                settings.soundAlerts !== false
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                  : 'bg-white hover:bg-gray-100 text-gray-600 border border-gray-300'
              }`}
              title={
                settings.soundAlerts !== false
                  ? 'Audio alerts are ACTIVE for new orders. Click to Mute sound.'
                  : 'Audio alerts are MUTED. Click to Enable sound for incoming orders.'
              }
            >
              {settings.soundAlerts !== false ? (
                <>
                  <Volume2 className="w-4 h-4 text-emerald-100" />
                  <span>Audio Alerts: ON</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-300 animate-ping" />
                </>
              ) : (
                <>
                  <VolumeX className="w-4 h-4 text-gray-400" />
                  <span>Audio Alerts: OFF</span>
                  <span className="text-[10px] text-gray-400 font-normal">(Muted)</span>
                </>
              )}
            </button>

            <button
              id="btn-test-chime"
              type="button"
              onClick={handleTestChime}
              className="px-2.5 py-1.5 text-xs text-gray-700 hover:text-gray-900 hover:bg-gray-200 rounded-lg transition flex items-center gap-1.5 font-semibold"
              title="Test notification chime on your speakers"
            >
              <BellRing className="w-3.5 h-3.5 text-amber-600" />
              <span className="hidden sm:inline">Test Chime</span>
            </button>
          </div>

          {/* Status Filter Buttons */}
          <div className="flex p-1 bg-gray-100 rounded-lg text-xs font-semibold">
            <button
              onClick={() => setStatusFilter('active')}
              className={`px-3 py-1.5 rounded-md transition flex items-center gap-1.5 ${
                statusFilter === 'active'
                  ? 'bg-white text-gray-900 shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <span>Active</span>
              {totalActiveCount > 0 && (
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                    statusFilter === 'active'
                      ? 'bg-amber-100 text-amber-900 font-bold'
                      : 'bg-gray-200 text-gray-700'
                  }`}
                >
                  {totalActiveCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setStatusFilter('preparing')}
              className={`px-3 py-1.5 rounded-md transition flex items-center gap-1.5 ${
                statusFilter === 'preparing'
                  ? 'bg-white text-blue-700 shadow-xs font-bold'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Flame
                className={`w-3.5 h-3.5 ${
                  statusFilter === 'preparing' ? 'text-amber-500 animate-pulse' : 'text-amber-500'
                }`}
              />
              <span>Preparing</span>
              {totalPreparingCount > 0 && (
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                    statusFilter === 'preparing'
                      ? 'bg-blue-100 text-blue-800 font-bold'
                      : 'bg-gray-200 text-gray-700'
                  }`}
                >
                  {totalPreparingCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setStatusFilter('served')}
              className={`px-3 py-1.5 rounded-md transition flex items-center gap-1.5 ${
                statusFilter === 'served' || statusFilter === 'ready'
                  ? 'bg-white text-emerald-800 shadow-xs font-bold'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Served</span>
              {totalReadyCount > 0 && (
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                    statusFilter === 'served' || statusFilter === 'ready'
                      ? 'bg-emerald-100 text-emerald-800 font-bold'
                      : 'bg-gray-200 text-gray-700'
                  }`}
                >
                  {totalReadyCount}
                </span>
              )}
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

            {/* High Priority Rush Quick Toggle Pill */}
            <button
              type="button"
              onClick={() => setPriorityFilter(prev => prev === 'high_only' ? 'all' : 'high_only')}
              className={`px-3 py-1.5 rounded-md transition flex items-center gap-1.5 ml-1 cursor-pointer ${
                priorityFilter === 'high_only'
                  ? 'bg-rose-600 text-white shadow-xs font-bold'
                  : totalHighPriorityCount > 0
                  ? 'text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
              title="Filter to show only High Priority rush orders"
            >
              <Flame className={`w-3.5 h-3.5 ${priorityFilter === 'high_only' ? 'text-amber-200 fill-amber-200 animate-pulse' : 'text-rose-500'}`} />
              <span>High Priority</span>
              {totalHighPriorityCount > 0 && (
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                    priorityFilter === 'high_only'
                      ? 'bg-rose-800 text-white font-bold'
                      : 'bg-rose-200 text-rose-900 font-bold'
                  }`}
                >
                  {totalHighPriorityCount}
                </span>
              )}
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
                <p className="font-medium text-gray-600">
                  {statusFilter === 'active'
                    ? 'No new active orders waiting for Kitchen'
                    : statusFilter === 'preparing'
                    ? 'No orders currently preparing in Kitchen'
                    : 'No tickets found for Kitchen Station'}
                </p>
                <p className="text-gray-400 text-[11px] mt-0.5">
                  {statusFilter === 'active' && preparingKitchenCount > 0
                    ? `${preparingKitchenCount} ticket(s) are actively being prepared in Kitchen.`
                    : statusFilter === 'preparing' && activeKitchenCount > 0
                    ? `${activeKitchenCount} new ticket(s) waiting in the Active queue.`
                    : 'Orders placed by guests or staff will route here automatically.'}
                </p>
                {statusFilter === 'active' && preparingKitchenCount > 0 && (
                  <button
                    onClick={() => setStatusFilter('preparing')}
                    className="mt-3 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 rounded-lg text-xs font-bold transition inline-flex items-center gap-1.5"
                  >
                    <Flame className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
                    <span>View Preparing ({preparingKitchenCount})</span>
                  </button>
                )}
                {statusFilter === 'preparing' && activeKitchenCount > 0 && (
                  <button
                    onClick={() => setStatusFilter('active')}
                    className="mt-3 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-800 border border-gray-300 rounded-lg text-xs font-bold transition inline-flex items-center gap-1.5"
                  >
                    <span>View Active Queue ({activeKitchenCount})</span>
                  </button>
                )}
                {statusFilter === 'preparing' && preparingReceptionCount > 0 && (
                  <button
                    onClick={() => { setActiveSection('all'); setStatusFilter('preparing'); }}
                    className="mt-3 ml-2 px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-300 rounded-lg text-xs font-bold transition inline-flex items-center gap-1.5"
                  >
                    <Coffee className="w-3.5 h-3.5 text-purple-600" />
                    <span>View Reception Preparing ({preparingReceptionCount})</span>
                  </button>
                )}
              </div>
            ) : (
              kitchenTickets.map(kot => {
                const tableNumStr = kot.tableNumber < 10 ? `0${kot.tableNumber}` : `${kot.tableNumber}`;
                const isReady = isTicketReady(kot.status);
                const isCancelled = isTicketCancelled(kot.status);
                const isPreparing = isTicketPreparing(kot.status);
                const isActive = isTicketActive(kot.status);
                const isHighPriority = isTicketHighPriority(kot);

                const linkedOrder = orders.find(
                  o => o.id === kot.orderId || (kot.orderNumber && o.orderNumber === kot.orderNumber)
                );
                const orderReceivedTime = linkedOrder?.createdAt || kot.createdAt;
                const showTimer = isActive || isPreparing;

                return (
                  <div
                    key={`kitchen-${kot.id}`}
                    className={`bg-white rounded-xl border shadow-xs overflow-hidden transition-all duration-200 relative ${
                      isHighPriority
                        ? 'border-2 border-rose-500 shadow-md shadow-rose-500/15 ring-2 ring-rose-500/20'
                        : isReady
                        ? 'border-emerald-200 bg-emerald-50/10'
                        : isCancelled
                        ? 'border-rose-200 bg-rose-50/10 opacity-75'
                        : isPreparing
                        ? 'border-blue-200 bg-blue-50/5'
                        : 'border-gray-200 hover:border-amber-300'
                    }`}
                  >
                    {/* Top Emergency Rush Banner for High Priority Tickets */}
                    {isHighPriority && (
                      <div className="bg-gradient-to-r from-rose-600 via-red-600 to-amber-600 text-white px-3.5 py-1.5 flex items-center justify-between shadow-xs">
                        <div className="flex items-center gap-2">
                          <Flame className="w-3.5 h-3.5 text-amber-200 fill-amber-300 animate-bounce" />
                          <span className="font-black text-[11px] tracking-wider uppercase">
                            ⚡ HIGH PRIORITY / RUSH ORDER
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[9.5px] font-mono font-bold bg-white/20 backdrop-blur-xs px-2 py-0.5 rounded-full border border-white/30">
                            EXPEDITE
                          </span>
                          <button
                            type="button"
                            onClick={() => handleToggleTicketPriority(kot.id, kot.kotNumber, 'HIGH')}
                            className="text-[10px] text-white/90 hover:text-white underline font-semibold cursor-pointer"
                            title="Reset ticket to Standard Priority"
                          >
                            Mark Standard
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Header */}
                    <div className={`p-3.5 border-b border-gray-200 flex items-center justify-between ${
                      isHighPriority ? 'bg-rose-50/60' : 'bg-gray-50'
                    }`}>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono font-bold text-sm text-gray-900">
                            {kot.kotNumber}
                          </span>
                          <span className="text-xs font-bold text-amber-900 px-2.5 py-0.5 rounded-full bg-amber-100 border border-amber-200 font-mono">
                            Table {tableNumStr}
                          </span>
                          {isHighPriority && (
                            <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-rose-600 text-white shadow-2xs flex items-center gap-1 animate-pulse">
                              <Flame className="w-2.5 h-2.5 fill-current" />
                              <span>HIGH PRIORITY</span>
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-gray-500 mt-1 flex items-center gap-1.5">
                          <Clock className="w-3 h-3 text-gray-400" />
                          <span>Order #{kot.orderNumber}</span>
                          <span>•</span>
                          <span>{getTimeElapsed(orderReceivedTime)}</span>
                          <span>({new Date(orderReceivedTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})</span>
                        </p>
                      </div>

                      <div className="flex flex-col items-end gap-1">
                        <div className="flex items-center gap-1.5 flex-wrap justify-end">
                          {/* Card-Level Priority Toggle */}
                          <button
                            type="button"
                            onClick={() => handleToggleTicketPriority(kot.id, kot.kotNumber, isHighPriority ? 'HIGH' : 'STANDARD')}
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-md border flex items-center gap-1 transition cursor-pointer shadow-2xs ${
                              isHighPriority
                                ? 'bg-rose-600 hover:bg-rose-700 text-white border-rose-700'
                                : 'bg-white hover:bg-rose-50 text-gray-600 hover:text-rose-700 border-gray-200 hover:border-rose-300'
                            }`}
                            title={isHighPriority ? "Click to set card to Standard Priority" : "Click to mark entire card as High Priority"}
                          >
                            <Zap className={`w-3 h-3 ${isHighPriority ? 'text-amber-200 fill-amber-200' : 'text-gray-400'}`} />
                            <span>{isHighPriority ? 'Rush: High' : '+ Mark High'}</span>
                          </button>

                          {showTimer && (
                            <OrderElapsedTimer
                              receivedAt={orderReceivedTime}
                              status={isPreparing ? 'preparing' : 'active'}
                              variant="badge"
                            />
                          )}
                          <span
                            className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full capitalize border flex items-center gap-1 ${
                              isReady
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : isCancelled
                                ? 'bg-rose-50 text-rose-700 border-rose-200'
                                : isPreparing
                                ? 'bg-blue-50 text-blue-700 border-blue-200'
                                : 'bg-amber-50 text-amber-800 border-amber-300 font-bold'
                            }`}
                          >
                            {isPreparing && <Flame className="w-3 h-3 text-amber-500 animate-pulse" />}
                            <span>
                              {isReady
                                ? 'Served'
                                : isCancelled
                                ? 'Cancelled'
                                : isPreparing
                                ? 'Preparing'
                                : 'New / Active'}
                            </span>
                          </span>
                        </div>
                        <span className="text-[10px] font-semibold text-gray-400">
                          {kot.orderSource === 'GUEST_QR' ? 'Guest Self-Order' : 'POS Waiter'}
                        </span>
                      </div>
                    </div>

                    {/* Prominent Timer Banner for Preparing and Active order cards */}
                    {showTimer && (
                      <OrderElapsedTimer
                        receivedAt={orderReceivedTime}
                        status={isPreparing ? 'preparing' : 'active'}
                        variant="banner"
                      />
                    )}

                    {/* Cancellation alert banner if any items were cancelled */}
                    {kot.filteredItems.some(i => i.cancelled) && (
                      <div className="px-4 py-2 bg-rose-50 border-b border-rose-200/60 flex items-center gap-2 text-xs font-bold text-rose-800">
                        <AlertTriangle className="w-4 h-4 flex-shrink-0 text-rose-600" />
                        <span>Item Cancelled by Guest from Table {kot.tableNumber} - Do not prepare marked items</span>
                      </div>
                    )}

                    {/* Filtered Kitchen Items */}
                    <div className="p-4 space-y-2.5 divide-y divide-gray-100 text-xs">
                      {kot.filteredItems.map((item, idx) => {
                        const isItemHighPriority = item.priority === 'HIGH';

                        return (
                          <div
                            key={idx}
                            className={`pt-2.5 first:pt-0 flex items-start justify-between gap-3 p-2 rounded-lg transition ${
                              item.cancelled
                                ? 'opacity-65 bg-rose-50/60 -mx-2 px-2 py-1.5 rounded-lg border border-rose-200/50'
                                : isItemHighPriority
                                ? 'bg-rose-50/70 border-l-4 border-l-rose-500 border border-rose-200/80 shadow-2xs'
                                : 'hover:bg-gray-50/60'
                            }`}
                          >
                            <div className="flex items-start gap-3 flex-1 min-w-0">
                              <span
                                className={`w-7 h-7 rounded-lg font-bold flex items-center justify-center font-mono text-xs flex-shrink-0 shadow-2xs ${
                                  item.cancelled
                                    ? 'bg-rose-100 text-rose-700 line-through'
                                    : isItemHighPriority
                                    ? 'bg-rose-600 text-white font-black ring-2 ring-rose-400/40'
                                    : 'bg-amber-100 text-amber-900'
                                }`}
                              >
                                {item.quantity}
                              </span>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <p className={`font-bold text-sm ${
                                    item.cancelled
                                      ? 'text-gray-400 line-through'
                                      : isItemHighPriority
                                      ? 'text-rose-950 font-black'
                                      : 'text-gray-900'
                                  }`}>
                                    {item.name}
                                  </p>
                                  {item.cancelled && (
                                    <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 border border-rose-300">
                                      CANCELLED BY GUEST
                                    </span>
                                  )}

                                  {/* Priority Tagging System Controls */}
                                  {!item.cancelled && (
                                    <div className="inline-flex items-center rounded-md p-0.5 bg-gray-100/90 border border-gray-200 shadow-2xs">
                                      <button
                                        type="button"
                                        onClick={() =>
                                          handleToggleItemPriority(
                                            kot.id,
                                            item.id || item.orderItemId || item.name,
                                            item.name,
                                            kot.kotNumber,
                                            'STANDARD'
                                          )
                                        }
                                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition flex items-center gap-1 cursor-pointer ${
                                          isItemHighPriority
                                            ? 'bg-rose-600 text-white shadow-xs font-black'
                                            : 'text-gray-500 hover:text-rose-700 hover:bg-rose-50'
                                        }`}
                                        title="Click to set item as High Priority"
                                      >
                                        <Flame
                                          className={`w-3 h-3 ${
                                            isItemHighPriority
                                              ? 'text-amber-200 fill-amber-200 animate-pulse'
                                              : 'text-gray-400'
                                          }`}
                                        />
                                        <span>High Priority</span>
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          handleToggleItemPriority(
                                            kot.id,
                                            item.id || item.orderItemId || item.name,
                                            item.name,
                                            kot.kotNumber,
                                            'HIGH'
                                          )
                                        }
                                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition flex items-center gap-1 cursor-pointer ${
                                          !isItemHighPriority
                                            ? 'bg-white text-gray-800 shadow-xs font-semibold'
                                            : 'text-gray-400 hover:text-gray-600'
                                        }`}
                                        title="Click to set item as Standard Priority"
                                      >
                                        <span>Standard</span>
                                      </button>
                                    </div>
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
                            <div className="flex items-center gap-1.5 flex-shrink-0">
                              {!item.cancelled && isItemHighPriority && (
                                <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-rose-600 text-white border border-rose-700 shadow-2xs flex items-center gap-1 animate-pulse">
                                  <Flame className="w-2.5 h-2.5 fill-current" />
                                  <span>RUSH</span>
                                </span>
                              )}
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
                          </div>
                        );
                      })}
                    </div>

                    {/* Cancellation Note if cancelled */}
                    {isCancelled && (kot as any).cancellationReason && (
                      <div className="px-4 py-2 bg-rose-50/70 border-t border-rose-100 text-[11px] text-rose-700">
                        <strong>Reason:</strong> {(kot as any).cancellationReason}
                      </div>
                    )}

                    {/* Action Buttons: Print KOT, Prepare, Ready, and Cancel */}
                    <div className="p-3 bg-gray-50 border-t border-gray-200 flex items-center gap-2 flex-wrap">
                      {/* 1. PRINT BUTTON (Prints slip and automatically moves ticket to Preparing) */}
                      <button
                        onClick={() => handlePrintKOT(kot)}
                        className="flex-1 min-w-[100px] py-2 px-3 bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                        title={
                          isActive
                            ? 'Print KOT thermal slip & automatically move to Preparing'
                            : 'Reprint Kitchen KOT thermal slip'
                        }
                      >
                        <Printer className="w-3.5 h-3.5 text-amber-400" />
                        <span>{isActive ? 'Print KOT' : 'Reprint KOT'}</span>
                      </button>

                      {/* 2. MOVE TO PREPARING (for Active/Pending tickets without reprinting) */}
                      {isActive && (
                        <button
                          onClick={() => handleMoveToPreparing(kot)}
                          className="py-2 px-3 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                          title="Move ticket to Preparing section"
                        >
                          <Flame className="w-3.5 h-3.5 text-amber-500" />
                          <span>To Preparing</span>
                        </button>
                      )}

                      {/* 3. SERVED BUTTON */}
                      {!isReady && !isCancelled && (
                        <button
                          onClick={() => handleMarkServed(kot)}
                          className="flex-1 min-w-[90px] py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                          title="Mark KOT Served (moves to Served section & syncs with table)"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Served</span>
                        </button>
                      )}
                      {isReady && !isCancelled && (
                        <div
                          className="flex-1 min-w-[90px] py-2 px-3 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 shadow-2xs"
                          title="This ticket has been served to table"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Served ✓</span>
                        </div>
                      )}

                      {/* 4. CANCEL BUTTON */}
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
                <p className="font-medium text-gray-600">
                  {statusFilter === 'active'
                    ? 'No new active orders waiting for Reception'
                    : statusFilter === 'preparing'
                    ? 'No orders currently preparing at Reception / Barista'
                    : 'No tickets found for Reception / Barista'}
                </p>
                <p className="text-gray-400 text-[11px] mt-0.5">
                  {statusFilter === 'active' && preparingReceptionCount > 0
                    ? `${preparingReceptionCount} ticket(s) are actively being prepared at Reception / Bar.`
                    : statusFilter === 'preparing' && activeReceptionCount > 0
                    ? `${activeReceptionCount} new ticket(s) waiting in the Active queue.`
                    : 'Beverages and cafe orders will appear here automatically.'}
                </p>
                {statusFilter === 'active' && preparingReceptionCount > 0 && (
                  <button
                    onClick={() => setStatusFilter('preparing')}
                    className="mt-3 px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-300 rounded-lg text-xs font-bold transition inline-flex items-center gap-1.5"
                  >
                    <Flame className="w-3.5 h-3.5 text-purple-600 animate-pulse" />
                    <span>View Preparing ({preparingReceptionCount})</span>
                  </button>
                )}
                {statusFilter === 'preparing' && activeReceptionCount > 0 && (
                  <button
                    onClick={() => setStatusFilter('active')}
                    className="mt-3 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-800 border border-gray-300 rounded-lg text-xs font-bold transition inline-flex items-center gap-1.5"
                  >
                    <span>View Active Queue ({activeReceptionCount})</span>
                  </button>
                )}
                {statusFilter === 'preparing' && preparingKitchenCount > 0 && (
                  <button
                    onClick={() => { setActiveSection('all'); setStatusFilter('preparing'); }}
                    className="mt-3 ml-2 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 rounded-lg text-xs font-bold transition inline-flex items-center gap-1.5"
                  >
                    <ChefHat className="w-3.5 h-3.5 text-amber-600" />
                    <span>View Kitchen Preparing ({preparingKitchenCount})</span>
                  </button>
                )}
              </div>
            ) : (
              receptionTickets.map(kot => {
                const tableNumStr = kot.tableNumber < 10 ? `0${kot.tableNumber}` : `${kot.tableNumber}`;
                const isReady = isTicketReady(kot.status);
                const isCancelled = isTicketCancelled(kot.status);
                const isPreparing = isTicketPreparing(kot.status);
                const isActive = isTicketActive(kot.status);
                const isHighPriority = isTicketHighPriority(kot);

                const linkedOrder = orders.find(
                  o => o.id === kot.orderId || (kot.orderNumber && o.orderNumber === kot.orderNumber)
                );
                const orderReceivedTime = linkedOrder?.createdAt || kot.createdAt;
                const showTimer = isActive || isPreparing;

                return (
                  <div
                    key={`reception-${kot.id}`}
                    className={`bg-white rounded-xl border shadow-xs overflow-hidden transition-all duration-200 relative ${
                      isHighPriority
                        ? 'border-2 border-rose-500 shadow-md shadow-rose-500/15 ring-2 ring-rose-500/20'
                        : isReady
                        ? 'border-emerald-200 bg-emerald-50/10'
                        : isCancelled
                        ? 'border-rose-200 bg-rose-50/10 opacity-75'
                        : isPreparing
                        ? 'border-purple-200 bg-purple-50/5'
                        : 'border-gray-200 hover:border-purple-300'
                    }`}
                  >
                    {/* Top Emergency Rush Banner for High Priority Tickets */}
                    {isHighPriority && (
                      <div className="bg-gradient-to-r from-rose-600 via-red-600 to-amber-600 text-white px-3.5 py-1.5 flex items-center justify-between shadow-xs">
                        <div className="flex items-center gap-2">
                          <Flame className="w-3.5 h-3.5 text-amber-200 fill-amber-300 animate-bounce" />
                          <span className="font-black text-[11px] tracking-wider uppercase">
                            ⚡ HIGH PRIORITY / RUSH ORDER
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[9.5px] font-mono font-bold bg-white/20 backdrop-blur-xs px-2 py-0.5 rounded-full border border-white/30">
                            EXPEDITE
                          </span>
                          <button
                            type="button"
                            onClick={() => handleToggleTicketPriority(kot.id, kot.kotNumber, 'HIGH')}
                            className="text-[10px] text-white/90 hover:text-white underline font-semibold cursor-pointer"
                            title="Reset ticket to Standard Priority"
                          >
                            Mark Standard
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Header */}
                    <div className={`p-3.5 border-b border-gray-200 flex items-center justify-between ${
                      isHighPriority ? 'bg-rose-50/60' : 'bg-gray-50'
                    }`}>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono font-bold text-sm text-gray-900">
                            {kot.kotNumber}
                          </span>
                          <span className="text-xs font-bold text-purple-900 px-2.5 py-0.5 rounded-full bg-purple-100 border border-purple-200 font-mono">
                            Table {tableNumStr}
                          </span>
                          {isHighPriority && (
                            <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-rose-600 text-white shadow-2xs flex items-center gap-1 animate-pulse">
                              <Flame className="w-2.5 h-2.5 fill-current" />
                              <span>HIGH PRIORITY</span>
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-gray-500 mt-1 flex items-center gap-1.5">
                          <Clock className="w-3 h-3 text-gray-400" />
                          <span>Order #{kot.orderNumber}</span>
                          <span>•</span>
                          <span>{getTimeElapsed(orderReceivedTime)}</span>
                          <span>({new Date(orderReceivedTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})</span>
                        </p>
                      </div>

                      <div className="flex flex-col items-end gap-1">
                        <div className="flex items-center gap-1.5 flex-wrap justify-end">
                          {/* Card-Level Priority Toggle */}
                          <button
                            type="button"
                            onClick={() => handleToggleTicketPriority(kot.id, kot.kotNumber, isHighPriority ? 'HIGH' : 'STANDARD')}
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-md border flex items-center gap-1 transition cursor-pointer shadow-2xs ${
                              isHighPriority
                                ? 'bg-rose-600 hover:bg-rose-700 text-white border-rose-700'
                                : 'bg-white hover:bg-rose-50 text-gray-600 hover:text-rose-700 border-gray-200 hover:border-rose-300'
                            }`}
                            title={isHighPriority ? "Click to set card to Standard Priority" : "Click to mark entire card as High Priority"}
                          >
                            <Zap className={`w-3 h-3 ${isHighPriority ? 'text-amber-200 fill-amber-200' : 'text-gray-400'}`} />
                            <span>{isHighPriority ? 'Rush: High' : '+ Mark High'}</span>
                          </button>

                          {showTimer && (
                            <OrderElapsedTimer
                              receivedAt={orderReceivedTime}
                              status={isPreparing ? 'preparing' : 'active'}
                              variant="badge"
                            />
                          )}
                          <span
                            className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full capitalize border flex items-center gap-1 ${
                              isReady
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : isCancelled
                                ? 'bg-rose-50 text-rose-700 border-rose-200'
                                : isPreparing
                                ? 'bg-blue-50 text-blue-700 border-blue-200'
                                : 'bg-purple-50 text-purple-700 border-purple-200 font-bold'
                            }`}
                          >
                            {isPreparing && <Flame className="w-3 h-3 text-amber-500 animate-pulse" />}
                            <span>
                              {isReady
                                ? 'Ready'
                                : isCancelled
                                ? 'Cancelled'
                                : isPreparing
                                ? 'Preparing'
                                : 'New / Active'}
                            </span>
                          </span>
                        </div>
                        <span className="text-[10px] font-semibold text-gray-400">
                          {kot.orderSource === 'GUEST_QR' ? 'Guest Self-Order' : 'POS Waiter'}
                        </span>
                      </div>
                    </div>

                    {/* Prominent Timer Banner for Preparing and Active order cards */}
                    {showTimer && (
                      <OrderElapsedTimer
                        receivedAt={orderReceivedTime}
                        status={isPreparing ? 'preparing' : 'active'}
                        variant="banner"
                      />
                    )}

                    {/* Cancellation alert banner if any items were cancelled */}
                    {kot.filteredItems.some(i => i.cancelled) && (
                      <div className="px-4 py-2 bg-rose-50 border-b border-rose-200/60 flex items-center gap-2 text-xs font-bold text-rose-800">
                        <AlertTriangle className="w-4 h-4 flex-shrink-0 text-rose-600" />
                        <span>Item Cancelled by Guest from Table {kot.tableNumber} - Do not prepare marked items</span>
                      </div>
                    )}

                    {/* Filtered Reception Items */}
                    <div className="p-4 space-y-2.5 divide-y divide-gray-100 text-xs">
                      {kot.filteredItems.map((item, idx) => {
                        const isItemHighPriority = item.priority === 'HIGH';

                        return (
                          <div
                            key={idx}
                            className={`pt-2.5 first:pt-0 flex items-start justify-between gap-3 p-2 rounded-lg transition ${
                              item.cancelled
                                ? 'opacity-65 bg-rose-50/60 -mx-2 px-2 py-1.5 rounded-lg border border-rose-200/50'
                                : isItemHighPriority
                                ? 'bg-rose-50/70 border-l-4 border-l-rose-500 border border-rose-200/80 shadow-2xs'
                                : 'hover:bg-gray-50/60'
                            }`}
                          >
                            <div className="flex items-start gap-3 flex-1 min-w-0">
                              <span
                                className={`w-7 h-7 rounded-lg font-bold flex items-center justify-center font-mono text-xs flex-shrink-0 shadow-2xs ${
                                  item.cancelled
                                    ? 'bg-rose-100 text-rose-700 line-through'
                                    : isItemHighPriority
                                    ? 'bg-rose-600 text-white font-black ring-2 ring-rose-400/40'
                                    : 'bg-purple-100 text-purple-900'
                                }`}
                              >
                                {item.quantity}
                              </span>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <p className={`font-bold text-sm ${
                                    item.cancelled
                                      ? 'text-gray-400 line-through'
                                      : isItemHighPriority
                                      ? 'text-rose-950 font-black'
                                      : 'text-gray-900'
                                  }`}>
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

                                  {/* Priority Tagging System Controls */}
                                  {!item.cancelled && (
                                    <div className="inline-flex items-center rounded-md p-0.5 bg-gray-100/90 border border-gray-200 shadow-2xs">
                                      <button
                                        type="button"
                                        onClick={() =>
                                          handleToggleItemPriority(
                                            kot.id,
                                            item.id || item.orderItemId || item.name,
                                            item.name,
                                            kot.kotNumber,
                                            'STANDARD'
                                          )
                                        }
                                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition flex items-center gap-1 cursor-pointer ${
                                          isItemHighPriority
                                            ? 'bg-rose-600 text-white shadow-xs font-black'
                                            : 'text-gray-500 hover:text-rose-700 hover:bg-rose-50'
                                        }`}
                                        title="Click to set item as High Priority"
                                      >
                                        <Flame
                                          className={`w-3 h-3 ${
                                            isItemHighPriority
                                              ? 'text-amber-200 fill-amber-200 animate-pulse'
                                              : 'text-gray-400'
                                          }`}
                                        />
                                        <span>High Priority</span>
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          handleToggleItemPriority(
                                            kot.id,
                                            item.id || item.orderItemId || item.name,
                                            item.name,
                                            kot.kotNumber,
                                            'HIGH'
                                          )
                                        }
                                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition flex items-center gap-1 cursor-pointer ${
                                          !isItemHighPriority
                                            ? 'bg-white text-gray-800 shadow-xs font-semibold'
                                            : 'text-gray-400 hover:text-gray-600'
                                        }`}
                                        title="Click to set item as Standard Priority"
                                      >
                                        <span>Standard</span>
                                      </button>
                                    </div>
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
                            <div className="flex items-center gap-1.5 flex-shrink-0">
                              {!item.cancelled && isItemHighPriority && (
                                <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-rose-600 text-white border border-rose-700 shadow-2xs flex items-center gap-1 animate-pulse">
                                  <Flame className="w-2.5 h-2.5 fill-current" />
                                  <span>RUSH</span>
                                </span>
                              )}
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
                          </div>
                        );
                      })}
                    </div>

                    {/* Cancellation Note if cancelled */}
                    {isCancelled && (kot as any).cancellationReason && (
                      <div className="px-4 py-2 bg-rose-50/70 border-t border-rose-100 text-[11px] text-rose-700">
                        <strong>Reason:</strong> {(kot as any).cancellationReason}
                      </div>
                    )}

                    {/* Action Buttons: Print KOT, Prepare, Ready, and Cancel */}
                    <div className="p-3 bg-gray-50 border-t border-gray-200 flex items-center gap-2 flex-wrap">
                      {/* 1. PRINT BUTTON (Prints slip and automatically moves ticket to Preparing) */}
                      <button
                        onClick={() => handlePrintKOT(kot)}
                        className="flex-1 min-w-[100px] py-2 px-3 bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                        title={
                          isActive
                            ? 'Print KOT thermal slip & automatically move to Preparing'
                            : 'Reprint Reception KOT thermal slip'
                        }
                      >
                        <Printer className="w-3.5 h-3.5 text-purple-300" />
                        <span>{isActive ? 'Print KOT' : 'Reprint KOT'}</span>
                      </button>

                      {/* 2. MOVE TO PREPARING (for Active/Pending tickets without reprinting) */}
                      {isActive && (
                        <button
                          onClick={() => handleMoveToPreparing(kot)}
                          className="py-2 px-3 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                          title="Move ticket to Preparing section"
                        >
                          <Flame className="w-3.5 h-3.5 text-purple-600" />
                          <span>To Preparing</span>
                        </button>
                      )}

                      {/* 3. SERVED BUTTON */}
                      {!isReady && !isCancelled && (
                        <button
                          onClick={() => handleMarkServed(kot)}
                          className="flex-1 min-w-[90px] py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                          title="Mark KOT Served (moves to Served section & syncs with table)"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Served</span>
                        </button>
                      )}
                      {isReady && !isCancelled && (
                        <div
                          className="flex-1 min-w-[90px] py-2 px-3 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 shadow-2xs"
                          title="This ticket has been served to table"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Served ✓</span>
                        </div>
                      )}

                      {/* 4. CANCEL BUTTON */}
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
