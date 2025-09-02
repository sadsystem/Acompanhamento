#!/bin/bash

# 🧪 TESTE DE VERIFICAÇÃO DA MIGRAÇÃO NEON

echo "🔍 Verificando preparação para Neon..."

# Verificar arquivos essenciais
files_to_check=(
    "server/storageNeon.ts"
    "neon-schema.sql"
    "api/index.js"
    ".env"
)

echo "📁 Verificando arquivos essenciais:"
for file in "${files_to_check[@]}"; do
    if [ -f "$file" ]; then
        echo "  ✅ $file"
    else
        echo "  ❌ $file (FALTANDO!)"
    fi
done

# Verificar dependências
echo ""
echo "📦 Verificando dependências:"
if npm list @neondatabase/serverless > /dev/null 2>&1; then
    echo "  ✅ @neondatabase/serverless"
else
    echo "  ❌ @neondatabase/serverless (instalar: npm install @neondatabase/serverless)"
fi

# Verificar build
echo ""
echo "🔨 Testando build:"
if npm run build:server > /dev/null 2>&1; then
    echo "  ✅ Build bem-sucedido"
    echo "  📊 Tamanho: $(ls -lh api/index.js | awk '{print $5}')"
else
    echo "  ❌ Erro no build"
fi

# Verificar estrutura do .env
echo ""
echo "⚙️ Verificando configuração:"
if grep -q "DATABASE_URL.*neon.tech" .env 2>/dev/null; then
    echo "  ✅ URL do Neon configurada"
elif grep -q "DATABASE_URL.*postgresql" .env 2>/dev/null; then
    echo "  ⚠️  URL de banco encontrada (atualize para Neon)"
else
    echo "  ❌ Nenhuma URL de banco encontrada"
fi

echo ""
echo "🎯 STATUS DA MIGRAÇÃO:"

# Contar verificações
total_checks=4
passed_checks=0

if [ -f "server/storageNeon.ts" ]; then ((passed_checks++)); fi
if [ -f "neon-schema.sql" ]; then ((passed_checks++)); fi
if npm list @neondatabase/serverless > /dev/null 2>&1; then ((passed_checks++)); fi
if npm run build:server > /dev/null 2>&1; then ((passed_checks++)); fi

echo "  ✅ Verificações passadas: $passed_checks/$total_checks"

if [ $passed_checks -eq $total_checks ]; then
    echo "  🚀 PRONTO PARA MIGRAÇÃO!"
    echo ""
    echo "  📋 Checklist final:"
    echo "    1. Criar conta no Neon → https://console.neon.tech"
    echo "    2. Executar neon-schema.sql no SQL Editor"
    echo "    3. Copiar Connection String para .env"
    echo "    4. Testar: PORT=3001 npm run dev"
    echo "    5. Deploy na Vercel"
else
    echo "  ⚠️  Algumas verificações falharam"
    echo "  💡 Execute: ./migrate-to-neon.sh para corrigir"
fi

echo ""
echo "🔗 Links úteis:"
echo "  • Neon Console: https://console.neon.tech"
echo "  • Neon Docs: https://neon.tech/docs/quickstart"
echo "  • Vercel Dashboard: https://vercel.com/dashboard"
