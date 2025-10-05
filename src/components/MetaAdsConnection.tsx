/**
 * Componente para conectar/gerenciar contas Meta Ads
 * Baseado no padrão do QRCodeDisplay
 */

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useMetaIntegration } from '@/hooks/useMetaIntegration';
import { facebookOAuthService } from '@/services/facebookOAuthService';
import {
    AlertTriangle,
    CheckCircle,
    Clock,
    Facebook,
    Instagram,
    RefreshCw,
    Settings,
    Trash2,
    TrendingUp
} from 'lucide-react';
import { useState } from 'react';

interface MetaAdsConnectionProps {
  isOpen: boolean;
  onClose: () => void;
  onConnectionSuccess?: () => void;
}

export const MetaAdsConnection = ({ isOpen, onClose, onConnectionSuccess }: MetaAdsConnectionProps) => {
  const [accessToken, setAccessToken] = useState('');
  const [showTokenInput, setShowTokenInput] = useState(false);
  
  const {
    integration,
    isLoading,
    isConnected,
    isValidating,
    error,
    connectWithToken,
    disconnect,
    validateConnection,
    clearError
  } = useMetaIntegration();
  
  const handleConnect = async () => {
    if (!accessToken.trim()) return;
    
    try {
      await connectWithToken(accessToken);
      setAccessToken('');
      setShowTokenInput(false);
      
      // Notificar sucesso
      if (onConnectionSuccess) {
        onConnectionSuccess();
      }
    } catch (err) {
    }
  };

  const handleFacebookOAuth = async () => {
    // Use the existing setIsValidating and clearError from the hook
    try {
      const result = await facebookOAuthService.startOAuthFlow();

      if (result.success && result.accessToken) {
        await connectWithToken(result.accessToken);
        
        // Notificar sucesso
        if (onConnectionSuccess) {
          onConnectionSuccess();
        }
      } else {
        // Error will be handled by the hook
      }
    } catch (err: unknown) {
    }
  };
  
  const handleValidate = async () => {
    await validateConnection();
  };
  
  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(cents / 100);
  };
  
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR');
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[850px] overflow-y-auto flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Facebook className="h-5 w-5 text-blue-600" />
            <Instagram className="h-5 w-5 text-pink-600" />
            Integração Meta Ads
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Error Display */}
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          {/* Connection Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Status da Conexão</span>
                {isConnected && (
                  <Badge variant="secondary" className="bg-green-100 text-green-800">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Conectado
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!isConnected ? (
                <div className="text-center py-8">
                  <Facebook className="h-16 w-16 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-semibold mb-2">
                    Conecte sua conta Meta Ads
                  </h3>
                  <p className="text-gray-600 mb-6">
                    Cole seu token de acesso do Meta para conectar sua conta
                  </p>
                  
                  {/* OAuth Option - Commented until Meta approves
                  <div className="max-w-md mx-auto space-y-4 mb-6">
                    <div className="border rounded-lg p-4 bg-blue-50">
                      <h4 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                        <Facebook className="h-4 w-4" />
                        Conectar com Facebook (Recomendado)
                      </h4>
                      <p className="text-sm text-blue-700 mb-3">
                        Login automático e seguro via Facebook
                      </p>
                      <Button 
                        onClick={handleFacebookOAuth}
                        disabled={isValidating}
                        className="w-full bg-blue-600 hover:bg-blue-700"
                      >
                        {isValidating ? (
                          <div className="flex items-center gap-2">
                            <RefreshCw className="h-4 w-4 animate-spin" />
                            Conectando...
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <Facebook className="h-4 w-4" />
                            Entrar com Facebook
                          </div>
                        )}
                      </Button>
                    </div>
                  </div>
                  */}

                  {/* Manual Token Option */}
                  <div className="max-w-md mx-auto">
                    <div className="pt-4">
                      <p className="text-sm text-gray-500 mb-3">Cole seu token manualmente:</p>
                      
                      {!showTokenInput ? (
                        <Button 
                          onClick={() => setShowTokenInput(true)}
                          variant="outline"
                          className="gap-2"
                        >
                          <Settings className="h-4 w-4" />
                          Cole seu token manualmente
                        </Button>
                      ) : (
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="token">Access Token</Label>
                            <Input
                              id="token"
                              placeholder="Seu token de acesso do Meta..."
                              value={accessToken}
                              onChange={(e) => setAccessToken(e.target.value)}
                              className="mt-1"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                              Obtenha seu token em: developers.facebook.com/tools/explorer
                            </p>
                          </div>
                          
                          <div className="flex gap-2">
                            <Button 
                              onClick={handleConnect}
                              disabled={!accessToken.trim() || isValidating}
                              className="flex-1"
                            >
                              {isValidating ? 'Validando...' : 'Conectar'}
                            </Button>
                            <Button 
                              onClick={() => {
                                setShowTokenInput(false);
                                setAccessToken('');
                              }}
                              variant="outline"
                            >
                              Cancelar
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Connected Integration */}
                  <div className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold">Meta Ads - Integração Ativa</h4>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">
                          {integration?.account_count} contas
                        </Badge>
                        <Button
                          onClick={handleValidate}
                          disabled={isValidating}
                          size="sm"
                          variant="outline"
                        >
                          <RefreshCw className={`h-3 w-3 ${isValidating ? 'animate-spin' : ''}`} />
                        </Button>
                        <Button
                          onClick={disconnect}
                          size="sm"
                          variant="outline"
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    
                    <div className="text-sm text-gray-600">
                      <p>Conectado em: {integration ? formatDate(integration.connected_at) : '-'}</p>
                      {integration?.last_validated_at && (
                        <p className="flex items-center gap-1 mt-1">
                          <Clock className="h-3 w-3" />
                          Última validação: {formatDate(integration.last_validated_at)}
                        </p>
                      )}
                      <p className="text-xs mt-2 text-blue-600">
                        💡 Use esta integração para vincular campanhas às suas Lives
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Info Card */}
          {isConnected && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Próximos Passos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm">
                  <div className="flex items-start gap-2">
                    <div className="w-2 h-2 rounded-full bg-blue-500 mt-2"></div>
                    <div>
                      <p className="font-medium">Vincular Campanhas às Lives</p>
                      <p className="text-gray-600">Acesse "Lives" para conectar campanhas específicas e monitorar performance.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500 mt-2"></div>
                    <div>
                      <p className="font-medium">Analytics Integrado</p>
                      <p className="text-gray-600">Veja métricas de anúncios junto com dados do WhatsApp.</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
          
          {/* Actions */}
          <div className="flex justify-between pt-4 border-t">
            <Button onClick={onClose} variant="outline">
              Fechar
            </Button>
            
            {isConnected && (
              <Button 
                onClick={handleValidate}
                variant="outline"
                disabled={isValidating}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isValidating ? 'animate-spin' : ''}`} />
                Validar Conexão
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};