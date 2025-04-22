import * as vscode from 'vscode';
import { MemoryAgent } from '../agents/memory/memoryAgent';
import { ModelAgent } from '../agents/model/modelAgent';

/**
 * Tipos de comandos soportados por la aplicación
 */
export type CommandType = 
  | 'createNewChat'
  | 'loadChat'
  | 'setModel'
  | 'processUserMessage';

/**
 * Payload para los diferentes tipos de comandos
 */
export interface CommandPayload {
  // Payload para cargar un chat
  chatId?: string;
  
  // Payload para cambiar el modelo
  modelType?: 'ollama' | 'gemini';
  
  // Payload para procesar un mensaje de usuario
  message?: string;
}

/**
 * Resultado de la ejecución de un comando
 */
export interface CommandResult {
  success: boolean;
  data?: any;
  error?: string;
}

/**
 * Interfaz para el componente que maneja la comunicación con la UI
 */
export interface UIProvider {
  sendMessageToWebview(message: any): void;
}

/**
 * CommandManager es responsable de ejecutar los comandos de la aplicación
 * Centraliza la lógica de comandos y desacopla el orquestador de los detalles de implementación
 */
export class CommandManager {
  constructor(
    private memoryAgent: MemoryAgent,
    private modelAgent: ModelAgent,
    private uiProvider: UIProvider
  ) {}

  /**
   * Ejecuta un comando
   * @param commandType El tipo de comando a ejecutar
   * @param payload Los datos asociados al comando
   * @returns El resultado de la ejecución del comando
   */
  public async executeCommand(commandType: CommandType, payload?: CommandPayload): Promise<CommandResult> {
    console.log(`CommandManager ejecutando comando: ${commandType}`, payload);
    
    try {
      switch (commandType) {
        case 'createNewChat':
          return await this.createNewChat();
          
        case 'loadChat':
          return await this.loadChat(payload?.chatId);
          
        case 'setModel':
          return this.setModel(payload?.modelType);
          
        case 'processUserMessage':
          return await this.processUserMessage(payload?.message);
          
        default:
          return {
            success: false,
            error: `Comando desconocido: ${commandType}`
          };
      }
    } catch (error: any) {
      console.error(`Error al ejecutar comando ${commandType}:`, error);
      return {
        success: false,
        error: error.message || 'Error desconocido'
      };
    }
  }

  /**
   * Crea un nuevo chat
   */
  private async createNewChat(): Promise<CommandResult> {
    try {
      await this.memoryAgent.createNewChat(
        (response) => this.uiProvider.sendMessageToWebview(response)
      );
      return {
        success: true
      };
    } catch (error: any) {
      return {
        success: false,
        error: `Error al crear nuevo chat: ${error.message}`
      };
    }
  }

  /**
   * Carga un chat existente
   * @param chatId ID del chat a cargar
   */
  private async loadChat(chatId?: string): Promise<CommandResult> {
    if (!chatId) {
      return {
        success: false,
        error: 'Se requiere chatId para cargar un chat'
      };
    }
    
    try {
      const chat = await this.memoryAgent.loadChat(chatId);
      return {
        success: true,
        data: chat
      };
    } catch (error: any) {
      return {
        success: false,
        error: `Error al cargar chat: ${error.message}`
      };
    }
  }

  /**
   * Cambia el modelo de lenguaje
   * @param modelType Tipo de modelo a utilizar
   */
  private setModel(modelType?: 'ollama' | 'gemini'): CommandResult {
    if (!modelType) {
      return {
        success: false,
        error: 'Se requiere modelType para cambiar el modelo'
      };
    }
    
    try {
      this.modelAgent.setModel(modelType);
      return {
        success: true,
        data: { modelType }
      };
    } catch (error: any) {
      return {
        success: false,
        error: `Error al cambiar modelo: ${error.message}`
      };
    }
  }

  /**
   * Procesa un mensaje del usuario
   * @param message Mensaje del usuario
   */
  private async processUserMessage(message?: string): Promise<CommandResult> {
    if (!message) {
      return {
        success: false,
        error: 'Se requiere un mensaje para procesar'
      };
    }
    
    try {
      // 1. Generar respuesta usando el agente de modelo
      const assistantResponse = await this.modelAgent.generateResponse(message);
      
      // 2. Almacenar el par de mensajes en la memoria
      await this.memoryAgent.processMessagePair(message, assistantResponse);
      
      // 3. Notificar a la UI
      this.uiProvider.sendMessageToWebview({
        type: 'receiveMessage',
        message: assistantResponse,
        isUser: false
      });
      
      return {
        success: true,
        data: { response: assistantResponse }
      };
    } catch (error: any) {
      // Notificar error a la UI
      this.uiProvider.sendMessageToWebview({
        type: 'receiveMessage',
        message: `Error al procesar la solicitud: ${error.message || 'Desconocido'}`,
        isUser: false,
        isError: true
      });
      
      return {
        success: false,
        error: `Error al procesar mensaje: ${error.message}`
      };
    }
  }
}
