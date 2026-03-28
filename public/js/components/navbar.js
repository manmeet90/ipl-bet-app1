function renderNavbar(user, partyPot) {
  const isAdmin = user && user.is_admin;
  const potDisplay = typeof partyPot === 'number' ? partyPot : 0;
  return `
    <nav class="navbar">
      <div class="navbar-brand" onclick="App.navigate('dashboard')">
        <span>🏏</span> IPL Bet 2026
      </div>
      <div class="party-pot-banner">
        <span class="party-pot-label">Party Pot</span>
        <span class="party-pot-value">${potDisplay}</span>
        <span class="party-pot-unit">pts</span>
      </div>
      <div class="navbar-links">
        <button data-page="dashboard" onclick="App.navigate('dashboard')">Matches</button>
        <button data-page="leaderboard" onclick="App.navigate('leaderboard')">Leaderboard</button>
        ${!isAdmin ? '<button data-page="my-bets" onclick="App.navigate(\'my-bets\')">My Bets</button>' : ''}
        ${isAdmin ? '<button data-page="admin" onclick="App.navigate(\'admin\')">Admin</button>' : ''}
      </div>
      <div class="navbar-user">
        <span class="user-name">${user ? user.name : ''}</span>
        <button class="btn btn-ghost btn-sm" onclick="App.navigate('profile')">⚙</button>
        <button class="btn btn-ghost btn-sm" onclick="App.logout()">Logout</button>
      </div>
    </nav>
  `;
}

function setActiveNav(page) {
  document.querySelectorAll('.navbar-links button').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.page === page);
  });
}
