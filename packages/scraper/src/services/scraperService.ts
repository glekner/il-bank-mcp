import { scrapeBankData } from "../scraper";
import { BankDataRepository } from "../database/repository";
import { processTransactions } from "../processors/transactionProcessor";
import { analyzeFinancialTrends } from "../analyzers/trendAnalyzer";
import { categorizeIncome } from "../analyzers/incomeAnalyzer";
import { categorizeExpenses } from "../analyzers/expenseAnalyzer";
import { logger } from "../utils/logger";
import { FinancialSummary, Transaction } from "../types";

export class ScraperService {
  private repository: BankDataRepository;

  constructor() {
    this.repository = new BankDataRepository();
  }

  /**
   * Scrape fresh data from bank and save to database
   */
  async scrapeAndSave(): Promise<void> {
    try {
      logger.info("Starting bank data scraping");

      // Check if we should scrape
      if (!this.repository.shouldScrape()) {
        logger.info("Skipping scrape - data is still fresh");
        return;
      }

      // Scrape data
      const scrapedData = await scrapeBankData();

      // Save to database
      this.repository.saveScrapedData(scrapedData);

      logger.info("Bank data scraped and saved successfully");
    } catch (error) {
      logger.error("Failed to scrape and save bank data", { error });
      throw error;
    }
  }

  /**
   * Force a fresh scrape regardless of last scrape time
   */
  async forceScrape(): Promise<void> {
    try {
      logger.info("Force scraping bank data");

      // Scrape data
      const scrapedData = await scrapeBankData();

      // Save to database
      this.repository.saveScrapedData(scrapedData);

      logger.info("Bank data force scraped and saved successfully");
    } catch (error) {
      logger.error("Failed to force scrape bank data", { error });
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
    try {
      // Get transactions from database
      const transactions = this.repository.getTransactions(startDate, endDate);

      // Process and analyze
      const processedTransactions = processTransactions(transactions);
      const trends = analyzeFinancialTrends(processedTransactions);
      const income = categorizeIncome(processedTransactions);
      const expenses = categorizeExpenses(processedTransactions);

      return {
        transactions: processedTransactions,
        trends,
        income,
        expenses,
      };
    } catch (error) {
      logger.error("Failed to get financial summary", { error });
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
    return this.repository.getTransactions(
      options?.startDate,
      options?.endDate,
      options?.accountId
    );
  }

  /**
   * Get all accounts
   */
  async getAccounts() {
    return this.repository.getAccounts();
  }

  /**
   * Get account balance history
   */
  async getAccountBalanceHistory(accountId: string, days = 30) {
    return this.repository.getAccountBalanceHistory(accountId, days);
  }

  /**
   * Clean up resources
   */
  close(): void {
    this.repository.close();
  }
}
