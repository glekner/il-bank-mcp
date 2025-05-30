import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { ScraperCredentials } from '../types';
import { logger } from './logger';

// Load environment variables
dotenv.config();

/**
 * Loads Bank Leumi credentials from environment variables or config file
 * @returns ScraperCredentials object
 */
export function loadCredentials(): ScraperCredentials {
  logger.info('Loading credentials');
  
  // Try to load from environment variables first
  const username = process.env.BANK_LEUMI_USERNAME;
  const password = process.env.BANK_LEUMI_PASSWORD;
  
  if (username && password) {
    logger.info('Using credentials from environment variables');
    return { username, password };
  }
  
  // If not in environment variables, try loading from config file
  const configPath = path.resolve(process.cwd(), 'config.json');
  
  if (fs.existsSync(configPath)) {
    try {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      
      if (config.bankLeumi && config.bankLeumi.username && config.bankLeumi.password) {
        logger.info('Using credentials from config file');
        return {
          username: config.bankLeumi.username,
          password: config.bankLeumi.password
        };
      }
    } catch (error) {
      logger.error('Error reading config file', { error });
    }
  }
  
  // If all else fails, prompt for credentials or throw error
  logger.error('No credentials found in environment variables or config file');
  throw new Error(
    'Bank Leumi credentials not found. Please set BANK_LEUMI_USERNAME and BANK_LEUMI_PASSWORD ' +
    'environment variables or create a config.json file with bankLeumi credentials.'
  );
}

/**
 * Saves credentials to a config file
 * @param credentials The credentials to save
 */
export function saveCredentials(credentials: ScraperCredentials): void {
  const configPath = path.resolve(process.cwd(), 'config.json');
  
  // Read existing config if it exists
  let config: any = {};
  if (fs.existsSync(configPath)) {
    try {
      config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    } catch (error) {
      logger.warn('Error reading existing config file, creating new one', { error });
    }
  }
  
  // Update with new credentials
  config.bankLeumi = {
    username: credentials.username,
    password: credentials.password
  };
  
  // Write back to file
  try {
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
    logger.info('Credentials saved to config file');
  } catch (error) {
    logger.error('Error saving credentials to config file', { error });
    throw new Error('Failed to save credentials: ' + (error instanceof Error ? error.message : String(error)));
  }
}