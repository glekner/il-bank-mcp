"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BankDataRepository = void 0;
const schema_1 = require("./schema");
const logger_1 = require("../utils/logger");
class BankDataRepository {
    db;
    constructor() {
        this.db = (0, schema_1.getDatabase)();
    }
    startScrapeRun() {
        const stmt = this.db.prepare(`
      INSERT INTO scrape_runs (started_at, status)
      VALUES (datetime('now'), 'running')
    `);
        const result = stmt.run();
        return result.lastInsertRowid;
    }
    completeScrapeRun(runId, success, error, stats) {
        const stmt = this.db.prepare(`
      UPDATE scrape_runs 
      SET completed_at = datetime('now'),
          status = ?,
          error_message = ?,
          transactions_count = ?,
          accounts_count = ?
      WHERE id = ?
    `);
        stmt.run(success ? "completed" : "failed", error || null, stats?.transactions || 0, stats?.accounts || 0, runId);
    }
    saveScrapedData(data) {
        const runId = this.startScrapeRun();
        try {
            this.db.transaction(() => {
                for (const account of data.accounts) {
                    this.saveAccount(account);
                    this.saveAccountBalance(account.id, account.balance, data.scrapedAt);
                }
                for (const transaction of data.transactions) {
                    this.saveTransaction(transaction);
                }
            })();
            this.completeScrapeRun(runId, true, undefined, {
                transactions: data.transactions.length,
                accounts: data.accounts.length,
            });
            logger_1.logger.info("Successfully saved scraped data", {
                accounts: data.accounts.length,
                transactions: data.transactions.length,
            });
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.completeScrapeRun(runId, false, errorMessage);
            throw error;
        }
    }
    saveAccount(account) {
        const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO accounts (id, name, type)
      VALUES (?, ?, ?)
    `);
        stmt.run(account.id, account.name, account.type);
    }
    saveAccountBalance(accountId, balance, date) {
        const stmt = this.db.prepare(`
      INSERT INTO account_balances (account_id, balance, recorded_at)
      VALUES (?, ?, ?)
    `);
        stmt.run(accountId, balance, date.toISOString());
    }
    saveTransaction(transaction) {
        const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO transactions 
      (id, account_id, date, description, amount, category, reference, memo)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
        stmt.run(transaction.id, transaction.accountId, transaction.date.toISOString(), transaction.description, transaction.amount, transaction.category, transaction.reference, transaction.memo);
    }
    getTransactions(startDate, endDate, accountId) {
        let query = "SELECT * FROM transactions WHERE 1=1";
        const params = [];
        if (startDate) {
            query += " AND date >= ?";
            params.push(startDate.toISOString());
        }
        if (endDate) {
            query += " AND date <= ?";
            params.push(endDate.toISOString());
        }
        if (accountId) {
            query += " AND account_id = ?";
            params.push(accountId);
        }
        query += " ORDER BY date DESC";
        const stmt = this.db.prepare(query);
        const rows = stmt.all(...params);
        return rows.map((row) => ({
            id: row.id,
            accountId: row.account_id,
            date: new Date(row.date),
            description: row.description,
            amount: row.amount,
            category: row.category,
            reference: row.reference,
            memo: row.memo,
        }));
    }
    getAccounts() {
        const stmt = this.db.prepare(`
      SELECT a.*, b.balance
      FROM accounts a
      LEFT JOIN (
        SELECT account_id, balance, 
               ROW_NUMBER() OVER (PARTITION BY account_id ORDER BY recorded_at DESC) as rn
        FROM account_balances
      ) b ON a.id = b.account_id AND b.rn = 1
    `);
        const rows = stmt.all();
        return rows.map((row) => ({
            id: row.id,
            name: row.name,
            type: row.type,
            balance: row.balance || 0,
        }));
    }
    getAccountBalanceHistory(accountId, days = 30) {
        const stmt = this.db.prepare(`
      SELECT recorded_at, balance
      FROM account_balances
      WHERE account_id = ?
        AND recorded_at >= date('now', '-' || ? || ' days')
      ORDER BY recorded_at DESC
    `);
        const rows = stmt.all(accountId, days);
        return rows.map((row) => ({
            date: new Date(row.recorded_at),
            balance: row.balance,
        }));
    }
    shouldScrape(hoursThreshold = 24) {
        const stmt = this.db.prepare(`
      SELECT completed_at
      FROM scrape_runs
      WHERE status = 'completed'
      ORDER BY completed_at DESC
      LIMIT 1
    `);
        const lastRun = stmt.get();
        if (!lastRun) {
            return true;
        }
        const lastRunDate = new Date(lastRun.completed_at);
        const hoursSinceLastRun = (Date.now() - lastRunDate.getTime()) / (1000 * 60 * 60);
        return hoursSinceLastRun >= hoursThreshold;
    }
    close() {
        this.db.close();
    }
}
exports.BankDataRepository = BankDataRepository;
//# sourceMappingURL=repository.js.map