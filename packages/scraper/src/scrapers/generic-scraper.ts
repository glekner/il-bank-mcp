import { CompanyTypes, createScraper } from 'israeli-bank-scrapers';
import { ScrapedAccountData, ProviderCredentials } from '../types';
import { logger } from '../utils/logger';
import { BaseScraper } from './base';
import { getChromeExecutablePath } from '../utils/chrome';
import type { ProviderKey } from '../utils/providers';

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
      const monthsBack = parseInt(process.env.SCRAPE_MONTHS_BACK || '3', 10);

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
        headless: true,
        executablePath,
        args: chromeArgs,
      };

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

  private formatScrapedData(accounts: any[]): ScrapedAccountData {
    logger.info(`Formatting ${this.type} scraped data`);

    // Extract all transactions from all accounts
    const allTransactions = accounts.flatMap(account => {
      logger.info(`Processing ${this.type} account ${account.accountNumber}`, {
        transactionCount: account.txns?.length || 0,
      });

      return (
        account.txns?.map((txn: any) => {
          // Log transaction details for debugging
          if (txn.amount === null || txn.amount === undefined) {
            logger.warn(`${this.type} transaction with null/undefined amount`, {
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
            id: `${this.type}-${txn.identifier || txn.date}-${txn.description}-${amount}`,
            date: new Date(txn.date),
            description: txn.description || 'No description',
            amount: amount,
            category: txn.category || 'Uncategorized',
            accountId: `${this.type}-${account.accountNumber}`,
            reference: txn.reference || null,
            memo: txn.memo || null,
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
      type: account.type || this.getAccountTypeForProvider(),
      name: `${this.getProviderDisplayName()} - ${account.accountNumber}`,
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

  private getProviderDisplayName(): string {
    const displayNames: Record<string, string> = {
      hapoalim: 'Bank Hapoalim',
      leumi: 'Bank Leumi',
      discount: 'Discount Bank',
      mercantile: 'Mercantile Bank',
      mizrahi: 'Mizrahi Bank',
      otsarHahayal: 'Bank Otsar Hahayal',
      visaCal: 'Visa Cal',
      max: 'Max (Leumi Card)',
      isracard: 'Isracard',
      amex: 'Amex',
      union: 'Union Bank',
      beinleumi: 'Beinleumi',
      massad: 'Massad',
      yahav: 'Yahav',
      beyahadBishvilha: 'Beyhad Bishvilha',
      oneZero: 'OneZero',
      behatsdaa: 'Behatsdaa',
    };

    return displayNames[this.type] || this.type;
  }
}
