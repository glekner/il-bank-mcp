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

    // Create scraping promises for all providers
    const scrapePromises = providers.map(async provider => {
      try {
        logger.info(`Starting async scrape for ${provider}...`);
        const scraper = createScraperInstance(provider, credentials);

        if (!scraper) {
          logger.warn(`No scraper available for ${provider}`);
          return null;
        }

        const startTime = Date.now();
        const result = await scraper.scrape();
        const duration = Date.now() - startTime;

        logger.info(
          `Successfully scraped ${provider} in ${duration}ms: ${result.accounts.length} accounts, ${result.transactions.length} transactions`
        );

        return { provider, result };
      } catch (error) {
        logger.error(`Failed to scrape ${provider}`, { error });
        return { provider, error };
      }
    });

    // Execute all scrapes in parallel with Promise.allSettled
    const scrapeResults = await Promise.allSettled(scrapePromises);

    const allAccounts: any[] = [];
    const allTransactions: any[] = [];
    const allRawData: any[] = [];
    const errors: { provider: string; error: any }[] = [];

    // Process results
    scrapeResults.forEach((result, index) => {
      if (result.status === 'fulfilled' && result.value) {
        if ('result' in result.value && result.value.result) {
          const { provider, result: scrapedData } = result.value;
          allAccounts.push(...scrapedData.accounts);
          allTransactions.push(...scrapedData.transactions);
          allRawData.push({ provider, data: scrapedData.rawData });
        } else if ('error' in result.value) {
          errors.push(result.value as { provider: string; error: any });
        }
      } else if (result.status === 'rejected') {
        logger.error(`Promise rejected for provider ${providers[index]}`, {
          reason: result.reason,
        });
        errors.push({ provider: providers[index], error: result.reason });
      }
    });

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
      `Parallel scraping completed: ${allAccounts.length} total accounts, ${allTransactions.length} total transactions`
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
    } as MultiProviderCredentials;

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
