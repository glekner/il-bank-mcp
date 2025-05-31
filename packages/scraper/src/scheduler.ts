import * as cron from "node-cron";
import { ScraperService } from "./index";
import { logger } from "./utils/logger";
import * as dotenv from "dotenv";
import * as path from "path";

// Load environment variables from root directory
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

// Cron schedule: run at minute 0 every 12 hours by default (midnight & noon UTC)
// Allow override via env for flexibility in different deployments
const CRON_SCHEDULE = process.env.SCRAPE_CRON_SCHEDULE || "0 */12 * * *";

async function runScheduledScrape(): Promise<void> {
  /*
   * A fresh instance each run avoids state-bleed across iterations at the small
   * cost of one DB connection handshake – perfectly acceptable for a 12h job.
   */
  const service = new ScraperService();

  try {
    logger.info("Running scheduled scrape");
    await service.scrapeAndSave();
    logger.info("Scheduled scrape completed successfully");
  } catch (error: unknown) {
    logger.error("Scheduled scrape failed", { error });
  } finally {
    await service.close();
  }
}

function startScheduler(): void {
  // Run immediately on startup to avoid waiting 12h for first dataset in new env
  logger.info("Running initial scrape on startup");
  runScheduledScrape().catch((e) =>
    logger.error("Initial scrape failed", { e })
  );

  logger.info(`Scheduling scrapes with cron: ${CRON_SCHEDULE}`);
  const task = cron.schedule(CRON_SCHEDULE, runScheduledScrape, {
    scheduled: true,
    timezone: "UTC", // Containers should be timezone-agnostic
  });

  // Graceful shutdown in containerised/K8s environments (SIGTERM is common)
  const shutdown = () => {
    logger.info("Scheduler shutting down...");
    task.stop();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  logger.info("Bank data scraper scheduler started");
}

startScheduler();
