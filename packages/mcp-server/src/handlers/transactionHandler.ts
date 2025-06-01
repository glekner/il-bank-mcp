import { BaseHandler } from './base.js';
import { TransactionArgs, TransactionResponse } from '../types.js';

export class TransactionHandler extends BaseHandler {
  async getTransactions(args: TransactionArgs) {
    const startDate = this.parseDate(args.startDate);
    const endDate = this.parseDate(args.endDate);

    const transactions = await this.scraperService.getTransactions({
      startDate,
      endDate,
      accountId: args.accountId,
    });

    let response: TransactionResponse = {
      success: true,
      count: transactions.length,
      transactions,
    };

    // Add scrape status if running
    response = await this.addScrapeStatusIfRunning(response);

    return this.formatResponse(response);
  }
}
