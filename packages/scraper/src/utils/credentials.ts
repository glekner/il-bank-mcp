import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import {
  ScraperCredentials,
  MultiServiceCredentials,
  ServiceType,
  LeumiCredentials,
  VisaCalCredentials,
  MaxCredentials,
} from "../types";
import { logger } from "./logger";

// Load environment variables
dotenv.config();

/**
 * Loads credentials for all configured services
 * @returns MultiServiceCredentials object
 */
export function loadAllCredentials(): MultiServiceCredentials {
  logger.info("Loading credentials for all services");

  const credentials: MultiServiceCredentials = {};

  // Load Bank Leumi credentials
  const leumiCreds = loadServiceCredentials("leumi");
  if (leumiCreds) {
    credentials.leumi = leumiCreds as LeumiCredentials;
  }

  // Load Visa Cal credentials
  const visaCalCreds = loadServiceCredentials("visaCal");
  if (visaCalCreds) {
    credentials.visaCal = visaCalCreds as VisaCalCredentials;
  }

  // Load Max credentials
  const maxCreds = loadServiceCredentials("max");
  if (maxCreds) {
    credentials.max = maxCreds as MaxCredentials;
  }

  if (Object.keys(credentials).length === 0) {
    logger.error("No credentials found for any service");
    throw new Error(
      "No credentials found. Please configure at least one service."
    );
  }

  logger.info(
    `Loaded credentials for ${Object.keys(credentials).length} services`
  );
  return credentials;
}

/**
 * Loads credentials for a specific service
 * @param service The service to load credentials for
 * @returns Credentials object or null if not found
 */
export function loadServiceCredentials(
  service: ServiceType
): ScraperCredentials | null {
  logger.info(`Loading credentials for ${service}`);

  // Environment variable mapping
  const envMapping = {
    leumi: {
      username: "BANK_LEUMI_USERNAME",
      password: "BANK_LEUMI_PASSWORD",
    },
    visaCal: {
      username: "VISA_CAL_USERNAME",
      password: "VISA_CAL_PASSWORD",
    },
    max: {
      username: "MAX_USERNAME",
      password: "MAX_PASSWORD",
    },
  };

  // Try to load from environment variables first
  const envKeys = envMapping[service];
  const username = process.env[envKeys.username];
  const password = process.env[envKeys.password];

  if (username && password) {
    logger.info(`Using ${service} credentials from environment variables`);
    return { username, password };
  }

  // If not in environment variables, try loading from config file
  const configPath = path.resolve(process.cwd(), "config.json");

  if (fs.existsSync(configPath)) {
    try {
      const config = JSON.parse(fs.readFileSync(configPath, "utf8"));

      if (
        config[service] &&
        config[service].username &&
        config[service].password
      ) {
        logger.info(`Using ${service} credentials from config file`);
        return {
          username: config[service].username,
          password: config[service].password,
        };
      }
    } catch (error) {
      logger.error(`Error reading config file for ${service}`, { error });
    }
  }

  logger.warn(`No credentials found for ${service}`);
  return null;
}

/**
 * Loads Bank Leumi credentials from environment variables or config file
 * @returns ScraperCredentials object
 * @deprecated Use loadServiceCredentials('leumi') instead
 */
export function loadCredentials(): ScraperCredentials {
  const creds = loadServiceCredentials("leumi");
  if (!creds) {
    throw new Error(
      "Bank Leumi credentials not found. Please set BANK_LEUMI_USERNAME and BANK_LEUMI_PASSWORD " +
        "environment variables or create a config.json file with leumi credentials."
    );
  }
  return creds;
}

/**
 * Saves credentials to a config file
 * @param credentials The credentials to save
 * @param service The service to save credentials for (defaults to 'leumi' for backward compatibility)
 */
export function saveCredentials(
  credentials: ScraperCredentials,
  service: ServiceType = "leumi"
): void {
  const configPath = path.resolve(process.cwd(), "config.json");

  // Read existing config if it exists
  let config: any = {};
  if (fs.existsSync(configPath)) {
    try {
      config = JSON.parse(fs.readFileSync(configPath, "utf8"));
    } catch (error) {
      logger.warn("Error reading existing config file, creating new one", {
        error,
      });
    }
  }

  // Update with new credentials
  config[service] = {
    username: credentials.username,
    password: credentials.password,
  };

  // Write back to file
  try {
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), "utf8");
    logger.info(`Credentials saved to config file for ${service}`);
  } catch (error) {
    logger.error(`Error saving credentials to config file for ${service}`, {
      error,
    });
    throw new Error(
      "Failed to save credentials: " +
        (error instanceof Error ? error.message : String(error))
    );
  }
}
