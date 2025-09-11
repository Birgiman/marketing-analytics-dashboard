import { SidebarTrigger } from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Settings, MapPin, Target, BarChart3, TrendingUp, Users, Package } from "lucide-react";
import { useState } from "react";
import { Link, useLocation } from "react-router-dom";

const Header = () => {
  const location = useLocation();
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

  const navigationTabs = [
    {
      path: '/details',
      name: 'Detalhes',
      icon: BarChart3,
    },
    {
      path: '/traffic-analysis',
      name: 'Análise de Tráfego',
      icon: TrendingUp,
    },
    {
      path: '/research-insights',
      name: 'Insights de Pesquisa',
      icon: Users,
    },
    {
      path: '/sales-by-group',
      name: 'Vendas por Grupo',
      icon: Package,
    },
  ];

  const isTabActive = (path: string) => {
    return location.pathname === path;
  };

  const [address, setAddress] = useState({
    street: "Rua das Flores, 123",
    city: "São Paulo",
    state: "SP",
    zipCode: "01234-567"
  });

  const [accountData, setAccountData] = useState({
    companyName: "LiveShop Tech",
    companyInstagram: "@liveshoptech",
    totalRevenue: 2450000,
    userName: "João Silva",
    userEmail: "joao@liveshoptech.com"
  });

  return (
    <div>
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-16 items-center justify-between px-4 md:px-6">
          <div className="flex items-center gap-2 md:gap-6">
            <SidebarTrigger />
            <div className="flex items-center gap-2 md:gap-4">
              <Link to="/" className="text-lg md:text-xl font-semibold hover:opacity-80 transition-opacity">
                LiveShop Analytics
              </Link>
            </div>
          </div>
          
          <div className="flex items-center space-x-2 md:space-x-4">
            {/* Contador de Meta - Design Similar à Imagem */}
            <div className="hidden sm:flex items-center gap-2 md:gap-3 px-2 md:px-4 py-2 bg-background border border-border rounded-lg shadow-sm">
              <div className="flex items-center gap-1 md:gap-2">
                <Target className="h-4 w-4 text-primary" />
                <span className="text-xs md:text-sm font-medium">R$ 1,10M / 10M</span>
              </div>
              <div className="w-16 md:w-20 bg-muted rounded-full h-2">
                <div className="bg-primary h-2 rounded-full transition-all duration-500" style={{
                  width: "11%"
                }} />
              </div>
              <span className="text-xs md:text-sm font-medium text-primary">11%</span>
            </div>

            {/* Botão de Endereço - Minimalista */}
            <Dialog open={isAddressModalOpen} onOpenChange={setIsAddressModalOpen}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground hover:text-foreground">
                  <MapPin className="h-3 w-3" />
                  <span className="text-xs">Endereço</span>
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Endereço de Envio</DialogTitle>
                </DialogHeader>
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="street">Rua/Endereço</Label>
                    <Input
                      id="street"
                      value={address.street}
                      onChange={(e) => setAddress({...address, street: e.target.value})}
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="city">Cidade</Label>
                      <Input
                        id="city"
                        value={address.city}
                        onChange={(e) => setAddress({...address, city: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="state">Estado</Label>
                      <Input
                        id="state"
                        value={address.state}
                        onChange={(e) => setAddress({...address, state: e.target.value})}
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="zipCode">CEP</Label>
                    <Input
                      id="zipCode"
                      value={address.zipCode}
                      onChange={(e) => setAddress({...address, zipCode: e.target.value})}
                    />
                  </div>
                  
                  <div className="flex gap-3 pt-4">
                    <Button onClick={() => setIsAddressModalOpen(false)} className="flex-1">
                      Salvar Endereço
                    </Button>
                    <Button variant="outline" onClick={() => setIsAddressModalOpen(false)} className="flex-1">
                      Cancelar
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
            
            <div className="flex items-center gap-3">
              
              {/* Modal de Configurações */}
              <Dialog open={isSettingsModalOpen} onOpenChange={setIsSettingsModalOpen}>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <Settings className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Configurações da Conta</DialogTitle>
                  </DialogHeader>
                  
                  <div className="space-y-6">
                    {/* Dados da Empresa */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold border-b pb-2">Dados da Empresa</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Nome da Empresa</Label>
                          <Input 
                            value={accountData.companyName}
                            onChange={(e) => setAccountData({...accountData, companyName: e.target.value})}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Instagram da Empresa</Label>
                          <Input 
                            value={accountData.companyInstagram}
                            onChange={(e) => setAccountData({...accountData, companyInstagram: e.target.value})}
                          />
                        </div>
                      </div>
                      <div className="space-y-3">
                        <Label>Faturamento Total com LiveShop</Label>
                        <div className="flex items-center gap-3 px-4 py-3 bg-background border border-border rounded-lg shadow-sm">
                          <div className="flex items-center gap-2">
                            <Target className="h-4 w-4 text-primary" />
                            <span className="text-sm font-medium">R$ 1,10M / 10M</span>
                          </div>
                          <div className="w-20 bg-muted rounded-full h-2">
                            <div className="bg-primary h-2 rounded-full transition-all duration-500" style={{
                              width: "11%"
                            }} />
                          </div>
                          <span className="text-sm font-medium text-primary">11%</span>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          Atualizado automaticamente
                        </span>
                      </div>
                    </div>

                    {/* Dados Pessoais */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold border-b pb-2">Dados Pessoais</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Nome do Usuário</Label>
                          <Input 
                            value={accountData.userName}
                            onChange={(e) => setAccountData({...accountData, userName: e.target.value})}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>E-mail</Label>
                          <Input 
                            type="email"
                            value={accountData.userEmail}
                            onChange={(e) => setAccountData({...accountData, userEmail: e.target.value})}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Endereço */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold border-b pb-2">Endereço</h3>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label>Rua/Endereço</Label>
                          <Input
                            value={address.street}
                            onChange={(e) => setAddress({...address, street: e.target.value})}
                          />
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                          <div className="space-y-2">
                            <Label>Cidade</Label>
                            <Input
                              value={address.city}
                              onChange={(e) => setAddress({...address, city: e.target.value})}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Estado</Label>
                            <Input
                              value={address.state}
                              onChange={(e) => setAddress({...address, state: e.target.value})}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>CEP</Label>
                            <Input
                              value={address.zipCode}
                              onChange={(e) => setAddress({...address, zipCode: e.target.value})}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex gap-3 pt-4">
                      <Button onClick={() => setIsSettingsModalOpen(false)} className="flex-1">
                        Salvar Alterações
                      </Button>
                      <Button variant="outline" onClick={() => setIsSettingsModalOpen(false)} className="flex-1">
                        Cancelar
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className="border-b bg-background">
        <div className="flex h-12 items-center px-4 md:px-6">
          <div className="flex space-x-1">
            {navigationTabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <Link
                  key={tab.path}
                  to={tab.path}
                  className={`
                    flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md transition-colors
                    ${isTabActive(tab.path) 
                      ? 'bg-primary/10 text-primary border-b-2 border-primary' 
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                    }
                  `}
                >
                  <Icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{tab.name}</span>
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