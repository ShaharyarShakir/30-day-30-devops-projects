export const Prompts = {
  // Chat Prompt Template
  formatChatPrompt: (history: { text: string; isAi: boolean }[], input: string): string => {
    const lines = history.map((h) => (h.isAi ? `AI: ${h.text}` : `User: ${h.text}`));
    return `System: You are Nomad AI, a friendly and experienced offline travel companion.
${lines.join("\n")}
User: ${input}
AI:`;
  },

  // Trip Planner Prompt
  formatTripPlannerPrompt: (destination: string, days: number, preferences: string): string => {
    return `System: Generate a detailed day-to-day itinerary.
Action: Plan a ${days}-day trip to ${destination} focusing on preferences: ${preferences}.
Include morning, afternoon, and evening recommendations.`;
  },

  // Packing List Generator
  formatPackingListPrompt: (destination: string, days: number, activities: string): string => {
    return `System: Generate a packing list.
Action: List essential items, clothing, and gear for a ${days}-day trip to ${destination} with activities including: ${activities}.`;
  },

  // Translation
  formatTranslationPrompt: (phrases: string[], targetLanguage: string): string => {
    return `System: Translate the following phrases to ${targetLanguage} and provide phonetic spellings.
Phrases: ${phrases.join(", ")}`;
  },

  // Expense Analysis
  formatExpenseAnalysisPrompt: (expensesJson: string): string => {
    return `System: Analyze travel budget and expenses.
Expenses: ${expensesJson}
Provide budget breakdowns, categories, and practical saving tips.`;
  },

  // Travel Recommendations
  formatRecommendationsPrompt: (location: string, type: "food" | "sights" | "shopping" | "hidden-gems"): string => {
    return `System: Generate localized recommendations.
Location: ${location}
Type: ${type}`;
  },

  // Itinerary Summaries
  formatItinerarySummaryPrompt: (itineraryText: string): string => {
    return `System: Summarize the following complex itinerary into a high-level table format.
Itinerary: ${itineraryText}`;
  }
};
