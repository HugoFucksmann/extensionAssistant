Plan de Refactorización Propuesto:

Centralizar Persistencia de ExecutionStepEntity (Consistencia):

Acción: Asegurar que PromptService y LangChainToolAdapter sean los únicos responsables de llamar a StepPersistenceService.saveExecutionStep().

Impacto:

En graph.ts, los nodos (analyze_input_node, plan_node, etc.) ya no construirán ExecutionStepEntity ni llamarán a TurnStateService.updateTurnState() con datos de ExecutionStepEntity.

TurnStateService.updateTurnState() se simplificará para solo actualizar el IFlowContextState en memoria (principalmente planningHistory y los resultados de los pasos).

planningHistory en IFlowContextState podría almacenar una versión más simplificada de la información del paso si la ExecutionStepEntity completa ya está en la BD.

Ejemplo (conceptual) en analyze_input_node (graph.ts):

// Antes (parcialmente)
// const stepEntityData: Partial<ExecutionStepEntity> = { ... };
// const finalState = await turnStateService.updateTurnState(stepEntityData, stateUpdates);
// return finalState;

// Después
const analysisResult = await promptService.executePrompt('inputAnalyzer', contextSnapshot, state.traceId!);
const stateUpdates: Partial<IFlowContextState> = { analysisResult };

// TurnStateService solo actualiza el estado en memoria y el planningHistory
const finalState = await turnStateService.updateTurnState(
    { // Datos para planningHistory
        stepName: 'AnalyzeInput',
        stepType: 'prompt',
        stepExecute: 'inputAnalyzer',
        status: 'completed', // Asumir éxito, PromptService maneja errores
        result: analysisResult,
        planningIteration: state.planningIteration,
    },
    stateUpdates
);
return finalState;


Modificación en TurnStateService.updateTurnState():

// Antes: async updateTurnState(stepEntityData: Partial<ExecutionStepEntity>, updates: Partial<IFlowContextState> = {}): Promise<IFlowContextState>
// Ahora:
async updateTurnState(
    planningHistoryEntryData: { // Datos para construir la entrada de planningHistory
        stepName: string;
        stepType: 'tool' | 'prompt' | 'step'; // 'step' para entradas genéricas
        stepExecute: string;
        status: 'completed' | 'failed' | 'skipped';
        result?: any;
        error?: any;
        planningIteration?: number;
    },
    updates: Partial<IFlowContextState> = {}
): Promise<IFlowContextState> {
    const currentState = this.getCurrentState();

    // 1. NO hay persistencia de ExecutionStepEntity aquí.

    // 2. Aplicar updates al estado en memoria
    Object.assign(currentState, updates);

    // 3. Actualizar Planning History en el estado
    const historyEntry = {
        action: `${planningHistoryEntryData.stepType}:${planningHistoryEntryData.stepExecute}`,
        stepName: planningHistoryEntryData.stepName,
        result: planningHistoryEntryData.result,
        error: planningHistoryEntryData.error,
        status: planningHistoryEntryData.status,
        timestamp: Date.now(), // O tomar de planningHistoryEntryData si se pasa
        planningIteration: planningHistoryEntryData.planningIteration || currentState.planningIteration,
    };
    if (currentState.planningHistory) {
        currentState.planningHistory.push(historyEntry);
    } else {
        currentState.planningHistory = [historyEntry];
    }
    return currentState;
}
IGNORE_WHEN_COPYING_START
content_copy
download
Use code with caution.
TypeScript
IGNORE_WHEN_COPYING_END

Simplificar Manejo de Comandos en UIBridge (Dispatcher Genérico):

Acción: Crear un sistema de registro de comandos en UIBridge donde cada comando tenga asociado su schema de validación de payload y su función handler.

Impacto: UIBridge._handleCommand() se vuelve un dispatcher más pequeño y mantenible.

Ejemplo (UIBridge.ts):

interface CommandDefinition<P = any, R = void> {
    payloadSchema?: ZodSchema<P>; // Schema para validar el payload.params
    handler: (params: P) => Promise<R>;
}

export class UIBridge {
    private commands: Map<string, CommandDefinition<any, any>> = new Map();

    constructor(...) {
        // ...
        this.registerCommands();
    }

    private registerCommands(): void {
        this.commands.set('getChatList', {
            handler: () => this._handleGetChatList()
        });
        this.commands.set('loadChat', {
            payloadSchema: LoadChatCommandPayloadSchema.shape.params, // Validar solo .params
            handler: (params: { chatId: string }) => this._handleLoadChat(params.chatId)
        });
        this.commands.set('updateChatTitle', {
            payloadSchema: UpdateChatTitleCommandPayloadSchema.shape.params,
            handler: (params: { chatId: string, title: string }) => this._handleUpdateChatTitle(params.chatId, params.title)
        });
        // ... registrar otros comandos
    }

    private async _handleCommand(payload: CommandMessageInputPayload): Promise<void> {
        console.log(`[UIBridge] Handling command: ${payload.command}`);
        const commandDef = this.commands.get(payload.command);

        if (!commandDef) {
            console.warn(`[UIBridge] Received unknown command: ${payload.command}`);
            this.postMessageToWebview('error', { message: `Unknown command: ${payload.command}` });
            return;
        }

        try {
            let validatedParams = payload.params || {};
            if (commandDef.payloadSchema) {
                const validationResult = commandDef.payloadSchema.safeParse(payload.params);
                if (!validationResult.success) {
                    console.warn(`[UIBridge] Invalid params for command "${payload.command}":`, validationResult.error.issues);
                    this.validatorService['eventEmitter'].emit('validationFailed', { // Acceso un poco forzado, idealmente ValidatorService tiene un método para emitir
                        schemaName: `CommandParams:${payload.command}`, data: payload.params, error: validationResult.error.issues, fullError: validationResult.error
                    });
                    this.postMessageToWebview('error', { message: `Invalid parameters for command ${payload.command}.` });
                    return;
                }
                validatedParams = validationResult.data;
            }
            await commandDef.handler(validatedParams);
        } catch (error: any) {
            // ... manejo de error ...
        }
    }
    // ... los _handleXYZ métodos permanecen
}
IGNORE_WHEN_COPYING_START
content_copy
download
Use code with caution.
TypeScript
IGNORE_WHEN_COPYING_END

Nota: La validación del payload completo del mensaje (WebviewMessageSchema) ya se hace. Este dispatcher validaría el payload.params específico del comando.

Eliminar Intermediarios Innecesarios (Clases Wrapper sin Lógica Adicional):

Acción: Si clases como FlowContextState, SessionContextState, etc., (las que están en src/orchestrator/context/) son solo constructores que asignan propiedades a this, y no tienen métodos adicionales, se pueden eliminar. Los servicios pueden trabajar directamente con objetos literales que conformen las interfaces IFlowContextState, ISessionContextState.

Impacto: Reduce el boilerplate.

Ejemplo (TurnStateService.ts):

// En TurnStateService.ts (antes)
// class FlowContextState implements IFlowContextState { ... constructor ... }
// const initialState: IFlowContextState = new FlowContextState({ ... });

// En TurnStateService.ts (después)
// No hay clase FlowContextState definida aquí.
const initialState: IFlowContextState = { // Objeto literal
    userMessage,
    referencedFiles,
    chatId: chatId,
    traceId: traceId,
    planningIteration: 1,
    planningHistory: [],
    chatHistoryString: this.conversationService.getChatHistoryForModel(chatId, 20),
};
IGNORE_WHEN_COPYING_START
content_copy
download
Use code with caution.
TypeScript
IGNORE_WHEN_COPYING_END

Revisión: Las clases de estado (FlowContextState en TurnStateService, SessionContextState en SessionContextService, etc.) ya están implementadas dentro de sus respectivos servicios y no se exportan, lo cual es bueno. Las interfaces (IFlowContextState, etc.) se exportan desde src/orchestrator/context/index.ts. Esto ya está bastante bien. La sugerencia podría referirse a si estas clases internas añaden mucho valor sobre un objeto literal. Si solo son constructores, se pueden reemplazar. Si tienen métodos (aunque ahora no los tengan), mantenerlas está bien.

Evitar Ambigüedad en Imports y Nombres:

Acción:

Usar alias de importación si hay colisiones de nombres (import * as FooSchemas from './schemas/foo';).

Preferir rutas de importación directas en lugar de múltiples re-exportaciones a través de archivos index.ts intermedios si causa confusión. (Equilibrio: index.ts son buenos para la organización del módulo, pero demasiados niveles pueden ser confusos).

Asegurar que los nombres de interfaces (IUser), clases (User), y archivos (user.ts) sean consistentes y expresivos.

Impacto: Mejora la legibilidad y reduce errores.

Ejemplo: La estructura actual de index.ts parece razonable. En promptMetadata.ts, la importación de inputAnalyzerPrompt desde ./index es un ejemplo de la indirección. Podría ser from './prompt.inputAnalyzer'.

Reemplazar @ts-ignore por Casting Seguro o Tipado Mejorado:

Acción:

En LangChainToolAdapter.ts, para runManager.metadata.state:

interface ToolRunMetadataWithState {
    state?: IFlowContextState; // O el tipo de estado específico que esperas
    // ... otras propiedades de metadata si las hay
}

// En el método func:
const metadata = runManager?.metadata as ToolRunMetadataWithState | undefined;
const state = metadata?.state;
const traceId = state?.traceId;
IGNORE_WHEN_COPYING_START
content_copy
download
Use code with caution.
TypeScript
IGNORE_WHEN_COPYING_END

Impacto: Mayor seguridad de tipos.

Unificar Lógica de Configuración de Modelos (Nuevo LLMConfigService):

Acción: Crear un LLMConfigService que encapsule la lógica de obtener URLs, nombres de modelos específicos, temperaturas, API keys, etc., desde ConfigurationManager (o VS Code Secrets para API keys).

Impacto:

ModelManager se simplifica, delegando la obtención de estos detalles de configuración al nuevo servicio.

Centraliza la lógica de cómo se interpretan las configuraciones para cada proveedor LLM.

Ejemplo conceptual (LLMConfigService.ts):

export class LLMConfigService {
    constructor(private configManager: ConfigurationManager /*, private secretService: SecretService */) {}

    getOllamaConfig() {
        return {
            baseUrl: this.configManager.getValue('ollamaBaseUrl', 'http://localhost:11434'),
            model: this.configManager.getValue('ollamaModelName', 'gemma3:4b'),
            temperature: this.configManager.getValue('ollamaTemperature', 0.3),
        };
    }
    async getGeminiConfig() { // async si obtienes secrets
        // const apiKey = await this.secretService.get('geminiApiKey'); // Ideal
        const apiKey = this.configManager.getValue('geminiApiKey', 'YOUR_GEMINI_API_KEY_PLACEHOLDER');
        return {
            apiKey: apiKey,
            model: this.configManager.getValue('geminiModelName', "gemini-2.0-flash-exp"),
            temperature: this.configManager.getValue('geminiTemperature', 0.2),
            maxOutputTokens: this.configManager.getValue('geminiMaxOutputTokens', 2048),
        };
    }
}
IGNORE_WHEN_COPYING_START
content_copy
download
Use code with caution.
TypeScript
IGNORE_WHEN_COPYING_END

En ModelManager.getLangChainModelInstance():

// private llmConfigService: LLMConfigService; // Inyectado en constructor

if (modelType === 'ollama') {
    const ollamaConfig = this.llmConfigService.getOllamaConfig();
    return new ChatOllama(ollamaConfig);
} else if (modelType === 'gemini') {
    const geminiConfig = await this.llmConfigService.getGeminiConfig(); // Ahora puede ser async
    return new ChatGoogleGenerativeAI(geminiConfig);
}
IGNORE_WHEN_COPYING_START
content_copy
download
Use code with caution.
TypeScript
IGNORE_WHEN_COPYING_END

Esto requeriría que getLangChainModelInstance sea async.

Estandarizar Eventos y Tipado en EventEmitterService:

Acción: Definir una interfaz o type para los eventos y sus payloads.

Impacto: Mejora la autocompletación y la seguridad de tipos al emitir y escuchar eventos.

Ejemplo (EventEmitterService.ts o un events.types.ts):

export interface ExtensionEventPayloads {
    'chatCreated': Chat;
    'chatDeleted': { chatId: string };
    'chatMessageAdded': { chatId: string; message: ChatMessage };
    'toolCalled': { toolName: string; params: any; traceId?: string; stepId?: string };
    'toolCompleted': { toolName: string; result: any; traceId?: string; stepId?: string };
    'ui:postMessage': UIUpdateMessagePayload;
    // ... otros eventos
}
export type ExtensionEvent = keyof ExtensionEventPayloads;

// En EventEmitterService
on<E extends ExtensionEvent>(event: E, listener: (payload: ExtensionEventPayloads[E]) => void, context?: any): EventEmitter3;
emit<E extends ExtensionEvent>(event: E, payload: ExtensionEventPayloads[E]): boolean;
IGNORE_WHEN_COPYING_START
content_copy
download
Use code with caution.
TypeScript
IGNORE_WHEN_COPYING_END

Los listeners y emisores usarían estos tipos.

Agregar Contratos (Interfaces) y JSDoc en Servicios Públicos:

Acción:

Para servicios clave consumidos por otros (ej. ChatInteractor, ConversationManager, OrchestratorService), definir interfaces explícitas (IChatInteractor, etc.) si aún no existen o si la clase tiene muchos métodos privados.

Añadir JSDoc a los métodos públicos de todos los servicios, explicando qué hacen, sus parámetros y qué devuelven.

Impacto: Mejora la mantenibilidad, la comprensión del código y facilita el onboarding de nuevos desarrolladores.

Ejemplo (ChatInteractor.ts):

/**
 * Interactor layer for the UI. Provides a simple facade over ConversationManager
 * and other services to handle UI-driven chat actions.
 * It does NOT contain core business logic itself.
 */
export class ChatInteractor {
    /**
     * Sends a message from the user.
     * Delegates to ConversationManager to handle the full turn.
     * @param chatId The ID of the current chat, or null for a new chat.
     * @param text The user's message content.
     * @param files Optional. Files referenced by the user.
     * @returns Promise resolving to the assistant's ChatMessage once the turn is complete.
     */
    async sendUserMessage(chatId: string | null, text: string, files?: string[]): Promise<ChatMessage> {
        // ...
    }
}
IGNORE_WHEN_COPYING_START
content_copy
download
Use code with caution.
TypeScript
IGNORE_WHEN_COPYING_END

Pasos Siguientes Concretos:

Refactorizar graph.ts y TurnStateService:

Ajustar los nodos del grafo para que no construyan ExecutionStepEntity.

Modificar TurnStateService.updateTurnState para que solo actualice el estado en memoria y planningHistory basado en planningHistoryEntryData.

Asegurar que PromptService.executePrompt y LangChainToolAdapter.runTool llamen a StepPersistenceService.saveExecutionStep() y que los datos guardados sean correctos.

Refactorizar UIBridge._handleCommand: Implementar el dispatcher genérico con registro de comandos y validación de params a través de esquemas Zod.

Revisar clases de estado internas: Simplificar si solo son constructores.

Mejorar tipado en LangChainToolAdapter: Eliminar @ts-ignore.

(Opcional por ahora, más grande) Introducir LLMConfigService: Extraer la lógica de configuración de modelos.

Tipar EventEmitterService: Definir ExtensionEventPayloads.

Añadir JSDoc progresivamente: Empezar por los servicios más críticos o de interfaz.

Aquí tienes un plan de implementación por capas, agrupando los cambios de manera lógica para que cada capa construya sobre la anterior:

Capa 0: Preparación y Configuración Inicial (Sin cambios de código funcional, pero fundamental)

Control de Versiones:

Asegúrate de que todo el código actual esté commiteado en tu sistema de control de versiones (Git).

Crea una nueva rama para la refactorización (ej. refactor/core-simplification).

Herramientas de Linting y Formateo:

Verifica que ESLint, Prettier (o las herramientas que uses) estén configuradas y funcionando. Esto ayudará a mantener la consistencia del código durante los cambios.

Entorno de Pruebas (Si aplica):

Si tienes pruebas unitarias o de integración, asegúrate de que estén pasando antes de empezar. Serán cruciales para verificar que no se rompen funcionalidades. Si no tienes, considera añadir algunas para las áreas más críticas que vas a tocar.

Capa 1: Refactorización del Núcleo de Persistencia y Estado del Turno

Objetivo: Centralizar y clarificar la responsabilidad de la persistencia de ExecutionStepEntity y simplificar TurnStateService.

Tareas:

Modificar TurnStateService.updateTurnState():

Cambiar la firma para que acepte planningHistoryEntryData en lugar de Partial<ExecutionStepEntity>.

Eliminar la lógica de llamar a stepPersistenceService.saveExecutionStep().

Asegurar que solo actualice el IFlowContextState en memoria (incluyendo planningHistory con la estructura simplificada).

Asegurar Persistencia en PromptService.executePrompt():

Verificar/Implementar que promptService.executePrompt() llame a stepPersistenceService.saveExecutionStep() con la ExecutionStepEntity completa antes de retornar el resultado del prompt o al manejar errores.

La ExecutionStepEntity debe incluir traceId, chatId, stepName (basado en PromptType), stepType: 'prompt', stepExecute: type, stepParams (el contextSnapshot usado), startTime, endTime, status, result, error, y planningIteration.

Asegurar Persistencia en LangChainToolAdapter.runTool():

Verificar/Implementar que toolAdapter.runTool() llame a stepPersistenceService.saveExecutionStep() de manera similar a PromptService.

La ExecutionStepEntity debe incluir traceId, chatId, stepName (basado en toolName), stepType: 'tool', stepExecute: toolName, stepParams (los validatedParams), etc.

Refactorizar Nodos en graph.ts:

Eliminar la construcción de ExecutionStepEntity dentro de los nodos (analyze_input_node, plan_node, execute_tool_node, execute_prompt_node).

Los nodos llamarán a turnStateService.updateTurnState() pasando solo los planningHistoryEntryData necesarios y las actualizaciones directas al IFlowContextState.

La lógica de los nodos se centrará en:

Llamar al servicio apropiado (promptService o toolAdapter).

Recibir el resultado.

Construir el planningHistoryEntryData (simplificado).

Construir los updates para IFlowContextState.

Llamar a turnStateService.updateTurnState().

Verificación:

Probar flujos de chat completos.

Inspeccionar la base de datos para confirmar que las execution_steps se guardan correctamente con todos los campos necesarios.

Verificar que planningHistory en el estado de LangGraph (IFlowContextState) se popule como se espera.

Capa 2: Refactorización de la Interfaz de Usuario y Comunicación (UIBridge)

Objetivo: Simplificar el manejo de comandos en UIBridge y mejorar la robustez de la comunicación UI-Backend.

Tareas:

Implementar Dispatcher Genérico en UIBridge:

Definir la interfaz CommandDefinition.

Crear el Map this.commands.

Implementar registerCommands() y poblarla con las definiciones de cada comando (incluyendo payloadSchema y handler).

Refactorizar UIBridge._handleCommand() para que use el nuevo dispatcher, validando payload.params si se proporciona un payloadSchema.

Mejorar Tipado en LangChainToolAdapter (Eliminar @ts-ignore):

Definir la interfaz ToolRunMetadataWithState.

Usar casting seguro (as ToolRunMetadataWithState | undefined) para runManager.metadata.

Revisar y Estandarizar Nombres/Rutas de Imports (Opcional, si hay puntos obvios):

Mientras se trabaja en UIBridge y sus dependencias, identificar importaciones indirectas que puedan simplificarse.

Verificación:

Probar todos los comandos que la UI puede enviar (obtener lista de chats, cargar chat, nuevo chat, enviar mensaje, cambiar modelo, etc.).

Verificar que la validación de parámetros de comando funcione.

Asegurar que no haya regresiones en la funcionalidad de la UI.

Capa 3: Mejoras en la Configuración y Abstracción de Modelos

Objetivo: Centralizar la configuración específica de LLMs y mejorar la claridad.

Tareas:

(Opcional, pero recomendado) Introducir LLMConfigService:

Crear LLMConfigService.ts.

Implementar métodos como getOllamaConfig() y getGeminiConfig() que lean de ConfigurationManager (y futuramente de SecretService).

Inyectar LLMConfigService en ServiceFactory y luego en ModelManager.

Modificar ModelManager.getLangChainModelInstance() para usar LLMConfigService. Esto podría hacer que getLangChainModelInstance sea async si la obtención de la config (ej. API keys) es asíncrona.

Actualizar OrchestratorService si el método anterior se vuelve asíncrono.

Seguridad de API Keys (Marcador):

Aunque la implementación completa de SecretService puede ser una tarea separada, añadir comentarios prominentes y TODOs donde se manejan API keys directamente desde ConfigurationManager o process.env para priorizar su migración a vscode.secrets.

Verificación:

Probar el cambio de modelo entre Ollama y Gemini.

Asegurar que ambos modelos sigan funcionando correctamente después de la refactorización de la obtención de su configuración.

Capa 4: Estandarización de Eventos y Documentación

Objetivo: Mejorar la consistencia, seguridad de tipos y mantenibilidad del sistema de eventos y la documentación del código.

Tareas:

Tipar EventEmitterService:

Definir ExtensionEventPayloads y ExtensionEvent.

Actualizar las firmas de on(), once(), off(), emit() en EventEmitterService para usar estos tipos.

Actualizar todos los puntos de emisión (emit()) y suscripción (on()) en toda la base de código para usar los payloads tipados.

Añadir JSDoc y Contratos (Interfaces):

Comenzar por los servicios y métodos públicos más utilizados o más complejos (ej. ChatInteractor, ConversationManager, OrchestratorService, UIBridge, PromptService, LangChainToolAdapter).

Definir interfaces explícitas (IChatInteractor, etc.) si aportan claridad o si se prevé tener múltiples implementaciones (menos probable en este contexto).

Revisar Clases de Estado Internas:

Evaluar si las clases internas usadas para el estado (ej. FlowContextState dentro de TurnStateService) pueden ser reemplazadas por objetos literales si solo realizan asignaciones en el constructor.

Verificación:

Verificar que los eventos sigan funcionando como se espera y que los tipos ayuden a prevenir errores.

Revisar la documentación generada (si se usan herramientas como TypeDoc) o simplemente la legibilidad del código con JSDoc.

Implementación y Pruebas Continuas:

Commits Pequeños y Atómicos: Después de completar cada tarea o un pequeño conjunto de tareas relacionadas dentro de una capa, haz un commit. Escribe mensajes de commit claros.

Pruebas después de cada Capa (o Tarea Crítica):

Ejecuta la extensión.

Realiza pruebas manuales de los flujos principales: enviar mensajes, crear nuevo chat, cambiar de chat, cambiar modelo, etc.

Si tienes pruebas automatizadas, ejecútalas.

Revisión de Código: Si trabajas en equipo, solicita revisiones de código después de cada capa o de cambios significativos.

Iteración: Es posible que al implementar una capa descubras algo que requiera un ajuste en una capa anterior. No dudes en volver atrás y refinar.