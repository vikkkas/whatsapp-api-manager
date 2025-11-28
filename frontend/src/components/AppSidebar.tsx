import { MessageSquare, FileText, Settings, LogOut, User, BarChart3 } from "lucide-react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { authAPI } from "@/lib/api";
import { Button } from "./ui/button";
import { useState, useMemo } from "react";
import { Badge } from "./ui/badge";

const items = [
  { title: "Inbox", url: "/inbox", icon: MessageSquare },
  { title: "Templates", url: "/templates", icon: FileText },
  { title: "Analytics", url: "/analytics", icon: BarChart3 },
  { title: "Settings", url: "/settings", icon: Settings },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const navigate = useNavigate();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const currentUser = authAPI.getCurrentUser();
  const currentTenant = authAPI.getCurrentTenant();

  const tenantInitials = useMemo(() => {
    if (!currentTenant?.name) return "WM";
    return currentTenant.name
      .split(" ")
      .map((word) => word[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }, [currentTenant?.name]);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await authAPI.logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
      // Force logout even if API call fails
      navigate('/login');
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <Sidebar
      collapsible="icon"
      className="hidden md:flex border-r border-slate-100 bg-[#fdfcff] text-slate-900 w-64 shrink-0"
    >
      <SidebarHeader className="border-b border-slate-100 px-4 py-6 bg-gradient-to-r from-[#f7f4ff] to-white">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-900 text-white font-semibold shadow-lg shadow-slate-900/10">
            {tenantInitials}
          </div>
          {!collapsed && (
            <div>
              <p className="text-sm font-semibold text-slate-900">
                {currentTenant?.name || "Workspace"}
              </p>
              <p className="text-xs text-slate-500">{currentTenant?.slug || "Multi-tenant"}</p>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2">
        <SidebarGroup>
          <SidebarGroupLabel className="px-3 text-[11px] uppercase tracking-[0.4em] text-slate-400">
            Navigation
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild className="rounded-2xl">
                    <NavLink
                      to={item.url}
                      end
                      title={item.title}
                      aria-label={item.title}
                      className={({ isActive }) =>
                        `flex items-center gap-3 rounded-2xl px-3 py-2 text-sm font-medium transition-all ${
                          isActive
                            ? "bg-[#ecebff] text-[#4c47ff] shadow-sm"
                            : "text-slate-600 hover:bg-slate-50"
                        }`
                      }
                    >
                      <span
                        className={`flex h-9 w-9 items-center justify-center rounded-xl ${
                          collapsed ? "bg-transparent" : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        <item.icon className="h-4 w-4" />
                      </span>
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      
      <SidebarFooter className="border-t border-slate-100 p-4">
        <div className="flex items-center gap-3">
          {!collapsed && currentUser && (
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-slate-500" />
                <div className="truncate text-sm">
                  <div className="font-medium text-slate-900">
                    {currentUser.name || currentUser.email}
                  </div>
                  <div className="text-xs text-slate-500">{currentUser.role || "AGENT"}</div>
                </div>
              </div>
              {currentTenant?.plan && (
                <Badge variant="secondary" className="mt-2 bg-[#f7f4ff] text-[#4c47ff]">
                  {currentTenant.plan} plan
                </Badge>
              )}
            </div>
          )}
          <Button
            variant="outline"
            size={collapsed ? "icon" : "sm"}
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="shrink-0 border-slate-200 text-slate-700 hover:bg-slate-100"
          >
            <LogOut className="h-4 w-4" />
            {!collapsed && <span className="ml-2">Logout</span>}
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
