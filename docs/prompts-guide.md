# Israeli Bank Assistant MCP Prompts Guide

## Overview

The Israeli Bank Assistant MCP server implements the Model Context Protocol's prompts feature to provide structured, consistent financial advisory interactions. This guide explains how prompts work and how to use them effectively.

## Important: Instructions vs Prompts

**Server Instructions** (defined in server initialization):

- Automatically loaded when MCP connects
- Provides general context about the server
- Always active throughout the session
- Guides overall behavior

**Prompts** (what this guide covers):

- User-triggered templates
- Specific financial workflows
- Activated via slash commands
- Task-focused interactions

## What are MCP Prompts?

MCP prompts are pre-defined templates that:

- Ensure consistent, high-quality interactions
- Guide the AI assistant's behavior and responses
- Can accept dynamic arguments to customize the interaction
- Are user-controlled and typically exposed as slash commands or menu items

## Available Prompts

### Financial Advisor Context (`/financial_advisor_context`)

Activates a comprehensive financial advisor persona with full context about capabilities.

**Purpose**: When you want the AI to take on the full financial advisor role with detailed understanding of all available tools and approaches.

**Best for**: Starting a financial advisory session, resetting context, or when you want comprehensive guidance

### Financial Review (`/financial_review`)

Provides comprehensive monthly analysis including:

- Income vs expenses
- Spending trends
- Anomaly detection
- Personalized recommendations

**Best for**: Monthly financial check-ins, understanding spending patterns

### Budget Planning (`/budget_planning`)

Creates personalized budgets with:

- Category-based allocation
- Savings goal achievement plans
- Spending reduction strategies

**Best for**: Setting financial goals, creating sustainable budgets

### Subscription Audit (`/subscription_audit`)

Identifies all recurring charges and:

- Categorizes by necessity
- Finds unused services
- Calculates total recurring costs

**Best for**: Reducing monthly expenses, finding forgotten subscriptions

### Spending Optimization (`/spending_optimization`)

Analyzes spending patterns to:

- Identify cost reduction opportunities
- Suggest merchant alternatives
- Calculate potential savings

**Best for**: Quick wins in expense reduction

### Fraud Detection (`/fraud_detection`)

Scans transactions for:

- Unusual patterns
- Suspicious merchants
- Duplicate charges
- Geographic anomalies

**Best for**: Security checks, peace of mind

### Tax Preparation (`/tax_preparation`)

Organizes financial data for taxes:

- Categorizes deductible expenses
- Summarizes income sources
- Identifies documentation needs

**Best for**: Tax season preparation, maximizing deductions

### Emergency Fund Analysis (`/emergency_fund_analysis`)

Evaluates savings adequacy:

- Calculates essential expenses
- Recommends fund size
- Creates savings plan

**Best for**: Financial security planning

### Debt Optimization (`/debt_optimization`)

Analyzes credit card usage:

- Prioritizes high-interest debt
- Suggests payment strategies
- Identifies balance transfer opportunities

**Best for**: Debt reduction, credit score improvement

## How Prompts Work with Tools

Prompts and tools work together seamlessly:

1. **Prompt triggers analysis** → The prompt template guides the interaction
2. **Tools fetch data** → Real-time data is retrieved using MCP tools
3. **AI processes information** → Combines prompt guidance with actual data
4. **Personalized response** → Delivers insights specific to your situation

Example flow:

```
User: /financial_review month=2024-11
→ Prompt provides structure
→ Tools fetch November transactions, balances, and trends
→ AI analyzes data following prompt guidelines
→ User receives comprehensive November financial review
```

## Best Practices

### 1. Start with System Context

The system prompt automatically establishes the assistant's expertise and approach. You don't need to explain what the assistant can do.

### 2. Use Prompts for Structure

Instead of asking open-ended questions, use prompts to ensure comprehensive analysis:

- ❌ "How am I doing financially?"
- ✅ `/financial_review` - Gets structured, comprehensive analysis

### 3. Provide Arguments When Relevant

Many prompts accept arguments to customize the analysis:

```
/budget_planning savings_goal_percentage=30 focus_categories=dining,entertainment
/fraud_detection sensitivity=high
/tax_preparation tax_year=2024
```

### 4. Combine Prompts for Deeper Insights

Use multiple prompts in sequence:

1. `/financial_review` - Get overall picture
2. `/spending_optimization` - Find savings opportunities
3. `/budget_planning` - Create action plan

### 5. Regular Check-ins

Schedule regular prompt usage:

- **Weekly**: `/fraud_detection` for security
- **Monthly**: `/financial_review` for trends
- **Quarterly**: `/subscription_audit` for recurring charges
- **Annually**: `/tax_preparation` for tax planning

## Integration with Claude Desktop

When using with Claude Desktop, prompts appear as slash commands. Simply type `/` to see available prompts and their descriptions.

The system prompt is automatically applied when the MCP server connects, establishing Claude as your Israeli financial advisor.

## Privacy and Security

All prompts are designed with privacy in mind:

- Data stays within your session
- No financial information is stored by the AI
- Account numbers are never fully exposed
- Focus is on patterns, not raw data exposure

## Troubleshooting

### Prompt Not Found

Ensure the MCP server is properly connected. Check Claude Desktop logs for connection status.

### Empty Results

If a prompt returns no data:

1. Check if data has been scraped recently with `/get_scrape_status`
2. Refresh data with `/refresh_all_data` tool
3. Retry the prompt

### Unexpected Behavior

The system prompt should guide consistent behavior. If responses seem off:

1. Restart the MCP server connection
2. Ensure you're using the latest server version
3. Check that environment variables are properly set

## Future Enhancements

Planned prompt improvements:

- Investment analysis prompts
- Goal tracking prompts
- Comparative analysis (year-over-year)
- Custom alert configuration
- Multi-account family budgeting

## Conclusion

MCP prompts transform the Israeli Bank Assistant from a simple data retrieval tool into an intelligent financial advisor. By combining structured prompts with real-time data access, you get personalized, actionable financial guidance tailored to your specific situation.
