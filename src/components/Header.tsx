import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Settings, Target } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Header = () => {
  const navigate = useNavigate();

  return (
    <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-16 items-center justify-between px-4 md:px-6">
        <div className="flex items-center gap-2 md:gap-6">
          <SidebarTrigger />
          <div className="flex items-center gap-2 md:gap-4">
            <h1 className="text-lg md:text-xl font-semibold">LiveShop Analytics</h1>
          </div>
        </div>
        
        <div className="flex items-center space-x-2 md:space-x-4">
          {/* Contador de Meta - Design Similar à Imagem */}
          <div className="hidden sm:flex items-center gap-2 md:gap-3 px-2 md:px-4 py-2 bg-background border border-border rounded-lg shadow-sm">
            <div className="flex items-center gap-1 md:gap-2">
              <Target className="h-4 w-4 text-primary" />
              <span className="text-xs md:text-sm font-medium">R$ 1,10M / 10M</span>
            </div>
            <div className="w-16 md:w-20 bg-gray-300 rounded-full h-2">
              <div className="bg-primary h-2 rounded-full transition-all duration-500" style={{
                width: "11%"
              }} />
            </div>
            <span className="text-xs md:text-sm font-medium text-primary">11%</span>
          </div>

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
