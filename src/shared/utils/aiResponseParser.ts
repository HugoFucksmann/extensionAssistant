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

const DEFAULT_CORRECTION_PROMPT_TEMPLATE = `You are an assistant that fixes JSON responses to match a specific schema.
Error encountered: {error}
Expected schema: {schema}
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
      correctionPrompt: DEFAULT_CORRECTION_PROMPT_TEMPLATE,
      ...options
    };
  }

  setDefaultModel(model: BaseLanguageModel): void {
    this.defaultModel = model;
  }

  /**
   * Usa JSON.stringify(schema._def) como clave de caché.
   * ¡ATENCIÓN!: Para esquemas Zod complejos, esto podría no ser único o eficiente.
   * Si se detectan colisiones en producción, reemplazar por una función hash robusta (por ejemplo, object-hash).
   */
  private getParser<T extends ZodTypeAny>(schema: T): JsonMarkdownStructuredOutputParser<z.infer<typeof schema>> {
    const schemaKey = JSON.stringify(schema._def);
    if (!this.parserCache.has(schemaKey)) {
      this.parserCache.set(schemaKey, new JsonMarkdownStructuredOutputParser(schema as z.ZodType));
    }
    return this.parserCache.get(schemaKey)!;
  }

  async parseWithAutoCorrect<T>(
    rawResponse: string | object,
    schema: z.ZodSchema<T>,
    options: AutoCorrectOptions = {}
  ): Promise<ParseResult<T>> {
    const opts = { ...this.defaultOptions, ...options };
    const originalText = typeof rawResponse === 'string' ? rawResponse : JSON.stringify(rawResponse, null, 2);
    let currentText = originalText;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= (opts.maxAttempts || 0); attempt++) {
      try {
        const result = await this.attemptParse(currentText, schema);

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
          }
          currentText = await this.generateCorrection(originalText, schema, lastError.message, opts);
        }
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        // Adjuntar la respuesta cruda al error para depuración en nodos superiores
        (lastError as any).raw = currentText;
      }
    }

    const failureResult: ParseResult<T> = {
      success: false,
      data: null,
      error: lastError || new Error('Unknown parsing error'),
      raw: originalText
    };

    if (opts.throwOnError) {
      // Adjuntar la respuesta cruda al error que se lanza
      (failureResult.error as any).raw = originalText;
      throw failureResult.error;
    }
    return failureResult;
  }

  private async attemptParse<T>(text: string, schema: z.ZodSchema<T>): Promise<ParseResult<T>> {
    try {
      // Limpieza del JSON antes de cualquier intento de parseo
      const cleanedText = this.cleanJsonResponse(text);

      const parser = this.getParser(schema);
      const parsed = await parser.parse(cleanedText);
      const validation = schema.safeParse(parsed);

      if (validation.success) {
        return { success: true, data: validation.data, error: null };
      }

      return {
        success: false,
        data: null,
        error: new Error(`Validation failed: ${validation.error.message}`),
        raw: text
      };
    } catch (parseError) {
      return {
        success: false,
        data: null,
        error: parseError instanceof Error ? parseError : new Error(String(parseError)),
        raw: text
      };
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
      throw new Error('No model available for auto-correction');
    }

    const promptTemplate = options.correctionPrompt || DEFAULT_CORRECTION_PROMPT_TEMPLATE;
    const prompt = ChatPromptTemplate.fromTemplate(promptTemplate);
    const chain = prompt.pipe(model);

    const response = await chain.invoke({
      error,
      schema: this.getSchemaDescription(schema),
      original
    });

    const correctedText = response.content?.toString() || '';
    // La respuesta corregida también se limpia
    return this.cleanJsonResponse(correctedText);
  }

  private getSchemaDescription(schema: z.ZodSchema): string {
    try {
      // Intenta obtener una descripción más útil si está disponible
      if (schema.description) return schema.description;
      // Fallback a la estructura interna de Zod
      return 'shape' in schema._def && schema._def.shape
        ? JSON.stringify(schema._def.shape, null, 2)
        : 'Expected schema structure (see validation error for details)';
    } catch (error) {
      console.error('[AIResponseParser] Error generating schema description:', error);
      return 'Schema information unavailable';
    }
  }

  /**
   * Extrae el primer bloque JSON y corrige errores comunes como `undefined`.
   */
  private cleanJsonResponse(response: string): string {
    // 1. Limpiar los bloques de código markdown
    let cleaned = response
      .replace(/```json\s*/g, '')
      .replace(/```\s*/g, '')
      .trim();

    // 2. Reemplazar el error común de `undefined` por `null`
    // Busca `: undefined` y lo cambia por `: null`. Es más seguro que un reemplazo global.
    cleaned = cleaned.replace(/:\s*undefined/g, ': null');

    // 3. Extraer el objeto JSON principal
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    return jsonMatch ? jsonMatch[0] : cleaned;
  }

  createAutoCorrectStep<T>(schema: z.ZodSchema<T>, options: AutoCorrectOptions = {}) {
    return async (input: string | object): Promise<T> => {
      const result = await this.parseWithAutoCorrect(input, schema, { ...options, throwOnError: true });
      // El ! es seguro aquí porque throwOnError: true asegura que no llegará a este punto si hay un error.
      return result.data!;
    };
  }

  async parseBatch<T>(
    responses: (string | object)[],
    schema: z.ZodSchema<T>,
    options: AutoCorrectOptions = {}
  ): Promise<ParseResult<T>[]> {
    return Promise.all(responses.map(response => this.parseWithAutoCorrect(response, schema, options)));
  }

  clearCache(): void {
    this.parserCache.clear();
  }
}

// Convenience functions
export async function parseWithAutoCorrect<T>(
  response: string | object,
  schema: z.ZodSchema<T>,
  model: BaseLanguageModel,
  options: Omit<AutoCorrectOptions, 'correctionModel'> = {}
): Promise<ParseResult<T>> {
  const parser = new AIResponseParser();
  parser.setDefaultModel(model); // Asegurarse de que el modelo por defecto esté establecido
  return parser.parseWithAutoCorrect(response, schema, { ...options, correctionModel: model });
}

export function createAutoCorrectStep<T>(
  schema: z.ZodSchema<T>,
  model: BaseLanguageModel,
  options: Omit<AutoCorrectOptions, 'correctionModel'> = {}
) {
  const parser = new AIResponseParser();
  parser.setDefaultModel(model); // Asegurarse de que el modelo por defecto esté establecido
  return parser.createAutoCorrectStep(schema, { ...options, correctionModel: model });
}

export const defaultParser = new AIResponseParser();