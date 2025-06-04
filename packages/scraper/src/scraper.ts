import { createScraperInstance } from './scrapers';
import { MultiProviderCredentials, ScrapedAccountData } from './types';
import {
  loadAllCredentials,
  loadProviderCredentials,
} from './utils/credentials';
import { logger } from './utils/logger';
import type { ProviderKey } from './utils/providers';

/**
 * Scrapes financial data from all configured providers in parallel
 * @returns Promise resolving to the combined scraped data
 */
export async function scrapeAllBankData(): Promise<ScrapedAccountData> {
  try {
    logger.info('Starting multi-provider scraping process');
    const credentials = loadAllCredentials();

    // Get list of providers to scrape from credentials
    const providers = Object.keys(credentials) as ProviderKey[];
    logger.info(
      `Found credentials for ${providers.length} providers: ${providers.join(', ')}`
    );

    const allAccounts: ScrapedAccountData['accounts'] = [];
    const allTransactions: ScrapedAccountData['transactions'] = [];
    const allRawData: ScrapedAccountData['rawData'] = [];
    const errors: { provider: string; error: unknown }[] = [];

    // Run scrapers sequentially to avoid resource contention
    for (const provider of providers) {
      try {
        logger.info(`Starting scrape for ${provider}...`);
        const scraper = createScraperInstance(provider, credentials);

        if (!scraper) {
          logger.warn(`No scraper available for ${provider}`);
          continue;
        }

        const startTime = Date.now();
        const result = await scraper.scrape();
        const duration = Date.now() - startTime;

        logger.info(
          `Successfully scraped ${provider} in ${duration}ms: ${result.accounts.length} accounts, ${result.transactions.length} transactions`
        );

        // Add results to collections
        allAccounts.push(...result.accounts);
        allTransactions.push(...result.transactions);
        allRawData.push({ provider, data: result.rawData });
      } catch (error) {
        logger.error(`Failed to scrape ${provider}`, { error });
        errors.push({ provider, error });
      }
    }

    // Log errors summary
    if (errors.length > 0) {
      logger.warn(`Scraping completed with ${errors.length} failures`, {
        failedProviders: errors.map(e => e.provider),
      });
    }

    if (allAccounts.length === 0) {
      throw new Error('No accounts found from any provider');
    }

    logger.info(
      `Sequential scraping completed: ${allAccounts.length} total accounts, ${allTransactions.length} total transactions`
    );

    return {
      accounts: allAccounts,
      transactions: allTransactions,
      rawData: allRawData,
      scrapedAt: new Date(),
    };
  } catch (error) {
    logger.error('Error during multi-provider scraping process', { error });
    throw new Error(
      `Multi-provider scraping error: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Scrapes financial data from a specific provider
 * @param provider The provider to scrape
 * @returns Promise resolving to the scraped data
 */
export async function scrapeSingleProvider(
  provider: ProviderKey
): Promise<ScrapedAccountData> {
  try {
    logger.info(`Starting single provider scraping for ${provider}`);

    const credentials = loadProviderCredentials(provider);
    if (!credentials) {
      throw new Error(`No credentials found for ${provider}`);
    }

    const allCredentials: MultiProviderCredentials = {
      [provider]: credentials,
    };

    const scraper = createScraperInstance(provider, allCredentials);
    if (!scraper) {
      throw new Error(`No scraper implementation found for ${provider}`);
    }

    const result = await scraper.scrape();
    logger.info(
      `Successfully scraped ${provider}: ${result.accounts.length} accounts, ${result.transactions.length} transactions`
    );

    return result;
  } catch (error) {
    logger.error(`Error during ${provider} scraping process`, { error });
    throw new Error(
      `${provider} scraping error: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
