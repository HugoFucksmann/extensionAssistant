// ConfigurationManager.ts
import * as vscode from 'vscode';

/**
 * Tipos de modelo soportados por la extensión
 */
export type ModelType = 'ollama' | 'gemini';

/**
 * Tipo de función para escuchar cambios en la configuración
 */
export type ConfigChangeListener = (key: string, value: any, oldValue: any) => void;

/**
 * ConfigurationManager - Clase unificada para gestionar configuraciones y estado de la aplicación
 * Combina las funcionalidades de ConfigSystem, UIStateContext y la configuración de BaseAPI
 */
export class ConfigurationManager {
  private static instance: ConfigurationManager;
  
  // Configuración de VS Code
  private config: vscode.WorkspaceConfiguration;
  
  // Estado interno (incluye configuración y estado UI)
  private state = new Map<string, any>();
  
  // Sistema de observadores
  private listeners = new Map<string, ConfigChangeListener[]>();
  private globalListeners: ConfigChangeListener[] = [];

  // Valores predeterminados de configuración
  private static readonly DEFAULT_VALUES = {
    'modelType': 'gemini' as ModelType,
    'persistChat': true,
    'useOrchestration': true,
    'isProcessing': false,
    'error': null
  };

  private constructor(context?: vscode.ExtensionContext) {
    this.config = vscode.workspace.getConfiguration('extensionAssistant');
    this.initializeState();
    
    // Registrar evento para cambios de configuración de VS Code
    const configChangeDisposable = vscode.workspace.onDidChangeConfiguration(e => {
      if (e.affectsConfiguration('extensionAssistant')) {
        this.config = vscode.workspace.getConfiguration('extensionAssistant');
        this.syncVSCodeConfigToState();
      }
    });
    
    // Añadir a las suscripciones de la extensión si se proporciona el contexto
    if (context) {
      context.subscriptions.push(configChangeDisposable);
    }
  }

  /**
   * Obtiene la instancia singleton de ConfigurationManager
   */
  public static getInstance(context?: vscode.ExtensionContext): ConfigurationManager {
    if (!ConfigurationManager.instance) {
      ConfigurationManager.instance = new ConfigurationManager(context);
    }
    return ConfigurationManager.instance;
  }

  /**
   * Inicializa el estado con los valores de configuración y predeterminados
   */
  private initializeState(): void {
    // Inicializar con valores predeterminados
    for (const [key, defaultValue] of Object.entries(ConfigurationManager.DEFAULT_VALUES)) {
      // Cargar desde la configuración de VS Code si existe, o usar valor predeterminado
      const vsCodeValue = this.config.get<any>(key);
      this.state.set(key, vsCodeValue !== undefined ? vsCodeValue : defaultValue);
    }
  }

  /**
   * Sincroniza los cambios de configuración de VS Code al estado interno
   */
  private syncVSCodeConfigToState(): void {
    for (const [key, oldValue] of this.state.entries()) {
      // Solo sincronizar claves que son configuraciones de VS Code (no estados de UI)
      if (key in ConfigurationManager.DEFAULT_VALUES) {
        const newValue = this.config.get<any>(key, oldValue);
        if (newValue !== oldValue) {
          this.setState(key, newValue, false); // No guardar en VS Code para evitar bucles
        }
      }
    }
  }

  /**
   * Obtiene un valor de configuración o estado
   * @param key Clave de configuración o estado
   * @param defaultValue Valor predeterminado si la clave no existe
   */
  public get<T>(key: string, defaultValue?: T): T {
    if (this.state.has(key)) {
      return this.state.get(key) as T;
    }
    
    // Si es una configuración de VS Code, intentar obtener de ahí
    const vsCodeValue = this.config.get<T>(key);
    if (vsCodeValue !== undefined) {
      this.state.set(key, vsCodeValue);
      return vsCodeValue;
    }
    
    return defaultValue as T;
  }

  /**
   * Establece un valor de configuración o estado
   * @param key Clave de configuración o estado
   * @param value Nuevo valor
   * @param saveToVSCode Si es true y es una configuración, se guarda en VS Code
   */
  public async setState<T>(key: string, value: T, saveToVSCode: boolean = true): Promise<void> {
    const oldValue = this.state.get(key);
    
    // No hacer nada si el valor no ha cambiado
    if (oldValue === value) {
      return;
    }
    
    // Actualizar el estado interno
    this.state.set(key, value);
    
    // Si es una configuración y se debe guardar, actualizar VS Code
    if (saveToVSCode && key in ConfigurationManager.DEFAULT_VALUES) {
      await this.config.update(key, value, true);
    }
    
    // Notificar a los observadores
    this.notifyListeners(key, value, oldValue);
  }

  /**
   * Suscribirse a cambios en una clave específica
   * @param key Clave a observar
   * @param listener Función a llamar cuando cambie el valor
   */
  public onChange(key: string, listener: ConfigChangeListener): () => void {
    if (!this.listeners.has(key)) {
      this.listeners.set(key, []);
    }
    
    const keyListeners = this.listeners.get(key)!;
    keyListeners.push(listener);
    
    // Devolver función para cancelar la suscripción
    return () => {
      const index = keyListeners.indexOf(listener);
      if (index !== -1) {
        keyListeners.splice(index, 1);
      }
    };
  }

  /**
   * Suscribirse a cualquier cambio de configuración o estado
   * @param listener Función a llamar cuando cambie cualquier valor
   */
  public onAnyChange(listener: ConfigChangeListener): () => void {
    this.globalListeners.push(listener);
    
    // Devolver función para cancelar la suscripción
    return () => {
      const index = this.globalListeners.indexOf(listener);
      if (index !== -1) {
        this.globalListeners.splice(index, 1);
      }
    };
  }

  /**
   * Notifica a los observadores sobre un cambio
   * @param key Clave que cambió
   * @param newValue Nuevo valor
   * @param oldValue Valor anterior
   */
  private notifyListeners(key: string, newValue: any, oldValue: any): void {
    // Notificar a observadores específicos de la clave
    const keyListeners = this.listeners.get(key);
    if (keyListeners) {
      for (const listener of keyListeners) {
        try {
          listener(key, newValue, oldValue);
        } catch (error) {
          console.error(`Error en observador de ${key}:`, error);
        }
      }
    }
    
    // Notificar a observadores globales
    for (const listener of this.globalListeners) {
      try {
        listener(key, newValue, oldValue);
      } catch (error) {
        console.error(`Error en observador global de ${key}:`, error);
      }
    }
  }
  
  // Métodos de conveniencia para configuraciones comunes
  
  /**
   * Obtiene el tipo de modelo configurado
   */
  public getModelType(): ModelType {
    return this.get<ModelType>('modelType', 'gemini');
  }
  
  /**
   * Establece el tipo de modelo
   */
  public async setModelType(modelType: ModelType): Promise<void> {
    await this.setState('modelType', modelType);
  }
  
  /**
   * Obtiene si la persistencia de chat está habilitada
   */
  public getPersistenceEnabled(): boolean {
    return this.get<boolean>('persistChat', true);
  }
  
  /**
   * Obtiene si se debe usar orquestación
   */
  public getUseOrchestration(): boolean {
    return this.get<boolean>('useOrchestration', true);
  }
  
  /**
   * Establece el estado de procesamiento
   */
  public setProcessingState(isProcessing: boolean): void {
    this.setState('isProcessing', isProcessing, false); // Solo estado UI, no guardar en VS Code
  }
  
  /**
   * Establece un mensaje de error
   */
  public setError(error: string | null): void {
    this.setState('error', error, false); // Solo estado UI, no guardar en VS Code
  }
  
  /**
   * Limpia todo el estado (solo estados UI, no configuraciones)
   */
  public clearUIState(): void {
    // Lista de claves de estado UI
    const uiStateKeys = ['isProcessing', 'error'];
    
    for (const key of uiStateKeys) {
      if (this.state.has(key)) {
        const defaultValue = ConfigurationManager.DEFAULT_VALUES[key as keyof typeof ConfigurationManager.DEFAULT_VALUES];
        this.setState(key, defaultValue, false);
      }
    }
  }
}