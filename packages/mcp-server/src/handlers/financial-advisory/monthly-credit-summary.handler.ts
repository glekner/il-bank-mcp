import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { CreditCardSummary, MonthlyCreditSummaryArgs } from "../../types.js";
import { logger } from "../../utils/logger.js";
import { BaseHandler } from "../base.js";

export class MonthlyCreditSummaryHandler extends BaseHandler {
  async getMonthlyCreditSummary(
    args: MonthlyCreditSummaryArgs
  ): Promise<CallToolResult> {
    try {
      // Default to current month if not specified
      const now = new Date();
      const month = args.month || now.getMonth() + 1;
      const year = args.year || now.getFullYear();

      // Calculate date range for the month

      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0, 23, 59, 59, 999);

      logger.info("Getting monthly credit summary", {
        month,
        year,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      });

      // Get all transactions for the month
      const transactions = await this.scraperService.getTransactions({
        startDate,
        endDate,
      });

      if (!transactions || transactions.length === 0) {
        throw new Error("No transactions found for this period");
      }

      // Get all accounts to identify credit cards
      const accounts = await this.scraperService.getAccounts();
      if (!accounts || accounts.length === 0) {
        throw new Error("No accounts found");
      }

      // Filter for credit card accounts (non-leumi accounts are credit cards)
      const creditCards = accounts.filter(
        (account) => account.type === "Credit Card"
      );

      // Process transactions by credit card
      const summaries: CreditCardSummary[] = [];

      for (const card of creditCards) {
        const cardTransactions = transactions.filter(
          (txn) => txn.accountId === card.id
        );

        if (cardTransactions.length === 0) continue;

        const totalSpent = cardTransactions.reduce(
          (sum, txn) => sum + Math.abs(txn.amount),
          0
        );

        const largestTransaction = cardTransactions.reduce((prev, current) =>
          Math.abs(current.amount) > Math.abs(prev.amount) ? current : prev
        );

        const summary: CreditCardSummary = {
          cardId: card.id,
          cardName: card.name,
          totalSpent,
          transactionCount: cardTransactions.length,
          averageTransaction: totalSpent / cardTransactions.length,
          largestTransaction,
        };

        // Add category breakdown if requested
        if (args.includeCategories) {
          const categoryBreakdown: Record<string, number> = {};

          cardTransactions.forEach((txn) => {
            const category = txn.category || "Uncategorized";
            categoryBreakdown[category] =
              (categoryBreakdown[category] || 0) + Math.abs(txn.amount);
          });

          summary.categoryBreakdown = categoryBreakdown;
        }

        summaries.push(summary);
      }

      // Sort by total spent (descending)
      summaries.sort((a, b) => b.totalSpent - a.totalSpent);

      // Calculate totals
      const grandTotal = summaries.reduce((sum, s) => sum + s.totalSpent, 0);
      const totalTransactions = summaries.reduce(
        (sum, s) => sum + s.transactionCount,
        0
      );

      // Format month name
      const monthNames = [
        "January",
        "February",
        "March",
        "April",
        "May",
        "June",
        "July",
        "August",
        "September",
        "October",
        "November",
        "December",
      ];
      const monthName = `${monthNames[month - 1]} ${year}`;

      const response = {
        success: true,
        month: monthName,
        creditCards: summaries,
        summary: {
          totalCards: summaries.length,
          grandTotal,
          totalTransactions,
          averagePerCard:
            summaries.length > 0 ? grandTotal / summaries.length : 0,
        },
      };

      // Check if scraping is in progress and add warning
      const scrapeStatus = this.scraperService.getScrapeStatus();
      if (
        scrapeStatus.isAnyScrapeRunning &&
        scrapeStatus.activeScrapes?.length > 0
      ) {
        const runningServices = scrapeStatus.activeScrapes
          .map((s) => s.service)
          .join(", ");

        (response as any)._warning =
          `Data scraping is currently in progress for: ${runningServices}. The data shown may be stale.`;
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(response, null, 2),
          },
        ],
      };
    } catch (error) {
      logger.error("Failed to get monthly credit summary", {
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
                error: error instanceof Error ? error.message : "Unknown error",
              },
              null,
              2
            ),
          },
        ],
      };
    }
  }
}
