// Componente de teste para validar funcionalidade de públicos
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  fetchPublicAudiences, 
  createPublicAudience, 
  deletePublicAudience,
  generateAudienceCorrelation 
} from '@/utils/audienceService';
import { PublicAudience } from '@/types/audience';

interface AudienceTestComponentProps {
  liveId: string;
  metaIntegration?: {
    account_id: string;
    access_token: string;
  };
}

export function AudienceTestComponent({ liveId, metaIntegration }: AudienceTestComponentProps) {
  const [audiences, setAudiences] = useState<PublicAudience[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [testResults, setTestResults] = useState<string[]>([]);

  const addTestResult = (message: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const testFetchAudiences = async () => {
    setIsLoading(true);
    try {
      const fetchedAudiences = await fetchPublicAudiences(liveId);
      setAudiences(fetchedAudiences);
      addTestResult(`✅ Buscou ${fetchedAudiences.length} públicos com sucesso`);
    } catch (error) {
      addTestResult(`❌ Erro ao buscar públicos: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const testCreateAudience = async () => {
    setIsLoading(true);
    try {
      const newAudience = await createPublicAudience(liveId, {
        title: `Teste ${Date.now()}`,
        campaign_term: 'TESTE',
        emoji: '🧪'
      });
      setAudiences(prev => [newAudience, ...prev]);
      addTestResult(`✅ Criou público "${newAudience.title}" com sucesso`);
    } catch (error) {
      addTestResult(`❌ Erro ao criar público: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const testDeleteAudience = async (audienceId: string) => {
    setIsLoading(true);
    try {
      await deletePublicAudience(audienceId);
      setAudiences(prev => prev.filter(a => a.id !== audienceId));
      addTestResult(`✅ Deletou público com ID ${audienceId} com sucesso`);
    } catch (error) {
      addTestResult(`❌ Erro ao deletar público: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const testGenerateCorrelation = async (audience: PublicAudience) => {
    if (!metaIntegration) {
      addTestResult(`❌ Meta integration não disponível para teste de correlação`);
      return;
    }

    setIsLoading(true);
    try {
      const correlation = await generateAudienceCorrelation(
        audience,
        metaIntegration.account_id,
        metaIntegration.access_token,
        {
          since: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          until: new Date().toISOString().split('T')[0]
        }
      );
      addTestResult(`✅ Gerou correlação para "${audience.title}": ${correlation.campaigns.length} campanhas, ${correlation.groups.length} grupos`);
    } catch (error) {
      addTestResult(`❌ Erro ao gerar correlação: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const clearTestResults = () => {
    setTestResults([]);
  };

  return (
    <Card className="w-full max-w-4xl">
      <CardHeader>
        <CardTitle>🧪 Teste de Funcionalidade de Públicos</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Botões de teste */}
        <div className="flex flex-wrap gap-2">
          <Button onClick={testFetchAudiences} disabled={isLoading}>
            Buscar Públicos
          </Button>
          <Button onClick={testCreateAudience} disabled={isLoading}>
            Criar Público Teste
          </Button>
          <Button onClick={clearTestResults} variant="outline">
            Limpar Logs
          </Button>
        </div>

        {/* Lista de públicos */}
        {audiences.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium">Públicos Encontrados:</h4>
            {audiences.map((audience) => (
              <div key={audience.id} className="flex items-center justify-between p-3 border rounded">
                <div className="flex items-center gap-3">
                  <Badge variant="secondary">
                    {audience.emoji} {audience.title}
                  </Badge>
                  <code className="text-sm bg-muted px-2 py-1 rounded">
                    {audience.campaign_term}
                  </code>
                </div>
                <div className="flex gap-2">
                  {metaIntegration && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => testGenerateCorrelation(audience)}
                      disabled={isLoading}
                    >
                      Testar Correlação
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => testDeleteAudience(audience.id)}
                    disabled={isLoading}
                  >
                    Deletar
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Logs de teste */}
        {testResults.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium">Logs de Teste:</h4>
            <div className="max-h-64 overflow-y-auto space-y-1">
              {testResults.map((result, index) => (
                <div key={index} className="text-sm font-mono p-2 bg-muted/50 rounded">
                  {result}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Status da integração Meta */}
        <div className="p-3 border rounded">
          <h4 className="font-medium mb-2">Status da Integração Meta:</h4>
          {metaIntegration ? (
            <div className="text-sm space-y-1">
              <div>✅ Account ID: {metaIntegration.account_id}</div>
              <div>✅ Access Token: {metaIntegration.access_token.substring(0, 20)}...</div>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">
              ❌ Meta integration não disponível
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
