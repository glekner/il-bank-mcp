export { BaseScraper } from "./base";
export { LeumiScraper } from "./leumi";
export { VisaCalScraper } from "./visaCal";
export { MaxScraper } from "./max";

import { ServiceType, MultiServiceCredentials } from "../types";
import { LeumiScraper } from "./leumi";
import { VisaCalScraper } from "./visaCal";
import { MaxScraper } from "./max";
import { BaseScraper } from "./base";

export function createScraperInstance(
  service: ServiceType,
  credentials: MultiServiceCredentials
): BaseScraper | null {
  switch (service) {
    case "leumi":
      return credentials.leumi ? new LeumiScraper(credentials.leumi) : null;
    case "visaCal":
      return credentials.visaCal
        ? new VisaCalScraper(credentials.visaCal)
        : null;
    case "max":
      return credentials.max ? new MaxScraper(credentials.max) : null;
    default:
      return null;
  }
}
