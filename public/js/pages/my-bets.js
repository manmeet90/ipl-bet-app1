const MyBetsPage = {
  async render() {
    let bets;
    try {
      bets = await API.myBets();
    } catch (e) {
      return `<div class="page"><div class="empty-state"><div class="icon">⚠️</div><p>${e.message}</p></div></div>`;
    }

    if (bets.length === 0) {
      return `
        <div class="page">
          <div class="page-title">🎯 My Bets</div>
          <div class="empty-state">
            <div class="icon">🎲</div>
            <p>You haven't placed any bets yet. Go to Matches!</p>
          </div>
        </div>
      `;
    }

    const rows = bets.map(b => {
      const noBet = !b.prediction;
      const pickLabel = noBet ? 'No Bet Placed' :
                        b.prediction === 'team_a' ? b.team_a :
                        b.prediction === 'team_b' ? b.team_b : 'Tie';
      let resultLabel = 'Pending';
      let resultClass = '';
      if (b.is_completed) {
        if (b.points_earned > 0) { resultLabel = `+${b.points_earned} pts`; resultClass = 'points-positive'; }
        else if (b.points_earned < 0) { resultLabel = `${b.points_earned} pts`; resultClass = 'points-negative'; }
        else { resultLabel = '0 pts'; resultClass = 'points-zero'; }
      }

      return `
        <div class="bet-history-card${noBet ? ' no-bet' : ''}">
          <div>
            <div class="bet-history-match">
              Match ${b.match_number}: ${b.team_a} vs ${b.team_b}
              <small>${formatDate(b.match_date)}</small>
            </div>
            <div class="bet-history-pick${noBet ? ' missed' : ''}">
              ${noBet ? '⚠️ No Bet Placed' : `Your pick: <strong>${pickLabel}</strong>`}
            </div>
          </div>
          <div class="bet-history-result ${resultClass}">${resultLabel}</div>
        </div>
      `;
    }).join('');

    return `
      <div class="page">
        <div class="page-title">🎯 My Bets</div>
        ${rows}
      </div>
    `;
  }
};
