#!/bin/bash

# Script para processar 1 ícone da pasta new-icons/ e gerar todos os tamanhos
# Uso: ./scripts/auto-generate-icons.sh <nome-do-arquivo.png>

set -e

if [ $# -eq 0 ]; then
    echo "❌ Erro: Forneça o nome do arquivo de ícone"
    echo "📋 Uso: ./scripts/auto-generate-icons.sh <nome-do-arquivo>"
    echo "📝 Exemplo: ./scripts/auto-generate-icons.sh meu-icone.png"
    echo ""
    echo "📁 O arquivo deve estar em: /workspaces/Acompanhamento/new-icons/"
    exit 1
fi

ICON_NAME="$1"
ICONS_SOURCE="/workspaces/Acompanhamento/new-icons"
ORIGINAL_ICON="$ICONS_SOURCE/$ICON_NAME"

if [ ! -f "$ORIGINAL_ICON" ]; then
    echo "❌ Erro: Arquivo '$ORIGINAL_ICON' não encontrado"
    echo "📁 Verifique se o arquivo está em: $ICONS_SOURCE"
    exit 1
fi

echo "🎨 Gerando todos os ícones a partir de: $ICON_NAME"

# Verificar se ImageMagick está instalado
if ! command -v convert &> /dev/null; then
    echo "📦 Instalando ImageMagick..."
    sudo apt-get update -qq
    sudo apt-get install -y imagemagick
fi

# Gerar todos os tamanhos na pasta new-icons
echo "🔄 Gerando ícones em diferentes tamanhos..."

cd "$ICONS_SOURCE"

# PNG Icons
convert "$ORIGINAL_ICON" -resize 16x16 "icon-16.png"
convert "$ORIGINAL_ICON" -resize 32x32 "icon-32.png"
convert "$ORIGINAL_ICON" -resize 192x192 "icon-192.png"
convert "$ORIGINAL_ICON" -resize 512x512 "icon-512.png"

# Favicon.ico (múltiplos tamanhos em um arquivo)
convert "$ORIGINAL_ICON" -resize 16x16 /tmp/icon-16.png
convert "$ORIGINAL_ICON" -resize 32x32 /tmp/icon-32.png
convert "$ORIGINAL_ICON" -resize 48x48 /tmp/icon-48.png
convert /tmp/icon-16.png /tmp/icon-32.png /tmp/icon-48.png "favicon.ico"

# Limpar arquivos temporários
rm -f /tmp/icon-*.png

echo "✅ Ícones gerados com sucesso em: $ICONS_SOURCE"
echo ""
echo "📋 Arquivos criados:"
echo "   - favicon.ico"
echo "   - icon-16.png"
echo "   - icon-32.png"
echo "   - icon-192.png" 
echo "   - icon-512.png"
echo ""
echo "🚀 Agora execute para aplicar:"
echo "   npm run icons:apply"
echo "   # ou"
echo "   ./scripts/apply-new-icons.sh"
