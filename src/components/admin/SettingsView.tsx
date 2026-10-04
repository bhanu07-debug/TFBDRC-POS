import React, { useState, useEffect } from 'react';
import { usePOS } from '../../context/POSContext';
import {
  Store,
  Printer,
  QrCode,
  Save,
  CheckCircle2,
  Cloud,
  RotateCcw,
  Wifi,
  Phone,
  Mail,
  Star,
  Upload,
  MessageCircle,
  Send,
  Smartphone,
  Key,
  Eye,
  EyeOff,
  Lock,
  ShieldCheck,
  Check,
  Copy,
  ExternalLink,
  AlertCircle,
  Sliders,
  Sparkles
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { FatBuddhaLogo } from '../common/FatBuddhaLogo';
import { WifiQRModal } from '../guest/WifiQRModal';
import {
  openWhatsAppReceipt,
  openSMSReceipt,
  formatReceiptTextMessage
} from '../../utils/receiptShareUtils';
import { Order } from '../../types';

type SettingsTab = 'messaging' | 'profile' | 'hardware' | 'qr_standees';

export const SettingsView: React.FC = () => {
  const { settings, updateSettings, resetToDemoData, tables } = usePOS();
  const [activeTab, setActiveTab] = useState<SettingsTab>('messaging');
  const [formData, setFormData] = useState({ ...settings });
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [isQrSheetVisible, setIsQrSheetVisible] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [batchMode, setBatchMode] = useState<'order' | 'wifi' | 'dual'>('dual');
  const [isWifiPreviewOpen, setIsWifiPreviewOpen] = useState(false);

  // Security masking state for tokens
  const [showTwilioToken, setShowTwilioToken] = useState(false);
  const [showWhatsAppToken, setShowWhatsAppToken] = useState(false);

  // Test Simulator State
  const [testMobile, setTestMobile] = useState('9841000000');
  const [testSentNotice, setTestSentNotice] = useState<string | null>(null);

  useEffect(() => {
    setFormData({
      ...settings,
      name: settings.name ?? settings.restaurantName ?? '',
      tagline: settings.tagline ?? '',
      address: settings.address ?? '',
      phone: settings.phone ?? '',
      panNumber: settings.panNumber ?? settings.panNo ?? '302194821',
      panNo: settings.panNumber ?? settings.panNo ?? '302194821',
      wifiSsid: settings.wifiSsid ?? 'Delight_Restaurant_Guest',
      wifiPassword: (settings.wifiPassword && settings.wifiPassword !== 'fatbuddhadelight' && settings.wifiPassword !== 'delightnature')
        ? settings.wifiPassword
        : 'Newdelight@123',
      currencySymbol: settings.currencySymbol ?? 'Rs.',
      autoPrintKOT: settings.autoPrintKOT ?? true,
      soundAlerts: settings.soundAlerts ?? true,
      googleReviewUrl: settings.googleReviewUrl ?? 'https://g.page/r/TheFatBuddhaDelight/review',
      googleReviewQrImage: settings.googleReviewQrImage ?? '/google-review-qr.svg',

      // Twilio SMS & WhatsApp Business API Credentials
      twilioAccountSid: settings.twilioAccountSid ?? '',
      twilioAuthToken: settings.twilioAuthToken ?? '',
      twilioPhoneNumber: settings.twilioPhoneNumber ?? '',
      whatsappBusinessAccountId: settings.whatsappBusinessAccountId ?? settings.whatsappBusinessId ?? '',
      whatsappBusinessId: settings.whatsappBusinessAccountId ?? settings.whatsappBusinessId ?? '',
      whatsappPhoneNumberId: settings.whatsappPhoneNumberId ?? '',
      whatsappAccessToken: settings.whatsappAccessToken ?? '',
      receiptDeliveryMethod: settings.receiptDeliveryMethod ?? 'direct_share',
      autoSendReceiptOnSettlement: settings.autoSendReceiptOnSettlement ?? true,
    });
  }, [settings]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateSettings(formData);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const handleReset = async () => {
    if (confirm('Reset all 11 tables to Available and clear test orders, payments, and KOTs for a clean initial development slate?')) {
      setIsResetting(true);
      await resetToDemoData();
      setIsResetting(false);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2000);
    }
  };

  // Dispatch a simulated test receipt to verify format and delivery
  const handleSendTestReceipt = (channel: 'whatsapp' | 'sms') => {
    const sampleOrder: Order = {
      id: 'TEST-ORD-0001',
      orderNumber: 'TEST-0001',
      sessionId: 'TEST-SES-01',
      tableId: 'T01',
      tableNumber: 1,
      items: [
        {
          id: 'test-item-1',
          orderId: 'TEST-ORD-0001',
          menuItemId: 'm1',
          name: 'Steamed Chicken Momo',
          nameSnapshot: 'Steamed Chicken Momo',
          variantName: 'Special Chili Dip',
          price: 280,
          priceSnapshot: 280,
          quantity: 2,
          kotDestination: 'KITCHEN' as const
        },
        {
          id: 'test-item-2',
          orderId: 'TEST-ORD-0001',
          menuItemId: 'm2',
          name: 'Iced Himalayan Cold Coffee',
          nameSnapshot: 'Iced Himalayan Cold Coffee',
          price: 180,
          priceSnapshot: 180,
          quantity: 1,
          kotDestination: 'RECEPTION' as const
        }
      ] as any,
      subtotal: 740,
      discount: 0,
      vat: 0,
      total: 740,
      finalAmount: 740,
      status: 'completed',
      paymentStatus: 'paid',
      paymentMethod: 'cash',
      orderType: 'dine_in',
      cashierName: 'Dilip Chaudhary',
      waiterName: 'Dilip Chaudhary',
      createdBy: 'Dilip Chaudhary',
      guestName: 'Sample Diner',
      guestPhone: testMobile,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    if (channel === 'whatsapp') {
      openWhatsAppReceipt(sampleOrder, formData as any, testMobile);
      setTestSentNotice('Sample WhatsApp receipt opened in WhatsApp Web / App!');
    } else {
      openSMSReceipt(sampleOrder, formData as any, testMobile);
      setTestSentNotice('Sample SMS receipt opened in SMS composer!');
    }
    setTimeout(() => setTestSentNotice(null), 3500);
  };

  const originUrl = typeof window !== 'undefined' ? window.location.origin : 'https://fatbuddha.cafe';

  const isTwilioConfigured = Boolean(formData.twilioAccountSid && formData.twilioAccountSid.trim().length > 5);
  const isWhatsAppConfigured = Boolean(
    (formData.whatsappBusinessAccountId && formData.whatsappBusinessAccountId.trim().length > 3) ||
    (formData.whatsappPhoneNumberId && formData.whatsappPhoneNumberId.trim().length > 3)
  );

  return (
    <div className="space-y-6">
      {/* Settings Header */}
      <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-lg font-bold text-gray-900 tracking-tight">
              Settings & Integrations
            </h2>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Cloud Firestore Synced
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Configure Twilio SMS, WhatsApp Business API, restaurant profile, taxes, and print table QR standees.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleSave}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-xs transition cursor-pointer"
          >
            {savedSuccess ? (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Changes Saved!</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Save All Settings</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Modern Navigation Tabs */}
      <div className="bg-white p-1.5 rounded-2xl border border-gray-200 shadow-xs flex items-center gap-1.5 overflow-x-auto text-xs font-bold">
        <button
          type="button"
          onClick={() => setActiveTab('messaging')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition cursor-pointer flex-shrink-0 ${
            activeTab === 'messaging'
              ? 'bg-amber-500 text-white shadow-xs'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
          }`}
        >
          <MessageCircle className="w-4 h-4" />
          <span>Paperless Receipts (Twilio & WhatsApp)</span>
          {(isTwilioConfigured || isWhatsAppConfigured) && (
            <span className={`w-2 h-2 rounded-full ${activeTab === 'messaging' ? 'bg-white' : 'bg-emerald-500'}`} />
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('profile')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition cursor-pointer flex-shrink-0 ${
            activeTab === 'profile'
              ? 'bg-amber-500 text-white shadow-xs'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
          }`}
        >
          <Store className="w-4 h-4" />
          <span>Restaurant Brand Profile</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('hardware')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition cursor-pointer flex-shrink-0 ${
            activeTab === 'hardware'
              ? 'bg-amber-500 text-white shadow-xs'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
          }`}
        >
          <Printer className="w-4 h-4" />
          <span>Taxes, Audio & Hardware</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('qr_standees')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition cursor-pointer flex-shrink-0 ${
            activeTab === 'qr_standees'
              ? 'bg-amber-500 text-white shadow-xs'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
          }`}
        >
          <QrCode className="w-4 h-4" />
          <span>Table 01-10 QR Standees</span>
        </button>
      </div>

      {/* ====================================================
          TAB 1: PAPERLESS RECEIPT DELIVERY (TWILIO SMS & WHATSAPP API)
         ==================================================== */}
      {activeTab === 'messaging' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Highlight Banner */}
          <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-slate-900 p-5 rounded-2xl border border-emerald-500/30 text-white shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 flex-shrink-0">
                <Send className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-bold text-base text-white">
                    Paperless Digital Receipt Dispatch
                  </h3>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                    Dual Gateway Active
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-0.5 max-w-xl">
                  Automatically delivers itemized tax invoices & digital receipts directly to customer WhatsApp and SMS upon bill settlement. Saves thermal paper roll costs and gives diners an instant digital proof of payment.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <div className="px-3 py-2 rounded-xl bg-slate-800/90 border border-slate-700 text-right">
                <div className="text-[10px] text-slate-400 uppercase font-bold">Twilio SMS</div>
                <div className={`font-bold flex items-center gap-1 justify-end ${isTwilioConfigured ? 'text-emerald-400' : 'text-amber-400'}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${isTwilioConfigured ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                  <span>{isTwilioConfigured ? 'Configured' : 'Setup Ready'}</span>
                </div>
              </div>

              <div className="px-3 py-2 rounded-xl bg-slate-800/90 border border-slate-700 text-right">
                <div className="text-[10px] text-slate-400 uppercase font-bold">WhatsApp API</div>
                <div className={`font-bold flex items-center gap-1 justify-end ${isWhatsAppConfigured ? 'text-emerald-400' : 'text-amber-400'}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${isWhatsAppConfigured ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                  <span>{isWhatsAppConfigured ? 'Configured' : 'Setup Ready'}</span>
                </div>
              </div>
            </div>
          </div>

          <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 1. Twilio SMS Configuration Card */}
            <div className="p-5 bg-white rounded-2xl border border-gray-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                    <Smartphone className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-gray-900 uppercase tracking-wider">
                      Twilio SMS Gateway Configuration
                    </h4>
                    <span className="text-[10px] text-gray-500">
                      Standard SMS receipt delivery to any Nepali or global mobile
                    </span>
                  </div>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-bold border border-blue-200">
                  SMS API
                </span>
              </div>

              <div className="space-y-3.5 text-xs">
                {/* Twilio SID */}
                <div>
                  <label className="block text-gray-700 font-bold mb-1">
                    Twilio Account SID (String Identifier)
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={formData.twilioAccountSid ?? ''}
                      onChange={e => setFormData({ ...formData, twilioAccountSid: e.target.value })}
                      placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                      className="w-full pl-3 pr-8 py-2 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 font-mono text-xs focus:outline-none focus:border-amber-500 font-medium"
                    />
                    <Key className="w-3.5 h-3.5 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2" />
                  </div>
                  <span className="text-[10px] text-gray-400 mt-0.5 block">
                    Found on your Twilio Console Dashboard under "Account Info".
                  </span>
                </div>

                {/* Twilio Auth Token */}
                <div>
                  <label className="block text-gray-700 font-bold mb-1">
                    Twilio Auth Token
                  </label>
                  <div className="relative">
                    <input
                      type={showTwilioToken ? 'text' : 'password'}
                      value={formData.twilioAuthToken ?? ''}
                      onChange={e => setFormData({ ...formData, twilioAuthToken: e.target.value })}
                      placeholder="••••••••••••••••••••••••••••••••"
                      className="w-full pl-3 pr-10 py-2 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 font-mono text-xs focus:outline-none focus:border-amber-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowTwilioToken(!showTwilioToken)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 p-1"
                      title={showTwilioToken ? 'Hide secret token' : 'Show secret token'}
                    >
                      {showTwilioToken ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <span className="text-[10px] text-gray-400 mt-0.5 block">
                    Used to securely authenticate receipt dispatch requests.
                  </span>
                </div>

                {/* Twilio Sender Phone Number */}
                <div>
                  <label className="block text-gray-700 font-bold mb-1">
                    Twilio Sender Phone Number / Messaging Service SID
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={formData.twilioPhoneNumber ?? ''}
                      onChange={e => setFormData({ ...formData, twilioPhoneNumber: e.target.value })}
                      placeholder="+1234567890 or MGxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                      className="w-full pl-3 pr-8 py-2 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 font-mono text-xs focus:outline-none focus:border-amber-500 font-medium"
                    />
                    <Phone className="w-3.5 h-3.5 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2" />
                  </div>
                  <span className="text-[10px] text-gray-400 mt-0.5 block">
                    Your Twilio-provided number in E.164 format (+1...) or Messaging Service SID.
                  </span>
                </div>
              </div>
            </div>

            {/* 2. WhatsApp Business API Configuration Card */}
            <div className="p-5 bg-white rounded-2xl border border-gray-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                    <MessageCircle className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-gray-900 uppercase tracking-wider">
                      WhatsApp Business API Configuration
                    </h4>
                    <span className="text-[10px] text-gray-500">
                      Meta Cloud API & Direct 1-Click WhatsApp Receipts
                    </span>
                  </div>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-bold border border-emerald-200">
                  Meta API
                </span>
              </div>

              <div className="space-y-3.5 text-xs">
                {/* WhatsApp Business ID */}
                <div>
                  <label className="block text-gray-700 font-bold mb-1">
                    WhatsApp API Business Account ID (WABA ID)
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={formData.whatsappBusinessAccountId ?? formData.whatsappBusinessId ?? ''}
                      onChange={e => setFormData({
                        ...formData,
                        whatsappBusinessAccountId: e.target.value,
                        whatsappBusinessId: e.target.value
                      })}
                      placeholder="e.g. 109283746592817"
                      className="w-full pl-3 pr-8 py-2 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 font-mono text-xs focus:outline-none focus:border-amber-500 font-medium"
                    />
                    <Key className="w-3.5 h-3.5 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2" />
                  </div>
                  <span className="text-[10px] text-gray-400 mt-0.5 block">
                    Found in Meta Business Suite &gt; WhatsApp Accounts &gt; Business ID.
                  </span>
                </div>

                {/* WhatsApp Phone Number ID */}
                <div>
                  <label className="block text-gray-700 font-bold mb-1">
                    WhatsApp Phone Number ID (Sender ID)
                  </label>
                  <input
                    type="text"
                    value={formData.whatsappPhoneNumberId ?? ''}
                    onChange={e => setFormData({ ...formData, whatsappPhoneNumberId: e.target.value })}
                    placeholder="e.g. 104829384756192"
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 font-mono text-xs focus:outline-none focus:border-amber-500 font-medium"
                  />
                  <span className="text-[10px] text-gray-400 mt-0.5 block">
                    The Phone Number ID assigned to your verified restaurant business number.
                  </span>
                </div>

                {/* WhatsApp Access Token */}
                <div>
                  <label className="block text-gray-700 font-bold mb-1">
                    WhatsApp System User Access Token
                  </label>
                  <div className="relative">
                    <input
                      type={showWhatsAppToken ? 'text' : 'password'}
                      value={formData.whatsappAccessToken ?? ''}
                      onChange={e => setFormData({ ...formData, whatsappAccessToken: e.target.value })}
                      placeholder="EAAGxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx..."
                      className="w-full pl-3 pr-10 py-2 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 font-mono text-xs focus:outline-none focus:border-amber-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowWhatsAppToken(!showWhatsAppToken)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 p-1"
                      title={showWhatsAppToken ? 'Hide access token' : 'Show access token'}
                    >
                      {showWhatsAppToken ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <span className="text-[10px] text-gray-400 mt-0.5 block">
                    Permanent System User Token generated under Meta Developer Portal.
                  </span>
                </div>
              </div>
            </div>

            {/* 3. Automation & Delivery Preferences */}
            <div className="p-5 bg-white rounded-2xl border border-gray-200 shadow-xs space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
                <Sliders className="w-4 h-4 text-amber-500" />
                <h4 className="text-xs font-black text-gray-900 uppercase tracking-wider">
                  Delivery Automation & Workflow
                </h4>
              </div>

              <div className="space-y-3.5 text-xs">
                {/* Auto send toggle */}
                <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-gray-900 block">
                      Auto-Prompt WhatsApp Receipt at Settlement
                    </span>
                    <span className="text-[11px] text-gray-500">
                      When cashier collects payment, immediately prepare WhatsApp message for customer
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={formData.autoSendReceiptOnSettlement ?? true}
                    onChange={e => setFormData({ ...formData, autoSendReceiptOnSettlement: e.target.checked })}
                    className="w-4 h-4 text-amber-500 rounded border-gray-300 focus:ring-amber-400 cursor-pointer"
                  />
                </div>

                {/* Delivery Method Choice */}
                <div>
                  <label className="block text-gray-700 font-bold mb-1.5">
                    Primary Paperless Delivery Method
                  </label>
                  <select
                    value={formData.receiptDeliveryMethod ?? 'direct_share'}
                    onChange={e => setFormData({ ...formData, receiptDeliveryMethod: e.target.value as any })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 font-bold text-xs focus:outline-none focus:border-amber-500"
                  >
                    <option value="direct_share">
                      1-Click Instant Share (WhatsApp Web/App & Native SMS) - Recommended
                    </option>
                    <option value="both">
                      Hybrid Gateway (Direct Share + Twilio / WhatsApp Cloud API)
                    </option>
                    <option value="twilio_sms">
                      Twilio SMS Cloud Gateway
                    </option>
                    <option value="whatsapp_api">
                      Meta WhatsApp Cloud API
                    </option>
                  </select>
                  <p className="text-[11px] text-gray-500 mt-1">
                    1-Click Instant Share opens WhatsApp and SMS directly from POS without requiring per-message API fees.
                  </p>
                </div>
              </div>
            </div>

            {/* 4. Live Test Message Dispatch Simulator */}
            <div className="p-5 bg-gradient-to-br from-amber-50/60 to-emerald-50/60 rounded-2xl border border-amber-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-amber-200/60">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-600" />
                  <h4 className="text-xs font-black text-gray-900 uppercase tracking-wider">
                    Test Receipt Simulator
                  </h4>
                </div>
                <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full border border-amber-200">
                  Instant Test
                </span>
              </div>

              <p className="text-xs text-gray-600">
                Send a sample digital receipt to your phone right now to verify formatting, itemized tables, and the digital receipt standee URL.
              </p>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block text-gray-700 font-bold mb-1">
                    Recipient Mobile Number (Nepal or International)
                  </label>
                  <div className="relative">
                    <Phone className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="tel"
                      value={testMobile}
                      onChange={e => setTestMobile(e.target.value)}
                      placeholder="e.g. 9841234567 or +9779841234567"
                      className="w-full pl-8 pr-3 py-2 bg-white border border-gray-300 rounded-xl text-gray-900 font-mono font-bold text-xs focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => handleSendTestReceipt('whatsapp')}
                    className="py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>Test WhatsApp</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSendTestReceipt('sms')}
                    className="py-2.5 px-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Smartphone className="w-4 h-4" />
                    <span>Test SMS</span>
                  </button>
                </div>

                {testSentNotice && (
                  <div className="p-2.5 bg-emerald-100 border border-emerald-300 text-emerald-900 rounded-xl text-xs font-semibold flex items-center gap-2 animate-in fade-in">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    <span>{testSentNotice}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Save Action */}
            <div className="lg:col-span-2 pt-2">
              <button
                type="submit"
                className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm rounded-xl shadow-xs transition flex items-center justify-center gap-2 cursor-pointer"
              >
                {savedSuccess ? (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Credentials Successfully Saved to Cloud Firestore!</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Save Twilio & WhatsApp Configuration</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ====================================================
          TAB 2: RESTAURANT BRAND PROFILE
         ==================================================== */}
      {activeTab === 'profile' && (
        <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in duration-200">
          <div className="p-5 bg-white rounded-2xl border border-gray-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-gray-200">
              <div className="flex items-center gap-2 text-gray-900 font-bold text-xs uppercase tracking-wider">
                <Store className="w-4 h-4 text-amber-500" />
                <span>Restaurant Brand Profile</span>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-amber-700 font-medium">
                <FatBuddhaLogo size={26} alt="Official Logo" />
                <span className="font-bold">Official Logo Active</span>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-gray-700 font-bold mb-1">Restaurant Name</label>
                <input
                  type="text"
                  value={formData.name ?? ''}
                  onChange={e => setFormData({ ...formData, name: e.target.value, restaurantName: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-gray-800 focus:outline-none focus:border-amber-500 font-semibold"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-bold mb-1">Brand Tagline</label>
                <input
                  type="text"
                  value={formData.tagline ?? ''}
                  onChange={e => setFormData({ ...formData, tagline: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-gray-800 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-bold mb-1">Address / Location</label>
                <input
                  type="text"
                  value={formData.address ?? ''}
                  onChange={e => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-gray-800 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-700 font-bold mb-1">Phone Helpline</label>
                  <input
                    type="text"
                    value={formData.phone ?? ''}
                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-gray-800 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 font-bold mb-1">PAN NO</label>
                  <input
                    type="text"
                    value={formData.panNumber ?? formData.panNo ?? ''}
                    onChange={e => setFormData({ ...formData, panNumber: e.target.value, panNo: e.target.value })}
                    placeholder="e.g. 302194821"
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-gray-800 focus:outline-none focus:border-amber-500 font-mono font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-700 font-bold mb-1">Guest WiFi SSID</label>
                  <input
                    type="text"
                    value={formData.wifiSsid ?? ''}
                    onChange={e => setFormData({ ...formData, wifiSsid: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-gray-800 focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 font-bold mb-1">WiFi Password</label>
                  <input
                    type="text"
                    value={formData.wifiPassword ?? ''}
                    onChange={e => setFormData({ ...formData, wifiPassword: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-gray-800 focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsWifiPreviewOpen(true)}
                className="w-full py-2.5 px-3 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <Wifi className="w-4 h-4 text-amber-600" />
                <span>Preview & Print Guest WiFi QR Standee</span>
              </button>
            </div>
          </div>

          <div className="p-5 bg-white rounded-2xl border border-gray-200 shadow-xs space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-gray-200 text-xs font-bold text-gray-900 uppercase tracking-wider">
              <Cloud className="w-4 h-4 text-amber-500" />
              <span>Multi-Device Real-Time Sync</span>
            </div>
            <p className="text-xs text-gray-500 leading-relaxed">
              All menu modifications, table states, guest self-orders, walkie-talkie transmissions, and digital receipts sync in real-time across all smartphones, tablets, and cashier terminals via Google Cloud Firestore.
            </p>
            <div className="pt-2">
              <button
                type="submit"
                className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-xs cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>Save Profile Changes</span>
              </button>
            </div>
          </div>
        </form>
      )}

      {/* ====================================================
          TAB 3: TAXES, AUDIO & HARDWARE
         ==================================================== */}
      {activeTab === 'hardware' && (
        <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in duration-200">
          <div className="p-5 bg-white rounded-2xl border border-gray-200 shadow-xs space-y-4">
            <div className="flex items-center gap-2 text-gray-900 font-bold text-xs uppercase tracking-wider pb-2 border-b border-gray-200">
              <Printer className="w-4 h-4 text-amber-500" />
              <span>Hardware & POS Chimes</span>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-gray-700 font-bold mb-1">Currency Symbol</label>
                <input
                  type="text"
                  value={formData.currencySymbol ?? 'Rs.'}
                  onChange={e => setFormData({ ...formData, currencySymbol: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-gray-800 focus:outline-none focus:border-amber-500 font-mono font-bold"
                />
              </div>

              {/* Sound alert switch */}
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 flex items-center justify-between">
                <div>
                  <span className="font-bold text-gray-900 block">KOT Audio Chime Alert</span>
                  <span className="text-[11px] text-gray-500">Play chime when new order arrives</span>
                </div>
                <input
                  type="checkbox"
                  checked={formData.soundAlerts ?? true}
                  onChange={e => setFormData({ ...formData, soundAlerts: e.target.checked })}
                  className="w-4 h-4 text-amber-500 rounded border-gray-300 focus:ring-amber-400 cursor-pointer"
                />
              </div>

              {/* Auto Print KOT */}
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 flex items-center justify-between">
                <div>
                  <span className="font-bold text-gray-900 block">Auto-Print KOT</span>
                  <span className="text-[11px] text-gray-500">Auto-spool kitchen tickets upon confirmation</span>
                </div>
                <input
                  type="checkbox"
                  checked={formData.autoPrintKOT}
                  onChange={e => setFormData({ ...formData, autoPrintKOT: e.target.checked })}
                  className="w-4 h-4 text-amber-500 rounded border-gray-300 focus:ring-amber-400 cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Bill Receipt Google Review QR */}
          <div className="p-5 bg-white rounded-2xl border border-gray-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-gray-200">
              <div className="flex items-center gap-2 text-gray-900 font-bold text-xs uppercase tracking-wider">
                <Star className="w-4 h-4 text-amber-500 fill-amber-400" />
                <span>Receipt Google Review QR</span>
              </div>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                Active on Bills
              </span>
            </div>

            <p className="text-xs text-gray-500">
              This QR code appears on customer thermal bills and digital receipts. Customers can scan it to rate the restaurant on Google.
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-4 p-3.5 bg-neutral-50 rounded-xl border border-gray-200">
              <div className="p-2 bg-white rounded-lg border border-gray-300 shadow-xs flex-shrink-0 text-center">
                <img
                  src={formData.googleReviewQrImage || '/google-review-qr.svg'}
                  alt="Google Review QR"
                  className="w-20 h-20 object-contain mx-auto"
                />
              </div>

              <div className="flex-1 space-y-2 w-full text-xs">
                <input
                  type="text"
                  value={formData.googleReviewUrl ?? ''}
                  onChange={e => setFormData({ ...formData, googleReviewUrl: e.target.value })}
                  placeholder="https://g.page/r/.../review"
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-gray-800 font-mono text-xs focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-xs cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Save Hardware & Review Settings</span>
            </button>
          </div>
        </form>
      )}

      {/* ====================================================
          TAB 4: TABLE 01-10 QR STANDEES
         ==================================================== */}
      {activeTab === 'qr_standees' && (
        <div id="printable-qr-sheet" className="p-6 bg-white text-gray-900 rounded-2xl shadow-xs border border-gray-200 space-y-6 animate-in fade-in duration-200 print:m-0 print:p-0 print:border-none">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-200 print:hidden">
            <div>
              <h3 className="text-sm font-bold uppercase text-gray-900">
                Ready-to-Print Standee QR Sheet (Table 01 to Table 11)
              </h3>
              <p className="text-xs text-gray-500">
                Print on cardstock or acrylic standees. Diners scan to open menu and connect to Guest Wi-Fi directly.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div className="bg-gray-100 rounded-xl p-1 border border-gray-200 flex items-center gap-1 text-xs">
                <button
                  type="button"
                  onClick={() => setBatchMode('order')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition ${
                    batchMode === 'order' ? 'bg-amber-500 text-white shadow-xs' : 'text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  Order QRs
                </button>
                <button
                  type="button"
                  onClick={() => setBatchMode('wifi')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition ${
                    batchMode === 'wifi' ? 'bg-amber-500 text-white shadow-xs' : 'text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  WiFi QRs
                </button>
                <button
                  type="button"
                  onClick={() => setBatchMode('dual')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition ${
                    batchMode === 'dual' ? 'bg-amber-500 text-white shadow-xs' : 'text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  Dual (Both)
                </button>
              </div>

              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-2 bg-gray-900 hover:bg-black text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-xs transition cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Print All {tables.length} Standees</span>
              </button>
            </div>
          </div>

          <div className={`grid gap-4 ${batchMode === 'dual' ? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3' : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5'}`}>
            {tables.map(tbl => {
              const tableUrl = `${originUrl}/?table=${tbl.number}`;
              const ssid = formData.wifiSsid || settings.wifiSsid || 'Delight_Restaurant_Guest';
              const pass = formData.wifiPassword || settings.wifiPassword || 'Newdelight@123';
              const wifiPayload = `WIFI:T:WPA;S:${ssid};P:${pass};;`;

              return (
                <div
                  key={tbl.id}
                  className="p-4 bg-white border border-gray-300 rounded-2xl flex flex-col items-center text-center space-y-2 shadow-xs break-inside-avoid"
                >
                  <FatBuddhaLogo size={32} alt="Logo" />
                  <div className="text-[11px] font-bold tracking-wider uppercase text-amber-600">
                    {settings.restaurantName || 'The Fat Buddha Delight'}
                  </div>

                  <div className="w-full py-1 bg-gray-900 text-white rounded-lg font-bold font-mono text-xs">
                    TABLE {tbl.number < 10 ? `0${tbl.number}` : tbl.number}
                  </div>

                  <div className="p-2 bg-white rounded-xl border border-gray-200 shadow-2xs">
                    <QRCodeSVG
                      value={tableUrl}
                      size={100}
                      level="H"
                      includeMargin={false}
                    />
                  </div>

                  <div className="text-[9px] font-bold text-gray-500 pt-1 border-t border-gray-200 w-full">
                    SCAN TO VIEW MENU & ORDER
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* WiFi QR Modal Preview */}
      <WifiQRModal
        isOpen={isWifiPreviewOpen}
        onClose={() => setIsWifiPreviewOpen(false)}
      />
    </div>
  );
};
