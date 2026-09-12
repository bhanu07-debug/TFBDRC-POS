import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
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
  Department,
  OrderType,
  PrintJob,
  PaymentRecord,
  InventoryItem,
  Recipe,
  InventoryTransaction,
  AuditLog,
  RestaurantSettings,
  ServiceRequest,
  TableNotification
} from '../types';
import { OFFICIAL_CATEGORIES, OFFICIAL_MENU_ITEMS } from '../data/restaurantMenu';

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
  restaurantName: "The Fat Buddha Delight",
  name: "The Fat Buddha Delight",
  panNumber: "302194821",
  panNo: "302194821",
  address: "Main Street, Nature View Zone, Nepal",
  phone: "+977 9800000000 / +977 9841000000",
  email: "info@fatbuddhadelight.com",
  logoUrl: "/logo.svg",
  tagline: "Good Food, Good Mood",
  currency: "NPR",
  currencySymbol: "Rs.",
  vatEnabled: false, // OFF by default
  vatRate: 13,
  serviceChargeEnabled: false, // OFF by default
  serviceChargePercent: 10,
  discountEnabled: true,
  timezone: "Asia/Kathmandu",
  wifiSsid: "Delight_Restaurant_Guest",
  wifiPassword: "Newdelight@123",
  autoPrintKOT: true,
  soundAlerts: true,
  tableCount: 10,
  adminUsername: "admin",
  adminPassword: "buddhaadmin@123",
  adminRecoveryEmail: "vanuchdry05@gmail.com"
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

    // 7. Clear table notifications
    const notifSnap = await getDocs(collection(db, 'table_notifications'));
    if (!notifSnap.empty) {
      const notifBatch = writeBatch(db);
      notifSnap.docs.forEach(d => notifBatch.delete(d.ref));
      await notifBatch.commit();
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

export const syncOfficialRestaurantMenu = async (forceReplace: boolean = false): Promise<boolean> => {
  try {
    const menuColl = collection(db, 'menu_items');
    const existingSnap = await getDocs(menuColl);
    
    // Check if empty, or contains old dummy items, or forceReplace
    const hasOldDummy = existingSnap.docs.some(d => {
      const cat = (d.data().category || '') as string;
      return cat === 'Buddha Bowls & Mains' || cat === 'Momos & Dimsums' || cat === 'Clay Oven & Tandoor' || cat === 'Artisanal Cafe & Drinks';
    });

    const hasNewItems = existingSnap.docs.some(d => d.id === 'food-sp-6' || d.id === 'food-sp-1');

    if (existingSnap.empty || hasOldDummy || !hasNewItems || forceReplace) {
      // 1. Delete all old menu items
      if (!existingSnap.empty) {
        const delBatch = writeBatch(db);
        existingSnap.docs.forEach(d => delBatch.delete(d.ref));
        await delBatch.commit();
      }

      // 2. Delete all old categories
      const catColl = collection(db, 'categories');
      const catSnap = await getDocs(catColl);
      if (!catSnap.empty) {
        const catDelBatch = writeBatch(db);
        catSnap.docs.forEach(d => catDelBatch.delete(d.ref));
        await catDelBatch.commit();
      }

      // 3. Batch insert official categories
      const catAddBatch = writeBatch(db);
      OFFICIAL_CATEGORIES.forEach(cat => {
        catAddBatch.set(doc(db, 'categories', cat.id), cleanFirestoreData(cat));
      });
      await catAddBatch.commit();

      // 4. Batch insert official menu items in chunks
      const chunkSize = 400;
      for (let i = 0; i < OFFICIAL_MENU_ITEMS.length; i += chunkSize) {
        const chunk = OFFICIAL_MENU_ITEMS.slice(i, i + chunkSize);
        const itemBatch = writeBatch(db);
        chunk.forEach(item => {
          itemBatch.set(doc(db, 'menu_items', item.id), cleanFirestoreData(item));
        });
        await itemBatch.commit();
      }

      return true;
    }
    return false;
  } catch (error) {
    console.error("Error syncing official restaurant menu:", error);
    return false;
  }
};

export const addCategoryToDb = async (name: string, description?: string, department: Department = 'RESTAURANT'): Promise<Category> => {
  const path = 'categories';
  const trimmed = name.trim();
  const slug = trimmed.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const id = `cat-${slug}-${Date.now().toString(36)}`;
  const now = new Date().toISOString();

  const newCat: Category = {
    id,
    name: trimmed,
    description: description?.trim() || `${trimmed} specialties and selections`,
    department,
    sortOrder: Date.now(),
    isActive: true,
    createdAt: now,
    updatedAt: now
  };

  try {
    await setDoc(doc(db, path, id), cleanFirestoreData(newCat));
    return newCat;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
    return newCat;
  }
};

export const updateCategoryInDb = async (
  id: string,
  newName: string,
  oldName?: string,
  description?: string,
  department?: Department
): Promise<void> => {
  const path = `categories/${id}`;
  const now = new Date().toISOString();
  const trimmedNew = newName.trim();

  try {
    await updateDoc(doc(db, 'categories', id), cleanFirestoreData({
      name: trimmedNew,
      ...(description !== undefined ? { description: description.trim() } : {}),
      ...(department !== undefined ? { department } : {}),
      updatedAt: now
    }));

    // If name changed and oldName was provided, update all menu items that used the old category name
    if (oldName && oldName !== trimmedNew) {
      const menuSnap = await getDocs(collection(db, 'menu_items'));
      const batch = writeBatch(db);
      let count = 0;
      menuSnap.forEach(d => {
        const itemData = d.data();
        if (itemData.category === oldName) {
          batch.update(d.ref, {
            category: trimmedNew,
            updatedAt: now
          });
          count++;
        }
      });
      if (count > 0) {
        await batch.commit();
      }
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
};

export const deleteCategoryFromDb = async (
  id: string,
  categoryName: string,
  fallbackCategory: string = 'Special'
): Promise<void> => {
  const path = `categories/${id}`;
  const now = new Date().toISOString();

  try {
    await deleteDoc(doc(db, 'categories', id));

    // Reassign any existing menu items with this category to fallbackCategory
    const menuSnap = await getDocs(collection(db, 'menu_items'));
    const batch = writeBatch(db);
    let count = 0;
    menuSnap.forEach(d => {
      const itemData = d.data();
      if (itemData.category === categoryName) {
        batch.update(d.ref, {
          category: fallbackCategory,
          updatedAt: now
        });
        count++;
      }
    });
    if (count > 0) {
      await batch.commit();
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
};

export const updateMenuItemKOTDestination = async (
  itemId: string,
  kotDestination: KOTDestination
): Promise<void> => {
  const path = `menu_items/${itemId}`;
  const now = new Date().toISOString();
  try {
    await updateDoc(doc(db, 'menu_items', itemId), {
      kotDestination,
      updatedAt: now
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
};

// ====================================================
// 4b. SHOP PRODUCTS & CATEGORIES
// ====================================================
export const addShopProductToDb = async (
  product: Omit<MenuItem, 'id' | 'createdAt' | 'updatedAt'>
): Promise<MenuItem> => {
  const path = 'menu_items';
  const id = `shop-prod-${Date.now().toString(36)}-${Math.floor(100 + Math.random() * 900)}`;
  const now = new Date().toISOString();

  // Strict Rule 2 & 3: New SHOP products must ALWAYS use department = SHOP and kotDestination = RECEPTION
  const newProduct: MenuItem = {
    ...product,
    id,
    department: 'SHOP',
    kotDestination: 'RECEPTION',
    isAvailable: product.isAvailable !== false,
    inStock: product.inStock !== false,
    createdAt: now,
    updatedAt: now
  };

  try {
    await setDoc(doc(db, path, id), cleanFirestoreData(newProduct));
    return newProduct;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
    return newProduct;
  }
};

export const updateShopProductInDb = async (
  id: string,
  updates: Partial<MenuItem>
): Promise<void> => {
  const path = `menu_items/${id}`;
  const now = new Date().toISOString();

  // Strict Rule 2 & 3: Ensure department is SHOP and kotDestination is RECEPTION
  const safeUpdates: Partial<MenuItem> = {
    ...updates,
    department: 'SHOP',
    kotDestination: 'RECEPTION',
    updatedAt: now
  };

  try {
    await updateDoc(doc(db, 'menu_items', id), cleanFirestoreData(safeUpdates));
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
};

export const deleteShopProductFromDb = async (id: string): Promise<void> => {
  const path = `menu_items/${id}`;
  try {
    await deleteDoc(doc(db, 'menu_items', id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
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
      department?: Department;
      sku?: string;
      size?: string;
      color?: string;
      variantId?: string;
      variantName?: string;
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
    orderType?: OrderType;
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

    // Track stock updates for shop items
    const stockUpdates: Array<{ menuItemId: string; variantId?: string; quantitySold: number }> = [];

    params.items.forEach((it, idx) => {
      const trustedMenu = menuMap.get(it.menuItemId);

      // Match selected variant/portion if present
      const matchedVariant = trustedMenu?.variants?.find(v =>
        (it.variantId && v.id === it.variantId) ||
        (it.variantName && v.name.toLowerCase().trim() === it.variantName.toLowerCase().trim())
      );

      // Determine accurate price strictly prioritizing the portion / variant
      let price: number;
      if (matchedVariant && matchedVariant.price > 0) {
        price = matchedVariant.price;
      } else if (it.price !== undefined && it.price > 0) {
        price = it.price;
      } else if (trustedMenu?.price !== undefined) {
        price = trustedMenu.price;
      } else {
        price = 0;
      }

      // Base name with any hardcoded "(60ml / Bottle)" cleanly removed
      let baseName = trustedMenu?.name || it.name || `Item ${it.menuItemId}`;
      baseName = baseName.replace(/\s*\([^)]*60ml[^)]*\)/gi, '').trim();

      const variantName = matchedVariant?.name || it.variantName;
      const variantId = matchedVariant?.id || it.variantId;
      const displayName = variantName ? `${baseName} (${variantName})` : baseName;

      // Determine department: trust stored item if present, else param, else default RESTAURANT
      const department: Department = trustedMenu?.department || it.department || 'RESTAURANT';

      // Rule: New SHOP products must ALWAYS use kotDestination = RECEPTION.
      // Rule: DO NOT change or guess kotDestination for existing products (preserve trustedMenu.kotDestination).
      let destination: KOTDestination;
      if (department === 'SHOP') {
        destination = 'RECEPTION';
      } else {
        destination = (trustedMenu?.kotDestination) || it.kotDestination || 'KITCHEN';
      }

      // Rule: kotDestination can ONLY be KITCHEN or RECEPTION. Never SHOP or STORE.
      const normalizedDest: KOTDestination =
        (destination.toUpperCase() === 'RECEPTION') ? 'RECEPTION' : 'KITCHEN';

      const category = trustedMenu?.category || '';
      const itemSubtotal = price * it.quantity;
      subtotal += itemSubtotal;

      const orderItemId = `${orderId}-it-${idx + 1}`;
      const snapshot: OrderItemSnapshot = {
        id: orderItemId,
        orderId,
        menuItemId: it.menuItemId,
        nameSnapshot: displayName,
        priceSnapshot: price,
        quantity: it.quantity,
        notes: it.notes || '',
        kotDestination: normalizedDest,
        department,
        sku: it.sku || trustedMenu?.sku,
        size: it.size || trustedMenu?.size,
        color: it.color || trustedMenu?.color,
        variantId,
        variantName,
        status: 'PENDING',
        cancelled: false,
        cancelledBy: null,
        cancelledAt: null,
        cancellationReason: null,
        createdAt: new Date().toISOString(),
        // Compatibility
        name: displayName,
        price,
        instructions: it.notes,
        category
      };

      orderItemSnapshots.push(snapshot);

      if (department === 'SHOP') {
        stockUpdates.push({
          menuItemId: it.menuItemId,
          variantId: it.variantId,
          quantitySold: it.quantity
        });
      }

      if (normalizedDest === 'RECEPTION') {
        receptionItems.push({
          orderItemId,
          menuItemId: it.menuItemId,
          nameSnapshot: displayName,
          quantity: it.quantity,
          notes: it.notes,
          category
        });
      } else {
        kitchenItems.push({
          orderItemId,
          menuItemId: it.menuItemId,
          nameSnapshot: displayName,
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

    const resolvedOrderType: OrderType = params.orderType || (params.tableNumber === 0 ? 'walk_in' : 'dine_in');

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
      orderType: resolvedOrderType
    };

    const createdKOTs: KOTTicket[] = [];
    const createdPrintJobs: PrintJob[] = [];
    const batch = writeBatch(db);

    // Write the Order
    batch.set(doc(db, 'orders', orderId), cleanFirestoreData(newOrder));

    const tableDisplayLabel = params.tableNumber === 0
      ? 'Walk-In / Retail'
      : `Table T${params.tableNumber < 10 ? '0' + params.tableNumber : params.tableNumber}`;

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
        tableLabel: tableDisplayLabel,
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
        tableLabel: tableDisplayLabel,
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

    // Deduct stock for shop items if tracked in Firestore
    for (const su of stockUpdates) {
      const itemDoc = menuMap.get(su.menuItemId);
      if (itemDoc) {
        if (su.variantId && itemDoc.variants && itemDoc.variants.length > 0) {
          const updatedVariants = itemDoc.variants.map(v => {
            if (v.id === su.variantId && typeof v.stockQuantity === 'number') {
              return { ...v, stockQuantity: Math.max(0, v.stockQuantity - su.quantitySold) };
            }
            return v;
          });
          batch.update(doc(db, 'menu_items', su.menuItemId), {
            variants: updatedVariants,
            updatedAt: new Date().toISOString()
          });
        } else if (typeof itemDoc.stockQuantity === 'number') {
          const newStock = Math.max(0, itemDoc.stockQuantity - su.quantitySold);
          batch.update(doc(db, 'menu_items', su.menuItemId), {
            stockQuantity: newStock,
            inStock: newStock > 0,
            updatedAt: new Date().toISOString()
          });
        }
      }
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
  payment: Omit<PaymentRecord, 'id' | 'createdAt'> & { createdAt?: string; timestamp?: string }
): Promise<PaymentRecord> => {
  const path = 'payments';
  try {
    const paymentId = `PAY-${Date.now().toString(36).toUpperCase()}`;
    const nowIso = new Date().toISOString();
    const effectiveTime = payment.timestamp || payment.createdAt || payment.paidAt || nowIso;
    const txRef = payment.transactionRef || payment.transactionReference || `TX-${Math.floor(100000 + Math.random() * 900000)}`;

    const newRecord: PaymentRecord = {
      ...payment,
      id: paymentId,
      transactionReference: txRef,
      transactionRef: txRef,
      createdAt: payment.createdAt || effectiveTime,
      timestamp: effectiveTime,
      paidAt: payment.paidAt || effectiveTime
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
          panNo: raw?.panNo || raw?.panNumber || DEFAULT_SETTINGS.panNo,
          adminUsername: raw?.adminUsername || DEFAULT_SETTINGS.adminUsername,
          adminPassword: raw?.adminPassword || DEFAULT_SETTINGS.adminPassword,
          adminRecoveryEmail: raw?.adminRecoveryEmail || DEFAULT_SETTINGS.adminRecoveryEmail,
          adminLastPasswordChangedAt: raw?.adminLastPasswordChangedAt,
          wifiPassword: (raw?.wifiPassword && raw.wifiPassword !== 'fatbuddhadelight' && raw.wifiPassword !== 'delightnature')
            ? raw.wifiPassword
            : 'Newdelight@123'
        });

        // Silently sync Newdelight@123 to Firestore if stale password was in db
        if (raw && (!raw.wifiPassword || raw.wifiPassword === 'fatbuddhadelight' || raw.wifiPassword === 'delightnature')) {
          updateDoc(doc(db, 'settings', 'restaurant_config'), { wifiPassword: 'Newdelight@123' }).catch(() => {});
        }
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

export const updateAdminPassword = async (newPassword: string): Promise<void> => {
  const path = 'settings/restaurant_config';
  // Persist locally immediately for offline protection
  try {
    localStorage.setItem('fb_admin_custom_password', newPassword);
  } catch (_) {}

  try {
    await updateDoc(doc(db, 'settings', 'restaurant_config'), {
      adminPassword: newPassword,
      adminLastPasswordChangedAt: new Date().toISOString()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
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

// ====================================================
// 10. TABLE NOTIFICATIONS (KITCHEN/RECEPTION TO GUEST)
// ====================================================
export const listenTableNotifications = (
  onSuccess: (notifications: TableNotification[]) => void,
  onError?: (err: any) => void
) => {
  const path = 'table_notifications';
  return onSnapshot(
    collection(db, path),
    snapshot => {
      const list: TableNotification[] = [];
      snapshot.forEach(docSnap => {
        list.push({ ...docSnap.data(), id: docSnap.id } as TableNotification);
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

export const createTableNotification = async (
  notification: Omit<TableNotification, 'id' | 'createdAt' | 'read'>
): Promise<TableNotification> => {
  const path = 'table_notifications';
  const id = `NOTIF-${Date.now().toString(36).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;
  const notif: TableNotification = {
    ...notification,
    id,
    createdAt: new Date().toISOString(),
    read: false
  };
  try {
    await setDoc(doc(db, path, id), cleanFirestoreData(notif));
    return notif;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
    return notif;
  }
};

export const markTableNotificationAsRead = async (id: string) => {
  const path = `table_notifications/${id}`;
  try {
    await updateDoc(doc(db, 'table_notifications', id), { read: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
};

