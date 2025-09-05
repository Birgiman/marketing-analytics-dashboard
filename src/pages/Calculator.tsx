import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Calculator as CalculatorIcon, Plus } from "lucide-react";

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
  nome: string;
  data: string;
  orcamento: string;
  cpl: string;
  faturamento: string;
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

  const handleInputChange = (field: keyof CalculationData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleCalculate = () => {
    // TODO: Implement calculation logic
    console.log("Calculating with data:", formData);
  };

  const handleNewCalculation = () => {
    // TODO: Implement new calculation modal
    console.log("Opening new calculation modal");
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
              <Input
                id="ticketMedio"
                placeholder="R$ 0,00"
                value={formData.ticketMedio}
                onChange={(e) => handleInputChange("ticketMedio", e.target.value)}
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
              <Input
                id="orcamento"
                placeholder="R$ 0,00"
                value={formData.orcamento}
                onChange={(e) => handleInputChange("orcamento", e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="cplLiquido">CPL Líquido</Label>
              <Input
                id="cplLiquido"
                placeholder="R$ 0,00"
                value={formData.cplLiquido}
                onChange={(e) => handleInputChange("cplLiquido", e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="comparecimento">Comparecimento</Label>
              <Input
                id="comparecimento"
                placeholder="0%"
                value={formData.comparecimento}
                onChange={(e) => handleInputChange("comparecimento", e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="conversao">Conversão</Label>
              <Input
                id="conversao"
                placeholder="0%"
                value={formData.conversao}
                onChange={(e) => handleInputChange("conversao", e.target.value)}
              />
            </div>
          </div>
          
          <div className="flex justify-start">
            <Button 
              onClick={handleCalculate}
              className="w-full md:w-auto px-8"
              size="lg"
            >
              Calcular
            </Button>
          </div>
        </CardContent>
      </Card>

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
          {savedCalculations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum cálculo salvo ainda. Calcule uma projeção e salve-a.
            </div>
          ) : (
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
                    <TableCell className="font-medium">{calc.nome}</TableCell>
                    <TableCell>{calc.data}</TableCell>
                    <TableCell>{calc.orcamento}</TableCell>
                    <TableCell>{calc.cpl}</TableCell>
                    <TableCell>{calc.faturamento}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm">
                        Editar
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