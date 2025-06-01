import { BaseHandler } from "./base.js";
import {
  RefreshServiceArgs,
  RefreshResponse,
  VALID_SERVICES,
} from "../types.js";
import { logger } from "../utils/logger.js";

export class RefreshHandler extends BaseHandler {
  async refreshAllData() {
    logger.info("Starting async scrape of all data...");

    try {
      await this.scraperService.startAsyncScrapeAll();

      const response: RefreshResponse = {
        success: true,
        message:
          "Scraping of all bank and credit card data has been initiated. The process is running in the background.",
        timestamp: new Date().toISOString(),
      };

      return this.formatResponse(response);
    } catch (error) {
      logger.error("Failed to start async scrape", {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async refreshServiceData(args: RefreshServiceArgs) {
    if (!args.service) {
      throw new Error("service is required");
    }

    if (!VALID_SERVICES.includes(args.service)) {
      throw new Error(
        `Invalid service. Must be one of: ${VALID_SERVICES.join(", ")}`
      );
    }

    logger.info(`Starting async scrape of ${args.service} data...`);

    try {
      await this.scraperService.startAsyncScrapeService(args.service as any);

      const response: RefreshResponse = {
        success: true,
        message: `Scraping of ${args.service} data has been initiated. The process is running in the background.`,
        timestamp: new Date().toISOString(),
      };

      return this.formatResponse(response);
    } catch (error) {
      logger.error(`Failed to start async scrape of ${args.service}`, {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
