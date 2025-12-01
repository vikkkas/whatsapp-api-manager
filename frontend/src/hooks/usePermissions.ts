import { authAPI } from '@/lib/api';

export const usePermissions = () => {
  const user = authAPI.getCurrentUser();
  
  const hasPermission = (permission: string): boolean => {
    if (!user) return false;
    
    // TENANT_ADMIN and SYSTEM_ADMIN have all permissions
    if (user.role === 'TENANT_ADMIN' || user.role === 'SYSTEM_ADMIN') {
      return true;
    }
    
    // For agents, check specific permissions
    return user.permissions?.includes(permission) || false;
  };
  
  const hasAnyPermission = (...permissions: string[]): boolean => {
    return permissions.some(p => hasPermission(p));
  };
  
  const hasAllPermissions = (...permissions: string[]): boolean => {
    return permissions.every(p => hasPermission(p));
  };
  
  const isTenantAdmin = (): boolean => {
    return user?.role === 'TENANT_ADMIN' || user?.role === 'SYSTEM_ADMIN';
  };
  
  const isAgent = (): boolean => {
    return user?.role === 'AGENT';
  };
  
  return {
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    isTenantAdmin,
    isAgent,
    user,
  };
};
