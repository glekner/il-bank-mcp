"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = exports.ScraperService = void 0;
exports.scrapeAndAnalyzeData = scrapeAndAnalyzeData;
var scraperService_1 = require("./services/scraperService");
Object.defineProperty(exports, "ScraperService", { enumerable: true, get: function () { return scraperService_1.ScraperService; } });
__exportStar(require("./types"), exports);
var logger_1 = require("./utils/logger");
Object.defineProperty(exports, "logger", { enumerable: true, get: function () { return logger_1.logger; } });
const scraper_1 = require("./scraper");
const transactionProcessor_1 = require("./processors/transactionProcessor");
const trendAnalyzer_1 = require("./analyzers/trendAnalyzer");
const incomeAnalyzer_1 = require("./analyzers/incomeAnalyzer");
const expenseAnalyzer_1 = require("./analyzers/expenseAnalyzer");
const logger_2 = require("./utils/logger");
async function scrapeAndAnalyzeData() {
    try {
        logger_2.logger.info("Starting Bank Leumi data scraping process");
        const scrapedData = await (0, scraper_1.scrapeBankData)();
        const processedTransactions = (0, transactionProcessor_1.processTransactions)(scrapedData.transactions);
        const financialTrends = (0, trendAnalyzer_1.analyzeFinancialTrends)(processedTransactions);
        const incomeBreakdown = (0, incomeAnalyzer_1.categorizeIncome)(processedTransactions);
        const expenseBreakdown = (0, expenseAnalyzer_1.categorizeExpenses)(processedTransactions);
        logger_2.logger.info("Data scraping and processing completed successfully");
        return {
            transactions: processedTransactions,
            trends: financialTrends,
            income: incomeBreakdown,
            expenses: expenseBreakdown,
        };
    }
    catch (error) {
        logger_2.logger.error("Error in the scraping process", { error });
        throw error;
    }
}
if (require.main === module) {
    scrapeAndAnalyzeData()
        .then((result) => {
        console.log("Scraping completed successfully");
        console.log("Transactions:", result.transactions.length);
        console.log("Income categories:", Object.keys(result.income).length);
        console.log("Expense categories:", Object.keys(result.expenses).length);
    })
        .catch((error) => {
        console.error("Failed to complete scraping:", error);
        process.exit(1);
    });
}
//# sourceMappingURL=index.js.map