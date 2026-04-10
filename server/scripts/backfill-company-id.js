// ============================================
// BACKFILL company_id
// ============================================
// Por causa de um bug antigo no getUserFromToken (split de UUID),
// torneios e jogadores criados antes da correção foram gravados
// com company_id = null. Este script associa esses registros órfãos
// à empresa do usuário informado por e-mail.
//
// Uso: node scripts/backfill-company-id.js <email>

import { config as dotenvConfig } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenvConfig({ path: path.resolve(__dirname, '../../.env') });

const email = process.argv[2];
if (!email) {
  console.error('Uso: node scripts/backfill-company-id.js <email>');
  process.exit(1);
}

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY
);

async function main() {
  // 1. Buscar usuário
  const { data: user, error: userErr } = await supabase
    .from('users')
    .select('id, email, company_id')
    .eq('email', email)
    .single();

  if (userErr || !user) {
    console.error('Usuário não encontrado:', email, userErr?.message);
    process.exit(1);
  }
  if (!user.company_id) {
    console.error('Usuário não possui company_id. Nada a fazer.');
    process.exit(1);
  }

  console.log(`Usuário: ${user.email}`);
  console.log(`Company ID: ${user.company_id}`);
  console.log('---');

  // 2. Torneios órfãos
  const { data: orphanTournaments } = await supabase
    .from('tournaments')
    .select('id, name')
    .is('company_id', null);

  console.log(`Torneios órfãos encontrados: ${orphanTournaments?.length || 0}`);
  if (orphanTournaments && orphanTournaments.length > 0) {
    for (const t of orphanTournaments) console.log(`  - ${t.name} (${t.id})`);

    const { error: updErr } = await supabase
      .from('tournaments')
      .update({ company_id: user.company_id })
      .is('company_id', null);

    if (updErr) console.error('Erro ao atualizar torneios:', updErr.message);
    else console.log(`  ✓ ${orphanTournaments.length} torneio(s) atualizado(s)`);
  }

  // 3. Jogadores órfãos (se a tabela tiver company_id)
  try {
    const { data: orphanPlayers } = await supabase
      .from('players')
      .select('id, full_name')
      .is('company_id', null);

    console.log(`\nJogadores órfãos encontrados: ${orphanPlayers?.length || 0}`);
    if (orphanPlayers && orphanPlayers.length > 0) {
      const { error: updErr } = await supabase
        .from('players')
        .update({ company_id: user.company_id })
        .is('company_id', null);
      if (updErr) console.error('Erro ao atualizar jogadores:', updErr.message);
      else console.log(`  ✓ ${orphanPlayers.length} jogador(es) atualizado(s)`);
    }
  } catch (err) {
    console.log('(tabela players não tem company_id — pulando)');
  }

  // 4. Patrocinadores órfãos
  try {
    const { data: orphanSponsors } = await supabase
      .from('sponsors')
      .select('id, name')
      .is('company_id', null);

    console.log(`\nPatrocinadores órfãos encontrados: ${orphanSponsors?.length || 0}`);
    if (orphanSponsors && orphanSponsors.length > 0) {
      const { error: updErr } = await supabase
        .from('sponsors')
        .update({ company_id: user.company_id })
        .is('company_id', null);
      if (updErr) console.error('Erro ao atualizar patrocinadores:', updErr.message);
      else console.log(`  ✓ ${orphanSponsors.length} patrocinador(es) atualizado(s)`);
    }
  } catch (err) {
    console.log('(tabela sponsors sem company_id — pulando)');
  }

  console.log('\nConcluído.');
}

main().catch(err => {
  console.error('Erro fatal:', err);
  process.exit(1);
});
