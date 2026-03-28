const API = {
  async request(method, path, body) {
    const opts = {
      method,
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin'
    };
    if (body) opts.body = JSON.stringify(body);
    const res = await fetch(`/api${path}`, opts);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Request failed');
    return data;
  },

  get(path) { return this.request('GET', path); },
  post(path, body) { return this.request('POST', path, body); },
  put(path, body) { return this.request('PUT', path, body); },
  del(path) { return this.request('DELETE', path); },

  // Auth
  login: (phone, password) => API.post('/auth/login', { phone, password }),
  logout: () => API.post('/auth/logout'),
  me: () => API.get('/auth/me'),
  changePassword: (current_password, new_password) => API.put('/auth/change-password', { current_password, new_password }),
  forgotPassword: (phone, email) => API.post('/auth/forgot-password', { phone, email }),
  resetPassword: (phone, otp, new_password) => API.post('/auth/reset-password', { phone, otp, new_password }),

  // Matches & Bets
  getMatches: () => API.get('/matches'),
  getMatch: (id) => API.get(`/matches/${id}`),
  placeBet: (match_id, prediction) => API.post('/bets', { match_id, prediction }),
  myBets: () => API.get('/bets/my'),

  // Leaderboard (returns { leaderboard: [...], party_pot: number })
  getLeaderboard: () => API.get('/leaderboard'),
  getUserHistory: (userId) => API.get(`/leaderboard/${userId}`),

  // Admin
  getUsers: () => API.get('/admin/users'),
  createUser: (data) => API.post('/admin/users', data),
  deleteUser: (id) => API.del(`/admin/users/${id}`),
  resetUserPassword: (id, password) => API.put(`/admin/users/${id}/reset-password`, { password }),
  updateMatch: (id, data) => API.put(`/admin/matches/${id}`, data),
  declareResult: (id, result) => API.post(`/admin/matches/${id}/result`, { result }),
  undoResult: (id) => API.post(`/admin/matches/${id}/undo-result`),
  getMatchBets: (matchId) => API.get(`/admin/bets/${matchId}`),
  adminPlaceBet: (user_id, match_id, prediction) => API.post('/admin/bets', { user_id, match_id, prediction }),
};
