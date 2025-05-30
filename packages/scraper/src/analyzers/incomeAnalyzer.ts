import { ProcessedTransaction, CategoryBreakdown } from '../types';
import { logger } from '../utils/logger';

/**
 * Categorizes and analyzes income transactions
 * @param transactions Processed transactions
 * @returns Categorized income breakdown
 */
export function categorizeIncome(transactions: ProcessedTransaction[]): CategoryBreakdown {
  logger.info('Categorizing income transactions');
  
  // Filter to only include income transactions
  const incomeTransactions = transactions.filter(t => t.isIncome);
  
  // Group by category
  const incomeByCategory: CategoryBreakdown = {};
  
  incomeTransactions.forEach(transaction => {
    const category = transaction.category || 'Uncategorized';
    
    if (!incomeByCategory[category]) {
      incomeByCategory[category] = {
        total: 0,
        count: 0,
        transactions: []
      };
    }
    
    incomeByCategory[category].total += transaction.amount;
    incomeByCategory[category].count++;
    incomeByCategory[category].transactions.push(transaction);
  });
  
  logger.info('Income categorization completed', { 
    totalIncome: Object.values(incomeByCategory).reduce((sum, cat) => sum + cat.total, 0),
    categories: Object.keys(incomeByCategory).length
  });
  
  return incomeByCategory;
}

/**
 * Identifies regular income sources (e.g., salary, recurring payments)
 */
export function identifyRegularIncomeSources(
  transactions: ProcessedTransaction[]
): Record<string, ProcessedTransaction[]> {
  const incomeTransactions = transactions.filter(t => t.isIncome);
  const regularSources: Record<string, ProcessedTransaction[]> = {};
  
  // Group by similar descriptions
  const descriptionGroups: Record<string, ProcessedTransaction[]> = {};
  
  incomeTransactions.forEach(transaction => {
    // Normalize description
    const normalizedDesc = transaction.description
      .replace(/\d{1,2}\/\d{1,2}\/\d{2,4}/g, '')
      .replace(/\d{4,}/g, '')
      .trim();
    
    if (!descriptionGroups[normalizedDesc]) {
      descriptionGroups[normalizedDesc] = [];
    }
    
    descriptionGroups[normalizedDesc].push(transaction);
  });
  
  // Filter to find recurring income (appears in multiple months)
  Object.entries(descriptionGroups).forEach(([desc, txns]) => {
    // Get unique months
    const uniqueMonths = new Set(txns.map(t => t.month));
    
    // If it appears in multiple months, consider it regular income
    if (uniqueMonths.size >= 2) {
      regularSources[desc] = txns;
    }
  });
  
  return regularSources;
}