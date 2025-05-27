// src/features/tools/definitions/userInterface/askUser.ts
import * as vscode from 'vscode';
import { ToolDefinition, ToolPermission, ToolResult, ToolExecutionContext } from '../../types';
import { EventType } from '../../../events/eventTypes'; // Ajusta la ruta según tu estructura de eventos

export const askUser: ToolDefinition = {
  name: 'askUser',
  description: 'Prompts the user for input via the chat UI or a VS Code input dialog. The AI task will pause until the user responds.',
  parameters: {
    prompt: { type: 'string', description: 'The question or message to display to the user.', required: true },
    inputType: { 
      type: 'string', 
      description: 'Type of input expected.', 
      enum: ['text', 'choice', 'confirm', 'quickPick'],
      default: 'text', 
      required: false 
    },
    options: { 
      type: 'array', 
      items: { type: 'string' },
      description: 'Array of string choices if inputType is "choice" or "quickPick".', 
      required: false 
    },
    placeholder: { type: 'string', description: 'Placeholder text for "text" input.', required: false },
  },
  requiredPermissions: ['interaction.userInput'],
  async execute(
    params: { prompt: string; inputType?: 'text' | 'choice' | 'confirm' | 'quickPick'; options?: string[]; placeholder?: string },
    context?: ToolExecutionContext & { uiOperationId?: string } // uiOperationId podría venir del contexto
  ): Promise<ToolResult> { 
    if (!context?.vscodeAPI || !context.dispatcher || !context.chatId) {
      return { success: false, error: 'VSCode API, dispatcher, or chatId not available in context for askUser tool.' };
    }

    const { prompt, inputType = 'text', options, placeholder } = params;
    
    // uiOperationId: Idealmente, el orquestador genera este ID y lo pasa en el `context`.
    // Si no está, la herramienta puede generar uno, pero es menos robusto para la correlación.
    const uiOperationId = context.uiOperationId || `askUser_fallback_${context.chatId}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    context.dispatcher.dispatch(EventType.USER_INTERACTION_REQUIRED, {
      chatId: context.chatId,
      interactionType: 'requestInput',
      uiOperationId: uiOperationId,
      details: {
        promptMessage: prompt,
        inputType: inputType,
        options: options,
        placeholder: placeholder,
      }
    });
    
    return { 
      success: true, 
      data: { 
        status: 'userInputRequested', 
        message: `Input requested from user: "${prompt}". Waiting for response with operationId: ${uiOperationId}.`,
        uiOperationId: uiOperationId 
      },
    };
  }
};