# 🚀 Deployment Migration Checklist

Follow this checklist to safely migrate your IPL Betting app from Turso to Firebase on Render without losing any user data.

## ✅ Pre-Migration Checklist

### 1. Preparation (1-2 days before)

- [ ] **Set up Firebase production project**
  - [ ] Create new Firebase project for production
  - [ ] Enable Realtime Database
  - [ ] Configure security rules
  - [ ] Get web app config (API key, project ID, etc.)
  
- [ ] **Test migration locally**
  - [ ] Add Turso credentials to local .env file
  - [ ] Run `node export-production-data.js`
  - [ ] Verify exported JSON files
  - [ ] Run `node import-to-firebase.js` 
  - [ ] Test app with imported data locally

- [ ] **Prepare Render environment variables**
  - [ ] `FIREBASE_API_KEY`
  - [ ] `FIREBASE_PROJECT_ID` 
  - [ ] `FIREBASE_DATABASE_URL`
  - [ ] `FIREBASE_MESSAGING_SENDER_ID`
  - [ ] `FIREBASE_APP_ID`
  - [ ] `SESSION_SECRET` (keep existing or generate new)
  - [ ] `NODE_ENV=production`

### 2. Backup & Safety (day of migration)

- [ ] **Create Turso backup**
  - [ ] Export database using Turso CLI: `turso db dump`
  - [ ] Store backup safely (don't delete until migration confirmed)

- [ ] **Notify users about maintenance**
  - [ ] Send notification about planned maintenance window
  - [ ] Estimated downtime: 1-2 hours

## 🔧 Migration Day Process

### Phase 1: Enable Maintenance Mode

- [ ] **Add maintenance mode to current app** (optional but recommended)
  ```javascript
  // Add to server.js temporarily
  app.use((req, res, next) => {
    if (process.env.MAINTENANCE_MODE === 'true') {
      return res.status(503).json({
        error: 'Maintenance in progress',
        message: 'We are upgrading our database. Please try again in 1-2 hours.'
      });
    }
    next();
  });
  ```

- [ ] **Deploy maintenance mode**
  - [ ] Add `MAINTENANCE_MODE=true` to Render environment variables
  - [ ] Verify users see maintenance message

### Phase 2: Data Migration

- [ ] **Export production data**
  - [ ] Run `node export-production-data.js` with production Turso credentials
  - [ ] Verify all JSON files created successfully
  - [ ] Check data counts match expectations

- [ ] **Import to Firebase**
  - [ ] Configure Firebase credentials for production
  - [ ] Run `node import-to-firebase.js`
  - [ ] Verify import success messages
  - [ ] Check Firebase console for imported data

### Phase 3: Deploy New Version

- [ ] **Update Render build settings**
  - [ ] Build Command: `npm install && npm run seed-firebase`
  - [ ] Start Command: `npm start`

- [ ] **Update environment variables in Render**
  - [ ] Remove: `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN` 
  - [ ] Add: All Firebase environment variables (from prep step)
  - [ ] Remove: `MAINTENANCE_MODE`

- [ ] **Deploy to Render**
  - [ ] Push Firebase-based code to GitHub
  - [ ] Trigger deployment on Render
  - [ ] Monitor deployment logs for errors

### Phase 4: Verification & Testing

- [ ] **Basic functionality test**
  - [ ] App loads successfully
  - [ ] No console errors
  - [ ] Database connection working

- [ ] **User authentication test**
  - [ ] Admin can log in with existing credentials
  - [ ] Regular users can log in
  - [ ] Session management works

- [ ] **Data integrity test**
  - [ ] All users present in admin panel
  - [ ] Match data correct (dates, teams, results)
  - [ ] Betting history preserved
  - [ ] Leaderboard shows correct points
  - [ ] All completed matches show results

- [ ] **Feature testing**
  - [ ] Users can place new bets
  - [ ] Admin can declare results
  - [ ] Points calculation works
  - [ ] Leaderboard updates correctly

## 🚨 Rollback Plan (if needed)

If migration fails or issues are found:

- [ ] **Immediate rollback**
  - [ ] Set `MAINTENANCE_MODE=true` 
  - [ ] Revert Render environment variables to Turso configuration
  - [ ] Deploy previous Git commit
  - [ ] Remove `MAINTENANCE_MODE`

- [ ] **Investigate and retry**
  - [ ] Check logs for specific errors
  - [ ] Fix issues in migration scripts
  - [ ] Plan retry during next maintenance window

## 📱 Post-Migration Communication

- [ ] **Notify users migration complete**
  - [ ] Send "all clear" message to users
  - [ ] Confirm app is back online

- [ ] **Monitor for 24-48 hours**
  - [ ] Watch for any error reports from users
  - [ ] Monitor database performance
  - [ ] Check logs for any issues

## 🗑️ Cleanup (after successful migration)

**Wait at least 1 week before cleanup to ensure no issues**

- [ ] **Remove Turso resources** (after confirming success)
  - [ ] Delete Turso database
  - [ ] Cancel Turso subscription if no longer needed

- [ ] **Clean up migration files**
  - [ ] Remove export/import scripts from production
  - [ ] Archive backup files safely

## 📞 Emergency Contacts

- **Technical Issues**: [Your contact info]
- **User Complaints**: [Support contact]
- **Database Problems**: [Firebase support / your backup plan]

## ⏱️ Estimated Timeline

- **Preparation**: 30 minutes
- **Data Export**: 10-15 minutes  
- **Data Import**: 15-30 minutes
- **Deployment**: 10-15 minutes
- **Testing**: 30-45 minutes
- **Total**: 1.5-2 hours

## 🎯 Success Criteria

Migration is successful when:
- ✅ All users can log in with existing passwords
- ✅ All betting history is preserved and visible
- ✅ Leaderboard shows correct points for all users
- ✅ All match data (including completed matches) is accurate
- ✅ New bets can be placed successfully
- ✅ Admin panel functions work correctly
- ✅ No data loss detected by users

**Remember: User data is precious! Take your time and verify each step thoroughly.** 🏆