// src/core/ComponentFactory.ts
import * as vscode from 'vscode';
import { VSCodeContext } from '../shared/types'; // Asegúrate que este tipo esté bien definido
import { eventBus } from '../features/events/EventBus'; // Singleton
import { EventLogger } from '../features/events/EventLogger';
import { ModelManager } from '../features/ai/ModelManager';
import { PromptManager } from '../features/ai/promptManager';
import { ToolRegistry } from '../features/tools/ToolRegistry';
import { WindsurfGraph } from '../features/ai/ReActGraph';
import { ChatMemoryManager } from '../features/memory/ChatMemoryManager';
import { ChatStateManager } from './ChatStateManager';
import { ChatService } from './ChatService';
import { SessionManager } from '@vscode/webView/SessionManager';
import { WebviewProvider } from '@vscode/webView/webviewProvider';


export class ComponentFactory {
    private static chatServiceInstance: ChatService;
    private static sessionManagerInstance: SessionManager;
    private static eventLoggerInstance: EventLogger;
    private static outputChannelInstance: vscode.OutputChannel;

    private static getOutputChannel(): vscode.OutputChannel {
        if (!this.outputChannelInstance) {
            this.outputChannelInstance = vscode.window.createOutputChannel("Extension Assistant Log");
        }
        return this.outputChannelInstance;
    }
    
    // SessionManager ahora depende del ExtensionContext
    public static getSessionManager(extensionContext: vscode.ExtensionContext): SessionManager {
        if (!this.sessionManagerInstance) {
            this.sessionManagerInstance = new SessionManager(extensionContext);
        }
        return this.sessionManagerInstance;
    }

    public static getEventLogger(vscodeContext: VSCodeContext): EventLogger {
        if (!this.eventLoggerInstance) {
            this.eventLoggerInstance = new EventLogger(vscodeContext);
        }
        return this.eventLoggerInstance;
    }

    public static getChatService(extensionContext: vscode.ExtensionContext): ChatService {
        if (!this.chatServiceInstance) {
            const outputChannel = this.getOutputChannel();
            const customVSCodeContext: VSCodeContext = {
                extensionUri: extensionContext.extensionUri,
                extensionPath: extensionContext.extensionPath,
                subscriptions: extensionContext.subscriptions,
                outputChannel: outputChannel, // Usar la instancia compartida
                state: extensionContext.globalState, // Memento para estado global
                // workspaceState: extensionContext.workspaceState, // Si necesitas estado de workspace
                // activeTextEditor: vscode.window.activeTextEditor, // Puede cambiar, obtener al momento
                // workspaceFolders: vscode.workspace.workspaceFolders, // Puede cambiar
            };

            // Inicializar EventLogger (se suscribe al eventBus)
            this.getEventLogger(customVSCodeContext);
            
            // SessionManager es necesario para WebviewProvider y WebviewMessageHandler
            // No directamente para ChatService, pero es parte del "core" de la comunicación.
            // Lo obtenemos aquí para asegurar que se cree con el contexto.
            this.getSessionManager(extensionContext);


            const chatMemoryManager = new ChatMemoryManager(extensionContext);
            const modelManager = new ModelManager(/* Podría necesitar config o API keys del context */);
            const promptManager = new PromptManager();
            const toolRegistry = new ToolRegistry(/* Podría necesitar VSCodeContext para herramientas específicas */);
            const chatStateManager = new ChatStateManager();
            const reactGraph = new WindsurfGraph(modelManager, toolRegistry, promptManager);

            this.chatServiceInstance = new ChatService(
                customVSCodeContext,
                eventBus, // Singleton
                chatMemoryManager,
                reactGraph,
                chatStateManager,
                toolRegistry
                // SessionManager no se pasa a ChatService directamente
            );
            console.log('[ComponentFactory] ChatService instance created.');
            outputChannel.appendLine('[ComponentFactory] ChatService instance created.');
        }
        return this.chatServiceInstance;
    }

    // Método para obtener el WebviewProvider, asegurando que SessionManager se inicialice correctamente
    public static getWebviewProvider(extensionContext: vscode.ExtensionContext): WebviewProvider {
        const chatService = this.getChatService(extensionContext);
        // SessionManager ya se habrá inicializado a través de getChatService o getSessionManager
        // WebviewProvider necesita su propia instancia de SessionManager, o compartir la global.
        // Por ahora, asumamos que WebviewProvider crea su propia instancia pero usa el mismo contexto.
        // Mejor: pasar la instancia de SessionManager creada por ComponentFactory.
        // const sessionManager = this.getSessionManager(extensionContext);

        // WebviewProvider necesita el ChatService y el ExtensionContext para su SessionManager
        return new WebviewProvider(
            extensionContext.extensionUri,
            chatService,
            extensionContext // Pasar el contexto completo para que WebviewProvider cree/use SessionManager
        );
    }
}