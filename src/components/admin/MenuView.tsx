import React, { useState, useMemo } from 'react';
import { usePOS } from '../../context/POSContext';
import { MenuItem, DietaryType, KOTDestination } from '../../types';
import { DishImageUploader } from '../common/DishImageUploader';
import { normalizeImageUrl, DEFAULT_DISH_IMAGE } from '../../utils/imageUtils';
import {
  Search,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  Sparkles,
  Flame,
  Leaf,
  Clock,
  Filter,
  Image as ImageIcon,
  ChefHat,
  Coffee,
  X
} from 'lucide-react';

export const MenuView: React.FC = () => {
  const {
    menuItems,
    toggleMenuItemStock,
    updateMenuItem,
    addMenuItem,
    deleteMenuItem
  } = usePOS();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [isNewItemModalOpen, setIsNewItemModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<MenuItem | null>(null);

  // New Item Form State
  const [newItemData, setNewItemData] = useState({
    name: '',
    category: 'Momos & Dimsums',
    description: '',
    price: 320,
    dietary: 'veg' as DietaryType,
    kotDestination: 'kitchen' as KOTDestination,
    isChefSpecial: false,
    isPopular: false,
    spiceLevel: 1 as 0 | 1 | 2 | 3,
    prepTimeMinutes: 15,
    inStock: true,
    image: 'https://images.unsplash.com/photo-1541696432-82c6da8ce7bf?auto=format&fit=crop&w=600&q=80',
    tags: 'Asian, Signature'
  });

  // Dynamic categories
  const defaultCategories = [
    'Momos & Dimsums',
    'Buddha Bowls & Mains',
    'Asian Wok & Starters',
    'Clay Oven & Tandoor',
    'Artisanal Cafe & Drinks',
    'Desserts'
  ];

  const [customCategories, setCustomCategories] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('fat_buddha_custom_categories');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [isAddingNewCategory, setIsAddingNewCategory] = useState(false);
  const [newCategoryInput, setNewCategoryInput] = useState('');

  const [isEditAddingNewCategory, setIsEditAddingNewCategory] = useState(false);
  const [editNewCategoryInput, setEditNewCategoryInput] = useState('');

  // Combine default categories, stored custom categories, and categories from current menu items
  const allCategories = useMemo(() => {
    const set = new Set<string>(defaultCategories);
    customCategories.forEach(c => {
      if (c && c.trim()) set.add(c.trim());
    });
    menuItems.forEach(item => {
      if (item.category && item.category.trim()) set.add(item.category.trim());
    });
    return Array.from(set);
  }, [menuItems, customCategories]);

  const filterCategories = useMemo(() => {
    return ['All', ...allCategories];
  }, [allCategories]);

  const handleAddNewCategory = () => {
    const trimmed = newCategoryInput.trim();
    if (!trimmed) return;
    if (!allCategories.includes(trimmed)) {
      const updated = [...customCategories, trimmed];
      setCustomCategories(updated);
      try {
        localStorage.setItem('fat_buddha_custom_categories', JSON.stringify(updated));
      } catch (e) {
        console.warn('Could not save category to localStorage', e);
      }
    }
    const isRec = trimmed.toLowerCase().includes('cafe') || trimmed.toLowerCase().includes('drink') || trimmed.toLowerCase().includes('dessert') || trimmed.toLowerCase().includes('beverage');
    setNewItemData(prev => ({
      ...prev,
      category: trimmed,
      kotDestination: isRec ? 'reception' : 'kitchen'
    }));
    setIsAddingNewCategory(false);
    setNewCategoryInput('');
  };

  const handleAddEditCategory = () => {
    const trimmed = editNewCategoryInput.trim();
    if (!trimmed || !editingItem) return;
    if (!allCategories.includes(trimmed)) {
      const updated = [...customCategories, trimmed];
      setCustomCategories(updated);
      try {
        localStorage.setItem('fat_buddha_custom_categories', JSON.stringify(updated));
      } catch (e) {
        console.warn('Could not save category to localStorage', e);
      }
    }
    const isRec = trimmed.toLowerCase().includes('cafe') || trimmed.toLowerCase().includes('drink') || trimmed.toLowerCase().includes('dessert') || trimmed.toLowerCase().includes('beverage');
    setEditingItem(prev => prev ? ({
      ...prev,
      category: trimmed,
      kotDestination: isRec ? 'reception' : prev.kotDestination
    }) : null);
    setIsEditAddingNewCategory(false);
    setEditNewCategoryInput('');
  };

  const filteredItems = menuItems.filter(item => {
    if (selectedCategory !== 'All' && item.category !== selectedCategory) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      if (!item.name.toLowerCase().includes(q) && !(item.code || '').toLowerCase().includes(q)) {
        return false;
      }
    }
    return true;
  });

  // Helper for KOT Destination determination
  const getItemKOTDestination = (item: MenuItem): KOTDestination => {
    if (item.kotDestination) return item.kotDestination;
    const cat = item.category.toLowerCase();
    if (cat.includes('cafe') || cat.includes('drink') || cat.includes('beverage') || cat.includes('dessert')) {
      return 'reception';
    }
    return 'kitchen';
  };

  const handleSaveNewItem = () => {
    if (!newItemData.name.trim()) return;
    addMenuItem({
      name: newItemData.name,
      category: newItemData.category,
      description: newItemData.description,
      price: Number(newItemData.price),
      dietary: newItemData.dietary,
      kotDestination: newItemData.kotDestination,
      isChefSpecial: newItemData.isChefSpecial,
      isPopular: newItemData.isPopular,
      spiceLevel: newItemData.spiceLevel,
      prepTimeMinutes: Number(newItemData.prepTimeMinutes),
      inStock: newItemData.inStock,
      image: normalizeImageUrl(newItemData.image) || DEFAULT_DISH_IMAGE,
      tags: newItemData.tags.split(',').map(t => t.trim()).filter(Boolean)
    });
    setIsNewItemModalOpen(false);
  };

  const handleSaveEditItem = () => {
    if (!editingItem) return;
    updateMenuItem({
      ...editingItem,
      image: normalizeImageUrl(editingItem.image) || DEFAULT_DISH_IMAGE
    });
    setEditingItem(null);
  };

  return (
    <div className="space-y-6">
      {/* Header & Add Button */}
      <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-gray-900 tracking-tight">
              Menu & Price Catalog
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-amber-50 text-amber-800 border border-amber-200">
              {menuItems.length} Dishes Listed
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">
            Manage recipes, dietary categories, KOT dispatch routing, and instant 86 out-of-stock toggles.
          </p>
        </div>

        <button
          onClick={() => setIsNewItemModalOpen(true)}
          className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl text-xs shadow-xs transition flex items-center gap-1.5 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Dish</span>
        </button>
      </div>

      {/* Search & Category Pills */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs space-y-3">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search dish name or code..."
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs text-gray-900 font-medium placeholder:text-gray-400 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {filterCategories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                selectedCategory === cat
                  ? 'bg-gray-900 text-white shadow-xs'
                  : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Menu Items Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-gray-400 uppercase font-bold text-[10px] tracking-wider">
                <th className="p-3.5">Dish / Recipe</th>
                <th className="p-3.5">Category</th>
                <th className="p-3.5">Price</th>
                <th className="p-3.5">KOT Destination</th>
                <th className="p-3.5">Availability</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 font-medium">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-400 text-xs">
                    No dishes found matching your search.
                  </td>
                </tr>
              ) : (
                filteredItems.map(item => {
                  const kotDest = getItemKOTDestination(item);

                  return (
                    <tr key={item.id} className="hover:bg-gray-50/80 transition">
                      <td className="p-3.5">
                        <div className="flex items-center gap-3">
                          <img
                            src={normalizeImageUrl(item.image) || DEFAULT_DISH_IMAGE}
                            alt={item.name}
                            className="w-12 h-12 rounded-lg object-cover flex-shrink-0 bg-gray-100 border border-gray-200"
                            referrerPolicy="no-referrer"
                            onError={(e) => {
                              e.currentTarget.src = DEFAULT_DISH_IMAGE;
                            }}
                          />
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span
                                className={`w-2 h-2 rounded-full flex-shrink-0 ${
                                  item.dietary === 'veg' ? 'bg-emerald-500' : 'bg-rose-500'
                                }`}
                              />
                              <span className="font-bold text-gray-900 text-xs">
                                {item.name}
                              </span>
                            </div>
                            <p className="text-[11px] text-gray-400 max-w-xs truncate mt-0.5">
                              {item.description}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="p-3.5 text-gray-600">
                        {item.category}
                      </td>

                      <td className="p-3.5 font-mono font-bold text-gray-900 text-xs">
                        Rs. {item.price.toLocaleString()}.00
                      </td>

                      <td className="p-3.5">
                        {kotDest === 'kitchen' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                            <ChefHat className="w-3 h-3 text-amber-600" />
                            <span>KITCHEN</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-purple-50 text-purple-800 border border-purple-200">
                            <Coffee className="w-3 h-3 text-purple-600" />
                            <span>RECEPTION</span>
                          </span>
                        )}
                      </td>

                      <td className="p-3.5">
                        <button
                          onClick={() => toggleMenuItemStock(item.id)}
                          className={`px-3 py-1 rounded-full text-[10px] font-bold border transition ${
                            item.inStock
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                              : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                          }`}
                        >
                          {item.inStock ? 'In Stock (Active)' : '86 Out of Stock'}
                        </button>
                      </td>

                      <td className="p-3.5 text-right space-x-1">
                        <button
                          onClick={() => setEditingItem(item)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition"
                          title="Edit Dish"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setItemToDelete(item)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50 transition"
                          title="Delete Dish"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add New Dish Modal */}
      {isNewItemModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center">
                  <Plus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-gray-900">Add New Dish</h3>
                  <p className="text-[11px] text-gray-500">Configure recipe, price, dietary, and KOT dispatch</p>
                </div>
              </div>
              <button
                onClick={() => setIsNewItemModalOpen(false)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-gray-900 block mb-1">Dish Name *</label>
                <input
                  type="text"
                  value={newItemData.name ?? ''}
                  onChange={e => setNewItemData({ ...newItemData, name: e.target.value })}
                  placeholder="e.g. Steamed Chicken Kothe Momos"
                  className="w-full px-3 py-2 bg-white text-gray-900 font-semibold border border-gray-300 rounded-lg placeholder:text-gray-400 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 shadow-2xs"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-bold text-gray-900 block">Category *</label>
                    {!isAddingNewCategory && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsAddingNewCategory(true);
                          setNewCategoryInput('');
                        }}
                        className="text-[11px] font-bold text-amber-600 hover:text-amber-700 flex items-center gap-0.5"
                      >
                        <Plus className="w-3 h-3" />
                        <span>+ New Category</span>
                      </button>
                    )}
                  </div>

                  {isAddingNewCategory ? (
                    <div className="flex items-center gap-1.5 animate-in fade-in duration-150">
                      <input
                        type="text"
                        autoFocus
                        value={newCategoryInput}
                        onChange={e => setNewCategoryInput(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddNewCategory();
                          }
                        }}
                        placeholder="e.g. Soups, Continental"
                        className="flex-1 min-w-0 px-2.5 py-1.5 bg-white text-gray-900 font-semibold border border-amber-500 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500 shadow-2xs text-xs"
                      />
                      <button
                        type="button"
                        onClick={handleAddNewCategory}
                        className="px-2.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-lg text-xs transition shadow-2xs whitespace-nowrap"
                      >
                        Add
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsAddingNewCategory(false)}
                        className="px-2 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 font-semibold rounded-lg text-xs transition"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <select
                      value={newItemData.category ?? 'Momos & Dimsums'}
                      onChange={e => {
                        if (e.target.value === '__add_new__') {
                          setIsAddingNewCategory(true);
                          setNewCategoryInput('');
                          return;
                        }
                        const cat = e.target.value;
                        const isRec = cat.toLowerCase().includes('cafe') || cat.toLowerCase().includes('drink') || cat.toLowerCase().includes('dessert') || cat.toLowerCase().includes('beverage');
                        setNewItemData({
                          ...newItemData,
                          category: cat,
                          kotDestination: isRec ? 'reception' : 'kitchen'
                        });
                      }}
                      className="w-full px-3 py-2 bg-white text-gray-900 font-semibold border border-gray-300 rounded-lg focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 shadow-2xs"
                    >
                      {allCategories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                      <option value="__add_new__" className="font-bold text-amber-600">+ Create New Category...</option>
                    </select>
                  )}
                </div>

                <div>
                  <label className="font-bold text-gray-900 block mb-1">Price (Rs.) *</label>
                  <input
                    type="number"
                    value={newItemData.price ?? 0}
                    onChange={e => setNewItemData({ ...newItemData, price: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-white text-gray-900 font-mono font-bold border border-gray-300 rounded-lg focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 shadow-2xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-gray-900 block mb-1">Dietary Tag</label>
                  <select
                    value={newItemData.dietary ?? 'veg'}
                    onChange={e => setNewItemData({ ...newItemData, dietary: e.target.value as any })}
                    className="w-full px-3 py-2 bg-white text-gray-900 font-semibold border border-gray-300 rounded-lg focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 shadow-2xs"
                  >
                    <option value="veg">🥬 Vegetarian (Pure Veg)</option>
                    <option value="non-veg">🍗 Non-Vegetarian</option>
                    <option value="vegan">🌱 Vegan</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-gray-900 block mb-1">KOT Destination</label>
                  <select
                    value={newItemData.kotDestination ?? 'kitchen'}
                    onChange={e => setNewItemData({ ...newItemData, kotDestination: e.target.value as any })}
                    className="w-full px-3 py-2 bg-white text-gray-900 font-bold border border-gray-300 rounded-lg focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 shadow-2xs"
                  >
                    <option value="kitchen">👨‍🍳 KITCHEN (Main Kitchen / Wok)</option>
                    <option value="reception">☕ RECEPTION (Cafe / Barista)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-gray-900 block mb-1">Description & Ingredients</label>
                <textarea
                  rows={2}
                  value={newItemData.description ?? ''}
                  onChange={e => setNewItemData({ ...newItemData, description: e.target.value })}
                  placeholder="Ingredients, flavor profile, and preparation details..."
                  className="w-full px-3 py-2 bg-white text-gray-900 font-medium border border-gray-300 rounded-lg placeholder:text-gray-400 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 shadow-2xs"
                />
              </div>

              {/* Enhanced Dish Image Upload & Link */}
              <DishImageUploader
                value={newItemData.image}
                onChange={url => setNewItemData({ ...newItemData, image: url })}
                idPrefix="new-dish-img"
                label="Dish Image (Device Upload or Google / Web Link)"
              />

              {/* Visible Checkboxes Section */}
              <div className="pt-2 border-t border-gray-200">
                <label className="font-bold text-gray-900 block mb-2">Item Attributes & Badges</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <label className={`flex items-center gap-2.5 p-2.5 rounded-lg border cursor-pointer transition ${
                    newItemData.inStock ? 'bg-emerald-50/60 border-emerald-300 text-emerald-950 font-bold' : 'bg-gray-50 border-gray-300 text-gray-700'
                  }`}>
                    <input
                      type="checkbox"
                      checked={newItemData.inStock ?? true}
                      onChange={e => setNewItemData({ ...newItemData, inStock: e.target.checked })}
                      className="w-4 h-4 rounded text-emerald-600 accent-emerald-600 border-gray-300 focus:ring-emerald-500 cursor-pointer"
                    />
                    <span className="text-xs font-semibold">In Stock (Active)</span>
                  </label>

                  <label className={`flex items-center gap-2.5 p-2.5 rounded-lg border cursor-pointer transition ${
                    newItemData.isChefSpecial ? 'bg-amber-50/60 border-amber-300 text-amber-950 font-bold' : 'bg-gray-50 border-gray-300 text-gray-700'
                  }`}>
                    <input
                      type="checkbox"
                      checked={newItemData.isChefSpecial ?? false}
                      onChange={e => setNewItemData({ ...newItemData, isChefSpecial: e.target.checked })}
                      className="w-4 h-4 rounded text-amber-600 accent-amber-600 border-gray-300 focus:ring-amber-500 cursor-pointer"
                    />
                    <span className="text-xs font-semibold">Chef's Special</span>
                  </label>

                  <label className={`flex items-center gap-2.5 p-2.5 rounded-lg border cursor-pointer transition ${
                    newItemData.isPopular ? 'bg-rose-50/60 border-rose-300 text-rose-950 font-bold' : 'bg-gray-50 border-gray-300 text-gray-700'
                  }`}>
                    <input
                      type="checkbox"
                      checked={newItemData.isPopular ?? false}
                      onChange={e => setNewItemData({ ...newItemData, isPopular: e.target.checked })}
                      className="w-4 h-4 rounded text-rose-600 accent-rose-600 border-gray-300 focus:ring-rose-500 cursor-pointer"
                    />
                    <span className="text-xs font-semibold">Bestseller</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-gray-200 flex items-center justify-end gap-2">
              <button
                onClick={() => setIsNewItemModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-gray-300 text-gray-700 text-xs font-bold hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveNewItem}
                className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-extrabold shadow-md shadow-amber-500/20 transition"
              >
                Save Dish
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Dish Modal */}
      {editingItem && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center">
                  <Edit2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-gray-900">Edit Dish</h3>
                  <p className="text-[11px] text-gray-500">{editingItem.name}</p>
                </div>
              </div>
              <button
                onClick={() => setEditingItem(null)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-gray-900 block mb-1">Dish Name *</label>
                <input
                  type="text"
                  value={editingItem.name ?? ''}
                  onChange={e => setEditingItem({ ...editingItem, name: e.target.value })}
                  className="w-full px-3 py-2 bg-white text-gray-900 font-bold border border-gray-300 rounded-lg focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 shadow-2xs"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-bold text-gray-900 block">Category *</label>
                    {!isEditAddingNewCategory && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsEditAddingNewCategory(true);
                          setEditNewCategoryInput('');
                        }}
                        className="text-[11px] font-bold text-amber-600 hover:text-amber-700 flex items-center gap-0.5"
                      >
                        <Plus className="w-3 h-3" />
                        <span>+ New Category</span>
                      </button>
                    )}
                  </div>

                  {isEditAddingNewCategory ? (
                    <div className="flex items-center gap-1.5 animate-in fade-in duration-150">
                      <input
                        type="text"
                        autoFocus
                        value={editNewCategoryInput}
                        onChange={e => setEditNewCategoryInput(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddEditCategory();
                          }
                        }}
                        placeholder="e.g. Soups, Continental"
                        className="flex-1 min-w-0 px-2.5 py-1.5 bg-white text-gray-900 font-semibold border border-amber-500 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500 shadow-2xs text-xs"
                      />
                      <button
                        type="button"
                        onClick={handleAddEditCategory}
                        className="px-2.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-lg text-xs transition shadow-2xs whitespace-nowrap"
                      >
                        Add
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsEditAddingNewCategory(false)}
                        className="px-2 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 font-semibold rounded-lg text-xs transition"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <select
                      value={editingItem.category ?? 'Momos & Dimsums'}
                      onChange={e => {
                        if (e.target.value === '__add_new__') {
                          setIsEditAddingNewCategory(true);
                          setEditNewCategoryInput('');
                          return;
                        }
                        const cat = e.target.value;
                        const isRec = cat.toLowerCase().includes('cafe') || cat.toLowerCase().includes('drink') || cat.toLowerCase().includes('dessert') || cat.toLowerCase().includes('beverage');
                        setEditingItem({
                          ...editingItem,
                          category: cat,
                          kotDestination: isRec ? 'reception' : editingItem.kotDestination
                        });
                      }}
                      className="w-full px-3 py-2 bg-white text-gray-900 font-semibold border border-gray-300 rounded-lg focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 shadow-2xs"
                    >
                      {allCategories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                      <option value="__add_new__" className="font-bold text-amber-600">+ Create New Category...</option>
                    </select>
                  )}
                </div>

                <div>
                  <label className="font-bold text-gray-900 block mb-1">Price (Rs.) *</label>
                  <input
                    type="number"
                    value={editingItem.price ?? 0}
                    onChange={e => setEditingItem({ ...editingItem, price: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-white text-gray-900 font-mono font-bold border border-gray-300 rounded-lg focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 shadow-2xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-gray-900 block mb-1">Dietary Tag</label>
                  <select
                    value={editingItem.dietary ?? 'veg'}
                    onChange={e => setEditingItem({ ...editingItem, dietary: e.target.value as any })}
                    className="w-full px-3 py-2 bg-white text-gray-900 font-semibold border border-gray-300 rounded-lg focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 shadow-2xs"
                  >
                    <option value="veg">🥬 Vegetarian (Pure Veg)</option>
                    <option value="non-veg">🍗 Non-Vegetarian</option>
                    <option value="vegan">🌱 Vegan</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-gray-900 block mb-1">KOT Destination</label>
                  <select
                    value={editingItem.kotDestination || (editingItem.category?.includes('Cafe') || editingItem.category?.includes('Desserts') ? 'reception' : 'kitchen')}
                    onChange={e => setEditingItem({ ...editingItem, kotDestination: e.target.value as any })}
                    className="w-full px-3 py-2 bg-white text-gray-900 font-bold border border-gray-300 rounded-lg focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 shadow-2xs"
                  >
                    <option value="kitchen">👨‍🍳 KITCHEN (Main Kitchen / Wok)</option>
                    <option value="reception">☕ RECEPTION (Cafe / Barista)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-gray-900 block mb-1">Description & Notes</label>
                <textarea
                  rows={2}
                  value={editingItem.description ?? ''}
                  onChange={e => setEditingItem({ ...editingItem, description: e.target.value })}
                  className="w-full px-3 py-2 bg-white text-gray-900 font-medium border border-gray-300 rounded-lg placeholder:text-gray-400 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 shadow-2xs"
                />
              </div>

              {/* Enhanced Dish Image Upload & Link */}
              <DishImageUploader
                value={editingItem.image}
                onChange={url => setEditingItem({ ...editingItem, image: url })}
                idPrefix="edit-dish-img"
                label="Dish Image (Device Upload or Google / Web Link)"
              />

              {/* Checkboxes in Edit Modal */}
              <div className="pt-2 border-t border-gray-200">
                <label className="font-bold text-gray-900 block mb-2">Item Attributes & Badges</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <label className={`flex items-center gap-2.5 p-2.5 rounded-lg border cursor-pointer transition ${
                    editingItem.inStock ? 'bg-emerald-50/60 border-emerald-300 text-emerald-950 font-bold' : 'bg-gray-50 border-gray-300 text-gray-700'
                  }`}>
                    <input
                      type="checkbox"
                      checked={editingItem.inStock ?? true}
                      onChange={e => setEditingItem({ ...editingItem, inStock: e.target.checked })}
                      className="w-4 h-4 rounded text-emerald-600 accent-emerald-600 border-gray-300 focus:ring-emerald-500 cursor-pointer"
                    />
                    <span className="text-xs font-semibold">In Stock (Active)</span>
                  </label>

                  <label className={`flex items-center gap-2.5 p-2.5 rounded-lg border cursor-pointer transition ${
                    editingItem.isChefSpecial ? 'bg-amber-50/60 border-amber-300 text-amber-950 font-bold' : 'bg-gray-50 border-gray-300 text-gray-700'
                  }`}>
                    <input
                      type="checkbox"
                      checked={Boolean(editingItem.isChefSpecial)}
                      onChange={e => setEditingItem({ ...editingItem, isChefSpecial: e.target.checked })}
                      className="w-4 h-4 rounded text-amber-600 accent-amber-600 border-gray-300 focus:ring-amber-500 cursor-pointer"
                    />
                    <span className="text-xs font-semibold">Chef's Special</span>
                  </label>

                  <label className={`flex items-center gap-2.5 p-2.5 rounded-lg border cursor-pointer transition ${
                    editingItem.isPopular ? 'bg-rose-50/60 border-rose-300 text-rose-950 font-bold' : 'bg-gray-50 border-gray-300 text-gray-700'
                  }`}>
                    <input
                      type="checkbox"
                      checked={Boolean(editingItem.isPopular)}
                      onChange={e => setEditingItem({ ...editingItem, isPopular: e.target.checked })}
                      className="w-4 h-4 rounded text-rose-600 accent-rose-600 border-gray-300 focus:ring-rose-500 cursor-pointer"
                    />
                    <span className="text-xs font-semibold">Bestseller</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-gray-200 flex items-center justify-end gap-2">
              <button
                onClick={() => setEditingItem(null)}
                className="px-4 py-2 rounded-xl border border-gray-300 text-gray-700 text-xs font-bold hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEditItem}
                className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-extrabold shadow-md shadow-amber-500/20 transition"
              >
                Update Dish
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Dish Confirmation Modal */}
      {itemToDelete && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-200 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center flex-shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-base text-gray-900">Are you sure you want to delete?</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  This dish will be permanently removed from the menu and QR ordering.
                </p>
              </div>
              <button
                onClick={() => setItemToDelete(null)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Dish details summary */}
            <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 flex items-center gap-3">
              {itemToDelete.image ? (
                <img
                  src={normalizeImageUrl(itemToDelete.image) || DEFAULT_DISH_IMAGE}
                  alt={itemToDelete.name}
                  className="w-12 h-12 rounded-lg object-cover flex-shrink-0 border border-gray-200 bg-gray-100"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    e.currentTarget.src = DEFAULT_DISH_IMAGE;
                  }}
                />
              ) : (
                <div className="w-12 h-12 rounded-lg bg-gray-200 flex items-center justify-center text-gray-400">
                  <ChefHat className="w-5 h-5" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span
                    className={`w-2 h-2 rounded-full flex-shrink-0 ${
                      itemToDelete.dietary === 'veg' ? 'bg-emerald-500' : 'bg-rose-500'
                    }`}
                  />
                  <h4 className="font-bold text-xs text-gray-900 truncate">
                    {itemToDelete.name}
                  </h4>
                </div>
                <div className="flex items-center gap-2 mt-0.5 text-[11px] text-gray-500">
                  <span>{itemToDelete.category}</span>
                  <span>•</span>
                  <span className="font-mono font-bold text-gray-900">
                    Rs. {itemToDelete.price.toLocaleString()}.00
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-gray-200 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setItemToDelete(null)}
                className="px-4 py-2 rounded-xl border border-gray-300 text-gray-700 text-xs font-bold hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  deleteMenuItem(itemToDelete.id);
                  setItemToDelete(null);
                }}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-extrabold shadow-md shadow-rose-600/20 transition flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
