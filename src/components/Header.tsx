import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Settings } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Header = () => {
  const navigate = useNavigate();

  return (
    <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-16 items-center justify-between px-4 md:px-6">
        <div className="flex items-center gap-2 md:gap-6">
          <SidebarTrigger />
          <div className="flex items-center gap-2 md:gap-4">
            <h1 className="text-lg md:text-xl font-semibold">Marketing Analytics Dashboard</h1>
          </div>
        </div>
        
        <div className="flex items-center space-x-2 md:space-x-4">
          <div className="flex items-center gap-3">
            {/* Botão de Configurações */}
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => navigate('/profile')}
            >
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
