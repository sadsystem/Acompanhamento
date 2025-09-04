# Guia de Desenvolvimento - Acompanhamento Diário v0.81b

## Arquitetura Geral

Sistema fullstack moderno para avaliação e acompanhamento diário de colaboradores em operações logísticas, com gestão completa de equipes, rotas e veículos:

- **Frontend**: React 18 + Vite + TypeScript + TailwindCSS + Radix UI + Wouter
- **Backend**: Node.js + Express + TypeScript (Serverless Vercel)
- **Banco de dados**: PostgreSQL (Neon Database) + Drizzle ORM + Zod
- **Estado**: React Query + Context API para cache e fetching
- **Deploy**: Vercel com configuração serverless otimizada

## Estrutura do Projeto

```
/workspaces/Acompanhamento/
├── client/               # Frontend React/Vite
│   ├── src/
│   │   ├── auth/        # AuthService + SessionManager
│   │   ├── components/  
│   │   │   ├── ui/      # Radix UI components (shadcn/ui)
│   │   │   └── forms/   # PhoneInput, CPFInput
│   │   ├── pages/       # LoginPage, DashboardPage, TeamBuilderPage, etc.
│   │   ├── storage/     # ApiStorageAdapter, LocalStorageAdapter
│   │   ├── config/      # types.ts, questions.ts, constants.ts
│   │   ├── hooks/       # useStorage, useMobile, useToast
│   │   ├── utils/       # calc.ts, time.ts, validation.ts
│   │   └── data/        # cities-pe.ts (cidades de Pernambuco)
│   └── public/          # PWA assets, manifest.json
├── server/              # Backend Express
│   ├── index.ts         # Servidor com Vite dev integration
│   ├── routes.ts        # Todas as rotas API REST
│   ├── storageNeon.ts   # Singleton para Neon Database
│   └── storage.ts       # MemStorage (fallback)
├── shared/              # Código compartilhado
│   └── schema.ts        # Drizzle schemas + Zod validation
├── api/                 # Build do servidor para Vercel
└── scripts/             # test-*.sh para debugging
```

## Fluxos Principais e Funcionalidades

### Sistema de Autenticação

1. **Login**: Telefone (apenas dígitos) + senha via `/api/auth/login`
2. **Roles**: "admin", "colaborador", "gestor" (controle de acesso granular)
3. **Sessão**: localStorage + token simples (não JWT para simplicidade)
4. **AuthService**: Classe centralizada para operações de auth

### Modelo de Dados Completo

#### **Users** (Colaboradores do Sistema)
```typescript
{
  id: string (UUID)
  username: string           // Telefone para login (apenas dígitos)
  phone: string             // Telefone formatado (87) 9 XXXX-XXXX
  password: string          // Hash bcrypt
  displayName: string       // Nome completo
  role: "admin" | "colaborador" | "gestor"
  permission: "ADM" | "Colaborador" | "Gestor"
  active: boolean           // Status ativo/inativo
  cargo: "Motorista" | "Ajudante" | "ADM"
  cpf?: string             // CPF opcional
  createdAt: timestamp
}
```

#### **Questions** (Perguntas de Avaliação) - **4 perguntas fixas**
```typescript
{
  id: string                // "pontualidade", "conduta", "desvio_rota", "avaria"
  text: string             // Texto da pergunta
  order: number            // Ordem de exibição (1-4)
  goodWhenYes: boolean     // true = SIM é bom, false = NÃO é bom
  requireReasonWhen: "yes" | "no" | "never"  // Quando exigir justificativa
}
```

#### **Evaluations** (Avaliações Realizadas)
```typescript
{
  id: string (UUID)
  createdAt: timestamp
  dateRef: string          // YYYY-MM-DD (data de referência BR)
  evaluator: string        // username do avaliador
  evaluated: string        // username do avaliado
  routeId?: string | null  // FK para routes (vínculo automático)
  answers: Answer[]        // Array JSON com respostas
  score: number           // 0-1 (convertido para 0-100 na UI)
  status: "queued" | "synced"
}

// Answer structure
type Answer = {
  questionId: string
  value: boolean          // true = SIM, false = NÃO
  reason?: string        // Justificativa quando obrigatória
}
```

#### **Teams** (Equipes de Trabalho)
```typescript
{
  id: string (UUID)
  driverUsername: string   // Motorista (obrigatório)
  assistants: string[]    // Array com até 2 ajudantes
  createdAt: timestamp
  updatedAt: timestamp
}

// Versão expandida com dados dos usuários
type TeamWithMembers = Team & {
  driver: User
  assistantUsers: User[]
}
```

#### **Routes** (Rotas de Viagem)
```typescript
{
  id: string (UUID)
  city: string            // Cidade principal ou resumo
  cities: string[]        // Lista completa de cidades
  teamId?: string | null  // FK para teams
  vehicleId?: string | null // FK para vehicles
  startDate: string       // YYYY-MM-DD
  endDate?: string | null // YYYY-MM-DD quando finalizada
  status: "formation" | "active" | "completed"
  createdAt: timestamp
  updatedAt: timestamp
}

// Versão expandida com equipe e veículo
type TravelRouteWithTeam = TravelRoute & {
  team?: TeamWithMembers
  vehicle?: Vehicle
}
```

#### **Vehicles** (Frota de Veículos)
```typescript
{
  id: string (UUID)
  plate: string           // Placa (ex: "PDO-0000")
  model?: string          // Modelo do veículo
  year?: number           // Ano de fabricação
  active: boolean         // Disponível/indisponível
  createdAt: timestamp
  updatedAt: timestamp
}
```

### Sistema de Avaliações - Fluxo Completo

#### **Perguntas Padrão (fixas no sistema)**
```typescript
const QUESTIONS = [
  {
    id: "pontualidade",
    text: "Chegou dentro do horário estipulado?",
    order: 1,
    goodWhenYes: true,        // SIM é a resposta positiva
    requireReasonWhen: "no"   // Exige justificativa quando resposta for NÃO
  },
  {
    id: "conduta",
    text: "Foi educado e prestativo nas atividades de hoje?",
    order: 2,
    goodWhenYes: true,
    requireReasonWhen: "no"
  },
  {
    id: "desvio_rota",
    text: "Houve desvio de rota ao longo do dia?",
    order: 3,
    goodWhenYes: false,       // NÃO é a resposta positiva
    requireReasonWhen: "yes"  // Exige justificativa quando resposta for SIM
  },
  {
    id: "avaria",
    text: "Causou alguma avaria ao manusear os produtos?",
    order: 4,
    goodWhenYes: false,
    requireReasonWhen: "yes"
  }
];
```

#### **Cálculo de Score**
```typescript
function calcScore(answers: Answer[], questions: Question[]): number {
  let good = 0;
  for (const answer of answers) {
    const question = questions.find(q => q.id === answer.questionId);
    if (answer.value === question.goodWhenYes) {
      good += 1;
    }
  }
  return good / questions.length; // Retorna 0-1, convertido para 0-100 na UI
}
```

#### **Integração com Rotas**
1. **Vínculo Automático**: Avaliações são automaticamente vinculadas à rota ativa do avaliador
2. **Detecção de Pendências**: Sistema detecta avaliações pendentes em rotas finalizadas
3. **Prevenção de Duplicatas**: Uma avaliação por colega por rota
4. **Filtros Avançados**: Busca por `routeId`, período, avaliador, status

### Sistema de Equipes e Rotas - TeamBuilder

#### **Formação de Equipes**
- **Drag & Drop Interface**: Arrastar usuários para formar equipes
- **Composição**: 1 Motorista + até 2 Ajudantes por equipe
- **Disponibilidade**: Sistema controla quem está livre vs ocupado
- **Validação**: Não permite formar equipes incompletas

#### **Ciclo de Vida das Rotas**
1. **Formation**: Rota criada, aguardando definição de equipe/veículo
2. **Active**: Rota confirmada e em execução (equipe ocupada)
3. **Completed**: Rota finalizada (recursos liberados, dados preservados)

#### **Gestão de Veículos**
- **Cadastro**: Placa, modelo, ano, status ativo
- **Controle de Uso**: 1 veículo por rota ativa
- **Interface Visual**: Seleção de veículo por rota
- **Validação**: Impede uso simultâneo do mesmo veículo

#### **Recursos Avançados**
- **Limite de Formações**: Máximo 2 rotas em formação simultânea
- **Preservação de Dados**: Dados mantidos quando rota é finalizada
- **Exportação PDF**: Relatório de rotas finalizadas por período
- **Múltiplas Cidades**: Sistema de busca de cidades de Pernambuco

### Dashboard e Relatórios - Analytics Completo

#### **Métricas Principais**
- **Total de Avaliações**: Contagem no período selecionado
- **Colaboradores Únicos**: Quantos foram avaliados
- **Score Médio**: Performance geral (0-100%)
- **Alertas Ativos**: Colaboradores com performance < 30%

#### **Visualizações Avançadas**
- **Tendência Semanal**: Gráfico de linha com evolução diária
- **Distribuição de Performance**: Pizza com faixas de score
- **Performance por Categoria**: Barras por pergunta
- **Ranking Individual**: Top 5 performers
- **Alertas Detalhados**: Lista de áreas de atenção

#### **Filtros e Exportação**
- **Período**: Data de/até
- **Colaborador**: Individual ou todos
- **Status**: Sincronizado/pendente
- **Rota**: Filtro por rota específica
- **Export CSV**: Dados completos para análise
- **Sincronização**: Batch sync de avaliações pendentes

### Padrões de Comunicação e API

#### **Arquitetura de API REST**
```
# Autenticação
POST /api/auth/login     # Login com telefone + senha
POST /api/auth/logout    # Logout (limpa sessão)
GET  /api/auth/me        # Verificar usuário atual

# Usuários
GET    /api/users        # Listar todos os usuários
POST   /api/users        # Criar novo usuário
PUT    /api/users/:id    # Atualizar usuário
DELETE /api/users/:id    # Deletar usuário

# Avaliações (com filtros avançados)
GET  /api/evaluations?dateFrom=X&dateTo=Y&evaluator=Z&routeId=W
POST /api/evaluations    # Criar nova avaliação

# Equipes
GET    /api/teams        # Listar equipes
POST   /api/teams        # Criar equipe
PUT    /api/teams/:id    # Atualizar equipe
DELETE /api/teams/:id    # Deletar equipe

# Rotas
GET    /api/routes       # Listar rotas
POST   /api/routes       # Criar rota
PUT    /api/routes/:id   # Atualizar rota
DELETE /api/routes/:id   # Deletar rota

# Veículos
GET    /api/vehicles     # Listar veículos
POST   /api/vehicles     # Criar veículo
PUT    /api/vehicles/:id # Atualizar veículo

# Relatórios
GET /api/reports/alerts   # Alertas de performance
GET /api/reports/export   # Exportação CSV
GET /api/health          # Health check + diagnósticos
```

#### **Storage Abstraction**
- **ApiStorageAdapter**: Comunicação com backend via fetch
- **LocalStorageAdapter**: Fallback para dados locais (desenvolvimento)
- **NeonStorage**: Conexão direta com PostgreSQL (backend)
- **Singleton Pattern**: Instância única do storage no backend

## Comandos Essenciais

```bash
# Desenvolvimento
npm run dev         # Inicia servidor de desenvolvimento (Express + Vite)
npm run dev:server  # Apenas servidor backend
npm run dev:client  # Apenas frontend Vite

# Produção
npm run build       # Compila frontend e backend para Vercel
npm run build:client # Compila apenas frontend
npm run build:server # Compila apenas backend
npm start           # Inicia servidor em modo produção

# Banco de Dados
npm run db:push     # Aplica alterações de schema ao banco (Drizzle)

# Testes e Debugging
npm test            # Executa testes unitários (Vitest)
./test-apis.sh      # Testa todas as APIs
./test-route-evaluation.sh  # Testa sistema de rotas+avaliações
./quick-test.sh     # Teste rápido de persistência
```

## Convenções Específicas

1. **Roteamento**: Usando `wouter` ao invés de react-router
2. **Estado Global**: React Query para cache/fetching e contexto para estado
3. **Estilização**: TailwindCSS com componentes Radix UI (shadcn/ui)
4. **Validação**: Zod para validação de dados client/server
   - Schemas de validação definidos junto com os schemas do banco em `shared/schema.ts`
   - Uso de `createInsertSchema` para criar schemas Zod a partir das definições Drizzle
5. **Versionamento**: Exibido no canto superior direito via `client/src/config/version.json`
6. **Monitoramento**: Componente de status da API no canto inferior esquerdo
7. **Sistema de Avaliações**:
   - Perguntas definidas em `client/src/config/questions.ts`
   - Fluxo de avaliação implementado em `ChecklistPage.tsx`
   - Cálculo de pontuação baseado em respostas e configuração das perguntas
8. **Drag & Drop**: Usando `@hello-pangea/dnd` para formar equipes
9. **Gráficos**: Recharts para dashboards e visualizações
10. **PWA**: Manifest.json e service-worker para Progressive Web App

## Pontos de Integração

1. **Neon Database**: PostgreSQL com `NeonStorage` para persistência
   - Conexão via `DATABASE_URL` definido em variáveis de ambiente
   - Uso de `Drizzle ORM` para operações no banco de dados
   - `storageNeon.ts` implementa operações CRUD para todas as entidades
   - Singleton pattern para reutilização de conexão em ambiente serverless
2. **Vercel**: Deploy com configuração específica para API e frontend
   - Configuração de rotas no `vercel.json` para servir API e frontend
   - Ambiente de produção com variáveis de ambiente
   - Otimizações para serverless (timeout, cache headers)
3. **PWA**: Suporte a Progressive Web App com geração de ícones
   - Script `create-pwa-icons` no `package.json`
   - Manifest.json configurado para instalação
   - Service Worker para cache offline

## Arquivos de Configuração Importantes

- `vercel.json`: Configurações de deploy, rotas e variáveis ambiente
- `client/src/config/types.ts`: Principais tipos do sistema
- `client/src/config/version.json`: Informações de versão mostradas na UI
- `client/src/config/questions.ts`: Configuração das 4 perguntas de avaliação
- `client/src/config/constants.ts`: Constantes globais e configurações
- `shared/schema.ts`: Schema do banco de dados + validações Zod
- `drizzle.config.ts`: Configuração do Drizzle ORM
- `.env` e `.env.production`: Variáveis de ambiente para desenvolvimento e produção

## Observações de Debugging

- Em produção, verifique o status da API através do indicador visual
- Use o endpoint `/api/health` para verificar a conectividade com o backend
- A rota `/api/auth/login` requer formato específico para telefone (apenas dígitos)
- Scripts de teste disponíveis na raiz do projeto para debugging específico
- Logs detalhados no servidor para debugging de operações de banco

## Melhorias Implementadas e Correções de Bugs

### **Correções de Interface e UX (Setembro 2025)**

1. **Sistema de Score Corrigido**:
   - **Problema**: Scores apareciam como "1.0%" ao invés de "100"
   - **Solução**: Multiplicação por 100 para conversão de 0-1 para 0-100
   - **Impacto**: Dashboard, avaliações e relatórios agora exibem porcentagens corretas

2. **Ordenação de Rotas Finalizadas**:
   - **Problema**: Rotas finalizadas apareciam por último
   - **Solução**: Ordenação por `endDate` em ordem decrescente (mais recentes primeiro)
   - **Local**: `TeamBuilderPage.tsx` - função `getFinishedRoutesPage()`

3. **Preservação de Dados em Rotas Finalizadas**:
   - **Problema**: Dados de equipe e veículo desapareciam após finalização
   - **Solução**: Preservação no estado local antes da deleção da equipe
   - **Detalhes**: Mantém dados completos de `TeamWithMembers` para exibição

### **Correções de Tipos TypeScript**

1. **Compatibilidade de Tipos `routeId`**:
   - Padronizado como `string | null` em todas as camadas
   - Corrigido em adaptadores de storage e tipos base
   - Eliminados conflitos entre `undefined` e `null`

2. **Tipos de Equipes em Rotas**:
   - Ajustados tipos para suportar preservação de dados
   - Cast explícito para `TravelRouteWithTeam[]` quando necessário
   - Compatibilidade total com `TeamWithMembers`

### **Sistema de Avaliações Aprimorado**

1. **Detecção de Pendências**:
   - Análise de histórico de avaliações para rotas finalizadas
   - Reconstrução de equipes a partir de dados de avaliação
   - Identificação inteligente de colegas não avaliados

2. **Integração Rota-Avaliação**:
   - Foreign Key `routeId` implementado no schema
   - Filtros de avaliação por rota funcionais
   - Vínculo automático de avaliações à rota ativa

## Padrões de Desenvolvimento Estabelecidos

### **Formatação de Dados**
- Scores: Armazenar 0-1, exibir 0-100 (multiplicar por 100)
- Datas: Formato YYYY-MM-DD para `dateRef`, ISO para `createdAt`
- IDs: UUIDs gerados via `randomUUID()` ou fallback customizado

### **Gerenciamento de Estado**
- Preservar dados críticos no estado local antes de deletar do banco
- Usar cast de tipos quando necessário para compatibilidade
- Manter consistência entre tipos frontend/backend

### **Boas Práticas de UX**
- Ordenação cronológica (mais recente primeiro) para listas
- Exibição de dados preservados mesmo após deleção de relacionamentos
- Feedback visual claro para estados de loading e erro

## Arquivos Críticos Recentemente Modificados

- `client/src/pages/DashboardPage.tsx`: Correção de formatação de scores
- `client/src/pages/TeamBuilderPage.tsx`: Ordenação e preservação de dados
- `client/src/config/types.ts`: Ajustes de tipos `routeId`
- `client/src/storage/*.ts`: Compatibilidade de tipos em adaptadores
- `server/storage.ts`: Padronização de tipos `routeId`

## Padrões de Desenvolvimento Estabelecidos

### **Formatação de Dados**
- Scores: Armazenar 0-1, exibir 0-100 (multiplicar por 100)
- Datas: Formato YYYY-MM-DD para `dateRef`, ISO para `createdAt`
- IDs: UUIDs gerados via `randomUUID()` ou fallback customizado

### **Gerenciamento de Estado**
- Preservar dados críticos no estado local antes de deletar do banco
- Usar cast de tipos quando necessário para compatibilidade
- Manter consistência entre tipos frontend/backend

### **Boas Práticas de UX**
- Ordenação cronológica (mais recente primeiro) para listas
- Exibição de dados preservados mesmo após deleção de relacionamentos
- Feedback visual claro para estados de loading e erro
