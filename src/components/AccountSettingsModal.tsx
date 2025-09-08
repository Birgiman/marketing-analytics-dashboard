import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Settings, Building2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export default function AccountSettingsModal() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  
  const [companyData, setCompanyData] = useState({
    companyName: '',
    companyInstagram: ''
  });

  useEffect(() => {
    if (open) {
      fetchCompanyData();
    }
  }, [open]);

  const fetchCompanyData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('company_name, company_instagram')
        .eq('user_id', session.user.id)
        .single();

      if (profile) {
        setCompanyData({
          companyName: profile.company_name || '',
          companyInstagram: profile.company_instagram || ''
        });
      }
    } catch (error) {
      console.error('Error fetching company data:', error);
    }
  };

  const handleSaveCompanyData = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      const { error } = await supabase
        .from('profiles')
        .update({
          company_name: companyData.companyName,
          company_instagram: companyData.companyInstagram
        })
        .eq('user_id', session.user.id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Dados da empresa atualizados com sucesso!",
      });
      
      setOpen(false);
    } catch (error) {
      console.error('Error updating company data:', error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar dados da empresa",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2">
          <Settings className="h-4 w-4" />
          Configurações
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Configurações da Empresa
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Dados da Empresa</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="companyName">Nome da Empresa</Label>
                <Input
                  id="companyName"
                  value={companyData.companyName}
                  onChange={(e) => setCompanyData(prev => ({ ...prev, companyName: e.target.value }))}
                  placeholder="Digite o nome da sua empresa"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="companyInstagram">Instagram da Empresa</Label>
                <Input
                  id="companyInstagram"
                  value={companyData.companyInstagram}
                  onChange={(e) => setCompanyData(prev => ({ ...prev, companyInstagram: e.target.value }))}
                  placeholder="@suaempresa"
                />
              </div>
            </CardContent>
          </Card>

          <Separator />
          
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveCompanyData} disabled={loading}>
              {loading ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}