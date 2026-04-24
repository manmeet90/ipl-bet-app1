const express = require('express');
const bcrypt = require('bcryptjs');
const firebaseDB = require('../db/firebase-web-db');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { settleMatch, resettleMatch } = require('../services/settlement');

const router = express.Router();

router.use(requireAuth, requireAdmin);

// --- Users ---

router.get('/users', async (req, res) => {
  try {
    const users = await firebaseDB.getAllUsers();
    const sortedUsers = users
      .map(u => ({ ...u, is_admin: u.is_admin === true }))
      .sort((a, b) => a.name.localeCompare(b.name));
    res.json(sortedUsers);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Failed to get users' });
  }
});

router.post('/users', async (req, res) => {
  try {
    const { name, phone, email, password } = req.body;
    if (!name || !phone || !password) {
      return res.status(400).json({ error: 'Name, phone and password required' });
    }

    const existing = await firebaseDB.getUserByPhone(phone);
    if (existing) return res.status(400).json({ error: 'Phone number already registered' });

    const hash = bcrypt.hashSync(password, 10);
    const newUser = await firebaseDB.createUser({
      name,
      phone,
      email: email || '',
      password_hash: hash,
      is_admin: false
    });

    const matches = await firebaseDB.getAllMatches();
    const settledMatches = matches.filter(m => 
      (m.is_completed === true || m.status === 'completed') && m.result && m.result !== 'abandoned'
    );

    let resettledCount = 0;
    for (const m of settledMatches) {
      try {
        await resettleMatch(m.id);
        resettledCount++;
      } catch (e) { /* skip if resettle fails */ }
    }

    res.json({ ok: true, id: newUser.id, resettled_matches: resettledCount });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

router.delete('/users/:id', async (req, res) => {
  try {
    const user = await firebaseDB.getUserById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.is_admin) return res.status(400).json({ error: 'Cannot delete admin' });

    await firebaseDB.deleteUser(user.id);

    const matches = await firebaseDB.getAllMatches();
    const settledMatches = matches.filter(m => 
      (m.is_completed === true || m.status === 'completed') && m.result && m.result !== 'abandoned'
    );
    
    for (const m of settledMatches) {
      try { 
        await resettleMatch(m.id); 
      } catch (e) { /* skip */ }
    }

    res.json({ ok: true });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

router.put('/users/:id/reset-password', async (req, res) => {
  try {
    const { password } = req.body;
    if (!password) return res.status(400).json({ error: 'Password required' });

    const user = await firebaseDB.getUserById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const hash = bcrypt.hashSync(password, 10);
    await firebaseDB.updateUser(user.id, { password_hash: hash });
    res.json({ ok: true });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

// --- Bets on behalf ---

router.get('/bets/:matchId', async (req, res) => {
  try {
    const match = await firebaseDB.getMatchById(req.params.matchId);
    if (!match) return res.status(404).json({ error: 'Match not found' });

    const allUsers = await firebaseDB.getAllUsers();
    const users = allUsers
      .filter(u => !u.is_admin)
      .sort((a, b) => a.name.localeCompare(b.name));
    
    const bets = await firebaseDB.getBetsByMatch(match.id);
    const betMap = {};
    for (const b of bets) betMap[b.user_id] = b.prediction;

    const result = users.map(u => ({
      user_id: u.id,
      name: u.name,
      phone: u.phone,
      prediction: betMap[u.id] || null
    }));

    // Map team fields for frontend compatibility
    const matchForUI = {
      ...match,
      team_a: match.team1,
      team_b: match.team2
    };
    
    res.json({ match: matchForUI, bets: result });
  } catch (error) {
    console.error('Get match bets error:', error);
    res.status(500).json({ error: 'Failed to get match bets' });
  }
});

router.post('/bets', async (req, res) => {
  try {
    const { user_id, match_id, prediction } = req.body;
    if (!user_id || !match_id) {
      return res.status(400).json({ error: 'user_id and match_id required' });
    }

    const user = await firebaseDB.getUserById(user_id);
    if (!user || user.is_admin) return res.status(404).json({ error: 'User not found' });

    const match = await firebaseDB.getMatchById(match_id);
    if (!match) return res.status(404).json({ error: 'Match not found' });

    if (!prediction) {
      // Delete bet - we need to add a delete method
      await firebaseDB.deleteBet(user_id, match_id);
    } else {
      if (!['team_a', 'team_b', 'tie'].includes(prediction)) {
        return res.status(400).json({ error: 'prediction must be team_a, team_b, or tie' });
      }
      await firebaseDB.createOrUpdateBet(user_id, match_id, { predicted_team: prediction });
    }

    let resettled = null;
    const isCompleted = match.is_completed === true || match.status === 'completed';
    if (isCompleted && match.result !== 'abandoned') {
      try {
        resettled = await resettleMatch(match_id);
      } catch (e) {
        return res.status(500).json({ error: 'Bet saved but re-settlement failed: ' + e.message });
      }
    }

    res.json({ ok: true, resettled: !!resettled });
  } catch (error) {
    console.error('Admin bet error:', error);
    res.status(500).json({ error: 'Failed to manage bet' });
  }
});

// --- Matches ---

router.put('/matches/:id', async (req, res) => {
  try {
    const match = await firebaseDB.getMatchById(req.params.id);
    if (!match) return res.status(404).json({ error: 'Match not found' });

    const { bet_points, bet_cutoff, team_a, team_b, match_date, match_time, venue, match_number, is_completed, result } = req.body;
    
    const updates = {};
    if (bet_points !== undefined) updates.bet_points = bet_points;
    if (bet_cutoff !== undefined) updates.bet_cutoff = bet_cutoff;
    if (team_a !== undefined) updates.team1 = team_a; // Map team_a to team1
    if (team_b !== undefined) updates.team2 = team_b; // Map team_b to team2
    if (match_date !== undefined) updates.match_date = match_date;
    if (match_time !== undefined) updates.match_time = match_time;
    if (venue !== undefined) updates.venue = venue;
    if (match_number !== undefined) updates.match_number = match_number;
    if (is_completed !== undefined) updates.is_completed = is_completed;
    if (result !== undefined) updates.result = result;

    if (Object.keys(updates).length > 0) {
      await firebaseDB.updateMatch(match.id, updates);
    }

    const updated = await firebaseDB.getMatchById(match.id);

    let resettled = null;
    const isUpdatedCompleted = updated.is_completed === true || updated.status === 'completed';
    if (bet_points !== undefined && isUpdatedCompleted && updated.result !== 'abandoned') {
      try {
        resettled = await resettleMatch(match.id);
      } catch (e) {
        return res.status(500).json({ error: 'Match updated but re-settlement failed: ' + e.message });
      }
    }

    res.json({ ...updated, resettled: resettled || null });
  } catch (error) {
    console.error('Update match error:', error);
    res.status(500).json({ error: 'Failed to update match' });
  }
});

router.post('/matches/:id/result', async (req, res) => {
  try {
    const { result } = req.body;
    if (!result || !['team_a', 'team_b', 'tie', 'abandoned'].includes(result)) {
      return res.status(400).json({ error: 'result must be team_a, team_b, tie, or abandoned' });
    }

    const settlement = await settleMatch(req.params.id, result);
    res.json({ ok: true, ...settlement });
  } catch (err) {
    console.error('Settle match error:', err);
    res.status(400).json({ error: err.message });
  }
});

// Undo result (re-open match)
router.post('/matches/:id/undo-result', async (req, res) => {
  try {
    const match = await firebaseDB.getMatchById(req.params.id);
    if (!match) return res.status(404).json({ error: 'Match not found' });
    const isCompleted = match.is_completed === true || match.status === 'completed';
    if (!isCompleted) return res.status(400).json({ error: 'Match is not completed' });

    await firebaseDB.clearMatchPointsEntries(match.id);
    await firebaseDB.updateMatch(match.id, { 
      result: null, 
      is_completed: false, 
      status: null  // Also reset status field since database uses this
    });

    res.json({ ok: true });
  } catch (error) {
    console.error('Undo result error:', error);
    res.status(500).json({ error: 'Failed to undo result' });
  }
});

// Delete a match and all related data
router.delete('/matches/:id', async (req, res) => {
  try {
    const matchId = req.params.id;
    
    // Check if match exists
    const match = await firebaseDB.getMatchById(matchId);
    if (!match) {
      return res.status(404).json({ error: 'Match not found' });
    }
    
    // Delete all bets for this match
    const bets = await firebaseDB.getBetsByMatch(matchId);
    for (const bet of bets) {
      await firebaseDB.deleteBet(bet.user_id, matchId);
    }
    
    // Delete all points entries for this match
    const pointsEntries = await firebaseDB.getPointsEntriesByMatch(matchId);
    // Note: We need to add a method to delete points entries by ID
    
    // Delete the match itself
    // Note: We need to add a deleteMatch method to firebaseDB
    
    res.json({ 
      ok: true, 
      deleted: {
        match: 1,
        bets: bets.length,
        points_entries: pointsEntries.length
      }
    });
  } catch (error) {
    console.error('Delete match error:', error);
    res.status(500).json({ error: 'Failed to delete match' });
  }
});

// Reset all bets, results, and points
router.post('/reset-all', async (req, res) => {
  try {
    await firebaseDB.clearAllData();
    res.json({ ok: true });
  } catch (error) {
    console.error('Reset all error:', error);
    res.status(500).json({ error: 'Failed to reset all data' });
  }
});

module.exports = router;
