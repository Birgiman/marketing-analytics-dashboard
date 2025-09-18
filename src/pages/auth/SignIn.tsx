import { Button } from '@/components/ui/button';
import { PasswordInput } from '@/components/ui/password-input';
import { supabase } from '@/integrations/supabase/client';
import { Link, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';

export default function SignIn() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const [error, setError] = useState<string | null>(null);

  // Redireciona para o dashboard se já estiver logado
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        navigate('/dashboard');
      }
    });
  }, [navigate]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setError(error.message);
        return;
      }

      if (data?.user) {
        // Check user profile status before allowing login
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('status')
          .eq('user_id', data.user.id)
          .single();

        if (profileError || !profile) {
          setError('Erro ao verificar status da conta');
          return;
        }

        // Redirect based on account status
        switch (profile.status) {
          case 'approved':
            navigate('/dashboard');
            break;
          case 'pending':
            navigate('/auth/pending-approval');
            break;
          case 'rejected':
          case 'disabled':
            navigate('/auth/account-disabled');
            break;
          default:
            setError('Status da conta inválido');
        }
      }
    } catch (error: unknown) {
      setError(error.message || 'Erro ao fazer login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <title>Login - Live Shop Analytics</title>

      <main className="min-h-screen flex items-center justify-center bg-background py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-foreground">
              Faça login na sua conta
            </h2>
            <p className="mt-2 text-center text-sm text-muted-foreground">
              Ou{' '}
              <Link to="/auth/signup" className="font-medium text-primary hover:text-primary/80">
                crie uma nova conta
              </Link>
            </p>
          </div>

          <form className="mt-8 space-y-6" onSubmit={handleSignIn}>
            <div className="space-y-4">
              <div>
                <label htmlFor="email" className="sr-only">
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="relative block w-full appearance-none rounded-md border border-input bg-background px-3 py-2 text-foreground placeholder-muted-foreground focus:z-10 focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 sm:text-sm"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              
              <div>
                <label htmlFor="password" className="sr-only">
                  Senha
                </label>
                <PasswordInput
                  id="password"
                  name="password"
                  autoComplete="current-password"
                  required
                  className="relative block w-full appearance-none rounded-md border border-input bg-background px-3 py-2 text-foreground placeholder-muted-foreground focus:z-10 focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 sm:text-sm"
                  placeholder="Senha"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            {error && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            <div>
              <Button
                type="submit"
                disabled={loading}
                variant="primary"
                className="w-full"
              >
                {loading ? 'Entrando...' : 'Entrar'}
              </Button>
            </div>
          </form>
        </div>
      </main>
    </>
  );
}