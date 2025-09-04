#!/bin/bash

# Script para testar a nova funcionalidade de avaliações por rota
echo "🧪 Teste: Sistema de Avaliações por Rota"
echo "========================================"

# Testar se API está funcionando
echo "1. Testando conexão com API..."
curl -s http://localhost:3001/api/health | jq '.'

echo -e "\n2. Buscando rotas ativas..."
curl -s http://localhost:3001/api/routes | jq '.[] | select(.status == "active") | {id, city, status, createdAt}'

echo -e "\n3. Buscando avaliações com routeId..."
curl -s "http://localhost:3001/api/evaluations?routeId=c7d99c30-4ee8-49e3-b0f2-e44f37d3f96d" | jq 'length'

echo -e "\n4. Testando filtro combinado (rota + avaliador)..."
curl -s "http://localhost:3001/api/evaluations?routeId=c7d99c30-4ee8-49e3-b0f2-e44f37d3f96d&evaluator=33333333333" | jq 'length'

echo -e "\n✅ Testes de API concluídos!"
