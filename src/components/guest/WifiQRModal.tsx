import React, { useState } from 'react';
import { usePOS } from '../../context/POSContext';
import { QRCodeSVG } from 'qrcode.react';
import { 
  X, 
  Wifi, 
  Copy, 
  Check, 
  Eye, 
  EyeOff, 
  Printer, 
  Download, 
  Smartphone,
  ShieldCheck,
  Sparkles
} from 'lucide-react';
import { FatBuddhaLogo } from '../common/FatBuddhaLogo';

interface WifiQRModalProps {
  isOpen: boolean;
  onClose: () => void;
  tableNumber?: number;
}

export const WifiQRModal: React.FC<WifiQRModalProps> = ({
  isOpen,
  onClose,
  tableNumber
}) => {
  const { settings, currentGuestTableNumber } = usePOS();
  const [copiedSSID, setCopiedSSID] = useState(false);
  const [copiedPass, setCopiedPass] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  if (!isOpen) return null;

  const activeTable = tableNumber ?? currentGuestTableNumber ?? 1;
  const tableDisplay = activeTable < 10 ? `0${activeTable}` : `${activeTable}`;
  
  const ssid = settings.wifiSsid || 'Fat_Buddha_Guest_WiFi';
  const password = settings.wifiPassword || 'fatbuddhadelight';

  // Standard Wi-Fi network configuration QR payload (RFC / Android / iOS native spec)
  const wifiPayload = `WIFI:T:WPA;S:${ssid};P:${password};;`;

  const copyToClipboard = (text: string, isPassword = false) => {
    navigator.clipboard.writeText(text);
    if (isPassword) {
      setCopiedPass(true);
      setTimeout(() => setCopiedPass(false), 2000);
    } else {
      setCopiedSSID(true);
      setTimeout(() => setCopiedSSID(false), 2000);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div 
      id="wifi-qr-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div 
        id="wifi-qr-modal-dialog"
        className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl border border-amber-200 flex flex-col animate-in zoom-in-95 duration-200"
      >
        {/* Header Ribbon */}
        <div className="bg-gradient-to-r from-gray-900 via-amber-950 to-gray-900 p-4 text-white flex items-center justify-between border-b border-amber-800/40 relative">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-400 shadow-inner">
              <Wifi className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-extrabold uppercase tracking-widest px-1.5 py-0.5 rounded bg-amber-500 text-black font-mono">
                  Table {tableDisplay}
                </span>
                <span className="text-[11px] text-amber-300 font-semibold flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-400" /> Free High-Speed WiFi
                </span>
              </div>
              <h3 className="text-base font-bold text-white tracking-tight leading-tight mt-0.5">
                Scan to Connect
              </h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body & Standee Card */}
        <div className="p-5 flex flex-col items-center bg-[#FDFCF7]">
          {/* Printable Acrylic Card Look */}
          <div 
            id="wifi-qr-printable-card"
            className="w-full bg-white rounded-2xl p-5 border-2 border-amber-500/80 shadow-md flex flex-col items-center text-center relative"
          >
            {/* Restaurant Brand Header */}
            <div className="flex items-center gap-2 mb-2">
              <FatBuddhaLogo size={36} alt="The Fat Buddha Delight" />
              <div className="text-left">
                <h4 className="font-serif font-black text-gray-900 text-sm leading-tight">
                  {settings.restaurantName || 'The Fat Buddha Delight'}
                </h4>
                <p className="text-[10px] text-amber-600 font-bold uppercase tracking-wider">
                  Guest Wi-Fi Network
                </p>
              </div>
            </div>

            {/* QR Code Frame with corner accents */}
            <div className="relative p-3.5 bg-white rounded-2xl border border-gray-200 shadow-inner my-2 flex items-center justify-center group">
              <QRCodeSVG
                value={wifiPayload}
                size={180}
                level="M"
                includeMargin={false}
                className="w-44 h-44 transition-transform duration-200"
              />
              {/* Corner Design Accents */}
              <div className="absolute top-1.5 left-1.5 w-3 h-3 border-t-2 border-l-2 border-amber-500 rounded-tl-sm pointer-events-none" />
              <div className="absolute top-1.5 right-1.5 w-3 h-3 border-t-2 border-r-2 border-amber-500 rounded-tr-sm pointer-events-none" />
              <div className="absolute bottom-1.5 left-1.5 w-3 h-3 border-b-2 border-l-2 border-amber-500 rounded-bl-sm pointer-events-none" />
              <div className="absolute bottom-1.5 right-1.5 w-3 h-3 border-b-2 border-r-2 border-amber-500 rounded-br-sm pointer-events-none" />
            </div>

            {/* Instructions */}
            <div className="flex items-center gap-1.5 text-[11px] text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-200 font-medium mb-3 mt-1">
              <Smartphone className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
              <span>Point phone camera to join automatically</span>
            </div>

            {/* Network & Password Badges with Copy Action */}
            <div className="w-full space-y-2 text-left text-xs">
              {/* Network SSID */}
              <div className="flex items-center justify-between p-2.5 bg-gray-50 rounded-xl border border-gray-200">
                <div className="overflow-hidden mr-2">
                  <div className="text-[10px] uppercase font-bold text-gray-400">Network (SSID)</div>
                  <div className="font-mono font-bold text-gray-900 text-xs truncate">
                    {ssid}
                  </div>
                </div>
                <button
                  onClick={() => copyToClipboard(ssid, false)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition flex-shrink-0 ${
                    copiedSSID 
                      ? 'bg-emerald-600 text-white' 
                      : 'bg-amber-100 hover:bg-amber-200 text-amber-900'
                  }`}
                  title="Copy Network Name"
                >
                  {copiedSSID ? (
                    <>
                      <Check className="w-3 h-3" />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>

              {/* Password */}
              <div className="flex items-center justify-between p-2.5 bg-gray-50 rounded-xl border border-gray-200">
                <div className="overflow-hidden mr-2">
                  <div className="text-[10px] uppercase font-bold text-gray-400">Password</div>
                  <div className="font-mono font-bold text-gray-900 text-xs truncate">
                    {showPassword ? password : '••••••••••••'}
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => setShowPassword(!showPassword)}
                    className="p-1.5 rounded-lg text-gray-500 hover:text-gray-800 hover:bg-gray-200 transition"
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    onClick={() => copyToClipboard(password, true)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition ${
                      copiedPass 
                        ? 'bg-emerald-600 text-white' 
                        : 'bg-amber-500 hover:bg-amber-600 text-white shadow-xs'
                    }`}
                    title="Copy Password"
                  >
                    {copiedPass ? (
                      <>
                        <Check className="w-3 h-3" />
                        <span>Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Security / Privacy Badge */}
          <div className="mt-3 flex items-center justify-between w-full text-[11px] text-gray-500 px-1">
            <div className="flex items-center gap-1 text-gray-500">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>WPA2 Secure Restaurant Network</span>
            </div>
            <button
              onClick={handlePrint}
              className="text-amber-700 hover:text-amber-900 font-bold flex items-center gap-1 text-[11px] hover:underline"
            >
              <Printer className="w-3 h-3" />
              <span>Print</span>
            </button>
          </div>
        </div>

        {/* Done / Close Button */}
        <div className="p-3 bg-gray-100 border-t border-gray-200 flex items-center justify-end">
          <button
            onClick={onClose}
            className="w-full py-2.5 bg-gray-900 hover:bg-black text-white font-bold rounded-xl text-xs transition shadow"
          >
            Got It, Back to Menu
          </button>
        </div>
      </div>
    </div>
  );
};
