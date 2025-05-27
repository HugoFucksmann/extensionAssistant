// src/features/tools/ToolValidator.ts
import { z, ZodSchema, ZodIssue, ZodTypeAny } from 'zod';
import { ZodSchemaType } from './types'; // Importar el tipo ZodSchemaType

export interface ValidationSuccess<T> {
  success: true;
  data: T;
}

export interface ValidationFailure {
  success: false;
  error: string; // Un mensaje de error combinado
  issues: ZodIssue[]; // Array de issues de Zod para un análisis más detallado
}

export type ValidationResult<T> = ValidationSuccess<T> | ValidationFailure;

export class ToolValidator {
  /**
   * Valida los datos contra un esquema Zod.
   * @param schema El esquema Zod contra el cual validar.
   * @param data Los datos a validar (normalmente los parámetros de la herramienta).
   * @returns Un objeto ValidationResult.
   */
  public static validate<T_SCHEMA extends ZodSchemaType>( // Usar ZodSchemaType
    schema: T_SCHEMA,
    data: unknown
  ): ValidationResult<z.infer<T_SCHEMA>> {
    const result = schema.safeParse(data);

    if (result.success) {
      return { success: true, data: result.data };
    } else {
      // Formatear los errores de Zod en un mensaje legible
      const errorMessage = result.error.errors
        .map(e => {
          const path = e.path.join('.');
          return `${path ? `Parameter '${path}'` : 'Input'}: ${e.message}`;
        })
        .join('; ');
      return {
        success: false,
        error: `Parameter validation failed: ${errorMessage}`,
        issues: result.error.errors,
      };
    }
  }
}