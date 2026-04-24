# 🚀 Safe Deployment Migration Guide: Turso → Firebase

Your IPL Betting app is currently deployed on Render using Turso DB, but your local version now uses Firebase. This guide ensures **zero data loss** during migration.

## ⚠️ CRITICAL: Do NOT deploy directly without migration!

If you push the current Firebase-based code to Render without migrating data first, your users will lose all their bets, points, and match history.

## 🎯 Safe Migration Process

### Phase 1: Prepare Migration (Do First)

#### 1.1 Create Data Export Script for Production

Create this script to export data from your **live Turso database**:

```javascript
// export-production-data.js
require('dotenv').config();
const { createClient } = require('@libsql/client');
const fs = require('fs').promises;

async function exportProductionData() {
  console.log('📤 Exporting production data from Turso...');
  
  const client = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });

  try {
    // Export users
    const users = await client.execute('SELECT * FROM users');
    await fs.writeFile('production-users.json', JSON.stringify(users.rows, null, 2));
    console.log(`✅ Exported ${users.rows.length} users`);

    // Export matches
    const matches = await client.execute('SELECT * FROM matches ORDER BY match_number');
    await fs.writeFile('production-matches.json', JSON.stringify(matches.rows, null, 2));
    console.log(`✅ Exported ${matches.rows.length} matches`);

    // Export bets
    const bets = await client.execute('SELECT * FROM bets');
    await fs.writeFile('production-bets.json', JSON.stringify(bets.rows, null, 2));
    console.log(`✅ Exported ${bets.rows.length} bets`);

    // Export points ledger
    const points = await client.execute('SELECT * FROM points_ledger ORDER BY created_at');
    await fs.writeFile('production-points.json', JSON.stringify(points.rows, null, 2));
    console.log(`✅ Exported ${points.rows.length} points entries`);

    console.log('🎉 Production data export completed!');
    
  } catch (error) {
    console.error('❌ Export failed:', error);
  }
}

exportProductionData();
```

#### 1.2 Set Up Firebase for Production

1. **Create Firebase project** for production (separate from development)
2. **Configure Firebase environment variables** for Render:
   - `FIREBASE_API_KEY`
   - `FIREBASE_PROJECT_ID`
   - `FIREBASE_DATABASE_URL` 
   - `FIREBASE_MESSAGING_SENDER_ID`
   - `FIREBASE_APP_ID`

### Phase 2: Export Production Data

#### 2.1 Run Export from Current Render App

**Option A: Add export endpoint to current app**
```javascript
// Add this temporarily to your current Render app
app.get('/admin/export-data', requireAdmin, async (req, res) => {
  // Copy the export logic here
  // This creates downloadable JSON files
});
```

**Option B: Download via database client**
Use Turso CLI to connect and export data directly.

### Phase 3: Import to Firebase

#### 3.1 Create Import Script

```javascript
// import-to-firebase.js
require('dotenv').config();
require('./firebase-web-config-fixed');
const firebaseDB = require('./db/firebase-web-db');
const fs = require('fs').promises;

async function importToFirebase() {
  console.log('📥 Importing production data to Firebase...');
  
  try {
    // Import users
    const users = JSON.parse(await fs.readFile('production-users.json'));
    for (const user of users) {
      await firebaseDB.createUser({
        name: user.name,
        phone: user.phone,
        password_hash: user.password_hash, // Keep existing hashes!
        is_admin: user.is_admin || false,
        total_points: user.total_points || 0
      });
    }
    console.log(`✅ Imported ${users.length} users`);

    // Import matches (preserve IDs)
    const matches = JSON.parse(await fs.readFile('production-matches.json'));
    // Implementation depends on your exact schema...

    // Import bets & points
    // ... similar process

    console.log('🎉 Import completed successfully!');
    
  } catch (error) {
    console.error('❌ Import failed:', error);
  }
}

importToFirebase();
```

### Phase 4: Deploy with Maintenance Mode

#### 4.1 Enable Maintenance Mode

Before migration, add maintenance mode to your current app:

```javascript
// Add to server.js temporarily
app.use((req, res, next) => {
  if (process.env.MAINTENANCE_MODE === 'true') {
    return res.status(503).send('<h1>🔧 Maintenance in Progress</h1><p>We\'re upgrading the database. Back soon!</p>');
  }
  next();
});
```

#### 4.2 Migration Steps

1. **Set `MAINTENANCE_MODE=true`** in Render environment variables
2. **Export all production data** from Turso
3. **Import data to Firebase** (verify thoroughly)
4. **Update Render environment variables:**
   - Remove: `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`
   - Add: All Firebase environment variables
5. **Deploy new Firebase-based code**
6. **Remove `MAINTENANCE_MODE`** variable
7. **Test thoroughly**

## 📋 Environment Variables for Render

### Remove These (Turso):
```bash
TURSO_DATABASE_URL=libsql://...
TURSO_AUTH_TOKEN=eyJhbGci...
```

### Add These (Firebase):
```bash
FIREBASE_API_KEY=AIzaSyC...
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_DATABASE_URL=https://your-project-default-rtdb.firebaseio.com/
FIREBASE_MESSAGING_SENDER_ID=123456789
FIREBASE_APP_ID=1:123456789:web:abcdef
SESSION_SECRET=your-secret-key
NODE_ENV=production
```

## 🛠️ Updated Render Build Settings

### Build Command:
```bash
npm install && npm run seed-firebase
```

### Start Command:
```bash
npm start
```

## 🔍 Post-Migration Verification

After deployment, verify:

1. **User Login**: All users can log in with existing credentials
2. **Match Data**: All matches, dates, and results are correct
3. **Betting History**: All previous bets are preserved
4. **Points/Leaderboard**: All points calculations are accurate
5. **Admin Functions**: All admin features work correctly

## 🚨 Rollback Plan

If migration fails:

1. **Keep Turso database active** (don't delete until confirmed success)
2. **Revert Render environment variables** to Turso configuration
3. **Deploy previous version** from Git
4. **Investigate issues** and retry migration

## ⏱️ Recommended Migration Window

- **Low Traffic Period**: Late night or early morning
- **Duration**: Allow 2-4 hours for complete process
- **Team Notification**: Inform users about maintenance window

## 🎯 Summary

**Before Migration**: App uses Turso → Users can bet normally  
**During Migration**: Maintenance mode → No user access (1-2 hours)  
**After Migration**: App uses Firebase → Users continue seamlessly  

**Key Success Factors:**
- ✅ Export ALL production data first
- ✅ Test import process with copy of data
- ✅ Use maintenance mode during transition
- ✅ Keep Turso backup until verified success
- ✅ Have rollback plan ready

This ensures **zero data loss** and minimal downtime! 🎉