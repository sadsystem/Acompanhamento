# Guia de Desenvolvimento - Acompanhamento Diário

## Arquitetura Geral

Este é um aplicativo web fullstack para avaliação e acompanhamento diário de colaboradores, com as seguintes características:

- **Frontend**: React/Vite com TypeScript, utilizando TailwindCSS e Radix UI
- **Backend**: Node.js/Express com TypeScript
- **Banco de dados**: PostgreSQL via Supabase com Drizzle ORM
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
│   └── supabaseStorage.ts # Acesso ao banco de dados
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
  - Contém: `evaluator`, `evaluated`, `dateRef`, `answers`, `score`
  - As respostas (`answers`) são armazenadas como JSON
  - Status: "queued" (aguardando sincronização) | "synced" (sincronizado)
  - Pontuação calculada com base no padrão `goodWhenYes` das perguntas

- **Teams**: Equipes formadas por motorista e assistentes
  - Contém: `driverUsername` (motorista) e `assistants` (array com até 2 ajudantes)

- **Routes**: Rotas de viagem
  - Contém: `city` (cidade principal), `cities` (array de cidades), `teamId`, `startDate`, `endDate`
  - Status: "formation" | "active" | "completed"

### Padrões de Comunicação

- API REST com endpoints em `/api/*`
- `ApiStorageAdapter` abstrai chamadas API no frontend
- Suporte a diagnóstico com endpoint `/api/health`

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

1. **Supabase**: PostgreSQL com `SupabaseStorage` para persistência
   - Conexão via `DATABASE_URL` definido em variáveis de ambiente
   - Uso de `Drizzle ORM` para operações no banco de dados
   - `supabaseStorage.ts` implementa operações CRUD para todas as entidades
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
