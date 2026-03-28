const Dashboard = {
  matches: [],
  filter: 'today',
  countdownInterval: null,

  async render() {
    try {
      this.matches = await API.getMatches();
    } catch (e) {
      return `<div class="page"><div class="empty-state"><div class="icon">⚠️</div><p>${e.message}</p></div></div>`;
    }

    const today = new Date().toISOString().split('T')[0];

    const todayMatches = this.matches.filter(m => m.match_date === today);
    const upcoming = this.matches.filter(m => m.match_date > today && !m.is_completed);
    const completed = this.matches.filter(m => m.is_completed).reverse();
    const past = this.matches.filter(m => m.match_date < today && !m.is_completed);

    return `
      <div class="page">
        <div class="page-title">🏏 IPL 2026 Matches</div>
        <div class="filter-tabs">
          <button class="filter-tab ${this.filter === 'today' ? 'active' : ''}" onclick="Dashboard.setFilter('today')">Today</button>
          <button class="filter-tab ${this.filter === 'upcoming' ? 'active' : ''}" onclick="Dashboard.setFilter('upcoming')">Upcoming</button>
          <button class="filter-tab ${this.filter === 'completed' ? 'active' : ''}" onclick="Dashboard.setFilter('completed')">Completed</button>
          <button class="filter-tab ${this.filter === 'all' ? 'active' : ''}" onclick="Dashboard.setFilter('all')">All</button>
        </div>
        <div class="match-grid" id="match-grid">
          ${this.renderSection(this.filter, todayMatches, upcoming, completed, past)}
        </div>
      </div>
    `;
  },

  renderSection(filter, todayMatches, upcoming, completed, past) {
    let html = '';
    if (filter === 'today') {
      if (todayMatches.length === 0) {
        html = '<div class="empty-state"><div class="icon">📅</div><p>No matches today</p></div>';
      } else {
        html = todayMatches.map(m => renderMatchCard(m)).join('');
      }
    } else if (filter === 'upcoming') {
      html = upcoming.length ? upcoming.map(m => renderMatchCard(m)).join('') :
        '<div class="empty-state"><div class="icon">🏏</div><p>No upcoming matches</p></div>';
    } else if (filter === 'completed') {
      html = completed.length ? completed.map(m => renderMatchCard(m)).join('') :
        '<div class="empty-state"><div class="icon">📊</div><p>No completed matches yet</p></div>';
    } else {
      html = this.matches.map(m => renderMatchCard(m)).join('');
    }
    return html;
  },

  setFilter(f) {
    this.filter = f;
    App.navigate('dashboard');
  },

  async placeBet(matchId, prediction, btnEl) {
    if (this._betting) return;
    this._betting = true;
    const card = btnEl ? btnEl.closest('.match-card') : null;
    const btns = card ? card.querySelectorAll('.bet-btn') : [];
    btns.forEach(b => { b.disabled = true; b.classList.add('btn-loading'); });
    if (btnEl) btnEl.innerHTML = '<span class="spinner-sm"></span>';
    try {
      await API.placeBet(matchId, prediction);
      Toast.success(`Bet placed: ${prediction === 'tie' ? 'Tie' : prediction === 'team_a' ? this.getMatch(matchId).team_a : this.getMatch(matchId).team_b}`);
      this.matches = await API.getMatches();
      this.updateGrid();
    } catch (e) {
      Toast.error(e.message);
      btns.forEach(b => { b.disabled = false; b.classList.remove('btn-loading'); });
    } finally {
      this._betting = false;
    }
  },

  getMatch(id) {
    return this.matches.find(m => m.id === id);
  },

  updateGrid() {
    const today = new Date().toISOString().split('T')[0];
    const todayMatches = this.matches.filter(m => m.match_date === today);
    const upcoming = this.matches.filter(m => m.match_date > today && !m.is_completed);
    const completed = this.matches.filter(m => m.is_completed).reverse();
    const past = this.matches.filter(m => m.match_date < today && !m.is_completed);
    const grid = document.getElementById('match-grid');
    if (grid) grid.innerHTML = this.renderSection(this.filter, todayMatches, upcoming, completed, past);
  },

  startCountdowns() {
    if (this.countdownInterval) clearInterval(this.countdownInterval);
    this.countdownInterval = setInterval(() => {
      document.querySelectorAll('.countdown').forEach(el => {
        const card = el.closest('.match-card');
        if (!card) return;
        const matchId = parseInt(card.dataset.matchId);
        const match = this.getMatch(matchId);
        if (match) {
          const cd = getCountdown(match.bet_cutoff);
          el.textContent = cd ? `· ⏳ ${cd}` : '· ⏳ Closed';
        }
      });
    }, 1000);
  },

  cleanup() {
    if (this.countdownInterval) clearInterval(this.countdownInterval);
  }
};
