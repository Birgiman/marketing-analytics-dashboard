import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

export default function SeedTestUser() {
  const navigate = useNavigate();
  const [createdEmail, setCreatedEmail] = useState<string | null>(null);
  const [password] = useState<string>('Teste123!');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      try {
        const email = `teste+${Date.now()}@example.com`;
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/signin`,
            data: {
              first_name: 'Teste',
              last_name: 'Usuario',
            },
          },
        });

        if (signUpError) {
          setError(signUpError.message);
          return;
        }

        setCreatedEmail(email);
      } catch (e: any) {
        setError(e?.message || 'Erro ao criar usuário de teste');
      } finally {
        setLoading(false);
      }
    };

    run();
  }, []);

  return (
    <main className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="w-full max-w-md rounded-lg border p-6 bg-card text-card-foreground shadow-sm">
        <h1 className="text-xl font-semibold mb-2">Criar usuário de teste</h1>
        <p className="text-sm text-muted-foreground mb-4">
          Geramos um usuário de teste único para validar o fluxo de autenticação.
        </p>

        {loading && <p>Gerando usuário...</p>}
        {error && <p className="text-destructive">{error}</p>}

        {!loading && !error && createdEmail && (
          <div className="space-y-3">
            <div className="text-sm">
              <p><strong>Email:</strong> {createdEmail}</p>
              <p><strong>Senha:</strong> {password}</p>
            </div>
            <p className="text-xs text-muted-foreground">
              Observação: se a confirmação de email estiver habilitada no Supabase, verifique a caixa de entrada deste endereço para confirmar antes de entrar.
            </p>
            <div className="flex gap-2">
              <Button onClick={() => navigate('/auth/signin')}>Ir para login</Button>
              <Button variant="secondary" onClick={() => navigate('/')}>Página inicial</Button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
