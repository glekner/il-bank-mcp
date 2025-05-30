import { CompanyTypes, createScraper } from "israeli-bank-scrapers";
import { ScrapedAccountData, VisaCalCredentials } from "../types";
import { logger } from "../utils/logger";
import { getChromeExecutablePath } from "../utils/chrome";
import { BaseScraper } from "./base";

export class VisaCalScraper implements BaseScraper {
  type = "visaCal" as const;
  private credentials: VisaCalCredentials;

  constructor(credentials: VisaCalCredentials) {
    this.credentials = credentials;
  }

  async scrape(): Promise<ScrapedAccountData> {
    try {
      logger.info("Starting Visa Cal scraper");

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

      logger.info("Initializing Visa Cal scraper");
      const options = {
        companyId: CompanyTypes.visaCal,
        startDate: new Date(
          new Date().setMonth(new Date().getMonth() - monthsBack)
        ),
        verbose: false,
        headless: true,
        executablePath,
        args: chromeArgs,
      };

      const scraper = createScraper(options);

      logger.info("Starting Visa Cal scraping process");
      const scrapeResult = await scraper.scrape(this.credentials);

      if (!scrapeResult.success) {
        logger.error("Visa Cal scraping failed", {
          error: scrapeResult.errorType,
        });
        throw new Error(`Visa Cal scraping failed: ${scrapeResult.errorType}`);
      }

      // Check if accounts exist
      if (!scrapeResult.accounts || scrapeResult.accounts.length === 0) {
        logger.error("No Visa Cal accounts found in scrape result");
        throw new Error("No Visa Cal accounts found");
      }

      logger.info("Visa Cal scraping completed successfully", {
        accountsFound: scrapeResult.accounts.length,
      });

      // Format data into our application structure
      return this.formatScrapedData(scrapeResult.accounts);
    } catch (error) {
      logger.error("Error during Visa Cal scraping process", { error });
      throw new Error(
        `Visa Cal scraping process error: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  private formatScrapedData(accounts: any[]): ScrapedAccountData {
    logger.info("Formatting Visa Cal scraped data");

    // Extract all transactions from all accounts
    const allTransactions = accounts.flatMap((account) => {
      logger.info(`Processing Visa Cal account ${account.accountNumber}`, {
        transactionCount: account.txns?.length || 0,
      });

      return (
        account.txns?.map((txn: any) => {
          // Log transaction details for debugging
          if (txn.amount === null || txn.amount === undefined) {
            logger.warn("Visa Cal transaction with null/undefined amount", {
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
            id: `visacal-${txn.identifier || txn.date}-${txn.description}-${amount}`,
            date: new Date(txn.date),
            description: `${txn.description || "No description"}${installmentInfo}`,
            amount: amount,
            category: txn.category || "Credit Card",
            accountId: `visacal-${account.accountNumber}`,
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
        logger.warn("Filtering out invalid Visa Cal transaction", {
          transaction: txn,
        });
        return false;
      }
      return true;
    });

    logger.info(
      `Processed ${validTransactions.length} valid Visa Cal transactions out of ${allTransactions.length} total`
    );

    // Extract account information
    const accountsInfo = accounts.map((account) => ({
      id: `visacal-${account.accountNumber}`,
      balance: account.balance ?? 0,
      type: "Credit Card",
      name: `Visa Cal - ${account.accountNumber}`,
    }));

    return {
      accounts: accountsInfo,
      transactions: validTransactions,
      rawData: accounts,
      scrapedAt: new Date(),
    };
  }
}
