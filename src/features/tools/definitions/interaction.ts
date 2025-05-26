import { EventType } from '@features/events/eventTypes';
import { ToolDefinition, ToolResult, ToolExecutionContext, ToolPermission } from '../types';
// Esta herramienta es especial, no devuelve inmediatamente.
// Necesita una forma de comunicarse con WebviewProvider para mostrar UI y pausar.

export const askUserForInput: ToolDefinition = {
    name: 'askUserForInput',
    description: 'Asks the user for input or a choice via the chat UI.',
    parameters: {
      promptMessage: { type: 'string', description: 'The message/question to display to the user.', required: true },
      inputType: { type: 'string', description: 'Type of input expected.', enum: ['text', 'boolean', 'choice'], default: 'text', required: false },
      options: { 
        type: 'array', 
        description: 'Array of strings for "choice" inputType.', 
        items: { // Asegúrate que esta parte esté completa
          type: 'string',
          description: 'Una opción de elección para el usuario.' // AÑADIR DESCRIPCIÓN AQUÍ
        }, 
        required: false 
      },
      placeholder: { type: 'string', description: 'Placeholder for "text" input.', required: false },
      operationId: { type: 'string', description: 'An ID to correlate this request with a future response.', required: true }
    },
  requiredPermissions: ['interaction.userInput'],
  async execute(params: { promptMessage: string; inputType?: string; options?: string[]; placeholder?: string; operationId: string }, context?: ToolExecutionContext): Promise<ToolResult> {
    // ESTA ES LA PARTE COMPLEJA
    // 1. La herramienta necesita notificar al WebviewProvider para que muestre la UI de input.
    //    - Podría hacerlo emitiendo un evento específico que WebviewProvider escuche.
    //    - O si ToolExecutionContext tiene el dispatcher, podría emitirlo.
    //    - Payload del evento: { type: 'requestUserInput', promptMessage, inputType, options, placeholder, operationId }
    //
    // 2. WebviewProvider muestra la UI. Cuando el usuario responde, envía un mensaje de vuelta
    //    al WebviewProvider (ej. { type: 'userInputProvided', value, operationId }).
    //
    // 3. WebviewProvider notifica al sistema del agente (ej. ReActGraph) que la entrada está lista.
    //    - Podría ser otro evento: { type: 'userInputReceived', value, operationId }
    //
    // 4. El ReActGraph (o el agente) debe estar en un estado de "espera" y reanudarse cuando
    //    llegue este evento, usando el operationId para correlacionar.
    //
    // Por ahora, simularemos que la herramienta simplemente devuelve un mensaje indicando que está esperando.
    // El flujo real de LangGraph o similar manejaría la suspensión/reanudación.

    if (context?.dispatcher && context.chatId) { // Asumiendo que el dispatcher y chatId están en el contexto
        context.dispatcher.dispatch(EventType.USER_INTERACTION_REQUIRED, { // NUEVO TIPO DE EVENTO
            chatId: context.chatId,
            interactionType: 'requestInput',
            details: {
                promptMessage: params.promptMessage,
                inputType: params.inputType || 'text',
                options: params.options,
                placeholder: params.placeholder,
                uiOperationId: params.operationId // ID para que la UI lo devuelva
            }
        });
    } else {
        console.warn('[askUserForInput] Dispatcher or ChatID not available in context. Cannot send USER_INTERACTION_REQUIRED event.');
    }
    
    // La herramienta en sí no puede "esperar" aquí en un flujo simple de request/response.
    // Devuelve un estado que indica que se ha solicitado la entrada.
    // El orquestador (ReActGraph) interpretaría esto para pausar.
    return { 
      success: true, 
      data: { 
        status: 'userInputRequested', 
        message: `Solicitando entrada al usuario: "${params.promptMessage}". Esperando respuesta con operationId: ${params.operationId}.`,
        operationId: params.operationId 
      },
      // Es importante que el orquestador sepa que esta herramienta no produce un "resultado" final
      // sino que desencadena un flujo de interacción.
      // Podríamos añadir una propiedad a ToolResult o ToolDefinition para indicar esto.
      // por ejemplo: requiresFollowUp: true
    };
  }
};