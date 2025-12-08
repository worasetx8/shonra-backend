import React, { useState, useEffect } from 'react';
import { apiService } from '../services/api';
import { useDialog } from '../context/DialogContext';
import { useLayout } from '../context/LayoutContext';
import { Plus, Trash2, Edit, Search, FolderPlus, LayoutGrid, Package, ChevronRight, X, AlertCircle, Loader, Power, RefreshCw } from 'lucide-react';

interface Category {
  id: number;
  name: string;
  is_active: boolean;
  product_count?: number;
  created_at: string;
}

interface Product {
  item_id: string;
  product_name: string;
  image_url: string;
  price: number;
  status: string;
}

export const Categories: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  
  // Modals state
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showReassignModal, setShowReassignModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [categoryName, setCategoryName] = useState('');
  const [targetCategoryId, setTargetCategoryId] = useState<string>('');
  
  // Products management state
  const [assignedProducts, setAssignedProducts] = useState<Product[]>([]);
  const [unassignedProducts, setUnassignedProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [productSearch, setProductSearch] = useState('');

  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    const fetchUser = async () => {
        try {
            const res = await apiService.getCurrentUser();
            if (res.success) setCurrentUser(res.data);
        } catch (e) { console.error(e); }
    };
    fetchUser();
  }, []);

  const hasPermission = (permission: string) => {
      if (currentUser?.id === 1 || currentUser?.role_id === 1) return true;
      return currentUser?.permissions?.includes(permission);
  };

  const { showAlert, showConfirm } = useDialog();
  const { setHeaderContent } = useLayout();

  useEffect(() => {
    setHeaderContent(
      <div className="flex items-center justify-between w-full">
        <div>
          <h2 className="text-2xl font-bold text-white">Categories</h2>
          <p className="text-zinc-400 mt-1 text-sm">Manage product categories and organization</p>
        </div>
        {hasPermission('create_categories') && (
        <button 
          onClick={() => {
              setEditingCategory(null);
              setCategoryName('');
              setShowCategoryModal(true);
          }}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Category
        </button>
        )}
      </div>
    );
  }, [setHeaderContent, currentUser]); // Add currentUser dependency

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    if (selectedCategory) {
      fetchCategoryProducts(selectedCategory.id);
      fetchUnassignedProducts();
    }
  }, [selectedCategory]);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const response = await apiService.getCategories();
      if (response.success) {
        setCategories(response.data);
      } else {
        throw new Error(response.message);
      }
    } catch (error: any) {
      console.error('Failed to fetch categories:', error);
      await showAlert(`Failed to load categories: ${error.message}`, { variant: 'danger' });
    } finally {
      setLoading(false);
    }
  };

  const fetchCategoryProducts = async (categoryId: number) => {
    try {
      setLoadingProducts(true);
      const response = await apiService.getCategoryProducts(categoryId);
      if (response.success) {
        setAssignedProducts(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch category products:', error);
    } finally {
      setLoadingProducts(false);
    }
  };

  const fetchUnassignedProducts = async () => {
    try {
      const response = await apiService.getUnassignedProducts();
      if (response.success) {
        setUnassignedProducts(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch unassigned products:', error);
    }
  };

  const handleSaveCategory = async () => {
    if (!categoryName.trim()) {
        await showAlert('Category name is required', { variant: 'danger' });
        return;
    }

    try {
      if (editingCategory) {
        // Update Name
        const response = await apiService.updateCategory(editingCategory.id, categoryName);
        if (response.success) {
          await showAlert('Category updated successfully', { variant: 'success' });
          setCategories(categories.map(c => c.id === editingCategory.id ? { ...c, name: categoryName } : c));
          if (selectedCategory?.id === editingCategory.id) {
              setSelectedCategory({ ...selectedCategory, name: categoryName });
          }
        } else {
            throw new Error(response.message);
        }
      } else {
        // Create
        const response = await apiService.createCategory(categoryName);
        if (response.success) {
          await showAlert('Category created successfully', { variant: 'success' });
          setCategories([...categories, response.data]);
        } else {
            throw new Error(response.message);
        }
      }
      setShowCategoryModal(false);
      setCategoryName('');
      setEditingCategory(null);
    } catch (error: any) {
      console.error('Save category error:', error);
      // Handle duplicate error specifically if it comes through as a generic message
      const errorMessage = error.message?.includes('Duplicate entry') 
        ? 'Category name already exists' 
        : (error.message || 'Failed to save category');
        
      await showAlert(errorMessage, { variant: 'danger', title: 'Save Failed' });
    }
  };

  const handleDeleteCategory = async (category: Category) => {
    const confirmed = await showConfirm(`Are you sure you want to delete "${category.name}"?`, {
        variant: 'danger',
        confirmText: 'Delete'
    });

    if (!confirmed) return;

    try {
      const response = await apiService.deleteCategory(category.id);
      if (response.success) {
        await showAlert('Category deleted successfully', { variant: 'success' });
        setCategories(categories.filter(c => c.id !== category.id));
        if (selectedCategory?.id === category.id) {
            setSelectedCategory(null);
        }
      } else {
        throw new Error(response.message);
      }
    } catch (error: any) {
        console.error('Delete category error:', error);
        await showAlert(error.message || 'Failed to delete category', { variant: 'danger' });
    }
  };

  const handleToggleStatus = async (category: Category) => {
      const newStatus = !category.is_active;
      
      // If deactivating, we must check for products
      if (!newStatus) {
          // Fetch products count first - actually we can just check current products if we have selected it, 
          // but to be safe we should rely on backend or a fresh check. 
          // For UX speed, if the user hasn't selected this category, we don't have its product count loaded.
          // So we'll call the toggle endpoint, and if it returns the "hasProducts" warning, we show the modal.
          
          try {
              const response = await apiService.updateCategoryStatus(category.id, false);
              if (response.success) {
                  // Success immediately means no products were blocking or it was forced (not implemented yet)
                  setCategories(categories.map(c => c.id === category.id ? { ...c, is_active: false } : c));
                  if (selectedCategory?.id === category.id) {
                      setSelectedCategory({ ...selectedCategory, is_active: false });
                  }
              } else if (response.data?.hasProducts) {
                  // Blocked by existing products
                  setEditingCategory(category); // Store category to be deactivated
                  setTargetCategoryId('');
                  setShowReassignModal(true);
              } else {
                  throw new Error(response.message);
              }
          } catch (err: any) {
              await showAlert(err.message || 'Failed to update status', { variant: 'danger' });
          }
      } else {
          // Activating is always allowed
          try {
              const response = await apiService.updateCategoryStatus(category.id, true);
              if (response.success) {
                  setCategories(categories.map(c => c.id === category.id ? { ...c, is_active: true } : c));
                  if (selectedCategory?.id === category.id) {
                      setSelectedCategory({ ...selectedCategory, is_active: true });
                  }
              }
          } catch (err: any) {
              await showAlert(err.message || 'Failed to activate category', { variant: 'danger' });
          }
      }
  };

  const handleReassignAndDeactivate = async () => {
      if (!editingCategory || !targetCategoryId) return;

      try {
          // 1. Move products
          const moveResponse = await apiService.moveCategoryProducts(editingCategory.id, parseInt(targetCategoryId));
          
          if (moveResponse.success) {
              // 2. Deactivate category
              const statusResponse = await apiService.updateCategoryStatus(editingCategory.id, false);
              
              if (statusResponse.success) {
                  await showAlert('Products reassigned and category deactivated.', { variant: 'success' });
                  
                  // Update local state
                  setCategories(categories.map(c => c.id === editingCategory.id ? { ...c, is_active: false } : c));
                  if (selectedCategory?.id === editingCategory.id) {
                      // If we were viewing the deactivated category, products are gone now.
                      setAssignedProducts([]); 
                      setSelectedCategory({ ...selectedCategory, is_active: false });
                  }
                  
                  // If we were viewing the target category, we should refresh products
                  if (selectedCategory?.id === parseInt(targetCategoryId)) {
                      fetchCategoryProducts(selectedCategory.id);
                  }

                  setShowReassignModal(false);
                  setEditingCategory(null);
              } else {
                  throw new Error(statusResponse.message);
              }
          } else {
              throw new Error(moveResponse.message);
          }
      } catch (err: any) {
          await showAlert(err.message || 'Operation failed', { variant: 'danger' });
      }
  };

  const handleAssignProduct = async (product: Product) => {
    if (!selectedCategory) return;
    try {
        const response = await apiService.assignProductsToCategory(selectedCategory.id, [product.item_id]);
        if (response.success) {
            setAssignedProducts([...assignedProducts, product]);
            setUnassignedProducts(unassignedProducts.filter(p => p.item_id !== product.item_id));
        }
    } catch (error: any) {
        await showAlert(`Failed to assign product: ${error.message}`, { variant: 'danger' });
    }
  };

  const handleRemoveProduct = async (product: Product) => {
    if (!selectedCategory) return;
    try {
        const response = await apiService.removeProductFromCategory(selectedCategory.id, product.item_id);
        if (response.success) {
            setUnassignedProducts([...unassignedProducts, product]);
            setAssignedProducts(assignedProducts.filter(p => p.item_id !== product.item_id));
        }
    } catch (error: any) {
        await showAlert(`Failed to remove product: ${error.message}`, { variant: 'danger' });
    }
  };

  const filteredUnassigned = unassignedProducts.filter(p => 
    p.product_name.toLowerCase().includes(productSearch.toLowerCase())
  );

  const activeCategories = categories.filter(c => c.is_active && c.id !== editingCategory?.id);

  if (loading) {
      return (
        <div className="flex items-center justify-center min-h-[400px]">
             <Loader className="w-8 h-8 animate-spin text-indigo-500" />
        </div>
      );
  }

  return (
    <div className="space-y-6 h-[calc(100vh-200px)] flex flex-col">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 min-h-0 overflow-y-auto lg:overflow-hidden pb-20 lg:pb-0">
        {/* Categories List */}
        <div className="lg:col-span-4 bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden flex flex-col h-[300px] lg:h-auto shrink-0">
            <div className="p-4 border-b border-zinc-800 font-medium text-zinc-300 flex items-center gap-2">
                <LayoutGrid className="w-4 h-4" />
                All Categories
            </div>
            <div className="overflow-y-auto flex-1 p-2 space-y-2">
                {categories.length === 0 ? (
                    <div className="text-center py-12 text-zinc-500">
                        <FolderPlus className="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <p>No categories yet</p>
                    </div>
                ) : (
                    categories.map(category => (
                        <div 
                            key={category.id}
                            onClick={() => setSelectedCategory(category)}
                            className={`p-3 rounded-lg cursor-pointer transition-colors flex items-center justify-between group ${
                                selectedCategory?.id === category.id 
                                    ? 'bg-indigo-600/20 border border-indigo-500/50 text-white' 
                                    : 'bg-zinc-800/50 border border-transparent hover:bg-zinc-800 text-zinc-300'
                            } ${!category.is_active ? 'opacity-60 bg-zinc-900/30' : ''}`}
                        >
                            <div className="flex items-center gap-3">
                                <FolderPlus className={`w-5 h-5 ${selectedCategory?.id === category.id ? 'text-indigo-400' : 'text-zinc-500'}`} />
                                <div>
                                    <span className={`font-medium ${!category.is_active ? 'line-through text-zinc-500' : ''}`}>{category.name}</span>
                                    <span className="ml-2 text-xs text-zinc-500">({category.product_count || 0})</span>
                                    {!category.is_active && <span className="ml-2 text-xs bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-500">Inactive</span>}
                                </div>
                            </div>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                {hasPermission('edit_categories') && (
                                <button 
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleToggleStatus(category);
                                    }}
                                    className={`p-1.5 rounded transition-colors ${category.is_active ? 'text-emerald-500 hover:bg-emerald-500/10' : 'text-zinc-500 hover:text-emerald-500 hover:bg-zinc-700'}`}
                                    title={category.is_active ? "Deactivate" : "Activate"}
                                >
                                    <Power className="w-4 h-4" />
                                </button>
                                )}
                                {hasPermission('edit_categories') && (
                                <button 
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setEditingCategory(category);
                                        setCategoryName(category.name);
                                        setShowCategoryModal(true);
                                    }}
                                    className="p-1.5 hover:bg-zinc-700 rounded text-zinc-400 hover:text-white"
                                    title="Edit"
                                >
                                    <Edit className="w-4 h-4" />
                                </button>
                                )}
                                {hasPermission('delete_categories') && (
                                <button 
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteCategory(category);
                                    }}
                                    className="p-1.5 hover:bg-rose-900/50 rounded text-zinc-400 hover:text-rose-500"
                                    title="Delete"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>

        {/* Category Content */}
        <div className="lg:col-span-8 bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden flex flex-col min-h-[500px] lg:min-h-0 shrink-0">
            {selectedCategory ? (
                <>
                    <div className="p-4 border-b border-zinc-800 flex items-center justify-between shrink-0">
                        <div className="flex items-center gap-2 text-white">
                            <span className="text-zinc-400">Category:</span>
                            <span className="font-bold text-lg flex items-center gap-2">
                                {selectedCategory.name}
                                {!selectedCategory.is_active && (
                                    <span className="text-xs font-normal px-2 py-0.5 bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded">Inactive</span>
                                )}
                            </span>
                            <span className="px-2 py-0.5 rounded-full bg-zinc-800 text-xs text-zinc-400 ml-2">
                                {assignedProducts.length} products
                            </span>
                        </div>
                    </div>
                    
                    <div className="flex-1 overflow-hidden flex flex-col md:flex-row h-[600px] md:h-auto">
                        {/* Assigned Products */}
                        <div className="flex-1 border-b md:border-b-0 md:border-r border-zinc-800 flex flex-col min-w-0 h-1/2 md:h-auto">
                            <div className="p-3 bg-zinc-800/50 text-sm font-medium text-emerald-400 flex items-center gap-2">
                                <Package className="w-4 h-4" />
                                Assigned Products
                            </div>
                            <div className="flex-1 overflow-y-auto p-2 space-y-2">
                                {assignedProducts.length === 0 ? (
                                    <div className="text-center py-12 text-zinc-500">
                                        <p>No products in this category</p>
                                        <p className="text-xs mt-1">Select products from the list on the right to add</p>
                                    </div>
                                ) : (
                                    assignedProducts.map(product => (
                                        <div key={product.item_id} className="flex items-center gap-3 p-2 bg-zinc-800/30 rounded border border-zinc-800 hover:border-zinc-700">
                                            <img src={product.image_url} alt="" className="w-10 h-10 rounded object-cover bg-zinc-800" />
                                            <div className="flex-1 min-w-0">
                                                <div className="text-sm text-white truncate">{product.product_name}</div>
                                                <div className="text-xs text-zinc-500">฿{product.price.toLocaleString()}</div>
                                            </div>
                                            <button 
                                                onClick={() => handleRemoveProduct(product)}
                                                className="p-1.5 hover:bg-rose-900/30 text-zinc-500 hover:text-rose-500 rounded"
                                                title="Remove from category"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* Unassigned Products */}
                        <div className="flex-1 flex flex-col min-w-0 h-1/2 md:h-auto">
                            <div className="p-3 bg-zinc-800/50 text-sm font-medium text-zinc-400 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                    <Search className="w-4 h-4" />
                                    Unassigned Products
                                </div>
                                <input 
                                    type="text"
                                    placeholder="Search..."
                                    value={productSearch}
                                    onChange={(e) => setProductSearch(e.target.value)}
                                    className="w-full sm:w-32 bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-indigo-500"
                                />
                            </div>
                            <div className="flex-1 overflow-y-auto p-2 space-y-2">
                                {filteredUnassigned.length === 0 ? (
                                    <div className="text-center py-12 text-zinc-500">
                                        <p>No unassigned products found</p>
                                    </div>
                                ) : (
                                    filteredUnassigned.map(product => (
                                        <div key={product.item_id} className="flex items-center gap-3 p-2 bg-zinc-800/30 rounded border border-zinc-800 hover:border-zinc-700 group">
                                            <img src={product.image_url} alt="" className="w-10 h-10 rounded object-cover bg-zinc-800" />
                                            <div className="flex-1 min-w-0">
                                                <div className="text-sm text-zinc-300 truncate">{product.product_name}</div>
                                                <div className="text-xs text-zinc-500">฿{product.price.toLocaleString()}</div>
                                            </div>
                                            <button 
                                                onClick={() => handleAssignProduct(product)}
                                                className="p-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity"
                                                title="Add to category"
                                            >
                                                <Plus className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </>
            ) : (
                <div className="flex-1 flex items-center justify-center text-zinc-500 flex-col p-12">
                    <FolderPlus className="w-16 h-16 mb-4 opacity-20" />
                    <p>Select a category to manage content</p>
                </div>
            )}
        </div>
      </div>

      {/* Add/Edit Category Modal */}
      {showCategoryModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-md p-6 shadow-2xl">
                  <h3 className="text-lg font-bold text-white mb-4">
                      {editingCategory ? 'Edit Category' : 'New Category'}
                  </h3>
                  <div className="space-y-4">
                      <div>
                          <label className="block text-sm font-medium text-zinc-400 mb-2">Category Name</label>
                          <input 
                              type="text" 
                              value={categoryName}
                              onChange={(e) => setCategoryName(e.target.value)}
                              className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                              placeholder="e.g., Electronics"
                              autoFocus
                          />
                      </div>
                      <div className="flex justify-end gap-3 pt-2">
                          <button 
                              onClick={() => setShowCategoryModal(false)}
                              className="px-4 py-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
                          >
                              Cancel
                          </button>
                          <button 
                              onClick={handleSaveCategory}
                              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
                          >
                              Save
                          </button>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* Reassign Products Modal */}
      {showReassignModal && editingCategory && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-md p-6 shadow-2xl">
                  <div className="flex items-center gap-3 mb-4 text-amber-500">
                      <AlertCircle className="w-6 h-6" />
                      <h3 className="text-lg font-bold text-white">Action Required</h3>
                  </div>
                  
                  <p className="text-zinc-300 mb-4">
                      Category <span className="font-semibold text-white">"{editingCategory.name}"</span> has assigned products. 
                      You must reassign them to another category before deactivating.
                  </p>

                  <div className="space-y-4">
                      <div>
                          <label className="block text-sm font-medium text-zinc-400 mb-2">Reassign to:</label>
                          <select 
                              value={targetCategoryId}
                              onChange={(e) => setTargetCategoryId(e.target.value)}
                              className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          >
                              <option value="">Select Category</option>
                              {activeCategories.map(c => (
                                  <option key={c.id} value={c.id}>{c.name}</option>
                              ))}
                          </select>
                      </div>
                      
                      <div className="flex justify-end gap-3 pt-2">
                          <button 
                              onClick={() => {
                                  setShowReassignModal(false);
                                  setEditingCategory(null);
                              }}
                              className="px-4 py-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
                          >
                              Cancel
                          </button>
                          <button 
                              onClick={handleReassignAndDeactivate}
                              disabled={!targetCategoryId}
                              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:bg-zinc-700 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center gap-2"
                          >
                              <RefreshCw className="w-4 h-4" />
                              Reassign & Deactivate
                          </button>
                      </div>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};
