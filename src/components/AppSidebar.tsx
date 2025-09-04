import { useState, useEffect } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { 
  LayoutDashboard, 
  Users, 
  TrendingUp, 
  Calculator, 
  UserCheck, 
  Zap, 
  Settings, 
  LogOut,
  User
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { DEMO_MODE } from "@/lib/demo-mode";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";

const mainMenuItems = [
  { 
    title: "Dashboard", 
    url: "/dashboard", 
    icon: LayoutDashboard 
  },
  { 
    title: "Backup De Públicos", 
    url: "/leads", 
    icon: Users 
  },
  { 
    title: "Vendas Por Público", 
    url: "/groups", 
    icon: TrendingUp 
  },
  { 
    title: "Calculadora De LiveShop", 
    url: "/lives", 
    icon: Calculator 
  },
  { 
    title: "Usuários", 
    url: "/users", 
    icon: UserCheck 
  },
  { 
    title: "Integrações", 
    url: "/integrations", 
    icon: Zap 
  },
];

const adminItems = [
  { 
    title: "Painel Admin", 
    url: "/admin", 
    icon: Settings 
  },
];

export function AppSidebar() {
  const { open, isMobile } = useSidebar();
  const navigate = useNavigate();
  const [userName, setUserName] = useState("EDUARDO DOMINGUES");

  useEffect(() => {
    if (!DEMO_MODE) {
      const getUser = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.user_metadata?.full_name) {
          setUserName(user.user_metadata.full_name.toUpperCase());
        }
      };
      getUser();
    }
  }, []);

  const handleSignOut = async () => {
    if (!DEMO_MODE) {
      await supabase.auth.signOut();
    }
    navigate("/auth/signin");
  };

  const getNavClassName = ({ isActive }: { isActive: boolean }) =>
    isActive 
      ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium" 
      : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground";

  return (
    <Sidebar className="border-r border-sidebar-border">
      <SidebarHeader className="p-4 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
            <User className="w-4 h-4 text-primary-foreground" />
          </div>
          <div className="text-sm font-medium text-sidebar-foreground">
            {userName}
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-medium text-muted-foreground px-3 mb-2">
            Menu
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainMenuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                     <NavLink to={item.url} className={getNavClassName}>
                       <item.icon className="w-4 h-4" />
                       <span>{item.title}</span>
                     </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-medium text-muted-foreground px-3 mb-2">
            Administração
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {adminItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                     <NavLink to={item.url} className={getNavClassName}>
                       <item.icon className="w-4 h-4" />
                       <span>{item.title}</span>
                     </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 border-t border-sidebar-border">
        <SidebarMenu>
          <SidebarMenuItem>
             <SidebarMenuButton onClick={handleSignOut} className="text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
               <LogOut className="w-4 h-4" />
               <span>Sair</span>
             </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}