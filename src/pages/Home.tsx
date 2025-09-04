import { Button } from '@/components/ui/button';
import { DemoBanner } from '@/components/DemoBanner';
import { supabase } from '@/lib/supabase';
import { DEMO_MODE, DEMO_USER } from '@/lib/demo-mode';
import { User } from '@/types';
import { Link, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';

export default function Home() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is logged in
    const checkUser = async () => {
      try {
        if (DEMO_MODE) {
          // Modo demo - usuario sempre logado
          setUser(DEMO_USER as User);
          setLoading(false);
          return;
        }

        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setUser(session.user as User);
        }
      } catch (error) {
        console.error('Error checking user session:', error);
      } finally {
        setLoading(false);
      }
    };

    checkUser();

    if (!DEMO_MODE) {
      // Listen for auth changes apenas se não for modo demo
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        async (event, session) => {
          if (session?.user) {
            setUser(session.user as User);
          } else {
            setUser(null);
          }
          setLoading(false);
        }
      );

      return () => subscription.unsubscribe();
    }
  }, []);

  const handleSignOut = async () => {
    if (DEMO_MODE) {
      // No modo demo, apenas simular logout
      setUser(null);
      navigate('/');
    } else {
      await supabase.auth.signOut();
      navigate('/auth/signin');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <>
      <title>Live Shop Analytics</title>

      <main className="min-h-screen bg-gray-50">
        <DemoBanner />
        <nav className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex items-center">
                <h1 className="text-xl font-bold text-gray-900">
                  Live Shop Analytics
                </h1>
              </div>
              
              {user ? (
                <div className="flex items-center space-x-4">
                  <span className="text-gray-700">{user.email}</span>
                  <Button onClick={handleSignOut} variant="outline">
                    Sign Out
                  </Button>
                </div>
              ) : (
                <div className="flex items-center space-x-4">
                  <Link to="/auth/signin">
                    <Button variant="outline">Sign In</Button>
                  </Link>
                  <Link to="/auth/signup">
                    <Button>Sign Up</Button>
                  </Link>
                </div>
              )}
            </div>
          </div>
        </nav>

        <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
          {user ? (
            <div>
              <div className="text-center mb-12">
                <h2 className="text-3xl font-bold text-gray-900 mb-4">
                  Bem-vindo ao Live Shop Analytics
                </h2>
                <p className="text-xl text-gray-600">
                  Sistema de analytics para LiveShop com integração WhatsApp e Meta Ads
                </p>
              </div>

              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                {/* Dashboard Card */}
                <div className="bg-white rounded-lg shadow-md p-6">
                  <h3 className="text-xl font-semibold mb-4">Dashboard</h3>
                  <p className="text-gray-600 mb-4">
                    Visualize métricas e análises em tempo real
                  </p>
                  <Link to="/dashboard">
                    <Button className="w-full">
                      Acessar Dashboard
                    </Button>
                  </Link>
                </div>

                {/* Analytics Card */}
                <div className="bg-white rounded-lg shadow-md p-6">
                  <h3 className="text-xl font-semibold mb-4">Analytics</h3>
                  <p className="text-gray-600 mb-4">
                    Análise detalhada de desempenho e conversões
                  </p>
                  <Link to="/analytics">
                    <Button className="w-full">
                      Ver Analytics
                    </Button>
                  </Link>
                </div>

                {/* Integrations Card */}
                <div className="bg-white rounded-lg shadow-md p-6">
                  <h3 className="text-xl font-semibold mb-4">Integrações</h3>
                  <p className="text-gray-600 mb-4">
                    Configure WhatsApp, Meta Ads e outras integrações
                  </p>
                  <Link to="/integrations">
                    <Button className="w-full">
                      Configurar
                    </Button>
                  </Link>
                </div>

                {/* Lives Card */}
                <div className="bg-white rounded-lg shadow-md p-6">
                  <h3 className="text-xl font-semibold mb-4">Lives</h3>
                  <p className="text-gray-600 mb-4">
                    Gerencie e monitore suas lives
                  </p>
                  <Link to="/lives">
                    <Button className="w-full">
                      Gerenciar Lives
                    </Button>
                  </Link>
                </div>

                {/* Creative Management Card */}
                <div className="bg-white rounded-lg shadow-md p-6">
                  <h3 className="text-xl font-semibold mb-4">Criativos</h3>
                  <p className="text-gray-600 mb-4">
                    Analise performance dos seus criativos
                  </p>
                  <Link to="/creatives">
                    <Button className="w-full">
                      Ver Criativos
                    </Button>
                  </Link>
                </div>

                {/* Groups Management Card */}
                <div className="bg-white rounded-lg shadow-md p-6">
                  <h3 className="text-xl font-semibold mb-4">Grupos</h3>
                  <p className="text-gray-600 mb-4">
                    Monitore atividades nos grupos WhatsApp
                  </p>
                  <Link to="/groups">
                    <Button className="w-full">
                      Ver Grupos
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                Live Shop Analytics
              </h2>
              <p className="text-xl text-gray-600 mb-8">
                Faça login para acessar seu dashboard de analytics
              </p>
              <div className="space-x-4">
                <Link to="/auth/signin">
                  <Button size="lg">
                    Fazer Login
                  </Button>
                </Link>
                <Link to="/auth/signup">
                  <Button variant="outline" size="lg">
                    Criar Conta
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </div>
      </main>
    </>
  );
}