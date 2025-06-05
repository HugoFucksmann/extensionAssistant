// src/core/langgraph/LangGraphState.ts
import { Annotation } from "@langchain/langgraph";
import { BaseMessage } from "@langchain/core/messages";
// ASUMIENDO que deduplicateMessages se mueve a una utilidad o se importa estáticamente
// Por ejemplo, si se mueve a: import { deduplicateMessages } from '../../shared/utils/messageUtils';
// O si LangGraphEngine lo exporta directamente y no hay ciclo:
import { deduplicateMessages } from './LangGraphEngine'; // Mantener si no hay problemas

// Optimized State Structure for LangGraph
export interface OptimizedGraphState {
    messages: BaseMessage[];
    context: {
        working: string;
        memory: string;
        iteration: number;
    };
    execution: {
        plan: string[];
        tools_used: string[];
        current_tool?: string;
        current_params?: any;
    };
    validation?: {
        errors: string[];
        corrections: string[];
    };
    metadata: {
        chatId: string;
        startTime: number;
        isCompleted: boolean;
        finalOutput?: string;
    };
}

export const GraphStateAnnotation = Annotation.Root({
    messages: Annotation<BaseMessage[]>({
        reducer: (current, update) => {
            // Idealmente, esta función debería estar en un archivo de utilidades
            // para evitar importaciones dinámicas o potenciales ciclos.
            // const { deduplicateMessages } = require('./LangGraphEngine'); // Evitar si es posible
            return deduplicateMessages([...(current || []), ...(update || [])]);
        },
        default: () => []
    }),
    // ... resto de las anotaciones sin cambios
    context: Annotation<OptimizedGraphState['context']>({
        reducer: (current, update) => ({ ...current, ...update }),
        default: () => ({ working: "", memory: "", iteration: 0 })
    }),
    execution: Annotation<OptimizedGraphState['execution']>({
        reducer: (current, update) => ({ ...current, ...update }),
        default: () => ({ plan: [], tools_used: [] })
    }),
    validation: Annotation<OptimizedGraphState['validation']>({
        reducer: (current, update) => update ? { ...(current || { errors: [], corrections: [] }), ...update } : current,
        default: () => undefined
    }),
    metadata: Annotation<OptimizedGraphState['metadata']>({
        reducer: (current, update) => ({ ...current, ...update }),
        default: () => ({ chatId: "", startTime: Date.now(), isCompleted: false })
    })
});