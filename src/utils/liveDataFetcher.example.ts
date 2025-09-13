/**
 * Exemplo de uso do LiveDataFetcher
 * 
 * Este arquivo mostra como usar a função fetchCompleteLiveData
 * para buscar todos os dados relacionados a uma Live em uma única operação.
 */

import { fetchCompleteLiveData, testLiveDataFetcher } from './liveDataFetcher';

// Exemplo 1: Uso básico
export async function exemploUsoBasico() {
  try {
    // Substitua por um ID de Live real do seu banco
    const liveId = 'seu-live-id-aqui';
    
    const data = await fetchCompleteLiveData(liveId);
    
    console.log('Dados da Live:', data.live);
    console.log('Grupos:', data.groups);
    console.log('Campanhas do Meta:', data.allUserCampaigns);
    console.log('Insights:', data.campaignInsights);
    console.log('Resumo:', data.summary);
    
    return data;
  } catch (error) {
    console.error('Erro:', error);
  }
}

// Exemplo 2: Uso em componente React
export function ExemploComponenteReact() {
  const [liveData, setLiveData] = useState(null);
  const [loading, setLoading] = useState(false);
  
  const carregarDadosLive = async (liveId: string) => {
    setLoading(true);
    try {
      const data = await fetchCompleteLiveData(liveId);
      setLiveData(data);
    } catch (error) {
      console.error('Erro ao carregar dados da live:', error);
    } finally {
      setLoading(false);
    }
  };
  
  // Resto do componente...
}

// Exemplo 3: Teste no console do navegador
/*
Para testar no console do navegador:

1. Abra o DevTools (F12)
2. Vá para a aba Console
3. Execute:

   // Teste com um ID de Live real
   testLiveDataFetcher('substitua-por-live-id-real')

   // Ou use diretamente:
   fetchCompleteLiveData('substitua-por-live-id-real').then(data => {
     console.log('Resultado:', data);
   });

*/

// Exemplo 4: Como obter IDs de Lives existentes
export async function listarLivesDoUsuario() {
  // Este é um exemplo de como você pode buscar IDs de Lives primeiro
  const { data: lives } = await supabase
    .from('lives')
    .select('id, name')
    .limit(10);
    
  console.log('Lives disponíveis para teste:');
  lives?.forEach(live => {
    console.log(`ID: ${live.id} - Nome: ${live.name}`);
  });
  
  return lives;
}

// Instruções de teste:
console.log(`
🧪 INSTRUÇÕES PARA TESTE:

1. Primeiro, liste as Lives disponíveis:
   listarLivesDoUsuario()

2. Copie um ID de Live e teste:
   testLiveDataFetcher('cole-o-id-aqui')

3. A função irá:
   ✅ Buscar dados da Live
   ✅ Buscar dados do usuário  
   ✅ Buscar grupos vinculados
   ✅ Buscar integração Meta
   ✅ Buscar todas as campanhas do usuário
   ✅ Buscar campanhas vinculadas à Live
   ✅ Buscar insights das campanhas
   ✅ Calcular resumo completo

4. Tudo isso em uma única chamada de função!
`);