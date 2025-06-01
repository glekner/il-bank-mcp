import { PROVIDER_CONFIG } from '@bank-assistant/scraper';
import { Tool } from '@modelcontextprotocol/sdk/types.js';

export const TOOLS = [
  {
    name: 'get_transactions',
    description:
      'Get bank and credit card transactions for a specific time period from all configured services. When filtering by account, ALWAYS call get_accounts first to get the actual account IDs.',
    inputSchema: {
      type: 'object',
      properties: {
        startDate: {
          type: 'string',
          description: 'Start date in ISO format (YYYY-MM-DD)',
        },
        endDate: {
          type: 'string',
          description: 'End date in ISO format (YYYY-MM-DD)',
        },
        accountId: {
          type: 'string',
          description:
            "Optional account ID to filter by. Must be an actual account ID obtained from get_accounts (not a guessed value like 'visacal')",
        },
      },
    },
  },
  {
    name: 'get_financial_summary',
    description:
      'Get a comprehensive financial summary including trends, income, and expenses from all services',
    inputSchema: {
      type: 'object',
      properties: {
        startDate: {
          type: 'string',
          description: 'Start date in ISO format (YYYY-MM-DD)',
        },
        endDate: {
          type: 'string',
          description: 'End date in ISO format (YYYY-MM-DD)',
        },
      },
    },
  },
  {
    name: 'get_accounts',
    description: 'Get all bank accounts and credit cards with current balances',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'get_account_balance_history',
    description:
      'Get balance history for a specific account. ALWAYS call get_accounts first to get the actual account ID.',
    inputSchema: {
      type: 'object',
      properties: {
        accountId: {
          type: 'string',
          description:
            'Account ID obtained from get_accounts (not a guessed value)',
        },
        days: {
          type: 'number',
          description: 'Number of days to look back (default: 30)',
        },
      },
      required: ['accountId'],
    },
  },
  {
    name: 'refresh_all_data',
    description: 'Force a fresh scrape of all bank and credit card data',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'refresh_service_data',
    description: 'Force a fresh scrape of data from a specific service',
    inputSchema: {
      type: 'object',
      properties: {
        service: {
          type: 'string',
          description:
            "Service to refresh ('leumi', 'visaCal', or 'max', etc.)",
          enum: Object.keys(PROVIDER_CONFIG),
        },
      },
      required: ['service'],
    },
  },
  {
    name: 'get_scrape_status',
    description:
      'Get the current scrape status and last scrape times for all services',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'get_monthly_credit_summary',
    description:
      'Get a summary of spending for each credit card for the current or specified month, including total charges, number of transactions, and average transaction size',
    inputSchema: {
      type: 'object',
      properties: {
        month: {
          type: 'number',
          description: 'Month number (1-12). Defaults to current month',
          minimum: 1,
          maximum: 12,
        },
        year: {
          type: 'number',
          description: 'Year (YYYY). Defaults to current year',
        },
        includeCategories: {
          type: 'boolean',
          description: 'Include spending breakdown by category if available',
        },
      },
    },
  },
  {
    name: 'get_recurring_charges',
    description:
      'Identify and analyze recurring charges like subscriptions, memberships, and regular payments across all accounts',
    inputSchema: {
      type: 'object',
      properties: {
        minOccurrences: {
          type: 'number',
          description:
            'Minimum number of occurrences to consider as recurring (default: 2)',
          minimum: 2,
        },
        lookbackMonths: {
          type: 'number',
          description: 'Number of months to analyze (default: 6)',
          minimum: 1,
          maximum: 12,
        },
      },
    },
  },
  {
    name: 'get_recurring_income',
    description:
      'Identify and analyze recurring income like salary, dividends, interest, and other regular income sources across all accounts',
    inputSchema: {
      type: 'object',
      properties: {
        minOccurrences: {
          type: 'number',
          description:
            'Minimum number of occurrences to consider as recurring (default: 2)',
          minimum: 2,
        },
        lookbackMonths: {
          type: 'number',
          description: 'Number of months to analyze (default: 6)',
          minimum: 1,
          maximum: 12,
        },
      },
    },
  },
] as const satisfies Tool[];

export type ToolName = (typeof TOOLS)[number]['name'];
