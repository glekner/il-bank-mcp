import { PROVIDER_CONFIG } from '@bank-assistant/scraper';
import { Tool } from '@modelcontextprotocol/sdk/types.js';

export const TOOLS = [
  {
    name: 'get_available_categories',
    description:
      'ALWAYS USE THIS FIRST before any category filtering! Retrieves all unique transaction categories from your actual data (often in Hebrew like "מזון", "בילויים", etc.). Essential for category comparison queries like "food vs entertainment spending" or when searching transactions by category. The categories returned are the ONLY valid values you can use in other tools that accept category filters.',
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
            'Optional account ID to filter by (get this from get_accounts first)',
        },
      },
    },
  },
  {
    name: 'get_transactions',
    description:
      'Retrieves individual transactions with full details like date, amount, merchant, and category. Perfect for: reviewing recent purchases, finding specific transactions, analyzing spending patterns by day/week, or getting raw data for custom analysis. IMPORTANT: Always call get_accounts FIRST if filtering by account. For large date ranges (>90 days), only the most recent 500 transactions are returned. Use get_financial_summary for longer-term overviews.',
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
            "Account ID from get_accounts - NEVER guess this value! If user says 'Visa Cal' or 'Max card', first call get_accounts to find the matching ID",
        },
      },
    },
  },
  {
    name: 'get_financial_summary',
    description:
      'Your go-to tool for burn rate analysis and high-level financial overviews! Returns aggregated income, expenses, and trends without individual transaction details. Perfect for: comparing spending between months, calculating savings rates, understanding overall financial health, or when users ask "How much did I spend this month?" or "What\'s my burn rate?". Automatically optimized for large date ranges.',
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
    description:
      'ESSENTIAL FIRST STEP for any account-specific query! Lists all connected bank accounts and credit cards with their current balances and unique IDs. Always use this when users mention account names like "my Visa", "Leumi account", or "Max card" to get the correct account ID. Also shows total net worth across all accounts.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'get_account_balance_history',
    description:
      'Tracks how an account balance changes over time - essential for balance projections and understanding cash flow patterns. Use this to answer "Will I make it to payday?" or "What\'s my account trend?" by analyzing historical balance movements. MUST have account ID from get_accounts first.',
    inputSchema: {
      type: 'object',
      properties: {
        accountId: {
          type: 'string',
          description:
            'The exact account ID from get_accounts (required - no guessing!)',
        },
        days: {
          type: 'number',
          description: 'Number of days to look back (default: 30, max: 365)',
        },
      },
      required: ['accountId'],
    },
  },
  {
    name: 'refresh_all_data',
    description:
      'Triggers a fresh scrape of all connected bank and credit card accounts to get the latest data. Use when user mentions recent transactions not appearing, or when get_scrape_status shows data is stale (>24 hours old). This ensures all subsequent analysis uses the most current information.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'refresh_service_data',
    description:
      'Refreshes data from a specific financial provider when you need updated information from just one source. More efficient than refresh_all_data when dealing with single account issues.',
    inputSchema: {
      type: 'object',
      properties: {
        service: {
          type: 'string',
          description:
            "The specific provider to refresh (e.g., 'leumi' for Bank Leumi, 'visaCal' for Visa Cal credit card, 'max' for Max credit card)",
          enum: Object.keys(PROVIDER_CONFIG),
        },
      },
      required: ['service'],
    },
  },
  {
    name: 'get_scrape_status',
    description:
      'Check when your financial data was last updated and if any scraping is currently in progress. Always use this at the start of analysis to ensure data freshness. If data is older than 24 hours, suggest refreshing before proceeding with analysis.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'get_metadata',
    description:
      'YOUR FIRST STOP for any metadata questions! Instantly returns: earliest/latest transaction dates, total transaction count, date range of available data, database statistics, and system configuration. Use this instead of get_transactions when users ask "How far back does my data go?" or "What\'s the oldest transaction?" - it\'s much faster and more efficient.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
    annotations: {
      title: 'Database Metadata',
      readOnlyHint: true,
    },
  },
  {
    name: 'get_monthly_credit_summary',
    description:
      'Provides a comprehensive breakdown of credit card usage for any month, showing total charges, transaction count, and average transaction size per card. Perfect for monthly credit card bill reconciliation or understanding which cards are used most. Can also break down spending by category when requested.',
    inputSchema: {
      type: 'object',
      properties: {
        month: {
          type: 'number',
          description:
            'Month number (1-12). Defaults to current month if not specified',
          minimum: 1,
          maximum: 12,
        },
        year: {
          type: 'number',
          description: 'Year (YYYY). Defaults to current year if not specified',
        },
        includeCategories: {
          type: 'boolean',
          description:
            'Set to true to include spending breakdown by category for each card',
        },
      },
    },
  },
  {
    name: 'get_recurring_charges',
    description:
      'Your subscription detective! Identifies recurring charges like Netflix, Spotify, gym memberships, and other regular payments. Analyzes transaction patterns to find charges that repeat monthly with similar amounts. Essential for answering "What subscriptions am I paying for?" or calculating total monthly fixed costs. Only shows charges that appear consistently.',
    inputSchema: {
      type: 'object',
      properties: {
        minOccurrences: {
          type: 'number',
          description:
            'Minimum times a charge must repeat to be considered recurring (default: 2, recommended: 3 for accuracy)',
          minimum: 2,
        },
        lookbackMonths: {
          type: 'number',
          description: 'How many months back to analyze (default: 6, max: 12)',
          minimum: 1,
          maximum: 12,
        },
      },
    },
  },
  {
    name: 'analyze_merchant_spending',
    description:
      'Deep-dive analysis for specific merchants! Shows spending patterns, average transaction amounts, frequency, and flags unusual charges (potential errors/fraud). Perfect for questions like "How much do I usually spend at the supermarket?" or "Alert me if any coffee shop charge is 50% higher than normal". The anomaly detection helps catch billing errors. MERCHANT SHOULD NEVER BE ONE OF THE ACCOUNT NAMES, OR A CATEGORY - ONLY A MERCHANT NAME.',
    inputSchema: {
      type: 'object',
      properties: {
        merchantName: {
          type: 'string',
          description:
            'Full or partial merchant name (e.g., "Shufersal", "Aroma", "Castro")',
        },
        lookbackMonths: {
          type: 'number',
          description: 'Number of months to analyze (default: 6, max: 24)',
          minimum: 1,
          maximum: 24,
        },
        includeAnomalies: {
          type: 'boolean',
          description:
            'Set to true to highlight transactions significantly higher than average (helps detect errors)',
        },
      },
      required: ['merchantName'],
    },
  },
  {
    name: 'get_spending_by_merchant',
    description:
      'Ranks all merchants by total spending to identify where your money goes. Answers "Who am I spending the most money with?" Perfect for finding cost-cutting opportunities or understanding spending priorities. Can filter to show only significant merchants above a minimum threshold.',
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
        minAmount: {
          type: 'number',
          description:
            'Only show merchants where total spending exceeds this amount',
        },
        topN: {
          type: 'number',
          description:
            'Limit results to top N merchants by spending (e.g., top 10)',
        },
      },
    },
  },
  {
    name: 'get_category_comparison',
    description:
      'Compares spending between categories across different time periods - essential for questions like "Am I spending more on food delivery vs groceries?" or "Which category increased the most?" CRITICAL: You MUST call get_available_categories FIRST to get valid category names (often in Hebrew), then use those exact names here. Perfect for lifestyle analysis and identifying spending trends.',
    inputSchema: {
      type: 'object',
      properties: {
        categories: {
          type: 'array',
          items: {
            type: 'string',
          },
          description:
            'Categories to compare - MUST be exact names from get_available_categories (case-sensitive, often in Hebrew)',
        },
        period1Start: {
          type: 'string',
          description: 'Start date of first period (ISO format YYYY-MM-DD)',
        },
        period1End: {
          type: 'string',
          description: 'End date of first period (ISO format YYYY-MM-DD)',
        },
        period2Start: {
          type: 'string',
          description: 'Start date of second period (ISO format YYYY-MM-DD)',
        },
        period2End: {
          type: 'string',
          description: 'End date of second period (ISO format YYYY-MM-DD)',
        },
      },
      required: ['period1Start', 'period1End', 'period2Start', 'period2End'],
    },
  },
  {
    name: 'search_transactions',
    description:
      'Powerful transaction search with multiple filters! Find transactions by description (e.g., "uber"), amount range (e.g., "over 1000 NIS"), or category. Perfect for queries like "Show me all Uber rides", "Find all large purchases over 1,000", or "Show restaurant expenses". For category filtering, ALWAYS call get_available_categories first to get valid category names.',
    inputSchema: {
      type: 'object',
      properties: {
        searchTerm: {
          type: 'string',
          description:
            'Text to search in transaction descriptions (partial match, case-insensitive)',
        },
        minAmount: {
          type: 'number',
          description:
            'Minimum transaction amount (e.g., 1000 for "transactions over 1,000")',
        },
        maxAmount: {
          type: 'number',
          description: 'Maximum transaction amount',
        },
        categories: {
          type: 'array',
          items: {
            type: 'string',
          },
          description:
            'Filter by categories - MUST be exact names from get_available_categories',
        },
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
    name: 'analyze_day_of_week_spending',
    description:
      'Analyzes spending patterns by day of the week. Perfect for questions like "What\'s my average daily spending on weekdays vs weekends?", "Which day do I spend the most?", or "Show me spending by each day of the week". Can analyze patterns over any time period and provides insights into daily spending habits.',
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
        groupBy: {
          type: 'string',
          description:
            'How to group the analysis: "day" (each day separately), "weekday_weekend" (weekdays vs weekends), or "all" (both analyses)',
          enum: ['day', 'weekday_weekend', 'all'],
        },
        includeCategories: {
          type: 'boolean',
          description:
            'Include spending breakdown by category for each day/group',
        },
        accountId: {
          type: 'string',
          description:
            'Optional account ID to filter by (get this from get_accounts first)',
        },
      },
    },
  },
] as const satisfies Tool[];

export type ToolName = (typeof TOOLS)[number]['name'];
