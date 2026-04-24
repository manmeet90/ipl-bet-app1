require('dotenv').config();

// Fix for TLS certificate issues
process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = 0;

const { initializeApp } = require('firebase/app');
const { getDatabase, ref, set, get, push, update, remove, child, query, orderByChild, equalTo, orderByKey, onDisconnect } = require('firebase/database');

// Firebase web app configuration
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: `${process.env.FIREBASE_PROJECT_ID}.firebaseapp.com`,
  databaseURL: process.env.FIREBASE_DATABASE_URL,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: `${process.env.FIREBASE_PROJECT_ID}.firebasestorage.app`,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID
};

console.log('🔧 TLS certificate verification disabled for Firebase connectivity');
console.log('⚠️  WARNING: This bypasses SSL verification. Use only for development.');

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

// Helper function to generate push IDs for database entries
function generatePushId() {
  return push(child(ref(database), 'temp')).key;
}

// Helper function to get server timestamp (web SDK equivalent)
function getServerTimestamp() {
  return { '.sv': 'timestamp' };
}

module.exports = {
  app,
  database,
  ref,
  set,
  get,
  push,
  update,
  remove,
  child,
  query,
  orderByChild,
  equalTo,
  orderByKey,
  onDisconnect,
  generatePushId,
  getServerTimestamp
};