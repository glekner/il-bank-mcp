import { ScraperService } from "@bank-assistant/scraper";

export abstract class BaseHandler {
  constructor(protected scraperService: ScraperService) {}

  protected parseDate(dateString?: string): Date | undefined {
    return dateString ? new Date(dateString) : undefined;
  }

  protected async addScrapeStatusIfRunning<T extends { message?: string }>(
    response: T
  ): Promise<T> {
    const isRunning = this.scraperService.isScrapeRunning();
    if (isRunning && response.message) {
      response.message = `${response.message} (Note: A scrape is currently in progress...)`;
    } else if (isRunning) {
      response.message = "A scrape is currently in progress...";
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
