
import HeaderWithoutSidebar from '@/components/HeaderWithoutSidebar';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { MaskedInput } from '@/components/ui/masked-input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { Calculator, Edit, Plus, Save, Target, Trash2, TrendingUp } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

const formSchema = z.object({
  orcamento: z.number().min(0.01, "Orçamento deve ser maior que 0"),
  cplLiquido: z.number().min(0.01, "CPL deve ser maior que 0"),
  ticketMedio: z.number().min(0.01, "Ticket médio deve ser maior que 0"),
  conversao: z.number().min(0.01).max(100, "Conversão deve estar entre 0.01% e 100%"),
  comparecimento: z.number().min(0.01).max(100, "Comparecimento deve estar entre 0.01% e 100%"),
  diasCaptacao: z.number().min(1, "Deve ter pelo menos 1 dia de captação"),
});

type FormData = z.infer<typeof formSchema>;

interface SavedCalculation {
  id: string;
  name: string;
  data: FormData;
  results: CalculationResults;
  createdAt: string;
}

interface CalculationResults {
  totalLeads: number;
  leadsPresentes: number;
  vendas: number;
  faturamento: number;
  leadsPorDia: number;
}

export default function CalculadoraLiveshop() {
  const [results, setResults] = useState<CalculationResults | null>(null);
  const [savedCalculations, setSavedCalculations] = useState<SavedCalculation[]>([]);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingCalculation, setEditingCalculation] = useState<SavedCalculation | null>(null);
  const [calculationName, setCalculationName] = useState("");
  const { toast } = useToast();
  
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      orcamento: 0,
      cplLiquido: 0,
      ticketMedio: 0,
      conversao: 0,
      comparecimento: 0,
      diasCaptacao: 0,
    },
  });

  const editForm = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      orcamento: 0,
      cplLiquido: 0,
      ticketMedio: 0,
      conversao: 0,
      comparecimento: 0,
      diasCaptacao: 0,
    },
  });

  // Carregar cálculos salvos do localStorage
  useEffect(() => {
    const saved = localStorage.getItem('liveshop-calculations');
    if (saved) {
      setSavedCalculations(JSON.parse(saved));
    }
  }, []);

  const calculateResults = (data: FormData): CalculationResults => {
    const totalLeads = data.orcamento / data.cplLiquido;
    const leadsPresentes = totalLeads * (data.comparecimento / 100);
    const vendas = totalLeads * (data.conversao / 100);
    const faturamento = vendas * data.ticketMedio;
    const leadsPorDia = totalLeads / data.diasCaptacao;

    return {
      totalLeads: Math.round(totalLeads),
      leadsPresentes: Math.round(leadsPresentes),
      vendas: Math.round(vendas),
      faturamento,
      leadsPorDia: Math.round(leadsPorDia),
    };
  };

  const onSubmit = (data: FormData) => {
    const calculatedResults = calculateResults(data);
    setResults(calculatedResults);
  };

  const saveCalculation = () => {
    if (!calculationName.trim() || !results) {
      toast({
        title: "Erro",
        description: "Nome do cálculo é obrigatório e você deve calcular primeiro.",
        variant: "destructive",
      });
      return;
    }

    const newCalculation: SavedCalculation = {
      id: Date.now().toString(),
      name: calculationName,
      data: form.getValues(),
      results,
      createdAt: new Date().toISOString(),
    };

    const updated = [...savedCalculations, newCalculation];
    setSavedCalculations(updated);
    localStorage.setItem('liveshop-calculations', JSON.stringify(updated));
    
    setSaveDialogOpen(false);
    setCalculationName("");
    
    toast({
      title: "Sucesso",
      description: "Cálculo salvo com sucesso!",
    });
  };

  const startEdit = (calculation: SavedCalculation) => {
    setEditingCalculation(calculation);
    editForm.reset(calculation.data);
    setCalculationName(calculation.name);
    setEditDialogOpen(true);
  };

  const saveEdit = () => {
    if (!editingCalculation || !calculationName.trim()) {
      toast({
        title: "Erro",
        description: "Nome do cálculo é obrigatório.",
        variant: "destructive",
      });
      return;
    }

    const editedData = editForm.getValues();
    const newResults = calculateResults(editedData);

    const updatedCalculation: SavedCalculation = {
      ...editingCalculation,
      name: calculationName,
      data: editedData,
      results: newResults,
    };

    const updated = savedCalculations.map(calc => 
      calc.id === editingCalculation.id ? updatedCalculation : calc
    );
    setSavedCalculations(updated);
    localStorage.setItem('liveshop-calculations', JSON.stringify(updated));
    
    setEditDialogOpen(false);
    setEditingCalculation(null);
    setCalculationName("");
    
    toast({
      title: "Sucesso",
      description: "Cálculo editado com sucesso!",
    });
  };

  const deleteCalculation = (id: string) => {
    const updated = savedCalculations.filter(calc => calc.id !== id);
    setSavedCalculations(updated);
    localStorage.setItem('liveshop-calculations', JSON.stringify(updated));
    
    toast({
      title: "Sucesso",
      description: "Cálculo excluído com sucesso!",
    });
  };

  const loadCalculation = (calculation: SavedCalculation) => {
    form.reset(calculation.data);
    setResults(calculation.results);
    
    toast({
      title: "Sucesso",
      description: "Cálculo carregado no formulário!",
    });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatPercentage = (value: number) => {
    return value.toFixed(2) + '%';
  };

  return (
    <div className="min-h-screen bg-background">
      <HeaderWithoutSidebar />
      <div className="container mx-auto space-y-4 p-4 md:p-8 pt-6">
              <div className="flex items-center justify-between space-y-2">
                <div>
                  <h2 className="text-3xl font-bold tracking-tight">Calculadora de LiveShop</h2>
                  <p className="text-muted-foreground">
                    Calcule suas projeções de leads e faturamento
                  </p>
                </div>
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                {/* Formulário */}
                <Card className="lg:col-span-1">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Calculator className="h-5 w-5" />
                      Dados da Campanha
                    </CardTitle>
                    <CardDescription>
                      Preencha os dados para calcular suas projeções
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Form {...form}>
                      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                          control={form.control}
                          name="ticketMedio"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Ticket Médio</FormLabel>
                              <FormControl>
                                <MaskedInput
                                  mask="currency"
                                  placeholder="R$ 0,00"
                                  value={field.value}
                                  onValueChange={field.onChange}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="diasCaptacao"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Total de Dias de Captação</FormLabel>
                              <FormControl>
                                <MaskedInput
                                  mask="number"
                                  placeholder="Ex: 7"
                                  value={field.value}
                                  onValueChange={field.onChange}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="orcamento"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Orçamento</FormLabel>
                              <FormControl>
                                <MaskedInput
                                  mask="currency"
                                  placeholder="R$ 0,00"
                                  value={field.value}
                                  onValueChange={field.onChange}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="cplLiquido"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>CPL Líquido</FormLabel>
                              <FormControl>
                                <MaskedInput
                                  mask="currency"
                                  placeholder="R$ 0,00"
                                  value={field.value}
                                  onValueChange={field.onChange}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="comparecimento"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Comparecimento</FormLabel>
                              <FormControl>
                                <MaskedInput
                                  mask="percentage"
                                  placeholder="0%"
                                  value={field.value}
                                  onValueChange={field.onChange}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="conversao"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Conversão</FormLabel>
                              <FormControl>
                                <MaskedInput
                                  mask="percentage"
                                  placeholder="0%"
                                  value={field.value}
                                  onValueChange={field.onChange}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <div className="flex gap-2 bg-red-600">
                          <Button type="submit" className="flex-1">
                            Calcular
                          </Button>
                          <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
                            <DialogTrigger asChild>
                              <Button variant="outline" disabled={!results}>
                                <Save className="h-4 w-4" />
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
                                <Button onClick={saveCalculation}>Salvar</Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                        </div>
                      </form>
                    </Form>
                  </CardContent>
                </Card>

                {/* Resultados */}
                {results && (
                  <Card className="lg:col-span-1">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <TrendingUp className="h-5 w-5" />
                        Resultados da Projeção
                      </CardTitle>
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
                            <span className="font-medium">{formatCurrency(form.getValues().ticketMedio)}</span>
                          </div>
                          <div className="flex justify-between items-center py-2 px-3 rounded border">
                            <span className="text-sm">Dias de Captação</span>
                            <span className="font-medium">{form.getValues().diasCaptacao}</span>
                          </div>
                          <div className="flex justify-between items-center py-2 px-3 rounded border">
                            <span className="text-sm">Orçamento</span>
                            <span className="font-medium">{formatCurrency(form.getValues().orcamento)}</span>
                          </div>
                          <div className="flex justify-between items-center py-2 px-3 rounded border">
                            <span className="text-sm">CPL Líquido</span>
                            <span className="font-medium">{formatCurrency(form.getValues().cplLiquido)}</span>
                          </div>
                          <div className="flex justify-between items-center py-2 px-3 rounded border">
                            <span className="text-sm">Comparecimento</span>
                            <span className="font-medium">{formatPercentage(form.getValues().comparecimento)}</span>
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
                              {results.totalLeads.toLocaleString()}
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
                              {results.leadsPresentes}
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
                              {results.vendas}
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
                              {formatCurrency(results.faturamento)}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              Vendas × Ticket Médio
                            </p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Tabela de Cálculos Salvos */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Cálculos Salvos</span>
                    <Button size="sm" variant="outline" onClick={() => setSaveDialogOpen(true)} disabled={!results}>
                      <Plus className="h-4 w-4 mr-2" />
                      Novo
                    </Button>
                  </CardTitle>
                  <CardDescription>
                    Gerencie todos os seus cálculos de LiveShop
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="border rounded-lg">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Nome</TableHead>
                          <TableHead>Data</TableHead>
                          <TableHead>Orçamento</TableHead>
                          <TableHead>CPL</TableHead>
                          <TableHead>Faturamento</TableHead>
                          <TableHead>Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {savedCalculations.map((calc) => (
                          <TableRow key={calc.id}>
                            <TableCell className="font-medium">{calc.name}</TableCell>
                            <TableCell>{new Date(calc.createdAt).toLocaleDateString('pt-BR')}</TableCell>
                            <TableCell>{formatCurrency(calc.data.orcamento)}</TableCell>
                            <TableCell>{formatCurrency(calc.data.cplLiquido)}</TableCell>
                            <TableCell className="font-medium text-primary">
                              {formatCurrency(calc.results.faturamento)}
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => loadCalculation(calc)}
                                >
                                  Carregar
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => startEdit(calc)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="destructive"
                                  onClick={() => deleteCalculation(calc.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                        {savedCalculations.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center text-muted-foreground py-4">
                              Nenhum cálculo salvo ainda. Calcule uma projeção e salve-a.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
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
            <Form {...editForm}>
              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={editForm.control}
                  name="orcamento"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Orçamento</FormLabel>
                      <FormControl>
                        <MaskedInput
                          mask="currency"
                          placeholder="R$ 0,00"
                          value={field.value}
                          onValueChange={field.onChange}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={editForm.control}
                  name="cplLiquido"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>CPL Líquido</FormLabel>
                      <FormControl>
                        <MaskedInput
                          mask="currency"
                          placeholder="R$ 0,00"
                          value={field.value}
                          onValueChange={field.onChange}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={editForm.control}
                  name="ticketMedio"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ticket Médio</FormLabel>
                      <FormControl>
                        <MaskedInput
                          mask="currency"
                          placeholder="R$ 0,00"
                          value={field.value}
                          onValueChange={field.onChange}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={editForm.control}
                  name="conversao"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Conversão</FormLabel>
                      <FormControl>
                        <MaskedInput
                          mask="percentage"
                          placeholder="0%"
                          value={field.value}
                          onValueChange={field.onChange}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={editForm.control}
                  name="comparecimento"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Comparecimento</FormLabel>
                      <FormControl>
                        <MaskedInput
                          mask="percentage"
                          placeholder="0%"
                          value={field.value}
                          onValueChange={field.onChange}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={editForm.control}
                  name="diasCaptacao"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Total de Dias de Captação</FormLabel>
                      <FormControl>
                        <MaskedInput
                          mask="number"
                          placeholder="Ex: 7"
                          value={field.value}
                          onValueChange={field.onChange}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </Form>
          </div>
          <DialogFooter>
            <Button onClick={saveEdit}>Salvar Alterações</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}