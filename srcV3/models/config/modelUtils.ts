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

  try {
    const parsed = JSON.parse(cleanedText);
    if (typeof parsed === 'object' && parsed !== null) {
      return parsed as T;
    }
    console.warn("[extractJsonFromText] Direct parse resulted in a primitive, not an object/array.");
  } catch (e) {}

  const tripleQuotesRegex = /```(?:json)?\s*([\s\S]*?)\s*```/;
  const tripleQuotesMatch = cleanedText.match(tripleQuotesRegex);

  if (tripleQuotesMatch && tripleQuotesMatch[1]) {
    try {
      const parsed = JSON.parse(tripleQuotesMatch[1]);
      if (typeof parsed === 'object' && parsed !== null) {
        return parsed as T;
      }
      console.warn("[extractJsonFromText] JSON inside triple quotes parsed to a primitive.");
    } catch (e) {
      console.warn("[extractJsonFromText] Failed to parse JSON inside triple quotes:", e);
    }
  }

  const jsonRegex = /(\{[\s\S]*?\})/g;
  let match;
  let lastAttemptedJson: string | undefined;
  while ((match = jsonRegex.exec(cleanedText)) !== null) {
    try {
      lastAttemptedJson = match[1];
      const parsed = JSON.parse(lastAttemptedJson);
      if (typeof parsed === 'object' && parsed !== null) {
        console.warn("[extractJsonFromText] Successfully extracted JSON from text (not in markdown).");
        return parsed as T;
      }
      console.warn("[extractJsonFromText] JSON extracted from text parsed to a primitive.");
    } catch (e) {}
  }

  console.warn("[extractJsonFromText] No valid JSON object found or extracted from text.");
  if (lastAttemptedJson) {
    console.warn("[extractJsonFromText] Last failed JSON parse attempt:", lastAttemptedJson);
  }
  return defaultValue;
}

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
      return extractJsonFromText<InputAnalysisResult>(cleanedResponse, {
        intent: 'unknown',
        objective: 'Parsing failed',
        extractedEntities: {
          filesMentioned: [],
          functionsMentioned: [],
          errorsMentioned: [],
          customKeywords: []
        },
        confidence: 0,
        error: 'Failed to parse model response JSON'
      } as InputAnalysisResult) as T;

    case 'explainCodePrompt':
      return extractJsonFromText<any>(cleanedResponse, {
        explanation: "Sorry, I couldn't generate the explanation.",
        error: 'Failed to parse explanation JSON'
      }) as T;

    case 'fixCodePrompt':
      return extractJsonFromText<any>(cleanedResponse, {
        messageToUser: "Sorry, I couldn't generate a fix proposal.",
        proposedChanges: [],
        error: 'Failed to parse fix proposal JSON'
      }) as T;

    case 'codeValidator':
      return extractJsonFromText<any>(cleanedResponse, {
        isValid: false,
        feedback: "Sorry, I couldn't validate the fix proposal.",
        error: 'Failed to parse validation JSON'
      }) as T;

    case 'conversationResponder':
      try {
        const jsonResponse = extractJsonFromText<any>(cleanedResponse, null);
        if (jsonResponse && typeof jsonResponse.messageToUser === 'string') {
          return jsonResponse.messageToUser as T;
        }
        if (jsonResponse !== null) {
          console.warn(`[parseModelResponse] Conversation JSON found but no 'messageToUser' key:`, jsonResponse);
        }
      } catch (e) {}

      let textResponse = cleanedResponse;
      textResponse = textResponse.replace(/```[\s\S]*?```/g, '').trim();
      textResponse = textResponse.replace(/^#+\s.*$/gm, '').trim();
      return textResponse as T;

    default:
      try {
        const jsonResponse = extractJsonFromText<any>(cleanedResponse, null);
        if (jsonResponse && typeof jsonResponse === 'object') {
          return jsonResponse as T;
        }
      } catch (e) {}
      return cleanedResponse as T;
  }
}