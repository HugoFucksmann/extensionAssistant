// src/features/ai/utils/zodUtils.ts
import { z } from 'zod';

/**
 * Utility functions for working with Zod schemas
 */
export class ZodSchemaUtils {
  /**
   * Convert a Zod schema to a human-readable description
   */
  static toDescription(schema: z.ZodTypeAny): string {
    if (!schema || !schema._def) {
      return "No parameters defined.";
    }

    try {
      return this.parseSchemaType(schema);
    } catch (error) {
      console.error('Error converting Zod schema to description:', error);
      return "Error processing parameter schema.";
    }
  }

  private static parseSchemaType(schema: z.ZodTypeAny): string {
    const def = schema._def;
    
    switch (def.typeName) {
      case 'ZodObject':
        return this.parseObjectSchema(schema as z.ZodObject<any>);
      case 'ZodOptional':
        return this.parseSchemaType(def.innerType || def.schema);
      case 'ZodArray':
        return `Array of ${this.parseSchemaType(def.type)}`;
      case 'ZodString':
        return 'string';
      case 'ZodNumber':
        return 'number';
      case 'ZodBoolean':
        return 'boolean';
      case 'ZodEnum':
        return `enum (${def.values.join(', ')})`;
      case 'ZodUnion':
        return def.options.map((opt: z.ZodTypeAny) => this.parseSchemaType(opt)).join(' | ');
      default:
        return def.typeName?.replace('Zod', '').toLowerCase() || 'unknown';
    }
  }

  private static parseObjectSchema(schema: z.ZodObject<any>): string {
    const shape = schema._def.shape();
    if (!shape) return "Object schema without defined shape.";

    return Object.entries(shape)
      .map(([key, val]: [string, any]) => {
        const isOptional = this.isOptionalField(val);
        const innerType = isOptional ? (val._def.innerType || val._def.schema) : val;
        const typeDesc = this.parseSchemaType(innerType);
        const description = this.getFieldDescription(innerType);
        const requiredText = isOptional ? ' (optional)' : ' (required)';
        
        return `- ${key}${requiredText}: ${typeDesc}${description}`;
      })
      .join('\n');
  }

  private static isOptionalField(field: any): boolean {
    return field._def?.typeName === 'ZodOptional' || 
           (typeof field.isOptional === 'function' && field.isOptional());
  }

  private static getFieldDescription(schema: any): string {
    return schema.description ? ` - ${schema.description}` : '';
  }

  /**
   * Create a simplified schema description for tool registration
   */
  static toToolDescription(schema: z.ZodTypeAny): string {
    if (!schema || !schema._def) return 'No parameters required';
    
    const description = this.toDescription(schema);
    return description === "No parameters defined." ? 'No parameters required' : description;
  }

  /**
   * Validate if a schema is properly defined
   */
  static isValidSchema(schema: z.ZodTypeAny): boolean {
    try {
      return schema && schema._def && typeof schema._def.typeName === 'string';
    } catch {
      return false;
    }
  }

  /**
   * Get schema type name safely
   */
  static getTypeName(schema: z.ZodTypeAny): string {
    try {
      return schema._def?.typeName?.replace('Zod', '') || 'Unknown';
    } catch {
      return 'Unknown';
    }
  }
}