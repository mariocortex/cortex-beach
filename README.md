# 🏐 Córtex Beach

Plataforma SaaS especializada na gestão automatizada de torneios de beach tênis com foco no formato "Super Oito" de duplas rotativas e pontuação individual.

## 📋 Características

- ✅ Criação e gerenciamento de torneios
- ✅ Cadastro de jogadores (individual e em massa)
- ✅ Sorteio automático de duplas
- ✅ Sistema de pontuação automático
- ✅ Painel de controle em tempo real para lançamento de resultados
- ✅ Painel público (carrossel) para exibição em telões
- ✅ Sistema de comerciais/patrocínios
- ✅ Rankings automáticos

## 🚀 Quick Start

### Pré-requisitos

- Node.js 16+
- npm ou yarn
- Conta Supabase

### Instalação

1. Clone o repositório

```bash
git clone <repository-url>
cd cortex_beach
```

2. Instale as dependências do projeto raiz

```bash
npm install
```

3. Configure o arquivo `.env` com suas credenciais Supabase

```env
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_key
```

4. Instale dependências do servidor e cliente

```bash
cd server && npm install
cd ../client && npm install
cd ..
```

### Desenvolvimento

Execute servidor e cliente simultaneamente:

```bash
npm run dev
```

Ou separadamente:

```bash
# Terminal 1
npm run dev:server

# Terminal 2
npm run dev:client
```

- **Server:** http://localhost:5000
- **Client:** http://localhost:3000

### Build para Produção

```bash
npm run build
```

## 📁 Estrutura do Projeto

```
cortex_beach/
├── server/                 # Backend Node.js/Express
│   ├── src/
│   │   └── index.js       # API principal
│   └── package.json
├── client/                # Frontend React
│   ├── public/
│   ├── src/
│   │   ├── components/    # Componentes reutilizáveis
│   │   ├── pages/         # Páginas da aplicação
│   │   ├── App.js
│   │   └── index.js
│   └── package.json
├── .env                   # Configurações de ambiente
└── package.json
```

## 🗄️ Banco de Dados

O projeto usa PostgreSQL (via Supabase). Schema principal:

### Tabelas

- **tournaments** - Torneios criados
- **players** - Jogadores inscritos
- **matches** - Partidas do torneio
- **rankings** - Classificação automática
- **commercials** - Anúncios e patrocínios

## 🎨 Design System

### Cores

- **Primária:** #0066CC (Azul)
- **Secundária:** #FF6600 (Laranja)
- **Sucesso:** #10B981
- **Perigo:** #EF4444

### Tipografia

- **Interface:** Inter
- **Display/Telão:** Montserrat

### Espaçamento

Baseado em 8px grid system

## 📱 Responsividade

- ✅ Desktop (1200px+)
- ✅ Tablet (768px - 1199px)
- ✅ Mobile (< 768px)
- ✅ Telas 4K (Full HD + suporte)

## 🔐 Autenticação

Atualmente usa autenticação básica. Pronto para integração com:
- Supabase Auth
- JWT
- OAuth

## 📊 Módulos Principais

### 1. Dashboard (`/`)

Visão geral com métricas chave e torneios recentes.

### 2. Gerenciamento de Torneios (`/tournaments`)

- Criar, editar, duplicar, arquivar
- Configuração em 4 passos (wizard)
- Filtros e busca

### 3. Painel de Controle (`/tournaments/:id/control`)

Interface otimizada para mobile/tablet:
- Lançamento de resultados (2 cliques)
- Classificação em tempo real
- Programação de partidas

### 4. Painel Público (`/display/:tournamentId`)

Carrossel automático para telões:
- Tela de Classificação (20s)
- Tela de Resultados Recentes (20s)
- Tela de Programação (20s)
- Tela de Comerciais (20s)

## 🔗 API Endpoints

```
GET    /api/health                              # Health check
GET    /api/tournaments                          # Listar torneios
GET    /api/tournaments/:id                      # Detalhe torneio
POST   /api/tournaments                          # Criar torneio
PUT    /api/tournaments/:id                      # Atualizar torneio
GET    /api/tournaments/:id/players              # Listar jogadores
POST   /api/tournaments/:id/players              # Adicionar jogador
GET    /api/tournaments/:id/matches              # Listar partidas
POST   /api/tournaments/:id/matches              # Criar partida
PUT    /api/tournaments/:id/matches/:matchId     # Atualizar partida
GET    /api/tournaments/:id/rankings             # Rankings
GET    /api/tournaments/:id/commercials          # Comerciais
POST   /api/tournaments/:id/commercials          # Criar comercial
```

## 🎯 Sistema de Pontuação

Configurável por torneio:
- Vitória: 6 pontos (padrão)
- Derrota: 2 pontos (padrão)
- Empate: 3 pontos (padrão)

Desempate por:
- Confronto direto
- Pontos acumulados
- Diferença de sets

## 📝 Regras do Super Oito

- 8 jogadores por chave
- Todos jogam contra todos (7 partidas)
- Best of 3 sets
- Duplas rotativas configuráveis
- Pontuação individual

## 🚀 Próximos Passos

- [ ] Setup Supabase (criar tabelas)
- [ ] Autenticação completa
- [ ] Importação CSV de jogadores
- [ ] Sistema de pagamento (Mercado Pago/Stripe)
- [ ] Notificações (WhatsApp/Email)
- [ ] App mobile dedicado
- [ ] Integração com streaming
- [ ] Sistema de ratings e histórico

## 📞 Suporte

Para questões ou bugs, abra uma issue no repositório.

## 📄 Licença

MIT

---

Desenvolvido com ❤️ para a comunidade de beach tênis 🏐
