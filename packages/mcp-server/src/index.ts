import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";
import { ScraperService } from "@bank-assistant/scraper";
import * as dotenv from "dotenv";
import * as path from "path";

// Load environment variables from root directory
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

// Define available tools
const TOOLS: Tool[] = [
  {
    name: "get_transactions",
    description:
      "Get bank and credit card transactions for a specific time period from all configured services",
    inputSchema: {
      type: "object",
      properties: {
        startDate: {
          type: "string",
          description: "Start date in ISO format (YYYY-MM-DD)",
        },
        endDate: {
          type: "string",
          description: "End date in ISO format (YYYY-MM-DD)",
        },
        accountId: {
          type: "string",
          description:
            "Optional account ID to filter by (e.g., 'leumi-123456', 'visacal-7890', 'max-4567')",
        },
      },
    },
  },
  {
    name: "get_financial_summary",
    description:
      "Get a comprehensive financial summary including trends, income, and expenses from all services",
    inputSchema: {
      type: "object",
      properties: {
        startDate: {
          type: "string",
          description: "Start date in ISO format (YYYY-MM-DD)",
        },
        endDate: {
          type: "string",
          description: "End date in ISO format (YYYY-MM-DD)",
        },
      },
    },
  },
  {
    name: "get_accounts",
    description: "Get all bank accounts and credit cards with current balances",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "get_account_balance_history",
    description: "Get balance history for a specific account",
    inputSchema: {
      type: "object",
      properties: {
        accountId: {
          type: "string",
          description:
            "Account ID (e.g., 'leumi-123456', 'visacal-7890', 'max-4567')",
          required: true,
        },
        days: {
          type: "number",
          description: "Number of days to look back (default: 30)",
        },
      },
      required: ["accountId"],
    },
  },
  {
    name: "refresh_all_data",
    description: "Force a fresh scrape of all bank and credit card data",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "refresh_service_data",
    description: "Force a fresh scrape of data from a specific service",
    inputSchema: {
      type: "object",
      properties: {
        service: {
          type: "string",
          description: "Service to refresh ('leumi', 'visaCal', or 'max')",
          enum: ["leumi", "visaCal", "max"],
          required: true,
        },
      },
      required: ["service"],
    },
  },
];

class IsraeliBankMCPServer {
  private server: Server;
  private scraperService: ScraperService;

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
    this.setupHandlers();
  }

  private setupHandlers() {
    // Handle list tools request
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: TOOLS,
    }));

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case "get_transactions": {
            const typedArgs = args as {
              startDate?: string;
              endDate?: string;
              accountId?: string;
            };
            const startDate = typedArgs?.startDate
              ? new Date(typedArgs.startDate)
              : undefined;
            const endDate = typedArgs?.endDate
              ? new Date(typedArgs.endDate)
              : undefined;

            const transactions = await this.scraperService.getTransactions({
              startDate,
              endDate,
              accountId: typedArgs?.accountId,
            });

            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(
                    {
                      success: true,
                      count: transactions.length,
                      transactions,
                    },
                    null,
                    2
                  ),
                },
              ],
            };
          }

          case "get_financial_summary": {
            const typedArgs = args as { startDate?: string; endDate?: string };
            const startDate = typedArgs?.startDate
              ? new Date(typedArgs.startDate)
              : undefined;
            const endDate = typedArgs?.endDate
              ? new Date(typedArgs.endDate)
              : undefined;

            let summary = await this.scraperService.getFinancialSummary(
              startDate,
              endDate
            );

            // If summary is empty, trigger a scrape and retry
            if (
              !summary ||
              summary.transactions.length === 0 ||
              (Object.keys(summary.income).length === 0 &&
                Object.keys(summary.expenses).length === 0)
            ) {
              console.error("Financial summary is empty, triggering scrape...");
              await this.scraperService.forceScrape();

              // Retry getting the summary after scraping
              summary = await this.scraperService.getFinancialSummary(
                startDate,
                endDate
              );
            }

            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(
                    {
                      success: true,
                      summary,
                    },
                    null,
                    2
                  ),
                },
              ],
            };
          }

          case "get_accounts": {
            let accounts = await this.scraperService.getAccounts();

            // If no accounts found, trigger a scrape and retry
            if (accounts.length === 0) {
              console.error("No accounts found, triggering scrape...");
              await this.scraperService.forceScrape();

              // Retry getting accounts after scraping
              accounts = await this.scraperService.getAccounts();
            }

            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(
                    {
                      success: true,
                      accounts,
                    },
                    null,
                    2
                  ),
                },
              ],
            };
          }

          case "get_account_balance_history": {
            const typedArgs = args as { accountId?: string; days?: number };
            if (!typedArgs?.accountId) {
              throw new Error("accountId is required");
            }

            const history = await this.scraperService.getAccountBalanceHistory(
              typedArgs.accountId,
              typedArgs.days || 30
            );

            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(
                    {
                      success: true,
                      accountId: typedArgs.accountId,
                      history,
                    },
                    null,
                    2
                  ),
                },
              ],
            };
          }

          case "refresh_all_data": {
            await this.scraperService.forceScrape();

            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(
                    {
                      success: true,
                      message:
                        "All bank and credit card data refreshed successfully",
                    },
                    null,
                    2
                  ),
                },
              ],
            };
          }

          case "refresh_service_data": {
            const typedArgs = args as { service?: string };
            if (!typedArgs?.service) {
              throw new Error("service is required");
            }

            const validServices = ["leumi", "visaCal", "max"];
            if (!validServices.includes(typedArgs.service)) {
              throw new Error(
                `Invalid service. Must be one of: ${validServices.join(", ")}`
              );
            }

            await this.scraperService.forceScrapeService(
              typedArgs.service as any
            );

            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(
                    {
                      success: true,
                      message: `${typedArgs.service} data refreshed successfully`,
                    },
                    null,
                    2
                  ),
                },
              ],
            };
          }

          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
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
    console.error("Israeli Bank MCP Server started");
  }
}

// Start the server
const server = new IsraeliBankMCPServer();
server.start().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});
