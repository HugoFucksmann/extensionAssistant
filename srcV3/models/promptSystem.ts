// src/models/promptSystem.ts (Keeping original name for consistency, but could be promptUtils.ts)

import {
  inputAnalyzerPrompt, buildInputAnalyzerVariables,
  codeValidatorPrompt, buildCodeValidatorVariables,
  summarizerPrompt, buildSummarizerVariables,
  codeFragmenterPrompt, buildCodeFragmenterVariables,
  buildCodeAnalyzerVariables, codeAnalyzerPrompt,
  buildMemoryExtractorVariables, memoryExtractorPrompt,
  progressEvaluatorPrompt, buildProgressEvaluatorVariables
} from './prompts';
import {
  explainCodePrompt, buildExplainCodeVariables, // Use specific builder for explainCode
  fixCodePrompt, buildFixCodeVariables, // Use specific builder for fixCode
  conversationPrompt, buildConversationVariables,
  plannerPrompt, buildPlannerVariables
} from './prompts/index';

// Import the updated PromptDefinition type
import { PromptType, BasePromptVariables, PromptVariables, PromptDefinition } from '../orchestrator/execution/types';
import { IToolRunner } from '../tools/core/interfaces'; // Import IToolRunner


// Define the central mapping from PromptType to its definition (template and builder)
// Use the updated PromptDefinition interface
export const PROMPT_DEFINITIONS: Partial<Record<PromptType, PromptDefinition<any>>> = {
inputAnalyzer: { template: inputAnalyzerPrompt, buildVariables: buildInputAnalyzerVariables },
codeValidator: { template: codeValidatorPrompt, buildVariables: buildCodeValidatorVariables },
explainCodePrompt: { template: explainCodePrompt, buildVariables: buildExplainCodeVariables }, // Use specific builder
fixCodePrompt: { template: fixCodePrompt, buildVariables: buildFixCodeVariables }, // Use specific builder
conversationResponder: { template: conversationPrompt, buildVariables: buildConversationVariables },
planner: { template: plannerPrompt, buildVariables: buildPlannerVariables as any }, // Cast required because buildPlannerVariables expects toolRunner
summarizer: { template: summarizerPrompt, buildVariables: buildSummarizerVariables },
codeFragmenter: { template: codeFragmenterPrompt, buildVariables: buildCodeFragmenterVariables },
codeAnalyzer: { template: codeAnalyzerPrompt, buildVariables: buildCodeAnalyzerVariables },
memoryExtractor: { template: memoryExtractorPrompt, buildVariables: buildMemoryExtractorVariables },
progressEvaluator: { template: progressEvaluatorPrompt, buildVariables: buildProgressEvaluatorVariables },
};

// Keep generic helper for mapping context to base variables
export function mapContextToBaseVariables(resolutionContextData: Record<string, any>): BasePromptVariables {
const baseVariables: BasePromptVariables = {
  userMessage: resolutionContextData.userMessage || '',
  chatHistory: resolutionContextData.chatHistoryString || '',
  objective: resolutionContextData.analysisResult?.objective,
  extractedEntities: resolutionContextData.analysisResult?.extractedEntities,
  projectContext: resolutionContextData.projectInfo, // Assuming projectInfo is available in contextData
  activeEditorContent: resolutionContextData.activeEditorContent // Assuming activeEditorContent is available in contextData
};

// Add any other properties from resolutionContextData that are not already mapped
// and are not internal keys (like chatHistoryString, planningHistory, etc.)
const dynamicVariables = Object.keys(resolutionContextData)
  .filter(key => !(key in baseVariables) && key !== 'chatHistoryString' && key !== 'planningHistory' && key !== 'planningIteration' && key !== 'analysisResult' && key !== 'isReplanning' && key !== 'replanReason' && key !== 'replanData')
  .reduce<Record<string, any>>((acc, key) => {
    // Add a simple check to avoid circular references or massive objects if not needed
    if (typeof resolutionContextData[key] !== 'object' || resolutionContextData[key] === null || Array.isArray(resolutionContextData[key])) {
         acc[key] = resolutionContextData[key];
    } else {
         // For objects, maybe just include a placeholder or string representation
         acc[key] = `[Object: ${key}]`; // Or JSON.stringify if safe and not too big
    }
    return acc;
  }, {});

return { ...baseVariables, ...dynamicVariables };
}


// Keep generic template filling function
export function fillPromptTemplate(template: string, variables: PromptVariables): string {
let output = template;

// Handle dynamic sections like {{fileContent:path}}
const dynamicPlaceholderRegex = /\{\{(\w+):([^\}]+)\}\}/g; // Regex to capture prefix and key
let match;
let lastIndex = 0;
let dynamicOutput = '';

while ((match = dynamicPlaceholderRegex.exec(template)) !== null) {
    dynamicOutput += template.substring(lastIndex, match.index);
    lastIndex = dynamicPlaceholderRegex.lastIndex;

    const prefix = match[1]; // e.g., 'fileContent'
    const keyPattern = match[2]; // e.g., '.*' or 'path/to/file.ts' or 'proposedChanges.*'

    // Find variables matching the prefix and potentially the key pattern
    // Simple check: does variable key start with prefix: ?
    const relevantDynamicVariables = Object.entries(variables)
        .filter(([key]) => key.startsWith(`${prefix}:`));

    if (relevantDynamicVariables.length > 0) {
        const dynamicContent = relevantDynamicVariables
            .map(([key, value]) => {
                // Check if the specific key matches the pattern if it's not '.*'
                // For simplicity, assuming the key pattern is just '.*' or a literal key for now
                // A more complex implementation would match the keyPattern regex
                const originalKey = key.substring(prefix.length + 1); // e.g., 'path/to/file.ts' or '0' for array items

                // Format content - handle objects/arrays by stringifying
                const contentString = typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean' || value === null || value === undefined
                  ? String(value)
                  : JSON.stringify(value, null, 2);

                // Determine code block language hint based on prefix or originalKey extension
                let codeBlockLang = '';
                if (prefix === 'fileContent') {
                    codeBlockLang = originalKey.split('.').pop() || '';
                } else if (prefix === 'searchResults' || prefix === 'fileFragments') {
                     codeBlockLang = 'json'; // Assume search results and fragments are JSON structure
                } else if (prefix === 'analyzedFileInsights') {
                     codeBlockLang = 'json'; // Assume insights are JSON
                } else if (prefix === 'retrievedMemory' || prefix === 'planningHistory' || prefix === 'replanData') {
                     codeBlockLang = 'json'; // Assume these are JSON
                }
                // Add other prefixes if they contain code/structured data

                return `### ${prefix.replace(/([A-Z])/g, ' $1').trim()} for ${originalKey}:\n\n${codeBlockLang ? '```' + codeBlockLang + '\n' : ''}${contentString}${codeBlockLang ? '\n```' : ''}\n`;
            })
            .join('\n---\n'); // Separator between dynamic items

        dynamicOutput += dynamicContent;
    } else {
        // If no matching dynamic variables found, output an empty section or placeholder
        // Depending on desired template behavior, might output nothing or a specific string
        // For now, if no data matches, nothing is added for this dynamic placeholder.
    }
}
dynamicOutput += template.substring(lastIndex); // Add the rest of the template after the last match

// Handle standard {{variableName}} placeholders
 let finalOutput = dynamicOutput;
 for (const [key, value] of Object.entries(variables)) {
     // Skip dynamic keys already processed
     if (key.includes(':')) continue;

     const placeholder = `{{${key}}}`;
     // Format simple variable value
     const stringValue = typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean' || value === null || value === undefined
       ? String(value)
       : JSON.stringify(value, null, 2); // Stringify objects/arrays

     // Escape potential '$' in replacement string to prevent issues with replace()
     finalOutput = finalOutput.replace(
       new RegExp(placeholder.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'g'), // Escape regex special chars in placeholder
       stringValue.replace(/\$/g, '$$$$') // Escape '$' in the value itself
     );
 }

 // Remove any remaining unmatched placeholders
 finalOutput = finalOutput.replace(/\{\{.*?\}\}/g, '');

return finalOutput;
}

// Re-export all prompt builders and templates
export {
  inputAnalyzerPrompt, buildInputAnalyzerVariables,
  codeValidatorPrompt, buildCodeValidatorVariables,
  summarizerPrompt, buildSummarizerVariables,
  codeFragmenterPrompt, buildCodeFragmenterVariables,
  buildCodeAnalyzerVariables, codeAnalyzerPrompt,
  buildMemoryExtractorVariables, memoryExtractorPrompt,
  progressEvaluatorPrompt, buildProgressEvaluatorVariables,
  explainCodePrompt, buildExplainCodeVariables,
  fixCodePrompt, buildFixCodeVariables,
  conversationPrompt, buildConversationVariables,
  plannerPrompt, buildPlannerVariables
};