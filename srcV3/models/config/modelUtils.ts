// src/models/config/modelUtils.ts


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

  // Clean up the text by removing markdown formatting
  const cleanedText = text
    .trim()
    .replace(/```json\s*([^]*?)\s*```/g, '$1') // Extract JSON from code blocks marked as json
    .replace(/```[\s\S]*?```/g, '') // Remove all other code blocks
    .replace(/`[^`]*`/g, '')        // Remove inline code
    .replace(/\s+/g, ' ')          // Normalize whitespace
    .trim();

  try {
    const parsed = JSON.parse(cleanedText);
    if (typeof parsed === 'object' && parsed !== null) {
      return parsed as T;
    }
  } catch (e) {}

  // Try to find JSON object in the text
  const jsonMatch = cleanedText.match(/\{[^]*\}/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]);
      if (typeof parsed === 'object' && parsed !== null) {
        console.warn("[extractJsonFromText] Successfully extracted JSON from text (not in markdown).");
        return parsed as T;
      }
      console.warn("[extractJsonFromText] JSON extracted from text parsed to a primitive.");
    } catch (e) {}
  }

  console.warn("[extractJsonFromText] No valid JSON object found or extracted from text.");
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