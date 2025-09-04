import { useState, useEffect } from 'react';
import { SalesHeader } from '@/components/SalesHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Download, Phone, Eye, Calendar } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

interface Lead {
  id: string;
  name: string;
  phone: string;
  liveshop: string;
  audience: string;
  status: 'entrada' | 'saida';
  created_at: string;
}

export default function Leads() {
  const navigate = useNavigate();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [liveshopFilter, setLiveshopFilter] = useState('all');
  const [audienceFilter, setAudienceFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Mock data para demonstração
  const mockLeads: Lead[] = [
    { id: '1', name: 'Maria Silva', phone: '(11) 99999-9999', liveshop: 'Liveshop Beauty', audience: 'VIP Clientes', status: 'entrada', created_at: '2025-01-04' },
    { id: '2', name: 'João Santos', phone: '(11) 88888-8888', liveshop: 'Liveshop Tech', audience: 'Leads Qualificados', status: 'saida', created_at: '2025-01-03' },
    { id: '3', name: 'Ana Costa', phone: '(11) 77777-7777', liveshop: 'Liveshop Fashion', audience: 'Black Friday', status: 'entrada', created_at: '2025-01-02' },
    { id: '4', name: 'Pedro Oliveira', phone: '(11) 66666-6666', liveshop: 'Liveshop Tech', audience: 'VIP Clientes', status: 'entrada', created_at: '2025-01-01' },
    { id: '5', name: 'Carla Ferreira', phone: '(11) 55555-5555', liveshop: 'Liveshop Beauty', audience: 'Cyber Monday', status: 'saida', created_at: '2024-12-31' },
    { id: '6', name: 'Roberto Lima', phone: '(11) 44444-4444', liveshop: 'Liveshop Fashion', audience: 'Leads Qualificados', status: 'entrada', created_at: '2024-12-30' },
    { id: '7', name: 'Fernanda Rocha', phone: '(11) 33333-3333', liveshop: 'Liveshop Beauty', audience: 'Black Friday', status: 'entrada', created_at: '2024-12-29' },
    { id: '8', name: 'Carlos Mendes', phone: '(11) 22222-2222', liveshop: 'Liveshop Tech', audience: 'Cyber Monday', status: 'saida', created_at: '2024-12-28' }
  ];

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate('/auth/signin');
        return;
      }
      
      // Por enquanto usar dados mock
      setLeads(mockLeads);
      setLoading(false);
    };

    checkAuth();
  }, [navigate]);

  const filteredLeads = leads.filter(lead => {
    const matchesSearch = lead.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         lead.phone.includes(searchTerm);
    const matchesLiveshop = liveshopFilter === 'all' || lead.liveshop === liveshopFilter;
    const matchesAudience = audienceFilter === 'all' || lead.audience === audienceFilter;
    const matchesStatus = statusFilter === 'all' || lead.status === statusFilter;
    
    return matchesSearch && matchesLiveshop && matchesAudience && matchesStatus;
  });

  const totalLeads = leads.length;
  const activeLeads = leads.filter(lead => lead.status === 'entrada').length;
  const activeRate = totalLeads > 0 ? ((activeLeads / totalLeads) * 100).toFixed(1) : 0;

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Carregando...</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <SalesHeader title="LiveShop Analytics" />
      
      <div className="p-6 space-y-6">
        {/* Métricas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-2xl font-bold">{totalLeads}</CardTitle>
              <CardDescription>Total de Leads</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Capturados em todas as campanhas</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-2xl font-bold">{activeLeads}</CardTitle>
              <CardDescription>Leads Ativos</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Leads ativos nos grupos</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-2xl font-bold">{activeRate}%</CardTitle>
              <CardDescription>Taxa de Ativos</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Leads ainda ativos</p>
            </CardContent>
          </Card>
        </div>

        {/* Lista de Leads */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">Lista de Leads</h2>
              <p className="text-sm text-muted-foreground">Todos os leads capturados nas suas campanhas</p>
            </div>
            <Button variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Exportar
            </Button>
          </div>

          {/* Filtros */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Data Inicial</label>
              <Button variant="outline" className="w-full justify-start">
                <Calendar className="w-4 h-4 mr-2" />
                Data inicial
              </Button>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Data Final</label>
              <Button variant="outline" className="w-full justify-start">
                <Calendar className="w-4 h-4 mr-2" />
                Data final
              </Button>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Liveshop</label>
              <Select value={liveshopFilter} onValueChange={setLiveshopFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas as liveshops" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as liveshops</SelectItem>
                  <SelectItem value="Liveshop Beauty">Liveshop Beauty</SelectItem>
                  <SelectItem value="Liveshop Tech">Liveshop Tech</SelectItem>
                  <SelectItem value="Liveshop Fashion">Liveshop Fashion</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Público</label>
              <Select value={audienceFilter} onValueChange={setAudienceFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos os públicos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os públicos</SelectItem>
                  <SelectItem value="VIP Clientes">VIP Clientes</SelectItem>
                  <SelectItem value="Leads Qualificados">Leads Qualificados</SelectItem>
                  <SelectItem value="Black Friday">Black Friday</SelectItem>
                  <SelectItem value="Cyber Monday">Cyber Monday</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos os status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os status</SelectItem>
                  <SelectItem value="entrada">Entrada</SelectItem>
                  <SelectItem value="saida">Saída</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Busca */}
          <Input
            placeholder="Buscar por nome, telefone ou liveshop..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-md"
          />

          {/* Tabela */}
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Liveshop</TableHead>
                  <TableHead>Público</TableHead>
                  <TableHead>Entrada ou Saída</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLeads.map((lead) => (
                  <TableRow key={lead.id}>
                    <TableCell className="font-medium">{lead.name}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-muted-foreground" />
                        {lead.phone}
                      </div>
                    </TableCell>
                    <TableCell>{lead.liveshop}</TableCell>
                    <TableCell>{lead.audience}</TableCell>
                    <TableCell>
                      <Badge 
                        variant={lead.status === 'entrada' ? 'default' : 'secondary'}
                        className={lead.status === 'entrada' ? 'bg-green-100 text-green-800 hover:bg-green-100' : ''}
                      >
                        {lead.status === 'entrada' ? 'Entrada' : 'Saída'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm">
                        <Eye className="w-4 h-4 mr-1" />
                        Histórico
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </div>
  );
}