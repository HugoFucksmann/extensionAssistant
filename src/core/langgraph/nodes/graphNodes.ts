// Este archivo representa el contenido combinado de:
// - analysisNode.ts
// - reasoningNode.ts
// - responseNode.ts

import { AgentState } from '../GraphState';
import { ComponentFactory } from '@core/ComponentFactory';
import { HumanMessage, AIMessage, SystemMessage, BaseMessage, ToolMessage } from '@langchain/core/messages';
import { analysisPromptLC, analysisOutputSchema, AnalysisOutput } from '../../../features/ai/prompts/optimized/analysisPrompt';
import { simplePlannerPrompt, simplePlannerParser, simplePlannerSchema, SimplePlannerOutput } from '../../../features/ai/prompts/planner/simplePlannerPrompt';
import { robustPlannerPrompt, robustPlannerParser, robustPlannerSchema, RobustPlannerOutput } from '../../../features/ai/prompts/planner/robustPlannerPrompt';
import { supervisedPlannerPrompt, supervisedPlannerParser, supervisedPlannerSchema, SupervisedPlannerOutput } from '../../../features/ai/prompts/planner/noSupervisedPlannerPrompt';
import { finalResponsePrompt, finalResponseParser, finalResponseSchema } from '../../../features/ai/prompts/planner/finalResponsePrompt';
import { executorPrompt, executorParser, executorSchema } from '../../../features/ai/prompts/planner/executorPrompt';
import { EventType } from '../../../features/events/eventTypes';

import { defaultParser } from '@shared/utils/aiResponseParser';


export async function analysisNode(state: AgentState): Promise<Partial<AgentState>> {
    const modelManager = ComponentFactory.getModelManager();
    const toolRegistry = ComponentFactory.getToolRegistry();
    const model = modelManager.getActiveModel();
    const dispatcher = ComponentFactory.getInternalEventDispatcher();

    try {
        console.log('[AnalysisNode] Iniciando análisis para query:', state.userQuery);
        const analysisChain = analysisPromptLC.pipe(model);
        const rawResponse = await analysisChain.invoke({
            userQuery: state.userQuery,
            codeContext: '',
            memoryContext: '',
            availableTools: JSON.stringify(toolRegistry.getAllTools().map(t => ({ name: t.name, description: t.description }))),
        });

        const parseResult = await defaultParser.parseWithAutoCorrect(rawResponse.content as string, analysisOutputSchema, { correctionModel: model });

        if (!parseResult.success) {
            throw new Error(`Failed to parse analysis output: ${parseResult.error.message}`);
        }

        const analysisResult = parseResult.data;
        console.log('[AnalysisNode] Análisis completado con éxito.');

        // Devolvemos solo lo que este nodo produce
        return {
            analysisResult,
            messages: [new SystemMessage(`Análisis inicial completado: La tarea es de tipo '${analysisResult.taskType}'. Plan inicial: ${analysisResult.initialPlan.join('; ')}`)],
        };

    } catch (error: any) {
        console.error('[AnalysisNode] Error durante el análisis:', error.message);
        dispatcher.systemError(`Error durante el análisis: ${error.message}`, error as Error, {}, 'AnalysisNode');
        // Devolvemos un mensaje de error para que el siguiente nodo pueda reaccionar
        return {
            messages: [new SystemMessage(`Error en el análisis: ${error.message}`)],
            errorCount: (state.errorCount || 0) + 1
        };
    }
}

// NODO DE RAZONAMIENTO (Ahora es el "Agent Core")
// Decide si usar una herramienta o si ya puede responder.
import { ChatPromptTemplate, MessagesPlaceholder } from "@langchain/core/prompts";

// Interfaz para modelos que soportan withTools
interface ModelWithToolsSupport {
    withTools: (tools: any[]) => any;
}

// Type guard para verificar si un modelo soporta withTools
function supportsWithTools(model: any): model is ModelWithToolsSupport {
    return typeof model.withTools === "function";
}

export async function reasoningNode(state: AgentState): Promise<Partial<AgentState>> {
    const modelManager = ComponentFactory.getModelManager();
    const toolRegistry = ComponentFactory.getToolRegistry();
    const model = modelManager.getActiveModel();

    console.log('[ReasoningNode] Decidiendo siguiente acción...');

    const tools = toolRegistry.asDynamicTools();

    try {
        // Verificar si el modelo soporta withTools de manera segura
        if (supportsWithTools(model)) {
            console.log('[ReasoningNode] Usando método nativo withTools');
            // Ahora TypeScript sabe que model tiene el método withTools
            const modelWithTools = model.withTools(tools);
            const response = await modelWithTools.invoke(state.messages);
            return { messages: [response] };
        }

        // Enfoque alternativo: Usar un enfoque simplificado con instrucciones en el mensaje de sistema
        console.log('[ReasoningNode] Usando enfoque con instrucciones en mensaje de sistema');

        // Filtrar los mensajes existentes para eliminar cualquier mensaje de sistema
        // Usamos el método _getType() que está disponible en todos los mensajes de LangChain
        const nonSystemMessages = state.messages.filter(msg => {
            // En LangChain, podemos verificar la instancia del mensaje directamente
            return !(msg instanceof SystemMessage);
        });

        // Crear un mensaje de sistema que instruya sobre el uso de herramientas
        const systemMessage = new SystemMessage({
            content: `Eres un asistente inteligente con acceso a las siguientes herramientas:
${tools.map(tool => `- ${tool.name}: ${tool.description}`).join('\n')}

Para usar una herramienta, responde con un formato JSON como este:
{"tool": "nombre_herramienta", "tool_input": {"param1": "valor1"}}

Si no necesitas usar una herramienta, simplemente responde al usuario directamente.`
        });

        // Preparar los mensajes para el modelo, asegurando que el mensaje de sistema esté al principio
        const messages = [systemMessage, ...nonSystemMessages];

        // Invocar el modelo con los mensajes
        const response = await model.invoke(messages);

        return { messages: [response] };
    } catch (error: any) {
        console.error('[ReasoningNode] Error al procesar con herramientas:', error);
        // Fallback: intentar invocar el modelo directamente sin herramientas
        console.log('[ReasoningNode] Fallback: invocando modelo sin herramientas');
        const response = await model.invoke(state.messages);
        return { messages: [response] };
    }
}

// NODO DE RESPUESTA FINAL
export async function responseNode(state: AgentState): Promise<Partial<AgentState>> {
    const modelManager = ComponentFactory.getModelManager();
    const model = modelManager.getActiveModel();
    
    console.log('[ResponseNode] Generando respuesta final...');
    const responseChain = finalResponsePrompt.pipe(model);
    const rawResponse = await responseChain.invoke({
        userQuery: state.userQuery,
        allResults: JSON.stringify(state.messages),
    });

    try {
        // Intentar parsear la respuesta
        const parseResult = await defaultParser.parseWithAutoCorrect(rawResponse.content as string, finalResponseSchema, { correctionModel: model });
        
        if (!parseResult.success) {
            console.error(`[ResponseNode] Error al parsear respuesta final: ${parseResult.error.message}. Usando respuesta cruda como fallback.`);
            // Fallback: usar la respuesta cruda si el parseo JSON falla.
            const finalResponse = rawResponse.content as string;
            
            // Intentar extraer la respuesta si está en formato JSON (incluso si falló el parser)
            try {
                // Intentar eliminar los delimitadores de código markdown si existen
                const cleanedResponse = finalResponse.replace(/```json\n|```\n|```/g, '').trim();
                const jsonData = JSON.parse(cleanedResponse);
                if (jsonData && jsonData.response) {
                    // Usar la respuesta extraída del JSON
                    return { finalResponse: jsonData.response };
                }
            } catch (error) {
                // Error al procesar el JSON
                const jsonError = error as Error;
                console.log('[ResponseNode] No se pudo extraer respuesta del JSON:', jsonError.message);
            }
            
            // Si no se pudo extraer, usar la respuesta cruda
            return { finalResponse };
        }
        
        // Extraer la respuesta del objeto parseado correctamente
        const finalResponse = parseResult.data.response;
        console.log('[ResponseNode] Respuesta final generada:', finalResponse);
        
        return { finalResponse };
    } catch (error: any) {
        console.error('[ResponseNode] Error al procesar respuesta final:', error);
        // En caso de error, devolver un mensaje de error como respuesta final
        const finalResponse = `Lo siento, ocurrió un error al generar la respuesta: ${error.message}`;
        
        return { finalResponse };
    }
}