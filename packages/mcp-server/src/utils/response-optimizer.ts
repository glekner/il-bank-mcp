import { logger } from './logger.js';
import type {
  ProcessedTransaction,
  CategoryBreakdown,
  FinancialSummary,
  FinancialTrend,
} from '@bank-assistant/scraper';

// MCP has a practical limit on response sizes.
// According to best practices, we should keep responses under 50KB for optimal performance
const MAX_RESPONSE_SIZE_BYTES = 50 * 1024; // 50KB - much more reasonable limit
const MAX_TRANSACTIONS_PER_RESPONSE = 200; // Reduced from 500
const MAX_TRANSACTIONS_PER_CATEGORY = 5; // Reduced from 10

interface OptimizationOptions {
  maxTransactions?: number;
  includeTransactionDetails?: boolean;
  summarizeCategories?: boolean;
}

export interface OptimizedCategoryBreakdown {
  [category: string]: {
    total: number;
    count: number;
    transactions?: ProcessedTransaction[]; // Optional, limited set
    topTransactions?: ProcessedTransaction[]; // Top N by amount
    averageAmount?: number;
    minAmount?: number;
    maxAmount?: number;
  };
}

export interface OptimizedFinancialSummary {
  transactions?: ProcessedTransaction[]; // Optional, may be omitted for large datasets
  transactionCount: number;
  dateRange: {
    start: Date;
    end: Date;
  };
  trends: FinancialTrend[];
  income: OptimizedCategoryBreakdown;
  expenses: OptimizedCategoryBreakdown;
  summary: {
    totalIncome: number;
    totalExpenses: number;
    netBalance: number;
    topExpenseCategories: Array<{
      category: string;
      amount: number;
      percentage: number;
    }>;
    topIncomeCategories: Array<{
      category: string;
      amount: number;
      percentage: number;
    }>;
  };
  metadata: {
    isOptimized: boolean;
    optimizationReason?: string;
    fullDataAvailable: boolean;
  };
}

/**
 * Calculate the number of days between two dates
 */
function getDaysBetween(startDate?: Date, endDate?: Date): number {
  if (!startDate || !endDate) return 0;
  const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Estimate the size of an object in bytes
 */
function estimateSize(obj: unknown): number {
  return JSON.stringify(obj).length * 2; // Rough estimate (2 bytes per character)
}

/**
 * Optimize category breakdown by removing or limiting transaction details
 */
function optimizeCategoryBreakdown(
  categories: CategoryBreakdown,
  options: OptimizationOptions
): OptimizedCategoryBreakdown {
  const optimized: OptimizedCategoryBreakdown = {};

  for (const [category, data] of Object.entries(categories)) {
    const sortedTransactions = [...data.transactions].sort(
      (a, b) => Math.abs(b.amount) - Math.abs(a.amount)
    );

    optimized[category] = {
      total: data.total,
      count: data.count,
      averageAmount: data.total / data.count,
      minAmount: Math.min(...data.transactions.map(t => t.amount)),
      maxAmount: Math.max(...data.transactions.map(t => t.amount)),
    };

    if (options.includeTransactionDetails && !options.summarizeCategories) {
      // Include limited transaction details
      optimized[category].topTransactions = sortedTransactions.slice(
        0,
        MAX_TRANSACTIONS_PER_CATEGORY
      );
    }
  }

  return optimized;
}

/**
 * Calculate summary statistics
 */
function calculateSummaryStats(
  income: CategoryBreakdown,
  expenses: CategoryBreakdown
) {
  const totalIncome = Object.values(income).reduce(
    (sum, cat) => sum + cat.total,
    0
  );
  const totalExpenses = Object.values(expenses).reduce(
    (sum, cat) => sum + Math.abs(cat.total),
    0
  );

  const topExpenseCategories = Object.entries(expenses)
    .map(([category, data]) => ({
      category,
      amount: Math.abs(data.total),
      percentage: (Math.abs(data.total) / totalExpenses) * 100,
    }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5);

  const topIncomeCategories = Object.entries(income)
    .map(([category, data]) => ({
      category,
      amount: data.total,
      percentage: (data.total / totalIncome) * 100,
    }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5);

  return {
    totalIncome,
    totalExpenses,
    netBalance: totalIncome - totalExpenses,
    topExpenseCategories,
    topIncomeCategories,
  };
}

/**
 * Optimize financial summary based on timeframe and data size
 */
export function optimizeFinancialSummary(
  summary: FinancialSummary,
  startDate?: Date,
  endDate?: Date
): OptimizedFinancialSummary {
  const daysBetween = getDaysBetween(startDate, endDate);
  const estimatedSize = estimateSize(summary);
  const transactionCount = summary.transactions.length;

  logger.info('Optimizing financial summary', {
    daysBetween,
    transactionCount,
    estimatedSizeBytes: estimatedSize,
    needsOptimization:
      estimatedSize > MAX_RESPONSE_SIZE_BYTES ||
      transactionCount > MAX_TRANSACTIONS_PER_RESPONSE,
  });

  // Determine optimization strategy based on timeframe and data size
  let options: OptimizationOptions = {
    maxTransactions: MAX_TRANSACTIONS_PER_RESPONSE,
    includeTransactionDetails: true,
    summarizeCategories: false,
  };

  let optimizationReason: string | undefined;

  // For timeframes over 90 days or large datasets, apply aggressive optimization
  if (daysBetween > 90 || transactionCount > MAX_TRANSACTIONS_PER_RESPONSE) {
    options = {
      maxTransactions: 0, // Don't include individual transactions
      includeTransactionDetails: false,
      summarizeCategories: true,
    };
    optimizationReason =
      daysBetween > 90
        ? `Large timeframe (${daysBetween} days)`
        : `Too many transactions (${transactionCount})`;
  }
  // For medium timeframes (30-90 days), include limited transaction details
  else if (daysBetween > 30 || estimatedSize > MAX_RESPONSE_SIZE_BYTES) {
    options = {
      maxTransactions: 100,
      includeTransactionDetails: true,
      summarizeCategories: true,
    };
    optimizationReason = `Medium timeframe or large response size`;
  }

  const optimizedSummary: OptimizedFinancialSummary = {
    transactionCount: summary.transactions.length,
    dateRange: {
      start: startDate || (summary.transactions[0]?.date ?? new Date()),
      end:
        endDate ||
        (summary.transactions[summary.transactions.length - 1]?.date ??
          new Date()),
    },
    trends: summary.trends,
    income: optimizeCategoryBreakdown(summary.income, options),
    expenses: optimizeCategoryBreakdown(summary.expenses, options),
    summary: calculateSummaryStats(summary.income, summary.expenses),
    metadata: {
      isOptimized: !!optimizationReason,
      optimizationReason,
      fullDataAvailable: true,
    },
  };

  // Include transactions only if within limits
  if (options.maxTransactions && options.maxTransactions > 0) {
    // Sort by amount (absolute value) and take the most significant ones
    const sortedTransactions = [...summary.transactions]
      .sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount))
      .slice(0, options.maxTransactions);

    optimizedSummary.transactions = sortedTransactions;
  }

  const optimizedSize = estimateSize(optimizedSummary);
  logger.info('Financial summary optimized', {
    originalSizeBytes: estimatedSize,
    optimizedSizeBytes: optimizedSize,
    reductionPercentage: ((1 - optimizedSize / estimatedSize) * 100).toFixed(2),
    includesTransactions: !!optimizedSummary.transactions,
  });

  return optimizedSummary;
}

/**
 * Generic response size checker and optimizer for any MCP response
 */
export function checkAndOptimizeResponse<T>(
  response: T,
  optimizeFn?: (data: T) => T
): T {
  const size = estimateSize(response);

  if (size > MAX_RESPONSE_SIZE_BYTES) {
    logger.warn('Response size exceeds MCP recommended limits', {
      sizeBytes: size,
      maxSizeBytes: MAX_RESPONSE_SIZE_BYTES,
    });

    if (optimizeFn) {
      return optimizeFn(response);
    }
  }

  return response;
}

/**
 * Create a paginated response for large datasets
 */
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
}

export function createPaginatedResponse<T>(
  items: T[],
  page: number = 1,
  pageSize: number = 50
): PaginatedResponse<T> {
  const totalItems = items.length;
  const totalPages = Math.ceil(totalItems / pageSize);
  const startIndex = (page - 1) * pageSize;
  const endIndex = startIndex + pageSize;

  return {
    data: items.slice(startIndex, endIndex),
    pagination: {
      page,
      pageSize,
      totalItems,
      totalPages,
      hasNext: page < totalPages,
      hasPrevious: page > 1,
    },
  };
}

/**
 * Recursively remove null and undefined values from an object
 * This helps reduce response size by eliminating unnecessary null fields
 */
export function omitNullValues<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(omitNullValues) as unknown as T;
  }

  if (typeof obj === 'object' && obj !== null) {
    const result: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(obj)) {
      if (value !== null && value !== undefined) {
        result[key] = omitNullValues(value);
      }
    }

    return result as T;
  }

  return obj;
}
