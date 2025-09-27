import { Button } from "@/components/ui/button";
// Função antiga removida - agora usando Edge Function syncLiveMetaData
import { RefreshCw } from "lucide-react";
import { useState } from "react";
import { Link, useLocation } from "react-router-dom";

interface ScreenNavigatorLivesProps {
  liveId: string | null;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  showRefreshButton?: boolean;
  onDataUpdated?: () => void; // Callback quando dados são atualizados
  onRefreshStart?: () => void; // Callback quando refresh inicia
}

export function ScreenNavigatorLives({ 
  liveId, 
  onRefresh, 
  isRefreshing = false, 
  showRefreshButton = false,
  onDataUpdated,
  onRefreshStart
}: ScreenNavigatorLivesProps) {
  const location = useLocation();
  const [isButtonLoading, setIsButtonLoading] = useState(false);

  // Função para forçar atualização dos dados
  const handleForceRefresh = async () => {
    if (!liveId) return;

    setIsButtonLoading(true);

    // Notificar que o refresh começou (isso vai chamar onRefreshStart que força a Edge Function)
    if (onRefreshStart) {
      onRefreshStart();
    }

    try {
      // Aguardar um momento para a Edge Function completar
      await new Promise(resolve => setTimeout(resolve, 100));

      // Notificar que os dados foram atualizados
      if (onDataUpdated) {
        onDataUpdated();
      }
    } catch (error) {
      console.error('Erro no refresh:', error);
    } finally {
      setIsButtonLoading(false);
    }
  };

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
          {/* <Button variant={location.pathname === "/research-insights" ? "default" : "outline"} size="sm" asChild>
            <Link to={`/research-insights?live=${liveId}`}>Insights de Pesquisa</Link>
          </Button> */}
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
              onClick={handleForceRefresh}
              disabled={isButtonLoading}
              className={`gap-2 ${isButtonLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <RefreshCw className={`w-4 h-4 ${isButtonLoading ? 'animate-spin' : ''}`} />
              {isButtonLoading ? 'Atualizando...' : 'Atualizar'}
            </Button>
          </div>
        )}
      </div>
    </header>
  );
}
