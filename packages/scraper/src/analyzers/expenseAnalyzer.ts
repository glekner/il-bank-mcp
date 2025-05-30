import { ProcessedTransaction, CategoryBreakdown } from '../types';
import { logger } from '../utils/logger';

/**
 * Categorizes and analyzes expense transactions
 * @param transactions Processed transactions
 * @returns Categorized expense breakdown
 */
export function categorizeExpenses(transactions: ProcessedTransaction[]): CategoryBreakdown {
  logger.info('Categorizing expense transactions');
  
  // Filter to only include expense transactions
  const expenseTransactions = transactions.filter(t => t.isExpense);
  
  // Group by category
  const expensesByCategory: CategoryBreakdown = {};
  
  expenseTransactions.forEach(transaction => {
    const category = transaction.category || 'Uncategorized';
    
    if (!expensesByCategory[category]) {
      expensesByCategory[category] = {
        total: 0,
        count: 0,
        transactions: []
      };
    }
    
    // Store as positive value for easier calculation
    expensesByCategory[category].total += Math.abs(transaction.amount);
    expensesByCategory[category].count++;
    expensesByCategory[category].transactions.push(transaction);
  });
  
  logger.info('Expense categorization completed', { 
    totalExpenses: Object.values(expensesByCategory).reduce((sum, cat) => sum + cat.total, 0),
    categories: Object.keys(expensesByCategory).length
  });
  
  return expensesByCategory;
}

/**
 * Identifies the largest expense categories
 */
export function identifyTopExpenseCategories(
  expenses: CategoryBreakdown,
  limit = 5
): { category: string, amount: number, percentage: number }[] {
  // Calculate total expenses
  const totalExpenses = Object.values(expenses).reduce((sum, cat) => sum + cat.total, 0);
  
  // Sort categories by total amount
  return Object.entries(expenses)
    .map(([category, data]) => ({
      category,
      amount: data.total,
      percentage: (data.total / totalExpenses) * 100
    }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, limit);
}

/**
 * Identifies unusual or irregular expenses
 */
export function identifyUnusualExpenses(
  transactions: ProcessedTransaction[],
  threshold = 2 // Standard deviations above average
): ProcessedTransaction[] {
  const expenseTransactions = transactions.filter(t => t.isExpense);
  
  // Calculate mean and standard deviation of expense amounts
  const amounts = expenseTransactions.map(t => Math.abs(t.amount));
  const mean = amounts.reduce((sum, amount) => sum + amount, 0) / amounts.length;
  
  const variance = amounts.reduce((sum, amount) => {
    const diff = amount - mean;
    return sum + (diff * diff);
  }, 0) / amounts.length;
  
  const stdDev = Math.sqrt(variance);
  
  // Find transactions that exceed the threshold
  return expenseTransactions.filter(t => {
    const amount = Math.abs(t.amount);
    return amount > (mean + (threshold * stdDev));
  });
}