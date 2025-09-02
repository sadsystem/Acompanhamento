# 🚀 Guia de Deploy - Sistema Acompanhamento Diário

## 📦 1. EXPORTAR DO REPLIT

**Passo a passo:**
1. No Replit, clique no menu (3 pontos) do seu projeto
2. Selecione **"Export as ZIP"**
3. Baixe o arquivo ZIP completo

---

## 🗄️ 2. CONFIGURAR BANCO SUPABASE

### Obter URL do Banco:
1. Acesse [supabase.com/dashboard](https://supabase.com/dashboard)
2. Vá no seu projeto > **Settings** > **Database**
3. Copie a **Connection String** (URI)
4. Substitua `[YOUR-PASSWORD]` pela senha real do projeto

### Exemplo da URL:
```
postgresql://postgres.xxx:PASSWORD@aws-0-us-east-1.pooler.supabase.com:6543/postgres
```

---

## ⚙️ 3. CONFIGURAR SERVIDOR

### Instalar dependências (Ubuntu/Debian):
```bash
# Instalar Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Instalar PM2 (gerenciador de processos)
sudo npm install -g pm2

# Instalar Nginx (opcional, para proxy reverso)
sudo apt update
sudo apt install nginx
```

### Configurar projeto:
```bash
# Descompactar e entrar na pasta
unzip seu-projeto.zip
cd seu-projeto/

# Instalar dependências
npm install

# Criar arquivo de variáveis de ambiente
cp .env.example .env
```

---

## 🔧 4. CONFIGURAR VARIÁVEIS (.env)

Crie o arquivo `.env` na raiz do projeto:

```env
# Banco de dados Supabase
DATABASE_URL="postgresql://postgres.xxx:SUA_SENHA@aws-0-us-east-1.pooler.supabase.com:6543/postgres"

# Configurações do servidor
NODE_ENV=production
PORT=3000

# URL base da API para o frontend
VITE_API_URL="https://<seu-domínio>.vercel.app/api"

# Configurações de sessão (gere uma chave aleatória)
SESSION_SECRET="sua-chave-secreta-muito-longa-e-segura-aqui"
```

---

## 🚀 5. FAZER BUILD E RODAR

```bash
# Fazer build da aplicação
npm run build

# Rodar em modo produção com PM2
pm2 start npm --name "acompanhamento-diario" -- start

# Configurar PM2 para iniciar automaticamente
pm2 startup
pm2 save
```

---

## 🌐 6. CONFIGURAR NGINX (Opcional)

Crie `/etc/nginx/sites-available/acompanhamento`:

```nginx
server {
    listen 80;
    server_name seu-dominio.com.br;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Ativar site:
```bash
sudo ln -s /etc/nginx/sites-available/acompanhamento /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## 🔒 7. CONFIGURAR HTTPS (Certbot)

```bash
# Instalar Certbot
sudo apt install certbot python3-certbot-nginx

# Obter certificado SSL
sudo certbot --nginx -d seu-dominio.com.br
```

---

## 📊 8. MONITORAMENTO

```bash
# Ver logs da aplicação
pm2 logs acompanhamento-diario

# Ver status dos processos
pm2 status

# Restart da aplicação
pm2 restart acompanhamento-diario
```

---

## 🔧 9. COMANDOS ÚTEIS

```bash
# Push do esquema do banco (primeira vez)
npm run db:push

# Verificar se aplicação está rodando
curl http://localhost:3000/api/users/admin

# Backup do banco
pg_dump "SUA_DATABASE_URL" > backup.sql
```

---

## 📝 CHECKLIST RÁPIDO

- [ ] ✅ Exportar ZIP do Replit
- [ ] ✅ Configurar servidor (Node.js, PM2)
- [ ] ✅ Configurar variáveis (.env)
- [ ] ✅ Instalar dependências (npm install)
- [ ] ✅ Fazer build (npm run build)
- [ ] ✅ Rodar com PM2
- [ ] ✅ Configurar Nginx (opcional)
- [ ] ✅ Configurar HTTPS (opcional)
- [ ] ✅ Testar acesso

**Tempo estimado:** 15-30 minutos

---

## 🆘 PROBLEMAS COMUNS

**Erro de conexão com banco:**
- Verificar se DATABASE_URL está correta
- Verificar se Supabase está ativo

**Aplicação não inicia:**
- Verificar Node.js versão 18+
- Verificar se todas dependências foram instaladas

**Acesso negado:**
- Verificar firewall: `sudo ufw allow 3000`
- Verificar se PM2 está rodando: `pm2 status`