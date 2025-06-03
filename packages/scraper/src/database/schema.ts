import Database from 'better-sqlite3';
import { logger } from '../utils/logger';
import path from 'path';
import fs from 'fs';

// Helper function to find workspace root
function findWorkspaceRoot(): string {
  let currentDir = __dirname;

  // Look for the root package.json that has workspaces defined
  while (currentDir !== path.dirname(currentDir)) {
    const packageJsonPath = path.join(currentDir, 'package.json');
    if (fs.existsSync(packageJsonPath)) {
      try {
        const packageJson = JSON.parse(
          fs.readFileSync(packageJsonPath, 'utf-8')
        );
        if (packageJson.workspaces) {
          return currentDir;
        }
      } catch {
        // Continue searching
      }
    }
    currentDir = path.dirname(currentDir);
  }

  // Fallback to current working directory
  return process.cwd();
}

// Use workspace root for default database path
const workspaceRoot = findWorkspaceRoot();
const DEFAULT_DB_PATH = path.join(workspaceRoot, 'data', 'bank-data.db');
const DB_PATH = process.env.DATABASE_PATH || DEFAULT_DB_PATH;

export function initializeDatabase(): Database.Database {
  logger.info('Initializing database', { path: DB_PATH });

  // Ensure the directory exists
  const dbDir = path.dirname(DB_PATH);
  if (!fs.existsSync(dbDir)) {
    logger.info('Creating database directory', { directory: dbDir });
    fs.mkdirSync(dbDir, { recursive: true });
  }

  const db = new Database(DB_PATH);

  // Enable foreign keys
  db.pragma('foreign_keys = ON');

  // Create tables
  db.exec(`
    -- Accounts table
    CREATE TABLE IF NOT EXISTS accounts (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    
    -- Account balances history
    CREATE TABLE IF NOT EXISTS account_balances (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      account_id TEXT NOT NULL,
      balance REAL NOT NULL,
      recorded_at DATETIME NOT NULL,
      FOREIGN KEY (account_id) REFERENCES accounts(id)
    );
    
    -- Transactions table
    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      account_id TEXT NOT NULL,
      date DATETIME NOT NULL,
      description TEXT NOT NULL,
      amount REAL NOT NULL,
      category TEXT,
      reference TEXT,
      memo TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (account_id) REFERENCES accounts(id)
    );
    
    -- Scrape runs log
    CREATE TABLE IF NOT EXISTS scrape_runs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      started_at DATETIME NOT NULL,
      completed_at DATETIME,
      status TEXT NOT NULL,
      error_message TEXT,
      transactions_count INTEGER DEFAULT 0,
      accounts_count INTEGER DEFAULT 0
    );
    
    -- Indexes for performance
    CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
    CREATE INDEX IF NOT EXISTS idx_transactions_account ON transactions(account_id);
    CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category);
    CREATE INDEX IF NOT EXISTS idx_balances_account_date ON account_balances(account_id, recorded_at);
  `);

  // Add "pending" column to transactions table if it doesn't exist yet (SQLite supports ALTER TABLE).
  const columns: Array<{ name: string }> = db
    .prepare(`PRAGMA table_info(transactions)`)
    .all() as Array<{ name: string }>;

  const hasPendingColumn = columns.some(col => col.name === 'pending');
  if (!hasPendingColumn) {
    logger.info('Adding "pending" column to transactions table');
    db.exec(`ALTER TABLE transactions ADD COLUMN pending INTEGER DEFAULT 0`);
  }

  logger.info('Database initialized successfully');
  return db;
}

export function getDatabase(): Database.Database {
  return initializeDatabase();
}
