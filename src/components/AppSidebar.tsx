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
    url: "/calculator", 
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
  const [userName, setUserName] = useState("");

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Buscar dados do perfil primeiro
        const { data: profileData } = await supabase
          .from("profiles")
          .select("first_name, last_name")
          .eq("user_id", user.id)
          .single();
        
        if (profileData && profileData.first_name) {
          const fullName = `${profileData.first_name} ${profileData.last_name || ""}`.trim();
          setUserName(fullName.toUpperCase());
        } else if (user.user_metadata?.full_name) {
          setUserName(user.user_metadata.full_name.toUpperCase());
        } else {
          setUserName(user.email?.split("@")[0].toUpperCase() || "USUÁRIO");
        }
      }
    };
    getUser();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/auth/signin");
  };

  const getNavClassName = ({ isActive }: { isActive: boolean }) =>
    isActive 
      ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium" 
      : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground";

  return (
    <Sidebar className="border-r border-sidebar-border">
      <SidebarHeader className="p-4 border-b border-sidebar-border">
        <button 
          onClick={() => navigate("/profile")}
          className="flex items-center gap-3 w-full text-left hover:bg-sidebar-accent hover:text-sidebar-accent-foreground p-2 rounded-md transition-colors"
        >
          <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
            <User className="w-4 h-4 text-primary-foreground" />
          </div>
          <div className="text-sm font-medium text-sidebar-foreground">
            {userName}
          </div>
        </button>
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