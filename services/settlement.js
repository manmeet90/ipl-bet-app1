const db = require('../db/database');

function settleMatch(matchId, result) {
  const match = db.prepare('SELECT * FROM matches WHERE id = ?').get(matchId);
  if (!match) throw new Error('Match not found');
  if (match.is_completed) throw new Error('Match already settled');

  if (result === 'abandoned') {
    db.prepare('UPDATE matches SET result = ?, is_completed = 1 WHERE id = ?')
      .run('abandoned', matchId);
    return { winners: 0, losers: 0, totalPool: 0, pointsPerWinner: 0, abandoned: true };
  }

  const allUsers = db.prepare('SELECT * FROM users WHERE is_admin = 0').all();
  if (allUsers.length === 0) throw new Error('No users to settle');

  const bets = db.prepare('SELECT * FROM bets WHERE match_id = ?').all(matchId);
  const betMap = {};
  for (const b of bets) {
    betMap[b.user_id] = b.prediction;
  }

  const betPoints = match.bet_points;
  const winners = [];
  const losers = [];

  for (const user of allUsers) {
    const pick = betMap[user.id];
    if (!pick || pick !== result) {
      losers.push({ ...user, reason: pick ? 'loss' : 'no_bet' });
    } else {
      winners.push(user);
    }
  }

  const totalPool = losers.length * betPoints;

  const insertLedger = db.prepare(
    'INSERT INTO points_ledger (user_id, match_id, points_delta, reason) VALUES (?, ?, ?, ?)'
  );

  for (const l of losers) {
    insertLedger.run(l.id, matchId, -betPoints, l.reason);
  }

  if (winners.length > 0) {
    const pointsPerWinner = Math.round((totalPool / winners.length) * 100) / 100;
    for (const w of winners) {
      insertLedger.run(w.id, matchId, pointsPerWinner, 'win');
    }
  }

  db.prepare('UPDATE matches SET result = ?, is_completed = 1 WHERE id = ?')
    .run(result, matchId);

  return {
    winners: winners.length,
    losers: losers.length,
    totalPool,
    pointsPerWinner: winners.length > 0 ? Math.round((totalPool / winners.length) * 100) / 100 : 0
  };
}

function resettleMatch(matchId) {
  const match = db.prepare('SELECT * FROM matches WHERE id = ?').get(matchId);
  if (!match) throw new Error('Match not found');
  if (!match.is_completed) return null;
  if (match.result === 'abandoned') return null;

  db.prepare('DELETE FROM points_ledger WHERE match_id = ?').run(matchId);
  db.prepare('UPDATE matches SET is_completed = 0, result = NULL WHERE id = ?').run(matchId);

  return settleMatch(matchId, match.result);
}

module.exports = { settleMatch, resettleMatch };
