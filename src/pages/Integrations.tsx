import Header from '@/components/Header';
import { MetaAdsConnection } from '@/components/MetaAdsConnection';
import { QRCodeDisplay } from '@/components/QRCodeDisplay';
import { Button } from '@/components/ui/button';
import { WhatsAppAdvancedSettingsWrapper } from '@/components/WhatsAppAdvancedSettingsWrapper';
import { useMetaAds } from '@/hooks/useMetaAds';
import { useWhatsAppConnection } from '@/hooks/useWhatsAppConnection';
import { supabase } from '@/integrations/supabase/client';
import { DEMO_MODE } from '@/lib/demo-mode';
import { Facebook, MessageSquare } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Integrations() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [showQRModal, setShowQRModal] = useState(false);
  const [qrAttempts, setQrAttempts] = useState(0);
  const [qrCountdown, setQrCountdown] = useState(50);
  const [showMetaAdsModal, setShowMetaAdsModal] = useState(false);

  const {
    currentInstance,
    connectionState,
    qrCode,
    isLoading,
    isSyncing,
    error,
    connect,
    disconnect,
    generateQR,
    refreshInstances
  } = useWhatsAppConnection();

  const { 
    isConnected: metaAdsConnected,
    data: metaAdsData,
    disconnectIntegration: disconnectMetaAdsIntegration,
    refreshData: refreshMetaAdsData
  } = useMetaAds();

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

  const handleMetaAdsConnectionSuccess = () => {
    // Recarregar dados do Meta Ads quando conexão for bem-sucedida
    refreshMetaAdsData();
  };

  // Pre-fetch groups when WhatsApp is connected (background sync)
  const preloadGroups = async () => {
    if (!currentInstance?.instance_name) return;
    
    try {
      console.log('🔄 Pre-loading groups in background...');
      const { data: session } = await supabase.auth.getSession();
      if (!session.session?.user) return;

      await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/whatsapp-fetch-groups`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.session.access_token}`,
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY
        },
        body: JSON.stringify({
          instanceName: currentInstance.instance_name,
          userId: session.session.user.id
        })
      });
      
      console.log('✅ Groups pre-loaded successfully');
    } catch (error) {
      console.error('❌ Error pre-loading groups:', error);
    }
  };

  // Trigger group pre-loading when connection becomes active
  useEffect(() => {
    if (connectionState === 'connected' && currentInstance) {
      // Add a small delay to ensure connection is stable
      const timer = setTimeout(() => {
        preloadGroups();
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [connectionState, currentInstance]);

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
    <div className="flex flex-col h-screen bg-background">
      <Header />
      <div className="flex-1 p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Integrações</h1>
          <p className="text-gray-600">
            Configure e gerencie suas integrações com WhatsApp, Meta Ads e outras plataformas
          </p>
        </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* WhatsApp Integration */}
            <div className="bg-white rounded-lg shadow-md p-6 flex flex-col h-full">
              {isSyncing ? (
                // Loading state - mantém o mesmo tamanho da div
                <div className="flex flex-col items-center justify-center py-16">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mb-4"></div>
                  <p className="text-gray-600 text-sm">Verificando status do WhatsApp...</p>
                  <p className="text-gray-500 text-xs mt-1">Sincronizando com Evolution API</p>
                </div>
              ) : (
                // Conteúdo normal
                <>
                  {/* Header - Título e Status */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center">
                      <div className="p-2 bg-green-100 rounded-lg mr-3">
                        <MessageSquare className="h-6 w-6 text-green-600" />
                      </div>
                      <h3 className="text-xl font-semibold text-gray-900">WhatsApp Business</h3>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${whatsappStatus.bgColor} ${whatsappStatus.color}`}>
                      {whatsappStatus.text}
                    </span>
                  </div>

                  {/* Content - Descrição e Botão */}
                  <div className="flex flex-col justify-between flex-1">
                    <div>
                      <p className="text-gray-600 mb-4">
                        Conecte sua conta do WhatsApp Business para automatizar mensagens e acompanhar conversões
                      </p>

                      {currentInstance?.phone_number && (
                        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                          <p className="text-sm text-gray-600">
                            <strong>Telefone:</strong> {currentInstance.phone_number}
                          </p>
                        </div>
                      )}

                      {error && (
                        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                          <p className="text-sm text-red-600">{error}</p>
                        </div>
                      )}
                    </div>

                    {/* Botão na parte inferior */}
                    <div className="mt-auto">
                      {connectionState === 'connected' ? (
                        <Button 
                          onClick={handleDisconnectWhatsApp} 
                          variant="danger" 
                          className="w-full"
                          disabled={isLoading}
                        >
                          {isLoading ? 'Desconectando...' : 'Desconectar WhatsApp'}
                        </Button>
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
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Meta Ads Integration */}
            <div className="bg-white rounded-lg shadow-md p-6 flex flex-col h-full">
              {/* Header - Título e Status */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <div className="p-2 bg-blue-100 rounded-lg mr-3">
                    <Facebook className="h-6 w-6 text-blue-600" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900">Meta Ads</h3>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  metaAdsConnected 
                    ? 'bg-green-100 text-green-600' 
                    : 'bg-gray-100 text-gray-600'
                }`}>
                  {metaAdsConnected ? 'Conectado' : 'Desconectado'}
                </span>
              </div>

              {/* Content - Descrição e Botões */}
              <div className="flex flex-col justify-between flex-1">
                <div>
                  <p className="text-gray-600 mb-4">
                    Sincronize dados de campanhas do Facebook e Instagram Ads para análise unificada
                  </p>
                </div>

                {/* Botões na parte inferior */}
                <div className="mt-auto space-y-3">
                  <Button 
                    onClick={() => setShowMetaAdsModal(true)} 
                    variant={metaAdsConnected ? "outline" : "default"} 
                    className="w-full"
                  >
                    {metaAdsConnected ? 'Gerenciar Meta Ads' : 'Conectar Meta Ads'}
                  </Button>
                  
                  {metaAdsConnected && (
                    <Button 
                      onClick={disconnectMetaAdsIntegration} 
                      variant="danger" 
                      className="w-full"
                    >
                      Desconectar Meta Ads
                    </Button>
                  )}
                </div>
              </div>
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
                maxAttempts={10}
                isLoading={isLoading}
                error={error}
                onRefresh={handleRefreshQR}
                onCancel={handleCloseQRModal}
              />
            </div>
          </div>
        )}

        {/* Meta Ads Connection Modal */}
        <MetaAdsConnection 
          isOpen={showMetaAdsModal}
          onClose={() => setShowMetaAdsModal(false)}
          onConnectionSuccess={handleMetaAdsConnectionSuccess}
        />

        {/* Advanced Settings Component - Isolated for future use */}
        <WhatsAppAdvancedSettingsWrapper currentInstance={currentInstance} />
      </div>
  );
}
