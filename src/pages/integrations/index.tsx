import { Button } from '@/components/ui/button';
import { DemoBanner } from '@/components/DemoBanner';
import { QRCodeDisplay } from '@/components/QRCodeDisplay';
import { useWhatsAppConnection } from '@/hooks/useWhatsAppConnection';
import { supabase } from '@/lib/supabase';
import { DEMO_MODE } from '@/lib/demo-mode';
import { Link, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { MessageSquare, Facebook, BarChart3, Settings } from 'lucide-react';

export default function Integrations() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [showQRModal, setShowQRModal] = useState(false);
  const [qrAttempts, setQrAttempts] = useState(0);
  const [qrCountdown, setQrCountdown] = useState(50);

  const {
    currentInstance,
    connectionState,
    qrCode,
    isLoading,
    error,
    connect,
    disconnect,
    generateQR,
    refreshInstances
  } = useWhatsAppConnection();

  useEffect(() => {
    // Check if user is authenticated
    const checkAuth = async () => {
      try {
        if (DEMO_MODE) {
          // Modo demo - pular autenticação
          setLoading(false);
          return;
        }

        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) {
          navigate('/auth/signin');
          return;
        }
      } catch (error) {
        console.error('Error checking auth:', error);
        if (!DEMO_MODE) {
          navigate('/auth/signin');
        }
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [navigate]);

  // QR Code countdown timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (showQRModal && connectionState === 'pending-qr' && qrCountdown > 0) {
      interval = setInterval(() => {
        setQrCountdown(prev => {
          if (prev <= 1) {
            setShowQRModal(false);
            return 50;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [showQRModal, connectionState, qrCountdown]);

  // Reset countdown when QR is generated
  useEffect(() => {
    if (connectionState === 'pending-qr' && qrCode) {
      setQrCountdown(50);
    }
  }, [connectionState, qrCode]);

  const handleConnectWhatsApp = async () => {
    try {
      await connect();
      setShowQRModal(true);
      setQrAttempts(prev => prev + 1);
    } catch (error) {
      console.error('Error connecting WhatsApp:', error);
    }
  };

  const handleRefreshQR = async () => {
    try {
      await generateQR();
      setQrAttempts(prev => prev + 1);
      setQrCountdown(50);
    } catch (error) {
      console.error('Error refreshing QR:', error);
    }
  };

  const handleCloseQRModal = () => {
    setShowQRModal(false);
    setQrCountdown(50);
  };

  const handleDisconnectWhatsApp = async () => {
    try {
      await disconnect();
    } catch (error) {
      console.error('Error disconnecting WhatsApp:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  const getWhatsAppStatus = () => {
    switch (connectionState) {
      case 'connected':
        return { text: 'Conectado', color: 'text-green-600', bgColor: 'bg-green-100' };
      case 'connecting':
      case 'pending-qr':
        return { text: 'Conectando...', color: 'text-yellow-600', bgColor: 'bg-yellow-100' };
      case 'error':
        return { text: 'Erro', color: 'text-red-600', bgColor: 'bg-red-100' };
      default:
        return { text: 'Desconectado', color: 'text-gray-600', bgColor: 'bg-gray-100' };
    }
  };

  const whatsappStatus = getWhatsAppStatus();

  return (
    <>
      <title>Integrações - Live Shop Analytics</title>

      <main className="min-h-screen bg-gray-50">
        <DemoBanner />
        {/* Navigation */}
        <nav className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex items-center">
                <Link to="/" className="text-xl font-bold text-gray-900">
                  Live Shop Analytics
                </Link>
              </div>
              <div className="flex items-center space-x-4">
                <Link to="/dashboard">
                  <Button variant="outline">Dashboard</Button>
                </Link>
              </div>
            </div>
          </div>
        </nav>

        <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Integrações</h1>
            <p className="text-gray-600">
              Configure e gerencie suas integrações com WhatsApp, Meta Ads e outras plataformas
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* WhatsApp Integration */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center mb-4">
                <div className="p-2 bg-green-100 rounded-lg mr-3">
                  <MessageSquare className="h-6 w-6 text-green-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-gray-900">WhatsApp Business</h3>
                  <div className="flex items-center mt-1">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${whatsappStatus.bgColor} ${whatsappStatus.color}`}>
                      {whatsappStatus.text}
                    </span>
                  </div>
                </div>
              </div>

              <p className="text-gray-600 mb-4">
                Conecte sua conta do WhatsApp Business para automatizar mensagens e acompanhar conversões
              </p>

              {currentInstance?.instance_name && (
                <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600">
                    <strong>Instância:</strong> {currentInstance.instance_name}
                  </p>
                  {currentInstance.phone_number && (
                    <p className="text-sm text-gray-600">
                      <strong>Telefone:</strong> {currentInstance.phone_number}
                    </p>
                  )}
                </div>
              )}

              {connectionState === 'connected' ? (
                <div className="space-y-3">
                  <Button 
                    onClick={handleDisconnectWhatsApp} 
                    variant="destructive" 
                    className="w-full"
                    disabled={isLoading}
                  >
                    {isLoading ? 'Desconectando...' : 'Desconectar WhatsApp'}
                  </Button>
                  <Button variant="outline" className="w-full">
                    Configurações Avançadas
                  </Button>
                </div>
              ) : (
                <Button 
                  onClick={handleConnectWhatsApp} 
                  className="w-full"
                  disabled={isLoading || connectionState === 'connecting'}
                >
                  {isLoading || connectionState === 'connecting' 
                    ? 'Conectando...' 
                    : 'Conectar WhatsApp'
                  }
                </Button>
              )}

              {error && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}
            </div>

            {/* Meta Ads Integration */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center mb-4">
                <div className="p-2 bg-blue-100 rounded-lg mr-3">
                  <Facebook className="h-6 w-6 text-blue-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-gray-900">Meta Ads</h3>
                  <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                    Em breve
                  </span>
                </div>
              </div>

              <p className="text-gray-600 mb-4">
                Sincronize dados de campanhas do Facebook e Instagram Ads para análise unificada
              </p>

              <Button disabled variant="outline" className="w-full">
                Em desenvolvimento
              </Button>
            </div>

            {/* Analytics Integration */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center mb-4">
                <div className="p-2 bg-purple-100 rounded-lg mr-3">
                  <BarChart3 className="h-6 w-6 text-purple-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-gray-900">Analytics Avançado</h3>
                  <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-600">
                    Disponível
                  </span>
                </div>
              </div>

              <p className="text-gray-600 mb-4">
                Configurações avançadas para rastreamento e análise de dados
              </p>

              <Link to="/analytics/settings">
                <Button variant="outline" className="w-full">
                  Configurar Analytics
                </Button>
              </Link>
            </div>

            {/* General Settings */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center mb-4">
                <div className="p-2 bg-gray-100 rounded-lg mr-3">
                  <Settings className="h-6 w-6 text-gray-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-gray-900">Configurações Gerais</h3>
                </div>
              </div>

              <p className="text-gray-600 mb-4">
                Configure preferências gerais do sistema e notificações
              </p>

              <Link to="/settings">
                <Button variant="outline" className="w-full">
                  Acessar Configurações
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* QR Code Modal */}
        {showQRModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-md w-full">
              <div className="p-4 border-b">
                <h3 className="text-lg font-semibold">Conectar WhatsApp</h3>
              </div>
              
              <QRCodeDisplay
                qrCode={qrCode}
                status={connectionState === 'connected' ? 'connected' : 
                       connectionState === 'pending-qr' ? 'active' :
                       connectionState === 'connecting' ? 'generating' :
                       connectionState === 'error' ? 'error' : 'generating'}
                countdown={qrCountdown}
                attempts={qrAttempts}
                maxAttempts={3}
                isLoading={isLoading}
                error={error}
                onRefresh={handleRefreshQR}
                onCancel={handleCloseQRModal}
              />
            </div>
          </div>
        )}
      </main>
    </>
  );
}