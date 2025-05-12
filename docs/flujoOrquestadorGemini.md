// =============== TYPES & INTERFACES ===============

/**
 * Representa la salida de un agente o del orquestador.
 * Puede ser texto, código, un error, etc.
 */
interface Output {
    type: 'text' | 'code' | 'explanation' | 'fix_applied' | 'fix_failed_validation' | 'error' | 'clarification_needed';
    content?: any; // Contenido principal (texto, código, objeto de error)
    originalQuery?: string;
    [key: string]: any; // Para propiedades adicionales específicas del tipo de salida
}

/**
 * Entidades extraídas del input del usuario por InputAnalysis.
 */
interface ExtractedEntities {
    filePath?: string;
    functionName?: string;
    className?: string;
    variableName?: string;
    issueDescription?: string;
    detailLevel?: 'low' | 'medium' | 'high';
    targetLanguage?: string;
    // ... otras entidades relevantes
}

/**
 * Resultado del análisis de InputAnalysis.
 */
interface AnalysisResult {
    intent: string; // Ej: 'conversation', 'explainCode', 'fixCode', 'generateCode'
    entities: ExtractedEntities;
    cleanedInput: string;
    confidenceScore?: number;
    originalInput: string;
}

/**
 * Contexto general de la orquestación, gestionado por OrchestrationContextManager.
 */
interface OrchestrationContext {
    history: Array<{ role: 'user' | 'assistant' | 'system'; content: any; timestamp: Date }>;
    currentProject?: {
        rootPath?: string;
        mainLanguage?: string;
        // ... más metadatos del proyecto
    };
    activeEditor?: {
        filePath?: string;
        selectedText?: string;
        languageId?: string;
        // ... más detalles del editor activo
    };
    userPreferences?: {
        preferredStyle?: string; // Ej: 'concise', 'detailed'
        // ... otras preferencias
    };
    // ... otros datos contextuales globales
}

/**
 * Contexto específico para un intento de manejo de una solicitud.
 * Incluye el contexto global y datos específicos del intento.
 */
interface HandlingContext extends OrchestrationContext {
    attemptHistory?: Array<{ strategy: string; params: any; outcome: string }>;
}

// =============== CORE COMPONENTS (Stubs - User already has these) ===============

/**
 * Simula el sistema de prompts del usuario.
 */
class PromptSystem {
    constructor() {
        // Inicialización
    }

    getPrompt(promptName: string, params: Record<string, any>): { prompt: string; /* ...otras configs */ } {
        // Lógica para seleccionar y formatear el prompt
        console.log(`[PromptSystem] Getting prompt: ${promptName} with params:`, params);
        return { prompt: `Generated prompt for ${promptName}` };
    }
}

/**
 * Simula el ejecutor de herramientas del usuario.
 */
class ToolRunner {
    constructor() {
        // Inicialización
    }

    async run(toolName: string, params: Record<string, any>): Promise<any> {
        // Lógica para ejecutar una herramienta
        console.log(`[ToolRunner] Running tool: ${toolName} with params:`, params);
        if (toolName === 'VSCodeEditorTool.getFileContent') return "Contenido del archivo de ejemplo";
        if (toolName === 'VSCodeEditorTool.getSelectedText') return "Texto seleccionado de ejemplo";
        if (toolName === 'LinterTool.run') return { errors: [], warnings: [] };
        return { success: true, data: `Result of ${toolName}` };
    }
}

/**
 * Simula el analizador de input del usuario.
 */
class InputAnalysis {
    constructor(private promptSystem: PromptSystem, private llmService: LLMService) {
        // Inicialización
    }

    async analyze(userInput: string, context: HandlingContext): Promise<AnalysisResult> {
        // Lógica para analizar el input y determinar la intención y entidades
        // Esto implicaría usar promptSystem y llmService
        console.log(`[InputAnalysis] Analyzing input: "${userInput}"`);
        // Simulación basada en palabras clave
        if (userInput.toLowerCase().includes("explica")) {
            return {
                intent: 'explainCode',
                entities: { filePath: 'example.ts', detailLevel: 'medium' },
                cleanedInput: userInput,
                originalInput: userInput
            };
        }
        if (userInput.toLowerCase().includes("arregla") || userInput.toLowerCase().includes("corrige")) {
            return {
                intent: 'fixCode',
                entities: { filePath: 'buggy.js', issueDescription: 'Tiene un error de tipo' },
                cleanedInput: userInput,
                originalInput: userInput
            };
        }
        return {
            intent: 'conversation',
            entities: {},
            cleanedInput: userInput,
            originalInput: userInput
        };
    }
}

/**
 * Simula el servicio de interacción con el modelo de lenguaje.
 */
class LLMService {
    constructor() {
        // Inicialización
    }

    async generate(prompt: string, params?: Record<string, any>): Promise<{ text?: string; code?: string; structuredOutput?: any; }> {
        // Lógica para enviar el prompt al LLM y recibir la respuesta
        console.log(`[LLMService] Generating response for prompt starting with: "${prompt.substring(0, 100)}..."`, params || "");
        // Simulación
        if (prompt.includes("ExplainCodePrompt")) return { text: "Esta es una explicación del código." };
        if (prompt.includes("DiagnoseCodePrompt")) return { structuredOutput: { problem: "Error de tipo", suggestions: [{ id: 'sol1', description: "Cambiar tipo de variable" }] } };
        if (prompt.includes("ApplyFixPrompt")) return { code: "código corregido aquí;" };
        return { text: "Respuesta conversacional de ejemplo." };
    }
}


// =============== CONTEXT MANAGEMENT ===============

class OrchestrationContextManager {
    private context: OrchestrationContext;

    constructor(initialContext?: Partial<OrchestrationContext>) {
        this.context = {
            history: [],
            currentProject: {},
            activeEditor: {},
            userPreferences: {},
            ...initialContext,
        };
        console.log("[OrchestrationContextManager] Initialized.");
    }

    getContext(): OrchestrationContext {
        // Devuelve una copia para evitar mutaciones directas no controladas
        return JSON.parse(JSON.stringify(this.context));
    }

    updateHistory(entry: { role: 'user' | 'assistant' | 'system'; content: any; }): void {
        // Lógica para añadir una entrada al historial, posiblemente truncando si es muy largo
        this.context.history.push({ ...entry, timestamp: new Date() });
        console.log(`[OrchestrationContextManager] History updated with ${entry.role} entry.`);
    }

    updateActiveEditor(editorContext: OrchestrationContext['activeEditor']): void {
        this.context.activeEditor = { ...this.context.activeEditor, ...editorContext };
        console.log("[OrchestrationContextManager] Active editor context updated.");
    }

    updateProjectContext(projectContext: OrchestrationContext['currentProject']): void {
        this.context.currentProject = { ...this.context.currentProject, ...projectContext };
        console.log("[OrchestrationContextManager] Project context updated.");
    }

    // ... otros métodos para actualizar partes específicas del contexto
}


// =============== BASE AGENT & SPECIFIC AGENTS ===============

abstract class BaseAgent {
    protected promptSystem: PromptSystem;
    protected llmService: LLMService;
    protected toolRunner: ToolRunner;
    protected contextManager: OrchestrationContextManager; // Para acceder al contexto global si es necesario

    constructor(
        promptSystem: PromptSystem,
        llmService: LLMService,
        toolRunner: ToolRunner, // Puede ser opcional para agentes que no usan tools
        contextManager: OrchestrationContextManager
    ) {
        this.promptSystem = promptSystem;
        this.llmService = llmService;
        this.toolRunner = toolRunner;
        this.contextManager = contextManager;
    }

    abstract handle(entities: ExtractedEntities | string, context: HandlingContext): Promise<Output>;

    protected async validateOutput(output: Output, originalInput: any, context: HandlingContext): Promise<{ isValid: boolean; feedback?: string; refinedOutput?: Output }> {
        // Lógica de validación base o específica si se sobrescribe
        console.log(`[BaseAgent] Validating output type: ${output.type}`);
        return { isValid: true }; // Placeholder
    }

    protected async runWithRetry(
        action: () => Promise<Output>,
        validationFn: (output: Output) => Promise<{ isValid: boolean; feedback?: string }>,
        maxRetries: number = 2,
        context: HandlingContext
    ): Promise<Output> {
        let attempts = 0;
        let lastOutput: Output | null = null;

        if (!context.attemptHistory) {
            context.attemptHistory = [];
        }

        while (attempts < maxRetries) {
            attempts++;
            try {
                const output = await action();
                lastOutput = output;
                const validationResult = await validationFn(output);

                context.attemptHistory.push({
                    strategy: `attempt_${attempts}`,
                    params: { /* parámetros del intento */ },
                    outcome: validationResult.isValid ? 'success' : `validation_failed: ${validationResult.feedback}`
                });

                if (validationResult.isValid) {
                    return output;
                }
                if (attempts >= maxRetries) {
                    console.warn(`[BaseAgent] Max retries (${maxRetries}) reached. Validation failed: ${validationResult.feedback}`);
                    return { ...output, type: 'error', content: `Validation failed after ${attempts} attempts: ${validationResult.feedback || 'No specific feedback'}` };
                }
                // Aquí se podría modificar el 'context' o los parámetros para el siguiente intento basado en 'validationResult.feedback'
                console.log(`[BaseAgent] Attempt ${attempts} failed validation. Retrying...`);

            } catch (error: any) {
                console.error(`[BaseAgent] Attempt ${attempts} failed with error:`, error);
                context.attemptHistory.push({
                    strategy: `attempt_${attempts}`,
                    params: { /* parámetros del intento */ },
                    outcome: `execution_error: ${error.message}`
                });
                lastOutput = { type: 'error', content: error.message || 'Unknown execution error' };
                if (attempts >= maxRetries) {
                    throw error; // o devolver un Output de error
                }
            }
        }
        return lastOutput || { type: 'error', content: 'Max retries reached without successful execution or validation.' };
    }
}

class ConversationAgent extends BaseAgent {
    constructor(promptSystem: PromptSystem, llmService: LLMService, contextManager: OrchestrationContextManager) {
        // ToolRunner podría no ser estrictamente necesario para conversación pura
        super(promptSystem, llmService, new ToolRunner() /* o pasar null/undefined y manejarlo */, contextManager);
        console.log("[ConversationAgent] Initialized.");
    }

    async handle(userInputText: string, entities: ExtractedEntities, context: HandlingContext): Promise<Output> {
        console.log("[ConversationAgent] Handling conversation:", userInputText);
        // 1. Preparar prompt conversacional usando PromptSystem
        // 2. Enviar a LLMService
        // 3. Devolver respuesta
        // No suele requerir validación compleja más allá de la propia generación del LLM.
        const promptConfig = this.promptSystem.getPrompt('ConversationalPrompt', {
            userInput: userInputText,
            history: context.history,
            // ... otros parámetros contextuales
        });
        const llmResponse = await this.llmService.generate(promptConfig.prompt);
        return { type: 'text', content: llmResponse.text };
    }
}

class CodeExplainerAgent extends BaseAgent {
    constructor(promptSystem: PromptSystem, llmService: LLMService, toolRunner: ToolRunner, contextManager: OrchestrationContextManager) {
        super(promptSystem, llmService, toolRunner, contextManager);
        console.log("[CodeExplainerAgent] Initialized.");
    }

    async handle(entities: ExtractedEntities, context: HandlingContext): Promise<Output> {
        console.log("[CodeExplainerAgent] Handling code explanation for entities:", entities);

        const action = async (): Promise<Output> => {
            // 1. Obtener contenido del archivo/selección usando ToolRunner (VSCodeEditorTool)
            // 2. (Opcional) Analizar estructura/complejidad
            // 3. Preparar prompt ExplainCodePrompt usando PromptSystem
            // 4. Enviar a LLMService
            // 5. Devolver explicación
            let codeToExplain = "";
            if (entities.filePath) {
                codeToExplain = await this.toolRunner.run('VSCodeEditorTool.getFileContent', { path: entities.filePath });
            } else if (context.activeEditor?.selectedText) {
                codeToExplain = context.activeEditor.selectedText;
            } else {
                return { type: 'clarification_needed', content: 'No se especificó qué código explicar o no hay texto seleccionado.' };
            }

            const promptConfig = this.promptSystem.getPrompt('ExplainCodePrompt', {
                code: codeToExplain,
                detailLevel: entities.detailLevel || 'medium',
                question: (context.history.slice(-1)[0]?.content as AnalysisResult)?.originalInput, // Última pregunta del usuario
                // ... otros parámetros
            });
            const llmResponse = await this.llmService.generate(promptConfig.prompt);
            return { type: 'explanation', content: llmResponse.text, originalQuery: (context.history.slice(-1)[0]?.content as AnalysisResult)?.originalInput };
        };

        const validationFn = async (output: Output): Promise<{ isValid: boolean; feedback?: string }> => {
            if (output.type !== 'explanation' || !output.content) {
                return { isValid: false, feedback: "La explicación está vacía o no es del tipo esperado." };
            }
            // Validación más sofisticada:
            // - ¿Cubre los aspectos clave? (Podría requerir otra llamada al LLM)
            // - ¿Es coherente con el código?
            // Por ahora, una validación simple:
            return { isValid: (output.content as string).length > 10 };
        };

        return this.runWithRetry(action, validationFn, 2, context);
    }
}

class CodeDiagnosticAgent extends BaseAgent { // Podría no heredar de BaseAgent si solo es usado por CodeFixAgent
    constructor(promptSystem: PromptSystem, llmService: LLMService, toolRunner: ToolRunner, contextManager: OrchestrationContextManager) {
        super(promptSystem, llmService, toolRunner, contextManager); // O pasar null para contextManager si no lo usa directamente
        console.log("[CodeDiagnosticAgent] Initialized.");
    }

    async diagnose(code: string, problemDescription: string | undefined, context: HandlingContext): Promise<{ diagnosis: string; suggestions: Array<{ id: string; description: string; confidence?: number }> }> {
        console.log("[CodeDiagnosticAgent] Diagnosing code. Problem:", problemDescription || "No specific description");
        // 1. (Opcional) Ejecutar linters/analizadores estáticos usando ToolRunner
        // 2. Preparar DiagnoseCodePrompt
        // 3. Enviar a LLMService para obtener diagnóstico y sugerencias estructuradas
        const linterOutput = await this.toolRunner.run('LinterTool.run', { code: code, language: context.activeEditor?.languageId });

        const promptConfig = this.promptSystem.getPrompt('DiagnoseCodePrompt', {
            code: code,
            userProblemDescription: problemDescription,
            linterResults: linterOutput,
            // ...
        });
        const llmResponse = await this.llmService.generate(promptConfig.prompt);
        // Asumir que llmResponse.structuredOutput tiene el formato { problem: "...", suggestions: [...] }
        return llmResponse.structuredOutput || { diagnosis: "No se pudo diagnosticar.", suggestions: [] };
    }
}

class CodeEditingAgent extends BaseAgent { // Similar a CodeDiagnosticAgent
    constructor(promptSystem: PromptSystem, llmService: LLMService, toolRunner: ToolRunner, contextManager: OrchestrationContextManager) {
        super(promptSystem, llmService, toolRunner, contextManager);
        console.log("[CodeEditingAgent] Initialized.");
    }

    async implementSolution(
        originalCode: string,
        diagnosis: string,
        solutionToImplement: { id: string; description: string },
        context: HandlingContext
    ): Promise<{ modifiedCode?: string; diff?: string; error?: string }> {
        console.log("[CodeEditingAgent] Implementing solution:", solutionToImplement.description);
        // 1. Preparar ApplyFixPrompt
        // 2. Enviar a LLMService para obtener código modificado o diff
        const promptConfig = this.promptSystem.getPrompt('ApplyFixPrompt', {
            originalCode: originalCode,
            problemDiagnosis: diagnosis,
            suggestedFix: solutionToImplement.description,
            // ...
        });
        const llmResponse = await this.llmService.generate(promptConfig.prompt);
        if (llmResponse.code) {
            return { modifiedCode: llmResponse.code };
        } else {
            return { error: "El LLM no pudo generar el código modificado." };
        }
    }
}

class CodeFixAgent extends BaseAgent {
    private diagnosticAgent: CodeDiagnosticAgent;
    private editingAgent: CodeEditingAgent;

    constructor(promptSystem: PromptSystem, llmService: LLMService, toolRunner: ToolRunner, contextManager: OrchestrationContextManager) {
        super(promptSystem, llmService, toolRunner, contextManager);
        this.diagnosticAgent = new CodeDiagnosticAgent(promptSystem, llmService, toolRunner, contextManager);
        this.editingAgent = new CodeEditingAgent(promptSystem, llmService, toolRunner, contextManager);
        console.log("[CodeFixAgent] Initialized.");
    }

    async handle(entities: ExtractedEntities, context: HandlingContext): Promise<Output> {
        console.log("[CodeFixAgent] Handling code fix for entities:", entities);
        const originalQuery = (context.history.slice(-1)[0]?.content as AnalysisResult)?.originalInput;

        const action = async (): Promise<Output> => {
            let codeToFix = "";
            if (entities.filePath) {
                codeToFix = await this.toolRunner.run('VSCodeEditorTool.getFileContent', { path: entities.filePath });
            } else if (context.activeEditor?.selectedText) {
                codeToFix = context.activeEditor.selectedText; // Podría ser preferible el archivo completo
            } else {
                return { type: 'clarification_needed', content: 'No se especificó qué código arreglar o no hay texto seleccionado.', originalQuery };
            }

            // 1. Diagnóstico
            const diagnosticResult = await this.diagnosticAgent.diagnose(codeToFix, entities.issueDescription, context);
            if (!diagnosticResult.suggestions || diagnosticResult.suggestions.length === 0) {
                return { type: 'error', content: 'No se pudo encontrar una solución diagnóstica.', originalQuery };
            }
            const chosenSolution = diagnosticResult.suggestions[0]; // Simplificado: tomar la primera

            // 2. Edición/Implementación
            const editResult = await this.editingAgent.implementSolution(codeToFix, diagnosticResult.diagnosis, chosenSolution, context);
            if (editResult.error || !editResult.modifiedCode) {
                return { type: 'error', content: `Error al aplicar la solución: ${editResult.error || 'No se generó código.'}`, originalQuery };
            }

            // Aquí se podría aplicar el cambio al editor usando ToolRunner
            // await this.toolRunner.run('VSCodeEditorTool.applyChanges', { filePath: entities.filePath, newContent: editResult.modifiedCode });

            return { type: 'fix_applied', content: editResult.modifiedCode, explanation: chosenSolution.description, originalCode: codeToFix, originalQuery };
        };

        const validationFn = async (output: Output): Promise<{ isValid: boolean; feedback?: string }> => {
            if (output.type !== 'fix_applied' || !output.content) {
                return { isValid: false, feedback: "El arreglo no generó código o no es del tipo esperado." };
            }
            const modifiedCode = output.content as string;
            // Validación:
            // - Ejecutar linters en el código modificado
            // - (Avanzado) El LLM podría revisar si el fix aborda el diagnóstico original.
            const linterResult = await this.toolRunner.run('LinterTool.run', { code: modifiedCode, language: context.activeEditor?.languageId });
            if (linterResult.errors && linterResult.errors.length > 0) {
                return { isValid: false, feedback: `El código corregido tiene errores de linter: ${linterResult.errors.join(', ')}` };
            }
            return { isValid: true };
        };

        return this.runWithRetry(action, validationFn, 2, context);
    }
}

class GeneralPurposeAgent extends BaseAgent {
    constructor(promptSystem: PromptSystem, llmService: LLMService, toolRunner: ToolRunner, contextManager: OrchestrationContextManager) {
        super(promptSystem, llmService, toolRunner, contextManager);
        console.log("[GeneralPurposeAgent] Initialized.");
    }

    async handle(userInputText: string, entities: ExtractedEntities, context: HandlingContext): Promise<Output> {
        console.log("[GeneralPurposeAgent] Handling general purpose request:", userInputText);
        // Lógica para intenciones no cubiertas específicamente o como fallback.
        // Podría intentar usar herramientas genéricas o un prompt más general.
        const promptConfig = this.promptSystem.getPrompt('GeneralPurposePrompt', {
            userInput: userInputText,
            entities: entities,
            history: context.history,
            availableTools: ['WebSearchTool.search', /* ... otras tools genéricas */]
        });
        const llmResponse = await this.llmService.generate(promptConfig.prompt);

        // Aquí podría haber lógica para interpretar si el LLM quiere usar una herramienta
        // y luego usar ToolRunner. Por simplicidad, solo devolvemos texto.

        return { type: 'text', content: llmResponse.text || "No pude procesar tu solicitud general." };
    }
}


// =============== ORCHESTRATOR ===============

class Orchestrator {
    private inputAnalyzer: InputAnalysis;
    private conversationAgent: ConversationAgent;
    private codeExplainerAgent: CodeExplainerAgent;
    private codeFixAgent: CodeFixAgent;
    private generalPurposeAgent: GeneralPurposeAgent;
    private contextManager: OrchestrationContextManager;
    private promptSystem: PromptSystem; // Para pasarlo a los agentes
    private llmService: LLMService;   // Para pasarlo a los agentes
    private toolRunner: ToolRunner;   // Para pasarlo a los agentes

    constructor() {
        // Inicializar los componentes principales (stubs por ahora)
        this.promptSystem = new PromptSystem();
        this.llmService = new LLMService();
        this.toolRunner = new ToolRunner();
        this.inputAnalyzer = new InputAnalysis(this.promptSystem, this.llmService); // InputAnalysis podría necesitar LLM y Prompts

        this.contextManager = new OrchestrationContextManager();

        this.conversationAgent = new ConversationAgent(this.promptSystem, this.llmService, this.contextManager);
        this.codeExplainerAgent = new CodeExplainerAgent(this.promptSystem, this.llmService, this.toolRunner, this.contextManager);
        this.codeFixAgent = new CodeFixAgent(this.promptSystem, this.llmService, this.toolRunner, this.contextManager);
        this.generalPurposeAgent = new GeneralPurposeAgent(this.promptSystem, this.llmService, this.toolRunner, this.contextManager);
        console.log("[Orchestrator] Initialized.");
    }

    public async handleUserInput(userInput: string, activeEditorContext?: OrchestrationContext['activeEditor']): Promise<Output> {
        console.log(`\n[Orchestrator] === New User Input: "${userInput}" ===`);
        if (activeEditorContext) {
            this.contextManager.updateActiveEditor(activeEditorContext);
        }

        const globalContext = this.contextManager.getContext();
        const handlingContext: HandlingContext = { ...globalContext, attemptHistory: [] }; // Inicia historial de intentos para esta solicitud

        const analysisResult = await this.inputAnalyzer.analyze(userInput, handlingContext);
        this.contextManager.updateHistory({ role: 'user', content: { originalInput: userInput, analysis: analysisResult } });

        let agentResponse: Output;
        try {
            switch (analysisResult.intent) {
                case 'conversation':
                    agentResponse = await this.conversationAgent.handle(analysisResult.cleanedInput, analysisResult.entities, handlingContext);
                    break;
                case 'explainCode':
                    agentResponse = await this.codeExplainerAgent.handle(analysisResult.entities, handlingContext);
                    break;
                case 'fixCode':
                    agentResponse = await this.codeFixAgent.handle(analysisResult.entities, handlingContext);
                    break;
                // ... otros casos para diferentes intenciones
                default:
                    console.warn(`[Orchestrator] Unhandled intent: ${analysisResult.intent}. Using GeneralPurposeAgent.`);
                    agentResponse = await this.generalPurposeAgent.handle(analysisResult.cleanedInput, analysisResult.entities, handlingContext);
            }
        } catch (error: any) {
            console.error("[Orchestrator] Error during agent handling:", error);
            agentResponse = { type: 'error', content: `Error al procesar la solicitud: ${error.message}` };
        }

        this.contextManager.updateHistory({ role: 'assistant', content: agentResponse });
        console.log("[Orchestrator] === Request Handling Finished ===");
        return agentResponse;
    }

    // Método para actualizar el contexto del proyecto si cambia (ej: abrir nuevo workspace)
    public updateProjectContext(projectContext: OrchestrationContext['currentProject']) {
        this.contextManager.updateProjectContext(projectContext);
    }
}

// =============== EXAMPLE USAGE (Simulación) ===============
async function main() {
    const orchestrator = new Orchestrator();

    // Simular contexto del editor activo
    const editorContext = {
        filePath: "test.ts",
        selectedText: "function hello() { console.log('world'); }",
        languageId: "typescript"
    };

    let response: Output;

    response = await orchestrator.handleUserInput("Hola, ¿cómo estás?", editorContext);
    console.log("Response 1:", response);

    response = await orchestrator.handleUserInput("Explícame el código seleccionado", editorContext);
    console.log("Response 2:", response);

    const buggyEditorContext = {
        filePath: "buggy.js",
        selectedText: "const x = 10; x = 20; // Error en const", // Simular que el LLM o linter detectaría esto
        languageId: "javascript"
    };
    response = await orchestrator.handleUserInput("Arregla este código, tiene un error de asignación", buggyEditorContext);
    console.log("Response 3:", response);

    response = await orchestrator.handleUserInput("¿Qué tiempo hace hoy?", editorContext);
    console.log("Response 4:", response);
}

// main(); // Descomentar para probar la simulación en un entorno Node.js
