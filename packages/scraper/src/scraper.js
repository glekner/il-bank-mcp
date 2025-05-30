"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.scrapeBankData = scrapeBankData;
const israeli_bank_scrapers_1 = require("israeli-bank-scrapers");
const credentials_1 = require("./utils/credentials");
const logger_1 = require("./utils/logger");
async function scrapeBankData() {
    try {
        logger_1.logger.info("Loading Bank Leumi credentials");
        const credentials = (0, credentials_1.loadCredentials)();
        const monthsBack = parseInt(process.env.SCRAPE_MONTHS_BACK || "3", 10);
        logger_1.logger.info("Initializing Bank Leumi scraper");
        const options = {
            companyId: israeli_bank_scrapers_1.CompanyTypes.leumi,
            startDate: new Date(new Date().setMonth(new Date().getMonth() - monthsBack)),
            verbose: false,
            browser: {
                headless: true,
            },
        };
        const scraper = (0, israeli_bank_scrapers_1.createScraper)(options);
        logger_1.logger.info("Starting scraping process");
        const scrapeResult = await scraper.scrape(credentials);
        if (!scrapeResult.success) {
            logger_1.logger.error("Scraping failed", { error: scrapeResult.errorType });
            throw new Error(`Scraping failed: ${scrapeResult.errorType}`);
        }
        if (!scrapeResult.accounts || scrapeResult.accounts.length === 0) {
            logger_1.logger.error("No accounts found in scrape result");
            throw new Error("No accounts found");
        }
        logger_1.logger.info("Scraping completed successfully", {
            accountsFound: scrapeResult.accounts.length,
        });
        return formatScrapedData(scrapeResult.accounts);
    }
    catch (error) {
        logger_1.logger.error("Error during scraping process", { error });
        throw new Error(`Scraping process error: ${error instanceof Error ? error.message : String(error)}`);
    }
}
function formatScrapedData(accounts) {
    logger_1.logger.info("Formatting scraped data");
    const transactions = accounts.flatMap((account) => account.txns.map((txn) => ({
        id: `${txn.identifier || txn.date}-${txn.description}-${txn.amount}`,
        date: new Date(txn.date),
        description: txn.description,
        amount: txn.amount,
        category: txn.category || "Uncategorized",
        accountId: account.accountNumber,
        reference: txn.reference || null,
        memo: txn.memo || null,
    })));
    const accountsInfo = accounts.map((account) => ({
        id: account.accountNumber,
        balance: account.balance,
        type: account.type || "Unknown",
        name: `Bank Leumi - ${account.accountNumber}`,
    }));
    return {
        accounts: accountsInfo,
        transactions,
        rawData: accounts,
        scrapedAt: new Date(),
    };
}
//# sourceMappingURL=scraper.js.map