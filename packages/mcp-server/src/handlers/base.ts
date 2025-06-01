import { ScraperService } from "@bank-assistant/scraper";

export abstract class BaseHandler {
  constructor(protected scraperService: ScraperService) {}

  protected parseDate(dateString?: string): Date | undefined {
    return dateString ? new Date(dateString) : undefined;
  }

  protected async addScrapeStatusIfRunning<T extends { message?: string }>(
    response: T
  ): Promise<T> {
    const scrapeStatus = this.scraperService.getScrapeStatus();

    if (
      scrapeStatus.isAnyScrapeRunning &&
      scrapeStatus.activeScrapes?.length > 0
    ) {
      const runningServices = scrapeStatus.activeScrapes
        .map((s) => s.service)
        .join(", ");

      const warningMessage = `Note: Data scraping is currently in progress for: ${runningServices}. The data shown may be stale.`;

      if (response.message) {
        response.message = `${response.message}\n\n⚠️ ${warningMessage}`;
      } else {
        response.message = `⚠️ ${warningMessage}`;
      }
    }
    return response;
  }

  protected formatResponse<T>(data: T): {
    content: Array<{ type: string; text: string }>;
  } {
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(data, null, 2),
        },
      ],
    };
  }

  protected formatError(error: unknown): {
    content: Array<{ type: string; text: string }>;
  } {
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              success: false,
              error: error instanceof Error ? error.message : "Unknown error",
            },
            null,
            2
          ),
        },
      ],
    };
  }
}
