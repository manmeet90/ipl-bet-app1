const firebaseDB = require('../db/firebase-web-db');

async function settleMatch(matchId, result) {
  const match = await firebaseDB.getMatchById(matchId);
  if (!match) throw new Error('Match not found');
  const isCompleted = match.is_completed === true || match.status === 'completed';
  if (isCompleted) throw new Error('Match already settled');

  if (result === 'abandoned') {
    await firebaseDB.updateMatch(matchId, { result: 'abandoned', status: 'completed' });
    return { winners: 0, losers: 0, totalPool: 0, pointsPerWinner: 0, abandoned: true };
  }

  const allUsers = await firebaseDB.getAllUsers();
  const nonAdminUsers = allUsers.filter(user => !user.is_admin);
  if (nonAdminUsers.length === 0) throw new Error('No users to settle');

  const bets = await firebaseDB.getBetsByMatch(matchId);
  const betMap = {};
  for (const b of bets) {
    betMap[b.user_id] = b.prediction;
  }

  const betPoints = match.bet_points;
  const winners = [];
  const losers = [];

  for (const user of nonAdminUsers) {
    const pick = betMap[user.id];
    if (!pick || pick !== result) {
      losers.push({ ...user, reason: pick ? 'loss' : 'no_bet' });
    } else {
      winners.push(user);
    }
  }

  const totalPool = losers.length * betPoints;

  // Prepare all settlement entries
  const settlements = [];

  // Add losers
  for (const l of losers) {
    settlements.push({
      user_id: l.id,
      points_delta: -betPoints,
      reason: l.reason
    });
  }

  // Add winners
  if (winners.length > 0) {
    const pointsPerWinner = Math.round((totalPool / winners.length) * 100) / 100;
    for (const w of winners) {
      settlements.push({
        user_id: w.id,
        points_delta: pointsPerWinner,
        reason: 'win'
      });
    }
  }

  // Use atomic settlement operation
  await firebaseDB.settleMatch(matchId, result, settlements);

  return {
    winners: winners.length,
    losers: losers.length,
    totalPool,
    pointsPerWinner: winners.length > 0 ? Math.round((totalPool / winners.length) * 100) / 100 : 0
  };
}

async function resettleMatch(matchId) {
  const match = await firebaseDB.getMatchById(matchId);
  if (!match) throw new Error('Match not found');
  const isCompleted = match.is_completed === true || match.status === 'completed';
  if (!isCompleted) return null;
  if (match.result === 'abandoned') return null;

  // Clear existing points for this match
  await firebaseDB.clearMatchPointsEntries(matchId);

  // Reset match status
  await firebaseDB.updateMatch(matchId, { status: null, result: null });

  return await settleMatch(matchId, match.result);
}

module.exports = { settleMatch, resettleMatch };
