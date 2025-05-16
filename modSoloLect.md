¡Excelente idea! Implementar un modo "solo lectura" o "chat" vs. un modo "escritura" o "edición" es crucial para dar control al usuario y gestionar las expectativas sobre las capacidades del asistente en un momento dado. Esto encaja perfectamente en tu arquitectura modular.

Aquí tienes un plan para implementar este switch en la UI y propagar la información a través del sistema:

Plan de Implementación: Modo Escritura vs. Chat (Solo Lectura)

Objetivo: Añadir un switch en la UI del webview que controle un estado ("modo") y asegurar que este estado sea accesible en el contexto para que el planificador pueda tomar decisiones basadas en él (principalmente, evitar acciones que impliquen edición de archivos en modo "chat").

1. Añadir la Configuración del Modo en ConfigurationManager

Propósito: Persistir la preferencia del usuario para el modo (escritura/chat) entre sesiones.

Archivo Modificado: src/config/ConfigurationManager.ts

Nota: Asume que tienes una setting extensionAssistant.mode en tu package.json.

import * as vscode from 'vscode';
import { ModelType } from '../models/config/types';

// Define los tipos de modo
export type AssistantMode = 'write' | 'chat'; // 'write' permite edición, 'chat' es solo lectura

/**
 * Gestiona la configuración de la extensión
 */
export class ConfigurationManager {
    private extensionConfig: vscode.WorkspaceConfiguration;

    /**
     * Constructor de ConfigurationManager
     * @param context Contexto de la extensión VS Code
     */
    constructor(private context: vscode.ExtensionContext) {
        this.extensionConfig = vscode.workspace.getConfiguration('extensionAssistant');
    }

    /**
     * Obtiene el tipo de modelo actual (globalState)
     * @returns Tipo de modelo actual
     */
    getModelType(): ModelType {
        return this.context.globalState.get('modelType') ?? 'ollama';
    }

    /**
     * Establece el tipo de modelo (globalState)
     * @param type Nuevo tipo de modelo
     * @returns Promise de actualización
     */
    setModelType(type: ModelType): Thenable<void> {
        return this.context.globalState.update('modelType', type);
    }

    /**
     * Obtiene una configuración genérica de globalState
     * @param key Clave de configuración
     * @param defaultValue Valor predeterminado
     * @returns Valor de configuración o valor predeterminado
     */
    getValue<T>(key: string, defaultValue: T): T {
         return this.context.globalState.get<T>(key) ?? defaultValue;
    }

    /**
     * Establece una configuración genérica en globalState
     * @param key Clave de configuración
     * @param value Valor de configuración
     * @returns Promise de actualización
     */
    setValue<T>(key: string, value: T): Thenable<void> {
        return this.context.globalState.update(key, value);
    }

    /**
     * Obtiene una configuración de la sección de la extensión en workspace/user settings.
     * @param key Clave de configuración dentro de la sección de la extensión (ej: 'agent.context.summaryThreshold')
     * @param defaultValue Valor predeterminado
     * @returns Valor de configuración o valor predeterminado
     */
    getSetting<T>(key: string, defaultValue: T): T {
        return this.extensionConfig.get<T>(key) ?? defaultValue;
    }

    /**
     * Establece una configuración en la sección de la extensión (generalmente no se hace desde el código, sino por el usuario).
     * Esto es solo un ejemplo si necesitaras cambiar una setting programáticamente.
     * @param key Clave de configuración
     * @param value Valor de configuración
     * @param target Dónde guardar la configuración (Global, Workspace, WorkspaceFolder)
     * @returns Promise de actualización
     */
    async setSetting<T>(key: string, value: T, target: vscode.ConfigurationTarget = vscode.ConfigurationTarget.Global): Promise<void> {
         await this.extensionConfig.update(key, value, target);
    }


    /**
     * Obtiene el tema de UI preferido (ejemplo de setting en globalState)
     * @returns 'dark' | 'light' | 'system'
     */
    getUiTheme(): 'dark' | 'light' | 'system' {
        return this.getValue('uiTheme', 'system');
    }

    /**
     * Establece el tema de UI preferido (ejemplo de setting en globalState)
     * @param theme Nuevo tema
     * @returns Promise de actualización
     */
    setUiTheme(theme: 'dark' | 'light' | 'system'): Thenable<void> {
        return this.setValue('uiTheme', theme);
    }

    getContextAgentSummaryThreshold(): number {
        return this.getSetting<number>('agent.context.summaryThreshold', 10);
    }

    // <-- Add getter and setter for Assistant Mode
    getAssistantMode(): AssistantMode {
        // Read from workspace/user settings
        return this.getSetting<AssistantMode>('mode', 'write'); // Default to 'write'
    }

    async setAssistantMode(mode: AssistantMode): Promise<void> {
        // Update workspace/user settings
        await this.setSetting<AssistantMode>('mode', mode, vscode.ConfigurationTarget.Global); // Or Workspace/WorkspaceFolder
    }
    // -->
}


2. Añadir el Estado del Modo al Contexto

Propósito: Hacer que el modo actual esté disponible en el FlowContext para el planificador y los prompts.

Archivo Modificado: src/orchestrator/context/sessionContext.ts

Razón: El modo es una configuración que afecta a toda la sesión/workspace, por lo que SessionContext es un buen lugar para obtenerlo inicialmente.

// src/orchestrator/context/sessionContext.ts
import * as vscode from 'vscode';
import { GlobalContext, GlobalContextState } from './globalContext';
import { getProjectInfo as fetchProjectInfo } from '../../tools/project/getProjectInfo';
import { ConfigurationManager, AssistantMode } from '../../config/ConfigurationManager'; // <-- Import ConfigurationManager and AssistantMode

interface SessionContextState {
    [key: string]: any;
    workspacePath?: string;
    activeEditorInfo?: {
        fileName: string;
        languageId: string;
    };
    assistantMode?: AssistantMode; // <-- Add assistant mode
}

/**
 * Manages context that is specific to the current VS Code session/workspace.
 * Does NOT typically persist across sessions in its entirety.
 * Linked to the GlobalContext.
 */
export class SessionContext {
    private state: SessionContextState;
    private context: vscode.ExtensionContext;
    private globalContext: GlobalContext;
    private configManager: ConfigurationManager; // <-- Add ConfigurationManager
    private projectInfoPromise: Promise<GlobalContextState['projectInfo']> | null = null;

    // <-- Accept ConfigurationManager
    constructor(context: vscode.ExtensionContext, globalContext: GlobalContext, configManager: ConfigurationManager) {
        this.context = context;
        this.globalContext = globalContext;
        this.configManager = configManager; // <-- Store ConfigurationManager
        this.state = {};

        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (workspaceFolders && workspaceFolders.length > 0) {
            this.state.workspacePath = workspaceFolders[0].uri.fsPath;
        }

        // Initialize assistant mode from config
        this.state.assistantMode = this.configManager.getAssistantMode(); // <-- Get initial mode

        // Listen for changes to the assistant mode setting
        const configListener = vscode.workspace.onDidChangeConfiguration(event => {
            if (event.intersects(vscode.workspace.getConfiguration('extensionAssistant'))) {
                const newMode = this.configManager.getAssistantMode();
                if (this.state.assistantMode !== newMode) {
                    console.log(`[SessionContext] Assistant mode changed: ${this.state.assistantMode} -> ${newMode}`);
                    this.state.assistantMode = newMode;
                    // Optional: Notify other parts of the system or UI about the mode change if needed immediately
                    // For now, relying on FlowContext picking it up on the next turn is sufficient for planning.
                }
            }
        });
        context.subscriptions.push(configListener); // Ensure listener is disposed


        const activeEditor = vscode.window.activeTextEditor;
        if (activeEditor) {
             this.state.activeEditorInfo = {
                 fileName: activeEditor.document.fileName,
                 languageId: activeEditor.document.languageId
             };
        }

        // Listen for active editor changes (existing logic)
        const editorListener = vscode.window.onDidChangeActiveTextEditor(editor => {
            if (editor) {
                this.state.activeEditorInfo = {
                    fileName: editor.document.fileName,
                    languageId: editor.document.languageId
                };
            } else {
                this.state.activeEditorInfo = undefined;
            }
        });
        context.subscriptions.push(editorListener); // Ensure listener is disposed
    }

    getState(): SessionContextState {
        return JSON.parse(JSON.stringify(this.state));
    }

    setValue<K extends keyof SessionContextState>(key: K, value: SessionContextState[K]): void {
        this.state[key] = value;
    }

    getValue<K extends keyof SessionContextState>(key: K): SessionContextState[K] | undefined {
        return this.state[key];
    }

    getWorkspacePath(): string | undefined {
        return this.state.workspacePath;
    }

    getActiveEditorInfo(): SessionContextState['activeEditorInfo'] {
         return this.state.activeEditorInfo;
    }

    getAssistantMode(): AssistantMode | undefined { // <-- Add getter for mode
        return this.state.assistantMode;
    }


    getGlobalContext(): GlobalContext {
        return this.globalContext;
    }

    /**
     * Fetches project info (languages, dependencies) and stores it in GlobalContext if not already there.
     * Returns the project info.
     */
    async getOrFetchProjectInfo(): Promise<GlobalContextState['projectInfo']> {
        const existingInfo = this.globalContext.getProjectInfo();
        if (existingInfo) {
            return existingInfo;
        }

        if (!this.projectInfoPromise) {
            this.projectInfoPromise = fetchProjectInfo().catch(err => {
                 console.error('[SessionContext] Error fetching project info:', err);
                 this.projectInfoPromise = null;
                 return undefined;
            });
            this.projectInfoPromise.then(info => {
                 if (info) {
                      this.globalContext.setProjectInfo(info);
                      this.globalContext.saveState(); // Save to global state
                 }
            });
        }

        return this.projectInfoPromise;
    }

    dispose(): void {
        // Listeners added to context.subscriptions are disposed automatically
        console.log('[SessionContext] Disposing.');
    }
}
IGNORE_WHEN_COPYING_START
content_copy
download
Use code with caution.
TypeScript
IGNORE_WHEN_COPYING_END

3. Modificar extension.ts para Pasar ConfigurationManager a SessionContext

Propósito: Asegurar que SessionContext pueda leer la configuración del modo.

Archivo Modificado: src/extension.ts

import * as vscode from 'vscode';
import { WebviewProvider } from './ui/webView/webviewProvider';
import { ConfigurationManager } from './config/ConfigurationManager';
import { initializePromptSystem, disposePromptSystem, executeModelInteraction, getPromptDefinitions } from './models/promptSystem';
import { ModelManager } from './models/config/ModelManager';
import { ChatService } from './services/chatService';
import { Orchestrator } from './orchestrator/orchestrator';
import { FileSystemService } from './services/fileSystemService'; // Keep for now
import { DatabaseManager } from './store/database/DatabaseManager';

// Import new context classes
import { GlobalContext, SessionContext, ConversationContext, FlowContext } from './orchestrator/context';

// Import new agents service
import { AgentOrchestratorService } from './orchestrator/agents/AgentOrchestratorService';

// Declare context variables
let globalContext: GlobalContext | null = null;
let sessionContext: SessionContext | null = null;
let dbManager: DatabaseManager | null = null;
let agentOrchestratorService: AgentOrchestratorService | null = null;
let configManager: ConfigurationManager | null = null;

export async function activate(context: vscode.ExtensionContext) {
  console.log('[Extension] Activating...');

  configManager = new ConfigurationManager(context);
  dbManager = DatabaseManager.getInstance(context);
  globalContext = new GlobalContext(context, configManager);
  globalContext.getProjectInfo();
  // Pass configManager to SessionContext
  sessionContext = new SessionContext(context, globalContext, configManager); // <-- Pass configManager

  const modelManager = new ModelManager(configManager);
  initializePromptSystem(modelManager);

  agentOrchestratorService = new AgentOrchestratorService(
      context,
      { executeModelInteraction: executeModelInteraction, getPromptDefinitions: getPromptDefinitions },
      dbManager,
      configManager
  );

  const orchestrator = new Orchestrator(globalContext, sessionContext);

  const chatService = new ChatService(context, modelManager, orchestrator, globalContext, sessionContext, agentOrchestratorService);

  const webview = new WebviewProvider(context.extensionUri, configManager, chatService, agentOrchestratorService);

  webview.setThemeHandler();

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider('aiChat.chatView', webview)
  );

  // Register Commands (remain the same)
  context.subscriptions.push(
    vscode.commands.registerCommand('extensionAssistant.newChat', () => {
      chatService.prepareNewConversation();
      webview.createNewChat();
    }),
    vscode.commands.registerCommand('extensionAssistant.settings', async () => {
      await vscode.commands.executeCommand('workbench.action.openSettings', '@ext:user.extensionassistant');
    }),
    vscode.commands.registerCommand('extensionAssistant.switchModel', async () => {
      const current = configManager!.getModelType();
      const newModel = current === 'ollama' ? 'gemini' : 'ollama';
      await modelManager.setModel(newModel);
      webview.updateModel(newModel);
    }),
    vscode.commands.registerCommand('extensionAssistant.chat.history', () => {
      webview.showChatHistory();
    }),
    vscode.commands.registerCommand('extensionAssistant.model.change', async () => {
      const current = configManager!.getModelType();
      const newModel = current === 'ollama' ? 'gemini' : 'ollama';
      await modelManager.setModel(newModel);
      webview.updateModel(newModel);
    }),
    vscode.commands.registerCommand('extension.resetDatabase', async () => {
      try {
        if (dbManager) {
           if (agentOrchestratorService) {
               agentOrchestratorService.dispose();
               agentOrchestratorService = null;
           }
           webview.dispose();
           modelManager.dispose();
           orchestrator.dispose();

           await dbManager.resetDatabase();

           vscode.window.showInformationMessage('Database reset successfully! Please reload the window if any issues persist.');
        } else {
             throw new Error("DatabaseManager not initialized.");
        }

      } catch (error) {
        console.error('[Database Reset Error]', error);
        vscode.window.showErrorMessage(
          `Database reset failed: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    })
  );

  // Add disposables
  context.subscriptions.push(webview);
  context.subscriptions.push(modelManager);
  context.subscriptions.push(orchestrator);
  context.subscriptions.push(globalContext);
  context.subscriptions.push(sessionContext);
  if (agentOrchestratorService) {
      context.subscriptions.push(agentOrchestratorService);
  }

  console.log('[Extension] Activated with Stage 5 polishing and stability.');
}

export async function deactivate() {
  console.log('[Extension] Deactivating...');

  if (globalContext) {
      await globalContext.saveState();
      globalContext.dispose();
      globalContext = null;
  }

  if (sessionContext) {
       sessionContext.dispose();
       sessionContext = null;
  }

  if (agentOrchestratorService) {
      agentOrchestratorService.dispose();
      agentOrchestratorService = null;
  }

  disposePromptSystem();

  if (dbManager) {
      dbManager.close();
      dbManager = null;
  }

  configManager = null;

  console.log('[Extension] Deactivated.');
}
IGNORE_WHEN_COPYING_START
content_copy
download
Use code with caution.
TypeScript
IGNORE_WHEN_COPYING_END

4. Modificar FlowContext.getResolutionContext para Incluir el Modo

Propósito: Asegurar que el modo actual, obtenido de SessionContext, esté disponible en el contexto aplanado para el planificador y los prompts.

Archivo Modificado: src/orchestrator/context/flowContext.ts

// src/orchestrator/context/flowContext.ts
import { InputAnalysisResult } from '../execution/types';
import { ConversationContext } from './conversationContext';
import { MemoryItem } from '../agents/MemoryAgent';
import { AssistantMode } from '../../config/ConfigurationManager'; // <-- Import AssistantMode

// Minimal ChatMessage definition for type hinting within this file
interface ChatMessage {
    content: string;
    sender: 'user' | 'assistant' | 'system';
}

interface FlowContextState {
    userMessage?: string;
    referencedFiles?: string[];
    analysisResult?: InputAnalysisResult;
    // analyzedFileInsights is in ConversationContext
    // retrievedMemory is in ConversationContext
    isReplanning?: boolean;
    replanReason?: string;
    replanData?: any;
    // assistantMode is in SessionContext, accessed via getResolutionContext
    [key: string]: any; // For step results, temporary data, etc.
}

/**
 * Manages the state and data for a single *turn of execution* within a conversation.
 * Accumulates analysis results and step execution outcomes for the current user input.
 * Linked to its parent ConversationContext.
 */
export class FlowContext {
    private state: FlowContextState;
    private conversationContext: ConversationContext;

    constructor(conversationContext: ConversationContext, initialState: Partial<FlowContextState> = {}) {
        this.conversationContext = conversationContext;
        this.state = {
            ...initialState
        };
        console.log(`[FlowContext:${this.getChatId()}] Initialized.`);
    }

    getChatId(): string {
        return this.conversationContext.getChatId();
    }

    getConversationContext(): ConversationContext {
        return this.conversationContext;
    }

    /**
     * Stores a value specific to this flow execution using a specific key.
     * Can be used for step results, temporary data, etc.
     */
    setValue(key: string, value: any) {
        // Prevent overwriting critical parent context properties if keys overlap by accident
         if (['chatId', 'messages', 'summary', 'relevantFiles', 'analyzedFileInsights', 'retrievedMemory', 'isReplanning', 'replanReason', 'replanData', 'assistantMode'].includes(key)) { // <-- Add assistantMode
            console.warn(`[FlowContext:${this.getChatId()}] Attempted to overwrite potential parent context key: ${key}`);
            return;
        }
        this.state[key] = value;
        console.log(`[FlowContext:${this.getChatId()}] Set value for key '${key}'.`);
    }

    /**
     * Retrieves a value from the flow context state by key.
     */
    getValue<T = any>(key: string): T | undefined {
        return this.state[key] as T | undefined;
    }

    getAnalysisResult(): InputAnalysisResult | undefined {
        return this.getValue<InputAnalysisResult>('analysisResult');
    }

    getObjective(): string | undefined {
        return this.getAnalysisResult()?.objective;
    }

    getExtractedEntities(): InputAnalysisResult['extractedEntities'] | undefined {
        return this.getAnalysisResult()?.extractedEntities;
    }

    /**
     * Provides a flattened view of the *relevant* context data from all layers
     * suitable for parameter resolution via {{placeholder}} patterns or passing to buildVariables functions.
     * Gathers data from Global, Session, Conversation, and Flow layers.
     */
    getResolutionContext(): Record<string, any> {
        const resolutionContextData: Record<string, any> = {};

        // 1. Add FlowContext state (highest priority)
        for (const key in this.state) {
            if (this.state[key] !== undefined) {
                resolutionContextData[key] = this.state[key];
            }
        }

        // 2. Add ConversationContext state (excluding messages, handled by chatHistoryString)
        const convState = this.conversationContext.getState();
        for (const key in convState) {
             // Exclude messages and currentFlowContext
             if (key !== 'messages' && key !== 'currentFlowContext' && convState[key] !== undefined && resolutionContextData[key] === undefined) {
                 resolutionContextData[key] = convState[key];
             }
        }
         resolutionContextData['chatHistoryString'] = this.conversationContext.getHistoryForModel(10);

        // 3. Add SessionContext state
        const sessionState = this.conversationContext.getSessionContext().getState();
        for (const key in sessionState) {
            if (sessionState[key] !== undefined && resolutionContextData[key] === undefined) {
                resolutionContextData[key] = sessionState[key];
            }
        }

        // 4. Add GlobalContext state (lowest priority)
        const globalState = this.conversationContext.getSessionContext().getGlobalContext().getState();
        for (const key in globalState) {
            if (globalState[key] !== undefined && resolutionContextData[key] === undefined) {
                resolutionContextData[key] = globalState[key];
            }
        }

        // Ensure userMessage is explicitly added if not already from state
        if (resolutionContextData.userMessage === undefined) {
             const lastMessage = this.conversationContext.getHistory().slice(-1)[0];
             if (lastMessage && lastMessage.sender === 'user') {
                  resolutionContextData.userMessage = lastMessage.content;
             } else {
                  resolutionContextData.userMessage = '';
             }
        }

        // Add specific keys from ConversationContext if they exist (redundant due to loop, but can be clearer)
        // if (this.conversationContext.getAnalyzedFileInsights()) { resolutionContextData['analyzedFileInsights'] = this.conversationContext.getAnalyzedFileInsights(); }
        // if (this.conversationContext.getRetrievedMemory()) { resolutionContextData['retrievedMemory'] = this.conversationContext.getRetrievedMemory(); }
        // if (this.conversationContext.getSummary()) { resolutionContextData['summary'] = this.conversationContext.getSummary(); }
        // if (this.conversationContext.getRelevantFiles()) { resolutionContextData['relevantFiles'] = this.conversationContext.getRelevantFiles(); }

        // <-- Add Assistant Mode from SessionContext
        const assistantMode = this.conversationContext.getSessionContext().getAssistantMode();
        if (assistantMode !== undefined) {
             resolutionContextData['assistantMode'] = assistantMode;
        }
        // -->


        return resolutionContextData;
    }

    /**
     * Gets the full internal state.
     */
    getState(): FlowContextState {
        const stateCopy: any = { ...this.state };
        return stateCopy as FlowContextState;
    }

    dispose(): void {
         console.log(`[FlowContext:${this.getChatId()}] Disposed.`);
         this.state = {};
    }
}
IGNORE_WHEN_COPYING_START
content_copy
download
Use code with caution.
TypeScript
IGNORE_WHEN_COPYING_END

5. Modificar el Prompt del Planner (prompt.planner.ts)

Propósito: Ajustar el template para informar al modelo sobre el modo actual y añadir instrucciones para evitar acciones de edición en modo "chat".

Archivo Modificado: src/models/prompts/intentions/prompt.planner.ts

// src/models/prompts/intentions/prompt.planner.ts

import { BasePromptVariables, PlannerPromptVariables, MemoryItem } from '../../../orchestrator/execution/types';
import { ToolRunner } from '../../../tools';
import { mapContextToBaseVariables, getPromptDefinitions } from '../../promptSystem';
import { AssistantMode } from '../../../config/ConfigurationManager'; // <-- Import AssistantMode

// Define the prompt template for the planner
export const plannerPrompt = `
You are an AI assistant responsible for planning and executing tasks based on user requests within a VS Code extension. Your goal is to determine the single best next action to take to fulfill the user's objective, given the current context and the results of previous steps.

Current Assistant Mode: {{assistantMode}}

User Objective: "{{objective}}"
User Message: "{{userMessage}}"

Recent Conversation Summary:
{{summary}}

Last Recent Messages (approx. last 4 turns):
{{recentMessagesString}}

Key Extracted Entities:
{{extractedEntities}}

Project Context:
{{projectContext}}

Relevant Files Identified:
{{relevantFiles}}

Analyzed File Insights:
{{analyzedFileInsights}}

Relevant Project Memory:
{{retrievedMemory}}

Current Flow State (Results of previous steps in this turn, keyed by 'storeAs' name):
{{currentFlowState}}

Available Tools (Use these to interact with the VS Code environment):
{{availableTools}}

Available Prompts (Use these for AI reasoning, generation, or analysis):
{{availablePrompts}}

Planning History for this turn (Sequence of actions taken and their outcomes):
{{planningHistory}}

Current Planning Iteration: {{planningIteration}}

{{#if isReplanning}}
--- REPLANNING ---
This is a replanning attempt. The previous attempt(s) encountered issues or new information became available.
Reason for replanning: "{{replanReason}}"
New data that triggered replanning: {{replanData}}
Analyze the "Planning History" below to understand what went wrong in previous steps before deciding the next action.
--- END REPLANNING ---
{{/if}}

Instructions:
1. Analyze the User Objective, User Message, **Recent Conversation Summary**, **Last Recent Messages**, Context, **Relevant Project Memory**, and especially the **Current Flow State** and **Analyzed File Insights** to understand what has been done and what is needed.
2. **IMPORTANT: Respect the "Current Assistant Mode".**
   - If the mode is \`chat\`, you are in read-only mode. **DO NOT** plan any action that modifies files or the workspace (e.g., \`codeManipulation.applyWorkspaceEdit\`). Focus on providing information, explanations, or code snippets in the response message.
   - If the mode is \`write\`, you are allowed to plan actions that modify files, but be cautious and prioritize user confirmation (future feature).
3. **If this is a replanning attempt, carefully review the "Planning History" and "Reason for replanning" to understand past failures or new context.** Adjust your plan accordingly.
4. Consider the **Available Tools** and **Available Prompts**.
5. Decide the **single best next action** to move closer to the objective, adhering to the current mode.
6. Your action must be one of:
    - \`tool\`: Execute one of the Available Tools. Use this to gather information (read files, search) or perform actions (apply edits - future). **Ensure the tool is allowed in the current mode.**
    - \`prompt\`: Execute one of the Available Prompts (excluding the planner itself). Use this for AI analysis, generation, or validation.
    - \`respond\`: You have sufficient information or have completed the task. Provide the final message to the user.
7. Provide a brief \`reasoning\` for your choice.
8. If the action is \`tool\` or \`prompt\`, specify the \`toolName\` or \`promptType\` and any necessary \`params\`. Parameters should reference data available in the **Current Flow State** using placeholder syntax (e.g., \`"filePath": "{{extractedEntities.filesMentioned.[0]}}"\`) or provide literal values. Ensure parameters match the expected input of the tool/prompt.
9. If the action is \`respond\`, the \`params\` should include a \`messageToUser\` string containing your final response. You can reference results from the **Current Flow State** using placeholders (e.g., \`"explanationResult.explanation"}\`).

Consider these common task patterns:
- **Explain Code:** Often involves: \`editor.getActiveEditorContent\` or \`filesystem.getFileContents\` -> **`codeAnalyzer` / `codeFragmenter` (potentially run by agent)** -> \`explainCodePrompt\` -> \`respond\`. (Allowed in both modes)
- **Fix Code:** Often involves: \`editor.getActiveEditorContent\` or \`filesystem.getFileContents\` -> \`project.search\` (for errors) -> **`codeAnalyzer` / `codeFragmenter` (potentially run by agent)** -> \`fixCodePrompt\` -> \`codeValidator\` -> \`codeManipulation.applyWorkspaceEdit\` (future) -> \`respond\`. **(\`codeManipulation.applyWorkspaceEdit\` is ONLY allowed in \`write\` mode. In \`chat\` mode, you should provide the fix proposal in the final response message instead of planning the tool call).**
- **General Conversation:** Often involves: \`conversationResponder\` -> \`respond\`. (Allowed in both modes)
- **If a step fails:** Analyze the error in **Planning History** and **Current Flow State**. Decide if you can retry, try a different approach, or if you need to \`respond\` asking the user for clarification or stating the failure.

Your response must be a JSON object matching the \`PlannerResponse\` structure.

Now, based on the current context, what is the single best next action?
`;

// Function to build variables for the planner prompt
export interface PlannerPromptVariablesWithReplanAndMode extends PlannerPromptVariables {
    isReplanning?: boolean;
    replanReason?: string;
    replanData?: any;
    assistantMode: AssistantMode; // <-- Add assistant mode variable
}

export function buildPlannerVariables(resolutionContextData: Record<string, any>): PlannerPromptVariablesWithReplanAndMode {
    const baseVariables = mapContextToBaseVariables(resolutionContextData);

    const availableTools = ToolRunner.listTools().join(', ');
    const availablePrompts = Object.keys(getPromptDefinitions()).filter(type => type !== 'planner').join(', ');

    const fullHistoryString = resolutionContextData.chatHistoryString || '';
    const historyLines = fullHistoryString.split('\n').filter(line => line.trim() !== '');
    const recentMessagesLines = historyLines.slice(-8);
    const recentMessagesString = recentMessagesLines.join('\n');

    const planningHistory = resolutionContextData.planningHistory || [];
    const planningIteration = resolutionContextData.planningIteration || 1;

    const currentFlowState = resolutionContextData;

    const retrievedMemory: MemoryItem[] = resolutionContextData.retrievedMemory || [];
    const formattedMemory = retrievedMemory.length > 0
        ? retrievedMemory.map(item => `Type: ${item.type}\nKey: ${item.keyName}\nContent: ${JSON.stringify(item.content, null, 2)}\nReason: ${item.reason || 'N/A'}`).join('\n---\n')
        : 'None retrieved.';


    const plannerVariables: PlannerPromptVariablesWithReplanAndMode = {
        ...baseVariables,
        summary: resolutionContextData.summary || 'No summary available.',
        recentMessagesString: recentMessagesString,
        relevantFiles: resolutionContextData.relevantFiles ? resolutionContextData.relevantFiles.join(', ') : 'None identified.',
        analyzedFileInsights: resolutionContextData.analyzedFileInsights ? JSON.stringify(resolutionContextData.analyzedFileInsights, null, 2) : 'None available.',
        retrievedMemory: formattedMemory,
        currentFlowState: currentFlowState,
        availableTools: availableTools,
        availablePrompts: availablePrompts,
        planningHistory: planningHistory,
        planningIteration: planningIteration,
        isReplanning: resolutionContextData.isReplanning,
        replanReason: resolutionContextData.replanReason,
        replanData: resolutionContextData.replanData ? JSON.stringify(resolutionContextData.replanData, null, 2) : 'None.',
        // <-- Add assistant mode variable from context
        assistantMode: resolutionContextData.assistantMode || 'write', // Default to 'write' if somehow missing
        // -->
    };

    return plannerVariables;
}
IGNORE_WHEN_COPYING_START
content_copy
download
Use code with caution.
TypeScript
IGNORE_WHEN_COPYING_END

6. Implementar el Switch en el Webview UI

Propósito: Añadir el elemento UI para el switch y enviar mensajes a la extensión cuando cambie.

Archivo Modificado: src/ui/webView/htmlTemplate.ts (o el archivo que genera tu HTML del webview)

Nota: Esto es una implementación de ejemplo. Deberás adaptarlo a tu estructura HTML/JavaScript del webview.

(Modificación en htmlTemplate.ts - Ejemplo)

// src/ui/webView/htmlTemplate.ts

// ... (existing imports and getHtmlContent function) ...

export function getHtmlContent(extensionUri: vscode.Uri, webview: vscode.Webview): string {
    // ... (existing logic to get URIs for CSS, JS, etc.) ...

    return `<!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <link rel="stylesheet" href="${styleUri}">
        <title>AI Assistant</title>
    </head>
    <body>
        <div id="chat-container">
            <div id="chat-header">
                <h1 id="chat-title">New Conversation</h1>
                <div id="header-actions">
                    <!-- Add the Mode Switch here -->
                    <div class="mode-switch-container">
                        <label for="mode-switch">Mode:</label>
                        <select id="mode-switch">
                            <option value="write">Write</option>
                            <option value="chat">Chat (Read-only)</option>
                        </select>
                    </div>
                    <!-- End Mode Switch -->
                    <button id="new-chat-button" title="New Chat">New</button>
                    <button id="history-button" title="Chat History">History</button>
                    <button id="settings-button" title="Settings">Settings</button>
                </div>
            </div>
            <div id="chat-history">
                <!-- Chat history list goes here -->
            </div>
            <div id="chat-messages">
                <!-- Messages will be appended here -->
            </div>
            <div id="chat-input-area">
                 <!-- Optional: Area to show agent statuses -->
                 <div id="agent-status"></div>
                 <!-- End Agent Status -->
                <textarea id="chat-input" placeholder="Ask me a question..."></textarea>
                <button id="send-button">Send</button>
            </div>
        </div>

        <script src="${scriptUri}"></script>
    </body>
    </html>`;
}
IGNORE_WHEN_COPYING_START
content_copy
download
Use code with caution.
TypeScript
IGNORE_WHEN_COPYING_END

(Modificación en tu archivo JavaScript del webview - Ejemplo main.js)

// src/ui/webView/media/main.js

// ... (existing vscode api setup and message handling) ...

const modeSwitch = document.getElementById('mode-switch');
const agentStatusDiv = document.getElementById('agent-status'); // Get the status div

// Function to update the UI based on the current mode
function updateUIMode(mode) {
    const inputArea = document.getElementById('chat-input-area');
    const sendButton = document.getElementById('send-button');
    const input = document.getElementById('chat-input');

    if (mode === 'chat') {
        // Disable input and send button in chat mode
        input.disabled = true;
        sendButton.disabled = true;
        input.placeholder = "Read-only mode. Switch to 'Write' to send messages.";
        inputArea.classList.add('read-only'); // Add CSS class for styling
    } else {
        // Enable input and send button in write mode
        input.disabled = false;
        sendButton.disabled = false;
        input.placeholder = "Ask me a question...";
        inputArea.classList.remove('read-only'); // Remove CSS class
    }
    // Set the select value to match the current mode
    if (modeSwitch) {
        modeSwitch.value = mode;
    }
}

// Listen for mode switch changes in the UI
if (modeSwitch) {
    modeSwitch.addEventListener('change', (event) => {
        const newMode = event.target.value;
        vscode.postMessage({
            type: 'command',
            command: 'setAssistantMode', // Send command to extension
            mode: newMode
        });
        // Update UI immediately for responsiveness
        updateUIMode(newMode);
    });
}


// Handle incoming messages from the extension
window.addEventListener('message', event => {
    const message = event.data;
    switch (message.type) {
        // ... (existing cases like 'chatResponse', 'chatListUpdated', 'chatLoaded', etc.) ...

        case 'modelChanged':
            // Handle model change UI update
            console.log('Model changed to:', message.payload.modelType);
            // Update any UI elements showing the model name if you have them
            break;

        case 'themeChanged':
             // Handle theme change UI update
             console.log('Theme changed. Dark mode:', message.payload.isDarkMode);
             // Apply theme class to body or root element
             document.body.classList.toggle('vscode-dark', message.payload.isDarkMode);
             document.body.classList.toggle('vscode-light', !message.payload.isDarkMode);
             break;

        case 'agentStatusUpdate': // <-- Handle agent status updates
            {
                const { agent, status, task, message: statusMessage } = message.payload;
                console.log(`Agent Status: ${agent} - ${status} (${task || 'N/A'})`, statusMessage || '');
                // Update a status indicator in the UI
                if (agentStatusDiv) {
                    // Example: Display a simple status message
                    agentStatusDiv.textContent = `${agent}: ${status}${task ? ` (${task})` : ''}${statusMessage ? ` - ${statusMessage}` : ''}`;
                    // Add/remove CSS classes for styling (e.g., .working, .error)
                    agentStatusDiv.className = 'agent-status ' + status;
                }
            }
            break;
        // <-- Add case for initial mode setting when webview loads
        case 'setInitialMode':
            {
                const initialMode = message.payload.mode;
                console.log('Setting initial assistant mode:', initialMode);
                updateUIMode(initialMode); // Update UI based on initial mode from extension
            }
            break;
        // -->

        default:
            console.warn('Unknown message type from extension:', message.type, message);
    }
});

// Example: Send initial request for chat list when webview is ready
vscode.postMessage({ type: 'command', command: 'getChatList' });

// Example: Request initial mode setting from extension when webview is ready
vscode.postMessage({ type: 'command', command: 'getAssistantMode' }); // <-- Request initial mode
IGNORE_WHEN_COPYING_START
content_copy
download
Use code with caution.
JavaScript
IGNORE_WHEN_COPYING_END

7. Modificar WebviewProvider para Manejar el Comando setAssistantMode y Enviar el Modo Inicial

Propósito: Recibir el comando del webview para cambiar el modo y usar ConfigurationManager para persistirlo. También, enviar el modo actual al webview cuando se carga.

Archivo Modificado: src/ui/webView/webviewProvider.ts

import * as vscode from 'vscode';
import { ConfigurationManager, AssistantMode } from '../../config/ConfigurationManager'; // <-- Import AssistantMode
import { getHtmlContent } from './htmlTemplate';
import { ChatService } from '../../services/chatService';
import { ToolRunner } from '../../tools/core/toolRunner';
import { AgentOrchestratorService } from '../../orchestrator/agents/AgentOrchestratorService';

export class WebviewProvider implements vscode.WebviewViewProvider {
  private view?: vscode.WebviewView;
  private disposables: vscode.Disposable[] = [];

  constructor(
    private readonly extensionUri: vscode.Uri,
    private readonly configManager: ConfigurationManager,
    private readonly chatService: ChatService,
    private readonly agentOrchestratorService: AgentOrchestratorService
  ) {}

  public resolveWebviewView(webviewView: vscode.WebviewView): void {
    this.view = webviewView;
    this.configureWebview();
    this.setupMessageHandlers();
    this.sendChatList();
    this.setThemeHandler();
    this.setupAgentStatusListener();

    // Send the initial model type and assistant mode to the webview
    const modelType = this.configManager.getModelType();
    this.updateModel(modelType);
    this.sendInitialMode(); // <-- Send initial mode
  }

  private configureWebview(): void {
    if (!this.view) return;
    this.view.webview.options = {
      enableScripts: true,
      localResourceRoots: [this.extensionUri],
    };
    this.view.webview.html = getHtmlContent(this.extensionUri, this.view.webview);
  }

  private setupMessageHandlers(): void {
    if (!this.view) return;
    const handler = this.view.webview.onDidReceiveMessage(async (message) => {
      try {
        switch (message.type) {
          case 'chat':
            await this.handleChatMessage(message.text, message.files);
            break;
          case 'command':
            await this.handleCommand(message);
            break;
        }
      } catch (error) {
        this.handleError(error);
      }
    });
    this.disposables.push(handler);
  }

  private setupAgentStatusListener(): void {
      const listener = this.agentOrchestratorService.on('agentStatusChanged', (chatId, agent, status, task, message) => {
          if (this.chatService.getCurrentConversationId() === chatId) {
              this.postMessage('agentStatusUpdate', { agent, status, task, message });
          }
      });
      this.disposables.push(listener);
  }


  private async handleChatMessage(text: string, files: string[] = []): Promise<void> {
    // Optional: Check mode here before sending message if UI update isn't sufficient
    // const currentMode = this.configManager.getAssistantMode();
    // if (currentMode === 'chat') {
    //     vscode.window.showInformationMessage("Assistant is in read-only mode. Switch to 'Write' mode to send messages.");
    //     return; // Prevent sending message
    // }

    if (!text.trim() && files.length === 0) return;

    try {
      this.postMessage('mainProcessStatus', { status: 'working', message: 'Thinking...' });

      const responseMessage = await this.chatService.sendMessage(text, files);

      this.postMessage('chatResponse', {
        text: responseMessage.content,
        chatId: responseMessage.chatId,
        timestamp: responseMessage.timestamp
      });

      this.postMessage('mainProcessStatus', { status: 'idle', message: 'Ready' });

      this.sendChatList();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      console.error('Error handling chat message:', error);
      this.postMessage('chat:error', { error: errorMessage });
      this.postMessage('mainProcessStatus', { status: 'error', message: 'Error occurred' });
    }
  }

  private async handleCommand(message: any): Promise<void> {
    const { command } = message;

    try {
        switch (command) {
          case 'getChatList':
            await this.sendChatList();
            break;
          case 'loadChat':
            await this.loadChat(message.chatId);
            break;
          case 'updateChatTitle':
            await this.updateChatTitle(message.chatId, message.title);
            break;
          case 'deleteChat':
            await this.deleteChat(message.chatId);
            break;
          case 'switchModel':
            await this.configManager.setModelType(message.modelType);
            this.updateModel(message.modelType);
            break;
          case 'showHistory':
            this.showChatHistory();
            break;
          case 'getProjectFiles':
            await this.getProjectFiles();
            break;
          case 'getFileContents':
            await this.getFileContents(message.filePath);
            break;
          // <-- Handle setAssistantMode command
          case 'setAssistantMode':
              if (message.mode === 'write' || message.mode === 'chat') {
                  await this.configManager.setAssistantMode(message.mode);
                  console.log(`[WebviewProvider] Assistant mode set to: ${message.mode}`);
                  // SessionContext listens to config changes and updates its state.
                  // No need to explicitly update SessionContext here.
              } else {
                  console.warn(`[WebviewProvider] Received invalid assistant mode: ${message.mode}`);
              }
              break;
          // -->
          // <-- Handle getAssistantMode command
          case 'getAssistantMode':
              this.sendInitialMode(); // Send the current mode back to the webview
              break;
          // -->
        }
    } catch (error) {
        this.handleError(error);
    }
  }

  public showChatHistory(): void {
    this.sendChatList();
    this.postMessage('historyRequested', {});
  }

  private async sendChatList(): Promise<void> {
    const chats = await this.chatService.getConversations();
    this.postMessage('chatListUpdated', { chats });
  }

  private async loadChat(chatId: string): Promise<void> {
    try {
      const messages = await this.chatService.loadConversation(chatId);
      this.postMessage('chatLoaded', { messages });
      // Optional: Send initial agent statuses for this chat if available
    } catch (error) {
      this.handleError(error);
    }
  }

  public async createNewChat(): Promise<void> {
    try {
      this.chatService.prepareNewConversation();
      this.postMessage('newChat', {});
      this.sendChatList();
    } catch (error) {
      this.handleError(error);
    }
  }

  private async deleteChat(chatId: string): Promise<void> {
    try {
      await this.chatService.deleteConversation(chatId);
      this.sendChatList();
    } catch (error) {
      this.handleError(error);
    }
  }

  private async updateChatTitle(chatId: string, title: string): Promise<void> {
    try {
      await this.chatService.updateConversationTitle(chatId, title);
      this.sendChatList();
    } catch (error) {
      this.handleError(error);
    }
  }

  private async getProjectFiles(): Promise<void> {
    try {
      const files = await ToolRunner.runTool('filesystem.getWorkspaceFiles', {});
      this.postMessage('projectFiles', { files });
    } catch (error) {
      this.handleError(error);
      this.postMessage('projectFiles', { files: [], error: error instanceof Error ? error.message : String(error) });
    }
  }

  private async getFileContents(filePath: string): Promise<void> {
    try {
      const content = await ToolRunner.runTool('filesystem.getFileContents', { filePath });
      this.postMessage('fileContents', { filePath, content });
    } catch (error) {
      this.handleError(error);
      this.postMessage('fileContents', { filePath, content: `Error loading file: ${error instanceof Error ? error.message : String(error)}`, error: error instanceof Error ? error.message : String(error) });
    }
  }

  private handleError(error: unknown): void {
    console.error('Webview error:', error);
    this.postMessage('error', {
      message: error instanceof Error ? error.message : 'An unknown error occurred',
      details: String(error)
    });
  }

  public updateModel(modelType: 'ollama' | 'gemini'): void {
    this.postMessage('modelChanged', { modelType });
  }

  // <-- Method to send the current mode to the webview
  private sendInitialMode(): void {
      const currentMode = this.configManager.getAssistantMode();
      this.postMessage('setInitialMode', { mode: currentMode });
  }
  // -->

  public postMessage(type: string, payload: unknown): void {
    this.view?.webview.postMessage({ type, payload });
  }

  public setThemeHandler() {
     this.postMessage('themeChanged', {
       isDarkMode: vscode.window.activeColorTheme.kind === vscode.ColorThemeKind.Dark
     });
     const themeListener = vscode.window.onDidChangeActiveColorTheme(theme => {
       this.postMessage('themeChanged', {
         isDarkMode: theme.kind === vscode.ColorThemeKind.Dark
       });
     });
     this.disposables.push(themeListener);

     if (this.view) {
       const messageListener = this.view.webview.onDidReceiveMessage(message => {
         if (message.type === 'setThemePreference') {
           this.configManager.setValue('uiTheme',
             message.isDarkMode ? 'dark' : 'light' // Assuming 'system' is handled by VS Code theme
           );
         }
       });
       this.disposables.push(messageListener);
     }
  }

  public dispose(): void {
    console.log('[WebviewProvider] Disposing.');
    this.disposables.forEach(disposable => disposable.dispose());
    this.disposables = [];
    this.view = undefined;
  }
}
IGNORE_WHEN_COPYING_START
content_copy
download
Use code with caution.
TypeScript
IGNORE_WHEN_COPYING_END

8. Modificar ToolExecutor para Respetar el Modo (Opcional pero Robusto)

Propósito: Añadir una capa de validación en el ToolExecutor para prevenir la ejecución de herramientas de edición en modo "chat", incluso si el planner las propone por error.

Archivo Modificado: src/orchestrator/execution/ToolExecutor.ts

import { ToolRunner } from "../../tools/core/toolRunner";
import { IExecutor } from "./types";
import { FlowContext } from "../context/flowContext"; // <-- Import FlowContext

/**
 * ToolExecutor implements the IExecutor interface for tool-based actions.
 * It delegates to ToolRunner for actual execution and tool discovery.
 * Handles tool names with module prefixes (e.g., 'filesystem.getFileContents').
 * Also enforces assistant mode restrictions.
 */
export class ToolExecutor implements IExecutor {
  // Define tools that are NOT allowed in 'chat' (read-only) mode
  private readonly writeModeOnlyTools: Set<string> = new Set([
      'codeManipulation.applyWorkspaceEdit',
      // Add other tools that modify the workspace here
      // 'filesystem.createFile',
      // 'filesystem.writeFile',
      // 'filesystem.deleteFile',
      // 'project.addDependency',
      // etc.
  ]);

  /**
   * Checks if this executor can handle the specified tool action
   * @param action The tool name (potentially with module prefix) to check
   * @returns true if the tool exists in ToolRunner
   */
  canExecute(action: string): boolean {
    return ToolRunner.listTools().includes(action);
  }

  /**
   * Executes the specified tool with the provided parameters.
   * For ToolExecutor, the 'params' parameter is the full resolution context data
   * from which tool parameters are resolved *before* this execute method is called.
   * However, we need the *mode* which is in the resolution context.
   * Let's modify execute signature to accept the full context data.
   *
   * **Correction:** StepExecutor resolves parameters *before* calling execute.
   * The mode needs to be checked *before* calling ToolRunner.runTool.
   * This check is better placed in StepExecutor or Orchestrator, where the FlowContext is available.
   * Let's add the check in StepExecutor.
   *
   * **Alternative (Less Ideal):** Pass the mode explicitly to execute, which requires changing IExecutor and StepExecutor.
   * Or, pass the entire resolutionContextData to execute, and ToolExecutor extracts the mode.
   * Let's try passing the full resolutionContextData to execute. This requires changing IExecutor signature.
   *
   * **Correction 2:** Reverting to original IExecutor signature. The mode check should happen *before* ToolExecutor is even selected/called, or within StepExecutor before calling `executor.execute`. Let's modify `StepExecutor.runStep`.
   */

   // Reverting ToolExecutor.execute signature to original
  async execute(action: string, params: Record<string, any>): Promise<any> {
    // The mode check is now handled in StepExecutor.
    // This method just executes the tool if it's allowed.
    return ToolRunner.runTool(action, params);
  }

  /**
   * Checks if a tool is allowed to run in a given mode.
   * This helper method can be used by StepExecutor.
   * @param toolName The name of the tool.
   * @param mode The current assistant mode ('write' or 'chat').
   * @returns true if the tool is allowed, false otherwise.
   */
  isToolAllowedInMode(toolName: string, mode: AssistantMode): boolean {
      if (mode === 'write') {
          return true; // All tools allowed in write mode
      }
      // In 'chat' mode, check if the tool is in the restricted list
      return !this.writeModeOnlyTools.has(toolName);
  }
}
IGNORE_WHEN_COPYING_START
content_copy
download
Use code with caution.
TypeScript
IGNORE_WHEN_COPYING_END

9. Modificar StepExecutor para Respetar el Modo

Propósito: Añadir una verificación en runStep para cancelar la ejecución de herramientas de edición si el modo es "chat".

Archivo Modificado: src/orchestrator/execution/stepExecutor.ts

// src/orchestrator/execution/stepExecutor.ts

import { FlowContext } from "../context";
import { ExecutorRegistry } from "./ExecutorRegistry";
import { ExecutionStep, StepResult } from "./types";
import { ToolExecutor } from "./ToolExecutor"; // <-- Import ToolExecutor to use its helper
import { AssistantMode } from "../../config/ConfigurationManager"; // <-- Import AssistantMode

/**
 * Responsible for executing a single ExecutionStep (tool or prompt).
 * Handles parameter resolution from context and storing results back into context.
 * Uses the ExecutorRegistry to determine the appropriate executor for each step.
 * Enforces assistant mode restrictions for tool execution.
 */
export class StepExecutor {
    private executorRegistry: ExecutorRegistry;
    private toolExecutor: ToolExecutor; // Keep a reference to ToolExecutor for mode check

    constructor(executorRegistry: ExecutorRegistry) {
        this.executorRegistry = executorRegistry;
        // Find the ToolExecutor instance in the registry
        const foundToolExecutor = this.executorRegistry.getExecutorFor('filesystem.getFileContents'); // Use a known tool name
        if (!foundToolExecutor || !(foundToolExecutor instanceof ToolExecutor)) {
             throw new Error("ToolExecutor not found or not an instance of ToolExecutor in registry.");
        }
        this.toolExecutor = foundToolExecutor;
    }

    /**
     * Executes a single step based on its definition.
     * Resolves parameters from the provided FlowContext, runs the tool/prompt,
     * and stores the result back into the FlowContext if 'storeAs' is specified.
     * Enforces assistant mode restrictions for tool steps.
     * @param step The step definition.
     * @param flowContext The FlowContext for the current turn.
     * @returns A Promise resolving to the result of the step execution.
     */
    public async runStep(step: ExecutionStep, flowContext: FlowContext): Promise<StepResult> {
        const chatId = flowContext.getChatId();
        console.log(`[StepExecutor:${chatId}] Running step '${step.name}' (Type: ${step.type}, Execute: ${step.execute})...`);

        const resolutionContextData = flowContext.getResolutionContext();
        const currentMode: AssistantMode = resolutionContextData.assistantMode || 'write'; // Get current mode from context

        // 1. Resolve parameters
        let executionParams: Record<string, any>;
        try {
            if (step.type === 'tool') {
                 // <-- Check mode for tool steps BEFORE resolving parameters
                 if (currentMode === 'chat' && !this.toolExecutor.isToolAllowedInMode(step.execute, currentMode)) {
                     const message = `Tool '${step.execute}' is not allowed in 'chat' (read-only) mode.`;
                     console.warn(`[StepExecutor:${chatId}] Skipping tool execution due to mode restriction: ${message}`);
                     // Return a skipped result with a specific message
                     if (step.storeAs) {
                         flowContext.setValue(step.storeAs, { skipped: true, reason: message, timestamp: Date.now(), stepName: step.name });
                     }
                     return { success: true, result: { skipped: true, reason: message }, timestamp: Date.now(), step, skipped: true };
                 }
                 // -->
                 executionParams = this.resolveParameters(step.params || {}, resolutionContextData);
                 console.log(`[StepExecutor:${chatId}] Tool params resolved for '${step.name}':`, executionParams);
            } else if (step.type === 'prompt') {
                 executionParams = resolutionContextData; // Pass the flattened resolution context data
                 console.log(`[StepExecutor:${chatId}] Prompt step '${step.name}' will receive resolution context data.`);
            } else {
                 throw new Error(`Unknown step type: ${step.type}`);
            }
        } catch (paramResolveError: any) {
             console.error(`[StepExecutor:${chatId}] Parameter resolution failed for '${step.name}':`, paramResolveError.message);
             return {
                 success: false,
                 error: new Error(`Parameter resolution failed: ${paramResolveError.message}`),
                 timestamp: Date.now(),
                 step: step,
                 skipped: false
             };
        }

        // 2. Check condition if present
        if (step.condition) {
             try {
                if (!step.condition(resolutionContextData)) {
                    console.log(`[StepExecutor:${chatId}] Skipping step '${step.name}' due to condition.`);
                    if (step.storeAs) {
                         flowContext.setValue(step.storeAs, { skipped: true, reason: 'Condition not met', timestamp: Date.now(), stepName: step.name });
                    }
                    return { success: true, result: 'skipped', timestamp: Date.now(), step, skipped: true };
                }
             } catch (conditionError: any) {
                 console.error(`[StepExecutor:${chatId}] Condition check failed for '${step.name}':`, conditionError.message);
                 return {
                    success: false,
                    error: new Error(`Condition check failed: ${conditionError.message}`),
                    timestamp: Date.now(),
                    step: step,
                    skipped: false
                 };
             }
        }

        let rawResult: any;
        let success = true;
        let error: any;

        try {
            // 3. Find appropriate executor
            const executor = this.executorRegistry.getExecutorFor(step.execute);

            if (!executor) {
                success = false;
                error = new Error(`No executor found for action: ${step.execute}`);
                console.error(`[StepExecutor:${chatId}] ${error.message}`);
            } else {
                try {
                    // 4. Execute the step
                    rawResult = await executor.execute(step.execute, executionParams);
                    success = true;
                    console.log(`[StepExecutor:${chatId}] Step execution succeeded for '${step.name}'.`);
                } catch (executionError) {
                    success = false;
                    error = executionError;
                    console.error(`[StepExecutor:${chatId}] Step execution failed for '${step.name}':`, error);
                }
            }
        } catch (unexpectedError) {
            success = false;
            error = unexpectedError;
            console.error(`[StepExecutor:${chatId}] UNEXPECTED ERROR during step execution for '${step.name}':`, error);
        }

        // 5. Store result in FlowContext state if storeAs is specified and the step was successful
        if (step.storeAs) {
             if (success) {
                 flowContext.setValue(step.storeAs, rawResult);
                 console.log(`[StepExecutor:${chatId}] Stored successful result for '${step.name}' at '${step.storeAs}'.`);
             } else {
                 // Store error information if step failed
                 flowContext.setValue(`${step.storeAs}_error`, error?.message || 'Execution failed');
                 console.warn(`[StepExecutor:${chatId}] Step '${step.name}' failed. Stored error indicator at '${step.storeAs}_error'.`);
             }
        }

        // 6. Return a structured StepResult
        return {
            success: success,
            result: rawResult,
            error: error,
            timestamp: Date.now(),
            step: step,
            skipped: false // Skipped due to mode or condition is handled above
        };
    }

    /**
     * Recursively resolves parameter placeholders (e.g., {{key}}) in a params object.
     * Looks up values in the provided contextData (the resolution context).
     * Handles nested objects and arrays.
     * This is primarily used for *tool* step parameters.
     */
    private resolveParameters(params: any, resolutionContextData: Record<string, any>): any {
        if (typeof params !== 'object' || params === null) {
            return params;
        }

        if (Array.isArray(params)) {
            return params.map(item => this.resolveParameters(item, resolutionContextData));
        }

        const resolvedParams: Record<string, any> = {};
        for (const [key, value] of Object.entries(params)) {
            if (typeof value === 'string' && value.startsWith('{{') && value.endsWith('}}')) {
                const contextKey = value.substring(2, value.length - 2);
                const keys = contextKey.split('.');
                let currentValue: any = resolutionContextData;
                let found = true;
                for (const k of keys) {
                    if (currentValue && typeof currentValue === 'object' && k in currentValue) {
                        currentValue = currentValue[k];
                    } else {
                        found = false;
                        currentValue = undefined; // Value not found in context
                        break;
                    }
                }
                // If value not found, resolve to null or undefined? Let's use undefined for now.
                resolvedParams[key] = found ? currentValue : undefined;

            } else {
                resolvedParams[key] = this.resolveParameters(value, resolutionContextData);
            }
        }

        return resolvedParams;
    }
}
IGNORE_WHEN_COPYING_START
content_copy
download
Use code with caution.
TypeScript
IGNORE_WHEN_COPYING_END

Resumen de la Etapa 5:

Has implementado el switch de modo y asegurado que el sistema lo respete:

Se añadió la configuración assistantMode a ConfigurationManager y se persistirá en las settings de VS Code.

SessionContext ahora lee esta configuración y la mantiene en su estado, escuchando cambios en las settings.

FlowContext.getResolutionContext incluye el assistantMode del SessionContext en el contexto aplanado.

El prompt del planner se modificó para incluir el assistantMode y se añadieron instrucciones explícitas para que el modelo evite acciones de edición (codeManipulation.applyWorkspaceEdit) en modo "chat".

Se añadió una verificación en StepExecutor.runStep para usar el modo del contexto y, si es "chat", prevenir la ejecución de herramientas de edición usando una nueva función isToolAllowedInMode en ToolExecutor.

Se implementó el switch en la UI del webview (htmlTemplate.ts, main.js) para que el usuario pueda cambiar el modo y enviar el comando a la extensión.

WebviewProvider maneja el comando setAssistantMode llamando a ConfigurationManager y envía el modo inicial al webview al cargarse.

Se realizaron mejoras generales de estabilidad (DB init) y se añadieron comentarios sobre extensibilidad.

Con esto, tu sistema ahora tiene un modo "solo lectura" funcional, controlado por el usuario, que se comunica a través de la arquitectura de contexto hasta el planificador y el ejecutor de pasos, garantizando que no se realicen modificaciones inesperadas en el código en modo "chat".