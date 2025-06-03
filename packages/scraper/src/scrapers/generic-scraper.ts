import {
  CompanyTypes,
  createScraper,
  type ScraperOptions,
} from 'israeli-bank-scrapers';
import type { TransactionsAccount } from 'israeli-bank-scrapers/lib/transactions';
import { ProviderCredentials, ScrapedAccountData } from '../types';
import { getChromeExecutablePath } from '../utils/chrome';
import { logger } from '../utils/logger';
import { getProviderDisplayName, type ProviderKey } from '../utils/providers';
import { BaseScraper } from './base';

/**
 * Generic scraper that can handle any Israeli bank provider
 */
export class GenericScraper implements BaseScraper {
  type: ProviderKey;
  private credentials: ProviderCredentials;
  private companyType: CompanyTypes;

  constructor(
    type: ProviderKey,
    companyType: CompanyTypes,
    credentials: ProviderCredentials
  ) {
    this.type = type;
    this.companyType = companyType;
    this.credentials = credentials;
  }

  async scrape(): Promise<ScrapedAccountData> {
    try {
      logger.info(`Starting ${this.type} scraper`);

      // Get months to scrape from environment variable
      const monthsBack = parseInt(process.env.SCRAPE_MONTHS_BACK || '6', 10);

      // Get the path to Chrome executable
      const executablePath = getChromeExecutablePath();
      if (!executablePath) {
        throw new Error(
          'Chrome executable not found. Please run: npx puppeteer browsers install chrome'
        );
      }
      logger.info('Using Chrome executable', { path: executablePath });

      // Get Chrome args from environment or use defaults
      const defaultArgs = [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-web-security',
        '--disable-features=IsolateOrigins',
        '--disable-site-isolation-trials',
      ];

      const envArgs = process.env.PUPPETEER_ARGS?.split(',') || [];
      const chromeArgs = envArgs.length > 0 ? envArgs : defaultArgs;

      logger.info(`Initializing ${this.type} scraper`);

      const options = {
        companyId: this.companyType,
        startDate: new Date(
          new Date().setMonth(new Date().getMonth() - monthsBack)
        ),
        verbose: false,
        executablePath,
        args: chromeArgs,
        navigationRetryCount: 3,
        additionalTransactionInformation: true,
      } satisfies ScraperOptions;

      const scraper = createScraper(options);

      logger.info('Starting scraping process');
      const scrapeResult = await scraper.scrape(this.credentials);

      if (!scrapeResult.success) {
        logger.error(`${this.type} scraping failed`, {
          error: scrapeResult.errorType,
          message: scrapeResult.errorMessage,
        });
        throw new Error(
          `${this.type} scraping failed: ${scrapeResult.errorType} - ${scrapeResult.errorMessage || ''}`
        );
      }

      // Check if accounts exist
      if (!scrapeResult.accounts || scrapeResult.accounts.length === 0) {
        logger.error(`No ${this.type} accounts found in scrape result`);
        throw new Error(`No ${this.type} accounts found`);
      }

      logger.info(`${this.type} scraping completed successfully`, {
        accountsFound: scrapeResult.accounts.length,
      });

      // Format data into our application structure
      return this.formatScrapedData(scrapeResult.accounts);
    } catch (error) {
      logger.error(`Error during ${this.type} scraping process`, { error });
      throw new Error(
        `${this.type} scraping process error: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  private formatScrapedData(
    accounts: TransactionsAccount[]
  ): ScrapedAccountData {
    logger.info(`Formatting ${this.type} scraped data`);

    // Extract all transactions from all accounts
    const allTransactions = accounts.flatMap(account => {
      logger.info(`Processing ${this.type} account ${account.accountNumber}`, {
        transactionCount: account.txns?.length || 0,
      });

      return (
        account.txns?.map(txn => {
          // Log transaction details for debugging
          if (txn.chargedAmount === null || txn.chargedAmount === undefined) {
            logger.warn(
              `${this.type} transaction with null/undefined chargedAmount`,
              {
                date: txn.date,
                description: txn.description,
                originalAmount: txn.originalAmount,
                chargedAmount: txn.chargedAmount,
              }
            );
          }

          // Use chargedAmount or originalAmount if chargedAmount is not available
          const amount = txn.chargedAmount ?? txn.originalAmount ?? 0;

          // Determine if this transaction is still pending (library returns null amounts for pending)
          const isPending =
            txn.chargedAmount == null && txn.originalAmount == null;

          return {
            id: `${this.type}-${txn.identifier || txn.date}-${txn.description}-${amount}`,
            date: new Date(txn.date),
            description: txn.description || 'No description',
            amount: amount,
            category: txn.category || 'Uncategorized',
            accountId: `${this.type}-${account.accountNumber}`,
            reference: null, // Reference field doesn't exist in israeli-bank-scrapers
            memo: txn.memo || null,
            pending: isPending,
          };
        }) || []
      );
    });

    // Filter out any invalid transactions
    const validTransactions = allTransactions.filter(txn => {
      if (
        !txn.date ||
        !txn.description ||
        txn.amount === null ||
        txn.amount === undefined
      ) {
        logger.warn(`Filtering out invalid ${this.type} transaction`, {
          transaction: txn,
        });
        return false;
      }
      return true;
    });

    logger.info(
      `Processed ${validTransactions.length} valid ${this.type} transactions out of ${allTransactions.length} total`
    );

    // Extract account information
    const accountsInfo = accounts.map(account => ({
      id: `${this.type}-${account.accountNumber}`,
      balance: account.balance ?? 0,
      type: this.getAccountTypeForProvider(), // account.type doesn't exist in israeli-bank-scrapers
      name: `${getProviderDisplayName(this.type)} - ${account.accountNumber}`,
    }));

    return {
      accounts: accountsInfo,
      transactions: validTransactions,
      rawData: accounts,
      scrapedAt: new Date(),
    };
  }

  private getAccountTypeForProvider(): string {
    // Credit card providers
    const creditCardProviders = ['visaCal', 'max', 'isracard', 'amex'];
    return creditCardProviders.includes(this.type) ? 'Credit Card' : 'Bank';
  }
}
