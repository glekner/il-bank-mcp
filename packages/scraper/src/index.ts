import { scrapeBankData } from './scraper';
import { processTransactions } from './processors/transactionProcessor';
import { analyzeFinancialTrends } from './analyzers/trendAnalyzer';
import { categorizeIncome } from './analyzers/incomeAnalyzer';
import { categorizeExpenses } from './analyzers/expenseAnalyzer';
import { logger } from './utils/logger';

async function main() {
  try {
    logger.info('Starting Bank Leumi data scraping process');
    
    // Scrape raw data from Bank Leumi
    const scrapedData = await scrapeBankData();
    
    // Process transactions
    const processedTransactions = processTransactions(scrapedData.transactions);
    
    // Analyze financial data
    const financialTrends = analyzeFinancialTrends(processedTransactions);
    const incomeBreakdown = categorizeIncome(processedTransactions);
    const expenseBreakdown = categorizeExpenses(processedTransactions);
    
    // Output results
    logger.info('Data scraping and processing completed successfully');
    
    return {
      transactions: processedTransactions,
      trends: financialTrends,
      income: incomeBreakdown,
      expenses: expenseBreakdown
    };
  } catch (error) {
    logger.error('Error in the scraping process', { error });
    throw error;
  }
}

// If this file is run directly
if (require.main === module) {
  main().then(result => {
    console.log('Scraping completed successfully');
    console.log('Transactions:', result.transactions.length);
    console.log('Income categories:', Object.keys(result.income).length);
    console.log('Expense categories:', Object.keys(result.expenses).length);
  }).catch(error => {
    console.error('Failed to complete scraping:', error);
    process.exit(1);
  });
}

export { main as scrapeAndAnalyzeData };