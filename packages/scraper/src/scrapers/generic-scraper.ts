import {
  CompanyTypes,
  createScraper,
  type ScraperOptions,
  type ScraperScrapingResult,
} from 'israeli-bank-scrapers';
import { ProviderCredentials, ScrapedAccountData } from '../types';
import { getChromeExecutablePath } from '../utils/chrome';
import { logger } from '../utils/logger';
import { getProviderDisplayName, type ProviderKey } from '../utils/providers';
import { BaseScraper } from './base';

type IBSTransaction = NonNullable<
  ScraperScrapingResult['accounts']
>[number]['txns'][number];

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

      const options = this.buildScraperOptions();
      const scraper = createScraper(options);

      logger.info('Starting scraping process');
      const scrapeResult = await scraper.scrape(this.credentials);

      this.validateScrapeResult(scrapeResult);

      logger.info(`${this.type} scraping completed successfully`, {
        accountsFound: scrapeResult.accounts!.length,
      });

      // Format data into our application structure
      return this.formatScrapedData(scrapeResult.accounts!);
    } catch (error) {
      logger.error(`Error during ${this.type} scraping process`, { error });
      throw new Error(
        `${this.type} scraping process error: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  private buildScraperOptions(): ScraperOptions {
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
    const chromeArgs = this.getChromeArgs();

    logger.info(`Initializing ${this.type} scraper`);

    return {
      companyId: this.companyType,
      startDate: new Date(
        new Date().setMonth(new Date().getMonth() - monthsBack)
      ),
      executablePath,
      verbose: false, // Disable verbose logging to reduce log noise
      args: chromeArgs,
      navigationRetryCount: 3,
      additionalTransactionInformation: true,
    };
  }

  private getChromeArgs(): string[] {
    const defaultArgs = [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--disable-web-security',
      '--disable-features=IsolateOrigins',
      '--disable-site-isolation-trials',
      // Add memory optimization flags for containers
      '--memory-pressure-off',
      '--disable-background-timer-throttling',
      '--disable-renderer-backgrounding',
      '--disable-backgrounding-occluded-windows',
    ];

    const envArgs =
      process.env.PUPPETEER_ARGS?.split(',').filter(Boolean) || [];
    return envArgs.length > 0 ? envArgs : defaultArgs;
  }

  private validateScrapeResult(
    result: ScraperScrapingResult
  ): asserts result is Required<Pick<ScraperScrapingResult, 'accounts'>> &
    ScraperScrapingResult {
    if (!result.success) {
      logger.error(`${this.type} scraping failed`, {
        error: result.errorType,
        message: result.errorMessage,
      });
      throw new Error(
        `${this.type} scraping failed: ${result.errorType} - ${result.errorMessage || ''}`
      );
    }

    // Check if accounts exist
    if (!result.accounts || result.accounts.length === 0) {
      logger.error(`No ${this.type} accounts found in scrape result`);
      throw new Error(`No ${this.type} accounts found`);
    }
  }

  private formatScrapedData(
    accounts: NonNullable<ScraperScrapingResult['accounts']>
  ): ScrapedAccountData {
    logger.info(`Formatting ${this.type} scraped data`);

    // Extract all transactions from all accounts
    const allTransactions = this.extractTransactions(accounts!);

    // Filter out any invalid transactions
    const validTransactions = this.filterValidTransactions(allTransactions);

    logger.info(
      `Processed ${validTransactions.length} valid ${this.type} transactions out of ${allTransactions.length} total`
    );

    // Extract account information
    const accountsInfo = this.extractAccountInfo(accounts!);

    return {
      accounts: accountsInfo,
      transactions: validTransactions,
      rawData: accounts as unknown[],
      scrapedAt: new Date(),
    };
  }

  private extractTransactions(
    accounts: NonNullable<ScraperScrapingResult['accounts']>
  ) {
    return accounts.flatMap(account => {
      logger.info(`Processing ${this.type} account ${account.accountNumber}`, {
        transactionCount: account.txns?.length || 0,
      });

      return (account.txns || []).map(txn =>
        this.mapTransaction(txn, account.accountNumber)
      );
    });
  }

  private mapTransaction(txn: IBSTransaction, accountNumber: string) {
    // Log transaction details for debugging
    if (txn.chargedAmount === null || txn.chargedAmount === undefined) {
      logger.warn(
        `${this.type} transaction with null/undefined chargedAmount`,
        {
          date: txn.date,
          description: txn.description,
          originalAmount: txn.originalAmount,
          chargedAmount: txn.chargedAmount,
          status: txn.status,
        }
      );
    }

    // Use chargedAmount or originalAmount if chargedAmount is not available
    const amount = txn.chargedAmount ?? txn.originalAmount ?? 0;

    // Use the status field to determine if pending
    const isPending = txn.status === 'pending';

    return {
      id: `${this.type}-${txn.identifier || txn.date}-${txn.description}-${amount}`,
      date: txn.date,
      description: txn.description || 'No description',
      amount: amount,
      category: txn.category || 'Uncategorized',
      accountId: `${this.type}-${accountNumber}`,
      reference: null, // Reference field doesn't exist in israeli-bank-scrapers
      memo: txn.memo || null,
      pending: isPending,
      installments: txn.installments
        ? {
            number: txn.installments.number,
            total: txn.installments.total,
          }
        : null,
    };
  }

  private filterValidTransactions(
    transactions: ReturnType<typeof this.mapTransaction>[]
  ) {
    return transactions.filter(txn => {
      const isValid = txn.date && txn.description && !isNaN(txn.amount);

      if (!isValid) {
        logger.warn(`Filtering out invalid ${this.type} transaction`, {
          transaction: txn,
        });
      }

      return isValid;
    });
  }

  private extractAccountInfo(
    accounts: NonNullable<ScraperScrapingResult['accounts']>
  ) {
    const accountType = this.getAccountTypeForProvider();
    const providerDisplayName = getProviderDisplayName(this.type);

    return accounts.map(account => ({
      id: `${this.type}-${account.accountNumber}`,
      balance: account.balance ?? 0,
      type: accountType,
      name: `${providerDisplayName} - ${account.accountNumber}`,
    }));
  }

  private getAccountTypeForProvider(): string {
    // Credit card providers
    const creditCardProviders = ['visaCal', 'max', 'isracard', 'amex'];
    return creditCardProviders.includes(this.type) ? 'Credit Card' : 'Bank';
  }
}
