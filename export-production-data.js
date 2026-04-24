require('dotenv').config();
const { createClient } = require('@libsql/client');
const fs = require('fs').promises;

async function exportProductionData() {
  console.log('📤 Exporting production data from Turso...\n');
  
  // Validate required environment variables
  if (!process.env.TURSO_DATABASE_URL || !process.env.TURSO_AUTH_TOKEN) {
    console.error('❌ Missing Turso environment variables:');
    console.error('   TURSO_DATABASE_URL and TURSO_AUTH_TOKEN are required');
    console.error('   Add these to your .env file with your production Turso credentials');
    return;
  }

  const client = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });

  try {
    console.log('🔗 Connecting to Turso database...');
    
    // Test connection
    await client.execute('SELECT 1');
    console.log('✅ Connected successfully');

    // Export users
    console.log('\n👥 Exporting users...');
    const usersResult = await client.execute('SELECT * FROM users ORDER BY id');
    await fs.writeFile('production-users.json', JSON.stringify(usersResult.rows, null, 2));
    console.log(`✅ Exported ${usersResult.rows.length} users`);
    
    if (usersResult.rows.length > 0) {
      const adminCount = usersResult.rows.filter(u => u.is_admin).length;
      console.log(`   - Admin users: ${adminCount}`);
      console.log(`   - Regular users: ${usersResult.rows.length - adminCount}`);
    }

    // Export matches
    console.log('\n🏏 Exporting matches...');
    const matchesResult = await client.execute('SELECT * FROM matches ORDER BY match_number');
    await fs.writeFile('production-matches.json', JSON.stringify(matchesResult.rows, null, 2));
    console.log(`✅ Exported ${matchesResult.rows.length} matches`);
    
    if (matchesResult.rows.length > 0) {
      const completedCount = matchesResult.rows.filter(m => m.is_completed).length;
      console.log(`   - Completed matches: ${completedCount}`);
      console.log(`   - Pending matches: ${matchesResult.rows.length - completedCount}`);
    }

    // Export bets
    console.log('\n🎯 Exporting bets...');
    const betsResult = await client.execute(`
      SELECT b.*, u.name as user_name, m.match_number 
      FROM bets b 
      LEFT JOIN users u ON b.user_id = u.id 
      LEFT JOIN matches m ON b.match_id = m.id 
      ORDER BY b.created_at
    `);
    await fs.writeFile('production-bets.json', JSON.stringify(betsResult.rows, null, 2));
    console.log(`✅ Exported ${betsResult.rows.length} bets`);
    
    if (betsResult.rows.length > 0) {
      const uniqueUsers = new Set(betsResult.rows.map(b => b.user_id)).size;
      const uniqueMatches = new Set(betsResult.rows.map(b => b.match_id)).size;
      console.log(`   - Bets from ${uniqueUsers} users`);
      console.log(`   - Bets on ${uniqueMatches} matches`);
    }

    // Export points ledger
    console.log('\n💰 Exporting points ledger...');
    const pointsResult = await client.execute(`
      SELECT p.*, u.name as user_name, m.match_number 
      FROM points_ledger p 
      LEFT JOIN users u ON p.user_id = u.id 
      LEFT JOIN matches m ON p.match_id = m.id 
      ORDER BY p.created_at
    `);
    await fs.writeFile('production-points.json', JSON.stringify(pointsResult.rows, null, 2));
    console.log(`✅ Exported ${pointsResult.rows.length} points entries`);
    
    if (pointsResult.rows.length > 0) {
      const totalPointsAwarded = pointsResult.rows.reduce((sum, p) => sum + (parseInt(p.points) || 0), 0);
      console.log(`   - Total points in ledger: ${totalPointsAwarded}`);
    }

    // Create summary file
    const summary = {
      export_date: new Date().toISOString(),
      database_url: process.env.TURSO_DATABASE_URL,
      counts: {
        users: usersResult.rows.length,
        matches: matchesResult.rows.length,
        bets: betsResult.rows.length,
        points_entries: pointsResult.rows.length
      },
      files_created: [
        'production-users.json',
        'production-matches.json', 
        'production-bets.json',
        'production-points.json',
        'production-export-summary.json'
      ]
    };

    await fs.writeFile('production-export-summary.json', JSON.stringify(summary, null, 2));

    console.log('\n🎉 Production data export completed successfully!');
    console.log('\n📁 Files created:');
    summary.files_created.forEach(file => console.log(`   ${file}`));
    
    console.log('\n🚀 Next steps:');
    console.log('1. Verify the exported JSON files contain correct data');
    console.log('2. Set up Firebase production environment'); 
    console.log('3. Run import-to-firebase.js to import this data');
    console.log('4. Test thoroughly before deploying to Render');
    
  } catch (error) {
    console.error('\n❌ Export failed:', error);
    console.error('\n🔧 Troubleshooting:');
    console.error('1. Verify TURSO_DATABASE_URL and TURSO_AUTH_TOKEN are correct');
    console.error('2. Check if database is accessible');
    console.error('3. Ensure you have read permissions');
  } finally {
    client.close();
  }
}

console.log('🏏 IPL Betting App - Production Data Export');
console.log('==========================================');
exportProductionData();