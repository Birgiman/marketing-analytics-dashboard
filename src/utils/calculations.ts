/**
 * Funções utilitárias para cálculos de LiveShop
 * Funções puras que recebem parâmetros e retornam resultados
 */

export interface CalculatorInputs {
  ticketMedio: number;
  diasCaptacao: number;
  orcamento: number;
  cplLiquido: number;
  comparecimento: number; // em porcentagem (ex: 80 para 80%)
  conversao: number; // em porcentagem (ex: 15 para 15%)
}

export interface CalculatorResults {
  leadsPrevistos: number;
  participantesPrevistos: number;
  vendasPrevistas: number;
  receitaPrevista: number;
  roi: number; // em porcentagem
  lucro: number;
  margemLucro: number; // em porcentagem
}

/**
 * Calcula leads previstos baseado no orçamento e CPL líquido
 * @param orcamento - Orçamento total em reais
 * @param cplLiquido - Custo por lead líquido em reais
 * @returns Número de leads previstos
 */
export function calculateLeadsPrevistos(orcamento: number, cplLiquido: number): number {
  if (cplLiquido <= 0) return 0;
  return Math.floor(orcamento / cplLiquido);
}

/**
 * Calcula participantes previstos baseado nos leads e taxa de comparecimento
 * @param leadsPrevistos - Número de leads previstos
 * @param comparecimento - Taxa de comparecimento em porcentagem (ex: 80 para 80%)
 * @returns Número de participantes previstos
 */
export function calculateParticipantesPrevistos(leadsPrevistos: number, comparecimento: number): number {
  return Math.floor(leadsPrevistos * (comparecimento / 100));
}

/**
 * Calcula vendas previstas baseado nos participantes e taxa de conversão
 * @param participantesPrevistos - Número de participantes previstos
 * @param conversao - Taxa de conversão em porcentagem (ex: 15 para 15%)
 * @returns Número de vendas previstas
 */
export function calculateVendasPrevistas(participantesPrevistos: number, conversao: number): number {
  return Math.floor(participantesPrevistos * (conversao / 100));
}

/**
 * Calcula receita prevista baseado nas vendas e ticket médio
 * @param vendasPrevistas - Número de vendas previstas
 * @param ticketMedio - Ticket médio em reais
 * @returns Receita prevista em reais
 */
export function calculateReceitaPrevista(vendasPrevistas: number, ticketMedio: number): number {
  return vendasPrevistas * ticketMedio;
}

/**
 * Calcula ROI (Return on Investment) baseado na receita e orçamento
 * @param receitaPrevista - Receita prevista em reais
 * @param orcamento - Orçamento investido em reais
 * @returns ROI em porcentagem (limitado a 2 casas decimais)
 */
export function calculateROI(receitaPrevista: number, orcamento: number): number {
  if (orcamento <= 0) return 0;
  return Math.round(((receitaPrevista - orcamento) / orcamento) * 100 * 100) / 100;
}

/**
 * Calcula lucro (receita - orçamento)
 * @param receitaPrevista - Receita prevista em reais
 * @param orcamento - Orçamento investido em reais
 * @returns Lucro em reais
 */
export function calculateLucro(receitaPrevista: number, orcamento: number): number {
  return receitaPrevista - orcamento;
}

/**
 * Calcula margem de lucro baseado na receita e orçamento
 * @param receitaPrevista - Receita prevista em reais
 * @param orcamento - Orçamento investido em reais
 * @returns Margem de lucro em porcentagem (limitado a 2 casas decimais)
 */
export function calculateMargemLucro(receitaPrevista: number, orcamento: number): number {
  if (receitaPrevista <= 0) return 0;
  return Math.round(((receitaPrevista - orcamento) / receitaPrevista) * 100 * 100) / 100;
}

/**
 * Função principal que calcula todos os resultados da calculadora
 * @param inputs - Dados de entrada da calculadora
 * @returns Objeto com todos os resultados calculados
 */
export function calculateLiveShopProjection(inputs: CalculatorInputs): CalculatorResults {
  // Aplicar valores padrão para campos não preenchidos
  const processedInputs: CalculatorInputs = {
    ticketMedio: inputs.ticketMedio > 0 ? inputs.ticketMedio : 100, // R$ 100,00 padrão
    diasCaptacao: inputs.diasCaptacao > 0 ? inputs.diasCaptacao : 7, // 7 dias padrão
    orcamento: inputs.orcamento,
    cplLiquido: inputs.cplLiquido,
    comparecimento: inputs.comparecimento > 0 ? inputs.comparecimento : 80, // 80% padrão
    conversao: inputs.conversao > 0 ? inputs.conversao : 15 // 15% padrão
  };

  const leadsPrevistos = calculateLeadsPrevistos(processedInputs.orcamento, processedInputs.cplLiquido);
  const participantesPrevistos = calculateParticipantesPrevistos(leadsPrevistos, processedInputs.comparecimento);
  const vendasPrevistas = calculateVendasPrevistas(participantesPrevistos, processedInputs.conversao);
  const receitaPrevista = calculateReceitaPrevista(vendasPrevistas, processedInputs.ticketMedio);
  const lucro = calculateLucro(receitaPrevista, processedInputs.orcamento);
  const roi = calculateROI(receitaPrevista, processedInputs.orcamento);
  const margemLucro = calculateMargemLucro(receitaPrevista, processedInputs.orcamento);

  return {
    leadsPrevistos,
    participantesPrevistos,
    vendasPrevistas,
    receitaPrevista,
    roi,
    lucro,
    margemLucro
  };
}

/**
 * Valida se os inputs da calculadora são válidos
 * @param inputs - Dados de entrada da calculadora
 * @returns Objeto com status de validação e mensagens de erro
 */
export function validateCalculatorInputs(inputs: CalculatorInputs): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Validações obrigatórias (para cálculo básico)
  if (inputs.orcamento <= 0) {
    errors.push('Orçamento deve ser maior que zero');
  }

  if (inputs.cplLiquido <= 0) {
    errors.push('CPL líquido deve ser maior que zero');
  }

  // Validações opcionais (com valores padrão se não preenchidos)
  if (inputs.ticketMedio < 0) {
    errors.push('Ticket médio não pode ser negativo');
  }

  if (inputs.diasCaptacao < 0) {
    errors.push('Dias de captação não pode ser negativo');
  }

  if (inputs.comparecimento < 0 || inputs.comparecimento > 100) {
    errors.push('Comparecimento deve estar entre 0% e 100%');
  }

  if (inputs.conversao < 0 || inputs.conversao > 100) {
    errors.push('Conversão deve estar entre 0% e 100%');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Formata valores monetários para exibição
 * @param value - Valor em reais
 * @returns String formatada (ex: "R$ 1.234,56")
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
}

/**
 * Formata porcentagens para exibição
 * @param value - Valor em porcentagem
 * @param decimals - Número de casas decimais (padrão: 1)
 * @returns String formatada (ex: "15,5%")
 */
export function formatPercentage(value: number, decimals: number = 1): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'percent',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(value / 100);
}

/**
 * Formata números inteiros para exibição
 * @param value - Valor numérico
 * @returns String formatada (ex: "1.234")
 */
export function formatNumber(value: number): string {
  return new Intl.NumberFormat('pt-BR').format(Math.floor(value));
}

/**
 * Gera nome automático para simulação baseado nos inputs
 * @param inputs - Dados de entrada da calculadora
 * @returns Nome sugerido para a simulação
 */
export function generateSimulationName(inputs: CalculatorInputs): string {
  const date = new Date().toLocaleDateString('pt-BR');
  const orcamento = formatCurrency(inputs.orcamento);
  return `Simulação ${date} - ${orcamento}`;
}
