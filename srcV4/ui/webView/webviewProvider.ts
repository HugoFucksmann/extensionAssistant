/**
 * Proveedor de webview para la arquitectura Windsurf
 * Gestiona la interfaz de usuario y la comunicación con el controlador Windsurf
 */

import * as vscode from 'vscode';
// Asegurarse de que htmlTemplate exporta correctamente la función getHtmlContent
import * as htmlTemplate from './htmlTemplate';
import { WindsurfController } from '../../core/controller/windsurfController';
import { EventBus } from '../../shared/events/core/eventBus';
import { 
  EventType, 
  WindsurfEvent, 
  ConversationEventPayload, 
  ReasoningEventPayload, 
  ToolExecutionEventPayload, 
  ResponseEventPayload, 
  ErrorEventPayload
} from '../../shared/events/types/eventTypes';
import { WindsurfEvents } from '../../shared/events';


/**
 * Proveedor de webview para la extensión
 * Implementa la interfaz WebviewViewProvider de VS Code
 */
export class WebviewProvider implements vscode.WebviewViewProvider {
  private view?: vscode.WebviewView;
  private disposables: vscode.Disposable[] = [];
  private currentChatId: string = '';
  private eventBus: EventBus;
  private eventListenerIds: string[] = [];
  private processingStatus: {
    phase: string;
    status: string;
    startTime?: number;
    tools?: { 
      name: string; 
      status: string; 
      startTime?: number; 
      endTime?: number;
      parameters?: Record<string, any>;
      result?: any;
      error?: string;
    }[];
    metrics?: {
      totalDuration?: number;
      reasoningTime?: number;
      actionTime?: number;
      reflectionTime?: number;
      toolExecutions?: number;
      averageToolTime?: number;
      memoryUsage?: number;
    };
  } = { phase: '', status: '', tools: [], metrics: {} };
  
  /**
   * Actualiza el estado de procesamiento en la UI
   */
  private updateProcessingStatus(): void {
    // Calcular métricas actualizadas
    if (this.processingStatus.startTime) {
      const now = Date.now();
      const totalDuration = now - this.processingStatus.startTime;
      
      // Calcular tiempos de herramientas
      let toolExecutions = 0;
      let totalToolTime = 0;
      
      if (this.processingStatus.tools && this.processingStatus.tools.length > 0) {
        toolExecutions = this.processingStatus.tools.length;
        
        // Sumar tiempos de herramientas completadas
        totalToolTime = this.processingStatus.tools
          .filter(tool => tool.startTime && tool.endTime)
          .reduce((sum, tool) => sum + (tool.endTime! - tool.startTime!), 0);
      }
      
      // Actualizar métricas basadas en la fase actual
      const metrics: {
        totalDuration: number;
        toolExecutions: number;
        averageToolTime: number;
        memoryUsage: number;
        reasoningTime?: number;
        actionTime?: number;
        reflectionTime?: number;
      } = {
        totalDuration,
        toolExecutions,
        averageToolTime: toolExecutions > 0 ? totalToolTime / toolExecutions : 0,
        memoryUsage: this.processingStatus.metrics?.memoryUsage || Math.round(Math.random() * 50 + 50),
        reasoningTime: 0,
        actionTime: 0,
        reflectionTime: 0
      };
      
      // Asignar tiempos a cada fase según la fase actual
      switch (this.processingStatus.phase) {
        case 'reasoning':
          metrics.reasoningTime = totalDuration;
          metrics.actionTime = 0;
          metrics.reflectionTime = 0;
          break;
        case 'action':
          metrics.reasoningTime = totalDuration * 0.4; // Estimación
          metrics.actionTime = totalDuration * 0.6;
          metrics.reflectionTime = 0;
          break;
        case 'reflection':
          metrics.reasoningTime = totalDuration * 0.3; // Estimación
          metrics.actionTime = totalDuration * 0.5;
          metrics.reflectionTime = totalDuration * 0.2;
          break;
        case 'correction':
          metrics.reasoningTime = totalDuration * 0.25; // Estimación
          metrics.actionTime = totalDuration * 0.4;
          metrics.reflectionTime = totalDuration * 0.35;
          break;
      }
      
      this.processingStatus.metrics = metrics;
    }
    
    // Enviar actualización a la UI
    this.postMessage('processingStatusUpdate', this.processingStatus);
  }
  
  constructor(
    private readonly extensionUri: vscode.Uri,
    private readonly controller: WindsurfController
  ) {
    // Generar un ID de chat inicial
    this.currentChatId = this.generateChatId();
    
    // Obtener la instancia del EventBus
    this.eventBus = EventBus.getInstance();
    
    // Suscribirse a eventos del controlador (legacy)
    this.subscribeToControllerEvents();
    
    // Suscribirse a eventos del nuevo sistema de eventos
    this.subscribeToEventBus();
    
    console.log('[WebviewProvider] Initialized with advanced event handling');
    this.eventBus.debug('[WebviewProvider] Initialized with advanced event handling');
  }
  
  /**
   * Suscribe este proveedor a los eventos emitidos por el controlador (legacy)
   * Nota: Este método se mantiene para compatibilidad con código existente
   */
  private subscribeToControllerEvents(): void {
    // Suscribirse a eventos de respuesta generada
    this.controller.events.on(WindsurfEvents.RESPONSE_GENERATED, (data: any) => {
      if (data.chatId === this.currentChatId) {
        // Actualizar la UI con la respuesta generada
        this.postMessage('messageAdded', {
          sender: 'assistant',
          content: data.response,
          timestamp: Date.now()
        });
      }
    });
    
    // Suscribirse a eventos de error
    this.controller.events.on(WindsurfEvents.ERROR_OCCURRED, (data: any) => {
      if (data.chatId === this.currentChatId) {
        // Mostrar error en la UI
        this.postMessage('error', {
          message: data.error
        });
        
        // Finalizar indicador de carga si estaba activo
        this.postMessage('processingFinished', {});
      }
    });
    
    // Eventos del ciclo ReAct para mostrar progreso
    this.controller.events.on(WindsurfEvents.REASONING_STARTED, (data: any) => {
      if (data.chatId === this.currentChatId) {
        this.postMessage('processingUpdate', { phase: 'reasoning', status: 'started' });
      }
    });
    
    this.controller.events.on(WindsurfEvents.ACTION_STARTED, (data: any) => {
      if (data.chatId === this.currentChatId) {
        this.postMessage('processingUpdate', { phase: 'action', status: 'started' });
      }
    });
    
    this.controller.events.on(WindsurfEvents.REFLECTION_STARTED, (data: any) => {
      if (data.chatId === this.currentChatId) {
        this.postMessage('processingUpdate', { phase: 'reflection', status: 'started' });
      }
    });
    
    // Eventos adicionales para mostrar progreso detallado
    // Nota: Usamos el EventBus para estos eventos ya que no están definidos en WindsurfEvents
    this.eventBus.on(EventType.TOOL_EXECUTION_STARTED, (event) => {
      const payload = event.payload as ToolExecutionEventPayload;
      if (!payload.chatId || payload.chatId === this.currentChatId) {
        this.postMessage('processingUpdate', { 
          phase: 'tool', 
          status: 'started',
          tool: payload.tool,
          parameters: payload.parameters
        });
      }
    });
    
    this.eventBus.on(EventType.TOOL_EXECUTION_COMPLETED, (event) => {
      const payload = event.payload as ToolExecutionEventPayload;
      if (!payload.chatId || payload.chatId === this.currentChatId) {
        this.postMessage('processingUpdate', { 
          phase: 'tool', 
          status: 'completed',
          tool: payload.tool,
          result: payload.result
        });
      }
    });
  }
  
  /**
   * Suscribe este proveedor a los eventos emitidos por el EventBus
   * Este método utiliza el nuevo sistema de eventos para mostrar información detallada
   * sobre el progreso de la ejecución del grafo ReAct
   */
  private subscribeToEventBus(): void {
    // Filtro para eventos del chat actual
    const chatFilter = { 
      custom: (event: WindsurfEvent) => {
        return !event.payload.chatId || event.payload.chatId === this.currentChatId;
      }
    };
    
    // Eventos del ciclo de vida de la conversación
    this.eventListenerIds.push(
      this.eventBus.on(EventType.CONVERSATION_STARTED, (event) => {
        this.processingStatus = { phase: 'starting', status: 'active', startTime: Date.now() };
        this.postMessage('conversationStarted', {
          chatId: event.payload.chatId,
          timestamp: event.timestamp
        });
      }, chatFilter)
    );
    
    this.eventListenerIds.push(
      this.eventBus.on(EventType.CONVERSATION_ENDED, (event) => {
        this.processingStatus = { phase: 'completed', status: 'inactive' };
        const payload = event.payload as ConversationEventPayload;
        this.postMessage('conversationEnded', {
          chatId: payload.chatId,
          success: payload.success,
          duration: payload.duration,
          timestamp: event.timestamp
        });
        
        // Actualizar la UI para mostrar que el procesamiento ha terminado
        this.postMessage('processingFinished', {
          duration: payload.duration
        });
      }, chatFilter)
    );
    
    // Eventos de razonamiento
    this.eventListenerIds.push(
      this.eventBus.on(EventType.REASONING_STARTED, (event) => {
        // Inicializar métricas al comenzar el razonamiento
        const metrics = {
          totalDuration: 0,
          reasoningTime: 0,
          actionTime: 0,
          reflectionTime: 0,
          toolExecutions: 0,
          averageToolTime: 0,
          memoryUsage: Math.round(Math.random() * 50 + 50) // Simulación para demostración
        };
        
        this.processingStatus = {
          ...this.processingStatus,
          phase: 'reasoning',
          status: 'active',
          startTime: event.timestamp,
          metrics
        };
        
        this.updateProcessingStatus();
        
        const payload = event.payload as ReasoningEventPayload;
        this.postMessage('processingUpdate', {
          phase: 'reasoning',
          status: 'started',
          details: payload.phase || 'analyzing'
        });
      }, chatFilter)
    );
    
    this.eventListenerIds.push(
      this.eventBus.on(EventType.REASONING_COMPLETED, (event) => {
        // Actualizar el estado de procesamiento
        this.processingStatus.status = 'completed';
        
        // Si hay métricas, actualizar el tiempo de razonamiento
        if (this.processingStatus.metrics && this.processingStatus.startTime) {
          const duration = event.timestamp - this.processingStatus.startTime;
          this.processingStatus.metrics.reasoningTime = duration;
        }
        
        // Actualizar la UI
        this.updateProcessingStatus();
        
        const payload = event.payload as ReasoningEventPayload;
        this.postMessage('processingUpdate', {
          phase: 'reasoning',
          status: 'completed',
          details: payload.phase || 'analyzing',
          result: payload.result
        });
      }, chatFilter)
    );
    
    // Eventos de ejecución de herramientas
    this.eventListenerIds.push(
      this.eventBus.on(EventType.TOOL_EXECUTION_STARTED, (event) => {
        // Inicializar el array de herramientas si no existe
        if (!this.processingStatus.tools) {
          this.processingStatus.tools = [];
        }
        
        const payload = event.payload as ToolExecutionEventPayload;
        
        // Añadir la herramienta al estado
        this.processingStatus.tools.push({
          name: payload.tool || 'unknown',
          status: 'started',
          startTime: event.timestamp
        });
        
        // Actualizar la UI
        this.updateProcessingStatus();
        
        this.postMessage('toolExecutionUpdate', {
          tool: payload.tool,
          status: 'started',
          parameters: payload.parameters
        });
      }, chatFilter)
    );
    
    this.eventListenerIds.push(
      this.eventBus.on(EventType.TOOL_EXECUTION_COMPLETED, (event) => {
        const payload = event.payload as ToolExecutionEventPayload;
        
        // Buscar la herramienta en el estado
        if (this.processingStatus.tools) {
          const toolIndex = this.processingStatus.tools.findIndex(
            tool => tool.name === payload.tool && tool.status === 'started'
          );
          
          if (toolIndex !== -1) {
            // Actualizar el estado de la herramienta
            this.processingStatus.tools[toolIndex].status = 'completed';
            this.processingStatus.tools[toolIndex].endTime = event.timestamp;
            this.processingStatus.tools[toolIndex].result = payload.result;
            
            // Actualizar métricas de herramientas
            if (this.processingStatus.metrics) {
              const toolDuration = event.timestamp - (this.processingStatus.tools[toolIndex].startTime || event.timestamp);
              
              // Incrementar contador de herramientas ejecutadas
              this.processingStatus.metrics.toolExecutions = (this.processingStatus.metrics.toolExecutions || 0) + 1;
              
              // Recalcular tiempo promedio de herramientas
              const completedTools = this.processingStatus.tools.filter(t => t.status === 'completed' && t.startTime && t.endTime);
              if (completedTools.length > 0) {
                const totalToolTime = completedTools.reduce((sum, tool) => sum + (tool.endTime! - tool.startTime!), 0);
                this.processingStatus.metrics.averageToolTime = totalToolTime / completedTools.length;
              }
            }
          }
        }
        
        // Actualizar la UI
        this.updateProcessingStatus();
        
        this.postMessage('toolExecutionUpdate', {
          tool: payload.tool,
          status: 'completed',
          result: payload.result
        });
      }, chatFilter)
    );
    
    this.eventListenerIds.push(
      this.eventBus.on(EventType.TOOL_EXECUTION_ERROR, (event) => {
        const payload = event.payload as ToolExecutionEventPayload;
        
        // Buscar la herramienta en el estado
        const toolIndex = this.processingStatus.tools?.findIndex(
          tool => tool.name === payload.tool && tool.status === 'started'
        );
        
        // Actualizar el estado de la herramienta
        if (toolIndex !== undefined && toolIndex >= 0 && this.processingStatus.tools) {
          this.processingStatus.tools[toolIndex].status = 'error';
          this.processingStatus.tools[toolIndex].endTime = event.timestamp;
        }
        
        // Actualizar la UI
        this.postMessage('toolExecutionUpdate', {
          tool: payload.tool,
          status: 'error',
          error: payload.error
        });
      }, chatFilter)
    );
    
    // Eventos de respuesta
    this.eventListenerIds.push(
      this.eventBus.on(EventType.RESPONSE_GENERATED, (event) => {
        // Actualizar la UI con la respuesta generada
        const payload = event.payload as ResponseEventPayload;
        
        // Calcular métricas finales de rendimiento
        const finalMetrics = this.processingStatus.metrics || {};
        if (this.processingStatus.startTime) {
          finalMetrics.totalDuration = event.timestamp - this.processingStatus.startTime;
        }
        
        // Crear una lista de herramientas ejecutadas para incluir en los metadatos
        const tools = this.processingStatus.tools?.map(tool => ({
          name: tool.name,
          status: tool.status,
          parameters: tool.parameters,
          result: tool.result,
          error: tool.error,
          startTime: tool.startTime,
          endTime: tool.endTime
        })) || [];
        
        this.postMessage('messageAdded', {
          sender: 'assistant',
          content: payload.response,
          timestamp: event.timestamp,
          metadata: {
            processingTime: payload.duration,
            success: payload.success,
            tools: tools.length > 0 ? tools : undefined,
            metrics: finalMetrics
          }
        });
        
        // Actualizar la UI una última vez con las métricas finales
        this.updateProcessingStatus();
        
        // Resetear el estado de procesamiento después de enviar la respuesta
        setTimeout(() => {
          this.processingStatus = { phase: '', status: 'inactive', tools: [], metrics: {} };
          this.updateProcessingStatus();
        }, 2000);
      }, chatFilter)
    );
    
    // Eventos de error
    this.eventListenerIds.push(
      this.eventBus.on(EventType.ERROR_OCCURRED, (event) => {
        // Mostrar error en la UI
        const payload = event.payload as ErrorEventPayload;
        this.postMessage('error', {
          message: payload.error,
          source: payload.source,
          timestamp: event.timestamp
        });
        
        // Finalizar indicador de carga si estaba activo
        this.postMessage('processingFinished', {
          error: true,
          errorMessage: payload.error
        });
      }, chatFilter)
    );
  }
  
  /**
   * Método requerido por la interfaz WebviewViewProvider
   * Se llama cuando la vista de webview se crea o se vuelve visible
   */
  public resolveWebviewView(webviewView: vscode.WebviewView): void {
    this.view = webviewView;
    
    // Configurar el webview
    this.configureWebview();
    
    // Configurar los manejadores de mensajes
    this.setupMessageHandlers();
    
    // Configurar el manejador de temas
    this.setupThemeHandler();
    
    // Enviar la lista de chats inicial
    this.sendChatList();
    
    console.log('[WebviewProvider] Webview resolved');
  }
  
  /**
   * Configura las opciones del webview y establece el HTML inicial
   */
  private configureWebview(): void {
    if (!this.view) return;
    
    // Configurar opciones del webview
    this.view.webview.options = {
      enableScripts: true,
      localResourceRoots: [this.extensionUri]
    };
    
    // Establecer el HTML inicial
    this.view.webview.html = htmlTemplate.getHtmlContent(this.extensionUri, this.view.webview);
  }
  
  /**
   * Configura los manejadores de mensajes desde el webview
   */
  private setupMessageHandlers(): void {
    if (!this.view) return;
    
    this.view.webview.onDidReceiveMessage(
      async (message) => {
        try {
          switch (message.type) {
            case 'sendMessage':
              await this.handleUserMessage(message.text, message.files || []);
              break;
              
            case 'newChat':
              this.handleNewChat();
              break;
              
            case 'loadChat':
              await this.handleLoadChat(message.chatId);
              break;
              
            case 'deleteChat':
              await this.handleDeleteChat(message.chatId);
              break;
              
            case 'updateChatTitle':
              await this.handleUpdateChatTitle(message.chatId, message.title);
              break;
              
            case 'getChats':
              await this.sendChatList();
              break;
              
            case 'getFileContents':
              await this.handleGetFileContents(message.filePath);
              break;
              
            case 'getProjectFiles':
              await this.handleGetProjectFiles();
              break;
              
            case 'switchModel':
              await this.handleSwitchModel(message.modelType);
              break;
          }
        } catch (error) {
          console.error('[WebviewProvider] Error handling message:', error);
          this.postMessage('error', {
            message: error instanceof Error ? error.message : 'An unknown error occurred'
          });
        }
      },
      null,
      this.disposables
    );
  }
  
  /**
   * Configura el manejador de cambios de tema
   */
  private setupThemeHandler(): void {
    if (!this.view) return;
    
    // Enviar el tema inicial
    this.postMessage('themeChanged', {
      isDarkMode: vscode.window.activeColorTheme.kind === vscode.ColorThemeKind.Dark
    });
    
    // Escuchar cambios de tema
    this.disposables.push(
      vscode.window.onDidChangeActiveColorTheme(theme => {
        this.postMessage('themeChanged', {
          isDarkMode: theme.kind === vscode.ColorThemeKind.Dark
        });
      })
    );
  }
  
  /**
   * Maneja el envío de un mensaje del usuario
   * @param text Texto del mensaje
   * @param files Archivos adjuntos (opcional)
   */
  private async handleUserMessage(text: string, files: string[] = []): Promise<void> {
    if (!text.trim() && files.length === 0) return;
    
    try {
      // Mostrar indicador de carga
      this.postMessage('processingStarted', {});
      
      // Agregar el mensaje del usuario a la UI
      this.postMessage('messageAdded', {
        sender: 'user',
        content: text,
        timestamp: Date.now()
      });
      
      // Preparar datos de contexto
      const contextData = {
        files,
        editorContext: await this.getEditorContext(),
        // Agregar cualquier otro dato de contexto necesario
      };
      
      // Procesar el mensaje con el controlador Windsurf
      // La respuesta se recibirá a través del evento RESPONSE_GENERATED
      // No necesitamos manejar la respuesta aquí ya que lo hacemos en subscribeToControllerEvents
      await this.controller.processUserMessage(
        this.currentChatId,
        text,
        contextData
      );
      
      // No es necesario actualizar la UI aquí, se hará a través de los eventos
      // Tampoco es necesario finalizar el indicador de carga, se hará cuando se reciba la respuesta
    } catch (error) {
      console.error('[WebviewProvider] Error processing message:', error);
      
      // Finalizar indicador de carga
      this.postMessage('processingFinished', {});
      
      // Mostrar error
      this.postMessage('error', {
        message: error instanceof Error ? error.message : 'An unknown error occurred'
      });
    }
  }
  
  /**
   * Obtiene el contexto del editor activo
   * @returns Contexto del editor
   */
  private async getEditorContext(): Promise<any> {
    const editor = vscode.window.activeTextEditor;
    if (!editor) return null;
    
    return {
      fileName: editor.document.fileName,
      languageId: editor.document.languageId,
      selection: editor.selection ? {
        start: { line: editor.selection.start.line, character: editor.selection.start.character },
        end: { line: editor.selection.end.line, character: editor.selection.end.character }
      } : null
    };
  }
  
  /**
   * Maneja la creación de un nuevo chat
   */
  private handleNewChat(): void {
    // Generar un nuevo ID de chat
    this.currentChatId = this.generateChatId();
    
    // Limpiar la UI
    this.postMessage('chatCleared', {});
    
    // Actualizar la lista de chats
    this.sendChatList();
  }
  
  /**
   * Maneja la carga de un chat existente
   * @param chatId ID del chat a cargar
   */
  private async handleLoadChat(chatId: string): Promise<void> {
    // Implementar cuando tengamos el sistema de persistencia
    // Por ahora, simplemente cambiar el ID de chat actual
    this.currentChatId = chatId;
    
    // Limpiar la UI
    this.postMessage('chatCleared', {});
    
    // Cargar los mensajes del chat (a implementar)
    // ...
  }
  
  /**
   * Maneja la eliminación de un chat
   * @param chatId ID del chat a eliminar
   */
  private async handleDeleteChat(chatId: string): Promise<void> {
    // Implementar cuando tengamos el sistema de persistencia
    // ...
    
    // Si el chat eliminado es el actual, crear uno nuevo
    if (chatId === this.currentChatId) {
      this.handleNewChat();
    }
    
    // Actualizar la lista de chats
    this.sendChatList();
  }
  
  /**
   * Maneja la actualización del título de un chat
   * @param chatId ID del chat
   * @param title Nuevo título
   */
  private async handleUpdateChatTitle(chatId: string, title: string): Promise<void> {
    // Implementar cuando tengamos el sistema de persistencia
    // ...
    
    // Actualizar la lista de chats
    this.sendChatList();
  }
  
  /**
   * Envía la lista de chats al webview
   */
  private async sendChatList(): Promise<void> {
    // Implementar cuando tengamos el sistema de persistencia
    // Por ahora, enviar solo el chat actual
    const chats = [{
      id: this.currentChatId,
      title: 'Nueva conversación',
      timestamp: Date.now(),
      preview: ''
    }];
    
    this.postMessage('chatsLoaded', { chats });
  }
  
  /**
   * Maneja la obtención del contenido de un archivo
   * @param filePath Ruta del archivo
   */
  private async handleGetFileContents(filePath: string): Promise<void> {
    try {
      // Usar el controlador para obtener el contenido del archivo
      // Esto debería usar una herramienta registrada en el ToolRegistry
      // Por ahora, implementación simple
      const uri = vscode.Uri.file(filePath);
      const content = await vscode.workspace.fs.readFile(uri);
      const text = new TextDecoder().decode(content);
      
      this.postMessage('fileContentsLoaded', {
        filePath,
        content: text
      });
    } catch (error) {
      console.error('[WebviewProvider] Error getting file contents:', error);
      this.postMessage('error', {
        message: `Error loading file: ${error instanceof Error ? error.message : String(error)}`
      });
    }
  }
  
  /**
   * Maneja la obtención de la lista de archivos del proyecto
   */
  private async handleGetProjectFiles(): Promise<void> {
    try {
      // Implementación simple para obtener archivos del workspace
      const files: string[] = [];
      
      if (vscode.workspace.workspaceFolders) {
        for (const folder of vscode.workspace.workspaceFolders) {
          const pattern = new vscode.RelativePattern(folder, '**/*');
          const uris = await vscode.workspace.findFiles(pattern, '**/node_modules/**');
          
          for (const uri of uris) {
            files.push(uri.fsPath);
          }
        }
      }
      
      this.postMessage('projectFilesLoaded', { files });
    } catch (error) {
      console.error('[WebviewProvider] Error getting project files:', error);
      this.postMessage('error', {
        message: `Error loading project files: ${error instanceof Error ? error.message : String(error)}`
      });
    }
  }
  
  /**
   * Maneja el cambio de modelo
   * @param modelType Tipo de modelo a usar
   */
  private async handleSwitchModel(modelType: string): Promise<void> {
    // Implementar cuando tengamos el sistema de configuración
    // ...
    
    this.postMessage('modelSwitched', { modelType });
  }
  
  /**
   * Envía un mensaje al webview
   * @param type Tipo de mensaje
   * @param payload Datos del mensaje
   */
  private postMessage(type: string, payload: any): void {
    if (this.view?.webview) {
      // Adaptar los tipos de mensajes para que sean compatibles con la interfaz de React
      let reactType = type;
      let reactPayload = payload;
      
      // Mapear los tipos de mensajes a los que espera la interfaz de React
      switch (type) {
        case 'messageAdded':
          reactType = payload.sender === 'assistant' ? 'chatResponse' : type;
          reactPayload = {
            chatId: payload.chatId || this.currentChatId,
            text: payload.content,
            timestamp: payload.timestamp
          };
          break;
          
        case 'processingUpdate':
        case 'toolExecutionUpdate':
        case 'processingFinished':
          // Estos mensajes se envían directamente a React con el mismo formato
          break;
          
        case 'error':
          reactType = 'error';
          reactPayload = {
            message: payload.message,
            source: payload.source || 'system'
          };
          break;
      }
      
      this.view.webview.postMessage({ type: reactType, payload: reactPayload });
    }
  }
  
  /**
   * Genera un ID único para un chat
   * @returns ID único
   */
  private generateChatId(): string {
    return `chat_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
  
  /**
   * Libera los recursos al desactivar la extensión
   */
  public dispose(): void {
    // Eliminar suscripciones a eventos del controlador (legacy)
    this.controller.events.removeAllListeners();
    
    // Eliminar suscripciones al EventBus
    this.eventListenerIds.forEach(id => this.eventBus.off(id));
    
    // Eliminar otros recursos
    this.disposables.forEach(disposable => disposable.dispose());
    
    this.eventBus.debug('[WebviewProvider] Disposed');
    console.log('[WebviewProvider] Disposed');
  }
}