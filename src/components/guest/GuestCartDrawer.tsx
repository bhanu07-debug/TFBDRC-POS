import React, { useState } from 'react';
import { usePOS } from '../../context/POSContext';
import {
  X,
  Trash2,
  Plus,
  Minus,
  ChefHat,
  Send,
  Sparkles,
  ShoppingBag,
  Info,
  Clock,
  CheckCircle2,
  FileText
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface GuestCartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onOrderSuccess: (orderId: string) => void;
}

export const GuestCartDrawer: React.FC<GuestCartDrawerProps> = ({
  isOpen,
  onClose,
  onOrderSuccess
}) => {
  const {
    cart,
    cartTotal,
    cartItemCount,
    updateCartQuantity,
    removeFromCart,
    clearCart,
    placeGuestOrder,
    currentGuestTableNumber,
    settings
  } = usePOS();

  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [orderNotes, setOrderNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const serviceCharge = settings.serviceChargeEnabled
    ? Math.round((cartTotal * (settings.serviceChargePercent || 10)) / 100)
    : 0;
  const vatAmount = settings.vatEnabled
    ? Math.round(((cartTotal + serviceCharge) * (settings.vatRate || 13)) / 100)
    : 0;
  const grandTotal = cartTotal + serviceCharge + vatAmount;

  const handlePlaceOrder = async () => {
    if (cart.length === 0) return;
    setIsSubmitting(true);

    try {
      const order = await placeGuestOrder(
        guestName.trim() || undefined,
        guestPhone.trim() || undefined,
        orderNotes.trim() || undefined
      );

      // Trigger Confetti effect
      confetti({
        particleCount: 60,
        spread: 60,
        origin: { y: 0.7 }
      });

      setIsSubmitting(false);
      onClose();
      onOrderSuccess(order.id);
    } catch (err) {
      console.error(err);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-[#FDFCF0] border-l border-gray-200 shadow-2xl flex flex-col">
          {/* Top Bar */}
          <div className="p-4 bg-white border-b border-gray-200 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center">
                <ShoppingBag className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
                  Table {currentGuestTableNumber < 10 ? '0' + currentGuestTableNumber : currentGuestTableNumber} Cart
                </h2>
                <p className="text-[11px] text-gray-500">
                  {cartItemCount} {cartItemCount === 1 ? 'item' : 'items'} in session
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {cart.length > 0 && (
                <button
                  onClick={clearCart}
                  className="p-2 text-gray-400 hover:text-rose-600 text-xs flex items-center gap-1 transition"
                  title="Clear Cart"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={onClose}
                className="p-2 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Cart Content */}
          {cart.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
              <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 mb-3 border border-gray-200">
                <ChefHat className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-base font-bold text-gray-800">Your Cart is Empty</h3>
              <p className="text-xs text-gray-500 max-w-xs mt-1">
                Explore our Pan-Asian momos, Buddha signature bowls, and artisan coffees to add items.
              </p>
              <button
                onClick={onClose}
                className="mt-5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-sm"
              >
                Browse Restaurant Menu
              </button>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Items List */}
              <div className="space-y-2.5">
                {cart.map(item => (
                  <div
                    key={item.cartItemId}
                    className="p-3 bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col gap-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-1.5">
                          {item.menuItem.dietary === 'veg' && (
                            <span className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" />
                          )}
                          {item.menuItem.dietary === 'non-veg' && (
                            <span className="w-2 h-2 rounded-full bg-rose-500 flex-shrink-0" />
                          )}
                          {item.menuItem.dietary === 'vegan' && (
                            <span className="w-2 h-2 rounded-full bg-teal-400 flex-shrink-0" />
                          )}
                          <h4 className="text-xs sm:text-sm font-semibold text-gray-900 font-sans">
                            {item.menuItem.name}
                          </h4>
                        </div>

                        {item.selectedVariant && (
                          <span className="text-[11px] text-amber-700 font-medium block mt-0.5 ml-3.5">
                            Portion: {item.selectedVariant.name}
                          </span>
                        )}

                        {item.selectedAddOns.length > 0 && (
                          <div className="text-[10px] text-gray-500 mt-0.5 ml-3.5 space-y-0.5">
                            {item.selectedAddOns.map(a => (
                              <span key={a.id} className="block">+ {a.name} (₹{a.price})</span>
                            ))}
                          </div>
                        )}

                        {item.specialInstructions && (
                          <span className="text-[10px] italic text-gray-500 mt-0.5 ml-3.5 block">
                            Note: "{item.specialInstructions}"
                          </span>
                        )}
                      </div>

                      <span className="font-mono font-bold text-xs text-gray-900">
                        ₹{item.totalPrice}
                      </span>
                    </div>

                    {/* Quantity Selector & Item Remove */}
                    <div className="flex items-center justify-between pt-1 border-t border-gray-100">
                      <span className="text-[10px] text-gray-400 font-mono">
                        ₹{item.unitPrice} each
                      </span>

                      <div className="flex items-center gap-2">
                        <div className="flex items-center bg-gray-50 border border-gray-200 rounded-lg">
                          <button
                            onClick={() => updateCartQuantity(item.cartItemId, -1)}
                            className="p-1 text-gray-500 hover:text-gray-900 transition"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="w-6 text-center text-xs font-mono font-bold text-gray-800">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => updateCartQuantity(item.cartItemId, 1)}
                            className="p-1 text-gray-500 hover:text-gray-900 transition"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                        <button
                          onClick={() => removeFromCart(item.cartItemId)}
                          className="p-1 text-gray-400 hover:text-rose-600 transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Guest Details & Table Session Notes */}
              <div className="p-3 bg-white rounded-xl border border-gray-200 shadow-sm space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-800 uppercase tracking-wider">
                    Guest Info (Optional)
                  </span>
                  <span className="text-[10px] text-gray-400">No account required</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={guestName}
                    onChange={e => setGuestName(e.target.value)}
                    placeholder="Guest Name"
                    className="px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:border-amber-500"
                  />
                  <input
                    type="tel"
                    value={guestPhone}
                    onChange={e => setGuestPhone(e.target.value)}
                    placeholder="Mobile (For Bill)"
                    className="px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <input
                  type="text"
                  value={orderNotes}
                  onChange={e => setOrderNotes(e.target.value)}
                  placeholder="Special instructions for kitchen / serving..."
                  className="w-full px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Bill Breakdown */}
              <div className="p-3.5 bg-white rounded-xl border border-gray-200 shadow-sm space-y-1.5 text-xs">
                <div className="flex justify-between text-gray-500">
                  <span>Item Subtotal</span>
                  <span className="font-mono text-gray-800">{settings.currencySymbol || 'Rs.'} {cartTotal}</span>
                </div>
                {settings.serviceChargeEnabled && (
                  <div className="flex justify-between text-gray-500">
                    <span>Service Charge ({settings.serviceChargePercent || 10}%)</span>
                    <span className="font-mono text-gray-800">{settings.currencySymbol || 'Rs.'} {serviceCharge}</span>
                  </div>
                )}
                {settings.vatEnabled && (
                  <div className="flex justify-between text-gray-500">
                    <span>VAT ({settings.vatRate || 13}%)</span>
                    <span className="font-mono text-gray-800">{settings.currencySymbol || 'Rs.'} {vatAmount}</span>
                  </div>
                )}
                <div className="pt-2 border-t border-gray-200 flex justify-between font-bold text-sm text-gray-900">
                  <span>Total Order Amount</span>
                  <span className="font-mono text-amber-600 font-extrabold">{settings.currencySymbol || 'Rs.'} {grandTotal}</span>
                </div>
                <p className="text-[10px] text-gray-400 text-center pt-1">
                  * Pay at table or counter when finishing your meal. Multiple orders can be added anytime!
                </p>
              </div>
            </div>
          )}

          {/* Footer Submit Button */}
          {cart.length > 0 && (
            <div className="p-4 bg-white border-t border-gray-200 flex-shrink-0">
              <button
                id="btn-place-guest-order"
                disabled={isSubmitting}
                onClick={handlePlaceOrder}
                className="w-full flex items-center justify-between px-5 py-3.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-sm shadow-md shadow-amber-500/20 transition transform active:scale-98 disabled:opacity-50"
              >
                <div className="flex items-center gap-2">
                  <Send className="w-4 h-4" />
                  <span>{isSubmitting ? 'Sending to Kitchen...' : 'Place Order for Table ' + (currentGuestTableNumber < 10 ? '0' + currentGuestTableNumber : currentGuestTableNumber)}</span>
                </div>
                <span className="font-mono text-base font-black">{settings.currencySymbol || 'Rs.'} {grandTotal}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
