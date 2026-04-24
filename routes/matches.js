const express = require('express');
const firebaseDB = require('../db/firebase-web-db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

function isBettingClosed(match) {
  if (match.is_completed || match.status === 'completed') return true;
  const now = new Date();
  
  // Use bet_cutoff if available, otherwise default to match day at 1:00 PM IST
  const cutoffTime = match.bet_cutoff || `${match.match_date}T13:00:00+05:30`;
  const cutoff = new Date(cutoffTime);
  return now >= cutoff;
}

router.get('/', requireAuth, async (req, res) => {
  try {
    const matches = await firebaseDB.getAllMatches();
    const userId = req.session.userId;
    const isAdmin = req.session.isAdmin;

    const myBets = await firebaseDB.getBetsByUser(userId);
    const myBetMap = {};
    for (const b of myBets) {
      myBetMap[b.match_id] = b.prediction;
    }

    const result = await Promise.all(matches.map(async (m) => {
      const closed = isBettingClosed(m);
      const { betting_open, ...rest } = m;
      
      // Map database field names to frontend expectations
      const out = {
        ...rest,
        team_a: m.team1,        // Map team1 -> team_a
        team_b: m.team2,        // Map team2 -> team_b
        bet_cutoff: m.bet_cutoff || `${m.match_date}T13:00:00+05:30`, // Add bet cutoff if missing
        is_completed: m.is_completed === true || m.status === 'completed',
        betting_closed: closed,
        my_bet: myBetMap[m.id] || null
      };

      if (closed || isAdmin) {
        const allBetsWithUsers = await firebaseDB.getMatchBetsWithUsers(m.id);
        out.all_bets = allBetsWithUsers.map(bet => ({
          prediction: bet.prediction,
          user_id: bet.user.id,
          name: bet.user.name
        }));

        // Add points data for completed matches
        if (out.is_completed) {
          const pointsEntries = await firebaseDB.getPointsEntriesByMatch(m.id);
          const users = await firebaseDB.getAllUsers();
          const userMap = new Map(users.map(u => [u.id, u]));
          
          out.points = pointsEntries.map(entry => ({
            points_delta: entry.points_delta,
            reason: entry.reason,
            name: userMap.get(entry.user_id)?.name || 'Unknown',
            user_id: entry.user_id
          }));
        }
      }

      return out;
    }));

    res.json(result);
  } catch (error) {
    console.error('Get matches error:', error);
    res.status(500).json({ error: 'Failed to get matches' });
  }
});

router.get('/:id', requireAuth, async (req, res) => {
  try {
    const match = await firebaseDB.getMatchById(req.params.id);
    if (!match) return res.status(404).json({ error: 'Match not found' });

    const closed = isBettingClosed(match);
    const userId = req.session.userId;
    const isAdmin = req.session.isAdmin;

    const myBet = await firebaseDB.getBetByUserAndMatch(userId, match.id);

    const { betting_open: _bo, ...matchRest } = match;
    const out = {
      ...matchRest,
      team_a: match.team1,        // Map team1 -> team_a
      team_b: match.team2,        // Map team2 -> team_b
      bet_cutoff: match.bet_cutoff || `${match.match_date}T13:00:00+05:30`, // Add bet cutoff if missing
      is_completed: match.is_completed === true || match.status === 'completed',
      betting_closed: closed,
      my_bet: myBet ? myBet.prediction : null
    };

    if (closed || isAdmin) {
      const allBetsWithUsers = await firebaseDB.getMatchBetsWithUsers(match.id);
      out.all_bets = allBetsWithUsers.map(bet => ({
        prediction: bet.prediction,
        user_id: bet.user.id,
        name: bet.user.name
      }));

      if (match.is_completed) {
        const pointsEntries = await firebaseDB.getPointsEntriesByMatch(match.id);
        const users = await firebaseDB.getAllUsers();
        const userMap = new Map(users.map(u => [u.id, u]));
        
        out.points = pointsEntries.map(entry => ({
          points_delta: entry.points_delta,
          reason: entry.reason,
          name: userMap.get(entry.user_id)?.name || 'Unknown',
          user_id: entry.user_id
        }));
      }
    }

    res.json(out);
  } catch (error) {
    console.error('Get match error:', error);
    res.status(500).json({ error: 'Failed to get match' });
  }
});

module.exports = router;
