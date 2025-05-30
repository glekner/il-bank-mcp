"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.categorizeIncome = categorizeIncome;
exports.identifyRegularIncomeSources = identifyRegularIncomeSources;
const logger_1 = require("../utils/logger");
function categorizeIncome(transactions) {
    logger_1.logger.info('Categorizing income transactions');
    const incomeTransactions = transactions.filter(t => t.isIncome);
    const incomeByCategory = {};
    incomeTransactions.forEach(transaction => {
        const category = transaction.category || 'Uncategorized';
        if (!incomeByCategory[category]) {
            incomeByCategory[category] = {
                total: 0,
                count: 0,
                transactions: []
            };
        }
        incomeByCategory[category].total += transaction.amount;
        incomeByCategory[category].count++;
        incomeByCategory[category].transactions.push(transaction);
    });
    logger_1.logger.info('Income categorization completed', {
        totalIncome: Object.values(incomeByCategory).reduce((sum, cat) => sum + cat.total, 0),
        categories: Object.keys(incomeByCategory).length
    });
    return incomeByCategory;
}
function identifyRegularIncomeSources(transactions) {
    const incomeTransactions = transactions.filter(t => t.isIncome);
    const regularSources = {};
    const descriptionGroups = {};
    incomeTransactions.forEach(transaction => {
        const normalizedDesc = transaction.description
            .replace(/\d{1,2}\/\d{1,2}\/\d{2,4}/g, '')
            .replace(/\d{4,}/g, '')
            .trim();
        if (!descriptionGroups[normalizedDesc]) {
            descriptionGroups[normalizedDesc] = [];
        }
        descriptionGroups[normalizedDesc].push(transaction);
    });
    Object.entries(descriptionGroups).forEach(([desc, txns]) => {
        const uniqueMonths = new Set(txns.map(t => t.month));
        if (uniqueMonths.size >= 2) {
            regularSources[desc] = txns;
        }
    });
    return regularSources;
}
//# sourceMappingURL=incomeAnalyzer.js.map