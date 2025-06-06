import {
  CompanyTypes,
  createScraper,
  type ScraperOptions,
  type ScraperScrapingResult,
} from 'israeli-bank-scrapers';
import { ProviderCredentials, ScrapedAccountData, Transaction } from '../types';
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
      // Aggressive memory limits
      '--max_old_space_size=512',
      '--js-flags=--max-old-space-size=512',
      '--renderer-process-limit=2',
      '--single-process',
      '--no-zygote',
      '--no-first-run',
      '--disable-extensions',
      '--disable-default-apps',
      '--disable-translate',
      '--disable-sync',
      '--metrics-recording-only',
      '--safebrowsing-disable-auto-update',
      '--disable-component-update',
      '--disable-background-networking',
      '--disable-features=TranslateUI',
      '--disable-ipc-flooding-protection',
      // Prevent memory leaks from media/audio
      '--autoplay-policy=user-gesture-required',
      '--disable-background-media-suspend',
      '--disable-blink-features=AutomationControlled',
      '--disable-features=AudioServiceOutOfProcess',
      '--disable-print-preview',
      '--disable-site-isolation-for-policy',
      '--disable-speech-api',
      '--disable-voice-input',
      '--mute-audio',
      '--no-default-browser-check',
      '--no-pings',
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

    // Extract all transactions from all accounts with proper account association
    const allTransactions: Transaction[] = [];

    for (const account of accounts) {
      const accountId = `${this.type}-${account.accountNumber}`;

      if (account.txns) {
        for (const txn of account.txns) {
          // Add accountId to each transaction
          const transactionWithAccount = {
            ...txn,
            accountId,
          };

          allTransactions.push(transactionWithAccount);
        }
      }
    }

    logger.info(
      `Processed ${allTransactions.length} ${this.type} transactions`
    );

    // Extract account information
    const accountsInfo = this.extractAccountInfo(accounts);

    return {
      accounts: accountsInfo,
      transactions: allTransactions,
      rawData: accounts as unknown[],
      scrapedAt: new Date(),
    };
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
