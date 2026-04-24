const express = require('express');
const firebaseDB = require('../db/firebase-web-db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.post('/', requireAuth, async (req, res) => {
  try {
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

    const match = await firebaseDB.getMatchById(match_id);
    if (!match) return res.status(404).json({ error: 'Match not found' });

    if (match.is_completed) {
      return res.status(400).json({ error: 'Match is already completed' });
    }

    const now = new Date();
    const cutoff = new Date(match.bet_cutoff);
    if (now >= cutoff) {
      return res.status(400).json({ error: 'Betting cutoff has passed for this match' });
    }

    await firebaseDB.createOrUpdateBet(req.session.userId, match_id, { predicted_team: prediction });

    res.json({ ok: true, prediction });
  } catch (error) {
    console.error('Place bet error:', error);
    res.status(500).json({ error: 'Failed to place bet' });
  }
});

router.get('/my', requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId;

    // Get user's bets with match details
    const userBetsWithMatches = await firebaseDB.getUserBetsWithMatches(userId);
    
    // Get all points entries for this user to find missed matches
    const pointsEntries = await firebaseDB.getPointsEntriesByUser(userId);
    const missedMatchIds = pointsEntries
      .filter(entry => entry.reason === 'no_bet')
      .map(entry => entry.match_id);

    // Get missed match details
    const missedMatches = [];
    for (const matchId of missedMatchIds) {
      const match = await firebaseDB.getMatchById(matchId);
      if (match && !userBetsWithMatches.find(bet => bet.match_id === matchId)) {
        missedMatches.push({
          id: null,
          user_id: null,
          match_id: matchId,
          prediction: null,
          placed_at: null,
          match: match
        });
      }
    }

    const all = [...userBetsWithMatches, ...missedMatches];
    all.sort((a, b) => (b.match?.match_date || '').localeCompare(a.match?.match_date || ''));

    const result = await Promise.all(all.map(async (b) => {
      let points_earned = null;
      const isCompleted = b.match?.is_completed === true || b.match?.status === 'completed';
      if (isCompleted) {
        const ledger = await firebaseDB.getPointsEntryByUserAndMatch(userId, b.match_id);
        points_earned = ledger ? ledger.points_delta : 0;
      }
      return {
        id: b.id,
        user_id: b.user_id,
        match_id: b.match_id,
        prediction: b.prediction,
        placed_at: b.placed_at,
        team_a: b.match?.team1, // Map team1 to team_a
        team_b: b.match?.team2, // Map team2 to team_b
        match_date: b.match?.match_date,
        match_time: b.match?.match_time,
        match_number: b.match?.match_number,
        result: b.match?.result,
        is_completed: isCompleted,
        bet_points: b.match?.bet_points,
        points_earned
      };
    }));

    res.json(result);
  } catch (error) {
    console.error('Get my bets error:', error);
    res.status(500).json({ error: 'Failed to get bets' });
  }
});

module.exports = router;
