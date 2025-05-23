// src/vscode/webView/MessageForwarder.ts
import { WindsurfController } from '../../core/WindsurfController';
import { eventBus } from '../../features/events/EventBus';
import { EventType } from '../../features/events/eventTypes';
import * as vscode from 'vscode'; // Para getEditorContext

export class MessageForwarder {
  constructor(
    private controller: WindsurfController,
    // No necesitamos getCurrentChatId aquí, WebviewProvider lo pasará directamente
  ) {}

  public async forwardUserMessageToController(
    chatId: string,
    text: string,
    files: string[] = []
  ): Promise<void> {
    if (!text.trim() && files.length === 0) {
      // Este error debería ser manejado por WebviewProvider antes de llamar aquí,
      // o podemos lanzar una excepción para que WebviewProvider la capture.
      // Por ahora, emitiremos un evento de error que WebviewProvider debería capturar.
      console.warn('[MessageForwarder] Attempted to forward an empty message.');
      eventBus.emitEvent(EventType.ERROR_OCCURRED, {
        chatId,
        error: 'Message content cannot be empty.',
        source: 'MessageForwarder.Validation',
      });
      return;
    }

    const editorContext = await this.getEditorContext();
    const contextData = {
      files,
      editorContext,
    };

    console.log(
      `[MessageForwarder] Forwarding user message to controller for chat ${chatId}: "${text.substring(
        0,
        30
      )}"`
    );
    try {
      // La respuesta del controlador se emitirá al EventBus, WebviewProvider la capturará.
      await this.controller.processUserMessage(chatId, text, contextData);
    } catch (error) {
      console.error(
        `[MessageForwarder] Error calling controller.processUserMessage for chat ${chatId}:`,
        error
      );
      eventBus.emitEvent(EventType.ERROR_OCCURRED, {
        chatId,
        error: `Controller processing failed: ${(error as Error).message}`,
        stack: (error as Error).stack,
        source: 'MessageForwarder.ControllerCall',
      });
      // Opcionalmente, re-lanzar si WebviewProvider debe manejarlo de forma diferente
      // throw error;
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