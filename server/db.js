/**
 * Database Module (sql.js — pure WASM SQLite)
 * 
 * Provides persistent scan history storage.
 * Uses sql.js which requires NO native build tools.
 * Database file is stored at server/data/scans.db
 */

const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const DB_DIR = path.join(__dirname, 'data');
const DB_PATH = path.join(DB_DIR, 'scans.db');

let db = null;
let dbReady = null; // Promise that resolves when DB is ready

/**
 * Initialize the database. Called once at startup.
 */
async function initDb() {
  const SQL = await initSqlJs();
  
  // Ensure data directory exists
  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }

  // Load existing database or create new one
  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  // Create tables if they don't exist
  db.run(`
    CREATE TABLE IF NOT EXISTS scans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      url TEXT NOT NULL,
      status TEXT NOT NULL,
      blocked_at_step TEXT,
      timestamp TEXT NOT NULL,
      duration_ms INTEGER NOT NULL
    )
  `);

  saveDb();
  return db;
}

/**
 * Save database to disk (call after mutations)
 */
function saveDb() {
  if (!db) return;
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(DB_PATH, buffer);
}

/**
 * Get the database instance (waits for init if needed)
 */
function getDb() {
  return db;
}

/**
 * Insert a scan record
 */
function insertScan({ url, status, blocked_at_step, timestamp, duration_ms }) {
  if (!db) return null;
  db.run(
    `INSERT INTO scans (url, status, blocked_at_step, timestamp, duration_ms) VALUES (?, ?, ?, ?, ?)`,
    [url, status, blocked_at_step || null, timestamp, duration_ms]
  );
  saveDb();
  
  // Get the inserted row ID
  const result = db.exec("SELECT last_insert_rowid() AS id");
  return result[0]?.values[0]?.[0] || null;
}

/**
 * Get paginated scan history
 */
function getHistory(limit = 50, offset = 0) {
  if (!db) return { rows: [], total: 0 };
  
  const countResult = db.exec("SELECT COUNT(*) FROM scans");
  const total = countResult[0]?.values[0]?.[0] || 0;
  
  const stmt = db.prepare(
    "SELECT id, url, status, blocked_at_step, timestamp, duration_ms FROM scans ORDER BY id DESC LIMIT ? OFFSET ?"
  );
  stmt.bind([limit, offset]);
  
  const rows = [];
  while (stmt.step()) {
    const row = stmt.getAsObject();
    rows.push(row);
  }
  stmt.free();
  
  return { rows, total, limit, offset };
}

/**
 * Get aggregated stats
 */
function getStats() {
  if (!db) return { totalScans: 0, totalBlocked: 0, blockRate: 0, topBlockedSteps: [], scansPerDay: [] };
  
  // Total scans
  const totalResult = db.exec("SELECT COUNT(*) FROM scans");
  const totalScans = totalResult[0]?.values[0]?.[0] || 0;
  
  // Total blocked
  const blockedResult = db.exec("SELECT COUNT(*) FROM scans WHERE status = 'BLOCKED'");
  const totalBlocked = blockedResult[0]?.values[0]?.[0] || 0;
  
  // Block rate
  const blockRate = totalScans > 0 ? ((totalBlocked / totalScans) * 100).toFixed(1) : 0;
  
  // Top 5 blocked steps
  const topStepsResult = db.exec(
    "SELECT blocked_at_step, COUNT(*) as count FROM scans WHERE blocked_at_step IS NOT NULL GROUP BY blocked_at_step ORDER BY count DESC LIMIT 5"
  );
  const topBlockedSteps = (topStepsResult[0]?.values || []).map(row => ({
    step: row[0],
    count: row[1],
  }));
  
  // Scans per day for last 7 days
  const scansPerDayResult = db.exec(`
    SELECT DATE(timestamp) as day, COUNT(*) as count 
    FROM scans 
    WHERE DATE(timestamp) >= DATE('now', '-7 days')
    GROUP BY DATE(timestamp) 
    ORDER BY day ASC
  `);
  const scansPerDay = (scansPerDayResult[0]?.values || []).map(row => ({
    date: row[0],
    count: row[1],
  }));
  
  // Total passed
  const totalPassed = totalScans - totalBlocked;
  
  return {
    totalScans,
    totalBlocked,
    totalPassed,
    blockRate: parseFloat(blockRate),
    topBlockedSteps,
    scansPerDay,
  };
}

/**
 * Clear all scan history
 */
function clearHistory() {
  if (!db) return;
  db.run("DELETE FROM scans");
  saveDb();
}

// Start initialization immediately
dbReady = initDb().catch(err => {
  console.error('Failed to initialize scan database:', err);
});

module.exports = { getDb, insertScan, getHistory, getStats, clearHistory, dbReady };
