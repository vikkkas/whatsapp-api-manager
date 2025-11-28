import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { settingsAPI } from '../lib/api';
import { Loader2 } from 'lucide-react';

interface OnboardingGuardProps {
  children: React.ReactNode;
}

// Public paths that don't require onboarding
const PUBLIC_PATHS = ['/settings', '/login', '/logout', '/'];

// 🚧 DEVELOPMENT MODE: Bypass onboarding guard
const BYPASS_ONBOARDING = false; // Set to false in production

export const OnboardingGuard: React.FC<OnboardingGuardProps> = ({ children }) => {
  const location = useLocation();
  const [isOnboarded, setIsOnboarded] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkOnboarding = async () => {
      // 🚧 DEVELOPMENT: Skip onboarding check entirely
      if (BYPASS_ONBOARDING) {
        setIsOnboarded(true);
        setIsLoading(false);
        return;
      }

      // Skip check for public paths
      if (PUBLIC_PATHS.includes(location.pathname)) {
        setIsOnboarded(true);
        setIsLoading(false);
        return;
      }

      try {
        const response = await settingsAPI.get();
        const wabaSettings = response.settings?.waba;
        
        // Check if WABA is configured and valid
        const isConfigured = !!(
          wabaSettings?.phoneNumberId &&
          wabaSettings?.accessToken &&
          wabaSettings?.isValid
        );
        
        setIsOnboarded(isConfigured);
      } catch (error) {
        console.error('Error checking onboarding:', error);
        setIsOnboarded(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkOnboarding();
  }, [location.pathname]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // If not onboarded and trying to access protected route, redirect to settings
  if (!isOnboarded && !PUBLIC_PATHS.includes(location.pathname)) {
    return <Navigate to="/settings" replace />;
  }

  return <>{children}</>;
};
