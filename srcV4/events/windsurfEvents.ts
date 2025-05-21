/**
 * Exporta los tipos de eventos utilizados en la aplicación
 * Esto proporciona una interfaz más limpia para los consumidores de eventos
 */

export enum WindsurfEvents {
  // Eventos de respuesta
  RESPONSE_GENERATED = 'response:generated',
  
  // Eventos de error
  ERROR_OCCURRED = 'error:occurred',
  
  // Eventos del ciclo ReAct
  REASONING_STARTED = 'react:reasoning:started',
  ACTION_STARTED = 'react:action:started',
  REFLECTION_STARTED = 'reflection:started',
  
  // Eventos de depuración
  DEBUG_LOG = 'debug:log',
  DEBUG_WARNING = 'debug:warning',
  DEBUG_ERROR = 'debug:error'
}

// Re-exportar los tipos necesarios de eventTypes
export * from './eventTypes';
