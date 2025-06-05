// src/vscode/webView/formatters/MessageFormatter.ts
import { ChatMessage } from '../../../features/chat/types';
import {
    ToolExecutionEventPayload,
    AgentPhaseEventPayload,
    SystemEventPayload,
    ResponseEventPayload
} from '../../../features/events/eventTypes';

export interface FormattedMessage {
    title: string;
    summary: string;
    details: string;
}

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
    private readonly phaseNames: Record<string, string> = {
        'initialAnalysis': '🔍 Analizando la consulta',
        'reasoning': '🤔 Razonando sobre la acción',
        'finalResponseGeneration': '✍️ Generando respuesta final'
    };

    private readonly phaseCompletedNames: Record<string, string> = {
        'initialAnalysis': '✅ Análisis completado',
        'reasoning': '✅ Razonamiento completado',
        'finalResponseGeneration': '✅ Respuesta lista'
    };

    public formatToolExecutionStarted(payload: ToolExecutionEventPayload): string {
        return `🔧 ${payload.toolDescription || `Ejecutando ${payload.toolName || 'herramienta'}`}...`;
    }

    public formatToolExecutionCompleted(payload: ToolExecutionEventPayload): { content: string; metadata: any } {
        const toolDisplayName = payload.toolDescription || payload.toolName || 'La herramienta';
        const formattedOutput = this.formatToolOutput(payload.toolName || 'UnknownTool', payload.rawOutput);

        const contentLines: string[] = [
            `✅ ${toolDisplayName} finalizó correctamente.`,
            `📋 ${formattedOutput.summary}`
        ];

        if (payload.modelAnalysis?.interpretation) {
            const interpretation = payload.modelAnalysis.interpretation;
            contentLines.push(`🧠 Análisis: ${interpretation.substring(0, 100)}${interpretation.length > 100 ? '...' : ''}`);
        }

        return {
            content: contentLines.join('\n'),
            metadata: {
                status: 'success',
                toolName: payload.toolName,
                toolInput: payload.parameters,
                toolOutput: {
                    title: formattedOutput.title,
                    summary: formattedOutput.summary,
                    details: formattedOutput.details,
                    items: Array.isArray(payload.rawOutput) ? payload.rawOutput : [payload.rawOutput],
                    meta: {
                        executionTime: payload.duration,
                        success: true
                    }
                },
                modelAnalysis: payload.modelAnalysis,
                toolSuccess: true,
                warnings: (payload.rawOutput as any)?.warnings
            }
        };
    }

    public formatToolExecutionError(payload: ToolExecutionEventPayload): { content: string; metadata: any } {
        const toolDisplayName = payload.toolDescription || payload.toolName || 'La herramienta';
        const errorMessage = payload.error || 'Error desconocido al ejecutar la herramienta.';
        const formattedOutput = this.formatToolOutput(payload.toolName || 'UnknownTool', { error: errorMessage }, true);

        const content = [
            `❌ ${toolDisplayName} encontró un error`,
            `📋 ${formattedOutput.summary}`
        ].join('\n');

        return {
            content,
            metadata: {
                status: 'error',
                toolName: payload.toolName,
                toolInput: payload.parameters,
                error: errorMessage,
                toolOutput: {
                    title: formattedOutput.title,
                    summary: formattedOutput.summary,
                    details: formattedOutput.details,
                    items: [],
                    meta: {
                        executionTime: payload.duration,
                        success: false,
                        error: errorMessage
                    }
                },
                rawOutput: payload.rawOutput,
                modelAnalysis: payload.modelAnalysis,
                toolSuccess: false,
                warnings: (payload.rawOutput as any)?.warnings
            }
        };
    }

    public formatAgentPhaseStarted(payload: AgentPhaseEventPayload): string {
        return this.phaseNames[payload.phase] || `Iniciando fase: ${payload.phase}`;
    }

    public formatAgentPhaseCompleted(payload: AgentPhaseEventPayload): string {
        let content = this.phaseCompletedNames[payload.phase] || `Fase completada: ${payload.phase}`;

        if (payload.data) {
            if (payload.phase === 'initialAnalysis' && payload.data.analysis?.understanding) {
                const understanding = payload.data.analysis.understanding.substring(0, 100);
                content += `\n💡 Entendimiento: ${understanding}${payload.data.analysis.understanding.length > 100 ? '...' : ''}`;
            } else if (payload.phase === 'reasoning' && payload.data.reasoning?.nextAction) {
                const action = payload.data.reasoning.nextAction === 'use_tool' ?
                    `usar herramienta: ${payload.data.reasoning.tool}` :
                    'responder al usuario';
                content += `\n🎯 Próxima acción: ${action}`;
            }
        }

        return content;
    }

    public formatSystemError(payload: SystemEventPayload): string {
        let errorMessageText = 'Error inesperado del sistema.';

        if ('message' in payload && typeof payload.message === 'string') {
            errorMessageText = payload.message;
        } else if ('errorMessage' in payload && typeof payload.errorMessage === 'string') {
            errorMessageText = payload.errorMessage;
        }

        return `⚠️ Error del sistema: ${errorMessageText}`;
    }

    public formatResponseGenerated(payload: ResponseEventPayload): string {
        return payload.responseContent;
    }

    private formatToolOutput(toolName: string, rawOutput: any, isError: boolean = false): FormattedMessage {
        const toolDisplayName = toolName || 'herramienta';

        if (isError || (rawOutput && !rawOutput.success && rawOutput.error)) {
            const error = rawOutput?.error || 'Error desconocido';
            return {
                title: `❌ Error en ${toolDisplayName}`,
                summary: error,
                details: error
            };
        }

        if (rawOutput === null || rawOutput === undefined) {
            return {
                title: `✅ ${toolDisplayName} completado`,
                summary: 'La operación se completó correctamente',
                details: ''
            };
        }

        if (typeof rawOutput === 'string') {
            return {
                title: `✅ ${toolDisplayName} completado`,
                summary: rawOutput.length > 150 ? rawOutput.substring(0, 150) + '...' : rawOutput,
                details: rawOutput
            };
        }

        if (Array.isArray(rawOutput)) {
            return {
                title: `✅ ${toolDisplayName} completado`,
                summary: `Se devolvieron ${rawOutput.length} elementos`,
                details: JSON.stringify(rawOutput, null, 2)
            };
        }

        return {
            title: `✅ ${toolDisplayName} completado`,
            summary: 'Ejecución exitosa',
            details: JSON.stringify(rawOutput, null, 2) || 'Sin datos de salida'
        };
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