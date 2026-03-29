const Database = require('libsql');
const fs = require('fs');
const path = require('path');

let db;

const tursoUrl = process.env.TURSO_DATABASE_URL;
const tursoToken = process.env.TURSO_AUTH_TOKEN;

if (tursoUrl) {
  const replicaPath = path.join(__dirname, '..', 'data', 'local-replica.db');
  const dataDir = path.dirname(replicaPath);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  db = new Database(replicaPath, {
    syncUrl: tursoUrl,
    authToken: tursoToken,
  });
  db.sync();
  console.log('Turso embedded replica synced on startup');

  setInterval(() => {
    try { db.sync(); } catch (e) { console.error('Turso sync error:', e.message); }
  }, 60_000);
} else {
  const DB_PATH = path.join(__dirname, '..', 'data', 'ipl_bet.db');
  const dataDir = path.dirname(DB_PATH);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
}

const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
const statements = schema.split(';').map(s => s.trim()).filter(s => s.length > 0);
for (const stmt of statements) {
  db.exec(stmt);
}

module.exports = db;
