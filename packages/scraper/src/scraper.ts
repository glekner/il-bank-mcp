import { CompanyTypes, createScraper } from "israeli-bank-scrapers";
import { ScrapedAccountData } from "./types";
import { loadCredentials } from "./utils/credentials";
import { logger } from "./utils/logger";

/**
 * Scrapes financial data from Bank Leumi
 * @returns Promise resolving to the scraped data
 */
export async function scrapeBankData(): Promise<ScrapedAccountData> {
  try {
    logger.info("Loading Bank Leumi credentials");
    const credentials = loadCredentials();

    // Get months to scrape from environment variable
    const monthsBack = parseInt(process.env.SCRAPE_MONTHS_BACK || "3", 10);

    logger.info("Initializing Bank Leumi scraper");
    const options = {
      companyId: CompanyTypes.leumi, // Use CompanyTypes enum
      startDate: new Date(
        new Date().setMonth(new Date().getMonth() - monthsBack)
      ), // Use environment variable
      verbose: false,
      browser: {
        headless: true,
      },
    };

    const scraper = createScraper(options);

    logger.info("Starting scraping process");
    const scrapeResult = await scraper.scrape(credentials);

    if (!scrapeResult.success) {
      logger.error("Scraping failed", { error: scrapeResult.errorType });
      throw new Error(`Scraping failed: ${scrapeResult.errorType}`);
    }

    // Check if accounts exist
    if (!scrapeResult.accounts || scrapeResult.accounts.length === 0) {
      logger.error("No accounts found in scrape result");
      throw new Error("No accounts found");
    }

    logger.info("Scraping completed successfully", {
      accountsFound: scrapeResult.accounts.length,
    });

    // Format data into our application structure
    return formatScrapedData(scrapeResult.accounts);
  } catch (error) {
    logger.error("Error during scraping process", { error });
    throw new Error(
      `Scraping process error: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Formats the raw scraped data into our application structure
 */
function formatScrapedData(accounts: any[]): ScrapedAccountData {
  logger.info("Formatting scraped data");

  // Extract all transactions from all accounts
  const transactions = accounts.flatMap((account) =>
    account.txns.map((txn: any) => ({
      id: `${txn.identifier || txn.date}-${txn.description}-${txn.amount}`,
      date: new Date(txn.date),
      description: txn.description,
      amount: txn.amount,
      category: txn.category || "Uncategorized",
      accountId: account.accountNumber,
      reference: txn.reference || null,
      memo: txn.memo || null,
    }))
  );

  // Extract account information
  const accountsInfo = accounts.map((account) => ({
    id: account.accountNumber,
    balance: account.balance,
    type: account.type || "Unknown",
    name: `Bank Leumi - ${account.accountNumber}`,
  }));

  return {
    accounts: accountsInfo,
    transactions,
    rawData: accounts, // Keep raw data for reference if needed
    scrapedAt: new Date(),
  };
}
