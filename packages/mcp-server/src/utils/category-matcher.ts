import { logger } from './logger.js';

export interface CategoryMatchOptions {
  userQuery: string;
  availableCategories: string[];
  maxMatches?: number;
  includeExplanation?: boolean;
}

export interface CategoryMatchResult {
  matchedCategories: string[];
  explanation?: string;
}

/**
 * Uses AI to match user's category intent to actual categories from the database
 * This handles matching between user queries (often in English) and actual categories (often in Hebrew)
 */
export class CategoryMatcher {
  /**
   * Match user's category intent to actual categories using AI
   */
  static async matchCategories(
    options: CategoryMatchOptions
  ): Promise<CategoryMatchResult> {
    const { userQuery, availableCategories } = options;

    logger.info('Matching categories using AI', {
      userQuery,
      availableCategoriesCount: availableCategories.length,
      sampleCategories: availableCategories.slice(0, 10),
      maxMatches: options.maxMatches || 5,
    });

    // For now, we'll use a simple approach that the tool handler will use to select categories
    // The actual matching will happen in the handler using the context of the full request

    // This is a placeholder that returns all categories - the actual AI matching
    // will happen at the handler level where we have access to the full context
    return {
      matchedCategories: availableCategories,
      explanation:
        'All available categories returned for AI selection in handler',
    };
  }

  /**
   * Format categories for display with both original and transliterated versions
   */
  static formatCategoriesForPrompt(categories: string[]): string {
    return categories.map((cat, index) => `${index + 1}. ${cat}`).join('\n');
  }

  /**
   * Parse category selection from AI response
   */
  static parseCategorySelection(
    aiResponse: string,
    availableCategories: string[]
  ): string[] {
    // This will be used to parse the AI's selection
    // For now, returning empty array as placeholder
    logger.debug('Parsing category selection', {
      responseLength: aiResponse.length,
      availableCategoriesCount: availableCategories.length,
    });
    return [];
  }
}
