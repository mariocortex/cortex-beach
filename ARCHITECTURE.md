# 🏗️ Arquitetura do Córtex Beach

Documentação técnica da arquitetura, design e padrões do projeto.

## 📐 Visão Geral

```
┌─────────────────────────────────────────────────────────────┐
│                     CLIENTE (React)                         │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Pages (Login, Dashboard, Tournament, ControlPanel)  │   │
│  │ Components (Navigation, Cards, Forms, Tables)       │   │
│  │ Hooks (useState, useEffect, useParams)              │   │
│  └──────────────────────────────────────────────────────┘   │
└──────────────────────────┬──────────────────────────────────┘
                           │ HTTP/REST
┌──────────────────────────▼──────────────────────────────────┐
│                    SERVIDOR (Node.js/Express)              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Routes: /api/tournaments, /api/players, etc         │   │
│  │ Controllers: Business Logic                         │   │
│  │ Middleware: Auth, CORS, Error Handling              │   │
│  └──────────────────────────────────────────────────────┘   │
└──────────────────────────┬──────────────────────────────────┘
                           │ SQL
┌──────────────────────────▼──────────────────────────────────┐
│               BANCO DE DADOS (PostgreSQL/Supabase)         │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Tables: users, tournaments, players, matches, etc   │   │
│  │ Indexes: Para performance                           │   │
│  │ Triggers: updated_at automático                     │   │
│  │ RLS: Row Level Security (futuro)                    │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## 🗂️ Estrutura de Pastas

```
cortex_beach/
├── client/                      # Frontend React
│   ├── public/
│   │   └── index.html          # HTML principal
│   ├── src/
│   │   ├── components/         # Componentes reutilizáveis
│   │   │   ├── Navigation.js
│   │   │   └── Navigation.css
│   │   ├── pages/              # Páginas da aplicação
│   │   │   ├── LoginPage.js
│   │   │   ├── DashboardPage.js
│   │   │   ├── TournamentListPage.js
│   │   │   ├── TournamentCreatePage.js
│   │   │   ├── TournamentDetailPage.js
│   │   │   ├── ControlPanelPage.js
│   │   │   ├── PublicDisplayPage.js
│   │   │   └── (*.css files)
│   │   ├── App.js              # Router principal
│   │   ├── index.js            # Entry point
│   │   └── index.css           # Styles globais
│   └── package.json
├── server/                      # Backend Node.js
│   ├── src/
│   │   └── index.js            # API Express
│   └── package.json
├── .env                        # Variáveis de ambiente
├── .env.example                # Exemplo de .env
├── modelo_dados.sql            # Schema do banco
├── SETUP.md                    # Guia de setup
├── ARCHITECTURE.md             # Este arquivo
├── README.md                   # Documentação principal
├── .gitignore
└── package.json                # Root package.json
```

## 🔌 API REST

### Estrutura de Endpoints

Padrão RESTful com recursos aninhados:

```
/api/tournaments              → Coleção de torneios
├── GET    /                  → Listar todos
├── POST   /                  → Criar novo
├── GET    /:id               → Detalhes
├── PUT    /:id               → Atualizar
└── DELETE /:id               → Deletar

/api/tournaments/:id/players  → Jogadores de um torneio
├── GET    /                  → Listar
├── POST   /                  → Adicionar
├── PUT    /:playerId         → Atualizar
└── DELETE /:playerId         → Remover

/api/tournaments/:id/matches  → Partidas de um torneio
├── GET    /                  → Listar
├── POST   /                  → Criar
├── PUT    /:matchId          → Atualizar resultado
└── DELETE /:matchId          → Cancelar

/api/tournaments/:id/rankings → Rankings (calculado)
└── GET    /                  → Listar classificação

/api/tournaments/:id/commercials → Comerciais
├── GET    /                  → Listar ativos
└── POST   /                  → Adicionar
```

### Exemplo de Requisição

```bash
# Criar um torneio
curl -X POST http://localhost:5000/api/tournaments \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{
    "name": "Open de Verão 2024",
    "date": "2024-01-20T14:00:00Z",
    "categories": ["Intermediário", "Avançado"],
    "scoring_rules": {
      "victory": 6,
      "defeat": 2,
      "draw": 3
    }
  }'
```

## 🗄️ Modelo de Dados

### Tabelas Principais

#### users
```
id (UUID)
email (VARCHAR)
password_hash (VARCHAR)
name (VARCHAR)
created_at (TIMESTAMP)
updated_at (TIMESTAMP)
```

#### tournaments
```
id (UUID)
user_id (UUID) FK users
name (VARCHAR)
description (TEXT)
date (TIMESTAMP)
status (VARCHAR) - draft, active, finished
categories (JSONB) - Array de categorias
scoring_rules (JSONB) - Config de pontuação
player_count (INT)
pending_results (INT)
created_at (TIMESTAMP)
updated_at (TIMESTAMP)
```

#### players
```
id (UUID)
tournament_id (UUID) FK tournaments
name (VARCHAR)
email (VARCHAR)
phone (VARCHAR)
level (VARCHAR) - iniciante, intermediario, avancado
category (VARCHAR)
payment_status (VARCHAR) - pending, paid
created_at (TIMESTAMP)
updated_at (TIMESTAMP)
```

#### matches
```
id (UUID)
tournament_id (UUID) FK tournaments
team_a (JSONB) - {id, name, players}
team_b (JSONB) - {id, name, players}
sets (JSONB) - {teamA: 0, teamB: 0}
court (VARCHAR)
scheduled_at (TIMESTAMP)
status (VARCHAR) - pending, in_progress, completed
winner (VARCHAR) - team_a, team_b
created_at (TIMESTAMP)
updated_at (TIMESTAMP)
```

#### rankings
```
id (UUID)
tournament_id (UUID) FK tournaments
player_id (UUID) FK players
player_name (VARCHAR)
category (VARCHAR)
points (INT)
wins (INT)
losses (INT)
draws (INT)
position (INT)
created_at (TIMESTAMP)
updated_at (TIMESTAMP)
```

#### commercials
```
id (UUID)
tournament_id (UUID) FK tournaments
advertiser_name (VARCHAR)
media_url (TEXT)
duration (INT) - em segundos
start_date (TIMESTAMP)
end_date (TIMESTAMP)
is_active (BOOLEAN)
views_count (INT)
created_at (TIMESTAMP)
updated_at (TIMESTAMP)
```

## 🎨 Padrões de Design

### Component Pattern (React)

Componentes são funcionais com hooks:

```javascript
function MyComponent({ prop1, prop2 }) {
  const [state, setState] = useState(initialValue);
  
  useEffect(() => {
    // Side effects
  }, [dependencies]);
  
  return <div>{/* JSX */}</div>;
}

export default MyComponent;
```

### Hooks Customizados (Futuros)

```javascript
// useApi.js
function useApi(url) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    // Fetch logic
  }, [url]);
  
  return { data, loading, error };
}
```

### Service Pattern

```javascript
// services/TournamentService.js
export const TournamentService = {
  async getAll() { /* ... */ },
  async getById(id) { /* ... */ },
  async create(data) { /* ... */ },
  async update(id, data) { /* ... */ },
  async delete(id) { /* ... */ }
};
```

## 🔐 Segurança

### Autenticação

Atualmente: Simulada com localStorage
Futuro: Supabase Auth ou JWT

### Autorização

Planejado:
- JWT com roles (admin, organizer, player)
- Row Level Security (RLS) no Supabase
- CORS restrictivo

### Validação

- Client-side: HTML5 + JavaScript
- Server-side: Schema validation (futuro)

### Sanitização

- Inputs sanitizados (futuro)
- SQL injections prevenidas pelo Supabase

## ⚡ Performance

### Frontend

- React lazy loading (futuro)
- Code splitting
- Image optimization
- CSS minification

### Backend

- Database indexes em campos frequentemente consultados
- Caching com Redis (futuro)
- Pagination para grandes datasets
- Gzip compression

### Banco de Dados

- Indexes em:
  - `tournaments.user_id`
  - `tournaments.status`
  - `matches.status`
  - `rankings.points`
  - `players.email`

## 🔄 Fluxos Principais

### Fluxo de Criação de Torneio

```
1. Usuário clica "Criar Torneio" → TournamentCreatePage
2. Preenche formulário (wizard 4 passos)
3. Clica "Criar Torneio"
4. POST /api/tournaments → Backend
5. Backend valida e salva no Supabase
6. Retorna tourneio criado
7. Redireciona para TournamentDetailPage
```

### Fluxo de Lançamento de Resultado

```
1. Organizador acessa ControlPanelPage
2. Seleciona partida pendente
3. Insere placar (sets)
4. Clica "Confirmar"
5. Modal de confirmação
6. PUT /api/tournaments/:id/matches/:matchId
7. Backend calcula pontuação
8. Atualiza rankings automaticamente
9. Retorna sucesso
10. Painel público se atualiza (polling 30s)
```

### Fluxo do Painel Público

```
1. Tela publica em /display/:tournamentId
2. Fetches data a cada 30s
3. Cicla entre 4 telas (20s cada)
   - Classificação (Top 8)
   - Resultados Recentes (últimos 5)
   - Programação (próximas partidas)
   - Comercial
4. Anima transições entre telas
5. Otimizado para telões (Full HD / 4K)
```

## 🧪 Testing (Futuro)

### Frontend Tests
- Jest + React Testing Library
- Testes de componentes
- Testes de integração

### Backend Tests
- Jest
- Testes de API
- Testes de banco de dados

### E2E Tests
- Cypress
- Testes de fluxos completos

## 📊 Monitoramento (Futuro)

- Sentry para error tracking
- Google Analytics para user behavior
- Datadog para APM
- CloudWatch para logs

## 🚀 Deployment

### Frontend
- Vercel ou Netlify (recomendado)
- GitHub Pages (alternativa)

### Backend
- Heroku (prototipagem)
- AWS Lambda (sem servidor)
- DigitalOcean (VPS)
- Railway (simplicidade)

### Banco de Dados
- Supabase managed (produção)

## 📈 Escalabilidade

### Curto Prazo
- Performance otimizada com indexes
- Caching com Redis (futuro)
- Lazy loading

### Médio Prazo
- Microserviços separados
- Message queues (RabbitMQ/Kafka)
- Rate limiting

### Longo Prazo
- Multi-region deployment
- CDN global
- Load balancing

## 🔗 Integrações Planejadas

- Mercado Pago (pagamento)
- Stripe (pagamento alternativo)
- SendGrid (email)
- Twilio (SMS/WhatsApp)
- AWS S3 (storage)
- Firebase Cloud Messaging (push)

## 📝 Convenções de Código

### Naming
- **Variables/Functions:** camelCase
- **Classes/Components:** PascalCase
- **Constants:** UPPER_SNAKE_CASE
- **Files:** PascalCase (components), lowercase (pages)

### File Organization
- Um componente por arquivo
- Styles em arquivo separado (.css)
- Exports padrão para páginas

### Comments
- Apenas onde lógica é complexa
- Evitar comentários óbvios
- JSDoc para funções públicas

### Formatting
- 2 espaços de indentação
- Semicolons obrigatórios
- Prettier para formatação

## 🐛 Debug

### Browser DevTools
- F12 → Console para erros
- Network tab para requisições
- Elements para DOM

### React DevTools
- Props inspection
- State/hooks inspection
- Component render tracking

### Backend
- console.log para debugging
- Logs no terminal
- Supabase logs

---

**Última atualização:** 2024-04-09
**Versão:** 0.1.0
**Status:** MVP Development
