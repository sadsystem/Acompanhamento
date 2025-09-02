#!/bin/bash

# 🚀 SCRIPT DE MIGRAÇÃO PARA NEON DATABASE

echo "🔄 Iniciando migração para Neon Database..."

# Verificar se temos as dependências
echo "✅ Verificando dependências..."
npm list @neondatabase/serverless > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "✅ @neondatabase/serverless instalado"
else
    echo "❌ Instalando @neondatabase/serverless..."
    npm install @neondatabase/serverless
fi

# Build do projeto
echo "🔨 Fazendo build do projeto..."
npm run build:server

if [ $? -eq 0 ]; then
    echo "✅ Build bem-sucedido!"
else
    echo "❌ Erro no build"
    exit 1
fi

echo ""
echo "🎯 PRÓXIMOS PASSOS MANUAIS:"
echo ""
echo "1. 🌐 Criar conta no Neon:"
echo "   👉 https://console.neon.tech"
echo ""
echo "2. ⚙️ Configurar projeto:"
echo "   - Nome: 'Acompanhamento'"
echo "   - Região: US East (Ohio)"
echo "   - PostgreSQL: versão 16"
echo ""
echo "3. 📋 Executar schema:"
echo "   - Abrir SQL Editor no Neon Dashboard"
echo "   - Executar conteúdo de: neon-schema.sql"
echo ""
echo "4. 🔗 Copiar Connection String e atualizar .env:"
echo "   DATABASE_URL=postgresql://[sua-neon-url]"
echo ""
echo "5. 🧪 Testar localmente:"
echo "   PORT=3001 npm run dev"
echo "   curl http://localhost:3001/api/health"
echo ""
echo "6. 🚀 Deploy na Vercel:"
echo "   - Atualizar variável DATABASE_URL na Vercel"
echo "   - git push origin main"
echo ""
echo "✨ Após completar, você terá:"
echo "   - ⚡ API funcionando 100% na Vercel"
echo "   - 🚀 Cold starts 10x mais rápidos"
echo "   - 🔄 Auto-scaling automático"
echo "   - 💚 Zero downtime"
echo ""
echo "🔥 MIGRAÇÃO PREPARADA COM SUCESSO!"
