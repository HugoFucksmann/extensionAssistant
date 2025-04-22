/**
 * Definición de eventos de la aplicación
 * Centraliza todos los nombres de eventos para evitar errores de tipeo
 */

export const Events = {
  // Eventos de UI
  UI: {
    MESSAGE_SENT: 'ui:message:sent',
    NEW_CHAT_REQUESTED: 'ui:chat:new',
    LOAD_CHAT_REQUESTED: 'ui:chat:load',
    MODEL_CHANGE_REQUESTED: 'ui:model:change'
  },
  
  // Eventos del orquestador
  ORCHESTRATOR: {
    PROCESSING_STARTED: 'orchestrator:processing:started',
    PROCESSING_COMPLETED: 'orchestrator:processing:completed',
    PROCESSING_ERROR: 'orchestrator:processing:error'
  },
  
  // Eventos de memoria
  MEMORY: {
    CHAT_LIST_UPDATED: 'memory:chat:list:updated',
    CHAT_LOADED: 'memory:chat:loaded',
    CHAT_SAVED: 'memory:chat:saved',
    NEW_CHAT_CREATED: 'memory:chat:new:created'
  },
  
  // Eventos de modelo
  MODEL: {
    RESPONSE_GENERATED: 'model:response:generated',
    MODEL_CHANGED: 'model:changed'
  }
};
