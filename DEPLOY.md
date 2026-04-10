# Deploy — Hostinger VPS

Frontend e backend rodam **juntos** no mesmo VPS. Frontend na porta `5000`, backend na porta `5001`. Nginx faz o proxy reverso para as duas.

## Pré-requisitos no VPS

```bash
# Node.js 18+ e npm
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# PM2 para manter os processos vivos
sudo npm install -g pm2

# Nginx (provavelmente já vem instalado na imagem)
sudo apt-get install -y nginx
```

## 1. Clonar o repositório

```bash
cd /var/www
git clone https://github.com/mariocortex/cortex-beach.git cortexbeach
cd cortexbeach
```

## 2. Configurar variáveis de ambiente

### `/var/www/cortexbeach/.env` (backend)

```
PORT=5001
NODE_ENV=production

SUPABASE_URL=https://xrjmxsqjohrnghvwnsre.supabase.co
SUPABASE_KEY=sb_publishable_...
SUPABASE_SECRET_KEY=sb_secret_...

# Domínio público do frontend (CSV, aceita * para liberar todas)
CORS_ORIGIN=https://cortexbeach.com,https://www.cortexbeach.com
```

### `/var/www/cortexbeach/client/.env.production`

```
PORT=5000
# URL PÚBLICA do backend — o mesmo domínio, path /api via Nginx
REACT_APP_API_URL=https://cortexbeach.com
```

## 3. Instalar e buildar

```bash
# Backend
cd /var/www/cortexbeach/server
npm ci --production

# Frontend
cd /var/www/cortexbeach/client
npm ci
npm run build
```

## 4. Rodar migration do WhatsApp no Supabase

Abra o SQL Editor do Supabase e cole o conteúdo de `server/migrations/whatsapp.sql`.

Opcional (recomendado) — aplicar NOT NULL para garantir integridade:
```sql
ALTER TABLE tournaments ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE players ALTER COLUMN company_id SET NOT NULL;
```

## 5. Subir processos com PM2

```bash
cd /var/www/cortexbeach

# Backend (porta 5001)
pm2 start server/src/index.js --name cortex-backend

# Frontend estático (porta 5000) — usa o `serve`
pm2 start "npx serve -s client/build -l 5000" --name cortex-frontend

# Auto-start no boot
pm2 save
pm2 startup systemd
# (copie o comando que o PM2 imprimir e rode como sudo)
```

## 6. Nginx — proxy reverso

Crie `/etc/nginx/sites-available/cortexbeach`:

```nginx
server {
  listen 80;
  server_name cortexbeach.com www.cortexbeach.com;

  # API -> backend 5001
  location /api/ {
    proxy_pass http://127.0.0.1:5001;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    client_max_body_size 50M;
  }

  # Uploads servidos direto pelo backend
  location /uploads/ {
    proxy_pass http://127.0.0.1:5001;
  }

  # Frontend estático -> porta 5000
  location / {
    proxy_pass http://127.0.0.1:5000;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
  }
}
```

Ativar + reload:

```bash
sudo ln -s /etc/nginx/sites-available/cortexbeach /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

## 7. HTTPS com Let's Encrypt (recomendado)

```bash
sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot --nginx -d cortexbeach.com -d www.cortexbeach.com
```

Depois atualize os `.env` para `https://`.

## 8. Verificar

```bash
pm2 status            # ambos running
pm2 logs cortex-backend --lines 50
curl http://127.0.0.1:5001/api/health
curl http://127.0.0.1:5000
```

Abrir o navegador em `https://cortexbeach.com` e logar.

---

## Atualizações futuras

```bash
cd /var/www/cortexbeach
git pull
cd server && npm ci --production && pm2 restart cortex-backend
cd ../client && npm ci && npm run build && pm2 restart cortex-frontend
```

## Troubleshooting

- **CORS bloqueado**: confira `CORS_ORIGIN` no `.env` do backend — precisa bater com o domínio do browser.
- **API 404**: confira se o Nginx está com `/api/` no location e se o backend está escutando em `5001` (`pm2 logs`).
- **PM2 não restarta**: rode `pm2 save && pm2 startup` e siga as instruções.
- **Build do React quebra**: apague `client/node_modules` e rode `npm ci` de novo.
