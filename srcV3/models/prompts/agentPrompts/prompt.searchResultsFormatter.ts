// src/models/prompts/intentions/prompt.searchResultsFormatter.ts

import { BasePromptVariables } from '../../../orchestrator';
import { mapContextToBaseVariables } from '../../promptSystem';


// Define variables specific to the search results formatter prompt
export interface SearchResultsFormatterPromptVariables extends BasePromptVariables {
    // The raw search results object/array stored in the context under the key 'searchResults'
    searchResults: any;
    searchQuery: string; // The original query
}

// Define the prompt template
export const searchResultsFormatterPrompt = `
You are an AI assistant tasked with presenting workspace search results in a clear and concise manner for the user.

User Objective: "{{objective}}"
User Message: "{{userMessage}}"
Search Query: "{{searchQuery}}"

Raw Search Results (JSON format):
{{searchResults}}

Instructions:
- Review the raw search results provided in JSON format.
- Summarize the findings in a user-friendly format.
- Mention the files where matches were found.
- If possible, provide brief snippets or context for the most relevant results.
- If no results were found (e.g., the JSON is empty or indicates no matches), state that clearly.
- Do not include the raw search results JSON in your final response.
- Your response should be a natural language message to the user.

Formatted Search Results:
`;

// Function to build variables for the search results formatter prompt
export function buildSearchResultsFormatterVariables(contextData: Record<string, any>): SearchResultsFormatterPromptVariables {
    const baseVariables = mapContextToBaseVariables(contextData);

    const searchQuery = contextData.analysisResult?.objective || contextData.userMessage || '';

    const formatterVariables: SearchResultsFormatterPromptVariables = {
        ...baseVariables,
        searchQuery: searchQuery,
        // The 'searchResults' key is expected to be available in baseVariables
        // because mapContextToBaseVariables includes it from contextData.
        // We explicitly cast here for type safety in the prompt variables interface.
        searchResults: contextData.searchResults as any,
    };

    return formatterVariables;
}