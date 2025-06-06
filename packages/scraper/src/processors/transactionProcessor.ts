import { Transaction, ProcessedTransaction } from '../types';
import { logger } from '../utils/logger';

/**
 * Processes raw transactions to add additional metadata and categorization
 * @param transactions Raw transactions from the scraper
 * @returns Processed transactions with additional metadata
 */
export function processTransactions(
  transactions: Transaction[]
): ProcessedTransaction[] {
  logger.info('Processing transactions', { count: transactions.length });

  return transactions
    .map(transaction => {
      // Get the actual amount from chargedAmount or originalAmount
      const amount =
        transaction.chargedAmount ?? transaction.originalAmount ?? 0;

      // Determine if transaction is income or expense based on amount
      const isExpense = amount < 0;
      const isIncome = amount > 0;
      const tDate = new Date(transaction.date);

      // Extract month for trend analysis (format: YYYY-MM)
      const month = `${tDate.getFullYear()}-${String(tDate.getMonth() + 1).padStart(2, '0')}`;

      return {
        ...transaction,
        amount,
        isExpense,
        isIncome,
        month,
      };
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()); // Sort by date descending
}

/**
 * Filters transactions by date range
 */
export function filterTransactionsByDateRange(
  transactions: ProcessedTransaction[],
  startDate: Date,
  endDate: Date
): ProcessedTransaction[] {
  return transactions.filter(transaction => {
    const txnDate = new Date(transaction.date).getTime();
    return txnDate >= startDate.getTime() && txnDate <= endDate.getTime();
  });
}

/**
 * Groups transactions by a specified time period (day, week, month)
 */
export function groupTransactionsByPeriod(
  transactions: ProcessedTransaction[],
  period: 'day' | 'week' | 'month' = 'month'
): Record<string, ProcessedTransaction[]> {
  const grouped: Record<string, ProcessedTransaction[]> = {};

  transactions.forEach(transaction => {
    let key: string;

    if (period === 'day') {
      key = transaction.date.split('T')[0]; // YYYY-MM-DD
    } else if (period === 'week') {
      const date = new Date(transaction.date);
      const day = date.getDay();
      const diff = date.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Sunday
      const weekStart = new Date(date.setDate(diff));
      key = weekStart.toISOString().split('T')[0]; // Week starting date
    } else {
      // Default to month
      key = transaction.month;
    }

    if (!grouped[key]) {
      grouped[key] = [];
    }

    grouped[key].push(transaction);
  });

  return grouped;
}
