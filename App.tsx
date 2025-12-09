import React, { useState, useEffect, useRef } from 'react';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { ProductSearch } from './components/ProductSearch';
import { LoginForm } from './components/LoginForm';
import ManageProducts from './components/ManageProducts';
import { Categories } from './components/Categories';
import { CategoryKeywords } from './components/CategoryKeywords';
import { Tags } from './components/Tags';
import { BannerPositions } from './components/BannerPositions';
import { BannerCampaigns } from './components/BannerCampaigns';
import { Banners } from './components/Banners';
import { BannerImages } from './components/BannerImages';
import { Settings } from './components/Settings';
import { ManageRoles } from './components/ManageRoles';
import { ManageAdmins } from './components/ManageAdmins';
import { ChangePassword } from './components/ChangePassword';
import { View, Product, Admin, Category } from './types';
import { apiService } from './services/api';
import { Search, Bell, Plus, MoreHorizontal, Trash2, Edit2, Filter, CheckCircle, AlertCircle, Mail, Menu, LogOut, User, Settings as SettingsIcon, ChevronDown, Shield, Package } from 'lucide-react';
import { DialogProvider, useDialog } from './context/DialogContext';
import { LayoutProvider, useLayout } from './context/LayoutContext';

// -- Application State --

// -- Reusable Table Components --

const HeaderAction = ({ icon: Icon, label, onClick, primary }: any) => (
  <button 
    onClick={onClick}
    className={`flex items-center gap-2 px-3 py-2 md:px-4 md:py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
      primary 
      ? 'bg-white text-black hover:bg-zinc-200 shadow-lg shadow-white/5' 
      : 'bg-black border border-border text-zinc-300 hover:bg-zinc-900 hover:text-white hover:border-zinc-600'
    }`}
  >
    <Icon className="w-4 h-4" />
    <span className="hidden md:inline">{label}</span>
  </button>
);

const StatusBadge = ({ status }: { status: string }) => {
  const styles = {
    Active: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
    Draft: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
    Archived: 'bg-rose-500/10 text-rose-500 border-rose-500/20',
  };
  const colorClass = styles[status as keyof typeof styles] || styles.Archived;
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${colorClass}`}>
      {status}
    </span>
  );
};

// -- Main App Component --

const AppContent: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>(View.DASHBOARD);
  const [products, setProducts] = useState<Product[]>([]);
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [requiresPasswordChange, setRequiresPasswordChange] = useState(false);
  
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const { headerContent, setHeaderContent } = useLayout();
  
  // Notification state
  const [notifications, setNotifications] = useState(0);
  const { showConfirm } = useDialog();

  // Close user menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Check authentication on app load
  useEffect(() => {
    checkAuthentication();

    // Listen for auth expiration event
    const handleAuthExpired = () => {
      setIsAuthenticated(false);
      setCurrentUser(null);
      setCurrentView(View.DASHBOARD);
    };

    window.addEventListener('auth:expired', handleAuthExpired);
    return () => window.removeEventListener('auth:expired', handleAuthExpired);
  }, []);

  useEffect(() => {
    setHeaderContent(null);
  }, [currentView, setHeaderContent]);

  const checkAuthentication = async () => {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        setLoading(false);
        return;
      }

      apiService.setToken(token);
      const response = await apiService.getCurrentUser();
      
      if (response.success) {
        setIsAuthenticated(true);
        setCurrentUser(response.data);
      } else {
        localStorage.removeItem('authToken');
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      localStorage.removeItem('authToken');
    } finally {
      setLoading(false);
    }
  };

  // Login handler
  const handleLogin = async (username: string, password: string) => {
    try {
      const response = await apiService.login(username, password);
      
      // Check if this is a force password change scenario FIRST
      // (This happens when password_hash is NULL)
      if (response.requiresPasswordChange) {
        setIsAuthenticated(true);
        setCurrentUser(response.data.user);
        setRequiresPasswordChange(true);
        setCurrentView(View.CHANGE_PASSWORD);
        return { success: true, requiresPasswordChange: true };
      }
      
      // Normal login success
      if (response.success) {
        setIsAuthenticated(true);
        setCurrentUser(response.data.user);
        setRequiresPasswordChange(false);
        return { success: true };
      } else {
        // Login failed
        return { success: false, error: response.message || 'Login failed' };
      }
    } catch (error: any) {
      return { success: false, error: error.message || 'Login failed' };
    }
  };

  // Logout handler
  const handleLogout = async () => {
    try {
      await apiService.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setIsAuthenticated(false);
      setCurrentUser(null);
      setCurrentView(View.DASHBOARD);
    }
  };

  const handleAddProduct = (newProduct: Omit<Product, 'id'>, stayOnPage: boolean = false) => {
    const product: Product = {
      ...newProduct,
      id: Math.random().toString(36).substr(2, 9),
      status: 'Active'
    };
    setProducts([product, ...products]);
    
    if (!stayOnPage) {
      setCurrentView(View.MANAGE_PRODUCTS);
    }
  };

  const handleDeleteProduct = async (id: string) => {
    const confirmed = await showConfirm('Are you sure you want to delete this product?', {
      variant: 'danger',
      title: 'Delete Product',
      confirmText: 'Delete'
    });

    if(confirmed) {
        setProducts(products.filter(p => p.id !== id));
    }
  }

  // Show login form if not authenticated
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black text-white">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginForm onLogin={handleLogin} />;
  }

  // Show force password change page (standalone, no sidebar/header)
  if (requiresPasswordChange || currentUser?.requiresPasswordChange) {
    return (
      <ChangePassword 
        isForceChange={true}
        onPasswordChanged={async () => {
          // After force password change, logout and redirect to login
          // This ensures role and permissions are properly set on next login
          apiService.clearToken();
          setIsAuthenticated(false);
          setCurrentUser(null);
          setRequiresPasswordChange(false);
          // Redirect will be handled by ChangePassword component
        }}
      />
    );
  }

  // Check permission helper
  const hasPermission = (permission: string) => {
    // Super Admin (ID 1) has all permissions
    if (currentUser?.id === 1 || currentUser?.role_id === 1) return true;
    // Check permissions array
    return currentUser?.permissions?.includes(permission);
  };

  // -- View Renderers --

  const renderContent = () => {
    switch (currentView) {
      case View.DASHBOARD:
        return <Dashboard />;
      
      case View.ADD_PRODUCT:
        if (!hasPermission('create_products')) return <div className="p-8 text-center text-red-500">Access Denied</div>;
        return <ProductSearch />;

      case View.MANAGE_PRODUCTS:
        if (!hasPermission('view_products')) return <div className="p-8 text-center text-red-500">Access Denied</div>;
        return <ManageProducts />;

      case View.MANAGE_ADMINS:
        if (!hasPermission('view_admin_users')) return <div className="p-8 text-center text-red-500">Access Denied</div>;
        return <ManageAdmins />;

      case View.MANAGE_ROLES:
        if (!hasPermission('view_roles')) return <div className="p-8 text-center text-red-500">Access Denied</div>;
        return <ManageRoles />;

      case View.MANAGE_CATEGORIES:
        if (!hasPermission('view_categories')) return <div className="p-8 text-center text-red-500">Access Denied</div>;
        return <Categories />;

      case View.MANAGE_CATEGORY_KEYWORDS:
        if (!hasPermission('view_categories')) return <div className="p-8 text-center text-red-500">Access Denied</div>;
        return <CategoryKeywords />;

      case View.MANAGE_TAGS:
        if (!hasPermission('view_tags')) return <div className="p-8 text-center text-red-500">Access Denied</div>;
        return <Tags />;

      case View.MANAGE_BANNER_POSITIONS:
        if (!hasPermission('view_banners')) return <div className="p-8 text-center text-red-500">Access Denied</div>;
        return <BannerPositions />;
        
      case View.MANAGE_BANNER_CAMPAIGNS:
        if (!hasPermission('view_banners')) return <div className="p-8 text-center text-red-500">Access Denied</div>;
        return <BannerCampaigns />;
        
      case View.MANAGE_BANNERS:
        if (!hasPermission('view_banners')) return <div className="p-8 text-center text-red-500">Access Denied</div>;
        return <Banners />;
      case View.MANAGE_BANNER_IMAGES:
        if (!hasPermission('view_banners')) return <div className="p-8 text-center text-red-500">Access Denied</div>;
        return <BannerImages />;

      case View.SETTINGS:
        if (!hasPermission('view_settings')) return <div className="p-8 text-center text-red-500">Access Denied</div>;
        return <Settings />;

      case View.CHANGE_PASSWORD:
        return (
          <ChangePassword 
            isForceChange={requiresPasswordChange || currentUser?.requiresPasswordChange || false}
            onPasswordChanged={() => {
              // For force password change, logout and redirect to login
              if (requiresPasswordChange || currentUser?.requiresPasswordChange) {
                apiService.clearToken();
                setIsAuthenticated(false);
                setCurrentUser(null);
                setRequiresPasswordChange(false);
                // Redirect will be handled by ChangePassword component
              } else {
                // Normal password change - go to dashboard
                setCurrentView(View.DASHBOARD);
              }
            }}
          />
        );

      default:
        return (
          <div className="flex flex-col items-center justify-center h-[60vh] text-zinc-500">
            <div className="w-16 h-16 bg-zinc-900 rounded-full flex items-center justify-center mb-4 border border-zinc-800">
                <CheckCircle className="w-8 h-8 text-zinc-600" />
            </div>
            <h3 className="text-lg font-semibold text-zinc-200">Under Construction</h3>
            <p className="max-w-sm text-center mt-2">The {currentView} page is currently being built. Please check back later.</p>
          </div>
        );
    }
  };

  // -- Page Header (Sticky) --
  const getPageHeader = () => {
    const actions = {
      [View.MANAGE_PRODUCTS]: (
        <>
          <HeaderAction icon={Filter} label="Filter" onClick={() => {}} />
          <HeaderAction icon={Plus} label="Add Product" primary onClick={() => setCurrentView(View.ADD_PRODUCT)} />
        </>
      ),
      [View.MANAGE_ADMINS]: null, // Managed by component
      [View.MANAGE_ROLES]: null, // Managed by component
      [View.MANAGE_CATEGORIES]: null,
      [View.MANAGE_TAGS]: null,
      [View.MANAGE_BANNER_POSITIONS]: null,
      [View.MANAGE_BANNER_CAMPAIGNS]: null,
      [View.MANAGE_BANNERS]: null,
      [View.SETTINGS]: null,
      [View.ADD_PRODUCT]: (
        <HeaderAction icon={Package} label="Manage Products" onClick={() => setCurrentView(View.MANAGE_PRODUCTS)} />
      )
    };

    const getDescription = () => {
      if (currentView === View.ADD_PRODUCT) return "Manage your add product and settings.";
      return `Manage your ${currentView.toLowerCase().replace('manage ', '')} and settings.`;
    };

    return (
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">{currentView}</h1>
          <p className="text-zinc-400 mt-1 text-sm">{getDescription()}</p>
        </div>
        <div className="flex items-center gap-3">
           {actions[currentView as keyof typeof actions]}
        </div>
      </div>
    );
  };

  return (
    <div className="flex h-screen overflow-hidden bg-black font-sans text-zinc-100">
      {/* Navigation */}
      <Sidebar 
        currentView={currentView} 
        onChangeView={setCurrentView} 
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        user={currentUser}
      />
      
      {/* Main Content Wrapper */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* Global Top Header - Fixed */}
        <header className="h-16 flex-none bg-black border-b border-border flex items-center justify-between px-4 md:px-8 z-30">
          <div className="flex items-center gap-4 w-full md:w-auto">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="md:hidden p-2 -ml-2 text-zinc-400 hover:text-white"
            >
              <Menu className="w-6 h-6" />
            </button>
          </div>
          
          <div className="flex items-center gap-3 md:gap-4 ml-4">
            {/* User Dropdown */}
            <div className="relative" ref={userMenuRef}>
              <button 
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center gap-3 pl-4 border-l border-border hover:opacity-80 transition-opacity"
              >
                <div className="hidden md:block text-right">
                  <div className="text-sm font-bold text-white">{currentUser?.full_name || currentUser?.username}</div>
                  <div className="text-xs text-zinc-500">{currentUser?.role_name || currentUser?.role}</div>
                </div>
                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white font-bold shadow-lg shadow-indigo-500/20 ring-2 ring-black">
                  {currentUser?.username?.charAt(0).toUpperCase() || 'A'}
                </div>
                <ChevronDown className={`w-4 h-4 text-zinc-500 transition-transform ${isUserMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {isUserMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-56 bg-zinc-900 border border-zinc-800 rounded-xl shadow-xl overflow-hidden z-50 animate-in slide-in-from-top-2 fade-in duration-200">
                  <div className="p-3 border-b border-zinc-800 md:hidden">
                    <div className="text-sm font-bold text-white">{currentUser?.full_name || currentUser?.username}</div>
                    <div className="text-xs text-zinc-500">{currentUser?.role_name || currentUser?.role}</div>
                  </div>
                  
                  <div className="p-1">
                    <button 
                      onClick={() => {
                        setCurrentView(View.CHANGE_PASSWORD);
                        setIsUserMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white rounded-lg transition-colors"
                    >
                      <Shield className="w-4 h-4" />
                      Change Password
                    </button>
                    {hasPermission('view_settings') && (
                      <button 
                        onClick={() => {
                          setCurrentView(View.SETTINGS);
                          setIsUserMenuOpen(false);
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white rounded-lg transition-colors"
                      >
                        <SettingsIcon className="w-4 h-4" />
                        Settings
                      </button>
                    )}
                  </div>
                  
                  <div className="p-1 border-t border-zinc-800">
                    <button 
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 rounded-lg transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      Logout
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Scrollable Content Area */}
        <main className="flex-1 overflow-y-auto scroll-smooth">
          
          {/* Page Header - Sticky inside scroll area */}
          <div className="sticky top-0 z-20 bg-black/95 backdrop-blur supports-[backdrop-filter]:bg-black/80 border-b border-border px-4 py-4 md:px-8 md:py-6 mb-6 min-h-[88px]">
             {headerContent || getPageHeader()}
          </div>

          {/* Actual Content */}
          <div className="px-4 md:px-8 pb-8 animate-in fade-in duration-500 slide-in-from-bottom-4 max-w-7xl mx-auto">
             {renderContent()}
          </div>
        </main>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <DialogProvider>
      <LayoutProvider>
        <AppContent />
      </LayoutProvider>
    </DialogProvider>
  );
};

export default App;
