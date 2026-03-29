const TEAM_FULL = {
  RCB: 'Royal Challengers Bengaluru', SRH: 'Sunrisers Hyderabad',
  MI: 'Mumbai Indians', KKR: 'Kolkata Knight Riders',
  RR: 'Rajasthan Royals', CSK: 'Chennai Super Kings',
  PBKS: 'Punjab Kings', GT: 'Gujarat Titans',
  LSG: 'Lucknow Super Giants', DC: 'Delhi Capitals', TBD: 'TBD'
};

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
}

function getCountdown(cutoffStr) {
  const now = new Date();
  const cutoff = new Date(cutoffStr);
  const diff = cutoff - now;
  if (diff <= 0) return null;
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  if (h > 24) return `${Math.floor(h / 24)}d ${h % 24}h`;
  return `${h}h ${m}m ${s}s`;
}

function renderMatchCard(match, options = {}) {
  const { showBets = true, compact = false } = options;
  const isClosed = match.betting_closed;
  const isCompleted = match.is_completed;
  const isAbandoned = match.result === 'abandoned';

  let statusClass = 'open';
  let statusText = 'Betting Open';
  if (isCompleted && isAbandoned) { statusClass = 'closed'; statusText = 'Abandoned'; }
  else if (isCompleted) { statusClass = 'completed'; statusText = 'Completed'; }
  else if (isClosed) { statusClass = 'closed'; statusText = 'Betting Closed'; }

  const countdown = !isClosed ? getCountdown(match.bet_cutoff) : null;

  let resultWinner = '';
  if (isCompleted && match.result) {
    if (isAbandoned) resultWinner = 'Abandoned';
    else resultWinner = match.result === 'team_a' ? match.team_a :
                        match.result === 'team_b' ? match.team_b : 'Tie';
  }

  const isAdmin = App.user && App.user.is_admin;

  let betSelectorHTML = '';
  if (showBets && !isCompleted && !isClosed && !isAdmin) {
    betSelectorHTML = `
      <div class="bet-selector">
        <button class="bet-btn ${match.my_bet === 'team_a' ? 'selected' : ''}"
          onclick="event.stopPropagation(); Dashboard.placeBet(${match.id}, 'team_a', this)">${match.team_a}</button>
        <button class="bet-btn ${match.my_bet === 'tie' ? 'selected' : ''}"
          onclick="event.stopPropagation(); Dashboard.placeBet(${match.id}, 'tie', this)">Tie</button>
        <button class="bet-btn ${match.my_bet === 'team_b' ? 'selected' : ''}"
          onclick="event.stopPropagation(); Dashboard.placeBet(${match.id}, 'team_b', this)">${match.team_b}</button>
      </div>
    `;
  }

  let resultBannerHTML = '';
  if (isCompleted) {
    if (isAbandoned) {
      resultBannerHTML = `
        <div class="result-banner neutral">
          🚫 Match Abandoned — No points affected
        </div>
      `;
    } else {
      const userBet = match.my_bet;
      const won = userBet === match.result;
      const pts = match.points_earned;

      resultBannerHTML = `
        <div class="result-banner ${won ? 'win' : (userBet ? 'loss' : 'neutral')}">
          🏆 Winner: ${resultWinner}
          ${pts !== undefined && pts !== null ? ` &nbsp;|&nbsp; You: ${pts > 0 ? '+' : ''}${pts} pts` : ''}
        </div>
      `;
    }
  }

  let betRevealHTML = '';
  if (showBets && (isClosed || isCompleted) && match.all_bets) {
    const groups = { team_a: [], team_b: [], tie: [], no_bet: [] };
    const allBets = match.all_bets || [];
    for (const b of allBets) {
      if (groups[b.prediction]) groups[b.prediction].push(b.name);
    }

    betRevealHTML = `
      <div class="bet-reveal">
        <div class="bet-reveal-title">📊 Bets Breakdown</div>
        <div class="bet-reveal-group">
          <span class="bet-reveal-label">${match.team_a}:</span>
          ${groups.team_a.length ? groups.team_a.map(n => `<span class="bet-chip team_a">${n}</span>`).join('') : '<span class="bet-chip no-bet">—</span>'}
        </div>
        <div class="bet-reveal-group">
          <span class="bet-reveal-label">${match.team_b}:</span>
          ${groups.team_b.length ? groups.team_b.map(n => `<span class="bet-chip team_b">${n}</span>`).join('') : '<span class="bet-chip no-bet">—</span>'}
        </div>
        <div class="bet-reveal-group">
          <span class="bet-reveal-label">Tie:</span>
          ${groups.tie.length ? groups.tie.map(n => `<span class="bet-chip tie">${n}</span>`).join('') : '<span class="bet-chip no-bet">—</span>'}
        </div>
      </div>
    `;
  } else if (showBets && !isClosed && !isCompleted) {
    betRevealHTML = `
      <div class="bet-locked">🔒 Bets hidden until cutoff</div>
    `;
  }

  return `
    <div class="match-card ${isCompleted ? 'completed' : ''} team-bg-${match.team_a}" data-match-id="${match.id}">
      <div class="match-card-header">
        <span class="match-number">Match ${match.match_number} · ${match.match_type}</span>
        <span class="match-status ${statusClass}">${statusText}</span>
      </div>
      <div class="match-teams">
        <div class="team">
          <span class="team-abbr team-${match.team_a}">${match.team_a}</span>
          <span class="team-name">${TEAM_FULL[match.team_a] || match.team_a}</span>
        </div>
        <div class="match-vs">VS</div>
        <div class="team">
          <span class="team-abbr team-${match.team_b}">${match.team_b}</span>
          <span class="team-name">${TEAM_FULL[match.team_b] || match.team_b}</span>
        </div>
      </div>
      <div class="match-info">
        <span>📅 ${formatDate(match.match_date)}</span>
        <span>⏰ ${match.match_time}</span>
      </div>
      <div class="match-points">
        ⚡ ${match.bet_points} points
        ${countdown ? `<span class="countdown">&nbsp;· ⏳ ${countdown}</span>` : ''}
      </div>
      ${betSelectorHTML}
      ${resultBannerHTML}
      ${betRevealHTML}
    </div>
  `;
}
