import { ScraperService, Transaction } from "@bank-assistant/scraper";
import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { RecurringChargesArgs, RecurringCharge } from "../../types.js";
import { logger } from "../../utils/logger.js";

interface TransactionPattern {
  merchantName: string;
  amounts: number[];
  dates: Date[];
  transactions: Transaction[];
}

export class RecurringChargesHandler {
  constructor(private scraperService: ScraperService) {}

  async getRecurringCharges(
    args: RecurringChargesArgs
  ): Promise<CallToolResult> {
    try {
      const minOccurrences = args.minOccurrences || 2;
      const lookbackMonths = args.lookbackMonths || 6;

      // Calculate date range
      const endDate = new Date();
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - lookbackMonths);

      logger.info("Detecting recurring charges", {
        minOccurrences,
        lookbackMonths,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      });

      // Get all transactions for the period
      const transactions = await this.scraperService.getTransactions({
        startDate,
        endDate,
      });

      if (!transactions || transactions.length === 0) {
        throw new Error("No transactions found for analysis");
      }

      // Group transactions by merchant
      const merchantGroups = this.groupTransactionsByMerchant(transactions);

      // Analyze patterns for recurring charges
      const recurringCharges: RecurringCharge[] = [];

      for (const [merchant, pattern] of merchantGroups.entries()) {
        if (pattern.transactions.length < minOccurrences) continue;

        const analysis = this.analyzeRecurrencePattern(pattern);

        if (analysis.isRecurring) {
          recurringCharges.push({
            merchantName: merchant,
            averageAmount: analysis.averageAmount,
            frequency: analysis.frequency,
            occurrences: pattern.transactions.length,
            lastCharge: pattern.dates[pattern.dates.length - 1].toISOString(),
            nextExpectedCharge: analysis.nextExpectedDate?.toISOString(),
            totalSpent: pattern.amounts.reduce((sum, amt) => sum + amt, 0),
          });
        }
      }

      // Sort by total spent (descending)
      recurringCharges.sort((a, b) => b.totalSpent - a.totalSpent);

      // Calculate summary statistics
      const totalRecurringMonthly = recurringCharges
        .filter((charge) => charge.frequency === "monthly")
        .reduce((sum, charge) => sum + charge.averageAmount, 0);

      const totalRecurringAnnual = recurringCharges.reduce((sum, charge) => {
        const multiplier = this.getAnnualMultiplier(charge.frequency);
        return sum + charge.averageAmount * multiplier;
      }, 0);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                success: true,
                recurringCharges,
                summary: {
                  totalRecurring: recurringCharges.length,
                  monthlyRecurringCost: totalRecurringMonthly,
                  annualRecurringCost: totalRecurringAnnual,
                  categories: this.categorizeRecurringCharges(recurringCharges),
                },
                insights: this.generateRecurringInsights(recurringCharges),
              },
              null,
              2
            ),
          },
        ],
      };
    } catch (error) {
      logger.error("Failed to detect recurring charges", {
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

  private groupTransactionsByMerchant(
    transactions: Transaction[]
  ): Map<string, TransactionPattern> {
    const groups = new Map<string, TransactionPattern>();

    transactions.forEach((txn) => {
      // Normalize merchant name
      const merchant = this.normalizeMerchantName(txn.description);

      if (!groups.has(merchant)) {
        groups.set(merchant, {
          merchantName: merchant,
          amounts: [],
          dates: [],
          transactions: [],
        });
      }

      const pattern = groups.get(merchant)!;
      pattern.amounts.push(Math.abs(txn.amount));
      pattern.dates.push(new Date(txn.date));
      pattern.transactions.push(txn);
    });

    return groups;
  }

  private normalizeMerchantName(description: string): string {
    // Remove common variations in merchant names
    return description
      .toLowerCase()
      .replace(/\s+/g, " ")
      .replace(/[0-9]{4,}/g, "") // Remove long numbers (transaction IDs, etc.)
      .replace(/\*{2,}/g, "") // Remove multiple asterisks
      .trim();
  }

  private analyzeRecurrencePattern(pattern: TransactionPattern): {
    isRecurring: boolean;
    frequency: string;
    averageAmount: number;
    nextExpectedDate?: Date;
  } {
    const { amounts, dates } = pattern;

    // Sort dates
    dates.sort((a, b) => a.getTime() - b.getTime());

    // Calculate intervals between transactions
    const intervals: number[] = [];
    for (let i = 1; i < dates.length; i++) {
      const daysDiff = Math.round(
        (dates[i].getTime() - dates[i - 1].getTime()) / (1000 * 60 * 60 * 24)
      );
      intervals.push(daysDiff);
    }

    // Analyze intervals to determine frequency
    const avgInterval =
      intervals.reduce((sum, int) => sum + int, 0) / intervals.length;
    const stdDev = this.calculateStdDev(intervals);

    // Check if pattern is consistent (low standard deviation)
    const isRecurring = stdDev < avgInterval * 0.3; // 30% tolerance

    let frequency = "unknown";
    let nextExpectedDate: Date | undefined;

    if (isRecurring) {
      if (avgInterval <= 7) {
        frequency = "weekly";
      } else if (avgInterval <= 31) {
        frequency = "monthly";
      } else if (avgInterval <= 93) {
        frequency = "quarterly";
      } else if (avgInterval <= 186) {
        frequency = "semi-annual";
      } else if (avgInterval <= 366) {
        frequency = "annual";
      }

      // Calculate next expected date
      const lastDate = dates[dates.length - 1];
      nextExpectedDate = new Date(lastDate);
      nextExpectedDate.setDate(
        nextExpectedDate.getDate() + Math.round(avgInterval)
      );
    }

    // Calculate average amount
    const averageAmount =
      amounts.reduce((sum, amt) => sum + amt, 0) / amounts.length;

    return {
      isRecurring,
      frequency,
      averageAmount,
      nextExpectedDate,
    };
  }

  private calculateStdDev(values: number[]): number {
    const avg = values.reduce((sum, val) => sum + val, 0) / values.length;
    const squareDiffs = values.map((val) => Math.pow(val - avg, 2));
    const avgSquareDiff =
      squareDiffs.reduce((sum, val) => sum + val, 0) / values.length;
    return Math.sqrt(avgSquareDiff);
  }

  private getAnnualMultiplier(frequency: string): number {
    const multipliers: Record<string, number> = {
      weekly: 52,
      monthly: 12,
      quarterly: 4,
      "semi-annual": 2,
      annual: 1,
      unknown: 12, // Assume monthly if unknown
    };
    return multipliers[frequency] || 12;
  }

  private categorizeRecurringCharges(
    charges: RecurringCharge[]
  ): Record<string, number> {
    const categories: Record<string, number> = {
      subscriptions: 0,
      utilities: 0,
      insurance: 0,
      other: 0,
    };

    charges.forEach((charge) => {
      const lowerName = charge.merchantName.toLowerCase();
      if (
        lowerName.includes("netflix") ||
        lowerName.includes("spotify") ||
        lowerName.includes("youtube") ||
        lowerName.includes("subscription")
      ) {
        categories.subscriptions++;
      } else if (
        lowerName.includes("electric") ||
        lowerName.includes("water") ||
        lowerName.includes("gas") ||
        lowerName.includes("internet")
      ) {
        categories.utilities++;
      } else if (
        lowerName.includes("insurance") ||
        lowerName.includes("ביטוח")
      ) {
        categories.insurance++;
      } else {
        categories.other++;
      }
    });

    return categories;
  }

  private generateRecurringInsights(charges: RecurringCharge[]): string[] {
    const insights: string[] = [];

    // High cost subscriptions
    const highCostMonthly = charges.filter(
      (c) => c.frequency === "monthly" && c.averageAmount > 100
    );
    if (highCostMonthly.length > 0) {
      insights.push(
        `You have ${highCostMonthly.length} monthly subscriptions over ₪100. Consider reviewing these for potential savings.`
      );
    }

    // Unused subscriptions (no recent charges)
    const now = new Date();
    const staleCharges = charges.filter((c) => {
      const lastCharge = new Date(c.lastCharge);
      const daysSince =
        (now.getTime() - lastCharge.getTime()) / (1000 * 60 * 60 * 24);
      return c.frequency === "monthly" && daysSince > 45;
    });
    if (staleCharges.length > 0) {
      insights.push(
        `${staleCharges.length} recurring charges haven't appeared recently. They might be cancelled or on hold.`
      );
    }

    return insights;
  }
}
