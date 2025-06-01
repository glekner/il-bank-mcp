import { PROVIDER_CONFIG, ProviderKey } from '@bank-assistant/scraper';
import { RefreshResponse, type RefreshProviderArgs } from '../types.js';
import { logger } from '../utils/logger.js';
import { BaseHandler } from './base.js';

export class RefreshHandler extends BaseHandler {
  async refreshAllData() {
    logger.info('Starting async scrape of all data...');

    try {
      await this.scraperService.startAsyncScrapeAll();

      const response: RefreshResponse = {
        success: true,
        message:
          'Scraping of all bank and credit card data has been initiated. The process is running in the background.',
        timestamp: new Date().toISOString(),
      };

      return this.formatResponse(response);
    } catch (error) {
      logger.error('Failed to start async scrape', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async refreshProviderData(args: RefreshProviderArgs) {
    if (!args.provider) {
      throw new Error('provider is required');
    }

    // Get all valid provider keys from the scraper package
    const validProviders = Object.keys(PROVIDER_CONFIG);

    if (!validProviders.includes(args.provider)) {
      throw new Error(
        `Invalid provider. Must be one of: ${validProviders.join(', ')}`
      );
    }

    logger.info(`Starting async scrape of ${args.provider} data...`);

    try {
      await this.scraperService.startAsyncScrapeProvider(
        args.provider as ProviderKey
      );

      const response: RefreshResponse = {
        success: true,
        message: `Scraping of ${args.provider} data has been initiated. The process is running in the background.`,
        timestamp: new Date().toISOString(),
      };

      return this.formatResponse(response);
    } catch (error) {
      logger.error(`Failed to start async scrape of ${args.provider}`, {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
