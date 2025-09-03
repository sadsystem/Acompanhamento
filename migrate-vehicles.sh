#!/bin/bash
echo "🚀 Migrando tabela de veículos para Neon..."

# Carregar variáveis de ambiente
if [ -f .env ]; then
    export $(grep -v '^#' .env | xargs)
fi

if [ -z "$DATABASE_URL" ]; then
    echo "❌ Erro: DATABASE_URL não encontrada. Verifique o arquivo .env"
    exit 1
fi

# Executar migração
echo "📊 Executando migração de veículos..."
psql "$DATABASE_URL" -f migrate-vehicles.sql

if [ $? -eq 0 ]; then
    echo "✅ Migração de veículos concluída com sucesso!"
    echo "📋 Tabela 'vehicles' criada"
    echo "🔗 Campo 'vehicle_id' adicionado à tabela 'routes'"
    echo "🚗 Veículos padrão inseridos"
else
    echo "❌ Erro na migração. Verifique os logs acima."
    exit 1
fi
