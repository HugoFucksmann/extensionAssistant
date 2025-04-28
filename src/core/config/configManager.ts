import * as vscode from 'vscode';
import { EventBus } from './eventBus';

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
  public getModelType(): 'ollama' | 'gemini' {
    return this.config.get<'ollama' | 'gemini'>('modelType') || 'gemini';
  }
  
  /**
   * Establece el tipo de modelo
   */
  public async setModelType(modelType: 'ollama' | 'gemini'): Promise<void> {
    await this.config.update('modelType', modelType, true);
    await this.eventBus.emit('model:change', { modelType });
  }
  
  /**
   * Obtiene la configuración de persistencia
   */
  public getPersistenceEnabled(): boolean {
    return this.config.get<boolean>('persistChat', true);
  }
  
  /**
   * Notifica a los componentes sobre cambios en la configuración
   */
  private async notifyConfigChanges(): Promise<void> {
    const modelType = this.getModelType();
    await this.eventBus.emit('config:changed', {
      modelType,
      persistChat: this.getPersistenceEnabled()
    });
  }
}
