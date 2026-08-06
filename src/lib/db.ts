import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

// Ensure the data directory exists
const dataDir = path.join(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir);
}

const dbPath = path.join(dataDir, 'postit.db');
const db = new Database(dbPath, { verbose: console.log });

// Initialize database schema
db.exec(`
  CREATE TABLE IF NOT EXISTS folders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    pos_x REAL NOT NULL DEFAULT 100,
    pos_y REAL NOT NULL DEFAULT 100,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    is_locked INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS postits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    content TEXT NOT NULL,
    color TEXT NOT NULL,
    folder_id INTEGER,
    pos_x REAL NOT NULL DEFAULT 0,
    pos_y REAL NOT NULL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    is_locked INTEGER DEFAULT 0,
    FOREIGN KEY(folder_id) REFERENCES folders(id) ON DELETE SET NULL
  );
`);

// Apply migrations safely
try { db.exec('ALTER TABLE folders ADD COLUMN is_locked INTEGER DEFAULT 0'); } catch (e) { /* column exists */ }
try { db.exec('ALTER TABLE postits ADD COLUMN is_locked INTEGER DEFAULT 0'); } catch (e) { /* column exists */ }

export default db;
