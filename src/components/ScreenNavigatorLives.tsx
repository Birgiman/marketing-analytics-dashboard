import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { Link, useLocation } from "react-router-dom";

interface ScreenNavigatorLivesProps {
  liveId: string | null;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  showRefreshButton?: boolean;
}

export function ScreenNavigatorLives({ 
  liveId, 
  onRefresh, 
  isRefreshing = false, 
  showRefreshButton = false 
}: ScreenNavigatorLivesProps) {
  const location = useLocation();

  if (!liveId) {
    return null;
  }

  return (
    <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        {/* Navegação à esquerda */}
        <div className="flex flex-1 items-center justify-start space-x-2">
          <Button variant={location.pathname === "/details" ? "default" : "outline"} size="sm" asChild>
            <Link to={`/details?live=${liveId}`}>Detalhes</Link>
          </Button>
          <Button variant={location.pathname === "/traffic-analysis" ? "default" : "outline"} size="sm" asChild>
            <Link to={`/traffic-analysis?live=${liveId}`}>Análise de Tráfego</Link>
          </Button>
          <Button variant={location.pathname === "/research-insights" ? "default" : "outline"} size="sm" asChild>
            <Link to={`/research-insights?live=${liveId}`}>Insights de Pesquisa</Link>
          </Button>
          <Button variant={location.pathname === "/sales-by-group" ? "default" : "outline"} size="sm" asChild>
            <Link to={`/sales-by-group?live=${liveId}`}>Públicos</Link>
          </Button>
        </div>

        {/* Botão de refresh à direita */}
        {showRefreshButton && onRefresh && (
          <div className="flex items-center">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onRefresh}
              disabled={isRefreshing}
              className="gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              {isRefreshing ? 'Atualizando...' : 'Atualizar'}
            </Button>
          </div>
        )}
      </div>
    </header>
  );
}
