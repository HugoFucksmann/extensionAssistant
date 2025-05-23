import { WebviewMessage } from '../../ui/types/WebviewTypes';
import { ChatHandler } from './ChatHandler';
import { FileHandler } from './FileHandler';
import { SessionHandler } from './SessionHandler';


export class MessageRouter {
    private handlers: Map<string, (message: WebviewMessage) => Promise<void>>;
    private chatHandler: ChatHandler;
    private sessionHandler: SessionHandler;
    private fileHandler: FileHandler;

    constructor(
        private postMessage: (type: string, payload: any) => void
    ) {
        this.handlers = new Map();
        // TODO: You must pass actual instances from your extension entrypoint!
        // Example:
        // import { SessionManager } from '../webView/SessionManager';
        // import { ChatService } from '../../core/ChatService';
        // const sessionManager = new SessionManager(extensionContext);
        // const chatService = new ChatService(...);
        // For now, throw error to force correct wiring:
        throw new Error('You must instantiate MessageRouter with valid ChatService and SessionManager instances from your extension entrypoint.');

        // this.chatHandler = new ChatHandler(postMessage, chatService, sessionManager);
        // this.sessionHandler = new SessionHandler(postMessage, sessionManager);
        // this.fileHandler = new FileHandler(postMessage);
        
        this.initializeHandlers();
    }

    private initializeHandlers(): void {
        // Chat-related handlers
        this.handlers.set('webview:sendMessage', this.chatHandler.handleUserMessage.bind(this.chatHandler));
        this.handlers.set('webview:requestNewChat', this.chatHandler.handleNewChat.bind(this.chatHandler));
        this.handlers.set('webview:loadChat', this.chatHandler.handleLoadChat.bind(this.chatHandler));
        this.handlers.set('webview:clearChat', this.chatHandler.handleClearChat.bind(this.chatHandler));

        // Session-related handlers
        this.handlers.set('webview:ready', this.sessionHandler.handleUIReady.bind(this.sessionHandler));
        this.handlers.set('webview:switchModel', this.sessionHandler.handleSwitchModel.bind(this.sessionHandler));

        // File-related handlers
        this.handlers.set('webview:getFileContents', this.fileHandler.handleGetFileContents.bind(this.fileHandler));
        this.handlers.set('webview:getProjectFiles', this.fileHandler.handleGetProjectFiles.bind(this.fileHandler));
    }

    public async routeMessage(message: WebviewMessage): Promise<void> {
        try {
            const handler = this.handlers.get(message.type);
            if (!handler) {
                throw new Error(`Unhandled message type: ${message.type}`);
            }
            await handler(message);
        } catch (error: any) {
            console.error('[MessageRouter] Error handling message:', error);
            this.postMessage('extension:systemError', {
                message: error.message || 'Unknown error in message router',
                source: 'MessageRouter',
                messageType: message.type
            });
        }
    }

    public dispose(): void {
        this.chatHandler.dispose();
        this.sessionHandler.dispose();
        this.fileHandler.dispose();
    }
}
