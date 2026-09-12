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
      className={`thermal-receipt-container font-mono text-black bg-white ${
        is58mm ? 'w-[44mm] max-w-[44mm] text-[9px]' : 'w-[66mm] max-w-[66mm] text-[10.5px]'
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
          1. RESTAURANT HEADER (Centered)
         ==================================================== */}
      <div className="text-center pb-2 border-b-2 border-dashed border-black">
        <div className="flex justify-center mb-1.5">
          <img
            src="/logo.svg"
            alt="The Fat Buddha Delight Logo"
            className={`${is58mm ? 'w-8 h-8' : 'w-10 h-10'} object-contain rounded-full border border-black/20`}
          />
        </div>
        <div className={`font-black uppercase tracking-tight leading-tight ${is58mm ? 'text-xs' : 'text-sm'}`}>
          {settings.restaurantName || settings.name || 'The Fat Buddha Delight Restro & Cafe'}
        </div>
        {settings.tagline && (
          <div className={`font-sans text-neutral-800 mt-0.5 font-medium ${is58mm ? 'text-[8px]' : 'text-[9px]'}`}>
            {settings.tagline}
          </div>
        )}
        <div className={`mt-1 break-words text-neutral-900 ${is58mm ? 'text-[8px]' : 'text-[9px]'}`}>
          {settings.address || 'Lumbini Road, Nepal'}
        </div>
        <div className={`mt-0.5 font-bold ${is58mm ? 'text-[8.5px]' : 'text-[9.5px]'}`}>
          Tel: {settings.phone || '+977-9800000000'}
        </div>
        {settings.email && (
          <div className={`break-words text-neutral-800 ${is58mm ? 'text-[7.5px]' : 'text-[8.5px]'}`}>
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
          <span className="font-black text-xs pr-1">TABLE: T{order.tableNumber < 10 ? '0' + order.tableNumber : order.tableNumber}</span>
        </div>
        <div className="flex justify-between items-center text-[9.5px]">
          <span>DATE: {orderDate}</span>
          <span className="pr-1 font-medium">TIME: {orderTime}</span>
        </div>
        <div className="flex justify-between items-center text-[9.5px]">
          <span>TYPE: <strong className="uppercase font-bold">{(order.orderType || 'DINE_IN').replace('_', ' ')}</strong></span>
          <span className="pr-1">SRC: <strong className="uppercase font-bold">{(order.source || 'POS').replace('_', ' ')}</strong></span>
        </div>
        <div className="flex justify-between items-center text-[9px] text-neutral-800">
          <span>CAPTAIN: <strong className="font-bold">{order.waiterName || 'Nischal Thapa'}</strong></span>
          {(order.cashierName || (order as any).settledBy) ? (
            <span className="pr-1">CASHIER: <strong className="font-bold">{order.cashierName || (order as any).settledBy}</strong></span>
          ) : order.kotNumber ? (
            <span className="pr-1">KOT: {order.kotNumber}</span>
          ) : null}
        </div>
        {order.guestName && (
          <div className="flex justify-between items-center pt-0.5 text-[9px]">
            <span className="truncate max-w-[130px]">GUEST: {order.guestName}</span>
            {order.guestPhone && <span className="pr-1">TEL: {order.guestPhone}</span>}
          </div>
        )}
      </div>

      {/* ====================================================
          3. ITEMIZED ORDER TABLE (Safe 66mm / 44mm Width)
         ==================================================== */}
      <div className="py-2 border-b-2 border-dashed border-black">
        {/* Table Column Headers */}
        <div className="flex justify-between font-black pb-1 border-b border-black text-[9.5px] uppercase tracking-wider">
          <span className="w-5 text-center">QTY</span>
          <span className="flex-1 text-left px-1.5">ITEM</span>
          <span className="w-11 text-right">RATE</span>
          <span className="w-13 text-right pr-0.5">AMT</span>
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
                  <span className="w-5 text-center font-black pt-0.5">{qty}</span>
                  <span className="flex-1 font-bold text-left px-1.5 leading-tight break-words text-black">
                    {itemName}
                  </span>
                  <span className="w-11 text-right text-[9.5px] pt-0.5 text-neutral-800">
                    {unitPrice.toFixed(0)}
                  </span>
                  <span className="w-13 text-right font-black pt-0.5 text-black pr-0.5">
                    {itemTotal.toFixed(0)}
                  </span>
                </div>

                {/* Variant / Size */}
                {item.variantName && (
                  <div className="text-[8.5px] text-neutral-800 pl-6">
                    * Variant: {item.variantName}
                  </div>
                )}

                {/* Shop Clothing attributes: Size & Color */}
                {(item.size || item.color) && (
                  <div className="text-[8.5px] text-neutral-800 pl-6">
                    {item.size && <span>Size: {item.size} </span>}
                    {item.color && <span>Color: {item.color}</span>}
                  </div>
                )}

                {/* SKU */}
                {item.sku && (
                  <div className="text-[8px] font-mono text-neutral-600 pl-6">
                    SKU: {item.sku}
                  </div>
                )}

                {/* Add-ons */}
                {item.addOns && item.addOns.length > 0 && (
                  <div className="text-[8.5px] text-neutral-800 pl-6">
                    + Add: {item.addOns.join(', ')}
                  </div>
                )}

                {/* Special Instructions */}
                {item.instructions && (
                  <div className="text-[8.5px] text-neutral-900 font-semibold pl-6 italic">
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
      <div className="py-2 border-b-2 border-dashed border-black space-y-1 text-[10px]">
        <div className="flex justify-between">
          <span>Subtotal ({totalItemQty} items):</span>
          <span className="font-bold pr-0.5">{currency} {subtotal.toFixed(2)}</span>
        </div>

        {discount > 0 && (
          <div className="flex justify-between font-medium">
            <span>Discount {order.discountReason ? `(${order.discountReason})` : ''}:</span>
            <span className="pr-0.5">-{currency} {discount.toFixed(2)}</span>
          </div>
        )}

        {discount > 0 && (
          <div className="flex justify-between text-[9px] text-neutral-800">
            <span>Taxable Subtotal:</span>
            <span className="pr-0.5">{currency} {discountedSubtotal.toFixed(2)}</span>
          </div>
        )}

        {(settings.serviceChargeEnabled || serviceCharge > 0) && (
          <div className="flex justify-between text-[9px] text-neutral-800">
            <span>Service Charge ({settings.serviceChargePercent || 10}%):</span>
            <span className="pr-0.5">{currency} {serviceCharge.toFixed(2)}</span>
          </div>
        )}

        {(settings.vatEnabled || vat > 0) && (
          <div className="flex justify-between text-[9px] text-neutral-800">
            <span>VAT ({settings.vatRate || 13}%):</span>
            <span className="pr-0.5">{currency} {vat.toFixed(2)}</span>
          </div>
        )}

        {/* Grand Total Header */}
        <div className="flex justify-between items-baseline pt-1.5 border-t-2 border-black text-black">
          <span className="font-black text-xs uppercase tracking-wider">GRAND TOTAL:</span>
          <span className="font-black text-sm pr-0.5">{currency} {grandTotal.toFixed(2)}</span>
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
        {(order.cashierName || (order as any).settledBy || order.createdBy) && (
          <div className="font-bold text-[9px] uppercase tracking-wide">
            SETTLED BY: <strong>{order.cashierName || (order as any).settledBy || order.createdBy}</strong>
          </div>
        )}
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
          <QRCodeSVG value={feedbackUrl} size={is58mm ? 44 : 54} level="M" />
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
