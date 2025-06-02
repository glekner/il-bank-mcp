import type { Transaction } from '@bank-assistant/scraper';
import { BaseHandler } from './base.js';
import { logger } from '../utils/logger.js';

export interface DayOfWeekSpendingArgs {
  startDate?: string;
  endDate?: string;
  groupBy?: 'day' | 'weekday_weekend' | 'all';
  includeCategories?: boolean;
  accountId?: string;
}

interface DayAnalysis {
  dayName: string;
  dayNumber: number; // 0 = Sunday, 6 = Saturday
  totalSpent: number;
  transactionCount: number;
  averageTransaction: number;
  averageDailySpending: number; // Average spent on this day of week
  daysInPeriod: number; // How many of this day occurred in the period
  categories?: Record<string, number>;
}

interface WeekdayWeekendAnalysis {
  weekdays: {
    totalSpent: number;
    transactionCount: number;
    averageTransaction: number;
    averageDailySpending: number;
    daysInPeriod: number;
    categories?: Record<string, number>;
  };
  weekends: {
    totalSpent: number;
    transactionCount: number;
    averageTransaction: number;
    averageDailySpending: number;
    daysInPeriod: number;
    categories?: Record<string, number>;
  };
}

interface DayOfWeekResult {
  byDay?: DayAnalysis[];
  weekdayVsWeekend?: WeekdayWeekendAnalysis;
  summary?: {
    totalExpenses: number;
    transactionCount: number;
    periodStart: string;
    periodEnd: string;
  };
  insights?: string[];
}

export class DayOfWeekAnalysisHandler extends BaseHandler {
  async analyzeDayOfWeekSpending(args: DayOfWeekSpendingArgs) {
    try {
      logger.info('Analyzing spending by day of week', { args });

      // Parse dates
      const startDate = args.startDate ? new Date(args.startDate) : undefined;
      const endDate = args.endDate ? new Date(args.endDate) : undefined;
      const groupBy = args.groupBy || 'all';

      // Get transactions
      const transactions = await this.scraperService.getTransactions({
        startDate,
        endDate,
        accountId: args.accountId,
      });

      // Filter out income (positive amounts)
      const expenses = transactions.filter(t => t.amount < 0);

      if (expenses.length === 0) {
        return this.formatResponse({
          success: true,
          message: 'No expense transactions found in the specified period',
          data:
            groupBy === 'weekday_weekend'
              ? {
                  weekdays: this.getEmptyWeekdayStats(),
                  weekends: this.getEmptyWeekendStats(),
                }
              : { byDay: [], weekdayVsWeekend: null },
        });
      }

      const result: DayOfWeekResult = {};

      if (groupBy === 'day' || groupBy === 'all') {
        result.byDay = this.analyzeByDay(
          expenses,
          startDate,
          endDate,
          args.includeCategories
        );
      }

      if (groupBy === 'weekday_weekend' || groupBy === 'all') {
        result.weekdayVsWeekend = this.analyzeWeekdayVsWeekend(
          expenses,
          startDate,
          endDate,
          args.includeCategories
        );
      }

      // Add summary insights
      const insights = this.generateInsights(result);

      const response = {
        success: true,
        data: {
          ...result,
          summary: {
            totalExpenses: Math.abs(
              expenses.reduce((sum, t) => sum + t.amount, 0)
            ),
            transactionCount: expenses.length,
            periodStart:
              startDate?.toISOString() ||
              expenses[expenses.length - 1]?.date.toISOString() ||
              '',
            periodEnd:
              endDate?.toISOString() || expenses[0]?.date.toISOString() || '',
          },
          insights,
        },
        message: undefined,
      };

      // Add scrape status if running
      const finalResponse = await this.addScrapeStatusIfRunning(response);
      return this.formatResponse(finalResponse);
    } catch (error) {
      logger.error('Failed to analyze day of week spending', { error });
      return this.formatError(error);
    }
  }

  private analyzeByDay(
    transactions: Transaction[],
    startDate?: Date,
    endDate?: Date,
    includeCategories?: boolean
  ): DayAnalysis[] {
    const dayNames = [
      'Sunday',
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
    ];
    const dayStats = new Map<
      number,
      {
        total: number;
        count: number;
        categories: Map<string, number>;
      }
    >();

    // Initialize all days
    for (let i = 0; i < 7; i++) {
      dayStats.set(i, { total: 0, count: 0, categories: new Map() });
    }

    // Process transactions
    transactions.forEach(transaction => {
      const date = new Date(transaction.date);
      const dayOfWeek = date.getDay();
      const stats = dayStats.get(dayOfWeek)!;

      stats.total += Math.abs(transaction.amount);
      stats.count += 1;

      if (includeCategories && transaction.category) {
        const currentCategoryTotal =
          stats.categories.get(transaction.category) || 0;
        stats.categories.set(
          transaction.category,
          currentCategoryTotal + Math.abs(transaction.amount)
        );
      }
    });

    // Calculate days in period for each day of week
    const daysInPeriod = this.calculateDaysInPeriod(
      startDate,
      endDate,
      transactions
    );

    // Build results
    const results: DayAnalysis[] = [];
    for (let i = 0; i < 7; i++) {
      const stats = dayStats.get(i)!;
      const daysCount = daysInPeriod.get(i) || 1;

      const analysis: DayAnalysis = {
        dayName: dayNames[i],
        dayNumber: i,
        totalSpent: stats.total,
        transactionCount: stats.count,
        averageTransaction: stats.count > 0 ? stats.total / stats.count : 0,
        averageDailySpending: stats.total / daysCount,
        daysInPeriod: daysCount,
      };

      if (includeCategories) {
        analysis.categories = Object.fromEntries(stats.categories);
      }

      results.push(analysis);
    }

    // Sort by average daily spending (descending)
    results.sort((a, b) => b.averageDailySpending - a.averageDailySpending);

    return results;
  }

  private analyzeWeekdayVsWeekend(
    transactions: Transaction[],
    startDate?: Date,
    endDate?: Date,
    includeCategories?: boolean
  ): WeekdayWeekendAnalysis {
    const weekdayStats = {
      total: 0,
      count: 0,
      categories: new Map<string, number>(),
    };
    const weekendStats = {
      total: 0,
      count: 0,
      categories: new Map<string, number>(),
    };

    transactions.forEach(transaction => {
      const date = new Date(transaction.date);
      const dayOfWeek = date.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      const stats = isWeekend ? weekendStats : weekdayStats;

      stats.total += Math.abs(transaction.amount);
      stats.count += 1;

      if (includeCategories && transaction.category) {
        const currentCategoryTotal =
          stats.categories.get(transaction.category) || 0;
        stats.categories.set(
          transaction.category,
          currentCategoryTotal + Math.abs(transaction.amount)
        );
      }
    });

    // Calculate days in period
    const daysInPeriod = this.calculateDaysInPeriod(
      startDate,
      endDate,
      transactions
    );
    const weekdayCount = [1, 2, 3, 4, 5].reduce(
      (sum, day) => sum + (daysInPeriod.get(day) || 0),
      0
    );
    const weekendCount =
      (daysInPeriod.get(0) || 0) + (daysInPeriod.get(6) || 0);

    return {
      weekdays: {
        totalSpent: weekdayStats.total,
        transactionCount: weekdayStats.count,
        averageTransaction:
          weekdayStats.count > 0 ? weekdayStats.total / weekdayStats.count : 0,
        averageDailySpending:
          weekdayCount > 0 ? weekdayStats.total / weekdayCount : 0,
        daysInPeriod: weekdayCount,
        categories: includeCategories
          ? Object.fromEntries(weekdayStats.categories)
          : undefined,
      },
      weekends: {
        totalSpent: weekendStats.total,
        transactionCount: weekendStats.count,
        averageTransaction:
          weekendStats.count > 0 ? weekendStats.total / weekendStats.count : 0,
        averageDailySpending:
          weekendCount > 0 ? weekendStats.total / weekendCount : 0,
        daysInPeriod: weekendCount,
        categories: includeCategories
          ? Object.fromEntries(weekendStats.categories)
          : undefined,
      },
    };
  }

  private calculateDaysInPeriod(
    startDate?: Date,
    endDate?: Date,
    transactions?: Transaction[]
  ): Map<number, number> {
    const daysCount = new Map<number, number>();

    // Initialize all days to 0
    for (let i = 0; i < 7; i++) {
      daysCount.set(i, 0);
    }

    // Determine actual date range
    let actualStart: Date;
    let actualEnd: Date;

    if (startDate && endDate) {
      actualStart = startDate;
      actualEnd = endDate;
    } else if (transactions && transactions.length > 0) {
      // Use transaction date range if no explicit dates provided
      actualStart = new Date(transactions[transactions.length - 1].date);
      actualEnd = new Date(transactions[0].date);
    } else {
      // Default to last 30 days
      actualEnd = new Date();
      actualStart = new Date();
      actualStart.setDate(actualStart.getDate() - 30);
    }

    // Count occurrences of each day
    const current = new Date(actualStart);
    while (current <= actualEnd) {
      const dayOfWeek = current.getDay();
      daysCount.set(dayOfWeek, (daysCount.get(dayOfWeek) || 0) + 1);
      current.setDate(current.getDate() + 1);
    }

    return daysCount;
  }

  private generateInsights(analysisResult: DayOfWeekResult): string[] {
    const insights: string[] = [];

    if (analysisResult.byDay) {
      const highestDay = analysisResult.byDay[0];
      const lowestDay = analysisResult.byDay[analysisResult.byDay.length - 1];

      insights.push(
        `You spend the most on ${highestDay.dayName}s (avg ₪${highestDay.averageDailySpending.toFixed(0)} per ${highestDay.dayName})`
      );

      if (lowestDay.averageDailySpending > 0) {
        insights.push(
          `You spend the least on ${lowestDay.dayName}s (avg ₪${lowestDay.averageDailySpending.toFixed(0)} per ${lowestDay.dayName})`
        );
      }

      // Check for significant differences
      const ratio =
        highestDay.averageDailySpending / (lowestDay.averageDailySpending || 1);
      if (ratio > 2) {
        insights.push(
          `Your ${highestDay.dayName} spending is ${ratio.toFixed(1)}x higher than ${lowestDay.dayName}s`
        );
      }
    }

    if (analysisResult.weekdayVsWeekend) {
      const { weekdays, weekends } = analysisResult.weekdayVsWeekend;

      if (weekdays.averageDailySpending > weekends.averageDailySpending) {
        const diff = (
          ((weekdays.averageDailySpending - weekends.averageDailySpending) /
            weekends.averageDailySpending) *
          100
        ).toFixed(0);
        insights.push(
          `You spend ${diff}% more on weekdays (₪${weekdays.averageDailySpending.toFixed(0)}/day) than weekends (₪${weekends.averageDailySpending.toFixed(0)}/day)`
        );
      } else if (
        weekends.averageDailySpending > weekdays.averageDailySpending
      ) {
        const diff = (
          ((weekends.averageDailySpending - weekdays.averageDailySpending) /
            weekdays.averageDailySpending) *
          100
        ).toFixed(0);
        insights.push(
          `You spend ${diff}% more on weekends (₪${weekends.averageDailySpending.toFixed(0)}/day) than weekdays (₪${weekdays.averageDailySpending.toFixed(0)}/day)`
        );
      }
    }

    return insights;
  }

  private getEmptyWeekdayStats() {
    return {
      totalSpent: 0,
      transactionCount: 0,
      averageTransaction: 0,
      averageDailySpending: 0,
      daysInPeriod: 0,
    };
  }

  private getEmptyWeekendStats() {
    return {
      totalSpent: 0,
      transactionCount: 0,
      averageTransaction: 0,
      averageDailySpending: 0,
      daysInPeriod: 0,
    };
  }
}
