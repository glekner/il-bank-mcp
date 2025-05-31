import { BaseHandler } from "./base.js";
import { SummaryArgs, SummaryResponse } from "../types.js";
import { logger } from "../utils/logger.js";

export class SummaryHandler extends BaseHandler {
  async getFinancialSummary(args: SummaryArgs) {
    const startDate = this.parseDate(args.startDate);
    const endDate = this.parseDate(args.endDate);

    let summary = await this.scraperService.getFinancialSummary(
      startDate,
      endDate
    );

    // If summary is empty, trigger a scrape and retry
    if (this.isSummaryEmpty(summary)) {
      logger.info("Financial summary is empty, triggering scrape...");
      await this.scraperService.forceScrape();

      // Retry getting the summary after scraping
      summary = await this.scraperService.getFinancialSummary(
        startDate,
        endDate
      );
    }

    let response: SummaryResponse = {
      success: true,
      summary,
    };

    // Add scrape status if running
    response = await this.addScrapeStatusIfRunning(response);

    return this.formatResponse(response);
  }

  private isSummaryEmpty(summary: any): boolean {
    return (
      !summary ||
      summary.transactions.length === 0 ||
      (Object.keys(summary.income).length === 0 &&
        Object.keys(summary.expenses).length === 0)
    );
  }
}
