// src/vscode/webView/WebviewProvider.ts - Enhanced with Mode Selection
import * as vscode from 'vscode';
import * as crypto from 'crypto';
import { getReactHtmlContent } from './htmlTemplate';
import { MessageFormatter } from '../formatters/MessageFormatter';
import { ApplicationLogicService } from 'src/core/ApplicationLogicService';
import { InternalEventDispatcher } from 'src/core/events/InternalEventDispatcher';
import { IConversationManager } from 'src/core/interfaces/IConversationManager';
import { EventType, WindsurfEvent } from '@features/events/eventTypes';
import { searchFiles } from '@shared/utils/pathUtils';
import { ComponentFactory } from 'src/core/ComponentFactory';

// Types and interfaces
export interface ProcessMessageOptions {
    files?: string[];
    mode?: 'simple' | 'planner' | 'supervised';
}

export interface ProcessMessageResult {
    success: boolean;
    error?: string;
    updatedState?: any;
}

interface WebviewState {
    currentChatId: string | null;
    activeChatId: string | null;
    isConnected: boolean;
    isLoading: boolean;
    currentModel: string | null;
    currentMode: 'simple' | 'planner' | 'supervised';
    availableModes: Array<{ id: string; name: string; description: string; enabled: boolean }>;
    lastError: string | null;
}

// Mode definitions for UI
const EXECUTION_MODES = [
    {
        id: 'simple',
        name: 'Simple',
        description: 'Ejecución directa paso a paso - rápida y eficiente',
        enabled: true
    },
    {
        id: 'planner',
        name: 'Planificador',
        description: 'Planificación detallada con replanificación automática',
        enabled: true // Enabled for Stage 4
    },
    {
        id: 'supervised',
        name: 'No Supervisado',
        description: 'Ejecución autónoma con plan validado',
        enabled: true // Will be enabled in a future Stage
    }
];

export class WebviewProvider implements vscode.WebviewViewProvider {
    private view?: vscode.WebviewView;
    private disposables: vscode.Disposable[] = [];
    private messageFormatter = new MessageFormatter();
    private eventSubscriptions: { unsubscribe: () => void }[] = [];

    // Enhanced state management with mode support
    private state: WebviewState = {
        currentChatId: null,
        activeChatId: null,
        isConnected: false,
        isLoading: false,
        currentModel: null,
        currentMode: 'simple', // Default to simple mode
        availableModes: EXECUTION_MODES,
        lastError: null
    };

    constructor(
        private readonly extensionUri: vscode.Uri,
        private readonly appLogicService: ApplicationLogicService,
        private readonly internalEventDispatcher: InternalEventDispatcher,
        private readonly conversationManager: IConversationManager
    ) { }

    public resolveWebviewView(webviewView: vscode.WebviewView): void {
        this.view = webviewView;
        this.setupWebview();
        this.setupMessageHandling();
        this.subscribeToEvents();
        this.state.isConnected = true;
    }

    private setupWebview(): void {
        if (!this.view) return;

        this.view.webview.options = {
            enableScripts: true,
            localResourceRoots: [this.extensionUri],
        };

        this.view.webview.html = getReactHtmlContent({
            scriptUri: this.view.webview.asWebviewUri(
                vscode.Uri.joinPath(this.extensionUri, 'out', 'webView', 'webview.js')
            ),
            nonce: this.getNonce()
        });
    }

    private setupMessageHandling(): void {
        if (!this.view) return;

        this.view.webview.onDidReceiveMessage(
            async (message) => {
                try {
                    await this.handleMessage(message);
                } catch (error) {
                    console.error('[WebviewProvider] Error handling message:', error);
                    this.handleError(error as Error, 'setupMessageHandling');
                }
            },
            null,
            this.disposables
        );
    }

    private async handleMessage(message: any): Promise<void> {
        switch (message.type) {
            case 'uiReady':
                await this.handleUIReady();
                break;
            case 'userMessageSent':
                await this.handleUserMessage(message.payload);
                break;
            case 'userInputReceived': // Handle response from UI interaction
                this.handleUserInputReceived(message.payload);
                break;
            case 'switchModel':
                await this.handleSwitchModel(message.payload);
                break;
            case 'switchExecutionMode':
                await this.handleSwitchExecutionMode(message.payload);
                break;
            case 'newChatRequestedByUI':
                this.startNewChat();
                break;
            case 'command':
                await this.handleCommand(message.payload);
                break;
            default:
                console.warn('[WebviewProvider] Unknown message type:', message.type);
                break;
        }
    }

    private handleUserInputReceived(payload: any): void {
        // Forward the user's response back into the system as an event
        this.internalEventDispatcher.dispatch(EventType.USER_INPUT_RECEIVED, {
            ...payload,
            timestamp: Date.now(),
            source: 'WebviewProvider'
        });
    }

    private async handleUIReady(): Promise<void> {
        let chatId = this.getActiveChatId();
        if (!chatId) {
            chatId = this.startNewChat();
        }

        if (!chatId) {
            this.handleSystemError('Failed to initialize chat session on UI ready.');
            return;
        }

        // Send available modes and current state to UI
        this.postMessage('modesUpdated', {
            availableModes: this.state.availableModes,
            currentMode: this.state.currentMode
        });
    }

    private async handleUserMessage(payload: {
        text: string;
        files?: string[];
        mode?: 'simple' | 'planner' | 'supervised';
    }): Promise<void> {
        if (!payload.text?.trim()) {
            this.handleSystemError('Message cannot be empty.');
            return;
        }

        let chatId = this.state.currentChatId;
        if (!chatId) {
            chatId = this.startNewChat();
        }

        const executionMode = payload.mode || this.state.currentMode;

        const modeConfig = this.state.availableModes.find(m => m.id === executionMode);
        if (!modeConfig || !modeConfig.enabled) {
            this.handleSystemError(`Execution mode '${executionMode}' is not available.`);
            return;
        }

        try {
            this.state.isLoading = true;
            this.state.currentMode = executionMode;

            this.postMessage('executionModeChanged', {
                mode: executionMode,
                modeName: modeConfig.name
            });

            const result = await this.processMessage(chatId, payload.text, {
                files: payload.files || [],
                mode: executionMode
            });

            if (!result.success) {
                this.handleSystemError(result.error || 'Message processing failed.');
            }
        } catch (error) {
            this.handleError(error as Error, 'handleUserMessage');
        }
    }

    private async handleSwitchExecutionMode(payload: { mode: 'simple' | 'planner' | 'supervised' }): Promise<void> {
        if (!payload?.mode) {
            this.handleSystemError('No execution mode specified.');
            return;
        }

        const modeConfig = this.state.availableModes.find(m => m.id === payload.mode);
        if (!modeConfig) {
            this.handleSystemError(`Unknown execution mode: ${payload.mode}`);
            return;
        }

        if (!modeConfig.enabled) {
            this.handleSystemError(`Execution mode '${payload.mode}' is not yet available.`);
            return;
        }

        try {
            this.state.currentMode = payload.mode;
            await this.appLogicService.setExecutionMode(payload.mode);
            this.postMessage('executionModeChanged', {
                mode: payload.mode,
                modeName: modeConfig.name
            });
            console.log(`[WebviewProvider] Execution mode changed to: ${payload.mode}`);
        } catch (error) {
            this.handleError(error as Error, 'handleSwitchExecutionMode');
        }
    }

    private async handleSwitchModel(payload: { modelType: string }): Promise<void> {
        if (!payload?.modelType) {
            this.handleSystemError('No model type specified.');
            return;
        }

        try {
            await this.switchModel(payload.modelType as 'gemini' | 'ollama');
            this.state.currentModel = payload.modelType;
            this.postMessage('modelSwitched', { modelType: payload.modelType });
        } catch (error) {
            this.handleError(error as Error, 'handleSwitchModel');
        }
    }

    private async handleCommand(payload: { command: string;[key: string]: any }): Promise<void> {
        switch (payload.command) {
            case 'getProjectFiles':
                await this.handleGetProjectFiles();
                break;
            case 'getExecutionModes':
                this.postMessage('modesUpdated', {
                    availableModes: this.state.availableModes,
                    currentMode: this.state.currentMode
                });
                break;
            default:
                console.warn('[WebviewProvider] Unknown command:', payload.command);
                break;
        }
    }

    private async handleGetProjectFiles(): Promise<void> {
        if (!this.state.currentChatId) {
            this.handleSystemError('Cannot get project files without an active chat session.');
            return;
        }

        try {
            const files = await this.getProjectFiles();
            this.postMessage('projectFiles', { files });
        } catch (error) {
            this.handleError(error as Error, 'handleGetProjectFiles');
        }
    }

    // Backend operations (enhanced with mode support)
    private async processMessage(
        chatId: string,
        text: string,
        options: ProcessMessageOptions = {}
    ): Promise<ProcessMessageResult> {
        try {
            const result = await this.appLogicService.processUserMessage(
                chatId,
                text,
                {
                    files: options.files || [],
                    executionMode: options.mode || this.state.currentMode
                }
            );

            return {
                success: result.success,
                error: result.error,
                updatedState: result.updatedState
            };
        } catch (error: any) {
            return {
                success: false,
                error: error.message || 'An unexpected error occurred during message processing.',
                updatedState: undefined
            };
        }
    }

    private createNewChat(): string {
        return this.conversationManager.createNewChat();
    }

    private getActiveChatId(): string | null {
        return this.conversationManager.getActiveChatId();
    }

    private async switchModel(modelType: 'gemini' | 'ollama'): Promise<void> {
        if (!modelType) {
            throw new Error('Model type is required');
        }

        if (modelType !== 'gemini' && modelType !== 'ollama') {
            throw new Error(`Unsupported model type: ${modelType}. Supported types are 'gemini' and 'ollama'`);
        }

        try {
            const modelManager = ComponentFactory.getModelManager();
            await modelManager.setActiveProvider(modelType);
            this.state.currentModel = modelType;
            this.postMessage('modelSwitched', { modelType });
        } catch (error) {
            console.error(`Failed to switch to model ${modelType}:`, error);
            throw new Error(`Failed to switch model: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    private async getProjectFiles(): Promise<any[]> {
        const searchResults = await searchFiles(vscode, undefined, 5000, false);
        return searchResults.map(result => ({
            path: result.relativePath,
            type: result.type,
            name: result.name,
            uri: result.uri
        }));
    }

    // Event handling (consolidated from EventSubscriber)
    private subscribeToEvents(): void {
        this.unsubscribeAllEvents();

        const eventTypes = [
            EventType.TOOL_EXECUTION_STARTED,
            EventType.TOOL_EXECUTION_COMPLETED,
            EventType.TOOL_EXECUTION_ERROR,
            EventType.SYSTEM_ERROR,
            EventType.RESPONSE_GENERATED,
            EventType.AGENT_PHASE_STARTED,
            EventType.AGENT_PHASE_COMPLETED,
            EventType.CONVERSATION_TURN_COMPLETED,
            EventType.USER_INTERACTION_REQUIRED, // Subscribe to interaction requests
        ];

        eventTypes.forEach(eventType => {
            this.eventSubscriptions.push(
                this.internalEventDispatcher.subscribe(eventType, (event: WindsurfEvent) =>
                    this.handleEvent(event)
                )
            );
        });
    }

    private handleEvent(event: WindsurfEvent): void {
        if (event.type !== EventType.SYSTEM_ERROR &&
            event.payload.chatId &&
            event.payload.chatId !== this.state.currentChatId) {
            return;
        }

        const result = this.processEvent(event);
        if (result) {
            this.postMessage(result.messageType, result.chatMessage);
        }
    }

    private processEvent(event: WindsurfEvent): { messageType: string; chatMessage: any } | null {
        const payload = event.payload as any;
        const baseMessage = this.messageFormatter.createBaseChatMessage(
            event.id,
            'system',
            payload.operationId
        );

        switch (event.type) {
            // ... (other cases unchanged)
            case EventType.USER_INTERACTION_REQUIRED:
                return this.handleUserInteractionRequired(event);
            case EventType.CONVERSATION_TURN_COMPLETED:
                this.state.isLoading = false;
                this.postMessage('turnCompleted', {});
                return null;
            default:
                // Fallback for existing event handlers
                const otherEvent = this.processOtherEvents(event, baseMessage);
                if (otherEvent) return otherEvent;
                return null;
        }
    }

    private handleUserInteractionRequired(event: WindsurfEvent) {
        // This event doesn't create a chat message, it triggers a UI element.
        // We post a specific message type that the webview front-end will listen for.
        this.postMessage('requestUserInteraction', event.payload);
        return null; // No chat message to display for this event
    }

    private processOtherEvents(event: WindsurfEvent, baseMessage: any): { messageType: string; chatMessage: any } | null {
        switch (event.type) {
            case EventType.TOOL_EXECUTION_STARTED:
                return this.handleToolExecutionStarted(event, baseMessage);
            case EventType.TOOL_EXECUTION_COMPLETED:
                return this.handleToolExecutionCompleted(event, baseMessage);
            case EventType.TOOL_EXECUTION_ERROR:
                return this.handleToolExecutionError(event, baseMessage);
            case EventType.RESPONSE_GENERATED:
                return this.handleResponseGenerated(event, baseMessage);
            case EventType.AGENT_PHASE_STARTED:
                return this.handleAgentPhaseStarted(event, baseMessage);
            case EventType.AGENT_PHASE_COMPLETED:
                return this.handleAgentPhaseCompleted(event, baseMessage);
            case EventType.SYSTEM_ERROR:
                return this.handleSystemErrorEvent(event, baseMessage);
            default:
                return null;
        }
    }

    private handleToolExecutionStarted(event: WindsurfEvent, baseMessage: any) {
        const payload = event.payload as any;
        baseMessage.content = this.messageFormatter.formatToolExecutionStarted(payload);
        baseMessage.metadata = {
            ...baseMessage.metadata,
            status: 'tool_executing',
            toolName: payload.toolName,
            toolInput: payload.parameters,
            executionMode: this.state.currentMode,
        };
        return { messageType: 'agentActionUpdate', chatMessage: baseMessage };
    }

    private handleToolExecutionCompleted(event: WindsurfEvent, baseMessage: any) {
        const payload = event.payload as any;
        const formatted = this.messageFormatter.formatToolExecutionCompleted(payload);
        baseMessage.content = formatted.content;
        baseMessage.metadata = {
            ...baseMessage.metadata,
            ...formatted.metadata,
            status: 'success',
            executionMode: this.state.currentMode,
        };
        return { messageType: 'agentActionUpdate', chatMessage: baseMessage };
    }

    private handleToolExecutionError(event: WindsurfEvent, baseMessage: any) {
        const payload = event.payload as any;
        const formatted = this.messageFormatter.formatToolExecutionError(payload);
        baseMessage.content = formatted.content;
        baseMessage.metadata = {
            ...baseMessage.metadata,
            ...formatted.metadata,
            status: 'error',
            executionMode: this.state.currentMode,
        };
        return { messageType: 'agentActionUpdate', chatMessage: baseMessage };
    }

    private handleResponseGenerated(event: WindsurfEvent, baseMessage: any) {
        const payload = event.payload as any;
        baseMessage.sender = 'assistant';
        baseMessage.content = this.messageFormatter.formatResponseGenerated(payload);
        baseMessage.metadata = {
            ...baseMessage.metadata,
            status: 'success',
            processingTime: payload.duration,
            executionMode: this.state.currentMode,
            ...(payload.metadata || {})
        };
        return { messageType: 'assistantResponse', chatMessage: baseMessage };
    }

    private handleAgentPhaseStarted(event: WindsurfEvent, baseMessage: any) {
        const payload = event.payload as any;
        baseMessage.content = this.messageFormatter.formatAgentPhaseStarted(payload);
        baseMessage.metadata = {
            ...baseMessage.metadata,
            status: 'phase_started',
            phase: payload.phase,
            iteration: payload.iteration,
            source: payload.source,
            executionMode: this.state.currentMode,
        };
        return { messageType: 'agentPhaseUpdate', chatMessage: baseMessage };
    }

    private handleAgentPhaseCompleted(event: WindsurfEvent, baseMessage: any) {
        const payload = event.payload as any;
        baseMessage.content = this.messageFormatter.formatAgentPhaseCompleted(payload);
        baseMessage.metadata = {
            ...baseMessage.metadata,
            status: 'phase_completed',
            phase: payload.phase,
            iteration: payload.iteration,
            source: payload.source,
            phaseData: payload.data,
            executionMode: this.state.currentMode,
        };
        return { messageType: 'agentPhaseUpdate', chatMessage: baseMessage };
    }

    private handleSystemErrorEvent(event: WindsurfEvent, baseMessage: any) {
        const payload = event.payload as any;
        baseMessage.content = this.messageFormatter.formatSystemError(payload);
        baseMessage.metadata = {
            ...baseMessage.metadata,
            status: 'error',
            details: payload.details,
            errorObject: payload.errorObject,
            source: payload.source,
            level: payload.level || 'error',
            executionMode: this.state.currentMode,
        };
        return { messageType: 'systemError', chatMessage: baseMessage };
    }

    // Public methods
    public startNewChat(): string {
        try {
            const newChatId = this.createNewChat();
            const activeChatId = this.getActiveChatId();

            this.state.currentChatId = newChatId;
            this.state.activeChatId = activeChatId;

            this.postMessage('newChatStarted', {
                chatId: newChatId,
                activeChatId: activeChatId
            });

            this.postMessage('sessionReady', {
                chatId: newChatId,
                messages: [],
                availableModes: this.state.availableModes,
                currentMode: this.state.currentMode
            });

            return newChatId;
        } catch (error) {
            this.handleError(error as Error, 'startNewChat');
            return '';
        }
    }

    public requestShowHistory(): void {
        this.postMessage('showHistory', {});
    }

    public getState() {
        return { ...this.state };
    }

    public getCurrentChatId(): string | null {
        return this.state.currentChatId;
    }

    public getCurrentExecutionMode(): 'simple' | 'planner' | 'supervised' {
        return this.state.currentMode;
    }

    public getAvailableModes(): Array<{ id: string; name: string; description: string; enabled: boolean }> {
        return [...this.state.availableModes];
    }

    // Future method for enabling additional modes in later stages
    public enableExecutionMode(mode: 'planner' | 'supervised'): void {
        const modeIndex = this.state.availableModes.findIndex(m => m.id === mode);
        if (modeIndex !== -1) {
            this.state.availableModes[modeIndex].enabled = true;
            this.postMessage('modesUpdated', {
                availableModes: this.state.availableModes,
                currentMode: this.state.currentMode
            });
        }
    }

    // Error handling (consolidated from ErrorManager)
    private handleSystemError(message: string, source?: string): void {
        this.state.lastError = message;
        this.internalEventDispatcher.dispatch(EventType.SYSTEM_ERROR, {
            message,
            level: 'error',
            chatId: this.state.currentChatId || undefined,
            source: `WebviewProvider.${source || 'unknown'}`,
            timestamp: Date.now(),
        });
    }

    private handleError(error: Error, source: string): void {
        console.error(`[WebviewProvider] Error in ${source}:`, error);
        this.handleSystemError(error.message || 'An unexpected error occurred.', source);
    }

    // Utility methods
    private postMessage(type: string, payload: any): void {
        if (this.view) {
            this.view.webview.postMessage({ type, payload });
        } else {
            console.warn(`[WebviewProvider] View not available. Cannot post message: ${type}`);
        }
    }

    private getNonce(): string {
        return crypto.randomBytes(16).toString('hex');
    }

    private unsubscribeAllEvents(): void {
        this.eventSubscriptions.forEach(s => s.unsubscribe());
        this.eventSubscriptions = [];
    }

    public dispose(): void {
        this.state.isConnected = false;
        this.disposables.forEach(d => d.dispose());
        this.unsubscribeAllEvents();
        console.log('[WebviewProvider] Disposed successfully');
    }
}