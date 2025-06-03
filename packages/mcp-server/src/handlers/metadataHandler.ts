import { BaseHandler } from './base.js';

interface DatabaseMetadata {
  transactions: {
    earliestDate?: string;
    latestDate?: string;
    totalCount: number;
    dateRangeCoverage?: {
      days: number;
      months: number;
    };
  };
  accounts: {
    totalCount: number;
    byType: Record<string, number>;
    ignored: string[];
  };
  merchants: {
    uniqueCount: number;
  };
  categories: {
    uniqueCount: number;
  };
  configuration: {
    scrapeIntervalHours?: string;
    scrapeDepthDays?: number;
    ignoredAccountIds: string[];
    databasePath?: string;
    refreshThresholdHours?: number;
  };
  lastScrape: {
    timestamp?: string;
    status?: string;
    duration?: number;
    transactionsCount?: number;
    accountsCount?: number;
    error?: string;
  };
  system: {
    databaseSizeMB?: number;
    nodeVersion: string;
    timezone: string;
    uptime: number;
  };
}

export class MetadataHandler extends BaseHandler {
  async getMetadata() {
    try {
      // Get database statistics
      const dbStats = await this.scraperService.getDatabaseStatistics();

      // Get configuration from environment
      const config = {
        scrapeIntervalHours: process.env.SCRAPE_EVERY_HOURS || 'Not set',
        scrapeDepthDays: process.env.SCRAPE_DEPTH_DAYS
          ? parseInt(process.env.SCRAPE_DEPTH_DAYS)
          : undefined,
        ignoredAccountIds: (process.env.IGNORED_ACCOUNT_IDS || '')
          .split(',')
          .map(id => id.trim())
          .filter(id => id.length > 0),
        databasePath:
          process.env.DATABASE_PATH || 'Default: ./data/bank-data.db',
        refreshThresholdHours: process.env.REFRESH_THRESHOLD_HOURS
          ? parseInt(process.env.REFRESH_THRESHOLD_HOURS)
          : 24,
      };

      // Get last scrape info
      const lastScrapeInfo = this.scraperService.getLastScrapeInfo();

      const metadata: DatabaseMetadata = {
        transactions: {
          earliestDate: dbStats.earliestTransactionDate?.toISOString(),
          latestDate: dbStats.latestTransactionDate?.toISOString(),
          totalCount: dbStats.totalTransactions,
          dateRangeCoverage:
            dbStats.earliestTransactionDate && dbStats.latestTransactionDate
              ? {
                  days: this.getDaysBetween(
                    dbStats.earliestTransactionDate,
                    dbStats.latestTransactionDate
                  ),
                  months: Math.ceil(
                    this.getDaysBetween(
                      dbStats.earliestTransactionDate,
                      dbStats.latestTransactionDate
                    ) / 30
                  ),
                }
              : undefined,
        },
        accounts: {
          totalCount: dbStats.totalAccounts,
          byType: dbStats.accountsByType || {},
          ignored: config.ignoredAccountIds,
        },
        merchants: {
          uniqueCount: dbStats.uniqueMerchants || 0,
        },
        categories: {
          uniqueCount: dbStats.uniqueCategories || 0,
        },
        configuration: config,
        lastScrape: {
          timestamp: lastScrapeInfo?.lastScrapeAt?.toISOString(),
          status: lastScrapeInfo?.status,
          duration: lastScrapeInfo?.duration,
          transactionsCount: lastScrapeInfo?.transactionsCount,
          accountsCount: lastScrapeInfo?.accountsCount,
          error: lastScrapeInfo?.error,
        },
        system: {
          databaseSizeMB: dbStats.databaseSizeMB,
          nodeVersion: process.version,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          uptime: process.uptime(),
        },
      };

      const response = {
        success: true,
        metadata,
        message: this.generateSummaryMessage(metadata),
      };

      return this.formatResponse(response);
    } catch (error) {
      return this.formatError(error);
    }
  }

  private generateSummaryMessage(metadata: DatabaseMetadata): string {
    const parts = [];

    // Transaction coverage
    if (
      metadata.transactions.earliestDate &&
      metadata.transactions.latestDate
    ) {
      parts.push(
        `📊 Transaction History: ${metadata.transactions.dateRangeCoverage?.months} months (${metadata.transactions.totalCount.toLocaleString()} transactions)`
      );
      parts.push(
        `📅 Date Range: ${new Date(metadata.transactions.earliestDate).toLocaleDateString()} to ${new Date(metadata.transactions.latestDate).toLocaleDateString()}`
      );
    }

    // Account info
    parts.push(
      `💳 Accounts: ${metadata.accounts.totalCount} active${metadata.accounts.ignored.length > 0 ? `, ${metadata.accounts.ignored.length} ignored` : ''}`
    );

    // Configuration
    parts.push(
      `⚙️ Configuration: Scraping ${metadata.configuration.scrapeDepthDays ? `last ${metadata.configuration.scrapeDepthDays} days` : 'all available data'}`
    );

    // Last scrape
    if (metadata.lastScrape.timestamp) {
      const lastScrapeDate = new Date(metadata.lastScrape.timestamp);
      const hoursAgo = Math.round(
        (Date.now() - lastScrapeDate.getTime()) / (1000 * 60 * 60)
      );
      parts.push(
        `🔄 Last Update: ${hoursAgo} hours ago (${metadata.lastScrape.status})`
      );
    }

    return parts.join('\n');
  }
}
