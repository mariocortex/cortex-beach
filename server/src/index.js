import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: '../.env' });

const app = express();
const PORT = process.env.PORT || 5000;

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '..', 'uploads');
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

// Middleware
app.use(cors());
app.use(express.json());

// Serve uploaded files
app.use('/uploads', express.static(uploadsDir));

// Supabase initialization
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Helper: extract user from token
const getUserFromToken = async (token) => {
  if (!token) return null;
  const cleanToken = token.replace('Bearer ', '');
  const parts = cleanToken.split('-');
  if (parts.length < 2) return null;
  const userId = parts[1];

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
app.get('/api/tournaments/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('tournaments')
      .select('*')
      .eq('id', req.params.id)
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
    const organizerId = user?.id || '7a8757b5-3472-4b56-a760-bc3e52a891d5';

    const { data, error } = await supabase
      .from('tournaments')
      .insert([{
        organizer_id: organizerId,
        company_id: user?.company_id || null,
        name,
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

    console.log('Updating tournament', req.params.id, 'with data:', JSON.stringify(updateData, null, 2));

    const { data, error } = await supabase
      .from('tournaments')
      .update(updateData)
      .eq('id', req.params.id)
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

      const playerData = {
        full_name: name,
        email: email || null,
        phone: phone || null,
        company_id: tournament?.company_id || null
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

// Get matches
app.get('/api/tournaments/:id/matches', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('matches')
      .select('*')
      .eq('tournament_id', req.params.id)
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

// Get active sponsors (public - for display)
app.get('/api/tournaments/:id/sponsors/active', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('sponsors')
      .select('*')
      .eq('tournament_id', req.params.id)
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
});
