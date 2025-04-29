// src/tools/core/toolBase.ts

/**
 * @file toolBase.ts
 * * Responsabilidad: Proporcionar una clase base abstracta para todas las herramientas.
 * Implementa funcionalidades comunes y define métodos abstractos que
 * las herramientas concretas deben implementar.
 */

import { Logger } from '../../utils/logger'; // Asumiendo ubicación de Logger
import { Tool, ToolContext, ProgressReporter } from './toolInterface';

/**
 * Clase base abstracta para implementar herramientas.
 * Se recomienda que todas las herramientas hereden de esta clase.
 */
export abstract class ToolBase implements Tool {
  protected logger: Logger;

  /**
   * Propiedades abstractas que deben ser definidas por las clases hijas.
   */
  abstract readonly name: string;
  abstract readonly description: string;
  abstract readonly category: string;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  /**
   * Método abstracto para la ejecución de la lógica principal de la herramienta.
   * Debe ser implementado por cada herramienta concreta.
   */
  abstract execute(params: any, context?: ToolContext, progress?: ProgressReporter): Promise<any>;

  /**
   * Método abstracto para la validación de parámetros.
   * Debe ser implementado por cada herramienta concreta.
   */
  abstract validateParams(params: any): boolean;

  /**
   * Método abstracto para obtener el esquema de parámetros.
   * Debe ser implementado por cada herramienta concreta.
   */
  abstract getParameterSchema(): object;

  /**
   * Método de ayuda común para registrar el inicio de la ejecución.
   */
  protected logStart(params: any): void {
    this.logger.info(`[${this.name}] Starting execution`, { params });
  }

 /**
   * Método de ayuda común para registrar la finalización exitosa.
   */
  protected logEnd(result: any): void {
    // Evitar loguear resultados muy grandes
    const resultSummary = typeof result === 'object' && result !== null 
      ? { keys: Object.keys(result), type: 'object' } 
      : result;
    this.logger.info(`[${this.name}] Execution finished successfully`, { resultSummary });
  }

  /**
   * Método de ayuda común para registrar un error durante la ejecución.
   */
  protected logError(error: any, params: any): void {
     this.logger.error(`[${this.name}] Execution failed`, { error: error?.message || error, params });
  }

  // Otros métodos de utilidad comunes podrían añadirse aquí
  // por ejemplo, para interactuar con el sistema de archivos de forma segura, etc.
}