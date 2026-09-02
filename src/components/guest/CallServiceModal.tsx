import React, { useState } from 'react';
import { usePOS } from '../../context/POSContext';
import {
  X,
  Bell,
  GlassWater,
  Utensils,
  Receipt,
  Sparkles,
  CheckCircle2,
  MessageSquare
} from 'lucide-react';

interface CallServiceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CallServiceModal: React.FC<CallServiceModalProps> = ({
  isOpen,
  onClose
}) => {
  const { currentGuestTableNumber, addServiceRequest } = usePOS();
  const [customMsg, setCustomMsg] = useState('');
  const [submitted, setSubmitted] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSend = (type: 'call_waiter' | 'request_water' | 'request_cutlery' | 'request_bill' | 'custom', label: string) => {
    addServiceRequest(currentGuestTableNumber, type, type === 'custom' ? customMsg : undefined);
    setSubmitted(label);
    setCustomMsg('');
    setTimeout(() => {
      setSubmitted(null);
      onClose();
    }, 1800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white border border-gray-200 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl p-5">
        <div className="flex items-center justify-between pb-3 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
                Call Service Bell
              </h3>
              <p className="text-[11px] text-gray-500">
                Table {currentGuestTableNumber < 10 ? '0' + currentGuestTableNumber : currentGuestTableNumber}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {submitted ? (
          <div className="py-8 text-center space-y-2 animate-in zoom-in-95">
            <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-gray-900">Request Sent!</h4>
            <p className="text-xs text-gray-600">
              "{submitted}" has been dispatched to your floor captain.
            </p>
          </div>
        ) : (
          <div className="py-4 space-y-3">
            <p className="text-xs text-gray-600">
              Select what you need, and our service team will be right at your table:
            </p>

            <div className="grid grid-cols-2 gap-2.5">
              <button
                onClick={() => handleSend('call_waiter', 'Call Captain / Waiter')}
                className="p-3 bg-gray-50 hover:bg-amber-50/50 rounded-xl border border-gray-200 text-left flex flex-col gap-1.5 transition group hover:border-amber-400"
              >
                <Bell className="w-5 h-5 text-amber-600 group-hover:scale-110 transition-transform" />
                <span className="text-xs font-bold text-gray-900">Call Waiter</span>
                <span className="text-[10px] text-gray-500">Request captain assistance</span>
              </button>

              <button
                onClick={() => handleSend('request_water', 'Fresh Drinking Water')}
                className="p-3 bg-gray-50 hover:bg-sky-50/50 rounded-xl border border-gray-200 text-left flex flex-col gap-1.5 transition group hover:border-sky-400"
              >
                <GlassWater className="w-5 h-5 text-sky-600 group-hover:scale-110 transition-transform" />
                <span className="text-xs font-bold text-gray-900">Drinking Water</span>
                <span className="text-[10px] text-gray-500">Regular / Mineral water</span>
              </button>

              <button
                onClick={() => handleSend('request_cutlery', 'Extra Cutlery & Plates')}
                className="p-3 bg-gray-50 hover:bg-emerald-50/50 rounded-xl border border-gray-200 text-left flex flex-col gap-1.5 transition group hover:border-emerald-400"
              >
                <Utensils className="w-5 h-5 text-emerald-600 group-hover:scale-110 transition-transform" />
                <span className="text-xs font-bold text-gray-900">Cutlery / Plates</span>
                <span className="text-[10px] text-gray-500">Forks, spoons & side plates</span>
              </button>

              <button
                onClick={() => handleSend('request_bill', 'Request Bill & Payment')}
                className="p-3 bg-gray-50 hover:bg-amber-50/50 rounded-xl border border-gray-200 text-left flex flex-col gap-1.5 transition group hover:border-amber-400"
              >
                <Receipt className="w-5 h-5 text-amber-600 group-hover:scale-110 transition-transform" />
                <span className="text-xs font-bold text-gray-900">Request Bill</span>
                <span className="text-[10px] text-gray-500">Settle check at table</span>
              </button>
            </div>

            <div className="pt-2">
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Other Custom Request:
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={customMsg}
                  onChange={e => setCustomMsg(e.target.value)}
                  placeholder="e.g. Clean table, high chair, warmer tea..."
                  className="flex-1 px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:border-amber-500 shadow-sm"
                />
                <button
                  disabled={!customMsg.trim()}
                  onClick={() => handleSend('custom', customMsg)}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-white font-bold rounded-xl text-xs transition shadow-sm"
                >
                  Send
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
