import { categorizeExpenses } from '../analyzers/expenseAnalyzer';
import { categorizeIncome } from '../analyzers/incomeAnalyzer';
import { analyzeFinancialTrends } from '../analyzers/trendAnalyzer';
import { BankDataRepository } from '../database/repository';
import { processTransactions } from '../processors/transactionProcessor';
import { scrapeAllBankData, scrapeSingleProvider } from '../scraper';
import {
  FinancialSummary,
  Transaction,
  type Account,
  type ProcessedTransaction,
} from '../types';
import { createComponentLogger, createTimer } from '../utils/logger';
import { getCacheService, CacheKeys } from './cacheService';
import { ScrapeStatusManager } from './scrapeStatusManager';
import type { ProviderKey } from '../utils/providers';

const logger = createComponentLogger('ScraperService');

export class ScraperService {
  private repository: BankDataRepository;
  private cache = getCacheService();
  private scrapeStatusManager = ScrapeStatusManager.getInstance();

  constructor() {
    logger.info('Initializing ScraperService');
    this.repository = new BankDataRepository();
    logger.info('ScraperService initialized successfully');
  }

  /**
   * Scrape fresh data from all configured banks/credit cards and save to database
   */
  async scrapeAndSave(): Promise<void> {
    const timer = createTimer();
    const operationId = `scrape-all-${Date.now()}`;

    try {
      logger.startOperation('multi-provider data scraping', { operationId });

      // Get the scraping interval from environment
      const scrapeEveryHours = Number(process.env.SCRAPE_EVERY_HOURS ?? '12');

      // Check if we should scrape - use the configured interval as the threshold
      if (!this.repository.shouldScrape(scrapeEveryHours)) {
        const lastScrapeInfo = this.repository.getLastScrapeInfo();
        const hoursSinceLastScrape = lastScrapeInfo?.lastScrapeAt
          ? (Date.now() - lastScrapeInfo.lastScrapeAt.getTime()) /
            (1000 * 60 * 60)
          : null;

        logger.info('Skipping scrape - data is still fresh', {
          lastScrapeAt: lastScrapeInfo?.lastScrapeAt,
          hoursSinceLastScrape: hoursSinceLastScrape?.toFixed(2),
          scrapeEveryHours,
          operationId,
        });
        return;
      }

      logger.info('Starting bank data scraping', {
        operationId,
        scrapeEveryHours,
        reason: 'Data freshness threshold exceeded',
      });
      // Scrape data from all providers
      const scrapedData = await scrapeAllBankData();

      logger.info('Bank data scraped successfully', {
        transactionCount: scrapedData.transactions?.length || 0,
        accountCount: scrapedData.accounts?.length || 0,
        operationId,
      });

      // Validate scraped data before saving
      if (!scrapedData.transactions || !scrapedData.accounts) {
        logger.error('Invalid scraped data structure', {
          hasTransactions: !!scrapedData.transactions,
          hasAccounts: !!scrapedData.accounts,
          operationId,
        });
        throw new Error(
          'Invalid scraped data: missing transactions or accounts'
        );
      }

      // Basic validation - log first few errors only to prevent log flooding
      const validationErrors: string[] = [];
      const MAX_VALIDATION_ERRORS = 10;

      scrapedData.transactions.forEach((txn, index) => {
        if (validationErrors.length >= MAX_VALIDATION_ERRORS) return;

        if (
          !txn.date ||
          !txn.description ||
          (txn.chargedAmount === undefined && txn.originalAmount === undefined)
        ) {
          validationErrors.push(
            `Transaction ${index}: missing required fields`
          );
        }
      });

      if (validationErrors.length > 0) {
        logger.warn('Data validation warnings', {
          errors: validationErrors,
          totalTransactions: scrapedData.transactions.length,
          operationId,
        });
      }

      // Save to database
      logger.info('Saving data to database', {
        operationId,
      });

      try {
        this.repository.saveScrapedData(scrapedData);
      } catch (dbError) {
        logger.error('Failed to save scraped data to database', {
          error: dbError,
          operationId,
        });
        throw new Error('Database save failed');
      }

      // Clear cache after successful scrape
      this.cache.clear();
      logger.info('Cache cleared after successful scrape', { operationId });

      const duration = timer.elapsed();
      logger.endOperation('multi-provider data scraping', duration, {
        transactionCount: scrapedData.transactions?.length || 0,
        accountCount: scrapedData.accounts?.length || 0,
        operationId,
      });
    } catch (error) {
      logger.errorOperation('multi-provider data scraping', error as Error, {
        operationId,
        duration_ms: timer.elapsed(),
      });
      throw error;
    }
  }

  /**
   * Scrape data from a specific provider
   */
  async scrapeSingleProviderAndSave(provider: ProviderKey): Promise<void> {
    const timer = createTimer();
    const operationId = `scrape-${provider}-${Date.now()}`;

    try {
      logger.startOperation(`${provider} data scraping`, {
        provider,
        operationId,
      });

      logger.info('Starting single provider data scraping', {
        provider,
        operationId,
      });
      // Scrape data from specific provider
      const scrapedData = await scrapeSingleProvider(provider);

      logger.info('Single provider data scraped', {
        provider,
        transactionCount: scrapedData.transactions?.length || 0,
        accountCount: scrapedData.accounts?.length || 0,
        operationId,
      });

      logger.info('Saving single provider data to database', {
        provider,
        operationId,
      });
      // Save to database
      this.repository.saveScrapedData(scrapedData);

      const duration = timer.elapsed();
      logger.endOperation(`${provider} data scraping`, duration, {
        provider,
        transactionCount: scrapedData.transactions?.length || 0,
        accountCount: scrapedData.accounts?.length || 0,
        operationId,
      });
    } catch (error) {
      logger.errorOperation(`${provider} data scraping`, error as Error, {
        provider,
        operationId,
        duration_ms: timer.elapsed(),
      });
      throw error;
    }
  }

  /**
   * Force a fresh scrape of all providers regardless of last scrape time
   */
  async forceScrape(): Promise<void> {
    const timer = createTimer();
    const operationId = `force-scrape-all-${Date.now()}`;

    try {
      logger.startOperation('force scraping multi-provider data', {
        operationId,
      });

      logger.info('Starting forced bank data scraping', { operationId });
      // Scrape data from all providers
      const scrapedData = await scrapeAllBankData();

      logger.info('Forced bank data scraped successfully', {
        transactionCount: scrapedData.transactions?.length || 0,
        accountCount: scrapedData.accounts?.length || 0,
        operationId,
      });

      logger.info('Saving forced scrape data to database', { operationId });
      // Save to database
      this.repository.saveScrapedData(scrapedData);

      const duration = timer.elapsed();
      logger.endOperation('force scraping multi-provider data', duration, {
        transactionCount: scrapedData.transactions?.length || 0,
        accountCount: scrapedData.accounts?.length || 0,
        operationId,
      });
    } catch (error) {
      logger.errorOperation(
        'force scraping multi-provider data',
        error as Error,
        {
          operationId,
          duration_ms: timer.elapsed(),
        }
      );
      throw error;
    }
  }

  /**
   * Force scrape a specific provider
   */
  async forceScrapeProvider(provider: ProviderKey): Promise<void> {
    const timer = createTimer();
    const operationId = `force-scrape-${provider}-${Date.now()}`;

    try {
      logger.startOperation(`force scraping ${provider} data`, {
        provider,
        operationId,
      });

      logger.info('Starting forced single provider scraping', {
        provider,
        operationId,
      });
      // Scrape data from specific provider
      const scrapedData = await scrapeSingleProvider(provider);

      logger.info('Forced single provider data scraped', {
        provider,
        transactionCount: scrapedData.transactions?.length || 0,
        accountCount: scrapedData.accounts?.length || 0,
        operationId,
      });

      logger.info('Saving forced single provider data', {
        provider,
        operationId,
      });
      // Save to database
      this.repository.saveScrapedData(scrapedData);

      const duration = timer.elapsed();
      logger.endOperation(`force scraping ${provider} data`, duration, {
        provider,
        transactionCount: scrapedData.transactions?.length || 0,
        accountCount: scrapedData.accounts?.length || 0,
        operationId,
      });
    } catch (error) {
      logger.errorOperation(`force scraping ${provider} data`, error as Error, {
        provider,
        operationId,
        duration_ms: timer.elapsed(),
      });
      throw error;
    }
  }

  /**
   * Get financial summary from stored data
   */
  async getFinancialSummary(
    startDate?: Date,
    endDate?: Date
  ): Promise<FinancialSummary> {
    const timer = createTimer();
    const operationId = `financial-summary-${Date.now()}`;

    try {
      logger.startOperation('generating financial summary', {
        startDate: startDate?.toISOString(),
        endDate: endDate?.toISOString(),
        operationId,
      });

      // Check cache first
      const cacheKey = CacheKeys.financialSummary(startDate, endDate);
      const cached = this.cache.get<FinancialSummary>(cacheKey);

      if (cached) {
        logger.info('Returning cached financial summary', {
          transactionCount: cached.transactions.length,
          operationId,
        });
        return cached;
      }

      logger.info('Fetching transactions from database', { operationId });
      // Get transactions from database
      const transactions = this.repository.getTransactions(startDate, endDate);

      logger.info('Processing transactions', {
        transactionCount: transactions.length,
        operationId,
      });

      // Process and analyze
      const processedTransactions = processTransactions(transactions);
      logger.info('Analyzing financial trends', { operationId });
      const trends = analyzeFinancialTrends(processedTransactions);
      logger.info('Categorizing income', { operationId });
      const income = categorizeIncome(processedTransactions);
      logger.info('Categorizing expenses', { operationId });
      const expenses = categorizeExpenses(processedTransactions);

      const summary: FinancialSummary = {
        transactions: processedTransactions,
        trends,
        income,
        expenses,
      };

      // Cache the results
      this.cache.set(cacheKey, summary, 10 * 60 * 1000); // 10 minutes

      const duration = timer.elapsed();
      logger.endOperation('generating financial summary', duration, {
        transactionCount: processedTransactions.length,
        incomeCategories: Object.keys(income).length,
        expenseCategories: Object.keys(expenses).length,
        operationId,
      });

      return summary;
    } catch (error) {
      logger.errorOperation('generating financial summary', error as Error, {
        startDate: startDate?.toISOString(),
        endDate: endDate?.toISOString(),
        operationId,
        duration_ms: timer.elapsed(),
      });
      throw error;
    }
  }

  /**
   * Get transactions for a specific period
   */
  async getTransactions(options?: {
    startDate?: Date;
    endDate?: Date;
    accountId?: string;
  }): Promise<Transaction[]> {
    const timer = createTimer();
    const operationId = `get-transactions-${Date.now()}`;

    logger.startOperation('fetching transactions', {
      startDate: options?.startDate?.toISOString(),
      endDate: options?.endDate?.toISOString(),
      accountId: options?.accountId,
      operationId,
    });

    try {
      // Check cache first
      const cacheKey = CacheKeys.transactions(
        options?.startDate,
        options?.endDate,
        options?.accountId
      );
      const cached = this.cache.get<Transaction[]>(cacheKey);

      if (cached) {
        logger.info('Returning cached transactions', {
          transactionCount: cached.length,
          operationId,
        });
        return cached;
      }

      // Not in cache, fetch from database
      const transactions = this.repository.getTransactions(
        options?.startDate,
        options?.endDate,
        options?.accountId
      );

      // Get all accounts to detect internal transfers

      // Cache the results
      this.cache.set(cacheKey, transactions, 5 * 60 * 1000); // 5 minutes

      const duration = timer.elapsed();
      logger.endOperation('fetching transactions', duration, {
        transactionCount: transactions.length,
        operationId,
      });

      return transactions;
    } catch (error) {
      logger.errorOperation('fetching transactions', error as Error, {
        operationId,
        duration_ms: timer.elapsed(),
      });
      throw error;
    }
  }

  /**
   * Get processed transactions with internal transfer detection
   */
  async getProcessedTransactions(options?: {
    startDate?: Date;
    endDate?: Date;
    accountId?: string;
  }): Promise<ProcessedTransaction[]> {
    const timer = createTimer();
    const operationId = `get-processed-transactions-${Date.now()}`;

    logger.startOperation('fetching processed transactions', {
      startDate: options?.startDate?.toISOString(),
      endDate: options?.endDate?.toISOString(),
      accountId: options?.accountId,
      operationId,
    });

    try {
      // Get raw transactions
      const transactions = await this.getTransactions(options);

      // Process transactions (adds isInternalTransfer detection)
      const processedTransactions = processTransactions(transactions);

      const duration = timer.elapsed();
      logger.endOperation('fetching processed transactions', duration, {
        transactionCount: processedTransactions.length,
        internalTransfers: processedTransactions.filter(
          t => t.isInternalTransfer
        ).length,
        operationId,
      });

      return processedTransactions;
    } catch (error) {
      logger.errorOperation('fetching processed transactions', error as Error, {
        operationId,
        duration_ms: timer.elapsed(),
      });
      throw error;
    }
  }

  /**
   * Get all accounts
   */
  async getAccounts() {
    const timer = createTimer();
    const operationId = `get-accounts-${Date.now()}`;

    logger.startOperation('fetching accounts', { operationId });

    try {
      // Check cache first
      const cacheKey = CacheKeys.accounts();
      const cached = this.cache.get<Account[]>(cacheKey);

      if (cached) {
        logger.info('Returning cached accounts', {
          accountCount: cached.length,
          operationId,
        });
        return cached;
      }

      // Not in cache, fetch from database
      const accounts = this.repository.getAccounts();

      // Cache the results
      this.cache.set(cacheKey, accounts, 10 * 60 * 1000); // 10 minutes

      const duration = timer.elapsed();
      logger.endOperation('fetching accounts', duration, {
        accountCount: accounts.length,
        operationId,
      });

      return accounts;
    } catch (error) {
      logger.errorOperation('fetching accounts', error as Error, {
        operationId,
        duration_ms: timer.elapsed(),
      });
      throw error;
    }
  }

  /**
   * Get account balance history
   */
  async getAccountBalanceHistory(accountId: string, days = 30) {
    const timer = createTimer();
    const operationId = `get-balance-history-${Date.now()}`;

    logger.startOperation('fetching account balance history', {
      accountId,
      days,
      operationId,
    });

    try {
      const history = this.repository.getAccountBalanceHistory(accountId, days);

      const duration = timer.elapsed();
      logger.endOperation('fetching account balance history', duration, {
        accountId,
        days,
        historyPoints: history.length,
        operationId,
      });

      return history;
    } catch (error) {
      logger.errorOperation(
        'fetching account balance history',
        error as Error,
        {
          accountId,
          days,
          operationId,
          duration_ms: timer.elapsed(),
        }
      );
      throw error;
    }
  }

  /**
   * Check if a scrape is currently running
   */
  isScrapeRunning(): boolean {
    // Check both database and in-memory status
    const dbRunning = this.repository.isScrapeRunning();
    const memoryRunning = this.scrapeStatusManager.isAnyScrapeRunning();
    const isRunning = dbRunning || memoryRunning;
    logger.debug('Checked scrape running status', {
      isRunning,
      dbRunning,
      memoryRunning,
    });
    return isRunning;
  }

  /**
   * Get information about the last scrape
   */
  getLastScrapeInfo() {
    const info = this.repository.getLastScrapeInfo();
    logger.debug('Retrieved last scrape info', {
      lastScrapeAt: info?.lastScrapeAt,
      isRunning: info?.isRunning,
    });
    return info;
  }

  /**
   * Start an async scrape of all providers
   * Returns immediately after starting the scrape
   */
  async startAsyncScrapeAll(): Promise<void> {
    logger.info('Starting async scrape of all providers');

    // Check if already scraping
    if (this.scrapeStatusManager.isProviderScraping('all')) {
      logger.warn('Scrape already in progress for all providers');
      return;
    }

    this.scrapeStatusManager.startScrape('all');

    // Start the scrape in the background
    this.forceScrape()
      .then(() => {
        logger.info('Async scrape of all providers completed successfully');
        this.scrapeStatusManager.completeScrape('all');
      })
      .catch(error => {
        logger.error('Async scrape of all providers failed', { error });
        this.scrapeStatusManager.completeScrape('all', error);
      });
  }

  /**
   * Start an async scrape of a specific provider
   * Returns immediately after starting the scrape
   */
  async startAsyncScrapeProvider(provider: ProviderKey): Promise<void> {
    logger.info(`Starting async scrape of ${provider}`);

    // Check if already scraping this provider
    if (this.scrapeStatusManager.isProviderScraping(provider)) {
      logger.warn(`Scrape already in progress for ${provider}`);
      return;
    }

    this.scrapeStatusManager.startScrape(provider);

    // Start the scrape in the background
    this.forceScrapeProvider(provider)
      .then(() => {
        logger.info(`Async scrape of ${provider} completed successfully`);
        this.scrapeStatusManager.completeScrape(provider);
      })
      .catch(error => {
        logger.error(`Async scrape of ${provider} failed`, { error });
        this.scrapeStatusManager.completeScrape(provider, error);
      });
  }

  /**
   * Get current scraping status
   */
  getScrapeStatus() {
    const dbInfo = this.getLastScrapeInfo();
    const runningScrapes = this.scrapeStatusManager.getRunningScrapes();

    return {
      ...dbInfo,
      activeScrapes: runningScrapes,
      isAnyScrapeRunning: this.isScrapeRunning(),
    };
  }

  /**
   * Get unique categories from transactions within a date range
   */
  async getUniqueCategories(options?: {
    startDate?: Date;
    endDate?: Date;
    accountId?: string;
  }): Promise<string[]> {
    const timer = createTimer();
    const operationId = `get-unique-categories-${Date.now()}`;

    logger.startOperation('fetching unique categories', {
      startDate: options?.startDate?.toISOString(),
      endDate: options?.endDate?.toISOString(),
      accountId: options?.accountId,
      operationId,
    });

    try {
      const categories = this.repository.getUniqueCategories(
        options?.startDate,
        options?.endDate,
        options?.accountId
      );

      const duration = timer.elapsed();
      logger.endOperation('fetching unique categories', duration, {
        categoryCount: categories.length,
        operationId,
      });

      return categories;
    } catch (error) {
      logger.errorOperation('fetching unique categories', error as Error, {
        operationId,
        duration_ms: timer.elapsed(),
      });
      throw error;
    }
  }

  /**
   * Get comprehensive database statistics
   */
  async getDatabaseStatistics() {
    const timer = createTimer();
    const operationId = `get-database-statistics-${Date.now()}`;

    logger.startOperation('fetching database statistics', { operationId });

    try {
      const stats = this.repository.getDatabaseStatistics();

      const duration = timer.elapsed();
      logger.endOperation('fetching database statistics', duration, {
        totalTransactions: stats.totalTransactions,
        totalAccounts: stats.totalAccounts,
        operationId,
      });

      return stats;
    } catch (error) {
      logger.errorOperation('fetching database statistics', error as Error, {
        operationId,
        duration_ms: timer.elapsed(),
      });
      throw error;
    }
  }

  /**
   * Close the database connection
   */
  async close(): Promise<void> {
    logger.info('Closing ScraperService and cleaning up resources');
    try {
      await this.repository.close();
      logger.info('ScraperService closed successfully');
    } catch (error) {
      logger.error('Error while closing ScraperService', { error });
      throw error;
    }
  }
}
