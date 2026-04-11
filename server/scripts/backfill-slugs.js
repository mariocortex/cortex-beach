// Backfill de slugs para torneios existentes.
// Uso (apos rodar a migration tournament_slug.sql):
//   cd server && node scripts/backfill-slugs.js

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('SUPABASE_URL e SUPABASE_KEY/SUPABASE_SECRET_KEY sao obrigatorios no .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

function slugify(str) {
  if (!str) return '';
  return str
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

async function uniqueSlug(base, excludeId) {
  let slug = base;
  let i = 2;
  while (true) {
    const { data } = await supabase
      .from('tournaments')
      .select('id')
      .eq('slug', slug)
      .neq('id', excludeId)
      .limit(1);
    if (!data || data.length === 0) return slug;
    slug = `${base}-${i++}`;
  }
}

async function main() {
  const { data: tournaments, error } = await supabase
    .from('tournaments')
    .select('id, name, slug')
    .is('slug', null);

  if (error) {
    console.error('Erro buscando torneios:', error.message);
    process.exit(1);
  }

  if (!tournaments || tournaments.length === 0) {
    console.log('Nenhum torneio sem slug. Nada a fazer.');
    return;
  }

  console.log(`Encontrados ${tournaments.length} torneios sem slug. Gerando...`);

  for (const t of tournaments) {
    const base = slugify(t.name) || 'torneio';
    const slug = await uniqueSlug(base, t.id);

    const { error: updateErr } = await supabase
      .from('tournaments')
      .update({ slug })
      .eq('id', t.id);

    if (updateErr) {
      console.error(`  [FALHA] ${t.name}: ${updateErr.message}`);
    } else {
      console.log(`  [OK]  ${t.name} -> ${slug}`);
    }
  }

  console.log('Backfill concluido.');
}

main().catch(err => {
  console.error('Erro fatal:', err);
  process.exit(1);
});
