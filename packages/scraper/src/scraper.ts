import { CompanyTypes, createScraper } from "israeli-bank-scrapers";
import { ScrapedAccountData } from "./types";
import { loadCredentials } from "./utils/credentials";
import { logger } from "./utils/logger";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

/**
 * Get the Chrome executable path installed by puppeteer
 */
function getChromeExecutablePath(): string | undefined {
  const cacheDir = path.join(os.homedir(), ".cache", "puppeteer", "chrome");

  try {
    if (fs.existsSync(cacheDir)) {
      const chromeDirs = fs.readdirSync(cacheDir);

      for (const dir of chromeDirs) {
        const platform = process.platform;
        let executablePath: string;

        if (platform === "darwin") {
          // macOS path
          executablePath = path.join(
            cacheDir,
            dir,
            fs.readdirSync(path.join(cacheDir, dir))[0],
            "Google Chrome for Testing.app",
            "Contents",
            "MacOS",
            "Google Chrome for Testing"
          );
        } else if (platform === "win32") {
          // Windows path
          executablePath = path.join(
            cacheDir,
            dir,
            fs.readdirSync(path.join(cacheDir, dir))[0],
            "chrome.exe"
          );
        } else {
          // Linux path
          executablePath = path.join(
            cacheDir,
            dir,
            fs.readdirSync(path.join(cacheDir, dir))[0],
            "chrome"
          );
        }

        if (fs.existsSync(executablePath)) {
          return executablePath;
        }
      }
    }
  } catch (error) {
    logger.error("Error finding Chrome executable", { error });
  }

  return undefined;
}

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

    // Get the path to Chrome executable
    const executablePath = getChromeExecutablePath();
    if (!executablePath) {
      throw new Error(
        "Chrome executable not found. Please run: npx puppeteer browsers install chrome"
      );
    }
    logger.info("Using Chrome executable", { path: executablePath });

    logger.info("Initializing Bank Leumi scraper");
    const options = {
      companyId: CompanyTypes.leumi, // Use CompanyTypes enum
      startDate: new Date(
        new Date().setMonth(new Date().getMonth() - monthsBack)
      ), // Use environment variable
      verbose: false,
      // Browser launch options should be passed directly in options, not wrapped in browser object
      headless: true,
      executablePath, // Use puppeteer's Chrome installation
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
  const allTransactions = accounts.flatMap((account) => {
    logger.info(`Processing account ${account.accountNumber}`, {
      transactionCount: account.txns?.length || 0,
    });

    return (
      account.txns?.map((txn: any) => {
        // Log transaction details for debugging
        if (txn.amount === null || txn.amount === undefined) {
          logger.warn("Transaction with null/undefined amount", {
            date: txn.date,
            description: txn.description,
            originalAmount: txn.originalAmount,
            chargedAmount: txn.chargedAmount,
          });
        }

        // Use chargedAmount or originalAmount if amount is not available
        const amount =
          txn.amount ?? txn.chargedAmount ?? txn.originalAmount ?? 0;

        return {
          id: `${txn.identifier || txn.date}-${txn.description}-${amount}`,
          date: new Date(txn.date),
          description: txn.description || "No description",
          amount: amount,
          category: txn.category || "Uncategorized",
          accountId: account.accountNumber,
          reference: txn.reference || null,
          memo: txn.memo || null,
        };
      }) || []
    );
  });

  // Filter out any invalid transactions
  const validTransactions = allTransactions.filter((txn) => {
    if (
      !txn.date ||
      !txn.description ||
      txn.amount === null ||
      txn.amount === undefined
    ) {
      logger.warn("Filtering out invalid transaction", { transaction: txn });
      return false;
    }
    return true;
  });

  logger.info(
    `Processed ${validTransactions.length} valid transactions out of ${allTransactions.length} total`
  );

  // Extract account information
  const accountsInfo = accounts.map((account) => ({
    id: account.accountNumber,
    balance: account.balance ?? 0,
    type: account.type || "Unknown",
    name: `Bank Leumi - ${account.accountNumber}`,
  }));

  return {
    accounts: accountsInfo,
    transactions: validTransactions,
    rawData: accounts, // Keep raw data for reference if needed
    scrapedAt: new Date(),
  };
}
