// src/ui/uiBridge/UIBridge.ts

import * as vscode from 'vscode'; // Needed for some types if tools return VS Code objects
import { ChatInteractor } from '../../services/ChatInteractor'; // Dependency
import { ConfigurationManager } from '../../config/ConfigurationManager'; // Dependency
import { ValidatorService } from '../../validation/ValidatorService'; // Dependency
import { EventEmitterService } from '../../events/EventEmitterService'; // Dependency
import { LangChainToolAdapter } from '../../tools/core/LangChainToolAdapter'; // Dependency for direct tool calls
// Import UI schema types
import {
    WebviewMessage, ChatMessageInputPayload, CommandMessageInputPayload,
    LoadChatCommandPayload, UpdateChatTitleCommandPayload, DeleteChatCommandPayload,
    SwitchModelCommandPayload, GetFileContentsCommandPayload, UIUpdateMessagePayload
} from '../../validation/schemas/ui/messages';
import { Chat, ChatMessage } from '../../store/interfaces/entities'; // Need Chat type


/**
 * Intermediary service between the WebviewProvider (UI) and the backend services.
 * Handles incoming UI messages, validates them, calls appropriate services,
 * listens to backend events, and formats/sends updates back to the UI.
 */
export class UIBridge {
    private chatInteractor: ChatInteractor;
    private configManager: ConfigurationManager;
    private validatorService: ValidatorService;
    private eventEmitter: EventEmitterService;
    private toolAdapter: LangChainToolAdapter; // Used for direct UI-initiated tool calls


    constructor(
        chatInteractor: ChatInteractor,
        configManager: ConfigurationManager,
        validatorService: ValidatorService,
        eventEmitter: EventEmitterService,
        toolAdapter: LangChainToolAdapter // Inject the tool adapter
    ) {
        this.chatInteractor = chatInteractor;
        this.configManager = configManager;
        this.validatorService = validatorService;
        this.eventEmitter = eventEmitter;
        this.toolAdapter = toolAdapter;
        console.log('[UIBridge] Initialized.');

        this.setupBackendEventListeners(); // Set up listeners for events from backend services
    }

    /**
     * Handles a message received from the webview.
     * Validates the message and dispatches to the appropriate handler.
     */
    async handleWebviewMessage(message: any): Promise<void> {
        let validatedMessage: WebviewMessage | null = null;
        try {
            // 1. Validate the incoming message structure and payload
            validatedMessage = this.validatorService.validateAndLog<WebviewMessage>(message, 'WebviewMessageSchema');

            if (!validatedMessage) {
                 // validateAndLog handles logging/events for validation failure
                 console.warn('[UIBridge] Received invalid message format from webview.');
                 // Optionally send an error back to the webview
                 this.postMessageToWebview('error', { message: 'Invalid message format received.' });
                 return;
            }

            // 2. Use a type guard to narrow the type
            const messageType = validatedMessage.type;
            
            // 3. Dispatch based on message type
            switch (messageType) {
                case 'chat':
                    await this._handleChatMessage(validatedMessage.payload);
                    break;
                case 'command':
                    await this._handleCommand(validatedMessage.payload);
                    break;
                // Add other message types here if needed
                default:
                    console.warn(`[UIBridge] Received message with unknown type: ${messageType}`);
                    this.postMessageToWebview('error', { message: `Unknown message type: ${messageType}` });
                    break;
            }

        } catch (error: any) {
             // Catch errors that might occur *after* initial validation but within handlers
             console.error('[UIBridge] Error handling webview message:', error);
             // Send a generic error back to the webview
             const errorMessage = error instanceof Error ? error.message : String(error);
             this.postMessageToWebview('error', {
                  message: `An internal error occurred while processing your request: ${errorMessage}`,
                  details: error.stack || errorMessage
             });
        }
    }

    /**
     * Handles an incoming 'chat' message payload.
     * Delegates to the ChatInteractor.
     */
    private async _handleChatMessage(payload: ChatMessageInputPayload): Promise<void> {
        console.log('[UIBridge] Handling chat message...');
        // ChatInteractor handles the full turn, including saving messages and running orchestration
        // It will return the final assistant message
        const currentChatId = this.chatInteractor.getActiveChatId(); // Get current chat ID from Interactor
        const assistantMessage = await this.chatInteractor.sendUserMessage(
            currentChatId,
            payload.text,
            payload.files
        );

        // The ChatInteractor/ConversationManager/PersistenceService will emit events
        // like 'chatMessageAdded' for both user and assistant messages.
        // The UIBridge listens for these events (in setupBackendEventListeners)
        // to update the UI reactively. We don't send a direct 'chatResponse' here.
    }

    /**
     * Handles an incoming 'command' message payload.
     * Validates the command and dispatches to the specific command handler.
     */
    private async _handleCommand(payload: CommandMessageInputPayload): Promise<void> {
        console.log(`[UIBridge] Handling command: ${payload.command}`);
        const { command, params } = payload;

        try {
            // Validate specific command payloads if needed
            // Note: validateAndLog handles logging internally
            let validatedParams: any = params; // Start with the raw params

            switch (command) {
                case 'getChatList':
                    // No specific params validation needed for getChatList command payload itself
                    await this._handleGetChatList();
                    break;

                case 'loadChat':
                    // Validate loadChat specific payload
                    validatedParams = this.validatorService.validateAndLog<LoadChatCommandPayload>(payload, 'LoadChatCommandPayloadSchema');
                     if (!validatedParams) return; // Validation failed, validateAndLog already handled it
                    await this._handleLoadChat(validatedParams.params.chatId);
                    break;

                case 'updateChatTitle':
                     validatedParams = this.validatorService.validateAndLog<UpdateChatTitleCommandPayload>(payload, 'UpdateChatTitleCommandPayloadSchema');
                      if (!validatedParams) return;
                    await this._handleUpdateChatTitle(validatedParams.params.chatId, validatedParams.params.title);
                    break;

                case 'deleteChat':
                    validatedParams = this.validatorService.validateAndLog<DeleteChatCommandPayload>(payload, 'DeleteChatCommandPayloadSchema');
                     if (!validatedParams) return;
                    await this._handleDeleteChat(validatedParams.params.chatId);
                    break;

                case 'switchModel':
                     validatedParams = this.validatorService.validateAndLog<SwitchModelCommandPayload>(payload, 'SwitchModelCommandPayloadSchema');
                     if (!validatedParams) return;
                    await this._handleSwitchModel(validatedParams.params.modelType);
                    break;

                case 'showHistory':
                    // No specific params validation needed
                    await this._handleShowHistory();
                    break;

                case 'getProjectFiles':
                    // No specific params validation needed for getProjectFiles command payload itself
                    await this._handleGetProjectFiles();
                    break;

                case 'getFileContents':
                    validatedParams = this.validatorService.validateAndLog<GetFileContentsCommandPayload>(payload, 'GetFileContentsCommandPayloadSchema');
                     if (!validatedParams) return;
                    await this._handleGetFileContents(validatedParams.params.filePath);
                    break;

                case 'newChat':
                     // No specific params validation needed
                    await this._handleNewChat();
                    break;

                case 'openSettings':
                     // No specific params validation needed
                    await this._handleOpenSettings();
                    break;

                // Add handlers for other commands
                default:
                    console.warn(`[UIBridge] Received unknown command: ${command}`);
                    this.postMessageToWebview('error', { message: `Unknown command: ${command}` });
                    break;
            }

        } catch (error: any) {
             // Catch errors specific to command handling
             console.error(`[UIBridge] Error handling command "${command}":`, error);
             const errorMessage = error instanceof Error ? error.message : String(error);
              this.postMessageToWebview('error', {
                   message: `Error executing command "${command}": ${errorMessage}`,
                   details: error.stack || errorMessage
              });
        }
    }


    // --- Specific Command Handlers ---

    private async _handleGetChatList(): Promise<void> {
         const chats = await this.chatInteractor.getChatList();
         // Use an event to send updates to the webview provider
         this.postMessageToWebview('chatListUpdated', { chats });
    }

    private async _handleLoadChat(chatId: string): Promise<void> {
        const messages = await this.chatInteractor.loadConversation(chatId);
         // Use an event to send updates to the webview provider
         this.postMessageToWebview('chatLoaded', { messages, chatId });
    }

    private async _handleUpdateChatTitle(chatId: string, title: string): Promise<void> {
         await this.chatInteractor.updateConversationTitle(chatId, title);
         // The ChatPersistenceService already emits 'chatTitleUpdated'
         // UIBridge listener setupBackendEventListeners will catch this and update the UI
    }

    private async _handleDeleteChat(chatId: string): Promise<void> {
         await this.chatInteractor.deleteConversation(chatId);
         // The ConversationService already emits 'chatDeleted'
         // UIBridge listener setupBackendEventListeners will catch this and update the UI
         // If the deleted chat was active, the interactor/manager will prepare a new chat state.
         // The UI should detect this via subsequent events (e.g., chat list update).
    }

    private async _handleSwitchModel(modelType: 'ollama' | 'gemini'): Promise<void> {
         // The ModelManager handles the actual switch and config persistence
         await this.configManager.setModelType(modelType); // Use configManager to persist
         // ModelManager doesn't automatically update its *instance* on config change.
         // The PromptService gets the model type from ConfigManager when needed.
         // We just need to signal the UI that the model has changed.
         this.postMessageToWebview('modelChanged', { modelType });
    }

    private async _handleShowHistory(): Promise<void> {
         // Request the chat list and signal the UI to show the history panel
         await this._handleGetChatList(); // Ensure list is fresh
         this.postMessageToWebview('historyRequested', {});
    }

    private async _handleGetProjectFiles(): Promise<void> {
        try {
            // Use the ToolAdapter directly for UI-initiated tool calls
            // runTool method handles validation and events
            const files = await this.toolAdapter.runTool('filesystem.getWorkspaceFiles', {});
            this.postMessageToWebview('projectFiles', { files });
        } catch (error: any) {
            console.error('[UIBridge] Error getting project files:', error);
            this.postMessageToWebview('projectFiles', { files: [], error: error.message || String(error) });
        }
    }

     private async _handleGetFileContents(filePath: string): Promise<void> {
         try {
             // Use the ToolAdapter directly for UI-initiated tool calls
             const content = await this.toolAdapter.runTool('filesystem.getFileContents', { filePath });
             this.postMessageToWebview('fileContents', { filePath, content });
         } catch (error: any) {
            console.error(`[UIBridge] Error getting file contents for ${filePath}:`, error);
             this.postMessageToWebview('fileContents', { filePath, content: `Error loading file: ${error.message || String(error)}`, error: error.message || String(error) });
         }
     }

     private async _handleNewChat(): Promise<void> {
         // Prepare state in ChatInteractor/ConversationManager
         this.chatInteractor.prepareNewConversation();
         // Signal UI to clear current chat view and show 'New Chat' state
         this.postMessageToWebview('newChat', {});
         // Also refresh chat list so the UI can update the list entry if needed
         // The ChatInteractor prepareNewConversation might trigger a list update event,
         // or we could explicitly call _handleGetChatList here if needed.
         // Let's rely on the event listener for 'chatMetadataUpdated' or similar.
     }

     private async _handleOpenSettings(): Promise<void> {
          await vscode.commands.executeCommand('workbench.action.openSettings', '@ext:user.extensionassistant');
     }

    // --- Backend Event Listeners ---

    private setupBackendEventListeners(): void {
        // Listen for events from Persistence Services
        this.eventEmitter.on('chatCreated', (chat: Chat) => {
            console.debug(`[UIBridge] Received chatCreated event for ${chat.id}.`);
             // Trigger chat list update in UI
            this._handleGetChatList(); // Re-fetch and send list
        });

        this.eventEmitter.on('chatDeleted', ({ chatId }: { chatId: string }) => {
             console.debug(`[UIBridge] Received chatDeleted event for ${chatId}.`);
             // Trigger chat list update in UI
            this._handleGetChatList(); // Re-fetch and send list
        });

         this.eventEmitter.on('chatTitleUpdated', ({ chatId, title }: { chatId: string, title: string }) => {
             console.debug(`[UIBridge] Received chatTitleUpdated event for ${chatId}.`);
             // Trigger chat list update in UI
            this._handleGetChatList(); // Re-fetch and send list
         });

         this.eventEmitter.on('chatMetadataUpdated', ({ chatId }: { chatId: string }) => {
              console.debug(`[UIBridge] Received chatMetadataUpdated event for ${chatId}.`);
              // Trigger chat list update in UI
             this._handleGetChatList(); // Re-fetch and send list
         });

        this.eventEmitter.on('chatMessageAdded', ({ chatId, message }: { chatId: string, message: ChatMessage }) => {
            console.debug(`[UIBridge] Received chatMessageAdded event for chat ${chatId}.`);
             // If the added message is for the currently active chat in the UI, send it.
             // UIBridge needs to know which chat is currently active in the UI.
             // ChatInteractor.getActiveChatId() gives the active backend chat.
             // Need to compare this with the chat currently displayed in the webview.
             // WebviewProvider or UIBridge needs to store/know this. Let's make UIBridge store it.
             if (chatId === this.chatInteractor.getActiveChatId()) {
                  this.postMessageToWebview('messageAdded', { message });
             }
             // If not the active chat, the chat list update should signal changes
        });


        // Listen for events from Tool/Prompt Execution and Trace Service
        // These can be used for progress updates or detailed logging in the UI
         this.eventEmitter.on('toolCalled', ({ toolName, params, traceId, stepId }: any) => {
             console.debug(`[UIBridge] Event: toolCalled - ${toolName}`, { traceId, stepId });
              this.postMessageToWebview('backendEvent', { type: 'toolCalled', toolName, traceId, stepId });
             // Potentially send detailed params if safe
         });

         this.eventEmitter.on('toolCompleted', ({ toolName, result, traceId, stepId }: any) => {
             console.debug(`[UIBridge] Event: toolCompleted - ${toolName}`, { traceId, stepId });
              this.postMessageToWebview('backendEvent', { type: 'toolCompleted', toolName, traceId, stepId });
              // Potentially send result preview if safe and useful
         });

         this.eventEmitter.on('toolFailed', ({ toolName, error, traceId, stepId }: any) => {
             console.debug(`[UIBridge] Event: toolFailed - ${toolName}`, { traceId, stepId, error: error?.message || error });
              this.postMessageToWebview('backendEvent', { type: 'toolFailed', toolName, traceId, stepId, error: error?.message || String(error) });
         });

          this.eventEmitter.on('promptCalled', ({ promptType, variables, traceId, stepId }: any) => {
              console.debug(`[UIBridge] Event: promptCalled - ${promptType}`, { traceId, stepId });
               this.postMessageToWebview('backendEvent', { type: 'promptCalled', promptType, traceId, stepId });
              // Potentially send variable info if safe/useful
          });

          this.eventEmitter.on('promptCompleted', ({ promptType, result, traceId, stepId }: any) => {
              console.debug(`[UIBridge] Event: promptCompleted - ${promptType}`, { traceId, stepId });
               this.postMessageToWebview('backendEvent', { type: 'promptCompleted', promptType, traceId, stepId });
              // Potentially send result preview if safe/useful
          });

          this.eventEmitter.on('promptFailed', ({ promptType, error, traceId, stepId }: any) => {
              console.debug(`[UIBridge] Event: promptFailed - ${promptType}`, { traceId, stepId, error: error?.message || error });
               this.postMessageToWebview('backendEvent', { type: 'promptFailed', promptType, traceId, stepId, error: error?.message || String(error) });
          });

          // Validation errors
          this.eventEmitter.on('validationFailed', ({ schemaName, data, error, fullError }: any) => {
              console.warn(`[UIBridge] Event: validationFailed - ${schemaName}`, { error });
               this.postMessageToWebview('backendEvent', { type: 'validationFailed', schemaName, error: error?.message || String(error) });
               // Be careful not to send sensitive data/full error object to UI unless necessary and secure
          });
           this.eventEmitter.on('validatorConfigError', ({ schemaName, data, error }: any) => {
              console.error(`[UIBridge] Event: validatorConfigError - ${schemaName}`, { error });
               this.postMessageToWebview('backendEvent', { type: 'validatorConfigError', schemaName, error: error?.message || String(error) });
          });


           // Trace completion/failure
           this.eventEmitter.on('traceCompleted', ({ traceId, name, finalResult }: any) => {
                console.debug(`[UIBridge] Event: traceCompleted - ${name}`, { traceId });
                this.postMessageToWebview('backendEvent', { type: 'traceCompleted', traceId, name });
                // Final message is sent via chatMessageAdded event already
           });

           this.eventEmitter.on('traceFailed', ({ traceId, name, error }: any) => {
               console.debug(`[UIBridge] Event: traceFailed - ${name}`, { traceId, error: error?.message || error });
               this.postMessageToWebview('backendEvent', { type: 'traceFailed', traceId, name, error: error?.message || String(error) });
                // Error message should ideally be added to chat history by Orchestrator/ConversationManager
           });


        // Add listeners for other events from other services if needed (e.g., ProjectInfo updated)
    }

     // --- Method to send messages *to* the webview ---

     /**
      * Emits an event that the WebviewProvider should listen for to post messages to the webview.
      * @param type Type of UI update message.
      * @param payload The data payload for the UI.
      */
     postMessageToWebview(type: string, payload: any): void {
         const messagePayload: UIUpdateMessagePayload = { type, payload };
          // Validate the outgoing payload structure if needed (optional, but good practice)
         // this.validatorService.validateAndLog(messagePayload, 'UIUpdateMessagePayloadSchema'); // Need to define schema if used

         this.eventEmitter.emit('ui:postMessage', messagePayload);
         console.debug(`[UIBridge] Emitted 'ui:postMessage' event: ${type}`);
     }


    dispose(): void {
        // Clean up event listeners if necessary (EventEmitter3 manages this if context is used, but explicit cleanup is safer)
        // This service is disposed by the ServiceFactory, so listeners might be implicitly removed
        this.eventEmitter.removeAllListeners('chatCreated'); // Example cleanup
        this.eventEmitter.removeAllListeners('chatDeleted');
        this.eventEmitter.removeAllListeners('chatTitleUpdated');
         this.eventEmitter.removeAllListeners('chatMetadataUpdated');
        this.eventEmitter.removeAllListeners('chatMessageAdded');
         this.eventEmitter.removeAllListeners('toolCalled');
         this.eventEmitter.removeAllListeners('toolCompleted');
         this.eventEmitter.removeAllListeners('toolFailed');
          this.eventEmitter.removeAllListeners('promptCalled');
          this.eventEmitter.removeAllListeners('promptCompleted');
          this.eventEmitter.removeAllListeners('promptFailed');
          this.eventEmitter.removeAllListeners('validationFailed');
          this.eventEmitter.removeAllListeners('validatorConfigError');
           this.eventEmitter.removeAllListeners('traceCompleted');
           this.eventEmitter.removeAllListeners('traceFailed');
        this.eventEmitter.removeAllListeners('ui:postMessage'); // The WebviewProvider's listener

        console.log('[UIBridge] Disposed.');
    }
}