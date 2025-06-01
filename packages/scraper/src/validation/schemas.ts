import { z } from 'zod/v4';

// Service type enum
const ServiceTypeEnum = z.enum(['leumi', 'visaCal', 'max']);

// Transaction schema with strict validation
export const TransactionSchema = z
  .object({
    identifier: z.string().min(1, 'Transaction ID required'),
    date: z
      .union([z.date(), z.string()])
      .transform(val => (typeof val === 'string' ? new Date(val) : val)),
    chargedAmount: z.number().finite('Amount must be finite'),
    chargedCurrency: z.string().default('ILS'),
    originalAmount: z.number().optional(),
    originalCurrency: z.string().optional(),
    description: z.string().min(1, 'Description required'),
    memo: z.string().optional(),
    category: z.string().optional(),
    accountId: z.string().min(1, 'Account ID required'),
    serviceType: ServiceTypeEnum,
    status: z.enum(['pending', 'completed']).default('completed'),
  })
  .refine(
    data => data.date <= new Date(),
    'Transaction date cannot be in the future'
  );

// Account schema
export const AccountSchema = z.object({
  accountId: z.string().min(1, 'Account ID required'),
  accountNumber: z.string(),
  accountName: z.string(),
  serviceType: ServiceTypeEnum,
  balance: z.number().finite('Balance must be finite').optional(),
  creditLimit: z.number().finite().optional(),
  creditUsed: z.number().finite().optional(),
  currency: z.string().default('ILS'),
  isActive: z.boolean().default(true),
  lastUpdated: z.date().optional(),
});

// Scraped data schema
export const ScrapedAccountDataSchema = z
  .object({
    accounts: z.array(AccountSchema),
    transactions: z.array(TransactionSchema),
    rawData: z.any().optional(), // Keep raw data for debugging
    scrapedAt: z.date(),
  })
  .refine(data => {
    // Ensure all transactions have valid account IDs
    const accountIds = new Set(data.accounts.map(a => a.accountId));
    return data.transactions.every(t => accountIds.has(t.accountId));
  }, 'All transactions must belong to valid accounts');

// Batch validation result
export const ValidationResultSchema = z.object({
  valid: z.array(z.any()),
  invalid: z.array(
    z.object({
      data: z.any(),
      errors: z.array(z.string()),
    })
  ),
});

// Helper function to validate with detailed errors
export function validateScrapedData(data: unknown) {
  try {
    return {
      success: true,
      data: ScrapedAccountDataSchema.parse(data),
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        errors: error.issues.map(e => ({
          path: e.path.join('.'),
          message: e.message,
        })),
      };
    }
    throw error;
  }
}
