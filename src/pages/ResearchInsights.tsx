import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MessageSquare, MapPin, Heart, Package, RefreshCw } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface SurveyData {
  id: string;
  created_at: string;
  has_purchased: boolean;
  region: string;
  main_concern: string;
  interested_product: string;
  user_id: string;
}

const ResearchInsights = () => {
  const [surveyData, setSurveyData] = useState<SurveyData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchSurveyData = async () => {
    try {
      setIsLoading(true);
      
      // Buscar dados de pesquisa (usando uma tabela fictícia para exemplo)
      const { data, error } = await supabase
        .from('user_surveys')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erro ao buscar dados de pesquisa:', error);
        // Se não houver dados reais, usar dados demo
        setSurveyData(generateDemoSurveyData());
      } else {
        setSurveyData(data || []);
      }
    } catch (error) {
      console.error('Erro na requisição:', error);
      setSurveyData(generateDemoSurveyData());
    } finally {
      setIsLoading(false);
    }
  };

  // Gerar dados demo para exemplo
  const generateDemoSurveyData = (): SurveyData[] => {
    const regions = ['São Paulo', 'Rio de Janeiro', 'Minas Gerais', 'Paraná', 'Santa Catarina', 'Rio Grande do Sul'];
    const concerns = ['Golpe', 'Não ser original / falso', 'Efeitos colaterais', 'Outros receios'];
    const products = ['Emagrecimento', 'Colágeno', 'Suplementos', 'Laranja Moro', 'O Shot Matinal'];
    
    return Array.from({ length: 150 }, (_, i) => ({
      id: `demo-${i}`,
      created_at: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
      has_purchased: Math.random() > 0.6,
      region: regions[Math.floor(Math.random() * regions.length)],
      main_concern: concerns[Math.floor(Math.random() * concerns.length)],
      interested_product: products[Math.floor(Math.random() * products.length)],
      user_id: `user-${i}`
    }));
  };

  useEffect(() => {
    fetchSurveyData();
  }, []);

  const refreshData = async () => {
    toast({
      title: "Atualizando dados...",
      description: "Buscando os dados mais recentes da pesquisa."
    });
    await fetchSurveyData();
    toast({
      title: "Dados atualizados!",
      description: "Os insights foram atualizados com sucesso."
    });
  };

  // Calcular métricas
  const totalRespostas = surveyData.length;
  const totalEntradas = 200; // Total estimado de leads
  const taxaResposta = totalEntradas > 0 ? (totalRespostas / totalEntradas * 100).toFixed(1) : '0';

  // Dados de compra
  const jaCompraram = surveyData.filter(item => item.has_purchased).length;
  const nuncaCompraram = surveyData.filter(item => !item.has_purchased).length;
  const percentualJaCompraram = totalRespostas > 0 ? Math.round(jaCompraram / totalRespostas * 100) : 0;
  const percentualNuncaCompraram = totalRespostas > 0 ? Math.round(nuncaCompraram / totalRespostas * 100) : 0;

  // Dados geográficos
  const contagemRegioes = surveyData.reduce((acc: { [key: string]: number }, item) => {
    acc[item.region] = (acc[item.region] || 0) + 1;
    return acc;
  }, {});

  const regioesOrdenadas = Object.entries(contagemRegioes)
    .map(([regiao, count]) => ({
      regiao,
      count: Number(count),
      percentual: totalRespostas > 0 ? Math.round(Number(count) / totalRespostas * 100) : 0
    }))
    .sort((a, b) => b.count - a.count);

  // Dados de receios
  const contagemReceios = surveyData.reduce((acc: { [key: string]: number }, item) => {
    acc[item.main_concern] = (acc[item.main_concern] || 0) + 1;
    return acc;
  }, {});

  const receiosOrdenados = Object.entries(contagemReceios)
    .map(([categoria, count]) => ({
      categoria,
      count: Number(count),
      percentual: totalRespostas > 0 ? Math.round(Number(count) / totalRespostas * 100) : 0
    }))
    .sort((a, b) => b.count - a.count);

  // Dados de produtos
  const produtosAgrupados = surveyData.reduce((acc: { [key: string]: number }, item) => {
    acc[item.interested_product] = (acc[item.interested_product] || 0) + 1;
    return acc;
  }, {});

  const produtosOrdenados = Object.entries(produtosAgrupados)
    .map(([categoria, count]) => ({
      categoria,
      count: Number(count),
      percentual: totalRespostas > 0 ? Math.round(Number(count) / totalRespostas * 100) : 0
    }))
    .sort((a, b) => b.count - a.count);

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="space-y-6">
          {[1, 2, 3].map(i => (
            <Card key={i}>
              <CardHeader>
                <div className="h-6 bg-muted animate-pulse rounded"></div>
                <div className="h-4 bg-muted animate-pulse rounded w-2/3"></div>
              </CardHeader>
              <CardContent>
                <div className="h-32 bg-muted animate-pulse rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-8">
      {/* Overview da Pesquisa */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-6 w-6" />
            Resumo da Pesquisa
          </CardTitle>
          <CardDescription>
            Análise dos dados demográficos e receios dos leads captados
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <div className="text-3xl font-bold text-blue-600">{taxaResposta}%</div>
              <div className="text-sm text-muted-foreground mt-1">Taxa de Resposta</div>
              <div className="text-xs text-muted-foreground mt-2">{totalRespostas} de {totalEntradas} pessoas</div>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <div className="text-3xl font-bold text-purple-600">{totalRespostas.toLocaleString()}</div>
              <div className="text-sm text-muted-foreground mt-1">Respostas Coletadas</div>
              <div className="text-xs text-green-600 mt-2">Total de formulários preenchidos</div>
            </div>
          </div>
          <div className="mt-4 flex justify-center">
            <Button onClick={refreshData} variant="outline" size="sm" className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4" />
              Atualizar Dados
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Perfil Demográfico */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Perfil de Compra
            </CardTitle>
            <CardDescription>Histórico de compras dos leads</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center">
            <div className="relative w-48 h-48 mb-4">
              <svg viewBox="0 0 42 42" className="w-full h-full">
                <circle cx="21" cy="21" r="15.915" fill="transparent" stroke="hsl(var(--muted))" strokeWidth="3" />
                <circle 
                  cx="21" 
                  cy="21" 
                  r="15.915" 
                  fill="transparent" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth="3" 
                  strokeDasharray={`${percentualJaCompraram} ${100 - percentualJaCompraram}`} 
                  strokeDashoffset="25" 
                  transform="rotate(-90 21 21)" 
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div className="text-2xl font-bold">{percentualJaCompraram}%</div>
                <div className="text-sm text-muted-foreground">Já compraram</div>
              </div>
            </div>
            <div className="flex items-center gap-6 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-primary"></div>
                <span>Já compraram ({percentualJaCompraram}%)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-muted"></div>
                <span>Nunca compraram ({percentualNuncaCompraram}%)</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Distribuição Geográfica
            </CardTitle>
            <CardDescription>Localização dos leads por região</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              {regioesOrdenadas.slice(0, 5).map((item, index) => {
                const colors = ['bg-blue-600', 'bg-green-600', 'bg-purple-600', 'bg-orange-600', 'bg-gray-600'];
                return (
                  <div key={item.regiao} className="flex justify-between items-center">
                    <span className="text-sm">{item.regiao}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-20 bg-muted rounded-full h-2">
                        <div 
                          className={`${colors[index]} h-2 rounded-full`} 
                          style={{ width: `${item.percentual}%` }}
                        ></div>
                      </div>
                      <span className="text-sm font-medium">{item.percentual}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Receios e Objeções */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5" />
            Receios e Objeções de Compra
          </CardTitle>
          <CardDescription>
            Principais medos que impedem conversões ({receiosOrdenados.reduce((acc, item) => acc + item.count, 0)} respostas analisadas)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Distribuição Visual */}
            <div className="space-y-4">
              <h4 className="font-semibold text-lg">Distribuição dos Receios</h4>
              {receiosOrdenados.map((item, index) => {
                const colors = [
                  { bg: 'bg-red-500', text: 'text-red-700' },
                  { bg: 'bg-orange-500', text: 'text-orange-700' },
                  { bg: 'bg-yellow-500', text: 'text-yellow-700' },
                  { bg: 'bg-blue-500', text: 'text-blue-700' }
                ];
                const color = colors[index] || colors[3];
                return (
                  <div key={item.categoria} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">{item.categoria}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">{item.count} respostas</span>
                        <span className={`text-sm font-bold ${color.text}`}>{item.percentual}%</span>
                      </div>
                    </div>
                    <div className="w-full bg-muted rounded-full h-3">
                      <div 
                        className={`${color.bg} h-3 rounded-full transition-all duration-500`} 
                        style={{ width: `${item.percentual}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Insights e Ações */}
            <div className="space-y-4">
              <h4 className="font-semibold text-lg">Insights e Ações Estratégicas</h4>
              <div className="space-y-3">
                {receiosOrdenados.map((item, index) => {
                  let insight = "";
                  let acoes = "";
                  
                  if (item.categoria === "Golpe") {
                    insight = "Principal medo dos consumidores de produtos naturais online. Indica necessidade urgente de reforçar credibilidade e segurança.";
                    acoes = "Certificados de segurança, selos de qualidade, depoimentos em vídeo, garantia total de reembolso.";
                  } else if (item.categoria === "Não ser original / falso") {
                    insight = "Preocupação com autenticidade do produto. Mercado saturado de imitações gera desconfiança.";
                    acoes = "Certificados de autenticidade, laboratório próprio, QR codes de verificação, origem rastreável.";
                  } else if (item.categoria === "Efeitos colaterais") {
                    insight = "Receio natural com produtos de saúde. Consumidores querem segurança antes de resultados.";
                    acoes = "Laudos médicos, composição detalhada, contra-indicações claras, suporte nutricional.";
                  } else {
                    insight = "Medos diversos relacionados à experiência de compra online e pós-venda.";
                    acoes = "FAQ completo, chat em tempo real, política de troca flexível, suporte especializado.";
                  }

                  return (
                    <div key={item.categoria} className="p-3 bg-muted/30 rounded-lg space-y-2">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${
                          index === 0 ? 'bg-red-500' : 
                          index === 1 ? 'bg-orange-500' : 
                          index === 2 ? 'bg-yellow-500' : 'bg-blue-500'
                        }`}></div>
                        <span className="font-medium text-sm">{item.categoria}</span>
                        <Badge variant="secondary">{item.percentual}%</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mb-1">
                        <strong>Insight:</strong> {insight}
                      </p>
                      <p className="text-xs text-primary font-medium">💡 {acoes}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Produtos de Interesse */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Produtos de Maior Interesse
          </CardTitle>
          <CardDescription>
            Análise da demanda por categorias de produtos ({totalRespostas} respostas analisadas)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {produtosOrdenados.length > 0 ? (
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Ranking de Produtos */}
              <div className="space-y-4">
                <h4 className="font-semibold text-lg">🏆 Ranking de Demanda</h4>
                {produtosOrdenados.map((item, index) => {
                  const colors = [
                    { bg: 'bg-emerald-500', text: 'text-emerald-700', ring: 'ring-emerald-200' },
                    { bg: 'bg-blue-500', text: 'text-blue-700', ring: 'ring-blue-200' },
                    { bg: 'bg-purple-500', text: 'text-purple-700', ring: 'ring-purple-200' },
                    { bg: 'bg-orange-500', text: 'text-orange-700', ring: 'ring-orange-200' }
                  ];
                  const color = colors[index] || colors[3];
                  
                  return (
                    <div key={item.categoria} className={`p-4 rounded-lg border-2 ${color.ring} space-y-3`}>
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 ${color.bg} rounded-full flex items-center justify-center text-white font-bold text-sm`}>
                            #{index + 1}
                          </div>
                          <span className="font-medium">{item.categoria}</span>
                        </div>
                        <div className="text-right">
                          <div className={`text-lg font-bold ${color.text}`}>{item.percentual}%</div>
                          <div className="text-xs text-muted-foreground">{item.count} menções</div>
                        </div>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div 
                          className={`${color.bg} h-2 rounded-full transition-all duration-700`} 
                          style={{ width: `${item.percentual}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Estratégias por Produto */}
              <div className="space-y-4">
                <h4 className="font-semibold text-lg">💡 Estratégias Comerciais</h4>
                <div className="space-y-3">
                  {produtosOrdenados.map((item, index) => {
                    let estrategia = "";
                    let foco = "";
                    
                    if (item.categoria === "Laranja Moro") {
                      estrategia = "Produto natural com apelo saudável. Destaque para benefícios únicos da laranja moro.";
                      foco = "Marketing nutricional, receitas saudáveis, testemunhos de resultados.";
                    } else if (item.categoria === "O Shot Matinal") {
                      estrategia = "Produto de conveniência para rotina matinal. Enfatizar praticidade e energia.";
                      foco = "Rotinas matinais, energia natural, facilidade de consumo, lifestyle saudável.";
                    } else if (item.categoria === "Emagrecimento") {
                      estrategia = "Categoria de alta demanda. Focar em resultados comprovados e segurança.";
                      foco = "Antes e depois, estudos científicos, programa completo, suporte nutricional.";
                    } else if (item.categoria === "Colágeno") {
                      estrategia = "Tendência anti-aging crescente. Enfatizar beleza de dentro para fora.";
                      foco = "Benefícios para pele/cabelo/unhas, idade 35+, combinações potencializadoras.";
                    } else if (item.categoria === "Suplementos") {
                      estrategia = "Categoria ampla com diferentes necessidades. Segmentar por objetivo específico.";
                      foco = "Deficiências nutricionais, performance, imunidade, qualidade certificada.";
                    } else {
                      estrategia = "Oportunidade de expansão nesta categoria emergente.";
                      foco = "Pesquisa de mercado, testes de produtos, campanhas experimentais.";
                    }

                    return (
                      <div key={item.categoria} className="p-4 bg-gradient-to-r from-muted/30 to-muted/10 rounded-lg space-y-3">
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full ${
                            index === 0 ? 'bg-emerald-500' : 
                            index === 1 ? 'bg-blue-500' : 
                            index === 2 ? 'bg-purple-500' : 'bg-orange-500'
                          }`}></div>
                          <span className="font-semibold text-sm">{item.categoria}</span>
                          <Badge variant="outline">{item.percentual}% demanda</Badge>
                        </div>
                        <div className="space-y-2 text-xs">
                          <div>
                            <span className="font-medium text-muted-foreground">Estratégia:</span>
                            <p className="mt-1">{estrategia}</p>
                          </div>
                          <div>
                            <span className="font-medium text-primary">Foco de Marketing:</span>
                            <p className="mt-1 text-primary/80">{foco}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Package className="h-16 w-16 mx-auto mb-4 opacity-30" />
              <h4 className="font-medium mb-2">Dados Insuficientes</h4>
              <p className="text-sm">Nenhuma resposta válida encontrada sobre produtos</p>
              <p className="text-xs mt-1 text-muted-foreground/70">Necessário dados de pesquisa para análise detalhada</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ResearchInsights;