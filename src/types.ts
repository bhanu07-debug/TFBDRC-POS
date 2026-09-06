export type AdminTab =
  | 'dashboard'
  | 'tables'
  | 'orders'
  | 'kot'
  | 'manual_order'
  | 'menu'
  | 'inventory'
  | 'payments'
  | 'reports'
  | 'settings';

// ==========================================
// 1. TABLES
// ==========================================
export type TableStatus =
  | 'AVAILABLE'
  | 'OCCUPIED'
  | 'BILLING'
  | 'RESERVED'
  | 'CLEANING'
  | 'available'
  | 'occupied'
  | 'billing'
  | 'reserved'
  | 'cleaning';

export type TableSection = 'Indoor AC' | 'Terrace Lounge' | 'Cafe Patio' | 'VIP Dining';

export interface Table {
  id: string; // e.g. "T01" ... "T10"
  tableNumber: number; // 1 .. 10
  name: string; // e.g. "Table T01"
  qrToken: string; // Unique QR verification token
  status: TableStatus;
  activeSessionId: string | null;
  isActive: boolean;
  capacity?: number;
  section?: TableSection | string;
  createdAt: string;
  updatedAt: string;

  // Compatibility fields for existing UI components
  number?: number;
  label?: string;
  currentSessionId?: string;
  guestCount?: number;
  totalBill?: number;
  activeOrdersCount?: number;
}

// ==========================================
// 2. CATEGORIES
// ==========================================
export interface Category {
  id: string;
  name: string;
  description: string;
  imageUrl?: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// ==========================================
// 3. MENU ITEMS
// ==========================================
export type KOTDestination = 'KITCHEN' | 'RECEPTION' | 'kitchen' | 'reception';
export type DietaryType = 'veg' | 'non-veg' | 'vegan' | 'egg';

export interface MenuItemVariant {
  id: string;
  name: string;
  price: number;
}

export interface MenuItemAddOn {
  id: string;
  name: string;
  price: number;
}

export interface CartItem {
  cartItemId: string;
  menuItem: MenuItem;
  quantity: number;
  selectedVariant?: MenuItemVariant;
  selectedAddOns: MenuItemAddOn[];
  specialInstructions?: string;
  unitPrice: number;
  totalPrice: number;
}

export type OrderItemStatus = 'pending' | 'preparing' | 'ready' | 'served' | 'cancelled';
export type OrderType = 'dine_in' | 'takeaway' | 'delivery';

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  categoryId?: string;
  price: number;
  imageUrl?: string;
  isAvailable?: boolean;
  kotDestination?: KOTDestination;
  sortOrder?: number;
  createdAt?: string;
  updatedAt?: string;

  // Compatibility fields
  code?: string;
  category?: string;
  dietary?: DietaryType;
  inStock?: boolean;
  image?: string;
  tags?: string[];
  prepTimeMinutes?: number;
  spiceLevel?: number;
  isChefSpecial?: boolean;
  isPopular?: boolean;
  variants?: MenuItemVariant[];
  addOns?: MenuItemAddOn[];
}

// ==========================================
// 4. TABLE SESSIONS
// ==========================================
export type SessionStatus = 'OPEN' | 'BILLING' | 'CLOSED';

export interface TableSession {
  id: string;
  tableId: string;
  tableNumber: number;
  status: SessionStatus;
  openedAt: string;
  closedAt: string | null;
  createdBy: string;
  totalAmount: number;
  guestCount?: number;
  notes?: string;
}

// ==========================================
// 5. ORDERS & ORDER ITEMS
// ==========================================
export type OrderSource = 'GUEST_QR' | 'ADMIN_MANUAL';
export type OrderStatus =
  | 'NEW'
  | 'CONFIRMED'
  | 'PREPARING'
  | 'READY'
  | 'SERVED'
  | 'CANCELLED'
  | 'placed'
  | 'confirmed'
  | 'preparing'
  | 'ready'
  | 'served'
  | 'completed'
  | 'cancelled';

export interface OrderItemSnapshot {
  id: string;
  orderId: string;
  menuItemId: string;
  nameSnapshot: string;
  priceSnapshot: number;
  quantity: number;
  notes?: string;
  kotDestination: KOTDestination;
  status: 'PENDING' | 'COOKING' | 'DONE' | 'CANCELLED';
  cancelled: boolean;
  cancelledBy: string | null;
  cancelledAt: string | null;
  cancellationReason: string | null;
  createdAt: string;

  // Compatibility helper fields
  name?: string;
  price?: number;
  instructions?: string;
  category?: string;
  dietary?: DietaryType;
}

export interface Order {
  id: string;
  orderNumber: string; // e.g. "ORD-1001"
  sessionId: string;
  tableId: string;
  tableNumber: number;
  source: OrderSource;
  status: OrderStatus;
  subtotal: number;
  discount: number;
  vat: number;
  total: number;
  items: OrderItemSnapshot[];
  createdAt: string;
  updatedAt: string;
  createdBy: string;

  // Compatibility fields
  guestName?: string;
  guestPhone?: string;
  paymentStatus?: 'unpaid' | 'paid' | 'partial' | 'refunded';
  paymentMethod?: 'cash' | 'card' | 'upi' | 'split';
  paidAt?: string;
  finalAmount?: number;
  taxAmount?: number;
  serviceCharge?: number;
  discountAmount?: number;
  orderType?: 'dine_in' | 'takeaway' | 'delivery';
}

// ==========================================
// 6. KOT (KITCHEN ORDER TICKET)
// ==========================================
export type KOTStatus =
  | 'PENDING'
  | 'PRINTING'
  | 'PRINTED'
  | 'PREPARING'
  | 'READY'
  | 'CANCELLED'
  | 'in_progress'
  | 'completed'
  | 'bumped'
  | 'ready'
  | 'cancelled';

export interface KOTItem {
  id: string;
  orderItemId: string;
  menuItemId: string;
  nameSnapshot: string;
  quantity: number;
  notes?: string;
  status: 'PENDING' | 'COOKING' | 'DONE';

  // Compatibility
  name?: string;
  category?: string;
  variant?: string;
  instructions?: string;
}

export interface KOTTicket {
  id: string;
  kotNumber: string; // e.g. "KOT-001"
  orderId: string;
  sessionId: string;
  tableId: string;
  tableNumber: number;
  destination: KOTDestination;
  status: KOTStatus;
  items: KOTItem[];
  createdAt: string;
  updatedAt: string;

  // Compatibility
  tableLabel?: string;
  orderNumber?: string;
  station?: string;
  notes?: string;
  waiterName?: string;
  orderSource?: OrderSource | string;
  cancellationReason?: string;
}

// ==========================================
// 7. PRINT JOBS
// ==========================================
export type PrinterType = 'KITCHEN' | 'RECEPTION';
export type PrintJobStatus = 'PENDING' | 'CLAIMED' | 'PRINTING' | 'PRINTED' | 'FAILED';

export interface PrintJob {
  id: string;
  kotId: string;
  destination: string;
  printerType: PrinterType;
  status: PrintJobStatus;
  payload: {
    kotNumber: string;
    tableNumber: number;
    destination: KOTDestination;
    items: Array<{ name: string; quantity: number; notes?: string }>;
    timestamp: string;
  };
  attempts: number;
  createdAt: string;
  printedAt: string | null;
  error: string | null;
}

// ==========================================
// 8. PAYMENTS
// ==========================================
export type PaymentMethod =
  | 'CASH'
  | 'CARD'
  | 'QR_WALLET'
  | 'ESEWA'
  | 'KHALTI'
  | 'FONEPAY'
  | 'cash'
  | 'card'
  | 'qr_wallet'
  | 'esewa'
  | 'khalti'
  | 'fonepay'
  | 'upi'
  | 'split';
export type PaymentRecordStatus = 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED';

export interface PaymentRecord {
  id: string;
  sessionId: string;
  billId: string;
  amount: number;
  method: PaymentMethod;
  status: PaymentRecordStatus;
  transactionReference: string;
  createdAt: string;
  createdBy: string;

  // Compatibility
  transactionRef?: string;
  orderId?: string;
  orderNumber?: string;
  tableNumber?: number;
  timestamp?: string;
  paidAt?: string;
  cashierName?: string;
  notes?: string;
}

// ==========================================
// 9. INVENTORY
// ==========================================
export interface InventoryItem {
  id: string;
  name: string;
  sku: string;
  unit: string; // e.g. "kg", "ltr", "pcs"
  currentStock: number;
  minimumStock: number;
  costPerUnit: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;

  // Compatibility
  category?: string;
  minThreshold?: number;
  supplier?: string;
  lastRestocked?: string;
  status?: 'in_stock' | 'low_stock' | 'out_of_stock';
}

// ==========================================
// 10. RECIPES
// ==========================================
export interface Recipe {
  id: string;
  menuItemId: string;
  ingredientId: string;
  quantity: number;
  unit: string;
  createdAt: string;
  updatedAt: string;
}

// ==========================================
// 11. INVENTORY TRANSACTIONS
// ==========================================
export type InventoryTransactionType =
  | 'PURCHASE'
  | 'SALE'
  | 'ADJUSTMENT'
  | 'WASTAGE'
  | 'RETURN';

export interface InventoryTransaction {
  id: string;
  inventoryItemId: string;
  type: InventoryTransactionType;
  quantity: number;
  referenceType: string; // e.g. "ORDER", "MANUAL_ADJUSTMENT"
  referenceId: string;
  reason: string;
  createdAt: string;
  createdBy: string;
}

// ==========================================
// 12. AUDIT LOGS
// ==========================================
export interface AuditLog {
  id: string;
  userId: string;
  action: string;
  entityType: string;
  entityId: string;
  details: Record<string, any>;
  createdAt: string;
}

// ==========================================
// 13. SETTINGS (NEPAL RESTAURANT POS)
// ==========================================
export interface RestaurantSettings {
  restaurantName: string;
  name?: string;
  panNumber: string;
  panNo?: string;
  address: string;
  phone: string;
  email: string;
  logoUrl?: string;
  tagline?: string;

  // Billing (Nepal Context)
  currency: string; // "NPR"
  currencySymbol: string; // "Rs."
  vatEnabled: boolean; // OFF by default
  vatRate: number; // 13% default
  serviceChargeEnabled: boolean; // OFF by default
  serviceChargePercent: number; // e.g. 10%
  discountEnabled: boolean; // true by default

  timezone: string; // "Asia/Kathmandu"
  wifiSsid?: string;
  wifiPassword?: string;
  autoPrintKOT?: boolean;
  soundAlerts?: boolean;
  tableCount?: number;
}

// Service request for guest call button
export interface ServiceRequest {
  id: string;
  tableNumber: number;
  type: 'call_waiter' | 'request_water' | 'request_cutlery' | 'request_bill' | 'custom';
  message?: string;
  createdAt: string;
  status: 'pending' | 'attended';
}

// Table Notification for Kitchen/Reception to Guest Table alerts (Order Ready, Cancelled, etc.)
export interface TableNotification {
  id: string;
  tableNumber: number;
  type: 'order_ready' | 'order_cancelled' | 'order_placed' | 'service_call' | 'custom';
  title: string;
  message: string;
  orderId?: string;
  kotId?: string;
  station?: 'kitchen' | 'reception' | 'all';
  createdAt: string;
  read: boolean;
}
