import * as vscode from 'vscode';
import { ConfigurationManager } from '../../core/config/ConfigurationManager';
import { ChatService } from '../../services/chatService';
import { getHtmlContent } from './templates/htmlTemplate';
import { OrchestratorService } from '../../orchestrator/orchestratorService';
import { ACTIONS, MESSAGE_TYPES } from '../../core/config/constants';

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

	constructor(
		private readonly extensionUri: vscode.Uri,
		private readonly chatService: ChatService,
		private readonly orchestratorService: OrchestratorService // Obligatorio
	) {
		this.configManager = ConfigurationManager.getInstance();
		
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
		if (!message?.trim()) return;
		
		// Notificar al frontend que estamos procesando
		this.sendMessageToWebview({
			type: MESSAGE_TYPES.PROCESSING,
			status: 'start'
		});
		
		try {
			// Usar el orquestador de manera directa
			const result = await this.orchestratorService.orchestrateRequest(message);
			
			// Extraer la respuesta del resultado de orquestación
			const response = this.extractResponseFromOrchestrationResult(result);
			
			// Añadir el mensaje del usuario a la UI
			this.sendMessageToWebview({
				type: MESSAGE_TYPES.MESSAGE,
				role: 'user',
				content: message
			});
			
			// Enviar respuesta a la UI
			this.sendMessageToWebview({
				type: MESSAGE_TYPES.MESSAGE,
				role: 'assistant',
				content: response
			});
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : 'Error al procesar el mensaje';
			console.error(`[WebviewProvider] Error en orquestación:`, error);
			this.sendMessageToWebview({
				type: MESSAGE_TYPES.ERROR,
				error: errorMessage
			});
		} finally {
			// Notificar al frontend que terminamos de procesar
			this.sendMessageToWebview({
				type: MESSAGE_TYPES.PROCESSING,
				status: 'stop'
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
			const chat = await this.chatService.loadChat(chatId, loadMessages);
			this.sendMessageToWebview({
				type: MESSAGE_TYPES.CHAT_LOADED,
				chat
			});
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
			const history = await this.chatService.getChatList();
			this.sendMessageToWebview({
				type: MESSAGE_TYPES.HISTORY_LOADED,
				history
			});
		} catch (error) {
			console.error('[WebviewProvider] Error al cargar historial:', error);
			this.sendMessageToWebview({
				type: MESSAGE_TYPES.ERROR,
				error: error instanceof Error ? error.message : 'Error al cargar el historial'
			});
		}
	}
	
	/**
	 * Maneja la creación de un nuevo chat
	 */
	private async handleNewChat(): Promise<void> {
		try {
			const newChat = await this.chatService.createNewChat();
			this.sendMessageToWebview({
				type: MESSAGE_TYPES.CHAT_CREATED,
				chat: newChat
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
				const chatList = await this.chatService.getChatList();
				this.sendMessageToWebview({
					type: MESSAGE_TYPES.HISTORY_LOADED,
					history: chatList
				});
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