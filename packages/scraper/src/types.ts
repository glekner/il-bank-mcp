import type { ProviderKey } from './utils/providers';

// Re-export ProviderKey
export type { ProviderKey } from './utils/providers';

// Scraper types
export interface ScraperCredentials {
  username: string;
  password: string;
  [key: string]: unknown; // Allow additional fields for specific providers
}

// Extended credential types for different services
export interface BaseCredentials {
  username: string;
  password: string;
}

// Specific credential types for providers that need extra fields
export interface HapoalimCredentials extends BaseCredentials {
  userCode?: string;
}

export interface DiscountCredentials extends BaseCredentials {
  id?: string;
  num?: string;
}

export interface MercantileCredentials extends BaseCredentials {
  id?: string;
  num?: string;
}

export interface IsracardCredentials {
  id: string;
  card6Digits: string;
  password: string;
}

export interface AmexCredentials {
  username: string;
  card6Digits: string;
  password: string;
}

export interface YahavCredentials extends BaseCredentials {
  nationalID: string;
}

export interface BeyhadCredentials {
  id: string;
  password: string;
}

export type ProviderCredentials =
  | BaseCredentials
  | HapoalimCredentials
  | DiscountCredentials
  | MercantileCredentials
  | IsracardCredentials
  | AmexCredentials
  | YahavCredentials
  | BeyhadCredentials;

export type MultiProviderCredentials = Partial<
  Record<ProviderKey, ProviderCredentials>
>;

export interface Transaction {
  id: string;
  date: Date;
  description: string;
  amount: number;
  category: string;
  accountId: string;
  reference: string | null;
  memo: string | null;
}

export interface Account {
  id: string;
  balance: number;
  type: string;
  name: string;
}

export interface ScrapedAccountData {
  accounts: Account[];
  transactions: Transaction[];
  rawData: unknown[]; // Original scraped data
  scrapedAt: Date;
}

// Processed data types
export interface ProcessedTransaction extends Transaction {
  isExpense: boolean;
  isIncome: boolean;
  month: string; // Format: YYYY-MM
}

export interface CategoryBreakdown {
  [category: string]: {
    total: number;
    count: number;
    transactions: ProcessedTransaction[];
  };
}

export interface FinancialTrend {
  period: string; // Month or period
  income: number;
  expenses: number;
  balance: number;
  categories: {
    [category: string]: number;
  };
}

export interface FinancialSummary {
  transactions: ProcessedTransaction[];
  trends: FinancialTrend[];
  income: CategoryBreakdown;
  expenses: CategoryBreakdown;
}
