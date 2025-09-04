#!/bin/bash

# Script para atualizar todos os ícones do sistema PWA
# Uso: ./scripts/update-icons.sh <caminho_para_icone_original.png>

set -e

if [ $# -eq 0 ]; then
    echo "❌ Erro: Forneça o caminho para o ícone original"
    echo "📋 Uso: ./scripts/update-icons.sh <caminho_para_icone.png>"
    echo "📝 Exemplo: ./scripts/update-icons.sh ./novo-icone.png"
    exit 1
fi

ORIGINAL_ICON="$1"
CLIENT_DIR="/workspaces/Acompanhamento/client"
PUBLIC_DIR="$CLIENT_DIR/public"

if [ ! -f "$ORIGINAL_ICON" ]; then
    echo "❌ Erro: Arquivo '$ORIGINAL_ICON' não encontrado"
    exit 1
fi

echo "🎨 Atualizando ícones do sistema..."
echo "📁 Ícone original: $ORIGINAL_ICON"

# Verificar se ImageMagick está instalado
if ! command -v convert &> /dev/null; then
    echo "📦 Instalando ImageMagick..."
    sudo apt-get update -qq
    sudo apt-get install -y imagemagick
fi

# Criar backup dos ícones atuais
echo "💾 Criando backup dos ícones atuais..."
BACKUP_DIR="/workspaces/Acompanhamento/backup-icons-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"
cp "$CLIENT_DIR"/icon-*.png "$BACKUP_DIR/" 2>/dev/null || true
cp "$CLIENT_DIR/favicon.ico" "$BACKUP_DIR/" 2>/dev/null || true
cp "$PUBLIC_DIR/favicon.ico" "$BACKUP_DIR/" 2>/dev/null || true
echo "✅ Backup criado em: $BACKUP_DIR"

# Gerar os diferentes tamanhos
echo "🔄 Gerando ícones em diferentes tamanhos..."

# PNG Icons
convert "$ORIGINAL_ICON" -resize 16x16 "$CLIENT_DIR/icon-16.png"
convert "$ORIGINAL_ICON" -resize 32x32 "$CLIENT_DIR/icon-32.png"
convert "$ORIGINAL_ICON" -resize 192x192 "$CLIENT_DIR/icon-192.png"
convert "$ORIGINAL_ICON" -resize 512x512 "$CLIENT_DIR/icon-512.png"

# Favicon.ico (múltiplos tamanhos em um arquivo)
convert "$ORIGINAL_ICON" -resize 16x16 /tmp/icon-16.png
convert "$ORIGINAL_ICON" -resize 32x32 /tmp/icon-32.png
convert "$ORIGINAL_ICON" -resize 48x48 /tmp/icon-48.png
convert /tmp/icon-16.png /tmp/icon-32.png /tmp/icon-48.png "$CLIENT_DIR/favicon.ico"
cp "$CLIENT_DIR/favicon.ico" "$PUBLIC_DIR/favicon.ico"

# Limpar arquivos temporários
rm -f /tmp/icon-*.png

echo "✅ Ícones atualizados com sucesso!"
echo ""
echo "📋 Arquivos atualizados:"
echo "   - $CLIENT_DIR/icon-16.png"
echo "   - $CLIENT_DIR/icon-32.png" 
echo "   - $CLIENT_DIR/icon-192.png"
echo "   - $CLIENT_DIR/icon-512.png"
echo "   - $CLIENT_DIR/favicon.ico"
echo "   - $PUBLIC_DIR/favicon.ico"
echo ""
echo "🚀 Para testar as mudanças:"
echo "   npm run dev"
echo ""
echo "📱 Para PWA, limpe o cache do navegador ou reinstale o app"
