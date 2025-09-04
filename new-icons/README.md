# 📁 Pasta para Novos Ícones

Coloque seus novos ícones nesta pasta com os seguintes nomes:

## 📋 Arquivos Esperados:

- **`favicon.ico`** - Ícone da aba do navegador
- **`icon-16.png`** - Favicon 16x16px
- **`icon-32.png`** - Favicon 32x32px  
- **`icon-192.png`** - PWA ícone de instalação (192x192px)
- **`icon-512.png`** - PWA splash screen (512x512px)

## 🚀 Como Usar:

1. **Coloque os ícones aqui** com os nomes exatos acima
2. **Execute**: `npm run icons:apply` ou `./scripts/apply-new-icons.sh`
3. **Teste**: `npm run dev`

## ⚠️ Importante:

- Use os **nomes exatos** dos arquivos listados acima
- Certifique-se que os **tamanhos estão corretos**
- Os ícones PNG devem ter **fundo transparente** para melhor resultado

## 🎨 Alternativa Simples:

Se você tem apenas **1 ícone em alta qualidade** (PNG 512x512px ou maior):
1. Coloque-o aqui com qualquer nome (ex: `meu-icone.png`)
2. Execute: `npm run icons:auto meu-icone.png`

Isso gerará automaticamente todos os tamanhos necessários!
