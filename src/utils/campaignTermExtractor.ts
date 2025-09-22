/**
 * Utilitário para extrair e formatar termos de campanha
 */

/**
 * Extrai o termo da campanha removendo o search term do início
 * @param campaignName - Nome completo da campanha
 * @param searchTerm - Termo de busca que deve ser removido
 * @returns Termo da campanha sem o search term
 */
export function extractCampaignTerm(campaignName: string, searchTerm: string): string {
  if (!campaignName || !searchTerm) {
    return campaignName;
  }

  // Remove o search term do início da campanha
  let campaignTerm = campaignName;
  
  if (campaignName.startsWith(searchTerm)) {
    campaignTerm = campaignName.substring(searchTerm.length);
  }

  // Remove underscores do início se existirem
  campaignTerm = campaignTerm.replace(/^_+/, '');

  return campaignTerm;
}

/**
 * Formata o termo da campanha para exibição
 * @param campaignTerm - Termo da campanha
 * @returns Termo formatado (camel case, sem underlines)
 */
export function formatCampaignTerm(campaignTerm: string): string {
  if (!campaignTerm) {
    return '';
  }

  // Remove underlines e substitui por espaços
  let formatted = campaignTerm.replace(/_/g, ' ');

  // Aplica camel case (primeira letra de cada palavra maiúscula)
  // Para nomes compostos como "Espírito Santo", cada palavra deve ter a primeira letra maiúscula
  formatted = formatted
    .split(' ')
    .map(word => {
      if (!word) return word;
      
      // Se a palavra contém números, não altera (ex: "14-08-25")
      if (/\d/.test(word)) {
        return word;
      }
      
      // Para palavras com letras, aplica camel case
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');

  return formatted;
}

/**
 * Extrai e formata o termo da campanha em uma única operação
 * @param campaignName - Nome completo da campanha
 * @param searchTerm - Termo de busca
 * @returns Termo da campanha extraído e formatado
 */
export function extractAndFormatCampaignTerm(campaignName: string, searchTerm: string): string {
  const extracted = extractCampaignTerm(campaignName, searchTerm);
  return formatCampaignTerm(extracted);
}

/**
 * Extrai estados únicos de uma lista de termos de campanha
 * @param campaignTerms - Lista de termos de campanha
 * @returns Lista de estados únicos
 */
export function extractUniqueStates(campaignTerms: string[]): string[] {
  const states = new Set<string>();
  
  campaignTerms.forEach(term => {
    if (term) {
      states.add(term);
    }
  });

  return Array.from(states).sort();
}
