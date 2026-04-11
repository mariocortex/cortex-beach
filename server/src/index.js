import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import {
  createInstance,
  getQRCode,
  getInstanceStatus,
  deleteInstance as deleteEvoInstance,
  logoutInstance,
  sendTextMessage,
  applyTemplate
} from './evolution.js';
import { startWhatsappWorker } from './whatsapp-worker.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: '../.env' });

const app = express();
const PORT = process.env.PORT || 5001;

// Ensure uploads directory exists.
// Em produção (Easypanel) defina UPLOADS_DIR para um volume persistente.
const uploadsDir = process.env.UPLOADS_DIR || path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

// Multer config for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueName = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}${ext}`;
    cb(null, uniqueName);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB max
  fileFilter: (req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.mp4', '.webm', '.mov'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) cb(null, true);
    else cb(new Error('Tipo de arquivo não suportado'));
  }
});

// Middleware — CORS configurável via CORS_ORIGIN (aceita CSV de origens)
const corsOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5000,http://localhost:3000')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean);

app.use(cors({
  origin: (origin, cb) => {
    // Permite requests sem origin (ex: curl, mobile apps) ou origens listadas
    if (!origin || corsOrigins.includes('*') || corsOrigins.includes(origin)) {
      return cb(null, true);
    }
    return cb(new Error(`CORS bloqueado para origem: ${origin}`));
  },
  credentials: true
}));
app.use(express.json());

// Serve uploaded files
app.use('/uploads', express.static(uploadsDir));

// Supabase initialization
console.log('[env] SUPABASE_URL present?', !!process.env.SUPABASE_URL, 'len=', (process.env.SUPABASE_URL || '').length);
console.log('[env] SUPABASE_KEY present?', !!process.env.SUPABASE_KEY);
console.log('[env] keys starting with SUPA:', Object.keys(process.env).filter(k => k.toUpperCase().includes('SUPA')));
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_KEY) {
  console.error('[FATAL] SUPABASE_URL/SUPABASE_KEY ausentes no ambiente. Verifique Environment Variables do serviço no Easypanel e faça Redeploy.');
  process.exit(1);
}
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// ============================================
// Slug helpers (URL amigavel de torneio)
// ============================================
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function slugify(str) {
  if (!str) return '';
  return str
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')   // remove acentos
    .replace(/[^a-z0-9\s-]/g, '')      // remove caracteres especiais
    .trim()
    .replace(/\s+/g, '-')              // espacos -> hifen
    .replace(/-+/g, '-');              // colapsa hifens repetidos
}

async function generateUniqueSlug(name, excludeId = null) {
  const base = slugify(name) || 'torneio';
  let slug = base;
  let i = 2;
  while (true) {
    let q = supabase.from('tournaments').select('id').eq('slug', slug).limit(1);
    if (excludeId) q = q.neq('id', excludeId);
    const { data } = await q;
    if (!data || data.length === 0) return slug;
    slug = `${base}-${i++}`;
  }
}

// Resolve um parametro que pode ser UUID ou slug para o UUID real do torneio.
// Retorna null se nao encontrar. Faz lookup so quando nao e UUID.
async function resolveTournamentId(idOrSlug) {
  if (!idOrSlug) return null;
  if (UUID_RE.test(idOrSlug)) return idOrSlug;
  const { data } = await supabase
    .from('tournaments')
    .select('id')
    .eq('slug', idOrSlug)
    .single();
  return data?.id || null;
}

// Helper: enfileira mensagens de WhatsApp para os jogadores de um conjunto de
// partidas (por round). Usa o template da empresa.
// matches: array de match objects (já persistidos, com team_a_players/team_b_players)
// triggerType: 'next_match' | 'match_result'
async function enqueueMatchMessages(tournamentId, matches, triggerType) {
  if (!matches || matches.length === 0) return;
  try {
    const { data: tournament } = await supabase
      .from('tournaments')
      .select('id, name, company_id')
      .eq('id', tournamentId)
      .single();
    if (!tournament || !tournament.company_id) return;

    const { data: config } = await supabase
      .from('whatsapp_configs')
      .select('*')
      .eq('company_id', tournament.company_id)
      .single();
    if (!config) return;

    const flagField = triggerType === 'match_result' ? 'auto_match_result' : 'auto_next_match';
    const templateField = triggerType === 'match_result' ? 'template_match_result' : 'template_next_match';
    if (!config[flagField]) return;

    // Coleta todos os IDs de jogadores para um único fetch
    const playerIds = new Set();
    for (const m of matches) {
      for (const p of (m.team_a_players || [])) if (p.id) playerIds.add(p.id);
      for (const p of (m.team_b_players || [])) if (p.id) playerIds.add(p.id);
    }
    if (playerIds.size === 0) return;

    const { data: playersData } = await supabase
      .from('players')
      .select('id, full_name, phone')
      .in('id', Array.from(playerIds));
    const playerMap = new Map((playersData || []).map(p => [p.id, p]));

    // Busca categorias dos jogadores neste torneio (para template)
    const { data: inscriptions } = await supabase
      .from('tournament_players')
      .select('player_id, category')
      .eq('tournament_id', tournamentId)
      .in('player_id', Array.from(playerIds));
    const categoryMap = new Map((inscriptions || []).map(i => [i.player_id, i.category]));

    const rows = [];
    for (const m of matches) {
      const teamA = (m.team_a_players || []).map(p => p.name || playerMap.get(p.id)?.full_name).filter(Boolean);
      const teamB = (m.team_b_players || []).map(p => p.name || playerMap.get(p.id)?.full_name).filter(Boolean);
      const placar = `${m.score_a || 0} x ${m.score_b || 0}`;

      // Para cada jogador, monta adversários (time oposto)
      const sides = [
        { players: m.team_a_players || [], adversarios: teamB.join(' & ') },
        { players: m.team_b_players || [], adversarios: teamA.join(' & ') }
      ];

      for (const side of sides) {
        for (const p of side.players) {
          const full = playerMap.get(p.id);
          if (!full || !full.phone) continue;
          const msg = applyTemplate(config[templateField], {
            nome: full.full_name,
            torneio: tournament.name,
            categoria: categoryMap.get(p.id) || m.category || '',
            quadra: m.court || '',
            rodada: m.round || '',
            adversarios: side.adversarios,
            placar
          });
          rows.push({
            company_id: tournament.company_id,
            tournament_id: tournamentId,
            player_id: p.id,
            phone: full.phone,
            recipient_name: full.full_name,
            message: msg,
            status: 'pending',
            trigger_type: triggerType,
            match_id: m.id || null
          });
        }
      }
    }

    if (rows.length > 0) {
      await supabase.from('whatsapp_messages').insert(rows);
      console.log(`[whatsapp] ${rows.length} msgs enfileiradas (${triggerType})`);
    }
  } catch (err) {
    console.error('[whatsapp] enqueueMatchMessages error:', err.message);
  }
}

// Helper: extract user from token
// Token format: "token-{userId}-{timestamp}"
// userId is a UUID (contains hyphens), timestamp is the last segment (numeric).
const getUserFromToken = async (token) => {
  if (!token) return null;
  const cleanToken = token.replace('Bearer ', '').trim();
  if (!cleanToken.startsWith('token-')) return null;

  // Remove "token-" prefix, then strip the trailing "-{timestamp}"
  const rest = cleanToken.slice(6);
  const lastDash = rest.lastIndexOf('-');
  if (lastDash <= 0) return null;
  const userId = rest.slice(0, lastDash);
  if (!userId) return null;

  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();

  if (error || !data) return null;
  return data;
};

// ==================== AUTH ====================

// Login (validar com banco)
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    console.log('Login attempt:', { email, password });

    // Buscar usuário no banco
    const { data: users, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    console.log('Database query result:', { users, error });

    if (error || !users) {
      console.log('User not found');
      return res.status(401).json({ error: 'Email ou senha inválidos' });
    }

    // Validar senha (comparação simples - em produção usar bcrypt)
    console.log('Password comparison:', {
      received: password,
      stored: users.password_hash,
      match: users.password_hash === password
    });

    if (users.password_hash !== password) {
      console.log('Password mismatch');
      return res.status(401).json({ error: 'Email ou senha inválidos' });
    }

    // Get company info
    let company = null;
    if (users.company_id) {
      const { data: companyData } = await supabase
        .from('companies')
        .select('*')
        .eq('id', users.company_id)
        .single();
      company = companyData;
    }

    // Gerar token
    const token = 'token-' + users.id + '-' + Date.now();

    console.log('Login successful for:', email);

    res.json({
      user: {
        id: users.id,
        email: users.email,
        name: users.name,
        company_id: users.company_id,
        company: company
      },
      token: token
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Erro ao fazer login' });
  }
});

// Signup (create company + user)
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { company_name, name, email, password } = req.body;

    if (!company_name || !name || !email || !password) {
      return res.status(400).json({ error: 'Preencha todos os campos obrigatórios.' });
    }

    // Check if email already exists
    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (existing) {
      return res.status(400).json({ error: 'Este email já está cadastrado.' });
    }

    // 1. Create company
    const { data: company, error: compErr } = await supabase
      .from('companies')
      .insert([{ name: company_name }])
      .select()
      .single();

    if (compErr) throw compErr;

    // 2. Create user linked to company
    const { data: user, error: userErr } = await supabase
      .from('users')
      .insert([{
        name,
        email,
        password_hash: password,
        company_id: company.id,
        role: 'admin'
      }])
      .select()
      .single();

    if (userErr) throw userErr;

    const token = 'token-' + user.id + '-' + Date.now();

    res.status(201).json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        company_id: company.id,
        company: company
      },
      token
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== COMPANIES ====================

// Get current user's company
app.get('/api/company', async (req, res) => {
  try {
    const user = await getUserFromToken(req.headers.authorization);
    if (!user || !user.company_id) return res.status(404).json({ error: 'Empresa não encontrada' });

    const { data, error } = await supabase
      .from('companies')
      .select('*')
      .eq('id', user.company_id)
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update company
app.put('/api/company', async (req, res) => {
  try {
    const user = await getUserFromToken(req.headers.authorization);
    if (!user || !user.company_id) return res.status(404).json({ error: 'Empresa não encontrada' });

    const updateData = {};
    if (req.body.name !== undefined) updateData.name = req.body.name;
    if (req.body.cnpj !== undefined) updateData.cnpj = req.body.cnpj;
    if (req.body.phone !== undefined) updateData.phone = req.body.phone;
    if (req.body.email !== undefined) updateData.email = req.body.email;
    if (req.body.pix_key !== undefined) updateData.pix_key = req.body.pix_key;
    if (req.body.pix_type !== undefined) updateData.pix_type = req.body.pix_type;
    if (req.body.pix_name !== undefined) updateData.pix_name = req.body.pix_name;
    if (req.body.logo_url !== undefined) updateData.logo_url = req.body.logo_url;

    const { data, error } = await supabase
      .from('companies')
      .update(updateData)
      .eq('id', user.company_id)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get users of current company
app.get('/api/company/users', async (req, res) => {
  try {
    const user = await getUserFromToken(req.headers.authorization);
    if (!user || !user.company_id) return res.status(404).json({ error: 'Empresa não encontrada' });

    const { data, error } = await supabase
      .from('users')
      .select('id, name, email, role, created_at')
      .eq('company_id', user.company_id)
      .order('created_at');

    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add user to company
app.post('/api/company/users', async (req, res) => {
  try {
    const currentUser = await getUserFromToken(req.headers.authorization);
    if (!currentUser || !currentUser.company_id) return res.status(404).json({ error: 'Empresa não encontrada' });

    const { name, email, password, role } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Nome, email e senha são obrigatórios.' });
    }

    // Check if email already exists
    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (existing) {
      return res.status(400).json({ error: 'Este email já está cadastrado.' });
    }

    const { data, error } = await supabase
      .from('users')
      .insert([{
        name,
        email,
        password_hash: password,
        company_id: currentUser.company_id,
        role: role || 'user'
      }])
      .select('id, name, email, role, created_at')
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Remove user from company
app.delete('/api/company/users/:userId', async (req, res) => {
  try {
    const currentUser = await getUserFromToken(req.headers.authorization);
    if (!currentUser || !currentUser.company_id) return res.status(404).json({ error: 'Empresa não encontrada' });

    if (req.params.userId === currentUser.id) {
      return res.status(400).json({ error: 'Você não pode remover a si mesmo.' });
    }

    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', req.params.userId)
      .eq('company_id', currentUser.company_id);

    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get company by ID (public - for registration page)
app.get('/api/companies/:companyId', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('companies')
      .select('id, name, pix_key, pix_type, pix_name, logo_url')
      .eq('id', req.params.companyId)
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== TOURNAMENTS ====================

// Get all tournaments (filtered by user's company)
app.get('/api/tournaments', async (req, res) => {
  try {
    const user = await getUserFromToken(req.headers.authorization);

    let query = supabase
      .from('tournaments')
      .select('*')
      .order('created_at', { ascending: false });

    // Filter by company if user is logged in and has a company
    if (user?.company_id) {
      query = query.eq('company_id', user.company_id);
    }

    const { data, error } = await query;

    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single tournament (includes company info)
// Aceita UUID ou slug em :id
app.get('/api/tournaments/:id', async (req, res) => {
  try {
    const realId = await resolveTournamentId(req.params.id);
    if (!realId) return res.status(404).json({ error: 'Torneio não encontrado' });

    const { data, error } = await supabase
      .from('tournaments')
      .select('*')
      .eq('id', realId)
      .single();

    if (error) throw error;

    // Attach company info (for public pages like registration)
    if (data.company_id) {
      const { data: company } = await supabase
        .from('companies')
        .select('id, name, pix_key, pix_type, pix_name, logo_url')
        .eq('id', data.company_id)
        .single();
      data.company = company;
    }

    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create tournament
app.post('/api/tournaments', async (req, res) => {
  try {
    const { name, description, date, type, categories, scoring_rules, pricing, num_courts } = req.body;

    console.log('Creating tournament:', req.body);

    const user = await getUserFromToken(req.headers.authorization);
    if (!user) return res.status(401).json({ error: 'Não autenticado' });
    if (!user.company_id) return res.status(400).json({ error: 'Usuário não está vinculado a uma empresa' });

    const slug = await generateUniqueSlug(name);

    const { data, error } = await supabase
      .from('tournaments')
      .insert([{
        organizer_id: user.id,
        company_id: user.company_id,
        name,
        slug,
        description: description || null,
        start_date: date,
        type: type || 'super_oito',
        categories: Array.isArray(categories) ? categories : [],
        scoring_rules: scoring_rules || { total_points: 6 },
        pricing: pricing || { first_registration: 0, additional_registration: 0 },
        num_courts: num_courts || 2,
        status: 'draft'
      }])
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
      throw error;
    }

    console.log('Tournament created:', data);
    res.status(201).json(data);
  } catch (error) {
    console.error('Create tournament error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update tournament
app.put('/api/tournaments/:id', async (req, res) => {
  try {
    const updateData = {};

    if (req.body.name !== undefined) updateData.name = req.body.name;
    if (req.body.start_date !== undefined) updateData.start_date = req.body.start_date;
    if (req.body.date !== undefined) updateData.start_date = req.body.date;
    if (req.body.type !== undefined) updateData.type = req.body.type;
    if (Array.isArray(req.body.categories)) updateData.categories = req.body.categories;
    if (req.body.scoring_rules !== undefined) updateData.scoring_rules = req.body.scoring_rules;
    if (req.body.description !== undefined) updateData.description = req.body.description;
    if (req.body.pricing !== undefined) updateData.pricing = req.body.pricing;
    if (req.body.num_courts !== undefined) updateData.num_courts = req.body.num_courts;
    if (req.body.category_display_time !== undefined) updateData.category_display_time = req.body.category_display_time;
    if (req.body.status !== undefined) updateData.status = req.body.status;

    const realId = await resolveTournamentId(req.params.id);
    if (!realId) return res.status(404).json({ error: 'Torneio não encontrado' });

    // Busca status atual para aplicar guarda de campos travados
    const { data: current } = await supabase
      .from('tournaments')
      .select('status')
      .eq('id', realId)
      .single();

    // Torneio ativo: remove campos que afetariam partidas/ranking
    if (current?.status === 'active') {
      const LOCKED_WHEN_ACTIVE = ['type', 'categories', 'scoring_rules'];
      for (const f of LOCKED_WHEN_ACTIVE) {
        if (updateData[f] !== undefined) {
          console.log(`[tournament update] ignorando campo travado "${f}" (torneio ativo)`);
          delete updateData[f];
        }
      }
    }

    // Slug editavel: sanitiza e garante unicidade
    if (req.body.slug !== undefined) {
      const cleaned = slugify(req.body.slug);
      if (!cleaned) return res.status(400).json({ error: 'Slug invalido (use letras, numeros e hifens)' });
      const unique = await generateUniqueSlug(cleaned, realId);
      updateData.slug = unique;
    }

    console.log('Updating tournament', realId, 'with data:', JSON.stringify(updateData, null, 2));

    const { data, error } = await supabase
      .from('tournaments')
      .update(updateData)
      .eq('id', realId)
      .select()
      .single();

    if (error) {
      console.error('Supabase error:', error);
      throw error;
    }

    console.log('Tournament updated successfully:', JSON.stringify(data, null, 2));
    res.json(data);
  } catch (error) {
    console.error('Update tournament error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== PLAYERS ====================

// Get all players (filtered by company)
app.get('/api/players', async (req, res) => {
  try {
    const user = await getUserFromToken(req.headers.authorization);

    let query = supabase
      .from('players')
      .select('*')
      .order('full_name');

    if (user?.company_id) {
      query = query.eq('company_id', user.company_id);
    }

    const { data: players, error } = await query;

    if (error) throw error;

    // Count tournaments per player
    const { data: counts } = await supabase
      .from('tournament_players')
      .select('player_id');

    const countMap = {};
    if (counts) {
      counts.forEach(c => {
        countMap[c.player_id] = (countMap[c.player_id] || 0) + 1;
      });
    }

    const result = players.map(p => ({
      ...p,
      name: p.full_name,
      tournaments_count: countMap[p.id] || 0
    }));

    res.json(result);
  } catch (error) {
    console.error('Get all players error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get players by tournament (join tournament_players + players)
app.get('/api/tournaments/:id/players', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('tournament_players')
      .select('*, players(id, full_name, email, phone, birth_date)')
      .eq('tournament_id', req.params.id)
      .order('created_at');

    if (error) throw error;

    // Flatten for frontend
    const players = data.map(tp => ({
      id: tp.id,
      player_id: tp.players.id,
      name: tp.players.full_name,
      email: tp.players.email,
      phone: tp.players.phone,
      birth_date: tp.players.birth_date,
      category: tp.category,
      level: tp.level,
      payment_status: tp.payment_status,
      created_at: tp.created_at
    }));

    res.json(players);
  } catch (error) {
    console.error('Players error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Add player to tournament (creates global player if needed, then inscribes)
app.post('/api/tournaments/:id/players', async (req, res) => {
  try {
    const { name, email, phone, level, category, birth_date } = req.body;

    // 1. Check if player already exists by email or phone
    let player = null;
    if (email) {
      const { data } = await supabase
        .from('players')
        .select('*')
        .eq('email', email)
        .single();
      player = data;
    }
    if (!player && phone) {
      const { data } = await supabase
        .from('players')
        .select('*')
        .eq('phone', phone)
        .single();
      player = data;
    }

    // 2. Create player if not found
    if (!player) {
      // Get company_id from tournament
      const { data: tournament } = await supabase
        .from('tournaments')
        .select('company_id')
        .eq('id', req.params.id)
        .single();

      if (!tournament?.company_id) {
        return res.status(400).json({ error: 'Torneio sem empresa associada — contate o administrador' });
      }

      const playerData = {
        full_name: name,
        email: email || null,
        phone: phone || null,
        company_id: tournament.company_id
      };
      if (birth_date) playerData.birth_date = birth_date;

      const { data, error } = await supabase
        .from('players')
        .insert([playerData])
        .select()
        .single();

      if (error) throw error;
      player = data;
    }

    // 3. Create tournament inscription
    const { data: inscription, error: inscError } = await supabase
      .from('tournament_players')
      .insert([{
        tournament_id: req.params.id,
        player_id: player.id,
        category,
        level,
        payment_status: 'pending'
      }])
      .select()
      .single();

    if (inscError) throw inscError;

    res.status(201).json({
      id: inscription.id,
      player_id: player.id,
      name: player.full_name,
      email: player.email,
      phone: player.phone,
      birth_date: player.birth_date,
      category: inscription.category,
      level: inscription.level,
      payment_status: inscription.payment_status
    });
  } catch (error) {
    console.error('Add player error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update tournament inscription (payment, category, level)
app.put('/api/tournaments/:id/players/:inscriptionId', async (req, res) => {
  try {
    const updateData = {};
    if (req.body.payment_status !== undefined) updateData.payment_status = req.body.payment_status;
    if (req.body.level !== undefined) updateData.level = req.body.level;
    if (req.body.category !== undefined) updateData.category = req.body.category;

    const { data, error } = await supabase
      .from('tournament_players')
      .update(updateData)
      .eq('id', req.params.inscriptionId)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Remove player from tournament
app.delete('/api/tournaments/:id/players/:inscriptionId', async (req, res) => {
  try {
    const { error } = await supabase
      .from('tournament_players')
      .delete()
      .eq('id', req.params.inscriptionId);

    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update player global data
app.put('/api/players/:playerId', async (req, res) => {
  try {
    const updateData = {};
    if (req.body.full_name !== undefined) updateData.full_name = req.body.full_name;
    if (req.body.email !== undefined) updateData.email = req.body.email;
    if (req.body.phone !== undefined) updateData.phone = req.body.phone;
    if (req.body.birth_date !== undefined) updateData.birth_date = req.body.birth_date || null;

    const { data, error } = await supabase
      .from('players')
      .update(updateData)
      .eq('id', req.params.playerId)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('Update player error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Search players (for autocomplete when inscribing)
app.get('/api/players/search', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.length < 2) return res.json([]);

    const { data, error } = await supabase
      .from('players')
      .select('*')
      .ilike('full_name', `%${q}%`)
      .limit(10);

    if (error) throw error;
    res.json(data.map(p => ({ ...p, name: p.full_name })));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get player stats
app.get('/api/players/:playerId/stats', async (req, res) => {
  try {
    // Get all tournament inscriptions
    const { data: inscriptions, error: inscErr } = await supabase
      .from('tournament_players')
      .select('*, tournaments(name, start_date)')
      .eq('player_id', req.params.playerId);

    if (inscErr) throw inscErr;

    // Get player info
    const { data: player, error: playerErr } = await supabase
      .from('players')
      .select('*')
      .eq('id', req.params.playerId)
      .single();

    if (playerErr) throw playerErr;

    // TODO: calculate match stats when matches are recorded
    res.json({
      player: { ...player, name: player.full_name },
      tournaments_played: inscriptions.length,
      tournaments: inscriptions,
      stats: {
        matches_played: 0,
        wins: 0,
        draws: 0,
        losses: 0,
        total_points: 0
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== MATCHES ====================

// Get matches — aceita UUID ou slug (rota publica)
app.get('/api/tournaments/:id/matches', async (req, res) => {
  try {
    const realId = await resolveTournamentId(req.params.id);
    if (!realId) return res.status(404).json({ error: 'Torneio não encontrado' });

    const { data, error } = await supabase
      .from('matches')
      .select('*')
      .eq('tournament_id', realId)
      .order('round', { ascending: true });

    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Generate round (Super Oito - duplas rotativas)
// Generate ALL matches for a tournament (all rounds at once)
app.post('/api/tournaments/:id/generate-all-matches', async (req, res) => {
  try {
    // Get tournament info
    const { data: tournament, error: tErr } = await supabase
      .from('tournaments')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (tErr) throw tErr;

    const numCourts = tournament.num_courts || 2;
    const categories = tournament.categories || [];
    const allMatches = [];

    for (const cat of categories) {
      // Get players for this category
      const { data: inscriptions, error: inscErr } = await supabase
        .from('tournament_players')
        .select('*, players(id, full_name)')
        .eq('tournament_id', req.params.id)
        .eq('category', cat.name);

      if (inscErr) throw inscErr;

      const players = inscriptions.map(i => ({
        id: i.players.id,
        name: i.players.full_name
      }));

      if (players.length < 4) continue;

      // Generate all possible pair combinations
      const allPairs = [];
      for (let i = 0; i < players.length; i++) {
        for (let j = i + 1; j < players.length; j++) {
          allPairs.push([players[i], players[j]]);
        }
      }

      // Generate all possible match-ups (pair vs pair, no player overlap)
      const allMatchups = [];
      for (let i = 0; i < allPairs.length; i++) {
        for (let j = i + 1; j < allPairs.length; j++) {
          const pairA = allPairs[i];
          const pairB = allPairs[j];
          // No player can be in both teams
          const idsA = pairA.map(p => p.id);
          const idsB = pairB.map(p => p.id);
          if (!idsA.some(id => idsB.includes(id))) {
            allMatchups.push({ teamA: pairA, teamB: pairB });
          }
        }
      }

      // Shuffle matchups
      const shuffled = [...allMatchups].sort(() => Math.random() - 0.5);

      // Distribute matchups into rounds
      // Each round: up to numCourts matches, no player appears twice in same round
      const usedMatchups = new Set();
      let round = 1;

      while (usedMatchups.size < shuffled.length) {
        const roundMatches = [];
        const roundPlayerIds = new Set();

        for (let i = 0; i < shuffled.length; i++) {
          if (usedMatchups.has(i)) continue;
          if (roundMatches.length >= numCourts) break;

          const matchup = shuffled[i];
          const allIds = [
            ...matchup.teamA.map(p => p.id),
            ...matchup.teamB.map(p => p.id)
          ];

          // Check no player is already in this round
          if (allIds.some(id => roundPlayerIds.has(id))) continue;

          // Add to round
          allIds.forEach(id => roundPlayerIds.add(id));
          usedMatchups.add(i);
          roundMatches.push({
            tournament_id: req.params.id,
            team_a_players: matchup.teamA,
            team_b_players: matchup.teamB,
            score_a: 0,
            score_b: 0,
            round: round,
            category: cat.name,
            court: `${roundMatches.length + 1}`,
            status: 'pending'
          });
        }

        if (roundMatches.length === 0) break; // safety: no more matchups possible
        allMatches.push(...roundMatches);
        round++;
      }
    }

    if (allMatches.length === 0) {
      return res.status(400).json({ error: 'Não foi possível gerar partidas. Verifique se há pelo menos 4 jogadores inscritos por categoria.' });
    }

    // Delete any existing matches for this tournament
    await supabase
      .from('matches')
      .delete()
      .eq('tournament_id', req.params.id);

    const { data, error } = await supabase
      .from('matches')
      .insert(allMatches)
      .select();

    if (error) throw error;

    console.log(`Generated ${data.length} total matches for tournament ${req.params.id}`);

    // WhatsApp: avisa os jogadores da rodada 1 (assíncrono, não bloqueia a resposta)
    const firstRoundMatches = data.filter(m => m.round === 1);
    enqueueMatchMessages(req.params.id, firstRoundMatches, 'next_match').catch(() => {});

    res.status(201).json(data);
  } catch (error) {
    console.error('Generate all matches error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update match players (swap players)
app.put('/api/tournaments/:id/matches/:matchId/players', async (req, res) => {
  try {
    const { team_a_players, team_b_players } = req.body;
    const updateData = {};
    if (team_a_players) updateData.team_a_players = team_a_players;
    if (team_b_players) updateData.team_b_players = team_b_players;

    const { data, error } = await supabase
      .from('matches')
      .update(updateData)
      .eq('id', req.params.matchId)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update match result
app.put('/api/tournaments/:id/matches/:matchId', async (req, res) => {
  try {
    const updateData = {};
    if (req.body.score_a !== undefined) updateData.score_a = req.body.score_a;
    if (req.body.score_b !== undefined) updateData.score_b = req.body.score_b;
    if (req.body.status !== undefined) updateData.status = req.body.status;
    if (req.body.score_a !== undefined && req.body.score_b !== undefined) {
      updateData.winner = req.body.score_a > req.body.score_b ? 'team_a' :
                          req.body.score_b > req.body.score_a ? 'team_b' : 'draw';
    }

    const { data, error } = await supabase
      .from('matches')
      .update(updateData)
      .eq('id', req.params.matchId)
      .select()
      .single();

    if (error) throw error;

    // WhatsApp: se o resultado foi gravado (status=completed), dispara notificações
    if (data && data.status === 'completed') {
      // 1. Notifica os 4 jogadores da partida concluída com o placar
      enqueueMatchMessages(req.params.id, [data], 'match_result').catch(() => {});

      // 2. Se todos os jogos da rodada atual estão completos, avisa jogadores
      // da próxima rodada.
      try {
        const { data: roundMatches } = await supabase
          .from('matches')
          .select('*')
          .eq('tournament_id', req.params.id)
          .eq('round', data.round);
        const allDone = roundMatches && roundMatches.every(m => m.status === 'completed');
        if (allDone) {
          const nextRound = (data.round || 0) + 1;
          const { data: nextMatches } = await supabase
            .from('matches')
            .select('*')
            .eq('tournament_id', req.params.id)
            .eq('round', nextRound)
            .eq('status', 'pending');
          if (nextMatches && nextMatches.length > 0) {
            enqueueMatchMessages(req.params.id, nextMatches, 'next_match').catch(() => {});
          }
        }
      } catch (err) { /* silencioso */ }
    }

    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== RANKINGS ====================

// Get rankings
app.get('/api/tournaments/:id/rankings', async (req, res) => {
  try {
    const { category } = req.query;

    let query = supabase
      .from('rankings')
      .select('*')
      .eq('tournament_id', req.params.id);

    if (category) {
      query = query.eq('category', category);
    }

    const { data, error } = await query.order('points', { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== SPONSORS ====================

// Get all sponsors (global list, distinct by name, for autocomplete/listing)
app.get('/api/sponsors', async (req, res) => {
  try {
    const user = await getUserFromToken(req.headers.authorization);

    const { data, error } = await supabase
      .from('sponsors')
      .select('*')
      .order('name');

    if (error) throw error;

    // Group by name, keep the most recent entry per sponsor name
    const byName = {};
    data.forEach(s => {
      if (!byName[s.name] || new Date(s.created_at) > new Date(byName[s.name].created_at)) {
        byName[s.name] = s;
      }
    });

    // Count tournaments per sponsor
    const nameCount = {};
    data.forEach(s => {
      nameCount[s.name] = (nameCount[s.name] || 0) + 1;
    });

    const result = Object.values(byName).map(s => ({
      ...s,
      tournaments_count: nameCount[s.name] || 0
    }));

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Search sponsors by name (for autocomplete)
app.get('/api/sponsors/search', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.length < 2) return res.json([]);

    const { data, error } = await supabase
      .from('sponsors')
      .select('*')
      .ilike('name', `%${q}%`)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) throw error;

    // Deduplicate by name, keep most recent
    const byName = {};
    data.forEach(s => {
      if (!byName[s.name]) byName[s.name] = s;
    });

    res.json(Object.values(byName));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get sponsors for a tournament
app.get('/api/tournaments/:id/sponsors', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('sponsors')
      .select('*')
      .eq('tournament_id', req.params.id)
      .order('created_at');

    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get active sponsors (public - for display) — aceita UUID ou slug
app.get('/api/tournaments/:id/sponsors/active', async (req, res) => {
  try {
    const realId = await resolveTournamentId(req.params.id);
    if (!realId) return res.status(404).json({ error: 'Torneio não encontrado' });

    const { data, error } = await supabase
      .from('sponsors')
      .select('*')
      .eq('tournament_id', realId)
      .eq('is_active', true)
      .order('created_at');

    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add sponsor
app.post('/api/tournaments/:id/sponsors', async (req, res) => {
  try {
    const { name, type, value, media_url, media_type, description, display_time, media_urls, slide_time } = req.body;

    // Set media_url from first media_urls item for backward compat
    const finalMediaUrls = media_urls && media_urls.length > 0 ? media_urls : null;
    const finalMediaUrl = finalMediaUrls ? finalMediaUrls[0].url : (media_url || null);
    const finalMediaType = finalMediaUrls ? finalMediaUrls[0].type : (media_type || 'image');

    const insertData = {
      tournament_id: req.params.id,
      name,
      type: type || 'money',
      value: value || 0,
      description: description || null,
      media_url: finalMediaUrl,
      media_type: finalMediaType,
      display_time: display_time || 10,
      slide_time: slide_time || 5,
      is_active: true
    };
    if (finalMediaUrls) insertData.media_urls = finalMediaUrls;

    const { data, error } = await supabase
      .from('sponsors')
      .insert([insertData])
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update sponsor
app.put('/api/tournaments/:id/sponsors/:sponsorId', async (req, res) => {
  try {
    const updateData = {};
    if (req.body.name !== undefined) updateData.name = req.body.name;
    if (req.body.type !== undefined) updateData.type = req.body.type;
    if (req.body.value !== undefined) updateData.value = req.body.value;
    if (req.body.description !== undefined) updateData.description = req.body.description;
    if (req.body.media_url !== undefined) updateData.media_url = req.body.media_url;
    if (req.body.media_type !== undefined) updateData.media_type = req.body.media_type;
    if (req.body.is_active !== undefined) updateData.is_active = req.body.is_active;
    if (req.body.payment_status !== undefined) updateData.payment_status = req.body.payment_status;
    if (req.body.display_time !== undefined) updateData.display_time = req.body.display_time;
    if (req.body.slide_time !== undefined) updateData.slide_time = req.body.slide_time;
    if (req.body.media_urls !== undefined) {
      updateData.media_urls = req.body.media_urls;
      // Sync media_url with first item for backward compat
      if (req.body.media_urls.length > 0) {
        updateData.media_url = req.body.media_urls[0].url;
        updateData.media_type = req.body.media_urls[0].type;
      }
    }

    const { data, error } = await supabase
      .from('sponsors')
      .update(updateData)
      .eq('id', req.params.sponsorId)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete sponsor
app.delete('/api/tournaments/:id/sponsors/:sponsorId', async (req, res) => {
  try {
    const { error } = await supabase
      .from('sponsors')
      .delete()
      .eq('id', req.params.sponsorId);

    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== WHATSAPP / EVOLUTION API ====================

// Helper: carrega config do WhatsApp da empresa do usuário autenticado.
async function getWhatsappConfig(user) {
  if (!user || !user.company_id) return null;
  const { data } = await supabase
    .from('whatsapp_configs')
    .select('*')
    .eq('company_id', user.company_id)
    .single();
  return data;
}

// GET config da empresa (cria vazia se não existir)
app.get('/api/whatsapp/config', async (req, res) => {
  try {
    const user = await getUserFromToken(req.headers.authorization);
    if (!user || !user.company_id) return res.status(401).json({ error: 'Não autorizado' });

    let config = await getWhatsappConfig(user);
    if (!config) {
      const { data, error } = await supabase
        .from('whatsapp_configs')
        .insert({ company_id: user.company_id })
        .select()
        .single();
      if (error) throw error;
      config = data;
    }
    // Nunca retornar api_key em texto completo — mostra só os últimos 4 dígitos
    const safeConfig = { ...config };
    if (safeConfig.api_key) safeConfig.api_key_masked = `••••${safeConfig.api_key.slice(-4)}`;
    res.json(safeConfig);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST config (salva URL + api_key + instance_name)
app.post('/api/whatsapp/config', async (req, res) => {
  try {
    const user = await getUserFromToken(req.headers.authorization);
    if (!user || !user.company_id) return res.status(401).json({ error: 'Não autorizado' });

    const { api_url, api_key, instance_name } = req.body;
    const updateData = {};
    if (api_url !== undefined) updateData.api_url = api_url;
    if (api_key !== undefined && api_key !== '') updateData.api_key = api_key;
    if (instance_name !== undefined) updateData.instance_name = instance_name;

    // upsert por company_id
    const existing = await getWhatsappConfig(user);
    let result;
    if (existing) {
      const { data, error } = await supabase
        .from('whatsapp_configs')
        .update(updateData)
        .eq('company_id', user.company_id)
        .select()
        .single();
      if (error) throw error;
      result = data;
    } else {
      const { data, error } = await supabase
        .from('whatsapp_configs')
        .insert({ company_id: user.company_id, ...updateData })
        .select()
        .single();
      if (error) throw error;
      result = data;
    }

    const safe = { ...result };
    if (safe.api_key) safe.api_key_masked = `••••${safe.api_key.slice(-4)}`;
    res.json(safe);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST cria instância na Evolution API (primeira conexão)
app.post('/api/whatsapp/instance/create', async (req, res) => {
  try {
    const user = await getUserFromToken(req.headers.authorization);
    if (!user || !user.company_id) return res.status(401).json({ error: 'Não autorizado' });

    const config = await getWhatsappConfig(user);
    if (!config || !config.api_url || !config.instance_name) {
      return res.status(400).json({ error: 'Configure URL e nome da instância primeiro' });
    }

    let result;
    try {
      result = await createInstance(config, config.instance_name);
    } catch (err) {
      // Se já existir, tenta só conectar/pegar QR
      if (err.status === 403 || err.status === 409 || /already|exists/i.test(err.message)) {
        result = await getQRCode(config);
      } else {
        throw err;
      }
    }

    // Evolution retorna qrcode em diferentes formatos dependendo da versão
    const qrBase64 = result?.qrcode?.base64 || result?.base64 || result?.qrcode || null;
    const pairingCode = result?.qrcode?.pairingCode || result?.pairingCode || null;

    await supabase
      .from('whatsapp_configs')
      .update({
        connection_status: 'connecting',
        last_qr_code: typeof qrBase64 === 'string' ? qrBase64 : null
      })
      .eq('company_id', user.company_id);

    res.json({
      success: true,
      qrcode: qrBase64,
      pairingCode,
      raw: result
    });
  } catch (error) {
    console.error('[whatsapp] create instance error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// GET busca QR code atual
app.get('/api/whatsapp/instance/qrcode', async (req, res) => {
  try {
    const user = await getUserFromToken(req.headers.authorization);
    if (!user || !user.company_id) return res.status(401).json({ error: 'Não autorizado' });

    const config = await getWhatsappConfig(user);
    if (!config) return res.status(404).json({ error: 'Configuração não encontrada' });

    const result = await getQRCode(config);
    const qrBase64 = result?.qrcode?.base64 || result?.base64 || result?.qrcode || null;
    const pairingCode = result?.qrcode?.pairingCode || result?.pairingCode || null;

    if (qrBase64) {
      await supabase
        .from('whatsapp_configs')
        .update({ last_qr_code: typeof qrBase64 === 'string' ? qrBase64 : null })
        .eq('company_id', user.company_id);
    }

    res.json({ qrcode: qrBase64, pairingCode });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET estado da conexão
app.get('/api/whatsapp/instance/status', async (req, res) => {
  try {
    const user = await getUserFromToken(req.headers.authorization);
    if (!user || !user.company_id) return res.status(401).json({ error: 'Não autorizado' });

    const config = await getWhatsappConfig(user);
    if (!config) return res.json({ connection_status: 'disconnected' });
    if (!config.api_url || !config.instance_name) {
      return res.json({ connection_status: config.connection_status || 'disconnected' });
    }

    let newStatus = config.connection_status || 'disconnected';
    let phoneNumber = config.phone_number;
    try {
      const result = await getInstanceStatus(config);
      const state = result?.instance?.state || result?.state;
      if (state === 'open') newStatus = 'connected';
      else if (state === 'connecting') newStatus = 'connecting';
      else if (state === 'close') newStatus = 'disconnected';
      phoneNumber = result?.instance?.wuid || result?.instance?.ownerJid || phoneNumber;
    } catch (err) {
      // mantém status anterior mas loga
      console.error('[whatsapp] status check error:', err.message);
    }

    await supabase
      .from('whatsapp_configs')
      .update({
        connection_status: newStatus,
        phone_number: phoneNumber,
        last_status_check: new Date().toISOString()
      })
      .eq('company_id', user.company_id);

    res.json({ connection_status: newStatus, phone_number: phoneNumber });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE desconectar + remover instância
app.delete('/api/whatsapp/instance', async (req, res) => {
  try {
    const user = await getUserFromToken(req.headers.authorization);
    if (!user || !user.company_id) return res.status(401).json({ error: 'Não autorizado' });

    const config = await getWhatsappConfig(user);
    if (!config) return res.status(404).json({ error: 'Configuração não encontrada' });

    try {
      await logoutInstance(config);
    } catch (err) { /* ignore */ }
    try {
      await deleteEvoInstance(config);
    } catch (err) { /* ignore */ }

    await supabase
      .from('whatsapp_configs')
      .update({
        connection_status: 'disconnected',
        phone_number: null,
        last_qr_code: null
      })
      .eq('company_id', user.company_id);

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT atualiza flags de automação e templates
app.put('/api/whatsapp/automations', async (req, res) => {
  try {
    const user = await getUserFromToken(req.headers.authorization);
    if (!user || !user.company_id) return res.status(401).json({ error: 'Não autorizado' });

    const updateData = {};
    const fields = [
      'auto_next_match', 'auto_match_result', 'auto_tournament_start',
      'template_next_match', 'template_match_result', 'template_tournament_start'
    ];
    for (const f of fields) {
      if (req.body[f] !== undefined) updateData[f] = req.body[f];
    }

    const { data, error } = await supabase
      .from('whatsapp_configs')
      .update(updateData)
      .eq('company_id', user.company_id)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST envio manual (aceita array de destinatários)
// body: { recipients: [{phone, name, player_id?}], message, tournament_id? }
app.post('/api/whatsapp/send', async (req, res) => {
  try {
    const user = await getUserFromToken(req.headers.authorization);
    if (!user || !user.company_id) return res.status(401).json({ error: 'Não autorizado' });

    const { recipients, message, tournament_id } = req.body;
    if (!Array.isArray(recipients) || recipients.length === 0) {
      return res.status(400).json({ error: 'Informe pelo menos um destinatário' });
    }
    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Mensagem vazia' });
    }

    const rows = recipients
      .filter(r => r && r.phone)
      .map(r => ({
        company_id: user.company_id,
        tournament_id: tournament_id || null,
        player_id: r.player_id || null,
        phone: r.phone,
        recipient_name: r.name || null,
        message: applyTemplate(message, {
          nome: r.name || '',
          torneio: r.tournament || '',
          categoria: r.category || ''
        }),
        status: 'pending',
        trigger_type: 'manual'
      }));

    if (rows.length === 0) return res.status(400).json({ error: 'Nenhum telefone válido' });

    const { data, error } = await supabase
      .from('whatsapp_messages')
      .insert(rows)
      .select();

    if (error) throw error;
    res.json({ success: true, queued: data.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST agendar mensagem (mesmo body do /send + scheduled_for)
app.post('/api/whatsapp/schedule', async (req, res) => {
  try {
    const user = await getUserFromToken(req.headers.authorization);
    if (!user || !user.company_id) return res.status(401).json({ error: 'Não autorizado' });

    const { recipients, message, tournament_id, scheduled_for } = req.body;
    if (!scheduled_for) return res.status(400).json({ error: 'scheduled_for obrigatório' });
    if (!Array.isArray(recipients) || recipients.length === 0) {
      return res.status(400).json({ error: 'Informe pelo menos um destinatário' });
    }
    if (!message || !message.trim()) return res.status(400).json({ error: 'Mensagem vazia' });

    const rows = recipients
      .filter(r => r && r.phone)
      .map(r => ({
        company_id: user.company_id,
        tournament_id: tournament_id || null,
        player_id: r.player_id || null,
        phone: r.phone,
        recipient_name: r.name || null,
        message: applyTemplate(message, { nome: r.name || '', torneio: r.tournament || '', categoria: r.category || '' }),
        status: 'scheduled',
        scheduled_for,
        trigger_type: 'scheduled'
      }));

    if (rows.length === 0) return res.status(400).json({ error: 'Nenhum telefone válido' });

    const { data, error } = await supabase
      .from('whatsapp_messages')
      .insert(rows)
      .select();

    if (error) throw error;
    res.json({ success: true, scheduled: data.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET histórico de mensagens
app.get('/api/whatsapp/messages', async (req, res) => {
  try {
    const user = await getUserFromToken(req.headers.authorization);
    if (!user || !user.company_id) return res.status(401).json({ error: 'Não autorizado' });

    const { status, tournament_id, limit = 100 } = req.query;
    let query = supabase
      .from('whatsapp_messages')
      .select('*')
      .eq('company_id', user.company_id)
      .order('created_at', { ascending: false })
      .limit(parseInt(limit, 10));

    if (status) query = query.eq('status', status);
    if (tournament_id) query = query.eq('tournament_id', tournament_id);

    const { data, error } = await query;
    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE mensagem (cancelar agendada)
app.delete('/api/whatsapp/messages/:id', async (req, res) => {
  try {
    const user = await getUserFromToken(req.headers.authorization);
    if (!user || !user.company_id) return res.status(401).json({ error: 'Não autorizado' });

    const { error } = await supabase
      .from('whatsapp_messages')
      .delete()
      .eq('id', req.params.id)
      .eq('company_id', user.company_id);

    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// File upload endpoint
app.post('/api/upload', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Nenhum arquivo enviado' });
  const videoExts = ['.mp4', '.webm', '.mov'];
  const ext = path.extname(req.file.filename).toLowerCase();
  const media_type = videoExts.includes(ext) ? 'video' : 'image';
  const media_url = `http://localhost:${PORT}/uploads/${req.file.filename}`;
  res.json({ media_url, media_type, filename: req.file.filename });
});

// Start server
app.listen(PORT, () => {
  console.log(`✅ Córtex Beach API running on http://localhost:${PORT}`);
  startWhatsappWorker(supabase);
});
