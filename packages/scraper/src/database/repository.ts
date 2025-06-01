import Database from 'better-sqlite3';
import { Transaction, Account, ScrapedAccountData } from '../types';
import { getDatabase } from './schema';
import { logger } from '../utils/logger';

export class BankDataRepository {
  private db: Database.Database;
  private ignoredAccountIds: Set<string>;

  constructor() {
    this.db = getDatabase();
    this.ignoredAccountIds = this.parseIgnoredAccounts();
  }

  /**
   * Parse ignored account IDs from environment variable
   */
  private parseIgnoredAccounts(): Set<string> {
    const ignoredAccounts = process.env.IGNORED_ACCOUNT_IDS || '';
    const accountIds = ignoredAccounts
      .split(',')
      .map(id => id.trim())
      .filter(id => id.length > 0);

    if (accountIds.length > 0) {
      logger.info('Ignoring accounts when querying', {
        accountIds,
        count: accountIds.length,
      });
    }

    return new Set(accountIds);
  }

  /**
   * Check if an account should be ignored in queries
   */
  private isAccountIgnored(accountId: string): boolean {
    return this.ignoredAccountIds.has(accountId);
  }

  /**
   * Start a new scrape run
   */
  startScrapeRun(): number {
    const stmt = this.db.prepare(`
      INSERT INTO scrape_runs (started_at, status)
      VALUES (datetime('now'), 'running')
    `);

    const result = stmt.run();
    return result.lastInsertRowid as number;
  }

  /**
   * Complete a scrape run
   */
  completeScrapeRun(
    runId: number,
    success: boolean,
    error?: string,
    stats?: { transactions: number; accounts: number }
  ) {
    const stmt = this.db.prepare(`
      UPDATE scrape_runs 
      SET completed_at = datetime('now'),
          status = ?,
          error_message = ?,
          transactions_count = ?,
          accounts_count = ?
      WHERE id = ?
    `);

    stmt.run(
      success ? 'completed' : 'failed',
      error || null,
      stats?.transactions || 0,
      stats?.accounts || 0,
      runId
    );
  }

  /**
   * Save scraped data to database
   */
  saveScrapedData(data: ScrapedAccountData): void {
    const runId = this.startScrapeRun();

    try {
      this.db.transaction(() => {
        // Save accounts
        for (const account of data.accounts) {
          this.saveAccount(account);
          this.saveAccountBalance(account.id, account.balance, data.scrapedAt);
        }

        // Save transactions
        for (const transaction of data.transactions) {
          this.saveTransaction(transaction);
        }
      })();

      this.completeScrapeRun(runId, true, undefined, {
        transactions: data.transactions.length,
        accounts: data.accounts.length,
      });

      logger.info('Successfully saved scraped data', {
        accounts: data.accounts.length,
        transactions: data.transactions.length,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.completeScrapeRun(runId, false, errorMessage);
      throw error;
    }
  }

  private saveAccount(account: Account): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO accounts (id, name, type)
      VALUES (?, ?, ?)
    `);

    stmt.run(account.id, account.name, account.type);
  }

  private saveAccountBalance(
    accountId: string,
    balance: number,
    date: Date
  ): void {
    const stmt = this.db.prepare(`
      INSERT INTO account_balances (account_id, balance, recorded_at)
      VALUES (?, ?, ?)
    `);

    stmt.run(accountId, balance, date.toISOString());
  }

  private saveTransaction(transaction: Transaction): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO transactions 
      (id, account_id, date, description, amount, category, reference, memo)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      transaction.id,
      transaction.accountId,
      transaction.date.toISOString(),
      transaction.description,
      transaction.amount,
      transaction.category,
      transaction.reference,
      transaction.memo
    );
  }

  /**
   * Get transactions within a date range
   */
  getTransactions(
    startDate?: Date,
    endDate?: Date,
    accountId?: string
  ): Transaction[] {
    let query = 'SELECT * FROM transactions WHERE 1=1';
    const params: SqlParams = [];

    if (startDate) {
      query += ' AND date >= ?';
      params.push(startDate.toISOString());
    }

    if (endDate) {
      query += ' AND date <= ?';
      params.push(endDate.toISOString());
    }

    if (accountId) {
      query += ' AND account_id = ?';
      params.push(accountId);
    }

    // Add filter for ignored accounts
    if (this.ignoredAccountIds.size > 0) {
      const placeholders = Array.from(this.ignoredAccountIds)
        .map(() => '?')
        .join(',');
      query += ` AND account_id NOT IN (${placeholders})`;
      params.push(...Array.from(this.ignoredAccountIds));
    }

    query += ' ORDER BY date DESC';

    const stmt = this.db.prepare(query);
    const rows = stmt.all(...params) as TransactionRow[];

    return rows.map((row: TransactionRow) => ({
      id: row.id,
      accountId: row.account_id,
      date: new Date(row.date),
      description: row.description,
      amount: row.amount,
      category: row.category || 'uncategorized',
      reference: row.reference,
      memo: row.memo,
    }));
  }

  /**
   * Get latest account balances
   */
  getAccounts(): Account[] {
    let query = `
      SELECT a.*, b.balance
      FROM accounts a
      LEFT JOIN (
        SELECT account_id, balance, 
               ROW_NUMBER() OVER (PARTITION BY account_id ORDER BY recorded_at DESC) as rn
        FROM account_balances
      ) b ON a.id = b.account_id AND b.rn = 1
    `;

    const params: SqlParams = [];

    // Add filter for ignored accounts
    if (this.ignoredAccountIds.size > 0) {
      const placeholders = Array.from(this.ignoredAccountIds)
        .map(() => '?')
        .join(',');
      query += ` WHERE a.id NOT IN (${placeholders})`;
      params.push(...Array.from(this.ignoredAccountIds));
    }

    const stmt = this.db.prepare(query);
    const rows = stmt.all(...params) as AccountRow[];

    return rows.map((row: AccountRow) => ({
      id: row.id,
      name: row.name,
      type: row.type,
      balance: row.balance || 0,
    }));
  }

  /**
   * Get account balance history
   */
  getAccountBalanceHistory(
    accountId: string,
    days = 30
  ): { date: Date; balance: number }[] {
    // Return empty array if account is ignored
    if (this.isAccountIgnored(accountId)) {
      logger.debug('Skipping balance history for ignored account', {
        accountId,
      });
      return [];
    }

    const stmt = this.db.prepare(`
      SELECT recorded_at, balance
      FROM account_balances
      WHERE account_id = ?
        AND recorded_at >= date('now', '-' || ? || ' days')
      ORDER BY recorded_at DESC
    `);

    const rows = stmt.all(accountId, days) as AccountBalanceRow[];

    return rows.map((row: AccountBalanceRow) => ({
      date: new Date(row.recorded_at),
      balance: row.balance,
    }));
  }

  /**
   * Check if we need to scrape (based on last successful run)
   */
  shouldScrape(hoursThreshold = 24): boolean {
    const stmt = this.db.prepare(`
      SELECT completed_at
      FROM scrape_runs
      WHERE status = 'completed'
      ORDER BY completed_at DESC
      LIMIT 1
    `);

    const lastRun = stmt.get() as
      | Pick<ScrapeRunRow, 'completed_at'>
      | undefined;

    if (!lastRun || !lastRun.completed_at) {
      return true; // No successful runs yet
    }

    const lastRunDate = new Date(lastRun.completed_at);
    const hoursSinceLastRun =
      (Date.now() - lastRunDate.getTime()) / (1000 * 60 * 60);

    return hoursSinceLastRun >= hoursThreshold;
  }

  /**
   * Check if a scrape is currently running
   */
  isScrapeRunning(): boolean {
    const stmt = this.db.prepare(`
      SELECT COUNT(*) as count
      FROM scrape_runs
      WHERE status = 'running'
        AND datetime(started_at) >= datetime('now', '-1 hour')
    `);

    const result = stmt.get() as CountRow;
    return result.count > 0;
  }

  /**
   * Get information about the last scrape
   */
  getLastScrapeInfo(): {
    lastScrapeAt?: Date;
    status?: string;
    duration?: number;
    transactionsCount?: number;
    accountsCount?: number;
    error?: string;
    isRunning: boolean;
  } {
    // Check if currently running
    const isRunning = this.isScrapeRunning();

    // Get last completed or failed scrape
    const stmt = this.db.prepare(`
      SELECT *
      FROM scrape_runs
      WHERE status IN ('completed', 'failed')
      ORDER BY completed_at DESC
      LIMIT 1
    `);

    const lastRun = stmt.get() as ScrapeRunRow | undefined;

    if (!lastRun || !lastRun.completed_at) {
      return { isRunning };
    }

    const startedAt = new Date(lastRun.started_at);
    const completedAt = new Date(lastRun.completed_at as string);
    const duration = (completedAt.getTime() - startedAt.getTime()) / 1000; // in seconds

    return {
      lastScrapeAt: completedAt,
      status: lastRun.status,
      duration,
      transactionsCount: lastRun.transactions_count || 0,
      accountsCount: lastRun.accounts_count || 0,
      error: lastRun.error_message || undefined,
      isRunning,
    };
  }

  /**
   * Get unique categories from transactions within a date range
   */
  getUniqueCategories(
    startDate?: Date,
    endDate?: Date,
    accountId?: string
  ): string[] {
    let query = 'SELECT DISTINCT category FROM transactions WHERE 1=1';
    const params: SqlParams = [];

    if (startDate) {
      query += ' AND date >= ?';
      params.push(startDate.toISOString());
    }

    if (endDate) {
      query += ' AND date <= ?';
      params.push(endDate.toISOString());
    }

    if (accountId) {
      query += ' AND account_id = ?';
      params.push(accountId);
    }

    // Add filter for ignored accounts
    if (this.ignoredAccountIds.size > 0) {
      const placeholders = Array.from(this.ignoredAccountIds)
        .map(() => '?')
        .join(',');
      query += ` AND account_id NOT IN (${placeholders})`;
      params.push(...Array.from(this.ignoredAccountIds));
    }

    query += ' AND category IS NOT NULL ORDER BY category';

    const stmt = this.db.prepare(query);
    const rows = stmt.all(...params) as { category: string }[];

    return rows
      .map(row => row.category)
      .filter(category => category && category.trim() !== '');
  }

  close(): void {
    this.db.close();
  }
}

// Database row interfaces
interface TransactionRow {
  id: string;
  account_id: string;
  date: string;
  description: string;
  amount: number;
  category: string | null;
  reference: string | null;
  memo: string | null;
}

interface AccountRow {
  id: string;
  name: string;
  type: string;
  balance?: number;
}

interface AccountBalanceRow {
  recorded_at: string;
  balance: number;
}

interface ScrapeRunRow {
  id: number;
  started_at: string;
  completed_at: string | null;
  status: 'running' | 'completed' | 'failed';
  error_message: string | null;
  transactions_count: number | null;
  accounts_count: number | null;
}

interface CountRow {
  count: number;
}

// SQL parameter types
type SqlValue = string | number | null | undefined;
type SqlParams = SqlValue[];
