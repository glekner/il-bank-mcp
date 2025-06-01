import { BaseHandler } from "./base.js";
import { ScrapeStatusResponse } from "../types.js";

export class StatusHandler extends BaseHandler {
  async getScrapeStatus() {
    const status = this.scraperService.getScrapeStatus();

    const response: ScrapeStatusResponse = {
      success: true,
      isRunning: status.isAnyScrapeRunning,
      lastScrapeAt: status.lastScrapeAt?.toISOString(),
      status: status.status,
      duration: status.duration,
      transactionsCount: status.transactionsCount,
      accountsCount: status.accountsCount,
      error: status.error,
      activeScrapes: status.activeScrapes?.map((s) => ({
        service: s.service,
        startedAt: s.startedAt.toISOString(),
        status: s.status,
      })),
    };

    return this.formatResponse(response);
  }
}
