import { createComponentLogger } from '../utils/logger';
import type { ProviderKey } from '../utils/providers';

const logger = createComponentLogger('ScrapeStatusManager');

export interface ScrapeStatus {
  provider: ProviderKey | 'all';
  startedAt: Date;
  status: 'running' | 'completed' | 'failed';
  completedAt?: Date;
  error?: string;
}

export class ScrapeStatusManager {
  private static instance: ScrapeStatusManager;
  private scrapeStatuses: Map<string, ScrapeStatus> = new Map();

  private constructor() {}

  static getInstance(): ScrapeStatusManager {
    if (!ScrapeStatusManager.instance) {
      ScrapeStatusManager.instance = new ScrapeStatusManager();
    }
    return ScrapeStatusManager.instance;
  }

  startScrape(provider: ProviderKey | 'all'): void {
    const key = provider;
    this.scrapeStatuses.set(key, {
      provider,
      startedAt: new Date(),
      status: 'running',
    });
    logger.info(`Started tracking scrape for ${provider}`);
  }

  completeScrape(provider: ProviderKey | 'all', error?: Error): void {
    const key = provider;
    const status = this.scrapeStatuses.get(key);

    if (status) {
      status.status = error ? 'failed' : 'completed';
      status.completedAt = new Date();
      status.error = error?.message;
      logger.info(`Completed tracking scrape for ${provider}`, {
        status: status.status,
        duration: status.completedAt.getTime() - status.startedAt.getTime(),
      });
    }
  }

  isAnyScrapeRunning(): boolean {
    return Array.from(this.scrapeStatuses.values()).some(
      status => status.status === 'running'
    );
  }

  isProviderScraping(provider: ProviderKey | 'all'): boolean {
    const status = this.scrapeStatuses.get(provider);
    return status?.status === 'running' || false;
  }

  getRunningScrapes(): ScrapeStatus[] {
    return Array.from(this.scrapeStatuses.values()).filter(
      status => status.status === 'running'
    );
  }

  getAllStatuses(): ScrapeStatus[] {
    return Array.from(this.scrapeStatuses.values());
  }

  clearOldStatuses(hoursToKeep = 24): void {
    const cutoffTime = new Date();
    cutoffTime.setHours(cutoffTime.getHours() - hoursToKeep);

    for (const [key, status] of this.scrapeStatuses.entries()) {
      if (
        status.status !== 'running' &&
        status.completedAt &&
        status.completedAt < cutoffTime
      ) {
        this.scrapeStatuses.delete(key);
      }
    }
  }
}
