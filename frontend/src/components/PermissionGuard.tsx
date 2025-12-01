import React from 'react';
import { Navigate } from 'react-router-dom';
import { usePermissions } from '@/hooks/usePermissions';
import { toast } from 'sonner';

interface PermissionGuardProps {
  permission: string;
  children: React.ReactNode;
  redirectTo?: string;
}

export const PermissionGuard: React.FC<PermissionGuardProps> = ({ 
  permission, 
  children, 
  redirectTo = '/inbox' 
}) => {
  const { hasPermission, isTenantAdmin } = usePermissions();

  // Admins have access to everything
  if (isTenantAdmin()) {
    return <>{children}</>;
  }

  // Check for specific permission
  if (hasPermission(permission)) {
    return <>{children}</>;
  }

  // If we're rendering this, access is denied
  // We use a useEffect-like pattern for the toast to avoid rendering side-effects
  // But since we are returning Navigate, it's safer to just let the user know why they moved
  // However, triggering toast during render is bad practice.
  // We'll trust the user understands or add a flash message mechanism later if needed.
  // For now, silent redirect is standard for guards, but we can log it.
  
  return <Navigate to={redirectTo} replace />;
};
