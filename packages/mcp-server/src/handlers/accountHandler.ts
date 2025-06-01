import { BaseHandler } from './base.js';
import {
  AccountsResponse,
  BalanceHistoryArgs,
  BalanceHistoryResponse,
  DEFAULT_BALANCE_HISTORY_DAYS,
} from '../types.js';
import { logger } from '../utils/logger.js';

export class AccountHandler extends BaseHandler {
  async getAccounts() {
    let accounts = await this.scraperService.getAccounts();

    // If no accounts found, trigger an async scrape
    if (accounts.length === 0) {
      logger.info('No accounts found, triggering async scrape...');
      await this.scraperService.startAsyncScrapeAll();

      // Don't retry immediately since scraping is async
      // The user will be notified that scraping is in progress
    }

    let response: AccountsResponse = {
      success: true,
      accounts,
    };

    // Add scrape status if running
    response = await this.addScrapeStatusIfRunning(response);

    return this.formatResponse(response);
  }

  async getAccountBalanceHistory(args: BalanceHistoryArgs) {
    if (!args.accountId) {
      throw new Error('accountId is required');
    }

    const history = await this.scraperService.getAccountBalanceHistory(
      args.accountId,
      args.days || DEFAULT_BALANCE_HISTORY_DAYS
    );

    let response: BalanceHistoryResponse = {
      success: true,
      accountId: args.accountId,
      history,
    };

    // Add scrape status if running
    response = await this.addScrapeStatusIfRunning(response);

    return this.formatResponse(response);
  }
}
