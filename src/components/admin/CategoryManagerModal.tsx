import React, { useState, useMemo } from 'react';
import { usePOS } from '../../context/POSContext';
import { MenuItem, Category } from '../../types';
import { CATEGORY_NAMES } from '../../data/restaurantMenu';
import {
  X,
  Plus,
  Edit2,
  Trash2,
  Check,
  Tag,
  AlertTriangle,
  Layers,
  UtensilsCrossed,
  Search
} from 'lucide-react';

export interface CategoryManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories?: Category[];
  allCategoryNames?: string[];
  menuItems?: MenuItem[];
  onAddCategory?: (name: string, description?: string) => Promise<Category>;
  onUpdateCategory?: (id: string, newName: string, description?: string, oldName?: string) => Promise<void>;
  onDeleteCategory?: (id: string, categoryName: string, fallbackCategory?: string) => Promise<void>;
}

export const CategoryManagerModal: React.FC<CategoryManagerModalProps> = ({
  isOpen,
  onClose,
  categories: propCategories,
  allCategoryNames: propAllCategoryNames,
  menuItems: propMenuItems,
  onAddCategory: propOnAddCategory,
  onUpdateCategory: propOnUpdateCategory,
  onDeleteCategory: propOnDeleteCategory
}) => {
  const pos = usePOS();
  const effectiveCategories = propCategories ?? pos.categories ?? [];
  const effectiveMenuItems = propMenuItems ?? pos.menuItems ?? [];
  const onAddCategory = propOnAddCategory ?? pos.addCategory;
  const onUpdateCategory = propOnUpdateCategory ?? pos.updateCategory;
  const onDeleteCategory = propOnDeleteCategory ?? pos.deleteCategory;

  const effectiveAllCategoryNames = useMemo(() => {
    if (propAllCategoryNames && propAllCategoryNames.length > 0) {
      return propAllCategoryNames;
    }
    const set = new Set<string>(CATEGORY_NAMES || []);
    (effectiveCategories || []).forEach(c => {
      if (c && c.name && c.name.trim()) set.add(c.name.trim());
    });
    (effectiveMenuItems || []).forEach(i => {
      if (i && i.category && i.category.trim()) set.add(i.category.trim());
    });
    return Array.from(set);
  }, [propAllCategoryNames, effectiveCategories, effectiveMenuItems]);

  const [newCatName, setNewCatName] = useState('');
  const [newCatDesc, setNewCatDesc] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Editing state
  const [editingCatKey, setEditingCatKey] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');

  // Deleting state
  const [catToDelete, setCatToDelete] = useState<{
    id: string;
    name: string;
    itemCount: number;
  } | null>(null);
  const [fallbackCategory, setFallbackCategory] = useState('Special');

  // Compute unified list of all categories with dish counts
  const categoryListWithStats = useMemo(() => {
    // 1. Calculate count of dishes per category
    const itemCounts: Record<string, number> = {};
    (effectiveMenuItems || []).forEach(item => {
      if (!item) return;
      const cat = (item.category || '').trim();
      if (cat) {
        itemCounts[cat] = (itemCounts[cat] || 0) + 1;
      }
    });

    // 2. Build normalized map
    const map = new Map<string, { id: string; name: string; description: string; count: number }>();

    // Add categories from Firestore
    (effectiveCategories || []).forEach(c => {
      if (c && c.name && c.name.trim()) {
        const trimmed = c.name.trim();
        const key = trimmed.toLowerCase();
        map.set(key, {
          id: c.id,
          name: trimmed,
          description: c.description || '',
          count: itemCounts[trimmed] || 0
        });
      }
    });

    // Add any category names from allCategoryNames / menu items not yet in Firestore
    (effectiveAllCategoryNames || []).forEach(catName => {
      if (!catName) return;
      const trimmed = catName.trim();
      if (!trimmed || trimmed === 'All') return;
      const key = trimmed.toLowerCase();
      if (!map.has(key)) {
        map.set(key, {
          id: `cat-${key.replace(/[^a-z0-9]+/g, '-')}`,
          name: trimmed,
          description: 'Restaurant catalog section',
          count: itemCounts[trimmed] || 0
        });
      }
    });

    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [effectiveCategories, effectiveAllCategoryNames, effectiveMenuItems]);

  const filteredCategories = useMemo(() => {
    if (!searchTerm.trim()) return categoryListWithStats;
    const q = searchTerm.toLowerCase();
    return categoryListWithStats.filter(c =>
      c.name.toLowerCase().includes(q) || c.description.toLowerCase().includes(q)
    );
  }, [categoryListWithStats, searchTerm]);

  if (!isOpen) return null;

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newCatName.trim();
    if (!trimmed) return;

    setIsSubmitting(true);
    try {
      await onAddCategory(trimmed, newCatDesc.trim() || undefined);
      setNewCatName('');
      setNewCatDesc('');
    } catch (err) {
      console.error('Failed to create category:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartEdit = (cat: { id: string; name: string; description: string }) => {
    setEditingCatKey(cat.id);
    setEditName(cat.name);
    setEditDesc(cat.description || '');
  };

  const handleSaveEdit = async (cat: { id: string; name: string }) => {
    const trimmedNewName = editName.trim();
    if (!trimmedNewName) return;

    setIsSubmitting(true);
    try {
      await onUpdateCategory(cat.id, trimmedNewName, editDesc.trim(), cat.name);
      setEditingCatKey(null);
    } catch (err) {
      console.error('Failed to update category:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!catToDelete) return;

    setIsSubmitting(true);
    try {
      await onDeleteCategory(catToDelete.id, catToDelete.name, fallbackCategory);
      setCatToDelete(null);
    } catch (err) {
      console.error('Failed to delete category:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      id="category-manager-backdrop"
      className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
    >
      <div
        id="category-manager-modal"
        className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-gray-200 space-y-5 animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-gray-200">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-lg text-gray-900 tracking-tight">
                  Manage Menu Categories
                </h3>
                <span className="px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-amber-100 text-amber-800 border border-amber-200">
                  {categoryListWithStats.length} Total
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                Add, rename, or delete categories. Changes sync in real-time across all guest table QR menus and POS.
              </p>
            </div>
          </div>
          <button
            id="close-category-manager"
            onClick={onClose}
            className="p-2 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Add Category Section */}
        <div className="p-4 bg-amber-50/50 border border-amber-200 rounded-xl space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-amber-950">
            <Plus className="w-4 h-4 text-amber-600" />
            <span>Add New Category</span>
          </div>

          <form onSubmit={handleCreateCategory} className="space-y-2.5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input
                id="new-category-name-input"
                type="text"
                value={newCatName}
                onChange={e => setNewCatName(e.target.value)}
                placeholder="Category Name (e.g. Sizzlers, Cafe & Bar)"
                className="px-3 py-2 bg-white text-gray-900 font-semibold border border-gray-300 rounded-lg text-xs focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 shadow-2xs"
                required
              />
              <input
                id="new-category-desc-input"
                type="text"
                value={newCatDesc}
                onChange={e => setNewCatDesc(e.target.value)}
                placeholder="Optional description / details..."
                className="px-3 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg text-xs focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 shadow-2xs"
              />
            </div>
            <div className="flex justify-end">
              <button
                id="btn-save-new-category"
                type="submit"
                disabled={isSubmitting || !newCatName.trim()}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white text-xs font-bold rounded-lg transition shadow-2xs flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Category to Menu</span>
              </button>
            </div>
          </form>
        </div>

        {/* Search & List of Categories */}
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                id="search-category-input"
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Search categories..."
                className="w-full pl-9 pr-3 py-1.5 bg-gray-50 text-gray-900 text-xs border border-gray-200 rounded-lg focus:outline-none focus:bg-white focus:border-amber-500"
              />
            </div>
            <span className="text-[11px] text-gray-500 font-medium">
              Showing {filteredCategories.length} categories
            </span>
          </div>

          {/* Categories List Container */}
          <div className="border border-gray-200 rounded-xl overflow-hidden divide-y divide-gray-100 max-h-72 overflow-y-auto">
            {filteredCategories.length === 0 ? (
              <div className="p-8 text-center text-xs text-gray-500">
                No categories match your search.
              </div>
            ) : (
              filteredCategories.map(cat => {
                const isEditing = editingCatKey === cat.id;

                if (isEditing) {
                  return (
                    <div
                      key={cat.id}
                      className="p-3 bg-amber-50/70 border-l-4 border-l-amber-500 space-y-2.5 transition"
                    >
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] font-bold text-gray-700 block mb-0.5">Category Name *</label>
                          <input
                            type="text"
                            value={editName}
                            onChange={e => setEditName(e.target.value)}
                            className="w-full px-2.5 py-1.5 bg-white text-gray-900 font-bold border border-amber-500 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
                            autoFocus
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-gray-700 block mb-0.5">Description</label>
                          <input
                            type="text"
                            value={editDesc}
                            onChange={e => setEditDesc(e.target.value)}
                            placeholder="Optional description"
                            className="w-full px-2.5 py-1.5 bg-white text-gray-900 border border-gray-300 rounded-lg text-xs focus:outline-none focus:border-amber-500"
                          />
                        </div>
                      </div>
                      <div className="flex items-center justify-between pt-1">
                        <span className="text-[10px] text-gray-500">
                          Editing this will update category name for all {cat.count} assigned dishes.
                        </span>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setEditingCatKey(null)}
                            className="px-2.5 py-1 rounded-lg border border-gray-300 text-gray-600 text-xs font-semibold hover:bg-gray-100 transition cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSaveEdit(cat)}
                            disabled={isSubmitting || !editName.trim()}
                            className="px-3 py-1 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Save</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={cat.id}
                    className="p-3 flex items-center justify-between gap-3 hover:bg-gray-50/80 transition"
                  >
                    <div className="flex items-start gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-gray-100 text-gray-700 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Tag className="w-4 h-4 text-gray-600" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-bold text-xs text-gray-900 truncate">
                            {cat.name}
                          </h4>
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 text-gray-700 border border-gray-200">
                            <UtensilsCrossed className="w-2.5 h-2.5" />
                            <span>{cat.count} {cat.count === 1 ? 'dish' : 'dishes'}</span>
                          </span>
                        </div>
                        {cat.description && (
                          <p className="text-[11px] text-gray-500 truncate max-w-sm mt-0.5">
                            {cat.description}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => handleStartEdit(cat)}
                        className="p-1.5 rounded-lg text-gray-500 hover:text-amber-700 hover:bg-amber-50 transition cursor-pointer"
                        title={`Edit ${cat.name}`}
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          const otherCats = categoryListWithStats.filter(c => c.name !== cat.name);
                          setFallbackCategory(otherCats[0]?.name || 'Special');
                          setCatToDelete({
                            id: cat.id,
                            name: cat.name,
                            itemCount: cat.count
                          });
                        }}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                        title={`Delete ${cat.name}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-gray-200 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-gray-900 hover:bg-black text-white text-xs font-bold transition shadow-xs cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>

      {/* Delete Confirmation Submodal */}
      {catToDelete && (
        <div className="fixed inset-0 z-60 overflow-y-auto flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-rose-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-gray-900">
                  Delete Category: {catToDelete.name}?
                </h4>
                <p className="text-xs text-gray-500 mt-0.5">
                  This category will be permanently removed from all table menus.
                </p>
              </div>
            </div>

            {catToDelete.itemCount > 0 ? (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-2 text-xs text-amber-950">
                <p className="font-semibold">
                  ⚠️ This category currently has <strong>{catToDelete.itemCount} active {catToDelete.itemCount === 1 ? 'dish' : 'dishes'}</strong>.
                </p>
                <div>
                  <label className="block text-[11px] font-bold text-gray-800 mb-1">
                    Reassign existing dishes to:
                  </label>
                  <select
                    value={fallbackCategory}
                    onChange={e => setFallbackCategory(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white text-gray-900 font-semibold border border-amber-300 rounded-lg text-xs focus:outline-none"
                  >
                    {categoryListWithStats
                      .filter(c => c.name !== catToDelete.name)
                      .map(c => (
                        <option key={c.id} value={c.name}>
                          {c.name}
                        </option>
                      ))}
                    <option value="Special">Special / Miscellaneous</option>
                  </select>
                </div>
              </div>
            ) : (
              <p className="text-xs text-gray-600">
                There are no dishes currently using this category. It is safe to remove.
              </p>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-200">
              <button
                type="button"
                onClick={() => setCatToDelete(null)}
                className="px-3.5 py-1.5 rounded-lg border border-gray-300 text-gray-700 text-xs font-semibold hover:bg-gray-50 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isSubmitting}
                className="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isSubmitting ? 'Deleting...' : 'Confirm Delete'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
