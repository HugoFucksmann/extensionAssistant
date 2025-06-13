// src/core/langgraph/nodes/PlannerNode.ts
// CORRECCIÓN: Importar los type guards necesarios
import { AIMessage, BaseMessage, ToolMessage, isAIMessage, isHumanMessage, isToolMessage } from "@langchain/core/messages";
import { IPlannerService } from "../services/interfaces/DependencyInterfaces";
import { GraphPhase, SimplifiedOptimizedGraphState } from "../state/GraphState";
import { BaseNode } from "./BaseNode";

const MAX_TASK_RETRIES = 3;

export class PlannerNode extends BaseNode {
    private plannerService: IPlannerService;

    constructor(dependencies: any, observability: any) {
        super(GraphPhase.PLANNER, dependencies, observability);
        this.plannerService = dependencies.get('IPlannerService');
    }

    protected async executeCore(state: SimplifiedOptimizedGraphState): Promise<Partial<SimplifiedOptimizedGraphState>> {
        const lastMessage = state.messages[state.messages.length - 1];
        // CORRECCIÓN: Usar el type guard isToolMessage
        const lastToolFailed = lastMessage && isToolMessage(lastMessage) && lastMessage.content.toString().startsWith('Error:');

        let retryCount = state.currentTaskRetryCount || 0;

        if (lastToolFailed) {
            retryCount++;
        } else {
            retryCount = 0;
        }

        if (retryCount >= MAX_TASK_RETRIES) {
            const errorMessage = `La tarea "${state.currentTask}" ha fallado ${MAX_TASK_RETRIES} veces. Abortando plan.`;
            console.warn(`[PlannerNode] ${errorMessage}`);
            return {
                messages: [...state.messages, new AIMessage(`System: ${errorMessage}`)],
                isCompleted: true,
                error: errorMessage,
            };
        }

        const planResult = await this.plannerService.updatePlan(
            state.userInput,
            this.formatChatHistory(state.messages),
            state.currentPlan,
            this.formatExecutionHistory(state.messages)
        );

        console.log('--- [PlannerNode] OUTPUT ---');
        console.log('Thought:', planResult.thought);
        console.log('New Plan:', planResult.plan);
        console.log('Is Complete:', planResult.isPlanComplete);
        console.log('Next Task:', planResult.nextTask);
        console.log('----------------------------');

        const thoughtMessage = new AIMessage({ content: `Planner Thought: ${planResult.thought}` });

        if (planResult.isPlanComplete) {
            return {
                messages: [...state.messages, thoughtMessage],
                currentPlan: [],
                isCompleted: true,
                currentTaskRetryCount: 0,
            };
        }

        const nextRetryCount = planResult.nextTask === state.currentTask ? retryCount : 0;

        return {
            messages: [...state.messages, thoughtMessage],
            currentPlan: planResult.plan,
            currentTask: planResult.nextTask,
            currentTaskRetryCount: nextRetryCount,
        };
    }

    private formatChatHistory(messages: BaseMessage[]): string {
        // CORRECCIÓN: Usar type guards para filtrar
        return messages
            .filter(msg => isHumanMessage(msg) || isAIMessage(msg))
            // CORRECCIÓN: Usar getType() para obtener el tipo como string
            .map(msg => `${msg.getType()}: ${msg.content}`)
            .join('\n');
    }

    private formatExecutionHistory(messages: BaseMessage[]): string {
        // CORRECCIÓN: Usar el type guard isToolMessage en el filtro
        const toolMessages = messages.filter(isToolMessage);

        if (toolMessages.length === 0) {
            return "No tools have been executed yet in this turn.";
        }

        return toolMessages.map(msg => {
            let parsedContent;
            try {
                parsedContent = JSON.parse(msg.content as string);
            } catch (e) {
                return `Tool Executed: ${msg.name}\nResult: ${msg.content}`;
            }

            if (parsedContent && parsedContent.filePath && parsedContent.content) {
                const truncatedContent = parsedContent.content.length > 1500
                    ? parsedContent.content.substring(0, 1500) + "\n... (contenido truncado)"
                    : parsedContent.content;
                return `Tool Executed: ${msg.name}\nResult: Successfully read file '${parsedContent.filePath}'.\nContent:\n\`\`\`\n${truncatedContent}\n\`\`\``;
            }

            return `Tool Executed: ${msg.name}\nResult: ${JSON.stringify(parsedContent)}`;
        }).join('\n\n---\n\n');
    }
}