import { ScraperService } from './index';
import { logger } from './utils/logger';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { setInterval } from 'node:timers';

// Load environment variables from root directory
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

// Interval (in hours) between two scrapes. Defaults to 12h but can be overridden.
const SCRAPE_EVERY_HOURS = Number(process.env.SCRAPE_EVERY_HOURS ?? '12');
const SCRAPE_INTERVAL_MS = SCRAPE_EVERY_HOURS * 60 * 60 * 1000;

async function runScheduledScrape(): Promise<void> {
  /*
   * A fresh instance each run avoids state-bleed across iterations at the small
   * cost of one DB connection handshake – perfectly acceptable for a 12h job.
   */
  const service = new ScraperService();

  try {
    logger.info('Running scheduled scrape');
    await service.scrapeAndSave();
    logger.info('Scheduled scrape completed successfully');
  } catch (error: unknown) {
    logger.error('Scheduled scrape failed', { error });
  } finally {
    await service.close();
  }
}

function startScheduler(): void {
  // Run immediately on startup so new environments get data straight away
  logger.info('Running initial scrape on startup');
  runScheduledScrape().catch(e => logger.error('Initial scrape failed', { e }));

  logger.info(`Scheduling scrapes to run every ${SCRAPE_EVERY_HOURS} hour(s)`);

  const interval = setInterval(() => {
    runScheduledScrape().catch(e =>
      logger.error('Scheduled scrape failed', { e })
    );
  }, SCRAPE_INTERVAL_MS);

  // Graceful shutdown in containerised/K8s environments (SIGTERM is common)
  const shutdown = () => {
    logger.info('Scheduler shutting down...');
    clearInterval(interval);
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  logger.info('Bank data scraper scheduler started');
}

startScheduler();
