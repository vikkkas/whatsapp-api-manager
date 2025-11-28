import { MessageSquare, FileText, Settings, LogOut, User, BarChart3, Zap, Users } from "lucide-react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { authAPI } from "@/lib/api";
import { Button } from "./ui/button";
import { useState, useMemo } from "react";

const items = [
  { title: "Inbox", url: "/inbox", icon: MessageSquare },
  { title: "Contacts", url: "/contacts", icon: Users },
  // { title: "Automation", url: "/templates", icon: Zap },
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
      navigate('/login');
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <Sidebar
      collapsible="icon"
      className="hidden md:flex border-r border-border w-64 shrink-0"
      style={{
        "--sidebar-background": "0 0% 0%",
        "--sidebar-foreground": "0 0% 80%",
        "--sidebar-accent": "0 0% 100%",
        "--sidebar-accent-foreground": "0 0% 0%",
        "--sidebar-border": "0 0% 15%",
      } as React.CSSProperties}
    >
      <SidebarHeader className="border-b border-white/10 px-4 py-6 bg-sidebar">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-black font-bold shadow-lg">
            {tenantInitials}
          </div>
          {!collapsed && (
            <div className="overflow-hidden">
              <p className="text-sm font-bold text-white truncate">
                {currentTenant?.name || "Workspace"}
              </p>
              <p className="text-xs text-gray-400 truncate">{currentTenant?.slug || "Pro Plan"}</p>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2 py-4 bg-sidebar">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild className="group/menu-button rounded-lg ring-0 outline-none h-auto text-yellow-100 p-2 border-none">
                    <NavLink
                      to={item.url}
                      end
                      title={item.title}
                      className={({ isActive }) =>
                        `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all w-full outline-none border-none ${
                          isActive
                            ? "font-bold shadow-sm"
                            : "hover:text-white"
                        }`
                      }
                    >
                      <item.icon className={`h-5 w-5 ${collapsed ? "mx-auto" : ""}`} />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      
      <SidebarFooter className="border-t border-white/10 p-4 bg-sidebar">
        <div className="flex items-center gap-3">
          {!collapsed && currentUser && (
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-gray-800 flex items-center justify-center border border-gray-700">
                  <User className="h-4 w-4 text-gray-400" />
                </div>
                <div className="truncate text-sm">
                  <div className="font-bold text-white truncate">
                    {currentUser.name || currentUser.email}
                  </div>
                  <div className="text-xs text-gray-500 truncate">{currentUser.role || "Admin"}</div>
                </div>
              </div>
            </div>
          )}
          <Button
            variant="ghost"
            size={collapsed ? "icon" : "sm"}
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="shrink-0 text-gray-400 hover:text-white hover:bg-white/10"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
