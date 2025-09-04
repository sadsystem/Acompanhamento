#!/bin/bash

echo "🧪 TESTANDO FUNCIONALIDADE DE ACOMPANHAMENTOS PENDENTES"
echo "======================================================="

echo "📋 Cenário de teste:"
echo "- Motorista 33333333333 estava em uma rota com ajudantes 00000000000 e 11111111111"
echo "- Avaliou apenas o primeiro ajudante (00000000000)"
echo "- Rota foi finalizada sem avaliar o segundo ajudante (11111111111)"
echo "- Sistema deve detectar e mostrar acompanhamento pendente"
echo ""

# Função para fazer requisições com logging
test_api() {
    local method=$1
    local endpoint=$2
    local description=$3
    
    echo "🔍 $description"
    echo "   → $method $endpoint"
    
    local response
    if [ "$method" = "GET" ]; then
        response=$(curl -s "http://localhost:3001/api$endpoint" | head -2)
    fi
    
    echo "   ✅ $(echo "$response" | head -1)"
    echo ""
}

echo "🚀 Iniciando testes..."
sleep 2

# Teste 1: Verificar rotas finalizadas
test_api "GET" "/routes" "Verificando rotas disponíveis"

# Teste 2: Verificar times
test_api "GET" "/teams" "Verificando times disponíveis"

# Teste 3: Verificar avaliações existentes
echo "🔍 Verificando avaliações do motorista 33333333333"
echo "   → GET /api/evaluations (filtro por evaluator)"
evaluations=$(curl -s "http://localhost:3001/api/evaluations" | jq -r '.[] | select(.evaluator == "33333333333") | "\(.evaluated) ← avaliado em \(.dateRef)"' 2>/dev/null || echo "Dados não disponíveis")
echo "   ✅ Avaliações encontradas:"
echo "$evaluations"
echo ""

# Teste 4: Verificar se há rotas finalizadas com ID específico
echo "🔍 Verificando se existem rotas finalizadas"
completed_routes=$(curl -s "http://localhost:3001/api/routes" | jq -r '.[] | select(.status == "completed") | "\(.id): \(.city) (\(.startDate) - \(.endDate))"' 2>/dev/null || echo "Nenhuma rota finalizada")
echo "   ✅ Rotas finalizadas:"
echo "$completed_routes"
echo ""

# Teste 5: Para uma rota específica, verificar todas as avaliações
echo "🔍 Analisando padrão de avaliações por rota"
route_id=$(curl -s "http://localhost:3001/api/routes" | jq -r '.[] | select(.status == "completed") | .id' | head -1 2>/dev/null)

if [ ! -z "$route_id" ]; then
    echo "   → Rota ID: $route_id"
    route_evaluations=$(curl -s "http://localhost:3001/api/evaluations" | jq -r --arg route_id "$route_id" '.[] | select(.routeId == $route_id) | "\(.evaluator) → \(.evaluated)"' 2>/dev/null || echo "Sem avaliações")
    echo "   ✅ Avaliações nesta rota:"
    echo "$route_evaluations"
    
    # Contar usuários únicos envolvidos
    unique_users=$(curl -s "http://localhost:3001/api/evaluations" | jq -r --arg route_id "$route_id" '.[] | select(.routeId == $route_id) | "\(.evaluator)\n\(.evaluated)"' 2>/dev/null | sort -u | tr '\n' ', ' || echo "N/A")
    echo "   📊 Usuários envolvidos na rota: $unique_users"
else
    echo "   ⚠️  Nenhuma rota finalizada encontrada"
fi

echo ""
echo "🎯 RESULTADO DO TESTE:"
echo "======================="

# Verificação final
if echo "$evaluations" | grep -q "00000000000" && ! echo "$evaluations" | grep -q "11111111111"; then
    echo "✅ CENÁRIO CONFIRMADO!"
    echo "   - Motorista 33333333333 avaliou 00000000000"
    echo "   - Motorista 33333333333 NÃO avaliou 11111111111"
    echo "   - Sistema deve mostrar acompanhamento pendente para 11111111111"
else
    echo "❌ Cenário não encontrado ou dados inconsistentes"
fi

echo ""
echo "📝 Para testar no frontend:"
echo "1. Faça login como motorista: 33333333333"
echo "2. Verifique se aparece a seção 'Acompanhamentos Pendentes'"
echo "3. Deve listar a rota finalizada com opção 'Avaliar Pendentes'"
echo "4. Ao clicar, deve mostrar apenas o colaborador 11111111111 para avaliação"
