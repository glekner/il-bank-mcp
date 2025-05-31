import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { ScraperService } from "@bank-assistant/scraper";
import * as dotenv from "dotenv";
import * as path from "path";
import * as fs from "fs";

import { TOOLS } from "./tools.js";
import type { ToolName } from "./tools.js";
import {
  TransactionHandler,
  SummaryHandler,
  AccountHandler,
  RefreshHandler,
  StatusHandler,
} from "./handlers/index.js";
import { MonthlyCreditSummaryHandler } from "./handlers/financial-advisory/monthly-credit-summary.handler.js";
import { RecurringChargesHandler } from "./handlers/financial-advisory/recurring-charges.handler.js";
import { logger } from "./utils/logger.js";
import type {
  TransactionArgs,
  SummaryArgs,
  BalanceHistoryArgs,
  RefreshServiceArgs,
  MonthlyCreditSummaryArgs,
  RecurringChargesArgs,
} from "./types.js";

// Load environment variables from a local .env file only if it exists. This
// allows containerised deployments (where credentials are provided via real
// environment variables or secrets) to start without requiring a file baked
// into the image.
const rootEnvPath = path.resolve(__dirname, "../../../.env");
if (fs.existsSync(rootEnvPath)) {
  dotenv.config({ path: rootEnvPath });
} else {
  // Fallback to default behaviour which only expands already-defined
  // process.env values. This is a no-op if there is no .env file.
  dotenv.config();
}

type ToolArgsSpec = {
  get_transactions: TransactionArgs;
  get_financial_summary: SummaryArgs;
  get_accounts: void;
  get_account_balance_history: BalanceHistoryArgs;
  refresh_all_data: void;
  refresh_service_data: RefreshServiceArgs;
  get_scrape_status: void;
  get_monthly_credit_summary: MonthlyCreditSummaryArgs;
  get_recurring_charges: RecurringChargesArgs;
};

class IsraeliBankMCPServer {
  private server: Server;
  private scraperService: ScraperService;
  private transactionHandler!: TransactionHandler;
  private summaryHandler!: SummaryHandler;
  private accountHandler!: AccountHandler;
  private refreshHandler!: RefreshHandler;
  private statusHandler!: StatusHandler;
  private monthlyCreditSummaryHandler!: MonthlyCreditSummaryHandler;
  private recurringChargesHandler!: RecurringChargesHandler;

  constructor() {
    this.server = new Server(
      {
        name: "israeli-bank-assistant",
        version: "2.0.0",
      },
      {
        capabilities: {
          tools: {},
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
    this.monthlyCreditSummaryHandler = new MonthlyCreditSummaryHandler(
      this.scraperService
    );
    this.recurringChargesHandler = new RecurringChargesHandler(
      this.scraperService
    );
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
      get_transactions: (args) => this.transactionHandler.getTransactions(args),

      get_financial_summary: (args) =>
        this.summaryHandler.getFinancialSummary(args),

      get_accounts: () => this.accountHandler.getAccounts(),

      get_account_balance_history: (args) =>
        this.accountHandler.getAccountBalanceHistory(args),

      refresh_all_data: () => this.refreshHandler.refreshAllData(),

      refresh_service_data: (args) =>
        this.refreshHandler.refreshServiceData(args),

      get_scrape_status: () => this.statusHandler.getScrapeStatus(),

      get_monthly_credit_summary: (args) =>
        this.monthlyCreditSummaryHandler.getMonthlyCreditSummary(args),

      get_recurring_charges: (args) =>
        this.recurringChargesHandler.getRecurringCharges(args),
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
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: rawArgs } = request.params as {
        name: keyof ToolArgsMap;
        arguments?: unknown;
      };

      try {
        // Execute the requested tool. We cast to `any` here because the
        // underlying SDK expects a `ServerResult` shape, which each handler
        // already fulfils, but the generic mapping above does not capture
        // that detail.
        return (await executeTool(name, rawArgs)) as any;
      } catch (error) {
        logger.error(`Tool ${name} failed`, {
          error: error instanceof Error ? error.message : String(error),
          args: rawArgs,
        });

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  success: false,
                  error:
                    error instanceof Error ? error.message : "Unknown error",
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
    logger.info("Israeli Bank MCP Server started");
  }

  async stop() {
    this.scraperService.close();
    logger.info("Israeli Bank MCP Server stopped");
  }
}

// Main entry point
async function main() {
  const server = new IsraeliBankMCPServer();

  // Handle graceful shutdown
  process.on("SIGINT", async () => {
    logger.info("Received SIGINT, shutting down gracefully...");
    await server.stop();
    process.exit(0);
  });

  process.on("SIGTERM", async () => {
    logger.info("Received SIGTERM, shutting down gracefully...");
    await server.stop();
    process.exit(0);
  });

  try {
    await server.start();
  } catch (error) {
    logger.error("Failed to start server", {
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
