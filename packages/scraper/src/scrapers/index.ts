export { BaseScraper } from './base';
export { GenericScraper } from './generic-scraper';

import { MultiProviderCredentials } from '../types';
import { logger } from '../utils/logger';
import { getCompanyType, ProviderKey } from '../utils/providers';
import { BaseScraper } from './base';
import { GenericScraper } from './generic-scraper';

export function createScraperInstance(
  service: ProviderKey,
  credentials: MultiProviderCredentials
): BaseScraper | null {
  const serviceCredentials = credentials[service];

  if (!serviceCredentials) {
    logger.warn(`No credentials found for service: ${service}`);
    return null;
  }

  try {
    const companyType = getCompanyType(service as ProviderKey);
    return new GenericScraper(service, companyType, serviceCredentials);
  } catch (error) {
    logger.error(`Failed to create scraper for ${service}`, { error });
    return null;
  }
}
