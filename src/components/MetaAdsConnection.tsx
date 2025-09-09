/**
 * Componente para conectar/gerenciar contas Meta Ads
 * Baseado no padrão do QRCodeDisplay
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Facebook, 
  Instagram, 
  RefreshCw, 
  Settings, 
  Trash2, 
  AlertTriangle,
  CheckCircle,
  Clock,
  TrendingUp
} from 'lucide-react';
import { useMetaAds } from '@/hooks/useMetaAds';

interface MetaAdsConnectionProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MetaAdsConnection = ({ isOpen, onClose }: MetaAdsConnectionProps) => {
  const [accessToken, setAccessToken] = useState('');
  const [showTokenInput, setShowTokenInput] = useState(false);
  
  const {
    data,
    isLoading,
    isConnected,
    isSyncing,
    error,
    lastSyncAt,
    connectAccount,
    disconnectAccount,
    syncData,
    refreshData
  } = useMetaAds();
  
  const handleConnect = async () => {
    if (!accessToken.trim()) return;
    
    try {
      await connectAccount(accessToken);
      setAccessToken('');
      setShowTokenInput(false);
    } catch (err) {
      console.error('Connection error:', err);
    }
  };
  
  const handleSync = async (accountId?: string) => {
    await syncData(accountId);
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
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
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
                    Cole seu token de acesso do Facebook Developer para importar dados de campanhas
                  </p>
                  
                  {!showTokenInput ? (
                    <Button 
                      onClick={() => setShowTokenInput(true)}
                      className="gap-2"
                    >
                      <Facebook className="h-4 w-4" />
                      Conectar Meta Ads
                    </Button>
                  ) : (
                    <div className="max-w-md mx-auto space-y-4">
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
                          disabled={!accessToken.trim() || isLoading}
                          className="flex-1"
                        >
                          {isLoading ? 'Conectando...' : 'Conectar'}
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
              ) : (
                <div className="space-y-4">
                  {/* Connected Accounts */}
                  <div className="grid gap-4">
                    {data.accounts.map((account) => (
                      <div key={account.ad_account_id} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-semibold">{account.account_name}</h4>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">
                              {account.currency}
                            </Badge>
                            <Button
                              onClick={() => handleSync(account.ad_account_id)}
                              disabled={isSyncing}
                              size="sm"
                              variant="outline"
                            >
                              <RefreshCw className={`h-3 w-3 ${isSyncing ? 'animate-spin' : ''}`} />
                            </Button>
                            <Button
                              onClick={() => disconnectAccount(account.ad_account_id)}
                              size="sm"
                              variant="outline"
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                        
                        <div className="text-sm text-gray-600">
                          <p>ID: {account.ad_account_id}</p>
                          <p>Timezone: {account.timezone_name}</p>
                          {lastSyncAt && (
                            <p className="flex items-center gap-1 mt-1">
                              <Clock className="h-3 w-3" />
                              Última sincronização: {formatDate(lastSyncAt.toISOString())}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {/* Quick Stats */}
                  {data.campaigns.length > 0 && (
                    <div className="grid grid-cols-3 gap-4 pt-4 border-t">
                      <div className="text-center">
                        <div className="text-2xl font-bold">{data.campaigns.length}</div>
                        <div className="text-sm text-gray-600">Campanhas</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold">
                          {data.insights.reduce((sum, insight) => sum + insight.impressions, 0).toLocaleString()}
                        </div>
                        <div className="text-sm text-gray-600">Impressões</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold">
                          {formatCurrency(data.insights.reduce((sum, insight) => sum + insight.spend, 0))}
                        </div>
                        <div className="text-sm text-gray-600">Investimento</div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Recent Campaigns */}
          {isConnected && data.campaigns.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Campanhas Recentes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {data.campaigns.slice(0, 5).map((campaign) => (
                    <div key={campaign.campaign_id} className="flex items-center justify-between py-2 border-b last:border-b-0">
                      <div>
                        <div className="font-medium">{campaign.name}</div>
                        <div className="text-sm text-gray-600">
                          {campaign.objective} • {campaign.status}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">
                          {campaign.daily_budget 
                            ? formatCurrency(campaign.daily_budget)
                            : campaign.lifetime_budget 
                              ? `${formatCurrency(campaign.lifetime_budget)} total`
                              : 'N/A'
                          }
                        </div>
                        <div className="text-xs text-gray-500">
                          {formatDate(campaign.created_time)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
          
          {/* Sync Logs */}
          {isConnected && data.logs.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Histórico de Sincronização</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {data.logs.slice(0, 3).map((log, index) => (
                    <div key={index} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        {log.status === 'success' ? (
                          <CheckCircle className="h-3 w-3 text-green-600" />
                        ) : (
                          <AlertTriangle className="h-3 w-3 text-red-600" />
                        )}
                        <span>{log.sync_type}</span>
                      </div>
                      <div className="text-gray-600">
                        {log.records_processed} registros • {formatDate(log.created_at)}
                      </div>
                    </div>
                  ))}
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
              <div className="flex gap-2">
                <Button 
                  onClick={() => refreshData()}
                  variant="outline"
                  disabled={isLoading}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                  Atualizar
                </Button>
                
                <Button 
                  onClick={() => syncData()}
                  disabled={isSyncing}
                >
                  {isSyncing ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Sincronizando...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Sincronizar Tudo
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};