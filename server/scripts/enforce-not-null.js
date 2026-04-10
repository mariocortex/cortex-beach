// ============================================
// Enforce NOT NULL constraints on company_id
// ============================================
// Garante que tournaments.company_id e players.company_id
// nunca mais possam ser gravados como NULL.
//
// A Supabase JS SDK não executa DDL — este script usa o endpoint
// REST PostgREST + RPC "exec_sql" (se existir) ou apenas VERIFICA
// o estado atual. Para aplicar as constraints, rode o SQL manualmente
// no Supabase SQL Editor (o script imprime o SQL necessário).

import { config as dotenvConfig } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenvConfig({ path: path.resolve(__dirname, '../../.env') });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY
);

async function checkNulls(table) {
  const { data, error, count } = await supabase
    .from(table)
    .select('id', { count: 'exact', head: true })
    .is('company_id', null);
  if (error) {
    console.log(`  ${table}: ERRO - ${error.message}`);
    return -1;
  }
  return count || 0;
}

const tables = ['tournaments', 'players', 'sponsors'];
console.log('Verificando registros com company_id NULL:\n');

for (const t of tables) {
  const n = await checkNulls(t);
  if (n === -1) continue;
  console.log(`  ${t}: ${n} registro(s) com company_id = NULL`);
}

console.log('\n---');
console.log('Para aplicar NOT NULL no banco, rode este SQL no Supabase SQL Editor:\n');
console.log(`ALTER TABLE tournaments ALTER COLUMN company_id SET NOT NULL;`);
console.log(`ALTER TABLE players ALTER COLUMN company_id SET NOT NULL;`);
console.log(`\n(sponsors não tem company_id, é linkado via tournament_id)`);
