import { PromptType } from "./promptSystem";

/**
 * Extracts valid JSON content from a text response, even if it's surrounded
 * by additional text or enclosed in triple quotes.
 * 
 * @param text Full response text
 * @param defaultValue Default value if JSON can't be extracted
 * @returns Extracted JSON object or default value
 */
export function extractJsonFromText<T>(text: string, defaultValue: T): T {
  if (!text || typeof text !== 'string') {
    return defaultValue;
  }

  // Try direct parsing first
  try {
    return JSON.parse(text) as T;
  } catch (e) {
    // Not valid JSON directly, try to extract it
  }

  // Look for JSON between triple quotes
  const tripleQuotesRegex = /```(?:json)?\s*([\s\S]*?)\s*```/;
  const tripleQuotesMatch = text.match(tripleQuotesRegex);
  
  if (tripleQuotesMatch && tripleQuotesMatch[1]) {
    try {
      return JSON.parse(tripleQuotesMatch[1]) as T;
    } catch (e) {
      // Not valid JSON inside triple quotes
    }
  }

  // Look for any valid JSON object in the text
  const jsonRegex = /(\{[\s\S]*?\})/g;
  const jsonMatches = text.match(jsonRegex);
  
  if (jsonMatches) {
    for (const potentialJson of jsonMatches) {
      try {
        return JSON.parse(potentialJson) as T;
      } catch (e) {
        // Continue with next match
      }
    }
  }

  // If all fails, return default value
  return defaultValue;
}

/**
 * Processes a model response to extract relevant content.
 * 
 * @param response Model response
 * @param expectedJsonFormat Whether response is expected to be in JSON format
 * @returns Processed response content
 */
export function processModelResponse(response: string, expectedJsonFormat: boolean = false): string {
  if (!response) {
    return "No response received from model.";
  }

  // If we don't expect JSON, return response as is
  if (!expectedJsonFormat) {
    return response;
  }

  // Try to extract JSON and get 'content' property or similar
  const jsonResponse = extractJsonFromText<any>(response, null);
  
  if (jsonResponse) {
    // Look for common properties that might contain main content
    for (const prop of ['content', 'message', 'text', 'response']) {
      if (typeof jsonResponse[prop] === 'string') {
        return jsonResponse[prop];
      }
    }
    
    // If we don't find any known property but have valid JSON,
    // convert it back to formatted string
    return JSON.stringify(jsonResponse, null, 2);
  }
  
  // If we couldn't extract valid JSON, return original response
  return response;
}

/**
 * Parses a model response based on the prompt type used to generate it.
 * 
 * @param type Type of prompt used to generate the response
 * @param rawResponse Raw model response
 * @returns Processed response according to prompt type
 */
export function parseModelResponse<T = any>(type: PromptType, rawResponse: string): T {
  // First try to extract any JSON in the response
  const jsonResponse = extractJsonFromText<any>(rawResponse, { message: rawResponse });
  
  // Process based on prompt type
  switch (type) {
    
    case 'inputAnalyzer':
      // For input analysis, expect a structured result
      return jsonResponse.analysis ? jsonResponse : { 
        analysis: processModelResponse(rawResponse) 
      } as T;
      
    case 'planningEngine':
      // For planning, expect a plan structure
      return jsonResponse.plan ? jsonResponse : {
        plan: processModelResponse(rawResponse)
      } as T;
      
    case 'projectManagement':
      // For project management, expect project data
      return jsonResponse.projectData ? jsonResponse : {
        projectData: jsonResponse
      } as T;
    
    // Add more cases for other prompt types
    
    default:
      // For other types, return full JSON or object with original response
      return jsonResponse as T;
  }
}