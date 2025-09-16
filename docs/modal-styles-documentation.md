# Documentação de Modais - LiveShop Analytics

## Visão Geral

Esta documentação apresenta todos os modais utilizados na aplicação LiveShop Analytics, seus estilos CSS e onde são utilizados.

## Base CSS - Dialog Component

Todos os modais da aplicação utilizam o componente base `Dialog` localizado em `src/components/ui/dialog.tsx`, que usa Radix UI como biblioteca base.

### Estilos Base do Dialog:

#### DialogOverlay
```css
className="fixed inset-0 z-50 bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
```
- **Background**: Semi-transparente preto (50% opacidade)
- **Posição**: Fixa cobrindo toda a tela
- **Z-index**: 50
- **Animações**: Fade in/out na abertura/fechamento

#### DialogContent (Base)
```css
className="fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-white p-6 shadow-2xl duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg"
```
- **Posição**: Centralizado na tela
- **Largura máxima padrão**: `max-w-lg` (32rem)
- **Background**: Branco
- **Padding**: 1.5rem (p-6)
- **Sombra**: Sombra forte (`shadow-2xl`)
- **Animações**: Zoom e slide na abertura/fechamento

#### DialogHeader
```css
className="flex flex-col space-y-1.5 text-center sm:text-left"
```

#### DialogTitle
```css
className="text-lg font-semibold leading-none tracking-tight"
```

#### DialogDescription
```css
className="text-sm text-muted-foreground"
```

---

## Modais da Aplicação

### 1. CampaignSelector
**Arquivo**: `src/components/CampaignSelector.tsx`
**Usado em**: Dashboard (CreateLiveModal)

#### Estilos Customizados:
```css
DialogContent: "max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
DialogTitle: "flex items-center gap-2"
```

#### Características:
- **Largura**: Extra grande (`max-w-4xl` = 56rem)
- **Altura**: Máxima 90% da viewport
- **Layout**: Flexbox coluna
- **Overflow**: Oculto no container principal
- **Funcionalidade**: Seleção de campanhas Meta em 2 etapas
  1. Seleção de conta publicitária
  2. Seleção de campanhas específicas

#### Telas que utilizam:
- Dashboard → Criar Live → Selecionar Campanhas

---

### 2. CreateLiveModal
**Arquivo**: `src/components/CreateLiveModal.tsx`
**Usado em**: Dashboard

#### Estilos Customizados:
```css
DialogContent: "max-w-2xl w-full overflow-y-auto overflow-x-hidden ${
  currentStep === 1 ? 'max-h-[85vh]' : 'max-h-[90vh]'
}"
```

#### Características:
- **Largura**: Grande (`max-w-2xl` = 42rem)
- **Altura**: Dinâmica baseada no passo atual
  - Passo 1: 85% da viewport
  - Outros passos: 90% da viewport
- **Overflow**: Scroll vertical permitido, horizontal oculto
- **Funcionalidade**: Criação de Lives em múltiplos passos
  1. Configuração básica
  2. Seleção de grupos WhatsApp
  3. Seleção de campanhas Meta

#### Background específico:
```css
/* Passo 2 - Lista de grupos */
"space-y-2 max-h-32 overflow-y-auto bg-gray-50 rounded-lg p-3"
```

#### Telas que utilizam:
- Dashboard → Botão "Criar Live"

---

### 3. GroupSearchSelector
**Arquivo**: `src/components/GroupSearchSelector.tsx`
**Usado em**: CreateLiveModal

#### Estilos Customizados:
```css
DialogContent: "max-w-4xl max-h-[80vh] overflow-hidden flex flex-col"
DialogTitle: "flex items-center gap-2"
```

#### Características:
- **Largura**: Extra grande (`max-w-4xl` = 56rem)
- **Altura**: Máxima 80% da viewport
- **Layout**: Flexbox coluna
- **Funcionalidade**: Busca e seleção de grupos WhatsApp

#### Telas que utilizam:
- Dashboard → Criar Live → Selecionar Grupos

---

### 4. MetaAdsConnection
**Arquivo**: `src/components/MetaAdsConnection.tsx`
**Usado em**: Integrations

#### Estilos Customizados:
```css
DialogContent: "max-w-4xl max-h-[80vh] overflow-y-auto"
DialogTitle: "flex items-center gap-2"
```

#### Características:
- **Largura**: Extra grande (`max-w-4xl` = 56rem)
- **Altura**: Máxima 80% da viewport
- **Overflow**: Scroll vertical permitido
- **Funcionalidade**: Configuração de conexão com Meta Ads

#### Telas que utilizam:
- Integrations → Meta Ads Connection

---

### 5. LivesListModal
**Arquivo**: `src/components/LivesListModal.tsx`
**Usado em**: Dashboard

#### Estilos Customizados:
```css
DialogContent: "max-w-6xl max-h-[80vh] overflow-y-auto"
DialogTitle: "text-xl font-semibold"
```

#### Características:
- **Largura**: Máxima (`max-w-6xl` = 72rem)
- **Altura**: Máxima 80% da viewport
- **Título**: Extra grande e semibold
- **Funcionalidade**: Listagem e gerenciamento de todas as Lives

#### Telas que utilizam:
- Dashboard → Ver todas as Lives

---

### 6. ConfirmationModal
**Arquivo**: `src/components/ConfirmationModal.tsx`
**Usado em**: Dashboard, LivesListModal

#### Estilos Customizados:
```css
DialogContent: "max-w-md"
DialogDescription: "text-left"
```

#### Características:
- **Largura**: Média (`max-w-md` = 28rem)
- **Funcionalidade**: Modal de confirmação reutilizável
- **Variantes**: Default e Destructive (com ícone de alerta)

#### Telas que utilizam:
- Dashboard → Confirmações de ações
- LivesListModal → Confirmação de exclusão

---

### 7. AccountSettingsModal
**Arquivo**: `src/components/AccountSettingsModal.tsx`
**Usado em**: SalesHeader

#### Estilos Customizados:
```css
DialogContent: "max-w-2xl max-h-[90vh] overflow-y-auto"
DialogTitle: "flex items-center gap-2"
```

#### Características:
- **Largura**: Grande (`max-w-2xl` = 42rem)
- **Altura**: Máxima 90% da viewport
- **Overflow**: Scroll vertical permitido
- **Funcionalidade**: Configurações de conta da empresa

#### Telas que utilizam:
- SalesHeader → Configurações da Conta

---

### 8. WhatsAppAdvancedSettings
**Arquivo**: `src/components/WhatsAppAdvancedSettings.tsx`
**Usado em**: Integrations

#### Estilos Customizados:
```css
DialogContent: "max-w-2xl max-h-[80vh] overflow-hidden flex flex-col"
DialogTitle: "flex items-center gap-2"
```

#### Características:
- **Largura**: Grande (`max-w-2xl` = 42rem)
- **Altura**: Máxima 80% da viewport
- **Layout**: Flexbox coluna
- **Funcionalidade**: Configurações avançadas do WhatsApp

#### Telas que utilizam:
- Integrations → WhatsApp Advanced Settings

---

### 9. AddressModal
**Arquivo**: `src/components/AddressModal.tsx`
**Usado em**: SalesHeader

#### Estilos Customizados:
```css
DialogContent: "sm:max-w-md"
DialogTitle: "text-lg font-semibold"
```

#### Características:
- **Largura**: Média responsiva (`sm:max-w-md` = 28rem em telas pequenas+)
- **Funcionalidade**: Cadastro de endereço de envio

#### Telas que utilizam:
- SalesHeader → Endereço de Envio

---

## Categorização por Tamanho

### Pequenos (`max-w-md` - 28rem)
- ConfirmationModal
- AddressModal

### Médios (`max-w-2xl` - 42rem)
- CreateLiveModal
- AccountSettingsModal
- WhatsAppAdvancedSettings

### Grandes (`max-w-4xl` - 56rem)
- CampaignSelector
- GroupSearchSelector
- MetaAdsConnection

### Extra Grandes (`max-w-6xl` - 72rem)
- LivesListModal

---

## Padrões de Altura

### 80% da Viewport (`max-h-[80vh]`)
- GroupSearchSelector
- MetaAdsConnection
- LivesListModal
- WhatsAppAdvancedSettings

### 85-90% da Viewport
- CreateLiveModal (dinâmico: 85vh → 90vh)
- CampaignSelector (90vh)
- AccountSettingsModal (90vh)

### Sem altura específica
- ConfirmationModal
- AddressModal

---

## Padrões de Overflow

### Scroll Vertical (`overflow-y-auto`)
- CreateLiveModal
- MetaAdsConnection
- LivesListModal
- AccountSettingsModal

### Overflow Oculto (`overflow-hidden`)
- CampaignSelector
- GroupSearchSelector
- WhatsAppAdvancedSettings

### Sem overflow específico
- ConfirmationModal
- AddressModal

---

## Animações

Todos os modais herdam as animações base do Dialog:
- **Entrada**: Fade in + Zoom in + Slide in
- **Saída**: Fade out + Zoom out + Slide out
- **Duração**: 200ms
- **Overlay**: Fade in/out independente

---

## Responsividade

- Todos os modais são responsivos por padrão
- Uso do prefixo `sm:` para breakpoints específicos
- Larguras se ajustam automaticamente em telas menores
- Alturas máximas em `vh` garantem que não excedam a viewport
