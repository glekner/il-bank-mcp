import { CompanyTypes, createScraper } from "israeli-bank-scrapers";
import { ScrapedAccountData, LeumiCredentials } from "../types";
import { logger } from "../utils/logger";

import { BaseScraper } from "./base";
import { getChromeExecutablePath } from "../utils/chrome";

export class LeumiScraper implements BaseScraper {
  type = "leumi" as const;
  private credentials: LeumiCredentials;

  constructor(credentials: LeumiCredentials) {
    this.credentials = credentials;
  }

  async scrape(): Promise<ScrapedAccountData> {
    try {
      logger.info("Starting Bank Leumi scraper");

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

      // Get Chrome args from environment or use defaults
      const defaultArgs = [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
        "--disable-web-security",
        "--disable-features=IsolateOrigins",
        "--disable-site-isolation-trials",
      ];

      const envArgs = process.env.PUPPETEER_ARGS?.split(",") || [];
      const chromeArgs = envArgs.length > 0 ? envArgs : defaultArgs;

      logger.info("Initializing Bank Leumi scraper");
      const options = {
        companyId: CompanyTypes.leumi,
        startDate: new Date(
          new Date().setMonth(new Date().getMonth() - monthsBack)
        ),
        verbose: false,
        headless: true,
        executablePath,
        args: chromeArgs,
      };

      const scraper = createScraper(options);

      logger.info("Starting scraping process");
      const scrapeResult = await scraper.scrape(this.credentials);

      if (!scrapeResult.success) {
        logger.error("Leumi scraping failed", {
          error: scrapeResult.errorType,
        });
        throw new Error(`Leumi scraping failed: ${scrapeResult.errorType}`);
      }

      // Check if accounts exist
      if (!scrapeResult.accounts || scrapeResult.accounts.length === 0) {
        logger.error("No Leumi accounts found in scrape result");
        throw new Error("No Leumi accounts found");
      }

      logger.info("Leumi scraping completed successfully", {
        accountsFound: scrapeResult.accounts.length,
      });

      // Format data into our application structure
      return this.formatScrapedData(scrapeResult.accounts);
    } catch (error) {
      logger.error("Error during Leumi scraping process", { error });
      throw new Error(
        `Leumi scraping process error: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  private formatScrapedData(accounts: any[]): ScrapedAccountData {
    logger.info("Formatting Leumi scraped data");

    // Extract all transactions from all accounts
    const allTransactions = accounts.flatMap((account) => {
      logger.info(`Processing Leumi account ${account.accountNumber}`, {
        transactionCount: account.txns?.length || 0,
      });

      return (
        account.txns?.map((txn: any) => {
          // Log transaction details for debugging
          if (txn.amount === null || txn.amount === undefined) {
            logger.warn("Leumi transaction with null/undefined amount", {
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
            id: `leumi-${txn.identifier || txn.date}-${txn.description}-${amount}`,
            date: new Date(txn.date),
            description: txn.description || "No description",
            amount: amount,
            category: txn.category || "Uncategorized",
            accountId: `leumi-${account.accountNumber}`,
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
        logger.warn("Filtering out invalid Leumi transaction", {
          transaction: txn,
        });
        return false;
      }
      return true;
    });

    logger.info(
      `Processed ${validTransactions.length} valid Leumi transactions out of ${allTransactions.length} total`
    );

    // Extract account information
    const accountsInfo = accounts.map((account) => ({
      id: `leumi-${account.accountNumber}`,
      balance: account.balance ?? 0,
      type: account.type || "Bank",
      name: `Bank Leumi - ${account.accountNumber}`,
    }));

    return {
      accounts: accountsInfo,
      transactions: validTransactions,
      rawData: accounts,
      scrapedAt: new Date(),
    };
  }
}
