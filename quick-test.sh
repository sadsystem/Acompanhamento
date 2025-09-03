#!/bin/bash

echo "🔍 Verificando se os dados persistiram..."

# Verificar vehicles
echo "Veículos no banco:"
curl -s http://localhost:3001/api/vehicles | jq '.[].plate' 2>/dev/null || curl -s http://localhost:3001/api/vehicles

echo ""
echo "Teams no banco:"
curl -s http://localhost:3001/api/teams | jq length 2>/dev/null || curl -s http://localhost:3001/api/teams

echo ""
echo "Routes no banco:"
curl -s http://localhost:3001/api/routes | jq length 2>/dev/null || curl -s http://localhost:3001/api/routes
