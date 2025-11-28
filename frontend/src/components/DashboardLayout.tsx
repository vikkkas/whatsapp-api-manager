import { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { Button } from "./ui/button";
import { authAPI } from "@/lib/api";
import { ShieldCheck, Sparkles } from "lucide-react";

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const currentUser = authAPI.getCurrentUser();
  const currentTenant = authAPI.getCurrentTenant();
  const location = useLocation();

  const navLinks = [
    { label: 'Inbox', path: '/inbox' },
    { label: 'Templates', path: '/templates' },
    { label: 'Analytics', path: '/analytics' },
    { label: 'Settings', path: '/settings' },
  ];

  return (
    <SidebarProvider>
      <div className="relative flex h-screen w-full bg-white text-foreground overflow-hidden">
        <AppSidebar />
        <div className="relative flex flex-1 flex-col h-full overflow-hidden">
          <header className="sticky top-0 z-10 border-b border-gray-200 bg-white h-16 flex-none">
            <div className="flex h-full items-center justify-between px-6">
              <div className="flex items-center gap-4">
                <SidebarTrigger className="md:hidden" />
                <div className="flex items-center gap-2 text-sm font-medium text-gray-500">
                  <span className="text-black font-bold">{currentTenant?.name || 'Workspace'}</span>
                  <span>/</span>
                  <span className="text-gray-900">{navLinks.find(n => location.pathname.startsWith(n.path))?.label || 'Dashboard'}</span>
                </div>
              </div>

              <div className="flex items-center gap-4">
                {currentTenant?.plan && (
                  <span className="hidden md:inline-flex items-center rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-bold text-yellow-800">
                    <Sparkles className="mr-1 h-3 w-3" />
                    {currentTenant.plan.toUpperCase()}
                  </span>
                )}
                
                <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg">
                  {navLinks.map((nav) => {
                    const isActive = location.pathname.startsWith(nav.path);
                    return (
                      <Link
                        key={nav.label}
                        to={nav.path}
                        className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                          isActive
                            ? 'bg-white text-black shadow-sm'
                            : 'text-gray-500 hover:text-gray-900'
                        }`}
                      >
                        {nav.label}
                      </Link>
                    );
                  })}
                </div>
              </div>
            </div>
          </header>
          <main className="flex-1 overflow-y-auto overflow-x-hidden relative">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
