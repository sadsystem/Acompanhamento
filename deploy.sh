#!/bin/bash

# Vercel Deploy Script
# Este script automatiza o deploy para o Vercel

echo "🚀 Iniciando deploy para Vercel..."

# Verificar se o Vercel CLI está instalado
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI não está instalado. Instalando..."
    npm install -g vercel
fi

# Verificar estado do git
echo "📋 Verificando estado do Git..."
if [ -n "$(git status --porcelain)" ]; then
    echo "⚠️  Existem alterações não commitadas."
    read -p "Deseja fazer commit dessas alterações? (s/n): " COMMIT_CHOICE
    
    if [ "$COMMIT_CHOICE" = "s" ] || [ "$COMMIT_CHOICE" = "S" ]; then
        git add .
        read -p "Mensagem do commit: " COMMIT_MSG
        git commit -m "$COMMIT_MSG"
        echo "✅ Commit realizado."
    else
        echo "⚠️  Continuando sem commit..."
    fi
fi

# Realizar build
echo "🔨 Executando build do projeto..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build falhou! Corrigindo problemas antes de continuar."
    exit 1
fi

echo "✅ Build completo!"

# Criar arquivo .env.production para Vercel
echo "📝 Configurando variáveis de ambiente..."
cat > .env.production << EOF
NODE_ENV=production
DATABASE_URL=postgresql://postgres.bppbdcbtudnzzojmnjrw:9qoCu5vnxzDAMhCF@aws-1-sa-east-1.pooler.supabase.com:6543/postgres
EOF

# Deploy para Vercel
echo "🚀 Iniciando deploy para Vercel..."

# Definir variáveis de ambiente para o Vercel CLI
export VERCEL_PROJECT_ID="prj_JXbU1wKU5JQbkGlyfRlfXoCPXlFA"
export VERCEL_ORG_ID="team_YourOrgID"

# Deploy com forçar rebuild
vercel --prod --force

echo "✅ Deploy concluído!"
echo "🔗 Acesse o sistema em: https://sadsystem.vercel.app"
echo ""
echo "⚠️  IMPORTANTE: Se o erro persistir, verifique:"
echo "1. Se a API está acessível em https://sadsystem.vercel.app/api/health"
echo "2. Se o CORS está configurado corretamente nas Variáveis de Ambiente do Vercel"
