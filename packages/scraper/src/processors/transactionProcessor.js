"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.processTransactions = processTransactions;
exports.filterTransactionsByDateRange = filterTransactionsByDateRange;
exports.groupTransactionsByPeriod = groupTransactionsByPeriod;
const logger_1 = require("../utils/logger");
function processTransactions(transactions) {
    logger_1.logger.info('Processing transactions', { count: transactions.length });
    return transactions.map(transaction => {
        const isExpense = transaction.amount < 0;
        const isIncome = transaction.amount > 0;
        const month = `${transaction.date.getFullYear()}-${String(transaction.date.getMonth() + 1).padStart(2, '0')}`;
        return {
            ...transaction,
            isExpense,
            isIncome,
            month
        };
    }).sort((a, b) => b.date.getTime() - a.date.getTime());
}
function filterTransactionsByDateRange(transactions, startDate, endDate) {
    return transactions.filter(transaction => {
        const txnDate = transaction.date.getTime();
        return txnDate >= startDate.getTime() && txnDate <= endDate.getTime();
    });
}
function groupTransactionsByPeriod(transactions, period = 'month') {
    const grouped = {};
    transactions.forEach(transaction => {
        let key;
        if (period === 'day') {
            key = transaction.date.toISOString().split('T')[0];
        }
        else if (period === 'week') {
            const date = new Date(transaction.date);
            const day = date.getDay();
            const diff = date.getDate() - day + (day === 0 ? -6 : 1);
            const weekStart = new Date(date.setDate(diff));
            key = weekStart.toISOString().split('T')[0];
        }
        else {
            key = transaction.month;
        }
        if (!grouped[key]) {
            grouped[key] = [];
        }
        grouped[key].push(transaction);
    });
    return grouped;
}
//# sourceMappingURL=transactionProcessor.js.map