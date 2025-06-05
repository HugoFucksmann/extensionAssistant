// src/core/langgraph/nodes/executeNode.ts
import { OptimizedGraphState } from '../LangGraphState';
import { NodeDependencies as BaseNodeDependencies } from './analyzeNode'; // analyzeNode ya exporta NodeDependencies
import { ToolRegistry } from '../../../features/tools/ToolRegistry';
import { EventType, AgentPhaseEventPayload, ToolExecutionEventPayload } from '@features/events/eventTypes';
import { AIMessage, HumanMessage, SystemMessage, ToolMessage, BaseMessage } from '@langchain/core/messages';
import { ToolResult } from '../../../features/tools/types';
import { generateUniqueId } from '../../../shared/utils/generateIds';
import { getConfig } from '../../../shared/config2';

// NUEVAS IMPORTACIONES DIRECTAS
import { reasoningPromptLC, reasoningOutputSchema, ReasoningOutput } from "../../../features/ai/prompts/optimized/reasoningPrompt";
import { actionPromptLC, actionOutputSchema, ActionOutput } from "../../../features/ai/prompts/optimized/actionPrompt";
import { createAutoCorrectStep } from "../../../shared/utils/aiResponseParser";
import { invokeModelWithLogging } from "../ModelInvokeLogger";


function formatForPrompt(obj: unknown): string {
    return typeof obj === 'string' ? obj : JSON.stringify(obj);
}


export interface ExecuteNodeDependencies extends BaseNodeDependencies {
    executedToolsInSession: Set<string>;
}

function formatToolsDescription(toolRegistry: ToolRegistry): string {
    return toolRegistry.getAllTools().map(tool => {
        let paramsDesc = "No parameters.";
        if (tool.parametersSchema) {
            try {
                const shape = (tool.parametersSchema as any).shape || (tool.parametersSchema._def as any)?.shape;
                if (shape) {
                    paramsDesc = "Parameters:\n" + Object.entries(shape).map(([key, val]: [string, any]) => {
                        const typeName = val._def?.typeName?.replace('Zod', '') || 'unknown';
                        const description = val.description ? ` (${val.description})` : '';
                        const isOptional = val._def?.typeName === 'ZodOptional' || val._def?.typeName === 'ZodDefault';
                        return `  - ${key}${isOptional ? ' (optional)' : ''}: ${typeName}${description}`;
                    }).join('\n');
                } else if (tool.parametersSchema.description) {
                    paramsDesc = `Parameters: ${tool.parametersSchema.description}`;
                } else {
                    paramsDesc = `Parameters schema type: ${tool.parametersSchema._def?.typeName || 'Complex'}`;
                }
            } catch (e) {
                paramsDesc = "Parameters schema available but complex to describe textually.";
            }
        }
        return `${tool.name}: ${tool.description}\n${paramsDesc}`;
    }).join('\n\n');
}


export async function executeNodeFunc(
    state: OptimizedGraphState,
    dependencies: ExecuteNodeDependencies
): Promise<Partial<OptimizedGraphState>> {
    const { modelManager, dispatcher, hybridMemory, performanceMonitor, toolRegistry, executedToolsInSession } = dependencies;
    const startTime = Date.now();
    const currentGraphIteration = state.context.iteration + 1;

    const maxGraphIterations = getConfig(process.env.NODE_ENV === 'production' ? 'production' : 'development').backend.langgraph.maxIterations;

    dispatcher.dispatch(EventType.AGENT_PHASE_STARTED, {
        phase: 'executionLoop',
        chatId: state.metadata.chatId,
        iteration: currentGraphIteration,
        timestamp: Date.now(),
        source: 'LangGraphEngine.executeNode'
    } as AgentPhaseEventPayload);

    if (currentGraphIteration > maxGraphIterations) {
        const iterMsg = `LangGraph executeNode reached max iterations (${maxGraphIterations}). Moving to respond.`;
        dispatcher.systemWarning(iterMsg, { chatId: state.metadata.chatId, iteration: currentGraphIteration }, 'LangGraphEngine.executeNode');
        performanceMonitor.trackNodeExecution('executeNode.maxIterations', Date.now() - startTime);
        return {
            messages: [...state.messages, new AIMessage("Reached maximum processing iterations. I will try to provide a response based on current information.")],
            metadata: { ...state.metadata, isCompleted: true, finalOutput: "Reached maximum processing iterations. Unable to fully complete the request." },
            context: { ...state.context, iteration: currentGraphIteration }
        };
    }

    let updatedMessages: BaseMessage[] = [...state.messages];
    let updatedExecution = { ...state.execution };
    let updatedContext = { ...state.context, iteration: currentGraphIteration };
    let updatedValidation = state.validation ? { ...state.validation } : { errors: [], corrections: [] };
    let updatedMetadata = { ...state.metadata };

    try {
        const humanMessages = state.messages.filter((m): m is HumanMessage => m.getType() === 'human' || m._getType?.() === 'human');
        const userQuery = humanMessages.length > 0
            ? humanMessages[humanMessages.length - 1].content as string
            : state.context.working;

        const queryForExecution = userQuery || state.context.working;
        if (!queryForExecution) {
            const errorMsg = "No user query or working context for execution.";
            dispatcher.systemError(errorMsg, new Error(errorMsg), { chatId: state.metadata.chatId }, 'LangGraphEngine.executeNode');
            return {
                messages: [...state.messages, new AIMessage(errorMsg)],
                metadata: { ...state.metadata, isCompleted: true, finalOutput: errorMsg },
                validation: { ...(state.validation || { errors: [], corrections: [] }), errors: [...(state.validation?.errors || []), errorMsg] },
                context: { ...state.context, iteration: currentGraphIteration }
            };
        }

        const model = modelManager.getActiveModel();

        // --- 1. Reasoning Phase ---
        const reasoningPhaseStart = Date.now();
        dispatcher.dispatch(EventType.AGENT_PHASE_STARTED, { phase: 'reasoning', chatId: state.metadata.chatId, iteration: currentGraphIteration, source: 'LangGraphEngine.executeNode.reasoning' } as AgentPhaseEventPayload);

        const memoryForReasoning = await hybridMemory.getRelevantContext(
            state.metadata.chatId, queryForExecution, state.context.working, updatedMessages
        );
        updatedContext.memory = memoryForReasoning;

        // LÓGICA DE OptimizedReasoningChain INTEGRADA AQUÍ
        const reasoningPromptInput = {
            userQuery: queryForExecution,
            analysisResult: formatForPrompt({ understanding: state.context.working, initialPlan: state.execution.plan }),
            toolsDescription: formatToolsDescription(toolRegistry),
            previousToolResults: formatForPrompt(updatedMessages
                .filter((m): m is ToolMessage => (m.getType?.() || m._getType?.()) === 'tool')
                .map(tm => ({ name: tm.name || 'unknown_tool', result: tm.content }))),
            memoryContext: memoryForReasoning || ''
        };

        const reasoningParseStep = createAutoCorrectStep(reasoningOutputSchema, model, {
            maxAttempts: 2,
            verbose: process.env.NODE_ENV === 'development'
        });

        const reasoningChain = reasoningPromptLC.pipe(model).pipe((response: any) => { // Extract content if necessary
            if (response && typeof response === 'object' && 'content' in response) {
                return response.content;
            }
            return response;
        }).pipe(reasoningParseStep);

        const reasoningResult: ReasoningOutput = await invokeModelWithLogging(
            reasoningChain,
            reasoningPromptInput,
            { caller: 'executeNodeFunc.reasoning' }
        );
        // FIN LÓGICA INTEGRADA

        dispatcher.dispatch(EventType.AGENT_PHASE_COMPLETED, { phase: 'reasoning', chatId: state.metadata.chatId, iteration: currentGraphIteration, data: reasoningResult, source: 'LangGraphEngine.executeNode.reasoning', duration: Date.now() - reasoningPhaseStart } as AgentPhaseEventPayload);
        performanceMonitor.trackNodeExecution('executeNode.reasoning', Date.now() - reasoningPhaseStart);

        updatedMessages.push(new AIMessage({ content: `Reasoning: ${reasoningResult.reasoning}. Next Action: ${reasoningResult.nextAction}${reasoningResult.tool ? ` (${reasoningResult.tool})` : ''}` }));

        if (reasoningResult.nextAction === 'respond') {
            performanceMonitor.trackNodeExecution('executeNode.respondAfterReasoning', Date.now() - startTime);
            updatedMessages.push(new AIMessage(reasoningResult.response || "Decided to respond based on current information."));
            updatedMetadata.isCompleted = true;
            updatedMetadata.finalOutput = reasoningResult.response || "Process decided to respond at reasoning stage.";
            return { messages: updatedMessages, metadata: updatedMetadata, context: updatedContext };
        }

        if (reasoningResult.nextAction === 'use_tool' && reasoningResult.tool) {
            const toolName = reasoningResult.tool;
            const toolParams = reasoningResult.parameters || {};
            const orderedParams = JSON.stringify(Object.keys(toolParams).sort().reduce((obj, key) => { obj[key] = toolParams[key]; return obj; }, {} as any));
            const toolKey = `${toolName}::${orderedParams}`;

            if (executedToolsInSession.has(toolKey)) {
                const dedupMsg = `I've already tried running ${toolName} with similar parameters recently. I'll try a different approach or provide a response based on what I know.`;
                dispatcher.systemWarning(`Tool ${toolName} with same params already executed. Skipping.`, { toolName, toolParams, chatId: state.metadata.chatId }, 'LangGraphEngine.executeNode');
                performanceMonitor.trackNodeExecution('executeNode.deduplicatedTool', Date.now() - startTime);
                updatedMessages.push(new AIMessage(dedupMsg));
                return { messages: updatedMessages, context: updatedContext };
            }
            executedToolsInSession.add(toolKey);
            updatedExecution.current_tool = toolName;
            updatedExecution.current_params = toolParams;

            // --- 2. Tool Execution ---
            const toolExecutionStart = Date.now();
            const operationId = generateUniqueId();
            const tool = toolRegistry.getTool(toolName);

            if (!tool) {
                const noToolMsg = `Tool "${toolName}" specified by reasoning is not available.`;
                dispatcher.systemError(noToolMsg, new Error(noToolMsg), { toolName, chatId: state.metadata.chatId }, 'LangGraphEngine.executeNode');
                performanceMonitor.trackNodeExecution('executeNode.toolNotFound', Date.now() - toolExecutionStart, noToolMsg);
                updatedMessages.push(new AIMessage(`I tried to use a tool called "${toolName}", but it's not available.`));
                updatedValidation.errors.push(noToolMsg);
                return { messages: updatedMessages, validation: updatedValidation, context: updatedContext, execution: updatedExecution };
            }
            const toolDescriptionForEvent = tool.description || `Executing ${toolName}`;

            dispatcher.dispatch(EventType.TOOL_EXECUTION_STARTED, { toolName, parameters: toolParams, toolDescription: toolDescriptionForEvent, chatId: state.metadata.chatId, operationId, source: 'LangGraphEngine.executeNode.toolExecution', timestamp: toolExecutionStart } as ToolExecutionEventPayload);

            const toolCallResult: ToolResult = await toolRegistry.executeTool(toolName, toolParams, { chatId: state.metadata.chatId, operationId });

            const toolMessageContent = toolCallResult.success ? JSON.stringify(toolCallResult.data) : `Error: ${toolCallResult.error || "Unknown tool error"}`;
            const toolMessage = new ToolMessage({ content: toolMessageContent, name: toolName, tool_call_id: operationId });
            updatedMessages.push(toolMessage);

            const toolEventPayload: ToolExecutionEventPayload = {
                toolName, parameters: toolParams, toolDescription: toolDescriptionForEvent, chatId: state.metadata.chatId, source: 'LangGraphEngine.executeNode.toolExecution', operationId, timestamp: toolExecutionStart, duration: Date.now() - toolExecutionStart, isProcessingStep: false, toolSuccess: toolCallResult.success, error: toolCallResult.error, rawOutput: toolCallResult.data,
            };
            dispatcher.dispatch(toolCallResult.success ? EventType.TOOL_EXECUTION_COMPLETED : EventType.TOOL_EXECUTION_ERROR, toolEventPayload);
            performanceMonitor.trackNodeExecution(`executeNode.tool.${toolName}`, Date.now() - toolExecutionStart, toolCallResult.error);

            if (!toolCallResult.success) {
                updatedValidation.errors.push(`Tool ${toolName} failed: ${toolCallResult.error || "Unknown tool error"}`);
            }
            updatedExecution.tools_used = [...new Set([...updatedExecution.tools_used, toolName])];

            // --- 3. Post-Tool Analysis (Action Phase) ---
            const actionPhaseStart = Date.now();
            dispatcher.dispatch(EventType.AGENT_PHASE_STARTED, { phase: 'actionInterpretation', chatId: state.metadata.chatId, iteration: currentGraphIteration, source: 'LangGraphEngine.executeNode.action' } as AgentPhaseEventPayload);

            // LÓGICA DE OptimizedActionChain INTEGRADA AQUÍ
            const actionPromptInput = {
                userQuery: queryForExecution,
                lastToolName: toolName,
                lastToolResult: formatForPrompt(toolCallResult.success ? toolCallResult.data : { error: toolCallResult.error }),
                previousActions: formatForPrompt(updatedMessages
                    .filter(m => {
                        const type = m.getType?.();
                        return type === 'tool' || (type === 'ai' && (m.content as string).startsWith("Reasoning:"));
                    })
                    .map(m => {
                        const type = m.getType?.();
                        if (type === 'tool') return { tool: (m as ToolMessage).name || 'unknown', result: m.content };
                        return { tool: 'thought', result: m.content };
                    })),
                memoryContext: memoryForReasoning || '', // Reusar memoria de razonamiento
            };

            const actionParseStep = createAutoCorrectStep(actionOutputSchema, model, {
                maxAttempts: 2,
                verbose: process.env.NODE_ENV === 'development'
            });

            const actionChain = actionPromptLC.pipe(model).pipe(actionParseStep);

            const actionResult: ActionOutput = await invokeModelWithLogging(
                actionChain,
                actionPromptInput,
                { caller: 'executeNodeFunc.actionInterpretation' }
            );
            // FIN LÓGICA INTEGRADA

            dispatcher.dispatch(EventType.AGENT_PHASE_COMPLETED, { phase: 'actionInterpretation', chatId: state.metadata.chatId, iteration: currentGraphIteration, data: actionResult, source: 'LangGraphEngine.executeNode.action', duration: Date.now() - actionPhaseStart } as AgentPhaseEventPayload);
            performanceMonitor.trackNodeExecution('executeNode.actionInterpretation', Date.now() - actionPhaseStart);

            updatedMessages.push(new AIMessage({ content: actionResult.interpretation || `Interpreted result of ${toolName}.` }));
            updatedContext.working = actionResult.interpretation || updatedContext.working;

            if (actionResult.nextAction === 'respond' && actionResult.response) {
                performanceMonitor.trackNodeExecution('executeNode.toolAndRespond', Date.now() - startTime);
                updatedMessages.push(new AIMessage(actionResult.response));
                updatedMetadata.isCompleted = true;
                updatedMetadata.finalOutput = actionResult.response;
                return { messages: updatedMessages, metadata: updatedMetadata, execution: updatedExecution, context: updatedContext, validation: updatedValidation };
            }
            performanceMonitor.trackNodeExecution('executeNode.toolAndContinue', Date.now() - startTime);
            return { messages: updatedMessages, execution: updatedExecution, context: updatedContext, validation: updatedValidation };
        }

        const noValidToolMsg = "Reasoning phase decided to use a tool but did not specify a valid one or the action was unclear.";
        dispatcher.systemWarning(noValidToolMsg, { reasoningResult, chatId: state.metadata.chatId }, 'LangGraphEngine.executeNode');
        performanceMonitor.trackNodeExecution('executeNode.invalidReasoningTool', Date.now() - startTime, noValidToolMsg);
        updatedMessages.push(new AIMessage(`I encountered an issue with my internal reasoning: ${noValidToolMsg}`));
        updatedValidation.errors.push(noValidToolMsg);
        return { messages: updatedMessages, validation: updatedValidation, context: updatedContext, execution: updatedExecution };

    } catch (error: any) {
        const criticalErrorMsg = `Critical error in executeNode: ${error.message || String(error)}`;
        dispatcher.dispatch(EventType.AGENT_PHASE_COMPLETED, {
            phase: 'executionLoop', chatId: state.metadata.chatId, iteration: currentGraphIteration, timestamp: Date.now(), duration: Date.now() - startTime, source: 'LangGraphEngine.executeNode', error: criticalErrorMsg, details: { stack: error.stack }
        } as AgentPhaseEventPayload);
        performanceMonitor.trackNodeExecution('executeNode.criticalError', Date.now() - startTime, criticalErrorMsg);

        updatedMessages.push(new AIMessage(criticalErrorMsg));
        updatedMetadata.isCompleted = true;
        updatedMetadata.finalOutput = "A critical error occurred during processing.";
        updatedValidation.errors.push(criticalErrorMsg);
        return { messages: updatedMessages, metadata: updatedMetadata, validation: updatedValidation, context: updatedContext, execution: updatedExecution };
    }
}