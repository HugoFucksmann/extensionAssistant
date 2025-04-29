// src/tools/core/toolInterface.ts

/**
 * @file toolInterface.ts
 * * Responsabilidad: Definir las interfaces estándar que deben implementar todas las herramientas
 * del sistema. Esto asegura una estructura coherente y facilita la integración
 * con el registro de herramientas y el motor de ejecución.
 */

/**
 * Interfaz principal que representa una Herramienta ejecutable.
 * Todas las herramientas específicas deben implementar esta interfaz,
 * ya sea directamente o extendiendo la clase ToolBase.
 */
export interface Tool {
    /**
     * Nombre único de la herramienta. Usado para registro y selección.
     * Ejemplo: "codeEditor", "fileCreator", "dependencyManager"
     */
    name: string;
  
    /**
     * Descripción clara y concisa de lo que hace la herramienta.
     * Usada para mostrar al usuario y potencialmente para la selección por LLM.
     */
    description: string;
  
    /**
     * Categoría a la que pertenece la herramienta (ej. "code", "file", "project", "prompt").
     * Ayuda a organizar y filtrar herramientas.
     */
    category: string;
  
    /**
     * Ejecuta la lógica principal de la herramienta.
     * @param params Un objeto que contiene los parámetros específicos necesarios para la ejecución.
     * La estructura de este objeto debe ser validada por `validateParams`.
     * @param context (Opcional) El contexto de ejecución que proporciona información de sesión,
     * workspace, etc. Ver `ToolContext`.
     * @param progress (Opcional) Un reporter para informar sobre el progreso de la ejecución.
     * Ver `ProgressReporter`.
     * @returns Una promesa que resuelve con el resultado de la ejecución de la herramienta.
     * La estructura del resultado es específica de cada herramienta.
     */
    execute(params: any, context?: ToolContext, progress?: ProgressReporter): Promise<any>;
  
    /**
     * Valida si los parámetros proporcionados son suficientes y correctos para ejecutar la herramienta.
     * @param params El objeto de parámetros a validar.
     * @returns `true` si los parámetros son válidos, `false` en caso contrario.
     * Debería registrar o lanzar errores específicos si la validación falla.
     */
    validateParams(params: any): boolean;
  
    /**
     * Devuelve el esquema de los parámetros esperados por la herramienta.
     * Puede ser usado para autogenerar formularios, validación o para informar a un LLM.
     * Se recomienda usar un formato como JSON Schema.
     * @returns Un objeto que representa el esquema de los parámetros.
     */
    getParameterSchema(): object;
  }
  
  /**
   * Interfaz para el contexto proporcionado a las herramientas durante la ejecución.
   * Permite a las herramientas acceder a información relevante del entorno y la sesión.
   * (Definida aquí también por conveniencia, aunque hay un archivo toolContext.ts)
   */
  export interface ToolContext {
    sessionId: string;
    userId: string;
    workspacePath: string;
    currentFilePath?: string;
    selectedText?: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vscodeContext?: any; // Contexto específico de VSCode si aplica
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    getState(key: string): any; // Obtener estado persistente asociado a la sesión/workspace
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setState(key: string, value: any): void; // Guardar estado persistente
  }
  
  /**
   * Interfaz para que las herramientas informen sobre su progreso.
   * (Definida aquí también por conveniencia, aunque hay un archivo progressReporter.ts)
   */
  export interface ProgressReporter {
    start(title: string, totalSteps?: number): void;
    update(message: string, increment?: number): void;
    complete(message?: string): void;
    error(message: string): void;
  }