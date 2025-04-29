// src/tools/core/progressReporter.ts

/**
 * @file progressReporter.ts
 * * Responsabilidad: Definir la interfaz para que las herramientas puedan informar
 * sobre su progreso durante ejecuciones potencialmente largas. Permite
 * mostrar feedback al usuario (ej. en una barra de estado o notificación).
 */

/**
 * Interfaz que define cómo una herramienta puede reportar su progreso.
 *
 * Una instancia que implemente esta interfaz será creada y pasada opcionalmente
 * por el sistema que ejecuta la herramienta (ej. OrchestratorService o WorkflowManager)
 * al método `execute` de la herramienta. La herramienta puede entonces llamar a
 * sus métodos para indicar el estado de su ejecución.
 */
export interface ProgressReporter {
    /**
     * Indica el inicio de una operación o tarea.
     * @param title Un título descriptivo para la operación que se está iniciando.
     * @param totalSteps (Opcional) El número total de pasos esperados para la operación,
     * si se conoce. Permite calcular porcentajes.
     */
    start(title: string, totalSteps?: number): void;
  
    /**
     * Informa sobre un avance en la operación.
     * @param message Un mensaje describiendo el estado actual o el paso completado.
     * @param increment (Opcional) El número de pasos completados en esta actualización.
     * Si se proporcionó `totalSteps` en `start`, esto permite
     * actualizar el porcentaje de completitud.
     */
    update(message: string, increment?: number): void;
  
    /**
     * Indica que la operación ha finalizado exitosamente.
     * @param message (Opcional) Un mensaje final de éxito.
     */
    complete(message?: string): void;
  
    /**
     * Indica que la operación ha finalizado con un error.
     * @param message Un mensaje describiendo el error ocurrido.
     */
    error(message: string): void;
  }