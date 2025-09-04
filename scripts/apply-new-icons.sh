#!/bin/bash

# Script para aplicar ícones da pasta new-icons/
# Uso: ./scripts/apply-new-icons.sh

set -e

ICONS_SOURCE="/workspaces/Acompanhamento/new-icons"
CLIENT_DIR="/workspaces/Acompanhamento/client"
PUBLIC_DIR="$CLIENT_DIR/public"

echo "🎨 Aplicando novos ícones do sistema..."
echo "📁 Pasta de origem: $ICONS_SOURCE"

if [ ! -d "$ICONS_SOURCE" ]; then
    echo "❌ Erro: Pasta '$ICONS_SOURCE' não encontrada"
    exit 1
fi

# Verificar se existem ícones na pasta
ICON_COUNT=$(ls "$ICONS_SOURCE"/*.{ico,png} 2>/dev/null | wc -l)
if [ "$ICON_COUNT" -eq 0 ]; then
    echo "❌ Nenhum ícone encontrado em $ICONS_SOURCE"
    echo "📋 Coloque os seguintes arquivos na pasta:"
    echo "   - favicon.ico"
    echo "   - icon-16.png"
    echo "   - icon-32.png" 
    echo "   - icon-192.png"
    echo "   - icon-512.png"
    echo ""
    echo "🎨 Ou use apenas 1 ícone PNG de alta qualidade:"
    echo "   npm run icons:auto nome-do-arquivo.png"
    exit 1
fi

# Criar backup dos ícones atuais
echo "💾 Criando backup dos ícones atuais..."
BACKUP_DIR="/workspaces/Acompanhamento/backup-icons-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"
cp "$CLIENT_DIR"/icon-*.png "$BACKUP_DIR/" 2>/dev/null || true
cp "$CLIENT_DIR/favicon.ico" "$BACKUP_DIR/" 2>/dev/null || true
cp "$PUBLIC_DIR/favicon.ico" "$BACKUP_DIR/" 2>/dev/null || true
echo "✅ Backup criado em: $BACKUP_DIR"

# Aplicar novos ícones
echo "🔄 Aplicando novos ícones..."

APPLIED_COUNT=0

for icon in favicon.ico icon-16.png icon-32.png icon-192.png icon-512.png; do
    if [ -f "$ICONS_SOURCE/$icon" ]; then
        cp "$ICONS_SOURCE/$icon" "$CLIENT_DIR/"
        echo "✅ Aplicado: $icon"
        APPLIED_COUNT=$((APPLIED_COUNT + 1))
    else
        echo "⚠️  Não encontrado: $icon"
    fi
done

# Copiar favicon para public
if [ -f "$CLIENT_DIR/favicon.ico" ]; then
    cp "$CLIENT_DIR/favicon.ico" "$PUBLIC_DIR/favicon.ico"
    echo "✅ favicon.ico copiado para public/"
fi

echo ""
echo "🎉 Processo concluído!"
echo "📊 Ícones aplicados: $APPLIED_COUNT/5"

if [ "$APPLIED_COUNT" -eq 5 ]; then
    echo "🎯 Todos os ícones foram aplicados com sucesso!"
elif [ "$APPLIED_COUNT" -gt 0 ]; then
    echo "⚠️  Alguns ícones estão faltando. Verifique a pasta:"
    echo "   $ICONS_SOURCE"
else
    echo "❌ Nenhum ícone foi aplicado"
    exit 1
fi

echo ""
echo "🚀 Para testar as mudanças:"
echo "   npm run dev"
echo ""
echo "📱 Para PWA, limpe o cache do navegador ou reinstale o app"
echo ""
echo "🗑️  Para limpar a pasta de ícones após aplicar:"
echo "   rm -f $ICONS_SOURCE/*.{ico,png}"
