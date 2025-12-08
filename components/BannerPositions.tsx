import React, { useState, useEffect, useCallback } from 'react';
import { apiService } from '../services/api';
import { useDialog } from '../context/DialogContext';
import { useLayout } from '../context/LayoutContext';
import { Plus, Trash2, Edit, Monitor, Power, Loader } from 'lucide-react';

interface BannerPosition {
  id: number;
  name: string;
  width: number;
  height: number;
  is_active: boolean;
  banner_count?: number;
}

export const BannerPositions: React.FC = () => {
  const [positions, setPositions] = useState<BannerPosition[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingPosition, setEditingPosition] = useState<BannerPosition | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    width: '',
    height: ''
  });

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

  const openModal = useCallback((position?: BannerPosition) => {
      if (position) {
          setEditingPosition(position);
          setFormData({
              name: position.name,
              width: position.width.toString(),
              height: position.height.toString()
          });
      } else {
          setEditingPosition(null);
          setFormData({ name: '', width: '', height: '' });
      }
      setShowModal(true);
  }, []);

  useEffect(() => {
    setHeaderContent(
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white">Master Positions</h2>
          <p className="text-zinc-400 text-sm">Define banner positions and dimensions</p>
        </div>
        {hasPermission('create_banners') && (
        <button 
          onClick={() => openModal()}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Add Position
        </button>
        )}
      </div>
    );
  }, [setHeaderContent, openModal, currentUser]);

  useEffect(() => {
    fetchPositions();
  }, []);

  const fetchPositions = async () => {
    try {
      setLoading(true);
      const response = await apiService.getBannerPositions();
      if (response.success) {
        setPositions(response.data || []);
      } else {
        throw new Error(response.message);
      }
    } catch (error: any) {
      console.error('Failed to fetch positions:', error);
      await showAlert(`Failed to load positions: ${error.message}`, { variant: 'danger' });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.name.trim() || !formData.width || !formData.height) {
        await showAlert('All fields are required', { variant: 'danger' });
        return;
    }

    const payload = {
        name: formData.name,
        width: parseInt(formData.width),
        height: parseInt(formData.height)
    };

    try {
      if (editingPosition) {
        const response = await apiService.updateBannerPosition(editingPosition.id, payload);
        if (response.success) {
          await showAlert('Position updated successfully', { variant: 'success' });
          fetchPositions();
        } else {
            throw new Error(response.message);
        }
      } else {
        const response = await apiService.createBannerPosition(payload);
        if (response.success) {
          await showAlert('Position created successfully', { variant: 'success' });
          fetchPositions();
        } else {
            throw new Error(response.message);
        }
      }
      setShowModal(false);
      setFormData({ name: '', width: '', height: '' });
      setEditingPosition(null);
    } catch (error: any) {
      console.error('Save position error:', error);
      const errorMessage = error.message?.includes('Duplicate entry') || error.message?.includes('Data conflict')
        ? 'Position name already exists' 
        : (error.message || 'Failed to save position');
      await showAlert(errorMessage, { variant: 'danger', title: 'Save Failed' });
    }
  };

  const handleDelete = async (position: BannerPosition) => {
    if ((position.banner_count || 0) > 0) {
        await showAlert(`Cannot delete position "${position.name}" because it has linked banners.`, { variant: 'danger' });
        return;
    }

    const confirmed = await showConfirm(`Are you sure you want to delete position "${position.name}"?`, {
        variant: 'danger',
        confirmText: 'Delete'
    });

    if (!confirmed) return;

    try {
      const response = await apiService.deleteBannerPosition(position.id);
      if (response.success) {
        await showAlert('Position deleted successfully', { variant: 'success' });
        fetchPositions();
      } else {
        throw new Error(response.message);
      }
    } catch (error: any) {
        console.error('Delete position error:', error);
        await showAlert(error.message || 'Failed to delete position', { variant: 'danger' });
    }
  };

  const handleToggleStatus = async (position: BannerPosition) => {
      if (!position.is_active && (position.banner_count || 0) > 0) {
          // Activating is fine
      } else if (position.is_active && (position.banner_count || 0) > 0) {
          // Deactivating with banners check
          await showAlert(`Cannot deactivate position "${position.name}" because it has linked banners.`, { variant: 'danger' });
          return;
      }

      const newStatus = !position.is_active;
      try {
          const response = await apiService.updateBannerPositionStatus(position.id, newStatus);
          if (response.success) {
              fetchPositions();
          } else {
              throw new Error(response.message);
          }
      } catch (err: any) {
          await showAlert(err.message || 'Failed to update status', { variant: 'danger' });
      }
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-[400px]">
        <Loader className="w-8 h-8 animate-spin text-indigo-500" />
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {positions.map(position => (
            <div key={position.id} className={`bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex flex-col justify-between ${!position.is_active ? 'opacity-60' : ''}`}>
                <div>
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="font-bold text-white">{position.name}</h3>
                        <span className={`px-2 py-0.5 rounded text-xs ${position.is_active ? 'bg-emerald-500/10 text-emerald-500' : 'bg-zinc-700 text-zinc-400'}`}>
                            {position.is_active ? 'Active' : 'Inactive'}
                        </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-zinc-400 mb-4">
                        <Monitor className="w-4 h-4" />
                        <span>{position.width} x {position.height} px</span>
                    </div>
                    <div className="text-xs text-zinc-500">
                        Linked Banners: {position.banner_count || 0}
                    </div>
                </div>
                
                <div className="flex items-center gap-2 mt-4 pt-4 border-t border-zinc-800">
                    {hasPermission('edit_banners') && (
                    <button 
                        onClick={() => handleToggleStatus(position)}
                        className={`p-2 rounded-lg flex-1 flex items-center justify-center gap-2 transition-colors ${
                            position.is_active 
                            ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300' 
                            : 'bg-emerald-900/20 hover:bg-emerald-900/30 text-emerald-500'
                        }`}
                    >
                        <Power className="w-4 h-4" />
                        {position.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                    )}
                    {hasPermission('edit_banners') && (
                    <button 
                        onClick={() => openModal(position)}
                        className="p-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg transition-colors"
                    >
                        <Edit className="w-4 h-4" />
                    </button>
                    )}
                    {hasPermission('delete_banners') && (
                    <button 
                        onClick={() => handleDelete(position)}
                        className="p-2 bg-zinc-800 hover:bg-rose-900/20 text-zinc-300 hover:text-rose-500 rounded-lg transition-colors"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                    )}
                </div>
            </div>
        ))}
        
        {positions.length === 0 && !loading && (
            <div className="col-span-full text-center py-12 text-zinc-500">
                <Monitor className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No positions defined yet</p>
            </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-md p-6 shadow-2xl animate-in zoom-in-95 duration-200">
                  <h3 className="text-lg font-bold text-white mb-4">
                      {editingPosition ? 'Edit Position' : 'New Position'}
                  </h3>
                  <div className="space-y-4">
                      <div>
                          <label className="block text-sm font-medium text-zinc-400 mb-2">Position Name</label>
                          <input 
                              type="text" 
                              value={formData.name}
                              onChange={(e) => setFormData({...formData, name: e.target.value})}
                              className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                              placeholder="e.g., Homepage Top Banner"
                              autoFocus
                          />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                          <div>
                              <label className="block text-sm font-medium text-zinc-400 mb-2">Width (px)</label>
                              <input 
                                  type="number" 
                                  value={formData.width}
                                  onChange={(e) => setFormData({...formData, width: e.target.value})}
                                  className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                  placeholder="1920"
                              />
                          </div>
                          <div>
                              <label className="block text-sm font-medium text-zinc-400 mb-2">Height (px)</label>
                              <input 
                                  type="number" 
                                  value={formData.height}
                                  onChange={(e) => setFormData({...formData, height: e.target.value})}
                                  className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                  placeholder="600"
                              />
                          </div>
                      </div>
                      <div className="flex justify-end gap-3 pt-2">
                          <button 
                              onClick={() => setShowModal(false)}
                              className="px-4 py-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
                          >
                              Cancel
                          </button>
                          <button 
                              onClick={handleSave}
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
