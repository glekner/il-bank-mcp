import { ServiceType } from "../types";
import { createComponentLogger } from "../utils/logger";

const logger = createComponentLogger("ScrapeStatusManager");

export interface ScrapeStatus {
  service: ServiceType | "all";
  startedAt: Date;
  status: "running" | "completed" | "failed";
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

  startScrape(service: ServiceType | "all"): void {
    const key = service;
    this.scrapeStatuses.set(key, {
      service,
      startedAt: new Date(),
      status: "running",
    });
    logger.info(`Started tracking scrape for ${service}`);
  }

  completeScrape(service: ServiceType | "all", error?: Error): void {
    const key = service;
    const status = this.scrapeStatuses.get(key);

    if (status) {
      status.status = error ? "failed" : "completed";
      status.completedAt = new Date();
      status.error = error?.message;
      logger.info(`Completed tracking scrape for ${service}`, {
        status: status.status,
        duration: status.completedAt.getTime() - status.startedAt.getTime(),
      });
    }
  }

  isAnyScrapeRunning(): boolean {
    return Array.from(this.scrapeStatuses.values()).some(
      (status) => status.status === "running"
    );
  }

  isServiceScraping(service: ServiceType | "all"): boolean {
    const status = this.scrapeStatuses.get(service);
    return status?.status === "running" || false;
  }

  getRunningScrapes(): ScrapeStatus[] {
    return Array.from(this.scrapeStatuses.values()).filter(
      (status) => status.status === "running"
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
        status.status !== "running" &&
        status.completedAt &&
        status.completedAt < cutoffTime
      ) {
        this.scrapeStatuses.delete(key);
      }
    }
  }
}
