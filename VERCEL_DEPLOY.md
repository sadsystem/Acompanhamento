# 🚀 Deploy Vercel - sadsystem.vercel.app

## 📋 CHECKLIST RÁPIDO (15 minutos)

### 1️⃣ PREPARAR PROJETO

**a) Baixar do Replit:**
- Menu (3 pontos) → "Export as ZIP"
- Descompactar no seu computador

**b) Instalar Vercel CLI:**
```bash
npm install -g vercel
```

### 2️⃣ CONFIGURAR VARIÁVEIS DE AMBIENTE

**No painel do Vercel (após primeiro deploy):**
```
Settings → Environment Variables → Add:

DATABASE_URL = sua-url-supabase-completa
NODE_ENV = production
```

### 3️⃣ FAZER DEPLOY

**No terminal (dentro da pasta do projeto):**
```bash
# Login no Vercel
vercel login

# Primeiro deploy
vercel

# Deploy para produção
vercel --prod
```

### 4️⃣ (Opcional) CONFIGURAR DOMÍNIO CUSTOM

**a) No Vercel Dashboard:**
- Projeto → Settings → Domains
- Add Domain: `seu-dominio.com` (o domínio padrão `sadsystem.vercel.app` já é fornecido automaticamente)
- Vai aparecer um registro DNS para configurar

**b) No seu provedor DNS (exemplo Namecheap):**
```
Type: CNAME
Host: subdominio
Value: cname.vercel-dns.com
TTL: Automatic
```

### 5️⃣ CONFIGURAR BANCO SUPABASE

**URL do banco (exemplo):**
```
postgresql://postgres.xxx:SUA_SENHA@aws-0-us-east-1.pooler.supabase.com:6543/postgres?sslmode=require
```

**Como obter:**
1. Painel Supabase → Settings → Database
2. Connection String → URI
3. Substituir `[YOUR-PASSWORD]` pela senha real

---

## ⚡ COMANDOS PRINCIPAIS

```bash
# Login
vercel login

# Deploy de desenvolvimento
vercel

# Deploy de produção
vercel --prod

# Ver logs
vercel logs

# Ver domínios
vercel domains
```

---

## 🔧 TROUBLESHOOTING

**Problema: Build falha**
```bash
# Verificar se está na pasta certa
ls -la
# Deve ter: vercel.json, package.json, server/, client/

# Forçar rebuild
vercel --force
```

**Problema: Banco não conecta**
- Verificar DATABASE_URL nas env vars do Vercel
- Testar conexão no painel Supabase

**Problema: 404 nas rotas**
- vercel.json está configurado corretamente
- Fazer redeploy: `vercel --prod`

---

## ✅ RESULTADO FINAL

**Seu sistema ficará disponível em:**
- Desenvolvimento: `https://seu-projeto-xxx.vercel.app`
- Produção: `https://sadsystem.vercel.app`

**Login admin:**
- Telefone: (87) 9 9946-1725
- Senha: admin

---

## 📞 SUPORTE

**Se algo der errado:**
1. Verificar logs: `vercel logs`
2. Verificar env vars no dashboard
3. Testar conexão Supabase
4. Redeploy: `vercel --prod --force`
