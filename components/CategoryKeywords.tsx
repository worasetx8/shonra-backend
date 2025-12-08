import React, { useState, useEffect, useCallback } from 'react';
import { apiService } from '../services/api';
import { useDialog } from '../context/DialogContext';
import { useLayout } from '../context/LayoutContext';
import { Plus, Trash2, Edit, Key, Search, Filter, X, Check, Star, StarOff, Layers, ChevronUp, ChevronDown } from 'lucide-react';

interface CategoryKeyword {
  id: number;
  category_id: number;
  keyword: string;
  is_high_priority: boolean;
  category_name?: string;
  category_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

interface Category {
  id: number;
  name: string;
  is_active: number;
}

export const CategoryKeywords: React.FC = () => {
  const [keywords, setKeywords] = useState<CategoryKeyword[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'list' | 'create' | 'edit'>('list');
  const [formData, setFormData] = useState<Partial<CategoryKeyword>>({
    category_id: 0,
    keyword: '',
    is_high_priority: false
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<number | 'all'>('all');
  const [isFilterExpanded, setIsFilterExpanded] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  const { showAlert, showConfirm } = useDialog();
  const { setHeaderContent } = useLayout();

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await apiService.getCurrentUser();
        if (res.success) setCurrentUser(res.data);
      } catch (e) {
        console.error(e);
      }
    };
    fetchUser();
  }, []);

  const hasPermission = (permission: string) => {
    if (currentUser?.id === 1 || currentUser?.role_id === 1) return true;
    return currentUser?.permissions?.includes(permission);
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const categoryId = filterCategory === 'all' ? undefined : filterCategory;
      const search = searchQuery || undefined;
      const response = await apiService.getCategoryKeywords(categoryId as number, search);
      if (response.success) {
        setKeywords(response.data || []);
      } else {
        throw new Error(response.message || 'Failed to fetch keywords');
      }
    } catch (error: any) {
      console.error('Failed to fetch keywords:', error);
      await showAlert(error.message || 'Failed to load keywords', { variant: 'danger' });
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await apiService.getCategories();
      if (response.success) {
        setCategories(response.data || []);
      }
    } catch (error: any) {
      console.error('Failed to fetch categories:', error);
    }
  };

  const handleSearch = useCallback(() => {
    fetchData();
  }, [filterCategory, searchQuery]);

  const handleClearSearch = useCallback(() => {
    setSearchQuery('');
    setFilterCategory('all');
    // fetchData will be triggered by useEffect when filterCategory changes
  }, []);

  const resetForm = () => {
    setFormData({
      category_id: 0,
      keyword: '',
      is_high_priority: false
    });
  };

  useEffect(() => {
    fetchData();
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchData();
  }, [filterCategory, searchQuery]);

  // Effect to update Header
  useEffect(() => {
    if (view === 'list') {
      setHeaderContent(
        <div className="space-y-4 w-full">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold text-white">Manage Category Keywords</h2>
              <p className="text-zinc-400 mt-1 text-sm">Manage keywords for automatic product categorization</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  resetForm();
                  setView('create');
                }}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Keyword
              </button>
              <button 
                onClick={() => setIsFilterExpanded(prev => !prev)}
                className="p-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-zinc-400 hover:text-white transition-colors"
                title={isFilterExpanded ? "Collapse Filters" : "Expand Filters"}
              >
                {isFilterExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <div className={`transition-all duration-300 ease-in-out overflow-hidden ${isFilterExpanded ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}`}>
            <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4">
              <form onSubmit={(e) => { e.preventDefault(); handleSearch(); }} className="space-y-4">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-500 w-5 h-5" />
                    <input
                      type="text"
                      placeholder="Search keywords..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                    />
                  </div>
                  <select
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}
                    className="px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                  >
                    <option value="all">All Categories</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors"
                  >
                    Search
                  </button>
                  {(searchQuery || filterCategory !== 'all') && (
                    <button
                      type="button"
                      onClick={handleClearSearch}
                      className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-white rounded-lg flex items-center gap-2 transition-colors"
                    >
                      <X className="w-4 h-4" />
                      Clear
                    </button>
                  )}
                </div>
              </form>
            </div>
          </div>
        </div>
      );
    } else {
      setHeaderContent(null);
    }
  }, [view, isFilterExpanded, categories.length, handleSearch, handleClearSearch, searchQuery, filterCategory, setHeaderContent]);

  const handleSave = async () => {
    if (!formData.category_id || formData.category_id === 0) {
      await showAlert('Please select a category', { variant: 'danger' });
      return;
    }
    if (!formData.keyword || !formData.keyword.trim()) {
      await showAlert('Please enter a keyword', { variant: 'danger' });
      return;
    }

    try {
      if (view === 'edit' && formData.id) {
        // Edit mode: single keyword only (no comma splitting)
        const response = await apiService.updateCategoryKeyword(formData.id, {
          keyword: formData.keyword.trim(),
          is_high_priority: formData.is_high_priority || false
        });
        if (response.success) {
          await showAlert('Keyword updated successfully', { variant: 'success' });
          fetchData();
          setView('list');
          resetForm();
        } else {
          throw new Error(response.message);
        }
      } else {
        // Create mode: split by comma if multiple keywords
        const keywordInput = formData.keyword.trim();
        const keywords = keywordInput
          .split(',')
          .map(k => k.trim())
          .filter(k => k.length > 0);

        if (keywords.length === 0) {
          await showAlert('Please enter at least one keyword', { variant: 'danger' });
          return;
        }

        if (keywords.length === 1) {
          // Single keyword: use regular create endpoint
          const response = await apiService.createCategoryKeyword({
            category_id: formData.category_id as number,
            keyword: keywords[0],
            is_high_priority: formData.is_high_priority || false
          });
          if (response.success) {
            await showAlert('Keyword created successfully', { variant: 'success' });
            fetchData();
            setView('list');
            resetForm();
          } else {
            throw new Error(response.message);
          }
        } else {
          // Multiple keywords: use bulk create endpoint
          const keywordsData = keywords.map(keyword => ({
            keyword,
            is_high_priority: formData.is_high_priority || false
          }));
          
          const response = await apiService.bulkCreateCategoryKeywords(
            formData.category_id as number,
            keywordsData
          );
          
          if (response.success) {
            const created = response.data?.created || 0;
            const skipped = response.data?.skipped || 0;
            let message = `Created ${created} keyword(s) successfully`;
            if (skipped > 0) {
              message += ` (${skipped} duplicate(s) skipped)`;
            }
            await showAlert(message, { variant: 'success' });
            fetchData();
            setView('list');
            resetForm();
          } else {
            throw new Error(response.message);
          }
        }
      }
    } catch (error: any) {
      console.error('Save keyword error:', error);
      const errorMessage = error.message?.includes('Duplicate entry') || error.message?.includes('already exists')
        ? 'Keyword already exists for this category'
        : error.message || 'Failed to save keyword';
      await showAlert(errorMessage, { variant: 'danger' });
    }
  };

  const handleDelete = async (keyword: CategoryKeyword) => {
    const confirmed = await showConfirm(
      `Are you sure you want to delete keyword "${keyword.keyword}"?`,
      {
        variant: 'danger',
        confirmText: 'Delete'
      }
    );

    if (!confirmed) return;

    try {
      const response = await apiService.deleteCategoryKeyword(keyword.id);
      if (response.success) {
        await showAlert('Keyword deleted successfully', { variant: 'success' });
        fetchData();
      } else {
        throw new Error(response.message);
      }
    } catch (error: any) {
      console.error('Delete keyword error:', error);
      await showAlert(error.message || 'Failed to delete keyword', { variant: 'danger' });
    }
  };

  const startEdit = (keyword: CategoryKeyword) => {
    setFormData({
      id: keyword.id,
      category_id: keyword.category_id,
      keyword: keyword.keyword,
      is_high_priority: keyword.is_high_priority
    });
    setView('edit');
  };


  // Group keywords by category
  const groupedKeywords = keywords.reduce((acc, keyword) => {
    const categoryName = keyword.category_name || 'Unknown';
    if (!acc[categoryName]) {
      acc[categoryName] = [];
    }
    acc[categoryName].push(keyword);
    return acc;
  }, {} as Record<string, CategoryKeyword[]>);

  if (!hasPermission('view_categories')) {
    return (
      <div className="p-6">
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 text-red-400">
          <p>You don't have permission to view category keywords.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {view === 'list' ? (
        <>
          {/* Keywords List */}
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
              <p className="text-gray-400 mt-4">Loading keywords...</p>
            </div>
          ) : keywords.length === 0 ? (
            <div className="text-center py-12 bg-gray-800 rounded-lg">
              <Key className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400">No keywords found</p>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(groupedKeywords).map(([categoryName, categoryKeywords]) => (
                <div key={categoryName} className="bg-gray-800 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <Layers className="w-5 h-5" />
                    {categoryName}
                    <span className="text-sm text-gray-400 font-normal">
                      ({categoryKeywords.length} keywords)
                    </span>
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {categoryKeywords.map((keyword) => (
                      <div
                        key={keyword.id}
                        className={`bg-gray-900 rounded-lg p-3 border ${
                          keyword.is_high_priority ? 'border-yellow-500/50' : 'border-gray-700'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-white font-medium">{keyword.keyword}</span>
                              {keyword.is_high_priority && (
                                <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" title="High Priority" />
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => startEdit(keyword)}
                              className="p-1 text-blue-400 hover:text-blue-300 transition-colors"
                              title="Edit"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(keyword)}
                              className="p-1 text-red-400 hover:text-red-300 transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        /* Create/Edit Form */
        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-bold text-white mb-6">
            {view === 'edit' ? 'Edit Keyword' : 'Add New Keyword'}
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Category <span className="text-red-400">*</span>
              </label>
              <select
                value={formData.category_id || 0}
                onChange={(e) => setFormData({ ...formData, category_id: parseInt(e.target.value) })}
                disabled={view === 'edit'}
                className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              >
                <option value={0}>Select Category</option>
                {categories.filter(cat => cat.is_active === 1).map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Keyword <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={formData.keyword || ''}
                onChange={(e) => setFormData({ ...formData, keyword: e.target.value })}
                placeholder="Enter keyword(s) - separate multiple keywords with comma (e.g., 'smartphone,มือถือ' or 'แก้วน้ำ,แก้วเก็บความเย็น')"
                className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_high_priority"
                checked={formData.is_high_priority || false}
                onChange={(e) => setFormData({ ...formData, is_high_priority: e.target.checked })}
                className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
              />
              <label htmlFor="is_high_priority" className="text-sm text-gray-300 flex items-center gap-2">
                <Star className="w-4 h-4 text-yellow-400" />
                High Priority (gives higher score in category matching)
              </label>
            </div>
            <div className="flex gap-3 pt-4">
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                {view === 'edit' ? 'Update' : 'Create'}
              </button>
              <button
                onClick={() => {
                  setView('list');
                  resetForm();
                }}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

