import { ProcessedTransaction, CategoryBreakdown } from '../types';
export declare function categorizeExpenses(transactions: ProcessedTransaction[]): CategoryBreakdown;
export declare function identifyTopExpenseCategories(expenses: CategoryBreakdown, limit?: number): {
    category: string;
    amount: number;
    percentage: number;
}[];
export declare function identifyUnusualExpenses(transactions: ProcessedTransaction[], threshold?: number): ProcessedTransaction[];
//# sourceMappingURL=expenseAnalyzer.d.ts.map