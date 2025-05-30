import { categorizeExpenses } from "../analyzers/expenseAnalyzer";
import { categorizeIncome } from "../analyzers/incomeAnalyzer";
import { analyzeFinancialTrends } from "../analyzers/trendAnalyzer";
import { BankDataRepository } from "../database/repository";
import { processTransactions } from "../processors/transactionProcessor";
import { scrapeAllBankData, scrapeSingleService } from "../scraper";
import { FinancialSummary, ServiceType, Transaction } from "../types";
import { logger } from "../utils/logger";

export class ScraperService {
  private repository: BankDataRepository;

  constructor() {
    this.repository = new BankDataRepository();
  }

  /**
   * Scrape fresh data from all configured banks/credit cards and save to database
   */
  async scrapeAndSave(): Promise<void> {
    try {
      logger.info("Starting multi-service data scraping");

      // Check if we should scrape
      if (!this.repository.shouldScrape()) {
        logger.info("Skipping scrape - data is still fresh");
        return;
      }

      // Scrape data from all services
      const scrapedData = await scrapeAllBankData();

      // Save to database
      this.repository.saveScrapedData(scrapedData);

      logger.info("Multi-service data scraped and saved successfully");
    } catch (error) {
      logger.error("Failed to scrape and save multi-service data", { error });
      throw error;
    }
  }

  /**
   * Scrape data from a specific service
   */
  async scrapeSingleServiceAndSave(service: ServiceType): Promise<void> {
    try {
      logger.info(`Starting ${service} data scraping`);

      // Scrape data from specific service
      const scrapedData = await scrapeSingleService(service);

      // Save to database
      this.repository.saveScrapedData(scrapedData);

      logger.info(`${service} data scraped and saved successfully`);
    } catch (error) {
      logger.error(`Failed to scrape and save ${service} data`, { error });
      throw error;
    }
  }

  /**
   * Force a fresh scrape of all services regardless of last scrape time
   */
  async forceScrape(): Promise<void> {
    try {
      logger.info("Force scraping multi-service data");

      // Scrape data from all services
      const scrapedData = await scrapeAllBankData();

      // Save to database
      this.repository.saveScrapedData(scrapedData);

      logger.info("Multi-service data force scraped and saved successfully");
    } catch (error) {
      logger.error("Failed to force scrape multi-service data", { error });
      throw error;
    }
  }

  /**
   * Force scrape a specific service
   */
  async forceScrapeService(service: ServiceType): Promise<void> {
    try {
      logger.info(`Force scraping ${service} data`);

      // Scrape data from specific service
      const scrapedData = await scrapeSingleService(service);

      // Save to database
      this.repository.saveScrapedData(scrapedData);

      logger.info(`${service} data force scraped and saved successfully`);
    } catch (error) {
      logger.error(`Failed to force scrape ${service} data`, { error });
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
