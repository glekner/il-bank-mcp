import {
  ScrapedAccountData,
  ServiceType,
  MultiServiceCredentials,
} from "./types";
import {
  loadAllCredentials,
  loadServiceCredentials,
} from "./utils/credentials";
import { logger } from "./utils/logger";
import { createScraperInstance } from "./scrapers";

/**
 * Scrapes financial data from all configured services in parallel
 * @returns Promise resolving to the combined scraped data
 */
export async function scrapeAllBankData(): Promise<ScrapedAccountData> {
  try {
    logger.info("Starting multi-service scraping process");
    const credentials = loadAllCredentials();

    // Get list of services to scrape from credentials
    const services = Object.keys(credentials) as ServiceType[];
    logger.info(
      `Found credentials for ${services.length} services: ${services.join(", ")}`
    );

    // Create scraping promises for all services
    const scrapePromises = services.map(async (service) => {
      try {
        logger.info(`Starting async scrape for ${service}...`);
        const scraper = createScraperInstance(service, credentials);

        if (!scraper) {
          logger.warn(`No scraper available for ${service}`);
          return null;
        }

        const startTime = Date.now();
        const result = await scraper.scrape();
        const duration = Date.now() - startTime;

        logger.info(
          `Successfully scraped ${service} in ${duration}ms: ${result.accounts.length} accounts, ${result.transactions.length} transactions`
        );

        return { service, result };
      } catch (error) {
        logger.error(`Failed to scrape ${service}`, { error });
        return { service, error };
      }
    });

    // Execute all scrapes in parallel with Promise.allSettled
    const scrapeResults = await Promise.allSettled(scrapePromises);

    const allAccounts: any[] = [];
    const allTransactions: any[] = [];
    const allRawData: any[] = [];
    const errors: { service: string; error: any }[] = [];

    // Process results
    scrapeResults.forEach((result, index) => {
      if (result.status === "fulfilled" && result.value) {
        if ("result" in result.value && result.value.result) {
          const { service, result: scrapedData } = result.value;
          allAccounts.push(...scrapedData.accounts);
          allTransactions.push(...scrapedData.transactions);
          allRawData.push({ service, data: scrapedData.rawData });
        } else if ("error" in result.value) {
          errors.push(result.value as { service: string; error: any });
        }
      } else if (result.status === "rejected") {
        logger.error(`Promise rejected for service ${services[index]}`, {
          reason: result.reason,
        });
        errors.push({ service: services[index], error: result.reason });
      }
    });

    // Log errors summary
    if (errors.length > 0) {
      logger.warn(`Scraping completed with ${errors.length} failures`, {
        failedServices: errors.map((e) => e.service),
      });
    }

    if (allAccounts.length === 0) {
      throw new Error("No accounts found from any service");
    }

    logger.info(
      `Parallel scraping completed: ${allAccounts.length} total accounts, ${allTransactions.length} total transactions`
    );

    return {
      accounts: allAccounts,
      transactions: allTransactions,
      rawData: allRawData,
      scrapedAt: new Date(),
    };
  } catch (error) {
    logger.error("Error during multi-service scraping process", { error });
    throw new Error(
      `Multi-service scraping error: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Scrapes financial data from a specific service
 * @param service The service to scrape
 * @returns Promise resolving to the scraped data
 */
export async function scrapeSingleService(
  service: ServiceType
): Promise<ScrapedAccountData> {
  try {
    logger.info(`Starting single service scraping for ${service}`);

    const credentials = loadServiceCredentials(service);
    if (!credentials) {
      throw new Error(`No credentials found for ${service}`);
    }

    const allCredentials: MultiServiceCredentials = {
      [service]: credentials,
    } as MultiServiceCredentials;

    const scraper = createScraperInstance(service, allCredentials);
    if (!scraper) {
      throw new Error(`No scraper implementation found for ${service}`);
    }

    const result = await scraper.scrape();
    logger.info(
      `Successfully scraped ${service}: ${result.accounts.length} accounts, ${result.transactions.length} transactions`
    );

    return result;
  } catch (error) {
    logger.error(`Error during ${service} scraping process`, { error });
    throw new Error(
      `${service} scraping error: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
