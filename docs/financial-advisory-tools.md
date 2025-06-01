# Financial Advisory Tools

This MCP server provides sophisticated financial advisory tools that leverage Israeli bank scraping data to provide actionable insights and recommendations.

## Overview

The financial advisory tools go beyond basic transaction retrieval to provide:

- **Spending Analysis**: Deep insights into spending patterns and habits
- **Recurring Charge Detection**: Automatic identification of subscriptions and regular payments
- **Budget Recommendations**: Personalized budgeting advice based on income and spending
- **Anomaly Detection**: Alerts for unusual transactions or potential fraud
- **Tax Preparation**: Organized transaction data for tax purposes
- **Financial Health Scoring**: Comprehensive assessment of financial wellness

## Available Tools

### 1. Monthly Credit Card Summary (`get_monthly_credit_summary`)

Get a comprehensive summary of credit card spending for any month.

**Parameters:**

- `month` (optional): Month number (1-12), defaults to current month
- `year` (optional): Year (YYYY), defaults to current year
- `includeCategories` (optional): Include spending breakdown by category

**Returns:**

- Summary for each credit card including total spent, transaction count, average transaction
- Category breakdown (if requested)
- Grand totals across all cards

**Example Use Case:**
"Show me how much I spent on each credit card this month"

### 2. Recurring Charges Detection (`get_recurring_charges`)

Automatically identify and analyze recurring subscriptions, memberships, and regular payments.

**Parameters:**

- `minOccurrences` (optional): Minimum occurrences to consider recurring (default: 2)
- `lookbackMonths` (optional): Number of months to analyze (default: 6)

**Returns:**

- List of detected recurring charges with frequency and amounts
- Next expected charge dates
- Total monthly and annual recurring costs
- Insights about potentially unused subscriptions

**Example Use Case:**
"What subscriptions am I paying for and how much do they cost me annually?"

### 3. Spending Insights (`get_spending_insights`)

Get AI-powered insights about spending patterns, unusual transactions, and savings opportunities.

**Parameters:**

- `startDate`: Start date for analysis
- `endDate`: End date for analysis
- `categories` (optional): Specific categories to focus on

**Returns:**

- Spending trends and patterns
- Anomalies and unusual transactions
- Opportunities to save money
- Positive achievements and improvements

**Example Use Case:**
"Give me insights about my spending habits over the last 3 months"

### 4. Cash Flow Analysis (`get_cashflow_analysis`)

Analyze cash flow patterns and project future balances based on historical data.

**Parameters:**

- `lookbackDays` (optional): Days to analyze (default: 90)
- `forecastDays` (optional): Days to forecast (default: 30)
- `includeRecurring` (optional): Include recurring transactions in forecast

**Returns:**

- Daily cash flow data showing income vs expenses
- Balance trends over time
- Projected future balances
- Key insights about cash flow patterns

**Example Use Case:**
"Show me my cash flow for the last 3 months and predict next month"

### 5. Compare Spending Periods (`compare_spending_periods`)

Compare spending between two time periods to identify trends and changes.

**Parameters:**

- `period1Start`: Start of first period
- `period1End`: End of first period
- `period2Start`: Start of second period
- `period2End`: End of second period
- `groupBy` (optional): How to group data (category/merchant/account/day_of_week)

**Returns:**

- Side-by-side comparison of spending
- Percentage changes between periods
- Breakdown by selected grouping
- Key differences highlighted

**Example Use Case:**
"Compare my spending this month vs last month by category"

### 6. Merchant Analysis (`get_merchant_analysis`)

Analyze spending by merchant to identify top vendors and optimization opportunities.

**Parameters:**

- `startDate`: Start date for analysis
- `endDate`: End date for analysis
- `topN` (optional): Number of top merchants (default: 20)
- `minTransactions` (optional): Minimum transactions to include (default: 2)

**Returns:**

- Top merchants by total spending
- Transaction frequency per merchant
- Spending trends per merchant
- Recommendations for consolidation

**Example Use Case:**
"Show me my top 10 merchants by spending in the last 6 months"

### 7. Budget Recommendations (`get_budget_recommendations`)

Get personalized budget recommendations based on income and spending patterns.

**Parameters:**

- `monthlyIncome` (optional): Expected monthly income
- `savingsGoalPercent` (optional): Desired savings rate (default: 20%)
- `essentialCategories` (optional): Categories considered essential

**Returns:**

- Recommended budget per category
- Current vs recommended spending
- Potential savings opportunities
- Actionable tips for each category

**Example Use Case:**
"Create a budget for me that allows me to save 25% of my income"

### 8. Anomaly Alerts (`get_anomaly_alerts`)

Detect unusual transactions, spending spikes, or potential fraud.

**Parameters:**

- `sensitivityLevel` (optional): Detection sensitivity (low/medium/high)
- `checkTypes` (optional): Types of anomalies to check
- `lookbackDays` (optional): Historical period for pattern learning

**Returns:**

- List of detected anomalies with severity levels
- Detailed reasons for each alert
- Affected transactions
- Recommended actions

**Example Use Case:**
"Alert me to any unusual or suspicious transactions"

### 9. Tax Summary (`get_tax_summary`)

Generate organized transaction data for tax preparation.

**Parameters:**

- `year` (optional): Tax year (defaults to current)
- `deductibleCategories` (optional): Categories that may be deductible
- `includeReceipts` (optional): Include transaction details

**Returns:**

- Categorized transaction summary
- Total amounts per category
- Deductible expense tracking
- Export-ready format for tax software

**Example Use Case:**
"Prepare a summary of my deductible expenses for 2024 taxes"

### 10. Financial Health Score (`get_financial_health_score`)

Calculate a comprehensive financial health score with actionable feedback.

**Parameters:**

- `includeDetails` (optional): Include component breakdown
- `customWeights` (optional): Custom scoring weights

**Returns:**

- Overall score (0-100) and letter grade
- Component scores (savings, spending control, etc.)
- Identified strengths
- Areas for improvement with specific recommendations

**Example Use Case:**
"Rate my financial health and tell me how to improve it"

## Implementation Best Practices

### Data Privacy

- All analysis is performed locally on scraped data
- No data is sent to external services
- Sensitive information is properly handled

### Performance Optimization

- Efficient algorithms for pattern detection
- Caching of computed results where appropriate
- Incremental analysis capabilities

### Accuracy Considerations

- Pattern detection uses statistical methods
- Recommendations are based on general financial principles
- Users should review all insights before making decisions

## Integration Examples

### With AI Assistants

```javascript
// Example: Getting monthly summary via AI assistant
const result = await assistant.callTool('get_monthly_credit_summary', {
  month: 10,
  year: 2024,
  includeCategories: true,
});
```

### Automation Workflows

- Set up monthly budget review reminders
- Alert on new recurring charges detected
- Weekly financial health check-ins
- Quarterly spending comparisons

## Future Enhancements

Planned additions include:

- Goal tracking and progress monitoring
- Investment recommendation integration
- Multi-currency support
- Family/shared account analysis
- Custom alert configurations
- Export to popular budgeting apps
