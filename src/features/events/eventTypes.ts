// src/features/events/eventTypes.ts

/**
 * All supported event types in the system
 */
export enum EventType {
  // Conversation lifecycle
  CONVERSATION_STARTED = 'conversation:started',
  CONVERSATION_ENDED = 'conversation:ended',

  // ReAct cycle events (si los usas directamente en EventBus para la UI)
  // REASONING_STARTED = 'react:reasoning:started',
  // ...

  // Tool execution
  TOOL_EXECUTION_STARTED = 'tool:execution:started',
  TOOL_EXECUTION_COMPLETED = 'tool:execution:completed',
  TOOL_EXECUTION_ERROR = 'tool:execution:error',

  // Response handling
  RESPONSE_GENERATED = 'response:generated',
  // RESPONSE_DELIVERED = 'response:delivered', // Si necesitas este evento

  // System events
  ERROR_OCCURRED = 'error:occurred', // Errores más genéricos del sistema o de lógica de negocio
  SYSTEM_INFO = 'system:info',
  SYSTEM_WARNING = 'system:warning',
  SYSTEM_ERROR = 'system:error' // Errores específicos del EventBus o infraestructura
}

/**
* Base interface for all event payloads
*/
export interface BaseEventPayload {
  timestamp?: number;
  chatId?: string;
  source?: string;
}

/**
* Conversation started event payload
*/
export interface ConversationStartedPayload extends BaseEventPayload {
  userMessage: string;
}

/**
* Conversation ended event payload
*/
export interface ConversationEndedPayload extends BaseEventPayload {
  success?: boolean;
  response?: string; // La respuesta final o un resumen
  error?: string;
  duration?: number;
  cleared?: boolean; // Si la conversación fue borrada
}

/**
* Tool execution event payload
*/
export interface ToolExecutionEventPayload extends BaseEventPayload {
  tool: string; // Nombre de la herramienta
  parameters?: Record<string, any>;
  result?: any;
  error?: string;
  duration?: number;
  // Podrías añadir un status explícito aquí si el tipo de evento no es suficiente
  // status: 'started' | 'completed' | 'error';
}

/**
* Response generated event payload
*/
export interface ResponseEventPayload extends BaseEventPayload {
  response: string;
  success?: boolean; // Indica si la generación fue exitosa
  duration?: number; // Tiempo que tomó generar esta respuesta específica
  metadata?: Record<string, any>; // Metadatos adicionales
}

/**
* Error occurred event payload (para errores de lógica de negocio / ReAct)
*/
export interface ErrorOccurredPayload extends BaseEventPayload {
  error: string; // Mensaje de error
  details?: any; // Detalles adicionales
  stack?: string;
  // No incluir 'message' aquí para evitar confusión con error, usar 'error' para el mensaje principal.
}


/**
* System event payload (para logs, warnings, errores de infraestructura del EventBus)
*/
export interface SystemEventPayload extends BaseEventPayload {
  message: string; // Mensaje principal
  details?: Record<string, any>;
  error?: string; // Si es un SystemError, el mensaje del error original
  stack?: string; // Si es un SystemError, el stack
  level: 'info' | 'warning' | 'error'; // Nivel del evento del sistema
}


// Union type for all event payloads
export type EventPayload =
  | BaseEventPayload // Puede ser usado para eventos muy genéricos sin payload específico
  | ConversationStartedPayload
  | ConversationEndedPayload
  | ToolExecutionEventPayload
  | ResponseEventPayload
  | ErrorOccurredPayload
  | SystemEventPayload;

/**
* Complete event structure
*/
export interface WindsurfEvent<T extends EventPayload = EventPayload> { // Hacerlo genérico
  type: EventType;
  payload: T;
  timestamp: number;
  id: string; // uuid
}

/**
* Event filter interface
*/
export interface EventFilter {
  types?: EventType[];
  chatId?: string;
  timeRange?: {
      start?: number;
      end?: number;
  };
  custom?: (event: WindsurfEvent) => boolean;
}