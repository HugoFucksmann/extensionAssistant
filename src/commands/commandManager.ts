import * as vscode from 'vscode';
import { MemoryAgent } from '../agents/memory/memoryAgent';
import { OrchestratorAgent } from '../agents/orchestratorAgent';
import { UIProvider } from '../interfaces';
import { BaseAPI } from '../models/baseAPI';

/**
 * Tipos de comandos soportados por la aplicación
 */
export type CommandType = 
  | 'createNewChat'
  | 'loadChat'
  | 'setModel';

/**
 * Payload para los diferentes tipos de comandos
 */
export interface CommandPayload {
  // Payload para cargar un chat
  chatId?: string;
  
  // Payload para cambiar el modelo
  modelType?: 'ollama' | 'gemini';
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
 * CommandManager es responsable de ejecutar los comandos de la aplicación
 * Centraliza la lógica de comandos y desacopla el orquestador de los detalles de implementación
 */
export class CommandManager {
  private modelAPI: BaseAPI;
  private currentModelType: 'ollama' | 'gemini' = 'gemini';
  
  constructor(
    private memoryAgent: MemoryAgent,
    private orchestratorAgent: OrchestratorAgent,
    private uiProvider: UIProvider
  ) {
    // Inicializar BaseAPI con el modelo predeterminado
    this.modelAPI = new BaseAPI(this.currentModelType);
    
    // Pasar la instancia de BaseAPI al orchestratorAgent
    this.orchestratorAgent.setModelAPI(this.modelAPI);
  }

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
    console.log(`CommandManager.setModel llamado con modelType: ${modelType}`);
    
    if (!modelType) {
      console.error('CommandManager.setModel: Se requiere modelType para cambiar el modelo');
      return {
        success: false,
        error: 'Se requiere modelType para cambiar el modelo'
      };
    }
    
    try {
      console.log(`CommandManager: Modelo actual antes del cambio: ${this.currentModelType}`);
      
      // Cambiar el modelo directamente en BaseAPI
      this.modelAPI.setModel(modelType);
      
      // Actualizar el tipo de modelo actual
      this.currentModelType = modelType;
      
      console.log(`CommandManager: Modelo cambiado a: ${this.currentModelType}`);
      
      // Notificar a la UI del cambio de modelo
      this.uiProvider.sendMessageToWebview({
        type: 'modelChanged',
        modelType
      });
      
      console.log(`CommandManager: Notificación enviada a la UI sobre cambio de modelo a: ${modelType}`);
      
      return {
        success: true,
        data: { modelType }
      };
    } catch (error: any) {
      console.error(`CommandManager: Error al cambiar modelo:`, error);
      return {
        success: false,
        error: `Error al cambiar modelo: ${error.message}`
      };
    }
  }
  
  /**
   * Obtiene el tipo de modelo actual
   * @returns El tipo de modelo actual
   */
  public getCurrentModel(): 'ollama' | 'gemini' {
    return this.currentModelType;
  }
  
  /**
   * Obtiene la instancia de BaseAPI
   * @returns La instancia de BaseAPI
   */
  public getModelAPI(): BaseAPI {
    return this.modelAPI;
  }
}
