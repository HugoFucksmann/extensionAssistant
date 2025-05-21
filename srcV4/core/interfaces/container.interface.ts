/**
 * Interfaz para el contenedor de dependencias
 * Define el contrato para la inyección de dependencias en la aplicación
 */

import { IToolRegistry } from './tool-registry.interface';

import { IModelManager } from './model-manager.interface';
import { IReActGraph } from './react-graph.interface';
import { IEventBus } from './event-bus.interface';
import { IMemoryManager } from '../../modules/memory';

/**
 * Interfaz para el contenedor de dependencias
 * Proporciona acceso a todas las dependencias de la aplicación
 */
export interface IContainer {
  /**
   * Obtiene el registro de herramientas
   */
  getToolRegistry(): IToolRegistry;
  
  /**
   * Obtiene el gestor de memoria
   */
  getMemoryManager(): IMemoryManager;
  
  /**
   * Obtiene el gestor de modelos
   */
  getModelManager(): IModelManager;
  
  /**
   * Obtiene el grafo ReAct
   */
  getReActGraph(): IReActGraph;
  
  /**
   * Obtiene el bus de eventos
   */
  getEventBus(): IEventBus;
  
  /**
   * Registra una implementación personalizada para una dependencia
   * @param key Identificador de la dependencia
   * @param implementation Implementación de la dependencia
   */
  register<T>(key: string, implementation: T): void;
  
  /**
   * Obtiene una implementación personalizada
   * @param key Identificador de la dependencia
   * @returns Implementación de la dependencia o undefined si no existe
   */
  resolve<T>(key: string): T | undefined;
}
