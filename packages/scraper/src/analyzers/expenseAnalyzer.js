"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.categorizeExpenses = categorizeExpenses;
exports.identifyTopExpenseCategories = identifyTopExpenseCategories;
exports.identifyUnusualExpenses = identifyUnusualExpenses;
const logger_1 = require("../utils/logger");
function categorizeExpenses(transactions) {
    logger_1.logger.info('Categorizing expense transactions');
    const expenseTransactions = transactions.filter(t => t.isExpense);
    const expensesByCategory = {};
    expenseTransactions.forEach(transaction => {
        const category = transaction.category || 'Uncategorized';
        if (!expensesByCategory[category]) {
            expensesByCategory[category] = {
                total: 0,
                count: 0,
                transactions: []
            };
        }
        expensesByCategory[category].total += Math.abs(transaction.amount);
        expensesByCategory[category].count++;
        expensesByCategory[category].transactions.push(transaction);
    });
    logger_1.logger.info('Expense categorization completed', {
        totalExpenses: Object.values(expensesByCategory).reduce((sum, cat) => sum + cat.total, 0),
        categories: Object.keys(expensesByCategory).length
    });
    return expensesByCategory;
}
function identifyTopExpenseCategories(expenses, limit = 5) {
    const totalExpenses = Object.values(expenses).reduce((sum, cat) => sum + cat.total, 0);
    return Object.entries(expenses)
        .map(([category, data]) => ({
        category,
        amount: data.total,
        percentage: (data.total / totalExpenses) * 100
    }))
        .sort((a, b) => b.amount - a.amount)
        .slice(0, limit);
}
function identifyUnusualExpenses(transactions, threshold = 2) {
    const expenseTransactions = transactions.filter(t => t.isExpense);
    const amounts = expenseTransactions.map(t => Math.abs(t.amount));
    const mean = amounts.reduce((sum, amount) => sum + amount, 0) / amounts.length;
    const variance = amounts.reduce((sum, amount) => {
        const diff = amount - mean;
        return sum + (diff * diff);
    }, 0) / amounts.length;
    const stdDev = Math.sqrt(variance);
    return expenseTransactions.filter(t => {
        const amount = Math.abs(t.amount);
        return amount > (mean + (threshold * stdDev));
    });
}
//# sourceMappingURL=expenseAnalyzer.js.map