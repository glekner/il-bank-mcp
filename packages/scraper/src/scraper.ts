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
 * Scrapes financial data from all configured services
 * @returns Promise resolving to the combined scraped data
 */
export async function scrapeAllBankData(): Promise<ScrapedAccountData> {
  try {
    logger.info("Starting multi-service scraping process");
    const credentials = loadAllCredentials();

    const allAccounts: any[] = [];
    const allTransactions: any[] = [];
    const allRawData: any[] = [];

    // Get list of services to scrape from credentials
    const services = Object.keys(credentials) as ServiceType[];
    logger.info(
      `Found credentials for ${services.length} services: ${services.join(", ")}`
    );

    // Scrape each service
    for (const service of services) {
      try {
        logger.info(`Scraping ${service}...`);
        const scraper = createScraperInstance(service, credentials);

        if (!scraper) {
          logger.warn(`No scraper available for ${service}`);
          continue;
        }

        const result = await scraper.scrape();

        // Aggregate results
        allAccounts.push(...result.accounts);
        allTransactions.push(...result.transactions);
        allRawData.push({ service, data: result.rawData });

        logger.info(
          `Successfully scraped ${service}: ${result.accounts.length} accounts, ${result.transactions.length} transactions`
        );
      } catch (error) {
        logger.error(`Failed to scrape ${service}`, { error });
        // Continue with other services even if one fails
      }
    }

    if (allAccounts.length === 0) {
      throw new Error("No accounts found from any service");
    }

    logger.info(
      `Scraping completed: ${allAccounts.length} total accounts, ${allTransactions.length} total transactions`
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
