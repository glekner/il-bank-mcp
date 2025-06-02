import {
  Transaction,
  Account,
  FinancialSummary,
  ProviderKey,
} from '@bank-assistant/scraper';
import type { OptimizedFinancialSummary } from './utils/response-optimizer.js';

export interface TransactionArgs {
  startDate?: string;
  endDate?: string;
  accountId?: string;
}

export interface SummaryArgs {
  startDate?: string;
  endDate?: string;
}

export interface BalanceHistoryArgs {
  accountId: string;
  days?: number;
}

export interface RefreshProviderArgs {
  provider: ProviderKey;
}

export interface ToolResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp?: string;
}

export interface TransactionResponse extends ToolResponse {
  count?: number;
  transactions?: Transaction[];
}

export interface AccountsResponse extends ToolResponse {
  accounts?: Account[];
}

export interface SummaryResponse extends ToolResponse {
  summary?: FinancialSummary | OptimizedFinancialSummary;
}

export interface BalanceHistoryResponse extends ToolResponse {
  accountId?: string;
  history?: { date: Date; balance: number }[];
}

export interface RefreshResponse extends ToolResponse {
  message?: string;
  details?: string;
}

export interface ScrapeStatusResponse extends ToolResponse {
  isRunning?: boolean;
  lastScrapeAt?: string;
  status?: string;
  duration?: number;
  transactionsCount?: number;
  accountsCount?: number;
  error?: string;
  activeScrapes?: Array<{
    provider: string;
    startedAt: string;
    status: string;
  }>;
}

export const DEFAULT_BALANCE_HISTORY_DAYS = 30;

// New financial advisory tool types
export interface MonthlyCreditSummaryArgs {
  month?: number;
  year?: number;
  includeCategories?: boolean;
}

export interface RecurringChargesArgs {
  minOccurrences?: number;
  lookbackMonths?: number;
}

export interface FinancialHealthScoreArgs {
  includeDetails?: boolean;
  customWeights?: {
    savingsRate?: number;
    spendingControl?: number;
    incomeStability?: number;
    emergencyFund?: number;
  };
}

// Response types for new tools
export interface CreditCardSummary {
  cardId: string;
  cardName: string;
  totalSpent: number;
  transactionCount: number;
  averageTransaction: number;
  largestTransaction?: Transaction;
  categoryBreakdown?: Record<string, number>;
}

export interface RecurringCharge {
  merchantName: string;
  averageAmount: number;
  frequency: string; // "weekly", "monthly", "quarterly", etc.
  occurrences: number;
  lastCharge: string;
  nextExpectedCharge?: string;
  totalSpent: number;
}

export interface RecurringIncome {
  sourceName: string;
  averageAmount: number;
  frequency: string; // "weekly", "monthly", "quarterly", etc.
  occurrences: number;
  lastIncome: string;
  nextExpectedIncome?: string;
  totalReceived: number;
  incomeType?: string; // "salary", "dividend", "interest", etc.
}

// Add these new types for merchant and category analysis
export interface MerchantAnalysisArgs {
  merchantName: string;
  lookbackMonths?: number;
  includeAnomalies?: boolean;
}

export interface SpendingByMerchantArgs {
  startDate?: string;
  endDate?: string;
  minAmount?: number;
  topN?: number;
}

export interface CategoryComparisonArgs {
  categories?: string[];
  period1Start: string;
  period1End: string;
  period2Start: string;
  period2End: string;
}

export interface SearchTransactionsArgs {
  searchTerm?: string;
  minAmount?: number;
  maxAmount?: number;
  categories?: string[];
  startDate?: string;
  endDate?: string;
}

export interface AvailableCategoriesArgs {
  startDate?: string;
  endDate?: string;
  accountId?: string;
}
