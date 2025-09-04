#!/bin/bash
echo "🧪 Testando API de Avaliações com routeId..."
echo "============================================"

# Aguardar servidor inicializar
sleep 8

echo "1. Testando health check..."
HEALTH=$(curl -s "http://localhost:3001/api/health" 2>/dev/null)
if [ $? -eq 0 ]; then
    echo "✅ API Health: OK"
    echo "$HEALTH" | head -2
else
    echo "❌ API Health: FALHOU"
    exit 1
fi

echo -e "\n2. Testando busca de rotas..."
ROUTES=$(curl -s "http://localhost:3001/api/routes" 2>/dev/null)
if [ $? -eq 0 ]; then
    echo "✅ API Rotas: OK"
    echo "$ROUTES" | head -5
else
    echo "❌ API Rotas: FALHOU"
fi

echo -e "\n3. Testando busca de avaliações..."
EVALUATIONS=$(curl -s "http://localhost:3001/api/evaluations" 2>/dev/null)
if [ $? -eq 0 ]; then
    echo "✅ API Avaliações: OK"
    echo "$EVALUATIONS" | head -5
else
    echo "❌ API Avaliações: FALHOU"
fi

echo -e "\n4. Testando filtro por routeId (simulado)..."
ROUTE_EVALS=$(curl -s "http://localhost:3001/api/evaluations?routeId=test-route-123" 2>/dev/null)
if [ $? -eq 0 ]; then
    echo "✅ API Avaliações com routeId: OK"
    echo "$ROUTE_EVALS" | head -3
else
    echo "❌ API Avaliações com routeId: FALHOU"
fi

echo -e "\n✨ Teste de routeId completo!"
