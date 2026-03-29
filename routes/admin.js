const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db/database');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { settleMatch, resettleMatch } = require('../services/settlement');

const router = express.Router();

router.use(requireAuth, requireAdmin);

// --- Users ---

router.get('/users', (req, res) => {
  const users = db.prepare('SELECT id, name, phone, email, is_admin, created_at FROM users ORDER BY name').all();
  res.json(users.map(u => ({ ...u, is_admin: u.is_admin === 1 })));
});

router.post('/users', (req, res) => {
  const { name, phone, email, password } = req.body;
  if (!name || !phone || !password) {
    return res.status(400).json({ error: 'Name, phone and password required' });
  }

  const existing = db.prepare('SELECT id FROM users WHERE phone = ?').get(phone);
  if (existing) return res.status(400).json({ error: 'Phone number already registered' });

  const hash = bcrypt.hashSync(password, 10);
  const result = db.prepare(
    'INSERT INTO users (name, phone, email, password_hash) VALUES (?, ?, ?, ?)'
  ).run(name, phone, email || '', hash);

  const newUserId = result.lastInsertRowid;

  const settledMatches = db.prepare(
    "SELECT id FROM matches WHERE is_completed = 1 AND result != 'abandoned'"
  ).all();

  let resettledCount = 0;
  for (const m of settledMatches) {
    try {
      resettleMatch(m.id);
      resettledCount++;
    } catch (e) { /* skip if resettle fails */ }
  }

  res.json({ ok: true, id: newUserId, resettled_matches: resettledCount });
});

router.delete('/users/:id', (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  if (user.is_admin) return res.status(400).json({ error: 'Cannot delete admin' });

  db.prepare('DELETE FROM bets WHERE user_id = ?').run(user.id);
  db.prepare('DELETE FROM points_ledger WHERE user_id = ?').run(user.id);
  db.prepare('DELETE FROM password_resets WHERE user_id = ?').run(user.id);
  db.prepare('DELETE FROM users WHERE id = ?').run(user.id);

  const settledMatches = db.prepare(
    "SELECT id FROM matches WHERE is_completed = 1 AND result != 'abandoned'"
  ).all();
  for (const m of settledMatches) {
    try { resettleMatch(m.id); } catch (e) { /* skip */ }
  }

  res.json({ ok: true });
});

router.put('/users/:id/reset-password', (req, res) => {
  const { password } = req.body;
  if (!password) return res.status(400).json({ error: 'Password required' });

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const hash = bcrypt.hashSync(password, 10);
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hash, user.id);
  res.json({ ok: true });
});

// --- Bets on behalf ---

router.get('/bets/:matchId', (req, res) => {
  const match = db.prepare('SELECT * FROM matches WHERE id = ?').get(req.params.matchId);
  if (!match) return res.status(404).json({ error: 'Match not found' });

  const users = db.prepare('SELECT id, name, phone FROM users WHERE is_admin = 0 ORDER BY name').all();
  const bets = db.prepare('SELECT user_id, prediction FROM bets WHERE match_id = ?').all(match.id);
  const betMap = {};
  for (const b of bets) betMap[b.user_id] = b.prediction;

  const result = users.map(u => ({
    user_id: u.id,
    name: u.name,
    phone: u.phone,
    prediction: betMap[u.id] || null
  }));

  res.json({ match, bets: result });
});

router.post('/bets', (req, res) => {
  const { user_id, match_id, prediction } = req.body;
  if (!user_id || !match_id) {
    return res.status(400).json({ error: 'user_id and match_id required' });
  }

  const user = db.prepare('SELECT * FROM users WHERE id = ? AND is_admin = 0').get(user_id);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const match = db.prepare('SELECT * FROM matches WHERE id = ?').get(match_id);
  if (!match) return res.status(404).json({ error: 'Match not found' });

  if (!prediction) {
    db.prepare('DELETE FROM bets WHERE user_id = ? AND match_id = ?').run(user_id, match_id);
  } else {
    if (!['team_a', 'team_b', 'tie'].includes(prediction)) {
      return res.status(400).json({ error: 'prediction must be team_a, team_b, or tie' });
    }
    db.prepare(`
      INSERT INTO bets (user_id, match_id, prediction, placed_at)
      VALUES (?, ?, ?, datetime('now'))
      ON CONFLICT(user_id, match_id)
      DO UPDATE SET prediction = excluded.prediction, placed_at = datetime('now')
    `).run(user_id, match_id, prediction);
  }

  let resettled = null;
  if (match.is_completed && match.result !== 'abandoned') {
    try {
      resettled = resettleMatch(match_id);
    } catch (e) {
      return res.status(500).json({ error: 'Bet saved but re-settlement failed: ' + e.message });
    }
  }

  res.json({ ok: true, resettled: !!resettled });
});

// --- Matches ---

router.put('/matches/:id', (req, res) => {
  const match = db.prepare('SELECT * FROM matches WHERE id = ?').get(req.params.id);
  if (!match) return res.status(404).json({ error: 'Match not found' });

  const { bet_points, bet_cutoff, team_a, team_b, match_date, match_time, venue } = req.body;

  if (bet_points !== undefined) {
    db.prepare('UPDATE matches SET bet_points = ? WHERE id = ?').run(bet_points, match.id);
  }
  if (bet_cutoff !== undefined) {
    db.prepare('UPDATE matches SET bet_cutoff = ? WHERE id = ?').run(bet_cutoff, match.id);
  }
  if (team_a !== undefined) {
    db.prepare('UPDATE matches SET team_a = ? WHERE id = ?').run(team_a, match.id);
  }
  if (team_b !== undefined) {
    db.prepare('UPDATE matches SET team_b = ? WHERE id = ?').run(team_b, match.id);
  }
  if (match_date !== undefined) {
    db.prepare('UPDATE matches SET match_date = ? WHERE id = ?').run(match_date, match.id);
  }
  if (match_time !== undefined) {
    db.prepare('UPDATE matches SET match_time = ? WHERE id = ?').run(match_time, match.id);
  }
  if (venue !== undefined) {
    db.prepare('UPDATE matches SET venue = ? WHERE id = ?').run(venue, match.id);
  }

  const updated = db.prepare('SELECT * FROM matches WHERE id = ?').get(match.id);

  let resettled = null;
  if (bet_points !== undefined && updated.is_completed && updated.result !== 'abandoned') {
    try {
      resettled = resettleMatch(match.id);
    } catch (e) {
      return res.status(500).json({ error: 'Match updated but re-settlement failed: ' + e.message });
    }
  }

  res.json({ ...updated, resettled: resettled || null });
});

router.post('/matches/:id/result', (req, res) => {
  const { result } = req.body;
  if (!result || !['team_a', 'team_b', 'tie', 'abandoned'].includes(result)) {
    return res.status(400).json({ error: 'result must be team_a, team_b, tie, or abandoned' });
  }

  try {
    const settlement = settleMatch(parseInt(req.params.id), result);
    res.json({ ok: true, ...settlement });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Undo result (re-open match)
router.post('/matches/:id/undo-result', (req, res) => {
  const match = db.prepare('SELECT * FROM matches WHERE id = ?').get(req.params.id);
  if (!match) return res.status(404).json({ error: 'Match not found' });
  if (!match.is_completed) return res.status(400).json({ error: 'Match is not completed' });

  db.prepare('DELETE FROM points_ledger WHERE match_id = ?').run(match.id);
  db.prepare('UPDATE matches SET result = NULL, is_completed = 0 WHERE id = ?').run(match.id);

  res.json({ ok: true });
});

// Reset all bets, results, and points
router.post('/reset-all', (req, res) => {
  db.prepare('DELETE FROM points_ledger').run();
  db.prepare('DELETE FROM bets').run();
  db.prepare('UPDATE matches SET result = NULL, is_completed = 0').run();
  res.json({ ok: true });
});

module.exports = router;
