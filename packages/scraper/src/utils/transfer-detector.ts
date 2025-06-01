import { Transaction, Account } from '../types';
import { logger } from './logger';

interface TransferPair {
  sourceTransaction: Transaction;
  destinationTransaction: Transaction;
  transferType: 'internal' | 'external';
}

export class TransferDetector {
  private userAccountIds: Set<string>;
  private userAccountNumbers: Map<string, string>; // accountId -> account number
  private userAccountNames: Map<string, string>; // accountId -> account name

  constructor(userAccounts: Account[]) {
    this.userAccountIds = new Set(userAccounts.map(acc => acc.id));
    this.userAccountNumbers = new Map();
    this.userAccountNames = new Map();

    // Build lookup maps for account numbers and names
    userAccounts.forEach(account => {
      // Extract account number from ID (format: provider-accountNumber)
      const accountNumber = account.id.split('-').pop() || '';
      this.userAccountNumbers.set(account.id, accountNumber);
      this.userAccountNames.set(account.id, account.name);
    });

    logger.info('Transfer detector initialized', {
      userAccountCount: userAccounts.length,
      accountIds: Array.from(this.userAccountIds),
    });
  }

  /**
   * Process transactions to detect and mark internal transfers
   */
  processTransactions(transactions: Transaction[]): Transaction[] {
    const processedTransactions = transactions.map(txn => {
      // Check if this transaction is an internal transfer
      const transferInfo = this.detectInternalTransfer(txn);

      if (transferInfo.isInternal) {
        return {
          ...txn,
          category: 'Transfer',
          isInternalTransfer: true,
          transferDetails: transferInfo.details,
        };
      }

      return txn;
    });

    // Log summary
    const internalTransfers = processedTransactions.filter(
      t => t.isInternalTransfer
    );
    logger.info('Transfer detection complete', {
      totalTransactions: transactions.length,
      internalTransfers: internalTransfers.length,
    });

    return processedTransactions;
  }

  /**
   * Detect if a transaction is an internal transfer between user's own accounts
   */
  private detectInternalTransfer(transaction: Transaction): {
    isInternal: boolean;
    details?: {
      targetAccountId?: string;
      targetAccountName?: string;
      direction: 'from' | 'to';
    };
  } {
    const descLower = transaction.description.toLowerCase();

    // First, check if this transaction's account is owned by the user
    if (!this.userAccountIds.has(transaction.accountId)) {
      return { isInternal: false };
    }

    // Look for references to other user accounts in the description
    for (const [
      accountId,
      accountNumber,
    ] of this.userAccountNumbers.entries()) {
      // Skip if checking the same account
      if (accountId === transaction.accountId) continue;

      // Check if the account number appears in the description
      if (accountNumber && descLower.includes(accountNumber)) {
        const direction = transaction.amount < 0 ? 'to' : 'from';
        return {
          isInternal: true,
          details: {
            targetAccountId: accountId,
            targetAccountName: this.userAccountNames.get(accountId),
            direction,
          },
        };
      }
    }

    // Check for provider names in description
    for (const accountId of this.userAccountIds) {
      if (accountId === transaction.accountId) continue;

      const provider = accountId.split('-')[0].toLowerCase();
      const accountName =
        this.userAccountNames.get(accountId)?.toLowerCase() || '';

      // Check if provider or account name appears in description
      if (
        (provider && descLower.includes(provider)) ||
        (accountName && this.containsSignificantPart(descLower, accountName))
      ) {
        const direction = transaction.amount < 0 ? 'to' : 'from';
        return {
          isInternal: true,
          details: {
            targetAccountId: accountId,
            targetAccountName: this.userAccountNames.get(accountId),
            direction,
          },
        };
      }
    }

    // Additional checks for common transfer patterns
    const transferPatterns = [
      /העברה\s+מחשבון\s+(\d+)/,
      /העברה\s+לחשבון\s+(\d+)/,
      /transfer\s+from\s+.*?(\d{4,})/i,
      /transfer\s+to\s+.*?(\d{4,})/i,
    ];

    for (const pattern of transferPatterns) {
      const match = descLower.match(pattern);
      if (match && match[1]) {
        // Check if the matched number belongs to a user account
        for (const [
          accountId,
          accountNumber,
        ] of this.userAccountNumbers.entries()) {
          if (
            accountNumber.includes(match[1]) ||
            match[1].includes(accountNumber)
          ) {
            const direction = transaction.amount < 0 ? 'to' : 'from';
            return {
              isInternal: true,
              details: {
                targetAccountId: accountId,
                targetAccountName: this.userAccountNames.get(accountId),
                direction,
              },
            };
          }
        }
      }
    }

    return { isInternal: false };
  }

  /**
   * Check if a text contains a significant part of another text
   * (to handle partial account name matches)
   */
  private containsSignificantPart(text: string, searchTerm: string): boolean {
    if (!searchTerm || searchTerm.length < 3) return false;

    // Split by common separators and check each part
    const parts = searchTerm.split(/[\s-_]+/).filter(p => p.length > 2);

    // If at least half of the parts are found, consider it a match
    const foundParts = parts.filter(part => text.includes(part));
    return foundParts.length >= Math.ceil(parts.length / 2);
  }

  /**
   * Find paired internal transfers (both sides of the same transfer)
   */
  findTransferPairs(transactions: Transaction[]): TransferPair[] {
    const pairs: TransferPair[] = [];
    const processedIds = new Set<string>();

    // Only look at transactions marked as internal transfers
    const internalTransfers = transactions.filter(t => t.isInternalTransfer);

    for (let i = 0; i < internalTransfers.length; i++) {
      const txn = internalTransfers[i];
      if (processedIds.has(txn.id)) continue;

      // Look for the matching transaction in the opposite direction
      const targetAccountId = txn.transferDetails?.targetAccountId;
      if (!targetAccountId) continue;

      const oppositeTxn = internalTransfers.find(t => {
        if (t.id === txn.id || processedIds.has(t.id)) return false;

        // Check if it's from the target account
        if (t.accountId !== targetAccountId) return false;

        // Check if amounts match (opposite signs)
        if (Math.abs(Math.abs(t.amount) - Math.abs(txn.amount)) > 0.01)
          return false;

        // Check if dates are close (within 3 days)
        const daysDiff = Math.abs(
          (new Date(t.date).getTime() - new Date(txn.date).getTime()) /
            (1000 * 60 * 60 * 24)
        );

        return daysDiff <= 3;
      });

      if (oppositeTxn) {
        const source = txn.amount < 0 ? txn : oppositeTxn;
        const destination = txn.amount > 0 ? txn : oppositeTxn;

        pairs.push({
          sourceTransaction: source,
          destinationTransaction: destination,
          transferType: 'internal',
        });

        processedIds.add(txn.id);
        processedIds.add(oppositeTxn.id);
      }
    }

    return pairs;
  }

  /**
   * Get statistics about internal transfers
   */
  getTransferStats(transactions: Transaction[]): {
    totalInternalTransfers: number;
    totalInternalAmount: number;
    transfersByAccount: Record<string, { count: number; amount: number }>;
  } {
    const internalTransfers = transactions.filter(t => t.isInternalTransfer);

    const transfersByAccount: Record<
      string,
      { count: number; amount: number }
    > = {};
    let totalAmount = 0;

    internalTransfers.forEach(txn => {
      const targetAccountId = txn.transferDetails?.targetAccountId || 'unknown';

      if (!transfersByAccount[targetAccountId]) {
        transfersByAccount[targetAccountId] = { count: 0, amount: 0 };
      }

      transfersByAccount[targetAccountId].count++;
      transfersByAccount[targetAccountId].amount += Math.abs(txn.amount);
      totalAmount += Math.abs(txn.amount);
    });

    return {
      totalInternalTransfers: internalTransfers.length,
      totalInternalAmount: totalAmount,
      transfersByAccount,
    };
  }
}
