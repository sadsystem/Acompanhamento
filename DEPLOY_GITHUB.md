# 🚀 Deploy Automático via GitHub - Sistema Acompanhamento

Este guia mostra como fazer deploy automático da aplicação direto pelo GitHub, sem precisar configurar servidores manualmente.

## 📋 OPÇÕES DE DEPLOY DISPONÍVEIS

### ⚡ COMANDOS RÁPIDOS

```bash
# 1. Clonar e preparar
git clone https://github.com/sadsystem/Acompanhamento.git
cd Acompanhamento
npm install

# 2. Configurar deploy automático
npm run setup:deploy

# 3. Configurar secrets no GitHub e push
git push origin main
# 🎉 Deploy automático ativado!
```

---

### 🌟 Opção 1: Vercel (RECOMENDADA)
- ✅ Deploy automático a cada push
- ✅ Preview de PRs
- ✅ Domínio personalizado grátis
- ✅ SSL automático
- ✅ CDN global

### 🌐 Opção 2: GitHub Pages
- ✅ Deploy automático a cada push
- ✅ Hospedagem gratuita
- ✅ Integração total com GitHub
- ⚠️ Apenas frontend (precisa API separada)

---

## 🚀 SETUP RÁPIDO - VERCEL (5 minutos)

### 1️⃣ Configurar Secrets no GitHub

No seu repositório GitHub, vá em **Settings → Secrets and variables → Actions** e adicione:

```bash
# Secrets necessários:
VERCEL_TOKEN=seu-token-vercel
VERCEL_ORG_ID=seu-org-id
VERCEL_PROJECT_ID=seu-project-id
DATABASE_URL=sua-url-supabase-completa
```

### 2️⃣ Obter Token do Vercel

```bash
# 1. Instalar Vercel CLI
npm i -g vercel

# 2. Fazer login
vercel login

# 3. Obter token
vercel --help
# Vá em: https://vercel.com/account/tokens
# Crie um novo token e copie
```

### 3️⃣ Obter IDs do Projeto

```bash
# Na pasta do projeto:
vercel link

# Isso criará .vercel/project.json com os IDs necessários
cat .vercel/project.json
```

### 4️⃣ Push e Deploy

```bash
# Fazer commit das mudanças
git add .
git commit -m "Configurar deploy automático"
git push origin main

# O deploy será automático! 🎉
```

---

## 🌐 SETUP GITHUB PAGES (Frontend Only)

### 1️⃣ Habilitar GitHub Pages

1. Vá em **Settings → Pages**
2. Source: **GitHub Actions**
3. Salvar

### 2️⃣ Configurar API Backend

Como GitHub Pages é apenas frontend, você precisa de uma API separada:

**Opção A: Vercel para API**
```bash
# Deploy apenas do backend no Vercel
vercel --prod
# URL será algo como: https://seu-projeto.vercel.app
```

**Opção B: Heroku/Railway**
- Siga o DEPLOY_GUIDE.md para outras opções

### 3️⃣ Atualizar Configuração

Edite `.github/workflows/deploy-github-pages.yml`:
```yaml
env:
  VITE_API_URL: https://sua-api-backend.vercel.app/api
```

---

## ✨ COMO EDITAR E FAZER DEPLOY

### 🤖 Via GitHub Web (Recomendado para pequenas mudanças)

1. **Editar arquivos:**
   - Vá no arquivo que quer editar no GitHub
   - Clique no ✏️ (lápis)
   - Faça as mudanças
   - Clique em **Commit changes**

2. **Deploy automático:**
   - O deploy acontece automaticamente
   - Vercel: ~2 minutos
   - GitHub Pages: ~5 minutos

### 💻 Via Git Local (Para mudanças maiores)

```bash
# 1. Clonar repositório
git clone https://github.com/SEU_USUARIO/Acompanhamento.git
cd Acompanhamento

# 2. Fazer mudanças
# ... editar arquivos ...

# 3. Commit e push
git add .
git commit -m "Suas mudanças"
git push origin main

# Deploy automático! 🚀
```

### 🤝 Via Pull Request (Melhor prática)

```bash
# 1. Criar branch
git checkout -b feature/nova-funcionalidade

# 2. Fazer mudanças e commit
git add .
git commit -m "Adicionar nova funcionalidade"
git push origin feature/nova-funcionalidade

# 3. Abrir PR no GitHub
# 4. Review e merge
# 5. Deploy automático na main!
```

---

## 🔧 CONFIGURAÇÕES AVANÇADAS

### 🌍 Domínio Personalizado (Vercel)

1. **No painel Vercel:**
   - Vá em Settings → Domains
   - Adicionar domínio: `seu-site.com.br`

2. **Configurar DNS:**
   ```
   Type: CNAME
   Name: www
   Value: cname.vercel-dns.com
   ```

### 🔒 Variáveis de Ambiente

**Vercel:**
- Painel → Settings → Environment Variables

**GitHub Pages:**
- Settings → Secrets and variables → Actions

**Variáveis importantes:**
```bash
DATABASE_URL=postgresql://...
NODE_ENV=production
SESSION_SECRET=sua-chave-super-secreta
```

---

## 📊 MONITORAMENTO

### ✅ Verificar Status do Deploy

**Vercel:**
- https://vercel.com/dashboard
- GitHub → Actions (histórico)

**GitHub Pages:**
- Settings → Pages
- GitHub → Actions

### 🔍 Logs de Erro

```bash
# Vercel CLI
vercel logs

# GitHub Actions
# Vá em Actions → último workflow → logs detalhados
```

### 🚨 Problemas Comuns

**Build falha:**
```bash
# Verificar se build local funciona
npm run build

# Verificar variáveis de ambiente
# GitHub → Settings → Secrets
```

**Database error:**
```bash
# Verificar se Supabase está ativo
# Testar conexão no painel Supabase
# Verificar DATABASE_URL está correto
```

---

## ⚡ COMANDOS ÚTEIS

### 🔄 Deploy Manual (emergência)

```bash
# Vercel
npx vercel --prod

# Forçar redeploy
npx vercel --force
```

### 🧹 Limpeza

```bash
# Limpar builds locais
rm -rf dist/
rm -rf node_modules/
npm install

# Limpar cache Vercel
vercel --force
```

---

## 📞 SUPORTE

**Documentação oficial:**
- [Vercel Deploy](https://vercel.com/docs)
- [GitHub Actions](https://docs.github.com/actions)
- [GitHub Pages](https://docs.github.com/pages)

**Repositório:**
- Issues: Reportar problemas
- Discussions: Dúvidas gerais

---

## ✅ CHECKLIST FINAL

- [ ] ✅ GitHub Actions configurados
- [ ] ✅ Secrets adicionados no GitHub
- [ ] ✅ Deploy automático funcionando
- [ ] ✅ URL de produção ativa
- [ ] ✅ Banco de dados conectado
- [ ] ✅ Domínio personalizado (opcional)
- [ ] ✅ HTTPS configurado
- [ ] ✅ Monitoramento ativo

**🎉 Pronto! Agora você pode editar direto no GitHub e o deploy será automático!**

---

*Tempo total de configuração: 10-15 minutos*
*Deploy automático: 2-5 minutos por mudança*