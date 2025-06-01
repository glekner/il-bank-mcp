// Export main service
export { ScraperService } from './services/scraperService';

// Export types
export * from './types';

// Export analyzers
export {
  analyzeMerchantSpending,
  getSpendingByMerchant,
  extractMerchantName,
  findUnusualMerchantCharges,
} from './analyzers/merchantAnalyzer';

// Export utilities if needed by other packages
export { logger } from './utils/logger';
export {
  ProviderKey,
  getAllProviders,
  getProviderDisplayName,
  PROVIDER_CONFIG,
} from './utils/providers';
export type { ProviderKey as ProviderKeyType } from './utils/providers';
