import type { Prompt } from '@modelcontextprotocol/sdk/types.js';

// Define proper types for prompt content
interface PromptContent {
  type: 'text';
  text: string;
}

interface PromptMessage {
  role: 'user';
  content: PromptContent;
}

export const FINANCIAL_ADVISOR_PROMPT = `You are the Israeli Bank Assistant, a sophisticated financial advisory AI powered by real-time bank and credit card data from Israeli financial institutions.

## Your Capabilities

You have access to comprehensive financial data through the following tools:

### Banking Operations
- **get_transactions**: Retrieve bank and credit card transactions with filtering options
- **get_accounts**: List all accounts with current balances  
- **get_account_balance_history**: Track balance changes over time
- **refresh_all_data**: Update data from all financial institutions
- **refresh_service_data**: Update data from specific services (Leumi, Visa Cal, Max)
- **get_scrape_status**: Check data freshness and scraping status

### Financial Analysis Tools
- **get_financial_summary**: Get comprehensive financial analysis including trends, income, and expenses
- **get_monthly_credit_summary**: Analyze credit card spending patterns by month
- **get_recurring_charges**: Detect and analyze subscriptions and recurring payments

## Your Approach

1. **Proactive Analysis**: Don't just answer questions - identify opportunities for financial improvement
2. **Personalized Advice**: Tailor recommendations to the user's specific financial situation
3. **Data-Driven Insights**: Base all advice on actual transaction data and spending patterns
4. **Holistic View**: Consider all aspects of financial health - income, expenses, savings, and investments
5. **Actionable Recommendations**: Provide specific, implementable steps for improvement

## Privacy & Security Guidelines

- Never store or share personal financial data outside the session
- Respect the confidential nature of financial information
- Use account IDs rather than full account numbers when referencing accounts
- Focus on patterns and insights rather than exposing raw sensitive data

## Communication Style

- Be professional yet approachable
- Use clear, jargon-free language
- Break down complex financial concepts into understandable terms
- Provide context for your recommendations
- Be empathetic to financial concerns and stress

## Example Interactions

- "I notice you have 3 recurring charges to streaming services totaling ₪150/month. Would you like me to review if you're using all of them?"
- "Your spending has increased by 23% compared to last month, primarily in the dining category. Let's explore some budgeting strategies."
- "I can help you analyze your credit card spending patterns and identify areas for potential savings."

Remember: You're not just a data retrieval tool - you're a trusted financial advisor helping users achieve their financial goals.`;

export const PROMPTS: Record<string, Prompt> = {
  financial_advisor_context: {
    name: 'financial_advisor_context',
    description:
      'Activate the full financial advisor persona with comprehensive context about your capabilities and approach',
    arguments: [],
  },
  financial_review: {
    name: 'financial_review',
    description: 'Comprehensive monthly financial review and recommendations',
    arguments: [
      {
        name: 'month',
        description: 'Month to review (YYYY-MM format)',
        required: false,
      },
    ],
  },
  budget_planning: {
    name: 'budget_planning',
    description:
      'Create a personalized budget plan based on income and spending patterns',
    arguments: [
      {
        name: 'savings_goal_percentage',
        description: 'Desired savings percentage (0-100)',
        required: false,
      },
      {
        name: 'focus_categories',
        description: 'Comma-separated spending categories to optimize',
        required: false,
      },
    ],
  },
  subscription_audit: {
    name: 'subscription_audit',
    description:
      'Comprehensive audit of all recurring charges and subscriptions',
    arguments: [],
  },
  spending_optimization: {
    name: 'spending_optimization',
    description:
      'Analyze spending patterns and suggest optimization strategies',
    arguments: [
      {
        name: 'time_period_days',
        description: 'Number of days to analyze (default: 30)',
        required: false,
      },
    ],
  },
  fraud_detection: {
    name: 'fraud_detection',
    description: 'Scan for suspicious transactions and potential fraud',
    arguments: [
      {
        name: 'sensitivity',
        description:
          'Detection sensitivity: low, medium, or high (default: medium)',
        required: false,
      },
    ],
  },
  tax_preparation: {
    name: 'tax_preparation',
    description: 'Generate tax-relevant summaries and deduction opportunities',
    arguments: [
      {
        name: 'tax_year',
        description: 'Tax year to prepare for (YYYY format)',
        required: false,
      },
    ],
  },
  emergency_fund_analysis: {
    name: 'emergency_fund_analysis',
    description: 'Analyze emergency fund adequacy and savings recommendations',
    arguments: [],
  },
  debt_optimization: {
    name: 'debt_optimization',
    description:
      'Analyze credit card usage and suggest debt reduction strategies',
    arguments: [],
  },
};

export const PROMPT_TEMPLATES: Record<
  string,
  (args: Record<string, unknown>) => PromptMessage[]
> = {
  financial_advisor_context: () => [
    {
      role: 'user',
      content: {
        type: 'text',
        text: FINANCIAL_ADVISOR_PROMPT,
      },
    },
  ],

  financial_review: (args: { month?: string }) => {
    const month = args.month || 'the current month';
    return [
      {
        role: 'user',
        content: {
          type: 'text',
          text: `Please provide a comprehensive financial review for ${month}. Include:
          
1. Overall financial summary and health score
2. Income vs expenses analysis  
3. Spending trends and patterns
4. Comparison with previous periods
5. Detected anomalies or concerns
6. Top spending categories and merchants
7. Recurring charges summary
8. Specific recommendations for improvement
9. Budget vs actual (if applicable)
10. Cash flow forecast for next month`,
        },
      },
    ];
  },

  budget_planning: (args: {
    savings_goal_percentage?: string;
    focus_categories?: string;
  }) => {
    const savingsGoal = args.savings_goal_percentage
      ? `${args.savings_goal_percentage}%`
      : 'an appropriate amount';
    const categories = args.focus_categories || 'all categories';

    return [
      {
        role: 'user',
        content: {
          type: 'text',
          text: `Create a personalized budget plan with the following requirements:

- Target savings: ${savingsGoal} of income
- Focus on optimizing: ${categories}

Please analyze my income and spending patterns, then provide:
1. Recommended budget allocation by category
2. Specific areas where I can reduce spending
3. Comparison of my spending to typical benchmarks
4. Actionable steps to achieve the savings goal
5. Timeline and milestones for implementation`,
        },
      },
    ];
  },

  subscription_audit: () => [
    {
      role: 'user',
      content: {
        type: 'text',
        text: `Perform a comprehensive audit of all my recurring charges and subscriptions:

1. List all detected recurring charges
2. Categorize them (essential vs non-essential)
3. Identify potentially unused or duplicate services
4. Calculate total monthly/annual cost
5. Suggest optimization opportunities
6. Highlight any suspicious recurring charges
7. Compare costs to alternatives
8. Provide cancellation impact analysis`,
      },
    },
  ],

  spending_optimization: (args: { time_period_days?: string }) => {
    const days = args.time_period_days || '30';

    return [
      {
        role: 'user',
        content: {
          type: 'text',
          text: `Analyze my spending over the last ${days} days and provide optimization strategies:

1. Identify top spending categories and patterns
2. Find opportunities for cost reduction
3. Suggest alternative merchants/services for better value
4. Analyze spending velocity and timing patterns
5. Recommend specific behavior changes
6. Calculate potential monthly savings
7. Provide implementation priority list
8. Include quick wins vs long-term changes`,
        },
      },
    ];
  },

  fraud_detection: (args: { sensitivity?: string }) => {
    const sensitivity = args.sensitivity || 'medium';

    return [
      {
        role: 'user',
        content: {
          type: 'text',
          text: `Perform a ${sensitivity}-sensitivity fraud detection scan on my recent transactions:

1. Identify unusual transaction patterns or amounts
2. Flag transactions from new or suspicious merchants
3. Detect duplicate or near-duplicate charges
4. Check for unauthorized recurring charges
5. Analyze geographic anomalies
6. Review card-not-present transactions
7. Highlight weekend/off-hours unusual activity
8. Provide action steps for any concerns found`,
        },
      },
    ];
  },

  tax_preparation: (args: { tax_year?: string }) => {
    const year = args.tax_year || new Date().getFullYear().toString();

    return [
      {
        role: 'user',
        content: {
          type: 'text',
          text: `Help me prepare for ${year} taxes with a comprehensive analysis:

1. Categorize all transactions by tax relevance
2. Identify potential business expense deductions
3. Highlight charitable donations
4. Summarize medical expenses
5. Track home office expenses (if applicable)
6. Calculate total income from all sources
7. Identify missing receipts or documentation needs
8. Provide monthly/quarterly tax payment recommendations
9. Suggest year-end tax optimization strategies`,
        },
      },
    ];
  },

  emergency_fund_analysis: () => [
    {
      role: 'user',
      content: {
        type: 'text',
        text: `Analyze my emergency fund readiness and provide recommendations:

1. Calculate my average monthly essential expenses
2. Assess current savings and liquid assets
3. Determine recommended emergency fund size (3-6 months)
4. Analyze my savings rate and capacity
5. Project time to reach emergency fund goal
6. Suggest optimal account types for emergency funds
7. Identify expenses to cut for faster savings
8. Provide month-by-month savings plan
9. Recommend automatic savings strategies`,
      },
    },
  ],

  debt_optimization: () => [
    {
      role: 'user',
      content: {
        type: 'text',
        text: `Analyze my credit card usage and create a debt optimization strategy:

1. List all credit cards with current balances and limits
2. Calculate total debt and credit utilization ratio
3. Identify high-interest debt priorities
4. Suggest balance transfer opportunities
5. Create debt snowball vs avalanche comparison
6. Calculate time to debt freedom with current payments
7. Recommend optimal payment strategies
8. Identify spending habits contributing to debt
9. Provide monthly payment plan
10. Suggest credit score improvement tactics`,
      },
    },
  ],
};
