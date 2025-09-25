# 📋 WhatsApp Groups Job Queue - Arquitetura Assíncrona

## Visão Geral

Sistema de Job Queue assíncrono para resolver o problema de timeout na busca de grupos WhatsApp em contas com 600+ grupos. A solução substitui a execução síncrona limitada por timeout por um sistema robusto de processamento em background.

## Problema Resolvido

- **Antes**: Edge Function `fetch-groups-chunked` falhava com timeout (~30s) para contas grandes
- **Depois**: Processamento assíncrono em lotes pequenos, sem limite de tempo total

## Arquitetura

### 1. Tabela de Jobs (`whatsapp_group_fetch_jobs`)

```sql
CREATE TABLE whatsapp_group_fetch_jobs (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL,
  instance_name text NOT NULL,
  search_term text,
  status text DEFAULT 'pending',  -- pending | running | failed | completed
  current_page integer DEFAULT 0,
  total_pages integer,
  chunk_size integer DEFAULT 10,
  page_delay integer DEFAULT 500,
  result_count integer DEFAULT 0,
  last_error text,
  started_at timestamp,
  finished_at timestamp,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);
```

### 2. Edge Functions

#### 2.1 `start-fetch-groups`
**Endpoint**: `POST /functions/v1/start-fetch-groups`

**Responsabilidade**: Criar novo job de fetch
- Valida parâmetros de entrada
- Verifica se já existe job running/pending para a instância
- Cria novo job com status `pending`
- Retorna `jobId` para polling

**Input**:
```json
{
  "instanceName": "string",
  "userId": "string",
  "searchTerm": "string (opcional)",
  "chunkSize": 10,
  "pageDelay": 500
}
```

**Output**:
```json
{
  "success": true,
  "jobId": "uuid",
  "message": "Job created successfully"
}
```

#### 2.2 `job-status`
**Endpoint**: `GET /functions/v1/job-status/{jobId}`

**Responsabilidade**: Consultar status e progresso do job
- Retorna dados completos do job
- Calcula progresso percentual
- Estima tempo restante
- Fornece mensagens de status amigáveis

**Output**:
```json
{
  "success": true,
  "job": {
    "id": "uuid",
    "status": "running",
    "instanceName": "string",
    "currentPage": 5,
    "totalPages": 20,
    "resultCount": 45,
    "progress": {
      "percentage": 25,
      "message": "Processando página 5 de 20",
      "estimatedTimeRemaining": "3 min restantes"
    }
  }
}
```

#### 2.3 `process-fetch-groups-job` (Worker)
**Endpoint**: `POST /functions/v1/process-fetch-groups-job`

**Responsabilidade**: Worker assíncrono que processa jobs
- Busca jobs `pending` ou `running` órfãos (> 5 min sem update)
- Processa até 3 páginas por execução (limite de 30s da Edge Function)
- Salva grupos incrementalmente na tabela `whatsapp_groups`
- Atualiza progresso continuamente
- Marca jobs como `completed` ou `failed`

**Características**:
- **Idempotente**: Pode ser executado múltiplas vezes sem problemas
- **Resiliente**: Retry automático com backoff exponencial
- **Limitado por tempo**: Processa lotes pequenos para evitar timeout
- **Auto-recuperação**: Retoma jobs órfãos

## Fluxo de Funcionamento

### 1. Inicialização (Frontend)
```javascript
// 1. Usuário solicita busca de grupos
const response = await supabase.functions.invoke('start-fetch-groups', {
  body: {
    instanceName: 'minha_instancia',
    userId: user.id,
    searchTerm: 'vendas' // opcional
  }
});

const jobId = response.data.jobId;
```

### 2. Polling de Status (Frontend)
```javascript
// 2. Frontend faz polling do status
const pollJobStatus = async (jobId) => {
  const response = await supabase.functions.invoke(`job-status/${jobId}`);
  const job = response.data.job;

  if (job.status === 'completed') {
    console.log(`Concluído! ${job.resultCount} grupos encontrados`);
    // Buscar grupos salvos na tabela whatsapp_groups
    return 'completed';
  } else if (job.status === 'failed') {
    console.error('Job falhou:', job.lastError);
    return 'failed';
  } else {
    console.log(`Progresso: ${job.progress.percentage}% - ${job.progress.message}`);
    // Continuar polling
    setTimeout(() => pollJobStatus(jobId), 2000);
  }
};
```

### 3. Processamento Background (Scheduler)
```javascript
// 3. Scheduler executa worker a cada 30-60s
// (Via cron job, webhook, ou chamada manual)
await supabase.functions.invoke('process-fetch-groups-job');
```

## Scheduler/Trigger

**Opções para executar o worker automaticamente**:

1. **Cron Job Externo** (Recomendado):
   ```bash
   # A cada 30 segundos
   */30 * * * * * curl -X POST https://seu-projeto.supabase.co/functions/v1/process-fetch-groups-job
   ```

2. **Webhook/Timer Service** (Vercel Cron, GitHub Actions, etc.)

3. **Supabase Database Webhook** (trigger em INSERT na tabela de jobs)

4. **Frontend Trigger** (chamar worker após criar job)

## Vantagens da Nova Arquitetura

### ✅ **Robustez**
- Sem timeout: Jobs podem levar horas se necessário
- Retry automático em falhas
- Recovery de jobs órfãos

### ✅ **Performance**
- Processamento em lotes otimizados (3 páginas/execução)
- Sem bloqueio do frontend
- Múltiplos jobs simultâneos

### ✅ **UX**
- Feedback em tempo real do progresso
- Estimativa de tempo restante
- Interface não bloqueia

### ✅ **Escalabilidade**
- Worker pode processar múltiplos jobs
- Facilmente adaptável para outros tipos de job
- Logs detalhados para debugging

## Configurações Ajustáveis

```typescript
// Worker Configuration
const MAX_PAGES_PER_EXECUTION = 3;    // Páginas por execução do worker
const REQUEST_TIMEOUT = 60000;        // Timeout por requisição (60s)
const RETRY_ATTEMPTS = 2;             // Tentativas por página
const CHUNK_SIZE = 10;                // Grupos por página
const PAGE_DELAY = 500;               // Delay entre páginas (ms)
```

## Monitoramento e Logs

Todos os componentes possuem logs detalhados:
- `🚀` Início de operações
- `📋` Parâmetros e configurações
- `✅` Sucessos com métricas
- `❌` Erros com contexto
- `📊` Progresso e estatísticas

## Fallback e Compatibilidade

- ✅ Função `fetch-groups-chunked` mantida para fallback
- ✅ Tabela `whatsapp_groups` permanece inalterada
- ✅ Frontend pode usar ambas as abordagens
- ✅ Migração gradual sem breaking changes

## Próximos Passos

1. **Deploy das funções**: `npx supabase functions deploy`
2. **Executar migration**: SQL no Supabase Dashboard
3. **Configurar scheduler**: Cron job ou webhook
4. **Integrar frontend**: Substituir chamadas síncronas
5. **Monitorar performance**: Ajustar configurações se necessário