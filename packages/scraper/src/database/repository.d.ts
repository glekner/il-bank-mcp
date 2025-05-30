import { Transaction, Account, ScrapedAccountData } from "../types";
export declare class BankDataRepository {
    private db;
    constructor();
    startScrapeRun(): number;
    completeScrapeRun(runId: number, success: boolean, error?: string, stats?: {
        transactions: number;
        accounts: number;
    }): void;
    saveScrapedData(data: ScrapedAccountData): void;
    private saveAccount;
    private saveAccountBalance;
    private saveTransaction;
    getTransactions(startDate?: Date, endDate?: Date, accountId?: string): Transaction[];
    getAccounts(): Account[];
    getAccountBalanceHistory(accountId: string, days?: number): {
        date: Date;
        balance: number;
    }[];
    shouldScrape(hoursThreshold?: number): boolean;
    close(): void;
}
//# sourceMappingURL=repository.d.ts.map