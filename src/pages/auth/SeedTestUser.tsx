import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface TestUser {
  email: string;
  password: string;
  userId?: string;
}

export default function SeedTestUser() {
  const navigate = useNavigate();
  const [testUser, setTestUser] = useState<TestUser>({
    email: 'teste@liveshop.com',
    password: 'Teste123!'
  });
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);

  const createTestUser = async () => {
    setLoading(true);
    setError(null);

    try {
      // 1. Criar usuário no Supabase Auth
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: testUser.email,
        password: testUser.password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/signin`,
          data: {
            first_name: 'Usuário',
            last_name: 'Teste'
          }
        }
      });

      if (signUpError) {
        setError(signUpError.message);
        return;
      }

      if (!data.user) {
        setError('Erro ao criar usuário');
        return;
      }

      // 2. Criar perfil
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          user_id: data.user.id,
          first_name: 'Usuário',
          last_name: 'Teste',
          phone: '+5511999999999'
        });

      if (profileError) {
        console.error('Erro ao criar perfil:', profileError);
      }

      // 3. Criar dados de teste
      await createTestData(data.user.id);

      setTestUser(prev => ({ ...prev, userId: data.user!.id }));
      setSuccess(true);

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Erro ao criar usuário de teste';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const createTestData = async (userId: string) => {
    try {
      // Criar Lives de teste
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
          captacao_start: new Date(Date.now() + 167 * 60 * 60 * 1000).toISOString(),
          participants: 0,
          sales: 0,
          revenue: 0,
          peak_viewers: 0
        }
      ]);

      // Criar Grupos de teste
      await supabase.from('grupos').insert([
        {
          user_id: userId,
          data_hora: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          data: new Date().toISOString().split('T')[0],
          hora: new Date(Date.now() - 2 * 60 * 60 * 1000).toTimeString().split(' ')[0].substring(0, 5),
          id_grupo: 'test-group-vip@g.us',
          nome_grupo: 'Grupo VIP - Moda Feminina',
          telefone: '+5511987654321',
          evento: 'entrada'
        }
      ]);

      // Criar Criativos de teste
      await supabase.from('criativos').insert([
        {
          user_id: userId,
          day: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          campaign_name: 'Campanha Moda Verão',
          ad_set_name: 'Público Feminino 25-45',
          ad_name: 'Vestidos Florais - Vídeo',
          amount_spent: 1250.90,
          leads: 87,
          cost_per_lead: 14.38,
          creative_link: 'https://facebook.com/ads/test/creative1'
        }
      ]);

    } catch (error) {
      console.error('Erro ao criar dados de teste:', error);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-background p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Criar Usuário de Teste</CardTitle>
          <CardDescription>
            Crie um usuário com dados de exemplo para testar a aplicação
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!success ? (
            <>
              <div className="space-y-2">
                <label className="text-sm font-medium">Email:</label>
                <p className="text-sm text-muted-foreground">{testUser.email}</p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Senha:</label>
                <p className="text-sm text-muted-foreground">{testUser.password}</p>
              </div>

              {error && (
                <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                  <p className="text-sm text-destructive">{error}</p>
                </div>
              )}

              <Button 
                onClick={createTestUser} 
                disabled={loading}
                className="w-full"
              >
                {loading ? 'Criando usuário...' : 'Criar Usuário de Teste'}
              </Button>
            </>
          ) : (
            <div className="space-y-4">
              <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                <p className="text-sm text-green-800">Usuário criado com sucesso!</p>
              </div>
              
              <div className="space-y-2">
                <div>
                  <label className="text-sm font-medium">Email:</label>
                  <p className="text-sm text-muted-foreground">{testUser.email}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Senha:</label>
                  <p className="text-sm text-muted-foreground">{testUser.password}</p>
                </div>
                {testUser.userId && (
                  <div>
                    <label className="text-sm font-medium">User ID:</label>
                    <p className="text-xs text-muted-foreground font-mono">{testUser.userId}</p>
                  </div>
                )}
              </div>

              <p className="text-xs text-muted-foreground">
                Agora você pode fazer login com essas credenciais. Dados de exemplo foram criados para este usuário.
              </p>

              <div className="flex gap-2">
                <Button onClick={() => navigate('/auth/signin')} className="flex-1">
                  Ir para Login
                </Button>
                <Button variant="outline" onClick={() => setSuccess(false)} className="flex-1">
                  Criar Outro
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
