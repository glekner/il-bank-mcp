import * as cron from "node-cron";
import { ScraperService } from "./services/scraperService";
import { logger } from "./utils/logger";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config();

const CRON_SCHEDULE = process.env.SCRAPE_CRON_SCHEDULE || "0 */6 * * *"; // Default: every 6 hours

async function runScheduledScrape() {
  const service = new ScraperService();

  try {
    logger.info("Running scheduled scrape");
    await service.scrapeAndSave();
    logger.info("Scheduled scrape completed successfully");
  } catch (error) {
    logger.error("Scheduled scrape failed", { error });
  } finally {
    service.close();
  }
}

// Run immediately on startup
logger.info("Running initial scrape on startup");
runScheduledScrape();

// Schedule regular scrapes
logger.info(`Scheduling scrapes with cron: ${CRON_SCHEDULE}`);
cron.schedule(CRON_SCHEDULE, runScheduledScrape);

// Keep the process running
process.on("SIGINT", () => {
  logger.info("Scheduler shutting down...");
  process.exit(0);
});

logger.info("Bank data scraper scheduler started");
