import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const CreateTestUser = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [userData, setUserData] = useState({
    email: 'admin@liveshop.com',
    password: 'LiveShop123!',
    firstName: 'Admin',
    lastName: 'LiveShop'
  });

  const handleInputChange = (field: string, value: string) => {
    setUserData(prev => ({ ...prev, [field]: value }));
  };

  const createTestUser = async () => {
    setLoading(true);
    try {
      // Sanitizar e validar email localmente
      const email = userData.email.trim().toLowerCase();
      const password = userData.password;
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        toast({
          title: "Email inválido",
          description: "Verifique o endereço de email informado.",
          variant: "destructive",
        });
        return;
      }

      // Criar usuário no Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/dashboard`,
          data: {
            first_name: userData.firstName,
            last_name: userData.lastName
          }
        }
      });

      if (authError) {
        throw new Error(`Erro na autenticação: ${authError.message}`);
      }

      if (!authData.user) {
        throw new Error('Usuário não foi criado');
      }

      // Criar perfil do usuário
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          user_id: authData.user.id,
          first_name: userData.firstName,
          last_name: userData.lastName
        });

      if (profileError) {
        console.error('Erro ao criar perfil:', profileError);
        // Não vou fazer throw aqui pois o usuário foi criado com sucesso
      }

      // Criar dados de exemplo para o usuário
      const userId = authData.user.id;
      
      // Criar lives de exemplo
      await supabase.from('lives').insert([
        {
          user_id: userId,
          name: 'Live Demo - Moda Verão 2024',
          live_date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
          captacao_start: new Date(Date.now() + 47 * 60 * 60 * 1000).toISOString(),
          participants: 2340,
          sales: 45,
          revenue: 8900.50,
          peak_viewers: 2340
        },
        {
          user_id: userId,
          name: 'Live Black Friday Especial',
          live_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          captacao_start: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 - 60 * 60 * 1000).toISOString(),
          participants: 0,
          sales: 0,
          revenue: 0,
          peak_viewers: 0
        }
      ]);

      toast({
        title: "Usuário de teste criado!",
        description: `Email: ${userData.email} | Senha: ${userData.password}`,
      });

    } catch (error: unknown) {
      console.error('Erro ao criar usuário:', error);
      toast({
        title: "Erro ao criar usuário",
        description: error.message || 'Erro desconhecido',
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Criar Usuário de Teste</CardTitle>
        <CardDescription>
          Crie um usuário com dados de exemplo para testar a aplicação
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={userData.email}
            onChange={(e) => handleInputChange('email', e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Senha</Label>
          <Input
            id="password"
            type="password"
            value={userData.password}
            onChange={(e) => handleInputChange('password', e.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-2">
            <Label htmlFor="firstName">Nome</Label>
            <Input
              id="firstName"
              value={userData.firstName}
              onChange={(e) => handleInputChange('firstName', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lastName">Sobrenome</Label>
            <Input
              id="lastName"
              value={userData.lastName}
              onChange={(e) => handleInputChange('lastName', e.target.value)}
            />
          </div>
        </div>

        <Button onClick={createTestUser} disabled={loading} className="w-full">
          {loading ? 'Criando usuário...' : 'Criar Usuário de Teste'}
        </Button>
      </CardContent>
    </Card>
  );
};