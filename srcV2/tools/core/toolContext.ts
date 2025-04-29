// src/tools/core/toolContext.ts

/**
 * @file toolContext.ts
 * * Responsabilidad: Definir la interfaz para el objeto de contexto que se pasa
 * a las herramientas durante su ejecución. Este contexto proporciona acceso
 * a información relevante sobre la sesión, el usuario, el workspace y estado.
 */

/**
 * Interfaz que define la estructura del contexto de ejecución
 * proporcionado a las herramientas.
 *
 * Una instancia que implemente esta interfaz será creada y pasada
 * por el sistema que ejecuta la herramienta (ej. OrchestratorService o WorkflowManager)
 * al método `execute` de la herramienta.
 */
export interface ToolContext {
    /** Identificador único de la sesión actual. */
    sessionId: string;
  
    /** Identificador del usuario que inició la sesión/acción. */
    userId: string;
  
    /** Ruta absoluta al directorio raíz del workspace o proyecto actual. */
    workspacePath: string;
  
    /** Ruta relativa o absoluta al archivo actualmente activo o relevante (si aplica). */
    currentFilePath?: string;
  
    /** El texto seleccionado por el usuario en el editor (si aplica). */
    selectedText?: string;
  
    /**
     * Contexto específico del entorno de ejecución, como el objeto de contexto
     * de una extensión de VS Code. Permite acceder a APIs específicas del host.
     * Es de tipo `any` para flexibilidad, pero debe usarse con precaución.
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vscodeContext?: any;
  
    /**
     * Obtiene un valor del estado persistente asociado a la sesión o al workspace.
     * Permite a las herramientas guardar y recuperar información entre ejecuciones.
     * @param key La clave única para el dato a recuperar.
     * @returns El valor almacenado, o `undefined` si la clave no existe.
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    getState(key: string): any;
  
    /**
     * Guarda o actualiza un valor en el estado persistente.
     * @param key La clave única para el dato a guardar.
     * @param value El valor a almacenar. Debe ser serializable (ej. JSON).
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setState(key: string, value: any): void;
  
    // Podrían añadirse más propiedades o métodos según las necesidades:
    // - getConfig(key: string): any; // Para acceder a configuraciones
    // - getLogger(): Logger; // Para obtener una instancia de logger contextualizada
  }