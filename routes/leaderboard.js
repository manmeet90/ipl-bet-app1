const express = require('express');
const firebaseDB = require('../db/firebase-web-db');

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const users = await firebaseDB.getAllUsers();
    const allPointsEntries = await firebaseDB.getAllPointsEntries();

    // Calculate leaderboard
    const leaderboard = users
      .filter(user => !user.is_admin) // Exclude admin users
      .map(user => {
        const userPoints = allPointsEntries
          .filter(entry => entry.user_id === user.id)
          .reduce((sum, entry) => sum + entry.points_delta, 0);
        
        const matchesSettled = new Set(
          allPointsEntries
            .filter(entry => entry.user_id === user.id)
            .map(entry => entry.match_id)
        ).size;

        return {
          id: user.id,
          name: user.name,
          phone: user.phone,
          total_points: Math.round(userPoints * 100) / 100,
          matches_settled: matchesSettled
        };
      })
      .sort((a, b) => b.total_points - a.total_points);

    const ranked = leaderboard.map((row, idx) => ({
      rank: idx + 1,
      ...row
    }));

    const partyPot = ranked
      .filter(r => r.total_points < 0)
      .reduce((sum, r) => sum + Math.abs(r.total_points), 0);

    res.json({
      leaderboard: ranked,
      party_pot: Math.round(partyPot * 100) / 100
    });
  } catch (error) {
    console.error('Get leaderboard error:', error);
    res.status(500).json({ error: 'Failed to get leaderboard' });
  }
});

router.get('/:userId', async (req, res) => {
  try {
    const userId = req.params.userId;
    const user = await firebaseDB.getUserById(userId);
    if (!user || user.is_admin) return res.status(404).json({ error: 'User not found' });

    const matches = await firebaseDB.getAllMatches();
    const completedMatches = matches.filter(m => 
      (m.is_completed === true || m.status === 'completed') && m.result && m.result !== 'abandoned'
    ).sort((a, b) => {
      // Sort by date DESC, then by match number DESC
      const dateCompare = new Date(b.match_date).getTime() - new Date(a.match_date).getTime();
      return dateCompare !== 0 ? dateCompare : b.match_number - a.match_number;
    });

    const bets = await firebaseDB.getBetsByUser(userId);
    const betMap = {};
    for (const b of bets) betMap[b.match_id] = b.prediction;

    const ledgerEntries = await firebaseDB.getPointsEntriesByUser(userId);
    const ledgerMap = {};
    for (const l of ledgerEntries) ledgerMap[l.match_id] = l;

    const history = completedMatches.map(m => {
      const prediction = betMap[m.id] || null;
      const entry = ledgerMap[m.id];
      const winnerLabel = m.result === 'team_a' ? m.team1 : m.result === 'team_b' ? m.team2 : 'Tie';

      return {
        match_id: m.id,
        match_number: m.match_number,
        team_a: m.team1, // Map team1 to team_a
        team_b: m.team2, // Map team2 to team_b
        match_date: m.match_date,
        bet_points: m.bet_points,
        result: m.result,
        winner_label: winnerLabel,
        prediction,
        prediction_label: prediction === 'team_a' ? m.team1 : prediction === 'team_b' ? m.team2 : prediction === 'tie' ? 'Tie' : null,
        points_delta: entry ? entry.points_delta : 0,
        reason: entry ? entry.reason : 'no_bet'
      };
    });

    const totalPoints = history.reduce((sum, h) => sum + h.points_delta, 0);

    res.json({
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone
      },
      total_points: Math.round(totalPoints * 100) / 100,
      matches: history
    });
  } catch (error) {
    console.error('Get user leaderboard error:', error);
    res.status(500).json({ error: 'Failed to get user leaderboard' });
  }
});

module.exports = router;
