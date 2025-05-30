import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";
import { ScraperService } from "@bank-assistant/scraper";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Define available tools
const TOOLS: Tool[] = [
  {
    name: "get_transactions",
    description: "Get bank transactions for a specific time period",
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
          description: "Optional account ID to filter by",
        },
      },
    },
  },
  {
    name: "get_financial_summary",
    description:
      "Get a comprehensive financial summary including trends, income, and expenses",
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
    description: "Get all bank accounts with current balances",
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
          description: "Account ID",
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
    name: "refresh_bank_data",
    description: "Force a fresh scrape of bank data",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
];

class BankLeumiMCPServer {
  private server: Server;
  private scraperService: ScraperService;

  constructor() {
    this.server = new Server(
      {
        name: "bank-leumi-assistant",
        version: "1.0.0",
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

            const summary = await this.scraperService.getFinancialSummary(
              startDate,
              endDate
            );

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
            const accounts = await this.scraperService.getAccounts();

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

          case "refresh_bank_data": {
            await this.scraperService.forceScrape();

            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(
                    {
                      success: true,
                      message: "Bank data refreshed successfully",
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
    console.error("Bank Leumi MCP Server started");
  }
}

// Start the server
const server = new BankLeumiMCPServer();
server.start().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});
