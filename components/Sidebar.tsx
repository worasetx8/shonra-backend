import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  ShoppingCart, 
  Package, 
  Users, 
  Image, 
  Settings,
  Layers,
  Tags,
  Monitor,
  Calendar,
  Shield,
  FolderOpen,
  Key
} from 'lucide-react';
import { View } from '../types';
import { apiService } from '../services/api';

interface SidebarProps {
  currentView: View;
  onChangeView: (view: View) => void;
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps & { user?: any }> = ({ currentView, onChangeView, isOpen, onClose, user }) => {
  const [logoUrl, setLogoUrl] = useState<string>('');
  const [siteName, setSiteName] = useState<string>('Shonra');
  const [version, setVersion] = useState<string>('v1.0.0');

  // Escape key handler for mobile sidebar
  useEffect(() => {
    if (!isOpen) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await apiService.getSettings();
        if (response.success) {
          const logoUrl = response.data.logo_backend_url;
          // Convert relative path to full URL if needed
          const fullLogoUrl = logoUrl && !logoUrl.startsWith('http') 
            ? `${import.meta.env.VITE_API_URL || import.meta.env.SERVER_URL || 'http://localhost:3002'}${logoUrl}`
            : logoUrl;
          setLogoUrl(fullLogoUrl);
          setSiteName(response.data.website_name || 'Shonra');
          if (response.data.version) setVersion(response.data.version);
        }
      } catch (e) {
        console.error('Failed to fetch sidebar settings', e);
      }
    };
    fetchSettings();
  }, []);

  const hasPermission = (permission: string) => {
    // Super Admin (ID 1) has all permissions
    if (user?.id === 1 || user?.role_id === 1) return true;
    // Check permissions array
    return user?.permissions?.includes(permission);
  };
  
  const menuGroups = [
    {
      label: 'Overview',
      items: [
        { id: View.DASHBOARD, icon: LayoutDashboard, label: 'Dashboard', permission: null }, // Always visible
      ]
    },
    {
      label: 'Product Management',
      items: [
        { id: View.ADD_PRODUCT, icon: ShoppingCart, label: 'Add Product', permission: 'create_products' },
        { id: View.MANAGE_PRODUCTS, icon: Package, label: 'Manage Products', permission: 'view_products' },
        { id: View.MANAGE_CATEGORIES, icon: Layers, label: 'Categories', permission: 'view_categories' },
        { id: View.MANAGE_CATEGORY_KEYWORDS, icon: Key, label: 'Category Keywords', permission: 'view_categories' },
        { id: View.MANAGE_TAGS, icon: Tags, label: 'Tags', permission: 'view_tags' },
      ]
    },
    {
      label: 'Banner Management',
      items: [
        { id: View.MANAGE_BANNERS, icon: Image, label: 'All Banners', permission: 'view_banners' },
        { id: View.MANAGE_BANNER_POSITIONS, icon: Monitor, label: 'Positions', permission: 'view_banners' },
        { id: View.MANAGE_BANNER_CAMPAIGNS, icon: Calendar, label: 'Campaigns', permission: 'view_banners' },
        { id: View.MANAGE_BANNER_IMAGES, icon: FolderOpen, label: 'Image Library', permission: 'view_banners' },
      ]
    },
    {
      label: 'System',
      items: [
        { id: View.MANAGE_ADMINS, icon: Users, label: 'Admin Users', permission: 'view_admin_users' },
        { id: View.MANAGE_ROLES, icon: Shield, label: 'Roles & Permissions', permission: 'view_roles' },
        { id: View.SETTINGS, icon: Settings, label: 'Settings', permission: 'view_settings' },
      ]
    }
  ];

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40 md:hidden animate-in fade-in duration-200"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-black border-r border-border transform transition-transform duration-200 ease-in-out md:relative md:translate-x-0 flex flex-col
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Logo */}
        <div className="h-16 flex items-center px-6 border-b border-border gap-3">
          {logoUrl ? (
            <img src={logoUrl} alt="Logo" className="w-8 h-8 object-contain" />
          ) : (
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <span className="text-white font-bold text-xl">S</span>
            </div>
          )}
          <span className="text-xl font-bold text-white tracking-tight truncate">{siteName}</span>
        </div>

        {/* Menu Items */}
        <nav className="flex-1 overflow-y-auto py-6 px-3 space-y-6">
          {menuGroups.map((group, idx) => {
             // Filter items based on permission
             const visibleItems = group.items.filter(item => !item.permission || hasPermission(item.permission));
             
             if (visibleItems.length === 0) return null;

             return (
            <div key={idx}>
              <div className="px-3 mb-2 text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                {group.label}
              </div>
              <div className="space-y-1">
                {visibleItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = currentView === item.id;
                  
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        onChangeView(item.id);
                        onClose();
                      }}
                      className={`
                        w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 group
                        ${isActive 
                          ? 'bg-zinc-900 text-white shadow-sm ring-1 ring-zinc-800' 
                          : 'text-zinc-400 hover:bg-zinc-900/50 hover:text-zinc-200'
                        }
                      `}
                    >
                      <Icon className={`w-5 h-5 transition-colors ${isActive ? 'text-indigo-400' : 'text-zinc-500 group-hover:text-zinc-400'}`} />
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>
             );
          })}
        </nav>

        {/* User Profile / Bottom Section */}
        <div className="p-4 border-t border-border bg-zinc-900/30">
          <div className="px-2 flex items-center justify-between text-xs text-zinc-500">
            <span>Version</span>
            <span className="font-mono text-zinc-400">{version}</span>
          </div>
        </div>
      </div>
    </>
  );
};
