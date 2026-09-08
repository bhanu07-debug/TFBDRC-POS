import React from 'react';
import { Order, RestaurantSettings } from '../../types';
import { QRCodeSVG } from 'qrcode.react';

interface ThermalReceiptDocumentProps {
  order: Order;
  settings: RestaurantSettings;
  paperWidth?: '80mm' | '58mm';
  id?: string;
}

export const ThermalReceiptDocument: React.FC<ThermalReceiptDocumentProps> = ({
  order,
  settings,
  paperWidth = '80mm',
  id = 'printable-receipt'
}) => {
  const is58mm = paperWidth === '58mm';
  const currency = settings.currencySymbol || 'Rs.';

  const originUrl = typeof window !== 'undefined' ? window.location.origin : 'https://fatbuddha.cafe';
  const feedbackUrl = `${originUrl}/feedback?order=${order.orderNumber || order.id}`;

  const subtotal = order.subtotal ?? order.total ?? 0;
  const discount = order.discountAmount ?? order.discount ?? 0;
  const discountedSubtotal = Math.max(0, subtotal - discount);
  const serviceCharge = order.serviceCharge ?? (settings.serviceChargeEnabled ? Math.round(discountedSubtotal * (settings.serviceChargePercent || 10) / 100) : 0);
  const vat = order.vat ?? order.taxAmount ?? (settings.vatEnabled ? Math.round((discountedSubtotal + serviceCharge) * (settings.vatRate || 13) / 100) : 0);
  const grandTotal = order.finalAmount ?? (discountedSubtotal + serviceCharge + vat);

  const isPaid = (order.paymentStatus || '').toLowerCase() === 'paid';
  const totalItemQty = order.items.reduce((s, i) => s + (i.quantity || 1), 0);

  // Formatted dates
  const orderDate = new Date(order.createdAt || Date.now()).toLocaleDateString([], {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
  const orderTime = new Date(order.createdAt || Date.now()).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit'
  });

  return (
    <div
      id={id}
      className={`thermal-receipt-container font-mono text-black bg-white mx-auto ${
        is58mm ? 'w-[48mm] max-w-[48mm] text-[9.5px]' : 'w-[72mm] max-w-[72mm] text-[11px]'
      } leading-snug`}
      style={{
        width: is58mm ? '48mm' : '72mm',
        maxWidth: is58mm ? '48mm' : '72mm',
        margin: '0 auto',
        boxSizing: 'border-box'
      }}
    >
      {/* ====================================================
          1. RESTAURANT HEADER (Centered)
         ==================================================== */}
      <div className="text-center pb-2 border-b-2 border-dashed border-black">
        <div className={`font-black uppercase tracking-tight ${is58mm ? 'text-xs' : 'text-sm'}`}>
          {settings.restaurantName || settings.name || 'The Fat Buddha Delight Restro & Cafe'}
        </div>
        {settings.tagline && (
          <div className={`font-sans text-neutral-800 mt-0.5 font-medium ${is58mm ? 'text-[8.5px]' : 'text-[9.5px]'}`}>
            {settings.tagline}
          </div>
        )}
        <div className={`mt-1 break-words text-neutral-900 ${is58mm ? 'text-[8.5px]' : 'text-[9.5px]'}`}>
          {settings.address || 'Lumbini Road, Nepal'}
        </div>
        <div className={`mt-0.5 font-bold ${is58mm ? 'text-[8.5px]' : 'text-[9.5px]'}`}>
          Tel: {settings.phone || '+977-9800000000'}
        </div>
        {settings.email && (
          <div className={`break-words text-neutral-800 ${is58mm ? 'text-[8px]' : 'text-[9px]'}`}>
            Email: {settings.email}
          </div>
        )}
        <div className={`font-black mt-1 uppercase tracking-wider ${is58mm ? 'text-[9px]' : 'text-[10px]'}`}>
          PAN No.: {settings.panNumber || settings.panNo || '302194821'}
        </div>
      </div>

      {/* ====================================================
          2. INVOICE & ORDER METADATA
         ==================================================== */}
      <div className="py-2 border-b border-dashed border-black space-y-1 text-[10px]">
        <div className="flex justify-between items-center">
          <span>INVOICE: <strong className="font-black text-black">{order.orderNumber || order.id}</strong></span>
          <span className="font-black text-xs">TABLE: T{order.tableNumber < 10 ? '0' + order.tableNumber : order.tableNumber}</span>
        </div>
        <div className="flex justify-between items-center text-[9.5px]">
          <span>DATE: {orderDate}</span>
          <span>TIME: {orderTime}</span>
        </div>
        <div className="flex justify-between items-center text-[9.5px]">
          <span>TYPE: <strong className="uppercase font-bold">{(order.orderType || 'DINE_IN').replace('_', ' ')}</strong></span>
          <span>SRC: <strong className="uppercase font-bold">{(order.source || 'POS').replace('_', ' ')}</strong></span>
        </div>
        <div className="flex justify-between items-center text-[9px] text-neutral-800">
          <span>CAPTAIN: <strong className="font-bold">{order.waiterName || 'Staff (Captain)'}</strong></span>
          {order.kotNumber && <span>KOT: {order.kotNumber}</span>}
        </div>
        {order.guestName && (
          <div className="flex justify-between items-center pt-0.5 text-[9px]">
            <span className="truncate max-w-[130px]">GUEST: {order.guestName}</span>
            {order.guestPhone && <span>TEL: {order.guestPhone}</span>}
          </div>
        )}
      </div>

      {/* ====================================================
          3. ITEMIZED ORDER TABLE (Full 72mm / 48mm Width)
         ==================================================== */}
      <div className="py-2 border-b-2 border-dashed border-black">
        {/* Table Column Headers */}
        <div className="flex justify-between font-black pb-1 border-b border-black text-[9.5px] uppercase tracking-wider">
          <span className="w-6 text-center">QTY</span>
          <span className="flex-1 text-left px-1">ITEM</span>
          <span className="w-12 text-right">RATE</span>
          <span className="w-14 text-right">AMT</span>
        </div>

        {/* Item Rows */}
        <div className="divide-y divide-dashed divide-neutral-400 pt-1">
          {order.items.map((item, idx) => {
            const qty = item.quantity || 1;
            const unitPrice = item.price ?? item.priceSnapshot ?? 0;
            const itemTotal = unitPrice * qty;
            const itemName = item.name || item.nameSnapshot || 'Menu Item';

            return (
              <div key={item.id || idx} className="py-1 avoid-break">
                <div className="flex items-start justify-between text-[10px]">
                  <span className="w-6 text-center font-black pt-0.5">{qty}</span>
                  <span className="flex-1 font-bold text-left px-1 leading-tight break-words text-black">
                    {itemName}
                  </span>
                  <span className="w-12 text-right text-[9.5px] pt-0.5 text-neutral-800">
                    {unitPrice.toFixed(0)}
                  </span>
                  <span className="w-14 text-right font-black pt-0.5 text-black">
                    {itemTotal.toFixed(0)}
                  </span>
                </div>

                {/* Variant / Size */}
                {item.variantName && (
                  <div className="text-[8.5px] text-neutral-800 pl-7">
                    * Size: {item.variantName}
                  </div>
                )}

                {/* Add-ons */}
                {item.addOns && item.addOns.length > 0 && (
                  <div className="text-[8.5px] text-neutral-800 pl-7">
                    + Add: {item.addOns.join(', ')}
                  </div>
                )}

                {/* Special Instructions */}
                {item.instructions && (
                  <div className="text-[8.5px] text-neutral-900 font-semibold pl-7 italic">
                    ↳ Note: {item.instructions}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ====================================================
          4. TOTALS & TAX CALCULATIONS
         ==================================================== */}
      <div className="py-2 border-b-2 border-dashed border-black space-y-1 text-[10.5px]">
        <div className="flex justify-between">
          <span>Subtotal ({totalItemQty} items):</span>
          <span className="font-bold">{currency} {subtotal.toFixed(2)}</span>
        </div>

        {discount > 0 && (
          <div className="flex justify-between font-medium">
            <span>Discount {order.discountReason ? `(${order.discountReason})` : ''}:</span>
            <span>-{currency} {discount.toFixed(2)}</span>
          </div>
        )}

        {discount > 0 && (
          <div className="flex justify-between text-[9.5px] text-neutral-800">
            <span>Taxable Subtotal:</span>
            <span>{currency} {discountedSubtotal.toFixed(2)}</span>
          </div>
        )}

        {(settings.serviceChargeEnabled || serviceCharge > 0) && (
          <div className="flex justify-between text-[9.5px] text-neutral-800">
            <span>Service Charge ({settings.serviceChargePercent || 10}%):</span>
            <span>{currency} {serviceCharge.toFixed(2)}</span>
          </div>
        )}

        {(settings.vatEnabled || vat > 0) && (
          <div className="flex justify-between text-[9.5px] text-neutral-800">
            <span>VAT ({settings.vatRate || 13}%):</span>
            <span>{currency} {vat.toFixed(2)}</span>
          </div>
        )}

        {/* Grand Total Header */}
        <div className="flex justify-between items-baseline pt-1.5 border-t-2 border-black text-black">
          <span className="font-black text-xs uppercase tracking-wider">GRAND TOTAL:</span>
          <span className="font-black text-sm">{currency} {grandTotal.toFixed(2)}</span>
        </div>
      </div>

      {/* ====================================================
          5. PAYMENT STATUS & SETTLEMENT DETAILS
         ==================================================== */}
      <div className="py-2 text-center border-b border-dashed border-black text-[9.5px] space-y-0.5">
        <div>
          <span>PAYMENT STATUS: </span>
          <strong className={`uppercase ${isPaid ? 'font-black' : 'font-bold'}`}>
            {order.paymentStatus || 'UNPAID'}
          </strong>
          {order.paymentMethod && (
            <span className="font-bold"> ({order.paymentMethod.toUpperCase()})</span>
          )}
        </div>
        {order.paidAt && (
          <div className="text-[8.5px] text-neutral-700">
            Settled At: {new Date(order.paidAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
        )}
      </div>

      {/* ====================================================
          6. FOOTER QR & APPRECIATION MESSAGE
         ==================================================== */}
      <div className="pt-2.5 pb-4 text-center flex flex-col items-center space-y-1 avoid-break">
        <div className="p-1 bg-white border border-black rounded inline-block">
          <QRCodeSVG value={feedbackUrl} size={is58mm ? 48 : 58} level="M" />
        </div>
        <div className="text-[8.5px] font-bold tracking-tight">
          Scan to Rate Experience & View Digital Bill
        </div>
        <div className="text-[9.5px] font-black uppercase pt-1 tracking-wider">
          *** THANK YOU FOR DINING WITH US ***
        </div>
        <div className="text-[8px] text-neutral-700">
          Please Come Again! May Buddha Bless Your Day!
        </div>
        <div className="text-[7.5px] text-neutral-500 pt-0.5">
          The Fat Buddha Cloud POS System
        </div>
      </div>

      {/* Feed padding ensures automatic thermal paper cutter doesn't cut through last line */}
      <div className="h-4" style={{ minHeight: '16mm' }} />
    </div>
  );
};
