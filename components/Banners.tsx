import React, { useState, useEffect, useRef } from 'react';
import { apiService } from '../services/api';
import { useDialog } from '../context/DialogContext';
import { useLayout } from '../context/LayoutContext';
import { Plus, Trash2, Edit, Image as ImageIcon, Calendar, Monitor, Link as LinkIcon, Check, X, Crop, Upload, Power, FilterX, Copy, CheckCircle } from 'lucide-react';
import Cropper, { Area } from 'react-easy-crop';

// You might need to install this: npm install react-easy-crop
// Or check if it's available. If not, I will assume it is or use a simpler approach.
// Since I cannot install easily, I will write the code assuming it is there.
// If user reports error, I'll guide them to install.

interface Banner {
  id: number;
  position_id: number;
  campaign_id: number | null;
  image_url: string;
  target_url: string;
  alt_text: string;
  title: string;
  description: string;
  sort_order: number;
  start_time: string | null;
  end_time: string | null;
  is_active: boolean;
  open_new_tab: boolean;
  position_name?: string;
  width?: number;
  height?: number;
  campaign_name?: string;
  campaign_start?: string;
  campaign_end?: string;
  campaign_active?: boolean;
}

interface Position {
  id: number;
  name: string;
  width: number;
  height: number;
}

interface Campaign {
  id: number;
  name: string;
  start_time: string | null;
  end_time: string | null;
  is_active: boolean;
}

export const Banners: React.FC = () => {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'list' | 'create' | 'edit'>('list');
  
  // Form state
  const [formData, setFormData] = useState<Partial<Banner>>({
      open_new_tab: false,
      is_active: true,
      sort_order: 0
  });
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [selectedFileType, setSelectedFileType] = useState<string>('image/jpeg'); // Store original file type
  
  // Cropper state
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [showCropper, setShowCropper] = useState(false);

  // Filters state
  const [filterPosition, setFilterPosition] = useState<string>('');
  const [filterCampaign, setFilterCampaign] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [copiedUrl, setCopiedUrl] = useState<number | null>(null);

  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    const fetchUser = async () => {
        try {
            const res = await apiService.getCurrentUser();
            if (res.success) setCurrentUser(res.data);
        } catch (e) { 
          // Silent error - user fetch failed, continue without user data
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

  const handleClearFilters = () => {
      setFilterPosition('');
      setFilterCampaign('');
      setFilterStatus('');
  };

  const getFullImageUrl = (imageUrl: string) => {
    if (!imageUrl) return '';
    if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
      return imageUrl;
    }
    const baseUrl = import.meta.env.VITE_API_URL || import.meta.env.SERVER_URL || 'http://localhost:3002';
    return imageUrl.startsWith('/') ? `${baseUrl}${imageUrl}` : `${baseUrl}/${imageUrl}`;
  };

  const handleCopyImageUrl = async (banner: Banner) => {
    const fullUrl = getFullImageUrl(banner.image_url);
    try {
      await navigator.clipboard.writeText(fullUrl);
      setCopiedUrl(banner.id);
      setTimeout(() => setCopiedUrl(null), 2000);
      showAlert('Image URL copied to clipboard!', { variant: 'success' });
    } catch (error) {
      showAlert('Failed to copy URL', { variant: 'danger' });
    }
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [bannersRes, positionsRes, campaignsRes] = await Promise.all([
          apiService.getBanners(),
          apiService.getBannerPositions(),
          apiService.getBannerCampaigns()
      ]);

      if (bannersRes.success) setBanners(bannersRes.data || []);
      if (positionsRes.success) setPositions(positionsRes.data || []);
      if (campaignsRes.success) setCampaigns(campaignsRes.data || []);
      
    } catch (error: any) {
      await showAlert('Failed to load banner data', { variant: 'danger' });
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
          const file = e.target.files[0];
          setSelectedFileType(file.type || 'image/jpeg'); // Store original file type
          const reader = new FileReader();
          reader.addEventListener('load', () => {
              setSelectedFile(reader.result as string);
              setShowCropper(true);
          });
          reader.readAsDataURL(file);
      }
  };

  const onCropComplete = (croppedArea: Area, croppedAreaPixels: Area) => {
      setCroppedAreaPixels(croppedAreaPixels);
  };

  const createImage = (url: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
      const image = new Image();
      image.addEventListener('load', () => resolve(image));
      image.addEventListener('error', (error) => reject(error));
      image.setAttribute('crossOrigin', 'anonymous');
      image.src = url;
    });

  const getCroppedImg = async (imageSrc: string, pixelCrop: Area, mimeType: string = 'image/jpeg'): Promise<Blob | null> => {
      const image = await createImage(imageSrc);
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      if (!ctx) {
          return null;
      }

      canvas.width = pixelCrop.width;
      canvas.height = pixelCrop.height;

      // For PNG with transparency, ensure we preserve it
      if (mimeType === 'image/png') {
          // Clear canvas with transparent background
          ctx.clearRect(0, 0, canvas.width, canvas.height);
      }

      ctx.drawImage(
          image,
          pixelCrop.x,
          pixelCrop.y,
          pixelCrop.width,
          pixelCrop.height,
          0,
          0,
          pixelCrop.width,
          pixelCrop.height
      );

      // Determine quality based on format
      // PNG: no quality parameter (preserves transparency)
      // JPEG/WebP: use quality parameter
      const quality = mimeType === 'image/png' ? undefined : 0.9;

      return new Promise((resolve) => {
          canvas.toBlob((blob) => {
              resolve(blob);
          }, mimeType, quality);
      });
  };

  const handleCropSave = async () => {
      if (selectedFile && croppedAreaPixels) {
          try {
              // Use original file type to preserve format (especially PNG transparency)
              const croppedBlob = await getCroppedImg(selectedFile, croppedAreaPixels, selectedFileType);
              if (croppedBlob) {
                  // Convert blob to File - preserve original file extension
                  const ext = selectedFileType === 'image/png' ? 'png' : 
                             selectedFileType === 'image/webp' ? 'webp' : 
                             selectedFileType === 'image/gif' ? 'gif' : 'jpg';
                  const croppedFile = new File([croppedBlob], `banner-${Date.now()}.${ext}`, { type: selectedFileType });
                  
                  // Upload file to server
                  const uploadResponse = await apiService.uploadBannerImage(croppedFile);
                  
                  if (uploadResponse.success && uploadResponse.data?.url) {
                      // Use the URL from server instead of base64
                      setFormData({ ...formData, image_url: uploadResponse.data.url });
                      setShowCropper(false);
                      setSelectedFile(null); // Clear source file
                      await showAlert('Image uploaded successfully', { variant: 'success' });
                  } else {
                      throw new Error(uploadResponse.message || 'Failed to upload image');
                  }
              }
          } catch (e: any) {
              // Error handled by showAlert
              await showAlert(e.message || 'Failed to crop and upload image', { variant: 'danger' });
          }
      }
  };

  const handleSave = async () => {
      if (!formData.position_id) {
          await showAlert('Please select a position', { variant: 'danger' });
          return;
      }
      if (!formData.image_url) {
          await showAlert('Please upload a banner image', { variant: 'danger' });
          return;
      }

      // Date validation if not using campaign
      if (!formData.campaign_id) {
          if (formData.start_time && formData.end_time) {
              if (new Date(formData.start_time) > new Date(formData.end_time)) {
                  await showAlert('Start time cannot be after end time', { variant: 'danger' });
                  return;
              }
          }
      }

      try {
          if (view === 'edit' && formData.id) {
              const response = await apiService.updateBanner(formData.id, formData);
              if (response.success) {
                  await showAlert('Banner updated successfully', { variant: 'success' });
                  fetchData();
                  setView('list');
              } else {
                  throw new Error(response.message);
              }
          } else {
              const response = await apiService.createBanner(formData);
              if (response.success) {
                  await showAlert('Banner created successfully', { variant: 'success' });
                  fetchData();
                  setView('list');
              } else {
                  throw new Error(response.message);
              }
          }
      } catch (error: any) {
          console.error('Save banner error:', error);
          const errorMessage = error.message?.includes('Data conflict')
              ? 'Banner already exists'
              : error.message?.includes('File too large')
              ? 'Image is too large. Please try a smaller image.'
              : error.message?.includes('Sort order')
              ? error.message
              : (error.message || 'Failed to save banner');
          await showAlert(errorMessage, { variant: 'danger' });
      }
  };

  const handleDelete = async (banner: Banner) => {
      const confirmed = await showConfirm('Are you sure you want to delete this banner?', {
          variant: 'danger',
          confirmText: 'Delete'
      });

      if (!confirmed) return;

      try {
          const response = await apiService.deleteBanner(banner.id);
          if (response.success) {
              await showAlert('Banner deleted successfully', { variant: 'success' });
              setBanners(banners.filter(b => b.id !== banner.id));
          } else {
              throw new Error(response.message);
          }
      } catch (error: any) {
          console.error('Delete banner error:', error);
          await showAlert(error.message || 'Failed to delete banner', { variant: 'danger' });
      }
  };

  const handleToggleStatus = async (banner: Banner) => {
      try {
          const response = await apiService.updateBannerStatus(banner.id, !banner.is_active);
          if (response.success) {
              setBanners(banners.map(b => b.id === banner.id ? { ...b, is_active: !banner.is_active } : b));
          } else {
              throw new Error(response.message);
          }
      } catch (error: any) {
          console.error('Update status error:', error);
          await showAlert(error.message || 'Failed to update status', { variant: 'danger' });
      }
  };

  const startEdit = (banner: Banner) => {
      // Format dates for input
      const formatForInput = (dateStr: string | null) => {
          if (!dateStr) return '';
          const date = new Date(dateStr);
          const offset = date.getTimezoneOffset() * 60000;
          return (new Date(date.getTime() - offset)).toISOString().slice(0, 16);
      };

      setFormData({
          ...banner,
          start_time: formatForInput(banner.start_time),
          end_time: formatForInput(banner.end_time)
      });
      setView('edit');
  };

  const startCreate = () => {
      setFormData({
          is_active: true,
          open_new_tab: false,
          sort_order: 0
      });
      setView('create');
  };

  // Helper to get current dimensions based on selected position
  const getSelectedPositionDimensions = () => {
      if (!formData.position_id) return { width: 1, height: 1 }; // Default aspect ratio
      const pos = positions.find(p => p.id === Number(formData.position_id));
      return pos ? { width: pos.width, height: pos.height } : { width: 1, height: 1 };
  };

  const filteredBanners = banners.filter(banner => {
      const matchesPosition = filterPosition ? banner.position_id === Number(filterPosition) : true;
      const matchesCampaign = filterCampaign ? banner.campaign_id === Number(filterCampaign) : true;
      const matchesStatus = filterStatus ? (filterStatus === 'active' ? banner.is_active : !banner.is_active) : true;
      return matchesPosition && matchesCampaign && matchesStatus;
  });

  useEffect(() => {
      if (view === 'list') {
          setHeaderContent(
              <div className="flex flex-col gap-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                          <h2 className="text-2xl font-bold text-white">Banners</h2>
                          <p className="text-zinc-400 mt-1 text-sm">Manage all banners across the platform</p>
                      </div>
                      {hasPermission('create_banners') && (
                      <button 
                          onClick={startCreate}
                          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2 self-start sm:self-auto"
                      >
                          <Plus className="w-4 h-4" />
                          Add Banner
                      </button>
                      )}
                  </div>

                  <div className="flex flex-col md:flex-row gap-4">
                      <select
                          value={filterPosition}
                          onChange={(e) => setFilterPosition(e.target.value)}
                          className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                      >
                          <option value="">All Positions</option>
                          {positions.map(p => (
                              <option key={p.id} value={p.id}>{p.name}</option>
                          ))}
                      </select>
                      <select
                          value={filterCampaign}
                          onChange={(e) => setFilterCampaign(e.target.value)}
                          className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                      >
                          <option value="">All Campaigns</option>
                          {campaigns.map(c => (
                              <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                      </select>
                      <select
                          value={filterStatus}
                          onChange={(e) => setFilterStatus(e.target.value)}
                          className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                      >
                          <option value="">All Status</option>
                          <option value="active">Active</option>
                          <option value="inactive">Inactive</option>
                      </select>
                      <button 
                          onClick={handleClearFilters}
                          className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg transition-colors flex items-center justify-center gap-2 whitespace-nowrap"
                          title="Clear Filters"
                      >
                          <FilterX className="w-4 h-4" />
                          <span className="hidden md:inline">Clear</span>
                      </button>
                  </div>
              </div>
          );
      } else {
          setHeaderContent(
              <div className="flex items-center justify-between">
                  <div>
                      <h2 className="text-2xl font-bold text-white">
                          {view === 'create' ? 'Create New Banner' : 'Edit Banner'}
                      </h2>
                      <p className="text-zinc-400 mt-1 text-sm">
                          {view === 'create' ? 'Add a new banner to your site' : 'Update existing banner details'}
                      </p>
                  </div>
                  <button 
                      onClick={() => setView('list')}
                      className="px-4 py-2 text-zinc-400 hover:text-white transition-colors"
                  >
                      Cancel
                  </button>
              </div>
          );
      }
  }, [view, positions, campaigns, filterPosition, filterCampaign, filterStatus, setHeaderContent, currentUser]);

  if (loading) return <div className="p-8 text-center text-zinc-500">Loading banners...</div>;

  if (view === 'list') {
      return (
          <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredBanners.map(banner => (
                      <div key={banner.id} className={`bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden flex flex-col ${!banner.is_active ? 'opacity-60' : ''}`}>
                          <div className="aspect-video bg-zinc-800 relative">
                              <img 
                                src={banner.image_url && banner.image_url.startsWith('/api/') && !banner.image_url.startsWith('http')
                                  ? `${import.meta.env.VITE_API_URL || import.meta.env.SERVER_URL || 'http://localhost:3002'}${banner.image_url}`
                                  : banner.image_url
                                } 
                                alt={banner.alt_text} 
                                className="w-full h-full object-cover" 
                              />
                              <div className="absolute top-2 right-2 flex gap-1">
                                  <span className={`px-2 py-1 rounded text-xs font-bold ${banner.is_active ? 'bg-emerald-500 text-white' : 'bg-zinc-600 text-zinc-300'}`}>
                                      {banner.is_active ? 'Active' : 'Inactive'}
                                  </span>
                              </div>
                          </div>
                          <div className="p-4 flex-1 flex flex-col">
                              <div className="mb-3">
                                  <div className="flex justify-between items-start">
                                      <h3 className="font-bold text-white line-clamp-1 flex-1 pr-2">{banner.title || 'Untitled Banner'}</h3>
                                      <span className="px-2 py-0.5 bg-zinc-800 rounded text-xs text-zinc-400 whitespace-nowrap border border-zinc-700" title="Sort Order">
                                          #{banner.sort_order}
                                      </span>
                                  </div>
                                  <div className="flex items-center gap-2 text-xs text-zinc-400 mt-1">
                                      <Monitor className="w-3 h-3" />
                                      <span>{banner.position_name} ({banner.width}x{banner.height})</span>
                                  </div>
                              </div>
                              
                              <div className="text-xs text-zinc-500 space-y-1 mb-4 flex-1">
                                  {banner.campaign_id ? (
                                      <div className="flex items-center gap-2 text-indigo-400">
                                          <Calendar className="w-3 h-3" />
                                          <span>Campaign: {banner.campaign_name}</span>
                                      </div>
                                  ) : (
                                      <div className="space-y-1">
                                          <div className="flex items-center gap-2">Start: {banner.start_time ? new Date(banner.start_time).toLocaleDateString() : 'Immediate'}</div>
                                          <div className="flex items-center gap-2">End: {banner.end_time ? new Date(banner.end_time).toLocaleDateString() : 'Never'}</div>
                                      </div>
                                  )}
                                  {banner.target_url && (
                                      <div className="flex items-center gap-2 text-zinc-400 truncate">
                                          <LinkIcon className="w-3 h-3 shrink-0" />
                                          <a href={banner.target_url} target="_blank" rel="noreferrer" className="hover:text-indigo-400 truncate">
                                              {banner.target_url}
                                          </a>
                                      </div>
                                  )}
                                  {banner.image_url && (
                                      <div className="mt-2 p-2 bg-zinc-800/50 rounded border border-zinc-700">
                                          <div className="flex items-center justify-between gap-2 mb-1">
                                              <span className="text-zinc-400 flex items-center gap-1">
                                                  <ImageIcon className="w-3 h-3" />
                                                  Image URL:
                                              </span>
                                              <button
                                                  onClick={() => handleCopyImageUrl(banner)}
                                                  className="p-1 hover:bg-zinc-700 rounded transition-colors text-zinc-400 hover:text-indigo-400"
                                                  title="Copy image URL"
                                              >
                                                  {copiedUrl === banner.id ? (
                                                      <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                                                  ) : (
                                                      <Copy className="w-3.5 h-3.5" />
                                                  )}
                                              </button>
                                          </div>
                                          <div className="text-zinc-300 text-xs break-all font-mono bg-zinc-900/50 p-1.5 rounded">
                                              {getFullImageUrl(banner.image_url)}
                                          </div>
                                      </div>
                                  )}
                              </div>

                              <div className="flex items-center gap-2 pt-3 border-t border-zinc-800">
                                  {hasPermission('edit_banners') && (
                                  <button 
                                      onClick={() => handleToggleStatus(banner)}
                                      className="p-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg transition-colors"
                                      title={banner.is_active ? 'Deactivate' : 'Activate'}
                                  >
                                      <Power className="w-4 h-4" />
                                  </button>
                                  )}
                                  {hasPermission('edit_banners') && (
                                  <button 
                                      onClick={() => startEdit(banner)}
                                      className="p-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg transition-colors flex-1 flex items-center justify-center"
                                  >
                                      <Edit className="w-4 h-4" />
                                  </button>
                                  )}
                                  {hasPermission('delete_banners') && (
                                  <button 
                                      onClick={() => handleDelete(banner)}
                                      className="p-2 bg-zinc-800 hover:bg-rose-900/20 text-zinc-300 hover:text-rose-500 rounded-lg transition-colors"
                                  >
                                      <Trash2 className="w-4 h-4" />
                                  </button>
                                  )}
                              </div>
                          </div>
                      </div>
                  ))}
                  {filteredBanners.length === 0 && (
                      <div className="col-span-full text-center py-12 text-zinc-500">
                          <ImageIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
                          <p>No banners found</p>
                      </div>
                  )}
              </div>
          </div>
      );
  }

  // Create / Edit View
  const dims = getSelectedPositionDimensions();
  
  return (
      <div className="max-w-3xl mx-auto">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-6">
              {/* Position Selection */}
              <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-2">Position (Required)</label>
                  <select 
                      value={formData.position_id || ''}
                      onChange={(e) => {
                          setFormData({ ...formData, position_id: Number(e.target.value) });
                          // Reset image if dimensions change significantly? 
                          // Ideally user should re-crop. 
                      }}
                      className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                      <option value="">Select a Position</option>
                      {positions.map(p => (
                          <option key={p.id} value={p.id}>{p.name} ({p.width}x{p.height})</option>
                      ))}
                  </select>
              </div>

              {/* Image Upload & Crop */}
              <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-2">Banner Image (Required)</label>
                  
                  {!formData.image_url && !showCropper && (
                      <div 
                          onClick={() => !formData.position_id ? showAlert('Select a position first', {variant: 'danger'}) : fileInputRef.current?.click()}
                          className={`border-2 border-dashed border-zinc-700 rounded-xl p-8 text-center cursor-pointer transition-colors ${formData.position_id ? 'hover:border-indigo-500 hover:bg-zinc-800' : 'opacity-50 cursor-not-allowed'}`}
                      >
                          <Upload className="w-8 h-8 mx-auto mb-2 text-zinc-500" />
                          <p className="text-zinc-400">Click to upload image</p>
                          <p className="text-xs text-zinc-600 mt-1">
                              Target Size: {dims.width}x{dims.height}px
                          </p>
                          <input 
                              type="file" 
                              ref={fileInputRef} 
                              onChange={handleFileChange} 
                              accept="image/*" 
                              className="hidden" 
                              disabled={!formData.position_id}
                          />
                      </div>
                  )}

                  {formData.image_url && !showCropper && (
                      <div className="relative rounded-xl overflow-hidden border border-zinc-700 group">
                          <img src={formData.image_url} alt="Preview" className="w-full h-auto max-h-[400px] object-contain bg-black" />
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                              <button 
                                  onClick={() => fileInputRef.current?.click()}
                                  className="p-2 bg-white text-black rounded-full hover:bg-zinc-200"
                              >
                                  <Edit className="w-5 h-5" />
                              </button>
                              <button 
                                  onClick={() => setFormData({...formData, image_url: ''})}
                                  className="p-2 bg-rose-500 text-white rounded-full hover:bg-rose-600"
                              >
                                  <Trash2 className="w-5 h-5" />
                              </button>
                          </div>
                          <input 
                              type="file" 
                              ref={fileInputRef} 
                              onChange={handleFileChange} 
                              accept="image/*" 
                              className="hidden" 
                          />
                      </div>
                  )}
              </div>

              {/* Campaign Selection */}
              <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-2">Master Campaign (Optional)</label>
                  <select 
                      value={formData.campaign_id || ''}
                      onChange={(e) => setFormData({ ...formData, campaign_id: e.target.value ? Number(e.target.value) : null })}
                      className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                      <option value="">None (Set Custom Dates)</option>
                      {campaigns.map(c => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                  </select>
                  {formData.campaign_id && (
                      <p className="text-xs text-emerald-500 mt-1">
                          Dates will be controlled by the selected campaign.
                      </p>
                  )}
              </div>

              {/* Custom Dates (if no campaign) */}
              {!formData.campaign_id && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                          <label className="block text-sm font-medium text-zinc-400 mb-2">Start Date & Time</label>
                          <input 
                              type="datetime-local" 
                              value={formData.start_time || ''}
                              onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                              className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                      </div>
                      <div>
                          <label className="block text-sm font-medium text-zinc-400 mb-2">End Date & Time</label>
                          <input 
                              type="datetime-local" 
                              value={formData.end_time || ''}
                              onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                              className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                      </div>
                  </div>
              )}

              {/* Other Fields */}
              <div className="space-y-4">
                  <div>
                      <label className="block text-sm font-medium text-zinc-400 mb-2">Target URL</label>
                      <input 
                          type="url" 
                          value={formData.target_url || ''}
                          onChange={(e) => setFormData({ ...formData, target_url: e.target.value })}
                          className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          placeholder="https://..."
                      />
                  </div>
                  
                  <div>
                      <label className="block text-sm font-medium text-zinc-400 mb-2">Title (Optional)</label>
                      <input 
                          type="text" 
                          value={formData.title || ''}
                          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                          className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                  </div>

                  <div>
                      <label className="block text-sm font-medium text-zinc-400 mb-2">Sort Order</label>
                      <input 
                          type="number" 
                          value={formData.sort_order || 0}
                          onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) })}
                          className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                      <p className="text-xs text-zinc-500 mt-1">Lower numbers appear first. Must be unique per position.</p>
                  </div>

                  <div>
                      <label className="block text-sm font-medium text-zinc-400 mb-2">Alt Text (For SEO)</label>
                      <input 
                          type="text" 
                          value={formData.alt_text || ''}
                          onChange={(e) => setFormData({ ...formData, alt_text: e.target.value })}
                          className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                  </div>

                  <div className="flex items-center gap-3">
                      <input 
                          type="checkbox" 
                          id="openNewTab"
                          checked={formData.open_new_tab || false}
                          onChange={(e) => setFormData({ ...formData, open_new_tab: e.target.checked })}
                          className="w-4 h-4 rounded bg-zinc-800 border-zinc-700 text-indigo-600 focus:ring-indigo-500"
                      />
                      <label htmlFor="openNewTab" className="text-sm text-zinc-300 cursor-pointer">Open link in new tab</label>
                  </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-zinc-800">
                  <button 
                      onClick={() => setView('list')}
                      className="px-6 py-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
                  >
                      Cancel
                  </button>
                  <button 
                      onClick={handleSave}
                      className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors font-medium"
                  >
                      {view === 'create' ? 'Create Banner' : 'Update Banner'}
                  </button>
              </div>
          </div>

          {/* Crop Modal */}
          {showCropper && selectedFile && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90">
                  <div className="bg-zinc-900 w-full h-full md:w-[90vw] md:h-[90vh] flex flex-col">
                      <div className="flex items-center justify-between p-4 border-b border-zinc-800">
                          <h3 className="text-lg font-bold text-white">Crop Banner Image</h3>
                          <button onClick={() => setShowCropper(false)} className="text-zinc-400 hover:text-white"><X className="w-6 h-6" /></button>
                      </div>
                      
                      <div className="flex-1 relative bg-black">
                          <Cropper
                              image={selectedFile}
                              crop={crop}
                              zoom={zoom}
                              aspect={dims.width / dims.height}
                              onCropChange={setCrop}
                              onZoomChange={setZoom}
                              onCropComplete={onCropComplete}
                              objectFit="contain"
                          />
                      </div>

                      <div className="p-4 border-t border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-4">
                          <div className="w-full sm:w-1/3">
                              <label className="text-xs text-zinc-400 block mb-1">Zoom</label>
                              <input 
                                  type="range" 
                                  value={zoom}
                                  min={1}
                                  max={3}
                                  step={0.1}
                                  onChange={(e) => setZoom(Number(e.target.value))}
                                  className="w-full"
                              />
                          </div>
                          <div className="flex gap-3">
                              <button 
                                  onClick={() => setShowCropper(false)}
                                  className="px-4 py-2 text-zinc-400 hover:text-white"
                              >
                                  Cancel
                              </button>
                              <button 
                                  onClick={handleCropSave}
                                  className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg"
                              >
                                  Crop & Save
                              </button>
                          </div>
                      </div>
                  </div>
              </div>
          )}
      </div>
  );
};

