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
      <div className="relative flex h-screen w-full bg-[#f6f7fb] text-slate-900 overflow-hidden">
        <AppSidebar />
        <div className="relative flex flex-1 flex-col">
          <header className="sticky top-0 z-10 border-b border-transparent bg-white/80 backdrop-blur">
            <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-4 md:flex-row md:items-center md:justify-between">
              <div className="flex items-start gap-4">
                <SidebarTrigger className="rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm md:hidden" />
                <div>
                  <h1 className="text-2xl font-semibold text-slate-900">
                    {currentTenant?.name || 'Workspace'}
                  </h1>
                  <p className="text-sm text-slate-500">
                    {currentUser?.name ? `Welcome back, ${currentUser.name}` : 'Manage your WhatsApp communications'}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                {currentTenant?.plan && (
                  <span className="inline-flex items-center rounded-full border border-slate-200 bg-[#f1f2ff] px-3 py-1 text-xs font-medium text-[#4c47ff]">
                    <Sparkles className="mr-2 h-3 w-3" />
                    {currentTenant.plan} plan
                  </span>
                )}
                <Button asChild variant="outline" className="border-slate-200 text-slate-700 hover:bg-slate-50">
                  <Link to="/settings">
                    <ShieldCheck className="mr-2 h-4 w-4" />
                    Manage Workspace
                  </Link>
                </Button>
              </div>
            </div>
            <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 pb-4">
              <div className="flex flex-1 flex-wrap gap-3 rounded-2xl bg-slate-50 px-3 py-2 text-sm font-medium text-slate-500">
                {navLinks.map((nav) => {
                  const isActive = location.pathname.startsWith(nav.path);
                  return (
                    <Link
                      key={nav.label}
                      to={nav.path}
                      className={`rounded-xl px-3 py-1 ${
                        isActive
                          ? 'bg-white text-[#4c47ff] shadow-sm'
                          : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      {nav.label}
                    </Link>
                  );
                })}
              </div>
              <div className="hidden md:flex items-center gap-3 text-sm text-slate-400">
                <span>{currentUser?.email}</span>
              </div>
            </div>
          </header>
          <main className="relative flex-1 overflow-hidden">
            <div className="mx-auto flex h-full max-w-6xl flex-1 flex-col gap-6 px-4 py-8 overflow-hidden w-full">
              <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
                <div className="flex-1 min-h-0 overflow-hidden">
                  {children}
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
