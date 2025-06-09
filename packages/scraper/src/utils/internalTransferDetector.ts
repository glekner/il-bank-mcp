import { Transaction } from '../types';
import { logger } from './logger';

interface TransferCandidate {
  transaction: Transaction;
  amount: number;
  date: Date;
  normalizedDescription: string;
}

/**
 * Detects internal transfers between accounts
 * Returns a Map of transaction IDs to their matching transfer transaction IDs
 */
export function detectInternalTransfers(
  transactions: Transaction[]
): Map<string, string> {
  logger.info('Detecting internal transfers', {
    transactionCount: transactions.length,
  });

  const transferPairs = new Map<string, string>();

  // Group transactions by date (within 3 days tolerance) and amount
  const candidates: TransferCandidate[] = transactions
    .filter(txn => txn.identifier !== undefined) // Filter out transactions without identifiers
    .map(txn => ({
      transaction: txn,
      amount: txn.chargedAmount ?? txn.originalAmount ?? 0,
      date: new Date(txn.date),
      normalizedDescription: normalizeDescription(txn.description),
    }));

  // Sort by date for efficient comparison
  candidates.sort((a, b) => a.date.getTime() - b.date.getTime());

  // Find matching pairs
  for (let i = 0; i < candidates.length; i++) {
    const candidate = candidates[i];
    const candidateId = String(candidate.transaction.identifier);

    // Skip if already identified as a transfer
    if (transferPairs.has(candidateId)) continue;

    // Look for matching opposite transaction within time window
    for (let j = i + 1; j < candidates.length; j++) {
      const potentialMatch = candidates[j];
      const potentialMatchId = String(potentialMatch.transaction.identifier);

      // Skip if already identified as a transfer
      if (transferPairs.has(potentialMatchId)) continue;

      // Check if outside time window (3 days)
      const timeDiff = Math.abs(
        candidate.date.getTime() - potentialMatch.date.getTime()
      );
      if (timeDiff > 3 * 24 * 60 * 60 * 1000) break;

      // Check if amounts match (opposite signs)
      if (candidate.amount + potentialMatch.amount !== 0) continue;

      // Check if different accounts
      if (
        candidate.transaction.accountId === potentialMatch.transaction.accountId
      ) {
        continue;
      }

      // Check for common transfer indicators
      if (isLikelyTransferPair(candidate, potentialMatch)) {
        transferPairs.set(candidateId, potentialMatchId);
        transferPairs.set(potentialMatchId, candidateId);

        logger.debug('Found internal transfer pair', {
          transaction1: {
            id: candidateId,
            amount: candidate.amount,
            account: candidate.transaction.accountId,
            description: candidate.transaction.description,
          },
          transaction2: {
            id: potentialMatchId,
            amount: potentialMatch.amount,
            account: potentialMatch.transaction.accountId,
            description: potentialMatch.transaction.description,
          },
        });

        break;
      }
    }
  }

  logger.info('Internal transfer detection completed', {
    pairsFound: transferPairs.size / 2,
  });

  return transferPairs;
}

function normalizeDescription(description: string): string {
  return description.toLowerCase().replace(/\s+/g, ' ').trim();
}

function isLikelyTransferPair(
  candidate1: TransferCandidate,
  candidate2: TransferCandidate
): boolean {
  const desc1 = candidate1.normalizedDescription;
  const desc2 = candidate2.normalizedDescription;

  // Common transfer indicators in Hebrew
  const transferKeywords = [
    'העברה',
    'הוראת קבע',
    'בין חשבונות',
    'transfer',
    'standing order',
  ];

  // Check if both have transfer keywords
  const hasTransferKeyword1 = transferKeywords.some(keyword =>
    desc1.includes(keyword)
  );
  const hasTransferKeyword2 = transferKeywords.some(keyword =>
    desc2.includes(keyword)
  );

  // Both should have transfer indicators or very similar descriptions
  if (hasTransferKeyword1 && hasTransferKeyword2) {
    return true;
  }

  // Check memo fields for account references
  const memo1 = candidate1.transaction.memo?.toLowerCase() || '';
  const memo2 = candidate2.transaction.memo?.toLowerCase() || '';

  // Check if memo contains account number references
  if (memo1.includes('העברה') || memo2.includes('העברה')) {
    return true;
  }

  // Check for exact description match (common for standing orders)
  if (desc1 === desc2) {
    return true;
  }

  return false;
}
