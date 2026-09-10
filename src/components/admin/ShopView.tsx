import React, { useState, useMemo } from 'react';
import { usePOS } from '../../context/POSContext';
import { MenuItem, MenuItemVariant, Department, PaymentMethod } from '../../types';
import {
  ShoppingBag,
  Plus,
  Search,
  Edit2,
  Trash2,
  Package,
  Tag,
  DollarSign,
  Layers,
  CheckCircle2,
  X,
  CreditCard,
  User,
  Phone,
  ArrowRight,
  TrendingUp,
  AlertCircle
} from 'lucide-react';

export const ShopView: React.FC = () => {
  const {
    menuItems,
    categories: firestoreCategories,
    addShopProduct,
    updateShopProduct,
    deleteShopProduct,
    createShopWalkInOrder,
    addCategory
  } = usePOS();

  const [activeSubTab, setActiveSubTab] = useState<'products' | 'pos'>('products');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  // Product Modals
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [itemToDelete, setItemToDelete] = useState<MenuItem | null>(null);

  // Walk-In POS State
  const [walkInCart, setWalkInCart] = useState<Array<{
    item: MenuItem;
    quantity: number;
    selectedVariant?: MenuItemVariant;
  }>>([]);
  const [walkInCustomerName, setWalkInCustomerName] = useState('');
  const [walkInCustomerPhone, setWalkInCustomerPhone] = useState('');
  const [walkInDiscount, setWalkInDiscount] = useState<number>(0);
  const [walkInPaymentMethod, setWalkInPaymentMethod] = useState<PaymentMethod>('cash');
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [checkoutSuccessMessage, setCheckoutSuccessMessage] = useState<string | null>(null);

  // Add Product Form State
  const [formData, setFormData] = useState({
    name: '',
    category: 'Clothing',
    description: '',
    sku: '',
    price: 999,
    costPrice: 500,
    size: '',
    color: '',
    stockQuantity: 10,
    image: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=600&q=80',
    variants: [] as MenuItemVariant[]
  });

  // Variant helper for modal
  const [newVariant, setNewVariant] = useState({
    name: 'M / Black',
    size: 'M',
    color: 'Black',
    price: 999,
    sku: '',
    stockQuantity: 10
  });

  // Shop Products only (department === 'SHOP')
  const shopProducts = useMemo(() => {
    return menuItems.filter(item => item.department === 'SHOP');
  }, [menuItems]);

  // Shop Categories
  const shopCategories = useMemo(() => {
    const set = new Set<string>();
    (firestoreCategories || [])
      .filter(c => c.department === 'SHOP')
      .forEach(c => set.add(c.name.trim()));
    shopProducts.forEach(p => {
      if (p.category) set.add(p.category.trim());
    });
    if (set.size === 0) {
      set.add('Clothing');
      set.add('Accessories');
      set.add('Merchandise');
    }
    return Array.from(set);
  }, [firestoreCategories, shopProducts]);

  const filteredProducts = useMemo(() => {
    return shopProducts.filter(item => {
      if (selectedCategory !== 'All' && item.category !== selectedCategory) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = item.name.toLowerCase().includes(q);
        const matchesSku = (item.sku || '').toLowerCase().includes(q);
        const matchesCategory = (item.category || '').toLowerCase().includes(q);
        return matchesName || matchesSku || matchesCategory;
      }
      return true;
    });
  }, [shopProducts, selectedCategory, searchQuery]);

  // Inventory totals
  const totalStock = useMemo(() => {
    return shopProducts.reduce((sum, p) => {
      if (p.variants && p.variants.length > 0) {
        return sum + p.variants.reduce((vSum, v) => vSum + (v.stockQuantity || 0), 0);
      }
      return sum + (p.stockQuantity || 0);
    }, 0);
  }, [shopProducts]);

  const totalInventoryValue = useMemo(() => {
    return shopProducts.reduce((sum, p) => {
      const price = p.price || 0;
      const stock = (p.variants && p.variants.length > 0)
        ? p.variants.reduce((vSum, v) => vSum + (v.stockQuantity || 0), 0)
        : (p.stockQuantity || 0);
      return sum + (price * stock);
    }, 0);
  }, [shopProducts]);

  const handleOpenAddModal = () => {
    setFormData({
      name: '',
      category: shopCategories[0] || 'Clothing',
      description: '',
      sku: `SKU-${Math.floor(1000 + Math.random() * 9000)}`,
      price: 999,
      costPrice: 500,
      size: 'M',
      color: 'Black',
      stockQuantity: 10,
      image: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=600&q=80',
      variants: []
    });
    setIsNewModalOpen(true);
  };

  const handleAddVariantToForm = () => {
    if (!newVariant.name.trim()) return;
    const vId = `var-${Date.now().toString(36)}-${Math.floor(10 + Math.random() * 90)}`;
    setFormData(prev => ({
      ...prev,
      variants: [
        ...prev.variants,
        {
          id: vId,
          name: newVariant.name,
          size: newVariant.size,
          color: newVariant.color,
          price: Number(newVariant.price) || prev.price,
          sku: newVariant.sku || `${prev.sku}-${newVariant.size}`,
          stockQuantity: Number(newVariant.stockQuantity) || 0
        }
      ]
    }));
    setNewVariant({
      name: '',
      size: 'L',
      color: 'Black',
      price: formData.price,
      sku: '',
      stockQuantity: 10
    });
  };

  const handleRemoveVariantFromForm = (id: string) => {
    setFormData(prev => ({
      ...prev,
      variants: prev.variants.filter(v => v.id !== id)
    }));
  };

  const handleSaveNewProduct = async () => {
    if (!formData.name.trim()) return;

    // Strict Rule 2: department = SHOP, kotDestination = RECEPTION
    await addShopProduct({
      name: formData.name.trim(),
      category: formData.category,
      department: 'SHOP',
      kotDestination: 'RECEPTION',
      description: formData.description,
      sku: formData.sku,
      price: Number(formData.price),
      costPrice: Number(formData.costPrice),
      size: formData.size,
      color: formData.color,
      stockQuantity: Number(formData.stockQuantity),
      image: formData.image,
      variants: formData.variants,
      isAvailable: true,
      inStock: Number(formData.stockQuantity) > 0 || formData.variants.some(v => (v.stockQuantity || 0) > 0)
    });

    setIsNewModalOpen(false);
  };

  const handleStartEdit = (item: MenuItem) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      category: item.category || 'Clothing',
      description: item.description || '',
      sku: item.sku || '',
      price: item.price,
      costPrice: item.costPrice || 0,
      size: item.size || '',
      color: item.color || '',
      stockQuantity: item.stockQuantity ?? 0,
      image: item.image || '',
      variants: item.variants || []
    });
  };

  const handleSaveEditProduct = async () => {
    if (!editingItem || !formData.name.trim()) return;

    await updateShopProduct(editingItem.id, {
      name: formData.name.trim(),
      category: formData.category,
      department: 'SHOP',
      kotDestination: 'RECEPTION',
      description: formData.description,
      sku: formData.sku,
      price: Number(formData.price),
      costPrice: Number(formData.costPrice),
      size: formData.size,
      color: formData.color,
      stockQuantity: Number(formData.stockQuantity),
      image: formData.image,
      variants: formData.variants,
      inStock: Number(formData.stockQuantity) > 0 || formData.variants.some(v => (v.stockQuantity || 0) > 0)
    });

    setEditingItem(null);
  };

  const handleDeleteProduct = async () => {
    if (!itemToDelete) return;
    await deleteShopProduct(itemToDelete.id);
    setItemToDelete(null);
  };

  // Walk-In Retail Cart Logic
  const handleAddToCart = (product: MenuItem, variant?: MenuItemVariant) => {
    setWalkInCart(prev => {
      const existing = prev.find(
        ci => ci.item.id === product.id && ci.selectedVariant?.id === variant?.id
      );
      if (existing) {
        return prev.map(ci =>
          ci === existing ? { ...ci, quantity: ci.quantity + 1 } : ci
        );
      }
      return [...prev, { item: product, quantity: 1, selectedVariant: variant }];
    });
  };

  const handleUpdateCartQty = (idx: number, delta: number) => {
    setWalkInCart(prev => {
      const copy = [...prev];
      const newQty = copy[idx].quantity + delta;
      if (newQty <= 0) {
        copy.splice(idx, 1);
      } else {
        copy[idx] = { ...copy[idx], quantity: newQty };
      }
      return copy;
    });
  };

  const cartSubtotal = useMemo(() => {
    return walkInCart.reduce((sum, ci) => {
      const price = ci.selectedVariant ? ci.selectedVariant.price : ci.item.price;
      return sum + (price * ci.quantity);
    }, 0);
  }, [walkInCart]);

  const cartTotal = Math.max(0, cartSubtotal - (walkInDiscount || 0));

  const handleExecuteWalkInCheckout = async () => {
    if (walkInCart.length === 0) return;
    setIsCheckingOut(true);
    setCheckoutSuccessMessage(null);

    try {
      const formattedItems = walkInCart.map(ci => ({
        menuItem: ci.item,
        quantity: ci.quantity,
        selectedVariant: ci.selectedVariant,
        instructions: ci.selectedVariant ? `Size/Color: ${ci.selectedVariant.name}` : undefined
      }));

      const createdOrder = await createShopWalkInOrder(
        formattedItems,
        walkInPaymentMethod,
        walkInCustomerName.trim() || undefined,
        walkInCustomerPhone.trim() || undefined,
        walkInDiscount,
        'Shop Cashier'
      );

      setCheckoutSuccessMessage(
        `Order ${createdOrder.orderNumber} placed & settled successfully! NPR ${createdOrder.total.toLocaleString()} (${walkInPaymentMethod.toUpperCase()}). Reception KOT generated.`
      );
      setWalkInCart([]);
      setWalkInCustomerName('');
      setWalkInCustomerPhone('');
      setWalkInDiscount(0);

      setTimeout(() => {
        setCheckoutSuccessMessage(null);
      }, 7000);
    } catch (err) {
      console.error("Walk-in sale checkout failed:", err);
      alert("Checkout failed. Check console or connection.");
    } finally {
      setIsCheckingOut(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Subtabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#111827] p-5 rounded-2xl border border-slate-800 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
            <ShoppingBag className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-white">Clothing & Merchandise Shop</h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                Department: SHOP
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                KOT: RECEPTION
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Integrated retail store • Walk-in sales & dining table additions • Size/color variants & stock
            </p>
          </div>
        </div>

        {/* Subtab Toggle Buttons */}
        <div className="flex items-center gap-2 bg-[#0B0F17] p-1.5 rounded-xl border border-slate-800">
          <button
            onClick={() => setActiveSubTab('products')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeSubTab === 'products'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Package className="w-4 h-4" />
            Product Catalog & Inventory ({shopProducts.length})
          </button>
          <button
            onClick={() => setActiveSubTab('pos')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeSubTab === 'pos'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            Walk-In Retail POS ({walkInCart.reduce((sum, i) => sum + i.quantity, 0)})
          </button>
        </div>
      </div>

      {/* Metric Cards Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-[#111827] p-4 rounded-xl border border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-400">Total Shop Products</p>
            <p className="text-2xl font-bold text-white mt-1">{shopProducts.length}</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400">
            <Tag className="w-5 h-5" />
          </div>
        </div>
        <div className="bg-[#111827] p-4 rounded-xl border border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-400">Total In-Stock Units</p>
            <p className="text-2xl font-bold text-emerald-400 mt-1">{totalStock}</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>
        <div className="bg-[#111827] p-4 rounded-xl border border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-400">Retail Inventory Valuation</p>
            <p className="text-2xl font-bold text-amber-400 mt-1">NPR {totalInventoryValue.toLocaleString()}</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-400">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Success Banner */}
      {checkoutSuccessMessage && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 p-4 rounded-xl flex items-center gap-3 text-emerald-400 text-sm">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span>{checkoutSuccessMessage}</span>
        </div>
      )}

      {/* SUBTAB 1: PRODUCTS & INVENTORY MANAGEMENT */}
      {activeSubTab === 'products' && (
        <div className="space-y-4">
          {/* Controls Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex flex-1 items-center gap-2 max-w-md bg-[#111827] px-3 py-2 rounded-xl border border-slate-800">
              <Search className="w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search shop products, SKU, colors..."
                className="bg-transparent border-none text-sm text-white focus:outline-none w-full placeholder-slate-500"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="text-slate-500 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Category pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              <button
                onClick={() => setSelectedCategory('All')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                  selectedCategory === 'All'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-[#111827] text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                All
              </button>
              {shopCategories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                    selectedCategory === cat
                      ? 'bg-indigo-600 text-white'
                      : 'bg-[#111827] text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Add Product Button */}
            <button
              onClick={handleOpenAddModal}
              className="flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-indigo-600/20"
            >
              <Plus className="w-4 h-4" />
              Add Shop Product
            </button>
          </div>

          {/* Product Grid / Table */}
          {filteredProducts.length === 0 ? (
            <div className="bg-[#111827] rounded-2xl border border-slate-800 p-12 text-center">
              <ShoppingBag className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <h3 className="text-base font-bold text-white">No Shop Products Found</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1 mb-4">
                No products currently match your search. Click below to add your first clothing item or merchandise.
              </p>
              <button
                onClick={handleOpenAddModal}
                className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl"
              >
                <Plus className="w-4 h-4" />
                Add Product Now
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredProducts.map(product => {
                const totalProdStock = (product.variants && product.variants.length > 0)
                  ? product.variants.reduce((sum, v) => sum + (v.stockQuantity || 0), 0)
                  : (product.stockQuantity || 0);

                return (
                  <div
                    key={product.id}
                    className="bg-[#111827] rounded-xl border border-slate-800 overflow-hidden hover:border-slate-700 transition-all flex flex-col justify-between"
                  >
                    <div>
                      {/* Product Image */}
                      <div className="relative h-40 bg-slate-900 overflow-hidden">
                        <img
                          src={product.image || 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=600&q=80'}
                          alt={product.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=600&q=80';
                          }}
                        />
                        <div className="absolute top-2 left-2 flex flex-col gap-1">
                          <span className="px-2 py-0.5 bg-black/70 backdrop-blur-xs text-indigo-300 text-[10px] font-semibold rounded-md border border-indigo-500/30">
                            {product.category || 'Clothing'}
                          </span>
                          {product.sku && (
                            <span className="px-2 py-0.5 bg-black/70 backdrop-blur-xs text-slate-300 text-[10px] font-mono rounded-md">
                              {product.sku}
                            </span>
                          )}
                        </div>
                        <div className="absolute top-2 right-2">
                          <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-md ${
                            totalProdStock > 0 ? 'bg-emerald-500/80 text-white' : 'bg-rose-500/80 text-white'
                          }`}>
                            {totalProdStock > 0 ? `${totalProdStock} in stock` : 'Out of stock'}
                          </span>
                        </div>
                      </div>

                      {/* Product Content */}
                      <div className="p-4 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="font-bold text-sm text-white line-clamp-1">{product.name}</h4>
                          <span className="font-bold text-amber-400 text-sm whitespace-nowrap">
                            NPR {product.price.toLocaleString()}
                          </span>
                        </div>

                        {product.description && (
                          <p className="text-xs text-slate-400 line-clamp-2">{product.description}</p>
                        )}

                        {/* Specs row */}
                        <div className="flex items-center gap-2 pt-1 flex-wrap text-[11px] text-slate-400">
                          {product.size && (
                            <span className="bg-slate-800 px-2 py-0.5 rounded text-slate-300">
                              Size: <strong className="text-white">{product.size}</strong>
                            </span>
                          )}
                          {product.color && (
                            <span className="bg-slate-800 px-2 py-0.5 rounded text-slate-300">
                              Color: <strong className="text-white">{product.color}</strong>
                            </span>
                          )}
                          {product.costPrice ? (
                            <span className="text-slate-500">
                              Cost: NPR {product.costPrice}
                            </span>
                          ) : null}
                        </div>

                        {/* Variants Preview */}
                        {product.variants && product.variants.length > 0 && (
                          <div className="pt-2 border-t border-slate-800/80">
                            <p className="text-[10px] font-semibold uppercase text-slate-500 mb-1">
                              Variants ({product.variants.length})
                            </p>
                            <div className="flex flex-wrap gap-1">
                              {product.variants.map(v => (
                                <span
                                  key={v.id}
                                  className="text-[10px] px-1.5 py-0.5 bg-slate-800/70 border border-slate-700/60 rounded text-slate-300"
                                >
                                  {v.name} ({v.stockQuantity ?? 0})
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Actions Bar */}
                    <div className="p-3 bg-slate-900/50 border-t border-slate-800 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleStartEdit(product)}
                          className="p-1.5 text-slate-400 hover:text-indigo-400 hover:bg-slate-800 rounded-lg transition-colors"
                          title="Edit Product"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setItemToDelete(product)}
                          className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors"
                          title="Delete Product"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <button
                        onClick={() => {
                          handleAddToCart(product);
                          setActiveSubTab('pos');
                        }}
                        className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white text-xs font-semibold rounded-lg transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Sell Walk-in
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* SUBTAB 2: WALK-IN RETAIL POS */}
      {activeSubTab === 'pos' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Products Selector (2 Cols) */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-[#111827] p-4 rounded-xl border border-slate-800 flex items-center justify-between gap-4">
              <div className="flex items-center gap-2 flex-1">
                <Search className="w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Scan or search clothing item..."
                  className="bg-transparent border-none text-sm text-white focus:outline-none w-full"
                />
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setSelectedCategory('All')}
                  className={`px-2.5 py-1 rounded text-xs ${
                    selectedCategory === 'All' ? 'bg-indigo-600 text-white' : 'text-slate-400'
                  }`}
                >
                  All
                </button>
                {shopCategories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-2.5 py-1 rounded text-xs ${
                      selectedCategory === cat ? 'bg-indigo-600 text-white' : 'text-slate-400'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {filteredProducts.map(product => {
                const hasVariants = product.variants && product.variants.length > 0;
                return (
                  <div
                    key={product.id}
                    className="bg-[#111827] rounded-xl border border-slate-800 p-3 flex flex-col justify-between hover:border-indigo-500/50 transition-colors cursor-pointer group"
                    onClick={() => {
                      if (!hasVariants) {
                        handleAddToCart(product);
                      }
                    }}
                  >
                    <div>
                      <div className="h-24 rounded-lg bg-slate-900 overflow-hidden mb-2 relative">
                        <img
                          src={product.image || 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=600&q=80'}
                          alt={product.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                        <span className="absolute bottom-1 right-1 px-1.5 py-0.5 bg-black/80 text-amber-400 text-[10px] font-bold rounded">
                          NPR {product.price}
                        </span>
                      </div>
                      <h4 className="font-semibold text-xs text-white line-clamp-1">{product.name}</h4>
                      <p className="text-[11px] text-slate-400">{product.size || ''} {product.color ? `• ${product.color}` : ''}</p>
                    </div>

                    {hasVariants ? (
                      <div className="mt-2 pt-2 border-t border-slate-800 space-y-1">
                        <p className="text-[9px] uppercase font-semibold text-slate-500">Select Variant:</p>
                        <div className="flex flex-col gap-1 max-h-24 overflow-y-auto">
                          {product.variants!.map(v => (
                            <button
                              key={v.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAddToCart(product, v);
                              }}
                              className="text-left px-2 py-1 bg-slate-800/80 hover:bg-indigo-600 text-[10px] rounded text-slate-200 hover:text-white flex items-center justify-between"
                            >
                              <span>{v.name}</span>
                              <span className="font-bold">NPR {v.price}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleAddToCart(product)}
                        className="mt-2 w-full py-1.5 bg-indigo-600/20 group-hover:bg-indigo-600 text-indigo-300 group-hover:text-white text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Add to Cart
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Retail Checkout Cart Sidebar (1 Col) */}
          <div className="bg-[#111827] rounded-2xl border border-slate-800 p-5 flex flex-col justify-between h-fit sticky top-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <ShoppingBag className="w-5 h-5 text-indigo-400" />
                  <h3 className="font-bold text-sm text-white">Walk-in Retail Order</h3>
                </div>
                <span className="px-2 py-0.5 bg-indigo-500/10 text-indigo-400 rounded text-xs font-mono">
                  Table #00 (Walk-In)
                </span>
              </div>

              {/* Customer Info (Optional) */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 bg-[#0B0F17] px-3 py-2 rounded-lg border border-slate-800">
                  <User className="w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={walkInCustomerName}
                    onChange={e => setWalkInCustomerName(e.target.value)}
                    placeholder="Customer Name (optional)"
                    className="bg-transparent border-none text-xs text-white focus:outline-none w-full"
                  />
                </div>
                <div className="flex items-center gap-2 bg-[#0B0F17] px-3 py-2 rounded-lg border border-slate-800">
                  <Phone className="w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={walkInCustomerPhone}
                    onChange={e => setWalkInCustomerPhone(e.target.value)}
                    placeholder="Customer Mobile (optional)"
                    className="bg-transparent border-none text-xs text-white focus:outline-none w-full"
                  />
                </div>
              </div>

              {/* Items List */}
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {walkInCart.length === 0 ? (
                  <div className="py-8 text-center text-slate-500 text-xs">
                    Cart is empty. Select products from the list.
                  </div>
                ) : (
                  walkInCart.map((ci, idx) => {
                    const price = ci.selectedVariant ? ci.selectedVariant.price : ci.item.price;
                    return (
                      <div
                        key={`${ci.item.id}-${ci.selectedVariant?.id || 'base'}`}
                        className="bg-[#0B0F17] p-2.5 rounded-lg border border-slate-800 flex items-center justify-between gap-2"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-white truncate">{ci.item.name}</p>
                          {ci.selectedVariant && (
                            <p className="text-[10px] text-indigo-400">Var: {ci.selectedVariant.name}</p>
                          )}
                          <p className="text-[11px] text-amber-400">NPR {price} each</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex items-center bg-slate-800 rounded">
                            <button
                              onClick={() => handleUpdateCartQty(idx, -1)}
                              className="px-2 py-0.5 text-xs text-slate-300 hover:text-white"
                            >
                              -
                            </button>
                            <span className="px-2 text-xs font-bold text-white">{ci.quantity}</span>
                            <button
                              onClick={() => handleUpdateCartQty(idx, 1)}
                              className="px-2 py-0.5 text-xs text-slate-300 hover:text-white"
                            >
                              +
                            </button>
                          </div>
                          <span className="font-bold text-xs text-white min-w-16 text-right">
                            NPR {(price * ci.quantity).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Discount Input */}
              <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs">
                <span className="text-slate-400">Discount (NPR):</span>
                <input
                  type="number"
                  min="0"
                  value={walkInDiscount}
                  onChange={e => setWalkInDiscount(Number(e.target.value) || 0)}
                  className="w-24 px-2 py-1 bg-[#0B0F17] border border-slate-800 rounded text-right text-xs text-white"
                />
              </div>

              {/* Payment Method Selector */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-slate-400">Payment Method:</label>
                <div className="grid grid-cols-4 gap-1.5">
                  {(['cash', 'fonepay', 'card', 'qr'] as PaymentMethod[]).map(pm => (
                    <button
                      key={pm}
                      onClick={() => setWalkInPaymentMethod(pm)}
                      className={`py-1.5 text-[11px] font-semibold rounded uppercase transition-colors ${
                        walkInPaymentMethod === pm
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'bg-[#0B0F17] text-slate-400 border border-slate-800 hover:text-white'
                      }`}
                    >
                      {pm}
                    </button>
                  ))}
                </div>
              </div>

              {/* Summary Totals */}
              <div className="pt-3 border-t border-slate-800 space-y-1 text-xs">
                <div className="flex justify-between text-slate-400">
                  <span>Subtotal:</span>
                  <span>NPR {cartSubtotal.toLocaleString()}</span>
                </div>
                {walkInDiscount > 0 && (
                  <div className="flex justify-between text-rose-400">
                    <span>Discount:</span>
                    <span>- NPR {walkInDiscount.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-bold text-white pt-1 border-t border-slate-800">
                  <span>Total Payable:</span>
                  <span className="text-amber-400 text-base">NPR {cartTotal.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Checkout Action Button */}
            <button
              onClick={handleExecuteWalkInCheckout}
              disabled={walkInCart.length === 0 || isCheckingOut}
              className={`mt-4 w-full py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all ${
                walkInCart.length === 0 || isCheckingOut
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/30'
              }`}
            >
              {isCheckingOut ? (
                <span>Processing Payment...</span>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Settle & Print Reception KOT (NPR {cartTotal.toLocaleString()})</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* MODAL: ADD / EDIT PRODUCT */}
      {(isNewModalOpen || editingItem) && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#111827] rounded-2xl border border-slate-800 max-w-xl w-full p-6 space-y-4 text-slate-100 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-base text-white">
                {editingItem ? 'Edit Shop Product' : 'Add New Clothing / Shop Product'}
              </h3>
              <button
                onClick={() => {
                  setIsNewModalOpen(false);
                  setEditingItem(null);
                }}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="col-span-2">
                <label className="text-slate-400 mb-1 block">Product Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Fat Buddha Premium T-Shirt"
                  className="w-full bg-[#0B0F17] border border-slate-800 rounded-lg p-2 text-white"
                />
              </div>

              <div>
                <label className="text-slate-400 mb-1 block">Category</label>
                <select
                  value={formData.category}
                  onChange={e => setFormData({ ...formData, category: e.target.value })}
                  className="w-full bg-[#0B0F17] border border-slate-800 rounded-lg p-2 text-white"
                >
                  {shopCategories.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                  <option value="Clothing">Clothing</option>
                  <option value="Accessories">Accessories</option>
                  <option value="Merchandise">Merchandise</option>
                </select>
              </div>

              <div>
                <label className="text-slate-400 mb-1 block">SKU Code</label>
                <input
                  type="text"
                  value={formData.sku}
                  onChange={e => setFormData({ ...formData, sku: e.target.value })}
                  placeholder="e.g. TSH-001"
                  className="w-full bg-[#0B0F17] border border-slate-800 rounded-lg p-2 text-white font-mono"
                />
              </div>

              <div>
                <label className="text-slate-400 mb-1 block">Selling Price (NPR) *</label>
                <input
                  type="number"
                  value={formData.price}
                  onChange={e => setFormData({ ...formData, price: Number(e.target.value) })}
                  className="w-full bg-[#0B0F17] border border-slate-800 rounded-lg p-2 text-white"
                />
              </div>

              <div>
                <label className="text-slate-400 mb-1 block">Cost Price (NPR)</label>
                <input
                  type="number"
                  value={formData.costPrice}
                  onChange={e => setFormData({ ...formData, costPrice: Number(e.target.value) })}
                  className="w-full bg-[#0B0F17] border border-slate-800 rounded-lg p-2 text-white"
                />
              </div>

              <div>
                <label className="text-slate-400 mb-1 block">Primary Size</label>
                <input
                  type="text"
                  value={formData.size}
                  onChange={e => setFormData({ ...formData, size: e.target.value })}
                  placeholder="e.g. M, L, XL or Free Size"
                  className="w-full bg-[#0B0F17] border border-slate-800 rounded-lg p-2 text-white"
                />
              </div>

              <div>
                <label className="text-slate-400 mb-1 block">Primary Color</label>
                <input
                  type="text"
                  value={formData.color}
                  onChange={e => setFormData({ ...formData, color: e.target.value })}
                  placeholder="e.g. Black, White, Maroon"
                  className="w-full bg-[#0B0F17] border border-slate-800 rounded-lg p-2 text-white"
                />
              </div>

              <div>
                <label className="text-slate-400 mb-1 block">Base Stock Quantity</label>
                <input
                  type="number"
                  value={formData.stockQuantity}
                  onChange={e => setFormData({ ...formData, stockQuantity: Number(e.target.value) })}
                  className="w-full bg-[#0B0F17] border border-slate-800 rounded-lg p-2 text-white"
                />
              </div>

              <div>
                <label className="text-slate-400 mb-1 block">Image URL</label>
                <input
                  type="text"
                  value={formData.image}
                  onChange={e => setFormData({ ...formData, image: e.target.value })}
                  placeholder="https://..."
                  className="w-full bg-[#0B0F17] border border-slate-800 rounded-lg p-2 text-white"
                />
              </div>

              <div className="col-span-2">
                <label className="text-slate-400 mb-1 block">Description</label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Fabric specs, wash care instructions, etc."
                  className="w-full bg-[#0B0F17] border border-slate-800 rounded-lg p-2 text-white"
                />
              </div>
            </div>

            {/* Variants Management */}
            <div className="border-t border-slate-800 pt-3 space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-white uppercase">Size & Color Variants</h4>
                <span className="text-[10px] text-slate-400">Separate stock for each size/color</span>
              </div>

              {formData.variants.length > 0 && (
                <div className="space-y-1.5 max-h-36 overflow-y-auto">
                  {formData.variants.map(v => (
                    <div
                      key={v.id}
                      className="flex items-center justify-between bg-[#0B0F17] px-3 py-1.5 rounded-lg border border-slate-800 text-xs"
                    >
                      <span className="font-semibold text-white">{v.name}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-slate-400">Stock: {v.stockQuantity ?? 0}</span>
                        <span className="text-amber-400">NPR {v.price}</span>
                        <button
                          onClick={() => handleRemoveVariantFromForm(v.id)}
                          className="text-rose-400 hover:text-rose-300"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Add Variant Subform */}
              <div className="bg-[#0B0F17] p-2.5 rounded-lg border border-slate-800 grid grid-cols-4 gap-2 text-xs">
                <input
                  type="text"
                  placeholder="Variant (e.g. S / White)"
                  value={newVariant.name}
                  onChange={e => setNewVariant({ ...newVariant, name: e.target.value })}
                  className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white"
                />
                <input
                  type="text"
                  placeholder="Size (e.g. S)"
                  value={newVariant.size}
                  onChange={e => setNewVariant({ ...newVariant, size: e.target.value })}
                  className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white"
                />
                <input
                  type="number"
                  placeholder="Stock"
                  value={newVariant.stockQuantity}
                  onChange={e => setNewVariant({ ...newVariant, stockQuantity: Number(e.target.value) })}
                  className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white"
                />
                <button
                  type="button"
                  onClick={handleAddVariantToForm}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white rounded px-2 py-1 text-xs font-semibold"
                >
                  + Add Variant
                </button>
              </div>
            </div>

            {/* Enforced Routing Banner */}
            <div className="p-2.5 bg-indigo-500/10 border border-indigo-500/30 rounded-lg text-[11px] text-indigo-300 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-indigo-400" />
              <span>
                System Rule Enforced: <strong>Department = SHOP</strong> & <strong>kotDestination = RECEPTION</strong>.
              </span>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => {
                  setIsNewModalOpen(false);
                  setEditingItem(null);
                }}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={editingItem ? handleSaveEditProduct : handleSaveNewProduct}
                className="px-5 py-2 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/20"
              >
                {editingItem ? 'Save Changes' : 'Create Shop Product'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: DELETE CONFIRMATION */}
      {itemToDelete && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#111827] rounded-xl border border-slate-800 max-w-sm w-full p-5 space-y-3">
            <h3 className="font-bold text-sm text-white">Delete Product</h3>
            <p className="text-xs text-slate-400">
              Are you sure you want to remove <strong>{itemToDelete.name}</strong> from the shop? This cannot be undone.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setItemToDelete(null)}
                className="px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteProduct}
                className="px-4 py-1.5 rounded-lg text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
