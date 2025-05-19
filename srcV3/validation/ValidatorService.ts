// src/validation/ValidatorService.ts
// MODIFIED: Register UI schemas

import { z, ZodSchema, ZodError } from 'zod';
import { EventEmitterService } from '../events/EventEmitterService';
// Import all schemas to register them
import * as Schemas from './schemas';


/**
 * Servicio Singleton para gestionar schemas Zod y validar datos.
 * Emite eventos en caso de fallos de validación.
 */
export class ValidatorService {
    private static instance: ValidatorService;
    private schemas: Map<string, ZodSchema<any>> = new Map();
    private eventEmitter: EventEmitterService;

    private constructor(eventEmitter: EventEmitterService) {
        this.eventEmitter = eventEmitter;
        console.log('[ValidatorService] Initialized.');
        this.registerAllSchemas(); // Register all imported schemas
    }

    public static getInstance(eventEmitter: EventEmitterService): ValidatorService {
        if (!ValidatorService.instance) {
            ValidatorService.instance = new ValidatorService(eventEmitter);
        }
        return ValidatorService.instance;
    }

    private registerAllSchemas(): void {
        // Automatically register schemas exported from ./schemas/
        // Use the export name as the schema name in the registry
        for (const schemaName in Schemas) {
            // Ensure it's a ZodSchema instance
            if ((Schemas as any)[schemaName] instanceof ZodSchema) {
                 this.registerSchema(schemaName, (Schemas as any)[schemaName]);
            }
        }
        console.log(`[ValidatorService] Registered ${this.schemas.size} schemas.`);
    }


    /**
     * Registra un schema Zod con un nombre dado.
     * @param name Nombre único para el schema.
     * @param schema La instancia de ZodSchema.
     */
    registerSchema(name: string, schema: ZodSchema<any>): void {
        if (this.schemas.has(name)) {
            console.warn(`[ValidatorService] Schema "${name}" already registered. Overwriting.`);
        }
        this.schemas.set(name, schema);
        // console.debug(`[ValidatorService] Schema "${name}" registered.`); // Too verbose during init
    }

    getSchema(name: string): ZodSchema<any> | undefined {
        return this.schemas.get(name);
    }


    /**
     * Valida datos contra un schema registrado. Lanza error si falla.
     * @param data Los datos a validar.
     * @param schemaName El nombre del schema registrado.
     * @returns Los datos validados (con tipado inferido por Zod).
     * @throws ZodError Si la validación falla.
     * @throws Error Si el schema no está registrado.
     */
    validate<T>(data: any, schemaName: string): T {
        const schema = this.getSchema(schemaName);
        if (!schema) {
            const error = new Error(`Schema "${schemaName}" not found in ValidatorService registry.`);
            console.error('[ValidatorService] Config Error:', error.message);
             this.eventEmitter.emit('validatorConfigError', { schemaName, data, error: error.message });
            throw error;
        }
        try {
            const result = schema.parse(data);
            return result as T;
        } catch (error: any) {
            // Wrap ZodError for consistent handling if needed, or just re-throw
            const validationError = error instanceof ZodError ? error : new Error(`Validation failed for "${schemaName}": ${error.message || String(error)}`);

            this.eventEmitter.emit('validationFailed', {
                schemaName,
                data,
                error: validationError instanceof ZodError ? validationError.issues : validationError.message,
                fullError: validationError // Emit the full error object for more details in logs/trace
            });

            throw validationError; // Re-throw the original or wrapped error
        }
    }

     /**
     * Valida datos contra un schema registrado. Devuelve los datos validados o null si falla.
     * Registra el fallo internamente (log, evento).
     * @param data Los datos a validar.
     * @param schemaName El nombre del schema registrado.
     * @returns Los datos validados (con tipado inferido por Zod) o null si falla.
     * @throws Error If the schema is not registered (config error).
     */
    validateAndLog<T>(data: any, schemaName: string): T | null {
        const schema = this.getSchema(schemaName);
        if (!schema) {
             const configError = new Error(`Schema "${schemaName}" not found for validation.`);
             console.error('[ValidatorService] Config Error:', configError.message, data);
             this.eventEmitter.emit('validatorConfigError', { schemaName, data, error: configError.message });
            throw configError;
        }

        const result = schema.safeParse(data);

        if (!result.success) {
            console.warn(`[ValidatorService] Validation failed for schema "${schemaName}".`, result.error.issues);
            this.eventEmitter.emit('validationFailed', {
                schemaName,
                data,
                error: result.error.issues,
                fullError: result.error // Emit full ZodError
            });
            return null;
        }

        return result.data as T;
    }


     dispose(): void {
         this.schemas.clear();
         console.log('[ValidatorService] Disposed.');
     }
}