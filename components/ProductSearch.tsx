import React, { useState, useEffect } from 'react';
import { apiService } from '../services/api';
import { Search, Plus, Filter, Star, Package, Loader, CheckCircle, AlertTriangle, Folder, Tag as TagIcon, Zap, Check, X as XIcon, Edit, ChevronUp, ChevronDown, ArrowUp, ArrowDown } from 'lucide-react';
import { useDialog } from '../context/DialogContext';
import { useLayout } from '../context/LayoutContext';

interface ShopeeProduct {
  itemId: string;
  productName: string;
  shopName: string;
  shopId: string;
  price: string;
  priceMin?: string;
  priceMax?: string;
  commissionRate: string;
  commission?: string;
  sellerCommissionRate: string;
  shopeeCommissionRate: string;
  imageUrl: string;
  productLink: string;
  offerLink: string;
  ratingStar: string;
  sales: number;
  priceDiscountRate: string;
  periodStartTime?: number;
  periodEndTime?: number;
  productCatIds?: number[];
  shopType?: any[];
  campaignActive: boolean;
}

interface SearchResult {
  nodes: ShopeeProduct[];
  total: number;
  hasMore: boolean;
  pageInfo: {
    page: number;
    limit: number;
    hasNextPage: boolean;
    scrollId?: string;
  };
}

interface Category {
  id: number;
  name: string;
}

interface Tag {
  id: number;
  name: string;
}

interface ProductSelection {
  categoryId?: number;
  tagIds: number[];
  isFlashSale: boolean;
}

export const ProductSearch: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [commissionFilter, setCommissionFilter] = useState(0);
  const [ratingFilter, setRatingFilter] = useState(0);
  const [sortBy, setSortBy] = useState('relevance');
  const [sortOrder, setSortOrder] = useState('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [searchResult, setSearchResult] = useState<SearchResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savingProduct, setSavingProduct] = useState<string | null>(null);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [updateData, setUpdateData] = useState<{
    product: ShopeeProduct;
    differences: any[];
    onConfirm: () => void;
  } | null>(null);
  
  // Categories and Tags state
  const [categories, setCategories] = useState<Category[]>([]);
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [productSelections, setProductSelections] = useState<Record<string, ProductSelection>>({});
  const [editingTagsId, setEditingTagsId] = useState<string | null>(null);
  const [isFilterExpanded, setIsFilterExpanded] = useState(false);

  const { showAlert } = useDialog();
  const { setHeaderContent } = useLayout();

  useEffect(() => {
      fetchCategories();
      fetchTags();
  }, []);

  const fetchCategories = async () => {
      try {
          const response = await apiService.getCategories();
          if (response.success) {
              setCategories(response.data);
          }
      } catch (err) {
          console.error('Failed to fetch categories', err);
      }
  };

  const fetchTags = async () => {
      try {
          const response = await apiService.getTags();
          if (response.success) {
              setAllTags(response.data);
          }
      } catch (err) {
          console.error('Failed to fetch tags', err);
      }
  };

  // Search products from Shopee API
  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    if (!searchTerm.trim()) {
      setError('Please enter a search term');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await apiService.searchProducts({
        page: currentPage,
        search: searchTerm,
        commissionRate: commissionFilter > 0 ? commissionFilter : undefined,
        ratingStar: ratingFilter > 0 ? ratingFilter : undefined,
        sortBy: sortBy !== 'relevance' ? sortBy : undefined,
        sortOrder: sortBy !== 'relevance' ? sortOrder : undefined,
      });

      if (response.success && response.data?.data?.productOfferV2) {
        const productOfferV2 = response.data.data.productOfferV2;
        let nodes = productOfferV2.nodes || [];
        
        // Apply client-side sorting as fallback/ensurance
        if (sortBy && sortBy !== 'relevance' && nodes.length > 0) {
          nodes = [...nodes].sort((a, b) => {
            let valA = 0, valB = 0;
            
            if (sortBy === 'commission') {
              valA = parseFloat(a.commission) || (parseFloat(a.price) * parseFloat(a.commissionRate)) || 0;
              valB = parseFloat(b.commission) || (parseFloat(b.price) * parseFloat(b.commissionRate)) || 0;
            } else if (sortBy === 'sales') {
              valA = parseFloat(a.sales) || 0;
              valB = parseFloat(b.sales) || 0;
            } else if (sortBy === 'price') {
              valA = parseFloat(a.price) || 0;
              valB = parseFloat(b.price) || 0;
            }

            if (sortOrder === 'asc') {
              return valA - valB;
            } else {
              return valB - valA;
            }
          });
        }
        
        setSearchResult({
          nodes: nodes,
          total: nodes.length,
          hasMore: productOfferV2.pageInfo?.hasNextPage || false,
          pageInfo: productOfferV2.pageInfo
        });
      } else {
        setError(response.message || 'No products found');
        setSearchResult(null);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to search products');
      setSearchResult(null);
    } finally {
      setLoading(false);
    }
  };

  const getSelection = (itemId: string): ProductSelection => {
      return productSelections[itemId] || { tagIds: [], isFlashSale: false };
  };

  const updateSelection = (itemId: string, updates: Partial<ProductSelection>) => {
      setProductSelections(prev => ({
          ...prev,
          [itemId]: {
              ...(prev[itemId] || { tagIds: [], isFlashSale: false }),
              ...updates
          }
      }));
  };

  const handleCategoryChange = (itemId: string, categoryId: number) => {
      updateSelection(itemId, { categoryId: categoryId || undefined });
  };

  const handleFlashSaleToggle = (itemId: string) => {
      const current = getSelection(itemId);
      updateSelection(itemId, { isFlashSale: !current.isFlashSale });
  };

  const toggleTagSelection = (itemId: string, tagId: number) => {
      const current = getSelection(itemId);
      const newTagIds = current.tagIds.includes(tagId)
          ? current.tagIds.filter(id => id !== tagId)
          : [...current.tagIds, tagId];
      updateSelection(itemId, { tagIds: newTagIds });
  };

  // Re-sort existing results when sort changes (client-side for immediate feedback)
  useEffect(() => {
    if (searchResult && searchResult.nodes.length > 0 && sortBy && sortBy !== 'relevance') {
      const sortedNodes = [...searchResult.nodes].sort((a, b) => {
        let valA = 0, valB = 0;
        
        if (sortBy === 'commission') {
          valA = parseFloat(a.commission) || (parseFloat(a.price) * parseFloat(a.commissionRate)) || 0;
          valB = parseFloat(b.commission) || (parseFloat(b.price) * parseFloat(b.commissionRate)) || 0;
        } else if (sortBy === 'sales') {
          valA = parseFloat(a.sales?.toString() || '0') || 0;
          valB = parseFloat(b.sales?.toString() || '0') || 0;
        } else if (sortBy === 'price') {
          valA = parseFloat(a.price) || 0;
          valB = parseFloat(b.price) || 0;
        }

        if (sortOrder === 'asc') {
          return valA - valB;
        } else {
          return valB - valA;
        }
      });
      
      setSearchResult(prev => prev ? {
        ...prev,
        nodes: sortedNodes
      } : null);
    }
  }, [sortBy, sortOrder]);

  // Save product to database
  const handleSaveProduct = async (product: ShopeeProduct) => {
    try {
      setSavingProduct(product.itemId);

      // Check if product already exists and compare data
      const checkData = {
        itemId: product.itemId,
        name: product.productName,
        shopId: product.shopId,
        price: product.price,
        priceMin: product.priceMin,
        priceMax: product.priceMax,
        commissionRate: product.commissionRate,
        sellerCommissionRate: product.sellerCommissionRate,
        shopeeCommissionRate: product.shopeeCommissionRate,
        commission: product.commission,
        sold: product.sales,
        ratingStar: product.ratingStar,
        discountRate: product.priceDiscountRate,
        periodStartTime: product.periodStartTime,
        periodEndTime: product.periodEndTime,
        campaignActive: product.campaignActive,
      };
      const checkResponse = await apiService.checkProduct(checkData);
      
      if (checkResponse.success && checkResponse.data?.exists) {
        const existingProduct = checkResponse.data.product;
        const differences = checkResponse.data.differences || [];
        const hasChanges = checkResponse.data.hasChanges || false;

        if (hasChanges) {
          // Show modal with differences and ask user if they want to update
          setUpdateData({
            product,
            differences,
            onConfirm: async () => {
              await performSave(product);
              setShowUpdateModal(false);
              setUpdateData(null);
            }
          });
          setShowUpdateModal(true);
          setSavingProduct(null);
          return;
        } else {
          // Show modal that product exists with no changes
          setUpdateData({
            product: { ...product, productName: 'สินค้านี้มีอยู่แล้วในฐานข้อมูลและข้อมูลไม่มีการเปลี่ยนแปลง' },
            differences: [],
            onConfirm: () => {
              setShowUpdateModal(false);
              setUpdateData(null);
            }
          });
          setShowUpdateModal(true);
          setSavingProduct(null);
          return;
        }
      }

      // Save the product (will insert or update)
      await performSave(product);
    } catch (err: any) {
      console.error('Save product error:', err);
      
      // Check if authentication is required
      if (err.response?.status === 401) {
        await showAlert('Authentication required. Please login first.', { title: 'Authentication Error', variant: 'danger' });
        setSavingProduct(null);
        return;
      }
      
      setUpdateData({
        product: { ...product, productName: err.message || 'Failed to save product' },
        differences: [],
        onConfirm: () => {
          setShowUpdateModal(false);
          setUpdateData(null);
        }
      });
      setShowUpdateModal(true);
      setSavingProduct(null);
    }
  };

  // Perform the actual save operation
  const performSave = async (product: ShopeeProduct) => {
    try {
      setSavingProduct(product.itemId);
      const selection = getSelection(product.itemId);

      const saveData = {
        itemId: product.itemId,
        shopId: product.shopId,
        shopName: product.shopName,
        productName: product.productName, // This maps to product_name in backend
        price: product.price,
        priceMin: product.priceMin,
        priceMax: product.priceMax,
        commissionRate: product.commissionRate,
        sellerCommissionRate: product.sellerCommissionRate,
        shopeeCommissionRate: product.shopeeCommissionRate,
        commission: product.commission,
        sold: product.sales, // This maps to sales_count in backend
        ratingStar: product.ratingStar,
        imageUrl: product.imageUrl,
        productLink: product.productLink,
        offerLink: product.offerLink,
        discountRate: product.priceDiscountRate,
        periodStartTime: product.periodStartTime,
        periodEndTime: product.periodEndTime,
        campaignActive: product.campaignActive,
        // Extra fields from selection
        category_id: selection.categoryId,
        is_flash_sale: selection.isFlashSale,
        tags: selection.tagIds
      };

     

      const response = await apiService.saveProduct(saveData);
      
      if (response.success) {
        const action = response.data?.action || 'saved';
        setUpdateData({
          product: { ...product, productName: `Product ${action} successfully!` },
          differences: [],
          onConfirm: () => {
            setShowUpdateModal(false);
            setUpdateData(null);
          }
        });
        setShowUpdateModal(true);
      } else {
        throw new Error(response.message || 'Failed to save product');
      }
    } catch (err: any) {
      console.error('Save product error:', err);
      
      // Check if authentication is required
      if (err.response?.status === 401) {
        await showAlert('Authentication required. Please login first.', { title: 'Authentication Error', variant: 'danger' });
        return;
      }
      
      throw err;
    } finally {
      setSavingProduct(null);
    }
  };

  // Format price in Thai Baht
  const formatPrice = (price: string | number) => {
    const numPrice = typeof price === 'string' ? parseFloat(price) : price;
    return `฿${numPrice.toLocaleString()}`;
  };

  // Calculate original price from discount
  const calculateOriginalPrice = (currentPrice: string | number, discountRate: number) => {
    const numPrice = typeof currentPrice === 'string' ? parseFloat(currentPrice) : currentPrice;
    if (discountRate > 0 && discountRate < 100) {
      return numPrice / (1 - discountRate / 100);
    }
    return null; // No discount or invalid
  };

  // Format commission rate as percentage
  const formatCommission = (rate: number) => {
    return `${(rate * 100).toFixed(2)}%`;
  };

  useEffect(() => {
    setHeaderContent(
      <div className="space-y-4 w-full">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-bold text-white">Search Shopee Products</h2>
            <p className="text-zinc-400 mt-1 text-sm">Find and save products from Shopee affiliate program</p>
          </div>
          <button 
              onClick={() => setIsFilterExpanded(prev => !prev)}
              className="p-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-zinc-400 hover:text-white transition-colors"
              title={isFilterExpanded ? "Collapse Search" : "Expand Search"}
          >
              {isFilterExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>
        </div>

        <div className={`transition-all duration-300 ease-in-out overflow-hidden ${isFilterExpanded ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}`}>
          <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4">
            <form onSubmit={handleSearch} className="space-y-4">
              {/* Search Input */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                <input 
                  type="text" 
                  placeholder="Search for products (e.g., หูฟัง, โทรศัพท์, เครื่องสำอาง)" 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                />
              </div>

              {/* Filters */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-2">
                    <Filter className="w-4 h-4 inline mr-2" />
                    Min Commission Rate (%)
                  </label>
                  <input 
                    type="number" 
                    min="0" 
                    max="100" 
                    step="0.1"
                    value={commissionFilter || ''}
                    onChange={(e) => setCommissionFilter(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="e.g., 15"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-2">
                    <Star className="w-4 h-4 inline mr-2" />
                    Min Rating
                  </label>
                  <select 
                    value={ratingFilter}
                    onChange={(e) => setRatingFilter(parseFloat(e.target.value))}
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value={0}>Any Rating</option>
                    <option value={3}>3+ Stars</option>
                    <option value={4}>4+ Stars</option>
                    <option value={4.5}>4.5+ Stars</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-2">
                    Sort By
                  </label>
                  <div className="flex gap-2">
                    <select 
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      className="flex-1 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <option value="relevance">Relevance</option>
                      <option value="commission">Commission</option>
                      <option value="sales">Sales</option>
                      <option value="price">Price</option>
                    </select>
                    <button
                        type="button"
                        onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                        className={`px-3 py-2 border rounded-lg transition-all flex items-center justify-center ${
                          sortOrder === 'asc'
                            ? 'bg-indigo-600/20 border-indigo-500/50 text-indigo-400 hover:bg-indigo-600/30'
                            : 'bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700 hover:border-zinc-600'
                        }`}
                        title={sortOrder === 'asc' ? "Sort Ascending (Low to High)" : "Sort Descending (High to Low)"}
                    >
                        {sortOrder === 'asc' ? (
                          <ArrowUp className="w-4 h-4" />
                        ) : (
                          <ArrowDown className="w-4 h-4" />
                        )}
                    </button>
                  </div>
                </div>

                <div className="flex items-end">
                  <button 
                    type="submit"
                    disabled={loading || !searchTerm.trim()}
                    className="w-full px-6 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-zinc-700 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <Loader className="w-4 h-4 animate-spin" />
                        Searching...
                      </>
                    ) : (
                      <>
                        <Search className="w-4 h-4" />
                        Search Products
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>

            {/* Toggle to Manage Products */}
            <div className="mt-4 pt-4 border-t border-zinc-800">
              <button
                onClick={() => {
                  const event = new CustomEvent('navigate', { detail: { view: 'MANAGE_PRODUCTS' } });
                  window.dispatchEvent(event);
                }}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                title="View and manage your saved products"
              >
                <Package className="w-4 h-4" />
                <span>View Saved Products</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }, [searchTerm, commissionFilter, ratingFilter, loading, setHeaderContent, isFilterExpanded, sortBy, sortOrder]);

  return (
    <div className="space-y-6">
      {/* Results */}
      {error && (
        <div className="bg-rose-500/10 border border-rose-500/20 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-rose-500" />
            <span className="text-rose-500 font-medium">{error}</span>
          </div>
        </div>
      )}

      {searchResult && (
        <div className="space-y-4">
          {/* Results Header */}
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white">
              Search Results ({searchResult.total} products)
            </h3>
            {searchResult.hasMore && (
              <button 
                onClick={() => {
                  setCurrentPage(currentPage + 1);
                  handleSearch();
                }}
                className="text-indigo-400 hover:text-indigo-300 text-sm"
              >
                Load more products →
              </button>
            )}
          </div>

          {/* Products Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {searchResult.nodes.map((product) => {
                const selection = getSelection(product.itemId);
                
                return (
                  <div key={product.itemId} className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden hover:border-zinc-700 transition-colors">
                    {/* Product Image */}
                    <div className="aspect-square relative overflow-hidden bg-zinc-800">
                      <img 
                        src={product.imageUrl} 
                        alt={product.productName}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = 'https://via.placeholder.com/200x200?text=No+Image';
                        }}
                      />
                      {parseFloat(product.priceDiscountRate) > 0 && (
                        <div className="absolute top-2 left-2 bg-rose-500 text-white px-2 py-1 rounded text-xs font-medium">
                          -{product.priceDiscountRate}%
                        </div>
                      )}
                      
                      {/* Flash Sale Indicator */}
                      {selection.isFlashSale && (
                        <div className="absolute top-2 right-2 px-2 py-1 text-xs font-medium rounded border bg-amber-500/20 text-amber-400 border-amber-500/30 flex items-center gap-1">
                          <Zap className="w-3 h-3 fill-current" />
                          Flash
                        </div>
                      )}
                    </div>

                    {/* Product Info */}
                    <div className="p-4 space-y-3">
                      <div>
                        <h4 className="font-medium text-white text-sm line-clamp-2 leading-snug">
                          {product.productName}
                        </h4>
                        <p className="text-zinc-500 text-xs mt-1">{product.shopName}</p>
                        <p className="text-zinc-600 text-xs">ID: {product.itemId}</p>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex flex-col">
                            {parseFloat(product.priceDiscountRate) > 0 && calculateOriginalPrice(parseFloat(product.price), parseFloat(product.priceDiscountRate)) && (
                              <span className="text-xs text-zinc-500 line-through">
                                {formatPrice(calculateOriginalPrice(parseFloat(product.price), parseFloat(product.priceDiscountRate))!)}
                              </span>
                            )}
                            <span className="font-bold text-indigo-400">{formatPrice(product.price)}</span>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            {parseFloat(product.ratingStar) > 0 && (
                              <div className="flex items-center gap-1 text-xs text-zinc-400">
                                <Star className="w-3 h-3 fill-yellow-500 text-yellow-500" />
                                <span>{product.ratingStar}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Category Selection */}
                        <div className="bg-zinc-800 rounded px-2 py-1.5 flex items-center gap-2">
                           <Folder className="w-3 h-3 text-zinc-400" />
                           <select 
                              className="bg-transparent text-xs text-zinc-300 w-full focus:outline-none cursor-pointer"
                              value={selection.categoryId || ''}
                              onChange={(e) => handleCategoryChange(product.itemId, Number(e.target.value))}
                           >
                               <option value="" className="bg-zinc-800">Uncategorized</option>
                               {categories.map(c => (
                                   <option key={c.id} value={c.id} className="bg-zinc-800">{c.name}</option>
                               ))}
                           </select>
                        </div>

                        {/* Tags Section */}
                        <div className="bg-zinc-800 rounded px-2 py-2">
                            <div className="flex items-center justify-between mb-1.5">
                                <div className="flex items-center gap-1 text-zinc-400">
                                    <TagIcon className="w-3 h-3" />
                                    <span className="text-xs">Tags</span>
                                </div>
                                {editingTagsId === product.itemId ? (
                                    <button onClick={() => setEditingTagsId(null)} className="text-emerald-400 hover:text-emerald-300 p-0.5"><Check className="w-3 h-3" /></button>
                                ) : (
                                    <button onClick={() => setEditingTagsId(product.itemId)} className="text-zinc-500 hover:text-zinc-300 p-0.5">
                                        <Edit className="w-3 h-3" />
                                    </button>
                                )}
                            </div>
                            
                            {editingTagsId === product.itemId ? (
                                <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto custom-scrollbar">
                                    {allTags.map(tag => (
                                        <button
                                            key={tag.id}
                                            onClick={() => toggleTagSelection(product.itemId, tag.id)}
                                            className={`px-2 py-0.5 rounded text-[10px] border transition-colors ${
                                                selection.tagIds.includes(tag.id)
                                                    ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30'
                                                    : 'bg-zinc-700/50 text-zinc-500 border-zinc-700 hover:bg-zinc-700'
                                            }`}
                                        >
                                            {tag.name}
                                        </button>
                                    ))}
                                </div>
                            ) : (
                                <div className="flex flex-wrap gap-1">
                                    {selection.tagIds.length > 0 ? (
                                        selection.tagIds.map(tagId => {
                                            const tag = allTags.find(t => t.id === tagId);
                                            if (!tag) return null;
                                            return (
                                                <span key={tag.id} className="px-1.5 py-0.5 bg-zinc-700/50 text-zinc-400 rounded text-[10px] border border-zinc-700/50">
                                                    {tag.name}
                                                </span>
                                            );
                                        })
                                    ) : (
                                        <span className="text-[10px] text-zinc-600 italic">No tags</span>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="grid grid-cols-3 gap-2 text-xs">
                          <div className="bg-zinc-800 rounded px-2 py-1">
                            <span className="text-zinc-500">Com:</span>
                            <span className="text-emerald-400 font-medium ml-1">
                              {formatPrice(parseFloat(product.price) * parseFloat(product.commissionRate))}
                            </span>
                          </div>
                          <div className="bg-zinc-800 rounded px-2 py-1">
                            <span className="text-zinc-500">Rate:</span>
                            <span className="text-emerald-400 font-medium ml-1">
                              {formatCommission(parseFloat(product.commissionRate))}
                            </span>
                          </div>
                          <div className="bg-zinc-800 rounded px-2 py-1">
                            <span className="text-zinc-500">Sales:</span>
                            <span className="text-zinc-300 font-medium ml-1">
                              {product.sales.toLocaleString()}
                            </span>
                          </div>
                        </div>

                        <div className="flex justify-between items-center pt-2 border-t border-zinc-800">
                           <div className="text-xs text-zinc-500">
                                {/* Placeholder for date if needed, or just empty */}
                           </div>
                            {/* Flash Sale Toggle */}
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-zinc-400">Flash Sale</span>
                              <button
                                onClick={() => handleFlashSaleToggle(product.itemId)}
                                className={`w-10 h-5 rounded-full relative transition-colors ${
                                  selection.isFlashSale ? 'bg-amber-500' : 'bg-zinc-700'
                                }`}
                              >
                                <span className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${
                                  selection.isFlashSale ? 'left-6' : 'left-1'
                                }`} />
                              </button>
                            </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2">
                        <a 
                          href={product.productLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white rounded text-sm font-medium transition-colors text-center"
                        >
                          View Product
                        </a>
                        <button 
                          onClick={() => handleSaveProduct(product)}
                          disabled={savingProduct === product.itemId}
                          className="flex-1 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-zinc-700 disabled:cursor-not-allowed text-white rounded text-sm font-medium transition-colors flex items-center justify-center gap-2"
                        >
                          {savingProduct === product.itemId ? (
                            <>
                              <Loader className="w-3 h-3 animate-spin" />
                              Saving...
                            </>
                          ) : (
                            <>
                              <Plus className="w-3 h-3" />
                              Save
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                );
            })}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && !searchResult && (
        <div className="text-center py-12">
          <Package className="w-16 h-16 text-zinc-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-zinc-400 mb-2">Search Shopee Products</h3>
          <p className="text-zinc-500">Enter a search term to find products from the Shopee affiliate program</p>
        </div>
      )}

      {/* Update Modal */}
      {showUpdateModal && updateData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center gap-3 mb-4">
              {updateData.differences.length > 0 ? (
                <AlertTriangle className="w-6 h-6 text-yellow-500" />
              ) : updateData.product.productName?.includes('Failed') ? (
                <AlertTriangle className="w-6 h-6 text-rose-500" />
              ) : (
                <CheckCircle className="w-6 h-6 text-green-500" />
              )}
              <h3 className="text-lg font-semibold text-white">
                {updateData.differences.length > 0 ? 'Update Product' : 
                 updateData.product.productName?.includes('Failed') ? 'Error' : 'Success'}
              </h3>
            </div>
            
            <div className="space-y-4">
              {updateData.differences.length > 0 ? (
                <>
                  <p className="text-zinc-300">
                    สินค้านี้มีอยู่แล้วในฐานข้อมูล แต่ข้อมูลมีการเปลี่ยนแปลง:
                  </p>
                  <div className="bg-zinc-800 rounded p-3 space-y-2">
                    {updateData.differences.map((diff: any, index: number) => (
                      <div key={index} className="text-sm">
                        <span className="text-zinc-400">{diff.field}:</span>
                        <span className="text-rose-400 line-through ml-2">{diff.oldValue}</span>
                        <span className="text-zinc-300"> → </span>
                        <span className="text-emerald-400">{diff.newValue}</span>
                      </div>
                    ))}
                  </div>
                  <p className="text-zinc-300">ต้องการอัปเดตข้อมูลหรือไม่?</p>
                </>
              ) : updateData.product.productName?.includes('Failed') ? (
                <p className="text-zinc-300">
                  {updateData.product.productName}
                </p>
              ) : (
                <p className="text-zinc-300">
                  {updateData.product.productName}
                </p>
              )}
            </div>
            
            <div className="flex gap-3 mt-6">
              {updateData.differences.length > 0 ? (
                <>
                  <button
                    onClick={() => {
                      setShowUpdateModal(false);
                      setUpdateData(null);
                    }}
                    className="flex-1 px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-zinc-300 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={updateData.onConfirm}
                    className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
                  >
                    Update
                  </button>
                </>
              ) : (
                <button
                  onClick={updateData.onConfirm}
                  className="w-full px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
                >
                  OK
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
