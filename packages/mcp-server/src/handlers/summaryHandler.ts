import { BaseHandler } from './base.js';
import { SummaryArgs, SummaryResponse } from '../types.js';
import { logger } from '../utils/logger.js';
import type { FinancialSummary } from '@bank-assistant/scraper';
import { optimizeFinancialSummary } from '../utils/response-optimizer.js';

export class SummaryHandler extends BaseHandler {
  async getFinancialSummary(args: SummaryArgs) {
    const startDate = this.parseDate(args.startDate);
    const endDate = this.parseDate(args.endDate);

    const summary = await this.scraperService.getFinancialSummary(
      startDate,
      endDate
    );

    // If summary is empty, trigger an async scrape
    if (this.isSummaryEmpty(summary)) {
      logger.info('Financial summary is empty, triggering async scrape...');
      await this.scraperService.startAsyncScrapeAll();

      // Don't retry immediately since scraping is async
      // The user will be notified that scraping is in progress
    }

    // Optimize the summary for large timeframes to prevent MCP response size errors
    const optimizedSummary = optimizeFinancialSummary(
      summary,
      startDate?.toISOString(),
      endDate?.toISOString()
    );

    let response: SummaryResponse = {
      success: true,
      summary: optimizedSummary,
    };

    // Add scrape status if running
    response = await this.addScrapeStatusIfRunning(response);

    return this.formatResponse(response);
  }

  private isSummaryEmpty(summary: FinancialSummary): boolean {
    return (
      !summary ||
      summary.transactions.length === 0 ||
      (Object.keys(summary.income).length === 0 &&
        Object.keys(summary.expenses).length === 0)
    );
  }
}
