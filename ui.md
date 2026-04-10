# Documento de Planejamento de Interface - Córtex Beach

## 1. Princípios Gerais de UI/UX
*   **Simplicidade Operacional:** Fluxos principais (criar torneio, lançar resultado) devem ser concluídos em 3 cliques ou menos.
*   **Clareza Visual:** Alto contraste para leitura em ambientes externos (telões) e em dispositivos móveis sob luz solar.
*   **Consistência:** Uso de um *Design System* unificado com componentes reutilizáveis.
*   **Responsividade:** Interfaces devem adaptar-se perfeitamente a Desktop, Tablet, Mobile e Telas de Exibição Pública (Full HD/4K).
*   **Feedback Imediato:** Confirmações visuais para todas as ações do usuário (ex: resultado lançado, jogador cadastrado).

## 2. Sistema de Design
*   **Cores Primárias:** Azul (#0066CC - ações principais, confiança) e Laranja (#FF6600 - alertas, destaques).
*   **Tipografia:** Inter para interfaces administrativas (legibilidade em telas próximas), Montserrat para o Painel Público (impacto visual em telões).
*   **Espaçamento:** Base de 8px (8, 16, 24, 32, 40, 48...).
*   **Biblioteca de Ícones:** Material Design Icons.
*   **Componentes Base:** Botões, Inputs, Cards, Modais, Tabelas, Badges, Progress Bars, Toggles.

## 3. Mapa de Telas e Componentes

### **Módulo Administrativo (Backoffice)**

#### **Tela A1: Login / Portal de Acesso**
*   **Componentes:**
    *   Card de Login centralizado.
    *   Campo de Input para E-mail.
    *   Campo de Input para Senha (com toggle para mostrar/ocultar).
    *   Botão Primário "Entrar".
    *   Link "Esqueci minha senha".
    *   (Futuro) Seletor de Organização/Tenant (para usuários com múltiplas arenas).

#### **Tela A2: Dashboard / Visão Geral**
*   **Objetivo:** Visão panorâmica dos torneios ativos e métricas chave.
*   **Componentes:**
    *   Cabeçalho com saudação, notificações e menu de usuário.
    *   Barra lateral de navegação principal (Menu colapsável).
    *   Cards de Métricas (KPI Cards): "Torneios Ativos", "Jogadores Inscritos Hoje", "Resultados Pendentes".
    *   Lista/Grid de "Torneios em Andamento" com cards clicáveis.
    *   Seção de "Ações Rápidas": Botões "Criar Novo Torneio", "Ver Painel Público".
    *   Gráfico de atividade recente (timeline simplificada).

#### **Tela A3: Gestão de Torneios - Lista**
*   **Componentes:**
    *   Barra de Título com filtros rápidos (Status: Todos, Ativos, Finalizados, Rascunhos).
    *   Botão de Ação Primária "Criar Torneio".
    *   Tabela com colunas: Nome do Torneio, Data, Categoria, Status, Nº de Jogadores, Ações.
    *   Menu de Ações por linha (ícone "..."): "Editar", "Duplicar", "Arquivar", "Excluir".
    *   Paginação ou scroll infinito.

#### **Tela A4: Criação/Edição de Torneio (Wizard - 4 Passos)**
*   **Estrutura:** Barra de progresso no topo indicando os passos.
*   **Passo 1 - Informações Básicas:**
    *   Input de texto "Nome do Torneio".
    *   Seletores de Data e Hora de Início.
    *   Upload de Imagem de Capa (com preview).
    *   Textarea para Descrição.
*   **Passo 2 - Configuração de Categorias:**
    *   Botão "Adicionar Categoria".
    *   Para cada categoria: Input "Nome" (ex: "Iniciante"), Select "Formato" (padrão "Super Oito"), Input "Limite de Jogadores".
    *   Lista das categorias adicionadas com opção de remover/editar.
*   **Passo 3 - Configurações de Pontuação:**
    *   Inputs numéricos para "Pontos por Vitória" (padrão 6), "Pontos por Derrota" (padrão 2), "Pontos por Empate" (padrão 3).
    *   Select para "Critério de Desempate" (ex: "Confronto Direto", "Pontos Acumulados").
    *   Toggle para "Cálculo Automático".
*   **Passo 4 - Revisão e Confirmação:**
    *   Card de resumo com todas as informações configuradas.
    *   Botões "Voltar" e "Criar Torneio & Gerenciar Inscrições".

#### **Tela A5: Gestão de Jogadores por Torneio**
*   **Componentes:**
    *   Abas ou seções por "Categoria" do torneio.
    *   Barra de ferramentas com: Botão "Adicionar Jogador", Botão "Importar CSV", Campo de Busca.
    *   Tabela de jogadores com colunas: Nome, Nível (Badge), Contato, Status Pagamento (Badge), Ações.
    *   Modal "Adicionar/Editar Jogador": Campos Nome, Email, Telefone, Select para Nível (Iniciante/Intermediário/Avançado).
    *   Modal "Importar CSV": Área de *drag-and-drop*, botão para download de template.

#### **Tela A6: Sorteio e Formação de Chaves**
*   **Componentes:**
    *   Visão geral das categorias e número de jogadores inscritos.
    *   Botão "Sortear Duplas Automaticamente" (com modal de confirmação).
    *   Visualização em grade ou lista das duplas formadas, agrupadas por rodada inicial.
    *   Para cada dupla: Cards arrastáveis com nome dos jogadores, opção de "Trocar Jogador" manualmente.
    *   Botão "Confirmar Chaves e Iniciar Torneio".

#### **Tela A7: Painel de Controle do Torneio (Live)**
*   **Objetivo:** Interface principal para operação em tempo real, otimizada para tablet/mobile.
*   **Componentes:**
    *   Cabeçalho fixo com nome do torneio e horário atual.
    *   Abas principais: "Lançar Resultado", "Classificação", "Programação".
    *   **Aba "Lançar Resultado":**
        *   Select para "Categoria".
        *   Select para "Nº da Quadra".
        *   Cards interativos para selecionar a Dupla A vs Dupla B.
        *   Inputs para placar (Sets: [ ] - [ ]).
        *   Botão grande "Confirmar Resultado" (com modal de confirmação final).
    *   **Aba "Classificação":**
        *   Tabela de ranking atualizada automaticamente. Colunas: Posição, Nome do Jogador, Pontos Acumulados, Vitórias/Derrotas.
        *   Filtro por categoria.
    *   **Aba "Programação":**
        *   Lista das próximas partidas com: Duplas, Quadra, Horário Estimado, Status (Pendente/Em Andamento/Concluída).

#### **Tela A8: Gestão de Comerciais (Patrocínios)**
*   **Componentes:**
    *   Botão "Nova Campanha".
    *   Lista de campanhas ativas/inativas.
    *   Modal "Criar/Editar Campanha":
        *   Input "Nome do Anunciante".
        *   Upload de Mídia (com preview e validação de formato: JPG, PNG, MP4).
        *   Seletores de Data/Hora de Início e Término.
        *   Input "Duração da Exibição (segundos)".
        *   Toggle "Ativo".

---

### **Módulo Público (Painel de Exibição - Carrossel)**

#### **Tela P1: Tela de Classificação**
*   **Objetivo:** Exibir o Top 8 de cada categoria de forma clara e impactante.
*   **Componentes:**
    *   Cabeçalho grande com logo do torneio e nome da categoria em destaque.
    *   Tabela estilizada para telão, com linhas destacadas (ex: fundo amarelo para o 1º lugar).
    *   Colunas: Posição (ênfase visual), Nome do Jogador, Pontuação Total.
    *   Rodapé com logo "Córtex Beach" e contador para próxima tela (ex: "Próximo: Resultados Recentes em 0:45").
    *   *Layout responsivo para diferentes resoluções de tela.*

#### **Tela P2: Tela de Resultados Recentes**
*   **Componentes:**
    *   Título grande "ÚLTIMOS RESULTADOS".
    *   Lista vertical de cards para os últimos 5 jogos.
    *   Cada card exibe: Nomes das Duplas (ex: "Silva & Costa" vs "Oliveira & Santos"), Placar final (ex: "2 - 1"), Nome da Quadra e horário de conclusão.
    *   Ícone indicativo (ex: troféu) ao lado da dupla vencedora.

#### **Tela P3: Tela de Programação**
*   **Componentes:**
    *   Título "PRÓXIMAS PARTIDAS".
    *   Lista agrupada por horário ou quadra.
    *   Para cada partida: Horário, Nº da Quadra, Nomes das Duplas aguardando.
    *   Destaque visual para a partida "Em Andamento".

#### **Tela P4: Tela de Comercial / Patrocínio**
*   **Componentes:**
    *   Container em tela cheia para exibição da mídia.
    *   Para imagem: Exibição centralizada, maximizada de forma responsiva.
    *   Para vídeo: Player automático, sem controles, em loop (se aplicável).
    *   Logotipo discreto do anunciante no canto inferior.

#### **Tela P5: Tela de Transição / Aguarde**
*   **Componentes:**
    *   Fundo com cor branda ou padrão visual da marca.
    *   Logo centralizada "Córtex Beach".
    *   Mensagem "Próxima atualização em breve..." ou "Aguarde...".

## 4. Componentes Reutilizáveis e Específicos
*   **Badge de Status:** Componente para "Ativo", "Pago", "Pendente", "Finalizado" (cores distintas).
*   **Card de Jogador/Dupla:** Componente arrastável para o sorteio, com foto (placeholder), nome e nível.
*   **Modal de Confirmação:** Padronizado para ações críticas (ex: "Confirmar resultado? Dupla A 2-1 Dupla B").
*   **Seletor de Dupla:** Combobox com busca em tempo real para selecionar jogadores durante o lançamento de resultados.
*   **Player do Carrossel:** Controles administrativos ocultos no painel público (ex: pausar, avançar manualmente, selecionar tela) acessíveis via código/QR Code.

## 5. Requisitos de Interação e Comportamento
*   **Atualização em Tempo Real:** O Painel Público (Carrossel) deve atualizar seu conteúdo a cada 30 segundos via WebSocket ou polling.
*   **Arrastar e Soltar (Drag & Drop):** Funcional na tela de sorteio de duplas para ajustes manuais.
*   **Toque (Touch-Friendly):** Todos os botões e inputs do Painel de Controle Live (Tela A7) devem ter área de toque ampla (> 44px).
*   **Validação em Tempo Real:** Campos de formulário (email, placar numérico) devem validar durante a digitação.
*   **Feedback de Carregamento:** Spinners ou *skeleton screens* durante operações assíncronas (salvar, importar).

## 6. Considerações para Dispositivos
*   **Mobile (Organizador):** O fluxo da Tela A7 (Painel de Controle Live) é prioritário. Deve usar gestos nativos (swipe entre abas) e ter UI compacta.
*   **Tablet (Organizador):** Balance entre densidade de informação e facilidade de toque.
*   **Desktop (Organizador):** Máxima produtividade, com múltiplas colunas, pré-visualizações e atalhos de teclado.
*   **Telão (Público):** Máxima legibilidade a distância, contraste alto, animações suaves, zero interação necessária do espectador.