import React, { useState, useEffect } from 'react';
import { apiService } from '../services/api';
import { useDialog } from '../context/DialogContext';
import { useLayout } from '../context/LayoutContext';
import { Plus, MoreHorizontal, Trash2, Edit, Mail, Shield, Lock, Power, User as UserIcon, Key, CheckCircle, XCircle, Eye, EyeOff, Loader } from 'lucide-react';
import { Admin, Role } from '../types';

interface AdminFormData {
  id?: string;
  username: string;
  password?: string;
  confirmPassword?: string;
  full_name: string;
  email: string;
  role_id: number;
  status: 'active' | 'inactive';
}

export const ManageAdmins: React.FC = () => {
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'list' | 'edit' | 'create'>('list');
  const [showResetPassword, setShowResetPassword] = useState<string | null>(null);
  const [resetPasswordValue, setResetPasswordValue] = useState('');
  const [resetConfirmPassword, setResetConfirmPassword] = useState('');
  const [showResetPasswordField, setShowResetPasswordField] = useState(false);
  const [showResetConfirmPassword, setShowResetConfirmPassword] = useState(false);
  const [resettingPassword, setResettingPassword] = useState(false);
  
  const [currentUser, setCurrentUser] = useState<any>(null);
  
  // Form state
  const [formData, setFormData] = useState<AdminFormData>({
    username: '',
    full_name: '',
    email: '',
    role_id: 0,
    status: 'active'
  });
  const [saving, setSaving] = useState(false);

  const { showAlert, showConfirm } = useDialog();
  const { setHeaderContent } = useLayout();

  useEffect(() => {
    fetchData();
    fetchCurrentUser();
  }, []);

  const fetchCurrentUser = async () => {
      try {
          const res = await apiService.getCurrentUser();
          if (res.success) {
              setCurrentUser(res.data);
          }
      } catch (error) {
          console.error("Failed to fetch current user", error);
      }
  };

  const fetchData = async () => {
    try {
      const [adminRes, roleRes] = await Promise.all([
        apiService.getAdminUsers(),
        apiService.getRoles()
      ]);

      if (adminRes.success) setAdmins(adminRes.data.users);
      if (roleRes.success) setRoles(roleRes.data);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setFormData({
      username: '',
      full_name: '',
      email: '',
      role_id: roles.length > 0 ? roles[0].id : 0,
      status: 'active',
      password: '',
      confirmPassword: ''
    });
    setView('create');
  };

  const handleEdit = (admin: Admin) => {
    setFormData({
      id: admin.id,
      username: admin.username,
      full_name: admin.full_name,
      email: admin.email,
      role_id: admin.role_id,
      status: admin.status
    });
    setView('edit');
  };


  const validatePassword = (password: string) => {
    if (password.length < 8) return "Password must be at least 8 characters";
    if (!/[A-Z]/.test(password)) return "Password must contain at least one uppercase letter";
    if (!/[a-z]/.test(password)) return "Password must contain at least one lowercase letter";
    if (!/[0-9]/.test(password)) return "Password must contain at least one number";
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) return "Password must contain at least one special character";
    return null;
  };

  // Simple password validation for reset (same as ChangePassword)
  const validateResetPassword = (password: string): string | null => {
    if (password.length < 6) {
      return 'Password must be at least 6 characters';
    }
    return null;
  };

  const handleSave = async () => {
    if (!formData.username || !formData.role_id) {
      return showAlert('Username and Role are required', { variant: 'danger' });
    }

    if (view === 'create') {
      if (!formData.password) {
        return showAlert('Password is required', { variant: 'danger' });
      }
      const passwordError = validatePassword(formData.password);
      if (passwordError) {
        return showAlert(passwordError, { variant: 'danger' });
      }
      if (formData.password !== formData.confirmPassword) {
        return showAlert('Passwords do not match', { variant: 'danger' });
      }
    }

    try {
      setSaving(true);
      let response;
      
      if (view === 'create') {
        response = await apiService.createAdminUser({
          username: formData.username,
          password: formData.password!,
          role_id: formData.role_id,
          full_name: formData.full_name,
          email: formData.email,
          status: formData.status
        });
      } else {
        response = await apiService.updateAdminUser(formData.id!, {
          full_name: formData.full_name,
          email: formData.email,
          role_id: formData.role_id,
          status: formData.status
        });
      }

      if (response.success) {
        showAlert(`Admin user ${view === 'create' ? 'created' : 'updated'} successfully`, { variant: 'success' });
        fetchData();
        setView('list');
      } else {
        throw new Error(response.message);
      }
    } catch (error: any) {
      showAlert(error.message || 'Operation failed', { variant: 'danger' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (admin: Admin) => {
    const confirmed = await showConfirm(`Are you sure you want to delete user "${admin.username}"?`, {
      variant: 'danger',
      confirmText: 'Delete'
    });

    if (!confirmed) return;

    try {
      const response = await apiService.deleteAdminUser(admin.id);
      if (response.success) {
        showAlert('User deleted successfully', { variant: 'success' });
        fetchData();
      } else {
        throw new Error(response.message);
      }
    } catch (error: any) {
      showAlert(error.message || 'Failed to delete user', { variant: 'danger' });
    }
  };

  const handleResetPassword = async (id: string, e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }

    if (!resetPasswordValue.trim()) {
      return showAlert('New password is required', { variant: 'danger' });
    }

    if (!resetConfirmPassword.trim()) {
      return showAlert('Please confirm the new password', { variant: 'danger' });
    }

    const passwordError = validateResetPassword(resetPasswordValue);
    if (passwordError) {
      return showAlert(passwordError, { variant: 'danger' });
    }

    if (resetPasswordValue !== resetConfirmPassword) {
      return showAlert('New password and confirm password do not match', { variant: 'danger' });
    }

    try {
      setResettingPassword(true);
      const response = await apiService.request(`/admin/users/${id}/reset-password`, {
        method: 'POST',
        body: JSON.stringify({ password: resetPasswordValue })
      });

      if (response.success) {
        showAlert('Password changed successfully', { variant: 'success' });
        setShowResetPassword(null);
        setResetPasswordValue('');
        setResetConfirmPassword('');
        setShowResetPasswordField(false);
        setShowResetConfirmPassword(false);
      } else {
        throw new Error(response.message);
      }
    } catch (error: any) {
      showAlert(error.message || 'Failed to change password', { variant: 'danger' });
    } finally {
      setResettingPassword(false);
    }
  };

  const handleToggleStatus = async (admin: Admin) => {
    try {
      const newStatus = admin.status === 'active' ? 'inactive' : 'active';
      const response = await apiService.updateAdminUserStatus(admin.id, newStatus === 'active');

      if (response.success) {
        setAdmins(admins.map(a => a.id === admin.id ? { ...a, status: newStatus } : a));
      } else {
        throw new Error(response.message);
      }
    } catch (error: any) {
      showAlert(error.message || 'Failed to update status', { variant: 'danger' });
    }
  };

  const hasPermission = (permission: string) => {
      if (currentUser?.id === 1 || currentUser?.role_id === 1) return true;
      return currentUser?.permissions?.includes(permission);
  };

  // Update Header
  useEffect(() => {
    if (view === 'list') {
      setHeaderContent(
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white">Admin Users</h2>
            <p className="text-zinc-400 mt-1 text-sm">Manage system administrators and their roles</p>
          </div>
          {hasPermission('create_admin_users') && (
          <button 
            onClick={handleCreate}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add User
          </button>
          )}
        </div>
      );
    } else {
      setHeaderContent(
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white">
              {view === 'create' ? 'Create New User' : `Edit User: ${formData.username}`}
            </h2>
            <p className="text-zinc-400 mt-1 text-sm">Configure user details and role</p>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={() => setView('list')}
              className="px-4 py-2 text-zinc-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button 
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-zinc-700 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              {saving ? 'Saving...' : 'Save User'}
            </button>
          </div>
        </div>
      );
    }
  }, [view, formData, saving, setHeaderContent, currentUser]);

  const canManageAdmin = (targetAdmin: Admin) => {
      const userRoleId = currentUser?.role_id;
      // If target user is Super Admin (role_id 1 or ID 1)
      if (targetAdmin.role_id === 1 || targetAdmin.id === '1') {
          // Only Super Admin can manage Super Admin
          return userRoleId === 1;
      }
      return true;
  };

  if (loading) return <div className="p-8 text-center text-zinc-500">Loading...</div>;

  if (view === 'list') {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {admins.map(admin => (
          <div key={admin.id} className={`bg-zinc-900 border border-zinc-800 rounded-xl p-6 flex flex-col ${admin.status === 'inactive' ? 'opacity-60' : ''}`}>
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-300 font-bold text-lg">
                  {admin.username.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h4 className="font-bold text-zinc-100">{admin.username}</h4>
                  <div className="flex items-center gap-1 text-sm text-zinc-500 mt-0.5">
                    <Mail className="w-3 h-3" />
                    {admin.email || 'No email'}
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                 {admin.id !== '1' && canManageAdmin(admin) && hasPermission('edit_admin_users') && (
                    <button 
                        onClick={() => handleToggleStatus(admin)}
                        className={`p-1.5 rounded hover:bg-zinc-800 transition-colors ${admin.status === 'active' ? 'text-emerald-500' : 'text-zinc-500'}`}
                        title={admin.status === 'active' ? 'Deactivate' : 'Activate'}
                    >
                        <Power className="w-4 h-4" />
                    </button>
                 )}
              </div>
            </div>

            <div className="mb-6 space-y-3">
                <div className="flex items-center justify-between p-2 bg-zinc-800/50 rounded text-sm">
                    <span className="text-zinc-400 flex items-center gap-2"><Shield className="w-3 h-3" /> Role</span>
                    <span className="text-indigo-400 font-medium">{admin.role_name || 'Unknown'}</span>
                </div>
                <div className="flex items-center justify-between p-2 bg-zinc-800/50 rounded text-sm">
                    <span className="text-zinc-400">Status</span>
                    <span className={`font-medium flex items-center gap-1.5 ${admin.status === 'active' ? 'text-emerald-500' : 'text-zinc-500'}`}>
                        {admin.status === 'active' ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                        {admin.status.charAt(0).toUpperCase() + admin.status.slice(1)}
                    </span>
                </div>
            </div>

            <div className="mt-auto flex gap-2 pt-4 border-t border-zinc-800">
                {canManageAdmin(admin) && (
                <>
                    {hasPermission('edit_admin_users') && (
                    <button 
                        onClick={() => setShowResetPassword(showResetPassword === admin.id ? null : admin.id)}
                        className="flex-1 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-sm transition-colors flex items-center justify-center gap-2"
                    >
                        <Key className="w-3 h-3" />
                        Reset Pwd
                    </button>
                    )}
                    {hasPermission('edit_admin_users') && (
                    <button 
                        onClick={() => handleEdit(admin)}
                        className="p-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white rounded-lg transition-colors"
                    >
                        <Edit className="w-4 h-4" />
                    </button>
                    )}
                    {admin.id !== '1' && hasPermission('delete_admin_users') && (
                        <button 
                            onClick={() => handleDelete(admin)}
                            className="p-2 bg-zinc-800 hover:bg-rose-900/20 text-zinc-300 hover:text-rose-500 rounded-lg transition-colors"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    )}
                </>
                )}
            </div>

            {/* Reset Password Form */}
            {showResetPassword === admin.id && (
                <div className="mt-4 pt-4 border-t border-zinc-800 animate-in slide-in-from-top-2">
                    <form onSubmit={(e) => handleResetPassword(admin.id, e)} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-zinc-300 mb-2">
                                New Password
                            </label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                                <input 
                                    type={showResetPasswordField ? 'text' : 'password'}
                                    placeholder="Enter new password (min. 6 characters)"
                                    value={resetPasswordValue}
                                    onChange={(e) => setResetPasswordValue(e.target.value)}
                                    className="w-full pl-10 pr-10 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-sm"
                                    disabled={resettingPassword}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowResetPasswordField(!showResetPasswordField)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
                                    disabled={resettingPassword}
                                >
                                    {showResetPasswordField ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                            <p className="mt-1 text-xs text-zinc-500">Password must be at least 6 characters</p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-zinc-300 mb-2">
                                Confirm New Password
                            </label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                                <input 
                                    type={showResetConfirmPassword ? 'text' : 'password'}
                                    placeholder="Confirm new password"
                                    value={resetConfirmPassword}
                                    onChange={(e) => setResetConfirmPassword(e.target.value)}
                                    className="w-full pl-10 pr-10 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-sm"
                                    disabled={resettingPassword}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowResetConfirmPassword(!showResetConfirmPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
                                    disabled={resettingPassword}
                                >
                                    {showResetConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>

                        <div className="flex gap-2">
                            <button 
                                type="button"
                                onClick={() => {
                                    setShowResetPassword(null);
                                    setResetPasswordValue('');
                                    setResetConfirmPassword('');
                                    setShowResetPasswordField(false);
                                    setShowResetConfirmPassword(false);
                                }}
                                className="flex-1 px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-sm font-medium transition-colors"
                                disabled={resettingPassword}
                            >
                                Cancel
                            </button>
                            <button 
                                type="submit"
                                disabled={resettingPassword || !resetPasswordValue.trim() || !resetConfirmPassword.trim()}
                                className="flex-1 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-zinc-700 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                            >
                                {resettingPassword ? (
                                    <>
                                        <Loader className="w-4 h-4 animate-spin" />
                                        Changing...
                                    </>
                                ) : (
                                    <>
                                        <Key className="w-4 h-4" />
                                        Change Password
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            )}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-2">Username</label>
                    <div className="relative">
                        <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                        <input 
                            type="text" 
                            value={formData.username}
                            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                            className="w-full pl-10 pr-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
                            disabled={view === 'edit'} // Cannot change username
                        />
                    </div>
                </div>
                
                <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-2">Full Name</label>
                    <input 
                        type="text" 
                        value={formData.full_name}
                        onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                        className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-2">Email</label>
                    <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                        <input 
                            type="email" 
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            className="w-full pl-10 pr-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-2">Role</label>
                    <select 
                        value={formData.role_id}
                        onChange={(e) => setFormData({ ...formData, role_id: Number(e.target.value) })}
                        className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        disabled={formData.id === '1'} // Cannot change super admin role
                    >
                        {roles
                            .filter(role => {
                                // If current user is NOT Super Admin (ID 1), hide Super Admin role from dropdown
                                if (currentUser?.role_id !== 1 && (role.id === 1 || role.name === 'Super Admin')) {
                                    return false;
                                }
                                return true;
                            })
                            .map(role => (
                            <option key={role.id} value={role.id}>{role.name}</option>
                        ))}
                    </select>
                </div>

                {view === 'create' && (
                    <>
                        <div>
                            <label className="block text-sm font-medium text-zinc-400 mb-2">Password</label>
                            <input 
                                type="password" 
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-zinc-400 mb-2">Confirm Password</label>
                            <input 
                                type="password" 
                                value={formData.confirmPassword}
                                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                                className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                    </>
                )}

                {view === 'edit' && (
                    <div className="col-span-full p-4 bg-zinc-800/50 rounded-lg border border-zinc-800">
                        <div className="flex items-center gap-3 text-zinc-400 text-sm">
                            <Key className="w-4 h-4" />
                            To change password, use the "Reset Pwd" button on the user card.
                        </div>
                    </div>
                )}
            </div>
        </div>
    </div>
  );
};
