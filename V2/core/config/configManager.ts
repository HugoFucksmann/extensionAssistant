import * as vscode from 'vscode';
import { EventBus } from '../core/events/eventBus';
import { AppCommands } from '../config/constants';

/**
 * Interfaz para las configuraciones específicas del sistema de planificación
 */
export interface PlanningConfigOptions {
  maxSteps: number;
  allowedTools: string[];
  stepTimeout: number;
  showFeedback: 'minimal' | 'detailed' | 'verbose';
  autoRefineEnabled: boolean;
  recoveryAttempts: number;
  userConfirmation: boolean;
}

/**
 * Interfaz para configuraciones del modelo LLM
 */
export interface ModelConfigOptions {
  type: 'ollama' | 'gemini' | 'openai';
  temperature: number;
  maxTokens: number;
  contextWindow: number;
  streaming: boolean;
}

/**
 * Clase que centraliza la gestión de configuración de la extensión
 */
export class ConfigManager {
  private config: vscode.WorkspaceConfiguration;
  
  constructor(private eventBus: EventBus) {
    this.config = vscode.workspace.getConfiguration('extensionAssistant');
    
    // Escuchar cambios en la configuración
    vscode.workspace.onDidChangeConfiguration(e => {
      if (e.affectsConfiguration('extensionAssistant')) {
        this.config = vscode.workspace.getConfiguration('extensionAssistant');
        this.notifyConfigChanges();
      }
    });
  }
  
  /**
   * Obtiene el tipo de modelo configurado
   */
  public getModelType(): 'ollama' | 'gemini' | 'openai' {
    return this.config.get<'ollama' | 'gemini' | 'openai'>('modelType') || 'gemini';
  }
  
  /**
   * Establece el tipo de modelo
   */
  public async setModelType(modelType: 'ollama' | 'gemini' | 'openai'): Promise<void> {
    await this.config.update('modelType', modelType, true);
    await this.eventBus.emit(AppCommands.MODEL_CHANGE, { modelType });
  }
  
  /**
   * Obtiene la configuración de persistencia
   */
  public getPersistenceEnabled(): boolean {
    return this.config.get<boolean>('persistChat', true);
  }

  /**
   * Obtiene la configuración completa para el motor de planificación
   */
  public getPlanningConfig(): PlanningConfigOptions {
    const planningConfig = this.config.get<Partial<PlanningConfigOptions>>('planning') || {};
    
    // Valores por defecto
    return {
      maxSteps: planningConfig.maxSteps || 20,
      allowedTools: planningConfig.allowedTools || [],
      stepTimeout: planningConfig.stepTimeout || 30000, // 30 segundos
      showFeedback: planningConfig.showFeedback || 'detailed',
      autoRefineEnabled: planningConfig.autoRefineEnabled !== false, // Habilitado por defecto
      recoveryAttempts: planningConfig.recoveryAttempts || 3,
      userConfirmation: planningConfig.userConfirmation !== false // Habilitado por defecto
    };
  }
  
  /**
   * Establece una configuración específica del sistema de planificación
   */
  public async updatePlanningConfig(key: keyof PlanningConfigOptions, value: any): Promise<void> {
    const planningConfig = this.config.get<any>('planning') || {};
    planningConfig[key] = value;
    await this.config.update('planning', planningConfig, true);
    await this.notifyConfigChanges();
  }

  /**
   * Obtiene la configuración completa del modelo LLM
   */
  public getModelConfig(): ModelConfigOptions {
    const modelConfig = this.config.get<Partial<ModelConfigOptions>>('model') || {};
    
    // Valores por defecto
    return {
      type: this.getModelType(),
      temperature: modelConfig.temperature || 0.7,
      maxTokens: modelConfig.maxTokens || 8000,
      contextWindow: modelConfig.contextWindow || 32000,
      streaming: modelConfig.streaming !== false // Habilitado por defecto
    };
  }
  
  /**
   * Establece una configuración específica del modelo LLM
   */
  public async updateModelConfig(key: keyof ModelConfigOptions, value: any): Promise<void> {
    const modelConfig = this.config.get<any>('model') || {};
    modelConfig[key] = value;
    await this.config.update('model', modelConfig, true);
    
    // Si se cambió el tipo de modelo, emitir evento específico
    if (key === 'type') {
      await this.eventBus.emit(AppCommands.MODEL_CHANGE, { modelType: value });
    }
    
    await this.notifyConfigChanges();
  }
  
  /**
   * Obtiene la ruta de SQLite para almacenamiento
   */
  public getSqlitePath(): string {
    return this.config.get<string>('storage.sqlitePath') || '';
  }

  /**
   * Obtiene el nivel de detalle para logging
   */
  public getLogLevel(): 'error' | 'warn' | 'info' | 'debug' | 'verbose' {
    return this.config.get<'error' | 'warn' | 'info' | 'debug' | 'verbose'>('logLevel') || 'info';
  }
  
  /**
   * Notifica a los componentes sobre cambios en la configuración
   */
  private async notifyConfigChanges(): Promise<void> {
    await this.eventBus.emit(AppCommands.CONFIG_CHANGED, {
      modelType: this.getModelType(),
      persistChat: this.getPersistenceEnabled(),
      planningConfig: this.getPlanningConfig(),
      modelConfig: this.getModelConfig(),
      logLevel: this.getLogLevel()
    });
  }
}