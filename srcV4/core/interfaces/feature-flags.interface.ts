/**
 * Interfaz para la gestión de feature flags
 * Define el contrato para habilitar/deshabilitar características de la aplicación
 * 
 * Características disponibles:
 * - ENABLE_EVENT_DEBUGGING: Habilita el modo de depuración detallado para el sistema de eventos
 */

/**
 * Interfaz para la gestión de feature flags
 */
export interface IFeatureFlags {
  /**
   * Verifica si una característica está habilitada
   * @param featureName Nombre de la característica
   * @returns true si la característica está habilitada, false en caso contrario
   */
  isEnabled(featureName: string): boolean;
  
  /**
   * Habilita una característica
   * @param featureName Nombre de la característica
   */
  enable(featureName: string): void;
  
  /**
   * Deshabilita una característica
   * @param featureName Nombre de la característica
   */
  disable(featureName: string): void;
  
  /**
   * Obtiene todas las características habilitadas
   * @returns Array con los nombres de las características habilitadas
   */
  getEnabledFeatures(): string[];
}
