import { BaseHandler } from "./base.js";
import { ScrapeStatusResponse } from "../types.js";

export class StatusHandler extends BaseHandler {
  async getScrapeStatus() {
    const info = await this.scraperService.getLastScrapeInfo();

    const response: ScrapeStatusResponse = {
      success: true,
      isRunning: info.isRunning,
      lastScrapeAt: info.lastScrapeAt?.toISOString(),
      status: info.status,
      duration: info.duration,
      transactionsCount: info.transactionsCount,
      accountsCount: info.accountsCount,
      error: info.error,
    };

    return this.formatResponse(response);
  }
}
