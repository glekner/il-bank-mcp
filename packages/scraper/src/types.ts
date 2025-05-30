// Scraper types
export interface ScraperCredentials {
  username: string;
  password: string;
}

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
  rawData: any[]; // Original scraped data
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