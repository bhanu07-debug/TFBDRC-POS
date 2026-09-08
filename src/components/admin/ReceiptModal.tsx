import React, { useState } from 'react';
import { Order, RestaurantSettings } from '../../types';
import { usePOS } from '../../context/POSContext';
import { DEFAULT_SETTINGS } from '../../services/firebaseService';
import { X, Printer, Receipt } from 'lucide-react';
import { ThermalReceiptDocument } from '../common/ThermalReceiptDocument';
import { ThermalPrintPortal } from '../common/ThermalPrintPortal';
import { triggerThermalPrint } from '../../utils/printUtils';

interface ReceiptModalProps {
  order: Order | null;
  settings?: RestaurantSettings;
  isOpen: boolean;
  onClose: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  order,
  settings: propSettings,
  isOpen,
  onClose
}) => {
  const { settings: contextSettings } = usePOS();
  const settings = propSettings || contextSettings || DEFAULT_SETTINGS;
  const [paperWidth, setPaperWidth] = useState<'80mm' | '58mm'>('80mm');

  if (!isOpen || !order) return null;

  const handlePrint = () => {
    triggerThermalPrint(paperWidth);
  };

  return (
    <>
      {/* Root portal for thermal printing directly under <body> */}
      <ThermalPrintPortal active={isOpen}>
        <ThermalReceiptDocument
          order={order}
          settings={settings}
          paperWidth={paperWidth}
          id="printable-receipt"
        />
      </ThermalPrintPortal>

      {/* Screen Interactive Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="bg-white border border-gray-200 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
          {/* Modal Top Bar */}
          <div className="p-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-2">
              <Printer className="w-4 h-4 text-amber-500" />
              <div>
                <span className="text-sm font-bold text-gray-900 uppercase tracking-wider block">
                  Thermal Bill / Receipt Preview
                </span>
                <span className="text-[11px] text-gray-500">
                  Order #{order.orderNumber || order.id} • Table {order.tableNumber < 10 ? '0' + order.tableNumber : order.tableNumber}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Paper Width Selector (80mm standard vs 58mm compact) */}
              <div className="flex bg-gray-200 p-0.5 rounded-lg text-[10px] font-bold">
                <button
                  type="button"
                  onClick={() => setPaperWidth('80mm')}
                  className={`px-2.5 py-1 rounded-md transition ${paperWidth === '80mm' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-600 hover:text-gray-900'}`}
                >
                  80mm (Standard)
                </button>
                <button
                  type="button"
                  onClick={() => setPaperWidth('58mm')}
                  className={`px-2.5 py-1 rounded-md transition ${paperWidth === '58mm' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-600 hover:text-gray-900'}`}
                >
                  58mm
                </button>
              </div>

              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition"
                title="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Receipt Scrollable Preview Container */}
          <div className="p-4 sm:p-6 overflow-y-auto bg-neutral-100 flex justify-center flex-1">
            <div className="p-4 sm:p-5 bg-white rounded-xl shadow-md border border-gray-300">
              <ThermalReceiptDocument
                order={order}
                settings={settings}
                paperWidth={paperWidth}
                id="receipt-screen-preview"
              />
            </div>
          </div>

          {/* Modal Footer Controls */}
          <div className="p-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between gap-3 flex-shrink-0">
            <button
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-white border border-gray-200 hover:bg-gray-100 text-gray-700 text-xs font-semibold shadow-xs"
            >
              Close
            </button>
            <button
              id="btn-print-receipt-action"
              onClick={handlePrint}
              className="flex-1 flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-xs transition transform active:scale-98"
            >
              <Printer className="w-4 h-4" />
              <span>Print Bill ({paperWidth})</span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
};
