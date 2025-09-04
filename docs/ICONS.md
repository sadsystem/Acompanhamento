# 🎨 Sistema de Ícones - SDA

Este documento explica como atualizar os ícones do sistema **SDA - Sistema de Acompanhamento**.

## 📋 Ícones do Sistema

O sistema utiliza os seguintes ícones:

### Navegador (Favicon)
- **`favicon.ico`** - Ícone exibido na aba do navegador
- **`icon-16.png`** - Favicon 16x16px  
- **`icon-32.png`** - Favicon 32x32px

### PWA (Progressive Web App)
- **`icon-192.png`** - Ícone 192x192px para instalação
- **`icon-512.png`** - Ícone 512x512px para splash screen

## 🚀 Como Atualizar os Ícones

### Método 1: Script Automático (Recomendado)

Use um ícone PNG de alta qualidade (mínimo 512x512px):

```bash
# Atualizar com seu próprio ícone
npm run icons:update /caminho/para/seu/icone.png

# Ou usando o script diretamente
./scripts/update-icons.sh /caminho/para/seu/icone.png
```

### Método 2: Ícone de Exemplo

Para testar rapidamente com um ícone de exemplo:

```bash
# Criar ícone de exemplo "SDA"
npm run icons:sample

# Aplicar o ícone de exemplo
npm run icons:update /tmp/sample-icon.png
```

### Método 3: Copiar Ícones Prontos

Se você já tem todos os ícones nos tamanhos corretos:

```bash
# Copiar de uma pasta com ícones prontos
npm run icons:copy /pasta/com/icones/

# Ou usando o script diretamente  
./scripts/copy-icons.sh /pasta/com/icones/
```

## 📁 Estrutura de Arquivos

### Antes da atualização:
```
client/
├── favicon.ico       # 577KB (ícone atual)
├── icon-16.png       # 577KB
├── icon-32.png       # 577KB  
├── icon-192.png      # 577KB
├── icon-512.png      # 577KB
└── public/
    └── favicon.ico   # 577KB
```

### Depois da atualização:
```
client/
├── favicon.ico       # Novo ícone
├── icon-16.png       # 16x16px
├── icon-32.png       # 32x32px
├── icon-192.png      # 192x192px
├── icon-512.png      # 512x512px
└── public/
    └── favicon.ico   # Cópia do novo favicon
```

## 🛠️ Requisitos Técnicos

### Para Script Automático:
- **ImageMagick** (instalado automaticamente pelo script)
- Ícone original em PNG, JPG ou qualquer formato suportado
- Resolução mínima recomendada: 512x512px

### Para Copiar Ícones Prontos:
- Ícones já nos tamanhos corretos:
  - `favicon.ico` (16x16, 32x32, 48x48)
  - `icon-16.png` (16x16)
  - `icon-32.png` (32x32)
  - `icon-192.png` (192x192)
  - `icon-512.png` (512x512)

## 🔄 Processo de Backup

Todos os scripts criam **backup automático** dos ícones atuais:

```
backup-icons-YYYYMMDD-HHMMSS/
├── favicon.ico
├── icon-16.png
├── icon-32.png
├── icon-192.png
└── icon-512.png
```

## 📱 Testando as Mudanças

### No Navegador:
1. Execute `npm run dev`
2. Abra `http://localhost:3002`
3. Verifique o favicon na aba
4. Force refresh (Ctrl+F5) se necessário

### PWA no Celular:
1. Limpe o cache do navegador
2. Reinstale o PWA se já estiver instalado
3. Ou teste em uma aba anônima/privada

## 🎨 Dicas de Design

### Ícone Ideal:
- **Formato**: PNG com fundo transparente
- **Resolução**: 512x512px ou maior
- **Estilo**: Simples e legível em tamanhos pequenos
- **Cores**: Contraste adequado para diferentes temas

### Cores do Sistema:
- **Verde Principal**: `#16a34a` (theme-color atual)
- **Background**: `#ffffff` (background-color do PWA)

## 🐛 Troubleshooting

### Ícone não atualiza no navegador:
```bash
# Limpar cache e rebuildar
rm -rf client/dist/
npm run build:client
```

### PWA não mostra novo ícone:
- Desinstale e reinstale o PWA
- Ou teste em dispositivo diferente

### Script falha:
```bash
# Verificar permissões
chmod +x scripts/*.sh

# Instalar dependências manualmente
sudo apt-get update
sudo apt-get install imagemagick
```

## 📋 Checklist de Atualização

- [ ] Backup criado automaticamente
- [ ] Todos os 5 arquivos de ícone atualizados
- [ ] `favicon.ico` copiado para `public/`
- [ ] Teste no navegador (aba/favicon)
- [ ] Teste PWA (ícone de instalação)
- [ ] Cache limpo se necessário

## 🔗 Arquivos Relacionados

- `client/manifest.json` - Configuração PWA
- `client/index.html` - Referencias dos favicons
- `scripts/update-icons.sh` - Script principal
- `scripts/copy-icons.sh` - Script para cópia
- `scripts/create-sample-icon.sh` - Gerador de exemplo
