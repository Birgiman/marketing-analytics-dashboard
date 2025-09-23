import { useState, useEffect } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { 
  LayoutDashboard, 
  Users, 
  TrendingUp, 
  Calculator, 
  Zap, 
  Settings, 
  LogOut,
  User,
  Shield,
  FileText
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useWhatsAppConnection } from "@/hooks/useWhatsAppConnection";

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
  const location = useLocation();
  const [userName, setUserName] = useState("");
  const [profilePicture, setProfilePicture] = useState<string | null>(null);
  
  // Hook para acessar dados de conexão do WhatsApp
  const { currentInstance } = useWhatsAppConnection();

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
          setUserName(fullName);
        } else if (user.user_metadata?.full_name) {
          setUserName(user.user_metadata.full_name);
        } else {
          setUserName(user.email?.split("@")[0] || "USUÁRIO");
        }
      }
    };
    getUser();
  }, []);

  // Note: WhatsApp profile picture endpoint not supported by Evolution API
  // Removed the profilePictureUrl call as it's not in the supported actions list
  // Available actions: create instance, reconnect instance, check instance, check status, get qr, disconnect, delete instance

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/auth/signin");
  };

  const isActivePage = (url: string) => location.pathname === url;

  const getNavClassName = (url: string) =>
    isActivePage(url)
      ? "bg-muted/70 text-sidebar-foreground font-medium border border-border/60 rounded-md" 
      : "text-sidebar-foreground hover:bg-muted/40 hover:border hover:border-border/40 transition-all duration-200 rounded-md";

  return (
    <Sidebar className="border-r border-sidebar-border">
      <SidebarHeader className="p-4 border-b border-sidebar-border">
        <button 
          onClick={() => navigate("/profile")}
          className="flex items-center gap-3 w-full text-left hover:bg-sidebar-accent hover:text-sidebar-accent-foreground p-2 rounded-md transition-colors"
        >
          <div className="w-8 h-8 bg-background rounded-full flex items-center justify-center overflow-hidden">
            {profilePicture ? (
              <img 
                src={profilePicture} 
                alt="Foto do perfil WhatsApp" 
                className="w-full h-full object-cover rounded-full"
                onError={() => setProfilePicture(null)} // Fallback se a imagem falhar
              />
            ) : (
              <User className="w-4 h-4 text-muted-foreground" />
            )}
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
                     <NavLink to={item.url} end className={getNavClassName(item.url)}>
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
                     <NavLink to={item.url} end className={getNavClassName(item.url)}>
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
            <SidebarMenuButton asChild>
              <NavLink to="/privacy" className="text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
                <Shield className="w-4 h-4" />
                <span>Política de Privacidade</span>
              </NavLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <NavLink to="/terms" className="text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
                <FileText className="w-4 h-4" />
                <span>Termos de Uso</span>
              </NavLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
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