// src/shared/utils/aiResponseParser.ts
import { z, ZodTypeAny } from 'zod';
import { JsonMarkdownStructuredOutputParser } from '@langchain/core/output_parsers';
import { BaseLanguageModel } from '@langchain/core/language_models/base';
import { ChatPromptTemplate } from '@langchain/core/prompts';


export type ParseResult<T> =
  | { success: true; data: T; error: null; raw?: string }
  | { success: false; data: null; error: Error; raw: string };


export interface AutoCorrectOptions {

  maxAttempts?: number;

  correctionModel?: BaseLanguageModel;

  throwOnError?: boolean;

  correctionPrompt?: string;

  verbose?: boolean;
}

const DEFAULT_CORRECTION_PROMPT = `You are an assistant that fixes JSON responses to match a specific schema.
Error encountered: {error}
Expected schema:
{schema}
Original response:
\`\`\`json
{original}
\`\`\`
Return ONLY the corrected JSON, without any explanations or additional text.`;

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


  setDefaultModel(model: BaseLanguageModel): void {
    this.defaultModel = model;
  }


  private getParser<T extends ZodTypeAny>(schema: T): JsonMarkdownStructuredOutputParser<z.infer<typeof schema>> {
    const schemaKey = JSON.stringify(schema._def);

    if (!this.parserCache.has(schemaKey)) {
      this.parserCache.set(
        schemaKey,
        new JsonMarkdownStructuredOutputParser(schema as z.ZodType)
      );
    }
    return this.parserCache.get(schemaKey)!;
  }


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


    const schemaDescription = this.generateSchemaDescription(schema);


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


    return this.cleanJsonResponse(correctedText);
  }

  private generateSchemaDescription(schema: z.ZodSchema): string {
    try {

      if ('shape' in schema._def && schema._def.shape) {
        return JSON.stringify(schema._def.shape, null, 2);
      }


      return 'Expected schema structure (see validation error for details)';
    } catch {
      return 'Schema information unavailable';
    }
  }


  private cleanJsonResponse(response: string): string {

    const cleaned = response
      .replace(/```json\s*/g, '')
      .replace(/```\s*/g, '')
      .trim();


    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    return jsonMatch ? jsonMatch[0] : cleaned;
  }

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

  clearCache(): void {
    this.parserCache.clear();
  }
}




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


export const defaultParser = new AIResponseParser();