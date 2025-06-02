import { ScraperService } from '@bank-assistant/scraper';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

import { RecurringChargesHandler } from './handlers/financial-advisory/recurring-charges.handler.js';
import {
  AccountHandler,
  MerchantAnalysisHandler,
  MetadataHandler,
  RefreshHandler,
  StatusHandler,
  SummaryHandler,
  TransactionHandler,
  type MonthlyCreditSummaryHandler,
} from './handlers/index.js';
import type { ToolName } from './tools.js';
import { TOOLS } from './tools.js';

import { CategoryAnalysisHandler } from './handlers/category-analysis.handler.js';
import type {
  AvailableCategoriesArgs,
  BalanceHistoryArgs,
  CategoryComparisonArgs,
  MerchantAnalysisArgs,
  MonthlyCreditSummaryArgs,
  RecurringChargesArgs,
  RefreshProviderArgs,
  SearchTransactionsArgs,
  SpendingByMerchantArgs,
  SummaryArgs,
  TransactionArgs,
} from './types.js';
import { logger } from './utils/logger.js';

// Load environment variables from a local .env file only if it exists. This
// allows containerised deployments (where credentials are provided via real
// environment variables or secrets) to start without requiring a file baked
// into the image.
const rootEnvPath = path.resolve(__dirname, '../../../.env');
if (fs.existsSync(rootEnvPath)) {
  dotenv.config({ path: rootEnvPath });
} else {
  // Fallback to default behaviour which only expands already-defined
  // process.env values. This is a no-op if there is no .env file.
  dotenv.config();
}

type ToolArgsSpec = {
  get_available_categories: AvailableCategoriesArgs;
  get_transactions: TransactionArgs;
  get_financial_summary: SummaryArgs;
  get_accounts: void;
  get_account_balance_history: BalanceHistoryArgs;
  refresh_all_data: void;
  refresh_service_data: RefreshProviderArgs;
  get_scrape_status: void;
  get_metadata: void;
  get_monthly_credit_summary: MonthlyCreditSummaryArgs;
  get_recurring_charges: RecurringChargesArgs;
  analyze_merchant_spending: MerchantAnalysisArgs;
  get_spending_by_merchant: SpendingByMerchantArgs;
  get_category_comparison: CategoryComparisonArgs;
  search_transactions: SearchTransactionsArgs;
};

const INSTRUCTIONS = `You are a sophisticated Personal Finance Advisor powered by the Israeli Bank Assistant MCP server, with real-time access to bank and credit card data from Israeli financial institutions.

## Your Core Mission
Transform raw financial data into actionable insights that help users make smarter money decisions. You're not just a data retriever - you're a proactive financial companion who spots patterns, catches anomalies, and provides personalized recommendations.

## Key Capabilities & How to Use Them

### 🔍 Financial Health Monitoring
- **Burn Rate Analysis**: Compare spending across periods to identify if spending is increasing/decreasing
- **Savings Rate Tracking**: Calculate what percentage of income is being saved each month
- **Balance Projections**: Predict end-of-month balances based on current spending patterns
- **Cash Flow Analysis**: Understand daily spending patterns (weekdays vs weekends)

### 💳 Expense Intelligence
- **Subscription Detective**: Find all recurring charges (Netflix, Spotify, gym memberships) and calculate total monthly fixed costs
- **Category Comparisons**: Compare spending between categories (e.g., food delivery vs groceries)
- **Merchant Analysis**: Track spending patterns at specific merchants and detect anomalies
- **Major Purchase Tracking**: Review all large transactions with context

### 🚨 Anomaly Detection & Alerts
- **Fraud Prevention**: Flag transactions that are significantly higher than average for a merchant
- **Billing Error Detection**: Catch when a coffee shop charges ₪500 instead of ₪50
- **Spending Spike Alerts**: Identify categories with unusual spending increases

### 📊 Trend Analysis
- **Category Trends**: Identify which spending categories are increasing over time
- **Lifestyle Creep Detection**: Spot gradual increases in discretionary spending
- **Utility Bill Monitoring**: Compare monthly bills to find savings opportunities
- **Historical Patterns**: Analyze long-term financial behavior changes

## Best Practices for Tool Usage

1. **Always Start with Context**:
   - Check data freshness with get_scrape_status
   - If data is >24 hours old, suggest refreshing
   - Use get_metadata for quick overview of available data range

2. **Smart Tool Selection**:
   - Use get_financial_summary for burn rate and high-level analysis
   - Use get_transactions only when specific transaction details are needed
   - Always call get_available_categories BEFORE any category filtering
   - Always call get_accounts BEFORE filtering by specific account

3. **Efficient Data Retrieval**:
   - For date ranges >90 days, prefer get_financial_summary over get_transactions
   - Use search_transactions for targeted queries instead of fetching all transactions
   - Leverage get_metadata instead of counting transactions manually

## Response Guidelines

### DO:
- Provide specific numbers with context (e.g., "Your food delivery spending of ₪2,340 is 45% higher than last month")
- Offer actionable recommendations (e.g., "Consider canceling unused subscriptions totaling ₪180/month")
- Highlight both positive and concerning trends
- Use visual comparisons when helpful (percentages, trends)
- Proactively suggest related analyses

### DON'T:
- Just dump raw data without interpretation
- Ignore potential issues or anomalies
- Make assumptions about account names - always verify with get_accounts
- Use invalid category names - always check with get_available_categories first

## Example Interaction Patterns

When asked about burn rate:
1. Check data freshness
2. Get financial summary for current and previous period
3. Calculate the difference and percentage change
4. Identify top contributing categories to any increase
5. Suggest actionable ways to reduce if spending increased

When detecting subscriptions:
1. Use get_recurring_charges to find all subscriptions
2. Calculate total monthly cost
3. Flag any subscriptions that might be forgotten
4. Compare to typical spending in entertainment/services category

When analyzing spending patterns:
1. Start with the big picture (get_financial_summary)
2. Drill down into specific concerns (get_transactions or search_transactions)
3. Compare across time periods
4. Provide both the data and what it means for their financial health

Remember: You're not just answering questions - you're helping users build better financial habits and achieve their money goals. Be their trusted financial companion who catches what they might miss and celebrates their wins!`;

class IsraeliBankMCPServer {
  private server: Server;
  private scraperService: ScraperService;
  private transactionHandler!: TransactionHandler;
  private summaryHandler!: SummaryHandler;
  private accountHandler!: AccountHandler;
  private refreshHandler!: RefreshHandler;
  private statusHandler!: StatusHandler;
  private recurringChargesHandler!: RecurringChargesHandler;
  private merchantAnalysisHandler!: MerchantAnalysisHandler;
  private metadataHandler!: MetadataHandler;
  private categoryAnalysisHandler!: CategoryAnalysisHandler;
  private monthlyCreditSummaryHandler!: MonthlyCreditSummaryHandler;

  constructor() {
    this.server = new Server(
      {
        name: 'israeli-bank-assistant',
        version: '0.0.1',
        instructions: INSTRUCTIONS,
      },
      {
        capabilities: {
          tools: {},
          prompts: {
            listChanged: true,
          },
        },
      }
    );

    this.scraperService = new ScraperService();
    this.initializeHandlers();
    this.setupRequestHandlers();
  }

  private initializeHandlers() {
    this.transactionHandler = new TransactionHandler(this.scraperService);
    this.summaryHandler = new SummaryHandler(this.scraperService);
    this.accountHandler = new AccountHandler(this.scraperService);
    this.refreshHandler = new RefreshHandler(this.scraperService);
    this.statusHandler = new StatusHandler(this.scraperService);
    this.categoryAnalysisHandler = new CategoryAnalysisHandler(
      this.scraperService
    );
    this.recurringChargesHandler = new RecurringChargesHandler(
      this.scraperService
    );
    this.merchantAnalysisHandler = new MerchantAnalysisHandler(
      this.scraperService
    );
    this.metadataHandler = new MetadataHandler(this.scraperService);
  }

  private setupRequestHandlers() {
    // Handle list tools request
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: TOOLS,
    }));

    // ---------------------------------------------------------------------
    // Strongly-typed tool call handling
    // ---------------------------------------------------------------------

    // 3. Instantiate the handlers – the compiler will enforce the signatures
    const toolHandlers: ToolHandlers = {
      get_available_categories: args =>
        this.categoryAnalysisHandler.getAvailableCategories({
          startDate: args.startDate ? new Date(args.startDate) : undefined,
          endDate: args.endDate ? new Date(args.endDate) : undefined,
          accountId: args.accountId,
        }),

      get_transactions: args => this.transactionHandler.getTransactions(args),

      get_financial_summary: args =>
        this.summaryHandler.getFinancialSummary(args),

      get_accounts: () => this.accountHandler.getAccounts(),

      get_account_balance_history: args =>
        this.accountHandler.getAccountBalanceHistory(args),

      refresh_all_data: () => this.refreshHandler.refreshAllData(),

      refresh_service_data: args =>
        this.refreshHandler.refreshProviderData(args),

      get_scrape_status: () => this.statusHandler.getScrapeStatus(),

      get_metadata: () => this.metadataHandler.getMetadata(),

      get_monthly_credit_summary: args =>
        this.monthlyCreditSummaryHandler.getMonthlyCreditSummary(args),

      get_recurring_charges: args =>
        this.recurringChargesHandler.getRecurringCharges(args),

      analyze_merchant_spending: args =>
        this.merchantAnalysisHandler.analyzeMerchantSpending(args),

      get_spending_by_merchant: args =>
        this.merchantAnalysisHandler.getSpendingByMerchant(args),

      get_category_comparison: args =>
        this.categoryAnalysisHandler.getCategoryComparison(args),

      search_transactions: args =>
        this.categoryAnalysisHandler.searchTransactions(args),
    };

    // 4. Generic helper to execute a tool
    const executeTool = async <K extends keyof ToolHandlers>(
      name: K,
      rawArgs: unknown
    ) => {
      const handler = toolHandlers[name] as (
        args?: unknown
      ) => Promise<unknown>;
      return handler(rawArgs);
    };

    // 5. Register the request handler that delegates to the generic executor
    this.server.setRequestHandler(CallToolRequestSchema, async request => {
      const { name, arguments: rawArgs } = request.params as {
        name: keyof ToolArgsMap;
        arguments?: unknown;
      };

      try {
        // Execute the requested tool. We cast to `any` here because the
        // underlying SDK expects a `ServerResult` shape, which each handler
        // already fulfils, but the generic mapping above does not capture
        // that detail.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return (await executeTool(name, rawArgs)) as any;
      } catch (error) {
        logger.error(`Tool ${name} failed`, {
          error: error instanceof Error ? error.message : String(error),
          args: rawArgs,
        });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: false,
                  error:
                    error instanceof Error ? error.message : 'Unknown error',
                },
                null,
                2
              ),
            },
          ],
        };
      }
    });
  }

  async start() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    logger.info('Israeli Bank MCP Server started');
  }

  async stop() {
    this.scraperService.close();
    logger.info('Israeli Bank MCP Server stopped');
  }
}

// Main entry point
async function main() {
  const server = new IsraeliBankMCPServer();

  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    logger.info('Received SIGINT, shutting down gracefully...');
    await server.stop();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    logger.info('Received SIGTERM, shutting down gracefully...');
    await server.stop();
    process.exit(0);
  });

  try {
    await server.start();
  } catch (error) {
    logger.error('Failed to start server', {
      error: error instanceof Error ? error.message : String(error),
    });
    process.exit(1);
  }
}

main();

// Ensures that every key in `ToolName` exists in `ToolArgsSpec` and vice-versa.
// If a new tool is added to `TOOLS` without updating this mapping the compiler
// will surface an error.
type ToolArgsMap = {
  [K in ToolName]: K extends keyof ToolArgsSpec ? ToolArgsSpec[K] : never;
};

type ToolHandlers = {
  [K in ToolName]: ToolArgsMap[K] extends void
    ? () => Promise<unknown>
    : (args: ToolArgsMap[K]) => Promise<unknown>;
};
