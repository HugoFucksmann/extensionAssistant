// shared/events/legacy/windsurfEvents.ts

/**
 * Exporta los tipos de eventos utilizados en la aplicación
 * Este archivo se mantiene temporalmente para compatibilidad con código antiguo.
 * Se recomienda migrar todo el código para usar los EventType del archivo canónico.
 */

// NOTA: Se re-exporta EventType desde el archivo canónico
import { EventType } from '../types/eventTypes'; // RUTA AJUSTADA

// Esta enumeración es una reliquia y debería ser eliminada cuando el código
// que la usa sea migrado a la EventType canónica.
export enum WindsurfEvents {
  // Eventos de respuesta
  RESPONSE_GENERATED = EventType.RESPONSE_GENERATED, // Mapear a la nueva EventType
  
  // Eventos de error
  ERROR_OCCURRED = EventType.ERROR_OCCURRED, // Mapear a la nueva EventType
  
  // Eventos del ciclo ReAct
  REASONING_STARTED = EventType.REASONING_STARTED, // Mapear a la nueva EventType
  ACTION_STARTED = EventType.ACTION_STARTED, // Mapear a la nueva EventType
  REFLECTION_STARTED = EventType.REFLECTION_STARTED, // Mapear a la nueva EventType
  
  // Eventos de depuración
  DEBUG_LOG = EventType.DEBUG_LOG, // Mapear a la nueva EventType
  DEBUG_WARNING = EventType.DEBUG_WARNING, // Mapear a la nueva EventType
  DEBUG_ERROR = EventType.DEBUG_ERROR // Mapear a la nueva EventType
}

// Re-exportar los tipos necesarios de eventTypes para facilitar la migración
export * from '../types/eventTypes'; // RUTA AJUSTADA