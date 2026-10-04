import React from 'react';
import { Order, RestaurantSettings } from '../../types';
import { QRCodeCanvas } from 'qrcode.react';

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
  const feedbackUrl = `${originUrl}/feedback?order=${order?.orderNumber || order?.id || 'ORD-0001'}`;
  const reviewQrUrl = settings.googleReviewUrl;

  const items = Array.isArray(order?.items) ? order.items : [];
  const subtotal = Number(order?.subtotal ?? order?.total ?? 0);
  const discount = Number(order?.discountAmount ?? order?.discount ?? 0);
  const discountedSubtotal = Math.max(0, subtotal - discount);
  const serviceCharge = Number(order?.serviceCharge ?? (settings.serviceChargeEnabled ? Math.round(discountedSubtotal * (Number(settings.serviceChargePercent) || 10) / 100) : 0));
  const vat = Number(order?.vat ?? order?.taxAmount ?? (settings.vatEnabled ? Math.round((discountedSubtotal + serviceCharge) * (Number(settings.vatRate) || 13) / 100) : 0));
  const grandTotal = Number(order?.finalAmount ?? (discountedSubtotal + serviceCharge + vat));

  const isPaid = (order?.paymentStatus || '').toLowerCase() === 'paid';
  const totalItemQty = items.reduce((s, i) => s + (Number(i.quantity) || 1), 0);

  const tableNum = typeof order?.tableNumber === 'number' ? order.tableNumber : parseInt(String(order?.tableNumber || 1), 10) || 1;
  const tableNumStr = tableNum < 10 ? `0${tableNum}` : `${tableNum}`;

  // Clean sequential invoice number starting with 0001 (e.g. ORD-0001)
  const displayInvoiceNumber = (() => {
    if (order?.orderNumber && String(order.orderNumber).trim()) {
      return String(order.orderNumber).trim();
    }
    if (order?.id && typeof order.id === 'string' && /^ORD-\d+/i.test(order.id)) {
      return order.id.split('-').slice(0, 2).join('-');
    }
    return order?.id ? String(order.id) : 'ORD-0001';
  })();

  // Sanitize order type and staff names safely
  const rawOrderType = String(order?.orderType || 'DINE_IN').replace(/_/g, ' ');
  const displayOrderType = (rawOrderType.includes('MANUAL') || rawOrderType.includes('ADMIN'))
    ? 'DINE IN'
    : rawOrderType;

  const rawCaptain = String(order?.waiterName || 'Dilip Chaudhary');
  const displayCaptain = (rawCaptain.includes('MANUAL') || rawCaptain === 'POS Staff')
    ? 'Dilip Chaudhary'
    : rawCaptain;

  const rawCashier = String(
    order?.cashierName ||
    (order as any)?.settledBy ||
    (typeof order?.createdBy === 'string' && order.createdBy !== 'ADMIN_MANUAL' ? order.createdBy : '') ||
    'Dilip Chaudhary'
  );
  const displayCashier = (rawCashier.includes('MANUAL') || rawCashier === 'POS Staff')
    ? 'Dilip Chaudhary'
    : (rawCashier.includes('(') ? rawCashier.split('(')[0].trim() : rawCashier);

  // Extract Guest Name & Phone safely
  const rawGuestName = String(order?.guestName || (order as any)?.customerName || '').trim();
  const rawGuestPhone = String(order?.guestPhone || (order as any)?.customerPhone || '').trim();
  const createdByStr = typeof order?.createdBy === 'string' ? order.createdBy : '';
  const fallbackGuestMatch = !rawGuestName && createdByStr && createdByStr.includes('(')
    ? createdByStr.match(/^([^(]+)\s*\(([^)]+)\)$/)
    : null;
  const displayGuestName = rawGuestName || (fallbackGuestMatch ? fallbackGuestMatch[1].trim() : '');
  const displayGuestPhone = rawGuestPhone || (fallbackGuestMatch && fallbackGuestMatch[2] !== 'Guest' ? fallbackGuestMatch[2].trim() : '');

  // Formatted dates
  const orderDate = new Date(order?.createdAt || Date.now()).toLocaleDateString([], {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
  const orderTime = new Date(order?.createdAt || Date.now()).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit'
  });

  return (
    <div
      id={id}
      className={`thermal-receipt-container font-mono text-black bg-white ${
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
          1. RESTAURANT HEADER (Centered)
         ==================================================== */}
      <div className="text-center pb-2 border-b-2 border-dashed border-black">
        <div className={`font-black uppercase tracking-tight leading-tight ${is58mm ? 'text-xs' : 'text-sm'}`}>
          {settings.restaurantName || settings.name || 'The Fat Buddha Delight'}
        </div>
        <div className={`font-black uppercase tracking-tight leading-tight ${is58mm ? 'text-[9.5px]' : 'text-xs'}`}>
          Restro & Cafe
        </div>
        {settings.tagline && (
          <div className={`font-sans text-neutral-800 mt-0.5 font-medium ${is58mm ? 'text-[8px]' : 'text-[9px]'}`}>
            {settings.tagline}
          </div>
        )}
        <div className={`mt-1 break-words text-neutral-900 ${is58mm ? 'text-[8px]' : 'text-[9px]'}`}>
          {settings.address || 'Gonahiya-09, Bhairahawa, Nepal'}
        </div>
        <div className={`mt-0.5 font-bold ${is58mm ? 'text-[8.5px]' : 'text-[9.5px]'}`}>
          Tel: {settings.phone || '+9779811553592'}
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
          <span>INVOICE: <strong className="font-black text-black">{displayInvoiceNumber}</strong></span>
          <span className="font-black text-xs pr-1">TABLE: T{tableNumStr}</span>
        </div>
        <div className="flex justify-between items-center text-[9.5px]">
          <span>DATE: {orderDate}</span>
          <span className="pr-1 font-medium">TIME: {orderTime}</span>
        </div>
        <div className="flex justify-between items-center text-[9.5px]">
          <span>TYPE: <strong className="uppercase font-bold">{displayOrderType}</strong></span>
          <span className="pr-1 font-bold">{isPaid ? 'PAID INVOICE' : 'TAX INVOICE'}</span>
        </div>
        <div className="flex justify-between items-center text-[9px] text-neutral-800">
          <span>CAPTAIN: <strong className="font-bold">{displayCaptain}</strong></span>
          {displayCashier ? (
            <span className="pr-1">CASHIER: <strong className="font-bold">{displayCashier}</strong></span>
          ) : order.kotNumber ? (
            <span className="pr-1">KOT: {order.kotNumber}</span>
          ) : null}
        </div>
        {(displayGuestName || displayGuestPhone) && (
          <div className="flex justify-between items-center pt-1 border-t border-dotted border-black/40 text-[9.5px]">
            <span className="truncate max-w-[155px]">
              GUEST: <strong className="font-black text-black">{displayGuestName || 'Valued Guest'}</strong>
            </span>
            {displayGuestPhone && (
              <span className="pr-1 font-black text-black font-mono">
                MOB: {displayGuestPhone}
              </span>
            )}
          </div>
        )}
      </div>

      {/* ====================================================
          3. ITEMIZED ORDER TABLE (Safe 72mm / 48mm Width)
         ==================================================== */}
      <div className="py-2 border-b-2 border-dashed border-black">
        <table className="w-full border-collapse text-black" style={{ tableLayout: 'fixed', width: '100%' }}>
          <thead>
            <tr className="border-b-2 border-black font-black text-[10px] uppercase tracking-wider">
              <th className="w-[12%] text-left py-0.5 whitespace-nowrap">QTY</th>
              <th className="w-[52%] text-left px-1.5 py-0.5">ITEM</th>
              <th className="w-[18%] text-right py-0.5 whitespace-nowrap">RATE</th>
              <th className="w-[18%] text-right py-0.5 whitespace-nowrap pr-0.5">AMT</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-dashed divide-neutral-400">
            {items.map((item, idx) => {
              const qty = Number(item.quantity) || 1;
              const unitPrice = Number(item.price ?? item.priceSnapshot ?? 0);
              const itemTotal = unitPrice * qty;
              const itemName = item.name || item.nameSnapshot || (item as any).title || 'Menu Item';

              return (
                <tr key={item.id || idx} className="py-1 avoid-break text-[10.5px]">
                  <td className="font-black align-top py-1 whitespace-nowrap">{qty}</td>
                  <td className="font-bold align-top px-1.5 py-1 leading-snug break-words text-black">
                    <div>{itemName}</div>
                    {item.variantName && (
                      <div className="text-[8.5px] font-normal text-neutral-800">
                        * Variant: {item.variantName}
                      </div>
                    )}
                    {(item.size || item.color) && (
                      <div className="text-[8.5px] font-normal text-neutral-800">
                        {item.size && <span>Size: {item.size} </span>}
                        {item.color && <span>Color: {item.color}</span>}
                      </div>
                    )}
                    {item.sku && (
                      <div className="text-[8px] font-mono font-normal text-neutral-600">
                        SKU: {item.sku}
                      </div>
                    )}
                    {item.addOns && item.addOns.length > 0 && (
                      <div className="text-[8.5px] font-normal text-neutral-800">
                        + Add: {item.addOns.join(', ')}
                      </div>
                    )}
                    {item.instructions && (
                      <div className="text-[8.5px] font-semibold text-neutral-900 italic">
                        ↳ Note: {item.instructions}
                      </div>
                    )}
                  </td>
                  <td className="text-right align-top py-1 whitespace-nowrap text-neutral-800 text-[10px]">
                    {unitPrice.toFixed(0)}
                  </td>
                  <td className="text-right align-top py-1 whitespace-nowrap font-black text-black pr-0.5">
                    {itemTotal.toFixed(0)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
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
        {displayCashier && (
          <div className="font-bold text-[9px] uppercase tracking-wide">
            SETTLED BY: <strong>{displayCashier}</strong>
          </div>
        )}
        {order.paidAt && (
          <div className="text-[8.5px] text-neutral-700">
            Settled At: {new Date(order.paidAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
        )}
      </div>

      {/* ====================================================
          6. FOOTER QR & APPRECIATION MESSAGE (GOOGLE REVIEW)
         ==================================================== */}
      <div className="pt-2 pb-1 text-center flex flex-col items-center space-y-1">
        <div className="p-1 bg-white border border-black inline-block">
          <QRCodeCanvas
            value={reviewQrUrl || originUrl}
            size={is58mm ? 44 : 52}
            level="L"
            includeMargin={false}
          />
        </div>
        <div className="text-[9px] font-black tracking-tight text-neutral-900 flex items-center justify-center gap-1">
          <span>Scan to Rate on Google</span>
          <span className="text-[8px] tracking-tighter">★★★★★</span>
        </div>
        <div className="text-[8px] font-medium text-neutral-700">
          Leave a Review & Share Your Experience
        </div>
        <div className="text-[9.5px] font-black uppercase pt-0.5 tracking-wider">
          *** THANK YOU FOR DINING WITH US ***
        </div>
        <div className="text-[8px] text-neutral-700">
          Please Come Again! May Buddha Bless Your Day!
        </div>
        <div className="text-[7.5px] text-neutral-500 pt-0.5">
          The Fat Buddha Cloud POS System
        </div>
      </div>

      {/* Feed spacing ensures automatic thermal paper cutter doesn't cut through last line */}
      <div className="h-4" style={{ minHeight: '18mm' }} />
    </div>
  );
};
