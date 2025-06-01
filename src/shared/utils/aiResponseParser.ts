// src/shared/utils/aiResponseParser.ts
import { z, ZodTypeAny } from 'zod';
import { JsonMarkdownStructuredOutputParser } from '@langchain/core/output_parsers';
import { BaseLanguageModel } from '@langchain/core/language_models/base';
import { ChatPromptTemplate } from '@langchain/core/prompts';

// Result types
export type ParseResult<T> = 
  | { success: true; data: T; error: null; raw?: string }
  | { success: false; data: null; error: Error; raw: string };

// Configuration options
export interface AutoCorrectOptions {
  /** Maximum number of auto-correction attempts */
  maxAttempts?: number;
  /** Model to use for corrections (if different from main model) */
  correctionModel?: BaseLanguageModel;
  /** Whether to throw errors instead of returning them */
  throwOnError?: boolean;
  /** Custom correction prompt template */
  correctionPrompt?: string;
  /** Enable detailed logging */
  verbose?: boolean;
}

// Default correction prompt
const DEFAULT_CORRECTION_PROMPT = `You are an assistant that fixes JSON responses to match a specific schema.

Error encountered: {error}

Expected schema:
{schema}

Original response:
\`\`\`json
{original}
\`\`\`

Return ONLY the corrected JSON, without any explanations or additional text.`;

/**
 * Enhanced AI Response Parser with auto-correction capabilities
 */
export class AIResponseParser {
  private parserCache = new Map<string, JsonMarkdownStructuredOutputParser<any>>();
  private defaultModel: BaseLanguageModel | null = null;
  private defaultOptions: AutoCorrectOptions;

  constructor(options: AutoCorrectOptions = {}) {
    this.defaultOptions = {
      maxAttempts: 2,
      throwOnError: false,
      verbose: false,
      ...options
    };
  }

  /**
   * Set default model for auto-corrections
   */
  setDefaultModel(model: BaseLanguageModel): void {
    this.defaultModel = model;
  }

  /**
   * Get or create cached parser for schema
   */
  private getParser<T extends ZodTypeAny>(schema: T): JsonMarkdownStructuredOutputParser<z.infer<typeof schema>> {    const schemaKey = JSON.stringify(schema._def);
    
    if (!this.parserCache.has(schemaKey)) {
      this.parserCache.set(
        schemaKey,
        new JsonMarkdownStructuredOutputParser(schema as z.ZodType)
      );
    }
    return this.parserCache.get(schemaKey)!;
  }

  /**
   * Parse and validate response with auto-correction
   */
  async parseWithAutoCorrect<T>(
    rawResponse: string | object,
    schema: z.ZodSchema<T>,
    options: AutoCorrectOptions = {}
  ): Promise<ParseResult<T>> {
    const opts = { ...this.defaultOptions, ...options };
    const originalText = typeof rawResponse === 'string' 
      ? rawResponse 
      : JSON.stringify(rawResponse, null, 2);
    
    let currentText = originalText;
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt <= (opts.maxAttempts || 0); attempt++) {
      try {
        const result = await this.attemptParse(currentText, schema, opts.verbose);
        
        if (result.success) {
          if (opts.verbose && attempt > 0) {
            console.log(`✅ Successfully parsed after ${attempt} correction(s)`);
          }
          return { ...result, raw: originalText };
        }
        
        lastError = result.error;
        
        // If this isn't the last attempt, try correction
        if (attempt < (opts.maxAttempts || 0)) {
          if (opts.verbose) {
            console.log(`❌ Attempt ${attempt + 1} failed: ${lastError.message}`);
            console.log(`🔧 Attempting auto-correction...`);
          }
          
          currentText = await this.generateCorrection(
            originalText,
            schema,
            lastError.message,
            opts
          );
        }
        
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        if (opts.verbose) {
          console.log(`💥 Unexpected error on attempt ${attempt + 1}:`, lastError.message);
        }
      }
    }

    const failureResult: ParseResult<T> = {
      success: false,
      data: null,
      error: lastError || new Error('Unknown parsing error'),
      raw: originalText
    };

    if (opts.throwOnError) {
      throw failureResult.error;
    }

    return failureResult;
  }

  /**
   * Attempt to parse and validate a single response
   */
  private async attemptParse<T>(
    text: string,
    schema: z.ZodSchema<T>,
    verbose = false
  ): Promise<ParseResult<T>> {
    try {
      const parser = this.getParser(schema);
      const parsed = await parser.parse(text);
      const validation = schema.safeParse(parsed);

      if (validation.success) {
        return { success: true, data: validation.data, error: null };
      }

      const error = new Error(`Validation failed: ${validation.error.message}`);
      return { success: false, data: null, error, raw: text };

    } catch (parseError) {
      const error = parseError instanceof Error 
        ? parseError 
        : new Error(`Parse error: ${String(parseError)}`);
      
      return { success: false, data: null, error, raw: text };
    }
  }

  /**
   * Generate corrected response using LLM
   */
  private async generateCorrection(
    original: string,
    schema: z.ZodSchema,
    error: string,
    options: AutoCorrectOptions
  ): Promise<string> {
    const model = options.correctionModel || this.defaultModel;
    if (!model) {
      throw new Error('No model available for auto-correction. Set a default model or provide correctionModel option.');
    }

    // Generate schema description
    const schemaDescription = this.generateSchemaDescription(schema);
    
    // Use custom prompt or default
    const promptTemplate = options.correctionPrompt || DEFAULT_CORRECTION_PROMPT;
    
    const prompt = ChatPromptTemplate.fromTemplate(promptTemplate);
    
    const chain = prompt.pipe(model);
    const response = await chain.invoke({
      error,
      schema: schemaDescription,
      original
    });

    const correctedText = typeof response === 'string' 
      ? response 
      : response.content?.toString() || '';

    // Clean up the response (remove markdown if present)
    return this.cleanJsonResponse(correctedText);
  }

  /**
   * Generate human-readable schema description
   */
  private generateSchemaDescription(schema: z.ZodSchema): string {
    try {
      // Try to get shape for object schemas
      if ('shape' in schema._def && schema._def.shape) {
        return JSON.stringify(schema._def.shape, null, 2);
      }
      
      // For other schemas, provide basic type info
      return 'Expected schema structure (see validation error for details)';
    } catch {
      return 'Schema information unavailable';
    }
  }

  /**
   * Clean JSON response from potential markdown or extra text
   */
  private cleanJsonResponse(response: string): string {
    // Remove markdown code blocks
    const cleaned = response
      .replace(/```json\s*/g, '')
      .replace(/```\s*/g, '')
      .trim();

    // Try to extract JSON if there's extra text
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    return jsonMatch ? jsonMatch[0] : cleaned;
  }

  /**
   * Create a step function for use in LCEL chains or LangGraph
   */
  createAutoCorrectStep<T>(
    schema: z.ZodSchema<T>,
    options: AutoCorrectOptions = {}
  ) {
    return async (input: string | object): Promise<T> => {
      const result = await this.parseWithAutoCorrect(input, schema, {
        ...options,
        throwOnError: true
      });
      return result.data!; // Safe because of throwOnError
    };
  }

  /**
   * Batch parse multiple responses
   */
  async parseBatch<T>(
    responses: (string | object)[],
    schema: z.ZodSchema<T>,
    options: AutoCorrectOptions = {}
  ): Promise<ParseResult<T>[]> {
    return Promise.all(
      responses.map(response => 
        this.parseWithAutoCorrect(response, schema, options)
      )
    );
  }

  /**
   * Clear parser cache (useful for memory management)
   */
  clearCache(): void {
    this.parserCache.clear();
  }
}

// Convenience functions for common use cases

/**
 * Quick parse function for one-off usage
 */
export async function parseWithAutoCorrect<T>(
  response: string | object,
  schema: z.ZodSchema<T>,
  model: BaseLanguageModel,
  options: Omit<AutoCorrectOptions, 'correctionModel'> = {}
): Promise<ParseResult<T>> {
  const parser = new AIResponseParser();
  return parser.parseWithAutoCorrect(response, schema, {
    ...options,
    correctionModel: model
  });
}

/**
 * Create a reusable step function for pipelines
 */
export function createAutoCorrectStep<T>(
  schema: z.ZodSchema<T>,
  model: BaseLanguageModel,
  options: Omit<AutoCorrectOptions, 'correctionModel'> = {}
) {
  const parser = new AIResponseParser();
  return parser.createAutoCorrectStep(schema, {
    ...options,
    correctionModel: model
  });
}

// Default instance for quick usage
export const defaultParser = new AIResponseParser();