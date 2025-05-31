import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { ScraperService } from "@bank-assistant/scraper";
import * as dotenv from "dotenv";
import * as path from "path";

import { TOOLS } from "./tools.js";
import {
  TransactionHandler,
  SummaryHandler,
  AccountHandler,
  RefreshHandler,
  StatusHandler,
} from "./handlers/index.js";
import { logger } from "./utils/logger.js";
import type {
  TransactionArgs,
  SummaryArgs,
  BalanceHistoryArgs,
  RefreshServiceArgs,
} from "./types.js";

// Load environment variables from root directory
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

class IsraeliBankMCPServer {
  private server: Server;
  private scraperService: ScraperService;
  private transactionHandler!: TransactionHandler;
  private summaryHandler!: SummaryHandler;
  private accountHandler!: AccountHandler;
  private refreshHandler!: RefreshHandler;
  private statusHandler!: StatusHandler;

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
  }

  private setupRequestHandlers() {
    // Handle list tools request
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: TOOLS,
    }));

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case "get_transactions":
            return await this.transactionHandler.getTransactions(
              args as TransactionArgs
            );

          case "get_financial_summary":
            return await this.summaryHandler.getFinancialSummary(
              args as SummaryArgs
            );

          case "get_accounts":
            return await this.accountHandler.getAccounts();

          case "get_account_balance_history":
            return await this.accountHandler.getAccountBalanceHistory(
              args as unknown as BalanceHistoryArgs
            );

          case "refresh_all_data":
            return await this.refreshHandler.refreshAllData();

          case "refresh_service_data":
            return await this.refreshHandler.refreshServiceData(
              args as unknown as RefreshServiceArgs
            );

          case "get_scrape_status":
            return await this.statusHandler.getScrapeStatus();

          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        logger.error(`Tool ${name} failed`, {
          error: error instanceof Error ? error.message : String(error),
          args,
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
