import { createComponentLogger } from '../utils/logger';

const logger = createComponentLogger('CacheService');

interface CacheItem<T> {
  data: T;
  expires: number;
}

export class CacheService {
  private cache = new Map<string, CacheItem<unknown>>();
  private cleanupInterval: NodeJS.Timeout;

  constructor(private defaultTTL: number = 5 * 60 * 1000) {
    // 5 minutes default
    // Cleanup expired items every minute
    this.cleanupInterval = setInterval(() => this.cleanup(), 60 * 1000);
    logger.info('Cache service initialized', { defaultTTL });
  }

  /**
   * Get item from cache
   */
  get<T>(key: string): T | null {
    const item = this.cache.get(key);

    if (!item) {
      logger.debug('Cache miss', { key });
      return null;
    }

    if (item.expires < Date.now()) {
      logger.debug('Cache expired', { key });
      this.cache.delete(key);
      return null;
    }

    logger.debug('Cache hit', { key });
    return item.data as T;
  }

  /**
   * Set item in cache with optional TTL
   */
  set<T>(key: string, data: T, ttl?: number): void {
    const expires = Date.now() + (ttl || this.defaultTTL);
    this.cache.set(key, { data, expires });
    logger.debug('Cache set', { key, ttl: ttl || this.defaultTTL });
  }

  /**
   * Delete item from cache
   */
  delete(key: string): boolean {
    const result = this.cache.delete(key);
    if (result) {
      logger.debug('Cache item deleted', { key });
    }
    return result;
  }

  /**
   * Clear entire cache
   */
  clear(): void {
    const size = this.cache.size;
    this.cache.clear();
    logger.info('Cache cleared', { itemsCleared: size });
  }

  /**
   * Get cache statistics
   */
  getStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }

  /**
   * Cleanup expired items
   */
  private cleanup(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, item] of this.cache.entries()) {
      if (item.expires < now) {
        this.cache.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      logger.debug('Cache cleanup completed', { itemsCleaned: cleaned });
    }
  }

  /**
   * Destroy cache service
   */
  destroy(): void {
    clearInterval(this.cleanupInterval);
    this.clear();
    logger.info('Cache service destroyed');
  }
}

// Singleton instance
let cacheInstance: CacheService | null = null;

export function getCacheService(): CacheService {
  if (!cacheInstance) {
    cacheInstance = new CacheService();
  }
  return cacheInstance;
}

// Cache key generators
export const CacheKeys = {
  accounts: () => 'accounts:all',
  transactions: (startDate?: Date, endDate?: Date, accountId?: string) => {
    const parts = ['transactions'];
    if (startDate) parts.push(`start:${startDate.toISOString()}`);
    if (endDate) parts.push(`end:${endDate.toISOString()}`);
    if (accountId) parts.push(`account:${accountId}`);
    return parts.join(':');
  },
  financialSummary: (startDate?: Date, endDate?: Date) => {
    const parts = ['summary'];
    if (startDate) parts.push(`start:${startDate.toISOString()}`);
    if (endDate) parts.push(`end:${endDate.toISOString()}`);
    return parts.join(':');
  },
  balanceHistory: (accountId: string, days: number) =>
    `balance:${accountId}:days:${days}`,
  lastScrape: () => 'metadata:lastScrape',
};
