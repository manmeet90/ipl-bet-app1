const db = require('./database');
const bcrypt = require('bcryptjs');

const TEAM_ABBR = {
  'Royal Challengers Bengaluru': 'RCB',
  'Sunrisers Hyderabad': 'SRH',
  'Mumbai Indians': 'MI',
  'Kolkata Knight Riders': 'KKR',
  'Rajasthan Royals': 'RR',
  'Chennai Super Kings': 'CSK',
  'Punjab Kings': 'PBKS',
  'Gujarat Titans': 'GT',
  'Lucknow Super Giants': 'LSG',
  'Delhi Capitals': 'DC'
};

const matches = [
  // Match 1-10
  { n: 1,  a: 'RCB', b: 'SRH',  date: '2026-03-28', time: '7:30 PM', venue: 'M Chinnaswamy Stadium, Bengaluru' },
  { n: 2,  a: 'MI',  b: 'KKR',  date: '2026-03-29', time: '7:30 PM', venue: 'Wankhede Stadium, Mumbai' },
  { n: 3,  a: 'RR',  b: 'CSK',  date: '2026-03-30', time: '7:30 PM', venue: 'ACA Stadium, Guwahati' },
  { n: 4,  a: 'PBKS',b: 'GT',   date: '2026-03-31', time: '7:30 PM', venue: 'IS Bindra Stadium, Mohali' },
  { n: 5,  a: 'LSG', b: 'DC',   date: '2026-04-01', time: '7:30 PM', venue: 'BRSABV Ekana Stadium, Lucknow' },
  { n: 6,  a: 'KKR', b: 'SRH',  date: '2026-04-02', time: '7:30 PM', venue: 'Eden Gardens, Kolkata' },
  { n: 7,  a: 'CSK', b: 'PBKS', date: '2026-04-03', time: '7:30 PM', venue: 'MA Chidambaram Stadium, Chennai' },
  { n: 8,  a: 'DC',  b: 'MI',   date: '2026-04-04', time: '3:30 PM', venue: 'Arun Jaitley Stadium, Delhi' },
  { n: 9,  a: 'GT',  b: 'RR',   date: '2026-04-04', time: '7:30 PM', venue: 'Narendra Modi Stadium, Ahmedabad' },
  { n: 10, a: 'SRH', b: 'LSG',  date: '2026-04-05', time: '3:30 PM', venue: 'Rajiv Gandhi Intl Stadium, Hyderabad' },

  // Match 11-20
  { n: 11, a: 'RCB', b: 'CSK',  date: '2026-04-05', time: '7:30 PM', venue: 'M Chinnaswamy Stadium, Bengaluru' },
  { n: 12, a: 'KKR', b: 'PBKS', date: '2026-04-06', time: '7:30 PM', venue: 'Eden Gardens, Kolkata' },
  { n: 13, a: 'RR',  b: 'MI',   date: '2026-04-07', time: '7:30 PM', venue: 'Sawai Mansingh Stadium, Jaipur' },
  { n: 14, a: 'DC',  b: 'GT',   date: '2026-04-08', time: '7:30 PM', venue: 'Arun Jaitley Stadium, Delhi' },
  { n: 15, a: 'KKR', b: 'LSG',  date: '2026-04-09', time: '7:30 PM', venue: 'Eden Gardens, Kolkata' },
  { n: 16, a: 'RR',  b: 'RCB',  date: '2026-04-10', time: '7:30 PM', venue: 'Sawai Mansingh Stadium, Jaipur' },
  { n: 17, a: 'PBKS',b: 'SRH',  date: '2026-04-11', time: '3:30 PM', venue: 'HPCA Stadium, Dharamsala' },
  { n: 18, a: 'CSK', b: 'DC',   date: '2026-04-11', time: '7:30 PM', venue: 'MA Chidambaram Stadium, Chennai' },
  { n: 19, a: 'LSG', b: 'GT',   date: '2026-04-12', time: '3:30 PM', venue: 'BRSABV Ekana Stadium, Lucknow' },
  { n: 20, a: 'MI',  b: 'RCB',  date: '2026-04-12', time: '7:30 PM', venue: 'Wankhede Stadium, Mumbai' },

  // Match 21-30
  { n: 21, a: 'SRH', b: 'RR',   date: '2026-04-13', time: '7:30 PM', venue: 'Rajiv Gandhi Intl Stadium, Hyderabad' },
  { n: 22, a: 'CSK', b: 'KKR',  date: '2026-04-14', time: '7:30 PM', venue: 'MA Chidambaram Stadium, Chennai' },
  { n: 23, a: 'RCB', b: 'LSG',  date: '2026-04-15', time: '7:30 PM', venue: 'M Chinnaswamy Stadium, Bengaluru' },
  { n: 24, a: 'MI',  b: 'PBKS', date: '2026-04-16', time: '7:30 PM', venue: 'Wankhede Stadium, Mumbai' },
  { n: 25, a: 'GT',  b: 'KKR',  date: '2026-04-17', time: '7:30 PM', venue: 'Narendra Modi Stadium, Ahmedabad' },
  { n: 26, a: 'RCB', b: 'DC',   date: '2026-04-18', time: '3:30 PM', venue: 'M Chinnaswamy Stadium, Bengaluru' },
  { n: 27, a: 'SRH', b: 'CSK',  date: '2026-04-18', time: '7:30 PM', venue: 'Rajiv Gandhi Intl Stadium, Hyderabad' },
  { n: 28, a: 'KKR', b: 'RR',   date: '2026-04-19', time: '3:30 PM', venue: 'Eden Gardens, Kolkata' },
  { n: 29, a: 'PBKS',b: 'LSG',  date: '2026-04-19', time: '7:30 PM', venue: 'IS Bindra Stadium, Mohali' },
  { n: 30, a: 'GT',  b: 'MI',   date: '2026-04-20', time: '7:30 PM', venue: 'Narendra Modi Stadium, Ahmedabad' },

  // Match 31-40
  { n: 31, a: 'SRH', b: 'DC',   date: '2026-04-21', time: '7:30 PM', venue: 'Rajiv Gandhi Intl Stadium, Hyderabad' },
  { n: 32, a: 'LSG', b: 'RR',   date: '2026-04-22', time: '7:30 PM', venue: 'BRSABV Ekana Stadium, Lucknow' },
  { n: 33, a: 'MI',  b: 'CSK',  date: '2026-04-23', time: '7:30 PM', venue: 'Wankhede Stadium, Mumbai' },
  { n: 34, a: 'RCB', b: 'GT',   date: '2026-04-24', time: '7:30 PM', venue: 'M Chinnaswamy Stadium, Bengaluru' },
  { n: 35, a: 'DC',  b: 'PBKS', date: '2026-04-25', time: '3:30 PM', venue: 'Arun Jaitley Stadium, Delhi' },
  { n: 36, a: 'RR',  b: 'SRH',  date: '2026-04-25', time: '7:30 PM', venue: 'Sawai Mansingh Stadium, Jaipur' },
  { n: 37, a: 'GT',  b: 'CSK',  date: '2026-04-26', time: '3:30 PM', venue: 'Narendra Modi Stadium, Ahmedabad' },
  { n: 38, a: 'LSG', b: 'KKR',  date: '2026-04-26', time: '7:30 PM', venue: 'BRSABV Ekana Stadium, Lucknow' },
  { n: 39, a: 'DC',  b: 'RCB',  date: '2026-04-27', time: '7:30 PM', venue: 'Arun Jaitley Stadium, Delhi' },
  { n: 40, a: 'PBKS',b: 'RR',   date: '2026-04-28', time: '7:30 PM', venue: 'HPCA Stadium, Dharamsala' },

  // Match 41-50
  { n: 41, a: 'MI',  b: 'SRH',  date: '2026-04-29', time: '7:30 PM', venue: 'Wankhede Stadium, Mumbai' },
  { n: 42, a: 'GT',  b: 'RCB',  date: '2026-04-30', time: '7:30 PM', venue: 'Narendra Modi Stadium, Ahmedabad' },
  { n: 43, a: 'RR',  b: 'DC',   date: '2026-05-01', time: '7:30 PM', venue: 'Sawai Mansingh Stadium, Jaipur' },
  { n: 44, a: 'CSK', b: 'MI',   date: '2026-05-02', time: '7:30 PM', venue: 'MA Chidambaram Stadium, Chennai' },
  { n: 45, a: 'SRH', b: 'KKR',  date: '2026-05-03', time: '3:30 PM', venue: 'Rajiv Gandhi Intl Stadium, Hyderabad' },
  { n: 46, a: 'GT',  b: 'PBKS', date: '2026-05-03', time: '7:30 PM', venue: 'Narendra Modi Stadium, Ahmedabad' },
  { n: 47, a: 'MI',  b: 'LSG',  date: '2026-05-04', time: '7:30 PM', venue: 'Wankhede Stadium, Mumbai' },
  { n: 48, a: 'DC',  b: 'CSK',  date: '2026-05-05', time: '7:30 PM', venue: 'Arun Jaitley Stadium, Delhi' },
  { n: 49, a: 'SRH', b: 'PBKS', date: '2026-05-06', time: '7:30 PM', venue: 'Rajiv Gandhi Intl Stadium, Hyderabad' },
  { n: 50, a: 'LSG', b: 'RCB',  date: '2026-05-07', time: '7:30 PM', venue: 'BRSABV Ekana Stadium, Lucknow' },

  // Match 51-60
  { n: 51, a: 'DC',  b: 'KKR',  date: '2026-05-08', time: '7:30 PM', venue: 'Arun Jaitley Stadium, Delhi' },
  { n: 52, a: 'RR',  b: 'GT',   date: '2026-05-09', time: '7:30 PM', venue: 'Sawai Mansingh Stadium, Jaipur' },
  { n: 53, a: 'CSK', b: 'LSG',  date: '2026-05-10', time: '3:30 PM', venue: 'MA Chidambaram Stadium, Chennai' },
  { n: 54, a: 'RCB', b: 'MI',   date: '2026-05-10', time: '7:30 PM', venue: 'M Chinnaswamy Stadium, Bengaluru' },
  { n: 55, a: 'PBKS',b: 'DC',   date: '2026-05-11', time: '7:30 PM', venue: 'IS Bindra Stadium, Mohali' },
  { n: 56, a: 'GT',  b: 'SRH',  date: '2026-05-12', time: '7:30 PM', venue: 'Narendra Modi Stadium, Ahmedabad' },
  { n: 57, a: 'RCB', b: 'KKR',  date: '2026-05-13', time: '7:30 PM', venue: 'M Chinnaswamy Stadium, Bengaluru' },
  { n: 58, a: 'PBKS',b: 'MI',   date: '2026-05-14', time: '7:30 PM', venue: 'HPCA Stadium, Dharamsala' },
  { n: 59, a: 'LSG', b: 'CSK',  date: '2026-05-15', time: '7:30 PM', venue: 'BRSABV Ekana Stadium, Lucknow' },
  { n: 60, a: 'KKR', b: 'GT',   date: '2026-05-16', time: '7:30 PM', venue: 'Eden Gardens, Kolkata' },

  // Match 61-70
  { n: 61, a: 'PBKS',b: 'RCB',  date: '2026-05-17', time: '3:30 PM', venue: 'IS Bindra Stadium, Mohali' },
  { n: 62, a: 'DC',  b: 'RR',   date: '2026-05-17', time: '7:30 PM', venue: 'Arun Jaitley Stadium, Delhi' },
  { n: 63, a: 'CSK', b: 'SRH',  date: '2026-05-18', time: '7:30 PM', venue: 'MA Chidambaram Stadium, Chennai' },
  { n: 64, a: 'RR',  b: 'LSG',  date: '2026-05-19', time: '7:30 PM', venue: 'Sawai Mansingh Stadium, Jaipur' },
  { n: 65, a: 'KKR', b: 'MI',   date: '2026-05-20', time: '7:30 PM', venue: 'Eden Gardens, Kolkata' },
  { n: 66, a: 'CSK', b: 'GT',   date: '2026-05-21', time: '7:30 PM', venue: 'MA Chidambaram Stadium, Chennai' },
  { n: 67, a: 'SRH', b: 'RCB',  date: '2026-05-22', time: '7:30 PM', venue: 'Rajiv Gandhi Intl Stadium, Hyderabad' },
  { n: 68, a: 'LSG', b: 'PBKS', date: '2026-05-23', time: '7:30 PM', venue: 'BRSABV Ekana Stadium, Lucknow' },
  { n: 69, a: 'MI',  b: 'RR',   date: '2026-05-24', time: '3:30 PM', venue: 'Wankhede Stadium, Mumbai' },
  { n: 70, a: 'KKR', b: 'DC',   date: '2026-05-24', time: '7:30 PM', venue: 'Eden Gardens, Kolkata' },

  // Playoffs (TBD teams — use placeholders, admin will update)
  { n: 71, a: 'TBD', b: 'TBD',  date: '2026-05-26', time: '7:30 PM', venue: 'TBD', type: 'qualifier' },
  { n: 72, a: 'TBD', b: 'TBD',  date: '2026-05-27', time: '7:30 PM', venue: 'TBD', type: 'eliminator' },
  { n: 73, a: 'TBD', b: 'TBD',  date: '2026-05-29', time: '7:30 PM', venue: 'TBD', type: 'qualifier' },
  { n: 74, a: 'TBD', b: 'TBD',  date: '2026-05-31', time: '7:30 PM', venue: 'TBD', type: 'final' },
];

function seed() {
  const existingMatches = db.prepare('SELECT COUNT(*) as count FROM matches').get();
  if (existingMatches.count > 0) {
    console.log(`Database already has ${existingMatches.count} matches. Skipping seed.`);
  } else {
    const insert = db.prepare(`
      INSERT INTO matches (match_number, team_a, team_b, match_date, match_time, venue, match_type, bet_points, bet_cutoff)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const m of matches) {
      const matchType = m.type || 'league';
      let betPoints = 50;
      if (matchType === 'qualifier' || matchType === 'eliminator') betPoints = 100;
      if (matchType === 'final') betPoints = 250;
      const cutoff = `${m.date}T13:00:00+05:30`;
      insert.run(m.n, m.a, m.b, m.date, m.time, m.venue, matchType, betPoints, cutoff);
    }
    console.log(`Seeded ${matches.length} matches.`);
  }

  const existingAdmin = db.prepare("SELECT COUNT(*) as count FROM users WHERE phone = 'Admin'").get();
  if (existingAdmin.count === 0) {
    const hash = bcrypt.hashSync('Admin$123Admin!', 10);
    db.prepare('INSERT INTO users (name, phone, email, password_hash, is_admin) VALUES (?, ?, ?, ?, 1)')
      .run('Admin', 'Admin', 'admin@iplbet.com', hash);
    console.log('Admin user created.');
  } else {
    console.log('Admin user already exists.');
  }
}

seed();
if (process.env.TURSO_DATABASE_URL) {
  db.sync();
  console.log('Synced to Turso.');
}
console.log('Seed complete.');
