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

  // Buscar foto do perfil WhatsApp quando a instância estiver conectada
  useEffect(() => {
    const fetchWhatsAppProfilePicture = async () => {
      if (currentInstance?.instance_name && currentInstance.status === 'connected') {
        try {
          const { data: session } = await supabase.auth.getSession();
          if (!session.session?.user) return;

          // Fazer chamada para API do WhatsApp para obter foto do perfil
          const response = await fetch(`https://gsdmasbgrglbvlpuhidv.supabase.co/functions/v1/whatsapp-api`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session.session.access_token}`,
              'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdzZG1hc2JncmdsYnZscHVoaWR2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcwMDkwMTMsImV4cCI6MjA3MjU4NTAxM30.hrL3tWvdZKrsDwNf_yG2kawqYcA6nnV89CW9nEkH93s'
            },
            body: JSON.stringify({
              instanceName: currentInstance.instance_name,
              endpoint: '/instance/profilePictureUrl',
              method: 'GET',
              data: {}
            })
          });

          if (response.ok) {
            const result = await response.json();
            if (result.profilePictureUrl) {
              setProfilePicture(result.profilePictureUrl);
            }
          }
        } catch (error) {
          console.error('Error fetching WhatsApp profile picture:', error);
        }
      }
    };

    fetchWhatsAppProfilePicture();
  }, [currentInstance?.instance_name, currentInstance?.status]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/auth/signin");
  };

  const getNavClassName = ({ isActive }: { isActive: boolean }) =>
    isActive 
      ? "bg-primary text-primary-foreground font-medium shadow-sm border border-primary/20" 
      : "text-sidebar-foreground hover:bg-sidebar-accent/80 hover:text-sidebar-accent-foreground transition-all duration-200 hover:shadow-sm";

  return (
    <Sidebar className="border-r border-sidebar-border">
      <SidebarHeader className="p-4 border-b border-sidebar-border">
        <button 
          onClick={() => navigate("/profile")}
          className="flex items-center gap-3 w-full text-left hover:bg-sidebar-accent hover:text-sidebar-accent-foreground p-2 rounded-md transition-colors"
        >
          <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center overflow-hidden">
            {profilePicture ? (
              <img 
                src={profilePicture} 
                alt="Foto do perfil WhatsApp" 
                className="w-full h-full object-cover rounded-full"
                onError={() => setProfilePicture(null)} // Fallback se a imagem falhar
              />
            ) : (
              <User className="w-4 h-4 text-primary-foreground" />
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