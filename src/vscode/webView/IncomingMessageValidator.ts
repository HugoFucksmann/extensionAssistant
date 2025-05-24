// src/vscode/webView/IncomingMessageValidator.ts
import { ApplicationLogicService, ProcessUserMessageResult } from '../../core/ApplicationLogicService';
import { VSCodeContext } from '../../shared/types'; // Si se necesita para obtener contexto del editor
import * as vscode from 'vscode'; // Para acceder a vscode API como activeTextEditor

// Interfaces para los payloads esperados desde la UI
interface IncomingMessage {
  type: string;
  payload?: {
    text?: string;
    chatId?: string;
    files?: string[];
  };
  text?: string;
  chatId?: string;
  files?: string[];
}

interface UserMessageSentPayload {
  chatId: string;
  text: string;
  files: string[];
}

interface NewChatRequestPayload {
  // Podría estar vacío o tener un chatId sugerido si la UI lo genera
}

// Define lo que este validador podría devolver a WebviewProvider.
// Esto es más para control de flujo interno de WebviewProvider que para la UI directamente.
export interface ValidationResult {
  isValid: boolean;
  error?: string; // Mensaje de error si la validación falla
  payload?: UserMessageSentPayload;
}

export class IncomingMessageValidator {
  constructor(
    private applicationLogicService: ApplicationLogicService,
    // Opcionalmente, pasar vscodeContext si es necesario para operaciones como getEditorContext
    // private vscodeContext: VSCodeContext
  ) {}

  /**
   * Maneja un mensaje genérico recibido desde la webview.
   * @param message El objeto mensaje con 'type' y 'payload'.
   * @param currentChatId El ID del chat activo en la UI, puede ser útil.
   * @returns Un ValidationResult que indica si el mensaje fue aceptado para procesamiento.
   */
  public static validate(message: IncomingMessage): ValidationResult {
    console.log('[IncomingMessageValidator] Received raw message:', message);

    switch (message.type) {
      case 'userMessageSent': {
        const { payload = {}, text, chatId, files } = message;
        const validatedPayload: UserMessageSentPayload = {
          text: payload.text || text || '',
          chatId: payload.chatId || chatId || `chat_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
          files: payload.files || files || []
        };

        console.debug('[MessageValidator] Processed payload:', validatedPayload);

        if (!validatedPayload.text) {
          console.error('[MessageValidator] Validation failed:', {
            message,
            extracted: validatedPayload
          });
          return { isValid: false, error: 'Message text is required' };
        }

        if (!validatedPayload.text.trim() && validatedPayload.files.length === 0) {
          return { isValid: false, error: 'Message cannot be empty' };
        }

        return { isValid: true, payload: validatedPayload };
      }

      case 'newChatRequestedByUI':
        // Validar payload si es necesario
        // const newChatPayload = message.payload as NewChatRequestPayload;
        // await this.applicationLogicService.clearConversation(currentChatId);
        // Un evento 'NEW_CHAT_STARTED' o similar será emitido por el sistema
        // y EventSubscriptionManager lo enviará a la UI.
        return { isValid: true };

      case 'historyRequestedByUI':
        // Lógica para solicitar historial, podría no necesitar ApplicationLogicService directamente
        // o podría llamar a un método específico en él.
        // Por ahora, un placeholder.
        console.log('[IncomingMessageValidator] History requested. Needs implementation.');
        return { isValid: true, error: "History request not fully implemented yet."};
        // La UI esperará un evento 'SHOW_HISTORY_VIEW' o similar.

      // Añadir más casos según los tipos de mensajes de la UI
      // case 'someOtherAction':
      //   // ... validación y llamada a ApplicationLogicService ...
      //   return { isValid: true };

      default:
        console.warn(`[IncomingMessageValidator] Unhandled message type: ${message.type}`);
        return { isValid: false, error: `Unknown message type: ${message.type}` };
    }
  }

  public async handleMessage(
    message: IncomingMessage,
    currentChatId: string // El WebviewProvider conocerá el chatId actual de la sesión
  ): Promise<ValidationResult> {
    const result = IncomingMessageValidator.validate(message);
    if (result.isValid && result.payload) {
      await this.processValidatedUserMessage(result.payload);
    }
    return result;
  }

  private async processValidatedUserMessage(payload: UserMessageSentPayload): Promise<void> {
    const editorContext = await this.getEditorContext();
    const contextData = {
      files: payload.files || [],
      editorContext,
    };

    // Llamada asíncrona. El resultado se manejará a través de eventos.
    const result = await this.applicationLogicService.processUserMessage(
      payload.chatId,
      payload.text,
      contextData
    );

    // Aquí es donde el *orquestador* (que podría ser WebviewProvider o una capa superior)
    // decidiría si emitir un evento basado en 'result'.
    // Por ejemplo, si result.success es false y result.error existe,
    // se podría emitir un evento ERROR_OCCURRED a través del InternalEventDispatcher.
    // Si result.success es true y hay un finalResponse, se podría emitir RESPONSE_GENERATED.
    // Este validador en sí mismo no emite eventos.
    if (!result.success) {
        console.error(`[IncomingMessageValidator] Processing failed for chat ${payload.chatId}: ${result.error}`);
        // El InternalEventDispatcher debería ser usado por el llamador de este validador
        // o por EventSubscriptionManager para notificar a la UI.
    } else {
        console.log(`[IncomingMessageValidator] Processing successful for chat ${payload.chatId}. Response: ${result.finalResponse?.substring(0,50)}`);
    }
  }


  private async getEditorContext(): Promise<any> {
    const editor = vscode.window.activeTextEditor;
    if (!editor) return null;

    return {
      fileName: editor.document.fileName,
      languageId: editor.document.languageId,
      selection: editor.selection
        ? {
            start: {
              line: editor.selection.start.line,
              character: editor.selection.start.character,
            },
            end: {
              line: editor.selection.end.line,
              character: editor.selection.end.character,
            },
            text: editor.document.getText(editor.selection),
          }
        : null,
      visibleRange: editor.visibleRanges.length > 0 ? {
        start: { line: editor.visibleRanges[0].start.line },
        end: { line: editor.visibleRanges[0].end.line },
      } : null,
    };
  }
}