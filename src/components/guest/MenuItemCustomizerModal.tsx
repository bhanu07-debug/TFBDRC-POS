import React, { useState } from 'react';
import { MenuItem, MenuItemVariant, MenuItemAddOn } from '../../types';
import { X, Flame, Leaf, Plus, Minus, Check, Clock, Sparkles } from 'lucide-react';

interface MenuItemCustomizerModalProps {
  item: MenuItem | null;
  isOpen: boolean;
  onClose: () => void;
  onAddToCart: (
    item: MenuItem,
    quantity: number,
    selectedVariant?: MenuItemVariant,
    selectedAddOns?: MenuItemAddOn[],
    instructions?: string
  ) => void;
}

export const MenuItemCustomizerModal: React.FC<MenuItemCustomizerModalProps> = ({
  item,
  isOpen,
  onClose,
  onAddToCart
}) => {
  if (!isOpen || !item) return null;

  const [quantity, setQuantity] = useState(1);
  const [selectedVariant, setSelectedVariant] = useState<MenuItemVariant | undefined>(
    item.variants && item.variants.length > 0 ? item.variants[0] : undefined
  );
  const [selectedAddOns, setSelectedAddOns] = useState<MenuItemAddOn[]>([]);
  const [instructions, setInstructions] = useState('');

  const toggleAddOn = (addOn: MenuItemAddOn) => {
    setSelectedAddOns(prev => {
      const exists = prev.some(a => a.id === addOn.id);
      if (exists) {
        return prev.filter(a => a.id !== addOn.id);
      } else {
        return [...prev, addOn];
      }
    });
  };

  const basePrice = selectedVariant ? selectedVariant.price : item.price;
  const addOnsTotal = selectedAddOns.reduce((acc, curr) => acc + curr.price, 0);
  const unitPrice = basePrice + addOnsTotal;
  const totalPrice = unitPrice * quantity;

  const handleAdd = () => {
    onAddToCart(item, quantity, selectedVariant, selectedAddOns, instructions.trim() || undefined);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white border border-gray-200 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header with image */}
        <div className="relative h-48 sm:h-56 w-full bg-gray-900 flex-shrink-0">
          <img
            src={item.image}
            alt={item.name}
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-gray-950/40 to-transparent" />
          
          <button
            onClick={onClose}
            className="absolute top-3 right-3 p-2 rounded-full bg-black/50 text-white hover:bg-black/75 transition"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="absolute bottom-3 left-4 right-4 flex items-end justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                {item.dietary === 'veg' && (
                  <span className="flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-400 border border-emerald-500/40">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" /> Veg
                  </span>
                )}
                {item.dietary === 'non-veg' && (
                  <span className="flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded bg-rose-950/80 text-rose-400 border border-rose-500/40">
                    <span className="w-2 h-2 rounded-full bg-rose-500" /> Non-Veg
                  </span>
                )}
                {item.dietary === 'vegan' && (
                  <span className="flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded bg-teal-950/80 text-teal-300 border border-teal-500/40">
                    <Leaf className="w-3 h-3 text-teal-400" /> Vegan
                  </span>
                )}
                {item.isChefSpecial && (
                  <span className="flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                    <Sparkles className="w-3 h-3 text-amber-400" /> Chef's Special
                  </span>
                )}
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-white leading-snug">{item.name}</h3>
            </div>
            <div className="text-right">
              <span className="text-xl font-extrabold text-amber-400 font-mono">₹{unitPrice}</span>
            </div>
          </div>
        </div>

        {/* Scrollable Customization Content */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-5 flex-1 divide-y divide-gray-100 bg-[#FDFCF0]">
          <div>
            <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">{item.description}</p>
            <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-amber-600" /> ~{item.prepTimeMinutes} mins prep
              </span>
              {item.spiceLevel !== undefined && item.spiceLevel > 0 && (
                <span className="flex items-center gap-1 text-rose-600 font-medium">
                  <Flame className="w-3.5 h-3.5 text-rose-500" />
                  {'🌶️'.repeat(item.spiceLevel)} {item.spiceLevel === 1 ? 'Mild' : item.spiceLevel === 2 ? 'Medium Spicy' : 'Fiery Hot'}
                </span>
              )}
            </div>
          </div>

          {/* Variants Selector */}
          {item.variants && item.variants.length > 0 && (
            <div className="pt-4">
              <label className="block text-xs font-bold text-gray-800 uppercase tracking-wider mb-2">
                Choose Portion / Protein <span className="text-amber-600 font-normal">(Required)</span>
              </label>
              <div className="space-y-2">
                {item.variants.map(variant => (
                  <button
                    key={variant.id}
                    type="button"
                    onClick={() => setSelectedVariant(variant)}
                    className={`w-full flex items-center justify-between p-3 rounded-xl border text-sm font-medium transition ${
                      selectedVariant?.id === variant.id
                        ? 'bg-amber-50 border-amber-500 text-amber-900 shadow-sm'
                        : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                        selectedVariant?.id === variant.id ? 'border-amber-600 bg-amber-500' : 'border-gray-400'
                      }`}>
                        {selectedVariant?.id === variant.id && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </div>
                      <span>{variant.name}</span>
                    </div>
                    <span className="font-mono font-bold text-gray-900">₹{variant.price}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Add-ons Selector */}
          {item.addOns && item.addOns.length > 0 && (
            <div className="pt-4">
              <label className="block text-xs font-bold text-gray-800 uppercase tracking-wider mb-2">
                Extra Add-Ons & Dips <span className="text-gray-500 font-normal">(Optional)</span>
              </label>
              <div className="space-y-2">
                {item.addOns.map(addOn => {
                  const isChecked = selectedAddOns.some(a => a.id === addOn.id);
                  return (
                    <button
                      key={addOn.id}
                      type="button"
                      onClick={() => toggleAddOn(addOn)}
                      className={`w-full flex items-center justify-between p-3 rounded-xl border text-sm font-medium transition ${
                        isChecked
                          ? 'bg-amber-50 border-amber-500 text-amber-900 shadow-sm'
                          : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className={`w-4 h-4 rounded-md border flex items-center justify-center ${
                          isChecked ? 'border-amber-600 bg-amber-500 text-white' : 'border-gray-400'
                        }`}>
                          {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                        <span>{addOn.name}</span>
                      </div>
                      <span className="font-mono font-bold text-gray-900">+₹{addOn.price}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Special Cooking Instructions */}
          <div className="pt-4">
            <label className="block text-xs font-bold text-gray-800 uppercase tracking-wider mb-1.5">
              Cooking Notes for Chef
            </label>
            <textarea
              value={instructions}
              onChange={e => setInstructions(e.target.value)}
              placeholder="e.g. Less spicy, no coriander, extra crispy, less sugar..."
              rows={2}
              className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs sm:text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:border-amber-500 resize-none shadow-sm"
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-white border-t border-gray-200 flex items-center justify-between gap-3 flex-shrink-0">
          <div className="flex items-center bg-gray-100 border border-gray-200 rounded-xl p-1">
            <button
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              className="p-1.5 sm:p-2 text-gray-600 hover:text-gray-900 hover:bg-white rounded-lg transition"
            >
              <Minus className="w-4 h-4" />
            </button>
            <span className="w-8 text-center font-bold font-mono text-sm text-gray-900">{quantity}</span>
            <button
              onClick={() => setQuantity(quantity + 1)}
              className="p-1.5 sm:p-2 text-gray-600 hover:text-gray-900 hover:bg-white rounded-lg transition"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          <button
            id="btn-confirm-add-cart"
            onClick={handleAdd}
            className="flex-1 flex items-center justify-between px-5 py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm shadow-md shadow-amber-500/20 transition transform active:scale-98"
          >
            <span>Add to Order</span>
            <span className="font-mono text-base font-extrabold">₹{totalPrice}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
