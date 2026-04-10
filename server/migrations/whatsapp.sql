-- ============================================
-- CÓRTEX BEACH - WhatsApp / Evolution API
-- ============================================
-- Executar este script no Supabase SQL Editor do projeto.
-- Cria as tabelas necessárias para integração com Evolution API.

-- ============================================
-- WHATSAPP_CONFIGS
-- 1 configuração por empresa (company_id UNIQUE)
-- ============================================
CREATE TABLE IF NOT EXISTS whatsapp_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL UNIQUE REFERENCES companies(id) ON DELETE CASCADE,

  -- Credenciais Evolution API
  api_url TEXT,
  api_key TEXT,
  instance_name TEXT,

  -- Estado da instância
  connection_status TEXT DEFAULT 'disconnected',  -- disconnected | connecting | connected | error
  phone_number TEXT,                              -- Preenchido após conectar
  last_qr_code TEXT,                              -- Base64 do último QR code
  last_status_check TIMESTAMPTZ,

  -- Flags de automação
  auto_next_match BOOLEAN DEFAULT FALSE,
  auto_match_result BOOLEAN DEFAULT FALSE,
  auto_tournament_start BOOLEAN DEFAULT FALSE,

  -- Templates (com variáveis: {nome}, {torneio}, {categoria}, {quadra}, {rodada}, {adversarios}, {placar})
  template_next_match TEXT DEFAULT E'Olá {nome}! 🏐\n\nSua próxima partida no torneio *{torneio}* está prestes a começar:\n\n📍 Quadra: {quadra}\n🎯 Rodada: {rodada}\n🆚 Adversários: {adversarios}\n\nBoa sorte! 🏆',
  template_match_result TEXT DEFAULT E'🏐 Resultado confirmado - *{torneio}*\n\n{nome}, seu jogo foi registrado:\n\n📊 Placar: {placar}\n🎯 Rodada: {rodada}\n📍 Categoria: {categoria}\n\nAcompanhe a classificação no painel público!',
  template_tournament_start TEXT DEFAULT E'🏐 *{torneio}* começa hoje!\n\nOlá {nome}, o torneio está prestes a iniciar. Chegue com antecedência para o check-in.\n\nCategoria: {categoria}\n\nBoa sorte! 🏆',

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_configs_company_id ON whatsapp_configs(company_id);

-- ============================================
-- WHATSAPP_MESSAGES
-- Fila + histórico de mensagens
-- ============================================
CREATE TABLE IF NOT EXISTS whatsapp_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  tournament_id UUID REFERENCES tournaments(id) ON DELETE SET NULL,
  player_id UUID REFERENCES players(id) ON DELETE SET NULL,

  phone TEXT NOT NULL,
  recipient_name TEXT,
  message TEXT NOT NULL,

  -- Status lifecycle: pending -> sent | failed
  -- scheduled -> pending (quando chega a hora) -> sent | failed
  status TEXT NOT NULL DEFAULT 'pending',  -- pending | scheduled | sent | failed

  scheduled_for TIMESTAMPTZ,   -- Quando deve disparar (se scheduled)
  sent_at TIMESTAMPTZ,         -- Quando foi efetivamente enviado
  error_message TEXT,          -- Motivo da falha
  evolution_message_id TEXT,   -- ID retornado pela Evolution API
  retry_count INT DEFAULT 0,

  -- Origem do disparo
  trigger_type TEXT NOT NULL DEFAULT 'manual',  -- manual | next_match | match_result | tournament_start | scheduled
  match_id UUID,               -- Se originou de uma partida (não é FK hard para permitir delete de match)

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_company_id ON whatsapp_messages(company_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_status ON whatsapp_messages(status);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_scheduled_for ON whatsapp_messages(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_tournament_id ON whatsapp_messages(tournament_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_created_at ON whatsapp_messages(created_at DESC);

-- ============================================
-- TRIGGER: updated_at automático
-- ============================================
CREATE OR REPLACE FUNCTION update_whatsapp_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_whatsapp_configs_updated_at ON whatsapp_configs;
CREATE TRIGGER trg_whatsapp_configs_updated_at
  BEFORE UPDATE ON whatsapp_configs
  FOR EACH ROW EXECUTE FUNCTION update_whatsapp_updated_at();

DROP TRIGGER IF EXISTS trg_whatsapp_messages_updated_at ON whatsapp_messages;
CREATE TRIGGER trg_whatsapp_messages_updated_at
  BEFORE UPDATE ON whatsapp_messages
  FOR EACH ROW EXECUTE FUNCTION update_whatsapp_updated_at();

-- Done.
