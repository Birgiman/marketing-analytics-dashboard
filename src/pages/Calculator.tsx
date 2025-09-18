import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Calculator as CalculatorIcon, Plus, Trash2, TrendingUp, Users, Target, DollarSign } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { CurrencyInput } from "@/components/CurrencyInput";
import { PercentageInput } from "@/components/PercentageInput";
import { 
  calculateLiveShopProjection, 
  validateCalculatorInputs, 
  formatCurrency, 
  formatPercentage, 
  formatNumber,
  generateSimulationName,
  type CalculatorInputs,
  type CalculatorResults 
} from "@/utils/calculations";
import { toast } from "@/hooks/use-toast";

interface CalculationData {
  ticketMedio: string;
  diasCaptacao: string;
  orcamento: string;
  cplLiquido: string;
  comparecimento: string;
  conversao: string;
}

interface SavedCalculation {
  id: string;
  user_id: string;
  ticket_medio: number;
  total_dias: number;
  orcamento: number;
  cpl_liquido: number;
  comparecimento: number;
  conversao: number;
  leads_previstos: number;
  participantes: number;
  vendas_previstas: number;
  receita_prevista: number;
  roi: number;
  lucro: number;
  margem_lucro: number;
  created_at: string;
  updated_at: string;
}

export default function Calculator() {
  const [formData, setFormData] = useState<CalculationData>({
    ticketMedio: "",
    diasCaptacao: "",
    orcamento: "",
    cplLiquido: "",
    comparecimento: "",
    conversao: ""
  });

  const [savedCalculations, setSavedCalculations] = useState<SavedCalculation[]>([]);
  const [currentResults, setCurrentResults] = useState<CalculatorResults | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Load saved calculations on component mount
  useEffect(() => {
    loadSavedCalculations();
  }, []);

  const loadSavedCalculations = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('calculator_history')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading saved calculations:', error);
        setSavedCalculations([]);
        return;
      }

      setSavedCalculations(data || []);
    } catch (error) {
      console.error('Error loading saved calculations:', error);
      setSavedCalculations([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: keyof CalculationData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleCalculate = async () => {
    setIsCalculating(true);
    
    try {
      // Convert string inputs to numbers
      // Para CurrencyInput, o valor já vem como string de números (ex: "1000" para R$ 10,00)
      const inputs: CalculatorInputs = {
        ticketMedio: parseFloat(formData.ticketMedio) / 100 || 0, // Converte centavos para reais
        diasCaptacao: parseInt(formData.diasCaptacao) || 0,
        orcamento: parseFloat(formData.orcamento) / 100 || 0, // Converte centavos para reais
        cplLiquido: parseFloat(formData.cplLiquido) / 100 || 0, // Converte centavos para reais
        comparecimento: parseFloat(formData.comparecimento.replace(/[^\d,]/g, '').replace(',', '.')) || 0,
        conversao: parseFloat(formData.conversao.replace(/[^\d,]/g, '').replace(',', '.')) || 0
      };

      // Check if at least some basic inputs are provided
      const hasBasicInputs = inputs.orcamento > 0 && inputs.cplLiquido > 0;
      
      if (!hasBasicInputs) {
        toast({
          title: "Dados insuficientes",
          description: "É necessário preencher pelo menos Orçamento e CPL Líquido para realizar o cálculo.",
          variant: "destructive",
        });
        return;
      }

      // Validate inputs (mais flexível)
      const validation = validateCalculatorInputs(inputs);
      if (!validation.isValid) {
        // Se há erros, mas temos inputs básicos, vamos calcular mesmo assim
        // mas mostrar um aviso
        if (hasBasicInputs) {
          toast({
            title: "Aviso",
            description: "Alguns campos estão vazios. Cálculo realizado com valores padrão para campos não preenchidos.",
            variant: "default",
          });
        } else {
          toast({
            title: "Dados inválidos",
            description: validation.errors.join(', '),
            variant: "destructive",
          });
          return;
        }
      }

      // Calculate results
      const results = calculateLiveShopProjection(inputs);
      setCurrentResults(results);

      toast({
        title: "Cálculo realizado!",
        description: "Projeção calculada com sucesso. Clique em 'Salvar Cálculo' para registrar no histórico.",
      });

    } catch (error) {
      console.error('Error calculating:', error);
      toast({
        title: "Erro",
        description: "Não foi possível realizar o cálculo.",
        variant: "destructive",
      });
    } finally {
      setIsCalculating(false);
    }
  };

  const saveCalculation = async (inputs: CalculatorInputs, results: CalculatorResults) => {
    try {
      const { data, error } = await supabase
        .from('calculator_history')
        .insert({
          ticket_medio: inputs.ticketMedio,
          total_dias: inputs.diasCaptacao,
          orcamento: inputs.orcamento,
          cpl_liquido: inputs.cplLiquido,
          comparecimento: inputs.comparecimento,
          conversao: inputs.conversao,
          leads_previstos: results.leadsPrevistos,
          participantes: results.participantesPrevistos,
          vendas_previstas: results.vendasPrevistas,
          receita_prevista: results.receitaPrevista,
          roi: results.roi,
          lucro: results.lucro,
          margem_lucro: results.margemLucro
        })
        .select()
        .single();

      if (error) {
        console.error('Error saving calculation:', error);
        throw error;
      }

      // Reload saved calculations
      await loadSavedCalculations();
      return data;
    } catch (error) {
      console.error('Error saving calculation:', error);
      throw error;
    }
  };

  const handleDeleteCalculation = async (id: string) => {
    try {
      const { error } = await supabase
        .from('calculator_history')
        .delete()
        .eq('id', id);

      if (error) throw error;

      // Reload saved calculations
      await loadSavedCalculations();

      toast({
        title: "Cálculo removido",
        description: "O cálculo foi removido com sucesso.",
      });
    } catch (error) {
      console.error('Error deleting calculation:', error);
      toast({
        title: "Erro",
        description: "Não foi possível remover o cálculo.",
        variant: "destructive",
      });
    }
  };

  const handleClearForm = () => {
    setFormData({
      ticketMedio: "",
      diasCaptacao: "",
      orcamento: "",
      cplLiquido: "",
      comparecimento: "",
      conversao: ""
    });
    setCurrentResults(null);
  };

  const handleSaveCalculation = async () => {
    if (!currentResults) {
      toast({
        title: "Erro",
        description: "Nenhum cálculo para salvar. Execute um cálculo primeiro.",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    
    try {
      // Convert string inputs to numbers for saving
      const inputs: CalculatorInputs = {
        ticketMedio: parseFloat(formData.ticketMedio) / 100 || 0,
        diasCaptacao: parseInt(formData.diasCaptacao) || 0,
        orcamento: parseFloat(formData.orcamento) / 100 || 0,
        cplLiquido: parseFloat(formData.cplLiquido) / 100 || 0,
        comparecimento: parseFloat(formData.comparecimento) || 0,
        conversao: parseFloat(formData.conversao) || 0
      };

      await saveCalculation(inputs, currentResults);

      toast({
        title: "Cálculo salvo!",
        description: "Projeção registrada no histórico com sucesso.",
      });

    } catch (error) {
      console.error('Error saving calculation:', error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar o cálculo.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleNewCalculation = () => {
    setFormData({
      ticketMedio: "",
      diasCaptacao: "",
      orcamento: "",
      cplLiquido: "",
      comparecimento: "",
      conversao: ""
    });
    setCurrentResults(null);
  };

  return (
    <div className="flex-1 space-y-6 p-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Calculadora de LiveShop
        </h1>
        <p className="text-muted-foreground">
          Calcule suas projeções de leads e faturamento
        </p>
      </div>

      {/* Campaign Data Form */}
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <CalculatorIcon className="h-5 w-5" />
            <CardTitle>Dados da Campanha</CardTitle>
          </div>
          <CardDescription>
            Preencha os dados para calcular suas projeções
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="ticketMedio">Ticket Médio</Label>
              <CurrencyInput
                value={formData.ticketMedio}
                onChange={(value) => handleInputChange("ticketMedio", value)}
                placeholder="R$ 0,00"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="diasCaptacao">Total de Dias de Captação</Label>
              <Input
                id="diasCaptacao"
                placeholder="Ex: 7"
                value={formData.diasCaptacao}
                onChange={(e) => handleInputChange("diasCaptacao", e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="orcamento">Orçamento</Label>
              <CurrencyInput
                value={formData.orcamento}
                onChange={(value) => handleInputChange("orcamento", value)}
                placeholder="R$ 0,00"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="cplLiquido">CPL Líquido</Label>
              <CurrencyInput
                value={formData.cplLiquido}
                onChange={(value) => handleInputChange("cplLiquido", value)}
                placeholder="R$ 0,00"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="comparecimento">Comparecimento</Label>
              <PercentageInput
                value={formData.comparecimento}
                onChange={(value) => handleInputChange("comparecimento", value)}
                placeholder="0%"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="conversao">Conversão</Label>
              <PercentageInput
                value={formData.conversao}
                onChange={(value) => handleInputChange("conversao", value)}
                placeholder="0%"
              />
            </div>
          </div>
          
          <div className="flex justify-start gap-3">
            <Button 
              onClick={handleCalculate}
              className="w-full md:w-auto px-8"
              size="lg"
              disabled={isCalculating}
            >
              {isCalculating ? "Calculando..." : "Calcular"}
            </Button>
            <Button 
              onClick={handleClearForm}
              variant="outline"
              className="w-full md:w-auto px-8"
              size="lg"
              disabled={isCalculating}
            >
              Limpar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results Section */}
      {currentResults && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <TrendingUp className="h-5 w-5" />
                <CardTitle>Resultados da Projeção</CardTitle>
              </div>
              <Button 
                onClick={handleSaveCalculation}
                variant="outline"
                size="sm"
                disabled={isSaving}
              >
                {isSaving ? "Salvando..." : "Salvar Cálculo"}
              </Button>
            </div>
            <CardDescription>
              Projeções baseadas nos dados inseridos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex items-center space-x-2">
                  <Users className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-800">Leads Previstos</span>
                </div>
                <p className="text-2xl font-bold text-blue-900 mt-1">
                  {formatNumber(currentResults.leadsPrevistos)}
                </p>
              </div>

              <div className="bg-green-50 p-4 rounded-lg">
                <div className="flex items-center space-x-2">
                  <Target className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium text-green-800">Participantes</span>
                </div>
                <p className="text-2xl font-bold text-green-900 mt-1">
                  {formatNumber(currentResults.participantesPrevistos)}
                </p>
              </div>

              <div className="bg-purple-50 p-4 rounded-lg">
                <div className="flex items-center space-x-2">
                  <TrendingUp className="h-4 w-4 text-purple-600" />
                  <span className="text-sm font-medium text-purple-800">Vendas Previstas</span>
                </div>
                <p className="text-2xl font-bold text-purple-900 mt-1">
                  {formatNumber(currentResults.vendasPrevistas)}
                </p>
              </div>

              <div className="bg-orange-50 p-4 rounded-lg">
                <div className="flex items-center space-x-2">
                  <DollarSign className="h-4 w-4 text-orange-600" />
                  <span className="text-sm font-medium text-orange-800">Receita Prevista</span>
                </div>
                <p className="text-2xl font-bold text-orange-900 mt-1">
                  {formatCurrency(currentResults.receitaPrevista)}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center space-x-2">
                  <TrendingUp className="h-4 w-4 text-gray-600" />
                  <span className="text-sm font-medium text-gray-800">ROI</span>
                </div>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {formatPercentage(currentResults.roi)}
                </p>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center space-x-2">
                  <DollarSign className="h-4 w-4 text-gray-600" />
                  <span className="text-sm font-medium text-gray-800">Lucro</span>
                </div>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {formatCurrency(currentResults.lucro)}
                </p>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center space-x-2">
                  <Target className="h-4 w-4 text-gray-600" />
                  <span className="text-sm font-medium text-gray-800">Margem de Lucro</span>
                </div>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {formatPercentage(currentResults.margemLucro)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Saved Calculations */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle>Cálculos Salvos</CardTitle>
              <CardDescription>
                Gerencie todos os seus cálculos de LiveShop
              </CardDescription>
            </div>
            <Button onClick={handleNewCalculation} variant="outline" className="gap-2">
              <Plus className="h-4 w-4" />
              Novo
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Carregando cálculos salvos...
            </div>
          ) : savedCalculations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum cálculo salvo ainda. Calcule uma projeção e ela será salva automaticamente.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Orçamento</TableHead>
                  <TableHead>CPL Líquido</TableHead>
                  <TableHead>Receita Prevista</TableHead>
                  <TableHead>ROI</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {savedCalculations.map((calc) => (
                  <TableRow key={calc.id}>
                    <TableCell>
                      {new Date(calc.created_at).toLocaleDateString('pt-BR')}
                    </TableCell>
                    <TableCell>{formatCurrency(calc.orcamento)}</TableCell>
                    <TableCell>{formatCurrency(calc.cpl_liquido)}</TableCell>
                    <TableCell>{formatCurrency(calc.receita_prevista)}</TableCell>
                    <TableCell className="text-green-600 font-medium">{formatPercentage(calc.roi)}</TableCell>
                    <TableCell>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleDeleteCalculation(calc.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}