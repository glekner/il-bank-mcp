import { BaseHandler } from "./base.js";
import {
  RefreshServiceArgs,
  RefreshResponse,
  VALID_SERVICES,
} from "../types.js";
import { logger } from "../utils/logger.js";

export class RefreshHandler extends BaseHandler {
  async refreshAllData() {
    logger.info("Starting force scrape of all data...");

    try {
      await this.scraperService.forceScrape();

      const response: RefreshResponse = {
        success: true,
        message: "All bank and credit card data refreshed successfully",
        timestamp: new Date().toISOString(),
      };

      return this.formatResponse(response);
    } catch (error) {
      logger.error("Force scrape failed", {
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

    logger.info(`Starting force scrape of ${args.service} data...`);

    try {
      await this.scraperService.forceScrapeService(args.service as any);

      const response: RefreshResponse = {
        success: true,
        message: `${args.service} data refreshed successfully`,
        timestamp: new Date().toISOString(),
      };

      return this.formatResponse(response);
    } catch (error) {
      logger.error(`Force scrape of ${args.service} failed`, {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
