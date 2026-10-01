import { Order, RestaurantSettings } from '../types';

/**
 * Cleans phone number for WhatsApp and SMS delivery.
 * Automatically handles Nepal 10-digit mobile numbers (e.g. 98XXXXXXXX, 97XXXXXXXX) by prepending 977.
 */
export const cleanNepaliPhoneNumber = (input: string): string => {
  if (!input) return '';
  let cleaned = input.trim().replace(/[^\d+]/g, '');
  if (cleaned.startsWith('+')) {
    cleaned = cleaned.substring(1);
  }
  // Standard 10-digit Nepal mobile numbers start with 98 or 97
  if (/^9[678]\d{8}$/.test(cleaned)) {
    return `977${cleaned}`;
  }
  return cleaned;
};

/**
 * Generates the web link for the digital e-receipt.
 */
export const generateDigitalReceiptUrl = (order: Order): string => {
  const origin = typeof window !== 'undefined' && window.location.origin
    ? window.location.origin
    : 'https://fatbuddha.cafe';
  const orderIdentifier = order.orderNumber || order.id;
  return `${origin}/?receipt=${encodeURIComponent(orderIdentifier)}`;
};

/**
 * Formats a rich, readable receipt message with emojis and structure for WhatsApp & SMS.
 */
export const formatReceiptTextMessage = (
  order: Order,
  settings: RestaurantSettings,
  includeUrl = true
): string => {
  const restaurantName = settings.restaurantName || 'THE FAT BUDDHA DELIGHT';
  const orderNum = order.orderNumber || order.id;
  const tableNum = order.tableNumber < 10 ? `0${order.tableNumber}` : `${order.tableNumber}`;
  const dateStr = new Date(order.createdAt || Date.now()).toLocaleDateString([], {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
  const timeStr = new Date(order.createdAt || Date.now()).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit'
  });

  const subtotal = order.subtotal ?? order.total ?? 0;
  const discount = order.discountAmount ?? order.discount ?? 0;
  const discountedSubtotal = Math.max(0, subtotal - discount);
  const serviceCharge = order.serviceCharge ?? 0;
  const vat = order.vat ?? order.taxAmount ?? 0;
  const finalAmount = order.finalAmount ?? (discountedSubtotal + serviceCharge + vat);
  const paymentMode = (order.paymentMethod || 'Cash').toUpperCase();
  const currency = settings.currencySymbol || 'Rs.';

  let itemsList = '';
  (order.items || []).forEach(item => {
    const qty = item.quantity || 1;
    const name = item.name || item.nameSnapshot || 'Dish Item';
    const variant = item.variantName ? ` (${item.variantName})` : '';
    const itemTotal = ((item.price ?? item.priceSnapshot ?? 0) * qty);
    itemsList += `• ${qty}x ${name}${variant} - ${currency} ${itemTotal.toLocaleString()}\n`;
  });

  const receiptUrl = generateDigitalReceiptUrl(order);

  const lines = [
    `✨ *${restaurantName.toUpperCase()}* ✨`,
    `📍 ${settings.address || 'Delight Cafe & Restaurant, Nepal'}`,
    settings.phone ? `📞 Phone: ${settings.phone}` : null,
    settings.panNumber ? `🏛️ PAN / VAT: ${settings.panNumber}` : null,
    `━━━━━━━━━━━━━━━━━━━━`,
    `🧾 *TAX INVOICE / DIGITAL RECEIPT*`,
    `Invoice #: *${orderNum}*`,
    `Table: *Table ${tableNum}*`,
    `Date: ${dateStr} at ${timeStr}`,
    `Cashier: ${order.cashierName || 'Nischal Thapa'}`,
    `Status: *PAID (${paymentMode})* ✅`,
    `━━━━━━━━━━━━━━━━━━━━`,
    `🍽️ *ORDERED ITEMS:*`,
    itemsList.trim(),
    `━━━━━━━━━━━━━━━━━━━━`,
    `Subtotal: ${currency} ${subtotal.toLocaleString()}.00`,
    discount > 0 ? `Discount: -${currency} ${discount.toLocaleString()}.00` : null,
    serviceCharge > 0 ? `Service Charge: ${currency} ${serviceCharge.toLocaleString()}.00` : null,
    vat > 0 ? `VAT (13%): ${currency} ${vat.toLocaleString()}.00` : null,
    `*TOTAL PAID: ${currency} ${finalAmount.toLocaleString()}.00*`,
    `━━━━━━━━━━━━━━━━━━━━`,
    includeUrl ? `📱 *View & Save E-Receipt:* \n${receiptUrl}` : null,
    settings.wifiSsid ? `📶 Guest WiFi: *${settings.wifiSsid}* | Pass: *${settings.wifiPassword || 'Newdelight@123'}*` : null,
    `🙏 Thank you for dining with us! We hope to see you again soon!`
  ].filter(Boolean);

  return lines.join('\n');
};

/**
 * Opens WhatsApp with prefilled formatted receipt message.
 */
export const openWhatsAppReceipt = (
  order: Order,
  settings: RestaurantSettings,
  phone?: string
): void => {
  const text = formatReceiptTextMessage(order, settings, true);
  const cleanPhone = cleanNepaliPhoneNumber(phone || order.guestPhone || '');
  const url = cleanPhone
    ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`
    : `https://wa.me/?text=${encodeURIComponent(text)}`;
  window.open(url, '_blank');
};

/**
 * Opens native SMS composer with formatted receipt text.
 */
export const openSMSReceipt = (
  order: Order,
  settings: RestaurantSettings,
  phone?: string
): void => {
  const text = formatReceiptTextMessage(order, settings, true);
  const cleanPhone = cleanNepaliPhoneNumber(phone || order.guestPhone || '');
  const isIOS = typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent);
  const separator = isIOS ? '&' : '?';
  const url = cleanPhone
    ? `sms:${cleanPhone}${separator}body=${encodeURIComponent(text)}`
    : `sms:${separator}body=${encodeURIComponent(text)}`;
  window.location.href = url;
};

/**
 * Copies formatted receipt to clipboard.
 */
export const copyReceiptText = async (
  order: Order,
  settings: RestaurantSettings
): Promise<boolean> => {
  const text = formatReceiptTextMessage(order, settings, true);
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    console.error('Failed to copy receipt text to clipboard:', err);
    return false;
  }
};
