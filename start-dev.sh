#!/bin/bash
echo "🚀 Iniciando Sistema de Acompanhamento"
echo "======================================"

# Matar processos anteriores
pkill -f "tsx server" 2>/dev/null || true
pkill -f "vite" 2>/dev/null || true

echo "📡 Iniciando servidor backend..."
npx tsx server/simple-server.ts &
SERVER_PID=$!

sleep 3

echo "🌐 Iniciando Vite dev server..."
cd client && npx vite --host 0.0.0.0 --port 3002 &
VITE_PID=$!

echo ""
echo "✅ Serviços iniciados:"
echo "   Backend API: http://localhost:3001/api"
echo "   Frontend:    http://localhost:3002"
echo ""
echo "Press Ctrl+C to stop all services"

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "🛑 Parando serviços..."
    kill $SERVER_PID 2>/dev/null || true
    kill $VITE_PID 2>/dev/null || true
    pkill -f "tsx server" 2>/dev/null || true
    pkill -f "vite" 2>/dev/null || true
    echo "✅ Serviços parados"
    exit 0
}

trap cleanup SIGINT SIGTERM

# Wait for both processes
wait
