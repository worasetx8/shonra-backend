import React, { useState, useEffect } from 'react';
import { apiService } from '../services/api';
import { useDialog } from '../context/DialogContext';
import { useLayout } from '../context/LayoutContext';
import { Plus, Edit, Trash2, Shield, Check, Save, X, AlertCircle } from 'lucide-react';
import { Role } from '../types';

interface Permission {
  id: number;
  name: string;
  slug: string;
  description: string;
  group_name: string;
}

interface RoleFormData {
  name: string;
  description: string;
}

export const ManageRoles: React.FC = () => {
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Record<string, Permission[]>>({});
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'list' | 'edit' | 'create'>('list');
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  
  // Form state
  const [formData, setFormData] = useState<RoleFormData>({ name: '', description: '' });
  const [rolePermissions, setRolePermissions] = useState<number[]>([]); // Array of permission IDs
  const [saving, setSaving] = useState(false);

  const [currentUser, setCurrentUser] = useState<any>(null);

  const { showAlert, showConfirm } = useDialog();
  const { setHeaderContent } = useLayout();

  useEffect(() => {
    fetchCurrentUser();
    fetchRoles();
    fetchPermissions();
  }, []);

  const fetchCurrentUser = async () => {
    try {
      const res = await apiService.getCurrentUser();
      if (res.success) {
        setCurrentUser(res.data);
      }
    } catch (error) {
      console.error('Failed to fetch current user:', error);
    }
  };

  const fetchRoles = async () => {
    try {
      const res = await apiService.getRoles();
      if (res.success) {
        setRoles(res.data);
      }
    } catch (error) {
      console.error('Failed to fetch roles:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPermissions = async () => {
    try {
      const res = await apiService.getAllPermissions();
      if (res.success) {
        setPermissions(res.data);
      }
    } catch (error) {
      console.error('Failed to fetch permissions:', error);
    }
  };

  const hasPermission = (permission: string) => {
      if (currentUser?.id === 1 || currentUser?.role_id === 1) return true;
      return currentUser?.permissions?.includes(permission);
  };

  const handleCreateRole = () => {
    if (!hasPermission('create_roles')) {
        showAlert('You do not have permission to create roles', { variant: 'danger' });
        return;
    }
    setSelectedRole(null);
    setFormData({ name: '', description: '' });
    setRolePermissions([]);
    setView('create');
  };

  const handleEditRole = async (role: Role) => {
    if (!hasPermission('edit_roles')) {
        showAlert('You do not have permission to edit roles', { variant: 'danger' });
        return;
    }
    setSelectedRole(role);
    setFormData({ name: role.name, description: role.description || '' });
    setView('edit');
    
    // Fetch role permissions
    try {
      const res = await apiService.getRolePermissions(role.id);
      if (res.success) {
        setRolePermissions(res.data);
      }
    } catch (error) {
      console.error('Failed to fetch role permissions:', error);
      showAlert('Failed to load permissions', { variant: 'danger' });
    }
  };

  const togglePermission = (permId: number) => {
    if (selectedRole?.id === '1') return; // Super Admin is read-only
    
    setRolePermissions(prev => {
      if (prev.includes(permId)) {
        return prev.filter(id => id !== permId);
      } else {
        return [...prev, permId];
      }
    });
  };

  const handleSaveRole = async () => {
    const isEdit = !!selectedRole?.id;
    if (isEdit && !hasPermission('edit_roles')) {
        showAlert('You do not have permission to edit roles', { variant: 'danger' });
        return;
    }
    if (!isEdit && !hasPermission('create_roles')) {
        showAlert('You do not have permission to create roles', { variant: 'danger' });
        return;
    }

    if (!formData.name) {
      showAlert('Role name is required', { variant: 'danger' });
      return;
    }

    try {
      setSaving(true);
      let roleId = selectedRole?.id;

      if (view === 'create') {
        const res = await apiService.createRole(formData);
        if (res.success) {
          roleId = res.data.id;
          showAlert('Role created successfully', { variant: 'success' });
        } else {
          throw new Error(res.message);
        }
      } else if (view === 'edit' && roleId) {
        const res = await apiService.updateRole(roleId, formData);
        if (!res.success) throw new Error(res.message);
        showAlert('Role updated successfully', { variant: 'success' });
      }

      // Update permissions
      if (roleId) {
        // Pass as numbers
        const permIds = rolePermissions.map(Number);
        const permRes = await apiService.updateRolePermissions(roleId, permIds);
        if (!permRes.success) throw new Error(permRes.message || 'Failed to save permissions');
      }

      setView('list');
      fetchRoles();
    } catch (error: any) {
      console.error('Save role error:', error);
      showAlert(error.message || 'Failed to save role', { variant: 'danger' });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRole = async (role: Role) => {
    if (!hasPermission('delete_roles')) {
        showAlert('You do not have permission to delete roles', { variant: 'danger' });
        return;
    }

    if (role.id === '1') {
      showAlert('Cannot delete Super Admin role', { variant: 'danger' });
      return;
    }

    const confirmed = await showConfirm(`Are you sure you want to delete role "${role.name}"?`, {
      variant: 'danger',
      confirmText: 'Delete'
    });

    if (!confirmed) return;

    try {
      const res = await apiService.deleteRole(role.id);
      if (res.success) {
        showAlert('Role deleted successfully', { variant: 'success' });
        fetchRoles();
      } else {
        throw new Error(res.message);
      }
    } catch (error: any) {
      showAlert(error.message || 'Failed to delete role', { variant: 'danger' });
    }
  };

  // Update Header
  useEffect(() => {
    if (view === 'list') {
      setHeaderContent(
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white">Roles & Permissions</h2>
            <p className="text-zinc-400 mt-1 text-sm">Manage system roles and their access rights</p>
          </div>
          {hasPermission('create_roles') && (
          <button 
            onClick={handleCreateRole}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Role
          </button>
          )}
        </div>
      );
    } else {
      setHeaderContent(
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white">
              {view === 'create' ? 'Create Role' : `Edit Role: ${formData.name}`}
            </h2>
            <p className="text-zinc-400 mt-1 text-sm">Configure role details and permissions</p>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={() => setView('list')}
              className="px-4 py-2 text-zinc-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button 
              onClick={handleSaveRole}
              disabled={saving}
              className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-zinc-700 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              {saving ? 'Saving...' : 'Save Role'}
            </button>
          </div>
        </div>
      );
    }
  }, [view, formData, saving, rolePermissions, selectedRole, setHeaderContent, currentUser]); // Add currentUser

  if (loading) return <div className="p-8 text-center text-zinc-500">Loading...</div>;


  const canEditRole = (targetRole: Role) => {
    // Permission check
    if (!hasPermission('edit_roles')) return false;

    const userRoleId = currentUser?.role_id;
    // Target is Super Admin (ID 1)
    if (targetRole.id === '1' || targetRole.id === 1) {
      // Only Super Admin can edit Super Admin
      return userRoleId === 1; 
    }
    // Target is Admin (ID 2)
    if (targetRole.id === '2' || targetRole.id === 2) {
       // Only Super Admin or Admin can edit Admin
       return userRoleId === 1 || userRoleId === 2;
    }
    
    // Other roles: editable by anyone with edit_roles permission (and usually access to this page)
    return true;
  };

  const canDeleteRole = (targetRole: Role) => {
      // Permission check
      if (!hasPermission('delete_roles')) return false;

      const userRoleId = currentUser?.role_id;
      if (targetRole.id === '1' || targetRole.id === 1) return false; // Never delete Super Admin
      if (targetRole.id === '2' || targetRole.id === 2) return false; // Never delete Admin
      
      // Other roles: deletable by anyone with delete_roles permission
      return true;
  };

  if (view === 'list') {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {roles.map(role => (
          <div key={role.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 flex flex-col">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold ${
                  role.id === '1' || role.id === 1 ? 'bg-indigo-900/30 text-indigo-400 border border-indigo-500/30' : 'bg-zinc-800 border border-zinc-700 text-zinc-300'
                }`}>
                  <Shield className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-zinc-100">{role.name}</h4>
                  <div className="text-sm text-zinc-500 mt-0.5 line-clamp-1">
                    {role.description || 'No description'}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-auto flex gap-2 pt-4 border-t border-zinc-800">
              {canEditRole(role) && (
              <button 
                onClick={() => handleEditRole(role)}
                className="flex-1 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white rounded-lg text-sm transition-colors flex items-center justify-center gap-2"
              >
                <Edit className="w-3 h-3" />
                Edit Permissions
              </button>
              )}
              {canDeleteRole(role) && (
                <button 
                  onClick={() => handleDeleteRole(role)}
                  className="p-2 bg-zinc-800 hover:bg-rose-900/20 text-zinc-300 hover:text-rose-500 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Edit/Create View
  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Role Details */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Shield className="w-5 h-5 text-indigo-400" />
          Role Details
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">Role Name</label>
            <input 
              type="text" 
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="e.g. Content Editor"
              disabled={selectedRole?.id === '1'}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">Description</label>
            <input 
              type="text" 
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Optional description"
              disabled={selectedRole?.id === '1'}
            />
          </div>
        </div>
      </div>

      {/* Permissions Matrix */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <Check className="w-5 h-5 text-emerald-400" />
            Permissions
          </h3>
          {selectedRole?.id === '1' && (
            <span className="text-xs font-medium px-2 py-1 bg-indigo-500/10 text-indigo-400 rounded border border-indigo-500/20">
              Super Admin has all permissions
            </span>
          )}
        </div>
        
        <div className="p-6 grid grid-cols-1 gap-8">
          {Object.entries(permissions).map(([group, groupPerms]) => (
            <div key={group}>
              <h4 className="text-sm font-bold text-zinc-300 uppercase tracking-wider mb-4 pb-2 border-b border-zinc-800">
                {group}
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {groupPerms.map(perm => {
                  const isSelected = rolePermissions.includes(perm.id);
                  const isReadOnly = selectedRole?.id === '1';
                  
                  return (
                    <div 
                      key={perm.id}
                      onClick={() => !isReadOnly && togglePermission(perm.id)}
                      className={`
                        relative p-4 rounded-lg border cursor-pointer transition-all
                        ${isSelected 
                          ? 'bg-indigo-500/10 border-indigo-500/30 hover:bg-indigo-500/20' 
                          : 'bg-zinc-800/30 border-zinc-800 hover:bg-zinc-800 hover:border-zinc-700'
                        }
                        ${isReadOnly ? 'cursor-default opacity-80' : ''}
                      `}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`mt-0.5 w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                          isSelected 
                            ? 'bg-indigo-500 border-indigo-500 text-white' 
                            : 'bg-zinc-900 border-zinc-600'
                        }`}>
                          {isSelected && <Check className="w-3.5 h-3.5" />}
                        </div>
                        <div>
                          <div className={`text-sm font-medium ${isSelected ? 'text-white' : 'text-zinc-400'}`}>
                            {perm.name}
                          </div>
                          <div className="text-xs text-zinc-500 mt-1 leading-relaxed">
                            {perm.description}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
