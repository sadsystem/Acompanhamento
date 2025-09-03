#!/bin/bash

echo "🧪 Testando criação de rota com dados similares ao frontend"

curl -s -X POST http://localhost:3001/api/routes \
  -H "Content-Type: application/json" \
  -d '{
    "id": "test-route-123",
    "city": "Recife - Caruaru",
    "cities": ["Recife", "Caruaru"],
    "teamId": "test-team-456",
    "startDate": "2025-09-03",
    "status": "formation"
  }' | jq .

echo -e "\n✅ Teste concluído"
