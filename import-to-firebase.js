require('dotenv').config();
require('./firebase-web-config-fixed');
const firebaseDB = require('./db/firebase-web-db');
const fs = require('fs').promises;

async function importToFirebase() {
  console.log('📥 Importing production data to Firebase...\n');
  
  try {
    // Check if export files exist
    const files = [
      'production-users.json',
      'production-matches.json', 
      'production-bets.json',
      'production-points.json'
    ];

    for (const file of files) {
      try {
        await fs.access(file);
      } catch (error) {
        console.error(`❌ Export file not found: ${file}`);
        console.error('   Please run export-production-data.js first');
        return;
      }
    }

    console.log('✅ All export files found');

    // Load export summary for verification
    let summary = {};
    try {
      summary = JSON.parse(await fs.readFile('production-export-summary.json', 'utf8'));
      console.log(`📊 Import Summary - Exported on: ${summary.export_date}`);
      console.log(`   Users: ${summary.counts.users}`);
      console.log(`   Matches: ${summary.counts.matches}`);
      console.log(`   Bets: ${summary.counts.bets}`);
      console.log(`   Points: ${summary.counts.points_entries}`);
    } catch (error) {
      console.log('⚠️  No summary file found, proceeding with import...');
    }

    // Import users
    console.log('\n👥 Importing users...');
    const users = JSON.parse(await fs.readFile('production-users.json', 'utf8'));
    let userIdMap = new Map(); // Map old IDs to new Firebase IDs
    
    for (const user of users) {
      const userData = {
        name: user.name,
        phone: user.phone,
        password_hash: user.password_hash, // Preserve existing password hashes!
        is_admin: user.is_admin || false,
        total_points: user.total_points || 0,
        created_at: user.created_at || new Date().toISOString()
      };
      
      const newUserId = await firebaseDB.createUser(userData);
      userIdMap.set(user.id, newUserId);
    }
    console.log(`✅ Imported ${users.length} users`);

    // Import matches
    console.log('\n🏏 Importing matches...');
    const matches = JSON.parse(await fs.readFile('production-matches.json', 'utf8'));
    let matchIdMap = new Map(); // Map old IDs to new Firebase IDs
    
    for (const match of matches) {
      const matchData = {
        match_number: match.match_number,
        team1: match.team_a || match.team1, // Handle different field names
        team2: match.team_b || match.team2,
        match_date: match.match_date,
        match_time: match.match_time,
        match_type: match.match_type || 'League',
        venue: match.venue,
        bet_points: match.bet_points,
        bet_cutoff: match.bet_cutoff,
        is_completed: match.is_completed || false,
        result: match.result || null,
        status: match.status || null,
        created_at: match.created_at || new Date().toISOString()
      };
      
      const newMatchId = await firebaseDB.createMatch(matchData);
      matchIdMap.set(match.id, newMatchId);
    }
    console.log(`✅ Imported ${matches.length} matches`);

    // Import bets
    console.log('\n🎯 Importing bets...');
    const bets = JSON.parse(await fs.readFile('production-bets.json', 'utf8'));
    
    for (const bet of bets) {
      const newUserId = userIdMap.get(bet.user_id);
      const newMatchId = matchIdMap.get(bet.match_id);
      
      if (!newUserId || !newMatchId) {
        console.warn(`⚠️  Skipping bet: missing user (${bet.user_id}) or match (${bet.match_id})`);
        continue;
      }
      
      const betData = {
        predicted_team: bet.prediction || bet.predicted_team,
        created_at: bet.created_at,
        updated_at: bet.updated_at || bet.created_at
      };
      
      await firebaseDB.createOrUpdateBet(newUserId, newMatchId, betData);
    }
    console.log(`✅ Imported ${bets.length} bets`);

    // Import points ledger
    console.log('\n💰 Importing points ledger...');
    const points = JSON.parse(await fs.readFile('production-points.json', 'utf8'));
    
    for (const point of points) {
      const newUserId = userIdMap.get(point.user_id);
      const newMatchId = matchIdMap.get(point.match_id);
      
      if (!newUserId) {
        console.warn(`⚠️  Skipping points entry: missing user (${point.user_id})`);
        continue;
      }
      
      const pointsData = {
        user_id: newUserId,
        match_id: newMatchId, // May be null for some entries
        points: point.points,
        description: point.description,
        type: point.type,
        created_at: point.created_at
      };
      
      await firebaseDB.addPointsEntry(pointsData);
    }
    console.log(`✅ Imported ${points.length} points entries`);

    // Create import log
    const importLog = {
      import_date: new Date().toISOString(),
      source_export_date: summary.export_date,
      imported_counts: {
        users: users.length,
        matches: matches.length,
        bets: bets.length,
        points_entries: points.length
      },
      id_mappings: {
        users: Object.fromEntries(userIdMap),
        matches: Object.fromEntries(matchIdMap)
      }
    };

    await fs.writeFile('firebase-import-log.json', JSON.stringify(importLog, null, 2));

    console.log('\n🎉 Import to Firebase completed successfully!');
    console.log('\n📋 Verification Steps:');
    console.log('1. Check Firebase console for imported data');
    console.log('2. Test user login with existing credentials');
    console.log('3. Verify match data and betting history'); 
    console.log('4. Check leaderboard calculations');
    console.log('5. Test admin panel functions');
    
    console.log('\n📁 Import log saved to: firebase-import-log.json');
    
  } catch (error) {
    console.error('\n❌ Import failed:', error);
    console.error('\n🔧 Troubleshooting:');
    console.error('1. Verify Firebase credentials are correct');
    console.error('2. Check Firebase database permissions');
    console.error('3. Ensure export files have valid JSON format');
  }
}

console.log('🏏 IPL Betting App - Firebase Data Import');
console.log('==========================================');
importToFirebase();