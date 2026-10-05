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
  LayoutGrid,
  List,
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
  const [waiterName, setWaiterName] = useState('Nischal Thapa');
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedDepartment, setSelectedDepartment] = useState<'ALL' | Department>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [dietaryFilter, setDietaryFilter] = useState<'all' | 'veg' | 'non-veg'>('all');
  const [viewMode, setViewMode] = useState<'cards' | 'list'>('cards');
  const [dishGridCols, setDishGridCols] = useState<1 | 2 | 3>(1);

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
      const matchDesc = (item.description || '').toLowerCase().includes(q);
      const matchCat = (item.category || '').toLowerCase().includes(q);
      const matchCode = (item.code || '').toLowerCase().includes(q);
      const matchSku = (item.sku || '').toLowerCase().includes(q);
      if (!matchName && !matchDesc && !matchCat && !matchCode && !matchSku) return false;
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
                <span className="break-words leading-tight">{cat}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold flex-shrink-0 ${
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
        {/* Top Filter & Search Bar */}
        <div className="p-3 sm:p-4 border-b border-gray-200 flex flex-col gap-3 bg-gray-50/60">
          {/* Big, Spacious Search Bar - Ample space, large high-contrast text */}
          <div className="relative w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-amber-500 pointer-events-none" />
            <input
              id="pos-dish-search-input"
              type="text"
              placeholder="Search dishes by full name, ingredients, category, or item code..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full h-13 sm:h-14 pl-12 pr-12 py-3 bg-white border-2 border-gray-300 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/20 rounded-xl text-base sm:text-lg font-bold text-gray-950 placeholder:text-gray-400 placeholder:font-normal transition shadow-xs focus:outline-none"
              autoComplete="off"
            />
            {/* Clear Button */}
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 hover:text-gray-950 flex items-center justify-center transition cursor-pointer"
                title="Clear search text"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Secondary Controls: Departments, Dietary Filters, Count Badge, and Grid Density Switcher */}
          <div className="flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex flex-wrap items-center gap-2">
              {/* Department Filter Toggle */}
              <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-gray-200 text-xs">
                <button
                  onClick={() => {
                    setSelectedDepartment('ALL');
                    setSelectedCategory('All');
                  }}
                  className={`px-2.5 py-1 rounded-md transition font-semibold cursor-pointer ${
                    selectedDepartment === 'ALL' ? 'bg-amber-600 text-white shadow-2xs' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  All Depts
                </button>
                <button
                  onClick={() => {
                    setSelectedDepartment('RESTAURANT');
                    setSelectedCategory('All');
                  }}
                  className={`px-2.5 py-1 rounded-md transition font-semibold flex items-center gap-1 cursor-pointer ${
                    selectedDepartment === 'RESTAURANT' ? 'bg-amber-600 text-white shadow-2xs' : 'text-gray-600 hover:text-gray-900'
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
                  className={`px-2.5 py-1 rounded-md transition font-semibold flex items-center gap-1 cursor-pointer ${
                    selectedDepartment === 'SHOP' ? 'bg-indigo-600 text-white shadow-2xs' : 'text-gray-600 hover:text-gray-900'
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
                    className={`px-2.5 py-1 rounded-md transition font-semibold cursor-pointer ${
                      dietaryFilter === 'all' ? 'bg-gray-900 text-white' : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    All
                  </button>
                  <button
                    onClick={() => setDietaryFilter('veg')}
                    className={`px-2.5 py-1 rounded-md transition font-semibold flex items-center gap-1 cursor-pointer ${
                      dietaryFilter === 'veg' ? 'bg-emerald-600 text-white' : 'text-emerald-700 hover:bg-emerald-50'
                    }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <span>Veg</span>
                  </button>
                  <button
                    onClick={() => setDietaryFilter('non-veg')}
                    className={`px-2.5 py-1 rounded-md transition font-semibold flex items-center gap-1 cursor-pointer ${
                      dietaryFilter === 'non-veg' ? 'bg-rose-600 text-white' : 'text-rose-700 hover:bg-rose-50'
                    }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                    <span>Non-Veg</span>
                  </button>
                </div>
              )}

              {/* Match Counter Badge */}
              <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-amber-100/70 text-amber-900 border border-amber-300 font-mono shadow-2xs">
                {filteredMenuItems.length} {filteredMenuItems.length === 1 ? 'dish' : 'dishes'}
              </span>
            </div>

            {/* Adjustable View Controls: 1 Col (Wide/Clear), 2 Cols, 3 Cols, List */}
            <div className="flex items-center gap-1.5">
              {/* Density / Column Selector for Cards */}
              {viewMode === 'cards' && (
                <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-gray-200 text-xs">
                  <span className="text-[11px] font-bold text-gray-400 px-1">Layout:</span>
                  <button
                    type="button"
                    onClick={() => setDishGridCols(1)}
                    className={`px-2 py-1 rounded-md transition font-bold cursor-pointer text-xs ${
                      dishGridCols === 1 ? 'bg-amber-500 text-white shadow-2xs' : 'text-gray-600 hover:bg-gray-100'
                    }`}
                    title="1 Column - Full width, largest readable text & complete descriptions"
                  >
                    Wide (1 Col)
                  </button>
                  <button
                    type="button"
                    onClick={() => setDishGridCols(2)}
                    className={`px-2 py-1 rounded-md transition font-bold cursor-pointer text-xs ${
                      dishGridCols === 2 ? 'bg-amber-500 text-white shadow-2xs' : 'text-gray-600 hover:bg-gray-100'
                    }`}
                    title="2 Columns - Balanced card view"
                  >
                    2 Cols
                  </button>
                  <button
                    type="button"
                    onClick={() => setDishGridCols(3)}
                    className={`px-2 py-1 rounded-md transition font-bold cursor-pointer text-xs ${
                      dishGridCols === 3 ? 'bg-amber-500 text-white shadow-2xs' : 'text-gray-600 hover:bg-gray-100'
                    }`}
                    title="3 Columns - Compact cards"
                  >
                    3 Cols
                  </button>
                </div>
              )}

              {/* View Mode Toggle (Cards vs List) */}
              <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-gray-200 text-xs">
                <button
                  type="button"
                  onClick={() => setViewMode('cards')}
                  className={`px-2.5 py-1 rounded-md transition font-semibold flex items-center gap-1 cursor-pointer ${
                    viewMode === 'cards' ? 'bg-amber-500 text-white shadow-xs' : 'text-gray-600 hover:text-gray-900'
                  }`}
                  title="Comfortable Cards View with Dish Images & Full Descriptions"
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Cards</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('list')}
                  className={`px-2.5 py-1 rounded-md transition font-semibold flex items-center gap-1 cursor-pointer ${
                    viewMode === 'list' ? 'bg-amber-500 text-white shadow-xs' : 'text-gray-600 hover:text-gray-900'
                  }`}
                  title="Detailed Full-Width List View"
                >
                  <List className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">List</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Menu Items Scroll Grid */}
        <div
          id="pos-dishes-grid"
          className={`flex-1 overflow-y-auto p-4 ${
            viewMode === 'cards'
              ? dishGridCols === 1
                ? 'grid grid-cols-1 gap-4'
                : dishGridCols === 2
                ? 'grid grid-cols-1 md:grid-cols-2 gap-3.5'
                : 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3'
              : 'flex flex-col gap-3'
          }`}
        >
          {filteredMenuItems.length === 0 ? (
            <div className="col-span-full py-16 text-center text-gray-400">
              <UtensilsCrossed className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm font-bold text-gray-600">No dishes match your filter</p>
              <p className="text-xs text-gray-400 mt-1">Try searching a different item or resetting the category.</p>
            </div>
          ) : (
            filteredMenuItems.map(item => {
              const inCart = punchCart.find(p => p.menuItem.id === item.id);

              return (
                <div
                  key={item.id}
                  className={`rounded-2xl border transition-all flex flex-col justify-between gap-3 shadow-xs ${
                    dishGridCols === 1 ? 'p-4 sm:p-5' : 'p-3.5 sm:p-4'
                  } ${
                    inCart
                      ? 'bg-amber-50/50 border-amber-400 ring-2 ring-amber-400/40 shadow-sm'
                      : item.inStock
                      ? 'bg-white border-gray-200 hover:border-amber-400 hover:shadow-md'
                      : 'bg-gray-50 border-gray-200 opacity-60'
                  }`}
                >
                  {/* Top Section: Photo + Full Name + Badges */}
                  <div className="flex items-start gap-3.5">
                    {/* Dish Image */}
                    <div className="relative flex-shrink-0">
                      <img
                        src={normalizeImageUrl(item.image || item.imageUrl) || DEFAULT_DISH_IMAGE}
                        alt={item.name}
                        className={`${
                          dishGridCols === 1 ? 'w-24 h-24 sm:w-28 sm:h-28' : 'w-20 h-20 sm:w-22 sm:h-22'
                        } rounded-xl object-cover bg-gray-100 border border-gray-200 shadow-2xs`}
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          e.currentTarget.src = DEFAULT_DISH_IMAGE;
                        }}
                      />
                      {/* In Ticket Quantity Pill */}
                      {inCart && (
                        <span className="absolute -top-1.5 -right-1.5 px-2 py-0.5 rounded-full bg-amber-600 text-white font-mono font-black text-xs shadow-sm ring-2 ring-white">
                          x{inCart.quantity}
                        </span>
                      )}
                    </div>

                    {/* Dish Details: Name & Badges */}
                    <div className="flex-1 min-w-0">
                      {/* Dietary & Category Badges */}
                      <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                        {item.department === 'SHOP' ? (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-indigo-100 text-indigo-800 border border-indigo-200">
                            SHOP
                          </span>
                        ) : (
                          <span
                            className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-bold border ${
                              item.dietary === 'veg'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                                : 'bg-rose-50 text-rose-700 border-rose-300'
                            }`}
                          >
                            <span
                              className={`w-2 h-2 rounded-full ${
                                item.dietary === 'veg' ? 'bg-emerald-600' : 'bg-rose-600'
                              }`}
                            />
                            <span>{item.dietary === 'veg' ? 'Pure Veg' : 'Non-Veg'}</span>
                          </span>
                        )}

                        <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-gray-100 text-gray-700 border border-gray-200">
                          {item.category}
                        </span>

                        {item.isChefSpecial && (
                          <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1">
                            <Sparkles className="w-3 h-3 text-amber-600" />
                            <span>Chef's Special</span>
                          </span>
                        )}

                        {item.variants && item.variants.length > 1 && (
                          <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-sky-100 text-sky-800 border border-sky-200">
                            {item.variants.length} Portions
                          </span>
                        )}
                      </div>

                      {/* Full Dish Name - Prominent, Bold, High Contrast, Never Truncated */}
                      <h4 className="text-base sm:text-lg font-black text-gray-950 leading-snug tracking-tight break-words">
                        {item.name}
                      </h4>

                      {/* Size or Code if available */}
                      {(item.size || item.code) && (
                        <div className="flex items-center gap-2 mt-1 text-xs text-gray-500 font-medium">
                          {item.code && <span className="font-mono font-bold bg-gray-100 px-1.5 py-0.2 rounded border border-gray-200 text-gray-700">Item #{item.code}</span>}
                          {item.size && <span>• Size: {item.size}</span>}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Full Description - High contrast, readable, with comfortable background and zero clipping */}
                  {item.description ? (
                    <div className="bg-amber-50/60 p-3 rounded-xl border border-amber-200/70 text-xs sm:text-sm text-gray-800 leading-relaxed break-words font-medium">
                      {item.description}
                    </div>
                  ) : (
                    <div className="text-xs text-gray-400 italic px-1">
                      Chef specialty prepared fresh in our {item.category} station.
                    </div>
                  )}

                  {/* Portion / Variant Options Directly on Card */}
                  {item.variants && item.variants.length > 1 && (
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Portions:</span>
                      {item.variants.map(v => (
                        <button
                          key={v.id}
                          type="button"
                          onClick={() => addVariantItemToCart(item, v)}
                          className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-50 hover:bg-amber-100 text-amber-950 border border-amber-300 transition cursor-pointer flex items-center gap-1 active:scale-95"
                          title={`Select ${v.name} portion for Rs. ${v.price}`}
                        >
                          <span className="font-bold">{v.name}</span>
                          <span className="text-gray-400">•</span>
                          <span className="font-mono font-extrabold text-amber-900">Rs.{v.price}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Bottom Row: Price & Add to Cart Controls */}
                  <div className="flex items-center justify-between pt-2.5 border-t border-gray-100 mt-auto">
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Unit Price</div>
                      <div className="text-base sm:text-lg font-black font-mono text-gray-950">
                        {settings.currencySymbol || 'Rs.'} {item.price.toLocaleString()}
                      </div>
                    </div>

                    {item.inStock ? (
                      inCart ? (
                        <div className="flex items-center gap-1.5 bg-amber-100/70 border border-amber-300 rounded-xl p-1">
                          <button
                            type="button"
                            onClick={() => updateQuantity(inCart.id, -1)}
                            className="w-8 h-8 rounded-lg bg-white hover:bg-amber-50 text-amber-950 flex items-center justify-center font-bold text-xs shadow-2xs transition cursor-pointer"
                            title="Reduce quantity"
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          <span className="w-8 text-center font-mono font-black text-sm text-amber-950">
                            {inCart.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => updateQuantity(inCart.id, 1)}
                            className="w-8 h-8 rounded-lg bg-amber-500 hover:bg-amber-600 text-white flex items-center justify-center font-bold text-xs shadow-2xs transition cursor-pointer"
                            title="Add another"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleAddItem(item)}
                          className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs sm:text-sm flex items-center gap-2 shadow-xs transition cursor-pointer active:scale-95"
                        >
                          <Plus className="w-4 h-4" />
                          <span>Add to Ticket</span>
                        </button>
                      )
                    ) : (
                      <span className="px-3 py-1.5 rounded-lg bg-rose-50 text-rose-600 border border-rose-200 text-xs font-bold">
                        Out of Stock (86)
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
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

          {/* Waiter / Captain Selector */}
          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase">Waiter / Captain</label>
            <select
              value={waiterName}
              onChange={e => setWaiterName(e.target.value)}
              className="w-full mt-0.5 px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-bold text-gray-900 focus:outline-none focus:border-amber-500"
            >
              <option value="Nischal Thapa">Nischal Thapa</option>
              <option value="Abhay Thapa">Abhay Thapa</option>
              <option value="Dilip Chaudhary">Dilip Chaudhary</option>
              <option value="Rohan Mishra">Rohan Mishra</option>
            </select>
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
                    <p className="text-xs font-bold text-gray-900 leading-snug break-words">
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
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-2.5 min-w-0">
                <img
                  src={normalizeImageUrl(variantModalItem.image || variantModalItem.imageUrl) || DEFAULT_DISH_IMAGE}
                  alt={variantModalItem.name}
                  className="w-12 h-12 rounded-lg object-cover bg-gray-100 border border-gray-200 flex-shrink-0"
                  onError={(e) => {
                    e.currentTarget.src = DEFAULT_DISH_IMAGE;
                  }}
                />
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-gray-900 leading-snug break-words">
                    {variantModalItem.name}
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">Select portion / size to punch:</p>
                </div>
              </div>
              <button
                onClick={() => setVariantModalItem(null)}
                className="p-1 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {variantModalItem.description && (
              <div className="bg-gray-50 p-2 rounded-lg border border-gray-100 text-xs text-gray-600 leading-relaxed break-words">
                {variantModalItem.description}
              </div>
            )}

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
