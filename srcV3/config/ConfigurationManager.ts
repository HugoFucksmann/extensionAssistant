import * as vscode from 'vscode';
import { ModelType } from '../models/config/types';

/**
 * Gestiona la configuración de la extensión
 */
export class ConfigurationManager {
    private extensionConfig: vscode.WorkspaceConfiguration;

    /**
     * Constructor de ConfigurationManager
     * @param context Contexto de la extensión VS Code
     */
    constructor(private context: vscode.ExtensionContext) {
        // Get the configuration section for your extension
        this.extensionConfig = vscode.workspace.getConfiguration('extensionAssistant');
    }

    /**
     * Obtiene el tipo de modelo actual
     * @returns Tipo de modelo actual
     */
    getModelType(): ModelType {
        // Model type is stored in globalState, not workspace config
        return this.context.globalState.get('modelType') || 'ollama';
    }

    /**
     * Establece el tipo de modelo
     * @param type Nuevo tipo de modelo
     * @returns Promise de actualización
     */
    setModelType(type: ModelType): Thenable<void> {
        // Model type is stored in globalState, not workspace config
        return this.context.globalState.update('modelType', type);
    }

    /**
     * Obtiene una configuración genérica de globalState (menos común ahora)
     * @param key Clave de configuración
     * @param defaultValue Valor predeterminado
     * @returns Valor de configuración o valor predeterminado
     */
    getValue<T>(key: string, defaultValue: T): T {
         // Prefer reading from workspace config unless it's user-specific global state
        return this.context.globalState.get<T>(key) ?? defaultValue; // Use ?? for null/undefined check
    }

    /**
     * Establece una configuración genérica en globalState (menos común ahora)
     * @param key Clave de configuración
     * @param value Valor de configuración
     * @returns Promise de actualización
     */
    setValue<T>(key: string, value: T): Thenable<void> {
        // Prefer writing to workspace config unless it's user-specific global state
        return this.context.globalState.update(key, value);
    }

    /**
     * Obtiene una configuración de la sección de la extensión en workspace/user settings.
     * @param key Clave de configuración dentro de la sección de la extensión (ej: 'agent.context.summaryThreshold')
     * @param defaultValue Valor predeterminado
     * @returns Valor de configuración o valor predeterminado
     */
    getSetting<T>(key: string, defaultValue: T): T {
        return this.extensionConfig.get<T>(key) ?? defaultValue;
    }

    /**
     * Establece una configuración en la sección de la extensión (generalmente no se hace desde el código, sino por el usuario).
     * Esto es solo un ejemplo si necesitaras cambiar una setting programáticamente.
     * @param key Clave de configuración
     * @param value Valor de configuración
     * @param target Dónde guardar la configuración (Global, Workspace, WorkspaceFolder)
     * @returns Promise de actualización
     */
    async setSetting<T>(key: string, value: T, target: vscode.ConfigurationTarget = vscode.ConfigurationTarget.Global): Promise<void> {
         await this.extensionConfig.update(key, value, target);
    }


    /**
     * Obtiene el tema de UI preferido (ejemplo de setting en globalState)
     * @returns 'dark' | 'light' | 'system'
     */
    getUiTheme(): 'dark' | 'light' | 'system' {
        return this.getValue('uiTheme', 'system');
    }

    /**
     * Establece el tema de UI preferido (ejemplo de setting en globalState)
     * @param theme Nuevo tema
     * @returns Promise de actualización
     */
    setUiTheme(theme: 'dark' | 'light' | 'system'): Thenable<void> {
        return this.setValue('uiTheme', theme);
    }

    // <-- Add specific getters for agent configurations
    getContextAgentSummaryThreshold(): number {
        return this.getSetting<number>('agent.context.summaryThreshold', 10);
    }

    // Add getters for other agent settings as they are introduced
    // getFileInsightAgentMaxFiles(): number { ... }
    // getMemoryAgentRetrievalLimit(): number { ... }
    // -->
}