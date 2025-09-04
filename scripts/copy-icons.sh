#!/bin/bash

# Script simples para copiar ícones já prontos
# Uso: ./scripts/copy-icons.sh <pasta_com_icones>

set -e

if [ $# -eq 0 ]; then
    echo "❌ Erro: Forneça a pasta com os ícones"
    echo "📋 Uso: ./scripts/copy-icons.sh <pasta_com_icones>"
    echo ""
    echo "📝 A pasta deve conter:"
    echo "   - favicon.ico"
    echo "   - icon-16.png"
    echo "   - icon-32.png"
    echo "   - icon-192.png" 
    echo "   - icon-512.png"
    exit 1
fi

ICONS_DIR="$1"
CLIENT_DIR="/workspaces/Acompanhamento/client"
PUBLIC_DIR="$CLIENT_DIR/public"

if [ ! -d "$ICONS_DIR" ]; then
    echo "❌ Erro: Pasta '$ICONS_DIR' não encontrada"
    exit 1
fi

echo "📁 Copiando ícones de: $ICONS_DIR"

# Criar backup
echo "💾 Criando backup dos ícones atuais..."
BACKUP_DIR="/workspaces/Acompanhamento/backup-icons-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"
cp "$CLIENT_DIR"/icon-*.png "$BACKUP_DIR/" 2>/dev/null || true
cp "$CLIENT_DIR/favicon.ico" "$BACKUP_DIR/" 2>/dev/null || true
cp "$PUBLIC_DIR/favicon.ico" "$BACKUP_DIR/" 2>/dev/null || true

# Copiar novos ícones
for icon in favicon.ico icon-16.png icon-32.png icon-192.png icon-512.png; do
    if [ -f "$ICONS_DIR/$icon" ]; then
        cp "$ICONS_DIR/$icon" "$CLIENT_DIR/"
        echo "✅ Copiado: $icon"
    else
        echo "⚠️  Não encontrado: $icon"
    fi
done

# Copiar favicon para public
cp "$CLIENT_DIR/favicon.ico" "$PUBLIC_DIR/favicon.ico"

echo "✅ Ícones atualizados com sucesso!"
echo "🚀 Execute 'npm run dev' para testar"
