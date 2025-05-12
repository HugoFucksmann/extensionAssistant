Estructura de Archivos:
src/
├── orchestrator/
│   ├── index.ts                       // Public exports
│   ├── orchestrator.ts                // Main orchestrator class
│   ├── context/
│   │   ├── index.ts                   // Context exports
│   │   ├── interactionContext.ts      // Context management
│   │   └── persistenceManager.ts      // Context storage
│   ├── execution/
│   │   ├── index.ts                   // Execution exports
│   │   ├── stepExecutor.ts            // Step execution logic
│   │   ├── stepRegistry.ts            // Step type registry
│   │   └── types.ts                   // Step interfaces
│   └── handlers/
│       ├── index.ts                   // Handler exports
│       ├── baseHandler.ts             // Abstract handler class
│       ├── conversationHandler.ts     // General conversation
│       ├── explainCodeHandler.ts      // Code explanation
│       └── fixCodeHandler.ts          // Code fixing
├── tools/
│   ├── index.ts                       // Tool exports
│   ├── filesystem/
│   │   ├── index.ts                   // FS tool exports
│   │   ├── fileReader.ts              // File reading
│   │   └── fileWriter.ts              // File writing
│   ├── project/
│   │   ├── index.ts                   // Project tool exports
│   │   ├── search.ts                  // Code search
│   │   └── symbols.ts                 // Symbol lookup
│   └── execution/
│       ├── index.ts                   // Execution tool exports
│       └── runner.ts                  // Code execution
├── models/
│   ├── index.ts                       // Model exports
│   ├── promptRegistry.ts              // Prompt type registry
│   ├── promptSystem.ts                // Model interaction
│   └── templates/                     // Prompt templates
│       ├── conversation.ts            // Conversation prompts
│       ├── codeExplanation.ts         // Explanation prompts
│       └── codeFix.ts                 // Fixing prompts
├── ui/
│   ├── chatView.ts                    // Chat panel
│   ├── diffView.ts                    // Code diff view
│   └── progressReporter.ts            // Progress indicators
├── utils/
│   ├── logger.ts                      // Logging utilities
│   └── telemetry.ts                   // Usage metrics
├── config.ts                          // Extension config
├── toolRunner.ts                      // Tool execution
└── extension.ts                       // Entry point
.
2. Definir los Tipos de Ejecución (orchestrator/execution/types.ts)
Aquí definimos la interfaz ExecutionStep y cualquier otro tipo relevante para la ejecución de pasos.
// src/orchestrator/execution/types.ts

/**
 * Define a single step in an execution flow.
 * Can be a tool call or a model prompt interaction.
 */
export interface ExecutionStep {
  /** Unique name for this step within its context (useful for logging/debugging). */
  name: string;
  /** The type of execution: 'tool' or 'prompt'. */
  type: 'tool' | 'prompt';
  /** The specific tool name or prompt type to execute. */
  execute: string;
  /** Parameters for the tool or prompt. Can contain {{placeholders}}. */
  params?: Record<string, any>;
  /** Optional condition function to determine if this step should run. */
  condition?: (context: Record<string, any>) => boolean; // Condition checks against the RESOLVED context
  /** Key in the InteractionContext to store the result of this step. */
  storeAs?: string;
  /** Optional: Timeout for the step in milliseconds. */
  timeout?: number;
  // Optional: Error handling strategy reference?
  // Optional: Dependencies? (Less needed if handlers control sequence)
}

// Define structure for Step execution results stored in context
export interface StepResult<T = any> {
    success: boolean;
    result?: T; // Actual result from tool/prompt
    error?: any; // Error object if failed
    timestamp: number;
    step: ExecutionStep; // Reference to the step definition
}
.

3. El Contexto de Interacción (orchestrator/context/interactionContext.ts)
Mejoramos la clase InteractionContext para permitir el almacenamiento genérico de valores por clave, que es lo que necesitará el StepExecutor.
// src/orchestrator/context/interactionContext.ts

// Define la forma del resultado del inputAnalyzer (importar si es posible)
interface InputAnalysisResult {
  intent: 'conversation' | 'explainCode' | 'fixCode';
  objective: string;
  extractedEntities: {
    filesMentioned: string[];
    functionsMentioned: string[];
    errorsMentioned: string[];
    customKeywords: string[];
  };
  confidence: number;
}

interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
    timestamp: number; // Added timestamp
}

// Define la forma del estado interno del contexto
interface InteractionContextState {
    chatId: string; // Added chatId for persistence
    chatHistory: ChatMessage[];
    analysisResult?: InputAnalysisResult;
    // Almacenamiento genérico para resultados de pasos, contexto de código, etc.
    [key: string]: any;
}

export class InteractionContext {
    private state: InteractionContextState;

    constructor(chatId: string, initialState: Partial<InteractionContextState> = {}) {
        this.state = {
            chatId: chatId,
            chatHistory: [],
            ...initialState
        };
        // Ensure chatHistory is initialized even if initialState has it
         if (!this.state.chatHistory) {
             this.state.chatHistory = [];
         }
    }

    getChatId(): string {
        return this.state.chatId;
    }

    addMessage(role: 'user' | 'assistant', content: string) {
        this.state.chatHistory.push({ role, content, timestamp: Date.now() });
        // Optional: Trim chat history if too long
        // if (this.state.chatHistory.length > 100) {
        //     this.state.chatHistory = this.state.chatHistory.slice(-100);
        // }
    }

    getHistory(limit?: number): ChatMessage[] {
         const history = [...this.state.chatHistory];
         if (limit !== undefined) {
             return history.slice(-limit);
         }
         return history;
    }

     // Format history for model prompts
    getHistoryForModel(limit?: number): string {
        return this.getHistory(limit).map(msg => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`).join('\n');
    }


    setAnalysisResult(analysis: InputAnalysisResult) {
        this.state.analysisResult = analysis;
    }

    getAnalysisResult(): InputAnalysisResult | undefined {
        return this.state.analysisResult;
    }

    // Métodos genéricos para acceder y modificar el estado
    setValue(key: string, value: any) {
        this.state[key] = value;
         console.log(`[Context:${this.state.chatId}] Stored '${key}'`, value); // Log para debug
    }

    getValue<T = any>(key: string): T | undefined {
        return this.state[key] as T | undefined;
    }

    // Conveniencia para acceder a datos comunes
    getObjective(): string | undefined {
        return this.getValue<InputAnalysisResult>('analysisResult')?.objective;
    }

    getExtractedEntities(): InputAnalysisResult['extractedEntities'] | undefined {
        return this.getValue<InputAnalysisResult>('analysisResult')?.extractedEntities;
    }

    // Puedes añadir getters/setters específicos si la lógica lo requiere
    // getProposedChanges(): any | undefined { return this.getValue('proposedChanges'); }
    // setProposedChanges(changes: any) { this.setValue('proposedChanges', changes); }

    // Método para obtener una vista del contexto para la resolución de parámetros
    // Combina diferentes partes del estado en un solo objeto plano o anidado si es necesario.
    getResolutionContext(): Record<string, any> {
        // Esto depende de qué datos quieres que sean accesibles vía {{...}}
        // Un enfoque simple es exponer todo el estado plano:
        const flatState: Record<string, any> = {};
        for (const key in this.state) {
             if (key !== 'chatHistory') { // Excluir historial completo si es muy grande
                  flatState[key] = this.state[key];
             }
        }
        // O exponer partes específicas de forma estructurada:
        // return {
        //     analysis: this.getAnalysisResult(),
        //     userMessage: this.getValue('userMessage'),
        //     projectInfo: this.getValue('projectInfo'),
        //     ...this.getValue('gatheredData') // Si usas una clave específica para datos recopilados
        // };
        return flatState; // Usamos el enfoque plano por ahora
    }

    // Método para obtener el estado completo para persistencia/debugging
    getState(): InteractionContextState {
        return JSON.parse(JSON.stringify(this.state)); // Devuelve una copia profunda
    }

    // Método para restaurar el estado (útil para cargar contexto persistido)
    restoreState(state: InteractionContextState) {
        this.state = state;
    }
}
.

4. El Ejecutor de Pasos (orchestrator/execution/stepExecutor.ts)
Esta clase toma un ExecutionStep, resuelve sus parámetros usando el InteractionContext, ejecuta la tool o prompt, y almacena el resultado en el contexto.
// src/orchestrator/execution/stepExecutor.ts

import { ToolRunner } from "../../toolRunner"; // Asume que ToolRunner es accesible
import { executeModelInteraction } from "../../models/promptSystem"; // Asume que es una función
import { InteractionContext } from "../context/interactionContext";
import { ExecutionStep, StepResult } from "./types";

export class StepExecutor {
    private toolRunner: typeof ToolRunner;
    private executeModelInteraction: typeof executeModelInteraction;

    constructor(toolRunner: typeof ToolRunner, executeModelInteraction: typeof executeModelInteraction) {
        this.toolRunner = toolRunner;
        this.executeModelInteraction = executeModelInteraction;
    }

    /**
     * Executes a single step, resolves parameters from context, and stores the result.
     * Includes basic error handling and logging.
     * Does NOT implement fallback strategies directly - handlers decide fallbacks.
     * Does NOT implement step validation directly - handlers decide validation steps.
     */
    public async runStep(step: ExecutionStep, context: InteractionContext): Promise<StepResult> {
        const chatId = context.getChatId();
        console.log(`[StepExecutor:${chatId}] Running step '${step.name}' (Type: ${step.type}, Execute: ${step.execute})`);

        // 1. Check condition if present
        if (step.condition && !step.condition(context.getResolutionContext())) {
            console.log(`[StepExecutor:${chatId}] Skipping step '${step.name}' due to condition.`);
            return { success: true, result: 'skipped', timestamp: Date.now(), step };
        }

        let rawResult: any;
        let success = true;
        let error: any;

        try {
            // 2. Resolve parameters using context
            const resolvedParams = this.resolveParameters(step.params || {}, context.getResolutionContext());
            console.log(`[StepExecutor:${chatId}] Resolved params for '${step.name}':`, resolvedParams);

            // 3. Execute the step (Tool or Prompt)
            if (step.type === 'tool') {
                // ToolRunner.runTool typically returns { success: boolean, content: any, error?: any }
                rawResult = await this.toolRunner.runTool(step.execute, resolvedParams);
                success = rawResult.success;
                if (!success) {
                    error = rawResult.error;
                    console.error(`[StepExecutor:${chatId}] Tool execution failed for '${step.name}':`, error);
                } else {
                    rawResult = rawResult.content; // Extrae solo el contenido si el formato es {success, content}
                     console.log(`[StepExecutor:${chatId}] Tool execution succeeded for '${step.name}'.`);
                }

            } else if (step.type === 'prompt') {
                 // executeModelInteraction typically returns the parsed model response or throws on error
                try {
                    rawResult = await this.executeModelInteraction(step.execute as any, resolvedParams);
                    success = true; // Assumes executeModelInteraction throws on error
                     console.log(`[StepExecutor:${chatId}] Prompt execution succeeded for '${step.name}'.`);
                } catch (e) {
                    success = false;
                    error = e;
                    console.error(`[StepExecutor:${chatId}] Prompt execution failed for '${step.name}':`, error);
                }

            } else {
                success = false;
                error = new Error(`Unknown step type: ${step.type}`);
                console.error(`[StepExecutor:${chatId}] Invalid step type for '${step.name}':`, error);
            }

        } catch (e) {
            success = false;
            error = e;
            console.error(`[StepExecutor:${chatId}] Unexpected error during step execution for '${step.name}':`, error);
        }

        // 4. Store result in context if storeAs is specified and step didn't fail critically
        if (step.storeAs && success) { // Only store successful results? Or store {success, result, error}? Let's store the raw successful result for {{}} lookup.
             context.setValue(step.storeAs, rawResult);
             // Could also store a structured StepResult object: context.setValue(step.storeAs, { success, result: rawResult, error });
        } else if (step.storeAs && !success) {
             // Opcional: Guardar el error o un indicador de fallo en el contexto
             context.setValue(`${step.storeAs}_error`, error?.message || 'Execution failed');
             console.warn(`[StepExecutor:${chatId}] Stored error indicator for '${step.name}' at '${step.storeAs}_error'.`);
        }


        // 5. Return a structured StepResult
        return {
            success: success,
            result: rawResult,
            error: error,
            timestamp: Date.now(),
            step: step,
        };
    }

    /**
     * Resolves parameter placeholders using data from the context.
     * Looks for {{key}} patterns in string values.
     */
    private resolveParameters(params: Record<string, any>, contextData: Record<string, any>): Record<string, any> {
        const resolvedParams: Record<string, any> = {};

        for (const [key, value] of Object.entries(params)) {
            if (typeof value === 'string' && value.startsWith('{{') && value.endsWith('}}')) {
                const contextKey = value.substring(2, value.length - 2);
                // Look up the key in the context data
                // Use a fallback to null or undefined if not found
                resolvedParams[key] = contextData[contextKey] !== undefined ? contextData[contextKey] : null; // Or undefined
            } else if (Array.isArray(value)) {
                // Recursively resolve parameters in arrays if needed (basic example)
                 resolvedParams[key] = value.map(item => {
                     if (typeof item === 'string' && item.startsWith('{{') && item.endsWith('}}')) {
                          const contextKey = item.substring(2, item.length - 2);
                           return contextData[contextKey] !== undefined ? contextData[contextKey] : null;
                     }
                     return item;
                 });
            }
            else {
                resolvedParams[key] = value;
            }
        }

        return resolvedParams;
    }

     // Optional: Add runSteps method for sequential or parallel execution of multiple steps
     // async runSteps(steps: ExecutionStep[], context: InteractionContext): Promise<StepResult[]> { ... }
}
.

5. La Clase Base para Handlers (orchestrator/handlers/baseHandler.ts)
Aseguramos que los handlers tengan acceso al contexto y al StepExecutor.
// src/orchestrator/handlers/baseHandler.ts

import { InteractionContext } from '../context/interactionContext';
import { StepExecutor } from '../execution/stepExecutor'; // Import StepExecutor
import { ExecutionStep } from '../execution/types'; // Import types

export abstract class BaseHandler {
    protected context: InteractionContext;
    protected stepExecutor: StepExecutor; // Add StepExecutor

    constructor(context: InteractionContext, stepExecutor: StepExecutor) { // Receive StepExecutor in constructor
        this.context = context;
        this.stepExecutor = stepExecutor;
    }

    /**
     * Handles the specific intent. Uses this.context and this.stepExecutor.
     * Should orchestrate the execution of steps relevant to the intent.
     * @returns A promise resolving to the final string response or indicator for UI action.
     */
    abstract handle(): Promise<string>;

    /**
     * Helper to run a single step using the executor.
     * @param step The step definition.
     * @returns The result of the step execution.
     */
    protected async runExecutionStep(step: ExecutionStep): Promise<StepResult> {
        return this.stepExecutor.runStep(step, this.context);
    }

     // Optional: Add helper for running sequences or parallel steps
     // protected async runExecutionSteps(steps: ExecutionStep[]): Promise<StepResult[]> { ... }
}
.

6. Handlers (Ejemplos Modificados)
Los handlers ahora usarán this.runExecutionStep() para ejecutar partes de su lógica.
Manejador de Conversación (handlers/conversationHandler.ts)
Simplificado, usa el executor para la llamada final al modelo.
// src/orchestrator/handlers/conversationHandler.ts
import { BaseHandler } from './baseHandler';
import { ExecutionStep, StepResult } from '../execution/types'; // Import types

export class ConversationHandler extends BaseHandler {
    async handle(): Promise<string> {
        const analysis = this.context.getAnalysisResult();
        const objective = this.context.getObjective() || 'Engage in conversation';

        // Get necessary info from context (already added by Orchestrator)
        const chatHistory = this.context.getHistoryForModel(20);
        const projectInfo = this.context.getValue('projectInfo');
        const userMessage = this.context.getValue('userMessage');
        const referencedFilesContent = this.context.getValue('referencedFilesContent'); // Si se leyeron al inicio

        // Define the step to call the conversation model
        const conversationStep: ExecutionStep = {
            name: 'generateConversationResponse',
            type: 'prompt',
            execute: 'conversationResponder', // Assuming this prompt type exists
            params: {
                objective: objective,
                chatHistory: chatHistory, // Pass processed history directly
                extractedEntities: analysis?.extractedEntities,
                userMessage: userMessage, // Pass user message explicitly
                projectContext: projectInfo,
                referencedFilesContent: referencedFilesContent // Si aplica
            },
            storeAs: 'conversationResponseResult' // Store the raw response
        };

        // Run the step
        const stepResult = await this.runExecutionStep(conversationStep);

        // Check result and return response
        if (stepResult.success && stepResult.result !== undefined) {
            return stepResult.result; // The raw response from the model
        } else {
            console.error("ConversationHandler: Failed to generate response:", stepResult.error);
            // Fallback or specific error message
            return "Sorry, I couldn't generate a response right now.";
        }
    }
}
.

Manejador de Explicar Código (handlers/explainCodeHandler.ts)
Aquí se ve el patrón iterativo usando el StepExecutor.
// src/orchestrator/handlers/explainCodeHandler.ts
import { BaseHandler } from './baseHandler';
import { ExecutionStep, StepResult } from '../execution/types';

export class ExplainCodeHandler extends BaseHandler {
    async handle(): Promise<string> {
        const objective = this.context.getObjective();
        const entities = this.context.getExtractedEntities();
        const userMessage = this.context.getValue('userMessage');

        if (!objective) {
             return "I need a clear objective to explain the code. What specifically would you like me to explain?";
        }

        console.log("ExplainCodeHandler: Starting context gathering...");

        // --- Paso 1: Recopilación de Contexto Inicial (usando StepExecutor) ---
        // Define steps for initial gathering (e.g., reading mentioned files)
        const initialGatheringSteps: ExecutionStep[] = (entities?.filesMentioned || []).map(filePath => ({
            name: `readInitialFile:${filePath}`,
            type: 'tool',
            execute: 'filesystem.getFileContents', // Tool name
            params: { filePath: filePath },
            storeAs: `fileContent:${filePath}` // Store content under a specific key pattern
        }));

        // If no files mentioned, try getting active editor content
        if (initialGatheringSteps.length === 0) {
             initialGatheringSteps.push({
                 name: 'readActiveEditor',
                 type: 'tool',
                 execute: 'filesystem.getActiveEditorContent', // Assuming this tool exists
                 storeAs: 'activeEditorContent' // Store active file content
             });
             console.log("ExplainCodeHandler: No initial files, trying active editor.");
        } else {
            console.log(`ExplainCodeHandler: Initial files to read: ${entities?.filesMentioned.join(', ')}`);
        }


        // Execute initial steps (you might want a helper to run steps sequentially or in parallel)
        // For simplicity here, let's just run them one by one (or loop if needed)
        for (const step of initialGatheringSteps) {
            await this.runExecutionStep(step);
             // Handle result if necessary (e.g., check for errors, add user message if file not found)
        }


        // --- Paso 2 & 3: Evaluación Iterativa del Contexto y Recopilación Adicional ---
        let contextSufficient = false;
        let iteration = 0;
        const MAX_GATHERING_ITERATIONS = 3;

        while (!contextSufficient && iteration < MAX_GATHERING_ITERATIONS) {
            iteration++;
            console.log(`ExplainCodeHandler: Gathering context iteration ${iteration}...`);

            // Step to evaluate current context and suggest next steps
            const evaluateStep: ExecutionStep = {
                name: `evaluateExplainContext-${iteration}`,
                type: 'prompt',
                execute: 'explainContextEvaluator', // Prompt name
                params: {
                    objective: objective,
                    // Pass *relevant* context gathered so far.
                    // Use getResolutionContext() to access stored values via {{}}.
                    // Or manually build a context object for the prompt.
                    currentContext: this.context.getResolutionContext(),
                    extractedEntities: entities,
                    chatHistory: this.context.getHistoryForModel(10),
                    userMessage: userMessage
                },
                storeAs: `evaluationResult-${iteration}` // Store evaluation result (e.g., { sufficient: boolean, suggestedSteps: [...] })
            };

            const evaluationResultStep = await this.runExecutionStep(evaluateStep);

            const evaluation = evaluationResultStep.result as { sufficient: boolean, suggestedSteps?: ExecutionStep[] }; // Cast to expected type

            contextSufficient = evaluation?.sufficient ?? false;

            if (!contextSufficient && evaluation?.suggestedSteps && evaluation.suggestedSteps.length > 0) {
                console.log(`ExplainCodeHandler: Model suggested ${evaluation.suggestedSteps.length} tools to gather more context.`);
                // Execute suggested steps
                for (const suggestedStep of evaluation.suggestedSteps) {
                     // Ensure suggested steps have unique names/storeAs keys if running in parallel
                     // Or add iteration info:
                     suggestedStep.name = `${suggestedStep.name}-${iteration}`;
                     if(suggestedStep.storeAs) suggestedStep.storeAs = `${suggestedStep.storeAs}-${iteration}`;

                    const stepResult = await this.runExecutionStep(suggestedStep);
                    // Handle result of suggested step (log error, etc.)
                    if (!stepResult.success) {
                         console.warn(`ExplainCodeHandler: Suggested step failed: ${suggestedStep.name}`, stepResult.error);
                         // Decide if failure is critical or can be ignored
                    }
                }
            } else if (!contextSufficient) {
                console.warn("ExplainCodeHandler: Model indicates context insufficient but provided no tools or suggestions. Stopping gathering.");
                break; // Exit loop if model can't suggest next steps
            }
        }

        console.log(`ExplainCodeHandler: Finished gathering. Context sufficient: ${contextSufficient}`);

        // --- Paso 4: Generar la Explicación Final ---
        if (!contextSufficient && iteration === MAX_GATHERING_ITERATIONS) {
             // Check if we have any code at all, even if insufficient
            const hasCode = Object.keys(this.context.getResolutionContext()).some(key => key.startsWith('fileContent:') || key === 'activeEditorContent');
            if (hasCode) {
                 // Still try to explain based on what we got
                 console.warn("ExplainCodeHandler: Max iterations reached, context might be insufficient, attempting explanation anyway.");
            } else {
                return "I couldn't find any relevant code to explain. Please specify a file or select code in the editor.";
            }
        }

        // Step to generate final explanation
        const generateExplanationStep: ExecutionStep = {
            name: 'generateExplanation',
            type: 'prompt',
            execute: 'explanationGenerator', // Prompt name
            params: {
                objective: objective,
                // Pass all gathered context relevant for explanation
                fullContext: this.context.getResolutionContext(), // Pass everything or select specific keys
                chatHistory: this.context.getHistoryForModel(5), // Recent history for tone
                extractedEntities: entities,
                userMessage: userMessage
            },
            storeAs: 'finalExplanationResult' // Store the final explanation
        };

        const explanationResultStep = await this.runExecutionStep(generateExplanationStep);

        if (explanationResultStep.success && explanationResultStep.result !== undefined) {
            return explanationResultStep.result; // The final explanation text
        } else {
            console.error("ExplainCodeHandler: Failed to generate explanation:", explanationResultStep.error);
            return "Sorry, I encountered an error while generating the explanation.";
        }
    }
}
.

Manejador de Arreglar Código (handlers/fixCodeHandler.ts)
Similar a explicar código, pero añade pasos para proponer y validar cambios.
// src/orchestrator/handlers/fixCodeHandler.ts
import { BaseHandler } from './baseHandler';
import { ExecutionStep, StepResult } from '../execution/types';

export class FixCodeHandler extends BaseHandler {
    async handle(): Promise<string> {
        const objective = this.context.getObjective();
        const entities = this.context.getExtractedEntities();
        const userMessage = this.context.getValue('userMessage');

        if (!objective) {
             return "I need a clear objective to fix code. What problem are you trying to solve?";
        }

        console.log("FixCodeHandler: Starting analysis and context gathering...");

        // --- Pasos 1, 2, 3: Entender el Problema y Recopilar Contexto (usando StepExecutor) ---
        // Similar a ExplainCodeHandler, but might include different initial steps (e.g., search)
        const initialGatheringSteps: ExecutionStep[] = [
             // Example: Read mentioned files, or active editor if none mentioned
             // Example: Search for error messages if entities include errors
             // Example: Get definition of mentioned functions/symbols
             {
                 name: 'readActiveEditorForFix',
                 type: 'tool',
                 execute: 'filesystem.getActiveEditorContent',
                 storeAs: 'activeEditorContentForFix' // Use a different key or handle conflicts
             },
             // Assuming a tool like 'project.search' exists
             ...(entities?.errorsMentioned || []).map(errorMsg => ({
                 name: `searchError:${errorMsg}`,
                 type: 'tool',
                 execute: 'project.search',
                 params: { query: errorMsg },
                 storeAs: `searchResults:${errorMsg}`
             }))
        ];

        for (const step of initialGatheringSteps) {
             await this.runExecutionStep(step);
        }

        // Iterative context gathering loop (similar to ExplainCodeHandler)
        let contextSufficient = false;
        let iteration = 0;
        const MAX_GATHERING_ITERATIONS = 4; // Maybe more iterations needed for fixing

        while (!contextSufficient && iteration < MAX_GATHERING_ITERATIONS) {
             iteration++;
             console.log(`FixCodeHandler: Gathering context iteration ${iteration}...`);

             // Step to evaluate context for fixing
             const evaluateStep: ExecutionStep = {
                 name: `evaluateFixContext-${iteration}`,
                 type: 'prompt',
                 execute: 'fixContextEvaluator', // Prompt name
                 params: {
                     objective: objective,
                     currentContext: this.context.getResolutionContext(), // Pass gathered context
                     extractedEntities: entities,
                     chatHistory: this.context.getHistoryForModel(10),
                     userMessage: userMessage
                 },
                 storeAs: `fixEvaluationResult-${iteration}`
             };

             const evaluationResultStep = await this.runExecutionStep(evaluateStep);
             const evaluation = evaluationResultStep.result as { sufficient: boolean, suggestedSteps?: ExecutionStep[] };

             contextSufficient = evaluation?.sufficient ?? false;

             if (!contextSufficient && evaluation?.suggestedSteps && evaluation.suggestedSteps.length > 0) {
                 console.log(`FixCodeHandler: Model suggested ${evaluation.suggestedSteps.length} tools to gather more context for fix.`);
                 for (const suggestedStep of evaluation.suggestedSteps) {
                      suggestedStep.name = `${suggestedStep.name}-${iteration}`;
                      if(suggestedStep.storeAs) suggestedStep.storeAs = `${suggestedStep.storeAs}-${iteration}`;
                     const stepResult = await this.runExecutionStep(suggestedStep);
                     if (!stepResult.success) {
                          console.warn(`FixCodeHandler: Suggested step failed: ${suggestedStep.name}`, stepResult.error);
                     }
                 }
             } else if (!contextSufficient) {
                 console.warn("FixCodeHandler: Model indicates fix context insufficient but provided no tools or suggestions. Stopping gathering.");
                 break;
             }
        }

         console.log(`FixCodeHandler: Finished gathering. Context sufficient: ${contextSufficient}`);


        // --- Paso 4: Proponer la Solución (Generar Cambios) ---
        if (!contextSufficient && iteration === MAX_GATHERING_ITERATIONS) {
            return "I couldn't gather enough information to propose a fix for that issue. Please provide more details or context.";
        }

        // Step to generate the fix proposal
        const proposeFixStep: ExecutionStep = {
            name: 'proposeCodeFix',
            type: 'prompt',
            execute: 'fixProposer', // Prompt name
            params: {
                objective: objective,
                fullContext: this.context.getResolutionContext(), // Pass all relevant context
                chatHistory: this.context.getHistoryForModel(5),
                extractedEntities: entities,
                userMessage: userMessage
            },
            storeAs: 'proposedChangesResult' // Store the structured proposed changes
        };

        const proposeResultStep = await this.runExecutionStep(proposeFixStep);

        if (!proposeResultStep.success || proposeResultStep.result === undefined) {
             console.error("FixCodeHandler: Failed to propose fix:", proposeResultStep.error);
             return "Sorry, I couldn't generate a proposed fix at this time.";
        }

        const proposedChanges = proposeResultStep.result;
        // Store the proposed changes in a dedicated context key for UI access
        this.context.setValue('proposedChanges', proposedChanges);
        console.log("FixCodeHandler: Proposed changes stored in context.");


        // --- Paso 5 (Opcional): Validación Interna del Código Arreglado ---
        // Puedes añadir pasos aquí para validar el código antes de mostrárselo al usuario.
        // Por ejemplo, ejecutar un linter tool o un prompt de validación.
        const validateFixStep: ExecutionStep = {
            name: 'validateProposedFix',
            type: 'prompt', // Or type: 'tool' if you have a linter/compile tool
            execute: 'codeValidator', // Prompt name or Tool name
            params: {
                originalCode: this.context.getValue('activeEditorContentForFix'), // Example of getting original code
                proposedChanges: proposedChanges, // Pass the proposed changes
                fullContext: this.context.getResolutionContext() // Maybe more context needed for validation
            },
            storeAs: 'fixValidationResult'
        };

        const validationResultStep = await this.runExecutionStep(validateFixStep);
        const validationResult = validationResultStep.result as { isValid: boolean, feedback?: string }; // Assuming prompt returns this structure

        let validationMessage = "";
        if (!validationResultStep.success || !validationResult?.isValid) {
            console.warn("FixCodeHandler: Proposed fix validation failed or encountered errors.");
             validationMessage = validationResult?.feedback || "Note: The proposed fix could not be automatically validated and might still contain issues.";
             this.context.setValue('proposedFixValidationFailed', true); // Indicate failure in context
        } else {
            console.log("FixCodeHandler: Proposed fix validation successful.");
            validationMessage = validationResult?.feedback || "The proposed fix passed internal validation.";
            this.context.setValue('proposedFixValidationFailed', false);
        }


        // --- Paso 6: Notificar a la UI y Devolver Mensaje ---
        // Devuelve un mensaje al usuario. La UI revisará el contexto para 'proposedChanges'.
        let responseMessage = "I've analyzed the issue and generated a potential fix. Please review the proposed changes.";
        if (validationMessage) {
             responseMessage += `\n\n${validationMessage}`; // Add validation feedback
        }

        return responseMessage;
        // Real UI might return: { type: 'showProposedChanges', message: responseMessage }
    }

    // Helper methods like explainCurrentProblem could also use StepExecutor internally
}
.

7. El Orquestador Principal (orchestrator/orchestrator.ts)
Gestiona el ciclo de vida del contexto y utiliza el StepExecutor y los Handlers.
// src/orchestrator/orchestrator.ts

import { executeModelInteraction } from '../models/promptSystem'; // Your model interaction function
import { ToolRunner } from '../toolRunner'; // Your ToolRunner class
import { InteractionContext } from './context/interactionContext'; // Your context class
import { StepExecutor } from './execution/stepExecutor'; // Your new executor
import { ExecutionStep } from './execution/types'; // Your types
import { BaseHandler } from './handlers/baseHandler'; // Base handler
import { ConversationHandler, ExplainCodeHandler, FixCodeHandler } from './handlers'; // Specific handlers

// Define the shape of the input analysis result (repeat or import)
interface InputAnalysisResult {
  intent: 'conversation' | 'explainCode' | 'fixCode';
  objective: string;
  extractedEntities: {
    filesMentioned: string[];
    functionsMentioned: string[];
    errorsMentioned: string[];
    customKeywords: string[];
  };
  confidence: number;
}

/**
 * The main orchestrator that manages conversations, analyzes input,
 * and delegates tasks to appropriate handlers using the StepExecutor.
 */
export class Orchestrator {
    // Manages contexts for different chat IDs (simplified in-memory storage)
    private contexts: Map<string, InteractionContext>;
    private stepExecutor: StepExecutor; // Instance of the StepExecutor

    constructor() {
        this.contexts = new Map();
        // Initialize the StepExecutor with dependencies
        this.stepExecutor = new StepExecutor(ToolRunner, executeModelInteraction); // Pass actual dependencies
    }

    /**
     * Retrieves or creates the interaction context for a given chat ID.
     * In a real extension, this would handle loading/saving persisted context.
     */
    private getOrCreateContext(chatId: string): InteractionContext {
        if (!this.contexts.has(chatId)) {
            console.log(`[Orchestrator] Creating new context for chat ID: ${chatId}`);
            // TODO: Load persisted context here if it exists
            const newContext = new InteractionContext(chatId);
            this.contexts.set(chatId, newContext);
            return newContext;
        }
        console.log(`[Orchestrator] Using existing context for chat ID: ${chatId}`);
        return this.contexts.get(chatId)!; // Non-null assertion is safe due to has() check
    }

    /**
     * Processes the user message for a specific chat conversation.
     * @param chatId A unique identifier for the conversation/chat session.
     * @param text The text of the user's prompt.
     * @param files Optional list of referenced files (e.g., active editor).
     * @param projectInfo Optional general project information.
     * @returns A promise resolving to the response string for the user.
     */
    public async processUserMessage(chatId: string, text: string, files?: string[], projectInfo?: any): Promise<string> {
        const context = this.getOrCreateContext(chatId);
        context.addMessage('user', text); // Add user message to history immediately
        context.setValue('userMessage', text); // Store current user message in state for easy access
        context.setValue('referencedFiles', files || []); // Store referenced files
        context.setValue('projectInfo', projectInfo); // Store project info

        console.log(`[Orchestrator:${chatId}] Received message: "${text}"`);

        let analysis: InputAnalysisResult;
        try {
           // Step to analyze input using the StepExecutor
           const analyzeStep: ExecutionStep = {
               name: 'analyzeUserInput',
               type: 'prompt',
               execute: 'inputAnalyzer', // Your input analyzer prompt type
               params: {
                 userPrompt: text,
                 referencedFiles: files || [],
                 projectContext: projectInfo || {},
                 chatHistory: context.getHistoryForModel(10) // Pass recent history
               },
               storeAs: 'analysisResult' // Store the result directly in context
           };
           const analysisResultStep = await this.stepExecutor.runStep(analyzeStep, context);

           if (!analysisResultStep.success || analysisResultStep.result === undefined) {
               throw new Error(`Input analysis failed: ${analysisResultStep.error?.message || 'Unknown error'}`);
           }
           analysis = analysisResultStep.result as InputAnalysisResult; // Cast the stored result
           console.log(`[Orchestrator:${chatId}] Input analysis complete. Intent: ${analysis.intent}`);

        } catch (error: any) {
           console.error(`[Orchestrator:${chatId}] Error during input analysis:`, error);
           const errorMessage = "Sorry, I couldn't understand your request. Can you please rephrase?";
           context.addMessage('assistant', errorMessage);
           return errorMessage; // Return error message to user
        }


        // 3. Delegate to a specific handler based on the analyzed intent
        let response = "An internal error occurred."; // Default message
        let selectedHandler: BaseHandler;

        try {
          // Pass the SAME context instance and the StepExecutor to the handler
          switch (analysis.intent) {
            case 'conversation':
              selectedHandler = new ConversationHandler(context, this.stepExecutor);
              break;
            case 'explainCode':
              selectedHandler = new ExplainCodeHandler(context, this.stepExecutor);
              break;
            case 'fixCode':
              selectedHandler = new FixCodeHandler(context, this.stepExecutor);
              break;
            default:
              console.warn(`[Orchestrator:${chatId}] Unhandled intent: ${analysis.intent}. Falling back to conversation.`);
              selectedHandler = new ConversationHandler(context, this.stepExecutor);
               // Optional: Add a note to the context/history that intent was unhandled
               context.setValue('unhandledIntent', analysis.intent);
              break;
          }

          // Execute the selected handler's logic
          response = await selectedHandler.handle(); // Handler orchestrates steps and returns final response/indicator

        } catch (error: any) {
           console.error(`[Orchestrator:${chatId}] Error during ${analysis.intent} handling:`, error);
           response = `An error occurred while processing your request (${analysis.intent}). Error: ${error.message}`;
        }

        // 4. Add assistant response to history (after handler finishes)
        context.addMessage('assistant', response);

        // TODO: Implement context persistence here (save context.getState())

        // 5. Return the response for the UI to display
        // The UI layer should also check context.getValue('proposedChanges') etc.
        return response;
    }

    // Public method for UI layer to access context data if needed (e.g., proposed changes)
    public getInteractionContext(chatId: string): InteractionContext | undefined {
        return this.contexts.get(chatId);
    }

    // TODO: Method to clear context? (e.g., new chat session)
    // public clearContext(chatId: string): void { this.contexts.delete(chatId); }
}
.

8. Integración en extension.ts
Necesitarás pasar un chatId único a cada llamada del orquestador para mantener el contexto por conversación. Puedes generar uno al inicio de cada nueva "sesión" de chat en tu UI de VS Code.
// src/extension.ts
import * as vscode from 'vscode';
import { Orchestrator } from './orchestrator'; // Import your orchestrator

// Manage orchestrator instance(s) - maybe one per workspace, or a singleton
let orchestrator: Orchestrator;
let currentChatId = 'default-chat'; // Simple example: a single chat ID

export function activate(context: vscode.ExtensionContext) {
	console.log('Your VS Code AI Assistant extension is activated!');

    // Initialize the orchestrator
    orchestrator = new Orchestrator();

	// Register a command to simulate chat input
	let disposable = vscode.commands.registerCommand('yourExtension.sendChatMessage', async () => {
        // In a real extension, input comes from your chat UI input box
		const input = await vscode.window.showInputBox({
            prompt: "Ask me something about your code or project..."
        });

        if (input === undefined || input.trim() === '') {
            return;
        }

        // Get context for the current active file
        const activeEditor = vscode.window.activeTextEditor;
        const referencedFiles = activeEditor ? [activeEditor.document.uri.fsPath] : [];

        // Get basic project context (replace with a more robust method)
        const projectInfo = vscode.workspace.rootPath ? { rootPath: vscode.workspace.rootPath, name: vscode.workspace.name } : {};

        // Use a progress indicator while processing
		vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: "AI Assistant is thinking...",
            cancellable: false
        }, async (progress) => {
            try {
                // Call the orchestrator with the unique chat ID
                const assistantResponse = await orchestrator.processUserMessage(currentChatId, input, referencedFiles, projectInfo);

                // In a real UI, this response would be added to the chat history panel
                vscode.window.showInformationMessage(`Assistant: ${assistantResponse}`, { modal: true });

                // After getting the response, check if there are proposed changes in the context
                const context = orchestrator.getInteractionContext(currentChatId);
                if (context) {
                     const proposedChanges = context.getValue('proposedChanges');
                     const validationFailed = context.getValue('proposedFixValidationFailed');

                     if (proposedChanges) {
                         console.log("Extension: Proposed changes detected. Prompting user to review.");
                         // Trigger UI to show diff view
                         vscode.window.showInformationMessage(
                             `Code changes proposed${validationFailed ? ' (Validation failed)' : ''}. Review them?`,
                             "Review Changes"
                         ).then(selection => {
                             if (selection === "Review Changes") {
                                  // Call a command/function to display the diff UI, passing proposedChanges
                                  // await vscode.commands.executeCommand('yourExtension.showDiff', proposedChanges);
                                  vscode.window.showInformationMessage("Diff UI command not yet implemented.");
                             }
                         });
                          // Clear proposed changes from context after prompting? Depends on UI flow.
                          // context.setValue('proposedChanges', undefined);
                          // context.setValue('proposedFixValidationFailed', undefined);
                     }
                }


            } catch (error: any) {
                vscode.window.showErrorMessage(`AI Assistant Error: ${error.message}`);
                console.error(error);
            }
        });
	});

	context.subscriptions.push(disposable);

    // You would also need commands for your actual chat UI interaction,
    // handling message sending, starting new chats (generating new chatIds),
    // and applying proposed fixes (calling a tool via StepExecutor or directly).
     let newChatDisposable = vscode.commands.registerCommand('yourExtension.newChat', () => {
         currentChatId = `chat-${Date.now()}`; // Generate a new unique ID
         vscode.window.showInformationMessage(`Started a new chat session (ID: ${currentChatId})`);
         // Clear UI history in a real chat panel
     });
    context.subscriptions.push(newChatDisposable);

     // Example command to apply changes (would be triggered from your diff UI)
     let applyChangesDisposable = vscode.commands.registerCommand('yourExtension.applyProposedChanges', async () => {
          const context = orchestrator.getInteractionContext(currentChatId);
          const proposedChanges = context?.getValue('proposedChanges');

          if (!context || !proposedChanges) {
               vscode.window.showWarningMessage("No proposed changes to apply.");
               return;
          }

          // TODO: Implement logic to apply changes using a ToolRunner or a dedicated StepExecutor call
          vscode.window.withProgress({
              location: vscode.ProgressLocation.Notification,
              title: "Applying Changes...",
              cancellable: false
          }, async () => {
              try {
                  // Assuming you have a tool like 'filesystem.applyChanges'
                  // This tool would need the structure of proposedChanges
                  // const applyStep: ExecutionStep = {
                  //     name: 'applyCodeChanges',
                  //     type: 'tool',
                  //     execute: 'filesystem.applyChanges',
                  //     params: { changes: proposedChanges }, // Pass the changes structure
                  //     storeAs: 'applyChangesResult' // Store result of apply operation
                  // };
                  // // Need a way to run a step directly from here, maybe via orchestrator or a dedicated executor instance
                  // const executor = new StepExecutor(ToolRunner, executeModelInteraction); // Or get instance from Orchestrator
                  // const result = await executor.runStep(applyStep, context);

                  // For now, just simulate application
                  console.log("Simulating applying changes:", proposedChanges);
                  vscode.window.showInformationMessage("Code changes simulated applied. Implement the 'filesystem.applyChanges' tool.");
                  // TODO: Clear proposed changes from context after successful application?
                  context.setValue('proposedChanges', undefined);
                   context.setValue('proposedFixValidationFailed', undefined);

              } catch (error: any) {
                  vscode.window.showErrorMessage(`Failed to apply changes: ${error.message}`);
                  console.error(error);
              }
          });
     });
     context.subscriptions.push(applyChangesDisposable);
}

export function deactivate() {
    // Cleanup logic if necessary
    // TODO: Save contexts if needed
}
.

Explicación del Flujo Combinado:
Orquestador Recibe Mensaje: Orchestrator.processUserMessage(chatId, ...).
Contexto: El Orquestador obtiene o crea un InteractionContext único para ese chatId. Almacena el mensaje del usuario y otra información inicial en el contexto.
Análisis de Input: El Orquestador define un ExecutionStep para la llamada al inputAnalyzer y usa el StepExecutor para ejecutarlo. El resultado (analysisResult) se almacena directamente en el InteractionContext mediante la clave storeAs.
Selección de Handler: El Orquestador lee analysisResult del contexto y selecciona el BaseHandler apropiado (ConversationHandler, etc.).
Delegación al Handler: El Orquestador instancia el Handler, pasándole la instancia del InteractionContext de esa conversación y una instancia del StepExecutor.
Lógica del Handler: El Handler toma el control. Contiene la lógica específica para su intención.
En lugar de llamar directamente a ToolRunner o executeModelInteraction, el Handler define uno o más ExecutionStep que necesita ejecutar.
Para ejecutar un paso, llama a this.runExecutionStep(step).
this.runExecutionStep (que es un método helper en BaseHandler llamando al StepExecutor) usa el InteractionContext para resolver cualquier placeholder {{...}} en los step.params.
El StepExecutor ejecuta la tool o prompt real, maneja errores básicos y, si step.storeAs está definido, almacena el resultado exitoso de vuelta en el InteractionContext usando context.setValue(key, value).
Los Handlers complejos como ExplainCodeHandler o FixCodeHandler usan bucles (while) y llamadas condicionales a executeModelInteraction (ej. 'explainContextEvaluator') y this.runExecutionStep para implementar su comportamiento iterativo ("agente"). Deciden dinámicamente qué pasos ejecutar a continuación basándose en los resultados obtenidos del contexto.
Handler Devuelve Respuesta: Una vez que el Handler ha completado su objetivo, devuelve una respuesta (típicamente una cadena de texto, pero podría ser un objeto para indicar acciones de UI).
Orquestador Finaliza: El Orquestador recibe la respuesta del Handler, la añade al historial del InteractionContext, y la devuelve a la capa de UI de VS Code para que se muestre al usuario.
UI Revisa Contexto: La capa de UI de VS Code, después de recibir la respuesta, puede opcionalmente acceder al InteractionContext de la conversación (a través de un método público en Orchestrator) para buscar datos específicos como proposedChanges y activar flujos de UI adicionales (como mostrar un diff).