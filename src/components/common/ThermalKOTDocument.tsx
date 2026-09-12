import React from 'react';
import { KOTTicket, Order, RestaurantSettings } from '../../types';

interface ThermalKOTItem {
  id?: string;
  orderItemId?: string;
  quantity: number;
  name: string;
  variant?: string;
  size?: string;
  color?: string;
  sku?: string;
  instructions?: string;
  category?: string;
  status?: string;
  cancelled?: boolean;
  cancellationReason?: string;
}

interface ThermalKOTDocumentProps {
  ticket: {
    station?: 'kitchen' | 'reception' | string;
    kotNumber: string;
    tableNumber: number;
    orderNumber?: string;
    orderSource?: string;
    waiterName?: string;
    notes?: string;
    createdAt?: string;
    filteredItems?: ThermalKOTItem[];
    items?: any[];
  };
  settings: RestaurantSettings;
  linkedOrder?: Order | null;
  paperWidth?: '80mm' | '58mm';
  id?: string;
}

export const ThermalKOTDocument: React.FC<ThermalKOTDocumentProps> = ({
  ticket,
  settings,
  linkedOrder,
  paperWidth = '80mm',
  id = 'printable-kot'
}) => {
  const is58mm = paperWidth === '58mm';

  // Normalize items array
  const items: ThermalKOTItem[] = ticket.filteredItems || (ticket.items || []).map(item => ({
    id: item.id || item.orderItemId,
    orderItemId: item.orderItemId,
    quantity: item.quantity || 1,
    name: item.name || item.nameSnapshot || 'Dish Item',
    variant: item.variant || item.variantName,
    size: item.size,
    color: item.color,
    sku: item.sku,
    instructions: item.instructions,
    category: item.category,
    status: item.status,
    cancelled: item.cancelled === true || item.status === 'CANCELLED',
    cancellationReason: item.cancellationReason
  }));

  const totalQuantity = items.reduce((sum, item) => sum + (item.quantity || 1), 0);

  // Station Label
  const stationType = (ticket.station || 'kitchen').toLowerCase();
  const stationTitle = stationType === 'reception' || stationType === 'barista'
    ? '★ RECEPTION / BARISTA KOT ★'
    : '★ KITCHEN FOOD KOT ★';

  // Waiter & Order Type details
  const captainName = ticket.waiterName || linkedOrder?.waiterName || 'Nischal Thapa';
  const orderType = (linkedOrder?.orderType || 'DINE_IN').replace('_', ' ').toUpperCase();
  const orderSource = ticket.orderSource || linkedOrder?.source || 'POS Counter';
  const orderSourceLabel = orderSource === 'GUEST_QR' ? 'Guest Self-Order (QR)' : 'POS Counter';

  const orderNum = ticket.orderNumber || linkedOrder?.orderNumber || '';
  const now = new Date();
  const dateStr = now.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
  const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const exactPrintTime = now.toLocaleTimeString();

  return (
    <div
      id={id}
      className={`thermal-kot-container font-mono text-black bg-white ${
        is58mm ? 'w-[44mm] max-w-[44mm] text-[9.5px]' : 'w-[66mm] max-w-[66mm] text-[11px]'
      } leading-snug`}
      style={{
        width: is58mm ? '44mm' : '66mm',
        maxWidth: is58mm ? '44mm' : '66mm',
        margin: '0',
        paddingLeft: '1mm',
        paddingRight: '3.5mm',
        boxSizing: 'border-box'
      }}
    >
      {/* ====================================================
          1. HEADER & STATION BANNER
         ==================================================== */}
      <div className="text-center pb-2 border-b-2 border-dashed border-black">
        <div className={`font-black uppercase tracking-tight leading-tight ${is58mm ? 'text-xs' : 'text-sm'}`}>
          {settings.restaurantName || settings.name || 'The Fat Buddha Delight Restro & Cafe'}
        </div>
        {settings.tagline && (
          <div className="text-[9px] text-neutral-800 font-sans mt-0.5 font-medium">
            {settings.tagline}
          </div>
        )}
        <div className="mt-2 py-1 px-3 border-2 border-black font-black text-xs uppercase tracking-wider inline-block">
          {stationTitle}
        </div>
      </div>

      {/* ====================================================
          2. TICKET METADATA (High Visibility for Kitchen/Bar)
         ==================================================== */}
      <div className="py-2 border-b-2 border-dashed border-black space-y-1 text-[11px]">
        {/* Prominent Table Number */}
        <div className="flex justify-between items-baseline py-0.5">
          <span className="font-bold text-xs uppercase">TABLE:</span>
          <span className="font-black text-lg tracking-tight pr-0.5">
            TABLE {ticket.tableNumber < 10 ? `0${ticket.tableNumber}` : ticket.tableNumber}
          </span>
        </div>

        <div className="flex justify-between items-center text-[10.5px]">
          <span>KOT #: <strong className="font-black">{ticket.kotNumber}</strong></span>
          {orderNum && <span className="pr-0.5">ORDER #: <strong className="font-bold">#{orderNum}</strong></span>}
        </div>

        <div className="flex justify-between items-center text-[10px]">
          <span>DATE: {dateStr}</span>
          <span className="pr-0.5">TIME: {timeStr}</span>
        </div>

        <div className="flex justify-between items-center text-[10px]">
          <span>ORDER TYPE: <strong className="font-black uppercase">{orderType}</strong></span>
          <span className="pr-0.5">SRC: <strong className="font-bold">{orderSourceLabel}</strong></span>
        </div>

        {/* Server / Captain Name (Crucial detail for Kitchen) */}
        <div className="flex justify-between items-center text-[10px] text-neutral-900 border-t border-dotted border-black/50 pt-1 mt-1">
          <span>CAPTAIN / WAITER:</span>
          <span className="font-black pr-0.5">{captainName}</span>
        </div>

        {linkedOrder?.guestName && (
          <div className="flex justify-between items-center text-[9.5px]">
            <span>GUEST:</span>
            <span className="font-bold truncate max-w-[130px] pr-0.5">{linkedOrder.guestName}</span>
          </div>
        )}

        {ticket.notes && (
          <div className="p-1.5 bg-neutral-100 border border-black rounded text-[10px] font-bold mt-1">
            ⚠️ TICKET NOTE: {ticket.notes}
          </div>
        )}
      </div>

      {/* ====================================================
          3. KITCHEN LINE ITEMS LIST
         ==================================================== */}
      <div className="py-2 border-b-2 border-dashed border-black">
        <div className="flex justify-between font-black text-[10.5px] pb-1 border-b border-black uppercase tracking-wider">
          <span className="w-8 text-left">QTY</span>
          <span className="flex-1 text-left px-1">ITEM & SPECIFICATIONS</span>
        </div>

        <div className="divide-y divide-dashed divide-black/40 pt-1.5 space-y-1.5">
          {items.map((item, idx) => (
            <div key={item.id || idx} className="pt-1.5 pb-1 avoid-break">
              <div className={`flex items-start ${item.cancelled ? 'line-through opacity-60' : ''}`}>
                {/* Large quantity indicator */}
                <span className="w-8 font-black text-sm tracking-tight pt-0.5 text-black">
                  [{item.quantity}]
                </span>

                {/* Full item description spanning ticket width */}
                <div className="flex-1 text-left px-1">
                  <div className="font-black text-[11.5px] leading-tight text-black break-words">
                    {item.name}
                    {item.cancelled && (
                      <span className="ml-1 font-mono text-[9.5px] uppercase font-bold text-red-600">
                        [CANCELLED]
                      </span>
                    )}
                  </div>

                  {/* Variant / Size info */}
                  {item.variant && (
                    <div className="text-[10px] font-bold text-neutral-800 mt-0.5">
                      ↳ Variant: {item.variant}
                    </div>
                  )}

                  {/* Shop attributes: Size & Color */}
                  {(item.size || item.color) && (
                    <div className="text-[9.5px] font-bold text-neutral-800 mt-0.5">
                      ↳ {item.size && <span>Size: {item.size} </span>}
                      {item.color && <span>Color: {item.color}</span>}
                    </div>
                  )}

                  {/* SKU */}
                  {item.sku && (
                    <div className="text-[8.5px] font-mono text-neutral-600 mt-0.5">
                      SKU: {item.sku}
                    </div>
                  )}

                  {/* Special preparation note / allergen warning */}
                  {!item.cancelled && item.instructions && (
                    <div className="text-[10px] font-black italic text-black bg-neutral-100 p-1 border border-black/40 rounded mt-1">
                      *** NOTE: {item.instructions} ***
                    </div>
                  )}

                  {/* Cancellation Reason */}
                  {item.cancelled && item.cancellationReason && (
                    <div className="text-[10px] font-black text-red-600 mt-0.5">
                      *** REASON: {item.cancellationReason} ***
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ====================================================
          4. SUMMARY & DISPATCH FOOTER
         ==================================================== */}
      <div className="pt-2 text-[11px] flex justify-between font-black">
        <span className="uppercase tracking-wider">TOTAL ITEMS:</span>
        <span className="text-sm pr-0.5">{totalQuantity} Items</span>
      </div>

      <div className="pt-3 text-center text-[10px] border-t-2 border-dashed border-black mt-2 space-y-0.5">
        <div className="font-black uppercase tracking-wider">*** TICKET DISPATCHED ***</div>
        <div className="text-[9px] text-neutral-800">Printed at {exactPrintTime}</div>
        <div className="text-[8px] text-neutral-600 pt-0.5">The Fat Buddha Delight KOT System</div>
      </div>

      {/* Feed spacing prevents the thermal printer cutter from slicing through footer */}
      <div className="h-4" style={{ minHeight: '18mm' }} />
    </div>
  );
};
