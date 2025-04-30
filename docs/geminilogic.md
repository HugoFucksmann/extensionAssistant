¡De acuerdo! Basándome en las sugerencias anteriores, he revisado y ajustado la estructura y las firmas de las funciones para reflejar una mayor claridad en el flujo, una mejor nomenclatura y una gestión más explícita de la planificación multinivel y la retroalimentación.

Aquí tienes la implementación corregida y mejorada:

Cambios Clave Realizados:

Claridad Orquestador -> Módulo:

Se añadió requiresSubPlanning: boolean a PlanStep para indicar si un módulo debe generar su propio plan interno.

Se renombró moduleRouter.executeModuleStep a dispatchAndExecuteModuleTask para reflejar mejor su rol de despachar la tarea al módulo correcto y gestionar si necesita sub-planificación o es una ejecución directa dentro del módulo.

Nomenclatura:

moduleExecutor.executeModuleStep renombrado a executeInternalModuleStep para diferenciarlo claramente de la ejecución a nivel de orquestador.

Evaluación: Se asume que ResultEvaluator.evaluateResult se llama después de cada PlanStep del MasterPlan (ejecutado vía WorkflowManager y ModuleRouter). La validación interna del módulo (validateModuleStepResult) sigue existiendo.

Manejo de Errores:

Se añadió errorSource: 'orchestrator' | 'module' a ErrorHandlingResult.

Se añadió errorInfo?: ModuleErrorDetails a ModuleExecutionResult para que los módulos puedan devolver información detallada del error.

Refinamiento del Plan: Se clarifica que la decisión 'change' del ResultEvaluator puede desencadenar una llamada a planningEngine.refinePlan.

Interfaces: Actualizadas para reflejar los cambios (ej. PlanStep, ModuleExecutionResult, ErrorHandlingResult).

Estructura de srcV2 (Sin cambios, sigue siendo sólida)

(La estructura de directorios proporcionada anteriormente sigue siendo válida y adecuada para esta lógica)

Flujo de Planificación Revisado y Corregido:

// ==========================================
// Interfaces Clave Actualizadas
// ==========================================

interface PlanStep {
    id: string;
    description: string;
    module: string; // Módulo responsable
    task: Task; // Descripción de alto nivel de la tarea para el módulo
    inputs: Record<string, any>; // Entradas necesarias (referencias a outputs anteriores o contexto)
    expectedOutputs: Record<string, any>; // Qué se espera que produzca este paso
    dependsOn: string[]; // IDs de los pasos de los que depende
    validationCriteria: ValidationCriterion[]; // Criterios para validar el resultado de este paso
    requiresSubPlanning: boolean; // Indica si el módulo debe crear un plan interno detallado
    fallbackStepId?: string; // ID de un paso alternativo en caso de fallo (opcional)
}

interface ModuleExecutionResult {
    success: boolean;
    outputs: Record<string, any>; // Resultados generados por el módulo
    moduleFeedback?: ModuleFeedback; // Retroalimentación específica del módulo (opcional)
    executionDetails: ModuleExecutionDetails; // Métricas y logs del módulo
    subPlanExecutionResult?: ModulePlanExecutionResult; // Resultados detallados si hubo sub-planificación (opcional)
    errorInfo?: ModuleErrorDetails; // Información detallada si success es false
}

interface ErrorHandlingResult {
    recoverable: boolean;
    recoveryPlan?: PlanStep[]; // Plan de recuperación si es recuperable
    userMessage?: string; // Mensaje para el usuario
    diagnosticInfo?: Record<string, any>; // Información técnica
    errorSource: 'orchestrator' | 'module'; // Dónde se originó el error principal
}

interface ModuleErrorDetails {
    errorCode: string;
    message: string;
    failedStepId?: string; // ID del ModuleStep que falló (si aplica)
    stackTrace?: string; // (Opcional)
}

// Interfaz para el resultado de la ejecución de un plan interno de módulo
interface ModulePlanExecutionResult {
    success: boolean;
    stepResults: Map<string, ModuleStepResult>; // Resultados de cada ModuleStep
    finalOutputs: Record<string, any>; // Salidas finales del plan del módulo
    executionMetrics: ModuleExecutionMetrics;
}

// Interfaz para el resultado de un paso interno del módulo
interface ModuleStepResult {
    success: boolean;
    output: any;
    logs: string[];
    metrics: StepMetrics;
    validationResult?: ValidationResult; // Resultado de la validación interna del paso
}

// (Otras interfaces como MasterPlan, ModulePlan, EvaluationResult, etc., permanecen mayormente iguales)

// ==========================================
// orchestratorService.ts
// ==========================================

/**
 * Orquesta el proceso completo desde la entrada del usuario hasta la respuesta final.
 */
async function orchestrate(userInput: string, sessionContext: SessionContext): Promise<OrchestrationResult> {
    let currentSessionContext = sessionContext;
    try {
        // 1. Analizar Entrada
        const analysisResult = await inputAnalyzer.analyzeInput(userInput, currentSessionContext);
        currentSessionContext = sessionManager.updateSessionState(currentSessionContext, { analysis: analysisResult });

        // 2. Decidir Ruta: Directa o Planificación Completa
        if (analysisResult.requiresDirectAction && analysisResult.directActionType) {
            // 2.a. Ejecutar Acción Directa
            const directActionResult = await directActionRouter.executeDirectAction(analysisResult, currentSessionContext);
            // (Podría haber una evaluación simple aquí también si se desea)
            const finalResponse = responseFormatter.formatFinalResponse({ /* Adaptar resultado directo */ }, currentSessionContext.memory.userPreferences);
            // Finalizar sesión (opcionalmente)
            return { success: directActionResult.success, response: finalResponse.markdownContent, /* ...otros campos */ };
        } else {
            // 2.b. Iniciar Planificación Completa
            return await executePlannedWorkflow(analysisResult, currentSessionContext);
        }

    } catch (error: any) {
        const errorResult = handleOrchestrationError(error, undefined, currentSessionContext, 'orchestrator');
        // Finalizar sesión (opcionalmente)
        return { success: false, response: errorResult.userMessage || "Ocurrió un error inesperado.", /* ...otros campos */ };
    }
}

/**
 * Ejecuta el flujo de trabajo planificado.
 */
async function executePlannedWorkflow(analysisResult: InputAnalysisResult, initialSessionContext: SessionContext): Promise<OrchestrationResult> {
    let masterPlan: MasterPlan | null = null;
    let workflow: Workflow | null = null;
    let currentSessionContext = initialSessionContext;
    let executionContext: ExecutionContext | null = null;

    try {
        // 3. Generar Plan Maestro
        masterPlan = await planningEngine.createMasterPlan(analysisResult, currentSessionContext);
        const validation = planningEngine.validatePlan(masterPlan, currentSessionContext.relevantContext.project); // Asumiendo project context está en relevantContext
        if (!validation.isValid) {
            throw new Error(`Plan maestro inválido: ${validation.issues.map(i => i.description).join(', ')}`);
        }
        currentSessionContext = sessionManager.updateSessionState(currentSessionContext, { masterPlan });

        // 4. Seleccionar Herramientas (si aplica)
        const availableTools = toolRegistry.getAvailableTools(); // Asumiendo un registro de herramientas
        const selectedTools = toolSelector.selectTools(masterPlan, availableTools);
        const toolVerification = toolSelector.verifyToolCompatibility(selectedTools, currentSessionContext.relevantContext.project);
        if (!toolVerification.compatible) {
            throw new Error(`Herramientas incompatibles o faltantes: ${toolVerification.missingTools.join(', ')}`);
        }

        // 5. Crear Flujo de Trabajo
        workflow = workflowManager.createWorkflow(masterPlan, selectedTools);
        executionContext = workflow.executionContext; // El contexto de ejecución se crea aquí

        // 6. Ejecutar Flujo de Trabajo paso a paso con evaluación
        let currentStepIndex = 0;
        const masterPlanSteps = masterPlan.steps; // Usar las del plan original para la lógica de flujo
        const workflowSteps = workflow.steps; // Usar las del workflow para la ejecución real
        const allStepResults: Map<string, ModuleExecutionResult | DirectActionResult> = new Map(); // Almacenar resultados

        while (currentStepIndex < workflowSteps.length) {
            const currentPlanStep = masterPlanSteps.find(s => s.id === workflowSteps[currentStepIndex].planStepId);
            const currentWorkflowStep = workflowSteps[currentStepIndex];

            if (!currentPlanStep) throw new Error(`Error interno: No se encontró PlanStep para WorkflowStep ${currentWorkflowStep.id}`);

            // Actualizar contexto de ejecución para el paso actual
            executionContext.currentStepId = currentWorkflowStep.id;
            executionContext.previousResults = new Map(allStepResults); // Pasar resultados anteriores

            // Ejecutar el paso (que ahora llama a dispatchAndExecuteModuleTask)
            const stepResult = await workflowManager.executeWorkflowStep(currentWorkflowStep, executionContext, currentSessionContext);
            allStepResults.set(currentPlanStep.id, stepResult); // Guardar resultado asociado al ID del PlanStep

            // Evaluar el resultado del paso
            const evaluation = await resultEvaluator.evaluateResult(stepResult, currentPlanStep.expectedOutputs, currentPlanStep.validationCriteria);

            // Decidir qué hacer a continuación
            const decision = resultEvaluator.makeProgressDecision(evaluation, { currentSessionContext, currentPlanStep });

            // Procesar decisión
            switch (decision.action) {
                case 'continue':
                    // Recopilar feedback (asíncrono, no bloqueante o síncrono si es necesario para el siguiente paso)
                    feedbackManager.collectAndApplyFeedback(stepResult, currentPlanStep.expectedOutputs, executionContext, currentSessionContext);
                    currentStepIndex = progressWorkflow(currentPlanStep, stepResult, masterPlan, decision); // Avanzar al siguiente paso lógico
                    break;
                case 'repeat':
                    // Podría requerir limpiar el resultado del paso actual y re-ejecutar el mismo índice
                    // Opcionalmente, aplicar feedback antes de repetir
                    feedbackManager.collectAndApplyFeedback(stepResult, currentPlanStep.expectedOutputs, executionContext, currentSessionContext);
                    // Lógica para repetir (podría necesitar ajustar el contexto o reintentar con cambios menores)
                    // Por simplicidad, aquí podríamos lanzar un error o intentar un fallback
                    if (currentPlanStep.fallbackStepId) {
                        currentStepIndex = masterPlanSteps.findIndex(s => s.id === currentPlanStep.fallbackStepId);
                        if (currentStepIndex === -1) throw new Error(`Fallback step ${currentPlanStep.fallbackStepId} no encontrado.`);
                    } else {
                        throw new Error(`Paso ${currentPlanStep.id} falló y necesita repetirse, pero no hay estrategia definida.`);
                    }
                    break;
                case 'change':
                    // Recopilar feedback
                    feedbackManager.collectAndApplyFeedback(stepResult, currentPlanStep.expectedOutputs, executionContext, currentSessionContext);
                    // Refinar el plan maestro
                    masterPlan = await planningEngine.refinePlan(masterPlan, evaluation, decision.suggestedChanges, currentSessionContext);
                    // Re-validar y potencialmente recrear el workflow y reiniciar/ajustar la ejecución
                    // Esta parte es compleja y requiere una lógica cuidadosa de reinicio o continuación desde un punto modificado.
                    // Por ahora, podríamos lanzar un error indicando que se requiere replanificación.
                    throw new Error(`Se requiere replanificación basada en el resultado del paso ${currentPlanStep.id}.`);
            }
             if (currentStepIndex === -1) { // El workflow determinó que se completó
                 break;
             }
        }

        // 7. Formatear Respuesta Final
        const finalAggregatedResult = aggregateResults(allStepResults); // Función para combinar resultados
        const finalResponse = responseFormatter.formatFinalResponse({ success: true, response: finalAggregatedResult, executionDetails: { /* métricas globales */ } }, currentSessionContext.memory.userPreferences);
        // Finalizar sesión
        sessionManager.finalizeSession(currentSessionContext, { success: true, result: finalAggregatedResult });
        return { success: true, response: finalResponse.markdownContent, /* ...otros campos */ };

    } catch (error: any) {
        const currentStepForError = masterPlan?.steps.find(s => s.id === executionContext?.currentStepId);
        const errorResult = handleOrchestrationError(error, currentStepForError, currentSessionContext, error.moduleError ? 'module' : 'orchestrator'); // Asumiendo que los errores de módulo se propagan con una bandera
        // Finalizar sesión
        sessionManager.finalizeSession(currentSessionContext, { success: false, error: errorResult });
        return { success: false, response: errorResult.userMessage || "Ocurrió un error durante la ejecución planificada.", /* ...otros campos */ };
    }
}

/**
 * Determina el índice del siguiente paso a ejecutar en el workflow.
 * Puede devolver -1 si el flujo ha terminado.
 */
function progressWorkflow(currentPlanStep: PlanStep, result: ModuleExecutionResult | DirectActionResult, masterPlan: MasterPlan, decision: ProgressDecision): number {
    // Lógica para determinar el siguiente paso basado en dependencias,
    // el resultado actual y la decisión ('continue').
    // Por simplicidad, asumimos una ejecución secuencial por ahora.
    const currentIndex = masterPlan.steps.findIndex(s => s.id === currentPlanStep.id);
    if (currentIndex === -1) return -1; // Error
    const nextIndex = currentIndex + 1;
    return nextIndex < masterPlan.steps.length ? nextIndex : -1; // -1 indica finalización
}

/**
 * Maneja errores durante la orquestación.
 */
function handleOrchestrationError(error: Error, currentStep: PlanStep | undefined, sessionContext: SessionContext, source: 'orchestrator' | 'module'): ErrorHandlingResult {
    console.error(`Error durante la orquestación (${source}) en el paso ${currentStep?.id || 'N/A'}:`, error);
    // Lógica para determinar si es recuperable, generar plan de recuperación, etc.
    // Por ahora, simplemente formatea un mensaje de error.
    return {
        recoverable: false, // Simplificado
        userMessage: `Error en ${source}${currentStep ? ` durante el paso "${currentStep.description}"` : ''}: ${error.message}`,
        diagnosticInfo: { message: error.message, stack: error.stack },
        errorSource: source,
    };
}

/**
 * Recopila y aplica feedback (simplificado).
 */
async function collectAndApplyFeedback(result: any, expectedOutcome: any, executionContext: ExecutionContext, sessionContext: SessionContext): Promise<void> {
    try {
        const feedback = await feedbackManager.collectFeedback(result, expectedOutcome, executionContext);
        feedbackManager.applyFeedback(feedback, sessionContext.memory); // Actualiza memoria
    } catch (feedbackError) {
        console.error("Error procesando feedback:", feedbackError);
    }
}

// ==========================================
// inputAnalyzer.ts
// ==========================================
// Sin cambios significativos en las firmas, pero la implementación debe ser robusta
// para identificar la necesidad de acción directa vs. planificación.
async function analyzeInput(userInput: string, sessionContext: SessionContext): Promise<InputAnalysisResult> { /* ... */ }
async function extractCodeContext(analysisResult: InputAnalysisResult, projectContext: ProjectContext): Promise<CodeContextData> { /* ... */ }

// ==========================================
// planningEngine.ts
// ==========================================
/**
 * Genera un plan maestro. La implementación debe decidir 'requiresSubPlanning' para cada paso.
 */
async function createMasterPlan(analysisResult: InputAnalysisResult, sessionContext: SessionContext): Promise<MasterPlan> {
    // ... lógica para llamar al LLM con pre-prompt ...
    // El LLM o la lógica posterior debe determinar `requiresSubPlanning` para cada `PlanStep`.
    // Ejemplo: Si un paso es "Refactorizar la función X", `requiresSubPlanning` podría ser true.
    // Si es "Leer el archivo Y", podría ser false.
    return generatedPlan;
}

/**
 * Refina un plan existente basado en evaluación y sugerencias.
 */
async function refinePlan(currentPlan: MasterPlan, evaluation: EvaluationResult, suggestions: Change[], sessionContext: SessionContext): Promise<MasterPlan> {
    // ... lógica para ajustar el plan (añadir, quitar, modificar pasos) ...
    // Puede requerir otra llamada al LLM o lógica programática.
    return updatedPlan;
}

function validatePlan(plan: MasterPlan, projectContext: ProjectContext): PlanValidationResult { /* ... */ }

// ==========================================
// directActionRouter.ts
// ==========================================
// Sin cambios significativos en las firmas.
async function executeDirectAction(analysisResult: InputAnalysisResult, sessionContext: SessionContext): Promise<DirectActionResult> { /* ... */ }
function mapToDirectAction(analysisResult: InputAnalysisResult): DirectActionMapping { /* ... */ }

// ==========================================
// toolSelector.ts
// ==========================================
// Sin cambios significativos en las firmas.
function selectTools(masterPlan: MasterPlan, availableTools: Tool[]): Map<string, Tool[]> { /* ... */ }
function verifyToolCompatibility(selectedTools: Map<string, Tool[]>, projectContext: ProjectContext): ToolVerificationResult { /* ... */ }

// ==========================================
// workflowManager.ts
// ==========================================
function createWorkflow(masterPlan: MasterPlan, selectedTools: Map<string, Tool[]>): Workflow { /* ... */ }

/**
 * Ejecuta un paso del workflow, delegando al ModuleRouter.
 */
async function executeWorkflowStep(step: WorkflowStep, context: ExecutionContext, sessionContext: SessionContext): Promise<ModuleExecutionResult> {
    const planStep = context.masterPlan.steps.find(s => s.id === step.planStepId);
    if (!planStep) {
        throw new Error(`PlanStep ${step.planStepId} no encontrado para WorkflowStep ${step.id}`);
    }

    // Prepara las entradas específicas para este paso, obteniéndolas de previousResults
    const inputs = prepareStepInputs(planStep.inputs, context.previousResults);

    // Llama al ModuleRouter para que maneje la ejecución (con o sin sub-planificación)
    const routingInfo = moduleRouter.routeToModule(planStep, sessionContext); // Determina el módulo
    const result = await moduleRouter.dispatchAndExecuteModuleTask(routingInfo, planStep, inputs, sessionContext); // Ejecuta

    // (La evaluación ahora se hace en el bucle principal de orchestrate)
    return result;
}

// Función auxiliar (ejemplo)
function prepareStepInputs(inputMappings: Record<string, any>, previousResults: Map<string, any>): Record<string, any> {
    const actualInputs: Record<string, any> = {};
    for (const key in inputMappings) {
        const source = inputMappings[key]; // ej: "step1.outputA" o "context.fileName"
        // Lógica para resolver la fuente desde previousResults o el contexto global
        // actualInputs[key] = resolveSource(source, previousResults, context);
    }
    return actualInputs;
}


async function executeWorkflow(workflow: Workflow, sessionContext: SessionContext): Promise<WorkflowExecutionResult> {
    // Esta función podría volverse más simple si la lógica principal de ejecución
    // paso a paso se mueve a `orchestrate` como se hizo arriba.
    // Podría ser responsable solo de manejar paralelismo si existe.
    /* ... */
    return workflowResult;
}

// ==========================================
// feedbackManager.ts
// ==========================================
// Sin cambios significativos en las firmas.
async function collectFeedback(result: any, expectedOutcome: any, executionContext: ExecutionContext): Promise<FeedbackData> { /* ... */ }
function applyFeedback(feedback: FeedbackData, sessionMemory: SessionMemory): FeedbackApplication { /* ... */ }

// ==========================================
// resultEvaluator.ts
// ==========================================
/**
 * Evalúa el resultado de un paso (ModuleExecutionResult o DirectActionResult).
 */
async function evaluateResult(result: ModuleExecutionResult | DirectActionResult, expectedOutcome: any, evaluationCriteria: ValidationCriterion[]): Promise<EvaluationResult> {
    // ... Lógica de evaluación ...
    // Considerar `result.success`, `result.outputs`, `result.errorInfo`
    return evaluation;
}

function makeProgressDecision(evaluationResult: EvaluationResult, contextData: any): ProgressDecision { /* ... */ }

// ==========================================
// sessionManager.ts
// ==========================================
// Sin cambios significativos en las firmas.
function initializeSession(userInput: string, projectContext: ProjectContext): SessionContext { /* ... */ }
function updateSessionState(sessionContext: SessionContext, updates: Partial<SessionState>): SessionContext { /* ... */ } // Ajustado para usar Partial<SessionState>
function finalizeSession(sessionContext: SessionContext, outcome: any): FinalizedSessionData { /* ... */ }

// ==========================================
// moduleRouter.ts
// ==========================================

/**
 * Determina a qué módulo enrutar la tarea.
 */
function routeToModule(planStep: PlanStep, sessionContext: SessionContext): ModuleRoutingInfo {
    // Lógica para seleccionar el módulo basado en planStep.module
    const targetModuleId = planStep.module;
    // Obtener interfaz/referencia al módulo (ej. desde un registro)
    const moduleInterface = moduleRegistry.getModule(targetModuleId);
    if (!moduleInterface) {
        throw new Error(`Módulo ${targetModuleId} no encontrado.`);
    }
    return {
        targetModule: targetModuleId,
        moduleInterface: moduleInterface, // Referencia real al módulo o su API
        routingMetadata: { /* ... */ }
    };
}

/**
 * Despacha la tarea al módulo correcto y coordina si requiere sub-planificación.
 * ANTES: executeModuleStep
 */
async function dispatchAndExecuteModuleTask(
    routingInfo: ModuleRoutingInfo,
    planStep: PlanStep,
    inputs: Record<string, any>, // Entradas ya resueltas
    sessionContext: SessionContext
): Promise<ModuleExecutionResult> {
    const moduleApi = routingInfo.moduleInterface; // API del módulo obtenido del registro
    const moduleContext = createModuleContext(routingInfo.targetModule, sessionContext); // Crear contexto específico para el módulo

    try {
        let result: ModuleExecutionResult;
        if (planStep.requiresSubPlanning) {
            // 1. Llamar al planificador del módulo
            const modulePlannerFunction = moduleApi.getPlanner(planStep.task.type); // Asume una forma de obtener el planificador
            const modulePlan = await modulePlannerFunction(planStep.task, inputs, moduleContext); // Pasar inputs resueltos

            // 2. Validar plan del módulo (opcional pero recomendado)
            // validateModulePlan(modulePlan);

            // 3. Ejecutar el plan del módulo
            result = await moduleApi.executePlan(modulePlan, moduleContext); // El módulo ejecuta su propio plan
        } else {
            // Ejecutar directamente una acción simple en el módulo
            const simpleExecutorFunction = moduleApi.getExecutor(planStep.task.type); // Asume una forma de obtener un ejecutor simple
            result = await simpleExecutorFunction(planStep.task, inputs, moduleContext); // Ejecuta la tarea directamente
        }
        return result;

    } catch (error: any) {
        console.error(`Error ejecutando tarea en módulo ${routingInfo.targetModule}:`, error);
        // Empaquetar el error como ModuleExecutionResult fallido
        return {
            success: false,
            outputs: {},
            executionDetails: { /* métricas de fallo */ },
            errorInfo: {
                errorCode: error.code || 'MODULE_EXECUTION_FAILED',
                message: error.message,
                // stackTrace: error.stack // Opcional
            },
            // Marcar el error para que handleOrchestrationError sepa la fuente
            //@ts-ignore // Añadir propiedad ad-hoc o refinar interfaz
            moduleError: true
        };
    }
}

function registerModule(moduleInfo: ModuleRegistrationInfo): ModuleRegistrationResult { /* ... */ }

// ==========================================
// Module Planners (en cada módulo específico)
// ==========================================
// Firmas sin cambios, pero la implementación genera ModulePlan
async function planCodeEditingTask(task: Task, inputs: Record<string, any>, moduleContext: ModuleContext): Promise<ModulePlan> { /* ... */ }
async function planCodeExaminationTask(task: Task, inputs: Record<string, any>, moduleContext: ModuleContext): Promise<ModulePlan> { /* ... */ }
// ... otros planificadores de módulo ...

/**
 * Ejecuta un plan específico para un módulo (llamado por dispatchAndExecuteModuleTask si requiresSubPlanning es true).
 * Esta función estaría DENTRO de la API de cada módulo.
 */
async function executeModulePlan(modulePlan: ModulePlan, moduleContext: ModuleContext): Promise<ModuleExecutionResult> {
    const stepResults: Map<string, ModuleStepResult> = new Map();
    const finalOutputs: Record<string, any> = {};
    let overallSuccess = true;

    for (const step of modulePlan.steps) {
        try {
            // Aquí se llamaría a executeInternalModuleStep
            const stepResult = await executeInternalModuleStep(step, moduleContext, /* pasar outputs de pasos anteriores del módulo */);
            stepResults.set(step.id, stepResult);

            // Validar resultado del paso interno
            const validation = validateModuleStepResult(stepResult, step.validationCriteria);
            stepResult.validationResult = validation; // Guardar resultado de validación

            if (!stepResult.success || !validation.valid) {
                overallSuccess = false;
                // ¿Intentar fallbackOperation si está definido?
                if (step.fallbackOperation) {
                    // Lógica para ejecutar fallback
                } else {
                    // Detener la ejecución del plan del módulo si un paso falla y no hay fallback
                    throw new Error(`Module step ${step.id} failed or validation failed.`);
                }
            }
            // Acumular outputs si es necesario
            // mergeOutputs(finalOutputs, stepResult.output);

        } catch (error: any) {
            overallSuccess = false;
            stepResults.set(step.id, { success: false, output: null, logs: [error.message], metrics: {}, validationResult: { valid: false, /*...*/ } });
            // Propagar el error o manejarlo internamente
             return { // Devolver fallo inmediatamente
                 success: false,
                 outputs: finalOutputs,
                 executionDetails: { /* métricas */ },
                 subPlanExecutionResult: { success: false, stepResults, finalOutputs, executionMetrics: {} },
                 errorInfo: { errorCode: 'MODULE_PLAN_EXECUTION_FAILED', message: `Failed at step ${step.id}: ${error.message}`, failedStepId: step.id }
             };
        }
    }

    // Construir el resultado final del módulo
    return {
        success: overallSuccess,
        outputs: finalOutputs, // Outputs agregados
        executionDetails: { /* métricas agregadas */ },
        subPlanExecutionResult: { success: overallSuccess, stepResults, finalOutputs, executionMetrics: { /*...*/ } }
    };
}

// ==========================================
// moduleExecutor.ts (dentro de cada módulo)
// ==========================================

/**
 * Ejecuta una operación atómica dentro de un módulo.
 * ANTES: executeModuleStep
 */
async function executeInternalModuleStep(step: ModuleStep, moduleContext: ModuleContext, previousModuleOutputs: Map<string, any>): Promise<ModuleStepResult> {
    // Lógica específica de la operación (editar código, llamar API, etc.)
    // Usar step.inputs, moduleContext, previousModuleOutputs
    try {
        // ... ejecutar la acción ...
        return { success: true, output: {/* resultado */}, logs: [], metrics: {} };
    } catch (error: any) {
        return { success: false, output: null, logs: [error.message], metrics: {} };
    }
}

/**
 * Valida el resultado de un paso interno del módulo.
 */
function validateModuleStepResult(result: ModuleStepResult, validationCriteria: ValidationCriterion[]): ValidationResult {
    if (!result.success) return { valid: false, validationDetails: [], score: 0 };
    // Lógica para aplicar los criterios de validación al result.output
    return { valid: true, validationDetails: [], score: 1 }; // Simplificado
}

/**
 * Función para ejecutar tareas simples cuando requiresSubPlanning es false.
 * Debe existir una implementación por módulo o una genérica.
 */
async function executeSimpleTask(task: Task, inputs: Record<string, any>, moduleContext: ModuleContext): Promise<ModuleExecutionResult> {
    // Lógica para ejecutar la tarea simple directamente sin plan detallado.
    // Podría llamar a una versión simplificada de executeInternalModuleStep.
    try {
        // ... ejecutar la acción simple ...
        const output = {}; // Resultado de la acción simple
        return {
            success: true,
            outputs: { result: output }, // Empaquetar salida
            executionDetails: { /* métricas */ }
            // No hay subPlanExecutionResult aquí
        };
    } catch (error: any) {
        return {
            success: false,
            outputs: {},
            executionDetails: { /* métricas de fallo */ },
            errorInfo: { errorCode: 'SIMPLE_TASK_FAILED', message: error.message }
        };
    }
}


// ==========================================
// prePromptManager.ts
// ==========================================
// Sin cambios significativos en las firmas.
function getPrePrompt(plannerType: string, contextData: Record<string, any>): PlannerPrePrompt { /* ... */ }
function customizePrePrompt(basePrePrompt: PlannerPrePrompt, specificContext: any, userPreferences: UserPreferences): PlannerPrePrompt { /* ... */ }

// ==========================================
// responseFormatter.ts
// ==========================================
// Sin cambios significativos en las firmas.
function formatFinalResponse(orchestrationResult: OrchestrationResult, userPreferences: UserPreferences): FormattedResponse { /* ... */ }
function generateExplanations(results: any, detail: 'brief' | 'detailed'): ExplanationSet { /* ... */ }

// ==========================================
// modelInteractionManager.ts
// ==========================================
// Sin cambios significativos en las firmas.
async function interactWithModel(prompt: ModelPrompt, modelConfig: ModelConfig): Promise<ModelResponse> { /* ... */ }
function validateModelResponse(response: ModelResponse, expectedSchema: ResponseSchema): ValidatedModelResponse { /* ... */ }
function prepareModelPrompt(prePrompt: PlannerPrePrompt, contextData: any, task: Task): ModelPrompt { /* ... */ }


Resumen de Mejoras Aplicadas:

El flujo de decisión entre acción directa y planificación es explícito en orchestrate.

El MasterPlan ahora guía si un módulo debe realizar sub-planificación (requiresSubPlanning).

ModuleRouter (dispatchAndExecuteModuleTask) maneja la lógica de llamar al planificador/ejecutor del módulo o a un ejecutor simple.

La ejecución del Workflow es paso a paso, con evaluación (ResultEvaluator) y decisión (makeProgressDecision) después de cada paso principal.

Se ha introducido la capacidad de refinar el plan (refinePlan) como una posible acción tras la evaluación.

El manejo de errores distingue entre errores del orquestador y errores del módulo.

Las interfaces reflejan mejor la información necesaria y los resultados posibles en cada etapa (ej. ModuleExecutionResult puede contener resultados de sub-plan).

La nomenclatura es más específica (dispatchAndExecuteModuleTask, executeInternalModuleStep).

Esta estructura revisada proporciona un marco más robusto y claro para tu lógica de planificación multinivel con retroalimentación.