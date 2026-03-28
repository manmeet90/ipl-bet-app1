const AdminPage = {
  tab: 'users',
  users: [],
  matches: [],

  async render() {
    return `
      <div class="page">
        <div class="page-title">🛠 Admin Panel</div>
        <div class="admin-tabs">
          <button class="admin-tab ${this.tab === 'users' ? 'active' : ''}" onclick="AdminPage.switchTab('users')">Users</button>
          <button class="admin-tab ${this.tab === 'matches' ? 'active' : ''}" onclick="AdminPage.switchTab('matches')">Matches</button>
          <button class="admin-tab ${this.tab === 'bets' ? 'active' : ''}" onclick="AdminPage.switchTab('bets')">Bets</button>
          <button class="admin-tab ${this.tab === 'results' ? 'active' : ''}" onclick="AdminPage.switchTab('results')">Results</button>
        </div>
        <div class="admin-panel" id="admin-content">
          ${await this.renderTab()}
        </div>
      </div>
    `;
  },

  async switchTab(tab) {
    this.tab = tab;
    const el = document.getElementById('admin-content');
    if (el) el.innerHTML = await this.renderTab();
    document.querySelectorAll('.admin-tab').forEach(b => b.classList.toggle('active', b.textContent.toLowerCase() === tab));
  },

  async renderTab() {
    if (this.tab === 'users') return await this.renderUsers();
    if (this.tab === 'matches') return await this.renderMatches();
    if (this.tab === 'bets') return await this.renderBets();
    if (this.tab === 'results') return await this.renderResults();
  },

  // ===== Users =====
  async renderUsers() {
    try { this.users = await API.getUsers(); } catch (e) { return `<p>${e.message}</p>`; }

    const rows = this.users.filter(u => !u.is_admin).map(u => `
      <tr>
        <td>${u.name}</td>
        <td>${u.phone}</td>
        <td>${u.email || '—'}</td>
        <td>
          <div class="inline-actions">
            <button class="btn btn-ghost btn-sm" onclick="AdminPage.promptResetPw(${u.id}, '${u.name}')">Reset PW</button>
            <button class="btn btn-danger btn-sm" onclick="AdminPage.deleteUser(${u.id}, '${u.name}')">Delete</button>
          </div>
        </td>
      </tr>
    `).join('');

    return `
      <h3 style="margin-bottom:16px;">Add User</h3>
      <div class="admin-form" style="margin-bottom:24px;">
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          <input class="form-input" id="au-name" placeholder="Name" style="flex:1;min-width:120px;">
          <input class="form-input" id="au-phone" placeholder="Phone" style="flex:1;min-width:120px;">
          <input class="form-input" id="au-email" placeholder="Email (optional)" style="flex:1;min-width:140px;">
          <input class="form-input" id="au-pw" placeholder="Password" type="password" style="flex:1;min-width:120px;">
          <button class="btn btn-primary btn-sm" onclick="AdminPage.addUser()">Add</button>
        </div>
      </div>
      <h3 style="margin-bottom:12px;">All Users (${this.users.filter(u => !u.is_admin).length})</h3>
      <div style="overflow-x:auto;">
        <table class="admin-table">
          <thead><tr><th>Name</th><th>Phone</th><th>Email</th><th>Actions</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    `;
  },

  async addUser() {
    const name = document.getElementById('au-name').value.trim();
    const phone = document.getElementById('au-phone').value.trim();
    const email = document.getElementById('au-email').value.trim();
    const password = document.getElementById('au-pw').value;
    if (!name || !phone || !password) return Toast.error('Name, phone, and password required');
    try {
      await API.createUser({ name, phone, email, password });
      Toast.success(`User ${name} created`);
      this.switchTab('users');
    } catch (e) { Toast.error(e.message); }
  },

  async deleteUser(id, name) {
    if (!confirm(`Delete user "${name}"? This removes all their bets and points.`)) return;
    try {
      await API.deleteUser(id);
      Toast.success(`${name} deleted`);
      this.switchTab('users');
    } catch (e) { Toast.error(e.message); }
  },

  promptResetPw(id, name) {
    const pw = prompt(`New password for ${name}:`);
    if (!pw) return;
    API.resetUserPassword(id, pw)
      .then(() => Toast.success(`Password reset for ${name}`))
      .catch(e => Toast.error(e.message));
  },

  // ===== Matches =====
  async renderMatches() {
    try { this.matches = await API.getMatches(); } catch (e) { return `<p>${e.message}</p>`; }

    const rows = this.matches.map(m => {
      const isClosed = m.betting_closed;
      return `
        <tr>
          <td>${m.match_number}</td>
          <td><strong>${m.team_a}</strong> vs <strong>${m.team_b}</strong></td>
          <td>${m.match_date}</td>
          <td>${m.bet_points}</td>
          <td>
            <label class="toggle">
              <input type="checkbox" ${m.betting_open ? 'checked' : ''} onchange="AdminPage.toggleBetting(${m.id}, this.checked)">
              <span class="toggle-slider"></span>
            </label>
          </td>
          <td>${m.is_completed ? '✅ ' + (m.result === 'team_a' ? m.team_a : m.result === 'team_b' ? m.team_b : m.result === 'abandoned' ? 'Abandoned' : 'Tie') : '—'}</td>
          <td>
            <button class="btn btn-ghost btn-sm" onclick="AdminPage.editMatch(${m.id})">Edit</button>
          </td>
        </tr>
      `;
    }).join('');

    return `
      <div style="overflow-x:auto;">
        <table class="admin-table">
          <thead><tr><th>#</th><th>Match</th><th>Date</th><th>Pts</th><th>Betting</th><th>Result</th><th></th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    `;
  },

  async toggleBetting(id, open) {
    try {
      await API.updateMatch(id, { betting_open: open });
      Toast.success(`Betting ${open ? 'opened' : 'closed'}`);
    } catch (e) { Toast.error(e.message); }
  },

  editMatch(id) {
    const m = this.matches.find(x => x.id === id);
    if (!m) return;
    const el = document.getElementById('admin-content');
    el.innerHTML = `
      <h3>Edit Match ${m.match_number}: ${m.team_a} vs ${m.team_b}</h3>
      <div class="admin-form" style="margin-top:16px;">
        <div class="form-group">
          <label>Team A</label>
          <input class="form-input" id="em-ta" value="${m.team_a}">
        </div>
        <div class="form-group">
          <label>Team B</label>
          <input class="form-input" id="em-tb" value="${m.team_b}">
        </div>
        <div class="form-group">
          <label>Match Date</label>
          <input class="form-input" type="date" id="em-date" value="${m.match_date}">
        </div>
        <div class="form-group">
          <label>Match Time</label>
          <input class="form-input" id="em-time" value="${m.match_time}">
        </div>
        <div class="form-group">
          <label>Venue</label>
          <input class="form-input" id="em-venue" value="${m.venue}">
        </div>
        <div class="form-group">
          <label>Bet Points</label>
          <input class="form-input" type="number" id="em-pts" value="${m.bet_points}">
        </div>
        <div class="form-group">
          <label>Bet Cutoff</label>
          <input class="form-input" type="datetime-local" id="em-cutoff" value="${m.bet_cutoff ? m.bet_cutoff.replace(' ', 'T').slice(0, 16) : ''}">
        </div>
        <div style="display:flex;gap:8px;">
          <button class="btn btn-primary" onclick="AdminPage.saveMatch(${m.id})">Save</button>
          <button class="btn btn-ghost" onclick="AdminPage.switchTab('matches')">Cancel</button>
        </div>
      </div>
    `;
  },

  async saveMatch(id) {
    const data = {
      team_a: document.getElementById('em-ta').value.trim(),
      team_b: document.getElementById('em-tb').value.trim(),
      match_date: document.getElementById('em-date').value,
      match_time: document.getElementById('em-time').value.trim(),
      venue: document.getElementById('em-venue').value.trim(),
      bet_points: parseInt(document.getElementById('em-pts').value),
      bet_cutoff: document.getElementById('em-cutoff').value
    };
    try {
      await API.updateMatch(id, data);
      Toast.success('Match updated');
      this.switchTab('matches');
    } catch (e) { Toast.error(e.message); }
  },

  // ===== Bets (on behalf) =====
  selectedBetMatch: null,

  async renderBets() {
    try { this.matches = await API.getMatches(); } catch (e) { return `<p>${e.message}</p>`; }

    const matchOptions = this.matches.map(m => {
      const label = `#${m.match_number} ${m.team_a} vs ${m.team_b} (${m.match_date})${m.is_completed ? ' ✅' : ''}`;
      return `<option value="${m.id}" ${this.selectedBetMatch === m.id ? 'selected' : ''}>${label}</option>`;
    }).join('');

    let betGridHTML = '';
    if (this.selectedBetMatch) {
      betGridHTML = await this.renderBetGrid(this.selectedBetMatch);
    } else {
      betGridHTML = '<p style="color:var(--text-muted);margin-top:12px;">Select a match above to manage bets.</p>';
    }

    return `
      <h3 style="margin-bottom:12px;">Place Bets on Behalf of Users</h3>
      <div class="form-group" style="max-width:500px;">
        <label>Select Match</label>
        <select class="form-input" onchange="AdminPage.selectBetMatch(parseInt(this.value))">
          <option value="">— Choose a match —</option>
          ${matchOptions}
        </select>
      </div>
      <div id="admin-bet-grid">${betGridHTML}</div>
    `;
  },

  async selectBetMatch(matchId) {
    this.selectedBetMatch = matchId || null;
    const el = document.getElementById('admin-bet-grid');
    if (!matchId) {
      el.innerHTML = '<p style="color:var(--text-muted);margin-top:12px;">Select a match above to manage bets.</p>';
      return;
    }
    el.innerHTML = '<p style="color:var(--text-muted);">Loading...</p>';
    el.innerHTML = await this.renderBetGrid(matchId);
  },

  async renderBetGrid(matchId) {
    let data;
    try { data = await API.getMatchBets(matchId); } catch (e) { return `<p>${e.message}</p>`; }

    const m = data.match;
    const isSettled = m.is_completed === 1;
    const note = isSettled
      ? `<p style="color:var(--accent-gold);font-size:13px;margin-bottom:12px;">⚠ This match is already settled. Changing a bet will automatically re-calculate points for everyone.</p>`
      : '';

    const rows = data.bets.map(b => {
      const sel = (val) => b.prediction === val ? 'selected' : '';
      return `
        <tr>
          <td style="font-weight:600;">${b.name}</td>
          <td>
            <div class="inline-actions">
              <button class="bet-btn btn-sm ${sel('team_a')}" onclick="AdminPage.adminBet(${b.user_id}, ${matchId}, 'team_a')">${m.team_a}</button>
              <button class="bet-btn btn-sm ${sel('tie')}" onclick="AdminPage.adminBet(${b.user_id}, ${matchId}, 'tie')">Tie</button>
              <button class="bet-btn btn-sm ${sel('team_b')}" onclick="AdminPage.adminBet(${b.user_id}, ${matchId}, 'team_b')">${m.team_b}</button>
              <button class="bet-btn btn-sm ${!b.prediction ? 'selected' : ''}" style="opacity:${!b.prediction ? 1 : 0.5}" onclick="AdminPage.adminBet(${b.user_id}, ${matchId}, null)">No Bet</button>
            </div>
          </td>
          <td style="color:var(--text-muted);font-size:12px;">${b.prediction ? (b.prediction === 'team_a' ? m.team_a : b.prediction === 'team_b' ? m.team_b : 'Tie') : '—'}</td>
        </tr>
      `;
    }).join('');

    return `
      ${note}
      <div style="overflow-x:auto;">
        <table class="admin-table">
          <thead><tr><th>User</th><th>Set Bet</th><th>Current</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    `;
  },

  async adminBet(userId, matchId, prediction) {
    try {
      const data = await API.adminPlaceBet(userId, matchId, prediction);
      if (data.resettled) {
        Toast.success('Bet updated & points re-calculated');
      } else {
        Toast.success('Bet updated');
      }
      const el = document.getElementById('admin-bet-grid');
      el.innerHTML = await this.renderBetGrid(matchId);
    } catch (e) { Toast.error(e.message); }
  },

  // ===== Results =====
  resultsSubTab: 'declare',

  async renderResults() {
    try { this.matches = await API.getMatches(); } catch (e) { return `<p>${e.message}</p>`; }

    const pending = this.matches.filter(m => !m.is_completed);
    const completed = this.matches.filter(m => m.is_completed).reverse();

    const declareHTML = this.renderDeclareSection(pending);
    const settledHTML = this.renderSettledSection(completed);

    return `
      <div class="filter-tabs" style="margin-bottom:16px;">
        <button class="filter-tab ${this.resultsSubTab === 'declare' ? 'active' : ''}" onclick="AdminPage.switchResultsSubTab('declare')">
          Declare Results (${pending.length})
        </button>
        <button class="filter-tab ${this.resultsSubTab === 'settled' ? 'active' : ''}" onclick="AdminPage.switchResultsSubTab('settled')">
          Settled Matches (${completed.length})
        </button>
      </div>
      <div id="results-subtab-content">
        ${this.resultsSubTab === 'declare' ? declareHTML : settledHTML}
      </div>
    `;
  },

  switchResultsSubTab(sub) {
    this.resultsSubTab = sub;
    this.switchTab('results');
  },

  renderDeclareSection(pending) {
    if (pending.length === 0) {
      return '<div class="empty-state"><div class="icon">✅</div><p>All matches have been settled!</p></div>';
    }
    const rows = pending.map(m => `
      <tr>
        <td>${m.match_number}</td>
        <td><strong>${m.team_a}</strong> vs <strong>${m.team_b}</strong></td>
        <td>${m.match_date}</td>
        <td>
          <div class="inline-actions">
            <button class="btn btn-sm" style="background:var(--accent-blue);color:#fff;" onclick="AdminPage.declareResult(${m.id}, 'team_a', '${m.team_a}')">${m.team_a} Won</button>
            <button class="btn btn-sm" style="background:var(--accent-orange);color:#fff;" onclick="AdminPage.declareResult(${m.id}, 'team_b', '${m.team_b}')">${m.team_b} Won</button>
            <button class="btn btn-sm" style="background:var(--accent-teal);color:#fff;" onclick="AdminPage.declareResult(${m.id}, 'tie', 'Tie')">Tie</button>
            <button class="btn btn-sm" style="background:var(--text-muted);color:#fff;" onclick="AdminPage.declareResult(${m.id}, 'abandoned', 'Abandoned')">Abandoned</button>
          </div>
        </td>
      </tr>
    `).join('');

    return `
      <div style="overflow-x:auto;">
        <table class="admin-table">
          <thead><tr><th>#</th><th>Match</th><th>Date</th><th>Declare Winner</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    `;
  },

  renderSettledSection(completed) {
    if (completed.length === 0) {
      return '<div class="empty-state"><div class="icon">📊</div><p>No matches settled yet</p></div>';
    }
    const rows = completed.map(m => {
      const winner = m.result === 'abandoned' ? 'Abandoned' : m.result === 'team_a' ? m.team_a : m.result === 'team_b' ? m.team_b : 'Tie';
      return `
        <tr>
          <td>${m.match_number}</td>
          <td>${m.team_a} vs ${m.team_b}</td>
          <td>${winner}</td>
          <td>
            <button class="btn btn-ghost btn-sm" onclick="AdminPage.undoResult(${m.id})">Undo</button>
          </td>
        </tr>
      `;
    }).join('');

    return `
      <div style="overflow-x:auto;">
        <table class="admin-table">
          <thead><tr><th>#</th><th>Match</th><th>Result</th><th></th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    `;
  },

  async declareResult(id, result, label) {
    const msg = result === 'abandoned'
      ? `Mark match as Abandoned? No points will be affected.`
      : `Declare "${label}" as winner?`;
    if (!confirm(msg)) return;
    try {
      const data = await API.declareResult(id, result);
      if (data.abandoned) {
        Toast.success('Match marked as abandoned — no points affected');
      } else {
        Toast.success(`Result declared! ${data.winners} winners share ${data.totalPool} pts (${data.pointsPerWinner} each)`);
      }
      this.switchTab('results');
    } catch (e) { Toast.error(e.message); }
  },

  async undoResult(id) {
    if (!confirm('Undo this result? All points for this match will be reversed.')) return;
    try {
      await API.undoResult(id);
      Toast.success('Result undone');
      this.switchTab('results');
    } catch (e) { Toast.error(e.message); }
  }
};
