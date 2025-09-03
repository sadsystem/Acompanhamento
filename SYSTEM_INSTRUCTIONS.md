# 📋 INSTRUÇÕES COMPLETAS DO SISTEMA DE ACOMPANHAMENTO

## 🎯 VISÃO GERAL

Este é um sistema web fullstack para **avaliação e acompanhamento diário de colaboradores**, desenvolvido para a empresa Ouro Verde. O sistema permite que gestores avaliem o desempenho diário de colaboradores através de checklists estruturados, gerenciem equipes e acompanhem métricas de performance.

---

## 🏗️ ARQUITETURA TÉCNICA

### **Stack Tecnológico Completo**
```
Frontend:
├── React 18 + TypeScript
├── Vite (bundler e dev server)
├── TailwindCSS + shadcn/ui
├── Wouter (roteamento SPA)
├── React Query (cache/fetching)
├── React Hook Form + Zod

Backend:
├── Node.js + Express + TypeScript
├── Drizzle ORM
├── BCrypt (hash de senhas)
├── Multer (upload de arquivos)
├── CORS configurado

Banco de Dados:
├── Neon PostgreSQL (serverless)
├── Connection pooling otimizado
├── Migrations via Drizzle Kit

Deploy:
├── Vercel (serverless functions)
├── Build automático
├── Environment variables
```

### **Estrutura de Diretórios**
```
/
├── api/                      # Build output - funções serverless
├── client/                   # Frontend React
│   ├── src/
│   │   ├── components/       # Componentes UI reutilizáveis
│   │   ├── pages/           # Páginas principais do sistema
│   │   ├── config/          # Configurações, tipos e constantes
│   │   ├── storage/         # Adaptadores de armazenamento
│   │   ├── auth/            # Serviços de autenticação
│   │   ├── context/         # Contextos React
│   │   ├── hooks/           # Custom hooks
│   │   ├── lib/             # Utilitários e QueryClient
│   │   └── utils/           # Funções auxiliares
├── server/                   # Backend Express
│   ├── index.ts             # Servidor principal
│   ├── routes.ts            # Definição de rotas API
│   ├── storageNeon.ts       # Acesso ao banco de dados
│   └── db.ts                # Configuração do banco
├── shared/                   # Código compartilhado
│   ├── schema.ts            # Schema Drizzle + tipos Zod
│   └── schema.test.ts       # Testes do schema
├── public/                   # Assets estáticos
├── attached_assets/          # Assets do projeto
└── docs/                     # Documentação (arquivos *.md)
```

---

## 🗄️ MODELO DE DADOS

### **Tabelas do Banco de Dados**

#### **Users (Usuários)**
```typescript
{
  id: string (UUID)
  username: string (telefone sem formatação)
  phone: string (telefone formatado: "(87) 9 XXXX-XXXX")
  password: string (hash BCrypt)
  displayName: string
  role: "admin" | "colaborador" | "gestor"
  permission: "ADM" | "Colaborador" | "Gestor"
  active: boolean
  cargo?: "Motorista" | "Ajudante" | "ADM"
  cpf?: string
  createdAt: timestamp
}
```

#### **Questions (Perguntas do Checklist)**
```typescript
{
  id: string
  text: string
  order: number
  goodWhenYes: boolean (se "sim" é positivo)
  requireReasonWhen: "yes" | "no" | "never"
}
```

**Perguntas Padrão:**
1. "Chegou dentro do horário estipulado?" (boa=sim, justificar=não)
2. "Foi educado e prestativo nas atividades de hoje?" (boa=sim, justificar=não)
3. "Houve desvio de rota ao longo do dia?" (boa=não, justificar=sim)
4. "Causou alguma avaria ao manusear os produtos?" (boa=não, justificar=sim)

#### **Evaluations (Avaliações)**
```typescript
{
  id: string (UUID)
  createdAt: timestamp
  dateRef: string (YYYY-MM-DD)
  evaluator: string (username do avaliador)
  evaluated: string (username do avaliado)
  answers: Answer[] (JSON com respostas)
  score: number (pontuação calculada 0-1)
  status: "queued" | "synced"
}

// Answer structure:
{
  questionId: string
  value: boolean
  reason?: string
}
```

#### **Teams (Equipes)**
```typescript
{
  id: string (UUID)
  driverUsername: string (motorista)
  assistants: string[] (máximo 2 ajudantes)
  createdAt: timestamp
  updatedAt: timestamp
}
```

#### **Vehicles (Veículos)**
```typescript
{
  id: string (UUID)
  plate: string (placa do veículo)
  model?: string
  year?: number
  active: boolean
  createdAt: timestamp
  updatedAt: timestamp
}
```

#### **Routes (Rotas de Viagem)**
```typescript
{
  id: string (UUID)
  city: string (cidade principal)
  cities: string[] (lista completa das cidades)
  teamId?: string (referência à equipe)
  vehicleId?: string (referência ao veículo)
  startDate: string (YYYY-MM-DD)
  endDate?: string (YYYY-MM-DD quando concluída)
  status: "formation" | "active" | "completed"
  createdAt: timestamp
  updatedAt: timestamp
}
```

---

## 🔐 SISTEMA DE AUTENTICAÇÃO

### **Fluxo de Login**
1. **Input**: Telefone (username) + senha
2. **Validação**: BCrypt compare com hash armazenado
3. **Resposta**: Dados do usuário (sem senha) + sessão
4. **Armazenamento**: localStorage (`sad_session`)

### **Roles e Permissões**
- **admin**: Acesso total, dashboard, gestão de usuários
- **colaborador**: Apenas avaliação de parceiros
- **gestor**: Avaliação + relatórios (implementação futura)

### **Endpoints de Autenticação**
```
POST /api/auth/login     # Login com username/password
POST /api/auth/logout    # Logout (limpa sessão)
GET  /api/auth/me        # Dados do usuário atual
```

---

## 🌐 API ENDPOINTS COMPLETOS

### **Health Check**
```
GET /api/health          # Status da API e banco de dados
```

### **Users (Usuários)**
```
GET    /api/users/admin     # Lista todos os usuários (admin only)
GET    /api/users/team      # Lista usuários para formar equipes
POST   /api/users          # Criar novo usuário
POST   /api/users/import   # Importar usuários via XLSX
PUT    /api/users/:id      # Atualizar usuário
DELETE /api/users/:id      # Deletar usuário (soft delete)
```

### **Evaluations (Avaliações)**
```
GET  /api/evaluations      # Lista avaliações (com filtros)
POST /api/evaluations      # Criar nova avaliação
GET  /api/evaluations/stats # Estatísticas de avaliações
```

### **Teams (Equipes)**
```
GET    /api/teams          # Lista todas as equipes
POST   /api/teams          # Criar nova equipe
PUT    /api/teams/:id      # Atualizar equipe
DELETE /api/teams/:id      # Deletar equipe
```

### **Vehicles (Veículos)**
```
GET    /api/vehicles       # Lista todos os veículos
POST   /api/vehicles       # Criar novo veículo
PUT    /api/vehicles/:id   # Atualizar veículo
DELETE /api/vehicles/:id   # Deletar veículo
```

### **Routes (Rotas)**
```
GET    /api/routes         # Lista todas as rotas
POST   /api/routes         # Criar nova rota
PUT    /api/routes/:id     # Atualizar rota
DELETE /api/routes/:id     # Deletar rota
```

### **Reports (Relatórios)**
```
GET /api/reports/dashboard # Dados para dashboard
```

### **Debug (Desenvolvimento)**
```
GET /api/debug/diagnostics # Informações de debug
GET /api/debug/status      # Status detalhado do sistema
GET /api/debug/admin       # Verificar usuários admin
```

---

## 🖥️ PÁGINAS DO FRONTEND

### **1. LoginPage (`/`)**
- **Componente**: `LoginPage.tsx`
- **Funcionalidade**: Autenticação com telefone/senha
- **Features**: Checkbox "lembrar login", validação de campos
- **Redirecionamento**: Admin → Dashboard, Colaborador → SelectPartner

### **2. SelectPartnerPage (`/select-partner`)**
- **Componente**: `SelectPartnerPage.tsx`
- **Acesso**: Colaboradores autenticados
- **Funcionalidade**: Selecionar colaborador para avaliar
- **Features**: Lista filtrada, busca, visualização de cards

### **3. ChecklistPage (`/checklist`)**
- **Componente**: `ChecklistPage.tsx`
- **Funcionalidade**: Realizar avaliação com 4 perguntas padrão
- **Features**: 
  - Respostas sim/não com justificativas obrigatórias
  - Cálculo automático de pontuação
  - Salvamento em tempo real
  - Navegação entre perguntas

### **4. DashboardPage (`/dashboard`)**
- **Componente**: `DashboardPage.tsx`
- **Acesso**: Admins
- **Funcionalidade**: Visão geral do sistema
- **Features**: 
  - Estatísticas de avaliações
  - Filtros por período/usuário
  - Gráficos e métricas
  - Status de sincronização

### **5. AdminPage (`/admin`)**
- **Componente**: `AdminPage.tsx`
- **Acesso**: Admins
- **Funcionalidade**: Gestão de usuários
- **Features**:
  - CRUD completo de usuários
  - Importação via XLSX
  - Formulários validados
  - Tabela com filtros e paginação

### **6. TeamBuilderPage (`/teams`)**
- **Componente**: `TeamBuilderPage.tsx`
- **Acesso**: Admins
- **Funcionalidade**: Gestão de equipes, veículos e rotas
- **Features**:
  - Criação de equipes (1 motorista + até 2 ajudantes)
  - Cadastro de veículos
  - Definição de rotas com múltiplas cidades
  - Status tracking

---

## ⚙️ CONFIGURAÇÕES DO SISTEMA

### **Variáveis de Ambiente**
```bash
# Banco de Dados (OBRIGATÓRIO)
DATABASE_URL="postgresql://neondb_owner:***@ep-round-salad-ac2npaut-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"

# Ambiente
NODE_ENV="production"  # ou "development"

# Servidor (desenvolvimento)
PORT=3001
```

### **Scripts NPM**
```json
{
  "dev": "NODE_ENV=development tsx server/index.ts",
  "dev:full": "concurrently \"npm run dev:server\" \"npm run dev:client\"",
  "dev:server": "NODE_ENV=development tsx server/index.ts",
  "dev:client": "cd client && vite --host 0.0.0.0 --port 3002",
  "build": "npm run build:client && npm run build:server",
  "build:client": "vite build",
  "build:server": "esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=api",
  "start": "NODE_ENV=production node api/index.js",
  "db:push": "drizzle-kit push",
  "test": "vitest"
}
```

### **Scripts de Desenvolvimento**
```bash
# ⭐ COMANDO PRINCIPAL PARA TESTES LOCAIS
./start-dev.sh         # Inicia servidor + cliente completo (USAR ESTE!)

# Outros comandos disponíveis:
npm run dev:full       # Desenvolvimento completo (servidor + cliente)
npm run dev:server     # Apenas servidor backend
npm run dev:client     # Apenas cliente frontend
npm run dev            # Apenas servidor backend
```

### **Scripts de Deployment**

---

## 🔧 CONFIGURAÇÃO DE DESENVOLVIMENTO

### **1. Setup Inicial**
```bash
# Clonar repositório
git clone https://github.com/sadsystem/Acompanhamento.git
cd Acompanhamento

# Instalar dependências
npm install

# Configurar variáveis de ambiente
cp .env.example .env
# Editar .env com DATABASE_URL real

# Aplicar migrações do banco
npm run db:push

# ⭐ INICIAR SISTEMA PARA TESTES (COMANDO PRINCIPAL)
./start-dev.sh
```

### **2. Estrutura de URLs**
- **Desenvolvimento**: 
  - Frontend: http://localhost:3002
  - Backend API: http://localhost:3001/api
- **Produção**: 
  - Aplicação: https://acompanhamento-[hash].vercel.app
  - API: https://acompanhamento-[hash].vercel.app/api

### **3. Configuração do Vite**
```typescript
// vite.config.ts
resolve: {
  alias: {
    "@": path.resolve(__dirname, "client", "src"),
    "@shared": path.resolve(__dirname, "shared"),
    "@assets": path.resolve(__dirname, "attached_assets"),
  },
}
```

---

## 🚀 DEPLOY E PRODUÇÃO

### **Configuração Vercel (`vercel.json`)**
```json
{
  "version": 2,
  "rewrites": [
    {
      "source": "/api/(.*)",
      "destination": "/api/index.js"
    },
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ],
  "headers": [
    {
      "source": "/api/(.*)",
      "headers": [
        {"key": "Access-Control-Allow-Origin", "value": "*"},
        {"key": "Access-Control-Allow-Methods", "value": "GET, POST, PUT, DELETE, OPTIONS"},
        {"key": "Access-Control-Allow-Headers", "value": "Content-Type, Authorization, Accept"}
      ]
    }
  ]
}
```

### **Processo de Deploy**
1. **Build**: `npm run build` (compila client + server)
2. **Output**: 
   - `dist/` → Frontend estático
   - `api/` → Função serverless
3. **Deploy**: `vercel --prod`

### **Monitoramento**
- **Health Check**: `/api/health`
- **Status API**: Componente `ApiStatus` no canto inferior esquerdo
- **Logs**: Console do Vercel + logs estruturados

---

## 🧪 TESTES E QUALIDADE

### **Configuração de Testes**
- **Framework**: Vitest
- **Cobertura**: Baixa (precisa melhorar)
- **Tipos**: Testes unitários básicos

### **Executar Testes**
```bash
npm test              # Rodar testes
npm run test:ui       # Interface gráfica dos testes
```

### **Estrutura de Testes**
```
├── sum.test.ts                    # Teste básico de exemplo
├── shared/schema.test.ts          # Testes do schema
└── client/src/__tests__/          # Testes do frontend
    └── utils/                     # Utilitários de teste
```

---

## 🔍 DEBUG E TROUBLESHOOTING

### **Endpoints de Debug**
```
GET /api/debug/diagnostics  # Informações completas do sistema
GET /api/debug/status       # Status de componentes
GET /api/debug/admin        # Verificar usuários admin
GET /api/health            # Health check básico
```

### **Logs Estruturados**
```javascript
// Formato dos logs
"[TIMESTAMP] [SOURCE] MESSAGE"
"14:30:25 [express] POST /api/auth/login 200 in 45ms"
```

### **Problemas Comuns**

#### **1. Erro de Conexão com Banco**
```bash
# Verificar DATABASE_URL
echo $DATABASE_URL

# Testar conexão
curl https://seu-app.vercel.app/api/health
```

#### **2. Build Falha**
```bash
# Verificar tipos TypeScript
npm run check

# Build local
npm run build
```

#### **3. CORS Issues**
- Verificar configuração no `server/index.ts`
- Confirmar headers no `vercel.json`

#### **4. Sessão Perdida**
- localStorage pode estar corrompido
- Limpar `sad_session` manualmente

---

## 📊 MÉTRICAS E ANALYTICS

### **Cálculo de Pontuação**
```typescript
// Lógica de pontuação das avaliações
const score = answers.reduce((acc, answer) => {
  const question = questions.find(q => q.id === answer.questionId);
  if (!question) return acc;
  
  // Se "goodWhenYes" é true: sim=1, não=0
  // Se "goodWhenYes" é false: sim=0, não=1
  return acc + (answer.value === question.goodWhenYes ? 1 : 0);
}, 0) / questions.length;
```

### **Status de Sincronização**
- **queued**: Avaliação salva localmente, pendente sincronização
- **synced**: Avaliação sincronizada com servidor

### **Filtros de Relatório**
- Data (de/até)
- Avaliador
- Avaliado
- Status de sincronização

---

## 🔮 ROADMAP E MELHORIAS FUTURAS

### **Prioridade Alta**
1. **Implementar testes automatizados** (unitários + integração)
2. **Adicionar validação robusta** com Zod em todas APIs
3. **Sistema de logs estruturado** com níveis (error, warn, info, debug)
4. **Cache Redis** para performance em produção
5. **Rate limiting** nas APIs críticas

### **Prioridade Média**
1. **PWA completo** com offline support
2. **Sistema de notificações** push
3. **Exportação de relatórios** (PDF, Excel)
4. **Dashboard em tempo real** com WebSockets
5. **Sistema de backup** automatizado

### **Prioridade Baixa**
1. **Tema escuro** para UI
2. **Multi-idioma** (i18n)
3. **Sistema de comentários** nas avaliações
4. **Integração com sistemas externos** (ERP)
5. **Mobile app** nativo

---

## 📝 CONVENÇÕES DE CÓDIGO

### **TypeScript**
- Strict mode habilitado
- Interfaces para objetos complexos
- Types exportados do `shared/schema.ts`
- Validação com Zod

### **React**
- Functional components + hooks
- Custom hooks para lógica compartilhada
- Context API para estado global
- React Query para server state

### **Estilização**
- TailwindCSS para estilos
- shadcn/ui para componentes
- Responsive design (mobile-first)
- Consistent spacing e colors

### **Git**
- Conventional commits
- Feature branches
- Pull requests obrigatórios
- Squash merge

---

## 🚨 IMPORTANTES PARA LEMBRAR

### **Problema Resolvido - Sincronização de Dados**
🔥 **CORREÇÃO APLICADA**: Teams, Routes e Vehicles agora usam API em vez de localStorage
- **Antes**: Dados salvos apenas localmente (não sincronizavam entre dispositivos)
- **Depois**: Dados persistidos no banco Neon PostgreSQL via API
- **Arquivos alterados**: `client/src/storage/apiAdapter.ts`
- **Migrações aplicadas**: `npm run db:push` para criar tabelas faltantes

### **Credenciais de Desenvolvimento**
- **Admin padrão**: Criado automaticamente no primeiro start
- **Banco**: Neon PostgreSQL serverless
- **Deploy**: Vercel com variáveis de ambiente

### **Arquivos Críticos**
- `shared/schema.ts` → Definições do banco de dados
- `server/routes.ts` → Todas as APIs
- `server/storageNeon.ts` → Acesso ao banco
- `client/src/config/types.ts` → Tipos do frontend
- `vercel.json` → Configuração de deploy

### **Comandos Essenciais**
```bash
# ⭐ PARA TESTES E DESENVOLVIMENTO LOCAL
./start-dev.sh         # SEMPRE usar este comando para rodar localmente!

# Outros comandos importantes:
npm run build          # Build para produção
npm run db:push        # Aplicar migrations
./deploy.sh            # Deploy automático
```

### **URLs de Produção**
- **App**: https://acompanhamento-[hash].vercel.app
- **Health**: https://acompanhamento-[hash].vercel.app/api/health
- **Database**: Neon PostgreSQL (connection pooling)

---

## 💡 DICAS PARA DESENVOLVIMENTO

1. **⭐ SEMPRE usar `./start-dev.sh`** para rodar o sistema localmente (limpa processos e inicia completo)
2. **Sempre testar** endpoints no browser/Postman antes do frontend
3. **Usar React Query DevTools** para debug de cache
4. **Verificar logs** no Vercel Functions para debug de produção
5. **Validar tipos** com `npm run check` antes de commit
6. **Testar build local** com `npm run build && npm start`

---

**📅 Última atualização**: Janeiro 2025
**🏷️ Versão do sistema**: 0.81b
**👨‍💻 Desenvolvido para**: Ouro Verde - Sistema de Acompanhamento Diário
