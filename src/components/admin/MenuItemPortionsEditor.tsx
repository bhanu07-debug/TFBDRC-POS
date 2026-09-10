import React, { useState } from 'react';
import { MenuItemVariant } from '../../types';
import { Plus, Trash2, Wine, Layers, Sparkles, Check, Info } from 'lucide-react';

interface MenuItemPortionsEditorProps {
  variants?: MenuItemVariant[];
  basePrice: number;
  onChange: (variants: MenuItemVariant[]) => void;
  onBasePriceChange?: (price: number) => void;
}

export const MenuItemPortionsEditor: React.FC<MenuItemPortionsEditorProps> = ({
  variants = [],
  basePrice,
  onChange,
  onBasePriceChange
}) => {
  const [newPortionName, setNewPortionName] = useState('');
  const [newPortionPrice, setNewPortionPrice] = useState<number | ''>('');

  const currentVariants = variants || [];

  const handleAddPortion = () => {
    if (!newPortionName.trim()) return;
    const price = typeof newPortionPrice === 'number' && newPortionPrice > 0 ? newPortionPrice : basePrice;
    const newVariant: MenuItemVariant = {
      id: `var-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
      name: newPortionName.trim(),
      price,
      inStock: true
    };
    const updated = [...currentVariants, newVariant];
    onChange(updated);
    setNewPortionName('');
    setNewPortionPrice('');
  };

  const handleUpdateVariant = (id: string, field: 'name' | 'price', value: string | number) => {
    const updated = currentVariants.map(v => {
      if (v.id !== id) return v;
      if (field === 'price') {
        const num = Number(value) || 0;
        return { ...v, price: num };
      }
      return { ...v, name: String(value) };
    });
    onChange(updated);

    // If first variant price was updated and basePrice was 0, sync basePrice
    if (updated[0]?.id === id && field === 'price' && onBasePriceChange) {
      onBasePriceChange(Number(value) || 0);
    }
  };

  const handleDeleteVariant = (id: string) => {
    const updated = currentVariants.filter(v => v.id !== id);
    onChange(updated);
  };

  // Preset generators
  const applyBarPreset = () => {
    const p60 = basePrice > 0 ? basePrice : 180;
    const preset: MenuItemVariant[] = [
      { id: 'v-60ml', name: '60 ml', price: p60, inStock: true },
      { id: 'v-90ml', name: '90 ml', price: Math.round(p60 * 1.45), inStock: true },
      { id: 'v-180ml', name: '180 ml (Quarter)', price: Math.round(p60 * 2.8), inStock: true },
      { id: 'v-360ml', name: '360 ml (Half)', price: Math.round(p60 * 5.3), inStock: true },
      { id: 'v-750ml', name: '750 ml (Full)', price: Math.round(p60 * 10.5), inStock: true }
    ];
    onChange(preset);
  };

  const applyHalfFullPreset = () => {
    const pFull = basePrice > 0 ? basePrice : 350;
    const pHalf = Math.round(pFull * 0.6);
    const preset: MenuItemVariant[] = [
      { id: 'v-half', name: 'Half Portion', price: pHalf, inStock: true },
      { id: 'v-full', name: 'Full Portion', price: pFull, inStock: true }
    ];
    onChange(preset);
  };

  const applySMLPreset = () => {
    const pMed = basePrice > 0 ? basePrice : 300;
    const preset: MenuItemVariant[] = [
      { id: 'v-sm', name: 'Small', price: Math.round(pMed * 0.75), inStock: true },
      { id: 'v-med', name: 'Medium', price: pMed, inStock: true },
      { id: 'v-lg', name: 'Large', price: Math.round(pMed * 1.35), inStock: true }
    ];
    onChange(preset);
  };

  const clearAllPortions = () => {
    onChange([]);
  };

  return (
    <div className="border border-amber-200/80 bg-amber-50/40 rounded-xl p-3.5 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-1.5">
          <Layers className="w-4 h-4 text-amber-600" />
          <span className="font-bold text-gray-900 text-xs">
            Portions & Size Variations ({currentVariants.length})
          </span>
          {currentVariants.length > 0 && (
            <span className="px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-amber-200 text-amber-900">
              Active
            </span>
          )}
        </div>

        {/* Preset Buttons */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={applyBarPreset}
            className="px-2 py-1 rounded-lg text-[10px] font-bold bg-white hover:bg-amber-100 text-amber-900 border border-amber-300 transition flex items-center gap-1"
            title="Populate standard 60ml, 90ml, 180ml, 360ml, 750ml portion sizes"
          >
            <Wine className="w-3 h-3 text-amber-600" />
            <span>Bar Drinks (60ml–750ml)</span>
          </button>

          <button
            type="button"
            onClick={applyHalfFullPreset}
            className="px-2 py-1 rounded-lg text-[10px] font-bold bg-white hover:bg-amber-100 text-amber-900 border border-amber-300 transition"
          >
            Half / Full
          </button>

          <button
            type="button"
            onClick={applySMLPreset}
            className="px-2 py-1 rounded-lg text-[10px] font-bold bg-white hover:bg-amber-100 text-amber-900 border border-amber-300 transition"
          >
            S / M / L
          </button>

          {currentVariants.length > 0 && (
            <button
              type="button"
              onClick={clearAllPortions}
              className="px-2 py-1 rounded-lg text-[10px] font-bold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition"
            >
              Clear All
            </button>
          )}
        </div>
      </div>

      {/* Info helper */}
      <div className="text-[11px] text-gray-600 flex items-start gap-1.5">
        <Info className="w-3.5 h-3.5 text-amber-600 flex-shrink-0 mt-0.5" />
        <span>
          Configure specific portions (e.g. <strong>60ml, 90ml, 180ml, 360ml, 750ml</strong>). Guests and cashiers can select any portion, and the bill settlement will calculate using that exact portion's price.
        </span>
      </div>

      {/* Current Portions Table */}
      {currentVariants.length > 0 ? (
        <div className="space-y-1.5 bg-white border border-gray-200 rounded-lg p-2.5 max-h-48 overflow-y-auto">
          <div className="grid grid-cols-12 gap-2 text-[10px] font-bold text-gray-500 px-1 uppercase tracking-wider">
            <div className="col-span-6">Portion / Bottle Size</div>
            <div className="col-span-5">Price (Rs.)</div>
            <div className="col-span-1 text-center">Action</div>
          </div>

          {currentVariants.map(v => (
            <div key={v.id} className="grid grid-cols-12 gap-2 items-center">
              <div className="col-span-6">
                <input
                  type="text"
                  value={v.name}
                  onChange={e => handleUpdateVariant(v.id, 'name', e.target.value)}
                  placeholder="e.g. 750 ml (Full)"
                  className="w-full px-2 py-1 bg-gray-50 text-gray-900 font-semibold border border-gray-300 rounded text-xs focus:bg-white focus:border-amber-500 focus:outline-none"
                />
              </div>
              <div className="col-span-5">
                <div className="relative">
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-gray-400 font-mono">
                    Rs.
                  </span>
                  <input
                    type="number"
                    value={v.price}
                    onChange={e => handleUpdateVariant(v.id, 'price', e.target.value)}
                    className="w-full pl-7 pr-2 py-1 bg-gray-50 text-gray-900 font-mono font-bold border border-gray-300 rounded text-xs focus:bg-white focus:border-amber-500 focus:outline-none"
                  />
                </div>
              </div>
              <div className="col-span-1 text-center">
                <button
                  type="button"
                  onClick={() => handleDeleteVariant(v.id)}
                  className="p-1 text-gray-400 hover:text-rose-600 rounded transition"
                  title="Remove Portion"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-3 text-center bg-white/70 border border-dashed border-gray-300 rounded-lg text-xs text-gray-500">
          No portions configured yet. This dish will sell at the single base price of <strong>Rs. {basePrice.toLocaleString()}</strong>. Click a preset above or add portions below to enable portion pricing.
        </div>
      )}

      {/* Add Custom Portion Input Row */}
      <div className="flex items-center gap-2 pt-1">
        <input
          type="text"
          value={newPortionName}
          onChange={e => setNewPortionName(e.target.value)}
          placeholder="New Portion (e.g. 750 ml (Full))"
          className="flex-1 min-w-0 px-2.5 py-1.5 bg-white text-gray-900 font-medium border border-gray-300 rounded-lg text-xs focus:border-amber-500 focus:outline-none shadow-2xs"
          onKeyDown={e => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleAddPortion();
            }
          }}
        />

        <div className="w-28 relative">
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] text-gray-400 font-mono">
            Rs.
          </span>
          <input
            type="number"
            value={newPortionPrice}
            onChange={e => setNewPortionPrice(e.target.value ? Number(e.target.value) : '')}
            placeholder="Price"
            className="w-full pl-8 pr-2 py-1.5 bg-white text-gray-900 font-mono font-bold border border-gray-300 rounded-lg text-xs focus:border-amber-500 focus:outline-none shadow-2xs"
            onKeyDown={e => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAddPortion();
              }
            }}
          />
        </div>

        <button
          type="button"
          onClick={handleAddPortion}
          disabled={!newPortionName.trim()}
          className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-bold rounded-lg text-xs transition shadow-2xs flex items-center gap-1 whitespace-nowrap"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Portion</span>
        </button>
      </div>
    </div>
  );
};
