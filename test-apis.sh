#!/bin/bash

echo "🔍 Testando APIs de Teams, Routes e Vehicles"
echo "=============================================="

BASE_URL="http://localhost:3001/api"

echo ""
echo "1. Testando API Teams..."
curl -s "$BASE_URL/teams" | jq . || echo "Erro na API teams"

echo ""
echo "2. Testando API Routes..."  
curl -s "$BASE_URL/routes" | jq . || echo "Erro na API routes"

echo ""
echo "3. Testando API Vehicles..."
curl -s "$BASE_URL/vehicles" | jq . || echo "Erro na API vehicles"

echo ""
echo "4. Criando um veículo de teste..."
curl -s -X POST "$BASE_URL/vehicles" \
  -H "Content-Type: application/json" \
  -d '{"plate": "PDO-1234", "model": "Caminhão Baú", "year": 2020, "active": true}' | jq .

echo ""
echo "5. Verificando se o veículo foi criado..."
curl -s "$BASE_URL/vehicles" | jq .

echo ""
echo "✅ Teste concluído!"
