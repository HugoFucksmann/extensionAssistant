// src/vscode/webView/formatters/MessageFormatter.ts - Simplified Version
import { ChatMessage } from '../../../features/chat/types';

export interface FormattedToolOutput {
    title: string;
    summary: string;
    details: string;
    items: any[];
    meta: {
        executionTime?: number;
        success: boolean;
        error?: string;
    };
}

export class MessageFormatter {


    public formatToolExecutionStarted(payload: any): string {
        return `Ejecutando ${payload.toolName || 'herramienta'}...`;
    }

    public formatToolExecutionCompleted(payload: any): { content: string; metadata: any } {
        const toolName = payload.toolName || 'herramienta';
        return {
            content: `✅ ${toolName} completado`,
            metadata: {
                status: 'success',
                toolName: payload.toolName,
                toolSuccess: true
            }
        };
    }

    public formatToolExecutionError(payload: any): { content: string; metadata: any } {
        const toolName = payload.toolName || 'herramienta';
        const error = payload.error || 'Error desconocido';
        return {
            content: `${toolName} falló: ${error}`,
            metadata: {
                status: 'error',
                toolName: payload.toolName,
                error: error,
                toolSuccess: false
            }
        };
    }

    public formatAgentPhaseStarted(payload: any): string {
        const phase = typeof payload === 'string' ? payload : payload.phase || payload;
        return phase || 'thinking...';
    }

    public formatAgentPhaseCompleted(payload: any): string {
        return `ase completada: ${payload.phase}`;
    }

    public formatSystemError(payload: any): string {
        const errorMessage = payload.message || payload.errorMessage || 'Error inesperado del sistema.';
        return `Error del sistema: ${errorMessage}`;
    }

    public formatResponseGenerated(payload: any): string {
        // Soportar tanto response (nuevo formato) como responseContent (formato antiguo)
        return payload.response || payload.responseContent || '';
    }



    public createBaseChatMessage(eventId: string, sender: ChatMessage['sender'], operationId?: string): Partial<ChatMessage> {
        return {
            id: operationId || eventId,
            operationId: operationId,
            timestamp: Date.now(),
            sender: sender,
            metadata: {}
        };
    }
}