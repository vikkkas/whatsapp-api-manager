import React, { createContext, useContext, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { authAPI } from '../lib/api';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

interface AuthContextType {
  user: any;
  token: string | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const navigate = useNavigate();
  const { user, token, isAuthenticated, setAuth, clearAuth } = useAuthStore();

  // Check for existing auth on mount
  useEffect(() => {
    const storedToken = localStorage.getItem('authToken');
    const storedUser = localStorage.getItem('user');
    const storedTenant = localStorage.getItem('tenant');

    if (storedToken && storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        const parsedTenant = storedTenant ? JSON.parse(storedTenant) : null;
        
        setAuth(
          { ...parsedUser, tenantId: parsedTenant?.id },
          storedToken,
          localStorage.getItem('refreshToken') || ''
        );
      } catch (error) {
        console.error('Failed to restore auth:', error);
        clearAuth();
      }
    }
  }, [setAuth, clearAuth]);

  const login = async (email: string, password: string) => {
    try {
      const response = await authAPI.login(email, password);
      
      setAuth(
        {
          ...response.data.user,
          tenantId: response.data.tenant.id,
        },
        response.data.token,
        response.data.refreshToken
      );

      toast.success(`Welcome back, ${response.data.user.name}!`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Login failed';
      toast.error(message);
      throw error;
    }
  };

  const logout = () => {
    clearAuth();
    localStorage.removeItem('authToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    localStorage.removeItem('tenant');
    toast.success('Logged out successfully');
    navigate('/login');
  };

  const refreshAuth = async () => {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken) {
        throw new Error('No refresh token');
      }

      const response = await authAPI.refresh(refreshToken);
      
      setAuth(
        user,
        response.data.token,
        response.data.refreshToken
      );
      
      localStorage.setItem('authToken', response.data.token);
      localStorage.setItem('refreshToken', response.data.refreshToken);
    } catch (error) {
      console.error('Token refresh failed:', error);
      logout();
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, isAuthenticated, login, logout, refreshAuth }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
