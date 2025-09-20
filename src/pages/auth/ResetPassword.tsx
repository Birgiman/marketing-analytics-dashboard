import { Button } from '@/components/ui/button';
import { PasswordInput } from '@/components/ui/password-input';
import { supabase } from '@/integrations/supabase/client';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';

export default function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

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
      'Password reset email rate limit exceeded': 'Muitas tentativas de recuperação. Tente novamente em alguns minutos',
      'New password should be different from the old password': 'A nova senha deve ser diferente da senha atual'
    };

    return errorTranslations[errorMessage] || errorMessage;
  };

  useEffect(() => {
    // Verifica se há um token de reset válido na URL
    const accessToken = searchParams.get('access_token');
    const refreshToken = searchParams.get('refresh_token');
    
    if (!accessToken || !refreshToken) {
      setError('Link de recuperação inválido ou expirado');
      return;
    }

    // Define a sessão com os tokens
    supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
  }, [searchParams]);

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (password !== confirmPassword) {
      setError('As senhas não coincidem');
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres');
      setLoading(false);
      return;
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) {
        setError(translateError(error.message));
        return;
      }

      setSuccess(true);
      
      // Redireciona para o login após 3 segundos
      setTimeout(() => {
        navigate('/auth/signin');
      }, 3000);

    } catch (error: unknown) {
      setError(error.message || 'Erro ao atualizar senha');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <>
        <title>Senha Atualizada - Live Shop Analytics</title>
        
        <main className="min-h-screen flex items-center justify-center bg-background py-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-md w-full space-y-8">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
                <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="mt-6 text-center text-3xl font-extrabold text-foreground">
                Senha Atualizada!
              </h2>
              <p className="mt-2 text-center text-sm text-muted-foreground">
                Sua senha foi alterada com sucesso. Você será redirecionado para o login em alguns segundos.
              </p>
              <div className="mt-6">
                <Link to="/auth/signin">
                  <Button variant="primary" className="w-full">
                    Ir para Login
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <title>Nova Senha - Live Shop Analytics</title>

      <main className="min-h-screen flex items-center justify-center bg-background py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-foreground">
              Definir Nova Senha
            </h2>
            <p className="mt-2 text-center text-sm text-muted-foreground">
              Digite sua nova senha abaixo
            </p>
          </div>

          <form className="mt-8 space-y-6" onSubmit={handlePasswordReset}>
            <div className="space-y-4">
              <div>
                <label htmlFor="password" className="sr-only">
                  Nova Senha
                </label>
                <PasswordInput
                  id="password"
                  name="password"
                  autoComplete="new-password"
                  required
                  className="relative block w-full appearance-none rounded-md border border-input bg-background px-3 py-2 text-foreground placeholder-muted-foreground focus:z-10 focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 sm:text-sm"
                  placeholder="Nova senha"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              
              <div>
                <label htmlFor="confirm-password" className="sr-only">
                  Confirmar Senha
                </label>
                <PasswordInput
                  id="confirm-password"
                  name="confirm-password"
                  autoComplete="new-password"
                  required
                  className="relative block w-full appearance-none rounded-md border border-input bg-background px-3 py-2 text-foreground placeholder-muted-foreground focus:z-10 focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 sm:text-sm"
                  placeholder="Confirmar nova senha"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
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
                {loading ? 'Atualizando...' : 'Atualizar Senha'}
              </Button>
            </div>
          </form>

          <div className="text-center">
            <Link to="/auth/signin" className="text-sm text-primary hover:text-primary/80 font-medium">
              Voltar para o Login
            </Link>
          </div>
        </div>
      </main>
    </>
  );
}
