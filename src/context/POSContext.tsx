import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  getDocs,
  writeBatch
} from 'firebase/firestore';
import { User } from 'firebase/auth';
import { db, testConnection, handleFirestoreError, OperationType } from '../firebase';
import {
  Table,
  TableStatus,
  TableSection,
  MenuItem,
  Order,
  KOTTicket,
  InventoryItem,
  PaymentRecord,
  RestaurantSettings,
  ServiceRequest,
  CartItem,
  PaymentMethod,
  OrderStatus,
  OrderItemStatus,
  OrderType,
  MenuItemVariant,
  MenuItemAddOn,
  AdminTab,
  Category,
  TableSession
} from '../types';
import {
  INITIAL_10_TABLES,
  DEFAULT_SETTINGS,
  seedInitial10TablesIfEmpty,
  clearAllTestDataAndResetTables,
  listenTables,
  listenMenuItems,
  listenCategories,
  listenOrders,
  listenKOTs,
  listenPayments,
  listenInventory,
  listenSettings,
  listenServiceRequests,
  createOrderWithKOTs,
  createTableSession,
  recordPayment,
  updateTableStatus as updateDbTableStatus,
  loginAdmin as authLoginAdmin,
  logoutAdmin as authLogoutAdmin,
  subscribeAdminAuth,
  cleanFirestoreData
} from '../services/firebaseService';

interface POSContextType {
  tables: Table[];
  menuItems: MenuItem[];
  categories: Category[];
  orders: Order[];
  kots: KOTTicket[];
  inventory: InventoryItem[];
  payments: PaymentRecord[];
  serviceRequests: ServiceRequest[];
  settings: RestaurantSettings;
  currentUser: User | null;
  currentGuestTableNumber: number;
  activeInterface: 'guest' | 'admin' | 'kds';
  adminActiveTab: AdminTab;
  cart: CartItem[];
  searchQuery: string;
  selectedCategory: string;
  dietaryFilter: 'all' | 'veg' | 'non-veg' | 'vegan';
  isCloudSynced: boolean;

  // Navigation & Filter setters
  setCurrentGuestTableNumber: (tableNumber: number) => void;
  setActiveInterface: (mode: 'guest' | 'admin' | 'kds') => void;
  setAdminActiveTab: (tab: AdminTab) => void;
  setSearchQuery: (q: string) => void;
  setSelectedCategory: (cat: string) => void;
  setDietaryFilter: (f: 'all' | 'veg' | 'non-veg' | 'vegan') => void;

  // Authentication
  loginAdminUser: (email: string, pass: string) => Promise<User>;
  logoutAdminUser: () => Promise<void>;

  // Cart operations
  addToCart: (
    item: MenuItem,
    quantity: number,
    selectedVariant?: MenuItemVariant,
    selectedAddOns?: MenuItemAddOn[],
    specialInstructions?: string
  ) => void;
  updateCartQuantity: (cartItemId: string, delta: number) => void;
  removeFromCart: (cartItemId: string) => void;
  clearCart: () => void;
  cartTotal: number;
  cartItemCount: number;

  // Order placement & handling
  placeGuestOrder: (guestName?: string, guestPhone?: string, notes?: string) => Promise<Order>;
  createManualOrder: (
    tableNumber: number,
    items: { menuItem: MenuItem; quantity: number; selectedVariant?: MenuItemVariant; selectedAddOns?: MenuItemAddOn[]; instructions?: string }[],
    orderType: OrderType,
    guestName?: string,
    guestPhone?: string,
    discountAmount?: number,
    discountReason?: string,
    waiterName?: string,
    notes?: string
  ) => Promise<Order>;
  updateOrderStatus: (orderId: string, status: OrderStatus) => Promise<void>;
  updateTableOrdersStatus: (tableNumber: number, status: 'placed' | 'confirmed' | 'served') => Promise<void>;
  updateOrderItemStatus: (orderId: string, itemId: string, status: OrderItemStatus) => Promise<void>;
  updateKOTStatus: (kotId: string, status: 'pending' | 'in_progress' | 'completed' | 'bumped') => Promise<void>;
  markOrderPaid: (orderId: string, paymentMethod?: PaymentMethod, cashierName?: string) => Promise<void>;

  // Table management
  settleTableBill: (
    tableNumber: number,
    paymentMethod: PaymentMethod,
    cashierName?: string,
    discountAmount?: number,
    notes?: string
  ) => Promise<void>;
  occupyTable: (tableNumber: number, guestCount: number, waiterName?: string) => Promise<void>;
  setTableStatus: (tableNumber: number, status: Table['status'], notes?: string) => Promise<void>;
  transferTable: (fromTableNumber: number, toTableNumber: number) => Promise<boolean>;

  // Service requests
  addServiceRequest: (tableNumber: number, type: ServiceRequest['type'], message?: string) => Promise<void>;
  resolveServiceRequest: (requestId: string) => Promise<void>;

  // Menu & Inventory
  toggleMenuItemStock: (itemId: string) => Promise<void>;
  updateMenuItem: (item: MenuItem) => Promise<void>;
  addMenuItem: (item: Omit<MenuItem, 'id'>) => Promise<void>;
  deleteMenuItem: (itemId: string) => Promise<void>;
  addInventoryItem: (item: Omit<InventoryItem, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateInventoryItem: (item: InventoryItem) => Promise<void>;
  deleteInventoryItem: (id: string) => Promise<void>;
  updateInventoryStock: (id: string, newStock: number, unitCost?: number, minThreshold?: number, supplier?: string) => Promise<void>;
  adjustInventoryStock: (id: string, delta: number) => Promise<void>;

  // Settings & Reset
  updateSettings: (newSettings: Partial<RestaurantSettings>) => Promise<void>;
  resetToDemoData: () => Promise<void>;

  // Helpers
  getTableOrders: (tableNumber: number) => Order[];
  getCurrentTable: () => Table | undefined;
}

const POSContext = createContext<POSContextType | undefined>(undefined);

export const POSProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Real Firestore state
  const [tables, setTables] = useState<Table[]>(INITIAL_10_TABLES);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [kots, setKots] = useState<KOTTicket[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [serviceRequests, setServiceRequests] = useState<ServiceRequest[]>([]);
  const [settings, setSettings] = useState<RestaurantSettings>(DEFAULT_SETTINGS);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // App UI state
  const [currentGuestTableNumber, setCurrentGuestTableNumber] = useState<number>(1);
  const [activeInterface, setActiveInterface] = useState<'guest' | 'admin' | 'kds'>('admin');
  const [adminActiveTab, setAdminActiveTab] = useState<AdminTab>('dashboard');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [dietaryFilter, setDietaryFilter] = useState<'all' | 'veg' | 'non-veg' | 'vegan'>('all');
  const [isCloudSynced, setIsCloudSynced] = useState<boolean>(true);

  // Check URL query parameters for ?table=N
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tblParam = params.get('table');
      if (tblParam) {
        const parsed = parseInt(tblParam, 10);
        if (!isNaN(parsed) && parsed >= 1 && parsed <= 10) {
          setCurrentGuestTableNumber(parsed);
          setActiveInterface('guest');
        }
      }
    }
  }, []);

  // 1. Initial Firestore Setup & Real-time Listeners
  useEffect(() => {
    let unsubscribeTables: () => void = () => {};
    let unsubscribeMenu: () => void = () => {};
    let unsubscribeCats: () => void = () => {};
    let unsubscribeOrders: () => void = () => {};
    let unsubscribeKots: () => void = () => {};
    let unsubscribePayments: () => void = () => {};
    let unsubscribeInventory: () => void = () => {};
    let unsubscribeSettings: () => void = () => {};
    let unsubscribeService: () => void = () => {};
    let unsubscribeAuth: () => void = () => {};

    const initialize = async () => {
      try {
        await testConnection();
      } catch (err) {
        // Non-blocking connection probe
      }

      try {
        await seedInitial10TablesIfEmpty();
      } catch (err) {
        console.warn("Table seeding deferred until online connection stabilizes:", err);
      }

      // Auth subscription
      unsubscribeAuth = subscribeAdminAuth(user => {
        setCurrentUser(user);
      });

      // Tables listener
      unsubscribeTables = listenTables(liveTables => {
        if (liveTables.length > 0) {
          setTables(liveTables);
        }
      });

      // Categories listener
      unsubscribeCats = listenCategories(liveCats => {
        setCategories(liveCats);
      });

      // Menu items listener
      unsubscribeMenu = listenMenuItems(liveMenu => {
        setMenuItems(liveMenu);
      });

      // Orders listener
      unsubscribeOrders = listenOrders(liveOrders => {
        setOrders(liveOrders);
      });

      // KOTs listener
      unsubscribeKots = listenKOTs(liveKots => {
        setKots(liveKots);
      });

      // Payments listener
      unsubscribePayments = listenPayments(livePayments => {
        setPayments(livePayments);
      });

      // Inventory listener
      unsubscribeInventory = listenInventory(liveInv => {
        setInventory(liveInv);
      });

      // Service Requests listener
      unsubscribeService = listenServiceRequests(liveRequests => {
        setServiceRequests(liveRequests);
      });

      // Settings listener
      unsubscribeSettings = listenSettings(liveSettings => {
        if (liveSettings) {
          setSettings(prev => ({
            ...DEFAULT_SETTINGS,
            ...prev,
            ...liveSettings
          }));
        }
      });
    };

    initialize().catch(console.error);

    return () => {
      unsubscribeTables();
      unsubscribeMenu();
      unsubscribeCats();
      unsubscribeOrders();
      unsubscribeKots();
      unsubscribePayments();
      unsubscribeInventory();
      unsubscribeService();
      unsubscribeSettings();
      unsubscribeAuth();
    };
  }, []);

  // Helper to get active running table orders (non-cancelled, non-completed, unpaid)
  const getTableOrders = (tableNumber: number) => {
    const numStr = tableNumber < 10 ? `0${tableNumber}` : `${tableNumber}`;
    const tableId = `T${numStr}`;
    return orders.filter(
      o => (o.tableNumber === tableNumber || o.tableId === tableId) &&
           (o.status || '').toLowerCase() !== 'cancelled' &&
           (o.status || '').toLowerCase() !== 'completed' &&
           (o.paymentStatus || '').toLowerCase() !== 'paid'
    );
  };

  // Enriched dynamic tables state:
  // If guest hasn't ordered or admin hasn't punched an active order for a table,
  // the table will ALWAYS automatically be presented as AVAILABLE with 0 active orders & Rs. 0 bill.
  const enrichedTables: Table[] = useMemo(() => {
    return Array.from({ length: 10 }, (_, i) => {
      const num = i + 1;
      const numStr = num < 10 ? `0${num}` : `${num}`;
      const tableId = `T${numStr}`;

      const rawTable = tables.find(t => t.id === tableId || t.tableNumber === num || t.number === num);

      // Find non-cancelled, non-completed, unpaid running orders for this table
      const activeTableOrders = orders.filter(
        o => (o.tableNumber === num || o.tableId === tableId || (rawTable && o.tableId === rawTable.id)) &&
             (o.status || '').toLowerCase() !== 'cancelled' &&
             (o.status || '').toLowerCase() !== 'completed' &&
             (o.paymentStatus || '').toLowerCase() !== 'paid'
      );

      const tableBill = activeTableOrders.reduce((sum, o) => sum + (o.total || 0), 0);
      const activeOrdersCount = activeTableOrders.length;

      let dynamicStatus: TableStatus = 'AVAILABLE';
      const rawStatus = (rawTable?.status || '').toUpperCase();

      if (activeOrdersCount > 0) {
        if (rawStatus === 'BILLING') {
          dynamicStatus = 'BILLING';
        } else {
          dynamicStatus = 'OCCUPIED';
        }
      } else {
        if (rawStatus === 'RESERVED') {
          dynamicStatus = 'RESERVED';
        } else if (rawStatus === 'CLEANING') {
          dynamicStatus = 'CLEANING';
        } else {
          dynamicStatus = 'AVAILABLE';
        }
      }

      let section: TableSection = 'Indoor AC';
      let capacity = 4;
      if (num <= 4) {
        section = 'Indoor AC';
        capacity = num <= 2 ? 2 : 4;
      } else if (num <= 7) {
        section = 'Terrace Lounge';
        capacity = 4;
      } else if (num <= 9) {
        section = 'Cafe Patio';
        capacity = 4;
      } else {
        section = 'VIP Dining';
        capacity = 8;
      }

      return {
        ...(rawTable || {}),
        id: tableId,
        tableNumber: num,
        number: num,
        name: rawTable?.name || `Table T${numStr}`,
        label: rawTable?.label || `Table ${numStr}`,
        qrToken: rawTable?.qrToken || `qr-tbl-t${numStr}`,
        status: dynamicStatus,
        activeSessionId: activeOrdersCount > 0 ? (rawTable?.activeSessionId || `SES-${num}`) : null,
        isActive: true,
        capacity: rawTable?.capacity || capacity,
        section: rawTable?.section || section,
        createdAt: rawTable?.createdAt || new Date().toISOString(),
        updatedAt: rawTable?.updatedAt || new Date().toISOString(),
        totalBill: activeOrdersCount > 0 ? tableBill : 0,
        activeOrdersCount: activeOrdersCount
      };
    });
  }, [tables, orders]);
  const cartTotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.totalPrice, 0);
  }, [cart]);

  const cartItemCount = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.quantity, 0);
  }, [cart]);

  // Auth actions
  const loginAdminUser = async (email: string, pass: string) => {
    return await authLoginAdmin(email, pass);
  };

  const logoutAdminUser = async () => {
    await authLogoutAdmin();
  };

  // Cart operations
  const addToCart = (
    item: MenuItem,
    quantity: number,
    selectedVariant?: MenuItemVariant,
    selectedAddOns: MenuItemAddOn[] = [],
    specialInstructions?: string
  ) => {
    const unitPrice = (selectedVariant ? selectedVariant.price : item.price) +
      selectedAddOns.reduce((sum, a) => sum + a.price, 0);

    const cartItemId = `${item.id}-${selectedVariant?.id || 'base'}-${selectedAddOns.map(a => a.id).sort().join('_')}`;

    setCart(prev => {
      const existing = prev.find(ci => ci.cartItemId === cartItemId);
      if (existing) {
        const newQty = existing.quantity + quantity;
        return prev.map(ci =>
          ci.cartItemId === cartItemId
            ? { ...ci, quantity: newQty, totalPrice: unitPrice * newQty, specialInstructions }
            : ci
        );
      }
      return [
        ...prev,
        {
          cartItemId,
          menuItem: item,
          quantity,
          selectedVariant,
          selectedAddOns,
          specialInstructions,
          unitPrice,
          totalPrice: unitPrice * quantity
        }
      ];
    });
  };

  const updateCartQuantity = (cartItemId: string, delta: number) => {
    setCart(prev => {
      return prev
        .map(ci => {
          if (ci.cartItemId === cartItemId) {
            const newQty = ci.quantity + delta;
            return newQty > 0
              ? { ...ci, quantity: newQty, totalPrice: ci.unitPrice * newQty }
              : null;
          }
          return ci;
        })
        .filter(Boolean) as CartItem[];
    });
  };

  const removeFromCart = (cartItemId: string) => {
    setCart(prev => prev.filter(ci => ci.cartItemId !== cartItemId));
  };

  const clearCart = () => {
    setCart([]);
  };

  // Place guest QR order
  const placeGuestOrder = async (
    guestName?: string,
    guestPhone?: string,
    notes?: string
  ): Promise<Order> => {
    if (cart.length === 0) throw new Error('Cart is empty');

    const tblNum = currentGuestTableNumber;
    const numStr = tblNum < 10 ? `0${tblNum}` : `${tblNum}`;
    const tableId = `T${numStr}`;

    const currentTable = tables.find(t => t.tableNumber === tblNum || t.id === tableId);
    let sessionId = currentTable?.activeSessionId;

    if (!sessionId) {
      const session = await createTableSession(tableId, tblNum, 'GUEST_QR');
      sessionId = session.id;
    }

    const { order, kots: newKots } = await createOrderWithKOTs({
      tableId,
      tableNumber: tblNum,
      sessionId,
      source: 'GUEST_QR',
      items: cart.map(ci => ({
        menuItemId: ci.menuItem.id,
        name: ci.menuItem.name,
        price: ci.totalPrice > 0 ? ci.totalPrice / ci.quantity : ci.menuItem.price,
        kotDestination: ci.menuItem.kotDestination || 'KITCHEN',
        quantity: ci.quantity,
        notes: [
          ci.selectedVariant ? `Var: ${ci.selectedVariant.name}` : '',
          ci.selectedAddOns && ci.selectedAddOns.length > 0 ? `Add: ${ci.selectedAddOns.map(a => a.name).join(', ')}` : '',
          ci.specialInstructions || '',
          notes || ''
        ].filter(Boolean).join(' | ')
      })),
      createdBy: guestName ? `${guestName} (${guestPhone || 'Guest'})` : 'Guest QR',
      guestName: guestName || undefined,
      guestPhone: guestPhone || undefined,
      notes: notes || undefined,
      discount: 0,
      vatEnabled: settings.vatEnabled,
      vatRate: settings.vatRate,
      serviceChargeEnabled: settings.serviceChargeEnabled,
      serviceChargePercent: settings.serviceChargePercent
    });

    // Optimistically update React state immediately
    setOrders(prev => [order, ...prev.filter(o => o.id !== order.id)]);
    if (newKots && newKots.length > 0) {
      setKots(prev => [...newKots, ...prev.filter(k => !newKots.some(nk => nk.id === k.id))]);
    }
    setTables(prev => prev.map(t => (t.id === tableId || t.tableNumber === tblNum) ? {
      ...t,
      status: 'OCCUPIED',
      activeSessionId: sessionId,
      activeOrdersCount: (t.activeOrdersCount || 0) + 1,
      totalBill: (t.totalBill || 0) + order.total
    } : t));

    clearCart();
    return order;
  };

  // Create fast manual cashier order
  const createManualOrder = async (
    tableNumber: number,
    items: { menuItem: MenuItem; quantity: number; selectedVariant?: MenuItemVariant; selectedAddOns?: MenuItemAddOn[]; instructions?: string }[],
    orderType: OrderType,
    guestName?: string,
    guestPhone?: string,
    discountAmount: number = 0,
    discountReason?: string,
    waiterName?: string,
    notes?: string
  ): Promise<Order> => {
    const numStr = tableNumber < 10 ? `0${tableNumber}` : `${tableNumber}`;
    const tableId = `T${numStr}`;

    const currentTable = tables.find(t => t.tableNumber === tableNumber || t.id === tableId);
    let sessionId = currentTable?.activeSessionId;

    if (!sessionId) {
      const session = await createTableSession(tableId, tableNumber, 'ADMIN_MANUAL');
      sessionId = session.id;
    }

    const { order, kots: newKots } = await createOrderWithKOTs({
      tableId,
      tableNumber,
      sessionId,
      source: 'ADMIN_MANUAL',
      items: items.map(ci => ({
        menuItemId: ci.menuItem.id,
        name: ci.menuItem.name,
        price: ci.selectedVariant ? ci.selectedVariant.price : ci.menuItem.price,
        kotDestination: ci.menuItem.kotDestination || 'KITCHEN',
        quantity: ci.quantity,
        notes: [
          ci.selectedVariant ? `Var: ${ci.selectedVariant.name}` : '',
          ci.selectedAddOns && ci.selectedAddOns.length > 0 ? `Add: ${ci.selectedAddOns.map(a => a.name).join(', ')}` : '',
          ci.instructions || '',
          notes || ''
        ].filter(Boolean).join(' | ')
      })),
      createdBy: waiterName || currentUser?.email || 'POS Cashier',
      guestName: guestName || undefined,
      guestPhone: guestPhone || undefined,
      notes: notes || undefined,
      discount: discountAmount,
      vatEnabled: settings.vatEnabled,
      vatRate: settings.vatRate,
      serviceChargeEnabled: settings.serviceChargeEnabled,
      serviceChargePercent: settings.serviceChargePercent
    });

    // Optimistically update React state immediately
    setOrders(prev => [order, ...prev.filter(o => o.id !== order.id)]);
    if (newKots && newKots.length > 0) {
      setKots(prev => [...newKots, ...prev.filter(k => !newKots.some(nk => nk.id === k.id))]);
    }
    setTables(prev => prev.map(t => (t.id === tableId || t.tableNumber === tableNumber) ? {
      ...t,
      status: 'OCCUPIED',
      activeSessionId: sessionId,
      activeOrdersCount: (t.activeOrdersCount || 0) + 1,
      totalBill: (t.totalBill || 0) + order.total
    } : t));

    return order;
  };

  const updateOrderStatus = async (orderId: string, status: OrderStatus) => {
    const path = `orders/${orderId}`;
    const nowIso = new Date().toISOString();
    // Optimistic update
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status, updatedAt: nowIso } : o));
    try {
      await updateDoc(doc(db, 'orders', orderId), {
        status,
        updatedAt: nowIso
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  };

  const updateTableOrdersStatus = async (tableNumber: number, status: 'placed' | 'confirmed' | 'served') => {
    const numStr = tableNumber < 10 ? `0${tableNumber}` : `${tableNumber}`;
    const tableId = `T${numStr}`;
    
    // Find all active non-cancelled, non-paid orders for this table
    const tableOrders = orders.filter(
      o => (o.tableNumber === tableNumber || o.tableId === tableId) &&
           (o.status || '').toLowerCase() !== 'cancelled'
    );

    if (tableOrders.length === 0) return;

    const nowIso = new Date().toISOString();

    // Optimistically update React orders state
    setOrders(prev =>
      prev.map(ord => {
        if (tableOrders.some(to => to.id === ord.id)) {
          return { ...ord, status, updatedAt: nowIso };
        }
        return ord;
      })
    );

    // Update in Firestore
    try {
      const batch = writeBatch(db);
      tableOrders.forEach(ord => {
        batch.update(doc(db, 'orders', ord.id), {
          status,
          updatedAt: nowIso
        });
      });
      await batch.commit();
    } catch (error) {
      console.warn("Batch table order status update fallback:", error);
      for (const ord of tableOrders) {
        await updateDoc(doc(db, 'orders', ord.id), {
          status,
          updatedAt: nowIso
        }).catch(err => console.error("Error updating order status:", err));
      }
    }
  };

  const updateOrderItemStatus = async (orderId: string, itemId: string, status: OrderItemStatus) => {
    const path = `orders/${orderId}`;
    try {
      const order = orders.find(o => o.id === orderId);
      if (!order) return;
      const updatedItems = order.items.map(it =>
        it.id === itemId
          ? { ...it, status: status === 'preparing' ? 'COOKING' : status === 'ready' || status === 'served' ? 'DONE' : status === 'cancelled' ? 'CANCELLED' : 'PENDING' }
          : it
      );
      await updateDoc(doc(db, 'orders', orderId), {
        items: updatedItems,
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  };

  const updateKOTStatus = async (kotId: string, status: 'pending' | 'in_progress' | 'completed' | 'bumped') => {
    const path = `kots/${kotId}`;
    try {
      const mappedStatus = status === 'pending' ? 'PENDING' : status === 'in_progress' ? 'PREPARING' : status === 'completed' || status === 'bumped' ? 'READY' : 'PENDING';
      await updateDoc(doc(db, 'kots', kotId), {
        status: mappedStatus,
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  };

  // Table status and bill settlement
  const settleTableBill = async (
    tableNumber: number,
    paymentMethod: PaymentMethod,
    cashierName: string = 'Cashier',
    discountAmount: number = 0,
    notes?: string
  ) => {
    const numStr = tableNumber < 10 ? `0${tableNumber}` : `${tableNumber}`;
    const tableId = `T${numStr}`;
    const table = tables.find(t => t.tableNumber === tableNumber || t.id === tableId);
    if (!table) return;

    // Find all active non-cancelled, non-paid orders for this table
    const tableOrders = orders.filter(
      o => (o.tableNumber === tableNumber || o.tableId === tableId) &&
           (o.status || '').toLowerCase() !== 'cancelled' &&
           (o.paymentStatus || '').toLowerCase() !== 'paid'
    );
    const rawSubtotal = tableOrders.reduce((sum, o) => sum + (o.subtotal ?? o.total ?? 0), 0);
    const discountedSubtotal = Math.max(0, rawSubtotal - discountAmount);
    const serviceCharge = settings.serviceChargeEnabled
      ? Math.round((discountedSubtotal * (settings.serviceChargePercent || 0)) / 100)
      : 0;
    const vatAmount = settings.vatEnabled
      ? Math.round(((discountedSubtotal + serviceCharge) * (settings.vatRate || 13)) / 100)
      : 0;
    const finalAmount = discountedSubtotal + serviceCharge + vatAmount;
    const nowIso = new Date().toISOString();

    // 1. Record payment in Firestore
    try {
      await recordPayment({
        sessionId: table.activeSessionId || `SES-${tableNumber}`,
        billId: `BILL-${Date.now().toString(36).toUpperCase()}`,
        amount: finalAmount,
        method: paymentMethod,
        status: 'PAID',
        transactionReference: `TX-${Math.floor(100000 + Math.random() * 900000)}`,
        createdBy: cashierName || currentUser?.email || 'Admin',
        tableNumber,
        orderNumber: tableOrders[0]?.orderNumber || 'POS'
      });
    } catch (err) {
      console.error("Payment record error:", err);
    }

    // 2. Mark all orders for this table as PAID and COMPLETED in Firestore
    const batch = writeBatch(db);
    tableOrders.forEach(ord => {
      batch.update(doc(db, 'orders', ord.id), {
        status: 'completed',
        paymentStatus: 'paid',
        paymentMethod: paymentMethod,
        paidAt: nowIso,
        updatedAt: nowIso
      });
    });

    // 3. Mark Table in Firestore as AVAILABLE and clear activeSessionId
    batch.update(doc(db, 'tables', tableId), {
      status: 'AVAILABLE',
      activeSessionId: null,
      updatedAt: nowIso
    });

    // 4. Close session if present
    if (table.activeSessionId) {
      batch.set(
        doc(db, 'sessions', table.activeSessionId),
        {
          status: 'CLOSED',
          closedAt: nowIso,
          updatedAt: nowIso
        },
        { merge: true }
      );
    }

    try {
      await batch.commit();
    } catch (err) {
      console.warn("Batch commit fallback in settleTableBill:", err);
      for (const ord of tableOrders) {
        await updateDoc(doc(db, 'orders', ord.id), {
          status: 'completed',
          paymentStatus: 'paid',
          paymentMethod,
          paidAt: nowIso,
          updatedAt: nowIso
        }).catch(console.error);
      }
      await updateDbTableStatus(tableId, 'AVAILABLE', null);
    }

    // 5. Optimistically update local React state immediately
    setOrders(prev =>
      prev.map(ord => {
        if (tableOrders.some(to => to.id === ord.id)) {
          return {
            ...ord,
            status: 'completed',
            paymentStatus: 'paid',
            paymentMethod,
            paidAt: nowIso,
            updatedAt: nowIso
          };
        }
        return ord;
      })
    );

    setTables(prev =>
      prev.map(t => {
        if (t.id === tableId || t.tableNumber === tableNumber) {
          return {
            ...t,
            status: 'AVAILABLE',
            activeSessionId: null,
            totalBill: 0,
            activeOrdersCount: 0,
            updatedAt: nowIso
          };
        }
        return t;
      })
    );
  };

  const markOrderPaid = async (
    orderId: string,
    paymentMethod: PaymentMethod = 'cash',
    cashierName?: string
  ) => {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;
    const nowIso = new Date().toISOString();

    const path = `orders/${orderId}`;
    try {
      await updateDoc(doc(db, 'orders', orderId), {
        status: 'completed',
        paymentStatus: 'paid',
        paymentMethod,
        paidAt: nowIso,
        updatedAt: nowIso
      });

      await recordPayment({
        sessionId: order.sessionId || `SES-${order.tableNumber}`,
        billId: `BILL-${order.orderNumber || orderId}`,
        amount: order.finalAmount || order.total || order.subtotal || 0,
        method: paymentMethod,
        status: 'PAID',
        transactionReference: `TX-${Math.floor(100000 + Math.random() * 900000)}`,
        createdBy: cashierName || currentUser?.email || 'POS Staff',
        tableNumber: order.tableNumber,
        orderNumber: order.orderNumber
      });

      setOrders(prev =>
        prev.map(o =>
          o.id === orderId
            ? { ...o, status: 'completed', paymentStatus: 'paid', paymentMethod, paidAt: nowIso, updatedAt: nowIso }
            : o
        )
      );

      // Check if any other unpaid active orders remain for this table
      const remainingOrders = orders.filter(
        o => o.id !== orderId &&
             (o.tableNumber === order.tableNumber || o.tableId === order.tableId) &&
             (o.status || '').toLowerCase() !== 'cancelled' &&
             (o.paymentStatus || '').toLowerCase() !== 'paid'
      );

      if (remainingOrders.length === 0) {
        const numStr = order.tableNumber < 10 ? `0${order.tableNumber}` : `${order.tableNumber}`;
        const tableId = `T${numStr}`;
        await updateDbTableStatus(tableId, 'AVAILABLE', null);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  };

  const occupyTable = async (tableNumber: number, guestCount: number, waiterName?: string) => {
    const numStr = tableNumber < 10 ? `0${tableNumber}` : `${tableNumber}`;
    const tableId = `T${numStr}`;
    await createTableSession(tableId, tableNumber, waiterName || 'POS Staff');
  };

  const setTableStatus = async (tableNumber: number, status: Table['status'], notes?: string) => {
    const numStr = tableNumber < 10 ? `0${tableNumber}` : `${tableNumber}`;
    const tableId = `T${numStr}`;
    const mappedStatus = status.toUpperCase() as Table['status'];
    await updateDbTableStatus(tableId, mappedStatus, mappedStatus === 'AVAILABLE' ? null : undefined);
  };

  const transferTable = async (fromTableNumber: number, toTableNumber: number): Promise<boolean> => {
    const fromStr = fromTableNumber < 10 ? `0${fromTableNumber}` : `${fromTableNumber}`;
    const toStr = toTableNumber < 10 ? `0${toTableNumber}` : `${toTableNumber}`;
    const fromId = `T${fromStr}`;
    const toId = `T${toStr}`;

    const fromTable = tables.find(t => t.id === fromId || t.tableNumber === fromTableNumber);
    const toTable = tables.find(t => t.id === toId || t.tableNumber === toTableNumber);

    if (!fromTable || !toTable || toTable.status !== 'AVAILABLE') return false;

    const sessionId = fromTable.activeSessionId;
    const batch = writeBatch(db);

    batch.update(doc(db, 'tables', toId), {
      status: 'OCCUPIED',
      activeSessionId: sessionId,
      updatedAt: new Date().toISOString()
    });

    batch.update(doc(db, 'tables', fromId), {
      status: 'AVAILABLE',
      activeSessionId: null,
      updatedAt: new Date().toISOString()
    });

    // Update open orders
    orders.forEach(o => {
      if (o.tableId === fromId || o.tableNumber === fromTableNumber) {
        batch.update(doc(db, 'orders', o.id), {
          tableId: toId,
          tableNumber: toTableNumber,
          updatedAt: new Date().toISOString()
        });
      }
    });

    await batch.commit();
    return true;
  };

  // Service requests
  const addServiceRequest = async (tableNumber: number, type: ServiceRequest['type'], message?: string) => {
    const path = 'service_requests';
    try {
      const id = `REQ-${Date.now().toString(36)}`;
      const req: ServiceRequest = {
        id,
        tableNumber,
        type,
        ...(message ? { message } : {}),
        createdAt: new Date().toISOString(),
        status: 'pending'
      };
      await setDoc(doc(db, path, id), cleanFirestoreData(req));
      setServiceRequests(prev => [req, ...prev]);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  };

  const resolveServiceRequest = async (requestId: string) => {
    const path = `service_requests/${requestId}`;
    try {
      await updateDoc(doc(db, 'service_requests', requestId), { status: 'attended' });
      setServiceRequests(prev => prev.filter(r => r.id !== requestId));
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  };

  // Menu item management
  const toggleMenuItemStock = async (itemId: string) => {
    const item = menuItems.find(m => m.id === itemId);
    if (!item) return;
    const newStock = !item.inStock;
    setMenuItems(prev => prev.map(m => m.id === itemId ? { ...m, inStock: newStock } : m));
    const path = `menu_items/${itemId}`;
    try {
      await updateDoc(doc(db, 'menu_items', itemId), {
        inStock: newStock,
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  };

  const updateMenuItem = async (item: MenuItem) => {
    setMenuItems(prev => prev.map(m => m.id === item.id ? item : m));
    const path = `menu_items/${item.id}`;
    try {
      await setDoc(doc(db, 'menu_items', item.id), cleanFirestoreData({
        ...item,
        updatedAt: new Date().toISOString()
      }));
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  };

  const addMenuItem = async (item: Omit<MenuItem, 'id'>) => {
    const path = 'menu_items';
    const id = `ITEM-${Date.now().toString(36)}`;
    const newItem: MenuItem = {
      ...item,
      id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    setMenuItems(prev => [newItem, ...prev]);
    try {
      await setDoc(doc(db, path, id), cleanFirestoreData(newItem));
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  };

  const deleteMenuItem = async (itemId: string) => {
    setMenuItems(prev => prev.filter(m => m.id !== itemId));
    const path = `menu_items/${itemId}`;
    try {
      await deleteDoc(doc(db, 'menu_items', itemId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  };

  // Inventory operations
  const addInventoryItem = async (item: Omit<InventoryItem, 'id' | 'createdAt' | 'updatedAt'>) => {
    const id = `INV-${Date.now().toString(36).toUpperCase()}`;
    const minThreshold = Number(item.minThreshold ?? item.minimumStock ?? 5);
    const currentStock = Number(item.currentStock || 0);
    const status = currentStock <= 0 ? 'out_of_stock' : currentStock <= minThreshold ? 'low_stock' : 'in_stock';
    
    const newItem: InventoryItem = {
      ...item,
      id,
      currentStock,
      minThreshold,
      minimumStock: minThreshold,
      costPerUnit: Number(item.costPerUnit || 0),
      status,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastRestocked: new Date().toISOString()
    };
    
    setInventory(prev => [newItem, ...prev.filter(i => i.id !== id)]);
    const path = `inventory/${id}`;
    try {
      await setDoc(doc(db, 'inventory', id), cleanFirestoreData(newItem));
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  };

  const updateInventoryItem = async (item: InventoryItem) => {
    const minThreshold = Number(item.minThreshold ?? item.minimumStock ?? 5);
    const currentStock = Number(item.currentStock || 0);
    const status = currentStock <= 0 ? 'out_of_stock' : currentStock <= minThreshold ? 'low_stock' : 'in_stock';
    
    const updated: InventoryItem = {
      ...item,
      currentStock,
      minThreshold,
      minimumStock: minThreshold,
      costPerUnit: Number(item.costPerUnit || 0),
      status,
      updatedAt: new Date().toISOString()
    };
    
    setInventory(prev => prev.map(i => i.id === item.id ? updated : i));
    const path = `inventory/${item.id}`;
    try {
      await setDoc(doc(db, 'inventory', item.id), cleanFirestoreData(updated));
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  };

  const deleteInventoryItem = async (id: string) => {
    setInventory(prev => prev.filter(i => i.id !== id));
    const path = `inventory/${id}`;
    try {
      await deleteDoc(doc(db, 'inventory', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  };

  const updateInventoryStock = async (
    id: string,
    newStock: number,
    unitCost?: number,
    minThreshold?: number,
    supplier?: string
  ) => {
    const item = inventory.find(i => i.id === id);
    const min = minThreshold !== undefined ? Number(minThreshold) : (item?.minThreshold ?? item?.minimumStock ?? 5);
    const stock = Number(newStock);
    const status = stock <= 0 ? 'out_of_stock' : stock <= min ? 'low_stock' : 'in_stock';

    setInventory(prev =>
      prev.map(i => {
        if (i.id === id) {
          return {
            ...i,
            currentStock: stock,
            minThreshold: min,
            minimumStock: min,
            costPerUnit: unitCost !== undefined ? Number(unitCost) : i.costPerUnit,
            supplier: supplier !== undefined ? supplier : i.supplier,
            status,
            lastRestocked: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
        }
        return i;
      })
    );

    const path = `inventory/${id}`;
    try {
      await updateDoc(doc(db, 'inventory', id), {
        currentStock: stock,
        minThreshold: min,
        minimumStock: min,
        ...(unitCost !== undefined ? { costPerUnit: Number(unitCost) } : {}),
        ...(supplier !== undefined ? { supplier } : {}),
        status,
        lastRestocked: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  };

  const adjustInventoryStock = async (id: string, delta: number) => {
    const item = inventory.find(i => i.id === id);
    if (!item) return;
    await updateInventoryStock(id, Math.max(0, item.currentStock + delta));
  };

  // Settings
  const updateSettings = async (newSettings: Partial<RestaurantSettings>) => {
    const path = 'settings/restaurant_config';
    try {
      await setDoc(doc(db, 'settings', 'restaurant_config'), cleanFirestoreData({
        ...settings,
        ...newSettings
      }));
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  };

  const resetToDemoData = async () => {
    await clearAllTestDataAndResetTables();
  };

  // Helpers
  const getCurrentTable = () => {
    const numStr = currentGuestTableNumber < 10 ? `0${currentGuestTableNumber}` : `${currentGuestTableNumber}`;
    const tableId = `T${numStr}`;
    return enrichedTables.find(t => t.tableNumber === currentGuestTableNumber || t.id === tableId);
  };

  return (
    <POSContext.Provider
      value={{
        tables: enrichedTables,
        menuItems,
        categories,
        orders,
        kots,
        inventory,
        payments,
        serviceRequests,
        settings,
        currentUser,
        currentGuestTableNumber,
        activeInterface,
        adminActiveTab,
        cart,
        searchQuery,
        selectedCategory,
        dietaryFilter,
        isCloudSynced,

        setCurrentGuestTableNumber,
        setActiveInterface,
        setAdminActiveTab,
        setSearchQuery,
        setSelectedCategory,
        setDietaryFilter,

        loginAdminUser,
        logoutAdminUser,

        addToCart,
        updateCartQuantity,
        removeFromCart,
        clearCart,
        cartTotal,
        cartItemCount,

        placeGuestOrder,
        createManualOrder,
        updateOrderStatus,
        updateTableOrdersStatus,
        updateOrderItemStatus,
        updateKOTStatus,
        markOrderPaid,

        settleTableBill,
        occupyTable,
        setTableStatus,
        transferTable,

        addServiceRequest,
        resolveServiceRequest,

        toggleMenuItemStock,
        updateMenuItem,
        addMenuItem,
        deleteMenuItem,
        addInventoryItem,
        updateInventoryItem,
        deleteInventoryItem,
        updateInventoryStock,
        adjustInventoryStock,

        updateSettings,
        resetToDemoData,

        getTableOrders,
        getCurrentTable
      }}
    >
      {children}
    </POSContext.Provider>
  );
};

export const usePOS = () => {
  const context = useContext(POSContext);
  if (!context) {
    throw new Error('usePOS must be used within a POSProvider');
  }
  return context;
};
