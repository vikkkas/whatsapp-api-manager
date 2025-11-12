import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { authAPI } from '../lib/api';
import { Alert, AlertDescription } from './ui/alert';
import { Shield, AlertTriangle } from 'lucide-react';

interface AdminRouteProps {
  children: React.ReactNode;
}

const AdminRoute: React.FC<AdminRouteProps> = ({ children }) => {
  const location = useLocation();
  const isAuthenticated = authAPI.isAuthenticated();
  const currentUser = authAPI.getCurrentUser();

  if (!isAuthenticated) {
    // Redirect to login page with return url
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!currentUser || currentUser.role !== 'admin') {
    // Show access denied for non-admin users
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="max-w-md w-full">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <div className="flex items-center space-x-2">
                <Shield className="h-5 w-5" />
                <div>
                  <h3 className="font-semibold">Access Denied</h3>
                  <p className="text-sm mt-1">
                    You need administrator privileges to access this page.
                  </p>
                </div>
              </div>
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default AdminRoute;