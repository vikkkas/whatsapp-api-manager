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
import { PermissionGuard } from "./components/PermissionGuard";

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
const ContactManagement = lazy(() => import("./pages/ContactManagement"));
const CampaignManagement = lazy(() => import("./pages/CampaignManagement"));
const AgentManagement = lazy(() => import("./pages/AgentManagement"));
const CannedResponses = lazy(() => import("./pages/CannedResponses"));
const AgentLogin = lazy(() => import("./pages/AgentLogin"));
const FlowList = lazy(() => import("./pages/FlowList"));
const FlowBuilder = lazy(() => import("./pages/FlowBuilder"));
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
                  <Route path="/agent-login" element={<AgentLogin />} />
                  
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
                          <PermissionGuard permission="VIEW_SETTINGS">
                            <SettingsPage />
                          </PermissionGuard>
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
                            <PermissionGuard permission="VIEW_CONVERSATIONS">
                              <Inbox />
                            </PermissionGuard>
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
                            <PermissionGuard permission="VIEW_TEMPLATES">
                              <TemplateManagement />
                            </PermissionGuard>
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
                            <PermissionGuard permission="VIEW_ANALYTICS">
                              <Analytics />
                            </PermissionGuard>
                          </DashboardLayout>
                        </OnboardingGuard>
                      </ProtectedRoute>
                    }
                  />
                
                  {/* Contacts - protected route */}
                  <Route
                    path="/contacts"
                    element={
                      <ProtectedRoute>
                        <OnboardingGuard>
                          <DashboardLayout>
                            <PermissionGuard permission="VIEW_CONTACTS">
                              <ContactManagement />
                            </PermissionGuard>
                          </DashboardLayout>
                        </OnboardingGuard>
                      </ProtectedRoute>
                    }
                  />
                
                  {/* Campaigns - protected route */}
                  <Route
                    path="/campaigns"
                    element={
                      <ProtectedRoute>
                        <OnboardingGuard>
                          <DashboardLayout>
                            <PermissionGuard permission="VIEW_CAMPAIGNS">
                              <CampaignManagement />
                            </PermissionGuard>
                          </DashboardLayout>
                        </OnboardingGuard>
                      </ProtectedRoute>
                    }
                  />
                
                  {/* Canned Responses - protected route */}
                  <Route
                    path="/canned-responses"
                    element={
                      <ProtectedRoute>
                        <OnboardingGuard>
                          <DashboardLayout>
                            <PermissionGuard permission="VIEW_CANNED_RESPONSES">
                              <CannedResponses />
                            </PermissionGuard>
                          </DashboardLayout>
                        </OnboardingGuard>
                      </ProtectedRoute>
                    }
                  />

                  {/* Flows - protected route */}
                  <Route
                    path="/flows"
                    element={
                      <ProtectedRoute>
                        <OnboardingGuard>
                          <DashboardLayout>
                            <PermissionGuard permission="VIEW_FLOWS">
                              <FlowList />
                            </PermissionGuard>
                          </DashboardLayout>
                        </OnboardingGuard>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/flows/:id"
                    element={
                      <ProtectedRoute>
                        <OnboardingGuard>
                          <PermissionGuard permission="EDIT_FLOWS">
                            <FlowBuilder />
                          </PermissionGuard>
                        </OnboardingGuard>
                      </ProtectedRoute>
                    }
                  />
                
                {/* Admin only routes */}
                <Route
                  path="/agents"
                  element={
                    <AdminRoute>
                      <DashboardLayout>
                        <AgentManagement />
                      </DashboardLayout>
                    </AdminRoute>
                  }
                />
                
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
