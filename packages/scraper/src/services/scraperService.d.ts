import { FinancialSummary, Transaction } from "../types";
export declare class ScraperService {
    private repository;
    constructor();
    scrapeAndSave(): Promise<void>;
    forceScrape(): Promise<void>;
    getFinancialSummary(startDate?: Date, endDate?: Date): Promise<FinancialSummary>;
    getTransactions(options?: {
        startDate?: Date;
        endDate?: Date;
        accountId?: string;
    }): Promise<Transaction[]>;
    getAccounts(): Promise<import("../types").Account[]>;
    getAccountBalanceHistory(accountId: string, days?: number): Promise<{
        date: Date;
        balance: number;
    }[]>;
    close(): void;
}
//# sourceMappingURL=scraperService.d.ts.map