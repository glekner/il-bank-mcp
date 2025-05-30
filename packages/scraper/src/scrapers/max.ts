import { CompanyTypes, createScraper } from "israeli-bank-scrapers";
import { ScrapedAccountData, MaxCredentials } from "../types";
import { logger } from "../utils/logger";
import { getChromeExecutablePath } from "../utils/chrome";
import { BaseScraper } from "./base";

export class MaxScraper implements BaseScraper {
  type = "max" as const;
  private credentials: MaxCredentials;

  constructor(credentials: MaxCredentials) {
    this.credentials = credentials;
  }

  async scrape(): Promise<ScrapedAccountData> {
    try {
      logger.info("Starting Max (Leumi Card) scraper");

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

      logger.info("Initializing Max scraper");
      const options = {
        companyId: CompanyTypes.max,
        startDate: new Date(
          new Date().setMonth(new Date().getMonth() - monthsBack)
        ),
        verbose: false,
        headless: true,
        executablePath,
        args: chromeArgs,
      };

      const scraper = createScraper(options);

      logger.info("Starting Max scraping process");
      const scrapeResult = await scraper.scrape(this.credentials);

      if (!scrapeResult.success) {
        logger.error("Max scraping failed", { error: scrapeResult.errorType });
        throw new Error(`Max scraping failed: ${scrapeResult.errorType}`);
      }

      // Check if accounts exist
      if (!scrapeResult.accounts || scrapeResult.accounts.length === 0) {
        logger.error("No Max accounts found in scrape result");
        throw new Error("No Max accounts found");
      }

      logger.info("Max scraping completed successfully", {
        accountsFound: scrapeResult.accounts.length,
      });

      // Format data into our application structure
      return this.formatScrapedData(scrapeResult.accounts);
    } catch (error) {
      logger.error("Error during Max scraping process", { error });
      throw new Error(
        `Max scraping process error: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  private formatScrapedData(accounts: any[]): ScrapedAccountData {
    logger.info("Formatting Max scraped data");

    // Extract all transactions from all accounts
    const allTransactions = accounts.flatMap((account) => {
      logger.info(`Processing Max account ${account.accountNumber}`, {
        transactionCount: account.txns?.length || 0,
      });

      return (
        account.txns?.map((txn: any) => {
          // Log transaction details for debugging
          if (txn.amount === null || txn.amount === undefined) {
            logger.warn("Max transaction with null/undefined amount", {
              date: txn.date,
              description: txn.description,
              originalAmount: txn.originalAmount,
              chargedAmount: txn.chargedAmount,
            });
          }

          // Use chargedAmount or originalAmount if amount is not available
          const amount =
            txn.amount ?? txn.chargedAmount ?? txn.originalAmount ?? 0;

          // Handle installments if present
          const installmentInfo = txn.installments
            ? ` (${txn.installments.number}/${txn.installments.total})`
            : "";

          return {
            id: `max-${txn.identifier || txn.date}-${txn.description}-${amount}`,
            date: new Date(txn.date),
            description: `${txn.description || "No description"}${installmentInfo}`,
            amount: amount,
            category: txn.category || "Credit Card",
            accountId: `max-${account.accountNumber}`,
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
        logger.warn("Filtering out invalid Max transaction", {
          transaction: txn,
        });
        return false;
      }
      return true;
    });

    logger.info(
      `Processed ${validTransactions.length} valid Max transactions out of ${allTransactions.length} total`
    );

    // Extract account information
    const accountsInfo = accounts.map((account) => ({
      id: `max-${account.accountNumber}`,
      balance: account.balance ?? 0,
      type: "Credit Card",
      name: `Max (Leumi Card) - ${account.accountNumber}`,
    }));

    return {
      accounts: accountsInfo,
      transactions: validTransactions,
      rawData: accounts,
      scrapedAt: new Date(),
    };
  }
}
