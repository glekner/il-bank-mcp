import { categorizeExpenses } from "../analyzers/expenseAnalyzer";
import { categorizeIncome } from "../analyzers/incomeAnalyzer";
import { analyzeFinancialTrends } from "../analyzers/trendAnalyzer";
import { BankDataRepository } from "../database/repository";
import { processTransactions } from "../processors/transactionProcessor";
import { scrapeAllBankData, scrapeSingleService } from "../scraper";
import { FinancialSummary, ServiceType, Transaction } from "../types";
import { createComponentLogger, createTimer } from "../utils/logger";
import { getCacheService, CacheKeys } from "./cacheService";
import { validateScrapedData } from "../validation/schemas";

const logger = createComponentLogger("ScraperService");

export class ScraperService {
  private repository: BankDataRepository;
  private cache = getCacheService();

  constructor() {
    logger.info("Initializing ScraperService");
    this.repository = new BankDataRepository();
    logger.info("ScraperService initialized successfully");
  }

  /**
   * Scrape fresh data from all configured banks/credit cards and save to database
   */
  async scrapeAndSave(): Promise<void> {
    const timer = createTimer();
    const operationId = `scrape-all-${Date.now()}`;

    try {
      logger.startOperation("multi-service data scraping", { operationId });

      // Check if we should scrape
      if (!this.repository.shouldScrape()) {
        const lastScrapeInfo = this.repository.getLastScrapeInfo();
        logger.info("Skipping scrape - data is still fresh", {
          lastScrapeAt: lastScrapeInfo?.lastScrapeAt,
          operationId,
        });
        return;
      }

      logger.info("Starting bank data scraping", { operationId });
      // Scrape data from all services
      const scrapedData = await scrapeAllBankData();

      logger.info("Bank data scraped successfully", {
        transactionCount: scrapedData.transactions?.length || 0,
        accountCount: scrapedData.accounts?.length || 0,
        operationId,
      });

      // Validate scraped data
      logger.info("Validating scraped data", { operationId });
      const validationResult = validateScrapedData(scrapedData);

      if (!validationResult.success) {
        logger.error("Data validation failed", {
          errors: validationResult.errors,
          operationId,
        });
        throw new Error(
          `Data validation failed: ${JSON.stringify(validationResult.errors)}`
        );
      }

      logger.info("Saving validated data to database", { operationId });
      // Save to database
      this.repository.saveScrapedData(scrapedData);

      // Clear cache after successful scrape
      this.cache.clear();
      logger.info("Cache cleared after successful scrape", { operationId });

      const duration = timer.elapsed();
      logger.endOperation("multi-service data scraping", duration, {
        transactionCount: scrapedData.transactions?.length || 0,
        accountCount: scrapedData.accounts?.length || 0,
        operationId,
      });
    } catch (error) {
      logger.errorOperation("multi-service data scraping", error as Error, {
        operationId,
        duration_ms: timer.elapsed(),
      });
      throw error;
    }
  }

  /**
   * Scrape data from a specific service
   */
  async scrapeSingleServiceAndSave(service: ServiceType): Promise<void> {
    const timer = createTimer();
    const operationId = `scrape-${service}-${Date.now()}`;

    try {
      logger.startOperation(`${service} data scraping`, {
        service,
        operationId,
      });

      logger.info("Starting single service data scraping", {
        service,
        operationId,
      });
      // Scrape data from specific service
      const scrapedData = await scrapeSingleService(service);

      logger.info("Single service data scraped", {
        service,
        transactionCount: scrapedData.transactions?.length || 0,
        accountCount: scrapedData.accounts?.length || 0,
        operationId,
      });

      logger.info("Saving single service data to database", {
        service,
        operationId,
      });
      // Save to database
      this.repository.saveScrapedData(scrapedData);

      const duration = timer.elapsed();
      logger.endOperation(`${service} data scraping`, duration, {
        service,
        transactionCount: scrapedData.transactions?.length || 0,
        accountCount: scrapedData.accounts?.length || 0,
        operationId,
      });
    } catch (error) {
      logger.errorOperation(`${service} data scraping`, error as Error, {
        service,
        operationId,
        duration_ms: timer.elapsed(),
      });
      throw error;
    }
  }

  /**
   * Force a fresh scrape of all services regardless of last scrape time
   */
  async forceScrape(): Promise<void> {
    const timer = createTimer();
    const operationId = `force-scrape-all-${Date.now()}`;

    try {
      logger.startOperation("force scraping multi-service data", {
        operationId,
      });

      logger.info("Starting forced bank data scraping", { operationId });
      // Scrape data from all services
      const scrapedData = await scrapeAllBankData();

      logger.info("Forced bank data scraped successfully", {
        transactionCount: scrapedData.transactions?.length || 0,
        accountCount: scrapedData.accounts?.length || 0,
        operationId,
      });

      logger.info("Saving forced scrape data to database", { operationId });
      // Save to database
      this.repository.saveScrapedData(scrapedData);

      const duration = timer.elapsed();
      logger.endOperation("force scraping multi-service data", duration, {
        transactionCount: scrapedData.transactions?.length || 0,
        accountCount: scrapedData.accounts?.length || 0,
        operationId,
      });
    } catch (error) {
      logger.errorOperation(
        "force scraping multi-service data",
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
   * Force scrape a specific service
   */
  async forceScrapeService(service: ServiceType): Promise<void> {
    const timer = createTimer();
    const operationId = `force-scrape-${service}-${Date.now()}`;

    try {
      logger.startOperation(`force scraping ${service} data`, {
        service,
        operationId,
      });

      logger.info("Starting forced single service scraping", {
        service,
        operationId,
      });
      // Scrape data from specific service
      const scrapedData = await scrapeSingleService(service);

      logger.info("Forced single service data scraped", {
        service,
        transactionCount: scrapedData.transactions?.length || 0,
        accountCount: scrapedData.accounts?.length || 0,
        operationId,
      });

      logger.info("Saving forced single service data", {
        service,
        operationId,
      });
      // Save to database
      this.repository.saveScrapedData(scrapedData);

      const duration = timer.elapsed();
      logger.endOperation(`force scraping ${service} data`, duration, {
        service,
        transactionCount: scrapedData.transactions?.length || 0,
        accountCount: scrapedData.accounts?.length || 0,
        operationId,
      });
    } catch (error) {
      logger.errorOperation(`force scraping ${service} data`, error as Error, {
        service,
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
      logger.startOperation("generating financial summary", {
        startDate: startDate?.toISOString(),
        endDate: endDate?.toISOString(),
        operationId,
      });

      // Check cache first
      const cacheKey = CacheKeys.financialSummary(startDate, endDate);
      const cached = this.cache.get<FinancialSummary>(cacheKey);

      if (cached) {
        logger.info("Returning cached financial summary", {
          transactionCount: cached.transactions.length,
          operationId,
        });
        return cached;
      }

      logger.info("Fetching transactions from database", { operationId });
      // Get transactions from database
      const transactions = this.repository.getTransactions(startDate, endDate);

      logger.info("Processing transactions", {
        transactionCount: transactions.length,
        operationId,
      });

      // Process and analyze
      const processedTransactions = processTransactions(transactions);
      logger.info("Analyzing financial trends", { operationId });
      const trends = analyzeFinancialTrends(processedTransactions);
      logger.info("Categorizing income", { operationId });
      const income = categorizeIncome(processedTransactions);
      logger.info("Categorizing expenses", { operationId });
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
      logger.endOperation("generating financial summary", duration, {
        transactionCount: processedTransactions.length,
        incomeCategories: Object.keys(income).length,
        expenseCategories: Object.keys(expenses).length,
        operationId,
      });

      return summary;
    } catch (error) {
      logger.errorOperation("generating financial summary", error as Error, {
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

    logger.startOperation("fetching transactions", {
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
        logger.info("Returning cached transactions", {
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

      // Cache the results
      this.cache.set(cacheKey, transactions, 5 * 60 * 1000); // 5 minutes

      const duration = timer.elapsed();
      logger.endOperation("fetching transactions", duration, {
        transactionCount: transactions.length,
        operationId,
      });

      return transactions;
    } catch (error) {
      logger.errorOperation("fetching transactions", error as Error, {
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

    logger.startOperation("fetching accounts", { operationId });

    try {
      // Check cache first
      const cacheKey = CacheKeys.accounts();
      const cached = this.cache.get<any[]>(cacheKey);

      if (cached) {
        logger.info("Returning cached accounts", {
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
      logger.endOperation("fetching accounts", duration, {
        accountCount: accounts.length,
        operationId,
      });

      return accounts;
    } catch (error) {
      logger.errorOperation("fetching accounts", error as Error, {
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

    logger.startOperation("fetching account balance history", {
      accountId,
      days,
      operationId,
    });

    try {
      const history = this.repository.getAccountBalanceHistory(accountId, days);

      const duration = timer.elapsed();
      logger.endOperation("fetching account balance history", duration, {
        accountId,
        days,
        historyPoints: history.length,
        operationId,
      });

      return history;
    } catch (error) {
      logger.errorOperation(
        "fetching account balance history",
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
    const isRunning = this.repository.isScrapeRunning();
    logger.debug("Checked scrape running status", { isRunning });
    return isRunning;
  }

  /**
   * Get information about the last scrape
   */
  getLastScrapeInfo() {
    const info = this.repository.getLastScrapeInfo();
    logger.debug("Retrieved last scrape info", {
      lastScrapeAt: info?.lastScrapeAt,
      isRunning: info?.isRunning,
    });
    return info;
  }

  /**
   * Clean up resources
   */
  async close(): Promise<void> {
    logger.info("Closing ScraperService and cleaning up resources");
    try {
      await this.repository.close();
      logger.info("ScraperService closed successfully");
    } catch (error) {
      logger.error("Error while closing ScraperService", { error });
      throw error;
    }
  }
}
