"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeDatabase = initializeDatabase;
exports.getDatabase = getDatabase;
const better_sqlite3_1 = __importDefault(require("better-sqlite3"));
const logger_1 = require("../utils/logger");
const path_1 = __importDefault(require("path"));
const DB_PATH = process.env.DATABASE_PATH || path_1.default.join(process.cwd(), "data", "bank-data.db");
function initializeDatabase() {
    logger_1.logger.info("Initializing database", { path: DB_PATH });
    const db = new better_sqlite3_1.default(DB_PATH);
    db.pragma("foreign_keys = ON");
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
    logger_1.logger.info("Database initialized successfully");
    return db;
}
function getDatabase() {
    return initializeDatabase();
}
//# sourceMappingURL=schema.js.map