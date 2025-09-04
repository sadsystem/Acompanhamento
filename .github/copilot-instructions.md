# Guia de Desenvolvimento - Acompanhamento Diário

## Arquitetura Geral

Este é um aplicativo web fullstack para avaliação e acompanhamento diário de colaboradores, com as seguintes características:

- **Frontend**: React/Vite com TypeScript, utilizando TailwindCSS e Radix UI.
- **Backend**: Node.js/Express com TypeScript.
- **Banco de dados**: PostgreSQL via Neon Database com Drizzle ORM
- **Deploy**: Vercel

## Estrutura do Projeto

```
/
├── client/           # Frontend React/Vite
│   └── src/
│       ├── auth/     # Autenticação
│       ├── components/
│       ├── pages/    # Componentes de página
│       ├── storage/  # Adaptadores de armazenamento
│       └── config/   # Configurações e tipos
├── server/           # Backend Express
│   ├── index.ts      # Ponto de entrada do servidor
│   ├── routes.ts     # Definição de rotas API
│   └── storageNeon.ts # Acesso ao banco de dados Neon
└── shared/           # Código compartilhado
    └── schema.ts     # Esquema do banco de dados
```

## Fluxos Principais

### Autenticação

1. Login baseado em telefone/senha via `/api/auth/login`
2. Modelo de roles: "admin", "colaborador", "gestor"
3. Sessão mantida via localStorage (não JWT)

### Modelo de Dados

- **Users**: Usuários do sistema (colaboradores, gestores)
  - Campos principais: `username` (telefone para login), `password`, `displayName`, `role`, `cargo`
  - Roles: "admin", "colaborador", "gestor"
  - Cargos: "Motorista", "Ajudante", "ADM"

- **Questions**: Perguntas para avaliações
  - Estrutura: `id`, `text`, `order`, `goodWhenYes`, `requireReasonWhen`
  - Respostas binárias (sim/não) com justificativa opcional

- **Evaluations**: Avaliações realizadas
  - Contém: `evaluator`, `evaluated`, `dateRef`, `answers`, `score`, `routeId` (FK para rotas)
  - As respostas (`answers`) são armazenadas como JSON
  - Status: "queued" (aguardando sincronização) | "synced" (sincronizado)
  - Pontuação calculada como 0-1 (convertida para 0-100 na exibição)
  - **IMPORTANTE**: Scores são armazenados como decimal (0-1) mas exibidos como porcentagem (0-100)

- **Teams**: Equipes formadas por motorista e assistentes
  - Contém: `driverUsername` (motorista) e `assistants` (array com até 2 ajudantes)
  - Relacionamento com `TeamWithMembers` que inclui dados completos dos usuários

- **Routes**: Rotas de viagem
  - Contém: `city` (cidade principal), `cities` (array de cidades), `teamId`, `startDate`, `endDate`
  - Status: "formation" | "active" | "completed"
  - **Relacionamento com Evaluations**: Foreign Key `routeId` permite filtrar avaliações por rota
  - **Preservação de Dados**: Dados de equipe são preservados no estado local quando rota é finalizada

- **Vehicles**: Veículos do sistema
  - Contém: `plate`, `model`, `year`, `active`
  - Relacionamento com rotas via `vehicleId`

### Sistema de Avaliações e Rotas

1. **Fluxo de Avaliação Integrado**:
   - Avaliações são vinculadas automaticamente à rota ativa do avaliador
   - Sistema detecta avaliações pendentes em rotas finalizadas
   - Lógica complexa para reconstruir equipes a partir do histórico de avaliações

2. **Detecção de Avaliações Pendentes**:
   - Quando `teamId` é `null` (rota finalizada), sistema analisa histórico de avaliações
   - Reconstrói dados da equipe a partir das avaliações existentes
   - Identifica colegas de equipe que ainda não foram avaliados

3. **Gerenciamento de Rotas Finalizadas**:
   - Dados da equipe são preservados no estado local para exibição
   - Ordenação cronológica (mais recentes primeiro)
   - Limpeza automática de recursos (equipes retornam ao pool disponível)

### Padrões de Comunicação

- API REST com endpoints em `/api/*`
- `ApiStorageAdapter` abstrai chamadas API no frontend
- Suporte a diagnóstico com endpoint `/api/health`
- **Filtros Avançados**: Suporte a filtro por `routeId` em avaliações

## Comandos Essenciais

```bash
# Desenvolvimento
npm run dev         # Inicia servidor de desenvolvimento

# Produção
npm run build       # Compila frontend e backend
npm start           # Inicia servidor em modo produção

# Banco de Dados
npm run db:push     # Aplica alterações de schema ao banco
```

## Convenções Específicas

1. **Roteamento**: Usando `wouter` ao invés de react-router
2. **Estado Global**: React Query para cache/fetching e contexto para estado
3. **Estilização**: TailwindCSS com componentes Radix UI
4. **Validação**: Zod para validação de dados client/server
   - Schemas de validação definidos junto com os schemas do banco em `shared/schema.ts`
   - Uso de `createInsertSchema` para criar schemas Zod a partir das definições Drizzle
5. **Versionamento**: Exibido no canto superior direito via `client/src/config/version.json`
6. **Monitoramento**: Componente de status da API no canto inferior esquerdo
7. **Sistema de Avaliações**:
   - Perguntas definidas em `client/src/config/questions.ts`
   - Fluxo de avaliação implementado em `ChecklistPage.tsx`
   - Cálculo de pontuação baseado em respostas e configuração das perguntas

## Pontos de Integração

1. **Neon Database**: PostgreSQL com `NeonStorage` para persistência
   - Conexão via `DATABASE_URL` definido em variáveis de ambiente
   - Uso de `Drizzle ORM` para operações no banco de dados
   - `storageNeon.ts` implementa operações CRUD para todas as entidades
2. **Vercel**: Deploy com configuração específica para API e frontend
   - Configuração de rotas no `vercel.json` para servir API e frontend
   - Ambiente de produção com variáveis de ambiente
3. **PWA**: Suporte a Progressive Web App com geração de ícones
   - Script `create-pwa-icons` no `package.json`

## Arquivos de Configuração Importantes

- `vercel.json`: Configurações de deploy, rotas e variáveis ambiente
- `client/src/config/types.ts`: Principais tipos do sistema
- `client/src/config/version.json`: Informações de versão mostradas na UI
- `.env` e `.env.production`: Variáveis de ambiente para desenvolvimento e produção

## Observações de Debugging

- Em produção, verifique o status da API através do indicador visual
- Use o endpoint `/api/health` para verificar a conectividade com o backend
- A rota `/api/auth/login` requer formato específico para telefone (apenas dígitos)

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
