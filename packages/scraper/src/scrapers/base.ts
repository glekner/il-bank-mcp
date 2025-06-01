import { ScrapedAccountData } from '../types';
import type { ProviderKey } from '../utils/providers';

export interface BaseScraper {
  type: ProviderKey;
  scrape(): Promise<ScrapedAccountData>;
}
