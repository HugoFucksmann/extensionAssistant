// src/features/events/eventTypes.ts

/**
 * All supported event types in the system
 */
export enum EventType {
  // Conversation lifecycle
  CONVERSATION_STARTED = 'conversation:started',
  CONVERSATION_ENDED = 'conversation:ended', // Podría tener payload con motivo, si fue limpiada, etc.
  
  // ReAct cycle events (o ciclo del agente)
  REASONING_STARTED = 'react:reasoning:started',
  REASONING_COMPLETED = 'react:reasoning:completed',
  ACTION_STARTED = 'react:action:started', // Evento genérico de inicio de acción del agente
  ACTION_COMPLETED = 'react:action:completed', // Evento genérico de fin de acción del agente
  REFLECTION_STARTED = 'react:reflection:started',
  REFLECTION_COMPLETED = 'react:reflection:completed',
  CORRECTION_STARTED = 'react:correction:started',
  CORRECTION_COMPLETED = 'react:correction:completed',
  
  // Tool execution (más específico que ACTION_*)
  TOOL_EXECUTION_STARTED = 'tool:execution:started',
  TOOL_EXECUTION_COMPLETED = 'tool:execution:completed',
  TOOL_EXECUTION_ERROR = 'tool:execution:error',
  
  // Response handling
  RESPONSE_GENERATED = 'response:generated', // Cuando el LLM genera la respuesta final
  RESPONSE_DELIVERED = 'response:delivered', // Cuando la UI muestra la respuesta (si se necesita este nivel)
  
  // Node execution (para un grafo más genérico si se usa LangGraph o similar)
  NODE_START = 'node:start',
  NODE_COMPLETE = 'node:complete',
  NODE_ERROR = 'node:error',
  
  // System events
  ERROR_OCCURRED = 'error:occurred', // Un error general que no encaja en otro sitio
  SYSTEM_INFO = 'system:info',
  SYSTEM_WARNING = 'system:warning',
  SYSTEM_ERROR = 'system:error', // Errores del sistema, no necesariamente de una herramienta o nodo

  // UI Interaction events
  USER_INTERACTION_REQUIRED = 'ui:interaction:required', // Agente solicita input/confirmación a la UI
  USER_INPUT_RECEIVED = 'ui:input:received' // UI envía el input del usuario de vuelta al sistema
}

/**
* Base interface for all event payloads
*/
export interface BaseEventPayload {
timestamp?: number; // Unix timestamp (ms)
chatId?: string;    // ID de la conversación asociada, si aplica
source?: string;    // Origen del evento (e.g., 'ReActGraph', 'ToolRegistry', 'WebviewProvider')
// Podría añadirse un operationId si los eventos necesitan correlacionarse con una operación específica
}

/**
* Conversation event payload
*/
export interface ConversationEventPayload extends BaseEventPayload {
// Para CONVERSATION_STARTED
userMessage?: string; 
// Para CONVERSATION_ENDED
finalStatus?: 'completed' | 'failed' | 'cancelled';
duration?: number; // ms
// Otros metadatos de la conversación
}

/**
* Payload para CONVERSATION_ENDED, si se quiere ser más específico que ConversationEventPayload
*/
export interface ConversationEndedPayload extends BaseEventPayload {
reason: 'completed' | 'cleared_by_user' | 'error' | 'max_iterations_reached';
duration?: number;
// stateSummary?: any; // Un resumen del estado final si es útil
}

/**
* ReAct phase event payload (o Agente/Nodo genérico)
*/
export interface ReActEventPayload extends BaseEventPayload {
phase?: string;     // e.g., 'Reasoning', 'Reflection', 'ActionPlanning'
nodeType?: string;  // Si se usa un sistema de nodos más genérico
data?: any;       // Datos relevantes de la fase/nodo (plan, reflexión, etc.)
duration?: number;  // ms
error?: string;     // Si la fase/nodo falló
}

/**
* Tool execution event payload
*/
export interface ToolExecutionEventPayload extends BaseEventPayload {
toolName: string; // Nombre de la herramienta
parameters?: Record<string, any>; // Parámetros con los que se llamó
result?: any;     // Resultado de la ejecución (para _COMPLETED)
error?: string;     // Mensaje de error (para _ERROR)
duration?: number;  // ms (tiempo de ejecución de la herramienta)
// executionId?: string; // Un ID único para esta ejecución de herramienta específica
}

/**
* Response event payload
*/
export interface ResponseEventPayload extends BaseEventPayload {
responseContent: string; // El contenido de la respuesta generada
isFinal?: boolean;      // Si es la respuesta final al usuario
metadata?: Record<string, any>; // Metadatos sobre la generación de la respuesta
duration?: number;      // ms (tiempo para generar esta respuesta)
}

/**
* Node execution event payload (si se usa un sistema de grafo genérico)
*/
export interface NodeEventPayload extends BaseEventPayload {
nodeType: string;  // Tipo del nodo que se ejecutó
nodeId?: string;    // ID del nodo
input?: any;      // Entrada al nodo
output?: any;     // Salida del nodo
duration?: number;  // ms
error?: string;     // Si el nodo falló
}

/**
* Error event payload (para ERROR_OCCURRED o errores más específicos)
*/
export interface ErrorOccurredEventPayload extends BaseEventPayload {
errorMessage: string;
errorStack?: string;
errorType?: string; // e.g., 'NetworkError', 'ValidationError', 'ToolExecutionError'
details?: Record<string, any>; // Contexto adicional sobre el error
}

/**
* System event payload (para SYSTEM_INFO, SYSTEM_WARNING, SYSTEM_ERROR)
*/
export interface SystemEventPayload extends BaseEventPayload {
message: string;
level: 'info' | 'warning' | 'error'; // Nivel del mensaje del sistema
details?: Record<string, any>;
// Para SYSTEM_ERROR, podría incluir campos de ErrorOccurredEventPayload
errorObject?: { name?: string; message: string; stack?: string }; // Para serializar un Error
}

/**
* Payload para USER_INTERACTION_REQUIRED
*/
export interface UserInteractionRequiredPayload extends BaseEventPayload {
interactionType: 'requestInput' | 'confirmation' | 'choiceSelection';
uiOperationId: string; // ID para que la UI lo devuelva y se correlacione la respuesta
promptMessage: string;
// Específicos para 'requestInput'
inputType?: 'text' | 'password' | 'number'; 
placeholder?: string;
defaultValue?: string;
// Específicos para 'choiceSelection'
options?: Array<{ label: string; value: any }>;
// Específicos para 'confirmation'
confirmButtonText?: string;
cancelButtonText?: string;
// Para todos
title?: string; // Título opcional para el diálogo/prompt de UI
}

/**
* Payload para USER_INPUT_RECEIVED
*/
export interface UserInputReceivedPayload extends BaseEventPayload {
  uiOperationId: string; // El mismo ID que se envió en USER_INTERACTION_REQUIRED
  value?: any; // El valor ingresado por el usuario (puede ser string, boolean, objeto de la opción seleccionada)
  wasCancelled?: boolean; // Si el usuario canceló la interacción
}

/**
* Union type for all event payloads
* Esto ayuda a asegurar que cuando se despacha un evento, el payload coincida con el tipo.
*/
export type EventPayload = 
| BaseEventPayload // Podría ser usado para eventos muy genéricos sin payload específico
| ConversationEventPayload
| ConversationEndedPayload
| ReActEventPayload
| ToolExecutionEventPayload
| ResponseEventPayload
| NodeEventPayload
| ErrorOccurredEventPayload
| SystemEventPayload
| UserInteractionRequiredPayload
| UserInputReceivedPayload;

/**
* Complete event structure
*/
export interface WindsurfEvent {
type: EventType;
payload: EventPayload; // El payload ahora es más estrictamente tipado por el EventType
timestamp: number;     // Unix timestamp (ms)
id: string;            // UUID v4 para el evento
}

/**
* Event filter interface
*/
export interface EventFilter {
types?: EventType[];
chatId?: string;
source?: string;
timeRange?: {
  start?: number; // Unix timestamp (ms)
  end?: number;   // Unix timestamp (ms)
};
// Para filtros más complejos
custom?: (event: WindsurfEvent) => boolean;
}