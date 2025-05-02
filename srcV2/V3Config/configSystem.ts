// configSystem.ts
import * as vscode from 'vscode';

export type ConfigChangeListener = (key: string, value: any, oldValue: any) => void;

/**
 * Tipo de modelo soportado por la extensión
 */
export type ModelType = 'ollama' | 'gemini';

/**
 * Clase que centraliza la gestión de configuración de la extensión con un patrón Observer
 */
export class ConfigSystem {
  private static instance: ConfigSystem;
  private config: vscode.WorkspaceConfiguration;
  private globalListeners: ConfigChangeListener[] = [];
  private keyListeners: Map<string, ConfigChangeListener[]> = new Map();
  private cache: Map<string, any> = new Map();

  private constructor() {
    this.config = vscode.workspace.getConfiguration('extensionAssistant');
    this.initializeCache();
    
    // Escuchar cambios en la configuración de VS Code
    vscode.workspace.onDidChangeConfiguration(e => {
      if (e.affectsConfiguration('extensionAssistant')) {
        this.config = vscode.workspace.getConfiguration('extensionAssistant');
        this.handleExternalConfigChanges();
      }
    });
  }

  /**
   * Inicializa el caché con valores conocidos importantes
   */
  private initializeCache(): void {
    // Precarga los valores más utilizados
    this.cache.set('modelType', this.config.get<ModelType>('modelType', 'gemini'));
    this.cache.set('persistChat', this.config.get<boolean>('persistChat', true));
    this.cache.set('useOrchestration', this.config.get<boolean>('useOrchestration', false));
  }

  /**
   * Detecta cambios externos en la configuración y notifica a los listeners
   */
  private handleExternalConfigChanges(): void {
    for (const [key, cachedValue] of this.cache.entries()) {
      const newValue = this.config.get<any>(key, cachedValue);
      if (newValue !== cachedValue) {
        this.cache.set(key, newValue);
        this.notifyListeners(key, newValue, cachedValue);
      }
    }
  }

  /**
   * Obtiene la instancia singleton
   */
  public static getInstance(): ConfigSystem {
    if (!ConfigSystem.instance) {
      ConfigSystem.instance = new ConfigSystem();
    }
    return ConfigSystem.instance;
  }

  /**
   * Obtiene un valor de configuración
   * @param key Clave de configuración
   * @param defaultValue Valor por defecto
   * @returns Valor de configuración o valor por defecto
   */
  public get<T>(key: string, defaultValue?: T): T {
    // Verificar primero en el caché para valores frecuentes
    if (this.cache.has(key)) {
      return this.cache.get(key) as T;
    }
    return this.config.get<T>(key, defaultValue as T) as T;
  }

  /**
   * Actualiza un valor de configuración
   * @param key Clave de configuración
   * @param value Nuevo valor
   * @param global Si es true, actualiza la configuración global, de lo contrario, a nivel de workspace
   * @returns Promise que se resuelve cuando se completa la actualización
   */
  public async set<T>(key: string, value: T, global: boolean = true): Promise<void> {
    const oldValue = this.get(key);
    await this.config.update(key, value, global);
    
    // Actualizar caché inmediatamente
    this.cache.set(key, value);
    
    // Notificar a los listeners
    this.notifyListeners(key, value, oldValue);
  }

  /**
   * Registra un listener para todos los cambios de configuración
   * @param listener Función a llamar cuando cambie cualquier configuración
   * @returns Función para cancelar la suscripción
   */
  public onAnyChange(listener: ConfigChangeListener): () => void {
    this.globalListeners.push(listener);
    return () => {
      const index = this.globalListeners.indexOf(listener);
      if (index !== -1) {
        this.globalListeners.splice(index, 1);
      }
    };
  }

  /**
   * Registra un listener para cambios en una clave específica
   * @param key Clave a observar
   * @param listener Función a llamar cuando cambie la configuración
   * @returns Función para cancelar la suscripción
   */
  public onChange(key: string, listener: ConfigChangeListener): () => void {
    if (!this.keyListeners.has(key)) {
      this.keyListeners.set(key, []);
    }
    
    this.keyListeners.get(key)!.push(listener);
    
    return () => {
      const listeners = this.keyListeners.get(key);
      if (listeners) {
        const index = listeners.indexOf(listener);
        if (index !== -1) {
          listeners.splice(index, 1);
        }
      }
    };
  }

  /**
   * Notifica a todos los listeners relevantes sobre un cambio
   * @param key Clave que cambió
   * @param newValue Nuevo valor
   * @param oldValue Valor anterior
   */
  private notifyListeners(key: string, newValue: any, oldValue: any): void {
    // Notificar a listeners específicos de esta clave
    const keySpecificListeners = this.keyListeners.get(key);
    if (keySpecificListeners) {
      for (const listener of keySpecificListeners) {
        try {
          listener(key, newValue, oldValue);
        } catch (error) {
          console.error(`Error en listener de configuración para ${key}:`, error);
        }
      }
    }
    
    // Notificar a listeners globales
    for (const listener of this.globalListeners) {
      try {
        listener(key, newValue, oldValue);
      } catch (error) {
        console.error(`Error en listener global de configuración para ${key}:`, error);
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
    await this.set('modelType', modelType, true);
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
    return this.get<boolean>('useOrchestration', false);
  }
}