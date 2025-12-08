import React, { useState, useEffect } from 'react';
import { apiService } from '../services/api';
import { useDialog } from '../context/DialogContext';
import { useLayout } from '../context/LayoutContext';
import { Plus, Trash2, Edit, Search, Tag as TagIcon, LayoutGrid, Package, X, Power, Loader } from 'lucide-react';

interface Tag {
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

export const Tags: React.FC = () => {
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTag, setSelectedTag] = useState<Tag | null>(null);
  
  // Modals state
  const [showTagModal, setShowTagModal] = useState(false);
  const [editingTag, setEditingTag] = useState<Tag | null>(null);
  const [tagName, setTagName] = useState('');
  
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 w-full">
        <div>
          <h2 className="text-2xl font-bold text-white">Tags</h2>
          <p className="text-zinc-400 mt-1 text-sm">Manage product tags and organization</p>
        </div>
        {hasPermission('create_tags') && (
        <button 
          onClick={() => {
              setEditingTag(null);
              setTagName('');
              setShowTagModal(true);
          }}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Add Tag
        </button>
        )}
      </div>
    );
  }, [setHeaderContent, currentUser]); // Add currentUser dependency

  useEffect(() => {
    fetchTags();
  }, []);

  useEffect(() => {
    if (selectedTag) {
      fetchTagProducts(selectedTag.id);
      fetchUnassignedProducts(selectedTag.id);
    }
  }, [selectedTag]);

  const fetchTags = async () => {
    try {
      setLoading(true);
      const response = await apiService.getTags();
      if (response.success) {
        setTags(response.data || []);
      } else {
        throw new Error(response.message);
      }
    } catch (error: any) {
      console.error('Failed to fetch tags:', error);
      await showAlert(`Failed to load tags: ${error.message}`, { variant: 'danger' });
    } finally {
      setLoading(false);
    }
  };

  const fetchTagProducts = async (tagId: number) => {
    try {
      setLoadingProducts(true);
      const response = await apiService.getTagProducts(tagId);
      if (response.success) {
        setAssignedProducts(response.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch tag products:', error);
    } finally {
      setLoadingProducts(false);
    }
  };

  const fetchUnassignedProducts = async (tagId: number) => {
    try {
      const response = await apiService.getUnassignedTagProducts(tagId);
      if (response.success) {
        setUnassignedProducts(response.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch unassigned products:', error);
    }
  };

  const handleSaveTag = async () => {
    if (!tagName.trim()) {
        await showAlert('Tag name is required', { variant: 'danger' });
        return;
    }

    try {
      if (editingTag) {
        // Update Name
        const response = await apiService.updateTag(editingTag.id, tagName);
        if (response.success) {
          await showAlert('Tag updated successfully', { variant: 'success' });
          setTags(tags.map(t => t.id === editingTag.id ? { ...t, name: tagName } : t));
          if (selectedTag?.id === editingTag.id) {
              setSelectedTag({ ...selectedTag, name: tagName });
          }
        } else {
            throw new Error(response.message);
        }
      } else {
        // Create
        const response = await apiService.createTag(tagName);
        if (response.success) {
          await showAlert('Tag created successfully', { variant: 'success' });
          setTags([...tags, response.data]);
        } else {
            throw new Error(response.message);
        }
      }
      setShowTagModal(false);
      setTagName('');
      setEditingTag(null);
    } catch (error: any) {
      console.error('Save tag error:', error);
      const errorMessage = error.message?.includes('Duplicate entry') 
        ? 'Tag name already exists' 
        : (error.message || 'Failed to save tag');
      await showAlert(errorMessage, { variant: 'danger', title: 'Save Failed' });
    }
  };

  const handleDeleteTag = async (tag: Tag) => {
    // Check if products are linked (client side check for immediate feedback, backend also checks)
    if ((tag.product_count || 0) > 0) {
        await showAlert(`Cannot delete tag "${tag.name}" because it has ${tag.product_count} assigned products. Remove all products from this tag first.`, { variant: 'danger' });
        return;
    }

    const confirmed = await showConfirm(`Are you sure you want to delete tag "${tag.name}"?`, {
        variant: 'danger',
        confirmText: 'Delete'
    });

    if (!confirmed) return;

    try {
      const response = await apiService.deleteTag(tag.id);
      if (response.success) {
        await showAlert('Tag deleted successfully', { variant: 'success' });
        setTags(tags.filter(t => t.id !== tag.id));
        if (selectedTag?.id === tag.id) {
            setSelectedTag(null);
        }
      } else {
        throw new Error(response.message);
      }
    } catch (error: any) {
        console.error('Delete tag error:', error);
        await showAlert(error.message || 'Failed to delete tag', { variant: 'danger' });
    }
  };

  const handleToggleStatus = async (tag: Tag) => {
      const newStatus = !tag.is_active;
      try {
          const response = await apiService.updateTagStatus(tag.id, newStatus);
          if (response.success) {
              setTags(tags.map(t => t.id === tag.id ? { ...t, is_active: newStatus } : t));
              if (selectedTag?.id === tag.id) {
                  setSelectedTag({ ...selectedTag, is_active: newStatus });
              }
          } else {
              throw new Error(response.message);
          }
      } catch (err: any) {
          await showAlert(err.message || 'Failed to update status', { variant: 'danger' });
      }
  };

  const handleAssignProduct = async (product: Product) => {
    if (!selectedTag) return;
    try {
        const response = await apiService.assignProductsToTag(selectedTag.id, [product.item_id]);
        if (response.success) {
            setAssignedProducts([...assignedProducts, product]);
            setUnassignedProducts(unassignedProducts.filter(p => p.item_id !== product.item_id));
            
            // Update product count locally
            setTags(tags.map(t => t.id === selectedTag.id ? { ...t, product_count: (t.product_count || 0) + 1 } : t));
        }
    } catch (error: any) {
        await showAlert(`Failed to assign product: ${error.message}`, { variant: 'danger' });
    }
  };

  const handleRemoveProduct = async (product: Product) => {
    if (!selectedTag) return;
    try {
        const response = await apiService.removeProductFromTag(selectedTag.id, product.item_id);
        if (response.success) {
            setUnassignedProducts([...unassignedProducts, product]);
            setAssignedProducts(assignedProducts.filter(p => p.item_id !== product.item_id));
            
             // Update product count locally
             setTags(tags.map(t => t.id === selectedTag.id ? { ...t, product_count: Math.max(0, (t.product_count || 0) - 1) } : t));
        }
    } catch (error: any) {
        await showAlert(`Failed to remove product: ${error.message}`, { variant: 'danger' });
    }
  };

  const filteredUnassigned = unassignedProducts.filter(p => 
    p.product_name.toLowerCase().includes(productSearch.toLowerCase())
  );

  if (loading) {
      return (
        <div className="flex items-center justify-center min-h-[400px]">
             <Loader className="w-8 h-8 animate-spin text-indigo-500" />
        </div>
      );
  }

  return (
    <div className="space-y-6 h-[calc(100vh-200px)] flex flex-col">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 min-h-0">
        {/* Tags List */}
        <div className="lg:col-span-4 bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden flex flex-col h-[300px] lg:h-auto">
            <div className="p-4 border-b border-zinc-800 font-medium text-zinc-300 flex items-center gap-2">
                <LayoutGrid className="w-4 h-4" />
                All Tags
            </div>
            <div className="overflow-y-auto flex-1 p-2 space-y-2">
                {tags.length === 0 ? (
                    <div className="text-center py-12 text-zinc-500">
                        <TagIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <p>No tags yet</p>
                    </div>
                ) : (
                    tags.map(tag => (
                        <div 
                            key={tag.id}
                            onClick={() => setSelectedTag(tag)}
                            className={`p-3 rounded-lg cursor-pointer transition-colors flex items-center justify-between group ${
                                selectedTag?.id === tag.id 
                                    ? 'bg-indigo-600/20 border border-indigo-500/50 text-white' 
                                    : 'bg-zinc-800/50 border border-transparent hover:bg-zinc-800 text-zinc-300'
                            } ${!tag.is_active ? 'opacity-60 bg-zinc-900/30' : ''}`}
                        >
                            <div className="flex items-center gap-3">
                                <TagIcon className={`w-5 h-5 ${selectedTag?.id === tag.id ? 'text-indigo-400' : 'text-zinc-500'}`} />
                                <div>
                                    <span className={`font-medium ${!tag.is_active ? 'line-through text-zinc-500' : ''}`}>{tag.name}</span>
                                    <span className="ml-2 text-xs text-zinc-500">({tag.product_count || 0})</span>
                                    {!tag.is_active && <span className="ml-2 text-xs bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-500">Inactive</span>}
                                </div>
                            </div>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                {hasPermission('edit_tags') && (
                                <button 
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleToggleStatus(tag);
                                    }}
                                    className={`p-1.5 rounded transition-colors ${tag.is_active ? 'text-emerald-500 hover:bg-emerald-500/10' : 'text-zinc-500 hover:text-emerald-500 hover:bg-zinc-700'}`}
                                    title={tag.is_active ? "Deactivate" : "Activate"}
                                >
                                    <Power className="w-4 h-4" />
                                </button>
                                )}
                                {hasPermission('edit_tags') && (
                                <button 
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setEditingTag(tag);
                                        setTagName(tag.name);
                                        setShowTagModal(true);
                                    }}
                                    className="p-1.5 hover:bg-zinc-700 rounded text-zinc-400 hover:text-white"
                                    title="Edit"
                                >
                                    <Edit className="w-4 h-4" />
                                </button>
                                )}
                                {hasPermission('delete_tags') && (
                                <button 
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteTag(tag);
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

        {/* Tag Content */}
        <div className="lg:col-span-8 bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden flex flex-col min-h-[400px] lg:min-h-0">
            {selectedTag ? (
                <>
                    <div className="p-4 border-b border-zinc-800 flex items-center justify-between shrink-0">
                        <div className="flex items-center gap-2 text-white">
                            <span className="text-zinc-400">Tag:</span>
                            <span className="font-bold text-lg flex items-center gap-2">
                                {selectedTag.name}
                                {!selectedTag.is_active && (
                                    <span className="text-xs font-normal px-2 py-0.5 bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded">Inactive</span>
                                )}
                            </span>
                            <span className="px-2 py-0.5 rounded-full bg-zinc-800 text-xs text-zinc-400 ml-2">
                                {assignedProducts.length} products
                            </span>
                        </div>
                    </div>
                    
                    <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
                        {/* Assigned Products */}
                        <div className="flex-1 border-b md:border-b-0 md:border-r border-zinc-800 flex flex-col min-w-0 h-[300px] md:h-auto">
                            <div className="p-3 bg-zinc-800/50 text-sm font-medium text-emerald-400 flex items-center gap-2">
                                <Package className="w-4 h-4" />
                                Assigned Products
                            </div>
                            <div className="flex-1 overflow-y-auto p-2 space-y-2">
                                {assignedProducts.length === 0 ? (
                                    <div className="text-center py-12 text-zinc-500">
                                        <p>No products in this tag</p>
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
                                                title="Remove from tag"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* Unassigned Products */}
                        <div className="flex-1 flex flex-col min-w-0 h-[300px] md:h-auto">
                            <div className="p-3 bg-zinc-800/50 text-sm font-medium text-zinc-400 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                    <Search className="w-4 h-4" />
                                    Available Products
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
                                                title="Add to tag"
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
                    <TagIcon className="w-16 h-16 mb-4 opacity-20" />
                    <p>Select a tag to manage content</p>
                </div>
            )}
        </div>
      </div>

      {/* Add/Edit Tag Modal */}
      {showTagModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-md p-6 shadow-2xl animate-in zoom-in-95 duration-200">
                  <h3 className="text-lg font-bold text-white mb-4">
                      {editingTag ? 'Edit Tag' : 'New Tag'}
                  </h3>
                  <div className="space-y-4">
                      <div>
                          <label className="block text-sm font-medium text-zinc-400 mb-2">Tag Name</label>
                          <input 
                              type="text" 
                              value={tagName}
                              onChange={(e) => setTagName(e.target.value)}
                              className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                              placeholder="e.g., Best Seller"
                              autoFocus
                          />
                      </div>
                      <div className="flex justify-end gap-3 pt-2">
                          <button 
                              onClick={() => setShowTagModal(false)}
                              className="px-4 py-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
                          >
                              Cancel
                          </button>
                          <button 
                              onClick={handleSaveTag}
                              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
                          >
                              Save
                          </button>
                      </div>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

