// src/models/config/modelUtils.ts
// Assuming this file contains utility functions for model interactions

import { PromptType, InputAnalysisResult, PlannerResponse, StepResult, FixCodePlannerResponse, EditingPromptResponse, ProjectManagementParamsFormatterResponse } from "../../orchestrator/execution/types"; // Import ProjectManagementParamsFormatterResponse

/**
 * Parses the raw string response from the model based on the prompt type.
 * This function needs logic to understand the expected format for each PromptType.
 * @param promptType The type of prompt that was sent.
 * @param rawResponse The raw string response from the model.
 * @returns The parsed result, which might be a JSON object or a string.
 * @throws Error if parsing fails critically or the format is invalid for critical types.
 */
export function parseModelResponse<T = any>(promptType: PromptType, rawResponse: string): T {
    console.log(`[ModelUtils] Parsing response for prompt type '${promptType}'`); // Reduced logging of raw response

    try {
        switch (promptType) {
            case 'inputAnalyzer':
                // Input Analyzer is expected to return a JSON object matching InputAnalysisResult
                const analysisResult = parseJsonSafely<InputAnalysisResult>(rawResponse);
                if (!analysisResult || typeof analysisResult.intent !== 'string' || typeof analysisResult.objective !== 'string' || typeof analysisResult.extractedEntities !== 'object') {
                     console.warn(`[ModelUtils] Input Analyzer response did not match expected structure for JSON:`, rawResponse);
                     // Return a default 'unknown' analysis result on parse failure
                     return {
                          intent: 'unknown',
                          objective: 'Analysis failed',
                          extractedEntities: {},
                          confidence: 0.1,
                          error: 'Model response parsing failed or invalid structure'
                     } as T;
                }
                // Ensure extractedEntities keys are arrays if they exist
                if (analysisResult.extractedEntities) {
                     Object.keys(analysisResult.extractedEntities).forEach(key => {
                         if (!Array.isArray((analysisResult.extractedEntities as any)[key])) {
                              console.warn(`[ModelUtils] Input Analyzer extractedEntities key '${key}' is not an array. Setting to empty array.`);
                              (analysisResult.extractedEntities as any)[key] = [];
                         }
                     });
                }
                // Ensure confidence is a number
                if (typeof analysisResult.confidence !== 'number' || analysisResult.confidence < 0 || analysisResult.confidence > 1) {
                     console.warn(`[ModelUtils] Input Analyzer confidence is not a valid number (0-1). Setting to 0.1.`);
                     analysisResult.confidence = 0.1;
                }

                return analysisResult as T;

            case 'planner': // General Planner
            case 'fixCodePlanner': // Fix Code Agent's Planner
                // Both planners are expected to return a JSON object matching PlannerResponse (or FixCodePlannerResponse, which is the same structure)
                const plannerResponse = parseJsonSafely<PlannerResponse>(rawResponse); // Use PlannerResponse interface for parsing
                 if (!plannerResponse || typeof plannerResponse.action !== 'string' || typeof plannerResponse.reasoning !== 'string') {
                      const errorMsg = `Planner response (${promptType}) did not match expected structure.`;
                      console.error(`[ModelUtils] ${errorMsg} Raw:`, rawResponse);
                       // Throw an error for critical parsing failures like planners
                      throw new Error(errorMsg);
                 }
                return plannerResponse as T;

            case 'codeValidator':
                 // Code Validator is expected to return a JSON object like { isValid: boolean, error?: string }
                 const validationResult = parseJsonSafely<{ isValid: boolean; error?: string }>(rawResponse);
                 if (!validationResult || typeof validationResult.isValid !== 'boolean') {
                      console.warn(`[ModelUtils] Code Validator response did not match expected structure for JSON:`, rawResponse);
                       // Return a default invalid result on parse failure
                      return { isValid: false, error: "Model response parsing failed or invalid structure" } as T;
                 }
                 return validationResult as T;

            case 'editingPrompt': // Editing prompt expects WorkspaceEdit JSON
                 const editingResponse = parseJsonSafely<EditingPromptResponse>(rawResponse);
                 // Basic validation: check if it's an object and has documentChanges or changes (optional)
                 // An empty edit {} or { documentChanges: [] } is valid, so we check if it's an object.
                 if (editingResponse === null || typeof editingResponse !== 'object') {
                      const errorMsg = `Editing prompt response did not return a valid JSON object.`;
                      console.warn(`[ModelUtils] ${errorMsg} Raw:`, rawResponse);
                      // Return null or an empty edit object to indicate failure/no edits
                      return null as T; // Agent should handle null/empty edit results
                 }
                 // TODO: More thorough validation of the WorkspaceEdit structure if needed
                 return editingResponse as T;

            case 'projectManagementParamsFormatter': // New: Project Management Params Formatter expects JSON
                 const paramsResponse = parseJsonSafely<ProjectManagementParamsFormatterResponse>(rawResponse);
                 // Basic validation: check if it's an object
                 if (paramsResponse === null || typeof paramsResponse !== 'object') {
                      const errorMsg = `Project Management Params Formatter response did not return a valid JSON object.`;
                      console.warn(`[ModelUtils] ${errorMsg} Raw:`, rawResponse);
                      // Return null or an empty object to indicate failure/no params
                      return null as T; // Agent should handle null/empty param results
                 }
                 // TODO: More specific validation based on the *expected* tool parameters if possible
                 return paramsResponse as T;


            case 'conversationResponder':
            case 'explainCodePrompt':
            case 'fixCodePrompt': // fixCodePrompt might return JSON with proposedCode, or just a string message
            case 'searchResultsFormatter':
            case 'examinationResultsFormatter':
                 // These prompts are likely expected to return a string or a simple object containing a string message.
                 // The exact format depends on the prompt template instructions.
                 // Attempt JSON parsing first, then fall back to raw string.
                 try {
                     const jsonResult = JSON.parse(rawResponse);
                     // console.log(`[ModelUtils] Parsed JSON for ${promptType}:`, jsonResult); // Log parsed JSON
                     // You might add checks here for specific keys expected by the agent
                     // e.g., if (promptType === 'fixCodePrompt' && typeof jsonResult.proposedCode === 'string') return jsonResult;
                     // For now, return the parsed JSON object if successful.
                     return jsonResult as T;
                 } catch (jsonError) {
                     // console.log(`[ModelUtils] Could not parse JSON for ${promptType}, returning raw string.`); // Log fallback
                     // If JSON parsing fails, assume the raw response is the intended string content
                     return rawResponse as T;
                 }

            case 'consoleCommandFormatter':
                 // This prompt is expected to return a simple string (the command)
                 // It might sometimes output JSON if the model misunderstands,
                 // but the primary expectation is a string.
                 // Let's return the raw string directly, trimming whitespace.
                 return rawResponse.trim() as T;


            // TODO: Add parsing logic for other prompt types as they are added

            default:
                // Default behavior: attempt JSON parsing, otherwise return raw string
                try {
                    const jsonResult = JSON.parse(rawResponse);
                    // console.log(`[ModelUtils] Default parsing (JSON) for ${promptType}:`, jsonResult); // Log default JSON parse
                    return jsonResult as T;
                } catch (e) {
                    // console.log(`[ModelUtils] Default parsing (raw string) for ${promptType}.`); // Log default raw parse
                    return rawResponse as T;
                }
        }
    } catch (error) {
        // Catch errors thrown by specific parsing cases (like planner) or unexpected errors
        console.error(`[ModelUtils] Error during parsing for prompt type '${promptType}':`, error);
        // Re-throw the error so the StepExecutor/Agent can handle it
        throw error;
    }
}

/**
 * Safely attempts to parse a JSON string.
 * @param jsonString The string to parse.
 * @returns The parsed object or null if parsing fails.
 */
function parseJsonSafely<T>(jsonString: string): T | null {
    try {
        // Attempt to clean up common JSON issues like trailing commas or comments
        // This is a basic attempt; a more robust solution might use a library.
        let cleanedString = jsonString.trim();

        // Remove leading/trailing code block markers if present
        if (cleanedString.startsWith('```json')) {
            cleanedString = cleanedString.substring('```json'.length);
            if (cleanedString.endsWith('```')) {
                cleanedString = cleanedString.substring(0, cleanedString.length - '```'.length);
            }
        } else if (cleanedString.startsWith('```')) {
             cleanedString = cleanedString.substring('```'.length);
             if (cleanedString.endsWith('```')) {
                 cleanedString = cleanedString.substring(0, cleanedString.length - '```'.length);
             }
        }


        // Basic attempt to remove trailing commas before closing braces/brackets
        cleanedString = cleanedString.replace(/,\s*([\]}])/g, '$1');
         // Basic attempt to remove comments (single line //) - be cautious with strings
         cleanedString = cleanedString.split('\n').filter(line => !line.trim().startsWith('//')).join('\n');


        return JSON.parse(cleanedString) as T;
    } catch (e) {
        console.error('[ModelUtils] JSON parse failed:', e, 'Raw string:', jsonString);
        return null;
    }
}