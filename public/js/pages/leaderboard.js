const LeaderboardPage = {
  async render() {
    let data;
    try {
      data = await API.getLeaderboard();
    } catch (e) {
      return `<div class="page"><div class="empty-state"><div class="icon">⚠️</div><p>${e.message}</p></div></div>`;
    }

    const list = data.leaderboard;
    const partyPot = data.party_pot;
    const meId = App.user ? App.user.id : null;

    const rows = list.map(r => {
      const rankClass = r.rank === 1 ? 'rank-1' : r.rank === 2 ? 'rank-2' : r.rank === 3 ? 'rank-3' : 'rank-other';
      const medalEmoji = r.rank === 1 ? '👑' : r.rank === 2 ? '🥈' : r.rank === 3 ? '🥉' : '';
      const isMe = r.id === meId;
      const ptsClass = r.total_points > 0 ? 'points-positive' : r.total_points < 0 ? 'points-negative' : 'points-zero';

      return `
        <tr class="${isMe ? 'me' : ''} lb-row-clickable" onclick="LeaderboardPage.showUserDetail(${r.id}, '${r.name.replace(/'/g, "\\'")}')">
          <td><span class="rank-badge ${rankClass}">${medalEmoji || r.rank}</span></td>
          <td style="font-weight:${isMe ? 800 : 600}">${r.name} ${isMe ? '(You)' : ''}</td>
          <td class="points-value ${ptsClass}">${r.total_points > 0 ? '+' : ''}${r.total_points}</td>
          <td style="color:var(--text-muted)">${r.matches_settled}</td>
        </tr>
      `;
    }).join('');

    const myEntry = list.find(r => r.id === meId);
    const myRankHTML = myEntry ? `
      <div style="display:flex;gap:20px;align-items:center;justify-content:center;margin-bottom:24px;
        padding:18px 28px;border-radius:16px;
        background:var(--bg-card);
        border:1px solid var(--border-main);box-shadow:var(--shadow-md);">
        <div style="text-align:center">
          <div style="font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:1.5px;color:var(--text-muted);margin-bottom:4px">Your Rank</div>
          <div style="font-size:32px;font-weight:800;color:var(--accent-gold);font-family:var(--font-display)">#${myEntry.rank}</div>
        </div>
        <div style="width:1px;height:48px;background:var(--border-main)"></div>
        <div style="text-align:center">
          <div style="font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:1.5px;color:var(--text-muted);margin-bottom:4px">Points</div>
          <div class="points-value ${myEntry.total_points > 0 ? 'points-positive' : myEntry.total_points < 0 ? 'points-negative' : 'points-zero'}"
            style="font-size:28px;font-family:var(--font-display)">${myEntry.total_points > 0 ? '+' : ''}${myEntry.total_points}</div>
        </div>
        <div style="width:1px;height:48px;background:var(--border-main)"></div>
        <div style="text-align:center">
          <div style="font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:1.5px;color:var(--text-muted);margin-bottom:4px">Matches</div>
          <div style="font-size:28px;font-weight:800;color:var(--text-primary);font-family:var(--font-display)">${myEntry.matches_settled}</div>
        </div>
      </div>
    ` : '';

    return `
      <div class="page">
        <div class="page-title">🏆 Leaderboard</div>
        ${list.length === 0 ? '<div class="empty-state"><div class="icon">📊</div><p>No points settled yet. Check back after the first match!</p></div>' : `
        ${myRankHTML}
        <table class="leaderboard-table">
          <thead>
            <tr><th>Rank</th><th>Player</th><th>Points</th><th>Matches</th></tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
        <p style="text-align:center;margin-top:12px;font-size:12px;color:var(--text-muted);font-weight:600;">Tap a player to see their match-by-match breakdown</p>
        `}
      </div>
    `;
  },

  async showUserDetail(userId, userName) {
    const existing = document.querySelector('.modal-overlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal" style="max-width:600px;">
        <h3>${userName}'s Bet History</h3>
        <div id="user-detail-content" style="text-align:center;padding:20px;color:var(--text-muted);">Loading...</div>
        <div class="modal-actions">
          <button class="btn btn-ghost" onclick="this.closest('.modal-overlay').remove()">Close</button>
        </div>
      </div>
    `;
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
    document.body.appendChild(overlay);

    try {
      const data = await API.getUserHistory(userId);
      const container = document.getElementById('user-detail-content');
      if (!container) return;

      if (data.matches.length === 0) {
        container.innerHTML = '<div class="empty-state" style="padding:20px;"><div class="icon">📊</div><p>No settled matches yet</p></div>';
        return;
      }

      const ptsClass = data.total_points > 0 ? 'points-positive' : data.total_points < 0 ? 'points-negative' : 'points-zero';
      const summaryHTML = `
        <div class="user-detail-summary">
          <div class="user-detail-stat">
            <span class="user-detail-stat-label">Total</span>
            <span class="points-value ${ptsClass}">${data.total_points > 0 ? '+' : ''}${data.total_points}</span>
          </div>
          <div class="user-detail-stat">
            <span class="user-detail-stat-label">Matches</span>
            <span style="font-weight:800;font-size:17px;color:var(--text-primary)">${data.matches.length}</span>
          </div>
          <div class="user-detail-stat">
            <span class="user-detail-stat-label">Wins</span>
            <span style="font-weight:800;font-size:17px;color:var(--accent-green)">${data.matches.filter(m => m.reason === 'win').length}</span>
          </div>
        </div>
      `;

      const rows = data.matches.map(m => {
        const pickLabel = m.prediction_label || '<span style="color:var(--accent-orange)">No Bet</span>';
        const deltaPts = m.points_delta;
        const deltaClass = deltaPts > 0 ? 'points-positive' : deltaPts < 0 ? 'points-negative' : 'points-zero';
        const deltaStr = deltaPts > 0 ? `+${deltaPts}` : `${deltaPts}`;
        const reasonIcon = m.reason === 'win' ? '✅' : m.reason === 'no_bet' ? '⚠️' : '❌';

        return `
          <tr>
            <td style="white-space:nowrap;font-size:12px;color:var(--text-muted);">#${m.match_number}</td>
            <td>
              <div style="font-weight:700;font-size:13px;">${m.team_a} vs ${m.team_b}</div>
              <div style="font-size:11px;color:var(--text-muted);">${formatDate(m.match_date)} &middot; Won: ${m.winner_label}</div>
            </td>
            <td style="font-size:13px;font-weight:700;">${reasonIcon} ${pickLabel}</td>
            <td class="points-value ${deltaClass}" style="font-size:15px;text-align:right;">${deltaStr}</td>
          </tr>
        `;
      }).join('');

      container.innerHTML = `
        ${summaryHTML}
        <div class="user-detail-matches">
          <table class="user-detail-table">
            <thead><tr><th>#</th><th>Match</th><th>Bet</th><th style="text-align:right">Pts</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      `;
    } catch (e) {
      const container = document.getElementById('user-detail-content');
      if (container) container.innerHTML = `<p style="color:var(--accent-red);">${e.message}</p>`;
    }
  }
};
