import React, { useState, useEffect, useRef } from 'react';
import { usePOS } from '../../context/POSContext';
import {
  LayoutDashboard,
  Layers,
  UtensilsCrossed,
  ChefHat,
  Receipt,
  BookOpen,
  Package,
  CreditCard,
  BarChart3,
  Settings,
  Bell,
  CheckCircle2,
  AlertCircle,
  QrCode,
  Sparkles,
  LogOut,
  Search,
  Printer,
  Smartphone,
  Menu as MenuIcon,
  X,
  UserCheck,
  Wifi,
  ChevronRight,
  Volume2
} from 'lucide-react';
import { DashboardView } from './DashboardView';
import { TablesView } from './TablesView';
import { OrdersView } from './OrdersView';
import { KOTView } from './KOTView';
import { ManualPOSView } from './ManualPOSView';
import { MenuView } from './MenuView';
import { InventoryView } from './InventoryView';
import { PaymentsView } from './PaymentsView';
import { ReportsView } from './ReportsView';
import { SettingsView } from './SettingsView';
import { ReceiptModal } from './ReceiptModal';
import { TableQRModal } from '../guest/TableQRModal';
import { Order, AdminTab } from '../../types';

export const AdminLayout: React.FC = () => {
  const {
    adminActiveTab,
    setAdminActiveTab,
    setActiveInterface,
    serviceRequests,
    resolveServiceRequest,
    orders,
    kots,
    tables,
    settings
  } = usePOS();

  const [receiptOrder, setReceiptOrder] = useState<Order | null>(null);
  const [selectedPunchTable, setSelectedPunchTable] = useState<number | undefined>(undefined);
  const [isServiceDrawerOpen, setIsServiceDrawerOpen] = useState(false);
  const [isBatchQrModalOpen, setIsBatchQrModalOpen] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [globalSearch, setGlobalSearch] = useState('');
  const [toastNotification, setToastNotification] = useState<{ id: string; tableNumber: number; text: string; type: string } | null>(null);

  const prevPendingServiceCount = useRef<number>(0);
  const prevOrdersCount = useRef<number>(orders.length);

  const activeOrdersCount = orders.filter(o => o.status !== 'completed' && o.status !== 'cancelled').length;
  const activeKOTCount = kots.filter(k => k.status === 'pending' || k.status === 'in_progress').length;
  const pendingServiceCount = serviceRequests.filter(s => s.status === 'pending').length;
  const occupiedTableCount = tables.filter(
    t => ((t.status || '').toUpperCase() === 'OCCUPIED' || (t.status || '').toUpperCase() === 'BILLING') &&
         Boolean((t.activeOrdersCount && t.activeOrdersCount > 0) || (t.totalBill && t.totalBill > 0))
  ).length;

  // Real-time Web Audio Synthesizer Chime
  const playAlertChime = () => {
    if (settings.soundAlerts === false) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const now = ctx.currentTime;

      // Note 1: 784 Hz (G5)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(784, now);
      gain1.gain.setValueAtTime(0.15, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.25);

      // Note 2: 1046 Hz (C6)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(1046, now + 0.12);
      gain2.gain.setValueAtTime(0.2, now + 0.12);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.12);
      osc2.stop(now + 0.45);
    } catch {
      // Audio playback restrictions fallback
    }
  };

  // Watch for new incoming service requests
  useEffect(() => {
    if (pendingServiceCount > prevPendingServiceCount.current) {
      const latestReq = serviceRequests.find(r => r.status === 'pending');
      if (latestReq) {
        playAlertChime();
        setToastNotification({
          id: latestReq.id,
          tableNumber: latestReq.tableNumber,
          text: latestReq.message || `Table ${latestReq.tableNumber} requested ${latestReq.type.replace('_', ' ')}`,
          type: latestReq.type
        });
      }
    }
    prevPendingServiceCount.current = pendingServiceCount;
  }, [pendingServiceCount, serviceRequests]);

  // Watch for new orders from Guest QR
  useEffect(() => {
    if (orders.length > prevOrdersCount.current && prevOrdersCount.current > 0) {
      const newestOrder = orders[0];
      if (newestOrder && newestOrder.source === 'GUEST_QR') {
        playAlertChime();
        setToastNotification({
          id: newestOrder.id,
          tableNumber: newestOrder.tableNumber,
          text: `New Guest Order #${newestOrder.orderNumber} placed from Table ${newestOrder.tableNumber}`,
          type: 'order'
        });
      }
    }
    prevOrdersCount.current = orders.length;
  }, [orders.length]);

  const navItems: {
    id: AdminTab;
    label: string;
    icon: React.ElementType;
    badge?: string | number | null;
    alert?: boolean;
  }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'tables', label: 'Tables', icon: Layers, badge: `${occupiedTableCount}/10` },
    { id: 'orders', label: 'Orders', icon: Receipt, badge: activeOrdersCount > 0 ? activeOrdersCount : null },
    { id: 'kot', label: 'KOT', icon: ChefHat, badge: activeKOTCount > 0 ? activeKOTCount : null, alert: activeKOTCount > 0 },
    { id: 'manual_order', label: 'Manual Order', icon: UtensilsCrossed },
    { id: 'menu', label: 'Menu', icon: BookOpen },
    { id: 'inventory', label: 'Inventory', icon: Package },
    { id: 'payments', label: 'Payments', icon: CreditCard },
    { id: 'reports', label: 'Reports', icon: BarChart3 },
    { id: 'settings', label: 'Settings', icon: Settings }
  ];

  const handlePunchOrderFromTable = (tableNumber: number) => {
    setSelectedPunchTable(tableNumber);
    setAdminActiveTab('manual_order');
  };

  const getPageTitle = () => {
    switch (adminActiveTab) {
      case 'dashboard':
        return 'Dashboard Overview';
      case 'tables':
        return 'Table Management (10 Tables)';
      case 'orders':
        return 'Orders Management';
      case 'kot':
        return 'Kitchen Order Tickets (KOT)';
      case 'manual_order':
        return 'Manual Fast POS Order';
      case 'menu':
        return 'Menu & Recipe Catalog';
      case 'inventory':
        return 'Inventory & Stock Control';
      case 'payments':
        return 'Payments & Transactions';
      case 'reports':
        return 'Reports & Analytics';
      case 'settings':
        return 'POS & Restaurant Settings';
      default:
        return 'Dashboard';
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#0B0F17] text-slate-100">
      {/* Mobile Sidebar Backdrop */}
      {isMobileSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-xs lg:hidden"
          onClick={() => setIsMobileSidebarOpen(false)}
        />
      )}

      {/* Fixed Left Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-[#111827] text-gray-300 flex flex-col justify-between border-r border-slate-800 transition-transform duration-300 ease-in-out ${
          isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Brand Header */}
        <div>
          <div className="p-5 flex items-center justify-between border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center text-white shadow-md shadow-amber-500/30">
                <UtensilsCrossed className="w-5 h-5" />
              </div>
              <div>
                <h1 className="font-bold text-white text-sm tracking-tight leading-tight">
                  The Fat Buddha Delight
                </h1>
                <p className="text-[11px] text-amber-400 font-semibold">Restro & Cafe</p>
              </div>
            </div>
            <button
              onClick={() => setIsMobileSidebarOpen(false)}
              className="p-1 rounded-lg text-gray-400 hover:text-white lg:hidden"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="p-3 space-y-1 overflow-y-auto max-h-[calc(100vh-220px)] no-scrollbar">
            {navItems.map(item => {
              const Icon = item.icon;
              const isActive = adminActiveTab === item.id;

              return (
                <button
                  key={item.id}
                  id={`nav-${item.id}`}
                  onClick={() => {
                    setAdminActiveTab(item.id);
                    setIsMobileSidebarOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-amber-500 text-white shadow-md shadow-amber-500/20 font-bold'
                      : 'text-gray-300 hover:bg-slate-800/80 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon
                      className={`w-4 h-4 flex-shrink-0 ${
                        isActive ? 'text-white' : 'text-gray-400'
                      }`}
                    />
                    <span>{item.label}</span>
                  </div>

                  {item.badge !== undefined && item.badge !== null && (
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold font-mono ${
                        isActive
                          ? 'bg-white/25 text-white'
                          : item.alert
                          ? 'bg-rose-500 text-white animate-pulse'
                          : 'bg-slate-800 text-gray-300 border border-slate-700'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom Profile & Switcher */}
        <div className="p-3 border-t border-slate-800 space-y-2">
          {/* Guest QR Mode Quick Switch */}
          <button
            id="btn-guest-qr-mode"
            onClick={() => setActiveInterface('guest')}
            className="w-full flex items-center justify-between px-3.5 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-bold transition group"
          >
            <div className="flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-amber-400" />
              <span>Guest QR View</span>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-amber-400 transition-transform group-hover:translate-x-0.5" />
          </button>

          {/* Admin Profile Box */}
          <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-400 font-bold text-xs flex items-center justify-center">
                AD
              </div>
              <div className="leading-tight">
                <p className="text-xs font-bold text-white">Admin</p>
                <p className="text-[10px] text-slate-400">Administrator</p>
              </div>
            </div>
            <button
              id="btn-logout"
              onClick={() => {
                if (confirm('Are you sure you want to log out of the POS session?')) {
                  setActiveInterface('guest');
                }
              }}
              title="Log out"
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#0B0F17]">
        {/* Minimal Admin Top Bar */}
        <header className="h-16 bg-[#111827] border-b border-slate-800 px-4 sm:px-6 flex items-center justify-between gap-4 z-20 flex-shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsMobileSidebarOpen(true)}
              className="p-2 rounded-xl text-slate-400 hover:bg-slate-800 hover:text-white lg:hidden"
            >
              <MenuIcon className="w-5 h-5" />
            </button>

            <div>
              <h2 className="text-base font-bold text-white tracking-tight">
                {getPageTitle()}
              </h2>
            </div>
          </div>

          {/* Center Search (for quick lookup) */}
          <div className="hidden md:flex items-center flex-1 max-w-xs relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search table, order #..."
              value={globalSearch}
              onChange={e => setGlobalSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-400 focus:outline-none focus:border-amber-500 focus:bg-slate-800 transition"
            />
          </div>

          {/* Right Action Icons */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* System Status indicator */}
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-full text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Firebase Cloud Live</span>
            </div>

            {/* Batch QR Codes Modal Trigger */}
            <button
              onClick={() => setIsBatchQrModalOpen(true)}
              className="p-2 rounded-xl text-slate-400 hover:text-amber-400 hover:bg-slate-800 border border-slate-700 transition"
              title="Table QR Codes for Guest Scanning"
            >
              <QrCode className="w-4 h-4" />
            </button>

            {/* Notification Service Bell */}
            <button
              id="btn-service-notifications"
              onClick={() => setIsServiceDrawerOpen(!isServiceDrawerOpen)}
              className={`p-2 rounded-xl border relative transition ${
                pendingServiceCount > 0
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  : 'text-slate-400 hover:bg-slate-800 border-slate-700'
              }`}
              title="Guest Call Service Requests"
            >
              <Bell className="w-4 h-4" />
              {pendingServiceCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center animate-bounce">
                  {pendingServiceCount}
                </span>
              )}
            </button>

            {/* Guest View Quick Action */}
            <button
              onClick={() => setActiveInterface('guest')}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-xl shadow-md shadow-amber-500/20 transition"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Guest QR</span>
            </button>
          </div>
        </header>

        {/* Dynamic Page Content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 bg-[#0B0F17]">
          <div className="max-w-7xl mx-auto">
            {adminActiveTab === 'dashboard' && (
              <DashboardView
                onNavigateTab={(tab) => setAdminActiveTab(tab)}
                onOpenTable={handlePunchOrderFromTable}
                onOpenReceipt={order => setReceiptOrder(order)}
              />
            )}

            {adminActiveTab === 'tables' && (
              <TablesView
                onPunchOrder={handlePunchOrderFromTable}
                onOpenReceipt={order => setReceiptOrder(order)}
              />
            )}

            {adminActiveTab === 'orders' && (
              <OrdersView onOpenReceipt={order => setReceiptOrder(order)} />
            )}

            {adminActiveTab === 'kot' && <KOTView />}

            {adminActiveTab === 'manual_order' && (
              <ManualPOSView
                initialTableNumber={selectedPunchTable}
                onOrderCreated={() => {
                  setSelectedPunchTable(undefined);
                  setAdminActiveTab('orders');
                }}
              />
            )}

            {adminActiveTab === 'menu' && <MenuView />}

            {adminActiveTab === 'inventory' && <InventoryView />}

            {adminActiveTab === 'payments' && (
              <PaymentsView onOpenReceipt={order => setReceiptOrder(order)} />
            )}

            {adminActiveTab === 'reports' && <ReportsView />}

            {adminActiveTab === 'settings' && <SettingsView />}
          </div>
        </main>
      </div>

      {/* Guest Service Call Drawer */}
      {isServiceDrawerOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
            onClick={() => setIsServiceDrawerOpen(false)}
          />
          <div className="relative w-full max-w-sm bg-[#111827] h-full shadow-2xl z-10 flex flex-col border-l border-slate-800 text-slate-100">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-amber-400" />
                <h3 className="font-bold text-sm text-white">Guest Service Requests</h3>
              </div>
              <button
                onClick={() => setIsServiceDrawerOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {serviceRequests.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-400 mb-2" />
                  <p className="text-xs font-semibold text-slate-200">No Pending Calls</p>
                  <p className="text-[11px] text-slate-400">Table call requests will alert here in real time.</p>
                </div>
              ) : (
                serviceRequests.map(req => (
                  <div
                    key={req.id}
                    className={`p-3.5 rounded-xl border transition ${
                      req.status === 'pending'
                        ? 'bg-amber-500/10 border-amber-500/30'
                        : 'bg-[#161F30] border-slate-800 opacity-60'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-bold text-xs text-amber-400">
                        Table {req.tableNumber < 10 ? `0${req.tableNumber}` : req.tableNumber}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {req.createdAt}
                      </span>
                    </div>
                    <p className="text-xs text-slate-200 capitalize font-medium mb-2.5">
                      Type: {req.type ? req.type.replace('_', ' ') : 'Service Call'}
                      {req.message && ` - "${req.message}"`}
                    </p>
                    {req.status === 'pending' && (
                      <button
                        onClick={() => resolveServiceRequest(req.id)}
                        className="w-full py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-md shadow-amber-500/20"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Mark Attended</span>
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Live Service Request & Guest Order Floating Alert Toast */}
      {toastNotification && (
        <div className="fixed bottom-6 right-6 z-50 max-w-sm w-full bg-[#1F2937] border-2 border-amber-500 rounded-2xl shadow-2xl p-4 text-white animate-in slide-in-from-bottom-5 duration-300">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center flex-shrink-0 animate-bounce">
                <Bell className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black uppercase tracking-wider text-amber-400">
                    {toastNotification.type === 'order' ? 'New Guest Order' : 'Service Bell Alert'}
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono font-bold">
                    Table T{toastNotification.tableNumber < 10 ? '0' + toastNotification.tableNumber : toastNotification.tableNumber}
                  </span>
                </div>
                <p className="text-xs text-slate-200 mt-1 font-medium leading-snug">
                  {toastNotification.text}
                </p>
              </div>
            </div>
            <button
              onClick={() => setToastNotification(null)}
              className="p-1 rounded-lg text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="mt-3 flex items-center gap-2">
            {toastNotification.type !== 'order' && (
              <button
                onClick={() => {
                  resolveServiceRequest(toastNotification.id);
                  setToastNotification(null);
                }}
                className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition flex items-center justify-center gap-1 shadow-md shadow-emerald-600/20"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Mark Attended</span>
              </button>
            )}
            <button
              onClick={() => {
                if (toastNotification.type === 'order') {
                  setAdminActiveTab('orders');
                } else {
                  setIsServiceDrawerOpen(true);
                }
                setToastNotification(null);
              }}
              className="flex-1 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-bold transition flex items-center justify-center gap-1 shadow-md shadow-amber-500/20"
            >
              <span>View Details</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Receipt Modal */}
      {receiptOrder && (
        <ReceiptModal
          order={receiptOrder}
          settings={settings}
          isOpen={!!receiptOrder}
          onClose={() => setReceiptOrder(null)}
        />
      )}

      {/* Batch QR Codes Modal */}
      {isBatchQrModalOpen && (
        <TableQRModal
          tableNumber={1}
          isOpen={isBatchQrModalOpen}
          onClose={() => setIsBatchQrModalOpen(false)}
        />
      )}
    </div>
  );
};
