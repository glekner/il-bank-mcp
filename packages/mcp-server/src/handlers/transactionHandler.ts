import { BaseHandler } from './base.js';
import { TransactionArgs, TransactionResponse } from '../types.js';
import { logger } from '../utils/logger.js';

const MAX_TRANSACTIONS_PER_RESPONSE = 200;

export class TransactionHandler extends BaseHandler {
  async getTransactions(args: TransactionArgs) {
    const startDate = this.parseDate(args.startDate);
    const endDate = this.parseDate(args.endDate);

    const transactions = await this.scraperService.getTransactions({
      startDate,
      endDate,
      accountId: args.accountId,
    });

    // Calculate days between dates for optimization logic
    const daysBetween =
      startDate && endDate
        ? Math.ceil(
            Math.abs(endDate.getTime() - startDate.getTime()) /
              (1000 * 60 * 60 * 24)
          )
        : 0;

    let response: TransactionResponse;

    // For large datasets or long timeframes, return paginated/optimized response
    if (
      transactions.length > MAX_TRANSACTIONS_PER_RESPONSE ||
      daysBetween > 90
    ) {
      logger.info('Optimizing large transaction response', {
        transactionCount: transactions.length,
        daysBetween,
      });

      // Sort by date (newest first) and take the most recent transactions
      const sortedTransactions = [...transactions]
        .sort((a, b) => b.date.getTime() - a.date.getTime())
        .slice(0, MAX_TRANSACTIONS_PER_RESPONSE);

      response = {
        success: true,
        count: transactions.length,
        transactions: sortedTransactions,
        message: `Showing ${sortedTransactions.length} most recent transactions out of ${transactions.length} total. Use date filters to see specific periods.`,
      };
    } else {
      response = {
        success: true,
        count: transactions.length,
        transactions,
      };
    }

    // Add scrape status if running
    response = await this.addScrapeStatusIfRunning(response);

    return this.formatResponse(response);
  }
}
