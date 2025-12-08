import React, { useState, useEffect, useCallback } from 'react';
import { apiService } from '../services/api';
import { useDialog } from '../context/DialogContext';
import { useLayout } from '../context/LayoutContext';
import { Plus, Trash2, Edit, Calendar, Power, Loader } from 'lucide-react';

interface BannerCampaign {
  id: number;
  name: string;
  start_time: string | null;
  end_time: string | null;
  is_active: boolean;
  banner_count?: number;
}

export const BannerCampaigns: React.FC = () => {
  const [campaigns, setCampaigns] = useState<BannerCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<BannerCampaign | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    start_time: '',
    end_time: ''
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

  const openModal = useCallback((campaign?: BannerCampaign) => {
      if (campaign) {
          setEditingCampaign(campaign);
          // Format dates for datetime-local input (YYYY-MM-DDThh:mm)
          const formatForInput = (dateStr: string | null) => {
              if (!dateStr) return '';
              const date = new Date(dateStr);
              // Adjust for timezone offset manually or use a library. 
              // Simple hack for local time:
              const offset = date.getTimezoneOffset() * 60000;
              const localISOTime = (new Date(date.getTime() - offset)).toISOString().slice(0, 16);
              return localISOTime;
          };

          setFormData({
              name: campaign.name,
              start_time: formatForInput(campaign.start_time),
              end_time: formatForInput(campaign.end_time)
          });
      } else {
          setEditingCampaign(null);
          setFormData({ name: '', start_time: '', end_time: '' });
      }
      setShowModal(true);
  }, []);

  useEffect(() => {
    setHeaderContent(
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white">Master Campaigns</h2>
          <p className="text-zinc-400 text-sm">Manage marketing campaigns and schedules</p>
        </div>
        {hasPermission('create_banners') && (
        <button 
          onClick={() => openModal()}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Add Campaign
        </button>
        )}
      </div>
    );
  }, [setHeaderContent, openModal, currentUser]);

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const fetchCampaigns = async () => {
    try {
      setLoading(true);
      const response = await apiService.getBannerCampaigns();
      if (response.success) {
        setCampaigns(response.data || []);
      } else {
        throw new Error(response.message);
      }
    } catch (error: any) {
      console.error('Failed to fetch campaigns:', error);
      await showAlert(`Failed to load campaigns: ${error.message}`, { variant: 'danger' });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
        await showAlert('Campaign name is required', { variant: 'danger' });
        return;
    }

    // Basic date validation
    if (formData.start_time && formData.end_time) {
        if (new Date(formData.start_time) > new Date(formData.end_time)) {
            await showAlert('Start time cannot be after end time', { variant: 'danger' });
            return;
        }
    }

    const payload = {
        name: formData.name,
        start_time: formData.start_time || null,
        end_time: formData.end_time || null
    };

    try {
      if (editingCampaign) {
        const response = await apiService.updateBannerCampaign(editingCampaign.id, payload);
        if (response.success) {
          await showAlert('Campaign updated successfully', { variant: 'success' });
          fetchCampaigns();
        } else {
            throw new Error(response.message);
        }
      } else {
        const response = await apiService.createBannerCampaign(payload);
        if (response.success) {
          await showAlert('Campaign created successfully', { variant: 'success' });
          fetchCampaigns();
        } else {
            throw new Error(response.message);
        }
      }
      setShowModal(false);
      setFormData({ name: '', start_time: '', end_time: '' });
      setEditingCampaign(null);
    } catch (error: any) {
      console.error('Save campaign error:', error);
      await showAlert(error.message || 'Failed to save campaign', { variant: 'danger' });
    }
  };

  const handleDelete = async (campaign: BannerCampaign) => {
    if ((campaign.banner_count || 0) > 0) {
        await showAlert(`Cannot delete campaign "${campaign.name}" because it has linked banners.`, { variant: 'danger' });
        return;
    }

    const confirmed = await showConfirm(`Are you sure you want to delete campaign "${campaign.name}"?`, {
        variant: 'danger',
        confirmText: 'Delete'
    });

    if (!confirmed) return;

    try {
      const response = await apiService.deleteBannerCampaign(campaign.id);
      if (response.success) {
        await showAlert('Campaign deleted successfully', { variant: 'success' });
        fetchCampaigns();
      } else {
        throw new Error(response.message);
      }
    } catch (error: any) {
        console.error('Delete campaign error:', error);
        await showAlert(error.message || 'Failed to delete campaign', { variant: 'danger' });
    }
  };

  const handleToggleStatus = async (campaign: BannerCampaign) => {
      if (!campaign.is_active && (campaign.banner_count || 0) > 0) {
          // Activating is fine
      } else if (campaign.is_active && (campaign.banner_count || 0) > 0) {
          // Deactivating with banners check
          await showAlert(`Cannot deactivate campaign "${campaign.name}" because it has linked banners.`, { variant: 'danger' });
          return;
      }

      const newStatus = !campaign.is_active;
      try {
          const response = await apiService.updateBannerCampaignStatus(campaign.id, newStatus);
          if (response.success) {
              fetchCampaigns();
          } else {
              throw new Error(response.message);
          }
      } catch (err: any) {
          await showAlert(err.message || 'Failed to update status', { variant: 'danger' });
      }
  };

  const formatDate = (dateString: string | null) => {
      if (!dateString) return 'Not set';
      return new Date(dateString).toLocaleString('th-TH', {
          year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
      });
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-[400px]">
        <Loader className="w-8 h-8 animate-spin text-indigo-500" />
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {campaigns.map(campaign => (
            <div key={campaign.id} className={`bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex flex-col justify-between ${!campaign.is_active ? 'opacity-60' : ''}`}>
                <div>
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="font-bold text-white">{campaign.name}</h3>
                        <span className={`px-2 py-0.5 rounded text-xs ${campaign.is_active ? 'bg-emerald-500/10 text-emerald-500' : 'bg-zinc-700 text-zinc-400'}`}>
                            {campaign.is_active ? 'Active' : 'Inactive'}
                        </span>
                    </div>
                    
                    <div className="space-y-2 text-sm text-zinc-400 mb-4">
                        <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-indigo-400" />
                            <span>Start: {formatDate(campaign.start_time)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-rose-400" />
                            <span>End: {formatDate(campaign.end_time)}</span>
                        </div>
                    </div>

                    <div className="text-xs text-zinc-500">
                        Linked Banners: {campaign.banner_count || 0}
                    </div>
                </div>
                
                <div className="flex items-center gap-2 mt-4 pt-4 border-t border-zinc-800">
                    {hasPermission('edit_banners') && (
                    <button 
                        onClick={() => handleToggleStatus(campaign)}
                        className={`p-2 rounded-lg flex-1 flex items-center justify-center gap-2 transition-colors ${
                            campaign.is_active 
                            ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300' 
                            : 'bg-emerald-900/20 hover:bg-emerald-900/30 text-emerald-500'
                        }`}
                    >
                        <Power className="w-4 h-4" />
                        {campaign.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                    )}
                    {hasPermission('edit_banners') && (
                    <button 
                        onClick={() => openModal(campaign)}
                        className="p-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg transition-colors"
                    >
                        <Edit className="w-4 h-4" />
                    </button>
                    )}
                    {hasPermission('delete_banners') && (
                    <button 
                        onClick={() => handleDelete(campaign)}
                        className="p-2 bg-zinc-800 hover:bg-rose-900/20 text-zinc-300 hover:text-rose-500 rounded-lg transition-colors"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                    )}
                </div>
            </div>
        ))}
        
        {campaigns.length === 0 && !loading && (
            <div className="col-span-full text-center py-12 text-zinc-500">
                <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No campaigns defined yet</p>
            </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-md p-6 shadow-2xl animate-in zoom-in-95 duration-200">
                  <h3 className="text-lg font-bold text-white mb-4">
                      {editingCampaign ? 'Edit Campaign' : 'New Campaign'}
                  </h3>
                  <div className="space-y-4">
                      <div>
                          <label className="block text-sm font-medium text-zinc-400 mb-2">Campaign Name</label>
                          <input 
                              type="text" 
                              value={formData.name}
                              onChange={(e) => setFormData({...formData, name: e.target.value})}
                              className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                              placeholder="e.g., Summer Sale 2025"
                              autoFocus
                          />
                      </div>
                      
                      <div>
                          <label className="block text-sm font-medium text-zinc-400 mb-2">Start Date & Time</label>
                          <input 
                              type="datetime-local" 
                              value={formData.start_time}
                              onChange={(e) => setFormData({...formData, start_time: e.target.value})}
                              className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                      </div>

                      <div>
                          <label className="block text-sm font-medium text-zinc-400 mb-2">End Date & Time</label>
                          <input 
                              type="datetime-local" 
                              value={formData.end_time}
                              onChange={(e) => setFormData({...formData, end_time: e.target.value})}
                              className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
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
