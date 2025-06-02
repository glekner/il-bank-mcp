import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { ScraperService } from '@bank-assistant/scraper';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

import { TOOLS } from './tools.js';
import type { ToolName } from './tools.js';
import { PROMPTS, PROMPT_TEMPLATES } from './prompts.js';
import {
  TransactionHandler,
  SummaryHandler,
  AccountHandler,
  RefreshHandler,
  StatusHandler,
  MerchantAnalysisHandler,
  MetadataHandler,
} from './handlers/index.js';
import { RecurringChargesHandler } from './handlers/financial-advisory/recurring-charges.handler.js';
import { RecurringIncomeHandler } from './handlers/financial-advisory/recurring-income.handler.js';
import { CategoryAwareHandler } from './handlers/category-aware.handler.js';
import { logger } from './utils/logger.js';
import type {
  TransactionArgs,
  SummaryArgs,
  BalanceHistoryArgs,
  RefreshProviderArgs,
  MonthlyCreditSummaryArgs,
  RecurringChargesArgs,
  RecurringIncomeArgs,
  MerchantAnalysisArgs,
  SpendingByMerchantArgs,
  CategoryComparisonArgs,
  SearchTransactionsArgs,
  AvailableCategoriesArgs,
} from './types.js';

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
  get_recurring_income: RecurringIncomeArgs;
  analyze_merchant_spending: MerchantAnalysisArgs;
  get_spending_by_merchant: SpendingByMerchantArgs;
  get_category_comparison: CategoryComparisonArgs;
  search_transactions: SearchTransactionsArgs;
};

class IsraeliBankMCPServer {
  private server: Server;
  private scraperService: ScraperService;
  private transactionHandler!: TransactionHandler;
  private summaryHandler!: SummaryHandler;
  private accountHandler!: AccountHandler;
  private refreshHandler!: RefreshHandler;
  private statusHandler!: StatusHandler;
  private recurringChargesHandler!: RecurringChargesHandler;
  private recurringIncomeHandler!: RecurringIncomeHandler;
  private merchantAnalysisHandler!: MerchantAnalysisHandler;
  private categoryAwareHandler!: CategoryAwareHandler;
  private metadataHandler!: MetadataHandler;

  constructor() {
    this.server = new Server(
      {
        name: 'israeli-bank-assistant',
        version: '2.0.0',
        instructions: `You are connected to the Israeli Bank Assistant MCP server, which provides real-time access to bank and credit card data from Israeli financial institutions (Bank Leumi, Visa Cal, and Max).

## How to Use This Server

1. **Tools**: Use the available tools to fetch and analyze financial data. Tools are the primary way to interact with bank data.
2. **Prompts**: Use pre-defined prompts (like /financial_review, /budget_planning) for structured financial advisory workflows.
3. **Data Freshness**: Check data freshness with get_scrape_status and refresh if needed with refresh_all_data.
4. **Privacy**: All data is stored locally and never leaves the user's system.

## Important: Account Filtering Workflow

When users request transactions or data from a specific account (e.g., "Visa Cal transactions", "Max credit card", "Leumi account"):
1. **ALWAYS call get_accounts first** to retrieve the list of actual accounts with their IDs and names
2. **Match the user's account reference** to the actual account by comparing names (case-insensitive, partial matching is acceptable)
3. **Use the actual account ID** from get_accounts when calling get_transactions or other account-specific tools
4. **Never assume account ID formats** - always use the exact IDs returned by get_accounts

Example workflow:
- User: "Show me my Visa Cal transactions from last month"
- You: First call get_accounts, find the account with "Visa" or "Cal" in the name, then use that account's ID for get_transactions

## Your Role

You should act as a sophisticated financial advisor, proactively analyzing data and providing personalized recommendations. Don't just retrieve data - interpret it and offer actionable insights.

## Best Practices

- Always check if data is current before analysis
- Use multiple tools together for comprehensive insights
- Respect the confidential nature of financial information
- Focus on patterns and trends rather than raw numbers
- Provide specific, actionable recommendations
- Query accounts before filtering by account ID

Remember: You're not just accessing a database - you're providing intelligent financial advisory services powered by real-time data.`,
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
    this.recurringChargesHandler = new RecurringChargesHandler(
      this.scraperService
    );
    this.recurringIncomeHandler = new RecurringIncomeHandler(
      this.scraperService
    );
    this.merchantAnalysisHandler = new MerchantAnalysisHandler(
      this.scraperService
    );
    this.categoryAwareHandler = new CategoryAwareHandler(this.scraperService);
    this.metadataHandler = new MetadataHandler(this.scraperService);
  }

  private setupRequestHandlers() {
    // Handle list tools request
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: TOOLS,
    }));

    // Handle list prompts request
    this.server.setRequestHandler(ListPromptsRequestSchema, async () => ({
      prompts: Object.values(PROMPTS),
    }));

    // Handle get prompt request
    this.server.setRequestHandler(GetPromptRequestSchema, async request => {
      const promptName = request.params.name;
      const promptArgs = request.params.arguments || {};

      if (!PROMPTS[promptName]) {
        throw new Error(`Unknown prompt: ${promptName}`);
      }

      const promptTemplate = PROMPT_TEMPLATES[promptName];
      if (!promptTemplate) {
        throw new Error(`No template found for prompt: ${promptName}`);
      }

      const messages = promptTemplate(promptArgs);

      return {
        description: PROMPTS[promptName].description,
        messages,
      };
    });

    // ---------------------------------------------------------------------
    // Strongly-typed tool call handling
    // ---------------------------------------------------------------------

    // 3. Instantiate the handlers – the compiler will enforce the signatures
    const toolHandlers: ToolHandlers = {
      get_available_categories: args =>
        this.categoryAwareHandler.getAvailableCategories({
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
        this.categoryAwareHandler.getMonthlyCreditSummary(args),

      get_recurring_charges: args =>
        this.recurringChargesHandler.getRecurringCharges(args),

      get_recurring_income: args =>
        this.recurringIncomeHandler.getRecurringIncome(args),

      analyze_merchant_spending: args =>
        this.merchantAnalysisHandler.analyzeMerchantSpending(args),

      get_spending_by_merchant: args =>
        this.merchantAnalysisHandler.getSpendingByMerchant(args),

      get_category_comparison: args =>
        this.categoryAwareHandler.getCategoryComparison(args),

      search_transactions: args =>
        this.categoryAwareHandler.searchTransactions(args),
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
