import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { Link, useLocation, useSearchParams } from "react-router-dom";

const Header = () => {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const liveId = searchParams.get('live');

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
            <Button variant="outline" size="sm" className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Atualizar Dados
            </Button>
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