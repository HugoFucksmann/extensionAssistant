// ==========================================
// orchestratorService.ts
// ==========================================

/**
 * Inicia el proceso de orquestación basado en la entrada del usuario
 * @param userInput Entrada del usuario a procesar
 * @param sessionContext Contexto actual de la sesión
 * @returns Promise con el resultado final procesado para mostrar al usuario
 */
async function orchestrate(userInput: string, sessionContext: SessionContext): Promise<OrchestrationResult> {
    // 1. Analiza la entrada
    // 2. Determina si usar una ruta directa o planificación completa
    // 3. Genera plan o ejecuta acción directa
    // 4. Coordina la ejecución y verificación
    // 5. Retorna el resultado final procesado
    
    return {
        success: boolean,
        response: string,
        executionDetails: ExecutionDetails,
        uiActions: UIActionRequest[]
    };
}

/**
 * Maneja el paso de un plan a otro en la secuencia de orquestación
 * @param currentStep Paso actual del plan
 * @param result Resultado del paso actual
 * @param masterPlan Plan maestro completo
 * @returns Siguiente paso a ejecutar o null si se completó
 */
function progressWorkflow(currentStep: PlanStep, result: StepResult, masterPlan: MasterPlan): PlanStep | null {
    // Determina el siguiente paso basado en el resultado del paso actual
    // Puede modificar el flujo basado en resultados inesperados
    
    return nextStep || null;
}

/**
 * Maneja errores o fallos durante la orquestación
 * @param error Error ocurrido
 * @param currentStep Paso actual cuando ocurrió el error
 * @param sessionContext Contexto de la sesión
 * @returns Plan de recuperación o error formateado
 */
function handleOrchestrationError(error: Error, currentStep: PlanStep, sessionContext: SessionContext): ErrorHandlingResult {
    // Determina si el error es recuperable
    // Genera plan de recuperación o formatea error para usuario
    
    return {
        recoverable: boolean,
        recoveryPlan?: PlanStep[],
        userMessage?: string
    };
}

// ==========================================
// inputAnalyzer.ts
// ==========================================

/**
 * Analiza la entrada del usuario para determinar intención y complejidad
 * @param userInput Entrada del usuario
 * @param sessionContext Contexto actual de la sesión
 * @returns Resultado del análisis con información sobre la entrada
 */
async function analyzeInput(userInput: string, sessionContext: SessionContext): Promise<InputAnalysisResult> {
    // Utiliza el modelo para analizar la entrada
    // Determina intención, complejidad, entidades mencionadas
    // Identifica si la entrada contiene un atajo (ej. archivo con error)
    
    return {
        intent: string,
        complexity: 'simple' | 'complex',
        entities: {
            files: string[],
            errorLocations: ErrorLocation[],
            functionNames: string[],
            // otros datos importantes identificados
        },
        requiresDirectAction: boolean,
        directActionType?: string,
        suggestedModules: string[]
    };
}

/**
 * Extrae el contexto del código mencionado en la entrada
 * @param analysisResult Resultado del análisis de entrada
 * @param projectContext Contexto del proyecto actual
 * @returns Contexto relevante extraído
 */
async function extractCodeContext(analysisResult: InputAnalysisResult, projectContext: ProjectContext): Promise<CodeContextData> {
    // Extrae información de archivos mencionados
    // Recupera código relevante, estructura, etc.
    
    return {
        codeSnippets: Map<string, string>,
        fileStructures: Map<string, FileStructure>,
        relevantErrors: ErrorData[]
    };
}

// ==========================================
// planningEngine.ts
// ==========================================

/**
 * Genera un plan maestro basado en el análisis de la entrada
 * @param analysisResult Resultado del análisis de la entrada
 * @param sessionContext Contexto de la sesión
 * @returns Plan maestro con pasos a seguir
 */
async function createMasterPlan(analysisResult: InputAnalysisResult, sessionContext: SessionContext): Promise<MasterPlan> {
    // Usa prePrompt para que el modelo genere un plan estructurado
    // Define secuencia de módulos y operaciones
    
    return {
        goals: string[],
        steps: PlanStep[],
        expectedOutcome: string,
        fallbackStrategies: FallbackStrategy[],
        estimatedComplexity: number
    };
}

/**
 * Refina un plan existente basado en nueva información o feedback
 * @param currentPlan Plan actual
 * @param feedback Retroalimentación recibida
 * @param newContext Nuevo contexto disponible
 * @returns Plan refinado
 */
async function refinePlan(currentPlan: MasterPlan, feedback: FeedbackData, newContext: any): Promise<MasterPlan> {
    // Ajusta el plan basado en la retroalimentación
    // Puede añadir, quitar o modificar pasos
    
    return updatedPlan;
}

/**
 * Valida un plan generado para asegurar que es coherente y ejecutable
 * @param plan Plan a validar
 * @param projectContext Contexto del proyecto
 * @returns Resultado de la validación
 */
function validatePlan(plan: MasterPlan, projectContext: ProjectContext): PlanValidationResult {
    // Verifica que cada paso tenga los inputs necesarios
    // Confirma que la secuencia es lógica
    // Identifica posibles problemas
    
    return {
        isValid: boolean,
        issues: PlanIssue[],
        suggestions: PlanSuggestion[]
    };
}

// ==========================================
// directActionRouter.ts
// ==========================================

/**
 * Determina y ejecuta una acción directa basada en análisis
 * @param analysisResult Resultado del análisis de entrada
 * @param sessionContext Contexto de la sesión
 * @returns Resultado de la acción directa
 */
async function executeDirectAction(analysisResult: InputAnalysisResult, sessionContext: SessionContext): Promise<DirectActionResult> {
    // Identifica la acción rápida apropiada
    // Ejecuta la acción sin planificación compleja
    
    return {
        success: boolean,
        result: any,
        executionTime: number,
        actionType: string
    };
}

/**
 * Mapea análisis a una acción directa específica
 * @param analysisResult Resultado del análisis
 * @returns Información sobre la acción directa a ejecutar
 */
function mapToDirectAction(analysisResult: InputAnalysisResult): DirectActionMapping {
    // Determina qué acción directa ejecutar basada en el análisis
    
    return {
        actionType: string,
        module: string,
        parameters: Record<string, any>
    };
}

// ==========================================
// toolSelector.ts
// ==========================================

/**
 * Selecciona herramientas apropiadas según el plan maestro
 * @param masterPlan Plan maestro generado
 * @param availableTools Lista de herramientas disponibles
 * @returns Mapa de herramientas seleccionadas para cada paso
 */
function selectTools(masterPlan: MasterPlan, availableTools: Tool[]): Map<string, Tool[]> {
    // Para cada paso del plan, identifica las herramientas necesarias
    
    return toolMap;
}

/**
 * Verifica la disponibilidad y compatibilidad de herramientas
 * @param selectedTools Herramientas seleccionadas
 * @param projectContext Contexto del proyecto
 * @returns Resultado de la verificación
 */
function verifyToolCompatibility(selectedTools: Map<string, Tool[]>, projectContext: ProjectContext): ToolVerificationResult {
    // Verifica que todas las herramientas están disponibles
    // Confirma que son compatibles entre sí
    
    return {
        compatible: boolean,
        missingTools: string[],
        incompatibilities: ToolIncompatibility[]
    };
}

// ==========================================
// workflowManager.ts
// ==========================================

/**
 * Crea un flujo de trabajo ejecutable a partir del plan maestro
 * @param masterPlan Plan maestro validado
 * @param selectedTools Herramientas seleccionadas
 * @returns Flujo de trabajo ejecutable
 */
function createWorkflow(masterPlan: MasterPlan, selectedTools: Map<string, Tool[]>): Workflow {
    // Transforma el plan en una secuencia ejecutable
    // Asigna herramientas a cada paso
    
    return {
        steps: WorkflowStep[],
        parallelTracks: ParallelTrack[],
        dependencies: StepDependency[],
        executionContext: ExecutionContext
    };
}

/**
 * Ejecuta un paso específico del flujo de trabajo
 * @param step Paso a ejecutar
 * @param context Contexto de ejecución
 * @returns Resultado de la ejecución del paso
 */
async function executeWorkflowStep(step: WorkflowStep, context: ExecutionContext): Promise<StepExecutionResult> {
    // Ejecuta un paso del flujo utilizando el módulo apropiado
    // Recopila resultados y métricas
    
    return {
        success: boolean,
        outputs: Record<string, any>,
        metrics: ExecutionMetrics,
        logs: StepLog[]
    };
}

/**
 * Gestiona la ejecución completa del flujo de trabajo
 * @param workflow Flujo de trabajo a ejecutar
 * @param sessionContext Contexto de la sesión
 * @returns Resultado de la ejecución completa
 */
async function executeWorkflow(workflow: Workflow, sessionContext: SessionContext): Promise<WorkflowExecutionResult> {
    // Coordina la ejecución de todos los pasos
    // Maneja dependencias y flujos paralelos
    // Recopila resultados globales
    
    return {
        success: boolean,
        stepResults: Map<string, StepExecutionResult>,
        aggregatedOutputs: Record<string, any>,
        executionStats: WorkflowExecutionStats
    };
}

// ==========================================
// feedbackManager.ts
// ==========================================

/**
 * Recopila y procesa retroalimentación sobre un resultado
 * @param result Resultado a evaluar
 * @param expectedOutcome Resultado esperado
 * @param executionContext Contexto de la ejecución
 * @returns Datos de retroalimentación estructurados
 */
async function collectFeedback(result: any, expectedOutcome: any, executionContext: ExecutionContext): Promise<FeedbackData> {
    // Analiza la diferencia entre resultado y expectativa
    // Genera retroalimentación estructurada
    
    return {
        matchScore: number,
        issues: FeedbackIssue[],
        suggestions: FeedbackSuggestion[],
        actionableItems: ActionableItem[]
    };
}

/**
 * Aplica retroalimentación para mejorar futuros planes
 * @param feedback Retroalimentación recopilada
 * @param sessionMemory Memoria de la sesión
 * @returns Actualizaciones aplicadas
 */
function applyFeedback(feedback: FeedbackData, sessionMemory: SessionMemory): FeedbackApplication {
    // Actualiza la memoria de sesión con la retroalimentación
    // Ajusta parámetros para futuros planes
    
    return {
        appliedChanges: MemoryChange[],
        updatedParameters: Map<string, any>,
        learningPoints: string[]
    };
}

// ==========================================
// resultEvaluator.ts
// ==========================================

/**
 * Evalúa el resultado de un paso o proceso completo
 * @param result Resultado a evaluar
 * @param expectedOutcome Resultado esperado
 * @param evaluationCriteria Criterios de evaluación
 * @returns Resultado de la evaluación
 */
async function evaluateResult(result: any, expectedOutcome: any, evaluationCriteria: EvaluationCriteria): Promise<EvaluationResult> {
    // Compara resultado con expectativas
    // Aplica criterios de evaluación específicos
    
    return {
        success: boolean,
        matchScore: number,
        mismatches: Mismatch[],
        decision: 'continue' | 'repeat' | 'change',
        explanation: string
    };
}

/**
 * Determina si se debe continuar, repetir o cambiar un proceso
 * @param evaluationResult Resultado de la evaluación
 * @param contextData Datos adicionales de contexto
 * @returns Decisión sobre el siguiente paso
 */
function makeProgressDecision(evaluationResult: EvaluationResult, contextData: any): ProgressDecision {
    // Basado en la evaluación, decide qué hacer
    
    return {
        action: 'continue' | 'repeat' | 'change',
        reasoning: string,
        suggestedChanges: Change[],
        priority: number
    };
}

// ==========================================
// sessionManager.ts
// ==========================================

/**
 * Inicializa una sesión para el flujo de orquestación
 * @param userInput Entrada inicial del usuario
 * @param projectContext Contexto del proyecto
 * @returns Contexto de sesión inicializado
 */
function initializeSession(userInput: string, projectContext: ProjectContext): SessionContext {
    // Crea un nuevo contexto de sesión
    // Establece estado inicial y parámetros
    
    return {
        sessionId: string,
        startTime: Date,
        userInput: string,
        relevantContext: any,
        memory: SessionMemory,
        state: SessionState
    };
}

/**
 * Actualiza el estado de la sesión con nuevos datos
 * @param sessionContext Contexto actual de sesión
 * @param updates Actualizaciones a aplicar
 * @returns Contexto de sesión actualizado
 */
function updateSessionState(sessionContext: SessionContext, updates: SessionUpdates): SessionContext {
    // Aplica actualizaciones al contexto de sesión
    
    return updatedSessionContext;
}

/**
 * Finaliza la sesión y guarda datos relevantes
 * @param sessionContext Contexto de sesión a finalizar
 * @param outcome Resultado final de la sesión
 * @returns Datos de sesión finalizados para almacenamiento
 */
function finalizeSession(sessionContext: SessionContext, outcome: any): FinalizedSessionData {
    // Marca la sesión como completa
    // Guarda datos relevantes para futuras referencias
    
    return {
        sessionSummary: SessionSummary,
        learningData: LearningData,
        metrics: SessionMetrics
    };
}

// ==========================================
// moduleRouter.ts
// ==========================================

/**
 * Enruta tareas a los módulos específicos basándose en el plan maestro
 * @param planStep Paso del plan a enrutar
 * @param sessionContext Contexto de la sesión actual
 * @returns Información del enrutamiento con el módulo seleccionado
 */
function routeToPlannerModule(planStep: PlanStep, sessionContext: SessionContext): ModuleRoutingInfo {
    // Determina qué módulo debe manejar este paso del plan
    // Prepara los datos necesarios para el módulo
    
    return {
        targetModule: string,
        moduleInterface: ModuleInterface,
        preparedInputs: Record<string, any>,
        routingMetadata: RoutingMetadata
    };
}

/**
 * Coordina la ejecución de un paso del plan en el módulo apropiado
 * @param routingInfo Información de enrutamiento del módulo
 * @param planStep Paso del plan a ejecutar
 * @returns Resultado de la ejecución del módulo
 */
async function executeModuleStep(routingInfo: ModuleRoutingInfo, planStep: PlanStep): Promise<ModuleExecutionResult> {
    // Invoca al módulo específico
    // Maneja la comunicación entre el orquestador y el módulo
    
    return {
        success: boolean,
        outputs: Record<string, any>,
        moduleFeedback: ModuleFeedback,
        executionDetails: ModuleExecutionDetails
    };
}

/**
 * Registra un nuevo módulo en el sistema de enrutamiento
 * @param moduleInfo Información del módulo a registrar
 * @returns Estado del registro
 */
function registerModule(moduleInfo: ModuleRegistrationInfo): ModuleRegistrationResult {
    // Registra un nuevo módulo para que pueda ser utilizado en planes
    
    return {
        success: boolean,
        registeredCapabilities: string[],
        moduleId: string
    };
}

// ==========================================
// Module Planners (en cada módulo específico)
// ==========================================

/**
 * Genera un plan específico para el módulo de edición de código
 * @param task Tarea a realizar
 * @param codeContext Contexto del código
 * @param constraints Restricciones a considerar
 * @returns Plan específico del módulo
 */
async function planCodeEditingTask(task: Task, codeContext: CodeContext, constraints: TaskConstraints): Promise<ModulePlan> {
    // Usa prePrompt para que el modelo genere un plan estructurado específico
    // Define los pasos de edición de código necesarios
    
    return {
        steps: ModuleStep[],
        requiredResources: Resource[],
        expectedOutcomes: ExpectedOutcome[],
        validationCriteria: ValidationCriterion[]
    };
}

/**
 * Genera un plan específico para el módulo de examinación de código
 * @param task Tarea a realizar
 * @param codeContext Contexto del código
 * @param analysisGoals Objetivos del análisis
 * @returns Plan específico del módulo
 */
async function planCodeExaminationTask(task: Task, codeContext: CodeContext, analysisGoals: AnalysisGoal[]): Promise<ModulePlan> {
    // Usa prePrompt para que el modelo genere un plan estructurado específico
    // Define los pasos de análisis de código necesarios
    
    return {
        steps: ModuleStep[],
        requiredResources: Resource[],
        expectedOutcomes: ExpectedOutcome[],
        validationCriteria: ValidationCriterion[]
    };
}

/**
 * Genera un plan específico para el módulo de búsqueda en proyecto
 * @param searchQuery Consulta de búsqueda
 * @param projectContext Contexto del proyecto
 * @param searchParams Parámetros adicionales de búsqueda
 * @returns Plan específico del módulo
 */
async function planProjectSearchTask(searchQuery: string, projectContext: ProjectContext, searchParams: SearchParameters): Promise<ModulePlan> {
    // Usa prePrompt para que el modelo genere un plan estructurado específico
    // Define los pasos de búsqueda necesarios
    
    return {
        steps: ModuleStep[],
        requiredResources: Resource[],
        expectedOutcomes: ExpectedOutcome[],
        validationCriteria: ValidationCriterion[]
    };
}

/**
 * Genera un plan específico para el módulo de gestión de proyectos
 * @param task Tarea a realizar
 * @param projectContext Contexto del proyecto
 * @param constraints Restricciones a considerar
 * @returns Plan específico del módulo
 */
async function planProjectManagementTask(task: Task, projectContext: ProjectContext, constraints: TaskConstraints): Promise<ModulePlan> {
    // Usa prePrompt para que el modelo genere un plan estructurado específico
    // Define los pasos de gestión de proyecto necesarios
    
    return {
        steps: ModuleStep[],
        requiredResources: Resource[],
        expectedOutcomes: ExpectedOutcome[],
        validationCriteria: ValidationCriterion[]
    };
}

/**
 * Genera un plan específico para el módulo de comunicación
 * @param messageIntent Intención del mensaje
 * @param contentToExplain Contenido a explicar
 * @param userContext Contexto del usuario
 * @returns Plan específico del módulo
 */
async function planCommunicationTask(messageIntent: string, contentToExplain: any, userContext: UserContext): Promise<ModulePlan> {
    // Usa prePrompt para que el modelo genere un plan estructurado específico
    // Define los pasos de comunicación necesarios
    
    return {
        steps: ModuleStep[],
        requiredResources: Resource[],
        expectedOutcomes: ExpectedOutcome[],
        validationCriteria: ValidationCriterion[]
    };
}

/**
 * Ejecuta un plan específico para un módulo
 * @param modulePlan Plan específico del módulo a ejecutar
 * @param moduleContext Contexto específico del módulo
 * @returns Resultado de la ejecución del plan del módulo
 */
async function executeModulePlan(modulePlan: ModulePlan, moduleContext: ModuleContext): Promise<ModulePlanExecutionResult> {
    // Ejecuta cada paso del plan del módulo
    // Recopila resultados y métricas
    
    return {
        success: boolean,
        stepResults: Map<string, ModuleStepResult>,
        outputs: Record<string, any>,
        executionMetrics: ModuleExecutionMetrics
    };
}

// ==========================================
// moduleExecutor.ts (dentro de cada módulo)
// ==========================================

/**
 * Ejecuta una tarea específica del módulo según el paso del plan
 * @param step Paso del plan a ejecutar
 * @param moduleContext Contexto específico del módulo
 * @returns Resultado de la ejecución del paso
 */
async function executeModuleStep(step: ModuleStep, moduleContext: ModuleContext): Promise<ModuleStepResult> {
    // Ejecuta una operación específica del módulo
    // Por ejemplo, editar código, analizar un archivo, etc.
    
    return {
        success: boolean,
        output: any,
        logs: string[],
        metrics: StepMetrics
    };
}

/**
 * Valida el resultado de un paso del módulo
 * @param result Resultado a validar
 * @param validationCriteria Criterios de validación
 * @returns Resultado de la validación
 */
function validateModuleStepResult(result: ModuleStepResult, validationCriteria: ValidationCriterion[]): ValidationResult {
    // Valida que el resultado cumpla con los criterios esperados
    
    return {
        valid: boolean,
        validationDetails: ValidationDetail[],
        score: number
    };
}

// ==========================================
// prePromptManager.ts
// ==========================================

/**
 * Obtiene el pre-prompt apropiado para un planificador específico
 * @param plannerType Tipo de planificador ('master', 'codeEditing', etc.)
 * @param contextData Datos de contexto relevantes
 * @returns Pre-prompt configurado para el planificador
 */
function getPrePrompt(plannerType: string, contextData: Record<string, any>): PlannerPrePrompt {
    // Selecciona y configura el pre-prompt adecuado
    // Personaliza según el contexto y configuración
    
    return {
        systemPrompt: string,
        formatInstructions: string,
        examples: PromptExample[],
        constraints: string[]
    };
}

/**
 * Personaliza un pre-prompt basado en el contexto específico
 * @param basePrePrompt Pre-prompt base a personalizar
 * @param specificContext Contexto específico para personalización
 * @param userPreferences Preferencias del usuario
 * @returns Pre-prompt personalizado
 */
function customizePrePrompt(basePrePrompt: PlannerPrePrompt, specificContext: any, userPreferences: UserPreferences): PlannerPrePrompt {
    // Ajusta el pre-prompt basado en el contexto y preferencias
    
    return customizedPrePrompt;
}

// ==========================================
// responseFormatter.ts
// ==========================================

/**
 * Formatea la respuesta final para el usuario
 * @param orchestrationResult Resultado del proceso de orquestación
 * @param userPreferences Preferencias del usuario
 * @returns Respuesta formateada lista para presentar
 */
function formatFinalResponse(orchestrationResult: OrchestrationResult, userPreferences: UserPreferences): FormattedResponse {
    // Formatea la respuesta final para el usuario según preferencias
    
    return {
        markdownContent: string,
        codeSnippets: CodeSnippet[],
        suggestedActions: SuggestedAction[],
        explanations: Record<string, string>
    };
}

/**
 * Genera explicaciones para los cambios o análisis realizados
 * @param results Resultados del proceso
 * @param detail Nivel de detalle deseado
 * @returns Explicaciones estructuradas
 */
function generateExplanations(results: any, detail: 'brief' | 'detailed'): ExplanationSet {
    // Genera explicaciones claras sobre lo que se hizo y por qué
    
    return {
        summaryExplanation: string,
        stepExplanations: Map<string, string>,
        technicalDetails: TechnicalDetail[]
    };
}

// ==========================================
// modelInteractionManager.ts
// ==========================================

/**
 * Gestiona la interacción con el modelo de IA
 * @param prompt Prompt a enviar al modelo
 * @param modelConfig Configuración del modelo a utilizar
 * @returns Respuesta del modelo estructurada
 */
async function interactWithModel(prompt: ModelPrompt, modelConfig: ModelConfig): Promise<ModelResponse> {
    // Envía el prompt al modelo de IA adecuado
    // Gestiona reintentos, tiempos de espera, etc.
    
    return {
        content: any,
        usageMetrics: UsageMetrics,
        modelInfo: ModelInfo
    };
}

/**
 * Verifica que la respuesta del modelo cumple con el formato esperado
 * @param response Respuesta del modelo
 * @param expectedSchema Esquema esperado
 * @returns Resultado de la verificación y respuesta parsedada
 */
function validateModelResponse(response: ModelResponse, expectedSchema: ResponseSchema): ValidatedModelResponse {
    // Verifica que la respuesta tiene el formato correcto
    // Parsea la respuesta según el esquema
    
    return {
        valid: boolean,
        parsedContent: any,
        validationIssues: ValidationIssue[]
    };
}

/**
 * Prepara un prompt para enviar al modelo
 * @param prePrompt Instrucciones base del pre-prompt
 * @param contextData Datos de contexto a incluir
 * @param task Tarea específica a realizar
 * @returns Prompt completo listo para enviar al modelo
 */
function prepareModelPrompt(prePrompt: PlannerPrePrompt, contextData: any, task: Task): ModelPrompt {
    // Integra el pre-prompt, contexto y tarea en un prompt final
    
    return {
        systemMessage: string,
        userMessage: string,
        formatInstructions: string,
        temperature: number,
        maxTokens: number
    };
}

// ==========================================
// Interfaces para estructuras de datos principales
// ==========================================

interface MasterPlan {
    goals: string[];
    steps: PlanStep[];
    expectedOutcome: string;
    fallbackStrategies: FallbackStrategy[];
    estimatedComplexity: number;
}

interface PlanStep {
    id: string;
    description: string;
    module: string;
    task: Task;
    inputs: Record<string, any>;
    expectedOutputs: Record<string, any>;
    dependsOn: string[];
    validationCriteria: ValidationCriterion[];
}

interface ModulePlan {
    steps: ModuleStep[];
    requiredResources: Resource[];
    expectedOutcomes: ExpectedOutcome[];
    validationCriteria: ValidationCriterion[];
}

interface EvaluationResult {
    success: boolean;
    matchScore: number;
    mismatches: Mismatch[];
    decision: 'continue' | 'repeat' | 'change';
    explanation: string;
}

interface FeedbackData {
    matchScore: number;
    issues: FeedbackIssue[];
    suggestions: FeedbackSuggestion[];
    actionableItems: ActionableItem[];
}

interface SessionContext {
    sessionId: string;
    startTime: Date;
    userInput: string;
    relevantContext: any;
    memory: SessionMemory;
    state: SessionState;
}

interface InputAnalysisResult {
    intent: string;
    complexity: 'simple' | 'complex';
    entities: {
        files: string[];
        errorLocations: ErrorLocation[];
        functionNames: string[];
        // otros datos importantes identificados
    };
    requiresDirectAction: boolean;
    directActionType?: string;
    suggestedModules: string[];
}

// Interfaces adicionales importantes

interface ModuleContext {
    moduleId: string;
    capabilities: string[];
    resources: Resource[];
    state: Record<string, any>;
    configOptions: ModuleConfig;
}

interface ValidationCriterion {
    id: string;
    description: string;
    validationFunction: string;
    thresholds: Record<string, number>;
    priority: number;
}

interface ModuleStep {
    id: string;
    operation: string;
    inputs: Record<string, any>;
    expectedOutputs: Record<string, any>;
    validationCriteria: ValidationCriterion[];
    fallbackOperation?: string;
}

interface ExecutionContext {
    sessionId: string;
    masterPlan: MasterPlan;
    currentStepId: string;
    previousResults: Map<string, any>;
    availableTools: Map<string, Tool>;
    startTime: Date;
}

interface ModelPrompt {
    systemMessage: string;
    userMessage: string;
    formatInstructions: string;
    temperature: number;
    maxTokens: number;
}

interface PlannerPrePrompt {
    systemPrompt: string;
    formatInstructions: string;
    examples: PromptExample[];
    constraints: string[];
}

interface ModuleExecutionResult {
    success: boolean;
    outputs: Record<string, any>;
    moduleFeedback: ModuleFeedback;
    executionDetails: ModuleExecutionDetails;
}

interface UserPreferences {
    detailLevel: 'minimal' | 'moderate' | 'detailed';
    codeStyle: CodeStylePreferences;
    communicationStyle: 'technical' | 'casual' | 'educational';
    autoApplyChanges: boolean;
    showExplanations: boolean;
}

interface ModuleRegistrationInfo {
    moduleId: string;
    capabilities: string[];
    handledTasks: string[];
    dependencies: string[];
    configOptions: ModuleConfigOptions;
}

interface FormattedResponse {
    markdownContent: string;
    codeSnippets: CodeSnippet[];
    suggestedActions: SuggestedAction[];
    explanations: Record<string, string>;
}

interface ResourceRequest {
    type: 'file' | 'projectInfo' | 'model' | 'tool';
    identifier: string;
    accessLevel: 'read' | 'write' | 'execute';
    priority: number;
}

interface RoutingMetadata {
    routePriority: number;
    routeReason: string;
    alternativeRoutes: string[];
    routingScore: number;
}

interface ErrorHandlingResult {
    recoverable: boolean;
    recoveryPlan?: PlanStep[];
    userMessage?: string;
    diagnosticInfo?: Record<string, any>;
}

interface SessionMemory {
    conversationHistory: ConversationEntry[];
    cachedEntities: Map<string, any>;
    workingState: Record<string, any>;
    userPreferences: UserPreferences;
    performanceMetrics: PerformanceMetrics;
}

// Tipos para datos de retroalimentación y verificación
interface FeedbackIssue {
    issueType: string;
    description: string;
    severity: 'low' | 'medium' | 'high';
    relatedStepId?: string;
    suggestedFix?: string;
}

interface ValidationDetail {
    criterionId: string;
    passed: boolean;
    actualValue: any;
    expectedValue: any;
    deviation: number;
}