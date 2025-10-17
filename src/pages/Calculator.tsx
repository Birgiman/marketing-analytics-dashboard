import { CurrencyInput } from "@/components/CurrencyInput";
import Header from "@/components/Header";
import { PercentageInput } from "@/components/PercentageInput";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { DEMO_MODE } from "@/lib/demo-mode";
import {
    calculateAnalyticsProjection,
    formatCurrency,
    formatNumber,
    validateCalculatorInputs,
    type CalculatorInputs,
    type CalculatorResults
} from "@/utils/calculations";
import { Calculator as CalculatorIcon, Edit, Save, Shuffle, Target, Trash2, TrendingUp } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

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
  name: string;
  ticket_medio: number;
  total_dias: number;
  orcamento: number;
  cpl_liquido: number;
  comparecimento: number;
  conversao: number;
  leads_previstos: number;
  participantes: number;
  vendas_previstas: number;
  faturamento: number;
  roes: number;
  created_at: string;
  updated_at: string;
}

export default function Calculator() {
  const navigate = useNavigate();
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
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingCalculation, setEditingCalculation] = useState<SavedCalculation | null>(null);
  const [deletingCalculation, setDeletingCalculation] = useState<SavedCalculation | null>(null);
  const [calculationName, setCalculationName] = useState("");

  // Check authentication and load saved calculations on component mount
  useEffect(() => {
    checkAuthAndLoadData();
  }, []);

  const checkAuthAndLoadData = async () => {
    // No modo demo, não carregar dados do banco
    if (DEMO_MODE) {
      setCurrentUser({ id: 'demo-user-123', email: 'demo@marketing-analytics.com' });
      setSavedCalculations([]);
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.user) {
        toast({
          title: "Acesso negado",
          description: "Você precisa estar logado para usar a calculadora.",
          variant: "destructive",
        });
        navigate('/auth/signin');
        return;
      }

      setCurrentUser(session.user);
      await loadSavedCalculations();
    } catch (error) {
      if (!DEMO_MODE) {
        navigate('/auth/signin');
      }
    }
  };

  const loadSavedCalculations = async () => {
    // No modo demo, não carregar dados do banco
    if (DEMO_MODE) {
      setSavedCalculations([]);
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('calculator_history')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        toast({
          title: "Erro ao carregar cálculos",
          description: `Não foi possível carregar os cálculos salvos: ${error.message}`,
          variant: "destructive",
        });
        setSavedCalculations([]);
        return;
      }

      setSavedCalculations(data || []);
    } catch (error) {
      toast({
        title: "Erro ao carregar cálculos",
        description: "Erro inesperado ao carregar cálculos salvos.",
        variant: "destructive",
      });
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
      const results = calculateAnalyticsProjection(inputs);
      setCurrentResults(results);

      toast({
        title: "Cálculo realizado!",
        description: "Projeção calculada com sucesso. Clique em 'Salvar Cálculo' para registrar no histórico.",
      });

    } catch (error) {
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
    // No modo demo, não salvar no banco
    if (DEMO_MODE) {
      toast({
        title: "Modo Demo",
        description: "Funcionalidade de salvar não disponível no modo demo",
      });
      return;
    }

    try {
      // Check if user is authenticated
      if (!currentUser) {
        throw new Error('Usuário não autenticado');
      }

      const { data, error } = await supabase
        .from('calculator_history')
        .insert({
          user_id: currentUser.id,
          name: calculationName,
          ticket_medio: inputs.ticketMedio,
          total_dias: inputs.diasCaptacao,
          orcamento: inputs.orcamento,
          cpl_liquido: inputs.cplLiquido,
          comparecimento: inputs.comparecimento,
          conversao: inputs.conversao,
          leads_previstos: results.leadsPrevistos,
          participantes: results.participantesPrevistos,
          vendas_previstas: results.vendasPrevistas,
          faturamento: results.faturamento,
          roes: results.roes
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      // Reload saved calculations
      await loadSavedCalculations();
      return data;
    } catch (error) {
      throw error;
    }
  };

  const handleDeleteCalculation = async (id: string) => {
    // No modo demo, não deletar do banco
    if (DEMO_MODE) {
      toast({
        title: "Modo Demo",
        description: "Funcionalidade de excluir não disponível no modo demo",
      });
      setDeleteDialogOpen(false);
      setDeletingCalculation(null);
      return;
    }

    try {
      const { error } = await supabase
        .from('calculator_history')
        .delete()
        .eq('id', id);

      if (error) throw error;

      // Reload saved calculations
      await loadSavedCalculations();

      setDeleteDialogOpen(false);
      setDeletingCalculation(null);

      toast({
        title: "Cálculo removido",
        description: "O cálculo foi removido com sucesso.",
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível remover o cálculo.",
        variant: "destructive",
      });
    }
  };

  const startDelete = (calculation: SavedCalculation) => {
    setDeletingCalculation(calculation);
    setDeleteDialogOpen(true);
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

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      toast({
        title: "Erro",
        description: `Não foi possível salvar o cálculo: ${errorMessage}`,
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

  const saveCalculationWithName = async () => {
    if (!calculationName.trim() || !currentResults) {
      toast({
        title: "Erro",
        description: "Nome do cálculo é obrigatório e você deve calcular primeiro.",
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

      setSaveDialogOpen(false);
      setCalculationName("");
      
      toast({
        title: "Sucesso",
        description: "Cálculo salvo com sucesso!",
      });

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      toast({
        title: "Erro",
        description: `Não foi possível salvar o cálculo: ${errorMessage}`,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const startEdit = (calculation: SavedCalculation) => {
    setEditingCalculation(calculation);
    setCalculationName(calculation.name || `Projeção ${savedCalculations.indexOf(calculation) + 1}`);
    setEditDialogOpen(true);
  };

  const saveEdit = async () => {
    if (!editingCalculation || !calculationName.trim()) {
      toast({
        title: "Erro",
        description: "Nome do cálculo é obrigatório.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Update the calculation name in the database
      const { error } = await supabase
        .from('calculator_history')
        .update({ 
          name: calculationName,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingCalculation.id);

      if (error) throw error;

      // Reload saved calculations
      await loadSavedCalculations();
      
      setEditDialogOpen(false);
      setEditingCalculation(null);
      setCalculationName("");
      
      toast({
        title: "Sucesso",
        description: "Cálculo editado com sucesso!",
      });

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      toast({
        title: "Erro",
        description: `Não foi possível editar o cálculo: ${errorMessage}`,
        variant: "destructive",
      });
    }
  };

  const loadCalculation = (calculation: SavedCalculation) => {
    // Convert the saved calculation back to form data
    setFormData({
      ticketMedio: (calculation.ticket_medio * 100).toString(), // Convert to centavos
      diasCaptacao: calculation.total_dias.toString(),
      orcamento: (calculation.orcamento * 100).toString(), // Convert to centavos
      cplLiquido: (calculation.cpl_liquido * 100).toString(), // Convert to centavos
      comparecimento: calculation.comparecimento.toString(),
      conversao: calculation.conversao.toString()
    });

    // Set the results
    const results: CalculatorResults = {
      leadsPrevistos: calculation.leads_previstos,
      participantesPrevistos: calculation.participantes,
      vendasPrevistas: calculation.vendas_previstas,
      faturamento: calculation.faturamento,
      roes: calculation.roes
    };
    setCurrentResults(results);
    
    toast({
      title: "Sucesso",
      description: "Cálculo exibido no formulário!",
    });
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      <Header />
      <div className="flex-1 space-y-6 p-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Calculadora de Analytics
        </h1>
        <p className="text-muted-foreground">
          Calcule suas projeções de leads e faturamento
        </p>
      </div>

      {/* Main Calculator Layout - Horizontal */}
        <div className="max-w-7xl mx-auto w-full">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
            {/* Left Side - Campaign Data Form */}
            <div className="lg:col-span-1">
              <Card className="flex flex-col h-auto">
            {/* Header - Fixo no topo */}
            <CardHeader>
              <div className="flex items-center space-x-2">
                <CalculatorIcon className="h-5 w-5" />
                <CardTitle>Dados da Campanha</CardTitle>
              </div>
              <CardDescription>
                Preencha os dados para calcular suas projeções
              </CardDescription>
            </CardHeader>
            
            {/* Body - Formulário e botões */}
            <CardContent className="flex flex-col flex-1">
              {/* Formulário */}
              <div className="space-y-4 flex-1">
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
              
              {/* Actions - Botões no final */}
              <div className="space-y-4 mt-6">
              {/* Primeira linha: Calcular e Limpar */}
              <div className="flex gap-2">
                <Button 
                  onClick={handleCalculate}
                  className="flex-1"
                  size="lg"
                  disabled={isCalculating}
                >
                  {isCalculating ? "Calculando..." : "Calcular"}
                </Button>
                <Button 
                  onClick={handleClearForm}
                  variant="outline"
                  className="flex-1"
                  size="lg"
                  disabled={isCalculating}
                >
                  Limpar
                </Button>
              </div>
              
              {/* Segunda linha: Botão Salvar (só aparece quando há resultados) */}
              {currentResults && (
                <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
                  <DialogTrigger asChild>
                    <Button 
                      className="w-full" 
                      size="lg"
                      disabled={isSaving}
                    >
                      <Save className="h-4 w-4 mr-2" />
                      {isSaving ? "Salvando..." : "Salvar Cálculo"}
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Salvar Cálculo</DialogTitle>
                      <DialogDescription>
                        Digite um nome para salvar este cálculo
                      </DialogDescription>
                    </DialogHeader>
                    <Input
                      placeholder="Nome do cálculo"
                      value={calculationName}
                      onChange={(e) => setCalculationName(e.target.value)}
                    />
                    <DialogFooter>
                      <Button onClick={saveCalculationWithName} disabled={isSaving}>
                        {isSaving ? "Salvando..." : "Salvar"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              )}
              
            </div>
          </CardContent>
        </Card>
            </div>

            {/* Center - Animated Icon */}
            {currentResults && (
              <div className="flex items-center justify-center lg:col-span-1">
                <Shuffle className="w-16 h-16 text-primary animate-pulse mx-6" />
              </div>
            )}

            {/* Right Side - Results */}
            {currentResults && (
              <div className="lg:col-span-1 transform transition-all duration-5000 ease-out animate-slide-in">
                <Card>
            <CardHeader>
              <div className="flex items-center space-x-2">
                <TrendingUp className="h-5 w-5" />
                <CardTitle>Resultados da Projeção</CardTitle>
              </div>
              <CardDescription>
                Dados inseridos e valores calculados
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Dados Inseridos Manualmente */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Dados Inseridos</h4>
                <div className="grid gap-3">
                  <div className="flex justify-between items-center py-2 px-3 rounded border">
                    <span className="text-sm">Ticket Médio</span>
                    <span className="font-medium">{formatCurrency(parseFloat(formData.ticketMedio) / 100 || 0)}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 px-3 rounded border">
                    <span className="text-sm">Dias de Captação</span>
                    <span className="font-medium">{formData.diasCaptacao || 0}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 px-3 rounded border">
                    <span className="text-sm">Orçamento</span>
                    <span className="font-medium">{formatCurrency(parseFloat(formData.orcamento) / 100 || 0)}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 px-3 rounded border">
                    <span className="text-sm">CPL Líquido</span>
                    <span className="font-medium">{formatCurrency(parseFloat(formData.cplLiquido) / 100 || 0)}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 px-3 rounded border">
                    <span className="text-sm">Comparecimento</span>
                    <span className="font-medium">{formData.comparecimento || 0}%</span>
                  </div>
                  <div className="flex justify-between items-center py-2 px-3 rounded border">
                    <span className="text-sm">Conversão</span>
                    <span className="font-medium">{formData.conversao || 0}%</span>
                  </div>
                </div>
              </div>

              {/* Valores Calculados */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-primary uppercase tracking-wide">Valores Calculados</h4>
                <div className="grid gap-3">
                  <div className="p-3 bg-muted/30 rounded-lg border border-muted">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Total de Leads</span>
                      <Target className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="text-xl font-bold text-foreground mt-1">
                      {formatNumber(currentResults.leadsPrevistos)}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Orçamento ÷ CPL Líquido
                    </p>
                  </div>

                  <div className="p-3 bg-muted/30 rounded-lg border border-muted">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Leads Presentes</span>
                      <Target className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="text-xl font-bold text-foreground mt-1">
                      {formatNumber(currentResults.participantesPrevistos)}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Total de Leads × Comparecimento
                    </p>
                  </div>

                  <div className="p-3 bg-muted/30 rounded-lg border border-muted">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Vendas Esperadas</span>
                      <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="text-xl font-bold text-foreground mt-1">
                      {formatNumber(currentResults.vendasPrevistas)}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Total de Leads × Conversão
                    </p>
                  </div>

                  <div className="p-3 bg-primary/10 rounded-lg border border-primary/30">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-primary">Faturamento Projetado</span>
                      <TrendingUp className="h-4 w-4 text-primary" />
                    </div>
                    <div className="text-xl font-bold text-primary mt-1">
                      {formatCurrency(currentResults.faturamento)}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Vendas × Ticket Médio
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
              </div>
            )}
          </div>
      </div>

      {/* Saved Calculations */}
      <Card>
        <CardHeader>
          <div className="space-y-1">
            <CardTitle>Cálculos Salvos</CardTitle>
            <CardDescription>
              Gerencie todos os seus cálculos de Analytics
            </CardDescription>
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
                  <TableHead>Nome</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Ticket Médio</TableHead>
                  <TableHead>Dias</TableHead>
                  <TableHead>Orçamento</TableHead>
                  <TableHead>CPL</TableHead>
                  <TableHead>Comparecimento</TableHead>
                  <TableHead>Conversão</TableHead>
                  <TableHead>Leads</TableHead>
                  <TableHead>Participantes</TableHead>
                  <TableHead>Vendas</TableHead>
                  <TableHead>Faturamento</TableHead>
                  <TableHead className="text-center">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {savedCalculations.map((calc) => (
                  <TableRow key={calc.id}>
                    <TableCell className="font-medium">{calc.name || `Projeção ${savedCalculations.indexOf(calc) + 1}`}</TableCell>
                    <TableCell>
                      {new Date(calc.created_at).toLocaleDateString('pt-BR')}
                    </TableCell>
                    <TableCell>{formatCurrency(calc.ticket_medio)}</TableCell>
                    <TableCell>{calc.total_dias}</TableCell>
                    <TableCell>{formatCurrency(calc.orcamento)}</TableCell>
                    <TableCell>{formatCurrency(calc.cpl_liquido)}</TableCell>
                    <TableCell>{calc.comparecimento}%</TableCell>
                    <TableCell>{calc.conversao}%</TableCell>
                    <TableCell>{formatNumber(calc.leads_previstos)}</TableCell>
                    <TableCell>{formatNumber(calc.participantes)}</TableCell>
                    <TableCell>{formatNumber(calc.vendas_previstas)}</TableCell>
                    <TableCell>{formatCurrency(calc.faturamento)}</TableCell>
                    <TableCell className="text-center">
                      <div className="flex gap-1 justify-center">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => loadCalculation(calc)}
                        >
                          Exibir
                        </Button>
                        <Button 
                          size="sm" 
                          variant="ghost"
                          onClick={() => startEdit(calc)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="ghost"
                          onClick={() => startDelete(calc)}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      </div>

      {/* Dialog de Edição */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar Cálculo</DialogTitle>
            <DialogDescription>
              Modifique os dados do cálculo selecionado
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <Input
              placeholder="Nome do cálculo"
              value={calculationName}
              onChange={(e) => setCalculationName(e.target.value)}
            />
            <div className="text-sm text-muted-foreground">
              <p>Para editar os dados do cálculo, use a funcionalidade "Carregar" e faça as alterações no formulário principal.</p>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={saveEdit}>Salvar Alterações</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Confirmação de Exclusão */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Exclusão</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir o cálculo "{deletingCalculation?.name || 'Projeção'}"? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => deletingCalculation && handleDeleteCalculation(deletingCalculation.id)}
            >
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}