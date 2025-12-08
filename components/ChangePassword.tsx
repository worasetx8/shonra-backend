import React, { useState, useEffect } from 'react';
import { Lock, Eye, EyeOff, AlertCircle, CheckCircle, Loader, Shield } from 'lucide-react';
import { apiService } from '../services/api';
import { useDialog } from '../context/DialogContext';
import { useLayout } from '../context/LayoutContext';

interface ChangePasswordProps {
  isForceChange?: boolean;
  onPasswordChanged?: () => void;
}

export const ChangePassword: React.FC<ChangePasswordProps> = ({ 
  isForceChange = false,
  onPasswordChanged 
}) => {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [settings, setSettings] = useState({
    website_name: 'Shonra Admin',
    logo_url: ''
  });

  const { showAlert } = useDialog();
  const { setHeaderContent } = useLayout();

  useEffect(() => {
    // Fetch settings for logo and website name
    const fetchSettings = async () => {
      try {
        const response = await apiService.getSettings();
        if (response.success) {
          setSettings({
            website_name: response.data.website_name || 'Shonra Admin',
            logo_url: response.data.logo_backend_url || response.data.logo_url || ''
          });
        }
      } catch (e) {
        console.error('Failed to fetch settings', e);
      }
    };
    fetchSettings();

    // Only set header content if NOT force change (normal change password in dashboard)
    if (!isForceChange) {
      setHeaderContent(
        <div className="flex flex-col gap-2">
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Shield className="w-6 h-6" />
            Change Password
          </h2>
          <p className="text-zinc-400 text-sm">
            Update your account password
          </p>
        </div>
      );
    } else {
      // Clear header content for force change (standalone page)
      setHeaderContent(null);
    }
  }, [setHeaderContent, isForceChange]);

  const validatePassword = (password: string): string | null => {
    if (password.length < 6) {
      return 'Password must be at least 6 characters';
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    // Validation
    if (!isForceChange && !oldPassword.trim()) {
      setError('Current password is required');
      return;
    }

    if (!newPassword.trim()) {
      setError('New password is required');
      return;
    }

    const passwordError = validatePassword(newPassword);
    if (passwordError) {
      setError(passwordError);
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('New password and confirm password do not match');
      return;
    }

    try {
      setLoading(true);

      // For force change, we can pass empty oldPassword (backend will skip verification)
      const response = await apiService.changePassword(
        isForceChange ? '' : oldPassword,
        newPassword
      );

      if (response.success) {
        setSuccess(true);
        await showAlert('Password changed successfully! Please login again.', { variant: 'success' });
        
        // Clear form
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');

        // For force password change, logout and redirect to login
        if (isForceChange) {
          // Clear token and logout
          apiService.clearToken();
          
          // Redirect to login after delay
          setTimeout(() => {
            window.location.href = '/backoffice/login';
          }, 2000);
        } else {
          // Normal password change - callback if provided
          if (onPasswordChanged) {
            setTimeout(() => {
              onPasswordChanged();
            }, 1500);
          }
        }
      } else {
        setError(response.message || 'Failed to change password');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to change password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Force change: Use standalone layout (like Login)
  if (isForceChange) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Logo/Header */}
          <div className="text-center mb-8">
            {settings.logo_url ? (
              <div className="inline-flex items-center justify-center w-24 h-24 mb-4">
                <img 
                  src={settings.logo_url.startsWith('http') 
                    ? settings.logo_url 
                    : `${window.location.origin}${settings.logo_url}`} 
                  alt="Logo" 
                  className="w-full h-full object-contain" 
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              </div>
            ) : (
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-2xl mb-4 shadow-2xl shadow-indigo-500/20">
                <Shield className="w-8 h-8 text-white" />
              </div>
            )}
            <h1 className="text-3xl font-bold text-white mb-2">{settings.website_name}</h1>
            <p className="text-zinc-400">Set your new password to continue</p>
          </div>

          {/* Change Password Form */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 shadow-2xl">
        {isForceChange && (
          <div className="mb-6 p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-amber-500 font-medium mb-1">Password Change Required</p>
              <p className="text-amber-400/80 text-sm">
                Your account requires a password reset. Please set a new password to continue using the system.
              </p>
            </div>
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-lg flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-emerald-500 font-medium mb-1">Password Changed Successfully!</p>
              <p className="text-emerald-400/80 text-sm">
                {isForceChange 
                  ? 'Your password has been set. You will be redirected to login page in a moment...'
                  : 'Your password has been updated successfully.'}
              </p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Old Password Field (only if not force change) */}
          {!isForceChange && (
            <div>
              <label htmlFor="oldPassword" className="block text-sm font-medium text-zinc-300 mb-2">
                Current Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                <input
                  id="oldPassword"
                  type={showOldPassword ? 'text' : 'password'}
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  className="w-full pl-12 pr-12 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                  placeholder="Enter your current password"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowOldPassword(!showOldPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
                  disabled={loading}
                >
                  {showOldPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>
          )}

          {/* New Password Field */}
          <div>
            <label htmlFor="newPassword" className="block text-sm font-medium text-zinc-300 mb-2">
              {isForceChange ? 'New Password' : 'New Password'}
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
              <input
                id="newPassword"
                type={showNewPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full pl-12 pr-12 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                placeholder="Enter new password (min. 6 characters)"
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
                disabled={loading}
              >
                {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            <p className="mt-1 text-xs text-zinc-500">Password must be at least 6 characters</p>
          </div>

          {/* Confirm Password Field */}
          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-zinc-300 mb-2">
              Confirm New Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
              <input
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full pl-12 pr-12 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                placeholder="Confirm new password"
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
                disabled={loading}
              >
                {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-rose-500/10 border border-rose-500/20 rounded-lg p-3 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-rose-500 flex-shrink-0" />
              <span className="text-rose-500 text-sm">{error}</span>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading || success || (!isForceChange && !oldPassword.trim()) || !newPassword.trim() || !confirmPassword.trim()}
            className="w-full py-3 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 disabled:from-zinc-700 disabled:to-zinc-700 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30"
          >
            {loading ? (
              <>
                <Loader className="w-5 h-5 animate-spin" />
                Changing password...
              </>
            ) : success ? (
              <>
                <CheckCircle className="w-5 h-5" />
                Password Changed!
              </>
            ) : (
              <>
                <Shield className="w-5 h-5" />
                {isForceChange ? 'Set New Password' : 'Change Password'}
              </>
            )}
          </button>
        </form>
          </div>

          {/* Footer */}
          <div className="text-center mt-8">
            <p className="text-zinc-500 text-sm">
              © {new Date().getFullYear()} {settings.website_name} • Password Reset
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Normal change password: Use dashboard layout (with sidebar and header)
  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 shadow-2xl">
        {success && (
          <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-lg flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-emerald-500 font-medium mb-1">Password Changed Successfully!</p>
              <p className="text-emerald-400/80 text-sm">
                Your password has been updated successfully.
              </p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Old Password Field */}
          <div>
            <label htmlFor="oldPassword" className="block text-sm font-medium text-zinc-300 mb-2">
              Current Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
              <input
                id="oldPassword"
                type={showOldPassword ? 'text' : 'password'}
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                className="w-full pl-12 pr-12 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                placeholder="Enter your current password"
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowOldPassword(!showOldPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
                disabled={loading}
              >
                {showOldPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* New Password Field */}
          <div>
            <label htmlFor="newPassword" className="block text-sm font-medium text-zinc-300 mb-2">
              New Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
              <input
                id="newPassword"
                type={showNewPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full pl-12 pr-12 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                placeholder="Enter new password (min. 6 characters)"
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
                disabled={loading}
              >
                {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            <p className="mt-1 text-xs text-zinc-500">Password must be at least 6 characters</p>
          </div>

          {/* Confirm Password Field */}
          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-zinc-300 mb-2">
              Confirm New Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
              <input
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full pl-12 pr-12 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                placeholder="Confirm new password"
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
                disabled={loading}
              >
                {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-rose-500/10 border border-rose-500/20 rounded-lg p-3 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-rose-500 flex-shrink-0" />
              <span className="text-rose-500 text-sm">{error}</span>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading || success || !oldPassword.trim() || !newPassword.trim() || !confirmPassword.trim()}
            className="w-full py-3 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 disabled:from-zinc-700 disabled:to-zinc-700 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30"
          >
            {loading ? (
              <>
                <Loader className="w-5 h-5 animate-spin" />
                Changing password...
              </>
            ) : success ? (
              <>
                <CheckCircle className="w-5 h-5" />
                Password Changed!
              </>
            ) : (
              <>
                <Shield className="w-5 h-5" />
                Change Password
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

