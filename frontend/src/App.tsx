import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster as HotToaster } from 'react-hot-toast';
import { lazy, Suspense } from 'react';
import { ErrorBoundary } from "./components/ErrorBoundary";
import { WebSocketProvider } from "./contexts/WebSocketContext";
import { DashboardLayout } from "./components/DashboardLayout";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminRoute from "./components/AdminRoute";

// Lazy load pages for better performance
const Login = lazy(() => import("./pages/Login"));
const Inbox = lazy(() => import("./pages/Inbox"));
const SendMessage = lazy(() => import("./pages/SendMessage"));
const Analytics = lazy(() => import("./pages/Analytics"));
const Templates = lazy(() => import("./pages/Templates"));
const Settings = lazy(() => import("./pages/Settings"));
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
        <WebSocketProvider>
          <HotToaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#363636',
                color: '#fff',
              },
            }}
          />
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Suspense fallback={<PageLoader />}>
              <Routes>
                {/* Public routes */}
                <Route path="/login" element={<Login />} />
                
                {/* Protected routes with dashboard layout */}
                <Route
                  path="/"
                  element={
                    <ProtectedRoute>
                      <DashboardLayout>
                        <Navigate to="/inbox" replace />
                      </DashboardLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/inbox"
                  element={
                    <ProtectedRoute>
                      <DashboardLayout>
                        <Inbox />
                      </DashboardLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/send"
                  element={
                    <ProtectedRoute>
                      <DashboardLayout>
                        <SendMessage />
                      </DashboardLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/analytics"
                  element={
                    <ProtectedRoute>
                      <DashboardLayout>
                        <Analytics />
                      </DashboardLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/templates"
                  element={
                    <ProtectedRoute>
                      <DashboardLayout>
                        <Templates />
                      </DashboardLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/settings"
                  element={
                    <ProtectedRoute>
                      <DashboardLayout>
                        <Settings />
                      </DashboardLayout>
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
          </BrowserRouter>
        </WebSocketProvider>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
