// src/models/config/modelUtils.ts


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

