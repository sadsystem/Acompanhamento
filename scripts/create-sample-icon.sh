#!/bin/bash

# Script para criar um ícone de exemplo/teste
# Uso: ./scripts/create-sample-icon.sh

set -e

echo "🎨 Criando ícone de exemplo..."

# Verificar se ImageMagick está instalado
if ! command -v convert &> /dev/null; then
    echo "📦 Instalando ImageMagick..."
    sudo apt-get update -qq
    sudo apt-get install -y imagemagick
fi

# Criar ícone simples com texto "SDA"
SAMPLE_ICON="/tmp/sample-icon.png"

convert -size 512x512 xc:"#16a34a" \
        -fill white \
        -font Arial-Bold \
        -pointsize 180 \
        -gravity center \
        -annotate +0+0 "SDA" \
        "$SAMPLE_ICON"

echo "✅ Ícone de exemplo criado: $SAMPLE_ICON"
echo ""
echo "🚀 Para usar este ícone:"
echo "   ./scripts/update-icons.sh $SAMPLE_ICON"
echo ""
echo "🎨 Ou substitua por seu próprio ícone:"
echo "   ./scripts/update-icons.sh /caminho/para/seu/icone.png"
