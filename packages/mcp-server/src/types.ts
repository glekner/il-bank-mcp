import {
  Transaction,
  Account,
  FinancialSummary,
} from "@bank-assistant/scraper";

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

export interface RefreshServiceArgs {
  service: ServiceName;
}

export type ServiceName = "leumi" | "visaCal" | "max";

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
  summary?: FinancialSummary;
}

export interface BalanceHistoryResponse extends ToolResponse {
  accountId?: string;
  history?: any;
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
}

export const DEFAULT_BALANCE_HISTORY_DAYS = 30;
export const VALID_SERVICES: ServiceName[] = ["leumi", "visaCal", "max"];
