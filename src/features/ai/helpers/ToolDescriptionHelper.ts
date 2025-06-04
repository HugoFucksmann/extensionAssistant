// src/core/helpers/ToolDescriptionHelper.ts

import { ToolRegistry } from "@features/tools/ToolRegistry";
import { ZodObject, ZodOptional, ZodEffects, ZodTypeAny } from 'zod';

export class ToolDescriptionHelper {
    private toolsDescriptionCache: string | null = null;

    constructor(private toolRegistry: ToolRegistry) { }

    getToolsDescription(): string {
        if (this.toolsDescriptionCache) {
            return this.toolsDescriptionCache;
        }

        this.toolsDescriptionCache = this.toolRegistry.getAllTools()
            .map(tool => {
                const paramsDescription = tool.parametersSchema ?
                    this.zodSchemaToDescription(tool.parametersSchema) :
                    'No requiere parámetros';

                return `${tool.name}: ${tool.description}\nParámetros:\n${paramsDescription}`;
            })
            .join('\n\n');

        return this.toolsDescriptionCache;
    }

    private zodSchemaToDescription(schema: ZodTypeAny): string {
        if (!schema) return "No se definieron parámetros.";

        if (schema.description) {
            return schema.description;
        }

        try {
            if (schema instanceof ZodObject) {
                const shape = schema.shape as Record<string, ZodTypeAny>;
                if (!shape || Object.keys(shape).length === 0) return "El objeto de parámetros no tiene campos definidos.";

                return Object.entries(shape)
                    .map(([key, val]: [string, ZodTypeAny]) => {
                        let currentVal = val;
                        let isOptional = false;

                        if (currentVal instanceof ZodOptional) {
                            isOptional = true;
                            currentVal = currentVal._def.innerType;
                        }
                        if (currentVal instanceof ZodEffects) {
                            // Traverse ZodEffects to get to the underlying schema
                            let effectSchema = currentVal;
                            while (effectSchema instanceof ZodEffects) {
                                effectSchema = effectSchema._def.schema;
                            }
                            currentVal = effectSchema;

                            // Check again for ZodOptional after unwrapping ZodEffects
                            if (currentVal instanceof ZodOptional) {
                                isOptional = true;
                                currentVal = currentVal._def.innerType;
                            }
                        }

                        const typeName = (currentVal._def?.typeName || 'unknown').replace('Zod', '').toLowerCase();
                        const description = currentVal.description ? ` - ${currentVal.description}` : '';

                        return `  - ${key}${isOptional ? ' (opcional)' : ' (requerido)'}: ${typeName}${description}`;
                    })
                    .join('\n');
            }
            else if (schema.description) {
                return schema.description;
            }
            else if (schema._def?.typeName) {
                return `Tipo: ${schema._def.typeName.replace('Zod', '').toLowerCase()}`;
            } else {
                return "No se pudo determinar la estructura detallada de los parámetros. Consulte la definición de la herramienta.";
            }
        } catch (error) {
            console.error('Error al convertir esquema Zod a descripción:', error);
            return "Error al procesar el esquema de parámetros. Consulte la definición de la herramienta.";
        }
    }

    dispose(): void {
        this.toolsDescriptionCache = null;
    }
}