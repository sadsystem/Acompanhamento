# 📦 Instruções de Backup - Sistema Acompanhamento Diário

## Como Exportar o Projeto Completo

### 1. 🗃️ Exportar Código (Export as Zip)
No Replit:
1. Clique no menu principal (≡) no canto superior esquerdo  
2. Procure por "Export as Zip" ou "Download as Zip"
3. Aguarde o download do arquivo ZIP com todo o código

### 2. 💾 Arquivos de Backup do Banco (Já Criados)
Os seguintes arquivos de backup foram criados automaticamente:
- `users_backup.csv` - Todos os usuários do sistema
- `evaluations_backup.csv` - Todas as avaliações registradas  
- `questions_backup.csv` - Configuração das perguntas

### 3. 🔄 Como Restaurar em Nova Janela
Para continuar o desenvolvimento:

1. **Código:** Importe o ZIP baixado em um novo Replit
2. **Banco:** Execute os comandos abaixo no Shell do novo projeto:

```bash
# Restaurar usuários
psql $DATABASE_URL -c "\COPY users FROM 'users_backup.csv' WITH CSV HEADER;"

# Restaurar avaliações  
psql $DATABASE_URL -c "\COPY evaluations FROM 'evaluations_backup.csv' WITH CSV HEADER;"

# Restaurar perguntas
psql $DATABASE_URL -c "\COPY questions FROM 'questions_backup.csv' WITH CSV HEADER;"
```

3. **Dependências:** Execute `npm install` para instalar todas as dependências

### 4. ✅ Verificação Final
Após restaurar, teste:
- Login funciona
- Dashboard carrega dados
- Criação de avaliações funciona
- Sincronização entre dispositivos

## 🔧 Estado Atual do Sistema
- ✅ API funcionando com PostgreSQL
- ✅ PWA para mobile
- ✅ Sincronização tempo real
- ⚠️ Score display ainda precisa correção (0.0%-1.0% → 0%-100%)

## 📋 Dependências Principais
- Node.js + TypeScript
- React + Vite
- PostgreSQL (Neon/Replit Database)
- Drizzle ORM
- Shadcn/ui + Tailwind CSS