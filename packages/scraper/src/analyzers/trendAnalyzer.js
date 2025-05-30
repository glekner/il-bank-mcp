"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyzeFinancialTrends = analyzeFinancialTrends;
exports.identifyRecurringTransactions = identifyRecurringTransactions;
const transactionProcessor_1 = require("../processors/transactionProcessor");
const logger_1 = require("../utils/logger");
function analyzeFinancialTrends(transactions) {
    logger_1.logger.info('Analyzing financial trends');
    const transactionsByMonth = (0, transactionProcessor_1.groupTransactionsByPeriod)(transactions, 'month');
    const trends = Object.entries(transactionsByMonth)
        .map(([month, monthTransactions]) => {
        const income = monthTransactions
            .filter(t => t.isIncome)
            .reduce((sum, t) => sum + t.amount, 0);
        const expenses = Math.abs(monthTransactions
            .filter(t => t.isExpense)
            .reduce((sum, t) => sum + t.amount, 0));
        const balance = income - expenses;
        const categories = {};
        monthTransactions.forEach(transaction => {
            const category = transaction.category;
            if (!categories[category]) {
                categories[category] = 0;
            }
            categories[category] += Math.abs(transaction.amount);
        });
        return {
            period: month,
            income,
            expenses,
            balance,
            categories
        };
    })
        .sort((a, b) => a.period.localeCompare(b.period));
    logger_1.logger.info('Financial trend analysis completed', { periodCount: trends.length });
    return trends;
}
function identifyRecurringTransactions(transactions) {
    const recurringGroups = {};
    const descriptionCounts = {};
    transactions.forEach(transaction => {
        const normalizedDesc = transaction.description
            .replace(/\d{1,2}\/\d{1,2}\/\d{2,4}/g, '')
            .replace(/\d{4,}/g, '')
            .trim();
        if (!descriptionCounts[normalizedDesc]) {
            descriptionCounts[normalizedDesc] = 0;
        }
        descriptionCounts[normalizedDesc]++;
    });
    Object.keys(descriptionCounts).forEach(desc => {
        if (descriptionCounts[desc] >= 2) {
            const matchingTransactions = transactions.filter(t => t.description.includes(desc) || desc.includes(t.description));
            if (matchingTransactions.length >= 2) {
                recurringGroups[desc] = matchingTransactions;
            }
        }
    });
    return recurringGroups;
}
//# sourceMappingURL=trendAnalyzer.js.map