// src/core/langgraph/LangGraphState.ts
import { Annotation } from "@langchain/langgraph";
import { BaseMessage } from "@langchain/core/messages";

// Optimized State Structure for LangGraph
export interface OptimizedGraphState {
    messages: BaseMessage[];
    context: {
        working: string;      // Contexto activo de la tarea actual
        memory: string;       // Memoria relevante recuperada
        iteration: number;    // Contador de iteraciones del grafo
    };
    execution: {
        plan: string[];       // Plan de acción generado por el análisis
        tools_used: string[]; // Herramientas que ya se han ejecutado en esta conversación
        current_tool?: string; // Herramienta seleccionada en la iteración actual
        current_params?: any;  // Parámetros para la herramienta actual
    };
    validation?: {          // Opcional, solo cuando se necesita validación explícita
        errors: string[];
        corrections: string[];
    };
    metadata: {
        chatId: string;       // ID del chat actual
        startTime: number;    // Timestamp de inicio del procesamiento del grafo
        isCompleted: boolean; // Indica si el grafo ha finalizado su ejecución
        finalOutput?: string;  // La respuesta final generada para el usuario
    };
}

// State annotation for LangGraph
// Esto le dice a LangGraph cómo manejar cada parte del estado,
// especialmente cómo combinar actualizaciones (reducer) y cuál es el valor por defecto.
export const GraphStateAnnotation = Annotation.Root({
    messages: Annotation<BaseMessage[]>({
        reducer: (current, update) => {
            // Importación dinámica para evitar dependencias circulares
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            const { deduplicateMessages } = require('./LangGraphEngine');
            return deduplicateMessages([...(current || []), ...(update || [])]);
        },
        default: () => []
    }),
    context: Annotation<OptimizedGraphState['context']>({
        reducer: (current, update) => ({ ...current, ...update }), // Sobrescribe con la nueva información
        default: () => ({ working: "", memory: "", iteration: 0 })
    }),
    execution: Annotation<OptimizedGraphState['execution']>({
        reducer: (current, update) => ({ ...current, ...update }),
        default: () => ({ plan: [], tools_used: [] })
    }),
    validation: Annotation<OptimizedGraphState['validation']>({
        reducer: (current, update) => update ? { ...(current || { errors: [], corrections: [] }), ...update } : current,
        default: () => undefined // Por defecto, no hay estado de validación
    }),
    metadata: Annotation<OptimizedGraphState['metadata']>({
        reducer: (current, update) => ({ ...current, ...update }),
        default: () => ({ chatId: "", startTime: Date.now(), isCompleted: false })
    })
});