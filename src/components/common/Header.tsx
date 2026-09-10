import React from 'react';
import { usePOS } from '../../context/POSContext';
import { FatBuddhaLogo } from './FatBuddhaLogo';
import {
  UtensilsCrossed,
  LayoutDashboard,
  ChefHat,
  Smartphone,
  RotateCcw,
  Bell,
  Volume2,
  VolumeX,
  QrCode,
  Store,
  Sparkles,
  ChevronDown
} from 'lucide-react';

export const Header: React.FC = () => {
  const {
    activeInterface,
    setActiveInterface,
    tables,
    kots,
    orders,
    currentGuestTableNumber,
    setCurrentGuestTableNumber,
    serviceRequests,
    resolveServiceRequest,
    resetToDemoData,
    settings,
    updateSettings
  } = usePOS();

  const [showServicePopup, setShowServicePopup] = React.useState(false);
  const [showTableSelect, setShowTableSelect] = React.useState(false);

  const activeTablesCount = tables.filter(t => t.status === 'occupied' || t.status === 'billing').length;
  const pendingKotsCount = kots.filter(k => k.status === 'pending' || k.status === 'in_progress').length;
  const pendingRequests = serviceRequests.filter(r => r.status === 'pending');

  const todayRevenue = orders
    .filter(o => o.paymentStatus === 'paid')
    .reduce((sum, o) => sum + o.finalAmount, 0);

  return (
    <header className="bg-[#1F2937] border-b border-gray-700 sticky top-0 z-40 shadow-xl text-white">
      {/* Top Notification Bar / Mode Switcher */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-2 sm:gap-4">
          {/* Brand Logo & Name */}
          <div className="flex items-center gap-3">
            <FatBuddhaLogo size={42} alt="The Fat Buddha Delight Logo" />
            <div className="hidden sm:block">
              <div className="flex items-center gap-2">
                <span className="font-bold tracking-wide text-amber-50 text-base lg:text-lg leading-tight">
                  The Fat Buddha Delight
                </span>
                <span className="text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/40 font-bold">
                  Restro & Cafe
                </span>
              </div>
              <p className="text-xs text-gray-400 font-sans truncate max-w-[280px]">
                {settings.tagline}
              </p>
            </div>
          </div>

          {/* Center Interface View Switcher */}
          <div className="flex items-center p-1 bg-gray-900/90 rounded-xl border border-gray-700">
            <button
              id="btn-nav-admin"
              onClick={() => setActiveInterface('admin')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeInterface === 'admin'
                  ? 'bg-amber-500 text-white shadow-md shadow-amber-500/30 font-bold'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Admin POS</span>
              <span className="md:hidden">POS</span>
            </button>

            <button
              id="btn-nav-guest"
              onClick={() => setActiveInterface('guest')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeInterface === 'guest'
                  ? 'bg-amber-500 text-white shadow-md shadow-amber-500/30 font-bold'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Guest QR Menu</span>
              <span className="md:hidden">Guest QR</span>
              <span className="px-1.5 py-0.2 rounded text-[10px] bg-gray-900 text-amber-300 font-mono font-bold">
                T{currentGuestTableNumber < 10 ? '0' + currentGuestTableNumber : currentGuestTableNumber}
              </span>
            </button>

            <button
              id="btn-nav-kds"
              onClick={() => setActiveInterface('kds')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeInterface === 'kds'
                  ? 'bg-amber-500 text-white shadow-md shadow-amber-500/30 font-bold'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`}
            >
              <ChefHat className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Kitchen KDS</span>
              <span className="md:hidden">Kitchen</span>
              {pendingKotsCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-rose-500 text-white font-mono font-bold animate-pulse">
                  {pendingKotsCount}
                </span>
              )}
            </button>
          </div>

          {/* Right Action Icons & Live Quick Stats */}
          <div className="flex items-center gap-2">
            {/* Quick Table Switcher for testing Guest QR */}
            {activeInterface === 'guest' && (
              <div className="relative">
                <button
                  id="btn-switch-guest-table"
                  onClick={() => setShowTableSelect(!showTableSelect)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 bg-gray-800 hover:bg-gray-700 text-amber-300 rounded-lg text-xs font-medium border border-gray-600 transition"
                  title="Switch Table for Guest QR"
                >
                  <QrCode className="w-3.5 h-3.5 text-amber-400" />
                  <span>Table {currentGuestTableNumber < 10 ? '0' + currentGuestTableNumber : currentGuestTableNumber}</span>
                  <ChevronDown className="w-3 h-3 text-gray-400" />
                </button>

                {showTableSelect && (
                  <div className="absolute right-0 mt-2 w-64 p-3 bg-white text-gray-900 border border-gray-200 rounded-xl shadow-2xl z-50">
                    <p className="text-xs font-bold text-gray-700 mb-2">Simulate scanning Table QR:</p>
                    <div className="grid grid-cols-4 gap-1.5 max-h-56 overflow-y-auto pr-1">
                      {tables.map(tbl => (
                        <button
                          key={tbl.id}
                          onClick={() => {
                            setCurrentGuestTableNumber(tbl.number);
                            setShowTableSelect(false);
                          }}
                          className={`py-1.5 text-xs font-mono font-medium rounded-md text-center transition ${
                            currentGuestTableNumber === tbl.number
                              ? 'bg-amber-500 text-white font-bold shadow-sm'
                              : 'bg-gray-100 hover:bg-gray-200 text-gray-800'
                          }`}
                        >
                          T{tbl.number < 10 ? '0' + tbl.number : tbl.number}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Service Requests Bell for Admin */}
            <div className="relative">
              <button
                id="btn-service-requests"
                onClick={() => setShowServicePopup(!showServicePopup)}
                className={`p-2 rounded-lg text-gray-300 hover:text-white hover:bg-gray-800 transition relative ${
                  pendingRequests.length > 0 ? 'text-amber-400' : ''
                }`}
                title="Service Bell Requests"
              >
                <Bell className="w-4 h-4" />
                {pendingRequests.length > 0 && (
                  <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-rose-500 rounded-full animate-ping" />
                )}
                {pendingRequests.length > 0 && (
                  <span className="absolute -top-1 -right-1 px-1.5 py-0.2 bg-rose-600 text-white rounded-full text-[9px] font-bold">
                    {pendingRequests.length}
                  </span>
                )}
              </button>

              {showServicePopup && (
                <div className="absolute right-0 mt-2 w-80 bg-white text-gray-900 border border-gray-200 rounded-xl shadow-2xl p-3 z-50">
                  <div className="flex items-center justify-between pb-2 border-b border-gray-200 mb-2">
                    <span className="text-xs font-bold text-gray-900 uppercase">Table Call Bell Alerts</span>
                    <span className="text-[10px] text-rose-600 font-bold bg-rose-50 px-2 py-0.5 rounded-full">{pendingRequests.length} Pending</span>
                  </div>
                  {pendingRequests.length === 0 ? (
                    <p className="text-xs text-gray-500 py-3 text-center">No active service requests.</p>
                  ) : (
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {pendingRequests.map(req => (
                        <div key={req.id} className="p-2 bg-gray-50 rounded-lg border border-gray-200 flex items-start justify-between gap-2">
                          <div>
                            <span className="text-xs font-bold text-amber-700">
                              Table {req.tableNumber < 10 ? '0' + req.tableNumber : req.tableNumber}
                            </span>
                            <p className="text-[11px] text-gray-800 font-medium capitalize">{req.type.replace('_', ' ')}</p>
                            {req.message && <p className="text-[10px] text-gray-600">{req.message}</p>}
                            <span className="text-[9px] text-gray-400">{req.createdAt}</span>
                          </div>
                          <button
                            onClick={() => resolveServiceRequest(req.id)}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[10px] font-bold transition shadow-sm"
                          >
                            Mark Done
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Cloud Sync Status Indicator */}
            <div className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 bg-gray-800/80 rounded-lg border border-gray-700 text-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-gray-300 font-medium text-[11px]">Firestore Synced</span>
            </div>

            {/* Sound Toggle */}
            <button
              onClick={() => updateSettings({ soundAlerts: !settings.soundAlerts })}
              className={`p-2 rounded-lg text-gray-300 hover:text-white hover:bg-gray-800 transition ${
                settings.soundAlerts ? 'text-amber-400' : 'text-gray-500'
              }`}
              title={settings.soundAlerts ? 'Sound Alerts Enabled' : 'Sound Alerts Muted'}
            >
              {settings.soundAlerts ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

            {/* Reset Clean Data Button */}
            <button
              id="btn-reset-demo"
              onClick={() => {
                if (window.confirm('Reset all 10 restaurant tables to Available and clear transaction orders/KOTs in Firestore?')) {
                  resetToDemoData();
                }
              }}
              className="hidden lg:flex items-center gap-1 px-2.5 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-200 hover:text-white rounded-lg text-xs font-medium border border-gray-600 transition"
              title="Reset 10 Tables to Available and clear test orders"
            >
              <RotateCcw className="w-3.5 h-3.5 text-gray-400" />
              <span>Reset 10 Tables</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
