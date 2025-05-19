// src/observability/TraceService.ts
// MODIFIED: Removed getCurrentTraceId method.

import { EventEmitterService } from '../events/EventEmitterService';
import { Logger } from './Logger';
import { randomUUID } from 'crypto'; // Para IDs de traza únicos

// Interfaz básica para los datos de una traza
interface Trace {
    id: string;
    name: string;
    startTime: number;
    endTime?: number;
    status: 'running' | 'completed' | 'failed';
    initialData?: any;
    steps: Array<{
        id: string; // Puede ser ID de step, toolName, promptType, etc.
        type: 'step' | 'tool' | 'prompt' | 'event';
        name?: string;
        startTime: number;
        endTime?: number;
        status: 'running' | 'completed' | 'failed' | 'skipped';
        data?: any; // Input/params
        result?: any; // Output
        error?: any; // Error
    }>;
    finalResult?: any;
    error?: any;
}


/**
 * Servicio Singleton para rastrear la ejecución (especialmente flujos como LangGraph turns).
 * Escucha eventos y usa el Logger para registrar el progreso.
 * Trace IDs are managed by the caller (OrchestratorService) and passed to methods.
 */
export class TraceService {
    private static instance: TraceService;
    private logger: Logger;
    private eventEmitter: EventEmitterService;
    private activeTraces: Map<string, Trace> = new Map(); // Para rastrear trazas en curso

    private constructor(logger: Logger, eventEmitter: EventEmitterService) {
        this.logger = logger;
        this.eventEmitter = eventEmitter;
        console.log('[TraceService] Initialized.');
        // Podríamos empezar a escuchar eventos aquí
        // this.setupEventListeners();
    }

    public static getInstance(logger: Logger, eventEmitter: EventEmitterService): TraceService {
        if (!TraceService.instance) {
            TraceService.instance = new TraceService(logger, eventEmitter);
        }
        return TraceService.instance;
    }

    // private setupEventListeners(): void {
    //     this.eventEmitter.on('toolCalled', ({ toolName, params }) => this.logToolCall(toolName, params));
    //     // ... más listeners para otros eventos clave
    // }

    /**
     * Starts a new trace.
     * @param name The name of the trace (e.g., "Turn: <chatId>").
     * @param initialData Optional initial data for the trace.
     * @returns The generated trace ID.
     */
    startTrace(name: string, initialData?: any): string {
        const traceId = randomUUID(); // Or use a conversation/turn ID if preferred
        const newTrace: Trace = {
            id: traceId,
            name,
            startTime: Date.now(),
            status: 'running',
            initialData,
            steps: []
        };
        this.activeTraces.set(traceId, newTrace);
        this.logger.info(`[Trace:${traceId}] Started trace "${name}"`);
        this.eventEmitter.emit('traceStarted', { traceId, name, initialData }); // Emit event
        return traceId;
    }

    /**
     * Adds a step to an active trace.
     * @param traceId The ID of the trace.
     * @param stepId A unique ID for the step within the trace.
     * @param type The type of step ('tool', 'prompt', etc.).
     * @param name An optional name for the step.
     * @param data Optional input/params for the step.
     */
    addStepToTrace(traceId: string, stepId: string, type: Trace['steps'][number]['type'], name?: string, data?: any): void {
         const trace = this.activeTraces.get(traceId);
         if (!trace) {
             this.logger.warn(`[TraceService] addStepToTrace called for unknown trace ID: ${traceId}`);
             return;
         }
         const newStep = {
            id: stepId,
            type,
            name,
            startTime: Date.now(),
            status: 'running' as const, // <-- Esto asegura el tipo correcto
            data
        };
         trace.steps.push(newStep);
         this.logger.debug(`[Trace:${traceId}] Step started: ${name || stepId} (${type})`);
         this.eventEmitter.emit('traceStepStarted', { traceId, stepId, type, name, data }); // Emit event
    }

    /**
     * Ends the last step of a trace with a completed status.
     * @param traceId The ID of the trace.
     * @param result Optional output/result of the step.
     */
    endLastStep(traceId: string, result?: any): void {
         const trace = this.activeTraces.get(traceId);
         if (!trace || trace.steps.length === 0) {
              this.logger.warn(`[TraceService] endLastStep called for unknown trace ID or no active steps: ${traceId}`);
              return;
         }
         const lastStep = trace.steps[trace.steps.length - 1];
         lastStep.endTime = Date.now();
         lastStep.status = 'completed';
         lastStep.result = result;
         this.logger.debug(`[Trace:${traceId}] Step completed: ${lastStep.name || lastStep.id}. Duration: ${lastStep.endTime - lastStep.startTime}ms`);
         this.eventEmitter.emit('traceStepCompleted', { traceId, stepId: lastStep.id, result }); // Emit event
    }

     /**
      * Ends the last step of a trace with a failed status.
      * @param traceId The ID of the trace.
      * @param error The error that occurred.
      */
     failLastStep(traceId: string, error: any): void {
        const trace = this.activeTraces.get(traceId);
        if (!trace || trace.steps.length === 0) {
             this.logger.warn(`[TraceService] failLastStep called for unknown trace ID or no active steps: ${traceId}`);
             return;
        }
        const lastStep = trace.steps[trace.steps.length - 1];
        lastStep.endTime = Date.now();
        lastStep.status = 'failed';
        lastStep.error = error;
        this.logger.error(`[Trace:${traceId}] Step failed: ${lastStep.name || lastStep.id}. Duration: ${lastStep.endTime - lastStep.startTime}ms`, error);
        this.eventEmitter.emit('traceStepFailed', { traceId, stepId: lastStep.id, error }); // Emit event
     }

     /**
      * Marks the last step of a trace as skipped.
      * @param traceId The ID of the trace.
      * @param reason Optional reason for skipping.
      */
     skipLastStep(traceId: string, reason?: string): void {
        const trace = this.activeTraces.get(traceId);
        if (!trace || trace.steps.length === 0) {
             this.logger.warn(`[TraceService] skipLastStep called for unknown trace ID or no active steps: ${traceId}`);
             return;
        }
        const lastStep = trace.steps[trace.steps.length - 1];
        lastStep.endTime = Date.now(); // Optional, could not have duration
        lastStep.status = 'skipped';
        lastStep.result = { skipped: true, reason };
        this.logger.debug(`[Trace:${traceId}] Step skipped: ${lastStep.name || lastStep.id}. Reason: ${reason || 'No reason provided'}`);
        this.eventEmitter.emit('traceStepSkipped', { traceId, stepId: lastStep.id, reason }); // Emit event
     }


    /**
     * Ends a trace with a completed status.
     * @param traceId The ID of the trace.
     * @param finalResult Optional final result of the trace.
     */
    endTrace(traceId: string, finalResult?: any): void {
        const trace = this.activeTraces.get(traceId);
        if (!trace) {
            this.logger.warn(`[TraceService] endTrace called for unknown trace ID: ${traceId}`);
            return;
        }
        trace.endTime = Date.now();
        trace.status = 'completed';
        trace.finalResult = finalResult;
        this.logger.info(`[Trace:${traceId}] Completed trace "${trace.name}". Total duration: ${trace.endTime - trace.startTime}ms`);
        this.activeTraces.delete(traceId);
        this.eventEmitter.emit('traceCompleted', { traceId, name: trace.name, finalResult, duration: trace.endTime - trace.startTime }); // Emit event
    }

    /**
     * Ends a trace with a failed status.
     * @param traceId The ID of the trace.
     * @param error The error that caused the trace to fail.
     */
    failTrace(traceId: string, error: any): void {
        const trace = this.activeTraces.get(traceId);
        if (!trace) {
            this.logger.warn(`[TraceService] failTrace called for unknown trace ID: ${traceId}`);
            return;
        }
        trace.endTime = Date.now();
        trace.status = 'failed';
        trace.error = error;
        this.logger.error(`[Trace:${traceId}] FAILED trace "${trace.name}". Total duration: ${trace.endTime - trace.startTime}ms`, error);
        this.activeTraces.delete(traceId);
        this.eventEmitter.emit('traceFailed', { traceId, name: trace.name, error, duration: trace.endTime - trace.startTime }); // Emit event
    }

    /**
     * Disposes the service, clearing active traces.
     */
     dispose(): void {
         this.activeTraces.clear();
         // If setupEventListeners was used, unregister listeners here
         console.log('[TraceService] Disposed.');
     }

     // REMOVED: Method to get current trace ID - traceId is passed explicitly now
     /*
     getCurrentTraceId(): string {
         // This method is problematic in async contexts unless using async_hooks.
         // The traceId should be passed explicitly from the orchestrator/graph state.
         throw new Error("getCurrentTraceId is deprecated. Pass traceId explicitly.");
     }
     */
}