import React, { useState, useMemo } from 'react';
import { usePOS } from '../../context/POSContext';
import { MenuItem, MenuItemVariant, MenuItemAddOn, OrderType, Table, Department } from '../../types';
import { normalizeImageUrl, DEFAULT_DISH_IMAGE } from '../../utils/imageUtils';
import { CATEGORY_NAMES } from '../../data/restaurantMenu';
import {
  Search,
  Plus,
  Minus,
  Trash2,
  Send,
  UtensilsCrossed,
  Sparkles,
  User,
  Phone,
  Percent,
  CheckCircle2,
  RotateCcw,
  Flame,
  Leaf,
  Coffee,
  ChefHat,
  ShoppingBag,
  X
} from 'lucide-react';

interface ManualPOSViewProps {
  initialTableNumber?: number;
  onOrderCreated: (orderId: string) => void;
}

export const ManualPOSView: React.FC<ManualPOSViewProps> = ({
  initialTableNumber,
  onOrderCreated
}) => {
  const {
    tables,
    menuItems,
    categories: firestoreCategories,
    createManualOrder,
    settings
  } = usePOS();

  // Order Header States
  const [selectedTableNumber, setSelectedTableNumber] = useState<number>(initialTableNumber || 1);
  const [orderType, setOrderType] = useState<OrderType>('dine_in');
  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [waiterName, setWaiterName] = useState('Rohit S. (Captain)');
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedDepartment, setSelectedDepartment] = useState<'ALL' | Department>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [dietaryFilter, setDietaryFilter] = useState<'all' | 'veg' | 'non-veg'>('all');

  // Punch Cart
  interface PunchItem {
    id: string;
    menuItem: MenuItem;
    quantity: number;
    selectedVariant?: MenuItemVariant;
    selectedAddOns?: MenuItemAddOn[];
    instructions?: string;
    unitPrice: number;
    totalPrice: number;
  }

  const [punchCart, setPunchCart] = useState<PunchItem[]>([]);
  const [editingNoteItemId, setEditingNoteItemId] = useState<string | null>(null);
  const [tempNote, setTempNote] = useState('');
  const [variantModalItem, setVariantModalItem] = useState<MenuItem | null>(null);

  const categories = useMemo(() => {
    const set = new Set<string>();
    (firestoreCategories || []).forEach(c => {
      if (c.name && c.name.trim() && c.isActive !== false) {
        if (selectedDepartment === 'ALL' || (c.department || 'RESTAURANT') === selectedDepartment) {
          set.add(c.name.trim());
        }
      }
    });
    if (selectedDepartment === 'ALL' || selectedDepartment === 'RESTAURANT') {
      (CATEGORY_NAMES || []).forEach(c => set.add(c));
    }
    (menuItems || []).forEach(item => {
      const itemDept = item.department || 'RESTAURANT';
      if (selectedDepartment === 'ALL' || itemDept === selectedDepartment) {
        if (item && item.category && item.category.trim()) set.add(item.category.trim());
      }
    });
    return ['All', ...Array.from(set)];
  }, [firestoreCategories, menuItems, selectedDepartment]);

  const filteredMenuItems = menuItems.filter(item => {
    const itemDept = item.department || 'RESTAURANT';
    if (selectedDepartment !== 'ALL' && itemDept !== selectedDepartment) return false;
    if (selectedCategory !== 'All' && item.category !== selectedCategory) return false;
    if (itemDept === 'RESTAURANT') {
      if (dietaryFilter === 'veg' && item.dietary !== 'veg') return false;
      if (dietaryFilter === 'non-veg' && item.dietary !== 'non-veg') return false;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = item.name.toLowerCase().includes(q);
      const matchCode = (item.code || '').toLowerCase().includes(q);
      const matchSku = (item.sku || '').toLowerCase().includes(q);
      if (!matchName && !matchCode && !matchSku) return false;
    }
    return true;
  });

  const addVariantItemToCart = (item: MenuItem, variant?: MenuItemVariant) => {
    const selectedVariant = variant || (item.variants && item.variants.length > 0 ? item.variants[0] : undefined);
    const unitPrice = selectedVariant ? selectedVariant.price : item.price;
    const cartItemId = `${item.id}-${selectedVariant?.id || 'std'}`;

    setPunchCart(prev => {
      const existing = prev.find(p => p.id === cartItemId);
      if (existing) {
        return prev.map(p =>
          p.id === cartItemId
            ? { ...p, quantity: p.quantity + 1, totalPrice: (p.quantity + 1) * p.unitPrice }
            : p
        );
      }
      return [
        ...prev,
        {
          id: cartItemId,
          menuItem: item,
          quantity: 1,
          selectedVariant,
          selectedAddOns: [],
          unitPrice,
          totalPrice: unitPrice
        }
      ];
    });
    setVariantModalItem(null);
  };

  const handleAddItem = (item: MenuItem) => {
    if (!item.inStock) return;
    if (item.variants && item.variants.length > 1) {
      setVariantModalItem(item);
    } else {
      addVariantItemToCart(item, item.variants?.[0]);
    }
  };

  const updateItemVariant = (cartId: string, variantId: string) => {
    setPunchCart(prev =>
      prev.map(p => {
        if (p.id !== cartId) return p;
        const newVar = p.menuItem.variants?.find(v => v.id === variantId);
        if (!newVar) return p;
        const newUnitPrice = newVar.price;
        const newCartId = `${p.menuItem.id}-${newVar.id}`;
        return {
          ...p,
          id: newCartId,
          selectedVariant: newVar,
          unitPrice: newUnitPrice,
          totalPrice: p.quantity * newUnitPrice
        };
      })
    );
  };

  const updateQuantity = (id: string, delta: number) => {
    setPunchCart(prev =>
      prev
        .map(p => {
          if (p.id === id) {
            const nQty = p.quantity + delta;
            if (nQty <= 0) return null;
            return { ...p, quantity: nQty, totalPrice: nQty * p.unitPrice };
          }
          return p;
        })
        .filter(Boolean) as PunchItem[]
    );
  };

  const removeItem = (id: string) => {
    setPunchCart(prev => prev.filter(p => p.id !== id));
  };

  const clearPunchCart = () => {
    setPunchCart([]);
    setGuestName('');
    setGuestPhone('');
    setDiscountPercent(0);
  };

  // Calculations
  const subtotal = punchCart.reduce((sum, it) => sum + it.totalPrice, 0);
  const discountAmount = settings.discountEnabled ? Math.round((subtotal * discountPercent) / 100) : 0;
  const taxableAmount = Math.max(0, subtotal - discountAmount);
  const serviceCharge = settings.serviceChargeEnabled
    ? Math.round((taxableAmount * (settings.serviceChargePercent || 10)) / 100)
    : 0;
  const taxAmount = settings.vatEnabled
    ? Math.round(((taxableAmount + serviceCharge) * (settings.vatRate || 13)) / 100)
    : 0;
  const grandTotal = taxableAmount + serviceCharge + taxAmount;

  const handlePlaceOrder = async () => {
    if (punchCart.length === 0) {
      alert('Please add at least one item to the cart.');
      return;
    }

    const createdOrder = await createManualOrder(
      selectedTableNumber,
      punchCart.map(item => ({
        menuItem: item.menuItem,
        quantity: item.quantity,
        selectedVariant: item.selectedVariant,
        selectedAddOns: item.selectedAddOns,
        instructions: item.instructions
      })),
      orderType,
      guestName.trim() || undefined,
      guestPhone.trim() || undefined,
      discountAmount,
      discountPercent > 0 ? `${discountPercent}% Staff Discount` : undefined,
      waiterName,
      undefined
    );

    clearPunchCart();
    onOrderCreated(createdOrder.id);
  };

  return (
    <div className="h-[calc(100vh-6.5rem)] flex flex-col lg:flex-row gap-4 overflow-hidden">
      {/* LEFT COLUMN: Categories Sidebar */}
      <div className="hidden lg:flex w-52 bg-white rounded-xl border border-gray-200 shadow-xs flex-col p-3 overflow-y-auto flex-shrink-0">
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider px-2 py-1">
          Categories
        </h3>
        <div className="space-y-1 mt-1">
          {categories.map(cat => {
            const count = cat === 'All' ? menuItems.length : menuItems.filter(m => m.category === cat).length;
            const isSelected = selectedCategory === cat;

            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-semibold transition text-left ${
                  isSelected
                    ? 'bg-amber-500 text-white font-bold shadow-xs'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <span className="truncate">{cat}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                    isSelected ? 'bg-white/25 text-white' : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* CENTER COLUMN: Search & Menu Items Grid */}
      <div className="flex-1 flex flex-col bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
        {/* Top Filter Bar */}
        <div className="p-3.5 border-b border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-3 bg-gray-50/50">
          {/* Search Bar */}
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search dish or item code..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Department Filter Toggle */}
          <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-gray-200 text-xs">
            <button
              onClick={() => {
                setSelectedDepartment('ALL');
                setSelectedCategory('All');
              }}
              className={`px-2.5 py-1 rounded-md transition font-semibold ${
                selectedDepartment === 'ALL' ? 'bg-amber-600 text-white' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              All Depts
            </button>
            <button
              onClick={() => {
                setSelectedDepartment('RESTAURANT');
                setSelectedCategory('All');
              }}
              className={`px-2.5 py-1 rounded-md transition font-semibold flex items-center gap-1 ${
                selectedDepartment === 'RESTAURANT' ? 'bg-amber-600 text-white' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <UtensilsCrossed className="w-3.5 h-3.5" />
              Restaurant
            </button>
            <button
              onClick={() => {
                setSelectedDepartment('SHOP');
                setSelectedCategory('All');
              }}
              className={`px-2.5 py-1 rounded-md transition font-semibold flex items-center gap-1 ${
                selectedDepartment === 'SHOP' ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              Shop
            </button>
          </div>

          {/* Dietary Filter (Only for Restaurant) */}
          {selectedDepartment !== 'SHOP' && (
            <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-gray-200 text-xs">
              <button
                onClick={() => setDietaryFilter('all')}
                className={`px-2.5 py-1 rounded-md transition font-semibold ${
                  dietaryFilter === 'all' ? 'bg-gray-900 text-white' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setDietaryFilter('veg')}
                className={`px-2.5 py-1 rounded-md transition font-semibold flex items-center gap-1 ${
                  dietaryFilter === 'veg' ? 'bg-emerald-600 text-white' : 'text-emerald-700 hover:bg-emerald-50'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span>Veg</span>
              </button>
              <button
                onClick={() => setDietaryFilter('non-veg')}
                className={`px-2.5 py-1 rounded-md transition font-semibold flex items-center gap-1 ${
                  dietaryFilter === 'non-veg' ? 'bg-rose-600 text-white' : 'text-rose-700 hover:bg-rose-50'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                <span>Non-Veg</span>
              </button>
            </div>
          )}
        </div>

        {/* Menu Items Scroll Grid */}
        <div className="flex-1 overflow-y-auto p-4 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {filteredMenuItems.map(item => {
            const inCart = punchCart.find(p => p.menuItem.id === item.id);

            return (
              <div
                key={item.id}
                onClick={() => handleAddItem(item)}
                className={`bg-white rounded-xl border p-3 flex items-center justify-between gap-3 cursor-pointer transition hover:shadow-xs ${
                  item.inStock ? 'hover:border-amber-400 border-gray-200' : 'opacity-50 border-gray-200 bg-gray-50 cursor-not-allowed'
                }`}
              >
                <img
                  src={normalizeImageUrl(item.image) || DEFAULT_DISH_IMAGE}
                  alt={item.name}
                  className="w-16 h-16 rounded-lg object-cover flex-shrink-0 bg-gray-100 border border-gray-200"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    e.currentTarget.src = DEFAULT_DISH_IMAGE;
                  }}
                />

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    {item.department === 'SHOP' ? (
                      <span className="w-2 h-2 rounded-full bg-indigo-500 flex-shrink-0" />
                    ) : (
                      <span
                        className={`w-2 h-2 rounded-full flex-shrink-0 ${
                          item.dietary === 'veg' ? 'bg-emerald-500' : 'bg-rose-500'
                        }`}
                      />
                    )}
                    <h4 className="text-xs font-bold text-gray-900 truncate">
                      {item.name}
                    </h4>
                  </div>
                  <div className="flex items-center gap-1 mt-0.5">
                    <p className="text-[11px] text-gray-400 truncate">
                      {item.category}
                    </p>
                    {item.department === 'SHOP' && (
                      <span className="text-[9px] font-bold px-1 py-0.2 rounded bg-indigo-100 text-indigo-800">
                        SHOP
                      </span>
                    )}
                    {item.size && (
                      <span className="text-[9px] font-bold px-1 py-0.2 rounded bg-gray-100 text-gray-700">
                        {item.size}
                      </span>
                    )}
                  </div>
                  <div className="mt-1 flex items-center justify-between">
                    <span className="text-xs font-bold font-mono text-gray-900">
                      Rs. {item.price.toLocaleString()}
                    </span>
                    {item.inStock ? (
                      <span className="w-6 h-6 rounded-md bg-amber-50 text-amber-700 border border-amber-200 flex items-center justify-center font-bold text-xs hover:bg-amber-500 hover:text-white transition">
                        +
                      </span>
                    ) : (
                      <span className="text-[10px] text-rose-500 font-bold">86 (Out)</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* RIGHT COLUMN: Active Order Cart & Punching */}
      <div className="w-full lg:w-96 bg-white rounded-xl border border-gray-200 shadow-xs flex flex-col overflow-hidden flex-shrink-0">
        {/* Cart Header */}
        <div className="p-3.5 border-b border-gray-200 space-y-3 bg-gray-50/50">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-gray-900 flex items-center gap-1.5">
              <UtensilsCrossed className="w-4 h-4 text-amber-500" />
              <span>Active POS Ticket</span>
            </h3>
            <button
              onClick={clearPunchCart}
              className="text-xs text-gray-400 hover:text-rose-500 transition"
              title="Clear Ticket"
            >
              Clear
            </button>
          </div>

          {/* Table Selector & Type Toggle */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase">Table</label>
              <select
                value={selectedTableNumber}
                onChange={e => setSelectedTableNumber(Number(e.target.value))}
                className="w-full mt-0.5 px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-bold text-gray-900 focus:outline-none focus:border-amber-500"
              >
                {tables.map(t => {
                  const num = t.tableNumber || t.number || 1;
                  const isOcc = (t.status || '').toUpperCase() === 'OCCUPIED' && Boolean((t.totalBill && t.totalBill > 0) || (t.activeOrdersCount && t.activeOrdersCount > 0));
                  return (
                    <option key={t.id} value={num}>
                      Table {num < 10 ? `0${num}` : num} ({isOcc ? `Occupied - Rs. ${t.totalBill}` : 'Available'})
                    </option>
                  );
                })}
              </select>
            </div>

            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase">Type</label>
              <select
                value={orderType}
                onChange={e => setOrderType(e.target.value as any)}
                className="w-full mt-0.5 px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-bold text-gray-900 focus:outline-none focus:border-amber-500"
              >
                <option value="dine_in">Dine-In</option>
                <option value="takeaway">Takeaway</option>
                <option value="delivery">Delivery</option>
              </select>
            </div>
          </div>
        </div>

        {/* Cart Items List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2 divide-y divide-gray-100">
          {punchCart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-gray-400">
              <UtensilsCrossed className="w-8 h-8 mb-2 opacity-30" />
              <p className="text-xs font-bold text-gray-600">Cart is Empty</p>
              <p className="text-[11px]">Select items from menu to punch order.</p>
            </div>
          ) : (
            punchCart.map(item => (
              <div key={item.id} className="pt-2 first:pt-0 space-y-1.5">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0 pr-2">
                    <p className="text-xs font-bold text-gray-900 truncate">
                      {item.menuItem.name}
                    </p>
                    {item.menuItem.variants && item.menuItem.variants.length > 1 ? (
                      <div className="mt-1">
                        <select
                          value={item.selectedVariant?.id || ''}
                          onChange={(e) => updateItemVariant(item.id, e.target.value)}
                          className="text-[11px] font-semibold bg-amber-50 text-amber-900 border border-amber-300 rounded px-1.5 py-0.5"
                        >
                          {item.menuItem.variants.map(v => (
                            <option key={v.id} value={v.id}>
                              {v.name} • Rs. {v.price}
                            </option>
                          ))}
                        </select>
                      </div>
                    ) : item.selectedVariant ? (
                      <span className="inline-block mt-0.5 px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-200">
                        {item.selectedVariant.name}
                      </span>
                    ) : null}
                    <p className="text-[11px] text-gray-500 font-mono mt-0.5">
                      Rs. {item.unitPrice} each
                    </p>
                    {item.instructions && (
                      <p className="text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded-sm inline-block mt-0.5">
                        Note: {item.instructions}
                      </p>
                    )}
                  </div>

                  <span className="text-xs font-bold font-mono text-gray-900">
                    Rs. {item.totalPrice.toLocaleString()}
                  </span>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <button
                    onClick={() => {
                      const note = prompt('Special cooking instruction:', item.instructions || '');
                      if (note !== null) {
                        setPunchCart(prev =>
                          prev.map(p => (p.id === item.id ? { ...p, instructions: note } : p))
                        );
                      }
                    }}
                    className="text-[10px] text-gray-400 hover:text-amber-600 underline font-medium"
                  >
                    + Note
                  </button>

                  <div className="flex items-center gap-1.5 bg-gray-50 px-1.5 py-0.5 rounded-lg border border-gray-200">
                    <button
                      onClick={() => updateQuantity(item.id, -1)}
                      className="w-5 h-5 rounded-md hover:bg-gray-200 flex items-center justify-center text-gray-600 text-xs"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="w-5 text-center font-mono font-bold text-xs text-gray-900">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateQuantity(item.id, 1)}
                      className="w-5 h-5 rounded-md hover:bg-gray-200 flex items-center justify-center text-gray-600 text-xs"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Cart Totals & Place Order Button */}
        <div className="p-3.5 border-t border-gray-200 bg-gray-50 space-y-2 text-xs">
          <div className="flex items-center justify-between text-gray-600">
            <span>Subtotal</span>
            <span className="font-mono font-semibold">{settings.currencySymbol || 'Rs.'} {subtotal.toLocaleString()}</span>
          </div>

          {/* Discount Field (if enabled) */}
          {settings.discountEnabled && (
            <div className="flex items-center justify-between text-gray-600">
              <span>Discount (%)</span>
              <input
                type="number"
                min="0"
                max="100"
                value={discountPercent || ''}
                placeholder="0"
                onChange={e => setDiscountPercent(Math.min(100, Math.max(0, Number(e.target.value))))}
                className="w-16 px-1.5 py-0.5 bg-white border border-gray-200 rounded-md text-right font-mono text-xs focus:outline-none focus:border-amber-500"
              />
            </div>
          )}

          {settings.serviceChargeEnabled && (
            <div className="flex items-center justify-between text-gray-600">
              <span>Service Charge ({settings.serviceChargePercent || 10}%)</span>
              <span className="font-mono font-semibold">{settings.currencySymbol || 'Rs.'} {serviceCharge.toLocaleString()}</span>
            </div>
          )}

          {settings.vatEnabled && (
            <div className="flex items-center justify-between text-gray-600">
              <span>VAT ({settings.vatRate || 13}%)</span>
              <span className="font-mono font-semibold">{settings.currencySymbol || 'Rs.'} {taxAmount.toLocaleString()}</span>
            </div>
          )}

          <div className="pt-2 border-t border-gray-200 flex items-center justify-between font-bold text-sm text-gray-900">
            <span>Grand Total</span>
            <span className="font-mono text-base text-amber-600">
              {settings.currencySymbol || 'Rs.'} {grandTotal.toLocaleString()}.00
            </span>
          </div>

          <button
            onClick={handlePlaceOrder}
            disabled={punchCart.length === 0}
            className={`w-full py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition shadow-xs ${
              punchCart.length > 0
                ? 'bg-amber-500 hover:bg-amber-600 text-white'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            <Send className="w-4 h-4" />
            <span>Place Order & Dispatch KOT</span>
          </button>
        </div>
      </div>

      {/* Portion / Variant Picker Modal */}
      {variantModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white border border-gray-200 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl p-5 space-y-4 animate-in fade-in">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-sm font-bold text-gray-900">{variantModalItem.name}</h3>
                <p className="text-xs text-gray-500">Select portion / bottle size:</p>
              </div>
              <button
                onClick={() => setVariantModalItem(null)}
                className="p-1 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2">
              {variantModalItem.variants?.map(v => (
                <button
                  key={v.id}
                  onClick={() => addVariantItemToCart(variantModalItem, v)}
                  className="w-full p-3 rounded-xl border border-gray-200 hover:border-amber-500 hover:bg-amber-50/50 flex items-center justify-between text-left transition group"
                >
                  <span className="text-xs font-bold text-gray-800 group-hover:text-amber-800">{v.name}</span>
                  <span className="text-xs font-mono font-black text-amber-600">
                    {settings.currencySymbol || 'Rs.'} {v.price.toLocaleString()}
                  </span>
                </button>
              ))}
            </div>

            <button
              onClick={() => setVariantModalItem(null)}
              className="w-full py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl transition"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
