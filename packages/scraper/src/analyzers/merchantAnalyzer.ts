import { Transaction } from '../types';

export interface MerchantAnalysis {
  merchantName: string;
  totalAmount: number;
  transactionCount: number;
  averageAmount: number;
  minAmount: number;
  maxAmount: number;
  firstSeen: Date;
  lastSeen: Date;
  transactions: Transaction[];
  frequency: 'daily' | 'weekly' | 'monthly' | 'irregular';
  anomalies?: Transaction[];
}

export interface MerchantSpending {
  merchant: string;
  totalAmount: number;
  transactionCount: number;
  transactions: Transaction[];
}

/**
 * Extract merchant name from transaction description
 * This is a simple implementation - can be enhanced with ML/pattern matching
 */
export function extractMerchantName(description: string): string {
  // Remove common payment method prefixes
  let cleaned = description
    .replace(/^(הוראת קבע|העברה|משיכה|הפקדה)\s+/i, '')
    .replace(/^(DIRECT DEBIT|TRANSFER|WITHDRAWAL|DEPOSIT)\s+/i, '');

  // Remove card numbers and dates
  cleaned = cleaned.replace(/\d{4}-\d{4}-\d{4}-\d{4}/, '');
  cleaned = cleaned.replace(/\d{2}\/\d{2}\/\d{4}/, '');

  // Take first meaningful part (usually merchant name)
  const parts = cleaned.split(/\s{2,}|\s*-\s*/);
  return parts[0].trim() || description.trim();
}

/**
 * Analyze spending patterns for a specific merchant
 */
export function analyzeMerchantSpending(
  transactions: Transaction[],
  merchantName: string,
  includeAnomalies = false
): MerchantAnalysis | null {
  const merchantTransactions = transactions.filter(t => {
    const txMerchant = extractMerchantName(t.description);
    return txMerchant.toLowerCase().includes(merchantName.toLowerCase());
  });

  if (merchantTransactions.length === 0) {
    return null;
  }

  // Sort by date
  merchantTransactions.sort((a, b) => a.date.getTime() - b.date.getTime());

  const amounts = merchantTransactions.map(t => Math.abs(t.amount));
  const totalAmount = amounts.reduce((sum, amt) => sum + amt, 0);
  const averageAmount = totalAmount / amounts.length;

  // Calculate standard deviation for anomaly detection
  const variance =
    amounts.reduce((sum, amt) => {
      const diff = amt - averageAmount;
      return sum + diff * diff;
    }, 0) / amounts.length;
  const stdDev = Math.sqrt(variance);

  let anomalies: Transaction[] | undefined;
  if (includeAnomalies) {
    anomalies = merchantTransactions.filter(t => {
      const amount = Math.abs(t.amount);
      return amount > averageAmount + 1.5 * stdDev;
    });
  }

  // Determine frequency pattern
  const frequency = determineFrequency(merchantTransactions);

  return {
    merchantName: extractMerchantName(merchantTransactions[0].description),
    totalAmount,
    transactionCount: merchantTransactions.length,
    averageAmount,
    minAmount: Math.min(...amounts),
    maxAmount: Math.max(...amounts),
    firstSeen: merchantTransactions[0].date,
    lastSeen: merchantTransactions[merchantTransactions.length - 1].date,
    transactions: merchantTransactions,
    frequency,
    anomalies,
  };
}

/**
 * Get spending grouped by merchant
 */
export function getSpendingByMerchant(
  transactions: Transaction[],
  options?: {
    minAmount?: number;
    topN?: number;
  }
): MerchantSpending[] {
  const merchantMap = new Map<string, MerchantSpending>();

  // Group transactions by merchant
  transactions.forEach(transaction => {
    if (transaction.amount >= 0) return; // Skip income

    const merchantName = extractMerchantName(transaction.description);
    const existing = merchantMap.get(merchantName);

    if (existing) {
      existing.totalAmount += Math.abs(transaction.amount);
      existing.transactionCount++;
      existing.transactions.push(transaction);
    } else {
      merchantMap.set(merchantName, {
        merchant: merchantName,
        totalAmount: Math.abs(transaction.amount),
        transactionCount: 1,
        transactions: [transaction],
      });
    }
  });

  let results = Array.from(merchantMap.values());

  // Apply filters
  if (options?.minAmount !== undefined) {
    const minAmount = options.minAmount;
    results = results.filter(m => m.totalAmount >= minAmount);
  }

  // Sort by total amount descending
  results.sort((a, b) => b.totalAmount - a.totalAmount);

  // Limit results
  if (options?.topN) {
    results = results.slice(0, options.topN);
  }

  return results;
}

/**
 * Determine transaction frequency pattern
 */
function determineFrequency(
  transactions: Transaction[]
): MerchantAnalysis['frequency'] {
  if (transactions.length < 2) return 'irregular';

  // Calculate intervals between transactions in days
  const intervals: number[] = [];
  for (let i = 1; i < transactions.length; i++) {
    const days = Math.floor(
      (transactions[i].date.getTime() - transactions[i - 1].date.getTime()) /
        (1000 * 60 * 60 * 24)
    );
    intervals.push(days);
  }

  const avgInterval =
    intervals.reduce((sum, int) => sum + int, 0) / intervals.length;

  if (avgInterval <= 2) return 'daily';
  if (avgInterval <= 10) return 'weekly';
  if (avgInterval <= 35) return 'monthly';
  return 'irregular';
}

/**
 * Find merchants with unusual spending patterns
 */
export function findUnusualMerchantCharges(
  transactions: Transaction[],
  lookbackMonths = 6
): MerchantAnalysis[] {
  const cutoffDate = new Date();
  cutoffDate.setMonth(cutoffDate.getMonth() - lookbackMonths);

  const recentTransactions = transactions.filter(t => t.date >= cutoffDate);
  const merchantAnalyses: MerchantAnalysis[] = [];

  // Get unique merchants
  const merchants = new Set(
    recentTransactions.map(t => extractMerchantName(t.description))
  );

  merchants.forEach(merchant => {
    const analysis = analyzeMerchantSpending(
      recentTransactions,
      merchant,
      true
    );
    if (analysis && analysis.anomalies && analysis.anomalies.length > 0) {
      merchantAnalyses.push(analysis);
    }
  });

  return merchantAnalyses;
}
