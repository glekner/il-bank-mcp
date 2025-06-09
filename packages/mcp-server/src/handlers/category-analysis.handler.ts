import { ScraperService } from '@bank-assistant/scraper';
import { CategoryMatcher } from '../utils/category-matcher';
import { logger } from '../utils/logger.js';
import type {
  CategoryComparisonArgs,
  SearchTransactionsArgs,
} from '../types.js';

export class CategoryAnalysisHandler {
  constructor(private scraperService: ScraperService) {}

  async getCategoryComparison(args: CategoryComparisonArgs) {
    logger.info('Comparing categories across periods', { ...args });

    try {
      // Get financial summaries for both periods
      const [period1Summary, period2Summary] = await Promise.all([
        this.scraperService.getFinancialSummary(
          new Date(args.period1Start),
          new Date(args.period1End)
        ),
        this.scraperService.getFinancialSummary(
          new Date(args.period2Start),
          new Date(args.period2End)
        ),
      ]);

      // Filter categories if specified
      const categoriesToCompare =
        args.categories || Object.keys(period1Summary.expenses);

      const comparison: Record<
        string,
        {
          period1: { amount: number; count: number };
          period2: { amount: number; count: number };
          change: { amount: number; percentage: number };
        }
      > = {};

      categoriesToCompare.forEach(category => {
        const period1Data = period1Summary.expenses[category] || {
          total: 0,
          count: 0,
        };
        const period2Data = period2Summary.expenses[category] || {
          total: 0,
          count: 0,
        };

        const amountChange = period2Data.total - period1Data.total;
        const percentageChange =
          period1Data.total > 0
            ? (amountChange / period1Data.total) * 100
            : period2Data.total > 0
              ? 100
              : 0;

        comparison[category] = {
          period1: { amount: period1Data.total, count: period1Data.count },
          period2: { amount: period2Data.total, count: period2Data.count },
          change: { amount: amountChange, percentage: percentageChange },
        };
      });

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                success: true,
                data: {
                  comparison,
                  period1: {
                    start: args.period1Start,
                    end: args.period1End,
                    totalExpenses: Object.values(
                      period1Summary.expenses
                    ).reduce((sum, cat) => sum + cat.total, 0),
                  },
                  period2: {
                    start: args.period2Start,
                    end: args.period2End,
                    totalExpenses: Object.values(
                      period2Summary.expenses
                    ).reduce((sum, cat) => sum + cat.total, 0),
                  },
                },
              },
              null,
              2
            ),
          },
        ],
      };
    } catch (error) {
      logger.error('Failed to compare categories', { error });
      throw error;
    }
  }

  async searchTransactions(args: SearchTransactionsArgs) {
    logger.info('Searching transactions', { ...args });

    try {
      // Get transactions with date filter
      const processedTransactions =
        await this.scraperService.getProcessedTransactions({
          startDate: args.startDate ? new Date(args.startDate) : undefined,
          endDate: args.endDate ? new Date(args.endDate) : undefined,
        });

      // Apply filters
      let filteredTransactions = processedTransactions;

      // Filter out internal transfers by default (can be overridden with search term)
      if (!args.searchTerm?.toLowerCase().includes('internal')) {
        filteredTransactions = filteredTransactions.filter(
          t => !t.isInternalTransfer
        );
      }

      // Search term filter
      if (args.searchTerm) {
        const searchLower = args.searchTerm.toLowerCase();
        filteredTransactions = filteredTransactions.filter(
          t =>
            t.description.toLowerCase().includes(searchLower) ||
            (t.memo && t.memo.toLowerCase().includes(searchLower))
        );
      }

      // Amount range filter
      if (args.minAmount !== undefined) {
        filteredTransactions = filteredTransactions.filter(
          t =>
            Math.abs(t.chargedAmount ?? t.originalAmount ?? 0) >=
            args.minAmount!
        );
      }

      if (args.maxAmount !== undefined) {
        filteredTransactions = filteredTransactions.filter(
          t =>
            Math.abs(t.chargedAmount ?? t.originalAmount ?? 0) <=
            args.maxAmount!
        );
      }

      // Category filter
      if (args.categories && args.categories.length > 0) {
        const categoriesLower = args.categories.map(c => c.toLowerCase());
        filteredTransactions = filteredTransactions.filter(t =>
          categoriesLower.includes(t.category?.toLowerCase() ?? '')
        );
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                success: true,
                data: {
                  transactions: filteredTransactions.map(t => ({
                    ...t,
                    date: t.date,
                  })),
                  count: filteredTransactions.length,
                  totalAmount: filteredTransactions.reduce(
                    (sum, t) =>
                      sum + Math.abs(t.chargedAmount ?? t.originalAmount ?? 0),
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
      logger.error('Failed to search transactions', { error });
      throw error;
    }
  }

  /**
   * Helper method to get available categories for a given context
   */
  async getAvailableCategories(options?: {
    startDate?: Date;
    endDate?: Date;
    accountId?: string;
  }) {
    const categories = await this.scraperService.getUniqueCategories(options);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              success: true,
              data: {
                categories,
                count: categories.length,
                formattedList:
                  CategoryMatcher.formatCategoriesForPrompt(categories),
              },
            },
            null,
            2
          ),
        },
      ],
    };
  }
}
