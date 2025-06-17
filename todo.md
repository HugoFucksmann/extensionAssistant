¡Excelente! Has proporcionado una arquitectura conceptual muy detallada y ambiciosa para un agente autónomo (AORA). Es una visión fantástica que se alinea con la vanguardia de la investigación en agentes de IA.

En lugar de reemplazar tu arquitectura langgraph actual, la refactorizaremos para que sea el motor de ejecución de los principios de AORA. Tu Planner/Executor actual es una base perfecta. Lo que haremos será inyectarle la capacidad de auto-corrección y razonamiento adaptativo que describes.

El cambio más importante que implementaremos es un ciclo de auto-corrección. Cuando una herramienta falle, en lugar de terminar, el agente analizará el error, decidirá si reintentar, cambiar el plan o continuar, y luego volverá al ciclo de planificación. Esto es el corazón de la adaptación.

Aquí está la refactorización completa para implementar esta capacidad.

Resumen de los Cambios Clave:

Ciclo de Auto-Corrección: El ErrorNode ya no será un callejón sin salida. Analizará el error y devolverá el control al PlannerNode para una acción correctiva.

Servicio de Corrección de Errores (ErrorCorrectionService): Un nuevo servicio dedicado que utiliza un LLM para analizar un error y proponer una solución (retry, modify_plan, continue).

Prompt de Corrección de Errores: Un nuevo prompt estructurado con Zod para guiar al LLM en la toma de decisiones de corrección.

Centralización del Contexto (ContextBuilderService): Un nuevo servicio que actúa como el SituationAssessorNode de tu propuesta. Prepara un contexto rico y relevante para cada nodo (Planner, Executor, Error, Responder), limpiando el código de los nodos y asegurando que cada uno tenga la información precisa que necesita.

Refactorización de Nodos: Los nodos existentes (PlannerNode, ExecutorNode, etc.) se simplificarán enormemente, ya que delegarán la preparación del contexto y la lógica de negocio a sus respectivos servicios.

Actualización del Grafo: Se modificará el GraphBuilder y la TransitionLogic para implementar el nuevo flujo de auto-corrección.

Archivos Modificados y Nuevos

Aquí tienes el código completo de los archivos que necesitan ser modificados o creados. He marcado los cambios importantes con comentarios como // <-- MODIFICAR o // <-- AÑADIR.

1. Nuevos Servicios y Prompts (El Cerebro de la Adaptación)

Estos son los archivos completamente nuevos que implementan la lógica de AORA.

src/core/langgraph/services/ContextBuilderService.ts (NUEVO)
Este servicio es tu SituationAssessorNode. Centraliza la creación de contexto para cada fase del agente.

Generated typescript
// src/core/langgraph/services/ContextBuilderService.ts
import { BaseMessage, isAIMessage, isHumanMessage, isToolMessage } from "@langchain/core/messages";
import { SimplifiedOptimizedGraphState } from "../state/GraphState";
import { IToolRegistry } from "./interfaces/DependencyInterfaces";

// Tipos para los contextos de salida, para mayor claridad.
export type PlannerContext = { userQuery: string; currentPlan: string[]; chatHistory: string; executionHistory: string; };
export type ExecutorContext = { userQuery: string; task: string; availableTools: string; };
export type ResponderContext = { userQuery: string; chatHistory: string; };
export type ErrorHandlerContext = { userQuery: string; currentPlan: string[]; failedTask: string; errorDetails: string; executionHistory: string; };

export class ContextBuilderService {
    constructor(private toolRegistry: IToolRegistry) { }

    public forPlanner(state: SimplifiedOptimizedGraphState): PlannerContext {
        const { chatHistory, executionHistory } = this.formatMessagesForHistory(state.messages);
        return {
            userQuery: state.userInput,
            currentPlan: state.currentPlan,
            chatHistory,
            executionHistory,
        };
    }

    public forExecutor(state: SimplifiedOptimizedGraphState): ExecutorContext {
        if (!state.currentTask) {
            throw new Error("ContextBuilder: No currentTask found in state for Executor.");
        }
        // Proporcionamos una descripción más rica de las herramientas.
        const availableTools = this.toolRegistry.getAllTools().map(tool =>
            `Tool: ${tool.name}\nDescription: ${tool.description}\nParameters (Zod Schema): ${JSON.stringify(tool.parametersSchema.description || tool.parametersSchema._def, null, 2)}`
        ).join('\n\n---\n\n');

        return {
            userQuery: state.userInput,
            task: state.currentTask,
            availableTools,
        };
    }

    public forResponder(state: SimplifiedOptimizedGraphState): ResponderContext {
        const { chatHistory } = this.formatMessagesForHistory(state.messages, true);
        return {
            userQuery: state.userInput,
            chatHistory,
        };
    }

    public forError(state: SimplifiedOptimizedGraphState): ErrorHandlerContext {
        const { executionHistory } = this.formatMessagesForHistory(state.messages);
        return {
            userQuery: state.userInput,
            currentPlan: state.currentPlan,
            failedTask: state.currentTask || "No specific task was being executed.",
            errorDetails: state.error || "Unknown error.",
            executionHistory,
        };
    }

    /**
     * Formatea el historial de mensajes para los prompts, separando la conversación
     * de los resultados de las herramientas y truncando salidas largas.
     */
    private formatMessagesForHistory(messages: BaseMessage[], includeSystemThoughts = false) {
        const chatHistory: string[] = [];
        const executionHistory: string[] = [];

        for (const msg of messages) {
            if (isHumanMessage(msg)) {
                chatHistory.push(`User: ${msg.content}`);
            } else if (isAIMessage(msg)) {
                // Opcionalmente incluir los "thoughts" del sistema para el prompt final.
                if (includeSystemThoughts || !/^(Planner|Executor) Thought:/.test(msg.content as string)) {
                    chatHistory.push(`Assistant: ${msg.content}`);
                }
            } else if (isToolMessage(msg)) {
                let contentStr = typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content);
                // Truncar salidas de herramientas muy largas para ahorrar tokens.
                if (contentStr.length > 1500) {
                    contentStr = contentStr.substring(0, 1500) + "\n... (output truncated)";
                }
                executionHistory.push(`Tool: ${msg.name}\nResult: ${contentStr}`);
            }
        }

        return {
            chatHistory: chatHistory.join('\n'),
            executionHistory: executionHistory.join('\n\n---\n\n') || "No tools have been executed yet.",
        };
    }
}


src/features/ai/prompts/errorCorrectionPrompt.ts (NUEVO)
Este prompt le da al LLM la capacidad de razonar sobre un error y decidir cómo recuperarse.

Generated typescript
// src/features/ai/prompts/errorCorrectionPrompt.ts
import { z } from 'zod';
import { ChatPromptTemplate } from "@langchain/core/prompts";

// 1. Definimos el esquema de salida con Zod para una respuesta estructurada y fiable.
export const errorCorrectionSchema = z.object({
    thought: z.string().describe("Un análisis detallado del error, considerando la tarea que falló y el objetivo general. Explica por qué se elige una acción correctiva específica."),
    decision: z.enum(['retry', 'modify_plan', 'continue']).describe("La acción a tomar: 'retry' para reintentar la misma tarea (quizás con parámetros diferentes si el plan se ajusta), 'modify_plan' para descartar el plan actual y proponer uno nuevo, o 'continue' si el error no es crítico y se puede seguir con la siguiente tarea del plan existente."),
    newPlan: z.array(z.string()).optional().describe("Una lista de nuevas tareas de alto nivel. Solo es obligatorio si la decisión es 'modify_plan'.")
}).refine(data => {
    // Si la decisión es modificar el plan, el nuevo plan debe existir y no estar vacío.
    if (data.decision === 'modify_plan') {
        return Array.isArray(data.newPlan) && data.newPlan.length > 0;
    }
    return true;
}, {
    message: "El campo 'newPlan' es obligatorio y no puede estar vacío cuando la decisión es 'modify_plan'.",
    path: ['newPlan'],
});

export type ErrorCorrectionDecision = z.infer<typeof errorCorrectionSchema>;

// 2. Creamos el prompt que guiará al LLM.
export const errorCorrectionPromptLC = ChatPromptTemplate.fromMessages([
    ["system", `Eres un asistente de IA experto en depuración y auto-corrección. Tu tarea es analizar un error que ha ocurrido durante la ejecución de un plan y decidir la mejor estrategia para recuperarse.

INSTRUCCIONES:
1.  Analiza la 'Consulta Original del Usuario' para entender el objetivo final.
2.  Revisa el 'Plan Actual' y la 'Tarea Específica que Falló'.
3.  Examina los 'Detalles del Error' para diagnosticar la causa raíz (p. ej., archivo no encontrado, parámetros inválidos, error de API, etc.).
4.  Basado en tu análisis, elige una de las siguientes decisiones:
    -   **retry**: Si el error parece transitorio o podría solucionarse con un pequeño ajuste que el planificador pueda hacer en el siguiente paso (p. ej., corregir un nombre de archivo).
    -   **modify_plan**: Si el enfoque actual es fundamentalmente incorrecto y se necesita una nueva estrategia. DEBES proporcionar un 'newPlan' completamente nuevo.
    -   **continue**: Si el error es menor y no impide continuar con la siguiente tarea del plan actual.
5.  Proporciona un razonamiento claro en el campo 'thought'.
6.  Responde ÚNICAMENTE con el objeto JSON especificado.

ESQUEMA JSON DE SALIDA:
{{
  "thought": "string",
  "decision": "'retry' | 'modify_plan' | 'continue'",
  "newPlan": "string[] | undefined"
}}
`],
    ["user", `
CONSULTA ORIGINAL DEL USUARIO:
{userQuery}

PLAN ACTUAL:
{currentPlan}

TAREA ESPECÍFICA QUE FALLÓ:
{failedTask}

DETALLES DEL ERROR:
{errorDetails}

HISTORIAL DE EJECUCIÓN DE HERRAMIENTAS (en este turno):
{executionHistory}
`]
]);
IGNORE_WHEN_COPYING_START
content_copy
download
Use code with caution.
TypeScript
IGNORE_WHEN_COPYING_END

src/core/langgraph/services/ErrorCorrectionService.ts (NUEVO)
Este servicio utiliza el prompt anterior para realizar la corrección.

Generated typescript
// src/core/langgraph/services/ErrorCorrectionService.ts
import { IModelManager, IPromptProvider } from "./interfaces/DependencyInterfaces";
import { ErrorCorrectionDecision, errorCorrectionSchema } from "../../../features/ai/prompts/errorCorrectionPrompt";
import { createAutoCorrectStep } from "../../../shared/utils/aiResponseParser";
import { StringOutputParser } from "@langchain/core/output_parsers";

// Definimos una interfaz para el contexto que necesita este servicio.
export interface ErrorContext {
    userQuery: string;
    currentPlan: string[];
    failedTask: string;
    errorDetails: string;
    executionHistory: string;
}

export class ErrorCorrectionService {
    constructor(
        private modelManager: IModelManager,
        private promptProvider: IPromptProvider
    ) { }

    async analyzeError(context: ErrorContext): Promise<ErrorCorrectionDecision> {
        const model = this.modelManager.getActiveModel();
        const prompt = this.promptProvider.getErrorCorrectionPrompt();

        const chain = prompt
            .pipe(model)
            .pipe(new StringOutputParser())
            .pipe(createAutoCorrectStep(errorCorrectionSchema, model, { throwOnError: true }));

        return await chain.invoke({
            userQuery: context.userQuery,
            currentPlan: context.currentPlan.join('\n') || 'N/A',
            failedTask: context.failedTask,
            errorDetails: context.errorDetails,
            executionHistory: context.executionHistory || 'No tools were executed before the error.',
        });
    }
}
IGNORE_WHEN_COPYING_START
content_copy
download
Use code with caution.
TypeScript
IGNORE_WHEN_COPYING_END
2. Actualización de la Infraestructura del Grafo

Ahora, conectamos los nuevos componentes al sistema.

src/core/langgraph/graph/GraphBuilder.ts (MODIFICADO)
Aquí cambiamos el flujo del grafo para que el ERROR_HANDLER devuelva el control al PLANNER.

Generated typescript
// src/core/langgraph/graph/GraphBuilder.ts
import { StateGraph, START, END } from "@langchain/langgraph";
import { DependencyContainer } from "../dependencies/DependencyContainer";
import { GraphPhase, SimplifiedOptimizedGraphState } from "../state/GraphState";
import { StateAnnotations } from "./StateAnnotations";
import { TransitionLogic } from "./TransitionLogic";
import { IObservabilityManager } from "../services/interfaces/DependencyInterfaces";

import { PlannerNode } from "../nodes/PlannerNode";
import { ExecutorNode } from "../nodes/ExecutorNode";
import { ToolRunnerNode } from "../nodes/ToolRunnerNode";
import { RespondNode } from "../nodes/respondNode";
import { ErrorNode } from "../nodes/ErrorNode";


/**
 * Construye el grafo de ejecución del agente siguiendo una arquitectura Planner/Executor con auto-corrección.
 * El flujo es el siguiente:
 * 1. START -> PLANNER: Se crea o actualiza un plan de acción.
 * 2. PLANNER -> [EXECUTOR | RESPONSE | ERROR_HANDLER]:
 *    - Si hay un error, va a ERROR_HANDLER.
 *    - Si el plan está completo, va a RESPONSE.
 *    - Si hay una nueva tarea, va a EXECUTOR.
 * 3. EXECUTOR -> TOOL_RUNNER: El ejecutor traduce la tarea en una llamada a herramienta.
 * 4. TOOL_RUNNER -> PLANNER: La herramienta se ejecuta y el resultado vuelve al planificador para reevaluar.
 * 5. ERROR_HANDLER -> PLANNER: Si ocurre un error, este nodo lo analiza, decide una acción correctiva
 *    (reintentar, modificar plan), actualiza el estado y devuelve el control al planificador.
 * 6. RESPONSE -> END: Se genera una respuesta final para el usuario y el flujo termina.
 */
export class GraphBuilder {
    constructor(
        private dependencies: DependencyContainer,
        private observability: IObservabilityManager
    ) { }

    public buildGraph(): any {
        const workflow = new StateGraph<SimplifiedOptimizedGraphState>({
            channels: StateAnnotations.getAnnotations(),
        });

        const plannerNode = new PlannerNode(this.dependencies, this.observability);
        const executorNode = new ExecutorNode(this.dependencies, this.observability);
        const toolRunnerNode = new ToolRunnerNode(this.dependencies, this.observability);
        const respondNode = new RespondNode(this.dependencies, this.observability);
        const errorNode = new ErrorNode(this.dependencies, this.observability);

        workflow.addNode(GraphPhase.PLANNER, plannerNode.execute.bind(plannerNode));
        workflow.addNode(GraphPhase.EXECUTOR, executorNode.execute.bind(executorNode));
        workflow.addNode(GraphPhase.TOOL_RUNNER, toolRunnerNode.execute.bind(toolRunnerNode));
        workflow.addNode(GraphPhase.RESPONSE, respondNode.execute.bind(respondNode));
        workflow.addNode(GraphPhase.ERROR_HANDLER, errorNode.execute.bind(errorNode));

        workflow.addEdge(START, GraphPhase.PLANNER);

        workflow.addConditionalEdges(GraphPhase.PLANNER, TransitionLogic.afterPlanner, {
            [GraphPhase.EXECUTOR]: GraphPhase.EXECUTOR,
            [GraphPhase.RESPONSE]: GraphPhase.RESPONSE,
            [GraphPhase.ERROR_HANDLER]: GraphPhase.ERROR_HANDLER,
        });

        workflow.addEdge(GraphPhase.EXECUTOR, GraphPhase.TOOL_RUNNER);
        workflow.addEdge(GraphPhase.TOOL_RUNNER, GraphPhase.PLANNER);

        // <-- MODIFICACIÓN CLAVE:
        // ELIMINAR la vieja conexión a END.
        // workflow.addEdge(GraphPhase.ERROR_HANDLER, END);

        // AÑADIR la nueva conexión de vuelta al Planner.
        workflow.addEdge(GraphPhase.ERROR_HANDLER, GraphPhase.PLANNER);

        // El único nodo que ahora termina el grafo es el de respuesta.
        workflow.addEdge(GraphPhase.RESPONSE, END);

        return workflow;
    }
}
IGNORE_WHEN_COPYING_START
content_copy
download
Use code with caution.
TypeScript
IGNORE_WHEN_COPYING_END

src/core/langgraph/graph/TransitionLogic.ts (MODIFICADO)
La lógica de transición ahora prioriza el enrutamiento a ERROR_HANDLER si existe un error.

Generated typescript
// src/core/langgraph/graph/TransitionLogic.ts
import { GraphPhase, SimplifiedOptimizedGraphState } from "../state/GraphState";

export class TransitionLogic {
    public static afterPlanner(state: SimplifiedOptimizedGraphState): string {
        console.log(`[TransitionLogic] Routing from phase: ${state.currentPhase}`);

        // <-- MODIFICAR: Esta es ahora la condición de máxima prioridad.
        // Si cualquier nodo anterior (incluido el propio Planner) ha establecido un error,
        // se debe ir al manejador de errores inmediatamente.
        if (state.error) {
            console.log(`[TransitionLogic] Error detected. Routing to ${GraphPhase.ERROR_HANDLER}.`);
            return GraphPhase.ERROR_HANDLER;
        }

        // La lógica original se mantiene, pero ahora es la segunda prioridad.
        if (state.isCompleted) {
            console.log(`[TransitionLogic] Plan is complete. Routing to ${GraphPhase.RESPONSE}.`);
            return GraphPhase.RESPONSE;
        }

        // Si no hay errores y el plan no está completo, vamos al ejecutor.
        console.log(`[TransitionLogic] Plan has next step. Routing to ${GraphPhase.EXECUTOR}.`);
        return GraphPhase.EXECUTOR;
    }
}
IGNORE_WHEN_COPYING_START
content_copy
download
Use code with caution.
TypeScript
IGNORE_WHEN_COPYING_END
3. Refactorización de Nodos y Servicios

Ahora refactorizamos los nodos para que usen los nuevos servicios de contexto y corrección.

src/core/langgraph/nodes/ErrorNode.ts (REFACTORIZADO)
Este nodo se convierte en el núcleo de la auto-corrección.

Generated typescript
// src/core/langgraph/nodes/ErrorNode.ts
import { AIMessage } from "@langchain/core/messages";
import { GraphPhase, SimplifiedOptimizedGraphState } from "../state/GraphState";
import { BaseNode, NodeExecutionContext } from "./BaseNode";
import { IErrorCorrectionService, IContextBuilderService } from "../services/interfaces/DependencyInterfaces"; // <-- MODIFICAR

export class ErrorNode extends BaseNode {
    private errorCorrectionService: IErrorCorrectionService; // <-- AÑADIR
    private contextBuilder: IContextBuilderService; // <-- AÑADIR

    constructor(dependencies: any, observability: any) {
        super(GraphPhase.ERROR_HANDLER, dependencies, observability);
        // MODIFICAR: Inyectar los nuevos servicios
        this.errorCorrectionService = dependencies.get('IErrorCorrectionService');
        this.contextBuilder = dependencies.get('IContextBuilderService');
    }

    protected async executeCore(
        state: SimplifiedOptimizedGraphState,
        context: NodeExecutionContext
    ): Promise<Partial<SimplifiedOptimizedGraphState>> {
        console.log(`[ErrorNode] Analyzing error: ${state.error}`);

        // 1. Construir un contexto específico para el análisis del error.
        const errorContext = this.contextBuilder.forError(state);

        // 2. Llamar al servicio de corrección para que el LLM decida qué hacer.
        const decision = await this.errorCorrectionService.analyzeError(errorContext);

        console.log('[ErrorNode] Self-correction decision:', decision);

        // 3. Crear un mensaje de sistema para registrar el pensamiento y la decisión.
        const systemMessage = new AIMessage({
            content: `System Thought (Error Correction): ${decision.thought}\nDecision: ${decision.decision}.`
        });

        const updatedState: Partial<SimplifiedOptimizedGraphState> = {
            messages: [...state.messages, systemMessage],
            // CRUCIAL: Limpiamos el error para que el grafo no entre en un bucle infinito
            // hacia el ErrorNode. El error ya ha sido manejado.
            error: undefined,
        };

        // 4. Modificar el estado del grafo según la decisión del LLM.
        switch (decision.decision) {
            case 'modify_plan':
                // Reemplazamos el plan antiguo por el nuevo propuesto por el LLM.
                updatedState.currentPlan = decision.newPlan;
                updatedState.currentTask = undefined; // Forzar al Planner a elegir una nueva tarea del nuevo plan.
                console.log('[ErrorNode] Modifying plan. New plan:', decision.newPlan);
                break;

            case 'retry':
                // No hacemos nada más. Al limpiar el error, el flujo volverá al Planner,
                // que re-evaluará la misma tarea. El Planner ya tiene lógica para contar reintentos.
                console.log('[ErrorNode] Retrying task. The Planner will re-evaluate.');
                break;

            case 'continue':
                // Marcamos la tarea fallida como "resuelta" (aunque falló) para que el Planner
                // pase a la siguiente. Esto se hace eliminando la tarea del plan.
                if (state.currentTask && state.currentPlan.includes(state.currentTask)) {
                    updatedState.currentPlan = state.currentPlan.filter(task => task !== state.currentTask);
                }
                updatedState.currentTask = undefined;
                console.log('[ErrorNode] Error deemed non-critical. Continuing with the next task.');
                break;
        }

        return updatedState;
    }
}
IGNORE_WHEN_COPYING_START
content_copy
download
Use code with caution.
TypeScript
IGNORE_WHEN_COPYING_END

src/core/langgraph/nodes/PlannerNode.ts (REFACTORIZADO)
El nodo se simplifica, delegando la lógica de contexto.

Generated typescript
// src/core/langgraph/nodes/PlannerNode.ts
import { AIMessage, BaseMessage, ToolMessage, isAIMessage, isHumanMessage, isToolMessage } from "@langchain/core/messages";
import { IPlannerService, IContextBuilderService } from "../services/interfaces/DependencyInterfaces"; // <-- MODIFICAR: Añadir IContextBuilderService
import { GraphPhase, SimplifiedOptimizedGraphState } from "../state/GraphState";
import { BaseNode } from "./BaseNode";

const MAX_TASK_RETRIES = 3;

export class PlannerNode extends BaseNode {
    private plannerService: IPlannerService;
    private contextBuilder: IContextBuilderService; // <-- AÑADIR

    constructor(dependencies: any, observability: any) {
        super(GraphPhase.PLANNER, dependencies, observability);
        this.plannerService = dependencies.get('IPlannerService');
        this.contextBuilder = dependencies.get('IContextBuilderService'); // <-- AÑADIR: Inyectar el servicio
    }

    protected async executeCore(state: SimplifiedOptimizedGraphState): Promise<Partial<SimplifiedOptimizedGraphState>> {
        const lastMessage = state.messages[state.messages.length - 1];
        const lastToolFailed = lastMessage && isToolMessage(lastMessage) && lastMessage.content.toString().startsWith('Error:');

        let retryCount = state.currentTaskRetryCount || 0;

        if (lastToolFailed) {
            retryCount++;
        } else {
            retryCount = 0;
        }

        if (retryCount >= MAX_TASK_RETRIES) {
            const errorMessage = `La tarea "${state.currentTask}" ha fallado ${MAX_TASK_RETRIES} veces. Abortando plan.`;
            console.warn(`[PlannerNode] ${errorMessage}`);
            return {
                messages: [...state.messages, new AIMessage(`System: ${errorMessage}`)],
                isCompleted: true,
                error: errorMessage,
            };
        }

        // MODIFICAR: Delegamos la creación del contexto al nuevo servicio.
        const plannerContext = this.contextBuilder.forPlanner(state);
        const planResult = await this.plannerService.updatePlan(plannerContext);

        console.log('--- [PlannerNode] OUTPUT ---');
        console.log('Thought:', planResult.thought);
        console.log('New Plan:', planResult.plan);
        console.log('Is Complete:', planResult.isPlanComplete);
        console.log('Next Task:', planResult.nextTask);
        console.log('----------------------------');

        const thoughtMessage = new AIMessage({ content: `Planner Thought: ${planResult.thought}` });

        if (planResult.isPlanComplete) {
            return {
                messages: [...state.messages, thoughtMessage],
                currentPlan: [],
                isCompleted: true,
                currentTaskRetryCount: 0,
            };
        }

        const nextRetryCount = planResult.nextTask === state.currentTask ? retryCount : 0;

        return {
            messages: [...state.messages, thoughtMessage],
            currentPlan: planResult.plan,
            currentTask: planResult.nextTask,
            currentTaskRetryCount: nextRetryCount,
        };
    }

    // ELIMINAR: Estos métodos ya no son necesarios aquí.
    // private formatChatHistory(messages: BaseMessage[]): string { ... }
    // private formatExecutionHistory(messages: BaseMessage[]): string { ... }
}
IGNORE_WHEN_COPYING_START
content_copy
download
Use code with caution.
TypeScript
IGNORE_WHEN_COPYING_END

src/core/langgraph/nodes/ExecutorNode.ts (REFACTORIZADO)

Generated typescript
// src/core/langgraph/nodes/ExecutorNode.ts
import { AIMessage } from "@langchain/core/messages";
import { IExecutorService, IToolRegistry, IContextBuilderService } from "../services/interfaces/DependencyInterfaces"; // <-- MODIFICAR: Añadir IContextBuilderService
import { GraphPhase, SimplifiedOptimizedGraphState } from "../state/GraphState";
import { BaseNode } from "./BaseNode";

export class ExecutorNode extends BaseNode {
    private executorService: IExecutorService;
    private toolRegistry: IToolRegistry;
    private contextBuilder: IContextBuilderService; // <-- AÑADIR

    constructor(dependencies: any, observability: any) {
        super(GraphPhase.EXECUTOR, dependencies, observability);
        this.executorService = dependencies.get('IExecutorService');
        this.toolRegistry = dependencies.get('IToolRegistry');
        this.contextBuilder = dependencies.get('IContextBuilderService'); // <-- AÑADIR: Inyectar el servicio
    }

    protected async executeCore(state: SimplifiedOptimizedGraphState): Promise<Partial<SimplifiedOptimizedGraphState>> {
        if (!state.currentTask) {
            throw new Error("ExecutorNode no recibió ninguna tarea para ejecutar.");
        }

        // MODIFICAR: Creamos el contexto y llamamos al servicio.
        const executorContext = this.contextBuilder.forExecutor(state);
        const executorResult = await this.executorService.generateToolCall(executorContext);

        const thoughtMessage = new AIMessage({ content: `Executor Thought: ${executorResult.thought}` });

        const toolCallInfo = {
            tool: executorResult.tool,
            parameters: executorResult.parameters,
        };

        return {
            messages: [...state.messages, thoughtMessage],
            debugInfo: { ...state.debugInfo, pendingToolCall: toolCallInfo },
            currentTask: undefined,
        };
    }
}
IGNORE_WHEN_COPYING_START
content_copy
download
Use code with caution.
TypeScript
IGNORE_WHEN_COPYING_END

src/core/langgraph/nodes/RespondNode.ts (REFACTORIZADO)

Generated typescript
// src/core/langgraph/nodes/RespondNode.ts
import { AIMessage, BaseMessage } from "@langchain/core/messages";
import { IFinalResponseService, IContextBuilderService } from "../services/interfaces/DependencyInterfaces"; // <-- MODIFICAR: Añadir IContextBuilderService
import { GraphPhase, SimplifiedOptimizedGraphState } from "../state/GraphState";
import { BaseNode } from "./BaseNode";
import { EventType } from "../../../features/events/eventTypes";

export class RespondNode extends BaseNode {
    private responseService: IFinalResponseService;
    private contextBuilder: IContextBuilderService; // <-- AÑADIR

    constructor(dependencies: any, observability: any) {
        super(GraphPhase.RESPONSE, dependencies, observability);
        this.responseService = dependencies.get('IFinalResponseService');
        this.contextBuilder = dependencies.get('IContextBuilderService'); // <-- AÑADIR: Inyectar el servicio
        this.dispatcher = dependencies.get('InternalEventDispatcher');
    }

    protected async executeCore(state: SimplifiedOptimizedGraphState): Promise<Partial<SimplifiedOptimizedGraphState>> {
        // MODIFICAR: Creamos el contexto y llamamos al servicio.
        const responderContext = this.contextBuilder.forResponder(state);
        const response = await this.responseService.generateResponse(responderContext);

        const executionTime = Date.now() - state.startTime;

        this.dispatcher.dispatch(EventType.RESPONSE_GENERATED, {
            chatId: state.chatId,
            responseContent: response.response,
            isFinal: true,
            duration: executionTime,
            source: 'RespondNode'
        });

        return {
            messages: [...state.messages, new AIMessage(response.response)],
            isCompleted: true,
            error: undefined,
        };
    }

    // ELIMINAR: Este método ya no es necesario aquí.
    // private formatHistoryForPrompt(messages: BaseMessage[]): string { ... }
}
IGNORE_WHEN_COPYING_START
content_copy
download
Use code with caution.
TypeScript
IGNORE_WHEN_COPYING_END

src/core/langgraph/services/PlannerService.ts (MODIFICADO)
Actualizamos la firma del método para usar el nuevo PlannerContext.

Generated typescript
// src/core/langgraph/services/PlannerService.ts
import { IModelManager, IPromptProvider, } from "./interfaces/DependencyInterfaces"; // <-- MODIFICAR: Importar PlannerContext
import { Plan, planSchema } from "../../../features/ai/prompts/plannerPrompt";
import { createAutoCorrectStep } from "../../../shared/utils/aiResponseParser";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { PlannerContext } from "./ContextBuilderService";

export class PlannerService {
    constructor(
        private modelManager: IModelManager,
        private promptProvider: IPromptProvider
    ) { }

    // MODIFICAR: La firma del método ahora es más limpia y usa el tipo PlannerContext.
    async updatePlan(context: PlannerContext): Promise<Plan> {
        const model = this.modelManager.getActiveModel();
        const prompt = this.promptProvider.getPlannerPrompt();
        const chain = prompt
            .pipe(model)
            .pipe(new StringOutputParser())
            .pipe(createAutoCorrectStep(planSchema, model, { throwOnError: true }));

        // MODIFICAR: Usamos las propiedades del objeto de contexto directamente.
        return await chain.invoke({
            userQuery: context.userQuery,
            chatHistory: context.chatHistory,
            currentPlan: context.currentPlan.join('\n') || 'N/A',
            executionHistory: context.executionHistory,
        });
    }
}
IGNORE_WHEN_COPYING_START
content_copy
download
Use code with caution.
TypeScript
IGNORE_WHEN_COPYING_END

src/core/langgraph/services/ExecutorService.ts (MODIFICADO)

Generated typescript
// src/core/langgraph/services/ExecutorService.ts
import { IModelManager, IPromptProvider, } from "./interfaces/DependencyInterfaces"; // <-- MODIFICAR: Importar ExecutorContext
import { ExecutorOutput, executorSchema } from "../../../features/ai/prompts/executorPrompt";
import { createAutoCorrectStep } from "../../../shared/utils/aiResponseParser";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { ExecutorContext } from "./ContextBuilderService";

export class ExecutorService {
    constructor(
        private modelManager: IModelManager,
        private promptProvider: IPromptProvider
    ) { }

    // MODIFICAR: La firma del método ahora usa ExecutorContext.
    async generateToolCall(context: ExecutorContext): Promise<ExecutorOutput> {
        const model = this.modelManager.getActiveModel();
        const prompt = this.promptProvider.getExecutorPrompt();
        const chain = prompt
            .pipe(model)
            .pipe(new StringOutputParser())
            .pipe(createAutoCorrectStep(executorSchema, model, { throwOnError: true }));

        // MODIFICAR: Usamos las propiedades del objeto de contexto.
        return await chain.invoke({
            task: context.task,
            userQuery: context.userQuery,
            availableTools: context.availableTools,
        });
    }
}
IGNORE_WHEN_COPYING_START
content_copy
download
Use code with caution.
TypeScript
IGNORE_WHEN_COPYING_END

src/core/langgraph/services/FinalResponseService.ts (MODIFICADO)

Generated typescript
// src/core/langgraph/services/FinalResponseService.ts
import { IModelManager, IPromptProvider } from "./interfaces/DependencyInterfaces"; // <-- MODIFICAR: Importar ResponderContext
import { FinalResponse, finalResponseSchema } from "../../../features/ai/prompts/finalResponsePrompt";
import { createAutoCorrectStep } from "../../../shared/utils/aiResponseParser";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { ResponderContext } from "./ContextBuilderService";

export class FinalResponseService {
    constructor(
        private modelManager: IModelManager,
        private promptProvider: IPromptProvider
    ) { }

    // MODIFICAR: La firma del método ahora usa ResponderContext.
    async generateResponse(context: ResponderContext): Promise<FinalResponse> {
        const model = this.modelManager.getActiveModel();
        const prompt = this.promptProvider.getFinalResponsePrompt();
        const chain = prompt
            .pipe(model)
            .pipe(new StringOutputParser())
            .pipe(createAutoCorrectStep(finalResponseSchema, model, { throwOnError: true }));

        // MODIFICAR: Usamos las propiedades del objeto de contexto.
        return await chain.invoke({
            userQuery: context.userQuery,
            chatHistory: context.chatHistory,
        });
    }
}
IGNORE_WHEN_COPYING_START
content_copy
download
Use code with caution.
TypeScript
IGNORE_WHEN_COPYING_END
4. Conectando las Dependencias

Finalmente, actualizamos los archivos de registro de dependencias para que el sistema conozca los nuevos componentes.

src/core/langgraph/services/PromptProvider.ts (MODIFICADO)

Generated typescript
// src/core/langgraph/services/PromptProvider.ts
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { IPromptProvider } from "./interfaces/DependencyInterfaces";

import { plannerPromptLC } from "../../../features/ai/prompts/plannerPrompt";
import { executorPromptLC } from "../../../features/ai/prompts/executorPrompt";
import { finalResponsePromptLC } from "../../../features/ai/prompts/finalResponsePrompt";
import { errorCorrectionPromptLC } from "../../../features/ai/prompts/errorCorrectionPrompt"; // <-- AÑADIR

export class PromptProvider implements IPromptProvider {
    public getPlannerPrompt(): ChatPromptTemplate {
        return plannerPromptLC;
    }
    public getExecutorPrompt(): ChatPromptTemplate {
        return executorPromptLC;
    }
    public getFinalResponsePrompt(): ChatPromptTemplate {
        return finalResponsePromptLC;
    }
    public getErrorCorrectionPrompt(): ChatPromptTemplate { // <-- AÑADIR
        return errorCorrectionPromptLC;
    }
}
IGNORE_WHEN_COPYING_START
content_copy
download
Use code with caution.
TypeScript
IGNORE_WHEN_COPYING_END

src/core/langgraph/services/interfaces/DependencyInterfaces.ts (MODIFICADO)

Generated typescript
// src/core/langgraph/services/interfaces/DependencyInterfaces.ts
import { BaseMessage } from "@langchain/core/messages";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { SimplifiedOptimizedGraphState } from "../../state/GraphState";

import { ModelManager } from "../../../../features/ai/ModelManager";
import { ToolRegistry } from "../../../../features/tools/ToolRegistry";
import { MemoryManager } from "../../../../features/memory/MemoryManager";
import { ObservabilityManager } from "../../observability/ObservabilityManager";

// --- SALIDAS DE PROMPTS ---
import { Plan } from '../../../../features/ai/prompts/plannerPrompt';
import { ExecutorOutput } from '../../../../features/ai/prompts/executorPrompt';
import { FinalResponse } from '../../../../features/ai/prompts/finalResponsePrompt';
import { ErrorCorrectionDecision } from "../../../../features/ai/prompts/errorCorrectionPrompt";

// --- CONTEXTOS DE SERVICIO ---
import { ErrorContext } from "../ErrorCorrectionService"; // <-- AÑADIR
import { PlannerContext, ExecutorContext, ResponderContext, ErrorHandlerContext } from "../ContextBuilderService"; // <-- AÑADIR

// --- SERVICIOS ---
export interface IPlannerService {
    updatePlan(context: PlannerContext): Promise<Plan>; // <-- MODIFICAR
}
export interface IExecutorService {
    generateToolCall(context: ExecutorContext): Promise<ExecutorOutput>; // <-- MODIFICAR
}
export interface IFinalResponseService {
    generateResponse(context: ResponderContext): Promise<FinalResponse>; // <-- MODIFICAR
}
export interface IErrorCorrectionService { // <-- AÑADIR
    analyzeError(context: ErrorContext): Promise<ErrorCorrectionDecision>;
}

// --- PROVEEDOR DE PROMPTS ---
export interface IPromptProvider {
    getPlannerPrompt(): ChatPromptTemplate;
    getExecutorPrompt(): ChatPromptTemplate;
    getFinalResponsePrompt(): ChatPromptTemplate;
    getErrorCorrectionPrompt(): ChatPromptTemplate; // <-- AÑADIR
}

// --- SERVICIOS DE INFRAESTRUCTURA ---
export interface StructuredMemoryContext { workingMemorySnapshot: string; retrievedKnowledgeChunks: string[]; }
export interface IMemoryService {
    getStructuredContext(chatId: string, query: string, objective?: string): Promise<StructuredMemoryContext>;
    updateWorkingMemory(chatId: string, newInfo: string, currentMessages: BaseMessage[], objective?: string): Promise<void>;
}
export interface IContextBuilderService { // <-- AÑADIR
    forPlanner(state: SimplifiedOptimizedGraphState): PlannerContext;
    forExecutor(state: SimplifiedOptimizedGraphState): ExecutorContext;
    forResponder(state: SimplifiedOptimizedGraphState): ResponderContext;
    forError(state: SimplifiedOptimizedGraphState): ErrorHandlerContext;
}

// --- DEPENDENCIAS PRINCIPALES ---
export type IModelManager = ModelManager;
export type IToolRegistry = ToolRegistry;
export type IMemoryManager = MemoryManager;
export type IObservabilityManager = ObservabilityManager;
IGNORE_WHEN_COPYING_START
content_copy
download
Use code with caution.
TypeScript
IGNORE_WHEN_COPYING_END

src/core/langgraph/dependencies/ServiceRegistry.ts (MODIFICADO)

Generated typescript
// src/core/langgraph/dependencies/ServiceRegistry.ts
import { ModelManager } from "../../../features/ai/ModelManager";
import { MemoryManager } from "../../../features/memory/MemoryManager";
import { ToolRegistry } from "../../../features/tools/ToolRegistry";
import { HybridMemoryService } from "../services/HybridMemoryService";
import {
    IPlannerService, IExecutorService, IFinalResponseService, IMemoryService,
    IModelManager, IToolRegistry, IMemoryManager, IPromptProvider, IObservabilityManager,
    IErrorCorrectionService, IContextBuilderService // <-- AÑADIR
} from "../services/interfaces/DependencyInterfaces";
import { PromptProvider } from "../services/PromptProvider";
import { PlannerService } from "../services/PlannerService";
import { ExecutorService } from "../services/ExecutorService";
import { FinalResponseService } from "../services/FinalResponseService";
import { DependencyContainer } from "./DependencyContainer";
import { ObservabilityManager } from "../observability/ObservabilityManager";
import { InternalEventDispatcher } from "../../events/InternalEventDispatcher";
import { PerformanceMonitor } from "../../monitoring/PerformanceMonitor";
import { CacheManager } from "../../utils/CacheManager";
import { ParallelExecutionService } from "../../utils/ParallelExecutionService";
import { ErrorCorrectionService } from "../services/ErrorCorrectionService"; // <-- AÑADIR
import { ContextBuilderService } from "../services/ContextBuilderService"; // <-- AÑADIR

export class ServiceRegistry {

    public static createContainer(
        modelManager: ModelManager,
        toolRegistry: ToolRegistry,
        memoryManager: MemoryManager,
        dispatcher: InternalEventDispatcher,
        performanceMonitor: PerformanceMonitor,
        cacheManager: CacheManager,
        parallelExecutionService: ParallelExecutionService
    ): DependencyContainer {
        const container = new DependencyContainer();

        // Dependencias base
        container.register<CacheManager>('CacheManager', cacheManager);
        container.register<ParallelExecutionService>('ParallelExecutionService', parallelExecutionService);
        container.register<IModelManager>('IModelManager', modelManager);
        container.register<IToolRegistry>('IToolRegistry', toolRegistry);
        container.register<IMemoryManager>('IMemoryManager', memoryManager);
        container.register<InternalEventDispatcher>('InternalEventDispatcher', dispatcher);

        const promptProvider = new PromptProvider();
        container.register<IPromptProvider>('IPromptProvider', promptProvider);

        const observabilityManager = new ObservabilityManager(dispatcher, performanceMonitor);
        container.register<IObservabilityManager>('IObservabilityManager', observabilityManager);

        container.register<IMemoryService>('IMemoryService', new HybridMemoryService(memoryManager, modelManager));

        // --- AÑADIR NUEVOS SERVICIOS ---
        container.register<IContextBuilderService>('IContextBuilderService', new ContextBuilderService(toolRegistry));
        container.register<IErrorCorrectionService>('IErrorCorrectionService', new ErrorCorrectionService(modelManager, promptProvider));
        // ---------------------------------

        // Servicios de la arquitectura Planner/Executor
        container.register<IPlannerService>('IPlannerService', new PlannerService(modelManager, promptProvider));
        container.register<IExecutorService>('IExecutorService', new ExecutorService(modelManager, promptProvider));
        container.register<IFinalResponseService>('IFinalResponseService', new FinalResponseService(modelManager, promptProvider));

        return container;
    }
}
IGNORE_WHEN_COPYING_START
content_copy
download
Use code with caution.
TypeScript
IGNORE_WHEN_COPYING_END

Con estos cambios, tu agente ahora posee una capacidad rudimentaria pero poderosa de auto-corrección, un pilar fundamental de la autonomía que describiste en tu arquitectura AORA. El sistema ya no se detendrá ante un error, sino que razonará sobre él y adaptará su enfoque, acercándose mucho más a tu visión de un agente verdaderamente autónomo.