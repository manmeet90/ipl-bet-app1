# 🔧 Environment Variables for Render Deployment

## Required Firebase Web SDK Variables

Your app uses Firebase Web SDK (client-side), so you only need these environment variables:

```bash
# Firebase Web App Configuration
FIREBASE_API_KEY=AIzaSyC8tgF0_Hej7z6RFwofR9VQCqNqgU9D4xg
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_DATABASE_URL=https://your-project-default-rtdb.firebaseio.com/
FIREBASE_MESSAGING_SENDER_ID=588452939943
FIREBASE_APP_ID=1:588452939943:web:7a123456789abcdef123456

# Application Configuration
SESSION_SECRET=your-random-secret-key-here
NODE_ENV=production
```

## How to Get Firebase Web Config

1. **Go to Firebase Console**: https://console.firebase.google.com
2. **Select your project**
3. **Click Project Settings** (gear icon)
4. **Go to "Your apps" section**
5. **Select your web app** or click "Add app" → Web
6. **Copy the config values** from the `firebaseConfig` object:

```javascript
// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyC...",           // → FIREBASE_API_KEY
  authDomain: "project.firebaseapp.com",
  databaseURL: "https://project-default-rtdb.firebaseio.com/",  // → FIREBASE_DATABASE_URL
  projectId: "your-project-id",   // → FIREBASE_PROJECT_ID
  storageBucket: "project.firebasestorage.app",
  messagingSenderId: "123456789", // → FIREBASE_MESSAGING_SENDER_ID
  appId: "1:123456789:web:abc123" // → FIREBASE_APP_ID
};
```

## What's NOT Needed

❌ **Service Account Keys** - Not used with Web SDK
❌ **FIREBASE_SERVICE_ACCOUNT_KEY** - Not needed
❌ **Admin SDK credentials** - Client-side app only

## Render Configuration

### Build Command:
```bash
npm install && npm run seed-firebase
```

### Start Command:
```bash
npm start
```

### Environment Variables to Remove (from Turso):
```bash
TURSO_DATABASE_URL
TURSO_AUTH_TOKEN
```

### Environment Variables to Add (Firebase):
Use the Firebase variables listed above.

## Security Notes

- ✅ Firebase Web SDK config is **safe to expose** in client-side code
- ✅ Database security is handled by **Firebase Rules**, not hidden credentials  
- ✅ No sensitive keys needed in environment variables
- ✅ Authentication is managed by your Express session system

Your Firebase Realtime Database rules should control access, not hidden API keys!