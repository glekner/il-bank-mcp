import { Transaction } from '@bank-assistant/scraper';
import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { RecurringIncomeArgs, RecurringIncome } from '../../types.js';
import { logger } from '../../utils/logger.js';
import { BaseHandler } from '../base.js';

interface IncomePattern {
  sourceName: string;
  amounts: number[];
  dates: Date[];
  transactions: Transaction[];
}

export class RecurringIncomeHandler extends BaseHandler {
  // Income-related keywords (in Hebrew and English)
  private readonly incomeKeywords = [
    'משכורת',
    'salary',
    'wage',
    'pay',
    'העברת משכורת',
    'הכנסה',
    'income',
    'dividend',
    'דיבידנד',
    'ריבית',
    'interest',
    'החזר',
    'refund',
    'reimbursement',
    'bonus',
    'בונוס',
    'תשלום מ',
    'payment from',
    'קצבה',
    'pension',
    'allowance',
    'grant',
    'מענק',
  ];

  async getRecurringIncome(args: RecurringIncomeArgs): Promise<CallToolResult> {
    try {
      const minOccurrences = args.minOccurrences || 2;
      const lookbackMonths = args.lookbackMonths || 6;

      // Calculate date range
      const endDate = new Date();
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - lookbackMonths);

      logger.info('Detecting recurring income', {
        minOccurrences,
        lookbackMonths,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      });

      // Get all transactions for the period
      const transactions = await this.scraperService.getTransactions({
        startDate,
        endDate,
      });

      if (!transactions || transactions.length === 0) {
        throw new Error('No transactions found for analysis');
      }

      // Filter for income transactions (positive amounts) excluding internal transfers
      const incomeTransactions = transactions.filter(txn => {
        // Include only positive amounts (income)
        if (txn.amount <= 0) return false;

        // Exclude internal transfers
        if ('isInternalTransfer' in txn && txn.isInternalTransfer) return false;

        return true;
      });

      logger.info('Filtered income transactions', {
        totalTransactions: transactions.length,
        incomeTransactions: incomeTransactions.length,
        internalTransfersExcluded: transactions.filter(
          t => 'isInternalTransfer' in t && t.isInternalTransfer
        ).length,
      });

      // Group transactions by source
      const sourceGroups = this.groupTransactionsBySource(incomeTransactions);

      // Analyze patterns for recurring income
      const recurringIncome: RecurringIncome[] = [];

      for (const [source, pattern] of sourceGroups.entries()) {
        if (pattern.transactions.length < minOccurrences) continue;

        const analysis = this.analyzeRecurrencePattern(pattern);

        if (analysis.isRecurring) {
          const incomeType = this.determineIncomeType(source);

          recurringIncome.push({
            sourceName: source,
            averageAmount: analysis.averageAmount,
            frequency: analysis.frequency,
            occurrences: pattern.transactions.length,
            lastIncome: pattern.dates[pattern.dates.length - 1].toISOString(),
            nextExpectedIncome: analysis.nextExpectedDate?.toISOString(),
            totalReceived: pattern.amounts.reduce((sum, amt) => sum + amt, 0),
            incomeType,
          });
        }
      }

      // Sort by total received (descending)
      recurringIncome.sort((a, b) => b.totalReceived - a.totalReceived);

      // Calculate summary statistics
      const totalMonthlyIncome = recurringIncome
        .filter(income => income.frequency === 'monthly')
        .reduce((sum, income) => sum + income.averageAmount, 0);

      const totalAnnualIncome = recurringIncome.reduce((sum, income) => {
        const multiplier = this.getAnnualMultiplier(income.frequency);
        return sum + income.averageAmount * multiplier;
      }, 0);

      const response = {
        success: true,
        recurringIncome,
        summary: {
          totalSources: recurringIncome.length,
          monthlyIncome: totalMonthlyIncome,
          annualIncome: totalAnnualIncome,
          categories: this.categorizeIncome(recurringIncome),
        },
        insights: this.generateIncomeInsights(recurringIncome),
      };

      // Check if scraping is in progress and add warning
      const scrapeStatus = this.scraperService.getScrapeStatus();
      if (
        scrapeStatus.isAnyScrapeRunning &&
        scrapeStatus.activeScrapes?.length > 0
      ) {
        const runningServices = scrapeStatus.activeScrapes
          .map(s => s.provider)
          .join(', ');

        (response as Record<string, unknown>)._warning =
          `Data scraping is currently in progress for: ${runningServices}. The data shown may be stale.`;
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(response, null, 2),
          },
        ],
      };
    } catch (error) {
      logger.error('Failed to detect recurring income', {
        error: error instanceof Error ? error.message : String(error),
        args,
      });

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
              },
              null,
              2
            ),
          },
        ],
      };
    }
  }

  private groupTransactionsBySource(
    transactions: Transaction[]
  ): Map<string, IncomePattern> {
    const groups = new Map<string, IncomePattern>();

    transactions.forEach(txn => {
      // Normalize source name
      const source = this.normalizeSourceName(txn.description);

      if (!groups.has(source)) {
        groups.set(source, {
          sourceName: source,
          amounts: [],
          dates: [],
          transactions: [],
        });
      }

      const pattern = groups.get(source)!;
      pattern.amounts.push(txn.amount); // Keep positive amounts
      pattern.dates.push(new Date(txn.date));
      pattern.transactions.push(txn);
    });

    return groups;
  }

  private normalizeSourceName(description: string): string {
    // Remove common variations in source names
    return description
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .replace(/[0-9]{4,}/g, '') // Remove long numbers (transaction IDs, etc.)
      .replace(/\*{2,}/g, '') // Remove multiple asterisks
      .trim();
  }

  private analyzeRecurrencePattern(pattern: IncomePattern): {
    isRecurring: boolean;
    frequency: string;
    averageAmount: number;
    nextExpectedDate?: Date;
  } {
    const { amounts, dates } = pattern;

    // Sort dates
    dates.sort((a, b) => a.getTime() - b.getTime());

    // Calculate intervals between transactions
    const intervals: number[] = [];
    for (let i = 1; i < dates.length; i++) {
      const daysDiff = Math.round(
        (dates[i].getTime() - dates[i - 1].getTime()) / (1000 * 60 * 60 * 24)
      );
      intervals.push(daysDiff);
    }

    // Analyze intervals to determine frequency
    const avgInterval =
      intervals.reduce((sum, int) => sum + int, 0) / intervals.length;
    const stdDev = this.calculateStdDev(intervals);

    // Check if pattern is consistent (low standard deviation)
    const isRecurring = stdDev < avgInterval * 0.3; // 30% tolerance

    let frequency = 'unknown';
    let nextExpectedDate: Date | undefined;

    if (isRecurring) {
      if (avgInterval <= 7) {
        frequency = 'weekly';
      } else if (avgInterval <= 31) {
        frequency = 'monthly';
      } else if (avgInterval <= 93) {
        frequency = 'quarterly';
      } else if (avgInterval <= 186) {
        frequency = 'semi-annual';
      } else if (avgInterval <= 366) {
        frequency = 'annual';
      }

      // Calculate next expected date
      const lastDate = dates[dates.length - 1];
      nextExpectedDate = new Date(lastDate);
      nextExpectedDate.setDate(
        nextExpectedDate.getDate() + Math.round(avgInterval)
      );
    }

    // Calculate average amount
    const averageAmount =
      amounts.reduce((sum, amt) => sum + amt, 0) / amounts.length;

    return {
      isRecurring,
      frequency,
      averageAmount,
      nextExpectedDate,
    };
  }

  private calculateStdDev(values: number[]): number {
    const avg = values.reduce((sum, val) => sum + val, 0) / values.length;
    const squareDiffs = values.map(val => Math.pow(val - avg, 2));
    const avgSquareDiff =
      squareDiffs.reduce((sum, val) => sum + val, 0) / values.length;
    return Math.sqrt(avgSquareDiff);
  }

  private getAnnualMultiplier(frequency: string): number {
    const multipliers: Record<string, number> = {
      weekly: 52,
      monthly: 12,
      quarterly: 4,
      'semi-annual': 2,
      annual: 1,
      unknown: 12, // Assume monthly if unknown
    };
    return multipliers[frequency] || 12;
  }

  private determineIncomeType(source: string): string {
    const lowerSource = source.toLowerCase();

    // Check for salary/wage patterns
    if (
      this.incomeKeywords
        .slice(0, 5)
        .some(keyword => lowerSource.includes(keyword.toLowerCase()))
    ) {
      return 'salary';
    }

    // Check for dividend patterns
    if (lowerSource.includes('dividend') || lowerSource.includes('דיבידנד')) {
      return 'dividend';
    }

    // Check for interest patterns
    if (lowerSource.includes('interest') || lowerSource.includes('ריבית')) {
      return 'interest';
    }

    // Check for pension patterns
    if (lowerSource.includes('pension') || lowerSource.includes('קצבה')) {
      return 'pension';
    }

    // Check for refund patterns
    if (lowerSource.includes('refund') || lowerSource.includes('החזר')) {
      return 'refund';
    }

    return 'other';
  }

  private categorizeIncome(income: RecurringIncome[]): Record<string, number> {
    const categories: Record<string, number> = {
      salary: 0,
      dividend: 0,
      interest: 0,
      pension: 0,
      refund: 0,
      other: 0,
    };

    income.forEach(inc => {
      const type = inc.incomeType || 'other';
      if (type in categories) {
        categories[type]++;
      } else {
        categories.other++;
      }
    });

    return categories;
  }

  private generateIncomeInsights(income: RecurringIncome[]): string[] {
    const insights: string[] = [];

    // Multiple income sources
    if (income.length > 1) {
      insights.push(
        `You have ${income.length} recurring income sources. Diversified income provides financial stability.`
      );
    }

    // Salary insights
    const salaryIncome = income.filter(inc => inc.incomeType === 'salary');
    if (salaryIncome.length > 0) {
      const totalSalary = salaryIncome.reduce(
        (sum, inc) => sum + inc.averageAmount,
        0
      );
      insights.push(
        `Your total monthly salary income is ₪${totalSalary.toFixed(2)}.`
      );
    }

    // Passive income
    const passiveIncome = income.filter(inc =>
      ['dividend', 'interest', 'pension'].includes(inc.incomeType || '')
    );
    if (passiveIncome.length > 0) {
      const totalPassive = passiveIncome.reduce(
        (sum, inc) => sum + inc.averageAmount,
        0
      );
      insights.push(
        `You have ${passiveIncome.length} passive income sources generating ₪${totalPassive.toFixed(2)} per month.`
      );
    }

    // Irregular income
    const now = new Date();
    const delayedIncome = income.filter(inc => {
      if (!inc.nextExpectedIncome) return false;
      const expectedDate = new Date(inc.nextExpectedIncome);
      return expectedDate < now;
    });
    if (delayedIncome.length > 0) {
      insights.push(
        `${delayedIncome.length} expected income sources appear to be delayed.`
      );
    }

    return insights;
  }
}
