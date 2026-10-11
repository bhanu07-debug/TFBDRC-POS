import React, { useState, useMemo, useEffect } from 'react';
import { usePOS } from '../../context/POSContext';
import { MenuItem, MenuItemVariant, Order } from '../../types';
import {
  Smartphone,
  Search,
  Plus,
  Minus,
  Trash2,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Send,
  ChefHat,
  Coffee,
  RotateCcw,
  User,
  ShoppingBag,
  Sparkles,
  ArrowRight,
  ShieldAlert,
  ChevronDown,
  Layers,
  UtensilsCrossed,
  Info,
  LogOut
} from 'lucide-react';

interface CartLineItem {
  cartId: string;
  menuItem: MenuItem;
  selectedVariant?: MenuItemVariant;
  quantity: number;
  notes: string;
}

export const WaiterOrderView: React.FC = () => {
  const {
    tables,
    menuItems,
    categories,
    orders,
    settings,
    submitWaiterOrder,
    setActiveInterface,
    currentStaffSession,
    logoutStaffMember
  } = usePOS();

  // Active sub-tab in waiter mode: 'order' or 'live'
  const [activeTab, setActiveTab] = useState<'order' | 'live'>('order');

  // Waiter Identity (persisted in localStorage or from logged in staff session)
  const [waiterName, setWaiterName] = useState(() => {
    if (currentStaffSession?.name) return currentStaffSession.name;
    return localStorage.getItem('fb_waiter_name') || 'Floor Waiter';
  });
  const [isEditingWaiter, setIsEditingWaiter] = useState(false);

  useEffect(() => {
    if (currentStaffSession?.name) {
      setWaiterName(currentStaffSession.name);
    }
  }, [currentStaffSession]);

  // Selected Table (strictly 1 to 11)
  const [selectedTableNumber, setSelectedTableNumber] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const p = new URLSearchParams(window.location.search).get('table');
      if (p) {
        const val = parseInt(p, 10);
        if (!isNaN(val) && val >= 1 && val <= 11) return val;
      }
    }
    return 1;
  });

  // Menu Search & Category Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [dietaryFilter, setDietaryFilter] = useState<'all' | 'veg' | 'non-veg'>('all');

  // Waiter Cart State
  const [waiterCart, setWaiterCart] = useState<CartLineItem[]>([]);
  const [orderNotes, setOrderNotes] = useState('');
  const [isCartModalOpen, setIsCartModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccessNotice, setSubmitSuccessNotice] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Expanded notes field per item in menu
  const [itemNoteInput, setItemNoteInput] = useState<{ [itemId: string]: string }>({});
  const [selectedVariants, setSelectedVariants] = useState<{ [itemId: string]: MenuItemVariant }>({});

  // Persist waiter name
  const handleSaveWaiterName = (name: string) => {
    const trimmed = name.trim() || 'Waiter Staff';
    setWaiterName(trimmed);
    localStorage.setItem('fb_waiter_name', trimmed);
    setIsEditingWaiter(false);
  };

  // Tables available in the restaurant (Tables 1 through 11)
  const validTables = useMemo(() => {
    const maxTables = Math.max(settings.tableCount || 11, 11);
    const list = tables.filter(t => {
      const num = t.tableNumber || t.number;
      return num >= 1 && num <= maxTables;
    });
    list.sort((a, b) => (a.tableNumber || a.number) - (b.tableNumber || b.number));
    return list;
  }, [tables, settings.tableCount]);

  // Available Menu Items for ordering (only active/inStock items)
  const filteredMenuItems = useMemo(() => {
    return menuItems.filter(item => {
      // Must not be explicitly inactive
      if (item.isAvailable === false || item.inStock === false) return false;

      // Category filter
      if (selectedCategory !== 'All') {
        const cat = item.category || '';
        const catId = item.categoryId || '';
        if (cat !== selectedCategory && catId !== selectedCategory) {
          return false;
        }
      }

      // Dietary filter
      if (dietaryFilter !== 'all') {
        const diet = (item.dietary || '').toLowerCase();
        if (dietaryFilter === 'veg' && diet !== 'veg' && diet !== 'vegetarian' && diet !== 'vegan') {
          return false;
        }
        if (dietaryFilter === 'non-veg' && (diet === 'veg' || diet === 'vegetarian' || diet === 'vegan')) {
          return false;
        }
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = item.name.toLowerCase().includes(q);
        const matchDesc = (item.description || '').toLowerCase().includes(q);
        const matchCode = (item.code || item.sku || '').toLowerCase().includes(q);
        if (!matchName && !matchDesc && !matchCode) return false;
      }

      return true;
    });
  }, [menuItems, selectedCategory, dietaryFilter, searchQuery]);

  // Cart Management
  const addToWaiterCart = (item: MenuItem, variant?: MenuItemVariant, notes?: string) => {
    const effectiveVariant = variant || selectedVariants[item.id] || (item.variants && item.variants.length > 0 ? item.variants[0] : undefined);
    const cartId = `${item.id}-${effectiveVariant?.id || 'standard'}`;

    setWaiterCart(prev => {
      const existing = prev.find(p => p.cartId === cartId);
      if (existing) {
        return prev.map(p => p.cartId === cartId ? { ...p, quantity: p.quantity + 1, notes: notes || p.notes } : p);
      }
      return [
        ...prev,
        {
          cartId,
          menuItem: item,
          selectedVariant: effectiveVariant,
          quantity: 1,
          notes: notes || itemNoteInput[item.id] || ''
        }
      ];
    });

    // Reset item note input after adding
    if (itemNoteInput[item.id]) {
      setItemNoteInput(prev => ({ ...prev, [item.id]: '' }));
    }
  };

  const updateWaiterCartQuantity = (cartId: string, delta: number) => {
    setWaiterCart(prev => {
      return prev
        .map(item => {
          if (item.cartId === cartId) {
            const nextQty = item.quantity + delta;
            return nextQty > 0 ? { ...item, quantity: nextQty } : null;
          }
          return item;
        })
        .filter((i): i is CartLineItem => i !== null);
    });
  };

  const removeFromWaiterCart = (cartId: string) => {
    setWaiterCart(prev => prev.filter(i => i.cartId !== cartId));
  };

  // Cart Totals Calculation (strictly based on menu price)
  const cartSubtotal = useMemo(() => {
    return waiterCart.reduce((sum, item) => {
      const price = item.selectedVariant && item.selectedVariant.price > 0
        ? item.selectedVariant.price
        : item.menuItem.price;
      return sum + price * item.quantity;
    }, 0);
  }, [waiterCart]);

  const serviceChargeAmount = useMemo(() => {
    if (!settings.serviceChargeEnabled) return 0;
    return Math.round((cartSubtotal * (settings.serviceChargePercent ?? 10)) / 100);
  }, [cartSubtotal, settings.serviceChargeEnabled, settings.serviceChargePercent]);

  const vatAmount = useMemo(() => {
    if (!settings.vatEnabled) return 0;
    return Math.round(((cartSubtotal + serviceChargeAmount) * (settings.vatRate ?? 13)) / 100);
  }, [cartSubtotal, serviceChargeAmount, settings.vatEnabled, settings.vatRate]);

  const cartTotalAmount = cartSubtotal + serviceChargeAmount + vatAmount;
  const cartItemCount = waiterCart.reduce((sum, i) => sum + i.quantity, 0);

  // Submit Order to Cashier
  const handleSubmitOrderToCashier = async () => {
    if (waiterCart.length === 0) return;
    if (isSubmitting) return;

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const order = await submitWaiterOrder({
        tableNumber: selectedTableNumber,
        waiterName: waiterName || 'Waiter',
        items: waiterCart.map(c => ({
          menuItem: c.menuItem,
          quantity: c.quantity,
          selectedVariant: c.selectedVariant,
          notes: c.notes
        })),
        notes: orderNotes.trim() || undefined
      });

      // Clear cart
      setWaiterCart([]);
      setOrderNotes('');
      setIsCartModalOpen(false);

      // Show success toast and switch to Live Orders tab
      setSubmitSuccessNotice(`Order ${order.orderNumber} sent to Cashier for Table T${selectedTableNumber < 10 ? '0' + selectedTableNumber : selectedTableNumber}!`);
      setActiveTab('live');

      setTimeout(() => {
        setSubmitSuccessNotice(null);
      }, 5000);
    } catch (err: any) {
      console.error('Error submitting waiter order:', err);
      setSubmitError(err?.message || 'Failed to submit order to cashier. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Re-order a rejected order by populating current cart with its items
  const handleReorder = (order: Order) => {
    const newCart: CartLineItem[] = [];
    (order.items || []).forEach(it => {
      const menuItem = menuItems.find(m => m.id === it.menuItemId) || {
        id: it.menuItemId,
        name: it.nameSnapshot || it.name || 'Dish',
        price: it.priceSnapshot || it.price || 0,
        description: ''
      };

      const variant = it.variantId
        ? menuItem.variants?.find(v => v.id === it.variantId)
        : undefined;

      newCart.push({
        cartId: `${it.menuItemId}-${it.variantId || 'standard'}-${Date.now()}-${Math.random()}`,
        menuItem,
        selectedVariant: variant,
        quantity: it.quantity || 1,
        notes: it.notes || ''
      });
    });

    setWaiterCart(newCart);
    setSelectedTableNumber(order.tableNumber || 1);
    setOrderNotes(order.notes ? `Revised: ${order.notes}` : '');
    setActiveTab('order');
    setIsCartModalOpen(true);
  };

  // Waiter's Active Orders for Live Tracking
  const liveWaiterOrders = useMemo(() => {
    return orders
      .filter(o => {
        // Show today's orders for either this waiter or this table, or with WAITER_MOBILE source
        const isToday = Boolean(o.createdAt);
        const matchesWaiter = (o.waiterName || o.createdBy || '').toLowerCase().includes(waiterName.toLowerCase());
        const isWaiterSource = o.source === 'WAITER_MOBILE';
        const isTableMatch = o.tableNumber === selectedTableNumber;
        return (matchesWaiter || isWaiterSource || isTableMatch) && isToday;
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [orders, waiterName, selectedTableNumber]);

  // Counts of pending cashier orders
  const pendingCashierCount = useMemo(() => {
    return liveWaiterOrders.filter(o => (o.status || '').toUpperCase() === 'PENDING_CASHIER' || (o.status as any) === 'pending_cashier').length;
  }, [liveWaiterOrders]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans pb-28 select-none">
      {/* 1. TOP HEADER & WAITER PROFILE */}
      <header className="sticky top-0 z-30 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 px-4 py-3 shadow-lg">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
          {/* Brand & Table */}
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
                  The Fat Buddha POS
                </span>
                <span className="text-[10px] bg-amber-500/20 text-amber-300 font-bold px-1.5 py-0.2 rounded border border-amber-500/30">
                  Waiter
                </span>
              </div>
              <h1 className="text-sm font-bold text-white flex items-center gap-1.5">
                <span>Table T{selectedTableNumber < 10 ? `0${selectedTableNumber}` : selectedTableNumber}</span>
                <span className="text-slate-500 text-xs font-normal">|</span>
                <button
                  onClick={() => setIsEditingWaiter(true)}
                  className="text-xs text-slate-300 hover:text-amber-300 font-medium underline decoration-dotted flex items-center gap-1"
                  title="Click to change waiter name"
                >
                  <User className="w-3 h-3 text-amber-400" />
                  <span>{waiterName}</span>
                </button>
              </h1>
            </div>
          </div>

          {/* Quick Exit / Waiter Logout */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => logoutStaffMember()}
              className="px-2.5 py-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 text-xs font-semibold border border-rose-500/30 flex items-center gap-1.5 transition cursor-pointer"
              title="Log out of waiter session"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Log Out</span>
            </button>
          </div>
        </div>

        {/* Waiter Name Edit Modal / Popover */}
        {isEditingWaiter && (
          <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 max-w-sm w-full shadow-2xl space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <User className="w-4 h-4 text-amber-400" />
                  <span>Waiter Staff Identity</span>
                </h3>
                <button
                  onClick={() => setIsEditingWaiter(false)}
                  className="text-slate-400 hover:text-white"
                >
                  ✕
                </button>
              </div>
              <p className="text-xs text-slate-400">
                Enter your staff name so cashier and kitchen can identify who placed the order:
              </p>
              <div className="space-y-2">
                {['Waiter Ramesh', 'Waiter Priya', 'Waiter Bikash', 'Waiter Anita'].map(preset => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => handleSaveWaiterName(preset)}
                    className="w-full text-left px-3 py-2 text-xs rounded-lg bg-slate-800 hover:bg-amber-500/20 hover:text-amber-300 border border-slate-700 transition"
                  >
                    {preset}
                  </button>
                ))}
              </div>
              <div className="pt-2">
                <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                  Or Custom Name:
                </label>
                <input
                  type="text"
                  defaultValue={waiterName}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      handleSaveWaiterName((e.target as HTMLInputElement).value);
                    }
                  }}
                  id="custom-waiter-name-input"
                  placeholder="e.g. Waiter Ram"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setIsEditingWaiter(false)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    const el = document.getElementById('custom-waiter-name-input') as HTMLInputElement;
                    if (el && el.value) handleSaveWaiterName(el.value);
                    else setIsEditingWaiter(false);
                  }}
                  className="px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs"
                >
                  Save Identity
                </button>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* 2. SUB-NAVIGATION TABS (NEW ORDER vs LIVE ORDERS) */}
      <div className="max-w-4xl mx-auto w-full px-4 pt-3 pb-1">
        <div className="grid grid-cols-2 bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs font-bold">
          <button
            onClick={() => setActiveTab('order')}
            className={`py-2 rounded-lg flex items-center justify-center gap-2 transition ${
              activeTab === 'order'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <UtensilsCrossed className="w-3.5 h-3.5" />
            <span>Table Order</span>
            {cartItemCount > 0 && (
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                activeTab === 'order' ? 'bg-slate-950 text-amber-300' : 'bg-amber-500 text-slate-950'
              }`}>
                {cartItemCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('live')}
            className={`py-2 rounded-lg flex items-center justify-center gap-2 transition relative ${
              activeTab === 'live'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Live Status</span>
            {pendingCashierCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-purple-600 text-white animate-pulse">
                {pendingCashierCount} Pending
              </span>
            )}
          </button>
        </div>
      </div>

      {/* SUCCESS NOTIFICATION TOAST */}
      {submitSuccessNotice && (
        <div className="max-w-4xl mx-auto w-full px-4 pt-2">
          <div className="bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 px-4 py-2.5 rounded-xl text-xs flex items-center justify-between shadow-lg">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{submitSuccessNotice}</span>
            </div>
            <button onClick={() => setSubmitSuccessNotice(null)} className="text-emerald-400 hover:text-white">✕</button>
          </div>
        </div>
      )}

      {/* TAB 1: ORDERING WORKFLOW */}
      {activeTab === 'order' && (
        <main className="max-w-4xl mx-auto w-full px-4 space-y-4 pt-2">
          {/* 3. TABLE SELECTOR CAROUSEL (TABLES 1 TO 11) */}
          <section className="bg-slate-900 p-3 rounded-2xl border border-slate-800 shadow-md space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                <span>Select Dining Table (1 - 11)</span>
              </span>
              <span className="text-[11px] text-slate-400 font-medium">
                Active Table: <strong className="text-amber-400 font-mono">T{selectedTableNumber < 10 ? `0${selectedTableNumber}` : selectedTableNumber}</strong>
                {validTables.find(t => (t.tableNumber || t.number) === selectedTableNumber)?.section && (
                  <span className="text-slate-400 font-sans ml-1">
                    • {validTables.find(t => (t.tableNumber || t.number) === selectedTableNumber)?.section}
                  </span>
                )}
              </span>
            </div>

            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-11 gap-1.5">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map(tableNum => {
                const isSelected = selectedTableNumber === tableNum;
                const tbl = validTables.find(t => (t.tableNumber || t.number) === tableNum);
                const isOccupied = (tbl?.status || '').toUpperCase() === 'OCCUPIED' || (tbl?.status || '').toUpperCase() === 'BILLING';

                return (
                  <button
                    key={tableNum}
                    type="button"
                    onClick={() => setSelectedTableNumber(tableNum)}
                    className={`py-2 px-1 rounded-xl text-center border font-mono font-bold text-xs transition flex flex-col items-center justify-center gap-0.5 ${
                      isSelected
                        ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-lg scale-105'
                        : isOccupied
                        ? 'bg-rose-950/40 text-rose-300 border-rose-800/60 hover:border-amber-400/50'
                        : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <span>T{tableNum < 10 ? `0${tableNum}` : tableNum}</span>
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        isSelected ? 'bg-slate-950' : isOccupied ? 'bg-rose-500' : 'bg-emerald-500'
                      }`}
                    />
                  </button>
                );
              })}
            </div>
          </section>

          {/* 4. SEARCH & FILTER CONTROLS */}
          <section className="space-y-2.5">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search food, momos, beverages, coffee..."
                className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-10 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 shadow-inner"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white text-xs"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Category Chips Bar */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
              <button
                type="button"
                onClick={() => setSelectedCategory('All')}
                className={`px-3 py-1.5 rounded-xl whitespace-nowrap font-bold transition ${
                  selectedCategory === 'All'
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                All Items
              </button>
              {categories.map(cat => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.name)}
                  className={`px-3 py-1.5 rounded-xl whitespace-nowrap font-bold transition ${
                    selectedCategory === cat.name
                      ? 'bg-amber-500 text-slate-950 shadow-sm'
                      : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>

            {/* Dietary Pills (All / Veg / Non-Veg) */}
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-[11px] text-slate-500 font-medium">Dietary:</span>
              <button
                type="button"
                onClick={() => setDietaryFilter('all')}
                className={`px-2 py-0.5 rounded-lg font-semibold text-[11px] border transition ${
                  dietaryFilter === 'all'
                    ? 'bg-slate-800 text-white border-slate-700'
                    : 'text-slate-500 border-transparent hover:text-slate-300'
                }`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setDietaryFilter('veg')}
                className={`px-2 py-0.5 rounded-lg font-semibold text-[11px] border transition flex items-center gap-1 ${
                  dietaryFilter === 'veg'
                    ? 'bg-emerald-950/60 text-emerald-400 border-emerald-700'
                    : 'text-slate-500 border-transparent hover:text-emerald-400'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span>Veg Only</span>
              </button>
              <button
                type="button"
                onClick={() => setDietaryFilter('non-veg')}
                className={`px-2 py-0.5 rounded-lg font-semibold text-[11px] border transition flex items-center gap-1 ${
                  dietaryFilter === 'non-veg'
                    ? 'bg-rose-950/60 text-rose-400 border-rose-700'
                    : 'text-slate-500 border-transparent hover:text-rose-400'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                <span>Non-Veg</span>
              </button>
            </div>
          </section>

          {/* 5. MENU ITEMS LIST */}
          <section className="space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-400 pb-1">
              <span>{filteredMenuItems.length} menu items available</span>
              <span className="text-[11px] text-slate-500">Tap + to add to table cart</span>
            </div>

            {filteredMenuItems.length === 0 ? (
              <div className="p-8 text-center bg-slate-900 rounded-2xl border border-slate-800 space-y-2">
                <UtensilsCrossed className="w-8 h-8 text-slate-600 mx-auto" />
                <p className="text-xs text-slate-400 font-medium">No items found matching your filters</p>
                <button
                  onClick={() => { setSearchQuery(''); setSelectedCategory('All'); setDietaryFilter('all'); }}
                  className="text-xs text-amber-400 underline font-bold"
                >
                  Clear all filters
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {filteredMenuItems.map(item => {
                  const hasVariants = Boolean(item.variants && item.variants.length > 0);
                  const activeVariant = selectedVariants[item.id] || (hasVariants ? item.variants![0] : undefined);
                  const effectivePrice = activeVariant && activeVariant.price > 0 ? activeVariant.price : item.price;

                  // Find how many of this item is currently in waiter cart
                  const inCartCount = waiterCart
                    .filter(c => c.menuItem.id === item.id)
                    .reduce((sum, c) => sum + c.quantity, 0);

                  const isVeg = item.dietary === 'veg' || item.dietary === 'vegetarian' || item.dietary === 'vegan';
                  const isDrink = item.kotDestination === 'RECEPTION' || item.department === 'SHOP' || (item.category || '').toLowerCase().includes('drink') || (item.category || '').toLowerCase().includes('cafe') || (item.category || '').toLowerCase().includes('barista');

                  return (
                    <div
                      key={item.id}
                      className="bg-slate-900 p-3 rounded-2xl border border-slate-800 hover:border-slate-700 transition flex flex-col justify-between gap-2 shadow-sm"
                    >
                      <div>
                        {/* Top Meta: Badges & Name */}
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-1.5 mb-1">
                              {isVeg ? (
                                <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-emerald-400 bg-emerald-950/80 border border-emerald-800 px-1.5 py-0.2 rounded">
                                  VEG
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-rose-400 bg-rose-950/80 border border-rose-800 px-1.5 py-0.2 rounded">
                                  NON-VEG
                                </span>
                              )}
                              <span className="text-[10px] text-slate-500 font-medium">
                                {item.category || (isDrink ? 'Reception' : 'Kitchen')}
                              </span>
                            </div>
                            <h4 className="text-xs font-bold text-white leading-snug">
                              {item.name}
                            </h4>
                          </div>

                          {/* Fixed Menu Price */}
                          <div className="text-right shrink-0">
                            <span className="text-xs font-mono font-bold text-amber-400">
                              Rs. {effectivePrice}
                            </span>
                            {item.kotDestination === 'RECEPTION' && (
                              <div className="text-[9px] text-purple-400 font-semibold flex items-center justify-end gap-0.5">
                                <Coffee className="w-2.5 h-2.5" />
                                <span>Bar</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {item.description && (
                          <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                            {item.description}
                          </p>
                        )}

                        {/* Portion / Variant selector if available */}
                        {hasVariants && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {item.variants!.map(v => (
                              <button
                                key={v.id}
                                type="button"
                                onClick={() => setSelectedVariants(prev => ({ ...prev, [item.id]: v }))}
                                className={`px-2 py-0.5 text-[10px] font-semibold rounded-lg border transition ${
                                  activeVariant?.id === v.id
                                    ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold'
                                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                                }`}
                              >
                                {v.name} (Rs. {v.price})
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Bottom Controls: Notes input & Add Buttons */}
                      <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2">
                        <input
                          type="text"
                          value={itemNoteInput[item.id] || ''}
                          onChange={e => setItemNoteInput(prev => ({ ...prev, [item.id]: e.target.value }))}
                          placeholder="Note: less spicy, extra dip..."
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-[11px] text-slate-300 placeholder-slate-600 focus:outline-none focus:border-amber-400"
                        />

                        <div className="flex items-center gap-1 shrink-0">
                          {inCartCount > 0 ? (
                            <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded-lg p-0.5">
                              <button
                                type="button"
                                onClick={() => {
                                  const cId = `${item.id}-${activeVariant?.id || 'standard'}`;
                                  updateWaiterCartQuantity(cId, -1);
                                }}
                                className="w-6 h-6 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center font-bold text-xs"
                              >
                                -
                              </button>
                              <span className="text-xs font-mono font-bold text-amber-400 px-1">
                                {inCartCount}
                              </span>
                              <button
                                type="button"
                                onClick={() => addToWaiterCart(item, activeVariant)}
                                className="w-6 h-6 rounded-md bg-amber-500 hover:bg-amber-400 text-slate-950 flex items-center justify-center font-bold text-xs"
                              >
                                +
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => addToWaiterCart(item, activeVariant)}
                              className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1 shadow-sm active:scale-95 transition"
                            >
                              <Plus className="w-3 h-3" />
                              <span>Add</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </main>
      )}

      {/* TAB 2: LIVE ORDERS TRACKING */}
      {activeTab === 'live' && (
        <main className="max-w-4xl mx-auto w-full px-4 space-y-4 pt-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
              <span>Real-Time Order Tracking</span>
            </span>
            <span className="text-[11px] text-slate-400">
              Showing active waiter orders
            </span>
          </div>

          {liveWaiterOrders.length === 0 ? (
            <div className="p-8 text-center bg-slate-900 rounded-2xl border border-slate-800 space-y-3">
              <UtensilsCrossed className="w-8 h-8 text-slate-600 mx-auto" />
              <h3 className="text-sm font-bold text-slate-300">No active orders yet</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Orders submitted to the cashier will appear here in real-time with status updates from approval to ready.
              </p>
              <button
                onClick={() => setActiveTab('order')}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs inline-flex items-center gap-1.5"
              >
                <span>Take a New Order</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {liveWaiterOrders.map(order => {
                const rawStatus = (order.status || '').toUpperCase();
                const isPendingCashier = rawStatus === 'PENDING_CASHIER' || (order.status as any) === 'pending_cashier';
                const isRejected = rawStatus === 'REJECTED' || (order.status as any) === 'rejected';
                const isConfirmedOrCooking = rawStatus === 'CONFIRMED' || rawStatus === 'PREPARING' || (order.status as any) === 'confirmed' || (order.status as any) === 'preparing';
                const isReady = rawStatus === 'READY' || (order.status as any) === 'ready';
                const isCompleted = rawStatus === 'SERVED' || rawStatus === 'COMPLETED' || (order.status as any) === 'served' || (order.status as any) === 'completed';

                return (
                  <div
                    key={order.id}
                    className={`bg-slate-900 p-4 rounded-2xl border shadow-md space-y-3 transition ${
                      isPendingCashier
                        ? 'border-purple-500/50 bg-purple-950/10'
                        : isRejected
                        ? 'border-rose-500/50 bg-rose-950/15'
                        : isReady
                        ? 'border-emerald-500/50 bg-emerald-950/10'
                        : 'border-slate-800'
                    }`}
                  >
                    {/* Header info */}
                    <div className="flex items-start justify-between gap-2 border-b border-slate-800/80 pb-2.5">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-bold text-amber-400">
                            {order.orderNumber}
                          </span>
                          <span className="text-xs font-bold text-white px-2 py-0.5 rounded-md bg-slate-800 border border-slate-700">
                            Table T{order.tableNumber < 10 ? `0${order.tableNumber}` : order.tableNumber}
                          </span>
                          {order.waiterName && (
                            <span className="text-[11px] text-slate-400">
                              by {order.waiterName}
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-500 mt-0.5">
                          Placed at {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-xs font-mono font-bold text-white">
                          Rs. {order.total || order.subtotal || 0}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {(order.items || []).reduce((s, i) => s + (i.quantity || 1), 0)} items
                        </div>
                      </div>
                    </div>

                    {/* LIVE STATUS PIPELINE */}
                    <div>
                      {isPendingCashier && (
                        <div className="bg-purple-950/40 border border-purple-500/30 text-purple-300 p-2.5 rounded-xl text-xs flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-purple-400 animate-spin" />
                            <div>
                              <div className="font-bold">Awaiting Cashier Approval</div>
                              <div className="text-[11px] text-purple-400/80">
                                Cashier is reviewing this order on the main POS dashboard.
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {isConfirmedOrCooking && (
                        <div className="bg-blue-950/40 border border-blue-500/30 text-blue-300 p-2.5 rounded-xl text-xs flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <ChefHat className="w-4 h-4 text-blue-400" />
                            <div>
                              <div className="font-bold">Approved & KOT Sent</div>
                              <div className="text-[11px] text-blue-300/80">
                                Kitchen and Bar are preparing items.
                              </div>
                            </div>
                          </div>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/40">
                            Cooking
                          </span>
                        </div>
                      )}

                      {isReady && (
                        <div className="bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 p-2.5 rounded-xl text-xs flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                            <div>
                              <div className="font-bold">Ready to Serve!</div>
                              <div className="text-[11px] text-emerald-300/80">
                                Food/drinks are prepared. Please deliver to Table T{order.tableNumber}.
                              </div>
                            </div>
                          </div>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 animate-pulse">
                            Ready
                          </span>
                        </div>
                      )}

                      {isRejected && (
                        <div className="bg-rose-950/40 border border-rose-500/40 text-rose-300 p-3 rounded-xl text-xs space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5 font-bold text-rose-400">
                              <XCircle className="w-4 h-4 text-rose-400" />
                              <span>Order Rejected by Cashier</span>
                            </div>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">
                              Rejected
                            </span>
                          </div>

                          <div className="bg-rose-950/60 p-2 rounded-lg border border-rose-800/60 text-[11px]">
                            <span className="text-rose-400 font-semibold">Reason: </span>
                            <span className="text-white">{order.rejectionReason || 'Item unavailable or table conflict.'}</span>
                          </div>

                          <div className="pt-1">
                            <button
                              type="button"
                              onClick={() => handleReorder(order)}
                              className="px-3 py-1.5 rounded-lg bg-rose-500 hover:bg-rose-400 text-slate-950 font-bold text-xs inline-flex items-center gap-1 transition"
                            >
                              <RotateCcw className="w-3 h-3" />
                              <span>Modify Items & Re-submit</span>
                            </button>
                          </div>
                        </div>
                      )}

                      {isCompleted && (
                        <div className="bg-slate-800/40 border border-slate-700/50 text-slate-400 p-2 rounded-xl text-xs flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-slate-400" />
                            <span>Served & Completed</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Item snapshot breakdown */}
                    <div className="pt-1 space-y-1">
                      <div className="text-[11px] font-semibold text-slate-400">Items:</div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-xs">
                        {(order.items || []).map((it, idx) => (
                          <div
                            key={it.id || idx}
                            className="bg-slate-950/60 px-2.5 py-1.5 rounded-lg border border-slate-800/60 flex items-center justify-between text-slate-300"
                          >
                            <div className="truncate pr-2">
                              <span className="font-bold text-amber-400 mr-1.5">{it.quantity}x</span>
                              <span>{it.nameSnapshot || it.name || 'Item'}</span>
                              {it.notes && (
                                <span className="text-[10px] text-slate-400 block italic truncate">
                                  Note: {it.notes}
                                </span>
                              )}
                            </div>
                            <span className="text-slate-400 font-mono text-[11px] shrink-0">
                              Rs. {(it.priceSnapshot || it.price || 0) * (it.quantity || 1)}
                            </span>
                          </div>
                        ))}
                      </div>
                      {order.notes && (
                        <div className="text-[11px] text-slate-400 bg-slate-950/40 p-2 rounded-lg border border-slate-800">
                          <span className="font-semibold text-slate-300">Order Note: </span>
                          <span>{order.notes}</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>
      )}

      {/* 6. FLOATING BOTTOM CART BAR (ALWAYS VISIBLE WHEN CART HAS ITEMS) */}
      {cartItemCount > 0 && activeTab === 'order' && (
        <div className="fixed bottom-0 left-0 right-0 z-40 p-3 bg-gradient-to-t from-slate-950 via-slate-950/90 to-transparent">
          <div className="max-w-4xl mx-auto">
            <button
              type="button"
              onClick={() => setIsCartModalOpen(true)}
              className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 p-3.5 rounded-2xl font-bold flex items-center justify-between shadow-2xl transition active:scale-[0.99] border border-amber-300"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-slate-950 text-amber-400 flex items-center justify-center font-mono text-xs">
                  {cartItemCount}
                </div>
                <div className="text-left">
                  <div className="text-xs uppercase tracking-wider text-slate-900 font-extrabold">
                    Table T{selectedTableNumber < 10 ? `0${selectedTableNumber}` : selectedTableNumber} Cart
                  </div>
                  <div className="text-[11px] text-slate-800">
                    Tap to review & submit to cashier
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-sm font-mono font-black">
                  Rs. {cartTotalAmount}
                </span>
                <ArrowRight className="w-4 h-4" />
              </div>
            </button>
          </div>
        </div>
      )}

      {/* 7. REVIEW & SUBMIT BOTTOM SHEET MODAL */}
      {isCartModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex flex-col justify-end p-0 sm:p-4 sm:items-center sm:justify-center">
          <div className="bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-3xl max-w-lg w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-200">
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <ShoppingBag className="w-4 h-4 text-amber-400" />
                  <span>Review Order for Table T{selectedTableNumber < 10 ? `0${selectedTableNumber}` : selectedTableNumber}</span>
                </h3>
                <p className="text-[11px] text-slate-400">
                  Waiter: <strong>{waiterName}</strong> | {cartItemCount} items
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsCartModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center text-xs"
              >
                ✕
              </button>
            </div>

            {/* Error Display */}
            {submitError && (
              <div className="mx-4 mt-3 p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{submitError}</span>
              </div>
            )}

            {/* Itemized List */}
            <div className="p-4 overflow-y-auto space-y-2.5 divide-y divide-slate-800/80 flex-1">
              {waiterCart.map(item => {
                const price = item.selectedVariant && item.selectedVariant.price > 0
                  ? item.selectedVariant.price
                  : item.menuItem.price;

                return (
                  <div key={item.cartId} className="pt-2.5 first:pt-0 flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="text-xs font-bold text-white">
                        {item.menuItem.name}
                        {item.selectedVariant && (
                          <span className="text-[10px] font-normal text-amber-400 ml-1">
                            ({item.selectedVariant.name})
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                        Rs. {price} × {item.quantity} = <strong>Rs. {price * item.quantity}</strong>
                      </div>
                      {item.notes && (
                        <div className="text-[10px] text-amber-300/90 italic mt-0.5">
                          Note: {item.notes}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => updateWaiterCartQuantity(item.cartId, -1)}
                        className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center justify-center font-bold text-xs"
                      >
                        -
                      </button>
                      <span className="w-6 text-center font-mono font-bold text-xs text-white">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => updateWaiterCartQuantity(item.cartId, 1)}
                        className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center justify-center font-bold text-xs"
                      >
                        +
                      </button>
                      <button
                        type="button"
                        onClick={() => removeFromWaiterCart(item.cartId)}
                        className="w-7 h-7 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 flex items-center justify-center ml-1"
                        title="Remove"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}

              {/* Order Level Special Instructions */}
              <div className="pt-3">
                <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                  Table Order Notes / Special Instructions:
                </label>
                <textarea
                  value={orderNotes}
                  onChange={e => setOrderNotes(e.target.value)}
                  rows={2}
                  placeholder="e.g. Guest sitting outdoors, serve drinks first, VIP customer..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-amber-400"
                />
              </div>

              {/* Financial Breakdown (Immutable - no waiter tampering) */}
              <div className="pt-3 space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-400">
                  <span>Subtotal:</span>
                  <span className="font-mono">Rs. {cartSubtotal}</span>
                </div>
                {settings.serviceChargeEnabled && (
                  <div className="flex justify-between text-slate-400">
                    <span>Service Charge ({settings.serviceChargePercent ?? 10}%):</span>
                    <span className="font-mono">Rs. {serviceChargeAmount}</span>
                  </div>
                )}
                {settings.vatEnabled && (
                  <div className="flex justify-between text-slate-400">
                    <span>VAT ({settings.vatRate ?? 13}%):</span>
                    <span className="font-mono">Rs. {vatAmount}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-bold text-white pt-1 border-t border-slate-800">
                  <span>Grand Total:</span>
                  <span className="font-mono text-amber-400">Rs. {cartTotalAmount}</span>
                </div>
                <div className="text-[10px] text-slate-500 pt-1 flex items-center gap-1">
                  <Info className="w-3 h-3 text-slate-400" />
                  <span>Prices & taxes are calculated from the restaurant system.</span>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="p-4 border-t border-slate-800 bg-slate-950 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsCartModalOpen(false)}
                className="w-1/3 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs"
              >
                Back
              </button>
              <button
                type="button"
                disabled={isSubmitting || waiterCart.length === 0}
                onClick={handleSubmitOrderToCashier}
                className="w-2/3 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-extrabold text-xs flex items-center justify-center gap-2 shadow-lg"
              >
                {isSubmitting ? (
                  <>
                    <Clock className="w-4 h-4 animate-spin" />
                    <span>Submitting to Cashier...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Submit to Cashier</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
