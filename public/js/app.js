const App = {
  user: null,
  currentPage: null,
  partyPot: 0,

  async init() {
    try {
      this.user = await API.me();
      await this.fetchPartyPot();
      this.navigate(this.user.is_admin ? 'admin' : 'dashboard');
    } catch {
      this.user = null;
      this.renderLogin();
    }
  },

  async fetchPartyPot() {
    try {
      const data = await API.getLeaderboard();
      this.partyPot = data.party_pot || 0;
    } catch { /* ignore */ }
  },

  renderLogin() {
    document.getElementById('app').innerHTML = LoginPage.render();
    LoginPage.bindEnter();
  },

  async navigate(page) {
    if (!this.user) return this.renderLogin();

    Dashboard.cleanup();
    this.currentPage = page;

    const appEl = document.getElementById('app');
    if (page !== 'profile') {
      appEl.innerHTML = renderNavbar(this.user, this.partyPot) + '<div id="page-content">' + Loader.pageHTML() + '</div>';
      setActiveNav(page);
    }

    await this.fetchPartyPot();

    let content = '';
    try {
      if (page === 'dashboard') content = await Dashboard.render();
      else if (page === 'leaderboard') content = await LeaderboardPage.render();
      else if (page === 'my-bets' && !this.user.is_admin) content = await MyBetsPage.render();
      else if (page === 'profile') content = ProfilePage.render();
      else if (page === 'admin' && this.user.is_admin) content = await AdminPage.render();
      else content = await Dashboard.render();
    } catch (e) {
      content = `<div class="page"><div class="empty-state"><div class="icon">⚠️</div><p>Error: ${e.message}</p></div></div>`;
    }

    appEl.innerHTML = renderNavbar(this.user, this.partyPot) + content;
    setActiveNav(page);

    if (page === 'dashboard') Dashboard.startCountdowns();
  },

  async logout() {
    try { await API.logout(); } catch {}
    this.user = null;
    this.renderLogin();
    Toast.info('Logged out');
  }
};

document.addEventListener('DOMContentLoaded', () => App.init());
