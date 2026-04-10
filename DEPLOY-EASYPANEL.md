# Deploy — Easypanel

Guia passo a passo pra subir o Córtex Beach no Easypanel. São **2 apps** (frontend + backend) no mesmo projeto, compartilhando o domínio `btenis.cortexsolucoes.com.br` via roteamento por path.

## Estrutura

```
Projeto: cortex-beach
├── App "backend"   → porta interna 5001, path /api + /uploads
└── App "frontend"  → porta interna 5000, path /
```

Ambos os apps apontam para o **mesmo repositório Git** (`mariocortex/cortex-beach`), mas com `Build Path` diferente.

---

## 1. Criar projeto no Easypanel

1. Na UI do Easypanel, clique em **Create Project** → nome: `cortex-beach`

## 2. App do Backend

1. **Create Service → App**
2. **Service Name**: `backend`
3. **Source**:
   - Tipo: **Github**
   - Repo: `mariocortex/cortex-beach`
   - Branch: `master`
   - **Build Path**: `/server`
4. **Build**:
   - Tipo: **Dockerfile** (usa o `server/Dockerfile` já criado)
5. **Environment Variables** (aba Environment) — copie os valores reais do seu `.env` local:
   ```
   PORT=5001
   NODE_ENV=production
   SUPABASE_URL=<SUPABASE_URL>
   SUPABASE_KEY=<SUPABASE_KEY>
   SUPABASE_SECRET_KEY=<SUPABASE_SECRET_KEY>
   CORS_ORIGIN=https://btenis.cortexsolucoes.com.br
   UPLOADS_DIR=/app/uploads
   ```
   ⚠️ **Não commite esses valores em nenhum arquivo do repositório.** Use o `.env` local como referência e cole diretamente na UI do Easypanel.
6. **Volumes** (aba Mounts):
   - Type: **Volume**
   - Name: `backend-uploads`
   - Mount Path: `/app/uploads`
   *(garante que arquivos enviados não sumam em redeploy)*
7. **Domains** (aba Domains):
   - Host: `btenis.cortexsolucoes.com.br`
   - Path: `/api`
   - Port: `5001`
   - HTTPS: **On**
   - Adicione também uma segunda entrada para `/uploads`:
     - Host: `btenis.cortexsolucoes.com.br`
     - Path: `/uploads`
     - Port: `5001`
8. **Deploy** — clicar em Deploy e aguardar o build.

## 3. App do Frontend

1. **Create Service → App**
2. **Service Name**: `frontend`
3. **Source**:
   - Tipo: **Github**
   - Repo: `mariocortex/cortex-beach`
   - Branch: `master`
   - **Build Path**: `/client`
4. **Build**:
   - Tipo: **Dockerfile** (usa o `client/Dockerfile`)
   - **Build Args**:
     ```
     REACT_APP_API_URL=https://btenis.cortexsolucoes.com.br
     ```
     *(⚠️ importante: o React injeta isso em build-time, não runtime)*
5. **Environment Variables**: não precisa (a URL já foi embutida no build)
6. **Domains**:
   - Host: `btenis.cortexsolucoes.com.br`
   - Path: `/`
   - Port: `5000`
   - HTTPS: **On**
7. **Deploy**

---

## 4. DNS

Na Hostinger (ou onde estiver o DNS de `cortexsolucoes.com.br`), crie um registro:

```
Tipo: A
Nome: btenis
Valor: <IP do seu VPS Easypanel>
```

Aguarde propagar (normalmente 1–5 min). O Easypanel gera o certificado Let's Encrypt automaticamente após o DNS apontar.

## 5. Rodar migration do WhatsApp

No Supabase SQL Editor, rode:
1. Todo o conteúdo de `server/migrations/whatsapp.sql`
2. (recomendado) As constraints NOT NULL:
   ```sql
   ALTER TABLE tournaments ALTER COLUMN company_id SET NOT NULL;
   ALTER TABLE players ALTER COLUMN company_id SET NOT NULL;
   ```

## 6. Verificar

- `https://btenis.cortexsolucoes.com.br` → abre a tela de login
- `https://btenis.cortexsolucoes.com.br/api/health` → `{"status":"ok"}`
- Faça login, crie um torneio e teste a aba WhatsApp

---

## Ordem de roteamento no Easypanel

⚠️ **Importante**: o Easypanel roteia por path do **mais específico para o mais genérico**. Como `/api` e `/uploads` são mais específicos que `/`, o frontend em `/` não "pega" as rotas do backend. Isso é automático, mas se algo não funcionar confira a ordem na aba Domains de cada app.

## Atualizações

Easypanel tem **Auto Deploy** na aba Source — ative para fazer rebuild automático a cada push no `master`. Ou clique manualmente em **Deploy** depois de um `git push`.

## Troubleshooting

| Problema | Solução |
|---|---|
| `CORS bloqueado` no console | Confira `CORS_ORIGIN` do backend — tem que bater **exatamente** com `https://btenis.cortexsolucoes.com.br` |
| API retorna 404 | Veja se a entrada `/api` no backend está mapeada para a porta `5001` |
| Fetch vai pra `localhost:5001` no browser | Você esqueceu de passar `REACT_APP_API_URL` como **Build Arg** (não Env Var). Rebuild necessário. |
| Upload de imagem some após redeploy | Volume persistente não foi montado em `/app/uploads` |
| `btenis.cortexsolucoes...` não abre | DNS ainda propagando ou apontando pro IP errado |
| Whatsapp diz "Config não encontrada" | Migration `whatsapp.sql` ainda não foi rodada no Supabase |
