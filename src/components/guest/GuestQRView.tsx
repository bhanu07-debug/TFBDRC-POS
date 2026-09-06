import React, { useState, useMemo } from 'react';
import { usePOS } from '../../context/POSContext';
import { MenuItem } from '../../types';
import { normalizeImageUrl, DEFAULT_DISH_IMAGE } from '../../utils/imageUtils';
import { CATEGORY_NAMES, RESTAURANT_PROFILE } from '../../data/restaurantMenu';
import {
  Search,
  SlidersHorizontal,
  Flame,
  Leaf,
  Sparkles,
  ShoppingBag,
  Clock,
  Plus,
  Bell,
  Receipt,
  QrCode,
  Wifi,
  ChevronRight,
  Info,
  PhoneCall,
  Smartphone,
  Maximize2,
  Check,
  BellRing,
  AlertTriangle,
  X
} from 'lucide-react';
import {
  playReadySound,
  playCancelSound
} from '../../utils/sound';
import { MenuItemCustomizerModal } from './MenuItemCustomizerModal';
import { GuestCartDrawer } from './GuestCartDrawer';
import { GuestLiveOrderTracker } from './GuestLiveOrderTracker';
import { CallServiceModal } from './CallServiceModal';
import { TableQRModal } from './TableQRModal';

export const GuestQRView: React.FC = () => {
  const {
    menuItems,
    currentGuestTableNumber,
    setCurrentGuestTableNumber,
    cart,
    cartTotal,
    cartItemCount,
    addToCart,
    getTableOrders,
    getCurrentTable,
    settings,
    tableNotifications,
    markTableNotificationRead
  } = usePOS();

  // Local View States
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [dietaryFilter, setDietaryFilter] = useState<'all' | 'veg' | 'non-veg' | 'vegan'>('all');
  const [mobileFrameMode, setMobileFrameMode] = useState(false);

  // Modals
  const [customizingItem, setCustomizingItem] = useState<MenuItem | null>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isTrackerOpen, setIsTrackerOpen] = useState(false);
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);

  const currentTable = getCurrentTable();
  const activeOrders = getTableOrders(currentGuestTableNumber);
  const hasActiveOrders = activeOrders.length > 0;

  // Active notifications for this specific table
  const unreadTableAlerts = (tableNotifications || []).filter(
    n => n.tableNumber === currentGuestTableNumber && !n.read
  );

  // Audio trigger on incoming notification for this table
  const prevAlertCount = React.useRef(unreadTableAlerts.length);
  React.useEffect(() => {
    if (unreadTableAlerts.length > prevAlertCount.current && unreadTableAlerts.length > 0) {
      const latest = unreadTableAlerts[0];
      if (latest.type === 'order_ready') {
        playReadySound();
      } else if (latest.type === 'order_cancelled') {
        playCancelSound();
      }
    }
    prevAlertCount.current = unreadTableAlerts.length;
  }, [unreadTableAlerts]);

  // Categories list derived dynamically from menuItems & official list
  const categories = useMemo(() => {
    const set = new Set<string>();
    CATEGORY_NAMES.forEach(c => set.add(c));
    menuItems.forEach(item => {
      if (item.category && item.category.trim()) set.add(item.category.trim());
    });
    return ['All', ...Array.from(set)];
  }, [menuItems]);

  // Filtered Menu Items
  const filteredItems = menuItems.filter(item => {
    // Category filter
    if (selectedCategory !== 'All' && item.category !== selectedCategory) {
      return false;
    }
    // Dietary filter
    if (dietaryFilter === 'veg' && item.dietary !== 'veg') return false;
    if (dietaryFilter === 'non-veg' && item.dietary !== 'non-veg') return false;
    if (dietaryFilter === 'vegan' && item.dietary !== 'vegan') return false;

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = item.name.toLowerCase().includes(q);
      const matchDesc = item.description.toLowerCase().includes(q);
      const matchTag = item.tags.some(t => t.toLowerCase().includes(q));
      if (!matchName && !matchDesc && !matchTag) return false;
    }

    return true;
  });

  const handleItemClick = (item: MenuItem) => {
    if (!item.inStock) return;
    setCustomizingItem(item);
  };

  const handleQuickAdd = (e: React.MouseEvent, item: MenuItem) => {
    e.stopPropagation();
    if (!item.inStock) return;
    if ((item.variants && item.variants.length > 0) || (item.addOns && item.addOns.length > 0)) {
      setCustomizingItem(item);
    } else {
      addToCart(item, 1);
    }
  };

  return (
    <div className={`min-h-[calc(100vh-4rem)] bg-[#FDFCF0] text-gray-900 flex flex-col ${
      mobileFrameMode ? 'items-center py-6 px-2 bg-gray-200' : ''
    }`}>
      {/* Mobile Frame Container Wrapper (toggleable) */}
      <div className={`w-full ${
        mobileFrameMode
          ? 'max-w-md bg-[#FDFCF0] rounded-[40px] border-[8px] border-gray-800 shadow-2xl overflow-y-auto max-h-[90vh] min-h-[840px] flex flex-col relative'
          : 'max-w-4xl mx-auto px-3 sm:px-6 py-4 flex flex-col'
      }`}>
        
        {/* Mobile Frame Header Controls (Desktop only helper) */}
        <div className="flex items-center justify-between py-2 border-b border-gray-200 mb-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-semibold text-gray-700">
              Live Guest Ordering Session
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setMobileFrameMode(!mobileFrameMode)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-gray-200 text-gray-600 hover:text-gray-900 text-[11px] shadow-sm transition"
              title="Toggle mobile device view"
            >
              {mobileFrameMode ? <Maximize2 className="w-3 h-3" /> : <Smartphone className="w-3 h-3 text-amber-600" />}
              <span>{mobileFrameMode ? 'Full View' : 'Mobile Frame'}</span>
            </button>
          </div>
        </div>

        {/* Hero Restaurant Banner */}
        <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white p-4 sm:p-5 mb-4 shadow-md">
          <div className="relative z-10">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2 py-0.5 rounded-md bg-amber-500 text-white font-black text-[10px] uppercase tracking-wider shadow-sm">
                    Table {currentGuestTableNumber < 10 ? '0' + currentGuestTableNumber : currentGuestTableNumber}
                  </span>
                  <span className="text-[11px] text-amber-300 font-medium">
                    {currentTable?.section || 'Indoor Dining'}
                  </span>
                </div>
                <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                  {settings.restaurantName || RESTAURANT_PROFILE.name}
                </h1>
                <p className="text-xs text-amber-200/90 mt-1 max-w-sm">
                  {settings.tagline || RESTAURANT_PROFILE.tagline}
                </p>
                <div className="flex items-center gap-2 mt-1 text-[10px] text-gray-300">
                  <span>📸 {RESTAURANT_PROFILE.social.instagram}</span>
                  <span>•</span>
                  <span>🎵 {RESTAURANT_PROFILE.social.tiktok}</span>
                </div>
              </div>

              {/* Table QR Button */}
              <button
                onClick={() => setIsQRModalOpen(true)}
                className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-amber-300 border border-white/20 transition shadow"
                title="View Table QR Code"
              >
                <QrCode className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Action Chips */}
            <div className="flex items-center gap-2 mt-4 overflow-x-auto pb-1 text-xs">
              <button
                onClick={() => setIsServiceModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-amber-300 border border-white/20 transition flex-shrink-0"
              >
                <Bell className="w-3.5 h-3.5 text-amber-400" />
                <span>Call Waiter</span>
              </button>

              {hasActiveOrders && (
                <button
                  onClick={() => setIsTrackerOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold shadow-sm transition flex-shrink-0 animate-pulse"
                >
                  <Receipt className="w-3.5 h-3.5 text-white" />
                  <span>My Active Orders ({activeOrders.length})</span>
                </button>
              )}

              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 text-gray-300 border border-white/15 transition flex-shrink-0">
                <Wifi className="w-3.5 h-3.5 text-gray-300" />
                <span className="text-[11px] font-mono">{settings.wifiSsid}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Real-Time Table Order Notifications (Ready / Unavailable Alerts from Kitchen) */}
        {unreadTableAlerts.length > 0 && (
          <div className="space-y-2 mb-4">
            {unreadTableAlerts.map(alert => (
              <div
                key={alert.id}
                className={`p-4 rounded-2xl border-2 shadow-md flex items-start justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-300 ${
                  alert.type === 'order_ready'
                    ? 'bg-emerald-50 border-emerald-400 text-emerald-950'
                    : 'bg-rose-50 border-rose-300 text-rose-950'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 shadow-xs ${
                      alert.type === 'order_ready'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-rose-600 text-white'
                    }`}
                  >
                    {alert.type === 'order_ready' ? (
                      <BellRing className="w-5 h-5 animate-bounce" />
                    ) : (
                      <AlertTriangle className="w-5 h-5" />
                    )}
                  </div>

                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-bold text-sm">
                        {alert.title}
                      </h4>
                      <span
                        className={`px-2 py-0.2 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          alert.type === 'order_ready'
                            ? 'bg-emerald-200 text-emerald-800'
                            : 'bg-rose-200 text-rose-800'
                        }`}
                      >
                        {alert.type === 'order_ready' ? 'Ready to Serve' : 'Item Notice'}
                      </span>
                    </div>

                    <p className="text-xs mt-1 leading-relaxed opacity-90">
                      {alert.message}
                    </p>

                    <div className="mt-3 flex items-center gap-2 flex-wrap">
                      {alert.type === 'order_ready' ? (
                        <button
                          onClick={() => {
                            setIsTrackerOpen(true);
                            markTableNotificationRead(alert.id);
                          }}
                          className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition cursor-pointer"
                        >
                          View Order Tracker
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            setIsServiceModalOpen(true);
                            markTableNotificationRead(alert.id);
                          }}
                          className="px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-xs transition flex items-center gap-1 cursor-pointer"
                        >
                          <PhoneCall className="w-3 h-3" />
                          <span>Call Waiter</span>
                        </button>
                      )}

                      <button
                        onClick={() => markTableNotificationRead(alert.id)}
                        className="px-3 py-1.5 rounded-lg bg-white border border-gray-300 text-gray-700 text-xs font-semibold hover:bg-gray-50 transition cursor-pointer"
                      >
                        Dismiss
                      </button>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => markTableNotificationRead(alert.id)}
                  className="text-gray-400 hover:text-gray-700 p-1"
                  title="Dismiss notification"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Search Bar & Dietary Filter Toggles - Fixed cleanly on top during menu scroll */}
        <div className="space-y-2.5 mb-4 sticky top-0 z-30 bg-[#FDFCF0]/98 backdrop-blur-md pt-2.5 pb-2.5 -mx-3 px-3 sm:-mx-6 sm:px-6 border-b border-amber-900/10 shadow-xs translate-z-0">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search momos, sekuwa, chilly, fried rice, drinks..."
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-xs sm:text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:border-amber-500 shadow-sm"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-700"
              >
                Clear
              </button>
            )}
          </div>

          {/* Dietary Badges */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar overscroll-x-contain touch-pan-x">
            <button
              onClick={() => setDietaryFilter('all')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                dietaryFilter === 'all'
                  ? 'bg-amber-500 text-white font-bold shadow-sm'
                  : 'bg-white hover:bg-gray-50 text-gray-600 border border-gray-200'
              }`}
            >
              All Items
            </button>

            <button
              onClick={() => setDietaryFilter('veg')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                dietaryFilter === 'veg'
                  ? 'bg-emerald-600 text-white font-bold shadow-sm'
                  : 'bg-white hover:bg-emerald-50 text-emerald-700 border border-emerald-200'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Veg Only
            </button>

            <button
              onClick={() => setDietaryFilter('non-veg')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                dietaryFilter === 'non-veg'
                  ? 'bg-rose-600 text-white font-bold shadow-sm'
                  : 'bg-white hover:bg-rose-50 text-rose-700 border border-rose-200'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500" /> Non-Veg
            </button>

            <button
              onClick={() => setDietaryFilter('vegan')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                dietaryFilter === 'vegan'
                  ? 'bg-teal-600 text-white font-bold shadow-sm'
                  : 'bg-white hover:bg-teal-50 text-teal-700 border border-teal-200'
              }`}
            >
              <Leaf className="w-3 h-3 text-teal-600" /> Vegan
            </button>
          </div>

          {/* Category Tabs Scroll */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 no-scrollbar overscroll-x-contain touch-pan-x">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition ${
                  selectedCategory === cat
                    ? 'bg-gray-900 text-white font-bold shadow-sm'
                    : 'bg-white hover:bg-gray-50 text-gray-700 border border-gray-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Menu Items Grid / List */}
        <div className="flex-1 space-y-3 pb-28">
          {filteredItems.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
              <Search className="w-10 h-10 text-gray-400 mx-auto mb-2" />
              <p className="text-sm font-semibold text-gray-800">No dishes match your filter</p>
              <p className="text-xs text-gray-500 mt-1">
                Try resetting search keywords or dietary filters to browse full cafe offerings.
              </p>
              <button
                onClick={() => {
                  setSelectedCategory('All');
                  setDietaryFilter('all');
                  setSearchQuery('');
                }}
                className="mt-3 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-semibold shadow-sm"
              >
                Reset Filters
              </button>
            </div>
          ) : (
            filteredItems.map(item => (
              <div
                key={item.id}
                onClick={() => handleItemClick(item)}
                className={`p-3.5 bg-white hover:bg-amber-50/20 rounded-2xl border transition-all cursor-pointer flex gap-3 sm:gap-4 items-center group relative shadow-sm ${
                  item.inStock
                    ? 'border-gray-200 hover:border-amber-400 hover:shadow-md'
                    : 'border-gray-200 opacity-60'
                }`}
              >
                {/* Details column */}
                <div className="flex-1 min-w-0">
                  {/* Badges */}
                  <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                    {item.dietary === 'veg' && (
                      <span className="w-3.5 h-3.5 border border-emerald-600 flex items-center justify-center p-0.5 rounded-sm bg-emerald-50">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                      </span>
                    )}
                    {item.dietary === 'non-veg' && (
                      <span className="w-3.5 h-3.5 border border-rose-600 flex items-center justify-center p-0.5 rounded-sm bg-rose-50">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-600" />
                      </span>
                    )}
                    {item.dietary === 'vegan' && (
                      <span className="w-3.5 h-3.5 border border-teal-600 flex items-center justify-center p-0.5 rounded-sm bg-teal-50">
                        <Leaf className="w-2.5 h-2.5 text-teal-600" />
                      </span>
                    )}

                    {item.isChefSpecial && (
                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 border border-amber-200">
                        Chef's Choice
                      </span>
                    )}

                    {item.isPopular && (
                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-orange-100 text-orange-800">
                        ★ Popular
                      </span>
                    )}
                  </div>

                  {/* Title & Price */}
                  <h3 className="text-sm sm:text-base font-bold text-gray-900 group-hover:text-amber-600 transition-colors leading-snug">
                    {item.name}
                  </h3>

                  <p className="text-[11px] sm:text-xs text-gray-500 line-clamp-2 mt-1 leading-relaxed">
                    {item.description}
                  </p>

                  <div className="flex items-center gap-3 mt-2">
                    <span className="font-mono font-black text-sm sm:text-base text-gray-900">
                      ₹{item.price}
                    </span>

                    {item.spiceLevel !== undefined && item.spiceLevel > 0 && (
                      <span className="text-[10px] text-rose-600 font-semibold flex items-center gap-0.5">
                        <Flame className="w-3 h-3" />
                        {'🌶️'.repeat(item.spiceLevel)}
                      </span>
                    )}

                    <span className="text-[10px] text-gray-400 flex items-center gap-0.5">
                      <Clock className="w-3 h-3" /> {item.prepTimeMinutes}m
                    </span>
                  </div>
                </div>

                {/* Image + Quick Add Button column */}
                <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0 border border-gray-200 shadow-sm">
                  <img
                    src={normalizeImageUrl(item.image) || DEFAULT_DISH_IMAGE}
                    alt={item.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 bg-gray-100"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      e.currentTarget.src = DEFAULT_DISH_IMAGE;
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />

                  {item.inStock ? (
                    <button
                      id={`btn-add-${item.id}`}
                      onClick={(e) => handleQuickAdd(e, item)}
                      className="absolute bottom-1.5 right-1.5 px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-black text-xs shadow-md flex items-center gap-1 transition active:scale-95"
                    >
                      <Plus className="w-3 h-3 stroke-[3]" />
                      <span>ADD</span>
                    </button>
                  ) : (
                    <div className="absolute inset-0 bg-black/70 flex items-center justify-center p-1 text-center">
                      <span className="text-[10px] font-bold text-rose-300 uppercase">
                        Sold Out
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Sticky Floating Bottom Bar for Cart / Active Orders */}
        <div className="fixed bottom-3 inset-x-3 sm:inset-x-auto sm:w-full sm:max-w-xl sm:left-1/2 sm:-translate-x-1/2 z-30">
          <div className="p-2.5 bg-white/95 backdrop-blur-md rounded-2xl border border-gray-200 shadow-xl flex items-center justify-between gap-2">
            
            {/* View Table Orders button */}
            <button
              onClick={() => setIsTrackerOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-semibold border border-gray-200 transition"
            >
              <Receipt className="w-3.5 h-3.5 text-amber-600" />
              <span>Orders</span>
              {activeOrders.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-white font-mono text-[10px] font-bold">
                  {activeOrders.length}
                </span>
              )}
            </button>

            {/* View Cart Main CTA */}
            <button
              id="btn-view-cart-bar"
              onClick={() => setIsCartOpen(true)}
              disabled={cartItemCount === 0}
              className={`flex-1 flex items-center justify-between px-4 py-2.5 rounded-xl font-bold text-xs transition transform ${
                cartItemCount > 0
                  ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-md shadow-amber-500/20 active:scale-98'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200'
              }`}
            >
              <div className="flex items-center gap-2">
                <div className="relative">
                  <ShoppingBag className="w-4 h-4" />
                  {cartItemCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 rounded-full bg-gray-900 text-amber-400 text-[9px] font-extrabold flex items-center justify-center">
                      {cartItemCount}
                    </span>
                  )}
                </div>
                <span>{cartItemCount > 0 ? `${cartItemCount} Items in Cart` : 'Cart is Empty'}</span>
              </div>

              {cartItemCount > 0 && (
                <div className="flex items-center gap-1">
                  <span className="font-mono text-sm font-black">₹{cartTotal}</span>
                  <ChevronRight className="w-4 h-4" />
                </div>
              )}
            </button>
          </div>
        </div>

        {/* Modals */}
        <MenuItemCustomizerModal
          item={customizingItem}
          isOpen={!!customizingItem}
          onClose={() => setCustomizingItem(null)}
          onAddToCart={addToCart}
        />

        <GuestCartDrawer
          isOpen={isCartOpen}
          onClose={() => setIsCartOpen(false)}
          onOrderSuccess={(orderId) => {
            setIsTrackerOpen(true);
          }}
        />

        <GuestLiveOrderTracker
          isOpen={isTrackerOpen}
          onClose={() => setIsTrackerOpen(false)}
          onOrderMore={() => setIsTrackerOpen(false)}
          onCallService={() => {
            setIsTrackerOpen(false);
            setIsServiceModalOpen(true);
          }}
        />

        <CallServiceModal
          isOpen={isServiceModalOpen}
          onClose={() => setIsServiceModalOpen(false)}
        />

        <TableQRModal
          isOpen={isQRModalOpen}
          onClose={() => setIsQRModalOpen(false)}
          initialTableNum={currentGuestTableNumber}
        />
      </div>
    </div>
  );
};
