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

// Maximum time allowed for a scrape operation (in minutes)
const SCRAPE_TIMEOUT_MINUTES = 30;
const SCRAPE_TIMEOUT_MS = SCRAPE_TIMEOUT_MINUTES * 60 * 1000;

async function runScheduledScrapeWithTimeout(): Promise<void> {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject(
        new Error(
          `Scrape operation timed out after ${SCRAPE_TIMEOUT_MINUTES} minutes`
        )
      );
    }, SCRAPE_TIMEOUT_MS);
  });

  const scrapePromise = runScheduledScrape();

  try {
    await Promise.race([scrapePromise, timeoutPromise]);
  } catch (error) {
    if (error instanceof Error && error.message.includes('timed out')) {
      logger.error('Scheduled scrape timed out', {
        error: error.message,
        timeoutMinutes: SCRAPE_TIMEOUT_MINUTES,
      });
    } else {
      throw error;
    }
  }
}

async function runScheduledScrape(): Promise<void> {
  /*
   * A fresh instance each run avoids state-bleed across iterations at the small
   * cost of one DB connection handshake – perfectly acceptable for a 12h job.
   */
  const service = new ScraperService();

  try {
    logger.info('Running scheduled scrape', {
      scrapeEveryHours: SCRAPE_EVERY_HOURS,
      timeoutMinutes: SCRAPE_TIMEOUT_MINUTES,
    });
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
  runScheduledScrapeWithTimeout().catch(e =>
    logger.error('Initial scrape failed', { e })
  );

  logger.info(`Scheduling scrapes to run every ${SCRAPE_EVERY_HOURS} hour(s)`);

  const interval = setInterval(() => {
    logger.info('Starting scheduled scrape interval');
    runScheduledScrapeWithTimeout().catch(e =>
      logger.error('Scheduled scrape interval failed', { e })
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

  // Also handle uncaught exceptions to prevent the scheduler from crashing
  process.on('uncaughtException', error => {
    logger.error('Uncaught exception in scheduler', {
      error: error.message,
      stack: error.stack,
    });
  });

  process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled rejection in scheduler', { reason, promise });
  });

  logger.info('Bank data scraper scheduler started', {
    scrapeEveryHours: SCRAPE_EVERY_HOURS,
    scrapeTimeoutMinutes: SCRAPE_TIMEOUT_MINUTES,
  });
}

startScheduler();
