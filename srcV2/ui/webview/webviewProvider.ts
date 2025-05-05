import * as vscode from 'vscode';
import { ConfigurationManager } from '../../core/config/ConfigurationManager';
import { getHtmlContent } from './templates/htmlTemplate';
import { OrchestratorService } from '../../orchestrator/orchestratorService';
import { ACTIONS, MESSAGE_TYPES } from '../../core/config/constants';
import { ChatMemory } from '../../core/storage/memory';
import { SQLiteStorage } from '../../core/storage/db/SQLiteStorage';

/**
 * Implementación del proveedor de webview
 * Simplificada para usar exclusivamente el flujo de orquestación
 */
export class WebviewProvider implements vscode.WebviewViewProvider {
	private view?: vscode.WebviewView;
	private messageQueue: any[] = []; // Cola para almacenar mensajes antes de que el webview esté listo
	private webviewReady = false;
	private stateUnsubscribers: (() => void)[] = [];
	private configManager: ConfigurationManager;
	private chatMemory: ChatMemory;

	constructor(
		private readonly extensionUri: vscode.Uri,
		private readonly orchestratorService: OrchestratorService,
		private readonly storage: SQLiteStorage
	) {
		this.configManager = ConfigurationManager.getInstance();
		this.chatMemory = new ChatMemory(storage);
		// Suscribirse a cambios de configuración relevantes
		this.stateUnsubscribers.push(
			this.configManager.onChange('modelType', this.handleModelChange.bind(this))
		);
	}

	/**
	 * Método requerido por la interfaz WebviewViewProvider
	 * Se llama cuando VS Code necesita crear o restaurar la vista del webview
	 */
	public resolveWebviewView(
		webviewView: vscode.WebviewView,
		context: vscode.WebviewViewResolveContext,
		_token: vscode.CancellationToken,
	): void | Thenable<void> {
		this.view = webviewView;

		// Configurar opciones del webview
		this.configureWebviewOptions(webviewView);

		// Establecer el contenido HTML
		webviewView.webview.html = getHtmlContent(this.extensionUri, webviewView.webview);
		
		// Configurar el listener para mensajes del webview
		this.setupMessageListener(webviewView);

		// Registrar un listener para saber cuando el webview está descargado/eliminado
		webviewView.onDidDispose(() => {
			this.webviewReady = false;
		});

		// Marcar el webview como listo y procesar mensajes pendientes
		this.webviewReady = true;
		this.processMessageQueue();
		
		// Notificar al webview sobre el modelo actual
		this.notifyCurrentModel();
		
		// Cargar historial de chats si está habilitado
		this.loadChatHistory();
	}

	/**
	 * Configura las opciones del webview
	 */
	private configureWebviewOptions(webviewView: vscode.WebviewView): void {
		webviewView.webview.options = {
			enableScripts: true,
			localResourceRoots: [
				vscode.Uri.joinPath(this.extensionUri, 'out'),
				vscode.Uri.joinPath(this.extensionUri, 'media')
			]
		};
	}
	
	/**
	 * Configura el listener para mensajes del webview
	 */
	private setupMessageListener(webviewView: vscode.WebviewView): void {
		webviewView.webview.onDidReceiveMessage(async (message) => {
			const { command, payload } = message;
			
			try {
				console.log(`[WebviewProvider] Mensaje recibido: ${command}`, payload);
				
				switch (command) {
					case ACTIONS.SEND_MESSAGE:
						await this.handleSendMessage(payload.message);
						break;
						
					case ACTIONS.SET_MODEL:
						await this.handleSetModel(payload.modelType);
						break;
						
					case ACTIONS.LOAD_CHAT:
						await this.handleLoadChat(payload.chatId, payload.loadMessages);
						break;
						
					case ACTIONS.LOAD_HISTORY:
						await this.handleLoadHistory();
						break;
						
					case ACTIONS.NEW_CHAT:
						await this.handleNewChat();
						break;
						
					default:
						console.warn(`[WebviewProvider] Comando desconocido: ${command}`);
				}
			} catch (error) {
				console.error(`[WebviewProvider] Error al procesar mensaje ${command}:`, error);
				this.sendMessageToWebview({
					type: MESSAGE_TYPES.ERROR,
					error: error instanceof Error ? error.message : 'Error desconocido'
				});
			}
		});
	}
	
	/**
	 * Maneja el envío de un mensaje de chat
	 * Simplificado para usar exclusivamente el flujo de orquestación
	 */
	private async handleSendMessage(message: string): Promise<void> {
		try {
			// Mostrar el mensaje del usuario en la UI inmediatamente
			this.sendMessageToWebview({
				type: MESSAGE_TYPES.USER_MESSAGE,
				message: {
					id: `user_${Date.now()}`,
					text: message,
					role: 'user',
					timestamp: new Date().toISOString()
				}
			});
			
			// Indicar que estamos procesando
			this.sendMessageToWebview({
				type: MESSAGE_TYPES.PROCESSING,
				processing: true
			});
			
			console.log(`[WebviewProvider] Usando orquestador para procesar mensaje`);
			const result = await this.orchestratorService.orchestrateRequest(message);
			
			if (result.success) {
				// Extraer la respuesta del resultado de la orquestación
				const response = this.extractResponseFromOrchestrationResult(result);
				
				// Mostrar la respuesta en la UI
				this.sendMessageToWebview({
					type: MESSAGE_TYPES.ASSISTANT_MESSAGE,
					message: {
						id: `assistant_${Date.now()}`,
						text: response,
						role: 'assistant',
						timestamp: new Date().toISOString(),
						modelType: this.configManager.getModelType()
					}
				});
			} else {
				// Mostrar error
				this.sendMessageToWebview({
					type: MESSAGE_TYPES.ERROR,
					error: result.error?.message || 'Error desconocido en la orquestación'
				});
			}
		} catch (error) {
			console.error(`[WebviewProvider] Error al procesar mensaje:`, error);
			this.sendMessageToWebview({
				type: MESSAGE_TYPES.ERROR,
				error: error instanceof Error ? error.message : 'Error desconocido'
			});
		} finally {
			// Indicar que terminamos de procesar
			this.sendMessageToWebview({
				type: MESSAGE_TYPES.PROCESSING,
				processing: false
			});
		}
	}

	/**
	 * Extrae la respuesta del resultado de orquestación
	 */
	private extractResponseFromOrchestrationResult(result: any): string {
		// Si el resultado es exitoso, intentamos extraer el resultado final
		if (result.success && result.finalResult) {
			// Si finalResult es un string, lo usamos directamente
			if (typeof result.finalResult === 'string') {
				return result.finalResult;
			}
			
			// Si hay un módulo de comunicación que generó un resultado
			if (result.moduleResult && typeof result.moduleResult === 'string') {
				return result.moduleResult;
			}
			
			// Si hay resultados de pasos ejecutados, intentamos usar el último
			if (Array.isArray(result.steps) && result.steps.length > 0) {
				const lastStep = result.steps[result.steps.length - 1];
				if (lastStep?.result && typeof lastStep.result === 'string') {
					return lastStep.result;
				}
				
				// Si el último paso tiene un objeto result con una propiedad message o text
				if (lastStep?.result) {
					if (typeof lastStep.result.message === 'string') {
						return lastStep.result.message;
					}
					if (typeof lastStep.result.text === 'string') {
						return lastStep.result.text;
					}
				}
			}
			
			// Como último recurso, convertimos finalResult a string JSON
			return JSON.stringify(result.finalResult);
		}
		
		// Si hay un error, lo mostramos
		if (result.error && result.error.message) {
			return `Error: ${result.error.message}`;
		}
		
		// Si todo falla, devolver un mensaje genérico
		return 'No se pudo procesar la solicitud correctamente';
	}
	
	/**
	 * Maneja el cambio de modelo
	 */
	private async handleSetModel(modelType: string): Promise<void> {
		try {
			await this.configManager.setModelType(modelType as any);
			this.sendMessageToWebview({
				type: MESSAGE_TYPES.MODEL_CHANGED,
				modelType
			});
		} catch (error) {
			this.sendMessageToWebview({
				type: MESSAGE_TYPES.ERROR,
				error: error instanceof Error ? error.message : 'Error al cambiar el modelo'
			});
		}
	}
	
	/**
	 * Maneja una notificación de cambio de modelo
	 */
	private handleModelChange(_key: string, modelType: string): void {
		this.sendMessageToWebview({
			type: MESSAGE_TYPES.MODEL_CHANGED,
			modelType
		});
	}
	
	/**
	 * Maneja la carga de un chat específico
	 */
	private async handleLoadChat(chatId: string, loadMessages: boolean): Promise<void> {
		try {
			// Implementación temporal: notificar que esta funcionalidad está en desarrollo
			this.sendMessageToWebview({
				type: MESSAGE_TYPES.ERROR,
				error: 'La carga de chats anteriores está en desarrollo en el nuevo flujo de orquestación'
			});
			
			// TODO: Implementar la carga de chats a través del orquestador
			// const result = await this.orchestratorService.loadChat(chatId, loadMessages);
			// this.sendMessageToWebview({
			//   type: MESSAGE_TYPES.CHAT_LOADED,
			//   chat: result
			// });
		} catch (error) {
			this.sendMessageToWebview({
				type: MESSAGE_TYPES.ERROR,
				error: error instanceof Error ? error.message : 'Error al cargar el chat'
			});
		}
	}
	
	/**
	 * Maneja la solicitud de cargar el historial de chats
	 */
	private async handleLoadHistory(): Promise<void> {
		try {
		  const chats = await this.chatMemory.getChatList();
		  
		  this.sendMessageToWebview({
			type: 'historyLoaded', // Asegurar que está en MESSAGE_TYPES
			history: chats.map(chat => ({
			  id: chat.id,
			  title: chat.title || `Chat ${new Date(chat.timestamp).toLocaleString()}`,
			  timestamp: chat.timestamp,
			  preview: chat.preview || chat.lastMessagePreview || ''
			}))
		  });
		} catch (error) {
		  console.error('[WebviewProvider] Error al cargar historial:', error);
		  this.sendMessageToWebview({
			type: 'ERROR',
			error: error instanceof Error ? error.message : 'Error al cargar el historial'
		  });
		}
	  }
	
	/**
	 * Maneja la creación de un nuevo chat
	 */
	private async handleNewChat(): Promise<void> {
		try {
			this.sendMessageToWebview({
			  type: MESSAGE_TYPES.CHAT_CREATED, // Usar la constante correcta
			  chat: {
				id: `chat_${Date.now()}`,
				title: 'Nuevo chat',
				timestamp: new Date().toISOString(),
				messages: [] // Asegurar que el array esté vacío
			  }
			});
		  } catch (error) {
		  this.sendMessageToWebview({
			type: MESSAGE_TYPES.ERROR,
			error: error instanceof Error ? error.message : 'Error al crear nuevo chat'
		  });
		}
	  }
	
	/**
	 * Notifica el modelo actual al webview
	 */
	private notifyCurrentModel(): void {
		const modelType = this.configManager.getModelType();
		this.sendMessageToWebview({
			type: MESSAGE_TYPES.MODEL_INFO,
			modelType
		});
	}
	
	/**
	 * Carga el historial de chats si la persistencia está habilitada
	 */
	private async loadChatHistory(): Promise<void> {
		if (this.configManager.getPersistenceEnabled()) {
			try {
				// Implementación temporal: no cargar historial automáticamente
				console.log('[WebviewProvider] Carga de historial deshabilitada en el nuevo flujo de orquestación');
				
				// TODO: Implementar la carga del historial a través del orquestador
				// const chatList = await this.orchestratorService.getChatList();
				// this.sendMessageToWebview({
				//   type: MESSAGE_TYPES.HISTORY_LOADED,
				//   history: chatList
				// });
			} catch (error) {
				console.error('[WebviewProvider] Error al cargar historial:', error);
			}
		}
	}

	/**
	 * Envía un mensaje al webview
	 */
	public sendMessageToWebview(message: any): void {
		if (this.webviewReady && this.view) {
			this.view.webview.postMessage(message);
		} else {
			this.messageQueue.push(message);
		}
	}

	/**
	 * Procesa la cola de mensajes pendientes
	 */
	private processMessageQueue(): void {
		if (this.webviewReady && this.view && this.messageQueue.length) {
			this.messageQueue.forEach(m => this.view!.webview.postMessage(m));
			this.messageQueue = [];
		}
	}

	/**
	 * Limpia los recursos al desactivar la extensión
	 */
	public dispose(): void {
		// Cancelar todas las suscripciones
		this.stateUnsubscribers.forEach(unsubscribe => unsubscribe());
		this.stateUnsubscribers = [];
	}
}