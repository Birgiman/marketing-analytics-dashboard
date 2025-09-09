# 📱 Integração WhatsApp Business - LiveShop Analytics

## 🎯 Visão Geral

A integração WhatsApp Business permite conectar contas do WhatsApp Business API através da Evolution API, proporcionando análises de conversas, grupos e métricas de engajamento para otimização de campanhas de vendas.

## 🔧 Arquitetura Técnica

### Componentes Principais

```typescript
src/hooks/useWhatsAppConnection.tsx    // Hook React para conexão
src/components/QRCodeDisplay.tsx       // Interface de QR Code
src/services/whatsappService.ts        // Cliente Evolution API
```

### Fluxo de Conexão

```mermaid
graph TD
    A[Usuário clica "Conectar"] → B[Gerar QR Code]
    B → C[Usuário escaneia WhatsApp]
    C → D[Evolution API autentica]
    D → E[Status conectado]
    E → F[Sync grupos e contatos]
```

## 🚀 Como Usar

### 1. Conectar WhatsApp

1. Acesse página "Integrações"
2. Clique "Conectar WhatsApp"
3. Escaneie QR Code com WhatsApp Business
4. Aguarde confirmação de conexão

### 2. Sincronização Automática

```typescript
// Hook gerencia estado automaticamente
const {
  currentInstance,     // Instância ativa
  connectionState,     // Status da conexão
  qrCode,             // QR Code para escaneio
  isLoading,          // Estado de carregamento
  isSyncing,          // Sincronização ativa
  error,              // Mensagens de erro
  connect,            // Conectar nova instância
  disconnect,         // Desconectar
  generateQR,         // Gerar novo QR
  refreshInstances    // Atualizar dados
} = useWhatsAppConnection();
```

### 3. Gerenciamento de Grupos

- Sincronização automática de grupos
- Métricas de engajamento
- Análise de participantes
- Histórico de atividades

## 📊 Dados Coletados

### Instâncias
- Nome da instância
- Número do telefone
- Status de conexão
- Última sincronização

### Grupos WhatsApp
- Nome e descrição do grupo
- Número de participantes
- Administradores
- Data de criação

### Métricas de Engajamento
- Mensagens enviadas/recebidas
- Taxa de resposta
- Horários de maior atividade
- Análise de participantes ativos

### Logs de Atividade
- Conexões/desconexões
- Alterações em grupos
- Eventos de sincronização
- Erros e recuperação

## 🔐 Configuração Evolution API

### Variáveis de Ambiente

```env
# Configuração Evolution API
VITE_EVOLUTION_API_URL=https://your-evolution-api.com
VITE_EVOLUTION_API_KEY=your-api-key
VITE_EVOLUTION_INSTANCE_NAME=liveshop-instance
```

### Endpoints Utilizados

```typescript
// Criar instância
POST /instance/create

// Conectar via QR Code
GET /instance/connect/{instanceName}

// Status da conexão
GET /instance/connectionState/{instanceName}

// Buscar grupos
GET /group/fetchAllGroups/{instanceName}

// Logout/Desconectar
DELETE /instance/logout/{instanceName}
```

## 🛠️ Componentes de Interface

### QRCodeDisplay

```typescript
interface QRCodeDisplayProps {
  qrCode?: string;
  status: 'generating' | 'active' | 'connected' | 'error';
  countdown?: number;
  attempts?: number;
  maxAttempts?: number;
  isLoading?: boolean;
  error?: string;
  onRefresh: () => void;
  onCancel: () => void;
}
```

### Estados de Conexão

- **`disconnected`**: Desconectado, pode conectar
- **`connecting`**: Iniciando processo de conexão
- **`pending-qr`**: QR Code gerado, aguardando escaneio
- **`connected`**: Conectado e funcionando
- **`error`**: Erro na conexão ou operação

## 🔄 Sincronização e Polling

### Sistema de Polling

```typescript
// Verificação automática a cada 5 segundos
useEffect(() => {
  const interval = setInterval(checkConnectionStatus, 5000);
  return () => clearInterval(interval);
}, []);
```

### Pré-carregamento de Grupos

```typescript
// Busca grupos em background após conexão
const preloadGroups = async () => {
  const response = await fetch('/functions/v1/whatsapp-fetch-groups', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      instanceName: instance.name,
      userId: user.id
    })
  });
};
```

## 🚨 Tratamento de Erros

### Cenários Comuns

1. **QR Code Expirado**
   ```typescript
   // Auto-refresh após 50 segundos
   useEffect(() => {
     const timer = setTimeout(() => {
       if (connectionState === 'pending-qr') {
         generateQR();
       }
     }, 50000);
   }, [qrCode]);
   ```

2. **Conexão Perdida**
   ```typescript
   // Tentativa automática de reconexão
   if (connectionState === 'error') {
     setTimeout(() => {
       connect();
     }, 5000);
   }
   ```

3. **Rate Limiting**
   ```typescript
   // Implementação de throttling
   const rateLimiter = {
     attempts: 0,
     maxAttempts: 3,
     backoff: 1000
   };
   ```

## 📈 Analytics WhatsApp

### Métricas Principais

- **Grupos Ativos**: Número de grupos sincronizados
- **Participantes**: Total de contatos alcançados  
- **Taxa de Engajamento**: Interação por grupo
- **Horários de Pico**: Análise temporal

### Integração com Meta Ads

```typescript
// Correlação entre campanhas Meta e grupos WhatsApp
const correlateMetaWithWhatsApp = (metaCampaigns, whatsappGroups) => {
  return metaCampaigns.map(campaign => ({
    ...campaign,
    relatedGroups: findRelatedGroups(campaign, whatsappGroups),
    conversionRate: calculateConversion(campaign, whatsappGroups)
  }));
};
```

## 🔧 Configurações Avançadas

### WhatsAppAdvancedSettingsWrapper

```typescript
// Componente para configurações futuras
<WhatsAppAdvancedSettingsWrapper 
  currentInstance={currentInstance}
  onSettingsChange={handleSettingsUpdate}
/>
```

### Modo Demo

```typescript
// Para desenvolvimento sem WhatsApp real
if (DEMO_MODE) {
  return {
    currentInstance: demoInstance,
    connectionState: 'connected',
    qrCode: null,
    // ... dados mockados
  };
}
```

## 🚀 Edge Functions Supabase

### whatsapp-fetch-groups

```typescript
// Function para sincronização de grupos
export default async function handler(req: Request) {
  const { instanceName, userId } = await req.json();
  
  // Buscar grupos da Evolution API
  const groups = await fetchGroupsFromEvolution(instanceName);
  
  // Salvar no Supabase
  await saveGroupsToSupabase(groups, userId);
  
  return new Response(JSON.stringify({ success: true }));
}
```

## 📋 Tabelas Supabase

### whatsapp_instances
```sql
CREATE TABLE whatsapp_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  instance_name TEXT NOT NULL,
  phone_number TEXT,
  connection_state TEXT DEFAULT 'disconnected',
  created_at TIMESTAMP DEFAULT NOW()
);
```

### whatsapp_groups
```sql
CREATE TABLE whatsapp_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id UUID REFERENCES whatsapp_instances(id),
  group_id TEXT NOT NULL,
  group_name TEXT,
  participants_count INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);
```

## 🔄 Próximas Funcionalidades

### Planejadas
- [ ] Mensagens automáticas programadas
- [ ] Análise de sentimento em conversas
- [ ] Webhook para eventos em tempo real
- [ ] Dashboard específico WhatsApp
- [ ] Integração com CRM externo
- [ ] Backup automático de conversas

### Melhorias Técnicas
- [ ] Reconexão automática inteligente
- [ ] Cache de dados offline
- [ ] Compressão de imagens/mídia
- [ ] Análise de performance de mensagens

---

**Status**: ✅ Implementado e Funcional  
**Última Atualização**: Janeiro 2025  
**Responsável**: Sistema LiveShop Analytics