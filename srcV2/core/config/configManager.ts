import * as vscode from 'vscode';
import { UIStateContext } from '../context/uiStateContext';
import { PromptType } from '../promptSystem/types';

/**
 * Clase que centraliza la gestión de configuración de la extensión
 */
export class ConfigManager {
  private static instance: ConfigManager;
  private config: vscode.WorkspaceConfiguration;

  private constructor(private readonly uiStateContext: UIStateContext, private readonly vsCodeContext: vscode.ExtensionContext) {
    this.config = vscode.workspace.getConfiguration('extensionAssistant');

    // Escuchar cambios en la configuración
    vscode.workspace.onDidChangeConfiguration(e => {
      if (e.affectsConfiguration('extensionAssistant')) {
        this.config = vscode.workspace.getConfiguration('extensionAssistant');
        this.notifyConfigChanges();
      }
    });
  }

  public static getInstance(uiStateContext: UIStateContext, vsCodeContext: vscode.ExtensionContext): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager(uiStateContext, vsCodeContext);
    }
    return ConfigManager.instance;
  }

  /**
   * Este método ya no es necesario ya que los prompts se obtienen directamente de promptSystem
   * @deprecated Use runPrompt from promptSystem instead
   */
  public getPromptTemplate(type: PromptType): string {
    console.warn('ConfigManager.getPromptTemplate is deprecated. Use runPrompt from promptSystem instead');
    throw new Error('ConfigManager.getPromptTemplate is deprecated. Use runPrompt from promptSystem instead');
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

  /**
   * Obtiene un valor genérico de configuración
   * @param key La clave de configuración
   * @param defaultValue Valor por defecto si no existe
   */
  public get<T>(key: string, defaultValue?: T): T | undefined {
    return this.config.get<T>(key) ?? defaultValue;
  }

  /**
   * Obtiene la configuración de orquestación
   */
  public getUseOrchestration(): boolean {
    return this.get<boolean>('useOrchestration', false) ?? false;
  }

}
