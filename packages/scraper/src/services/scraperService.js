"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ScraperService = void 0;
const scraper_1 = require("../scraper");
const repository_1 = require("../database/repository");
const transactionProcessor_1 = require("../processors/transactionProcessor");
const trendAnalyzer_1 = require("../analyzers/trendAnalyzer");
const incomeAnalyzer_1 = require("../analyzers/incomeAnalyzer");
const expenseAnalyzer_1 = require("../analyzers/expenseAnalyzer");
const logger_1 = require("../utils/logger");
class ScraperService {
    repository;
    constructor() {
        this.repository = new repository_1.BankDataRepository();
    }
    async scrapeAndSave() {
        try {
            logger_1.logger.info("Starting bank data scraping");
            if (!this.repository.shouldScrape()) {
                logger_1.logger.info("Skipping scrape - data is still fresh");
                return;
            }
            const scrapedData = await (0, scraper_1.scrapeBankData)();
            this.repository.saveScrapedData(scrapedData);
            logger_1.logger.info("Bank data scraped and saved successfully");
        }
        catch (error) {
            logger_1.logger.error("Failed to scrape and save bank data", { error });
            throw error;
        }
    }
    async forceScrape() {
        try {
            logger_1.logger.info("Force scraping bank data");
            const scrapedData = await (0, scraper_1.scrapeBankData)();
            this.repository.saveScrapedData(scrapedData);
            logger_1.logger.info("Bank data force scraped and saved successfully");
        }
        catch (error) {
            logger_1.logger.error("Failed to force scrape bank data", { error });
            throw error;
        }
    }
    async getFinancialSummary(startDate, endDate) {
        try {
            const transactions = this.repository.getTransactions(startDate, endDate);
            const processedTransactions = (0, transactionProcessor_1.processTransactions)(transactions);
            const trends = (0, trendAnalyzer_1.analyzeFinancialTrends)(processedTransactions);
            const income = (0, incomeAnalyzer_1.categorizeIncome)(processedTransactions);
            const expenses = (0, expenseAnalyzer_1.categorizeExpenses)(processedTransactions);
            return {
                transactions: processedTransactions,
                trends,
                income,
                expenses,
            };
        }
        catch (error) {
            logger_1.logger.error("Failed to get financial summary", { error });
            throw error;
        }
    }
    async getTransactions(options) {
        return this.repository.getTransactions(options?.startDate, options?.endDate, options?.accountId);
    }
    async getAccounts() {
        return this.repository.getAccounts();
    }
    async getAccountBalanceHistory(accountId, days = 30) {
        return this.repository.getAccountBalanceHistory(accountId, days);
    }
    close() {
        this.repository.close();
    }
}
exports.ScraperService = ScraperService;
//# sourceMappingURL=scraperService.js.map