// src/models/config/modelUtils.ts

// Import PromptType and InputAnalysisResult from types.ts
import { PromptType, InputAnalysisResult } from '../../orchestrator/execution/types';


/**
 * Extracts valid JSON content from a text response, even if it's surrounded
 * by additional text or enclosed in triple quotes.
 *
 * @param text Full response text
 * @param defaultValue Default value if JSON can't be extracted or parsed
 * @returns Extracted JSON object or default value
 */
export function extractJsonFromText<T>(text: string, defaultValue: T): T {
  if (!text || typeof text !== 'string') {
    return defaultValue;
  }

  const cleanedText = text.trim();

  // Try direct parsing first
  try {
    const parsed = JSON.parse(cleanedText);
     // Basic check: if it's an object or array, it's likely intended JSON
    if (typeof parsed === 'object' && parsed !== null) {
       return parsed as T;
    }
    // If it's a primitive (string, number, boolean), it's probably not the expected JSON object
    console.warn("[extractJsonFromText] Direct parse resulted in a primitive, not an object/array.");
  } catch (e) {
    // Not valid JSON directly, try to extract it
  }

  // Look for JSON between triple quotes (```json ... ``` or ``` ... ```)
  const tripleQuotesRegex = /```(?:json)?\s*([\s\S]*?)\s*```/;
  const tripleQuotesMatch = cleanedText.match(tripleQuotesRegex);

  if (tripleQuotesMatch && tripleQuotesMatch[1]) {
    try {
      // Use the captured group (content inside the quotes)
      const parsed = JSON.parse(tripleQuotesMatch[1]);
       if (typeof parsed === 'object' && parsed !== null) {
           return parsed as T;
       }
       console.warn("[extractJsonFromText] JSON inside triple quotes parsed to a primitive.");
    } catch (e) {
      console.warn("[extractJsonFromText] Failed to parse JSON inside triple quotes:", e);
      // Not valid JSON inside triple quotes
    }
  }

  // Look for any valid JSON object in the text (less reliable)
  // This regex is basic and might fail on nested structures or complex strings
  const jsonRegex = /(\{[\s\S]*?\})/g;
  let match;
  let lastAttemptedJson: string | undefined;
  // Use exec in a loop to find all matches
  while ((match = jsonRegex.exec(cleanedText)) !== null) {
    try {
      // Use the captured group (the content of the object)
      lastAttemptedJson = match[1];
      const parsed = JSON.parse(lastAttemptedJson);
       if (typeof parsed === 'object' && parsed !== null) {
           console.warn("[extractJsonFromText] Successfully extracted JSON from text (not in markdown).");
           return parsed as T;
       }
       console.warn("[extractJsonFromText] JSON extracted from text parsed to a primitive.");
    } catch (e) {
      // Continue with next match
    }
  }


  console.warn("[extractJsonFromText] No valid JSON object found or extracted from text.");
  if (lastAttemptedJson) {
      console.warn("[extractJsonFromText] Last failed JSON parse attempt:", lastAttemptedJson);
  }
  // If all fails, return default value
  return defaultValue;
}

// processModelResponse is removed


/**
 * Parses a model response based on the prompt type used to generate it.
 *
 * @param type Type of prompt used to generate the response
 * @param rawResponse Raw model response
 * @returns Processed response according to prompt type
 */
export function parseModelResponse<T = any>(type: PromptType, rawResponse: string): T {
  const cleanedResponse = rawResponse.trim();

  switch (type) {
    case 'inputAnalyzer':
      // Expects InputAnalysisResult JSON
      return extractJsonFromText<InputAnalysisResult>(cleanedResponse, {
          intent: 'unknown',
          objective: 'Parsing failed',
          extractedEntities: {
              filesMentioned: [],
              functionsMentioned: [],
              errorsMentioned: [],
              customKeywords: [],
          },
          confidence: 0,
          error: 'Failed to parse model response JSON'
      } as InputAnalysisResult) as T;

    case 'explainCodePrompt':
        // Expects { explanation: string, ... } JSON
        // The handler expects the full object, not just the string
        return extractJsonFromText<any>(cleanedResponse, {
            explanation: "Sorry, I couldn't generate the explanation.",
            error: 'Failed to parse explanation JSON'
        }) as T;


    case 'fixCodePrompt':
        // Expects { messageToUser: string, proposedChanges: [], ... } JSON
         // The handler expects the full object
        return extractJsonFromText<any>(cleanedResponse, {
            messageToUser: "Sorry, I couldn't generate a fix proposal.",
            proposedChanges: [], // Ensure this is always an array
            error: 'Failed to parse fix proposal JSON'
        }) as T;

    case 'codeValidator':
         // Expects { isValid: boolean, feedback: string, ... } JSON
         return extractJsonFromText<any>(cleanedResponse, {
             isValid: false,
             feedback: "Sorry, I couldn't validate the fix proposal.",
             error: 'Failed to parse validation JSON'
         }) as T;


    case 'conversationResponder':
      // Primarily expects a string message, but the prompt output is JSON { messageToUser: string }
      // We should parse the JSON and return the messageToUser property.
      try {
          const jsonResponse = extractJsonFromText<any>(cleanedResponse, null);
          // If JSON was found AND it has a 'messageToUser' string property, return that string.
          if (jsonResponse && typeof jsonResponse.messageToUser === 'string') {
              return jsonResponse.messageToUser as T; // Return just the string message
          }
          // If JSON was found but didn't have 'messageToUser', log and fall through
          if (jsonResponse !== null) {
               console.warn(`[parseModelResponse] Conversation JSON found but no 'messageToUser' key:`, jsonResponse);
          }
      } catch (e) {
          // extractJsonFromText already logs parsing errors, just continue to text fallback
      }

      // Fallback: Return the cleaned text, stripping potential markdown or code blocks
      // This fallback might be less necessary if the prompt is strictly instructed to return JSON.
      // Consider removing this fallback if you want strict JSON output enforcement.
      let textResponse = cleanedResponse;
      textResponse = textResponse.replace(/```[\s\S]*?```/g, '').trim(); // Remove code blocks
      textResponse = textResponse.replace(/^#+\s.*$/gm, '').trim(); // Remove markdown headers
      // Add other cleanup as needed

      return textResponse as T; // Return cleaned text if not parsable JSON object with messageToUser

    // Add cases for other prompt types if they have specific parsing needs
    // case 'planningEngine': // Expects { plan: ... } JSON
    // case 'projectManagement': // Expects { projectData: ... } JSON
    // ... add defaults for these too

    default:
      // Default handling: Assume it might be JSON or just text.
      // Try JSON first, if it's an object/array, return it. Otherwise, return the cleaned text.
      try {
          const jsonResponse = extractJsonFromText<any>(cleanedResponse, null);
          if (jsonResponse && typeof jsonResponse === 'object') {
              return jsonResponse as T;
          }
      } catch (e) {
          // Not JSON, fall through
      }
      return cleanedResponse as T; // Return cleaned text if not parsable JSON object
  }
}