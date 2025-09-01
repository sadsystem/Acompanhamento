# 📊 Sistema Acompanhamento Diário

Sistema para acompanhamento diário de equipes de trabalho com avaliações e relatórios.

## 🚀 Deploy Automático

Este projeto está configurado para deploy automático através do GitHub! 

### ⚡ Deploy Rápido - 3 Opções:

1. **🌟 [Vercel](DEPLOY_GITHUB.md#-setup-rápido---vercel-5-minutos)** - Recomendado
2. **🌐 [GitHub Pages](DEPLOY_GITHUB.md#-setup-github-pages-frontend-only)** - Gratuito 
3. **🖥️ [Servidor Próprio](DEPLOY_GUIDE.md)** - Tradicional

### 📝 Como Editar e Deploy:

1. **Edite pelo GitHub Web:**
   - Clique em qualquer arquivo → ✏️ Edit
   - Faça suas mudanças
   - **Commit changes** → Deploy automático! 🎉

2. **Clone local:**
   ```bash
   git clone https://github.com/sadsystem/Acompanhamento.git
   cd Acompanhamento
   npm install
   npm run dev  # desenvolver localmente
   ```

### 🔧 Configuração Rápida (5 minutos):

1. **[Leia o guia completo](DEPLOY_GITHUB.md)** 
2. Configure os secrets no GitHub
3. Push para main → Deploy automático!

## 🏗️ Tecnologias

- **Frontend:** React + TypeScript + Tailwind CSS
- **Backend:** Node.js + Express + TypeScript  
- **Database:** PostgreSQL (Supabase)
- **Deploy:** Vercel + GitHub Actions

## 📁 Estrutura

```
├── client/          # Frontend React
├── server/          # Backend Express  
├── shared/          # Tipos compartilhados
├── .github/         # Workflows automáticos
├── DEPLOY_GITHUB.md # Guia deploy GitHub
└── DEPLOY_GUIDE.md  # Guia deploy tradicional
```

## 🎯 Funcionalidades

- ✅ Sistema de login e autenticação
- ✅ Avaliações diárias de colaboradores
- ✅ Relatórios e dashboards
- ✅ Gestão de equipes
- ✅ Exportação de dados
- ✅ Interface responsiva

## 🤝 Como Contribuir

1. Fork este repositório
2. Crie uma branch: `git checkout -b feature/nova-funcionalidade`
3. Commit: `git commit -m 'Add nova funcionalidade'`
4. Push: `git push origin feature/nova-funcionalidade`
5. Abra um Pull Request

---

**⚡ Deploy em 2 minutos → [Guia Completo](DEPLOY_GITHUB.md)**