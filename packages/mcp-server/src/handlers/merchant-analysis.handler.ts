import {
  ScraperService,
  analyzeMerchantSpending,
  getSpendingByMerchant,
} from '@bank-assistant/scraper';
import { logger } from '../utils/logger.js';
import type { MerchantAnalysisArgs, SpendingByMerchantArgs } from '../types.js';

export class MerchantAnalysisHandler {
  constructor(private scraperService: ScraperService) {}

  async analyzeMerchantSpending(args: MerchantAnalysisArgs) {
    logger.info('Analyzing merchant spending', { ...args });

    try {
      // Get transactions for the lookback period
      const lookbackMonths = args.lookbackMonths || 6;
      const endDate = new Date();
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - lookbackMonths);

      const processedTransactions =
        await this.scraperService.getProcessedTransactions({
          startDate,
          endDate,
        });

      // Filter out internal transfers for accurate merchant analysis
      const transactions = processedTransactions.filter(
        t => !t.isInternalTransfer
      );

      const analysis = analyzeMerchantSpending(
        transactions,
        args.merchantName,
        args.includeAnomalies || false
      );

      if (!analysis) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: false,
                  error: `No transactions found for merchant: ${args.merchantName}`,
                },
                null,
                2
              ),
            },
          ],
        };
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                success: true,
                data: {
                  ...analysis,
                  // Convert dates to ISO strings for JSON serialization
                  firstSeen: analysis.firstSeen,
                  lastSeen: analysis.lastSeen,
                  transactions: analysis.transactions.map(t => ({
                    ...t,
                    date: t.date,
                  })),
                  anomalies: analysis.anomalies?.map(t => ({
                    ...t,
                    date: t.date,
                  })),
                },
              },
              null,
              2
            ),
          },
        ],
      };
    } catch (error) {
      logger.error('Failed to analyze merchant spending', { error });
      throw error;
    }
  }

  async getSpendingByMerchant(args: SpendingByMerchantArgs) {
    logger.info('Getting spending by merchant', { ...args });

    try {
      // Parse dates if provided
      const startDate = args.startDate ? new Date(args.startDate) : undefined;
      const endDate = args.endDate ? new Date(args.endDate) : undefined;

      const processedTransactions =
        await this.scraperService.getProcessedTransactions({
          startDate,
          endDate,
        });

      // Filter out internal transfers for accurate merchant analysis
      const transactions = processedTransactions.filter(
        t => !t.isInternalTransfer
      );

      const merchantSpending = getSpendingByMerchant(transactions, {
        minAmount: args.minAmount,
        topN: args.topN,
      });

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                success: true,
                data: {
                  merchants: merchantSpending.map(m => ({
                    ...m,
                    transactions: m.transactions.map(t => ({
                      ...t,
                      date: t.date,
                    })),
                  })),
                  totalMerchants: merchantSpending.length,
                  totalSpending: merchantSpending.reduce(
                    (sum, m) => sum + m.totalAmount,
                    0
                  ),
                },
              },
              null,
              2
            ),
          },
        ],
      };
    } catch (error) {
      logger.error('Failed to get spending by merchant', { error });
      throw error;
    }
  }
}
