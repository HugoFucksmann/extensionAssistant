import * as vscode from 'vscode';
import { UIStateContext } from '../context/uiStateContext';

/**
 * Clase que centraliza la gestión de configuración de la extensión
 */
export class ConfigManager {
  private config: vscode.WorkspaceConfiguration;
  
  constructor(private readonly uiStateContext: UIStateContext) {
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
   * Obtiene la configuración de persistencia
   */
  public getPersistenceEnabled(): boolean {
    return this.config.get<boolean>('persistChat', true);
  }
  
  /**
   * Notifica a los componentes sobre cambios en la configuración
   */
  private notifyConfigChanges(): void {
    const modelType = this.getModelType();
    this.uiStateContext.setState('modelType', modelType);
    this.uiStateContext.setState('persistChat', this.getPersistenceEnabled());
  }

  // Modificar setModelType para no usar EventBus
  public async setModelType(modelType: 'ollama' | 'gemini'): Promise<void> {
    await this.config.update('modelType', modelType, true);
    this.uiStateContext.setState('modelType', modelType);
  }

}
