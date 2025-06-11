// src/core/langgraph/GraphState.ts
import { BaseMessage } from '@langchain/core/messages';
import { ToolResult } from '../../features/tools/types';
import { AnalysisOutput } from '../../features/ai/prompts/optimized/analysisPrompt';
import { StateGraphArgs } from '@langchain/langgraph';


export interface AgentState {
    messages: BaseMessage[];
    userQuery: string;
    mode: 'simple' | 'planner' | 'supervised';
    analysisResult?: AnalysisOutput;
    finalResponse?: string;
    errorCount: number;
    maxIterations: number;
    startTime?: number;
}


export const agentState: StateGraphArgs<AgentState>['channels'] = {
    messages: {
        value: (x: BaseMessage[], y: BaseMessage[]) => x.concat(y),
        default: () => [],
    },
    userQuery: {
        value: (x: string, y: string) => y,
        default: () => '',
    },
    mode: {
        value: (x, y) => y,
        default: () => 'simple',
    },
    analysisResult: {
        value: (x, y) => y,
        default: () => undefined,
    },
    finalResponse: {
        value: (x, y) => y,
        default: () => undefined,
    },
    errorCount: {
        value: (x: number, y: number) => x + y,
        default: () => 0,
    },
    maxIterations: {
        value: (x, y) => y,
        default: () => 10,
    },
};