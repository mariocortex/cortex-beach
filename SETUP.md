# 🚀 Setup do Córtex Beach

Guia completo para configurar e executar o projeto Córtex Beach.

## 1️⃣ Pré-requisitos

- Node.js 16+ ([Download](https://nodejs.org/))
- npm ou yarn
- Conta Supabase ([https://supabase.com](https://supabase.com))
- Git (opcional)

## 2️⃣ Configuração do Supabase

### 2.1 Criar Projeto Supabase

1. Acesse [supabase.com](https://supabase.com)
2. Faça login ou crie uma conta
3. Clique em "New Project"
4. Preencha:
   - **Project Name:** `cortex-beach`
   - **Database Password:** Escolha uma senha forte
   - **Region:** Escolha a região mais próxima (ex: South America)
5. Clique "Create new project" e aguarde (pode levar alguns minutos)

### 2.2 Copiar Credenciais

1. Após criar, vá para **Settings** → **API**
2. Copie:
   - **Project URL** → `SUPABASE_URL`
   - **anon public** → `SUPABASE_KEY`
   - **service_role secret** → `SUPABASE_SECRET_KEY`

### 2.3 Criar Tabelas do Banco

1. Na aba **SQL Editor**, clique em "New query"
2. Copie todo o conteúdo de `modelo_dados.sql`
3. Cole no editor
4. Clique "Run"
5. Aguarde a execução (você verá "Success" em verde)

### 2.4 Verificar Tabelas Criadas

1. Vá para **Table Editor**
2. Você deve ver as tabelas:
   - users
   - tournaments
   - players
   - matches
   - rankings
   - commercials
   - match_history

## 3️⃣ Configuração do Projeto Local

### 3.1 Clonar/Preparar o Projeto

```bash
# Se for clonar
git clone <repository-url>
cd cortex_beach

# Ou se já está na pasta
cd cortex_beach
```

### 3.2 Configurar Variáveis de Ambiente

1. Abra o arquivo `.env` na raiz do projeto
2. Preencha com as credenciais do Supabase:

```env
PORT=5000
NODE_ENV=development

# Cole aqui as credenciais do Supabase
SUPABASE_URL=https://xrjmxsqjohrnghvwnsre.supabase.co
SUPABASE_KEY=sb_publishable_JMM2mTTttYI4Fs2DkAoOKg_x9Hae1Qa

CORS_ORIGIN=http://localhost:3000
```

### 3.3 Instalar Dependências

```bash
# Instalar dependências do projeto raiz
npm install

# Instalar dependências do servidor
cd server
npm install

# Instalar dependências do cliente
cd ../client
npm install

# Voltar para raiz
cd ..
```

## 4️⃣ Executar Localmente

### Opção A: Executar Tudo Junto

```bash
npm run dev
```

Isso iniciará simultaneamente:
- **Backend:** http://localhost:5000
- **Frontend:** http://localhost:3000

### Opção B: Executar Separadamente

**Terminal 1 - Backend:**
```bash
npm run dev:server
```

**Terminal 2 - Frontend:**
```bash
npm run dev:client
```

## 5️⃣ Testar a Aplicação

1. Abra http://localhost:3000 no navegador
2. Use as credenciais de teste:
   - **Email:** demo@cortexbeach.com
   - **Senha:** demo123

3. Você deve ver o Dashboard com:
   - Cards de estatísticas
   - Torneios recentes
   - Ações rápidas

## 6️⃣ Criar Primeiro Torneio

1. Clique em "Novo Torneio" ou "Criar Torneio"
2. Preencha os dados:
   - Nome: "Meu Primeiro Torneio"
   - Data: Escolha uma data/hora
   - Descrição: Opcional
3. Clique "Próximo"
4. Adicione categorias (ex: Intermediário, Avançado)
5. Configure pontuação (valores padrão estão OK)
6. Revise e clique "Criar Torneio"

## 7️⃣ Funcionalidades por Módulo

### Dashboard (`/`)
- Visão geral dos torneios
- Métricas chave
- Ações rápidas

### Torneios (`/tournaments`)
- Lista de todos os torneios
- Filtros por status
- Busca por nome
- Criar novo

### Detalhe do Torneio (`/tournaments/:id`)
- Informações completo
- Lista de jogadores
- Partidas

### Painel de Controle (`/tournaments/:id/control`)
- Lançar resultados
- Visualizar classificação
- Ver programação

### Painel Público (`/display/:tournamentId`)
- Carrossel para telões
- Exibição de resultados
- Classificação
- Comerciais

## 🐛 Troubleshooting

### "Port 5000 is already in use"
```bash
# Mude a porta no .env
PORT=5001
```

### "Cannot connect to Supabase"
- Verifique se as credenciais no `.env` estão corretas
- Verifique se sua conexão de internet está OK
- Teste a URL do Supabase no navegador

### "npm install falha"
```bash
# Limpe cache
npm cache clean --force

# Tente novamente
npm install
```

### React não está recarregando
```bash
# Feche o servidor (Ctrl+C)
# Limpe cache
rm -rf client/node_modules/.cache

# Reinicie
npm run dev:client
```

## 📱 Acessar de Outro Dispositivo

Se quiser acessar de outro dispositivo na rede local:

1. Descubra seu IP:
   ```bash
   # Windows
   ipconfig | findstr "IPv4"

   # Mac/Linux
   ifconfig | grep "inet "
   ```

2. Acesse: `http://SEU_IP:3000`

## 🚀 Próximos Passos

- [ ] Customize as cores no `client/src/index.css`
- [ ] Adicione logo própria em `client/public/`
- [ ] Configure autenticação real (Supabase Auth)
- [ ] Implemente sistema de pagamento
- [ ] Configure notificações via WhatsApp/Email
- [ ] Deploy para produção

## 📚 Recursos

- [Documentação Supabase](https://supabase.com/docs)
- [React Documentation](https://react.dev)
- [Express.js Guide](https://expressjs.com)
- [PostgreSQL Documentation](https://www.postgresql.org/docs)

## 💡 Dicas

1. Use o **SQL Editor** do Supabase para testar queries
2. Use o **Table Editor** para visualizar/editar dados
3. Monitore logs no navegador: **F12** → **Console**
4. Monitore logs do backend: Veja o terminal onde rodou `npm run dev:server`

## ❓ Precisa de Ajuda?

1. Verifique o arquivo de logs
2. Abra uma issue no repositório
3. Consulte a documentação das ferramentas usadas

---

**Status:** ✅ Ready to develop!

Agora você está pronto para desenvolver no Córtex Beach. Happy coding! 🚀
