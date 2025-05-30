import { ProcessedTransaction, FinancialTrend } from '../types';
import { groupTransactionsByPeriod } from '../processors/transactionProcessor';
import { logger } from '../utils/logger';

/**
 * Analyzes transactions to identify financial trends over time
 * @param transactions Processed transactions
 * @returns Financial trends data
 */
export function analyzeFinancialTrends(transactions: ProcessedTransaction[]): FinancialTrend[] {
  logger.info('Analyzing financial trends');
  
  // Group transactions by month
  const transactionsByMonth = groupTransactionsByPeriod(transactions, 'month');
  
  // Create trend data for each month
  const trends: FinancialTrend[] = Object.entries(transactionsByMonth)
    .map(([month, monthTransactions]) => {
      // Calculate totals for the month
      const income = monthTransactions
        .filter(t => t.isIncome)
        .reduce((sum, t) => sum + t.amount, 0);
      
      const expenses = Math.abs(monthTransactions
        .filter(t => t.isExpense)
        .reduce((sum, t) => sum + t.amount, 0));
      
      const balance = income - expenses;
      
      // Calculate category totals
      const categories: Record<string, number> = {};
      
      monthTransactions.forEach(transaction => {
        const category = transaction.category;
        if (!categories[category]) {
          categories[category] = 0;
        }
        categories[category] += Math.abs(transaction.amount);
      });
      
      return {
        period: month,
        income,
        expenses,
        balance,
        categories
      };
    })
    .sort((a, b) => a.period.localeCompare(b.period)); // Sort by month ascending
  
  logger.info('Financial trend analysis completed', { periodCount: trends.length });
  return trends;
}

/**
 * Identifies recurring transactions based on description patterns and amounts
 */
export function identifyRecurringTransactions(
  transactions: ProcessedTransaction[]
): Record<string, ProcessedTransaction[]> {
  const recurringGroups: Record<string, ProcessedTransaction[]> = {};
  
  // Simple identification based on descriptions that appear multiple times
  const descriptionCounts: Record<string, number> = {};
  
  transactions.forEach(transaction => {
    // Create a normalized description by removing dates and specific identifiers
    const normalizedDesc = transaction.description
      .replace(/\d{1,2}\/\d{1,2}\/\d{2,4}/g, '') // Remove dates
      .replace(/\d{4,}/g, '') // Remove long numbers
      .trim();
    
    if (!descriptionCounts[normalizedDesc]) {
      descriptionCounts[normalizedDesc] = 0;
    }
    
    descriptionCounts[normalizedDesc]++;
  });
  
  // Group transactions that appear to be recurring (same description appears multiple times)
  Object.keys(descriptionCounts).forEach(desc => {
    if (descriptionCounts[desc] >= 2) { // At least 2 occurrences
      const matchingTransactions = transactions.filter(t => 
        t.description.includes(desc) || desc.includes(t.description)
      );
      
      if (matchingTransactions.length >= 2) {
        recurringGroups[desc] = matchingTransactions;
      }
    }
  });
  
  return recurringGroups;
}