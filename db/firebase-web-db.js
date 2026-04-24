const { 
  database, 
  ref, 
  set, 
  get, 
  push, 
  update, 
  remove, 
  child, 
  query, 
  orderByChild, 
  equalTo,
  generatePushId,
  getServerTimestamp 
} = require('../firebase-web-config-fixed');

class FirebaseWebDB {
  
  // User operations
  async getUserByPhone(phone) {
    try {
      const usersRef = ref(database, 'users');
      const userQuery = query(usersRef, orderByChild('phone'), equalTo(phone));
      const snapshot = await get(userQuery);
      
      if (snapshot.exists()) {
        const users = snapshot.val();
        const userId = Object.keys(users)[0];
        return { id: userId, ...users[userId] };
      }
      return null;
    } catch (error) {
      console.error('Error getting user by phone:', error);
      throw error;
    }
  }

  async getUserById(userId) {
    try {
      const userRef = ref(database, `users/${userId}`);
      const snapshot = await get(userRef);
      
      if (snapshot.exists()) {
        return { id: userId, ...snapshot.val() };
      }
      return null;
    } catch (error) {
      console.error('Error getting user by ID:', error);
      throw error;
    }
  }

  async createUser(userData) {
    try {
      const usersRef = ref(database, 'users');
      const newUserRef = push(usersRef);
      const userId = newUserRef.key;
      
      const userWithTimestamp = {
        ...userData,
        created_at: getServerTimestamp(),
        updated_at: getServerTimestamp()
      };
      
      await set(newUserRef, userWithTimestamp);
      return { id: userId, ...userWithTimestamp };
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }

  async updateUser(userId, updates) {
    try {
      const userRef = ref(database, `users/${userId}`);
      const updatesWithTimestamp = {
        ...updates,
        updated_at: getServerTimestamp()
      };
      
      await update(userRef, updatesWithTimestamp);
      return true;
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  }

  async getAllUsers() {
    try {
      const usersRef = ref(database, 'users');
      const snapshot = await get(usersRef);
      
      if (snapshot.exists()) {
        const users = snapshot.val();
        return Object.keys(users).map(id => ({ id, ...users[id] }));
      }
      return [];
    } catch (error) {
      console.error('Error getting all users:', error);
      throw error;
    }
  }

  async deleteUser(userId) {
    try {
      // Delete user and all related data
      const updates = {};
      updates[`users/${userId}`] = null;
      updates[`bets/${userId}`] = null;
      updates[`points_ledger/${userId}`] = null;
      
      const rootRef = ref(database);
      await update(rootRef, updates);
      return true;
    } catch (error) {
      console.error('Error deleting user:', error);
      throw error;
    }
  }

  // Match operations
  async getAllMatches() {
    try {
      const matchesRef = ref(database, 'matches');
      const snapshot = await get(matchesRef);
      
      if (snapshot.exists()) {
        const matches = snapshot.val();
        return Object.keys(matches).map(id => ({ id, ...matches[id] }));
      }
      return [];
    } catch (error) {
      console.error('Error getting matches:', error);
      throw error;
    }
  }

  async getMatchById(matchId) {
    try {
      const matchRef = ref(database, `matches/${matchId}`);
      const snapshot = await get(matchRef);
      
      if (snapshot.exists()) {
        return { id: matchId, ...snapshot.val() };
      }
      return null;
    } catch (error) {
      console.error('Error getting match by ID:', error);
      throw error;
    }
  }

  async createMatch(matchData) {
    try {
      const matchesRef = ref(database, 'matches');
      const newMatchRef = push(matchesRef);
      const matchId = newMatchRef.key;
      
      await set(newMatchRef, matchData);
      return { id: matchId, ...matchData };
    } catch (error) {
      console.error('Error creating match:', error);
      throw error;
    }
  }

  async updateMatch(matchId, updates) {
    try {
      const matchRef = ref(database, `matches/${matchId}`);
      await update(matchRef, updates);
      return true;
    } catch (error) {
      console.error('Error updating match:', error);
      throw error;
    }
  }

  // Bet operations
  async createOrUpdateBet(userId, matchId, betData) {
    try {
      const betRef = ref(database, `bets/${userId}/${matchId}`);
      const betWithTimestamp = {
        ...betData,
        user_id: userId,
        match_id: matchId,
        created_at: getServerTimestamp(),
        updated_at: getServerTimestamp()
      };
      
      await set(betRef, betWithTimestamp);
      return betWithTimestamp;
    } catch (error) {
      console.error('Error creating/updating bet:', error);
      throw error;
    }
  }

  async deleteBet(userId, matchId) {
    try {
      const betRef = ref(database, `bets/${userId}/${matchId}`);
      await remove(betRef);
      return true;
    } catch (error) {
      console.error('Error deleting bet:', error);
      throw error;
    }
  }

  async getUserBets(userId) {
    try {
      const userBetsRef = ref(database, `bets/${userId}`);
      const snapshot = await get(userBetsRef);
      
      if (snapshot.exists()) {
        const bets = snapshot.val();
        return Object.keys(bets).map(matchId => ({ 
          match_id: matchId, 
          ...bets[matchId] 
        }));
      }
      return [];
    } catch (error) {
      console.error('Error getting user bets:', error);
      throw error;
    }
  }

  // Alias for compatibility with firebase-db.js API
  async getBetsByUser(userId) {
    const bets = await this.getUserBets(userId);
    // Map the bet structure to match expected API format
    return bets.map(bet => ({
      ...bet,
      prediction: bet.predicted_team // Map predicted_team to prediction
    }));
  }

  async getUserBetForMatch(userId, matchId) {
    try {
      const betRef = ref(database, `bets/${userId}/${matchId}`);
      const snapshot = await get(betRef);
      
      if (snapshot.exists()) {
        return { match_id: matchId, ...snapshot.val() };
      }
      return null;
    } catch (error) {
      console.error('Error getting user bet for match:', error);
      throw error;
    }
  }

  // Alias for compatibility with firebase-db.js API
  async getBetByUserAndMatch(userId, matchId) {
    const bet = await this.getUserBetForMatch(userId, matchId);
    if (bet) {
      return {
        ...bet,
        prediction: bet.predicted_team // Map predicted_team to prediction
      };
    }
    return null;
  }

  async getMatchBets(matchId) {
    try {
      const allBets = [];
      const betsRef = ref(database, 'bets');
      const snapshot = await get(betsRef);
      
      if (snapshot.exists()) {
        const allUserBets = snapshot.val();
        
        for (const [userId, userBets] of Object.entries(allUserBets)) {
          if (userBets[matchId]) {
            allBets.push({
              user_id: userId,
              match_id: matchId,
              ...userBets[matchId]
            });
          }
        }
      }
      
      return allBets;
    } catch (error) {
      console.error('Error getting match bets:', error);
      throw error;
    }
  }

  // Alias for admin routes compatibility
  async getBetsByMatch(matchId) {
    const bets = await this.getMatchBets(matchId);
    // Map prediction field for admin compatibility
    return bets.map(bet => ({
      ...bet,
      prediction: bet.predicted_team
    }));
  }

  async getMatchBetsWithUsers(matchId) {
    try {
      const [bets, users] = await Promise.all([
        this.getMatchBets(matchId),
        this.getAllUsers()
      ]);
      
      const userMap = new Map(users.map(u => [u.id, u]));
      
      return bets.map(bet => ({
        ...bet,
        prediction: bet.predicted_team, // Map predicted_team to prediction for API compatibility
        user: userMap.get(bet.user_id)
      })).filter(bet => bet.user);
    } catch (error) {
      console.error('Error getting match bets with users:', error);
      throw error;
    }
  }

  // Points ledger operations
  async addPointsEntry(userId, matchId, points, description, type = 'match_result') {
    try {
      const pointsRef = ref(database, `points_ledger/${userId}`);
      const newEntryRef = push(pointsRef);
      
      const entry = {
        match_id: matchId,
        points: points,
        description: description,
        type: type,
        created_at: getServerTimestamp()
      };
      
      await set(newEntryRef, entry);
      return { id: newEntryRef.key, ...entry };
    } catch (error) {
      console.error('Error adding points entry:', error);
      throw error;
    }
  }

  async getUserPointsHistory(userId) {
    try {
      const userPointsRef = ref(database, `points_ledger/${userId}`);
      const snapshot = await get(userPointsRef);
      
      if (snapshot.exists()) {
        const points = snapshot.val();
        return Object.keys(points).map(id => ({ id, ...points[id] }));
      }
      return [];
    } catch (error) {
      console.error('Error getting user points history:', error);
      throw error;
    }
  }

  // Alias for compatibility with leaderboard route
  async getPointsEntriesByUser(userId) {
    try {
      const userPointsRef = ref(database, `points_ledger/${userId}`);
      const snapshot = await get(userPointsRef);
      
      if (snapshot.exists()) {
        const points = snapshot.val();
        return Object.keys(points).map(id => ({ 
          id, 
          user_id: userId,
          points_delta: points[id].points || 0,
          match_id: points[id].match_id,
          reason: points[id].description || 'Unknown',
          created_at: points[id].created_at,
          ...points[id] 
        }));
      }
      return [];
    } catch (error) {
      console.error('Error getting user points entries:', error);
      throw error;
    }
  }

  // Method needed for My Bets page
  async getUserBetsWithMatches(userId) {
    try {
      const [bets, matches] = await Promise.all([
        this.getUserBets(userId),
        this.getAllMatches()
      ]);
      
      const matchMap = new Map(matches.map(m => [m.id, m]));
      
      return bets.map(bet => ({
        ...bet,
        prediction: bet.predicted_team, // Ensure prediction mapping is applied
        match: matchMap.get(bet.match_id)
      })).filter(bet => bet.match);
    } catch (error) {
      console.error('Error getting user bets with matches:', error);
      throw error;
    }
  }

  // Method needed for My Bets page
  async getPointsEntryByUserAndMatch(userId, matchId) {
    try {
      const userPointsRef = ref(database, `points_ledger/${userId}`);
      const snapshot = await get(userPointsRef);
      
      if (snapshot.exists()) {
        const points = snapshot.val();
        const entry = Object.keys(points)
          .map(id => ({ id, ...points[id] }))
          .find(entry => entry.match_id === matchId);
        
        if (entry) {
          return {
            ...entry,
            user_id: userId,
            points_delta: entry.points || 0,
            reason: entry.description || 'Unknown'
          };
        }
      }
      return null;
    } catch (error) {
      console.error('Error getting points entry by user and match:', error);
      throw error;
    }
  }

  async getAllPointsEntries() {
    try {
      const allEntries = [];
      const pointsRef = ref(database, 'points_ledger');
      const snapshot = await get(pointsRef);
      
      if (snapshot.exists()) {
        const allUserPoints = snapshot.val();
        
        for (const [userId, userPoints] of Object.entries(allUserPoints)) {
          for (const [entryId, entry] of Object.entries(userPoints)) {
            allEntries.push({
              id: entryId,
              user_id: userId,
              points_delta: entry.points || 0, // Map for compatibility with leaderboard
              match_id: entry.match_id,
              reason: entry.description || 'Unknown',
              created_at: entry.created_at,
              ...entry
            });
          }
        }
      }
      
      return allEntries;
    } catch (error) {
      console.error('Error getting all points entries:', error);
      throw error;
    }
  }

  async getPointsEntriesByMatch(matchId) {
    try {
      const allEntries = [];
      const pointsRef = ref(database, 'points_ledger');
      const snapshot = await get(pointsRef);
      
      if (snapshot.exists()) {
        const allUserPoints = snapshot.val();
        
        for (const [userId, userPoints] of Object.entries(allUserPoints)) {
          for (const [entryId, entry] of Object.entries(userPoints)) {
            if (entry.match_id === matchId) {
              allEntries.push({
                id: entryId,
                user_id: userId,
                points_delta: entry.points || 0, // Map 'points' to 'points_delta' for compatibility
                reason: entry.description || 'Unknown', // Map 'description' to 'reason' for compatibility
                match_id: entry.match_id,
                created_at: entry.created_at
              });
            }
          }
        }
      }
      
      return allEntries;
    } catch (error) {
      console.error('Error getting points entries by match:', error);
      throw error;
    }
  }

  async clearMatchPointsEntries(matchId) {
    try {
      const pointsRef = ref(database, 'points_ledger');
      const snapshot = await get(pointsRef);
      
      if (snapshot.exists()) {
        const updates = {};
        const allUserPoints = snapshot.val();
        
        for (const [userId, userPoints] of Object.entries(allUserPoints)) {
          for (const [entryId, entry] of Object.entries(userPoints)) {
            if (entry.match_id === matchId) {
              updates[`points_ledger/${userId}/${entryId}`] = null;
            }
          }
        }
        
        if (Object.keys(updates).length > 0) {
          const rootRef = ref(database);
          await update(rootRef, updates);
        }
      }
      
      return true;
    } catch (error) {
      console.error('Error clearing match points entries:', error);
      throw error;
    }
  }

  // Password reset operations
  async createPasswordReset(phone, token) {
    try {
      const resetRef = ref(database, `password_resets/${token}`);
      const resetData = {
        phone: phone,
        token: token,
        created_at: getServerTimestamp(),
        expires_at: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
      };
      
      await set(resetRef, resetData);
      return resetData;
    } catch (error) {
      console.error('Error creating password reset:', error);
      throw error;
    }
  }

  async getPasswordReset(token) {
    try {
      const resetRef = ref(database, `password_resets/${token}`);
      const snapshot = await get(resetRef);
      
      if (snapshot.exists()) {
        return snapshot.val();
      }
      return null;
    } catch (error) {
      console.error('Error getting password reset:', error);
      throw error;
    }
  }

  async deletePasswordReset(token) {
    try {
      const resetRef = ref(database, `password_resets/${token}`);
      await remove(resetRef);
      return true;
    } catch (error) {
      console.error('Error deleting password reset:', error);
      throw error;
    }
  }

  // Settlement operations (atomic updates) - Original method
  async settleBet(userId, matchId, points, description) {
    try {
      const updates = {};
      
      // Add points entry
      const pointsEntryId = generatePushId();
      updates[`points_ledger/${userId}/${pointsEntryId}`] = {
        match_id: matchId,
        points: points,
        description: description,
        type: 'match_result',
        created_at: getServerTimestamp()
      };
      
      // Mark bet as settled
      updates[`bets/${userId}/${matchId}/settled`] = true;
      updates[`bets/${userId}/${matchId}/points_awarded`] = points;
      updates[`bets/${userId}/${matchId}/settled_at`] = getServerTimestamp();
      
      const rootRef = ref(database);
      await update(rootRef, updates);
      
      return true;
    } catch (error) {
      console.error('Error settling bet:', error);
      throw error;
    }
  }

  // Method needed by settlement service - matches firebase-db.js signature
  async settleMatch(matchId, result, settlements) {
    try {
      const updates = {};
      
      // Update match result
      updates[`matches/${matchId}/result`] = result;
      updates[`matches/${matchId}/status`] = 'completed';
      
      // Add points ledger entries for all users
      settlements.forEach(settlement => {
        const entryId = generatePushId();
        updates[`points_ledger/${settlement.user_id}/${entryId}`] = {
          match_id: matchId,
          points: settlement.points_delta,
          description: settlement.reason,
          type: 'match_result',
          created_at: getServerTimestamp()
        };
      });
      
      const rootRef = ref(database);
      await update(rootRef, updates);
      
      return true;
    } catch (error) {
      console.error('Error settling match:', error);
      throw error;
    }
  }

  // Utility operations
  async clearAllData() {
    try {
      const updates = {
        users: null,
        matches: null,
        bets: null,
        points_ledger: null,
        password_resets: null
      };
      
      const rootRef = ref(database);
      await update(rootRef, updates);
      return true;
    } catch (error) {
      console.error('Error clearing all data:', error);
      throw error;
    }
  }

  async testConnection() {
    try {
      const testRef = ref(database, 'connection_test');
      await set(testRef, {
        timestamp: getServerTimestamp(),
        test: true
      });
      
      const snapshot = await get(testRef);
      await remove(testRef);
      
      return snapshot.exists();
    } catch (error) {
      console.error('Error testing connection:', error);
      throw error;
    }
  }
}

module.exports = new FirebaseWebDB();