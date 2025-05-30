// Scraper types
export interface ScraperCredentials {
  username: string;
  password: string;
}

// Extended credential types for different services
export interface BaseCredentials {
  username: string;
  password: string;
}

export interface LeumiCredentials extends BaseCredentials {}

export interface VisaCalCredentials extends BaseCredentials {}

export interface MaxCredentials extends BaseCredentials {}

export type ServiceCredentials =
  | { type: "leumi"; credentials: LeumiCredentials }
  | { type: "visaCal"; credentials: VisaCalCredentials }
  | { type: "max"; credentials: MaxCredentials };

export interface MultiServiceCredentials {
  leumi?: LeumiCredentials;
  visaCal?: VisaCalCredentials;
  max?: MaxCredentials;
}

export type ServiceType = "leumi" | "visaCal" | "max";

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
