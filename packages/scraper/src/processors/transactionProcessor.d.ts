import { Transaction, ProcessedTransaction } from '../types';
export declare function processTransactions(transactions: Transaction[]): ProcessedTransaction[];
export declare function filterTransactionsByDateRange(transactions: ProcessedTransaction[], startDate: Date, endDate: Date): ProcessedTransaction[];
export declare function groupTransactionsByPeriod(transactions: ProcessedTransaction[], period?: 'day' | 'week' | 'month'): Record<string, ProcessedTransaction[]>;
//# sourceMappingURL=transactionProcessor.d.ts.map