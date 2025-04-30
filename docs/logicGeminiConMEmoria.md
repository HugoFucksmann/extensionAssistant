¡Excelente punto! Integrar la memoria y el contexto de forma efectiva es crucial para que el asistente sea coherente, aprenda y utilice la información relevante en el momento adecuado.

Vamos a diferenciar y luego integrar:

Memoria (Persistente):

ChatMemory: Historial de la conversación actual (turnos de usuario y IA). Esencial para entender preguntas de seguimiento, referencias anteriores ("eso", "lo que dijiste antes"). Persiste mientras la sesión de chat esté activa (o incluso más si se guarda/carga).

ProjectMemory: Conocimiento acumulado sobre el proyecto actual a lo largo del tiempo (archivos clave, dependencias comunes, errores pasados, refactorizaciones). Persiste entre sesiones de VS Code para el mismo proyecto.

UserPreferenceMemory: Preferencias explícitas o inferidas del usuario (estilo de código, nivel de detalle preferido, módulos/herramientas favoritas). Persiste globalmente o por proyecto.

LearningMemory: (Opcional pero potente) Almacena patrones aprendidos de ejecuciones pasadas, efectividad de planes/herramientas, correcciones de errores comunes. Persiste y se usa para mejorar la planificación y ejecución futuras.

Contexto (Volátil - Durante una Orquestación):

SessionContext: Representa el estado general de la interacción actual. Contiene referencias a las memorias relevantes (chatMemory, projectMemory, etc.) y el estado actual de la sesión (ID, hora de inicio, última entrada del usuario). Persiste entre llamadas a orchestrate dentro de la misma sesión lógica (ej. misma ventana de chat).

ExecutionContext: Contiene la información específica de la ejecución actual del workflow/plan (el MasterPlan activo, el Workflow activo, los resultados de los pasos ya ejecutados, el estado de las herramientas seleccionadas). Se crea al inicio de executePlannedWorkflow y se descarta al final. Es puramente volátil para una única solicitud del usuario.

ModuleContext: Un subconjunto o vista especializada del contexto, preparado específicamente para un módulo cuando se le llama. Contiene lo que el módulo necesita de SessionContext (config, acceso a memoria relevante) y ExecutionContext (inputs específicos para su tarea).

Implementación Integrada:

Modificaremos las firmas y la lógica para pasar y usar estos contextos/memorias.

// ==========================================
// Interfaces Clave Actualizadas (Contexto y Memoria)
// ==========================================

// --- MEMORIA (Componentes Persistentes o Semi-persistentes) ---
interface ChatMemory {
    getHistory(limit?: number): ConversationEntry[];
    addEntry(entry: ConversationEntry): void;
    // ... otros métodos (limpiar, buscar, etc.)
}

interface ProjectMemory {
    getKnownFiles(): string[];
    getCommonPatterns(): any;
    updateKnowledge(data: any): void;
    // ...
}

interface UserPreferenceMemory {
    getPreferences(): UserPreferences;
    updatePreference(key: keyof UserPreferences, value: any): void;
    // ...
}

interface LearningMemory {
    recordPlanOutcome(plan: MasterPlan, result: WorkflowExecutionResult): void;
    getSuggestionsForTask(task: Task): any; // Sugerencias basadas en ejecuciones pasadas
    // ...
}

// Contenedor para las memorias dentro de SessionContext
interface SessionMemoryContainer {
    chat: ChatMemory;
    project?: ProjectMemory; // Puede ser opcional si no hay proyecto abierto
    userPrefs: UserPreferenceMemory;
    learnings: LearningMemory;
    // Memoria temporal específica de la sesión (ej. variables definidas en el chat)
    shortTerm: Map<string, any>;
}

// --- CONTEXTO (Contenedores de Estado) ---

// Estado general de la interacción (persiste entre llamadas a orchestrate en la misma sesión)
interface SessionContext {
    sessionId: string;
    startTime: Date;
    currentProjectRoot?: string; // Ruta al proyecto actual
    memory: SessionMemoryContainer; // Acceso a todas las memorias
    state: SessionState; // Estado volátil de la sesión (ej. último análisis, plan activo si se pausó)
}

// Estado de la ejecución de UN workflow (volátil para una llamada a orchestrate)
interface ExecutionContext {
    orchestrationId: string; // ID único para esta ejecución específica
    masterPlan: MasterPlan;
    workflow: Workflow; // El workflow derivado del plan
    currentStepId: string | null; // ID del PlanStep actualmente en ejecución
    stepResults: Map<string, ModuleExecutionResult | DirectActionResult>; // Resultados acumulados de los PlanSteps
    availableTools: Map<string, Tool>; // Herramientas seleccionadas y listas
    startTime: Date;
    // Podría incluir aquí una referencia al SessionContext si es necesario acceder a memoria
    // o estado global durante la ejecución de bajo nivel, aunque es preferible pasarlo explícitamente.
}

// Contexto específico pasado a un módulo
interface ModuleContext {
    moduleId: string;
    // Acceso selectivo a memoria (proporcionado por el router basado en SessionContext)
    memoryAccess: {
        getChatHistory: (limit?: number) => ConversationEntry[];
        getProjectKnowledge: (query: string) => any;
        getUserPreference: <K extends keyof UserPreferences>(key: K) => UserPreferences[K];
        getLearnings: (taskType: string) => any;
    };
    // Configuración específica del módulo (desde SessionContext/ConfigManager)
    config: ModuleConfig;
    // Entradas específicas para la tarea actual (desde ExecutionContext/PlanStep)
    inputs: Record<string, any>;
    // Proyecto actual (desde SessionContext)
    projectRoot?: string;
}

// Estado volátil mantenido en SessionContext
interface SessionState {
    lastUserInput: string | null;
    lastAnalysisResult: InputAnalysisResult | null;
    activePlanId: string | null; // Si una ejecución fue pausada
    // ... otros estados relevantes para la sesión
}


// (Otras interfaces como MasterPlan, PlanStep, ModulePlan, etc., permanecen iguales o con ajustes menores)

// ==========================================
// orchestratorService.ts
// ==========================================

/**
 * Orquesta el proceso completo. Recibe o inicializa el SessionContext.
 */
async function orchestrate(userInput: string, sessionContext: SessionContext): Promise<OrchestrationResult> {
    // Actualizar estado de la sesión con la nueva entrada
    sessionContext.state.lastUserInput = userInput;

    try {
        // 1. Analizar Entrada (usa memoria de chat desde sessionContext)
        const analysisResult = await inputAnalyzer.analyzeInput(userInput, sessionContext);
        sessionContext.state.lastAnalysisResult = analysisResult; // Guardar en estado volátil de sesión

        // 2. Decidir Ruta
        if (analysisResult.requiresDirectAction && analysisResult.directActionType) {
            // 2.a. Ejecutar Acción Directa (puede necesitar sessionContext para acceso a memoria/config)
            const directActionResult = await directActionRouter.executeDirectAction(analysisResult, sessionContext);
            const finalResponse = responseFormatter.formatFinalResponse({ /* Adaptar */ }, sessionContext.memory.userPrefs.getPreferences());
            // Actualizar memoria de chat
            sessionContext.memory.chat.addEntry({ role: 'user', content: userInput });
            sessionContext.memory.chat.addEntry({ role: 'assistant', content: finalResponse.markdownContent }); // O el resultado crudo
            return { success: directActionResult.success, response: finalResponse.markdownContent, /* ... */ };
        } else {
            // 2.b. Iniciar Planificación Completa
            const plannedResult = await executePlannedWorkflow(analysisResult, sessionContext);
            // Actualizar memoria de chat (ya se hace dentro de executePlannedWorkflow o aquí al final)
             sessionContext.memory.chat.addEntry({ role: 'user', content: userInput });
             sessionContext.memory.chat.addEntry({ role: 'assistant', content: plannedResult.response });
            return plannedResult;
        }

    } catch (error: any) {
        const errorResult = handleOrchestrationError(error, undefined, sessionContext, 'orchestrator');
        sessionContext.memory.chat.addEntry({ role: 'user', content: userInput });
        sessionContext.memory.chat.addEntry({ role: 'assistant', content: errorResult.userMessage || "Error" });
        return { success: false, response: errorResult.userMessage || "Ocurrió un error inesperado.", /* ... */ };
    }
}

/**
 * Ejecuta el flujo de trabajo planificado. Crea y gestiona el ExecutionContext.
 */
async function executePlannedWorkflow(analysisResult: InputAnalysisResult, sessionContext: SessionContext): Promise<OrchestrationResult> {
    let masterPlan: MasterPlan | null = null;
    let workflow: Workflow | null = null;
    let executionContext: ExecutionContext | null = null; // Volátil para esta ejecución

    try {
        // 3. Generar Plan Maestro (usa sessionContext para memoria y preferencias)
        masterPlan = await planningEngine.createMasterPlan(analysisResult, sessionContext);
        const validation = planningEngine.validatePlan(masterPlan, sessionContext); // Pasar SessionContext para acceso a ProjectContext/Memory si es necesario
        if (!validation.isValid) throw new Error(`Plan maestro inválido.`);
        sessionContext.state.activePlanId = masterPlan.id; // Marcar plan como activo en estado de sesión

        // 4. Seleccionar Herramientas
        const availableTools = toolRegistry.getAvailableTools();
        const selectedTools = toolSelector.selectTools(masterPlan, availableTools);
        const toolVerification = toolSelector.verifyToolCompatibility(selectedTools, sessionContext);
        if (!toolVerification.compatible) throw new Error(`Herramientas incompatibles.`);

        // 5. Crear Flujo de Trabajo y Contexto de Ejecución
        workflow = workflowManager.createWorkflow(masterPlan, selectedTools);
        executionContext = { // Crear el contexto VOLÁTIL para esta ejecución
            orchestrationId: generateUniqueId(), // Helper para generar IDs
            masterPlan: masterPlan,
            workflow: workflow,
            currentStepId: null,
            stepResults: new Map(),
            availableTools: selectedTools, // O las instancias reales de las herramientas
            startTime: new Date(),
        };

        // 6. Ejecutar Flujo de Trabajo paso a paso
        let currentStepIndex = 0;
        const masterPlanSteps = masterPlan.steps;
        const workflowSteps = workflow.steps;

        while (currentStepIndex < workflowSteps.length && currentStepIndex !== -1) {
            const currentPlanStep = masterPlanSteps.find(s => s.id === workflowSteps[currentStepIndex].planStepId);
            const currentWorkflowStep = workflowSteps[currentStepIndex];
            if (!currentPlanStep) throw new Error(`Error interno: PlanStep no encontrado.`);

            executionContext.currentStepId = currentPlanStep.id; // Actualizar contexto de ejecución

            // Ejecutar el paso (pasa ambos contextos)
            const stepResult = await workflowManager.executeWorkflowStep(currentWorkflowStep, executionContext, sessionContext);
            executionContext.stepResults.set(currentPlanStep.id, stepResult); // Guardar resultado en contexto de ejecución

            // Evaluar (pasa contexto de ejecución para resultados, sessionContext opcionalmente para histórico)
            const evaluation = await resultEvaluator.evaluateResult(stepResult, currentPlanStep.expectedOutputs, currentPlanStep.validationCriteria, executionContext, sessionContext);
            const decision = resultEvaluator.makeProgressDecision(evaluation, { sessionContext, currentPlanStep, executionContext });

            // Procesar decisión
            switch (decision.action) {
                case 'continue':
                    // Aplicar feedback (usa sessionContext para actualizar memoria)
                    await feedbackManager.collectAndApplyFeedback(stepResult, currentPlanStep.expectedOutputs, executionContext, sessionContext);
                    currentStepIndex = progressWorkflow(currentPlanStep, stepResult, masterPlan, decision);
                    break;
                case 'repeat':
                     await feedbackManager.collectAndApplyFeedback(stepResult, currentPlanStep.expectedOutputs, executionContext, sessionContext);
                    // Lógica de repetición... (puede necesitar sessionContext para ajustar algo)
                    if (currentPlanStep.fallbackStepId) { /*...*/ } else { throw new Error(`Fallo en ${currentPlanStep.id}, se requiere repetir.`); }
                    break;
                case 'change':
                     await feedbackManager.collectAndApplyFeedback(stepResult, currentPlanStep.expectedOutputs, executionContext, sessionContext);
                    // Refinar plan (usa sessionContext para memoria/preferencias)
                    masterPlan = await planningEngine.refinePlan(masterPlan, evaluation, decision.suggestedChanges, sessionContext);
                    // Recrear workflow y reiniciar/ajustar ejecución (complejo)
                    throw new Error(`Se requiere replanificación tras ${currentPlanStep.id}.`);
            }
        } // Fin del bucle while

        // 7. Formatear Respuesta Final (usa sessionContext para preferencias)
        const finalAggregatedResult = aggregateResults(executionContext.stepResults);
        const finalResponse = responseFormatter.formatFinalResponse({ success: true, response: finalAggregatedResult, /*...*/ }, sessionContext.memory.userPrefs.getPreferences());

        // 8. Finalizar y Aprender (usa sessionContext para actualizar memoria de aprendizaje)
        sessionContext.memory.learnings.recordPlanOutcome(masterPlan, { /* Resumen del resultado de executionContext */ });
        sessionManager.finalizeSessionState(sessionContext, { success: true, result: finalAggregatedResult }); // Limpia estado volátil, mantiene memorias

        return { success: true, response: finalResponse.markdownContent, /* ... */ };

    } catch (error: any) {
        const currentStepForError = masterPlan?.steps.find(s => s.id === executionContext?.currentStepId);
        const errorResult = handleOrchestrationError(error, currentStepForError, sessionContext, error.moduleError ? 'module' : 'orchestrator');
        sessionManager.finalizeSessionState(sessionContext, { success: false, error: errorResult }); // Limpia estado volátil
        return { success: false, response: errorResult.userMessage || "Error en ejecución planificada.", /* ... */ };
    } finally {
         // Asegurarse de limpiar el plan activo del estado de sesión si ya no aplica
         if (sessionContext.state.activePlanId === masterPlan?.id) {
             sessionContext.state.activePlanId = null;
         }
    }
}

// (progressWorkflow y handleOrchestrationError reciben sessionContext si necesitan acceder a memoria/estado)

// ==========================================
// inputAnalyzer.ts
// ==========================================
/**
 * Analiza la entrada usando el historial de chat del SessionContext.
 */
async function analyzeInput(userInput: string, sessionContext: SessionContext): Promise<InputAnalysisResult> {
    const chatHistory = sessionContext.memory.chat.getHistory();
    // ... usar LLM con userInput y chatHistory ...
    // Puede usar sessionContext.memory.project para entidades del proyecto
    return analysisResult;
}
// extractCodeContext puede necesitar sessionContext para saber qué proyecto/archivos buscar

// ==========================================
// planningEngine.ts
// ==========================================
/**
 * Genera plan maestro usando análisis, memoria y preferencias del SessionContext.
 */
async function createMasterPlan(analysisResult: InputAnalysisResult, sessionContext: SessionContext): Promise<MasterPlan> {
    const preferences = sessionContext.memory.userPrefs.getPreferences();
    const projectKnowledge = sessionContext.memory.project?.getCommonPatterns(); // Ejemplo
    const learnings = sessionContext.memory.learnings.getSuggestionsForTask(analysisResult.intent); // Ejemplo
    // ... usar LLM con pre-prompt, análisis, preferencias, conocimiento, aprendizajes ...
    return generatedPlan;
}
/**
 * Refina plan usando feedback y SessionContext.
 */
async function refinePlan(currentPlan: MasterPlan, evaluation: EvaluationResult, suggestions: Change[], sessionContext: SessionContext): Promise<MasterPlan> {
     // Similar a createMasterPlan, usa contexto y memoria para refinar
    return updatedPlan;
}
// validatePlan puede necesitar SessionContext para validar contra el estado real del proyecto/memoria

// ==========================================
// workflowManager.ts
// ==========================================
/**
 * Ejecuta un paso del workflow. Pasa ambos contextos al ModuleRouter.
 */
async function executeWorkflowStep(step: WorkflowStep, executionContext: ExecutionContext, sessionContext: SessionContext): Promise<ModuleExecutionResult> {
    const planStep = executionContext.masterPlan.steps.find(s => s.id === step.planStepId);
    if (!planStep) throw new Error(`PlanStep no encontrado.`);

    // Resolver entradas usando executionContext.stepResults
    const inputs = prepareStepInputs(planStep.inputs, executionContext.stepResults, sessionContext); // Puede necesitar sessionContext para contexto global

    // Enrutar y ejecutar, pasando SessionContext para crear ModuleContext
    const routingInfo = moduleRouter.routeToModule(planStep, sessionContext);
    const result = await moduleRouter.dispatchAndExecuteModuleTask(routingInfo, planStep, inputs, sessionContext); // Pasa SessionContext

    return result;
}

// prepareStepInputs puede necesitar SessionContext para resolver referencias globales
function prepareStepInputs(inputMappings: Record<string, any>, previousResults: Map<string, any>, sessionContext: SessionContext): Record<string, any> { /* ... */ }

// ==========================================
// feedbackManager.ts
// ==========================================
/**
 * Recopila feedback usando ExecutionContext.
 */
async function collectFeedback(result: any, expectedOutcome: any, executionContext: ExecutionContext): Promise<FeedbackData> { /* ... */ }

/**
 * Aplica feedback actualizando las memorias en SessionContext.
 */
function applyFeedback(feedback: FeedbackData, sessionContext: SessionContext): FeedbackApplication {
    // Actualiza sessionContext.memory.learnings, sessionContext.memory.userPrefs, etc.
    const memoryUpdates = [];
    // ... lógica para decidir qué memoria actualizar ...
    if (feedback.suggestions.some(s => s.type === 'preference')) {
        // sessionContext.memory.userPrefs.updatePreference(...)
        memoryUpdates.push("UserPreferenceMemory updated");
    }
     if (feedback.actionableItems.some(a => a.type === 'learning')) {
        // sessionContext.memory.learnings.recordAdjustment(...)
        memoryUpdates.push("LearningMemory updated");
    }
    // ...
    return { appliedChanges: memoryUpdates, /* ... */ };
}

// ==========================================
// resultEvaluator.ts
// ==========================================
/**
 * Evalúa resultado usando ExecutionContext y opcionalmente SessionContext.
 */
async function evaluateResult(result: ModuleExecutionResult | DirectActionResult, expectedOutcome: any, evaluationCriteria: ValidationCriterion[], executionContext: ExecutionContext, sessionContext?: SessionContext): Promise<EvaluationResult> {
    // Usa result (del ExecutionContext) y criterios.
    // Puede usar sessionContext.memory.learnings para comparar con resultados históricos.
    return evaluation;
}
// makeProgressDecision recibe ambos contextos si necesita tomar decisiones basadas en estado global o memoria.

// ==========================================
// sessionManager.ts
// ==========================================

/**
 * Inicializa una sesión, cargando memorias relevantes.
 */
function initializeSession(projectRoot?: string): SessionContext {
    const sessionId = generateUniqueId();
    // Cargar/Inicializar memorias (aquí iría la lógica de DB o archivos)
    const chatMemory = new ChatMemory(/* config */);
    const projectMemory = projectRoot ? new ProjectMemory(projectRoot) : undefined;
    const userPrefsMemory = new UserPreferenceMemory(/* config */);
    const learningMemory = new LearningMemory(/* config */);
    const shortTermMemory = new Map<string, any>();

    return {
        sessionId: sessionId,
        startTime: new Date(),
        currentProjectRoot: projectRoot,
        memory: {
            chat: chatMemory,
            project: projectMemory,
            userPrefs: userPrefsMemory,
            learnings: learningMemory,
            shortTerm: shortTermMemory,
        },
        state: { // Estado inicial volátil
            lastUserInput: null,
            lastAnalysisResult: null,
            activePlanId: null,
        }
    };
}

/**
 * Actualiza el estado VOLÁTIL de la sesión (NO la memoria persistente directamente).
 */
function updateSessionState(sessionContext: SessionContext, updates: Partial<SessionState>): SessionContext {
    sessionContext.state = { ...sessionContext.state, ...updates };
    return sessionContext;
}

/**
 * Limpia el estado volátil al final de una orquestación exitosa o fallida.
 * La persistencia de memoria (guardar en DB/archivo) ocurriría aquí o de forma asíncrona.
 */
function finalizeSessionState(sessionContext: SessionContext, outcome: any): void {
    console.log(`Finalizing orchestration for session ${sessionContext.sessionId}. Outcome: ${outcome.success}`);
    // Limpiar estado volátil relevante para la ejecución que acaba de terminar
    sessionContext.state.lastUserInput = null;
    sessionContext.state.lastAnalysisResult = null;
    sessionContext.state.activePlanId = null; // Asumiendo que el plan terminó

    // Aquí se podría disparar el guardado de las memorias si es necesario
    // sessionContext.memory.chat.save();
    // sessionContext.memory.project?.save();
    // sessionContext.memory.userPrefs.save();
    // sessionContext.memory.learnings.save();
}

// ==========================================
// moduleRouter.ts
// ==========================================

/**
 * Despacha tarea al módulo, creando ModuleContext a partir de SessionContext.
 */
async function dispatchAndExecuteModuleTask(
    routingInfo: ModuleRoutingInfo,
    planStep: PlanStep,
    inputs: Record<string, any>,
    sessionContext: SessionContext // Recibe SessionContext
): Promise<ModuleExecutionResult> {
    const moduleApi = routingInfo.moduleInterface;

    // Crear ModuleContext: Proporciona una fachada controlada a la memoria y config
    const moduleContext: ModuleContext = {
        moduleId: routingInfo.targetModule,
        memoryAccess: { // Fachada para acceso controlado a memoria
            getChatHistory: (limit) => sessionContext.memory.chat.getHistory(limit),
            getProjectKnowledge: (query) => sessionContext.memory.project?.getKnowledge(query), // Método hipotético
            getUserPreference: (key) => sessionContext.memory.userPrefs.getPreferences()[key],
            getLearnings: (taskType) => sessionContext.memory.learnings.getSuggestionsForTask(taskType),
        },
        // Obtener config específica del módulo (ej. desde un ConfigManager)
        config: configManager.getModuleConfig(routingInfo.targetModule),
        inputs: inputs, // Las entradas ya resueltas para esta tarea
        projectRoot: sessionContext.currentProjectRoot,
    };

    // Llamar al módulo con su contexto específico
    try {
        let result: ModuleExecutionResult;
        if (planStep.requiresSubPlanning) {
            const modulePlanner = moduleApi.getPlanner(planStep.task.type);
            const modulePlan = await modulePlanner(planStep.task, moduleContext); // Pasa ModuleContext
            result = await moduleApi.executePlan(modulePlan, moduleContext); // Pasa ModuleContext
        } else {
            const simpleExecutor = moduleApi.getExecutor(planStep.task.type);
            result = await simpleExecutor(planStep.task, moduleContext); // Pasa ModuleContext
        }
        return result;
    } catch (error: any) {
        // ... manejo de error ...
        return { /* ... error result ... */ moduleError: true };
    }
}

// ==========================================
// Module Planners & Executors (dentro de cada módulo)
// ==========================================
// Todas estas funciones ahora reciben ModuleContext en lugar de SessionContext o ExecutionContext directamente.

async function planCodeEditingTask(task: Task, moduleContext: ModuleContext): Promise<ModulePlan> {
    const stylePref = moduleContext.memoryAccess.getUserPreference('codeStyle');
    // ... usar moduleContext.inputs, stylePref, etc. para planificar ...
    return modulePlan;
}

async function executeInternalModuleStep(step: ModuleStep, moduleContext: ModuleContext, previousModuleOutputs: Map<string, any>): Promise<ModuleStepResult> {
    const relevantKnowledge = moduleContext.memoryAccess.getProjectKnowledge(`info_for_${step.operation}`);
    // ... usar moduleContext.inputs, moduleContext.config, relevantKnowledge ...
    return stepResult;
}

async function executeSimpleTask(task: Task, moduleContext: ModuleContext): Promise<ModuleExecutionResult> {
     const history = moduleContext.memoryAccess.getChatHistory(5); // Obtener últimos 5 turnos
     // ... usar moduleContext.inputs, history ...
     return executionResult;
}

// ... resto de funciones (responseFormatter, modelInteractionManager, etc.)
// recibirían SessionContext o ExecutionContext según necesiten acceso
// a preferencias, historial o estado de ejecución.


Resumen de la Integración:

SessionContext como Contenedor Principal: Se pasa a través de las funciones de alto nivel (orchestrate, executePlannedWorkflow, inputAnalyzer, planningEngine, feedbackManager, moduleRouter). Contiene las referencias a todas las memorias (SessionMemoryContainer) y el estado volátil de la sesión (SessionState).

ExecutionContext para el Workflow Actual: Se crea dentro de executePlannedWorkflow y se pasa a las funciones que operan dentro de ese workflow específico (executeWorkflowStep, evaluateResult, collectFeedback). Contiene el plan, los resultados de los pasos, etc., de la ejecución actual.

ModuleContext como Fachada: Se crea en dispatchAndExecuteModuleTask a partir de SessionContext y ExecutionContext. Se pasa a las funciones internas de los módulos (plan...Task, execute...), dándoles acceso controlado a la memoria, configuración y las entradas específicas que necesitan, sin exponer todo el SessionContext o ExecutionContext.

Acceso a Memoria: Las funciones acceden a la memoria a través del contexto apropiado (sessionContext.memory... o moduleContext.memoryAccess...).

Actualización de Memoria:

ChatMemory se actualiza típicamente al final de orchestrate o executePlannedWorkflow con el turno completo.

Otras memorias (Learnings, UserPrefs, Project) se actualizan principalmente a través de feedbackManager.applyFeedback o en finalizeSessionState.

Estado Volátil: SessionState (dentro de SessionContext) guarda información temporal entre llamadas a orchestrate si es necesario. ExecutionContext guarda el estado volátil durante una única ejecución.

Esta estructura separa claramente la información persistente (Memoria), el estado general de la interacción (SessionContext) y el estado de una ejecución específica (ExecutionContext), proporcionando la información necesaria en cada nivel del flujo de planificación y ejecución.






Posibles Refinamientos o Puntos a Considerar:
Inicialización de ProjectMemory:
initializeSession crea ProjectMemory si hay un projectRoot. ¿Cómo y cuándo se puebla inicialmente esta memoria con la información relevante del proyecto (estructura de archivos, dependencias iniciales, etc.)?
Sugerencia: ProjectMemory podría tener un método scanProject() o similar que se llame durante la inicialización o de forma asíncrona al principio. Alternativamente, el ProjectContext inicial podría pasarse a initializeSession para poblar la memoria.
Gestión del Tamaño del Contexto (Prompts):
Aunque ModuleContext proporciona una fachada, la lógica dentro de prepareModelPrompt (y funciones similares que llaman al LLM) es crucial. Debe ser inteligente para seleccionar solo la información más relevante del historial de chat, conocimiento del proyecto, etc., para evitar exceder los límites de tokens y mantener los costos bajos.
Sugerencia: Implementar estrategias de resumen de historial, recuperación basada en embeddings (RAG) para el conocimiento del proyecto, o selección heurística de fragmentos de contexto relevantes.
Uso de SessionMemoryContainer.shortTerm:
Esta memoria temporal existe en SessionContext, pero no se utiliza explícitamente en el flujo descrito. ¿Cuál es su propósito exacto? ¿Es para variables definidas por el usuario en el chat? ¿O para que los módulos compartan estado temporal entre diferentes orquestaciones dentro de la misma sesión?
Sugerencia: Clarificar su uso. Si es para compartir estado entre pasos dentro de una misma orquestación, ExecutionContext.stepResults o un campo similar en ExecutionContext podría ser más apropiado. Si es para estado entre orquestaciones, su uso actual en SessionContext es correcto, pero debe usarse activamente donde sea necesario.
Atomicidad de las Actualizaciones de Estado/Memoria:
Considera si las actualizaciones de estado (SessionState) y memoria (SessionMemoryContainer) deben ser atómicas, especialmente si en el futuro hubiera operaciones concurrentes. Por ahora, el flujo parece secuencial, pero es algo a tener en cuenta.
Mecanismos de Limpieza/Olvido:
El flujo no incluye explícitamente cómo el usuario podría pedirle al asistente que "olvide" parte del historial o conocimiento.
Sugerencia: Se podrían añadir comandos o lógica en analyzeInput para detectar estas solicitudes y llamar a métodos específicos en las clases de memoria (chatMemory.pruneHistory(), projectMemory.removeKnowledge(), etc.).
Dependencia Implícita en prepareStepInputs:
La función prepareStepInputs resuelve las entradas para un paso usando executionContext.stepResults y potencialmente sessionContext. La corrección de esta función es vital para que el workflow funcione.
Sugerencia: Asegurar que el formato para especificar dependencias en PlanStep.inputs (ej. "step1.outputA", "session.userPreferences.codeStyle") sea robusto y que la lógica de resolución en prepareStepInputs lo maneje correctamente.
Persistencia Real de Memoria:
finalizeSessionState menciona el disparo de guardados (memory.save()). La implementación real de estos métodos save() (y load() en initializeSession) en las clases de memoria es un detalle de implementación importante que no se muestra aquí, pero es fundamental.






¡Excelente pregunta! Implementar una arquitectura tan compleja de golpe es arriesgado y difícil de depurar. Un enfoque por capas o funcionalidades es la mejor manera de proceder, permitiéndote probar y validar cada parte antes de integrarla con la siguiente.

Aquí te propongo un plan de implementación incremental:

Fase 0: Fundación y Configuración Básica

Objetivo: Establecer la estructura del proyecto, la configuración básica y la comunicación mínima con el Webview y el modelo de IA.

Componentes a Implementar:

extension.ts: Punto de entrada, registro de comandos básicos (ej. abrir webview).

core/config/: ConfigManager (leer configuraciones básicas de VS Code), constants.ts.

ui/webviewManager.ts: Lógica básica para crear y mostrar el panel webview.

ui/webview/: Plantilla HTML (htmlTemplate.ts), manejo básico de mensajes (messageHandlers.ts - enviar/recibir pings), UI React básica (mostrar un input y un área de mensajes estática).

models/: baseAPI.ts, una implementación de proveedor (gemini.ts u ollama.ts) con una función simple para enviar un prompt y recibir texto.

core/context/: ExtensionContext básico (solo para mantener referencias iniciales).

utils/: errorHandler.ts (manejo básico de errores con console.error).

Pruebas en esta Fase:

¿La extensión se activa correctamente?

¿El comando abre el panel webview?

¿Puedes enviar un mensaje desde el webview al backend (extension.ts)?

¿Puedes enviar una respuesta simple desde el backend al webview?

¿Puedes enviar un prompt fijo al modelo de IA y recibir una respuesta (loguearla en consola)?

Fase 1: Flujo de Chat Simple (Sin Planificación)

Objetivo: Implementar un ciclo completo de pregunta-respuesta directa con el LLM, usando el ChatService y actualizando la UI.

Componentes a Implementar/Mejorar:

services/chatService.ts: Lógica para tomar la entrada del usuario, llamar al ModelInteractionManager, y devolver la respuesta.

models/modelInteractionManager.ts: (Refactorización de la lógica de llamada al modelo de la Fase 0) Gestionar la interacción con el modelo (preparar prompt simple, llamar API, obtener respuesta).

ui/webviewManager.ts: Pasar mensajes del usuario al ChatService y enviar respuestas del ChatService al webview.

ui/webview/react/: Hacer la UI interactiva: capturar input, mostrar mensajes de usuario y asistente, manejar estado de carga.

core/context/uiStateContext.ts: (Opcional en esta fase, podrías manejar el estado directamente) Para gestionar el estado de la UI si se vuelve complejo.

storage/memory/chatMemory.ts: Implementación básica en memoria (array) para guardar el historial del chat actual.

storage/memory/memoryManager.ts: Instanciar y proveer ChatMemory.

core/context/sessionContext.ts: Crear SessionContext básico que contenga la ChatMemory. SessionManager para inicializarlo.

ChatService: Usar ChatMemory para añadir contexto simple (últimos N mensajes) al prompt enviado al LLM. Actualizar ChatMemory con el nuevo turno.

Pruebas en esta Fase:

¿Puedes tener una conversación básica con el LLM a través de la UI?

¿El historial de chat se muestra correctamente en la UI?

¿El LLM recibe algo de contexto de los mensajes anteriores?

¿Se guarda el historial en ChatMemory?

Fase 2: Introducción del Orquestador y Ruta Directa

Objetivo: Implementar la lógica inicial del orquestador para analizar la entrada y ejecutar acciones directas (sin planificación compleja aún).

Componentes a Implementar/Mejorar:

orchestrator/orchestratorService.ts: Función orchestrate básica. Llama a InputAnalyzer.

orchestrator/inputAnalyzer.ts: Implementación inicial. Puede usar una llamada simple al LLM o reglas heurísticas para determinar la intención y si es una acción directa (ej. si menciona "lee el archivo X"). Devolver InputAnalysisResult.

orchestrator/directActionRouter.ts: Implementar mapToDirectAction (simple, basado en analysisResult.directActionType) y executeDirectAction.

tools/: Crear un par de herramientas muy simples (ej. readFileTool, getOpenFileNameTool).

DirectActionRouter: Llamar a la herramienta simple correspondiente.

orchestratorService.ts: Si analysisResult.requiresDirectAction es true, llamar a DirectActionRouter. Si no, por ahora, podría simplemente llamar al ChatService (flujo de Fase 1) como fallback.

core/context/: Integrar ProjectContext (obtener archivos abiertos, raíz del proyecto) y pasarlo donde sea necesario (ej. a las herramientas).

SessionManager: Incluir ProjectContext en SessionContext.

ResponseFormatter: (Básico) Formatear el resultado de la acción directa para la UI.

Pruebas en esta Fase:

¿El InputAnalyzer detecta correctamente una solicitud de acción directa simple?

¿El DirectActionRouter ejecuta la herramienta correcta? (Verificar con logs o respuestas simples).

¿El resultado de la herramienta se muestra (formateado) en la UI?

Si no es acción directa, ¿sigue funcionando el chat simple (fallback)?

¿Las herramientas tienen acceso al contexto del proyecto (ej. nombre de archivo abierto)?

Fase 3: Planificación Maestra Básica (Secuencial)

Objetivo: Implementar la generación y ejecución de un plan maestro simple y secuencial.

Componentes a Implementar/Mejorar:

orchestrator/planningEngine.ts: createMasterPlan. Usar LLM con un pre-prompt para generar un MasterPlan con 1-3 PlanStep secuenciales (sin requiresSubPlanning = false por ahora). Definir la estructura de PlanStep.

orchestrator/workflowManager.ts: createWorkflow (transformación simple de Plan a Workflow secuencial), executeWorkflowStep (lógica básica para preparar inputs y llamar al ModuleRouter).

orchestrator/moduleRouter.ts: routeToModule (mapeo simple de planStep.module a un módulo/función), dispatchAndExecuteModuleTask (solo maneja el caso requiresSubPlanning = false, llama a una función "ejecutora" simple).

modules/: Crear implementaciones muy básicas de los módulos (codeExamination, projectSearch) que solo ejecuten una acción simple (similar a las herramientas de la Fase 2) cuando son llamados por el ModuleRouter.

orchestrator/resultEvaluator.ts: evaluateResult (solo verifica success: true/false), makeProgressDecision (siempre devuelve 'continue' si success es true, o lanza error si es false).

orchestratorService.ts: Modificar orchestrate para llamar a PlanningEngine, WorkflowManager (en un bucle simple que avanza si evaluateResult es ok) cuando no es una acción directa.

ExecutionContext: Implementar la estructura básica y actualizar stepResults.

prepareStepInputs: Implementar lógica básica para pasar outputs de pasos anteriores.

Pruebas en esta Fase:

¿Una consulta compleja genera un MasterPlan (verificar estructura con logs)?

¿El WorkflowManager ejecuta los pasos secuencialmente?

¿Cada paso llama al módulo/función correcta a través del ModuleRouter?

¿Los resultados de los pasos se almacenan en ExecutionContext?

¿Un fallo en un paso detiene la ejecución?

¿El resultado final (combinado o del último paso) se muestra en la UI?

Fase 4: Introducción de la Retroalimentación y Refinamiento Básico

Objetivo: Implementar el ciclo de evaluación -> decisión -> acción (repetir/cambiar).

Componentes a Implementar/Mejorar:

orchestrator/resultEvaluator.ts: Mejorar evaluateResult (usar criterios, calcular matchScore), makeProgressDecision (implementar lógica para devolver 'repeat' o 'change' basado en la evaluación).

orchestrator/feedbackManager.ts: collectFeedback (generar FeedbackData básica), applyFeedback (loguear feedback o actualizar SessionMemory.shortTerm simple).

orchestratorService.ts: Implementar la lógica en el bucle de ejecución para manejar las decisiones 'repeat' (reintentar el paso) y 'change' (llamar a refinePlan).

orchestrator/planningEngine.ts: refinePlan (implementación inicial, quizás solo re-ejecuta createMasterPlan con más contexto del error/feedback).

PlanStep: Añadir fallbackStepId y usarlo en la lógica de 'repeat' o fallo.

Pruebas en esta Fase:

¿Una evaluación de resultado "mala" genera una decisión de repeat o change?

¿Se recopila FeedbackData?

¿La decisión repeat vuelve a ejecutar el paso (o un fallback)?

¿La decisión change intenta refinar el plan? (Verificar con logs).

Fase 5: Planificación a Nivel de Módulo (Sub-planificación)

Objetivo: Implementar la capacidad de los módulos para crear y ejecutar sus propios planes internos.

Componentes a Implementar/Mejorar:

modules/: En un módulo (ej. codeEditing):

Implementar planCodeEditingTask (usar LLM para generar ModulePlan).

Implementar executeModulePlan (ejecutar ModuleStep secuencialmente).

Implementar executeInternalModuleStep (lógica real de la acción del módulo).

Implementar validateModuleStepResult (validación interna).

orchestrator/planningEngine.ts: createMasterPlan ahora debe poder generar PlanStep con requiresSubPlanning: true.

orchestrator/moduleRouter.ts: dispatchAndExecuteModuleTask debe implementar la lógica para llamar a plan...Task y executePlan del módulo cuando requiresSubPlanning es true.

ModuleExecutionResult: Asegurarse de que puede contener subPlanExecutionResult.

ResultEvaluator: Adaptar evaluateResult para que pueda interpretar ModuleExecutionResult con o sin sub-plan.

Pruebas en esta Fase:

¿Un PlanStep marcado con requiresSubPlanning: true dispara la planificación interna del módulo?

¿El módulo genera y ejecuta su ModulePlan?

¿El resultado del sub-plan se propaga correctamente al orquestador?

¿La evaluación del resultado funciona correctamente para pasos con sub-planificación?

Fase 6: Integración Completa de Memoria y Contexto

Objetivo: Asegurar que todas las memorias y contextos se utilizan activamente para mejorar la planificación, ejecución y respuestas.

Componentes a Implementar/Mejorar:

InputAnalyzer, PlanningEngine, Módulos: Refinar la lógica para usar activamente chatHistory, projectMemory, userPreferences, learnings del SessionContext/ModuleContext.

PrePromptManager: Implementar la gestión y personalización de pre-prompts usando el contexto.

FeedbackManager: Implementar applyFeedback para actualizar realmente LearningMemory y UserPreferenceMemory.

SessionManager: Implementar la persistencia real (guardar/cargar a SQLite o archivos) para las memorias que lo requieran (ProjectMemory, UserPreferenceMemory, LearningMemory).

ResponseFormatter: Usar preferencias del usuario (UserPreferences) para adaptar la respuesta. Generar explicaciones (generateExplanations).

Pruebas en esta Fase:

¿Las conversaciones largas mantienen bien el contexto?

¿El asistente recuerda información clave del proyecto entre sesiones (si ProjectMemory es persistente)?

¿Las preferencias del usuario (ej. estilo de código) influyen en las acciones o respuestas?

¿El sistema parece "aprender" de errores o feedback pasado (si LearningMemory está activa)?

¿Las respuestas se formatean según las preferencias?

Fase 7: Refinamiento, Optimización y Características Adicionales

Objetivo: Pulir la implementación, mejorar el rendimiento y añadir funcionalidades extra.

Componentes a Implementar/Mejorar:

Paralelización en WorkflowManager (si aplica).

Manejo de errores avanzado (ErrorHandlingResult con planes de recuperación).

Selección de herramientas avanzada (ToolSelector).

Mejoras en la UI React (historial navegable, indicadores de estado detallados, etc.).

Optimización de llamadas al LLM (batching, caching si es posible).

Pruebas unitarias y de integración exhaustivas.

Consejos Generales:

Testing Continuo: Escribe pruebas unitarias para funciones puras y pruebas de integración para flujos clave en cada fase.

Mocking: Usa mocks (simulacros) para dependencias externas (LLM, VS Code API compleja) o componentes aún no implementados para poder probar las capas intermedias.

Logging: Implementa un buen sistema de logging desde el principio para poder seguir el flujo y depurar.

Iteración: No tengas miedo de refactorizar o ajustar la arquitectura si descubres problemas durante la implementación. Este plan es una guía, no una ley inmutable.

Prioriza: Enfócate en tener un flujo funcional (aunque simple) lo antes posible y luego añade complejidad gradualmente.

Este enfoque por fases te permitirá construir y probar tu asistente de IA de manera incremental, reduciendo la complejidad en cada paso y asegurando que cada capa funciona antes de construir sobre ella. ¡Mucha suerte!