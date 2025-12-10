import React, { useState, useEffect, useRef } from 'react';
import { apiService } from '../services/api';
import { useDialog } from '../context/DialogContext';
import { useLayout } from '../context/LayoutContext';
import { Settings as SettingsIcon, Share2, Save, Upload, X, Check, Plus, Trash2, Edit, Power, Globe, Image as ImageIcon, AlertTriangle, Tag, RefreshCw, Search, Database, Trash2 as Trash, Search as SearchIcon, Link2, FileText, Twitter, Shield, Sparkles } from 'lucide-react';
import Cropper, { Area } from 'react-easy-crop';

// Interfaces
interface SettingsData {
  website_name: string;
  logo_url: string;
  logo_backend_url: string;
  logo_client_url: string;
  maintenance_mode: boolean;
  maintenance_bypass_token?: string;
  version?: string;
  min_search_results?: number;
  min_commission_rate?: number;
  min_rating_star?: number;
  // SEO Settings
  site_url?: string;
  sitemap_url?: string;
  meta_description?: string;
  meta_keywords?: string;
  meta_title_template?: string;
  og_image_url?: string;
  og_title?: string;
  og_description?: string;
  twitter_handle?: string;
  google_verification_code?: string;
  bing_verification_code?: string;
  enable_ai_seo?: boolean;
  gemini_api_key?: string;
  ai_seo_language?: string;
  canonical_url?: string;
  robots_meta?: string;
}

interface SocialMedia {
  id: number;
  name: string;
  icon_url: string;
  url: string;
  is_active: boolean;
  sort_order: number;
}

export const Settings: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'general' | 'social' | 'version' | 'client_search' | 'seo'>('general');
  const [showGeminiKey, setShowGeminiKey] = useState(false);
  const [settings, setSettings] = useState<SettingsData>({
    website_name: '',
    logo_url: '',
    logo_backend_url: '',
    logo_client_url: '',
    maintenance_mode: false,
    version: 'v1.0.0',
    min_search_results: 10,
    min_commission_rate: 10.00,
    min_rating_star: 4.5
  });
  const [socials, setSocials] = useState<SocialMedia[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Social Edit/Create State
  const [isEditingSocial, setIsEditingSocial] = useState(false);
  const [currentSocial, setCurrentSocial] = useState<Partial<SocialMedia>>({});

  // Cropper State
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [showCropper, setShowCropper] = useState(false);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [selectedFileType, setSelectedFileType] = useState<string>('image/jpeg'); // Store original file type
  const [cropTarget, setCropTarget] = useState<'logo_backend' | 'logo_client' | 'social_icon'>('logo_backend');
  const fileInputRefBackend = useRef<HTMLInputElement>(null);
  const fileInputRefClient = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    fetchData();
  }, []);

  useEffect(() => {
    setHeaderContent(
      <div className="flex flex-col gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Settings</h2>
          <p className="text-zinc-400 mt-1 text-sm">Manage global website configuration</p>
        </div>
        <div className="flex border-b border-zinc-800">
          <button
            onClick={() => setActiveTab('general')}
            className={`px-6 py-3 text-sm font-medium transition-colors relative ${
              activeTab === 'general' ? 'text-white' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            General
            {activeTab === 'general' && (
              <span className="absolute bottom-0 left-0 w-full h-0.5 bg-indigo-500 rounded-t-full" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('social')}
            className={`px-6 py-3 text-sm font-medium transition-colors relative ${
              activeTab === 'social' ? 'text-white' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Social Media
            {activeTab === 'social' && (
              <span className="absolute bottom-0 left-0 w-full h-0.5 bg-indigo-500 rounded-t-full" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('version')}
            className={`px-6 py-3 text-sm font-medium transition-colors relative ${
              activeTab === 'version' ? 'text-white' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Version
            {activeTab === 'version' && (
              <span className="absolute bottom-0 left-0 w-full h-0.5 bg-indigo-500 rounded-t-full" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('client_search')}
            className={`px-6 py-3 text-sm font-medium transition-colors relative ${
              activeTab === 'client_search' ? 'text-white' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Client Search
            {activeTab === 'client_search' && (
              <span className="absolute bottom-0 left-0 w-full h-0.5 bg-indigo-500 rounded-t-full" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('seo')}
            className={`px-6 py-3 text-sm font-medium transition-colors relative ${
              activeTab === 'seo' ? 'text-white' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            SEO
            {activeTab === 'seo' && (
              <span className="absolute bottom-0 left-0 w-full h-0.5 bg-indigo-500 rounded-t-full" />
            )}
          </button>
        </div>
      </div>
    );
  }, [setHeaderContent, activeTab]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [settingsRes, socialsRes] = await Promise.all([
        apiService.getSettings(),
        apiService.getSocials()
      ]);

      if (settingsRes.success) {
        setSettings(settingsRes.data);
      }
      if (socialsRes.success) {
        setSocials(socialsRes.data);
      }
    } catch (error: any) {
      console.error('Failed to fetch data:', error);
      await showAlert('Failed to load settings', { variant: 'danger' });
    } finally {
      setLoading(false);
    }
  };


  // Cropping Logic
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, target: 'logo_backend' | 'logo_client' | 'social_icon') => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setSelectedFileType(file.type || 'image/jpeg'); // Store original file type
      const reader = new FileReader();
      reader.addEventListener('load', () => {
        setSelectedFile(reader.result as string);
        setCropTarget(target);
        setShowCropper(true);
        setZoom(1);
        setCrop({ x: 0, y: 0 });
      });
      reader.readAsDataURL(file);
    }
    // Reset input
    e.target.value = '';
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
          if (cropTarget === 'logo_backend' || cropTarget === 'logo_client') {
            // Upload logo as file - preserve original file extension
            const ext = selectedFileType === 'image/png' ? 'png' : 
                       selectedFileType === 'image/webp' ? 'webp' : 
                       selectedFileType === 'image/gif' ? 'gif' : 'jpg';
            const croppedFile = new File([croppedBlob], `logo-${Date.now()}.${ext}`, { type: selectedFileType });
            const uploadResponse = await apiService.uploadImage(croppedFile);
            
            if (uploadResponse.success && uploadResponse.data?.url) {
              if (cropTarget === 'logo_backend') {
                setSettings({ ...settings, logo_backend_url: uploadResponse.data.url });
              } else {
                setSettings({ ...settings, logo_client_url: uploadResponse.data.url });
              }
              setShowCropper(false);
              setSelectedFile(null);
              await showAlert('Logo uploaded successfully', { variant: 'success' });
            } else {
              throw new Error(uploadResponse.message || 'Failed to upload logo');
            }
          } else {
            // Social icon: keep as base64 for now (or can convert to file upload later)
            const croppedImage = await new Promise<string>((resolve) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result as string);
              reader.readAsDataURL(croppedBlob);
            });
            setCurrentSocial({ ...currentSocial, icon_url: croppedImage });
            setShowCropper(false);
            setSelectedFile(null);
          }
        }
      } catch (e: any) {
        console.error(e);
        await showAlert(e.message || 'Failed to crop and upload image', { variant: 'danger' });
      }
    }
  };

  // General Settings Logic
  const handleSaveSettings = async () => {
    try {
      setSaving(true);
      const response = await apiService.updateSettings(settings);
      if (response.success) {
        await showAlert('Settings updated successfully', { variant: 'success' });
      } else {
        throw new Error(response.message);
      }
    } catch (error: any) {
      console.error('Update settings error:', error);
      await showAlert(error.message || 'Failed to update settings', { variant: 'danger' });
    } finally {
      setSaving(false);
    }
  };

  // Social Media Logic
  const handleSaveSocial = async () => {
    if (!currentSocial.url || !currentSocial.icon_url) {
      await showAlert('URL and Icon are required', { variant: 'danger' });
      return;
    }

    try {
      setSaving(true);
      let response;
      if (currentSocial.id) {
        response = await apiService.updateSocial(currentSocial.id, currentSocial);
      } else {
        response = await apiService.createSocial(currentSocial);
      }

      if (response.success) {
        await showAlert(`Social link ${currentSocial.id ? 'updated' : 'created'} successfully`, { variant: 'success' });
        setIsEditingSocial(false);
        setCurrentSocial({});
        fetchData(); // Refresh list
      } else {
        throw new Error(response.message);
      }
    } catch (error: any) {
      console.error('Save social error:', error);
      await showAlert(error.message || 'Failed to save social link', { variant: 'danger' });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSocial = async (id: number) => {
    const confirmed = await showConfirm('Are you sure you want to delete this social link?', {
      variant: 'danger',
      confirmText: 'Delete'
    });

    if (!confirmed) return;

    try {
      const response = await apiService.deleteSocial(id);
      if (response.success) {
        setSocials(socials.filter(s => s.id !== id));
        await showAlert('Social link deleted', { variant: 'success' });
      }
    } catch (error: any) {
      await showAlert(error.message || 'Failed to delete', { variant: 'danger' });
    }
  };

  const handleToggleSocialStatus = async (social: SocialMedia) => {
    try {
      const response = await apiService.updateSocialStatus(social.id, !social.is_active);
      if (response.success) {
        setSocials(socials.map(s => s.id === social.id ? { ...s, is_active: !s.is_active } : s));
      }
    } catch (error: any) {
      await showAlert(error.message || 'Failed to update status', { variant: 'danger' });
    }
  };

  if (loading) return <div className="p-8 text-center text-zinc-500">Loading settings...</div>;

  return (
    <div className="max-w-4xl mx-auto">
      {activeTab === 'general' && (
        <div className="space-y-6">
          {/* Backend Logo Section */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <ImageIcon className="w-5 h-5" />
              Backend Logo
            </h3>
            <div className="flex flex-col md:flex-row gap-6 items-start">
              <div className="w-40 h-40 bg-black border border-zinc-700 rounded-lg flex items-center justify-center overflow-hidden relative group">
                {settings.logo_backend_url ? (
                  <img 
                    src={settings.logo_backend_url.startsWith('http') 
                      ? settings.logo_backend_url 
                      : `${import.meta.env.VITE_API_URL || import.meta.env.SERVER_URL || 'http://localhost:3002'}${settings.logo_backend_url}`} 
                    alt="Backend Logo" 
                    className="w-full h-full object-contain"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                ) : (
                  <span className="text-zinc-600 text-xs">No Logo</span>
                )}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <button 
                    onClick={() => fileInputRefBackend.current?.click()}
                    className="p-2 bg-zinc-200 rounded-full hover:bg-white text-black"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="flex-1">
                <p className="text-zinc-400 text-sm mb-4">
                  Upload logo for backend/admin interface. This will be used in the login page and admin dashboard.
                  Recommended size: 512x512px or square aspect ratio.
                </p>
                <button 
                  onClick={() => fileInputRefBackend.current?.click()}
                  className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg text-sm transition-colors flex items-center gap-2"
                >
                  <Upload className="w-4 h-4" />
                  Upload Backend Logo
                </button>
                <input 
                  type="file" 
                  ref={fileInputRefBackend} 
                  onChange={(e) => handleFileChange(e, 'logo_backend')} 
                  accept="image/*" 
                  className="hidden" 
                />
              </div>
            </div>
          </div>

          {/* Client Logo Section */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <ImageIcon className="w-5 h-5" />
              Client Logo
            </h3>
            <div className="flex flex-col md:flex-row gap-6 items-start">
              <div className="w-40 h-40 bg-black border border-zinc-700 rounded-lg flex items-center justify-center overflow-hidden relative group">
                {settings.logo_client_url ? (
                  <img 
                    src={settings.logo_client_url.startsWith('http') 
                      ? settings.logo_client_url 
                      : `${import.meta.env.VITE_API_URL || import.meta.env.SERVER_URL || 'http://localhost:3002'}${settings.logo_client_url}`} 
                    alt="Client Logo" 
                    className="w-full h-full object-contain"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                ) : (
                  <span className="text-zinc-600 text-xs">No Logo</span>
                )}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <button 
                    onClick={() => fileInputRefClient.current?.click()}
                    className="p-2 bg-zinc-200 rounded-full hover:bg-white text-black"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="flex-1">
                <p className="text-zinc-400 text-sm mb-4">
                  Upload logo for client/frontend website. This will be used in the main website header and maintenance page.
                  Recommended size: 512x512px or square aspect ratio.
                </p>
                <button 
                  onClick={() => fileInputRefClient.current?.click()}
                  className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg text-sm transition-colors flex items-center gap-2"
                >
                  <Upload className="w-4 h-4" />
                  Upload Client Logo
                </button>
                <input 
                  type="file" 
                  ref={fileInputRefClient} 
                  onChange={(e) => handleFileChange(e, 'logo_client')} 
                  accept="image/*" 
                  className="hidden" 
                />
              </div>
            </div>
          </div>

          {/* Details Section */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-6">
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">Website Name</label>
              <div className="flex items-center gap-2">
                <Globe className="w-5 h-5 text-zinc-500" />
                <input 
                  type="text" 
                  value={settings.website_name}
                  onChange={(e) => setSettings({ ...settings, website_name: e.target.value })}
                  className="flex-1 px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="My E-Commerce Site"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-zinc-800">
              <div className="flex items-center justify-between">
                <div>
                  <label className="block text-lg font-medium text-white mb-1">Maintenance Mode</label>
                  <p className="text-zinc-400 text-sm">
                    When active, the site is accessible only to administrators. Visitors will see a maintenance page.
                  </p>
                </div>
                <button
                  onClick={() => setSettings({ ...settings, maintenance_mode: !settings.maintenance_mode })}
                  className={`w-14 h-7 rounded-full relative transition-colors ${
                    settings.maintenance_mode ? 'bg-indigo-600' : 'bg-zinc-700'
                  }`}
                >
                  <span className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-all ${
                    settings.maintenance_mode ? 'left-8' : 'left-1'
                  }`} />
                </button>
              </div>
              {settings.maintenance_mode && (
                <div className="mt-4 space-y-3">
                  <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-lg flex items-start gap-3 text-indigo-300 text-sm">
                    <AlertTriangle className="w-5 h-5 shrink-0" />
                    <p>Your site is currently in maintenance mode. Visitors are being redirected to the maintenance page.</p>
                  </div>
                  <div className="p-4 bg-zinc-800/50 border border-zinc-700 rounded-lg">
                    <label className="block text-sm font-medium text-zinc-400 mb-2">Admin Bypass Link</label>
                    <p className="text-zinc-500 text-xs mb-3">
                      Use this secret link to access the website during maintenance mode. Keep this link private.
                    </p>
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          readOnly
                          value={settings.maintenance_bypass_token 
                            ? `${window.location.origin}?bypass=${settings.maintenance_bypass_token}`
                            : 'Generating token...'}
                          className="flex-1 px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          onClick={(e) => (e.target as HTMLInputElement).select()}
                        />
                        <button
                          onClick={() => {
                            const input = document.querySelector('input[readonly]') as HTMLInputElement;
                            if (input && settings.maintenance_bypass_token) {
                              input.select();
                              navigator.clipboard.writeText(input.value).then(() => {
                                showAlert('Bypass link copied to clipboard!', { variant: 'success' });
                              }).catch(() => {
                                document.execCommand('copy');
                                showAlert('Bypass link copied to clipboard!', { variant: 'success' });
                              });
                            }
                          }}
                          disabled={!settings.maintenance_bypass_token}
                          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-zinc-700 disabled:cursor-not-allowed text-white rounded-lg text-sm transition-colors flex items-center gap-2"
                        >
                          <Tag className="w-4 h-4" />
                          Copy
                        </button>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={async () => {
                            try {
                              // Generate a secure random token
                              const randomBytes = new Uint8Array(32);
                              crypto.getRandomValues(randomBytes);
                              const newToken = Array.from(randomBytes, byte => byte.toString(16).padStart(2, '0')).join('') + '-' + Date.now().toString(36);
                              await apiService.updateSettings({ maintenance_bypass_token: newToken });
                              setSettings({ ...settings, maintenance_bypass_token: newToken });
                              await showAlert('Bypass token regenerated successfully!', { variant: 'success' });
                            } catch (error: any) {
                              await showAlert(error.message || 'Failed to regenerate token', { variant: 'danger' });
                            }
                          }}
                          className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-white rounded-lg text-sm transition-colors flex items-center gap-2"
                        >
                          <RefreshCw className="w-4 h-4" />
                          Regenerate Token
                        </button>
                        <p className="text-zinc-500 text-xs">
                          Regenerate token to invalidate old bypass links
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end">
            {hasPermission('edit_settings') && (
            <button 
              onClick={handleSaveSettings}
              disabled={saving}
              className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-zinc-700 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              {saving ? <span className="animate-spin">⏳</span> : <Save className="w-4 h-4" />}
              Save Settings
            </button>
            )}
          </div>
        </div>
      )}

      {activeTab === 'social' && (
        <div className="space-y-6">
          {isEditingSocial ? (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-bold text-white">
                  {currentSocial.id ? 'Edit Social Link' : 'Add New Social Link'}
                </h3>
                <button onClick={() => setIsEditingSocial(false)} className="text-zinc-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-2">Platform Name</label>
                    <input 
                      type="text" 
                      value={currentSocial.name || ''}
                      onChange={(e) => setCurrentSocial({ ...currentSocial, name: e.target.value })}
                      className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="Facebook, Instagram..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-2">URL</label>
                    <input 
                      type="url" 
                      value={currentSocial.url || ''}
                      onChange={(e) => setCurrentSocial({ ...currentSocial, url: e.target.value })}
                      className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="https://..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-2">Sort Order</label>
                    <input 
                      type="number" 
                      value={currentSocial.sort_order || 0}
                      onChange={(e) => setCurrentSocial({ ...currentSocial, sort_order: parseInt(e.target.value) || 0 })}
                      className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div className="flex items-center gap-3 pt-2">
                    <input 
                      type="checkbox" 
                      id="socialActive"
                      checked={currentSocial.is_active ?? true}
                      onChange={(e) => setCurrentSocial({ ...currentSocial, is_active: e.target.checked })}
                      className="w-4 h-4 rounded bg-zinc-800 border-zinc-700 text-indigo-600 focus:ring-indigo-500"
                    />
                    <label htmlFor="socialActive" className="text-sm text-zinc-300 cursor-pointer">Active</label>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-2">Icon (1:1 Ratio)</label>
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="aspect-square w-40 bg-black border-2 border-dashed border-zinc-700 hover:border-indigo-500 rounded-lg flex flex-col items-center justify-center cursor-pointer group overflow-hidden relative"
                  >
                    {currentSocial.icon_url ? (
                      <img src={currentSocial.icon_url} alt="Icon" className="w-full h-full object-contain" />
                    ) : (
                      <>
                        <Upload className="w-8 h-8 text-zinc-500 mb-2" />
                        <span className="text-xs text-zinc-500">Upload Icon</span>
                      </>
                    )}
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Edit className="w-6 h-6 text-white" />
                    </div>
                  </div>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={(e) => handleFileChange(e, 'social_icon')} 
                    accept="image/*" 
                    className="hidden" 
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-zinc-800">
                <button 
                  onClick={() => setIsEditingSocial(false)}
                  className="px-4 py-2 text-zinc-400 hover:text-white"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSaveSocial}
                  disabled={saving}
                  className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-zinc-700 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
                >
                  {saving ? 'Saving...' : 'Save Social Link'}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-end">
                {hasPermission('create_settings') && (
                <button 
                  onClick={() => {
                    setCurrentSocial({ is_active: true, sort_order: 0 });
                    setIsEditingSocial(true);
                  }}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Add Social Link
                </button>
                )}
              </div>

              {socials.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-zinc-800 rounded-xl">
                  <Share2 className="w-12 h-12 text-zinc-700 mx-auto mb-3" />
                  <p className="text-zinc-500">No social links added yet</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {socials.map(social => (
                    <div key={social.id} className={`bg-zinc-900 border border-zinc-800 rounded-lg p-4 flex items-center gap-4 ${!social.is_active ? 'opacity-60' : ''}`}>
                      <div className="w-12 h-12 bg-black rounded-lg shrink-0 overflow-hidden p-2 border border-zinc-800">
                        <img src={social.icon_url} alt={social.name} className="w-full h-full object-contain" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-white truncate">{social.name}</h4>
                        <a href={social.url} target="_blank" rel="noreferrer" className="text-xs text-indigo-400 hover:text-indigo-300 truncate block">
                          {social.url}
                        </a>
                      </div>
                      <div className="flex flex-col gap-2">
                        {hasPermission('edit_settings') && (
                        <button 
                          onClick={() => handleToggleSocialStatus(social)}
                          className={`p-1.5 rounded hover:bg-zinc-800 transition-colors ${social.is_active ? 'text-emerald-500' : 'text-zinc-500'}`}
                          title={social.is_active ? 'Deactivate' : 'Activate'}
                        >
                          <Power className="w-4 h-4" />
                        </button>
                        )}
                        {hasPermission('edit_settings') && (
                        <button 
                          onClick={() => {
                            setCurrentSocial(social);
                            setIsEditingSocial(true);
                          }}
                          className="p-1.5 rounded hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        )}
                        {hasPermission('delete_settings') && (
                        <button 
                          onClick={() => handleDeleteSocial(social.id)}
                          className="p-1.5 rounded hover:bg-zinc-800 text-zinc-400 hover:text-rose-500 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Crop Modal */}
      {showCropper && selectedFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90">
          <div className="bg-zinc-900 w-full h-full md:w-[90vw] md:h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-zinc-800">
              <h3 className="text-lg font-bold text-white">
                {cropTarget === 'logo' ? 'Crop Logo' : 'Crop Social Icon'}
              </h3>
              <button onClick={() => setShowCropper(false)} className="text-zinc-400 hover:text-white">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="flex-1 relative bg-black">
              <Cropper
                image={selectedFile}
                crop={crop}
                zoom={zoom}
                aspect={1} // 1:1 ratio as requested
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

      {activeTab === 'version' && (
        <div className="space-y-6">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-6">
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">System Version</label>
              <div className="flex items-center gap-2">
                <Tag className="w-5 h-5 text-zinc-500" />
                <input 
                  type="text" 
                  value={settings.version || 'v1.0.0'}
                  onChange={(e) => setSettings({ ...settings, version: e.target.value })}
                  className="flex-1 px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="v1.0.0"
                />
              </div>
              <p className="text-xs text-zinc-500 mt-2 ml-7">
                This version label will be displayed in the sidebar.
              </p>
            </div>
          </div>

          <div className="flex justify-end">
            {hasPermission('edit_settings') && (
            <button 
              onClick={handleSaveSettings}
              disabled={saving}
              className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-zinc-700 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              {saving ? <span className="animate-spin">⏳</span> : <Save className="w-4 h-4" />}
              Save Settings
            </button>
            )}
          </div>
        </div>
      )}

      {activeTab === 'client_search' && (
        <div className="space-y-6">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-6">
            <div className="mb-4">
              <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
                <Search className="w-5 h-5" />
                Client Search Configuration
              </h3>
              <p className="text-zinc-400 text-sm">
                Configure search behavior for the client-facing website. These settings control when and how Shopee API is queried.
              </p>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">
                  Minimum Search Results Threshold
                </label>
                <div className="flex items-center gap-2">
                  <input 
                    type="number" 
                    min="1"
                    max="50"
                    value={settings.min_search_results || 10}
                    onChange={(e) => setSettings({ ...settings, min_search_results: parseInt(e.target.value) || 10 })}
                    className="flex-1 px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="10"
                  />
                  <span className="text-zinc-500 text-sm">results</span>
                </div>
                <p className="text-xs text-zinc-500 mt-2">
                  If search results from our database are less than this number, the system will query Shopee API for additional results.
                </p>
              </div>

              <div className="pt-4 border-t border-zinc-800">
                <label className="block text-sm font-medium text-zinc-400 mb-2">
                  Minimum Commission Rate (%)
                </label>
                <div className="flex items-center gap-2">
                  <input 
                    type="number" 
                    min="0"
                    max="100"
                    step="0.1"
                    value={settings.min_commission_rate || 10.00}
                    onChange={(e) => setSettings({ ...settings, min_commission_rate: parseFloat(e.target.value) || 10.00 })}
                    className="flex-1 px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="10.00"
                  />
                  <span className="text-zinc-500 text-sm">%</span>
                </div>
                <p className="text-xs text-zinc-500 mt-2">
                  Minimum commission rate percentage required for products returned from Shopee API search.
                </p>
              </div>

              <div className="pt-4 border-t border-zinc-800">
                <label className="block text-sm font-medium text-zinc-400 mb-2">
                  Minimum Rating Star
                </label>
                <div className="flex items-center gap-2">
                  <input 
                    type="number" 
                    min="0"
                    max="5"
                    step="0.1"
                    value={settings.min_rating_star || 4.5}
                    onChange={(e) => setSettings({ ...settings, min_rating_star: parseFloat(e.target.value) || 4.5 })}
                    className="flex-1 px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="4.5"
                  />
                  <span className="text-zinc-500 text-sm">stars</span>
                </div>
                <p className="text-xs text-zinc-500 mt-2">
                  Minimum rating star required for products returned from Shopee API search (0.0 - 5.0).
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            {hasPermission('edit_settings') && (
            <button 
              onClick={handleSaveSettings}
              disabled={saving}
              className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-zinc-700 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              {saving ? <span className="animate-spin">⏳</span> : <Save className="w-4 h-4" />}
              Save Settings
            </button>
            )}
          </div>
        </div>
      )}


      {activeTab === 'seo' && (
        <div className="space-y-6">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-6">
            <div className="mb-4">
              <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
                <SearchIcon className="w-5 h-5" />
                SEO Settings
              </h3>
              <p className="text-zinc-400 text-sm">
                Manage SEO configuration for better search engine visibility and social media sharing.
              </p>
            </div>

            {/* Site Configuration */}
            <div className="space-y-4">
              <h4 className="text-md font-semibold text-white flex items-center gap-2">
                <Globe className="w-4 h-4" />
                Site Configuration
              </h4>
              
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  Site URL <span className="text-red-400">*</span>
                </label>
                <input
                  type="url"
                  value={settings.site_url || ''}
                  onChange={(e) => setSettings({ ...settings, site_url: e.target.value })}
                  placeholder="https://shonra.com"
                  className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <p className="text-xs text-zinc-500 mt-1">
                  Used for absolute URLs in meta tags, Open Graph, and Canonical URLs
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  Sitemap URL <span className="text-red-400">*</span>
                </label>
                <input
                  type="url"
                  value={settings.sitemap_url || ''}
                  onChange={(e) => setSettings({ ...settings, sitemap_url: e.target.value })}
                  placeholder="https://shonra.com/sitemap.xml"
                  className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <p className="text-xs text-zinc-500 mt-1">
                  Location of sitemap.xml file (used in robots.txt)
                </p>
              </div>
            </div>

            {/* Meta Tags */}
            <div className="space-y-4 pt-4 border-t border-zinc-800">
              <h4 className="text-md font-semibold text-white flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Meta Tags
              </h4>
              
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  Meta Description
                </label>
                <textarea
                  value={settings.meta_description || ''}
                  onChange={(e) => setSettings({ ...settings, meta_description: e.target.value })}
                  placeholder="All amazing deals and earn commissions with SHONRA..."
                  rows={3}
                  maxLength={160}
                  className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                />
                <p className="text-xs text-zinc-500 mt-1">
                  Recommended: 120-160 characters. Current: {settings.meta_description?.length || 0}/160
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  Meta Keywords
                </label>
                <input
                  type="text"
                  value={settings.meta_keywords || ''}
                  onChange={(e) => setSettings({ ...settings, meta_keywords: e.target.value })}
                  placeholder="Shopee, Affiliate, E-commerce, Flash Sale, Deals"
                  className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <p className="text-xs text-zinc-500 mt-1">
                  Comma-separated keywords (e.g., "keyword1, keyword2, keyword3")
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  Title Template
                </label>
                <input
                  type="text"
                  value={settings.meta_title_template || '%s | SHONRA'}
                  onChange={(e) => setSettings({ ...settings, meta_title_template: e.target.value })}
                  placeholder="%s | SHONRA"
                  className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <p className="text-xs text-zinc-500 mt-1">
                  %s will be replaced with page title
                </p>
              </div>
            </div>

            {/* Open Graph & Social */}
            <div className="space-y-4 pt-4 border-t border-zinc-800">
              <h4 className="text-md font-semibold text-white flex items-center gap-2">
                <Link2 className="w-4 h-4" />
                Open Graph & Social Media
              </h4>
              
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  OG Image URL
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={settings.og_image_url || ''}
                    onChange={(e) => setSettings({ ...settings, og_image_url: e.target.value })}
                    placeholder="/og-image.jpg or https://example.com/image.jpg"
                    className="flex-1 px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  {settings.og_image_url && (
                    <button
                      onClick={() => setSettings({ ...settings, og_image_url: '' })}
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
                {settings.og_image_url && (
                  <div className="mt-2">
                    <img 
                      src={settings.og_image_url.startsWith('http') ? settings.og_image_url : `${import.meta.env.VITE_API_URL || 'http://localhost:3002'}${settings.og_image_url}`}
                      alt="OG Image Preview"
                      className="max-w-xs h-auto rounded-lg border border-zinc-700"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  </div>
                )}
                <p className="text-xs text-zinc-500 mt-1">
                  Recommended size: 1200x630px. Image shown when sharing links on social media.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  OG Title (Optional)
                </label>
                <input
                  type="text"
                  value={settings.og_title || ''}
                  onChange={(e) => setSettings({ ...settings, og_title: e.target.value })}
                  placeholder="Leave empty to use default title"
                  className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <p className="text-xs text-zinc-500 mt-1">
                  Custom Open Graph title (uses default if empty)
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  OG Description (Optional)
                </label>
                <textarea
                  value={settings.og_description || ''}
                  onChange={(e) => setSettings({ ...settings, og_description: e.target.value })}
                  placeholder="Leave empty to use meta description"
                  rows={2}
                  className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                />
                <p className="text-xs text-zinc-500 mt-1">
                  Custom Open Graph description (uses meta description if empty)
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  Twitter Handle
                </label>
                <input
                  type="text"
                  value={settings.twitter_handle || ''}
                  onChange={(e) => setSettings({ ...settings, twitter_handle: e.target.value })}
                  placeholder="@shonra"
                  className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <p className="text-xs text-zinc-500 mt-1">
                  Twitter account handle (e.g., @shonra or shonra)
                </p>
              </div>
            </div>

            {/* Search Engine Verification */}
            <div className="space-y-4 pt-4 border-t border-zinc-800">
              <h4 className="text-md font-semibold text-white flex items-center gap-2">
                <Shield className="w-4 h-4" />
                Search Engine Verification
              </h4>
              
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  Google Search Console Verification Code
                </label>
                <input
                  type="text"
                  value={settings.google_verification_code || ''}
                  onChange={(e) => setSettings({ ...settings, google_verification_code: e.target.value })}
                  placeholder="Get code from Google Search Console"
                  className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <p className="text-xs text-zinc-500 mt-1">
                  Verification code from <a href="https://search.google.com/search-console" target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:underline">Google Search Console</a>
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  Bing Webmaster Tools Verification Code (Optional)
                </label>
                <input
                  type="text"
                  value={settings.bing_verification_code || ''}
                  onChange={(e) => setSettings({ ...settings, bing_verification_code: e.target.value })}
                  placeholder="Get code from Bing Webmaster Tools"
                  className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <p className="text-xs text-zinc-500 mt-1">
                  Verification code from Bing Webmaster Tools (optional)
                </p>
              </div>
            </div>

            {/* AI SEO Settings */}
            <div className="space-y-4 pt-4 border-t border-zinc-800">
              <h4 className="text-md font-semibold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                AI SEO Settings
              </h4>
              
              <div className="flex items-center justify-between">
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-1">
                    Enable AI SEO
                  </label>
                  <p className="text-xs text-zinc-500">
                    Auto-generate meta descriptions using AI (requires Gemini API Key)
                  </p>
                </div>
                <button
                  onClick={() => setSettings({ ...settings, enable_ai_seo: !settings.enable_ai_seo })}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    settings.enable_ai_seo ? 'bg-indigo-600' : 'bg-zinc-700'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      settings.enable_ai_seo ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {settings.enable_ai_seo && (
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">
                    Gemini API Key
                  </label>
                  <div className="relative">
                    <input
                      type={showGeminiKey ? 'text' : 'password'}
                      value={settings.gemini_api_key || ''}
                      onChange={(e) => setSettings({ ...settings, gemini_api_key: e.target.value })}
                      placeholder="Enter your Google Gemini API Key"
                      className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowGeminiKey(!showGeminiKey)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-300"
                      title={showGeminiKey ? "Hide" : "Show"}
                    >
                      {showGeminiKey ? (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </button>
                  </div>
                  <p className="text-xs text-zinc-500 mt-1">
                    Your Google Gemini API Key (stored securely in database)
                  </p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  AI SEO Language
                </label>
                <select
                  value={settings.ai_seo_language || 'th'}
                  onChange={(e) => setSettings({ ...settings, ai_seo_language: e.target.value })}
                  className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="th">Thai (ไทย)</option>
                  <option value="en">English</option>
                </select>
                <p className="text-xs text-zinc-500 mt-1">
                  Default language for AI-generated content
                </p>
              </div>
            </div>

            {/* Advanced Settings */}
            <div className="space-y-4 pt-4 border-t border-zinc-800">
              <h4 className="text-md font-semibold text-white flex items-center gap-2">
                <SettingsIcon className="w-4 h-4" />
                Advanced Settings
              </h4>
              
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  Canonical URL (Optional)
                </label>
                <input
                  type="url"
                  value={settings.canonical_url || ''}
                  onChange={(e) => setSettings({ ...settings, canonical_url: e.target.value })}
                  placeholder="Leave empty to use site_url"
                  className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <p className="text-xs text-zinc-500 mt-1">
                  Canonical URL for preventing duplicate content (uses site_url if empty)
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  Robots Meta
                </label>
                <input
                  type="text"
                  value={settings.robots_meta || 'index, follow'}
                  onChange={(e) => setSettings({ ...settings, robots_meta: e.target.value })}
                  placeholder="index, follow"
                  className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <p className="text-xs text-zinc-500 mt-1">
                  Robots meta tag value (e.g., "index, follow", "noindex, nofollow")
                </p>
              </div>
            </div>

            {/* Info Alert */}
            <div className="pt-4 border-t border-zinc-800">
              <div className="bg-blue-900/20 border border-blue-800 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="text-blue-300 font-medium mb-1">About SEO Settings</h4>
                    <p className="text-blue-400 text-sm">
                      These settings control how search engines and social media platforms display your website.
                      Changes take effect immediately after saving. Make sure Site URL and Sitemap URL are correct.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Save Button */}
            <div className="flex justify-end pt-4">
              {hasPermission('edit_settings') && (
                <button 
                  onClick={handleSaveSettings}
                  disabled={saving}
                  className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-zinc-700 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                >
                  {saving ? <span className="animate-spin">⏳</span> : <Save className="w-4 h-4" />}
                  Save SEO Settings
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

