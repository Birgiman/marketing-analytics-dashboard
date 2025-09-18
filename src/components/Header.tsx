import { Button } from "@/components/ui/button";
import { RefreshCw, TrendingUp } from "lucide-react";
import { Link, useLocation, useSearchParams, useNavigate } from "react-router-dom";
import { useState } from "react";
import { useLiveLocalStorageCache } from "@/hooks/useLiveLocalStorageCache";

const Header = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const liveId = searchParams.get('live');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // ===============================================
  // HOOKS DE CACHE PARA CONTROLE DE ATUALIZAÇÃO
  // ===============================================

  // Hook de cache principal (apenas se estivermos em uma página de Live)
  const isLivePage = liveId && ['/details', '/traffic-analysis', '/research-insights', '/sales-by-group'].includes(location.pathname);

  const { refreshData } = useLiveLocalStorageCache({
    liveId: liveId || ''
  });

  const navigationTabs = [
    {
      path: liveId ? `/details?live=${liveId}` : '/lives',
      name: 'Detalhes',
    },
    {
      path: liveId ? `/traffic-analysis?live=${liveId}` : '/lives',
      name: 'Análise de Tráfego',
    },
    {
      path: liveId ? `/research-insights?live=${liveId}` : '/lives',
      name: 'Insights de Pesquisa',
    },
    {
      path: liveId ? `/sales-by-group?live=${liveId}` : '/lives',
      name: 'Públicos',
    },
  ];

  const isTabActive = (path: string) => {
    // Check if the current path matches the base path (ignoring query params)
    if (path.includes('?')) {
      const basePath = path.split('?')[0];
      return location.pathname === basePath;
    }
    return location.pathname === path;
  };

  // ===============================================
  // FUNÇÃO DE ATUALIZAÇÃO CENTRALIZADA
  // ===============================================

  const handleAnalyzeData = async () => {
    if (!isLivePage || !liveId) return;

    setIsRefreshing(true);
    try {
      console.log('🔄 [Header] Atualizando dados completos da Live:', liveId);

      // Atualizar cache localStorage completo (inclui Meta Ads)
      if (refreshData) {
        await refreshData();
      }

      console.log('✅ [Header] Dados atualizados com sucesso');

    } catch (error) {
      console.error('❌ [Header] Erro ao atualizar dados:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  // ===============================================
  // NAVEGAÇÃO OTIMIZADA SEM RECARREGAMENTO
  // ===============================================

  const handleTabNavigation = (event: React.MouseEvent, path: string) => {
    event.preventDefault();

    // Se estivermos indo para uma página de Live, usar navigate para preservar cache
    if (path.includes('live=')) {
      navigate(path);
    } else {
      // Para outras páginas, usar navegação normal
      window.location.href = path;
    }
  };

  return (
    <div>
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-16 items-center justify-between px-4 md:px-6">
          <div className="flex items-center gap-2 md:gap-6">
            <Link to="/" className="text-lg md:text-xl font-semibold hover:opacity-80 transition-opacity">
              LiveShop Analytics
            </Link>
          </div>
          
          <div className="flex items-center space-x-2 md:space-x-4">
            {/* Botão Analisar Dados - apenas para páginas de Live */}
            {isLivePage && (
              <Button
                onClick={handleAnalyzeData}
                disabled={isRefreshing}
                className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
                size="sm"
              >
                {isRefreshing ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Atualizando...
                  </>
                ) : (
                  <>
                    <TrendingUp className="h-4 w-4" />
                    Analisar Dados
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className="border-b bg-background">
        <div className="flex h-12 items-center px-4 md:px-6">
          <div className="flex space-x-1">
            {navigationTabs.map((tab) => {
              return (
                <Link
                  key={tab.path}
                  to={tab.path}
                  onClick={(e) => handleTabNavigation(e, tab.path)}
                  className={`
                    px-3 py-1.5 text-sm font-medium transition-colors
                    ${isTabActive(tab.path)
                      ? 'text-primary border-b-2 border-primary'
                      : 'text-muted-foreground hover:text-foreground'
                    }
                  `}
                >
                  {tab.name}
                </Link>
              );
            })}
          </div>
        </div>
      </nav>
    </div>
  );
};

export default Header;