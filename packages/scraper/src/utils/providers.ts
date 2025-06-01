import { CompanyTypes } from 'israeli-bank-scrapers';
import { logger } from './logger';

/**
 * Mapping of provider keys to their CompanyTypes enum values and credential requirements
 */
export const PROVIDER_CONFIG = {
  hapoalim: {
    companyType: CompanyTypes.hapoalim,
    displayName: 'Bank Hapoalim',
    credentialFields: ['userCode', 'password'],
    envPrefix: 'HAPOALIM',
  },
  leumi: {
    companyType: CompanyTypes.leumi,
    displayName: 'Bank Leumi',
    credentialFields: ['username', 'password'],
    envPrefix: 'LEUMI',
  },
  discount: {
    companyType: CompanyTypes.discount,
    displayName: 'Discount Bank',
    credentialFields: ['id', 'password', 'num'],
    envPrefix: 'DISCOUNT',
  },
  mercantile: {
    companyType: CompanyTypes.mercantile,
    displayName: 'Mercantile Bank',
    credentialFields: ['id', 'password', 'num'],
    envPrefix: 'MERCANTILE',
  },
  mizrahi: {
    companyType: CompanyTypes.mizrahi,
    displayName: 'Mizrahi Bank',
    credentialFields: ['username', 'password'],
    envPrefix: 'MIZRAHI',
  },
  otsarHahayal: {
    companyType: CompanyTypes.otsarHahayal,
    displayName: 'Bank Otsar Hahayal',
    credentialFields: ['username', 'password'],
    envPrefix: 'OTSAR_HAHAYAL',
  },
  visaCal: {
    companyType: CompanyTypes.visaCal,
    displayName: 'Visa Cal',
    credentialFields: ['username', 'password'],
    envPrefix: 'VISA_CAL',
  },
  max: {
    companyType: CompanyTypes.max,
    displayName: 'Max (Leumi Card)',
    credentialFields: ['username', 'password'],
    envPrefix: 'MAX',
  },
  isracard: {
    companyType: CompanyTypes.isracard,
    displayName: 'Isracard',
    credentialFields: ['id', 'card6Digits', 'password'],
    envPrefix: 'ISRACARD',
  },
  amex: {
    companyType: CompanyTypes.amex,
    displayName: 'American Express',
    credentialFields: ['username', 'card6Digits', 'password'],
    envPrefix: 'AMEX',
  },
  union: {
    companyType: CompanyTypes.union,
    displayName: 'Union Bank',
    credentialFields: ['username', 'password'],
    envPrefix: 'UNION',
  },
  beinleumi: {
    companyType: CompanyTypes.beinleumi,
    displayName: 'Beinleumi',
    credentialFields: ['username', 'password'],
    envPrefix: 'BEINLEUMI',
  },
  massad: {
    companyType: CompanyTypes.massad,
    displayName: 'Massad',
    credentialFields: ['username', 'password'],
    envPrefix: 'MASSAD',
  },
  yahav: {
    companyType: CompanyTypes.yahav,
    displayName: 'Yahav',
    credentialFields: ['username', 'password', 'nationalID'],
    envPrefix: 'YAHAV',
  },
  beyahadBishvilha: {
    companyType: CompanyTypes.beyahadBishvilha,
    displayName: 'Beyhad Bishvilha',
    credentialFields: ['id', 'password'],
    envPrefix: 'BEYAHAD',
  },
  oneZero: {
    companyType: CompanyTypes.oneZero,
    displayName: 'OneZero',
    credentialFields: ['username', 'password'],
    envPrefix: 'ONEZERO',
  },
  behatsdaa: {
    companyType: CompanyTypes.behatsdaa,
    displayName: 'Behatsdaa',
    credentialFields: ['username', 'password'],
    envPrefix: 'BEHATSDAA',
  },
  pagi: {
    companyType: CompanyTypes.pagi,
    displayName: 'Pagi',
    credentialFields: ['username', 'password'],
    envPrefix: 'PAGI',
  },
} as const satisfies Record<
  CompanyTypes,
  {
    companyType: CompanyTypes;
    displayName: string;
    credentialFields: string[];
    envPrefix: string;
  }
>;

export type ProviderKey = keyof typeof PROVIDER_CONFIG;

/**
 * Detects which providers have credentials configured in environment variables
 * @returns Array of provider keys that have credentials configured
 */
export function detectConfiguredProviders(): ProviderKey[] {
  const configuredProviders: ProviderKey[] = [];

  for (const [key, config] of Object.entries(PROVIDER_CONFIG)) {
    const providerKey = key as ProviderKey;
    const hasCredentials = checkProviderCredentials(providerKey);

    if (hasCredentials) {
      configuredProviders.push(providerKey);
      logger.info(`Detected configured provider: ${config.displayName}`);
    }
  }

  return configuredProviders;
}

/**
 * Checks if a provider has all required credentials configured
 * @param provider The provider key to check
 * @returns true if all required credentials are present
 */
function checkProviderCredentials(provider: ProviderKey): boolean {
  const config = PROVIDER_CONFIG[provider];

  // Check if all required credential fields are present in environment
  return config.credentialFields.every(field => {
    const envKey = `${config.envPrefix}_${field.toUpperCase()}`;
    return !!process.env[envKey];
  });
}

/**
 * Gets the credentials for a specific provider from environment variables
 * @param provider The provider key
 * @returns The credentials object or null if not found
 */
export function getProviderCredentials(
  provider: ProviderKey
): Record<string, string> | null {
  const config = PROVIDER_CONFIG[provider];
  const credentials: Record<string, string> = {};

  for (const field of config.credentialFields) {
    const envKey = `${config.envPrefix}_${field.toUpperCase()}`;
    const value = process.env[envKey];

    if (!value) {
      logger.warn(`Missing credential field ${field} for provider ${provider}`);
      return null;
    }

    credentials[field] = value;
  }

  return credentials;
}

/**
 * Gets the CompanyType enum value for a provider
 * @param provider The provider key
 * @returns The CompanyTypes enum value
 */
export function getCompanyType(provider: ProviderKey): CompanyTypes {
  return PROVIDER_CONFIG[provider].companyType;
}

/**
 * Gets the display name for a provider
 * @param provider The provider key
 * @returns The display name
 */
export function getProviderDisplayName(provider: ProviderKey): string {
  return PROVIDER_CONFIG[provider].displayName;
}

/**
 * Lists all available providers
 * @returns Array of all provider keys
 */
export function getAllProviders(): ProviderKey[] {
  return Object.keys(PROVIDER_CONFIG) as ProviderKey[];
}
