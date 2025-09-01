#!/bin/bash

# 🚀 Script de Setup para Deploy Automático GitHub
# Este script ajuda a configurar o deploy automático

echo "🚀 Configurando Deploy Automático GitHub..."
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Execute este script na pasta raiz do projeto (onde está o package.json)"
    exit 1
fi

# Check if .github/workflows exist
if [ -d ".github/workflows" ]; then
    echo "✅ Workflows GitHub Actions já configurados!"
else
    echo "❌ Workflows não encontrados. Execute 'git pull' para obter os arquivos mais recentes."
    exit 1
fi

echo "📋 CHECKLIST DE CONFIGURAÇÃO:"
echo ""
echo "1. ✅ Workflows configurados"
echo "2. ⏳ Secrets do GitHub (você precisa configurar)"
echo "3. ⏳ Conta Vercel (opcional, mas recomendado)"
echo ""

echo "🔧 PRÓXIMOS PASSOS:"
echo ""
echo "Para VERCEL (recomendado):"
echo "1. Instale: npm install -g vercel"
echo "2. Login: vercel login"
echo "3. Na pasta do projeto: vercel link"
echo "4. Configure os secrets no GitHub:"
echo "   - VERCEL_TOKEN (obtenha em: https://vercel.com/account/tokens)"
echo "   - VERCEL_ORG_ID (arquivo .vercel/project.json)"
echo "   - VERCEL_PROJECT_ID (arquivo .vercel/project.json)"
echo "   - DATABASE_URL (sua URL do Supabase)"
echo ""

echo "Para GITHUB PAGES:"
echo "1. Vá em Settings → Pages no GitHub"
echo "2. Source: GitHub Actions"
echo "3. Configure um backend separado para API"
echo ""

echo "📖 DOCUMENTAÇÃO COMPLETA:"
echo "👉 Leia: DEPLOY_GITHUB.md"
echo ""

echo "✨ Depois da configuração, você pode:"
echo "- Editar arquivos direto no GitHub"
echo "- Fazer git push"
echo "- Deploy será automático! 🎉"
echo ""

# Test build to make sure everything works
echo "🧪 Testando build..."
if npm run build > /dev/null 2>&1; then
    echo "✅ Build funcionando!"
    echo ""
    echo "🎉 Tudo pronto! Configure os secrets e faça push para main"
else
    echo "❌ Erro no build. Execute 'npm run build' para ver detalhes"
    echo "   Instale as dependências: npm install"
fi