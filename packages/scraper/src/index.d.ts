export { ScraperService } from "./services/scraperService";
export * from "./types";
export { logger } from "./utils/logger";
declare function scrapeAndAnalyzeData(): Promise<{
    transactions: import("./types").ProcessedTransaction[];
    trends: import("./types").FinancialTrend[];
    income: import("./types").CategoryBreakdown;
    expenses: import("./types").CategoryBreakdown;
}>;
export { scrapeAndAnalyzeData };
//# sourceMappingURL=index.d.ts.map