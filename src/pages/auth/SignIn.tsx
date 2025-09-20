import { Button } from '@/components/ui/button';
import { PasswordInput } from '@/components/ui/password-input';
import { supabase } from '@/integrations/supabase/client';
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

export default function SignIn() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [showResetForm, setShowResetForm] = useState(false);
  const [resetMessage, setResetMessage] = useState<string | null>(null);

  const [error, setError] = useState<string | null>(null);

  // Função para traduzir erros do Supabase
  const translateError = (errorMessage: string): string => {
    const errorTranslations: { [key: string]: string } = {
      'Invalid login credentials': 'Email ou senha incorretos',
      'Email not confirmed': 'Email não confirmado',
      'User not found': 'Usuário não encontrado',
      'Invalid email': 'Email inválido',
      'Password should be at least 6 characters': 'A senha deve ter pelo menos 6 caracteres',
      'Unable to validate email address: invalid format': 'Formato de email inválido',
      'Signup requires a valid password': 'É necessário uma senha válida',
      'User already registered': 'Usuário já cadastrado',
      'Email rate limit exceeded': 'Muitas tentativas. Tente novamente em alguns minutos',
      'Password reset requires a valid email': 'Email inválido para recuperação de senha',
      'Password reset email rate limit exceeded': 'Muitas tentativas de recuperação. Tente novamente em alguns minutos'
    };

    return errorTranslations[errorMessage] || errorMessage;
  };

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
        setError(translateError(error.message));
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

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetLoading(true);
    setResetMessage(null);
    setError(null);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });

      if (error) {
        setError(translateError(error.message));
        return;
      }

      setResetMessage('Email de recuperação enviado! Verifique sua caixa de entrada.');
      setShowResetForm(false);
      setResetEmail('');
    } catch (error: unknown) {
      setError(error.message || 'Erro ao enviar email de recuperação');
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="relative">
      <title>Login - Live Shop Analytics</title>

      <main className="min-h-screen flex items-center justify-center bg-background py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-sm w-full space-y-8">
          <div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-foreground leading-tight">
              Faça login no<br />
              LiveShop Analytics
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

            {resetMessage && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                <p className="text-sm text-green-800">{resetMessage}</p>
              </div>
            )}

            <div className="space-y-3">
              <Button
                type="submit"
                disabled={loading}
                variant="primary"
                className="w-full"
              >
                {loading ? 'Entrando...' : 'Entrar'}
              </Button>
              
              <div className="text-center">
                <button
                  type="button"
                  onClick={() => setShowResetForm(true)}
                  className="text-sm text-primary hover:text-primary/80 font-medium"
                >
                  Esqueci minha senha
                </button>
              </div>
            </div>
          </form>

          {/* Modal de Reset de Senha */}
          {showResetForm && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4" style={{ top: 0, left: 0, right: 0, bottom: 0 }}>
              <div className="bg-background rounded-lg max-w-md w-full p-6">
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-foreground">Recuperar Senha</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Digite seu email para receber as instruções de recuperação
                  </p>
                </div>
                
                <form onSubmit={handlePasswordReset} className="space-y-4">
                  <div>
                    <label htmlFor="reset-email" className="sr-only">
                      Email
                    </label>
                    <input
                      id="reset-email"
                      name="reset-email"
                      type="email"
                      autoComplete="email"
                      required
                      className="relative block w-full appearance-none rounded-md border border-input bg-background px-3 py-2 text-foreground placeholder-muted-foreground focus:z-10 focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 sm:text-sm"
                      placeholder="Digite seu email"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                    />
                  </div>
                  
                  <div className="flex space-x-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setShowResetForm(false);
                        setResetEmail('');
                        setError(null);
                        setResetMessage(null);
                      }}
                      className="flex-1"
                    >
                      Cancelar
                    </Button>
                    <Button
                      type="submit"
                      disabled={resetLoading}
                      variant="primary"
                      className="flex-1"
                    >
                      {resetLoading ? 'Enviando...' : 'Enviar'}
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}