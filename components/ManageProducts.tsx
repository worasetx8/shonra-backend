import React, { useState, useEffect, useCallback } from 'react';
import { Search, Filter, Trash2, Edit, RefreshCw, Package, AlertTriangle, Star, Loader, ExternalLink, Copy, Zap, Folder, Tag as TagIcon, Check, X as XIcon, X, ChevronUp, ChevronDown, ArrowUp, ArrowDown } from 'lucide-react';
import { apiService } from '../services/api';
import { useDialog } from '../context/DialogContext';
import { useLayout } from '../context/LayoutContext';

interface SavedProduct {
  id: number;
  item_id: string;
  category_id?: number;
  category_name?: string;
  product_name: string;
  shop_name: string;
  shop_id: string;
  price: number;
  price_min: number;
  price_max: number;
  commission_rate: number;
  seller_commission_rate: number;
  shopee_commission_rate: number;
  commission_amount: number;
  image_url: string;
  product_link: string;
  offer_link: string;
  rating_star: number;
  sales_count: number;
  discount_rate: number;
  period_start_time: string;
  period_end_time: string;
  campaign_active: boolean;
  is_flash_sale: boolean;
  status: string;
  created_at: string;
  updated_at: string;
  tags?: Tag[];
}

interface Category {
  id: number;
  name: string;
}

interface Tag {
  id: number;
  name: string;
}

const ManageProducts: React.FC = () => {
  const [products, setProducts] = useState<SavedProduct[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  
  // Filter states
  const [status, setStatus] = useState('all');
  const [categoryId, setCategoryId] = useState<string>('all');
  const [tagId, setTagId] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState('desc');
  const [isFilterExpanded, setIsFilterExpanded] = useState(false);
  
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Fetch current user to check permissions
  useEffect(() => {
    const fetchUser = async () => {
        try {
            const res = await apiService.getCurrentUser();
            if (res.success) {
                setCurrentUser(res.data);
            }
        } catch (e) {
            console.error("Failed to fetch user", e);
        }
    };
    fetchUser();
  }, []);

  const hasPermission = (permission: string) => {
      if (currentUser?.id === 1 || currentUser?.role_id === 1) return true;
      return currentUser?.permissions?.includes(permission);
  };

  const { showAlert, showConfirm } = useDialog();
  const { setHeaderContent } = useLayout();
  
  // Tag edit state
  const [editingTagsId, setEditingTagsId] = useState<string | null>(null);
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);
  
  // Sync state
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState({ processed: 0, total: 0 });
  const [showSyncSummary, setShowSyncSummary] = useState(false);
  const [syncResults, setSyncResults] = useState({
    totalUpdated: 0,
    successCount: 0,
    failedCount: 0,
    activeCount: 0,
    inactiveCount: 0
  });

  const ITEMS_PER_PAGE = 20;

  // Fetch data functions
  const fetchProducts = useCallback(async (page: number = 1) => {
    try {
      setLoading(true);
      setError('');
      
      const queryParams = new URLSearchParams();
      if (page > 1) queryParams.append('page', page.toString());
      queryParams.append('limit', ITEMS_PER_PAGE.toString());
      
      if (status !== 'all') queryParams.append('status', status);
      if (categoryId !== 'all') queryParams.append('category_id', categoryId);
      if (tagId !== 'all') queryParams.append('tag_id', tagId);
      if (searchTerm.trim()) queryParams.append('search', searchTerm.trim());
      if (sortBy) {
          queryParams.append('sort_by', sortBy);
          queryParams.append('sort_order', sortOrder);
      }
      
      const response = await apiService.fetchSavedProducts(queryParams.toString());
      
      if (response.success && response.data) {
        let products: SavedProduct[] = [];
        let total = 0;
        let totalPages = 1;
        
        if (response.data) {
          if (response.data.data && Array.isArray(response.data.data)) {
            products = response.data.data;
            total = response.data.total || response.data.data.length;
            totalPages = response.data.totalPages || 1;
          } else if (response.data.products && Array.isArray(response.data.products)) {
            products = response.data.products;
            const pagination = response.data.pagination || {};
            total = pagination.totalItems || response.data.products.length;
            totalPages = pagination.totalPages || 1;
          } else if (Array.isArray(response.data)) {
            products = response.data;
            total = response.data.length;
            totalPages = 1;
          } else {
            products = [];
            total = 0;
            totalPages = 1;
          }
        }
        
        const enrichedProducts = await Promise.all(products.map(async (p) => {
            try {
                const tagsResponse = await apiService.getProductTags(p.item_id);
                return { ...p, tags: tagsResponse.success ? tagsResponse.data : [] };
            } catch (e) {
                return { ...p, tags: [] };
            }
        }));

        setProducts(enrichedProducts);
        setTotalItems(total);
        setTotalPages(totalPages);
      } else {
        throw new Error(response.message || 'Failed to fetch products');
      }
    } catch (err: any) {
      console.error('Fetch products error:', err);
      
      if (err.status === 401 || err.message?.includes('401')) {
        setError('Authentication required. Please login first.');
      } else {
        setError(err.message || 'Failed to fetch products');
      }
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [status, categoryId, tagId, searchTerm, sortBy, sortOrder]);

  const fetchCategories = useCallback(async () => {
      try {
          const response = await apiService.getCategories();
          if (response.success) {
              setCategories(response.data);
          }
      } catch (err) {
          console.error('Failed to fetch categories', err);
      }
  }, []);

  const fetchTags = useCallback(async () => {
      try {
          const response = await apiService.getTags();
          if (response.success) {
              setAllTags(response.data);
          }
      } catch (err) {
          console.error('Failed to fetch tags', err);
      }
  }, []);

  const handleSyncProducts = useCallback(async () => {
    const confirmed = await showConfirm('Are you sure you want to sync all products? This process may take some time.', {
      title: 'Sync Products'
    });

    if (!confirmed) {
      return;
    }

    setIsSyncing(true);
    setSyncProgress({ processed: 0, total: 0 });
    
    try {
      const allProductsResponse = await apiService.getSavedProducts({ limit: 1000, status: 'all' });
      
      if (!allProductsResponse.success || !allProductsResponse.data) {
        throw new Error('Failed to fetch products for sync');
      }

      let productsToSync: SavedProduct[] = [];
      if (allProductsResponse.data.data) productsToSync = allProductsResponse.data.data;
      else if (allProductsResponse.data.products) productsToSync = allProductsResponse.data.products;
      else if (Array.isArray(allProductsResponse.data)) productsToSync = allProductsResponse.data;

      setSyncProgress({ processed: 0, total: productsToSync.length });
      
      let results = {
        totalUpdated: 0,
        successCount: 0,
        failedCount: 0,
        activeCount: 0,
        inactiveCount: 0
      };

      for (const product of productsToSync) {
        try {
          let searchName = product.product_name.trim();
          if (searchName.length > 90) {
            searchName = searchName.substring(0, 90);
            const lastSpace = searchName.lastIndexOf(' ');
            if (lastSpace > 70) {
               searchName = searchName.substring(0, lastSpace);
            }
          }

          const syncResponse = await apiService.syncSingleProduct(product.item_id, searchName);
          
          results.totalUpdated++;
          if (syncResponse.success) {
            results.successCount++;
            if (syncResponse.data.status === 'active') results.activeCount++;
            else results.inactiveCount++;
          } else {
            results.failedCount++;
          }

        } catch (err) {
          console.error(`Sync failed for ${product.product_name}:`, err);
          results.failedCount++;
        }
        
        setSyncProgress(prev => ({ ...prev, processed: prev.processed + 1 }));
      }

      setSyncResults(results);
      setShowSyncSummary(true);
      fetchProducts(currentPage);

    } catch (err: any) {
      console.error('Sync process error:', err);
      await showAlert(`Sync process failed: ${err.message}`, { variant: 'danger', title: 'Sync Error' });
    } finally {
      setIsSyncing(false);
    }
  }, [fetchProducts, currentPage, showConfirm, showAlert]);

  const handleSearch = useCallback(() => {
    setSearchTerm(searchInput);
    setCurrentPage(1);
    // fetchProducts is triggered by useEffect when searchTerm changes
  }, [searchInput]);

  const handleClearFilters = useCallback(() => {
    setStatus('all');
    setCategoryId('all');
    setTagId('all');
    setSortBy('date');
    setSortOrder('desc');
    setSearchInput('');
    setSearchTerm('');
    setCurrentPage(1);
    // fetchProducts will be triggered by useEffect dependency changes
  }, []);

  // Effect to trigger search when filters change
  useEffect(() => {
      fetchProducts(1);
      setCurrentPage(1);
  }, [status, categoryId, tagId, searchTerm, sortBy, sortOrder]);

  // Fetch initial data
  useEffect(() => {
    fetchCategories();
    fetchTags();
  }, []);

  // Effect to update Header
  useEffect(() => {
    setHeaderContent(
      <div className="space-y-4 w-full">
        <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold text-white">Manage Products</h2>
              <p className="text-zinc-400 mt-1 text-sm">View, search, and manage your saved Shopee products</p>
            </div>
            <button 
                onClick={() => setIsFilterExpanded(prev => !prev)}
                className="p-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-zinc-400 hover:text-white transition-colors"
                title={isFilterExpanded ? "Collapse Filters" : "Expand Filters"}
            >
                {isFilterExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </button>
        </div>

        <div className={`transition-all duration-300 ease-in-out overflow-hidden ${isFilterExpanded ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}`}>
            <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4">
              <form onSubmit={(e) => { e.preventDefault(); handleSearch(); }} className="space-y-4">
                {/* Search Input and Buttons */}
                <div className="flex gap-2">
                    <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                    <input 
                        type="text" 
                        placeholder="Search products..." 
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                    />
                    </div>
                    <button 
                      type="submit"
                      disabled={loading || isSyncing}
                      className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 disabled:bg-zinc-800 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors flex items-center justify-center"
                      title="Search"
                    >
                      {loading ? <Loader className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
                    </button>
                    <button 
                      type="button"
                      onClick={handleSyncProducts}
                      disabled={isSyncing}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-zinc-700 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2 whitespace-nowrap"
                    >
                      {isSyncing ? (
                        <>
                          <Loader className="w-4 h-4 animate-spin" />
                          <span className="hidden sm:inline">{Math.round((syncProgress.processed / (syncProgress.total || 1)) * 100)}%</span>
                        </>
                      ) : (
                        <>
                          <RefreshCw className="w-4 h-4" />
                          <span className="hidden sm:inline">Sync</span>
                        </>
                      )}
                    </button>
                </div>

                {/* Filters */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 items-end">
                  <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-1">
                      Status
                    </label>
                    <select 
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                      className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <option value="all">All Status</option>
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                      <option value="flash-sale">Flash Sale</option>
                      <option value="pending">Pending</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-1">
                      Category
                    </label>
                    <select 
                      value={categoryId}
                      onChange={(e) => setCategoryId(e.target.value)}
                      className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <option value="all">All Categories</option>
                      {categories.map(c => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-1">
                      Tag
                    </label>
                    <select 
                      value={tagId}
                      onChange={(e) => setTagId(e.target.value)}
                      className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <option value="all">All Tags</option>
                      {allTags.map(t => (
                          <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                  </div>

                  <button 
                      type="button"
                      onClick={handleClearFilters}
                      className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-zinc-300 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 h-[38px]"
                      title="Clear Filters"
                  >
                      <X className="w-4 h-4" />
                      <span className="text-sm">Clear Filter</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                        <label className="block text-xs font-medium text-zinc-400 mb-1">
                            Sort By
                        </label>
                        <div className="flex gap-2">
                            <select 
                                value={sortBy}
                                onChange={(e) => {
                                  setSortBy(e.target.value);
                                  setCurrentPage(1);
                                }}
                                className="flex-1 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            >
                                <option value="date">Date Added</option>
                                <option value="commission">Commission</option>
                                <option value="sales">Sales</option>
                                <option value="price">Price</option>
                            </select>
                            <button
                                type="button"
                                onClick={() => {
                                  setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
                                  setCurrentPage(1);
                                }}
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
                </div>
              </form>

              {/* Results Info */}
              <div className="mt-4 pt-4 border-t border-zinc-800">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-zinc-400">Found {totalItems} products</span>
                  {totalPages > 1 && (
                    <span className="text-zinc-500">Page {currentPage} of {totalPages}</span>
                  )}
                </div>
              </div>
            </div>
        </div>
      </div>
    );
  }, [setHeaderContent, searchInput, status, categoryId, tagId, loading, isSyncing, syncProgress, totalItems, totalPages, currentPage, categories, allTags, handleSearch, handleSyncProducts, handleClearFilters, isFilterExpanded]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    fetchProducts(page);
  };

  const handleDelete = async (itemId: string) => {
    const confirmed = await showConfirm('คุณแน่ใจหรือว่าต้องการลบสินค้านี้?', {
      variant: 'danger',
      title: 'Delete Product',
      confirmText: 'Delete'
    });

    if (!confirmed) {
      return;
    }

    try {
      const response = await apiService.deleteProductByItemId(itemId);

      if (response.success) {
        await showAlert('ลบสินค้าเรียบร้อยแล้ว', { variant: 'success' });
        fetchProducts(currentPage);
      } else {
        throw new Error(response.message || 'Failed to delete product');
      }
    } catch (err: any) {
      console.error('Delete error:', err);
      await showAlert(`เกิดข้อผิดพลาด: ${err.message}`, { variant: 'danger', title: 'Error' });
    }
  };

  const handleStatusUpdate = async (itemId: string, newStatus: string) => {
    try {
      const response = await apiService.updateProductStatusByItemId(itemId, newStatus);

      if (response.success) {
        await showAlert(`เปลี่ยนสถานะเป็น ${newStatus} เรียบร้อยแล้ว`, { variant: 'success' });
        fetchProducts(currentPage);
      } else {
        throw new Error(response.message || 'Failed to update status');
      }
    } catch (err: any) {
      console.error('Status update error:', err);
      await showAlert(`เกิดข้อผิดพลาด: ${err.message}`, { variant: 'danger', title: 'Error' });
    }
  };

  const handleFlashSaleToggle = async (itemId: string, currentStatus: boolean) => {
    try {
      const response = await apiService.updateProductFlashSale(itemId, !currentStatus);

      if (response.success) {
        setProducts(products.map(p => 
          p.item_id === itemId ? { ...p, is_flash_sale: !currentStatus } : p
        ));
      } else {
        throw new Error(response.message || 'Failed to update flash sale status');
      }
    } catch (err: any) {
      console.error('Flash sale update error:', err);
      await showAlert(`เกิดข้อผิดพลาด: ${err.message}`, { variant: 'danger', title: 'Error' });
    }
  };

  const handleCategoryChange = async (product: SavedProduct, categoryId: number) => {
    try {
        let response;
        // Check if Uncategorized (0) or a valid category ID
        if (!categoryId) {
             response = await apiService.unassignProducts([product.item_id]);
        } else {
             response = await apiService.assignProductsToCategory(categoryId, [product.item_id]);
        }

        if (response.success) {
             // Update local state
             const category = categories.find(c => c.id === Number(categoryId));
             setProducts(products.map(p => 
                p.item_id === product.item_id 
                ? { ...p, category_id: Number(categoryId) || undefined, category_name: category?.name } 
                : p
             ));
        } else {
             throw new Error(response.message);
        }
    } catch (err: any) {
         await showAlert(`Failed to update category: ${err.message}`, { variant: 'danger' });
    }
};

  const handleCopyLink = async (link: string) => {
    try {
      await navigator.clipboard.writeText(link);
      await showAlert('คัดลอกลิงก์ Affiliate เรียบร้อยแล้ว', { variant: 'success', title: 'Copied' });
    } catch (err) {
      console.error('Copy failed:', err);
      await showAlert('ไม่สามารถคัดลอกลิงก์ได้', { variant: 'danger', title: 'Error' });
    }
  };

  const formatPrice = (price: number | string | null | undefined) => {
    const numPrice = typeof price === 'string' ? parseFloat(price) : (price || 0);
    return `฿${numPrice.toLocaleString()}`;
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'N/A';
    try {
      // MySQL TIMESTAMP is stored in UTC internally
      // Connection timezone is +07:00, so MySQL returns dates in Bangkok time
      // When Node.js Date is serialized to JSON, it becomes ISO string in UTC
      // We need to consistently parse and display in Bangkok time
      
      let date: Date;
      const str = String(dateString).trim();
      
      // Case 1: ISO string with Z (UTC): "2024-11-23T07:26:00.000Z"
      if (str.endsWith('Z')) {
        date = new Date(str);
      }
      // Case 2: ISO string with timezone offset: "2024-11-23T14:26:00+07:00"
      else if (str.includes('+') || (str.includes('-') && str.match(/\d{2}:\d{2}$/))) {
        date = new Date(str);
      }
      // Case 3: ISO string without timezone: "2024-11-23T14:26:00" - treat as UTC
      else if (str.includes('T')) {
        date = new Date(str + 'Z');
      }
      // Case 4: MySQL datetime format: "2024-11-23 14:26:00"
      // MySQL returns this in connection timezone (+07:00), so it's already Bangkok time
      // We need to treat it as Bangkok time, which means subtracting 7 hours to get UTC
      else {
        const [datePart, timePart = '00:00:00'] = str.split(' ');
        const [year, month, day] = datePart.split('-').map(Number);
        const [hour, minute, second = 0] = timePart.split(':').map(Number);
        
        // Create as UTC time (Bangkok time - 7 hours)
        // This ensures consistent parsing regardless of browser timezone
        date = new Date(Date.UTC(year, month - 1, day, hour - 7, minute, second));
      }
      
      // Format in Bangkok timezone consistently
      return date.toLocaleDateString('th-TH', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Asia/Bangkok'
      });
    } catch (e) {
      console.error('Date formatting error:', e, 'Input:', dateString);
      return 'Invalid Date';
    }
  };

  const handleTagEditStart = (product: SavedProduct) => {
      setEditingTagsId(product.item_id);
      setSelectedTagIds(product.tags?.map(t => t.id) || []);
  };

  const handleTagEditCancel = () => {
      setEditingTagsId(null);
      setSelectedTagIds([]);
  };

  const handleTagEditSave = async (itemId: string) => {
      try {
          const response = await apiService.updateProductTags(itemId, selectedTagIds);
          if (response.success) {
              // Update local state
              const updatedTags = allTags.filter(t => selectedTagIds.includes(t.id));
              setProducts(products.map(p => 
                  p.item_id === itemId ? { ...p, tags: updatedTags } : p
              ));
              setEditingTagsId(null);
              await showAlert('Tags updated successfully', { variant: 'success' });
          } else {
              throw new Error(response.message);
          }
      } catch (err: any) {
          await showAlert(`Failed to update tags: ${err.message}`, { variant: 'danger' });
      }
  };

  const toggleTagSelection = (tagId: number) => {
      if (selectedTagIds.includes(tagId)) {
          setSelectedTagIds(selectedTagIds.filter(id => id !== tagId));
      } else {
          setSelectedTagIds([...selectedTagIds, tagId]);
      }
  };

  if (loading && products.length === 0) {
    return (
      <div className="space-y-6">
        {/* No header in loading state to avoid flickers, or render skeletal header */}
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Loader className="w-8 h-8 animate-spin mx-auto mb-4 text-indigo-500" />
            <p className="text-zinc-400">Loading products...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header & Search moved to Layout Context */}
      
      {/* Error State */}
      {error && (
        <div className="bg-rose-500/10 border border-rose-500/20 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-rose-500" />
            <span className="text-rose-500 font-medium">{error}</span>
          </div>
        </div>
      )}

      {/* Sync Summary Modal */}
      {showSyncSummary && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 max-w-md w-full shadow-xl">
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <RefreshCw className="w-5 h-5 text-emerald-500" />
              Sync Completed
            </h3>
            
            <div className="space-y-3 mb-6">
              <div className="flex justify-between items-center p-3 bg-zinc-800/50 rounded-lg">
                <span className="text-zinc-400">Total Updated</span>
                <span className="text-white font-bold text-lg">{syncResults.totalUpdated}</span>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-center">
                  <div className="text-xs text-emerald-400 mb-1">Success</div>
                  <div className="text-xl font-bold text-emerald-500">{syncResults.successCount}</div>
                </div>
                <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg text-center">
                  <div className="text-xs text-rose-400 mb-1">Failed</div>
                  <div className="text-xl font-bold text-rose-500">{syncResults.failedCount}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-zinc-800 rounded-lg text-center">
                  <div className="text-xs text-zinc-400 mb-1">Active</div>
                  <div className="text-xl font-bold text-white">{syncResults.activeCount}</div>
                </div>
                <div className="p-3 bg-zinc-800 rounded-lg text-center">
                  <div className="text-xs text-zinc-400 mb-1">Inactive</div>
                  <div className="text-xl font-bold text-zinc-500">{syncResults.inactiveCount}</div>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowSyncSummary(false)}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Products Grid */}
      {products.length === 0 && !loading ? (
        <div className="text-center py-12">
          <Package className="w-16 h-16 text-zinc-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-zinc-400 mb-2">No Products Found</h3>
          <p className="text-zinc-500">Try adjusting your search criteria or add some products first</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {products.map((product) => {
            if (!product || !product.id) {
              console.warn('Invalid product:', product);
              return null;
            }
            
            return (
            <div key={product.id} className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden hover:border-zinc-700 transition-colors">
              {/* Product Image */}
              <div className="aspect-square relative overflow-hidden bg-zinc-800">
                <img 
                  src={product.image_url} 
                  alt={product.product_name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = 'https://via.placeholder.com/200x200?text=No+Image';
                  }}
                />
                {parseFloat(product.discount_rate?.toString() || '0') > 0 && (
                  <div className="absolute top-2 left-2 bg-rose-500 text-white px-2 py-1 rounded text-xs font-medium">
                    -{product.discount_rate}%
                  </div>
                )}
                {/* Status Badges */}
                <div className="absolute top-2 right-2 flex flex-col gap-1 items-end">
                  <span className={`px-2 py-1 text-xs font-medium rounded border ${
                    product.status === 'active' 
                      ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' 
                      : product.status === 'inactive'
                      ? 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                      : 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
                  }`}>
                    {product.status}
                  </span>
                  {product.is_flash_sale && (
                    <span className="px-2 py-1 text-xs font-medium rounded border bg-amber-500/20 text-amber-400 border-amber-500/30 flex items-center gap-1">
                      <Zap className="w-3 h-3 fill-current" />
                      Flash
                    </span>
                  )}
                </div>
              </div>

              {/* Product Info */}
              <div className="p-4 space-y-3">
                <div>
                  <h4 className="font-medium text-white text-sm line-clamp-2 leading-snug">
                    {product.product_name}
                  </h4>
                  <p className="text-zinc-500 text-xs mt-1">{product.shop_name}</p>
                  <p className="text-zinc-600 text-xs">ID: {product.item_id}</p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col">
                      {parseFloat(product.discount_rate?.toString() || '0') > 0 && (
                        <span className="text-xs text-zinc-500 line-through">
                           {formatPrice(product.price / (1 - product.discount_rate / 100))}
                        </span>
                      )}
                      <span className="font-bold text-indigo-400">{formatPrice(product.price)}</span>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <div className="flex items-center gap-1 text-xs text-zinc-400">
                        <Star className="w-3 h-3 fill-yellow-500 text-yellow-500" />
                        <span>{product.rating_star}</span>
                      </div>
                      {parseFloat(product.discount_rate?.toString() || '0') > 0 && (
                        <div className="bg-rose-500 text-white px-2 py-1 rounded text-xs font-medium">
                          -{product.discount_rate}%
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Category Selection */}
                  <div className="bg-zinc-800 rounded px-2 py-1.5 flex items-center gap-2">
                     <Folder className="w-3 h-3 text-zinc-400" />
                     <select 
                        className="bg-transparent text-xs text-zinc-300 w-full focus:outline-none cursor-pointer"
                        value={product.category_id || ''}
                        onChange={(e) => handleCategoryChange(product, Number(e.target.value))}
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
                          {editingTagsId === product.item_id ? (
                              <div className="flex gap-1">
                                  <button onClick={() => handleTagEditSave(product.item_id)} className="text-emerald-400 hover:text-emerald-300 p-0.5"><Check className="w-3 h-3" /></button>
                                  <button onClick={handleTagEditCancel} className="text-rose-400 hover:text-rose-300 p-0.5"><XIcon className="w-3 h-3" /></button>
                              </div>
                          ) : (
                              <button onClick={() => handleTagEditStart(product)} className="text-zinc-500 hover:text-zinc-300 p-0.5">
                                  <Edit className="w-3 h-3" />
                              </button>
                          )}
                      </div>
                      
                      {editingTagsId === product.item_id ? (
                          <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto custom-scrollbar">
                              {allTags.map(tag => (
                                  <button
                                      key={tag.id}
                                      onClick={() => toggleTagSelection(tag.id)}
                                      className={`px-2 py-0.5 rounded text-[10px] border transition-colors ${
                                          selectedTagIds.includes(tag.id)
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
                              {product.tags && product.tags.length > 0 ? (
                                  product.tags.map(tag => (
                                      <span key={tag.id} className="px-1.5 py-0.5 bg-zinc-700/50 text-zinc-400 rounded text-[10px] border border-zinc-700/50">
                                          {tag.name}
                                      </span>
                                  ))
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
                         {formatPrice(product.commission_amount > 0 ? product.commission_amount : (product.price * (product.commission_rate || 0)))}
                      </span>
                    </div>
                    <div className="bg-zinc-800 rounded px-2 py-1">
                      <span className="text-zinc-500">Rate:</span>
                      <span className="text-emerald-400 font-medium ml-1">
                        {((product.commission_rate || 0) * 100).toFixed(2)}%
                      </span>
                    </div>
                    <div className="bg-zinc-800 rounded px-2 py-1">
                      <span className="text-zinc-500">Sales:</span>
                      <span className="text-zinc-300 font-medium ml-1">
                        {product.sales_count?.toLocaleString() || '0'}
                      </span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center pt-2 border-t border-zinc-800">
                    <div className="text-xs text-zinc-500">
                      Saved: {formatDate(product.created_at)}
                    </div>
                    
                    {/* Flash Sale Toggle */}
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-zinc-400">Flash Sale</span>
                      <button
                        onClick={() => handleFlashSaleToggle(product.item_id, product.is_flash_sale)}
                        className={`w-10 h-5 rounded-full relative transition-colors ${
                          product.is_flash_sale ? 'bg-amber-500' : 'bg-zinc-700'
                        }`}
                      >
                        <span className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${
                          product.is_flash_sale ? 'left-6' : 'left-1'
                        }`} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="grid grid-cols-4 gap-2">
                  <button
                    onClick={() => window.open(product.product_link || product.offer_link, '_blank')}
                    className="px-2 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white rounded text-sm font-medium transition-colors flex items-center justify-center gap-1"
                    title="View Product"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => handleCopyLink(product.offer_link)}
                    className="px-2 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white rounded text-sm font-medium transition-colors flex items-center justify-center gap-1"
                    title="Copy Affiliate Link"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                  
                  {hasPermission('edit_products') ? (
                  <button
                    onClick={() => handleStatusUpdate(
                      product.item_id, 
                      product.status === 'active' ? 'inactive' : 'active'
                    )}
                    className={`px-2 py-2 text-white rounded text-sm font-medium transition-colors flex items-center justify-center gap-1 ${
                      product.status === 'active' 
                        ? 'bg-emerald-600 hover:bg-emerald-700' 
                        : 'bg-zinc-600 hover:bg-zinc-700'
                    }`}
                    title={product.status === 'active' ? 'Deactivate' : 'Activate'}
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  ) : (
                    <div className="px-2 py-2 bg-zinc-800 text-zinc-600 rounded text-sm font-medium flex items-center justify-center cursor-not-allowed">
                        <Edit className="w-4 h-4" />
                    </div>
                  )}
                  
                  {hasPermission('delete_products') ? (
                  <button
                    onClick={() => handleDelete(product.item_id)}
                    className="px-2 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded text-sm font-medium transition-colors flex items-center justify-center"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  ) : (
                    <div className="px-2 py-2 bg-zinc-800 text-zinc-600 rounded text-sm font-medium flex items-center justify-center cursor-not-allowed">
                        <Trash2 className="w-4 h-4" />
                    </div>
                  )}
                </div>
              </div>
            </div>
            );
          }).filter(Boolean)}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="px-4 py-2 text-sm bg-zinc-800 hover:bg-zinc-700 disabled:bg-zinc-900 disabled:opacity-50 disabled:cursor-not-allowed text-zinc-300 border border-zinc-700 rounded-lg transition-colors"
          >
            Previous
          </button>
          
          <span className="px-4 py-2 text-sm text-zinc-400">
            Page {currentPage} of {totalPages}
          </span>
          
          <button
            onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            className="px-4 py-2 text-sm bg-zinc-800 hover:bg-zinc-700 disabled:bg-zinc-900 disabled:opacity-50 disabled:cursor-not-allowed text-zinc-300 border border-zinc-700 rounded-lg transition-colors"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

export default ManageProducts;
