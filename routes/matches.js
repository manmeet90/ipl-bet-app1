const express = require('express');
const db = require('../db/database');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

function isBettingClosed(match) {
  if (match.is_completed) return true;
  const now = new Date();
  const cutoff = new Date(match.bet_cutoff);
  return now >= cutoff;
}

router.get('/', requireAuth, (req, res) => {
  const matches = db.prepare('SELECT * FROM matches ORDER BY match_date, match_time').all();
  const userId = req.session.userId;
  const isAdmin = req.session.isAdmin;

  const myBets = db.prepare('SELECT * FROM bets WHERE user_id = ?').all(userId);
  const myBetMap = {};
  for (const b of myBets) {
    myBetMap[b.match_id] = b.prediction;
  }

  const result = matches.map(m => {
    const closed = isBettingClosed(m);
    const { betting_open, ...rest } = m;
    const out = {
      ...rest,
      is_completed: m.is_completed === 1,
      betting_closed: closed,
      my_bet: myBetMap[m.id] || null
    };

    if (closed || isAdmin) {
      const allBets = db.prepare(
        'SELECT b.prediction, u.id as user_id, u.name FROM bets b JOIN users u ON b.user_id = u.id WHERE b.match_id = ?'
      ).all(m.id);
      out.all_bets = allBets;
    }

    return out;
  });

  res.json(result);
});

router.get('/:id', requireAuth, (req, res) => {
  const match = db.prepare('SELECT * FROM matches WHERE id = ?').get(req.params.id);
  if (!match) return res.status(404).json({ error: 'Match not found' });

  const closed = isBettingClosed(match);
  const userId = req.session.userId;
  const isAdmin = req.session.isAdmin;

  const myBet = db.prepare('SELECT * FROM bets WHERE user_id = ? AND match_id = ?').get(userId, match.id);

  const { betting_open: _bo, ...matchRest } = match;
  const out = {
    ...matchRest,
    is_completed: match.is_completed === 1,
    betting_closed: closed,
    my_bet: myBet ? myBet.prediction : null
  };

  if (closed || isAdmin) {
    out.all_bets = db.prepare(
      'SELECT b.prediction, u.id as user_id, u.name FROM bets b JOIN users u ON b.user_id = u.id WHERE b.match_id = ?'
    ).all(match.id);

    if (match.is_completed) {
      out.points = db.prepare(
        'SELECT pl.points_delta, pl.reason, u.name, u.id as user_id FROM points_ledger pl JOIN users u ON pl.user_id = u.id WHERE pl.match_id = ?'
      ).all(match.id);
    }
  }

  res.json(out);
});

module.exports = router;
