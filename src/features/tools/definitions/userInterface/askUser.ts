// src/features/tools/definitions/userInterface/askUser.ts
import * as vscode from 'vscode'; // No se usa directamente vscodeAPI aquí, pero se mantiene por consistencia
import { z } from 'zod';
import { ToolDefinition, ToolResult, ToolExecutionContext, ToolPermission } from '../../types';
import { EventType } from '../../../events/eventTypes';

// Esquema Zod para los parámetros
export const askUserParamsSchema = z.object({
  prompt: z.string().min(1, { message: "Prompt message cannot be empty." }),
  inputType: z.enum(['text', 'choice', 'confirm', 'quickPick'])
             .optional()
             .default('text')
             .describe("Type of input expected: 'text' for free-form text, 'choice' for buttons (limited options), 'confirm' for Yes/No, 'quickPick' for a searchable list of options."),
  options: z.array(z.string().min(1))
            .optional()
            .describe("Array of string choices if inputType is 'choice' or 'quickPick'. Each string is a user-facing label."),
  placeholder: z.string().optional().describe("Placeholder text for 'text' input type."),
}).strict() // Move strict() before refine()
.refine(data => {
    if ((data.inputType === 'choice' || data.inputType === 'quickPick') && (!data.options || data.options.length === 0)) {
        return false;
    }
    return true;
}, {
    message: "For 'choice' or 'quickPick' input types, 'options' array must be provided and contain at least one item.",
    path: ['options']
});

// Tipo para la data retornada por la herramienta (no la respuesta del usuario)
type AskUserToolResultData = {
  status: 'userInputRequested';
  message: string; // Mensaje informativo para el LLM
  uiOperationId: string; // ID para correlacionar la respuesta del usuario
};

export const askUser: ToolDefinition<typeof askUserParamsSchema, AskUserToolResultData> = {
  name: 'askUser',
  description: 'Prompts the user for input via the chat UI or a VS Code input dialog. The AI task will pause and wait for an event containing the user\'s response, correlated by the returned uiOperationId.',
  parametersSchema: askUserParamsSchema,
  async execute(
    params, // Tipado por Zod
    context // context.dispatcher y context.chatId son obligatorios
  ): Promise<ToolResult<AskUserToolResultData>> {
    const { prompt, inputType, options, placeholder } = params;

    // uiOperationId: El ToolRegistry pasa el uiOperationId si fue generado por el orquestador.
    // Si no, la herramienta puede generar uno, pero es mejor que venga del orquestador.
    // Aquí asumimos que si context.uiOperationId no está, es un error de configuración del llamador (orquestador).
    if (!context.uiOperationId) {
        // Esto no debería ocurrir si el orquestador siempre provee uiOperationId para esta herramienta.
        context.dispatcher.systemError(
            'askUser tool called without uiOperationId in context. This is likely an orchestrator issue.',
            undefined,
            { toolName: 'askUser', chatId: context.chatId },
            'askUserTool'
        );
        // Generar uno de fallback, aunque no es ideal.
        // Opcionalmente, podríamos retornar un error aquí.
        // Por ahora, generamos uno para que la UI al menos pueda mostrar algo.
        context.uiOperationId = `askUser_fallback_${context.chatId}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    }
    
    const uiOperationId = context.uiOperationId;

    // Mapear las opciones a un formato que la UI pueda necesitar (si es diferente)
    // Por ahora, asumimos que la UI puede manejar un array de strings para 'options'.
    // Si la UI necesitara { label: string, value: string }, se haría el mapeo aquí.
    const interactionOptions = options?.map(opt => ({ label: opt, value: opt }));

    context.dispatcher.dispatch(EventType.USER_INTERACTION_REQUIRED, {
      chatId: context.chatId!, // chatId debe estar presente
      interactionType: inputType === 'confirm' ? 'confirmation' : 
                       inputType === 'choice' || inputType === 'quickPick' ? 'choiceSelection' : 'requestInput',
      uiOperationId: uiOperationId,
      promptMessage: prompt,
      // Pasar los detalles específicos del tipo de input
      ...(inputType === 'text' && { inputType: 'text', placeholder }),
      ...(inputType === 'choice' && { inputType: 'choice', options: interactionOptions }), // 'choice' podría usar botones
      ...(inputType === 'quickPick' && { inputType: 'quickPick', options: interactionOptions }), // 'quickPick' usaría un desplegable/buscador
      ...(inputType === 'confirm' && { 
          inputType: 'confirm', 
          confirmButtonText: 'Yes', // O tomar de params si se añaden
          cancelButtonText: 'No'   // O tomar de params si se añaden
      }),
      source: 'askUserTool'
    });
    
    const messageForLLM = `Input of type '${inputType}' requested from user with prompt: "${prompt}". Waiting for response with uiOperationId: ${uiOperationId}.`;
    return {
      success: true,
      data: {
        status: 'userInputRequested',
        message: messageForLLM,
        uiOperationId: uiOperationId
      },
    };
    // La herramienta retorna inmediatamente. El flujo del agente se pausará
    // hasta que un evento USER_INPUT_RECEIVED con el mismo uiOperationId llegue.
  }
};