import * as vscode from 'vscode';
import { ModelType } from '../models/config/types';

/**
 * Gestiona la configuración de la extensión
 */
export class ConfigurationManager {
    /**
     * Constructor de ConfigurationManager
     * @param context Contexto de la extensión VS Code
     */
    constructor(private context: vscode.ExtensionContext) {}

    /**
     * Obtiene el tipo de modelo actual
     * @returns Tipo de modelo actual
     */
    getModelType(): ModelType {
        return this.context.globalState.get('modelType') || 'ollama';
    }

    /**
     * Establece el tipo de modelo
     * @param type Nuevo tipo de modelo
     * @returns Promise de actualización
     */
    setModelType(type: ModelType): Thenable<void> {
        return this.context.globalState.update('modelType', type);
    }

    /**
     * Obtiene una configuración genérica
     * @param key Clave de configuración
     * @param defaultValue Valor predeterminado
     * @returns Valor de configuración o valor predeterminado
     */
    getValue<T>(key: string, defaultValue: T): T {
        return this.context.globalState.get<T>(key) || defaultValue;
    }

    /**
     * Establece una configuración genérica
     * @param key Clave de configuración
     * @param value Valor de configuración
     * @returns Promise de actualización
     */
    setValue<T>(key: string, value: T): Thenable<void> {
        return this.context.globalState.update(key, value);
    }

    /**
     * Obtiene el tema de UI preferido
     * @returns 'dark' | 'light' | 'system'
     */
    getUiTheme(): 'dark' | 'light' | 'system' {
        return this.getValue('uiTheme', 'system');
    }

    /**
     * Establece el tema de UI preferido
     * @param theme Nuevo tema
     * @returns Promise de actualización
     */
    setUiTheme(theme: 'dark' | 'light' | 'system'): Thenable<void> {
        return this.setValue('uiTheme', theme);
    }
}