import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { ScraperCredentials, MultiProviderCredentials } from '../types';
import { logger } from './logger';
import {
  detectConfiguredProviders,
  getProviderCredentials,
  ProviderKey,
} from './providers';

// Load environment variables
dotenv.config();

/**
 * Loads credentials for all configured providers dynamically
 * @returns MultiProviderCredentials object
 */
export function loadAllCredentials(): MultiProviderCredentials {
  logger.info('Loading credentials for all providers');

  const credentials: MultiProviderCredentials = {};

  // Detect which providers have credentials configured
  const configuredProviders = detectConfiguredProviders();

  if (configuredProviders.length === 0) {
    logger.error('No credentials found for any provider');
    throw new Error(
      'No credentials found. Please configure at least one provider.'
    );
  }

  // Load credentials for each configured provider
  for (const provider of configuredProviders) {
    const providerCreds = getProviderCredentials(provider);
    if (providerCreds) {
      credentials[provider] = providerCreds as ScraperCredentials;
    }
  }

  logger.info(
    `Loaded credentials for ${Object.keys(credentials).length} providers: ${configuredProviders.join(', ')}`
  );
  return credentials;
}

/**
 * Loads credentials for a specific provider
 * @param provider The provider to load credentials for
 * @returns Credentials object or null if not found
 */
export function loadProviderCredentials(
  provider: ProviderKey
): ScraperCredentials | null {
  logger.info(`Loading credentials for ${provider}`);

  // Try to load from environment variables first
  const providerCreds = getProviderCredentials(provider as ProviderKey);
  if (providerCreds) {
    logger.info(`Using ${provider} credentials from environment variables`);
    return providerCreds as ScraperCredentials;
  }

  // If not in environment variables, try loading from config file
  const configPath = path.resolve(process.cwd(), 'config.json');

  if (fs.existsSync(configPath)) {
    try {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

      if (config[provider]) {
        logger.info(`Using ${provider} credentials from config file`);
        // Return the entire credential object from config
        return config[provider];
      }
    } catch (error) {
      logger.error(`Error reading config file for ${provider}`, { error });
    }
  }

  logger.warn(`No credentials found for ${provider}`);
  return null;
}

/**
 * Loads Bank Leumi credentials from environment variables or config file
 * @returns ScraperCredentials object
 * @deprecated Use loadProviderCredentials('leumi') instead
 */
export function loadCredentials(): ScraperCredentials {
  const creds = loadProviderCredentials('leumi');
  if (!creds) {
    throw new Error(
      'Bank Leumi credentials not found. Please set LEUMI_USERNAME and LEUMI_PASSWORD ' +
        'environment variables or create a config.json file with leumi credentials.'
    );
  }
  return creds;
}

/**
 * Saves credentials to a config file
 * @param credentials The credentials to save
 * @param provider The provider to save credentials for (defaults to 'leumi' for backward compatibility)
 */
export function saveCredentials(
  credentials: ScraperCredentials,
  provider: ProviderKey = 'leumi'
): void {
  const configPath = path.resolve(process.cwd(), 'config.json');

  // Read existing config if it exists
  let config: Record<string, unknown> = {};
  if (fs.existsSync(configPath)) {
    try {
      config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    } catch (error) {
      logger.warn('Error reading existing config file, creating new one', {
        error,
      });
    }
  }

  // Update with new credentials
  config[provider] = credentials;

  // Write back to file
  try {
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
    logger.info(`Credentials saved to config file for ${provider}`);
  } catch (error) {
    logger.error(`Error saving credentials to config file for ${provider}`, {
      error,
    });
    throw new Error(
      'Failed to save credentials: ' +
        (error instanceof Error ? error.message : String(error))
    );
  }
}
