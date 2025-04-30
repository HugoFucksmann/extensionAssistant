// srcV2/core/config/configManager.ts
import * as vscode from 'vscode';
import { UIStateContext } from '../context/uiStateContext';
import { PromptType } from '../promptSystem/types';

/**
 * Clase que centraliza la gestión de configuración de la extensión
 */
export class ConfigManager {
  private config: vscode.WorkspaceConfiguration;
  private promptTemplates: Record<PromptType, string> = {} as Record<PromptType, string>;

  constructor(private readonly uiStateContext: UIStateContext) {
    this.config = vscode.workspace.getConfiguration('extensionAssistant');

    // Cargar plantillas de prompts iniciales
    this.loadPromptTemplates();

    // Escuchar cambios en la configuración
    vscode.workspace.onDidChangeConfiguration(e => {
      if (e.affectsConfiguration('extensionAssistant')) {
        this.config = vscode.workspace.getConfiguration('extensionAssistant');
        this.loadPromptTemplates(); // Recargar plantillas
        this.notifyConfigChanges();
      }
    });
  }

  /**
   * Carga las plantillas de prompts desde la configuración
   */
  private loadPromptTemplates(): void {
    // Aquí se cargarían las plantillas desde la configuración o archivos
    // Por ahora dejamos esto como un placeholder
    console.log('[ConfigManager] Cargando plantillas de prompts');
  }

  /**
   * Obtiene una plantilla de prompt específica
   */
  public getPrompt(type: PromptType): string {
    return this.promptTemplates[type] || '';
  }

  /**
   * Actualiza una plantilla de prompt
   */
  public setPrompt(type: PromptType, template: string): void {
    this.promptTemplates[type] = template;
    // Aquí se guardaría la plantilla en la configuración o archivos
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

  /**
   * Actualiza el tipo de modelo
   */
  public async setModelType(modelType: 'ollama' | 'gemini'): Promise<void> {
    await this.config.update('modelType', modelType, true);
    this.uiStateContext.setState('modelType', modelType);
  }

  /**
   * Obtiene una configuración específica
   */
  public get<T>(key: string, defaultValue?: T): T {
    return this.config.get<T>(key, defaultValue as T);
  }

  /**
   * Actualiza una configuración específica
   */
  public async update(key: string, value: any, global: boolean = true): Promise<void> {
    await this.config.update(key, value, global);
  }
}