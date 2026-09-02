import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  writeBatch,
  onSnapshot,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp
} from 'firebase/firestore';
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User
} from 'firebase/auth';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';

// Deep clean any object to eliminate `undefined` fields before sending to Firestore
export function cleanFirestoreData<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(item => cleanFirestoreData(item)) as unknown as T;
  }
  if (typeof obj === 'object' && (obj.constructor === Object || !obj.constructor)) {
    const cleaned: any = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined) {
        cleaned[key] = cleanFirestoreData(value);
      }
    }
    return cleaned;
  }
  return obj;
}
import {
  Table,
  TableStatus,
  Category,
  MenuItem,
  TableSession,
  Order,
  OrderItemSnapshot,
  KOTTicket,
  KOTDestination,
  PrintJob,
  PaymentRecord,
  InventoryItem,
  Recipe,
  InventoryTransaction,
  AuditLog,
  RestaurantSettings,
  ServiceRequest
} from '../types';

// ====================================================
// CONSTANTS & SEED DATA
// ====================================================
export const INITIAL_10_TABLES: Table[] = Array.from({ length: 10 }, (_, i) => {
  const num = i + 1;
  const numStr = num < 10 ? `0${num}` : `${num}`;
  const id = `T${numStr}`;
  const token = `qr-tbl-t${numStr}-${Math.random().toString(36).substring(2, 9)}`;

  let section = 'Indoor AC';
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
    id,
    tableNumber: num,
    name: `Table T${numStr}`,
    qrToken: token,
    status: 'AVAILABLE',
    activeSessionId: null,
    isActive: true,
    capacity,
    section,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    // Compatibility fields
    number: num,
    label: `Table ${numStr}`,
    totalBill: 0,
    activeOrdersCount: 0
  };
});

export const INITIAL_20_TABLES = INITIAL_10_TABLES;

export const DEFAULT_SETTINGS: RestaurantSettings = {
  restaurantName: "The Fat Buddha Delight Restro & Cafe",
  name: "The Fat Buddha Delight Restro & Cafe",
  panNumber: "302194821",
  panNo: "302194821",
  address: "Main Street, Heritage Zone, Kathmandu, Nepal",
  phone: "+977 1 4220000 / +977 9801234567",
  email: "contact@thefatbuddha.com",
  logoUrl: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=300&auto=format&fit=crop&q=80",
  tagline: "Soulful Asian Wok, Artisanal Cafe & Clay Oven Delights",
  currency: "NPR",
  currencySymbol: "Rs.",
  vatEnabled: false, // OFF by default
  vatRate: 13,
  serviceChargeEnabled: false, // OFF by default
  serviceChargePercent: 10,
  discountEnabled: true,
  timezone: "Asia/Kathmandu",
  wifiSsid: "FatBuddha_Guest_5G",
  wifiPassword: "eatdelightful",
  autoPrintKOT: true,
  soundAlerts: true,
  tableCount: 10
};

// ====================================================
// 1. AUTHENTICATION SERVICES
// ====================================================
export const subscribeAdminAuth = (callback: (user: User | null) => void) => {
  return onAuthStateChanged(auth, callback);
};

export const loginAdmin = async (email: string, pass: string) => {
  try {
    const cred = await signInWithEmailAndPassword(auth, email, pass);
    return cred.user;
  } catch (error) {
    console.error("Admin sign in failed:", error);
    throw error;
  }
};

export const logoutAdmin = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Admin sign out failed:", error);
    throw error;
  }
};

// ====================================================
// 2. TABLES (10 AVAILABLE TABLES)
// ====================================================
export const seedInitial10TablesIfEmpty = async (): Promise<boolean> => {
  const path = 'tables';
  try {
    const snap = await getDocs(collection(db, path));
    const existingTableIds = new Set(snap.docs.map(d => d.id));
    
    // Seed any missing tables without wiping existing tables or active sessions
    let needsBatch = false;
    const batch = writeBatch(db);

    INITIAL_10_TABLES.forEach(t => {
      if (!existingTableIds.has(t.id)) {
        needsBatch = true;
        batch.set(doc(db, path, t.id), cleanFirestoreData({
          ...t,
          status: 'AVAILABLE',
          activeSessionId: null,
          totalBill: 0,
          activeOrdersCount: 0,
          updatedAt: new Date().toISOString()
        }));
      }
    });

    // Delete any obsolete legacy tables > 10
    snap.docs.forEach(d => {
      const num = parseInt(d.id.replace(/\D/g, ''), 10);
      if (num > 10) {
        needsBatch = true;
        batch.delete(doc(db, path, d.id));
      }
    });

    // Seed settings doc if not present
    const settingsDoc = await getDoc(doc(db, 'settings', 'restaurant_config'));
    if (!settingsDoc.exists()) {
      needsBatch = true;
      batch.set(doc(db, 'settings', 'restaurant_config'), cleanFirestoreData(DEFAULT_SETTINGS));
    }

    if (needsBatch) {
      await batch.commit();
      return true;
    }
    return false;
  } catch (error: any) {
    if (error?.code === 'unavailable' || error?.message?.includes('offline') || error?.message?.includes('unavailable')) {
      console.warn("Firestore tables initialization deferred until online connection stabilizes.");
      return false;
    }
    handleFirestoreError(error, OperationType.WRITE, path);
    return false;
  }
};

export const clearAllTestDataAndResetTables = async (): Promise<boolean> => {
  try {
    // 1. Reset all 10 tables to clean AVAILABLE state
    const tablesBatch = writeBatch(db);
    INITIAL_10_TABLES.forEach(t => {
      tablesBatch.set(doc(db, 'tables', t.id), {
        ...t,
        status: 'AVAILABLE',
        activeSessionId: null,
        totalBill: 0,
        activeOrdersCount: 0,
        updatedAt: new Date().toISOString()
      });
    });
    // Delete any legacy tables > 10
    const tablesSnap = await getDocs(collection(db, 'tables'));
    tablesSnap.docs.forEach(d => {
      const num = parseInt(d.id.replace(/\D/g, ''), 10);
      if (num > 10) {
        tablesBatch.delete(doc(db, 'tables', d.id));
      }
    });
    await tablesBatch.commit();

    // 2. Clear test orders
    const ordersSnap = await getDocs(collection(db, 'orders'));
    if (!ordersSnap.empty) {
      const ordersBatch = writeBatch(db);
      ordersSnap.docs.forEach(d => ordersBatch.delete(d.ref));
      await ordersBatch.commit();
    }

    // 3. Clear test kots
    const kotsSnap = await getDocs(collection(db, 'kots'));
    if (!kotsSnap.empty) {
      const kotsBatch = writeBatch(db);
      kotsSnap.docs.forEach(d => kotsBatch.delete(d.ref));
      await kotsBatch.commit();
    }

    // 4. Clear test payments
    const paymentsSnap = await getDocs(collection(db, 'payments'));
    if (!paymentsSnap.empty) {
      const paymentsBatch = writeBatch(db);
      paymentsSnap.docs.forEach(d => paymentsBatch.delete(d.ref));
      await paymentsBatch.commit();
    }

    // 5. Clear test sessions
    const sessionsSnap = await getDocs(collection(db, 'sessions'));
    if (!sessionsSnap.empty) {
      const sessionsBatch = writeBatch(db);
      sessionsSnap.docs.forEach(d => sessionsBatch.delete(d.ref));
      await sessionsBatch.commit();
    }

    // 6. Clear service requests
    const serviceSnap = await getDocs(collection(db, 'service_requests'));
    if (!serviceSnap.empty) {
      const serviceBatch = writeBatch(db);
      serviceSnap.docs.forEach(d => serviceBatch.delete(d.ref));
      await serviceBatch.commit();
    }

    return true;
  } catch (error) {
    console.error("Error resetting database to fresh state:", error);
    return false;
  }
};

export const seedInitial20TablesIfEmpty = seedInitial10TablesIfEmpty;

export const listenTables = (
  onSuccess: (tables: Table[]) => void,
  onError?: (err: any) => void
) => {
  const path = 'tables';
  return onSnapshot(
    collection(db, path),
    snapshot => {
      const tablesList: Table[] = [];
      snapshot.forEach(docSnap => {
        const data = docSnap.data() as Table;
        const num = data.tableNumber || parseInt(docSnap.id.replace(/\D/g, ''), 10) || 1;
        // Only include valid 1..10 tables
        if (num <= 10) {
          tablesList.push({
            ...data,
            id: docSnap.id,
            tableNumber: num,
            number: num,
            label: data.name || `Table ${docSnap.id}`
          });
        }
      });
      // Sort numerically T01..T10
      tablesList.sort((a, b) => a.tableNumber - b.tableNumber);
      onSuccess(tablesList);
    },
    error => {
      handleFirestoreError(error, OperationType.LIST, path);
      if (onError) onError(error);
    }
  );
};

export const updateTableStatus = async (
  tableId: string,
  status: TableStatus,
  activeSessionId: string | null = null
) => {
  const path = `tables/${tableId}`;
  try {
    await updateDoc(doc(db, 'tables', tableId), {
      status,
      activeSessionId,
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
};

// ====================================================
// 3. TABLE SESSIONS
// ====================================================
export const createTableSession = async (
  tableId: string,
  tableNumber: number,
  createdBy: string = 'GUEST_QR'
): Promise<TableSession> => {
  const path = 'sessions';
  try {
    const sessionId = `SES-${tableNumber}-${Date.now().toString(36).toUpperCase()}`;
    const newSession: TableSession = {
      id: sessionId,
      tableId,
      tableNumber,
      status: 'OPEN',
      openedAt: new Date().toISOString(),
      closedAt: null,
      createdBy,
      totalAmount: 0
    };

    const batch = writeBatch(db);
    batch.set(doc(db, 'sessions', sessionId), cleanFirestoreData(newSession));
    batch.set(
      doc(db, 'tables', tableId),
      cleanFirestoreData({
        status: 'OCCUPIED',
        activeSessionId: sessionId,
        updatedAt: new Date().toISOString()
      }),
      { merge: true }
    );
    await batch.commit();

    return newSession;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
    throw error;
  }
};

export const listenSessions = (
  onSuccess: (sessions: TableSession[]) => void,
  onError?: (err: any) => void
) => {
  const path = 'sessions';
  return onSnapshot(
    collection(db, path),
    snapshot => {
      const list: TableSession[] = [];
      snapshot.forEach(docSnap => list.push(docSnap.data() as TableSession));
      onSuccess(list);
    },
    error => {
      handleFirestoreError(error, OperationType.LIST, path);
      if (onError) onError(error);
    }
  );
};

// ====================================================
// 4. CATEGORIES & MENU ITEMS
// ====================================================
export const listenCategories = (
  onSuccess: (categories: Category[]) => void,
  onError?: (err: any) => void
) => {
  const path = 'categories';
  return onSnapshot(
    collection(db, path),
    snapshot => {
      const list: Category[] = [];
      snapshot.forEach(docSnap => list.push({ ...docSnap.data(), id: docSnap.id } as Category));
      list.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
      onSuccess(list);
    },
    error => {
      handleFirestoreError(error, OperationType.LIST, path);
      if (onError) onError(error);
    }
  );
};

export const listenMenuItems = (
  onSuccess: (menuItems: MenuItem[]) => void,
  onError?: (err: any) => void
) => {
  const path = 'menu_items';
  return onSnapshot(
    collection(db, path),
    snapshot => {
      const list: MenuItem[] = [];
      snapshot.forEach(docSnap => list.push({ ...docSnap.data(), id: docSnap.id } as MenuItem));
      list.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
      onSuccess(list);
    },
    error => {
      handleFirestoreError(error, OperationType.LIST, path);
      if (onError) onError(error);
    }
  );
};

// ====================================================
// 5. ORDERS & KOT SPLIT CREATION
// ====================================================
export const createOrderWithKOTs = async (
  params: {
    tableId: string;
    tableNumber: number;
    sessionId: string;
    source: 'GUEST_QR' | 'ADMIN_MANUAL';
    items: Array<{
      menuItemId: string;
      quantity: number;
      name?: string;
      price?: number;
      kotDestination?: KOTDestination;
      notes?: string;
    }>;
    createdBy: string;
    guestName?: string;
    guestPhone?: string;
    notes?: string;
    discount?: number;
    vatEnabled?: boolean;
    vatRate?: number;
    serviceChargeEnabled?: boolean;
    serviceChargePercent?: number;
  }
): Promise<{ order: Order; kots: KOTTicket[] }> => {
  const path = 'orders';
  try {
    // 1. Fetch trusted menu items from Firestore if available
    let menuMap = new Map<string, MenuItem>();
    try {
      const menuDocs = await getDocs(collection(db, 'menu_items'));
      menuDocs.forEach(d => menuMap.set(d.id, d.data() as MenuItem));
    } catch (err) {
      console.warn("Could not query menu_items collection, using item snapshot fallbacks:", err);
    }

    const orderId = `ORD-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const orderNumber = `ORD-${Math.floor(1000 + Math.random() * 9000)}`;

    let subtotal = 0;
    const orderItemSnapshots: OrderItemSnapshot[] = [];

    const kitchenItems: Array<{ orderItemId: string; menuItemId: string; nameSnapshot: string; quantity: number; notes?: string; category?: string }> = [];
    const receptionItems: Array<{ orderItemId: string; menuItemId: string; nameSnapshot: string; quantity: number; notes?: string; category?: string }> = [];

    params.items.forEach((it, idx) => {
      const trustedMenu = menuMap.get(it.menuItemId);
      const name = trustedMenu?.name || it.name || `Item ${it.menuItemId}`;
      const price = (trustedMenu?.price !== undefined) ? trustedMenu.price : (it.price !== undefined ? it.price : 0);
      const destination: KOTDestination = (trustedMenu?.kotDestination) || it.kotDestination || 'KITCHEN';
      const category = trustedMenu?.category || '';
      const itemSubtotal = price * it.quantity;
      subtotal += itemSubtotal;

      const orderItemId = `${orderId}-it-${idx + 1}`;
      const snapshot: OrderItemSnapshot = {
        id: orderItemId,
        orderId,
        menuItemId: it.menuItemId,
        nameSnapshot: name,
        priceSnapshot: price,
        quantity: it.quantity,
        notes: it.notes || '',
        kotDestination: destination,
        status: 'PENDING',
        cancelled: false,
        cancelledBy: null,
        cancelledAt: null,
        cancellationReason: null,
        createdAt: new Date().toISOString(),
        // Compatibility
        name,
        price,
        instructions: it.notes,
        category
      };

      orderItemSnapshots.push(snapshot);

      if (destination === 'RECEPTION') {
        receptionItems.push({
          orderItemId,
          menuItemId: it.menuItemId,
          nameSnapshot: name,
          quantity: it.quantity,
          notes: it.notes,
          category
        });
      } else {
        kitchenItems.push({
          orderItemId,
          menuItemId: it.menuItemId,
          nameSnapshot: name,
          quantity: it.quantity,
          notes: it.notes,
          category
        });
      }
    });

    const discount = params.discount || 0;
    const discountedSubtotal = Math.max(0, subtotal - discount);
    const serviceCharge = params.serviceChargeEnabled
      ? Math.round((discountedSubtotal * (params.serviceChargePercent ?? 10)) / 100)
      : 0;
    const vat = params.vatEnabled
      ? Math.round(((discountedSubtotal + serviceCharge) * (params.vatRate ?? 13)) / 100)
      : 0;
    const total = discountedSubtotal + serviceCharge + vat;

    const newOrder: Order = {
      id: orderId,
      orderNumber,
      sessionId: params.sessionId,
      tableId: params.tableId,
      tableNumber: params.tableNumber,
      source: params.source,
      status: 'placed',
      subtotal,
      discount,
      vat,
      serviceCharge,
      total,
      items: orderItemSnapshots,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: params.createdBy,
      guestName: params.guestName,
      guestPhone: params.guestPhone,
      // Compatibility
      finalAmount: total,
      taxAmount: vat,
      discountAmount: discount,
      paymentStatus: 'unpaid',
      orderType: 'dine_in'
    };

    const createdKOTs: KOTTicket[] = [];
    const createdPrintJobs: PrintJob[] = [];
    const batch = writeBatch(db);

    // Write the Order
    batch.set(doc(db, 'orders', orderId), cleanFirestoreData(newOrder));

    // Create Kitchen KOT if any items
    if (kitchenItems.length > 0) {
      const kotId = `KOT-K-${Date.now().toString(36).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;
      const kotNumber = `KOT-${Math.floor(100 + Math.random() * 900)}`;
      const kot: KOTTicket = {
        id: kotId,
        kotNumber,
        orderId,
        sessionId: params.sessionId,
        tableId: params.tableId,
        tableNumber: params.tableNumber,
        destination: 'KITCHEN',
        status: 'PENDING',
        items: kitchenItems.map(k => ({
          id: `kot-it-${k.orderItemId}`,
          orderItemId: k.orderItemId,
          menuItemId: k.menuItemId,
          nameSnapshot: k.nameSnapshot,
          quantity: k.quantity,
          notes: k.notes,
          status: 'PENDING',
          name: k.nameSnapshot,
          category: k.category
        })),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        tableLabel: `Table T${params.tableNumber < 10 ? '0' + params.tableNumber : params.tableNumber}`,
        orderNumber
      };
      createdKOTs.push(kot);
      batch.set(doc(db, 'kots', kotId), cleanFirestoreData(kot));

      // Create Print Job
      const printJobId = `PRN-${kotId}`;
      const printJob: PrintJob = {
        id: printJobId,
        kotId,
        destination: 'KITCHEN',
        printerType: 'KITCHEN',
        status: 'PENDING',
        payload: {
          kotNumber,
          tableNumber: params.tableNumber,
          destination: 'KITCHEN',
          items: kitchenItems.map(k => ({ name: k.nameSnapshot, quantity: k.quantity, notes: k.notes })),
          timestamp: new Date().toISOString()
        },
        attempts: 0,
        createdAt: new Date().toISOString(),
        printedAt: null,
        error: null
      };
      createdPrintJobs.push(printJob);
      batch.set(doc(db, 'printJobs', printJobId), cleanFirestoreData(printJob));
    }

    // Create Reception KOT if any items
    if (receptionItems.length > 0) {
      const kotId = `KOT-R-${Date.now().toString(36).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;
      const kotNumber = `KOT-${Math.floor(100 + Math.random() * 900)}`;
      const kot: KOTTicket = {
        id: kotId,
        kotNumber,
        orderId,
        sessionId: params.sessionId,
        tableId: params.tableId,
        tableNumber: params.tableNumber,
        destination: 'RECEPTION',
        status: 'PENDING',
        items: receptionItems.map(k => ({
          id: `kot-it-${k.orderItemId}`,
          orderItemId: k.orderItemId,
          menuItemId: k.menuItemId,
          nameSnapshot: k.nameSnapshot,
          quantity: k.quantity,
          notes: k.notes,
          status: 'PENDING',
          name: k.nameSnapshot,
          category: k.category
        })),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        tableLabel: `Table T${params.tableNumber < 10 ? '0' + params.tableNumber : params.tableNumber}`,
        orderNumber
      };
      createdKOTs.push(kot);
      batch.set(doc(db, 'kots', kotId), cleanFirestoreData(kot));

      // Create Print Job
      const printJobId = `PRN-${kotId}`;
      const printJob: PrintJob = {
        id: printJobId,
        kotId,
        destination: 'RECEPTION',
        printerType: 'RECEPTION',
        status: 'PENDING',
        payload: {
          kotNumber,
          tableNumber: params.tableNumber,
          destination: 'RECEPTION',
          items: receptionItems.map(k => ({ name: k.nameSnapshot, quantity: k.quantity, notes: k.notes })),
          timestamp: new Date().toISOString()
        },
        attempts: 0,
        createdAt: new Date().toISOString(),
        printedAt: null,
        error: null
      };
      createdPrintJobs.push(printJob);
      batch.set(doc(db, 'printJobs', printJobId), cleanFirestoreData(printJob));
    }

    // Safely update table bill and status (merge: true prevents NOT_FOUND error)
    batch.set(
      doc(db, 'tables', params.tableId),
      cleanFirestoreData({
        status: 'OCCUPIED',
        activeSessionId: params.sessionId,
        updatedAt: new Date().toISOString()
      }),
      { merge: true }
    );

    await batch.commit();

    return { order: newOrder, kots: createdKOTs };
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
    throw error;
  }
};

export const listenOrders = (
  onSuccess: (orders: Order[]) => void,
  onError?: (err: any) => void
) => {
  const path = 'orders';
  return onSnapshot(
    collection(db, path),
    snapshot => {
      const list: Order[] = [];
      snapshot.forEach(docSnap => list.push({ ...docSnap.data(), id: docSnap.id } as Order));
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      onSuccess(list);
    },
    error => {
      handleFirestoreError(error, OperationType.LIST, path);
      if (onError) onError(error);
    }
  );
};

export const listenKOTs = (
  onSuccess: (kots: KOTTicket[]) => void,
  onError?: (err: any) => void
) => {
  const path = 'kots';
  return onSnapshot(
    collection(db, path),
    snapshot => {
      const list: KOTTicket[] = [];
      snapshot.forEach(docSnap => list.push({ ...docSnap.data(), id: docSnap.id } as KOTTicket));
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      onSuccess(list);
    },
    error => {
      handleFirestoreError(error, OperationType.LIST, path);
      if (onError) onError(error);
    }
  );
};

// ====================================================
// 6. PAYMENTS & SETTLEMENTS
// ====================================================
export const recordPayment = async (
  payment: Omit<PaymentRecord, 'id' | 'createdAt'>
): Promise<PaymentRecord> => {
  const path = 'payments';
  try {
    const paymentId = `PAY-${Date.now().toString(36).toUpperCase()}`;
    const newRecord: PaymentRecord = {
      ...payment,
      id: paymentId,
      createdAt: new Date().toISOString()
    };

    // Save payment record
    await setDoc(doc(db, 'payments', paymentId), cleanFirestoreData(newRecord));

    // If session ID exists, update session status safely
    if (payment.sessionId) {
      try {
        await setDoc(
          doc(db, 'sessions', payment.sessionId),
          cleanFirestoreData({
            status: 'CLOSED',
            closedAt: new Date().toISOString()
          }),
          { merge: true }
        );
      } catch (err) {
        console.warn('Session status update non-fatal error:', err);
      }
    }

    return newRecord;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
    throw error;
  }
};

export const listenPayments = (
  onSuccess: (payments: PaymentRecord[]) => void,
  onError?: (err: any) => void
) => {
  const path = 'payments';
  return onSnapshot(
    collection(db, path),
    snapshot => {
      const list: PaymentRecord[] = [];
      snapshot.forEach(docSnap => list.push({ ...docSnap.data(), id: docSnap.id } as PaymentRecord));
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      onSuccess(list);
    },
    error => {
      handleFirestoreError(error, OperationType.LIST, path);
      if (onError) onError(error);
    }
  );
};

// ====================================================
// 7. INVENTORY, RECIPES & LOGS
// ====================================================
export const INITIAL_INVENTORY: InventoryItem[] = [
  {
    id: 'INV-001',
    name: 'Fresh Mozzarella Cheese',
    sku: 'SKU-MOZZ-01',
    category: 'Dairy & Cheese',
    unit: 'kg',
    currentStock: 8.5,
    minimumStock: 3.0,
    minThreshold: 3.0,
    costPerUnit: 650,
    supplier: 'Amul Dairy Distribution',
    isActive: true,
    status: 'in_stock',
    lastRestocked: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'INV-002',
    name: 'Farm-Fresh Chicken Breast',
    sku: 'SKU-CHICK-02',
    category: 'Proteins & Seafood',
    unit: 'kg',
    currentStock: 16.0,
    minimumStock: 5.0,
    minThreshold: 5.0,
    costPerUnit: 340,
    supplier: 'Himalayan Poultry Farms',
    isActive: true,
    status: 'in_stock',
    lastRestocked: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'INV-003',
    name: 'Arabica Coffee Beans (Single Origin)',
    sku: 'SKU-COFF-03',
    category: 'Beverages & Bar',
    unit: 'kg',
    currentStock: 5.0,
    minimumStock: 2.0,
    minThreshold: 2.0,
    costPerUnit: 1250,
    supplier: 'Nepal Artisanal Coffee Roasters',
    isActive: true,
    status: 'in_stock',
    lastRestocked: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'INV-004',
    name: 'Truffle Oil Extra Virgin',
    sku: 'SKU-TRUF-04',
    category: 'Gourmet Ingredients',
    unit: 'ltr',
    currentStock: 1.5,
    minimumStock: 1.0,
    minThreshold: 1.0,
    costPerUnit: 3500,
    supplier: 'Italian Gourmet Imports',
    isActive: true,
    status: 'in_stock',
    lastRestocked: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'INV-005',
    name: 'Royal Basmati Rice Extra Long',
    sku: 'SKU-RICE-05',
    category: 'Bakery & Grains',
    unit: 'kg',
    currentStock: 45.0,
    minimumStock: 15.0,
    minThreshold: 15.0,
    costPerUnit: 145,
    supplier: 'Kohinoor Grain Depot',
    isActive: true,
    status: 'in_stock',
    lastRestocked: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'INV-006',
    name: 'Dark Soya Sauce (Artisan Brew)',
    sku: 'SKU-SOYA-06',
    category: 'Sauces & Condiments',
    unit: 'ltr',
    currentStock: 6.0,
    minimumStock: 2.5,
    minThreshold: 2.5,
    costPerUnit: 290,
    supplier: 'Lee Kum Kee Wholesale',
    isActive: true,
    status: 'in_stock',
    lastRestocked: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'INV-007',
    name: 'Fresh Button Mushrooms',
    sku: 'SKU-MUSH-07',
    category: 'Fresh Produce',
    unit: 'kg',
    currentStock: 2.0,
    minimumStock: 4.0,
    minThreshold: 4.0,
    costPerUnit: 190,
    supplier: 'Valley Fresh Farms',
    isActive: true,
    status: 'low_stock',
    lastRestocked: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'INV-008',
    name: 'Heavy Whipping Cream',
    sku: 'SKU-CREAM-08',
    category: 'Dairy & Cheese',
    unit: 'ltr',
    currentStock: 0,
    minimumStock: 5.0,
    minThreshold: 5.0,
    costPerUnit: 280,
    supplier: 'Amul Dairy Distribution',
    isActive: true,
    status: 'out_of_stock',
    lastRestocked: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

export const seedInitialInventoryIfEmpty = async (): Promise<boolean> => {
  const path = 'inventory';
  try {
    const snap = await getDocs(collection(db, path));
    if (snap.empty) {
      const batch = writeBatch(db);
      INITIAL_INVENTORY.forEach(item => {
        batch.set(doc(db, path, item.id), item);
      });
      await batch.commit();
      return true;
    }
    return false;
  } catch (err) {
    console.warn("Inventory seeding deferred:", err);
    return false;
  }
};

export const listenInventory = (
  onSuccess: (items: InventoryItem[]) => void,
  onError?: (err: any) => void
) => {
  const path = 'inventory';
  return onSnapshot(
    collection(db, path),
    snapshot => {
      const list: InventoryItem[] = [];
      snapshot.forEach(docSnap => list.push({ ...docSnap.data(), id: docSnap.id } as InventoryItem));
      onSuccess(list);
    },
    error => {
      handleFirestoreError(error, OperationType.LIST, path);
      if (onError) onError(error);
    }
  );
};

export const logAuditEvent = async (
  userId: string,
  action: string,
  entityType: string,
  entityId: string,
  details: Record<string, any>
) => {
  const path = 'auditLogs';
  try {
    const auditId = `AUDIT-${Date.now().toString(36)}`;
    const log: AuditLog = {
      id: auditId,
      userId,
      action,
      entityType,
      entityId,
      details,
      createdAt: new Date().toISOString()
    };
    await setDoc(doc(db, 'auditLogs', auditId), cleanFirestoreData(log));
  } catch (error) {
    console.warn("Audit log error:", error);
  }
};

// ====================================================
// 8. SETTINGS
// ====================================================
export const listenSettings = (
  onSuccess: (settings: RestaurantSettings) => void,
  onError?: (err: any) => void
) => {
  const path = 'settings/restaurant_config';
  return onSnapshot(
    doc(db, 'settings', 'restaurant_config'),
    docSnap => {
      if (docSnap.exists()) {
        const raw = docSnap.data() as Partial<RestaurantSettings>;
        onSuccess({
          ...DEFAULT_SETTINGS,
          ...raw,
          restaurantName: raw?.restaurantName || raw?.name || DEFAULT_SETTINGS.restaurantName,
          name: raw?.name || raw?.restaurantName || DEFAULT_SETTINGS.name,
          panNumber: raw?.panNumber || raw?.panNo || DEFAULT_SETTINGS.panNumber,
          panNo: raw?.panNo || raw?.panNumber || DEFAULT_SETTINGS.panNo
        });
      } else {
        onSuccess(DEFAULT_SETTINGS);
      }
    },
    error => {
      handleFirestoreError(error, OperationType.GET, path);
      if (onError) onError(error);
    }
  );
};

// ====================================================
// 9. SERVICE REQUESTS (GUEST CALL BELL)
// ====================================================
export const listenServiceRequests = (
  onSuccess: (requests: ServiceRequest[]) => void,
  onError?: (err: any) => void
) => {
  const path = 'service_requests';
  return onSnapshot(
    collection(db, path),
    snapshot => {
      const list: ServiceRequest[] = [];
      snapshot.forEach(docSnap => {
        list.push({ ...docSnap.data(), id: docSnap.id } as ServiceRequest);
      });
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      onSuccess(list);
    },
    error => {
      handleFirestoreError(error, OperationType.LIST, path);
      if (onError) onError(error);
    }
  );
};
