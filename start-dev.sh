#!/bin/bash
echo "🚀 Iniciando Sistema de Acompanhamento"
echo "======================================"

# Matar processos anteriores na porta 3001 e 3002
echo "🧹 Limpando processos anteriores..."
pkill -f "tsx server" 2>/dev/null || true
pkill -f "vite" 2>/dev/null || true
pkill -f "node.*3001" 2>/dev/null || true
pkill -f "node.*3002" 2>/dev/null || true

# Aguardar um pouco para garantir que os processos foram terminados
sleep 2

echo "🚀 Iniciando desenvolvimento completo..."
npm run dev:full
