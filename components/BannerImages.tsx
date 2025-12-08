import React, { useState, useEffect } from 'react';
import { apiService } from '../services/api';
import { useDialog } from '../context/DialogContext';
import { useLayout } from '../context/LayoutContext';
import { Trash2, Image as ImageIcon, AlertCircle, CheckCircle, RefreshCw, Search } from 'lucide-react';

interface ImageFile {
  filename: string;
  url: string;
  folder: 'banners' | 'images';
  size: number;
  created: string;
  modified: string;
  isUsed: boolean;
  usedIn: {
    id: number;
    position_id?: number;
  } | null;
  usedInType: 'banner' | 'settings' | null;
}

export const BannerImages: React.FC = () => {
  const [images, setImages] = useState<ImageFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterUsed, setFilterUsed] = useState<'all' | 'used' | 'unused'>('all');
  const [filterFolder, setFilterFolder] = useState<string>('all');
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

  useEffect(() => {
    setHeaderContent(null);
    fetchImages();
  }, [setHeaderContent]);

  const fetchImages = async () => {
    try {
      setLoading(true);
      
      // Check if user is authenticated
      const token = localStorage.getItem('authToken');
      if (!token) {
        await showAlert('Please login first', { variant: 'danger' });
        return;
      }
      
      // Ensure token is set in apiService
      apiService.setToken(token);
      
      const response = await apiService.getAllImages();
      if (response.success) {
        // Convert relative URLs to full URLs for image display
        // Vite proxy only works for fetch/axios, not for <img src>
        // So we need to convert /api/uploads/... to full backend URL
        const processedImages = (response.data || []).map((image: ImageFile) => {
          let fullUrl = image.url;
          // If URL is relative path starting with /api/, convert to full backend URL
          // because <img src> doesn't use Vite proxy
          if (image.url && image.url.startsWith('/api/') && !image.url.startsWith('http')) {
            const backendUrl = import.meta.env.VITE_API_URL || import.meta.env.SERVER_URL || 'http://localhost:3002';
            fullUrl = `${backendUrl}${image.url}`;
          } else if (image.url && image.url.startsWith('/') && !image.url.startsWith('http') && !image.url.startsWith('/api/')) {
            // If it's a different relative path, convert to full URL
            const backendUrl = import.meta.env.VITE_API_URL || import.meta.env.SERVER_URL || 'http://localhost:3002';
            fullUrl = `${backendUrl}${image.url}`;
          }
          return {
            ...image,
            url: fullUrl
          };
        });
        setImages(processedImages);
      } else {
        throw new Error(response.message || 'Failed to fetch images');
      }
    } catch (error: any) {
      console.error('Failed to fetch images:', error);
      const errorMessage = error.message || 'Failed to load images';
      
      // If authentication error, show more helpful message
      if (errorMessage.includes('Authentication required') || errorMessage.includes('401')) {
        await showAlert('Session expired. Please login again.', { variant: 'danger' });
      } else {
        await showAlert(errorMessage, { variant: 'danger' });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (image: ImageFile) => {
    if (image.isUsed) {
      const usedInText = image.usedInType === 'banner' 
        ? `banner ID ${image.usedIn?.id}` 
        : image.usedInType === 'settings'
        ? 'settings (logo)'
        : 'unknown location';
      await showAlert(
        `Cannot delete: This image is currently used in ${usedInText}. Please remove it first.`,
        { variant: 'danger' }
      );
      return;
    }

    const confirmed = await showConfirm(
      `Are you sure you want to delete "${image.filename}" from ${image.folder}? This action cannot be undone.`,
      {
        variant: 'danger',
        confirmText: 'Delete'
      }
    );

    if (!confirmed) return;

    try {
      const response = await apiService.deleteImage(image.folder, image.filename);
      if (response.success) {
        await showAlert('Image deleted successfully', { variant: 'success' });
        fetchImages();
      } else {
        throw new Error(response.message || 'Failed to delete image');
      }
    } catch (error: any) {
      console.error('Delete image error:', error);
      await showAlert(error.message || 'Failed to delete image', { variant: 'danger' });
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Filter images
  const filteredImages = images.filter(image => {
    const matchesSearch = image.filename.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesUsedFilter = 
      filterUsed === 'all' ||
      (filterUsed === 'used' && image.isUsed) ||
      (filterUsed === 'unused' && !image.isUsed);
    const matchesFolderFilter =
      filterFolder === 'all' ||
      image.folder === filterFolder;
    
    return matchesSearch && matchesUsedFilter && matchesFolderFilter;
  });

  const usedCount = images.filter(img => img.isUsed).length;
  const unusedCount = images.filter(img => !img.isUsed).length;
  
  // Get all unique folders dynamically
  const allFolders = Array.from(new Set(images.map(img => img.folder))).sort();
  
  // Count images per folder
  const folderCounts = allFolders.reduce((acc, folder) => {
    acc[folder] = images.filter(img => img.folder === folder).length;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <ImageIcon className="w-6 h-6" />
            Image Library
          </h1>
          <p className="text-gray-400 mt-1">Manage all uploaded images from uploads folder</p>
        </div>
        <button
          onClick={fetchImages}
          disabled={loading}
          className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="text-gray-400 text-sm">Total Images</div>
          <div className="text-2xl font-bold text-white mt-1">{images.length}</div>
        </div>
        {allFolders.slice(0, 3).map((folder, index) => {
          const colorClasses = [
            { bg: 'bg-purple-500/10', border: 'border-purple-500/20', text: 'text-purple-400' },
            { bg: 'bg-green-500/10', border: 'border-green-500/20', text: 'text-green-400' },
            { bg: 'bg-orange-500/10', border: 'border-orange-500/20', text: 'text-orange-400' }
          ];
          const color = colorClasses[index] || colorClasses[0];
          return (
            <div key={folder} className={`${color.bg} ${color.border} border rounded-lg p-4`}>
              <div className={`${color.text} text-sm capitalize`}>{folder}</div>
              <div className={`${color.text} text-2xl font-bold mt-1`}>{folderCounts[folder] || 0}</div>
            </div>
          );
        })}
        {allFolders.length > 3 && (
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="text-gray-400 text-sm">+{allFolders.length - 3} More</div>
            <div className="text-2xl font-bold text-white mt-1">{allFolders.slice(3).reduce((sum, f) => sum + (folderCounts[f] || 0), 0)}</div>
          </div>
        )}
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
          <div className="text-blue-400 text-sm">In Use</div>
          <div className="text-2xl font-bold text-blue-400 mt-1">{usedCount}</div>
        </div>
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
          <div className="text-yellow-400 text-sm">Unused</div>
          <div className="text-2xl font-bold text-yellow-400 mt-1">{unusedCount}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search by filename..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select
          value={filterFolder}
          onChange={(e) => setFilterFolder(e.target.value)}
          className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Folders</option>
          {allFolders.map(folder => (
            <option key={folder} value={folder} className="capitalize">{folder}</option>
          ))}
        </select>
        <select
          value={filterUsed}
          onChange={(e) => setFilterUsed(e.target.value as 'all' | 'used' | 'unused')}
          className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Images</option>
          <option value="used">In Use</option>
          <option value="unused">Unused</option>
        </select>
      </div>

      {/* Images Grid */}
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
          <p className="text-gray-400 mt-4">Loading images...</p>
        </div>
      ) : filteredImages.length === 0 ? (
        <div className="text-center py-12 bg-gray-800 rounded-lg">
          <ImageIcon className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400">No images found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredImages.map((image) => (
            <div
              key={image.filename}
              className={`bg-gray-800 rounded-lg overflow-hidden border ${
                image.isUsed ? 'border-blue-500/50' : 'border-gray-700'
              }`}
            >
              {/* Image Preview */}
              <div className="relative aspect-video bg-gray-900">
                <img
                  src={image.url}
                  alt={image.filename}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.src = '/placeholder-product.svg';
                  }}
                />
                {image.isUsed && (
                  <div className="absolute top-2 right-2 bg-blue-500 text-white text-xs px-2 py-1 rounded flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" />
                    {image.usedInType === 'banner' ? 'In Banner' : image.usedInType === 'settings' ? 'In Settings' : 'In Use'}
                  </div>
                )}
                <div className="absolute top-2 left-2 bg-gray-800/80 text-white text-xs px-2 py-1 rounded">
                  {image.folder}
                </div>
              </div>

              {/* Image Info */}
              <div className="p-4 space-y-2">
                <div className="text-sm text-gray-300 font-medium truncate" title={image.filename}>
                  {image.filename}
                </div>
                <div className="text-xs text-gray-400 space-y-1">
                  <div>Size: {formatFileSize(image.size)}</div>
                  <div>Modified: {formatDate(image.modified)}</div>
                  {image.isUsed && image.usedIn && (
                    <div className="text-blue-400">
                      Used in {image.usedInType === 'banner' ? `Banner ID: ${image.usedIn.id}` : image.usedInType === 'settings' ? 'Settings (Logo)' : 'Unknown'}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => handleDelete(image)}
                    disabled={image.isUsed}
                    className={`flex-1 px-3 py-2 rounded text-sm font-medium transition-colors ${
                      image.isUsed
                        ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                        : 'bg-red-500/20 hover:bg-red-500/30 text-red-400 hover:text-red-300'
                    }`}
                    title={image.isUsed ? 'Cannot delete: Image is in use' : 'Delete image'}
                  >
                    <Trash2 className="w-4 h-4 inline mr-1" />
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

