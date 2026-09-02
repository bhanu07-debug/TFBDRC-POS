import React, { useState } from 'react';
import { usePOS } from '../../context/POSContext';
import { InventoryItem } from '../../types';
import {
  Package,
  AlertTriangle,
  CheckCircle2,
  Plus,
  Minus,
  RotateCcw,
  Search,
  ShoppingCart,
  TrendingDown,
  DollarSign,
  XCircle,
  Trash2,
  Edit2,
  X,
  Truck,
  ArrowRight,
  Boxes,
  Layers,
  HelpCircle,
  Check
} from 'lucide-react';

export const InventoryView: React.FC = () => {
  const {
    inventory,
    addInventoryItem,
    updateInventoryItem,
    deleteInventoryItem,
    updateInventoryStock
  } = usePOS();

  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [restockItem, setRestockItem] = useState<InventoryItem | null>(null);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [itemToDelete, setItemToDelete] = useState<InventoryItem | null>(null);

  // Add Item Form State
  const [newItem, setNewItem] = useState({
    name: '',
    category: 'Dairy & Cheese',
    sku: '',
    unit: 'kg',
    currentStock: 10,
    minThreshold: 3,
    costPerUnit: 250,
    supplier: ''
  });

  // Restock Form State
  const [restockAddQty, setRestockAddQty] = useState<number>(10);
  const [restockExactStock, setRestockExactStock] = useState<number>(0);
  const [restockMode, setRestockMode] = useState<'add' | 'set'>('add');
  const [restockMinThreshold, setRestockMinThreshold] = useState<number>(3);
  const [restockUnitCost, setRestockUnitCost] = useState<number>(0);
  const [restockSupplier, setRestockSupplier] = useState<string>('');

  const categories = [
    'all',
    'Dairy & Cheese',
    'Proteins & Seafood',
    'Gourmet Ingredients',
    'Sauces & Condiments',
    'Bakery & Grains',
    'Beverages & Bar',
    'Fresh Produce',
    'Spices & Seasonings',
    'Packaging & Disposables'
  ];

  const standardUnits = ['kg', 'ltr', 'pcs', 'pack', 'gms', 'bottles', 'cans', 'boxes'];

  const filteredInventory = inventory.filter(item => {
    if (categoryFilter !== 'all' && item.category !== categoryFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const nameMatch = (item.name || '').toLowerCase().includes(q);
      const supplierMatch = (item.supplier || '').toLowerCase().includes(q);
      const skuMatch = (item.sku || '').toLowerCase().includes(q);
      const catMatch = (item.category || '').toLowerCase().includes(q);
      if (!nameMatch && !supplierMatch && !skuMatch && !catMatch) {
        return false;
      }
    }
    return true;
  });

  const lowStockCount = inventory.filter(i => {
    const min = i.minThreshold ?? i.minimumStock ?? 5;
    return i.currentStock > 0 && i.currentStock <= min;
  }).length;

  const outOfStockCount = inventory.filter(i => i.currentStock <= 0).length;
  const inStockCount = inventory.filter(i => {
    const min = i.minThreshold ?? i.minimumStock ?? 5;
    return i.currentStock > min;
  }).length;

  const totalValuation = inventory.reduce((sum, i) => sum + (Number(i.currentStock) || 0) * (Number(i.costPerUnit) || 0), 0);

  // Open Add Modal
  const handleOpenAddModal = () => {
    const defaultSku = `SKU-${Date.now().toString(36).toUpperCase().slice(-6)}`;
    setNewItem({
      name: '',
      category: 'Dairy & Cheese',
      sku: defaultSku,
      unit: 'kg',
      currentStock: 10,
      minThreshold: 3,
      costPerUnit: 250,
      supplier: ''
    });
    setIsAddModalOpen(true);
  };

  // Submit Add Item
  const handleSaveNewItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItem.name.trim()) return;

    await addInventoryItem({
      name: newItem.name.trim(),
      category: newItem.category,
      sku: newItem.sku || `SKU-${Date.now().toString(36).toUpperCase()}`,
      unit: newItem.unit,
      currentStock: Number(newItem.currentStock) || 0,
      minThreshold: Number(newItem.minThreshold) || 3,
      minimumStock: Number(newItem.minThreshold) || 3,
      costPerUnit: Number(newItem.costPerUnit) || 0,
      supplier: newItem.supplier.trim() || 'General Supplier',
      isActive: true
    });

    setIsAddModalOpen(false);
  };

  // Open Restock Modal
  const handleOpenRestock = (item: InventoryItem) => {
    setRestockItem(item);
    setRestockMode('add');
    setRestockAddQty(10);
    setRestockExactStock(item.currentStock + 10);
    setRestockMinThreshold(item.minThreshold ?? item.minimumStock ?? 3);
    setRestockUnitCost(item.costPerUnit || 0);
    setRestockSupplier(item.supplier || '');
  };

  // Submit Restock
  const handleSaveRestock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restockItem) return;

    const finalStock = restockMode === 'add'
      ? Math.max(0, restockItem.currentStock + Number(restockAddQty || 0))
      : Math.max(0, Number(restockExactStock || 0));

    await updateInventoryStock(
      restockItem.id,
      finalStock,
      Number(restockUnitCost),
      Number(restockMinThreshold),
      restockSupplier.trim() || restockItem.supplier
    );

    setRestockItem(null);
  };

  // Open Edit Modal
  const handleOpenEdit = (item: InventoryItem) => {
    setEditingItem({ ...item });
  };

  // Submit Edit Modal
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    await updateInventoryItem({
      ...editingItem,
      currentStock: Number(editingItem.currentStock) || 0,
      minThreshold: Number(editingItem.minThreshold) || 3,
      minimumStock: Number(editingItem.minThreshold) || 3,
      costPerUnit: Number(editingItem.costPerUnit) || 0
    });

    setEditingItem(null);
  };

  // Confirm Delete
  const handleConfirmDelete = async () => {
    if (!itemToDelete) return;
    await deleteInventoryItem(itemToDelete.id);
    setItemToDelete(null);
  };

  return (
    <div className="space-y-6" id="inventory-view-container">
      {/* Header with Add Item Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-gray-900 tracking-tight flex items-center gap-2">
            <Package className="w-5 h-5 text-amber-600" />
            <span>Inventory & Stock Management</span>
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Real-time pantry stock levels, automated low-stock warnings, and restock tracking.
          </p>
        </div>

        <button
          id="btn-add-inventory-item"
          onClick={handleOpenAddModal}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl shadow-sm transition active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Item</span>
        </button>
      </div>

      {/* 4 Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-white rounded-xl border border-gray-200 shadow-xs">
          <div className="flex items-center justify-between text-xs text-gray-500 font-semibold">
            <span>Total SKUs</span>
            <Package className="w-4 h-4 text-blue-500" />
          </div>
          <div className="mt-2 text-2xl font-bold text-gray-900 font-mono">
            {inventory.length} SKUs
          </div>
          <p className="text-[11px] text-gray-400 mt-1">{inStockCount} items healthy</p>
        </div>

        <div className="p-4 bg-white rounded-xl border border-gray-200 shadow-xs">
          <div className="flex items-center justify-between text-xs text-amber-700 font-semibold">
            <span>Low Stock</span>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>
          <div className="mt-2 text-2xl font-bold text-amber-600 font-mono">
            {lowStockCount} Items
          </div>
          <p className="text-[11px] text-amber-700 mt-1">Below minimum threshold</p>
        </div>

        <div className="p-4 bg-white rounded-xl border border-gray-200 shadow-xs">
          <div className="flex items-center justify-between text-xs text-rose-700 font-semibold">
            <span>Out of Stock</span>
            <XCircle className="w-4 h-4 text-rose-500" />
          </div>
          <div className="mt-2 text-2xl font-bold text-rose-600 font-mono">
            {outOfStockCount} Items
          </div>
          <p className="text-[11px] text-rose-700 mt-1">Immediate restock required</p>
        </div>

        <div className="p-4 bg-white rounded-xl border border-gray-200 shadow-xs">
          <div className="flex items-center justify-between text-xs text-emerald-700 font-semibold">
            <span>Stock Valuation</span>
            <DollarSign className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="mt-2 text-2xl font-bold text-emerald-600 font-mono">
            Rs. {totalValuation.toLocaleString()}
          </div>
          <p className="text-[11px] text-emerald-700 mt-1">Current pantry asset value</p>
        </div>
      </div>

      {/* Search & Category Filter */}
      <div className="p-4 bg-white rounded-xl border border-gray-200 shadow-xs flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            id="input-search-inventory"
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search pantry ingredients, SKUs, suppliers..."
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs text-gray-900 font-medium placeholder:text-gray-400 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
          />
        </div>

        <select
          id="select-category-filter"
          value={categoryFilter}
          onChange={e => setCategoryFilter(e.target.value)}
          className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs text-gray-900 font-semibold focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
        >
          {categories.map(c => (
            <option key={c} value={c}>
              {c === 'all' ? 'All Categories' : c}
            </option>
          ))}
        </select>
      </div>

      {/* Stock Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-gray-500 uppercase tracking-wider text-[10px] font-bold">
                <th className="p-3.5">Ingredient / SKU</th>
                <th className="p-3.5">Category</th>
                <th className="p-3.5">Current Stock</th>
                <th className="p-3.5">Min Threshold</th>
                <th className="p-3.5">Unit Cost</th>
                <th className="p-3.5">Supplier</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 font-medium">
              {filteredInventory.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center">
                    <div className="flex flex-col items-center justify-center text-gray-400 space-y-2">
                      <Package className="w-8 h-8 text-gray-300" />
                      <p className="text-sm font-bold text-gray-700">No inventory items found</p>
                      <p className="text-xs text-gray-500">
                        {searchQuery || categoryFilter !== 'all'
                          ? 'Try adjusting your search query or category filter'
                          : 'Get started by adding your first ingredient or pantry stock item.'}
                      </p>
                      <button
                        onClick={handleOpenAddModal}
                        className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-bold transition shadow-xs"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add New Item</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredInventory.map(item => {
                  const minThreshold = item.minThreshold ?? item.minimumStock ?? 3;
                  const isOutOfStock = item.currentStock <= 0;
                  const isLow = !isOutOfStock && item.currentStock <= minThreshold;

                  const statusLabel = isOutOfStock
                    ? 'Out of Stock'
                    : isLow
                    ? 'Low Stock'
                    : 'In Stock';

                  return (
                    <tr key={item.id} className="hover:bg-gray-50/80 transition group">
                      <td className="p-3.5">
                        <span className="font-bold text-gray-900 block">{item.name}</span>
                        <div className="flex items-center gap-2 mt-0.5">
                          {item.sku && (
                            <span className="font-mono text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                              {item.sku}
                            </span>
                          )}
                          <span className="text-[10px] text-gray-400">{item.unit} basis</span>
                        </div>
                      </td>

                      <td className="p-3.5 text-gray-700 font-medium">
                        <span className="px-2 py-0.5 rounded-md bg-gray-100 text-gray-700 text-[11px] font-semibold">
                          {item.category || 'General'}
                        </span>
                      </td>

                      <td className="p-3.5 font-mono font-bold text-gray-900">
                        <span className={`text-sm ${isOutOfStock ? 'text-rose-600 font-black' : isLow ? 'text-amber-600' : 'text-gray-900'}`}>
                          {item.currentStock}
                        </span>{' '}
                        <span className="text-gray-400 text-xs font-normal">{item.unit}</span>
                      </td>

                      <td className="p-3.5 font-mono text-gray-500">
                        {minThreshold} {item.unit}
                      </td>

                      <td className="p-3.5 font-mono text-gray-900 font-bold">
                        Rs. {Number(item.costPerUnit || 0).toLocaleString()}
                        <span className="text-[10px] text-gray-400 font-normal">/{item.unit}</span>
                      </td>

                      <td className="p-3.5 text-gray-600">
                        {item.supplier || <span className="text-gray-300 italic">Not set</span>}
                      </td>

                      <td className="p-3.5">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border inline-flex items-center gap-1 ${
                            isOutOfStock
                              ? 'bg-rose-50 text-rose-700 border-rose-200'
                              : isLow
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            isOutOfStock ? 'bg-rose-500' : isLow ? 'bg-amber-500' : 'bg-emerald-500'
                          }`} />
                          {statusLabel}
                        </span>
                      </td>

                      <td className="p-3.5 text-right space-x-1.5 whitespace-nowrap">
                        {/* Restock Button */}
                        <button
                          id={`btn-restock-inventory-${item.id}`}
                          onClick={() => handleOpenRestock(item)}
                          className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-lg text-xs font-bold transition inline-flex items-center gap-1 shadow-2xs cursor-pointer"
                          title="Restock Stock"
                        >
                          <Plus className="w-3.5 h-3.5 text-amber-600" />
                          <span>Restock</span>
                        </button>

                        {/* Edit Button */}
                        <button
                          id={`btn-edit-inventory-${item.id}`}
                          onClick={() => handleOpenEdit(item)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-amber-600 hover:bg-amber-50 transition border border-transparent hover:border-amber-200"
                          title="Edit Details"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        {/* Delete Button */}
                        <button
                          id={`btn-delete-inventory-${item.id}`}
                          onClick={() => setItemToDelete(item)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50 transition border border-transparent hover:border-rose-200"
                          title="Delete Item"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
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

      {/* ==================================================== */}
      {/* 1. ADD NEW INVENTORY ITEM MODAL */}
      {/* ==================================================== */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center">
                  <Package className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-gray-900">Add Inventory Item</h3>
                  <p className="text-[11px] text-gray-500">Track pantry ingredient, bar liquor, or packaging stock</p>
                </div>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveNewItem} className="space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-gray-900 block mb-1">Item / Ingredient Name *</label>
                <input
                  type="text"
                  required
                  value={newItem.name ?? ''}
                  onChange={e => setNewItem({ ...newItem, name: e.target.value })}
                  placeholder="e.g. Fresh Mozzarella Cheese, Truffle Oil, Basmati Rice"
                  className="w-full px-3 py-2 bg-white text-gray-900 font-semibold border border-gray-300 rounded-lg placeholder:text-gray-400 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 shadow-2xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-gray-900 block mb-1">Category *</label>
                  <select
                    value={newItem.category ?? 'Dairy & Cheese'}
                    onChange={e => setNewItem({ ...newItem, category: e.target.value })}
                    className="w-full px-3 py-2 bg-white text-gray-900 font-semibold border border-gray-300 rounded-lg focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 shadow-2xs"
                  >
                    {categories.filter(c => c !== 'all').map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-bold text-gray-900 block mb-1">SKU / Item Code</label>
                  <input
                    type="text"
                    value={newItem.sku ?? ''}
                    onChange={e => setNewItem({ ...newItem, sku: e.target.value })}
                    placeholder="e.g. SKU-MOZZ-01"
                    className="w-full px-3 py-2 bg-white text-gray-900 font-mono font-bold border border-gray-300 rounded-lg placeholder:text-gray-400 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 shadow-2xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-bold text-gray-900 block mb-1">Unit of Measure *</label>
                  <select
                    value={newItem.unit ?? 'kg'}
                    onChange={e => setNewItem({ ...newItem, unit: e.target.value })}
                    className="w-full px-3 py-2 bg-white text-gray-900 font-semibold border border-gray-300 rounded-lg focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 shadow-2xs"
                  >
                    {standardUnits.map(u => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-bold text-gray-900 block mb-1">Initial Stock *</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    required
                    value={newItem.currentStock ?? 0}
                    onChange={e => setNewItem({ ...newItem, currentStock: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-white text-gray-900 font-mono font-bold border border-gray-300 rounded-lg focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 shadow-2xs"
                  />
                </div>

                <div>
                  <label className="font-bold text-gray-900 block mb-1">Min Threshold *</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    required
                    value={newItem.minThreshold ?? 3}
                    onChange={e => setNewItem({ ...newItem, minThreshold: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-white text-gray-900 font-mono font-bold border border-gray-300 rounded-lg focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 shadow-2xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-gray-900 block mb-1">Unit Cost (Rs.) *</label>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    required
                    value={newItem.costPerUnit ?? 0}
                    onChange={e => setNewItem({ ...newItem, costPerUnit: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-white text-gray-900 font-mono font-bold border border-gray-300 rounded-lg focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 shadow-2xs"
                  />
                </div>

                <div>
                  <label className="font-bold text-gray-900 block mb-1">Supplier / Vendor</label>
                  <input
                    type="text"
                    value={newItem.supplier ?? ''}
                    onChange={e => setNewItem({ ...newItem, supplier: e.target.value })}
                    placeholder="e.g. Amul Dairy Distribution"
                    className="w-full px-3 py-2 bg-white text-gray-900 font-medium border border-gray-300 rounded-lg placeholder:text-gray-400 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 shadow-2xs"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-gray-200 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-gray-300 text-gray-700 text-xs font-bold hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-extrabold shadow-md shadow-amber-500/20 transition flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Save Inventory Item</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* 2. RESTOCK MODAL (Interactive & Live Calculations) */}
      {/* ==================================================== */}
      {restockItem && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center">
                  <Truck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-gray-900">Restock Item</h3>
                  <p className="text-[11px] text-gray-500">{restockItem.name} ({restockItem.category})</p>
                </div>
              </div>
              <button
                onClick={() => setRestockItem(null)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveRestock} className="space-y-4 text-xs">
              {/* Current Stock Banner */}
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 flex items-center justify-between">
                <div>
                  <span className="text-gray-500 text-[11px] block">Current On-Hand Stock</span>
                  <span className="font-mono font-bold text-gray-900 text-sm">
                    {restockItem.currentStock} {restockItem.unit}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-gray-500 text-[11px] block">Minimum Threshold</span>
                  <span className="font-mono font-semibold text-gray-700 text-sm">
                    {restockItem.minThreshold ?? restockItem.minimumStock ?? 3} {restockItem.unit}
                  </span>
                </div>
              </div>

              {/* Mode Selection */}
              <div>
                <label className="font-bold text-gray-900 block mb-1.5">Restock Method</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setRestockMode('add')}
                    className={`py-2 px-3 rounded-lg border text-xs font-bold flex items-center justify-center gap-1.5 transition ${
                      restockMode === 'add'
                        ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
                        : 'bg-gray-50 text-gray-700 border-gray-300 hover:bg-gray-100'
                    }`}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add to Stock (+ Qty)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setRestockMode('set');
                      setRestockExactStock(restockItem.currentStock);
                    }}
                    className={`py-2 px-3 rounded-lg border text-xs font-bold flex items-center justify-center gap-1.5 transition ${
                      restockMode === 'set'
                        ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
                        : 'bg-gray-50 text-gray-700 border-gray-300 hover:bg-gray-100'
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>Set Exact Stock Level</span>
                  </button>
                </div>
              </div>

              {/* Restock Quantity Input */}
              {restockMode === 'add' ? (
                <div>
                  <label className="font-bold text-gray-900 block mb-1">
                    Quantity to Add ({restockItem.unit}) *
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      step="0.1"
                      min="0.1"
                      required
                      value={restockAddQty ?? 0}
                      onChange={e => setRestockAddQty(parseFloat(e.target.value) || 0)}
                      className="flex-1 px-3 py-2 bg-white text-gray-900 font-mono font-bold text-sm border border-gray-300 rounded-lg focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 shadow-2xs"
                    />
                    {/* Quick + Buttons */}
                    {[5, 10, 25, 50].map(qty => (
                      <button
                        key={qty}
                        type="button"
                        onClick={() => setRestockAddQty(qty)}
                        className="px-2.5 py-2 bg-gray-100 hover:bg-amber-100 hover:text-amber-800 text-gray-700 rounded-lg font-mono font-bold text-xs border border-gray-200 transition"
                      >
                        +{qty}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div>
                  <label className="font-bold text-gray-900 block mb-1">
                    New Total On-Hand Stock ({restockItem.unit}) *
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    required
                    value={restockExactStock ?? 0}
                    onChange={e => setRestockExactStock(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-white text-gray-900 font-mono font-bold text-sm border border-gray-300 rounded-lg focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 shadow-2xs"
                  />
                </div>
              )}

              {/* Threshold, Unit Cost, and Supplier */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-gray-900 block mb-1">
                    Min Stock Threshold ({restockItem.unit})
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={restockMinThreshold ?? 0}
                    onChange={e => setRestockMinThreshold(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-white text-gray-900 font-mono font-bold border border-gray-300 rounded-lg focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 shadow-2xs"
                  />
                </div>

                <div>
                  <label className="font-bold text-gray-900 block mb-1">
                    Cost Per Unit (Rs./{restockItem.unit})
                  </label>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    value={restockUnitCost ?? 0}
                    onChange={e => setRestockUnitCost(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-white text-gray-900 font-mono font-bold border border-gray-300 rounded-lg focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 shadow-2xs"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-gray-900 block mb-1">Supplier / Batch Vendor</label>
                <input
                  type="text"
                  value={restockSupplier ?? ''}
                  onChange={e => setRestockSupplier(e.target.value)}
                  placeholder="e.g. Amul Dairy Distribution"
                  className="w-full px-3 py-2 bg-white text-gray-900 font-medium border border-gray-300 rounded-lg placeholder:text-gray-400 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 shadow-2xs"
                />
              </div>

              {/* Calculated Summary Preview */}
              {(() => {
                const finalStock = restockMode === 'add'
                  ? Math.max(0, restockItem.currentStock + Number(restockAddQty || 0))
                  : Math.max(0, Number(restockExactStock || 0));
                const addedStock = restockMode === 'add'
                  ? Number(restockAddQty || 0)
                  : Math.max(0, finalStock - restockItem.currentStock);
                const batchCost = addedStock * Number(restockUnitCost || 0);
                const isHealthy = finalStock > Number(restockMinThreshold);

                return (
                  <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-200 space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-semibold text-emerald-950">
                      <span>Updated Resulting Stock:</span>
                      <span className="font-mono font-bold text-sm text-emerald-900">
                        {finalStock} {restockItem.unit}
                      </span>
                    </div>
                    {batchCost > 0 && (
                      <div className="flex items-center justify-between text-[11px] text-emerald-800">
                        <span>Restock Batch Value:</span>
                        <span className="font-mono font-bold">
                          Rs. {batchCost.toLocaleString()}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center gap-1 text-[11px] text-emerald-700 pt-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>
                        Status after restock:{' '}
                        <strong className="text-emerald-900">
                          {isHealthy ? 'Healthy In Stock' : 'Below Minimum Threshold'}
                        </strong>
                      </span>
                    </div>
                  </div>
                );
              })()}

              <div className="pt-3 border-t border-gray-200 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setRestockItem(null)}
                  className="px-4 py-2 rounded-xl border border-gray-300 text-gray-700 text-xs font-bold hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold shadow-md shadow-emerald-600/20 transition flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Confirm Restock</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* 3. EDIT INVENTORY ITEM MODAL */}
      {/* ==================================================== */}
      {editingItem && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center">
                  <Edit2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-gray-900">Edit Inventory Item</h3>
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

            <form onSubmit={handleSaveEdit} className="space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-gray-900 block mb-1">Item / Ingredient Name *</label>
                <input
                  type="text"
                  required
                  value={editingItem.name ?? ''}
                  onChange={e => setEditingItem({ ...editingItem, name: e.target.value })}
                  className="w-full px-3 py-2 bg-white text-gray-900 font-semibold border border-gray-300 rounded-lg focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 shadow-2xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-gray-900 block mb-1">Category *</label>
                  <select
                    value={editingItem.category ?? 'Dairy & Cheese'}
                    onChange={e => setEditingItem({ ...editingItem, category: e.target.value })}
                    className="w-full px-3 py-2 bg-white text-gray-900 font-semibold border border-gray-300 rounded-lg focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 shadow-2xs"
                  >
                    {categories.filter(c => c !== 'all').map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-bold text-gray-900 block mb-1">SKU / Item Code</label>
                  <input
                    type="text"
                    value={editingItem.sku ?? ''}
                    onChange={e => setEditingItem({ ...editingItem, sku: e.target.value })}
                    className="w-full px-3 py-2 bg-white text-gray-900 font-mono font-bold border border-gray-300 rounded-lg focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 shadow-2xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-bold text-gray-900 block mb-1">Unit of Measure *</label>
                  <select
                    value={editingItem.unit ?? 'kg'}
                    onChange={e => setEditingItem({ ...editingItem, unit: e.target.value })}
                    className="w-full px-3 py-2 bg-white text-gray-900 font-semibold border border-gray-300 rounded-lg focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 shadow-2xs"
                  >
                    {standardUnits.map(u => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-bold text-gray-900 block mb-1">Current Stock *</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    required
                    value={editingItem.currentStock ?? 0}
                    onChange={e => setEditingItem({ ...editingItem, currentStock: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-white text-gray-900 font-mono font-bold border border-gray-300 rounded-lg focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 shadow-2xs"
                  />
                </div>

                <div>
                  <label className="font-bold text-gray-900 block mb-1">Min Threshold *</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    required
                    value={editingItem.minThreshold ?? editingItem.minimumStock ?? 3}
                    onChange={e => setEditingItem({ ...editingItem, minThreshold: parseFloat(e.target.value) || 0, minimumStock: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-white text-gray-900 font-mono font-bold border border-gray-300 rounded-lg focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 shadow-2xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-gray-900 block mb-1">Unit Cost (Rs.) *</label>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    required
                    value={editingItem.costPerUnit ?? 0}
                    onChange={e => setEditingItem({ ...editingItem, costPerUnit: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-white text-gray-900 font-mono font-bold border border-gray-300 rounded-lg focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 shadow-2xs"
                  />
                </div>

                <div>
                  <label className="font-bold text-gray-900 block mb-1">Supplier / Vendor</label>
                  <input
                    type="text"
                    value={editingItem.supplier ?? ''}
                    onChange={e => setEditingItem({ ...editingItem, supplier: e.target.value })}
                    className="w-full px-3 py-2 bg-white text-gray-900 font-medium border border-gray-300 rounded-lg focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 shadow-2xs"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-gray-200 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="px-4 py-2 rounded-xl border border-gray-300 text-gray-700 text-xs font-bold hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-extrabold shadow-md shadow-amber-500/20 transition flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Update Details</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* 4. DELETE CONFIRMATION MODAL (Frontend + DB Sync) */}
      {/* ==================================================== */}
      {itemToDelete && (
        <div id="modal-delete-inventory" className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-200 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center flex-shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-base text-gray-900">Are you sure you want to delete?</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  This item will be permanently removed from inventory records, database, and stock alerts.
                </p>
              </div>
              <button
                onClick={() => setItemToDelete(null)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Inventory Item details summary */}
            <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 space-y-1">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-xs text-gray-900">{itemToDelete.name}</h4>
                <span className="text-[10px] font-mono bg-gray-200 text-gray-700 px-1.5 py-0.5 rounded font-bold">
                  {itemToDelete.sku || 'NO SKU'}
                </span>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-gray-500">
                <span>{itemToDelete.category}</span>
                <span>•</span>
                <span>
                  Current Stock: <strong className="text-gray-900">{itemToDelete.currentStock} {itemToDelete.unit}</strong>
                </span>
                <span>•</span>
                <span>
                  Cost: <strong className="text-gray-900">Rs. {itemToDelete.costPerUnit}/{itemToDelete.unit}</strong>
                </span>
              </div>
              {itemToDelete.supplier && (
                <div className="text-[10px] text-gray-400 pt-0.5">
                  Supplier: {itemToDelete.supplier}
                </div>
              )}
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
                id="btn-confirm-delete-inventory"
                onClick={handleConfirmDelete}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-extrabold shadow-md shadow-rose-600/20 transition flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Item</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
