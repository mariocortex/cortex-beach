// ============================================
// WHATSAPP WORKER (node-cron)
// ============================================
// Responsabilidades:
// 1. A cada 1 min: processa mensagens com status 'pending' ou
//    'scheduled' (com scheduled_for <= agora).
// 2. A cada 30s: atualiza connection_status das instâncias ativas.
// 3. Diariamente às 08:00: dispara aviso de início de torneio
//    para torneios cujo start_date cai hoje.

import cron from 'node-cron';
import { sendTextMessage, getInstanceStatus, applyTemplate } from './evolution.js';

const MAX_RETRIES = 3;
const BATCH_SIZE = 20;
const STALE_PROCESSING_MIN = 5; // reclama msgs travadas em 'processing' ha mais de X min

export function startWhatsappWorker(supabase) {
  console.log('[whatsapp-worker] iniciando...');

  // ---- 1. Processa fila a cada minuto ----
  cron.schedule('* * * * *', async () => {
    try {
      await processQueue(supabase);
    } catch (err) {
      console.error('[whatsapp-worker] erro no processQueue:', err.message);
    }
  });

  // ---- 2. Atualiza status de instâncias a cada 30s ----
  // node-cron só tem precisão de minuto; usamos setInterval complementar.
  setInterval(async () => {
    try {
      await refreshInstancesStatus(supabase);
    } catch (err) {
      console.error('[whatsapp-worker] erro no refreshStatus:', err.message);
    }
  }, 30000);

  // ---- 3. Disparo de início de torneio - às 08:00 todo dia ----
  cron.schedule('0 8 * * *', async () => {
    try {
      await enqueueTournamentStartMessages(supabase);
    } catch (err) {
      console.error('[whatsapp-worker] erro no enqueueTournamentStart:', err.message);
    }
  });

  console.log('[whatsapp-worker] ativo (queue: 1min, status: 30s, tournament-start: 08:00)');
}

// ============================================
// 1. PROCESSA FILA
// ============================================
// Locking strategy: antes de enviar, marca a msg como 'processing'
// num UPDATE atomico condicionado ao status anterior. Se outra
// execucao do cron ja pegou a msg, nossa claim retorna 0 linhas
// e a msg e ignorada. Msgs 'processing' presas por mais de
// STALE_PROCESSING_MIN minutos sao re-reivindicadas (crash recovery).
async function processQueue(supabase) {
  const nowIso = new Date().toISOString();
  const staleIso = new Date(Date.now() - STALE_PROCESSING_MIN * 60 * 1000).toISOString();

  // Candidatos: pending, scheduled vencidos, ou processing travado
  const { data: msgs, error } = await supabase
    .from('whatsapp_messages')
    .select('*')
    .or(
      `status.eq.pending,` +
      `and(status.eq.scheduled,scheduled_for.lte.${nowIso}),` +
      `and(status.eq.processing,updated_at.lte.${staleIso})`
    )
    .lt('retry_count', MAX_RETRIES)
    .limit(BATCH_SIZE)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('[whatsapp-worker] erro buscando fila:', error.message);
    return;
  }
  if (!msgs || msgs.length === 0) return;

  // Tenta travar cada mensagem atomicamente (claim).
  // Para msgs 'processing' stale, a claim tambem precisa checar
  // que updated_at ainda e antigo, para evitar roubar de outro
  // worker que acabou de comecar.
  const locked = [];
  for (const m of msgs) {
    let claimQuery = supabase
      .from('whatsapp_messages')
      .update({ status: 'processing' })
      .eq('id', m.id)
      .eq('status', m.status);

    if (m.status === 'processing') {
      claimQuery = claimQuery.lte('updated_at', staleIso);
    }

    const { data: claimed, error: claimErr } = await claimQuery.select();
    if (claimErr) {
      console.error('[whatsapp-worker] erro no claim:', claimErr.message);
      continue;
    }
    if (claimed && claimed.length > 0) {
      locked.push(claimed[0]);
    }
  }

  if (locked.length === 0) return;

  // Agrupa por company_id para carregar config uma so vez
  const byCompany = new Map();
  for (const m of locked) {
    if (!byCompany.has(m.company_id)) byCompany.set(m.company_id, []);
    byCompany.get(m.company_id).push(m);
  }

  for (const [companyId, list] of byCompany) {
    const { data: config } = await supabase
      .from('whatsapp_configs')
      .select('*')
      .eq('company_id', companyId)
      .single();

    if (!config || config.connection_status !== 'connected') {
      // Devolve as msgs para pending (ou failed se estourou retry)
      for (const m of list) {
        const newRetry = (m.retry_count || 0) + 1;
        const finalStatus = newRetry >= MAX_RETRIES ? 'failed' : 'pending';
        await supabase
          .from('whatsapp_messages')
          .update({
            status: finalStatus,
            retry_count: newRetry,
            error_message: config ? 'Instancia nao conectada' : 'Config nao encontrada'
          })
          .eq('id', m.id);
      }
      continue;
    }

    for (const m of list) {
      try {
        const result = await sendTextMessage(config, m.phone, m.message);
        await supabase
          .from('whatsapp_messages')
          .update({
            status: 'sent',
            sent_at: new Date().toISOString(),
            evolution_message_id: result?.key?.id || result?.id || null,
            error_message: null
          })
          .eq('id', m.id);
      } catch (err) {
        const newRetry = (m.retry_count || 0) + 1;
        const finalStatus = newRetry >= MAX_RETRIES ? 'failed' : 'pending';
        await supabase
          .from('whatsapp_messages')
          .update({
            retry_count: newRetry,
            error_message: err.message?.substring(0, 500) || 'Erro desconhecido',
            status: finalStatus
          })
          .eq('id', m.id);
      }
    }
  }
}

// ============================================
// 2. REFRESH DE STATUS DE INSTÂNCIAS
// ============================================
async function refreshInstancesStatus(supabase) {
  const { data: configs, error } = await supabase
    .from('whatsapp_configs')
    .select('*')
    .not('instance_name', 'is', null)
    .in('connection_status', ['connecting', 'connected']);

  if (error || !configs || configs.length === 0) return;

  for (const cfg of configs) {
    try {
      const result = await getInstanceStatus(cfg);
      const state = result?.instance?.state || result?.state || 'unknown';
      let newStatus = 'disconnected';
      if (state === 'open') newStatus = 'connected';
      else if (state === 'connecting') newStatus = 'connecting';
      else if (state === 'close') newStatus = 'disconnected';

      if (newStatus !== cfg.connection_status) {
        await supabase
          .from('whatsapp_configs')
          .update({
            connection_status: newStatus,
            last_status_check: new Date().toISOString()
          })
          .eq('id', cfg.id);
      } else {
        await supabase
          .from('whatsapp_configs')
          .update({ last_status_check: new Date().toISOString() })
          .eq('id', cfg.id);
      }
    } catch (err) {
      // falha silenciosa - mantém o status anterior
    }
  }
}

// ============================================
// 3. ENQUEUE MENSAGENS DE INÍCIO DE TORNEIO
// ============================================
async function enqueueTournamentStartMessages(supabase) {
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
  const end = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).toISOString();

  const { data: tournaments, error } = await supabase
    .from('tournaments')
    .select('id, name, company_id, start_date, categories')
    .gte('start_date', start)
    .lt('start_date', end);

  if (error || !tournaments || tournaments.length === 0) return;

  for (const t of tournaments) {
    const { data: config } = await supabase
      .from('whatsapp_configs')
      .select('*')
      .eq('company_id', t.company_id)
      .single();

    if (!config || !config.auto_tournament_start) continue;

    const { data: inscriptions } = await supabase
      .from('tournament_players')
      .select('category, players(id, full_name, phone)')
      .eq('tournament_id', t.id);

    if (!inscriptions) continue;

    const rows = [];
    for (const insc of inscriptions) {
      const p = insc.players;
      if (!p || !p.phone) continue;
      const message = applyTemplate(config.template_tournament_start, {
        nome: p.full_name,
        torneio: t.name,
        categoria: insc.category || ''
      });
      rows.push({
        company_id: t.company_id,
        tournament_id: t.id,
        player_id: p.id,
        phone: p.phone,
        recipient_name: p.full_name,
        message,
        status: 'pending',
        trigger_type: 'tournament_start'
      });
    }

    if (rows.length > 0) {
      await supabase.from('whatsapp_messages').insert(rows);
      console.log(`[whatsapp-worker] ${rows.length} msgs de início enfileiradas (torneio ${t.name})`);
    }
  }
}
