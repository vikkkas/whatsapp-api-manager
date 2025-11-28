import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { lazy, Suspense } from 'react';
import { ErrorBoundary } from "./components/ErrorBoundary";
import { WebSocketProvider } from "./contexts/WebSocketContext";
import { AuthProvider } from "./contexts/AuthContext";
import { OnboardingGuard } from "./components/OnboardingGuard";
import { DashboardLayout } from "./components/DashboardLayout";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminRoute from "./components/AdminRoute";

// Lazy load pages for better performance
const LandingPage = lazy(() => import("./pages/LandingPage"));
const SignUpPage = lazy(() => import("./pages/SignUpPage"));
const Login = lazy(() => import("./pages/Login"));
const Inbox = lazy(() => import("./pages/Inbox"));
const SendMessage = lazy(() => import("./pages/SendMessage"));
const Analytics = lazy(() => import("./pages/Analytics"));
const Templates = lazy(() => import("./pages/Templates"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const TemplateManagement = lazy(() => import("./pages/TemplateManagement"));
const UserManagement = lazy(() => import("./pages/UserManagement"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

// Loading component
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
  </div>
);

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <BrowserRouter>
          <AuthProvider>
            <WebSocketProvider>
              <Toaster />
              <Sonner />
              <Sonner />
              <Suspense fallback={<PageLoader />}>
                <Routes>
                  {/* Public routes */}
                  <Route path="/" element={<LandingPage />} />
                  <Route path="/signup" element={<SignUpPage />} />
                  <Route path="/login" element={<Login />} />
                  
                  {/* Protected routes with dashboard layout */}
                  <Route
                    path="/dashboard"
                    element={
                      <ProtectedRoute>
                        <OnboardingGuard>
                          <DashboardLayout>
                            <Navigate to="/inbox" replace />
                          </DashboardLayout>
                        </OnboardingGuard>
                      </ProtectedRoute>
                    }
                  />
                  
                  {/* Settings - no onboarding guard needed */}
                  <Route
                    path="/settings"
                    element={
                      <ProtectedRoute>
                        <DashboardLayout>
                          <SettingsPage />
                        </DashboardLayout>
                      </ProtectedRoute>
                    }
                  />
                  
                  {/* Onboarding-protected routes */}
                  <Route
                    path="/inbox"
                    element={
                      <ProtectedRoute>
                        <OnboardingGuard>
                          <DashboardLayout>
                            <Inbox />
                          </DashboardLayout>
                        </OnboardingGuard>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/templates"
                    element={
                      <ProtectedRoute>
                        <OnboardingGuard>
                          <DashboardLayout>
                            <TemplateManagement />
                          </DashboardLayout>
                        </OnboardingGuard>
                      </ProtectedRoute>
                    }
                  />
                  
                  {/* Analytics - protected route */}
                  <Route
                    path="/analytics"
                    element={
                      <ProtectedRoute>
                        <OnboardingGuard>
                          <DashboardLayout>
                            <Analytics />
                          </DashboardLayout>
                        </OnboardingGuard>
                      </ProtectedRoute>
                    }
                  />
                
                {/* Admin only routes */}
                <Route
                  path="/users"
                  element={
                    <AdminRoute>
                      <DashboardLayout>
                        <UserManagement />
                      </DashboardLayout>
                    </AdminRoute>
                  }
                />
                
                {/* 404 route */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
            </WebSocketProvider>
          </AuthProvider>
          </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
