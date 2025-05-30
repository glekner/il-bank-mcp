import { ScrapedAccountData, ServiceType } from "../types";

export interface BaseScraper {
  type: ServiceType;
  scrape(): Promise<ScrapedAccountData>;
}
