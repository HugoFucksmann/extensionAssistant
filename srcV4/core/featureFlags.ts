/**
 * Implementación de feature flags para controlar la activación de características
 * Permite una migración gradual y controlada entre arquitecturas
 */

import { IFeatureFlags } from './interfaces/feature-flags.interface';

/**
 * Enumeración de las características disponibles
 */
export enum Feature {
  // Características de la arquitectura
  USE_NEW_ARCHITECTURE = 'use_new_architecture',
  USE_TOOL_REGISTRY_ADAPTER = 'use_tool_registry_adapter',
  USE_MEMORY_MANAGER_ADAPTER = 'use_memory_manager_adapter',
  USE_MODEL_MANAGER_ADAPTER = 'use_model_manager_adapter',
  USE_REACT_GRAPH_ADAPTER = 'use_react_graph_adapter',
  USE_EVENT_BUS_ADAPTER = 'use_event_bus_adapter',
  
  // Características de la UI
  USE_NEW_UI = 'use_new_ui',
  
  // Características de logging y debugging
  ENABLE_ADVANCED_LOGGING = 'enable_advanced_logging',
  ENABLE_EVENT_HISTORY = 'enable_event_history',
  
  // Otras características
  ENABLE_PERFORMANCE_METRICS = 'enable_performance_metrics'
}

/**
 * Implementación de feature flags
 * Implementa el patrón singleton
 */
export class FeatureFlags implements IFeatureFlags {
  private static instance: FeatureFlags;
  private enabledFeatures: Set<string> = new Set();
  
  /**
   * Constructor privado para implementar el patrón singleton
   */
  private constructor() {
    // Inicializar con valores por defecto
    this.initializeDefaults();
  }
  
  /**
   * Inicializa los valores por defecto de los feature flags
   */
  private initializeDefaults(): void {
    // Por defecto, habilitamos los adaptadores pero no la arquitectura completa
    this.enabledFeatures.add(Feature.USE_TOOL_REGISTRY_ADAPTER);
    this.enabledFeatures.add(Feature.USE_MEMORY_MANAGER_ADAPTER);
    this.enabledFeatures.add(Feature.USE_MODEL_MANAGER_ADAPTER);
    this.enabledFeatures.add(Feature.USE_REACT_GRAPH_ADAPTER);
    this.enabledFeatures.add(Feature.USE_EVENT_BUS_ADAPTER);
    
    // Habilitamos logging avanzado por defecto
    this.enabledFeatures.add(Feature.ENABLE_ADVANCED_LOGGING);
    
    // Intentar cargar configuración desde almacenamiento persistente si existe
    this.loadFromStorage();
  }
  
  /**
   * Carga la configuración desde almacenamiento persistente
   */
  private loadFromStorage(): void {
    try {
      // En un entorno real, esto podría cargar desde localStorage, 
      // configuración de VS Code, archivo de configuración, etc.
      const storedConfig = process.env.WINDSURF_FEATURE_FLAGS;
      
      if (storedConfig) {
        const parsedConfig = JSON.parse(storedConfig);
        
        if (parsedConfig && Array.isArray(parsedConfig)) {
          // Reemplazar la configuración actual
          this.enabledFeatures = new Set(parsedConfig);
        }
      }
    } catch (error) {
      console.error('[FeatureFlags] Error loading from storage:', error);
    }
  }
  
  /**
   * Guarda la configuración en almacenamiento persistente
   */
  private saveToStorage(): void {
    try {
      // En un entorno real, esto podría guardar en localStorage,
      // configuración de VS Code, archivo de configuración, etc.
      const configToSave = JSON.stringify(Array.from(this.enabledFeatures));
      process.env.WINDSURF_FEATURE_FLAGS = configToSave;
    } catch (error) {
      console.error('[FeatureFlags] Error saving to storage:', error);
    }
  }
  
  /**
   * Obtiene la instancia única de FeatureFlags
   */
  public static getInstance(): FeatureFlags {
    if (!FeatureFlags.instance) {
      FeatureFlags.instance = new FeatureFlags();
    }
    
    return FeatureFlags.instance;
  }
  
  /**
   * Verifica si una característica está habilitada
   * @param featureName Nombre de la característica
   * @returns true si la característica está habilitada, false en caso contrario
   */
  public isEnabled(featureName: string): boolean {
    return this.enabledFeatures.has(featureName);
  }
  
  /**
   * Habilita una característica
   * @param featureName Nombre de la característica
   */
  public enable(featureName: string): void {
    this.enabledFeatures.add(featureName);
    this.saveToStorage();
  }
  
  /**
   * Deshabilita una característica
   * @param featureName Nombre de la característica
   */
  public disable(featureName: string): void {
    this.enabledFeatures.delete(featureName);
    this.saveToStorage();
  }
  
  /**
   * Obtiene todas las características habilitadas
   * @returns Array con los nombres de las características habilitadas
   */
  public getEnabledFeatures(): string[] {
    return Array.from(this.enabledFeatures);
  }
  
  /**
   * Habilita todas las características de la nueva arquitectura
   */
  public enableNewArchitecture(): void {
    this.enable(Feature.USE_NEW_ARCHITECTURE);
    this.enable(Feature.USE_TOOL_REGISTRY_ADAPTER);
    this.enable(Feature.USE_MEMORY_MANAGER_ADAPTER);
    this.enable(Feature.USE_MODEL_MANAGER_ADAPTER);
    this.enable(Feature.USE_REACT_GRAPH_ADAPTER);
    this.enable(Feature.USE_EVENT_BUS_ADAPTER);
  }
  
  /**
   * Deshabilita todas las características de la nueva arquitectura
   */
  public disableNewArchitecture(): void {
    this.disable(Feature.USE_NEW_ARCHITECTURE);
    this.disable(Feature.USE_TOOL_REGISTRY_ADAPTER);
    this.disable(Feature.USE_MEMORY_MANAGER_ADAPTER);
    this.disable(Feature.USE_MODEL_MANAGER_ADAPTER);
    this.disable(Feature.USE_REACT_GRAPH_ADAPTER);
    this.disable(Feature.USE_EVENT_BUS_ADAPTER);
  }
}
