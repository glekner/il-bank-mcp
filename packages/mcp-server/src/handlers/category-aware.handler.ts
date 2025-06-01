import { ScraperService } from '@bank-assistant/scraper';
import { logger } from '../utils/logger.js';
import { CategoryMatcher } from '../utils/category-matcher.js';
import { CategoryAnalysisHandler } from './category-analysis.handler.js';
import { MonthlyCreditSummaryHandler } from './financial-advisory/monthly-credit-summary.handler.js';
import type {
  CategoryComparisonArgs,
  SearchTransactionsArgs,
  MonthlyCreditSummaryArgs,
} from '../types.js';

/**
 * A wrapper handler that intercepts category-related operations
 * and performs intelligent matching between user queries and Hebrew categories
 */
export class CategoryAwareHandler {
  private categoryAnalysisHandler: CategoryAnalysisHandler;
  private monthlyCreditSummaryHandler: MonthlyCreditSummaryHandler;

  constructor(private scraperService: ScraperService) {
    this.categoryAnalysisHandler = new CategoryAnalysisHandler(scraperService);
    this.monthlyCreditSummaryHandler = new MonthlyCreditSummaryHandler(
      scraperService
    );
  }

  /**
   * Enhanced category comparison that handles Hebrew categories
   */
  async getCategoryComparison(args: CategoryComparisonArgs) {
    logger.info('Category-aware comparison initiated', { ...args });

    // If categories are already specified, check if they need mapping
    if (args.categories && args.categories.length > 0) {
      // Get all unique categories from the time periods
      const [period1Categories, period2Categories] = await Promise.all([
        this.scraperService.getUniqueCategories({
          startDate: new Date(args.period1Start),
          endDate: new Date(args.period1End),
        }),
        this.scraperService.getUniqueCategories({
          startDate: new Date(args.period2Start),
          endDate: new Date(args.period2End),
        }),
      ]);

      // Combine unique categories from both periods
      const allCategories = Array.from(
        new Set([...period1Categories, ...period2Categories])
      );

      logger.info('Available categories for comparison', {
        categoriesCount: allCategories.length,
        sampleCategories: allCategories.slice(0, 10),
        requestedCategories: args.categories,
      });

      // Check if the requested categories exist in the actual categories
      const matchingCategories = args.categories.filter(cat =>
        allCategories.some(dbCat => dbCat.toLowerCase() === cat.toLowerCase())
      );

      if (matchingCategories.length === 0) {
        // No direct matches, log available categories for AI to use
        logger.info('No direct category matches found', {
          requestedCategories: args.categories,
          availableCategories: allCategories,
        });

        // Return a special response that includes available categories
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: false,
                  error: 'Category matching required',
                  availableCategories: allCategories,
                  requestedCategories: args.categories,
                  message:
                    'The requested categories do not match the available categories in the database. Please select from the available categories listed above.',
                },
                null,
                2
              ),
            },
          ],
        };
      }

      // Use matching categories
      args = { ...args, categories: matchingCategories };
    }

    // Proceed with the original handler
    return this.categoryAnalysisHandler.getCategoryComparison(args);
  }

  /**
   * Enhanced transaction search that handles Hebrew categories
   */
  async searchTransactions(args: SearchTransactionsArgs) {
    logger.info('Category-aware transaction search initiated', { ...args });

    // If categories are specified, validate them
    if (args.categories && args.categories.length > 0) {
      // Get unique categories from the specified time range
      const availableCategories = await this.scraperService.getUniqueCategories(
        {
          startDate: args.startDate ? new Date(args.startDate) : undefined,
          endDate: args.endDate ? new Date(args.endDate) : undefined,
        }
      );

      logger.info('Available categories for search', {
        categoriesCount: availableCategories.length,
        sampleCategories: availableCategories.slice(0, 10),
        requestedCategories: args.categories,
      });

      // Check if the requested categories exist
      const matchingCategories = args.categories.filter(cat =>
        availableCategories.some(
          dbCat => dbCat.toLowerCase() === cat.toLowerCase()
        )
      );

      if (matchingCategories.length === 0) {
        // Return available categories for AI to use
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: false,
                  error: 'Category matching required',
                  availableCategories,
                  requestedCategories: args.categories,
                  message:
                    'The requested categories do not match the available categories in the database. Please select from the available categories listed above.',
                },
                null,
                2
              ),
            },
          ],
        };
      }

      // Use matching categories
      args = { ...args, categories: matchingCategories };
    }

    // Proceed with the original handler
    return this.categoryAnalysisHandler.searchTransactions(args);
  }

  /**
   * Enhanced monthly credit summary that can include Hebrew categories
   */
  async getMonthlyCreditSummary(args: MonthlyCreditSummaryArgs) {
    logger.info('Category-aware monthly credit summary initiated', { ...args });

    // The monthly credit summary includes categories by default when includeCategories is true
    // We'll let it proceed normally but log the categories it finds
    if (args.includeCategories) {
      const month = args.month || new Date().getMonth() + 1;
      const year = args.year || new Date().getFullYear();
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0);

      const availableCategories = await this.scraperService.getUniqueCategories(
        {
          startDate,
          endDate,
        }
      );

      logger.info('Categories available for monthly summary', {
        month,
        year,
        categoriesCount: availableCategories.length,
        categories: availableCategories,
      });
    }

    // Proceed with the original handler
    return this.monthlyCreditSummaryHandler.getMonthlyCreditSummary(args);
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
