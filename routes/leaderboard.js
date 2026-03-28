const express = require('express');
const db = require('../db/database');

const router = express.Router();

router.get('/', (req, res) => {
  const leaderboard = db.prepare(`
    SELECT
      u.id,
      u.name,
      u.phone,
      COALESCE(SUM(pl.points_delta), 0) as total_points,
      COUNT(DISTINCT pl.match_id) as matches_settled
    FROM users u
    LEFT JOIN points_ledger pl ON u.id = pl.user_id
    WHERE u.is_admin = 0
    GROUP BY u.id
    ORDER BY total_points DESC
  `).all();

  const ranked = leaderboard.map((row, idx) => ({
    rank: idx + 1,
    ...row,
    total_points: Math.round(row.total_points * 100) / 100
  }));

  const partyPot = ranked
    .filter(r => r.total_points < 0)
    .reduce((sum, r) => sum + Math.abs(r.total_points), 0);

  res.json({
    leaderboard: ranked,
    party_pot: Math.round(partyPot * 100) / 100
  });
});

router.get('/:userId', (req, res) => {
  const userId = parseInt(req.params.userId);
  const user = db.prepare('SELECT id, name, phone FROM users WHERE id = ? AND is_admin = 0').get(userId);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const completedMatches = db.prepare(`
    SELECT m.id, m.match_number, m.team_a, m.team_b, m.match_date, m.result, m.bet_points
    FROM matches m
    WHERE m.is_completed = 1 AND m.result != 'abandoned'
    ORDER BY m.match_date DESC, m.match_number DESC
  `).all();

  const bets = db.prepare('SELECT match_id, prediction FROM bets WHERE user_id = ?').all(userId);
  const betMap = {};
  for (const b of bets) betMap[b.match_id] = b.prediction;

  const ledger = db.prepare('SELECT match_id, points_delta, reason FROM points_ledger WHERE user_id = ?').all(userId);
  const ledgerMap = {};
  for (const l of ledger) ledgerMap[l.match_id] = l;

  const history = completedMatches.map(m => {
    const prediction = betMap[m.id] || null;
    const entry = ledgerMap[m.id];
    const winnerLabel = m.result === 'team_a' ? m.team_a : m.result === 'team_b' ? m.team_b : 'Tie';

    return {
      match_id: m.id,
      match_number: m.match_number,
      team_a: m.team_a,
      team_b: m.team_b,
      match_date: m.match_date,
      bet_points: m.bet_points,
      result: m.result,
      winner_label: winnerLabel,
      prediction,
      prediction_label: prediction === 'team_a' ? m.team_a : prediction === 'team_b' ? m.team_b : prediction === 'tie' ? 'Tie' : null,
      points_delta: entry ? entry.points_delta : 0,
      reason: entry ? entry.reason : 'no_bet'
    };
  });

  const totalPoints = history.reduce((sum, h) => sum + h.points_delta, 0);

  res.json({
    user,
    total_points: Math.round(totalPoints * 100) / 100,
    matches: history
  });
});

module.exports = router;
