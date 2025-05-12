// =============== TYPES & INTERFACES ===============

/**
 * Representa la salida de un agente o del orquestador.
 * Puede ser texto, código, un error, etc.
 */
interface Output {
    type: 'text' | 'code' | 'explanation' | 'fix_applied' | 'fix_failed_validation' | 'error' | 'clarification_needed' | 'tool_output';
    content?: any; // Contenido principal (texto, código, objeto de error, resultado de tool)
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
    toolName?: string; // Para intenciones que invocan tools directamente
    toolParams?: Record<string, any>; // Parámetros para la tool
    // ... otras entidades relevantes
}

/**
 * Resultado del análisis de InputAnalysis.
 */
interface AnalysisResult {
    intent: string; // Ej: 'conversation', 'explainCode', 'fixCode', 'generateCode', 'runTool'
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

// =============== CORE COMPONENTS (User's implementations) ===============

// Assuming the user's PromptSystem and ToolRunner are available and imported
// import { initializePromptSystem, executeModelInteraction, PromptType, PromptVariables } from './promptSystem';
// import { ToolRunner } from './toolRunner';

// Stub implementations for demonstration purposes if imports are not available
class ModelManager {
    async sendPrompt(prompt: string): Promise<string> {
        console.log(`[ModelManager] Sending prompt: "${prompt.substring(0, 100)}..."`);
        // Simulate LLM response based on prompt content
        if (prompt.includes("inputAnalyzerPrompt")) return JSON.stringify({ intent: 'conversation', entities: {} });
        if (prompt.includes("planningEnginePrompt")) return JSON.stringify({ plan: [] }); // Simplified
        if (prompt.includes("editingPrompt")) return "modified code here";
        if (prompt.includes("examinationPrompt")) return JSON.stringify({ diagnosis: "No issues found", suggestions: [] });
        if (prompt.includes("projectManagementPrompt")) return "Project analysis result";
        if (prompt.includes("projectSearchPrompt")) return JSON.stringify([]); // Simplified
        if (prompt.includes("resultEvaluatorPrompt")) return JSON.stringify({ isValid: true });
        return "Default LLM response.";
    }
    async setModel(modelType: string): Promise<void> { console.log(`[ModelManager] Setting model to ${modelType}`); }
    getCurrentModel(): string { return 'gemini-pro'; }
    abortRequest(): void { console.log('[ModelManager] Aborting request.'); }
}

// User's PromptSystem adapted to use the provided ModelManager and structure
class PromptSystem {
    private modelManager: ModelManager;

    constructor(modelManager: ModelManager) {
        this.modelManager = modelManager;
        console.log('[PromptSystem] Initialized successfully');
    }

    private PROMPT_MAP: Record<PromptType, string> = {
        inputAnalyzer: "Analyze the user input: {{userInput}}. History: {{history}}. Active Editor: {{activeEditor}}. Project Context: {{projectContext}}.",
        planningEngine: "Create a plan for intent: {{intent}}. Entities: {{entities}}. Context: {{context}}.",
        editing: "Edit the code: {{code}}. Based on diagnosis: {{diagnosis}}. Suggested fix: {{suggestedFix}}.",
        examination: "Examine the code: {{code}}. Problem description: {{problemDescription}}. Linter results: {{linterResults}}.",
        projectManagement: "Manage project with info: {{projectInfo}}. Action: {{action}}.",
        projectSearch: "Search project for: {{query}}. Context: {{context}}.",
        resultEvaluator: "Evaluate result: {{result}}. Original query: {{originalQuery}}. Context: {{context}}.",
    };

    private buildPromptVariables(type: PromptType, context: Record<string, any>): PromptVariables {
        // Processing específico para cada tipo de prompt
        switch (type) {
            case 'inputAnalyzer':
                return {
                    userInput: context.userInput,
                    history: JSON.stringify(context.history),
                    activeEditor: JSON.stringify(context.activeEditor),
                    projectContext: JSON.stringify(context.currentProject),
                };
            case 'planningEngine':
                return {
                    intent: context.intent,
                    entities: JSON.stringify(context.entities),
                    context: JSON.stringify(context), // Pass full context if needed by the prompt
                };
            case 'editing':
                return {
                    code: context.code,
                    diagnosis: context.diagnosis,
                    suggestedFix: context.suggestedFix,
                };
            case 'examination':
                return {
                    code: context.code,
                    problemDescription: context.problemDescription,
                    linterResults: JSON.stringify(context.linterResults),
                };
            case 'projectManagement':
                return {
                    projectInfo: JSON.stringify(context.projectInfo || {}),
                    action: context.action || "analyze",
                };
            case 'projectSearch':
                return {
                    query: context.query,
                    context: JSON.stringify(context),
                };
            case 'resultEvaluator':
                return {
                    result: JSON.stringify(context.result),
                    originalQuery: context.originalQuery,
                    context: JSON.stringify(context),
                };
            default:
                return context;
        }
    }

    private fillPromptTemplate(template: string, variables: PromptVariables): string {
        let filledTemplate = template;
        for (const [key, value] of Object.entries(variables)) {
            const placeholder = `{{${key}}}`;
            filledTemplate = filledTemplate.replace(
                new RegExp(placeholder, 'g'),
                typeof value === 'string' ? value : JSON.stringify(value)
            );
        }
        return filledTemplate;
    }

    async executeModelInteraction<T = any>(
        type: PromptType,
        context: Record<string, any>
    ): Promise<T> {
        const template = this.PROMPT_MAP[type];
        if (!template) {
            throw new Error(`Unknown prompt type: ${type}`);
        }

        const variables = this.buildPromptVariables(type, context);
        const filledPrompt = this.fillPromptTemplate(template, variables);

        const rawResponse = await this.modelManager.sendPrompt(filledPrompt);

        // Assuming parseModelResponse exists and is imported/available
        // For this example, we'll simulate parsing
        try {
            return JSON.parse(rawResponse) as T;
        } catch (e) {
            console.warn(`[PromptSystem] Could not parse JSON response for type ${type}. Returning raw string.`);
            return rawResponse as T;
        }
    }

    async changeModel(modelType: string): Promise<void> {
        await this.modelManager.setModel(modelType);
    }

    getCurrentModel(): string {
        return this.modelManager.getCurrentModel();
    }

    abortModelRequest(): void {
        this.modelManager.abortRequest();
    }
}

// User's ToolRunner class
class ToolRunner {
    private static readonly TOOLS: Record<string, any> = { // Use 'any' for simplicity in this example
        'filesystem.getWorkspaceFiles': { execute: async () => ["file1.ts", "file2.js"] },
        'filesystem.getFileContents': { execute: async (params: { filePath: string }) => `Content of ${params.filePath}` },
        'VSCodeEditorTool.getFileContent': { execute: async (params: { path: string }) => `Content of ${params.path}` },
        'VSCodeEditorTool.getSelectedText': { execute: async () => "Selected text example" },
        'VSCodeEditorTool.applyChanges': { execute: async (params: { filePath: string, newContent: string }) => { console.log(`Applying changes to ${params.filePath}`); return { success: true }; } },
        'LinterTool.run': { execute: async (params: { code: string, language: string }) => { console.log(`Running linter on ${params.language} code.`); return { errors: [], warnings: [] }; } },
        'WebSearchTool.search': { execute: async (params: { query: string }) => { console.log(`Searching web for: ${params.query}`); return { results: [] }; } },
        // Add other tools here
    };

    public static async runTool(
        toolName: string,
        params: Record<string, any> = {}
    ): Promise<any> {
        const tool = this.TOOLS[toolName];
        if (!tool) {
            throw new Error(`Tool no registrada: ${toolName}`);
        }
        console.log(`[ToolRunner] Running tool: ${toolName} with params:`, params);
        try {
            return await tool.execute(params);
        } catch (error) {
            console.error(`[ToolRunner] Error executing tool ${toolName}:`, error);
            throw error;
        }
    }

    public static async runParallel(
        tools: Array<{ name: string; params?: Record<string, any> }>,
        concurrencyLimit: number = 0
    ): Promise<Record<string, any>> {
        console.log(`[ToolRunner] Running tools in parallel with limit ${concurrencyLimit}:`, tools.map(t => t.name));
        const results: Record<string, any> = {};
        const promises = tools.map(async ({ name, params }) => {
            try {
                results[name] = await this.runTool(name, params);
            } catch (error) {
                results[name] = { error: error.message }; // Store error result
            }
        });
        await Promise.all(promises); // Simplified parallel execution
        return results;
    }

    public static async executePlan(
        plan: Array<{
            tool: string;
            params?: Record<string, any>;
            storeAs?: string;
            useContext?: boolean;
            contextMap?: Record<string, string>;
        }>
    ): Promise<Record<string, any>> {
        console.log("[ToolRunner] Executing plan:", plan.map(step => step.tool));
        const context: Record<string, any> = {};

        for (const step of plan) {
            let stepParams = { ...step.params || {} };

            if (step.useContext) {
                stepParams = { ...stepParams, context };
            }

            if (step.contextMap) {
                for (const [contextKey, paramName] of Object.entries(step.contextMap)) {
                    if (context[contextKey] !== undefined) {
                        stepParams[paramName] = context[contextKey];
                    }
                }
            }

            try {
                const result = await this.runTool(step.tool, stepParams);
                if (step.storeAs) {
                    context[step.storeAs] = result;
                }
            } catch (error) {
                console.error(`[ToolRunner] Error in plan step ${step.tool}:`, error);
                // Decide how to handle errors in a plan (stop, skip, etc.)
                // For now, we'll just log and continue, but the result won't be stored.
                if (step.storeAs) {
                     context[step.storeAs] = { error: error.message };
                }
            }
        }
        return context;
    }

    public static listTools(): string[] {
        return Object.keys(this.TOOLS);
    }
}


// Adapt InputAnalysis to use the new PromptSystem structure
class InputAnalysis {
    private promptSystem: PromptSystem;

    constructor(promptSystem: PromptSystem) {
        this.promptSystem = promptSystem;
        console.log("[InputAnalysis] Initialized.");
    }

    async analyze(userInput: string, context: HandlingContext): Promise<AnalysisResult> {
        console.log(`[InputAnalysis] Analyzing input: "${userInput}"`);
        // Use the new executeModelInteraction method
        const analysisResult = await this.promptSystem.executeModelInteraction<AnalysisResult>(
            'inputAnalyzer',
            {
                userInput: userInput,
                history: context.history,
                activeEditor: context.activeEditor,
                currentProject: context.currentProject,
            }
        );

        // Simulate parsing the LLM response into AnalysisResult structure
        // In a real scenario, parseModelResponse would handle this
        if (typeof analysisResult === 'string') {
             // Fallback parsing if LLM didn't return JSON
             if (userInput.toLowerCase().includes("explica")) {
                return {
                    intent: 'explainCode',
                    entities: { filePath: context.activeEditor?.filePath, detailLevel: 'medium' },
                    cleanedInput: userInput,
                    originalInput: userInput
                };
            }
            if (userInput.toLowerCase().includes("arregla") || userInput.toLowerCase().includes("corrige")) {
                return {
                    intent: 'fixCode',
                    entities: { filePath: context.activeEditor?.filePath, issueDescription: userInput },
                    cleanedInput: userInput,
                    originalInput: userInput
                };
            }
             if (userInput.toLowerCase().includes("ejecuta tool")) {
                 const toolMatch = userInput.match(/ejecuta tool (\S+)/i);
                 if (toolMatch && toolMatch[1]) {
                     return {
                         intent: 'runTool',
                         entities: { toolName: toolMatch[1], toolParams: {} }, // Simplified params
                         cleanedInput: userInput,
                         originalInput: userInput
                     };
                 }
             }
            return {
                intent: 'conversation',
                entities: {},
                cleanedInput: userInput,
                originalInput: userInput
            };
        }

        // Assuming the LLM returned a structured AnalysisResult
        return analysisResult;
    }
}

// LLMService is replaced by PromptSystem's executeModelInteraction
// The Orchestrator and Agents will now use PromptSystem directly.


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
    protected toolRunner: typeof ToolRunner; // Use the static class directly
    protected contextManager: OrchestrationContextManager;

    constructor(
        promptSystem: PromptSystem,
        toolRunner: typeof ToolRunner,
        contextManager: OrchestrationContextManager
    ) {
        this.promptSystem = promptSystem;
        this.toolRunner = toolRunner;
        this.contextManager = contextManager;
    }

    abstract handle(entities: ExtractedEntities | string, context: HandlingContext): Promise<Output>;

    protected async validateOutput(output: Output, originalInput: any, context: HandlingContext): Promise<{ isValid: boolean; feedback?: string; refinedOutput?: Output }> {
        // Use PromptSystem for validation if needed
        console.log(`[BaseAgent] Validating output type: ${output.type}`);
        try {
            const validationResult = await this.promptSystem.executeModelInteraction<{ isValid: boolean; feedback?: string }>(
                'resultEvaluator',
                {
                    result: output,
                    originalQuery: originalInput, // Pass original user query or analysis result
                    context: context,
                }
            );
            return { isValid: validationResult.isValid, feedback: validationResult.feedback };
        } catch (error: any) {
            console.error("[BaseAgent] Error during LLM validation:", error);
            // Fallback to basic validation if LLM validation fails
            return { isValid: output.type !== 'error' && output.content != null && (typeof output.content !== 'string' || output.content.length > 0) };
        }
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
                // Here, you could potentially modify the 'context' or parameters for the next attempt based on 'validationResult.feedback'
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
                    throw error; // or return an error Output
                }
            }
        }
        return lastOutput || { type: 'error', content: 'Max retries reached without successful execution or validation.' };
    }
}

class ConversationAgent extends BaseAgent {
    constructor(promptSystem: PromptSystem, contextManager: OrchestrationContextManager) {
        // Conversation agent might not need ToolRunner directly, but we pass it for consistency
        super(promptSystem, ToolRunner, contextManager);
        console.log("[ConversationAgent] Initialized.");
    }

    async handle(userInputText: string, entities: ExtractedEntities, context: HandlingContext): Promise<Output> {
        console.log("[ConversationAgent] Handling conversation:", userInputText);
        // Use PromptSystem for conversational response
        const llmResponse = await this.promptSystem.executeModelInteraction<{ text?: string }>(
            'inputAnalyzer', // Reusing inputAnalyzer prompt for simple conversation
            {
                userInput: userInputText,
                history: context.history,
                activeEditor: context.activeEditor,
                currentProject: context.currentProject,
            }
        );
        return { type: 'text', content: llmResponse.text || llmResponse }; // Handle both structured and raw string responses
    }
}

class CodeExplainerAgent extends BaseAgent {
    constructor(promptSystem: PromptSystem, toolRunner: typeof ToolRunner, contextManager: OrchestrationContextManager) {
        super(promptSystem, toolRunner, contextManager);
        console.log("[CodeExplainerAgent] Initialized.");
    }

    async handle(entities: ExtractedEntities, context: HandlingContext): Promise<Output> {
        console.log("[CodeExplainerAgent] Handling code explanation for entities:", entities);
        const originalQuery = (context.history.slice(-1)[0]?.content as AnalysisResult)?.originalInput;

        const action = async (): Promise<Output> => {
            let codeToExplain = "";
            if (entities.filePath) {
                codeToExplain = await this.toolRunner.runTool('VSCodeEditorTool.getFileContent', { path: entities.filePath });
            } else if (context.activeEditor?.selectedText) {
                codeToExplain = context.activeEditor.selectedText;
            } else {
                return { type: 'clarification_needed', content: 'No se especificó qué código explicar o no hay texto seleccionado.', originalQuery };
            }

            // Use PromptSystem for explanation
            const llmResponse = await this.promptSystem.executeModelInteraction<{ text?: string }>(
                'examination', // Reusing examination prompt for explanation
                {
                    code: codeToExplain,
                    problemDescription: originalQuery, // Use the original query as context for explanation
                    linterResults: null, // Explanation doesn't need linter results usually
                }
            );
            return { type: 'explanation', content: llmResponse.text || llmResponse, originalQuery };
        };

        // Use the base validation logic which can use the PromptSystem's resultEvaluator
        return this.runWithRetry(action, (output) => this.validateOutput(output, originalQuery, context), 2, context);
    }
}

// CodeDiagnosticAgent and CodeEditingAgent can be internal helpers or separate agents
// Adapting them to use PromptSystem and ToolRunner

class CodeDiagnosticAgent { // Not inheriting from BaseAgent as it's used internally by CodeFixAgent
    private promptSystem: PromptSystem;
    private toolRunner: typeof ToolRunner;

    constructor(promptSystem: PromptSystem, toolRunner: typeof ToolRunner) {
        this.promptSystem = promptSystem;
        this.toolRunner = toolRunner;
        console.log("[CodeDiagnosticAgent] Initialized.");
    }

    async diagnose(code: string, problemDescription: string | undefined, context: HandlingContext): Promise<{ diagnosis: string; suggestions: Array<{ id: string; description: string; confidence?: number }> }> {
        console.log("[CodeDiagnosticAgent] Diagnosing code. Problem:", problemDescription || "No specific description");
        // Use ToolRunner for linting
        const linterOutput = await this.toolRunner.runTool('LinterTool.run', { code: code, language: context.activeEditor?.languageId });

        // Use PromptSystem for diagnosis
        const llmResponse = await this.promptSystem.executeModelInteraction<{ diagnosis: string; suggestions: Array<{ id: string; description: string; confidence?: number }> }>(
            'examination',
            {
                code: code,
                userProblemDescription: problemDescription,
                linterResults: linterOutput,
            }
        );
        return llmResponse; // Assuming the LLM returns the structured format
    }
}

class CodeEditingAgent { // Not inheriting from BaseAgent
    private promptSystem: PromptSystem;
    private toolRunner: typeof ToolRunner;

    constructor(promptSystem: PromptSystem, toolRunner: typeof ToolRunner) {
        this.promptSystem = promptSystem;
        this.toolRunner = toolRunner;
        console.log("[CodeEditingAgent] Initialized.");
    }

    async implementSolution(
        originalCode: string,
        diagnosis: string,
        solutionToImplement: { id: string; description: string },
        context: HandlingContext
    ): Promise<{ modifiedCode?: string; diff?: string; error?: string }> {
        console.log("[CodeEditingAgent] Implementing solution:", solutionToImplement.description);
        // Use PromptSystem for code editing
        const llmResponse = await this.promptSystem.executeModelInteraction<{ code?: string; diff?: string }>(
            'editing',
            {
                originalCode: originalCode,
                problemDiagnosis: diagnosis,
                suggestedFix: solutionToImplement.description,
            }
        );
        if (llmResponse.code) {
            return { modifiedCode: llmResponse.code };
        } else if (llmResponse.diff) {
             return { diff: llmResponse.diff };
        } else {
            return { error: "El LLM no pudo generar el código modificado o el diff." };
        }
    }
}


class CodeFixAgent extends BaseAgent {
    private diagnosticAgent: CodeDiagnosticAgent;
    private editingAgent: CodeEditingAgent;

    constructor(promptSystem: PromptSystem, toolRunner: typeof ToolRunner, contextManager: OrchestrationContextManager) {
        super(promptSystem, toolRunner, contextManager);
        this.diagnosticAgent = new CodeDiagnosticAgent(promptSystem, toolRunner);
        this.editingAgent = new CodeEditingAgent(promptSystem, toolRunner);
        console.log("[CodeFixAgent] Initialized.");
    }

    async handle(entities: ExtractedEntities, context: HandlingContext): Promise<Output> {
        console.log("[CodeFixAgent] Handling code fix for entities:", entities);
        const originalQuery = (context.history.slice(-1)[0]?.content as AnalysisResult)?.originalInput;

        const action = async (): Promise<Output> => {
            let codeToFix = "";
            const filePath = entities.filePath || context.activeEditor?.filePath;

            if (filePath) {
                codeToFix = await this.toolRunner.runTool('VSCodeEditorTool.getFileContent', { path: filePath });
            } else if (context.activeEditor?.selectedText) {
                codeToFix = context.activeEditor.selectedText; // Could still prefer the full file
            } else {
                return { type: 'clarification_needed', content: 'No se especificó qué código arreglar o no hay texto seleccionado.', originalQuery };
            }

            // 1. Diagnóstico
            const diagnosticResult = await this.diagnosticAgent.diagnose(codeToFix, entities.issueDescription, context);
            if (!diagnosticResult.suggestions || diagnosticResult.suggestions.length === 0) {
                return { type: 'error', content: 'No se pudo encontrar una solución diagnóstica.', originalQuery };
            }
            const chosenSolution = diagnosticResult.suggestions[0]; // Simplified: take the first

            // 2. Edición/Implementación
            const editResult = await this.editingAgent.implementSolution(codeToFix, diagnosticResult.diagnosis, chosenSolution, context);
            if (editResult.error || (!editResult.modifiedCode && !editResult.diff)) {
                return { type: 'error', content: `Error al aplicar la solución: ${editResult.error || 'No se generó código o diff.'}`, originalQuery };
            }

            // Apply the change using ToolRunner if a file path is available
            if (filePath && editResult.modifiedCode) {
                 await this.toolRunner.runTool('VSCodeEditorTool.applyChanges', { filePath: filePath, newContent: editResult.modifiedCode });
                 return { type: 'fix_applied', content: editResult.modifiedCode, explanation: chosenSolution.description, originalCode: codeToFix, originalQuery };
            } else if (editResult.diff) {
                 // If only a diff is returned, present it to the user
                 return { type: 'code', content: editResult.diff, explanation: `Proposed fix (diff): ${chosenSolution.description}`, originalCode: codeToFix, originalQuery };
            } else {
                 // If no file path and no diff, return the modified code as text
                 return { type: 'code', content: editResult.modifiedCode, explanation: `Proposed fix: ${chosenSolution.description}`, originalCode: codeToFix, originalQuery };
            }
        };

        // Use the base validation logic which can use the PromptSystem's resultEvaluator
        return this.runWithRetry(action, (output) => this.validateOutput(output, originalQuery, context), 2, context);
    }
}

class ToolExecutionAgent extends BaseAgent {
     constructor(promptSystem: PromptSystem, toolRunner: typeof ToolRunner, contextManager: OrchestrationContextManager) {
         super(promptSystem, toolRunner, contextManager);
         console.log("[ToolExecutionAgent] Initialized.");
     }

     async handle(entities: ExtractedEntities, context: HandlingContext): Promise<Output> {
         console.log("[ToolExecutionAgent] Handling tool execution for entities:", entities);
         const originalQuery = (context.history.slice(-1)[0]?.content as AnalysisResult)?.originalInput;

         const toolName = entities.toolName;
         const toolParams = entities.toolParams || {};

         if (!toolName) {
             return { type: 'error', content: 'No se especificó el nombre de la herramienta a ejecutar.', originalQuery };
         }

         try {
             const toolResult = await this.toolRunner.runTool(toolName, toolParams);
             return { type: 'tool_output', content: toolResult, toolName, originalQuery };
         } catch (error: any) {
             return { type: 'error', content: `Error al ejecutar la herramienta ${toolName}: ${error.message}`, toolName, originalQuery };
         }
     }
}


class GeneralPurposeAgent extends BaseAgent {
    constructor(promptSystem: PromptSystem, toolRunner: typeof ToolRunner, contextManager: OrchestrationContextManager) {
        super(promptSystem, toolRunner, contextManager);
        console.log("[GeneralPurposeAgent] Initialized.");
    }

    async handle(userInputText: string, entities: ExtractedEntities, context: HandlingContext): Promise<Output> {
        console.log("[GeneralPurposeAgent] Handling general purpose request:", userInputText);
        // Use PromptSystem for a general response, potentially suggesting tools
        const llmResponse = await this.promptSystem.executeModelInteraction<{ text?: string, suggestedTools?: Array<{ name: string; params: Record<string, any> }> }>(
            'inputAnalyzer', // Reusing inputAnalyzer prompt for general queries
            {
                userInput: userInputText,
                entities: entities,
                history: context.history,
                availableTools: this.toolRunner.listTools(), // Provide available tools
            }
        );

        if (llmResponse.suggestedTools && llmResponse.suggestedTools.length > 0) {
            // Orchestrator might decide to run suggested tools, or the agent could
            // For simplicity here, we'll just return the text and mention tools.
             return {
                 type: 'text',
                 content: llmResponse.text || "No pude procesar tu solicitud general.",
                 suggestedTools: llmResponse.suggestedTools
             };
        }

        return { type: 'text', content: llmResponse.text || "No pude procesar tu solicitud general." };
    }
}


// =============== ORCHESTRATOR ===============

class Orchestrator {
    private inputAnalyzer: InputAnalysis;
    private conversationAgent: ConversationAgent;
    private codeExplainerAgent: CodeExplainerAgent;
    private codeFixAgent: CodeFixAgent;
    private toolExecutionAgent: ToolExecutionAgent; // New agent for direct tool execution
    private generalPurposeAgent: GeneralPurposeAgent;
    private contextManager: OrchestrationContextManager;
    private promptSystem: PromptSystem;
    private toolRunner: typeof ToolRunner; // Use the static class directly

    constructor() {
        // Initialize core components
        const modelManager = new ModelManager(); // Instantiate ModelManager
        this.promptSystem = new PromptSystem(modelManager); // Pass ModelManager to PromptSystem
        this.toolRunner = ToolRunner; // Use the static class

        this.inputAnalyzer = new InputAnalysis(this.promptSystem);
        this.contextManager = new OrchestrationContextManager();

        // Initialize agents, passing PromptSystem and ToolRunner
        this.conversationAgent = new ConversationAgent(this.promptSystem, this.contextManager);
        this.codeExplainerAgent = new CodeExplainerAgent(this.promptSystem, this.toolRunner, this.contextManager);
        this.codeFixAgent = new CodeFixAgent(this.promptSystem, this.toolRunner, this.contextManager);
        this.toolExecutionAgent = new ToolExecutionAgent(this.promptSystem, this.toolRunner, this.contextManager);
        this.generalPurposeAgent = new GeneralPurposeAgent(this.promptSystem, this.toolRunner, this.contextManager);

        console.log("[Orchestrator] Initialized.");
    }

    public async handleUserInput(userInput: string, activeEditorContext?: OrchestrationContext['activeEditor']): Promise<Output> {
        console.log(`\n[Orchestrator] === New User Input: "${userInput}" ===`);
        if (activeEditorContext) {
            this.contextManager.updateActiveEditor(activeEditorContext);
        }

        const globalContext = this.contextManager.getContext();
        const handlingContext: HandlingContext = { ...globalContext, attemptHistory: [] }; // Start attempt history for this request

        let analysisResult: AnalysisResult;
        try {
             analysisResult = await this.inputAnalyzer.analyze(userInput, handlingContext);
        } catch (error: any) {
             console.error("[Orchestrator] Error during input analysis:", error);
             const errorOutput: Output = { type: 'error', content: `Error al analizar la entrada: ${error.message}`, originalQuery: userInput };
             this.contextManager.updateHistory({ role: 'assistant', content: errorOutput });
             return errorOutput;
        }


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
                case 'runTool':
                     agentResponse = await this.toolExecutionAgent.handle(analysisResult.entities, handlingContext);
                     break;
                // ... other cases for different intents
                default:
                    console.warn(`[Orchestrator] Unhandled intent: ${analysisResult.intent}. Using GeneralPurposeAgent.`);
                    agentResponse = await this.generalPurposeAgent.handle(analysisResult.cleanedInput, analysisResult.entities, handlingContext);
            }
        } catch (error: any) {
            console.error("[Orchestrator] Error during agent handling:", error);
            agentResponse = { type: 'error', content: `Error al procesar la solicitud: ${error.message}`, originalQuery: userInput };
        }

        this.contextManager.updateHistory({ role: 'assistant', content: agentResponse });
        console.log("[Orchestrator] === Request Handling Finished ===");
        return agentResponse;
    }

    // Method to update project context if it changes (e.g., opening a new workspace)
    public updateProjectContext(projectContext: OrchestrationContext['currentProject']) {
        this.contextManager.updateProjectContext(projectContext);
    }
}

// =============== EXAMPLE USAGE (Simulation) ===============
async function main() {
    const orchestrator = new Orchestrator();

    // Simulate active editor context
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
        selectedText: "const x = 10; x = 20; // Error en const", // Simulate what the LLM or linter might detect
        languageId: "javascript"
    };
    response = await orchestrator.handleUserInput("Arregla este código, tiene un error de asignación", buggyEditorContext);
    console.log("Response 3:", response);

    response = await orchestrator.handleUserInput("ejecuta tool filesystem.getWorkspaceFiles", editorContext);
    console.log("Response 4:", response);

    response = await orchestrator.handleUserInput("¿Qué tiempo hace hoy?", editorContext);
    console.log("Response 5:", response);
}

// main(); // Uncomment to test the simulation in a Node.js environment
Use code with caution.
TypeScript
