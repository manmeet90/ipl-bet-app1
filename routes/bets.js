const express = require('express');
const db = require('../db/database');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.post('/', requireAuth, (req, res) => {
  const { match_id, prediction } = req.body;
  if (!match_id || !prediction) {
    return res.status(400).json({ error: 'match_id and prediction required' });
  }
  if (!['team_a', 'team_b', 'tie'].includes(prediction)) {
    return res.status(400).json({ error: 'prediction must be team_a, team_b, or tie' });
  }

  if (req.session.isAdmin) {
    return res.status(403).json({ error: 'Admin account cannot place bets' });
  }

  const match = db.prepare('SELECT * FROM matches WHERE id = ?').get(match_id);
  if (!match) return res.status(404).json({ error: 'Match not found' });

  if (match.is_completed) {
    return res.status(400).json({ error: 'Match is already completed' });
  }

  if (match.betting_open === 0) {
    return res.status(400).json({ error: 'Betting is closed for this match' });
  }

  const now = new Date();
  const cutoff = new Date(match.bet_cutoff);
  if (now >= cutoff) {
    return res.status(400).json({ error: 'Betting cutoff has passed for this match' });
  }

  db.prepare(`
    INSERT INTO bets (user_id, match_id, prediction, placed_at)
    VALUES (?, ?, ?, datetime('now'))
    ON CONFLICT(user_id, match_id)
    DO UPDATE SET prediction = excluded.prediction, placed_at = datetime('now')
  `).run(req.session.userId, match_id, prediction);

  res.json({ ok: true, prediction });
});

router.get('/my', requireAuth, (req, res) => {
  const userId = req.session.userId;

  const bets = db.prepare(`
    SELECT b.*, m.team_a, m.team_b, m.match_date, m.match_time, m.match_number, m.result, m.is_completed, m.bet_points
    FROM bets b
    JOIN matches m ON b.match_id = m.id
    WHERE b.user_id = ?
  `).all(userId);

  const missedMatches = db.prepare(`
    SELECT NULL as id, NULL as user_id, NULL as prediction, NULL as placed_at,
           m.id as match_id, m.team_a, m.team_b, m.match_date, m.match_time,
           m.match_number, m.result, m.is_completed, m.bet_points
    FROM points_ledger pl
    JOIN matches m ON pl.match_id = m.id
    WHERE pl.user_id = ? AND pl.reason = 'no_bet'
      AND m.id NOT IN (SELECT match_id FROM bets WHERE user_id = ?)
  `).all(userId, userId);

  const all = [...bets, ...missedMatches];
  all.sort((a, b) => (b.match_date || '').localeCompare(a.match_date || ''));

  const result = all.map(b => {
    let points_earned = null;
    if (b.is_completed) {
      const ledger = db.prepare(
        'SELECT points_delta FROM points_ledger WHERE user_id = ? AND match_id = ?'
      ).get(userId, b.match_id);
      points_earned = ledger ? ledger.points_delta : 0;
    }
    return { ...b, is_completed: b.is_completed === 1, points_earned };
  });

  res.json(result);
});

module.exports = router;
