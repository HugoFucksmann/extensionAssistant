// src/models/prompts/intentions/prompt.planner.ts

import { BasePromptVariables, PromptVariables, PromptType } from '../../../orchestrator/execution/types';
import { ToolRunner } from '../../../tools';
import { mapContextToBaseVariables, getPromptDefinitions } from '../../promptSystem';

// Define the expected output structure for the planner prompt
export interface PlannerResponse {
    action: 'tool' | 'prompt' | 'respond';
    toolName?: string; // Required if action is 'tool'
    promptType?: PromptType; // Required if action is 'prompt'
    params?: Record<string, any>; // Parameters for the tool/prompt/respond
    storeAs?: string; // Optional key to store the result of the tool/prompt execution in FlowContext
    reasoning: string; // Explanation for the chosen action
    // Add optional fields for debugging or UI hints
    // uiMessage?: string; // Message to show the user while executing this step
}

// Define the variables needed for the planner prompt
export interface PlannerPromptVariables extends BasePromptVariables {
    // BasePromptVariables already includes:
    // userMessage: string;
    // chatHistory: string;
    // objective?: string;
    // extractedEntities?: InputAnalysisResult['extractedEntities'];
    // projectContext?: any;
    // activeEditorContent?: string;
    // [key: `fileContent:${string}`]: string | undefined;
    // [key: `searchResults:${string}`]: any | undefined;

    // Add variables specific to the planning process
    currentFlowState: Record<string, any>; // The current state of the FlowContext (results of previous steps)
    availableTools: string; // Description/list of available tools
    availablePrompts: string; // Description/list of available prompts (excluding planner itself)
    planningHistory: Array<{ action: string; result: any; error?: any; stepName: string }>; // History of planning decisions and step results in this flow
    planningIteration: number; // Current iteration number of the planning loop
}

// Define the prompt template for the planner
export const plannerPrompt = `
You are an AI assistant responsible for planning and executing tasks based on user requests within a VS Code extension. Your goal is to determine the single best next action to take to fulfill the user's objective, given the current context and the results of previous steps.

User Objective: "{{objective}}"
User Message: "{{userMessage}}"

Recent Conversation History:
{{chatHistory}}

Key Extracted Entities:
{{extractedEntities}}

Project Context:
{{projectContext}}

Current Flow State (Results of previous steps in this turn):
{{currentFlowState}}

Available Tools:
{{availableTools}}

Available Prompts:
{{availablePrompts}}

Planning History for this turn:
{{planningHistory}}

Current Planning Iteration: {{planningIteration}}

Instructions:
1. Analyze the User Objective, User Message, History, Context, and especially the **Current Flow State**.
2. Consider the **Available Tools** and **Available Prompts**.
3. Decide the **single best next action** to move closer to the objective.
4. Your action must be one of:
    - \`tool\`: Execute one of the Available Tools. Use this to gather information (read files, search) or perform actions (apply edits - future).
    - \`prompt\`: Execute one of the Available Prompts (excluding the planner itself). Use this to analyze input, generate code fixes/explanations, or validate results.
    - \`respond\`: You have sufficient information or have completed the task. Provide the final message to the user.
5. Provide a brief \`reasoning\` for your choice.
6. If the action is \`tool\` or \`prompt\`, specify the \`toolName\` or \`promptType\` and any necessary \`params\`. Parameters should reference data available in the **Current Flow State** using placeholder syntax if the tool/prompt builder supports it, or provide literal values.
7. If the action is \`tool\` or \`prompt\`, optionally provide a \`storeAs\` key to save the result in the Flow Context for future steps. Choose a descriptive key.
8. If the action is \`respond\`, the \`params\` should include a \`messageToUser\` string containing your final response.

Your response must be a JSON object matching the \`PlannerResponse\` structure.

Example Response (Gathering context):
\`\`\`json
{
  "action": "tool",
  "toolName": "filesystem.getFileContents",
  "params": {
    "filePath": "{{extractedEntities.filesMentioned.[0]}}"
  },
  "storeAs": "mentionedFileContent",
  "reasoning": "User mentioned a specific file, need to read its content to understand the context."
}
\`\`\`

Example Response (Analyzing input):
\`\`\`json
{
  "action": "prompt",
  "promptType": "inputAnalyzer",
  "params": {},
  "storeAs": "analysisResult",
  "reasoning": "Initial step to understand the user's intent and extract key information."
}
\`\`\`

Example Response (Generating explanation after gathering context):
\`\`\`json
{
  "action": "prompt",
  "promptType": "explainCodePrompt",
  "params": {},
  "storeAs": "explanationResult",
  "reasoning": "Context gathered, now generating the explanation based on the code and objective."
}
\`\`\`

Example Response (Responding):
\`\`\`json
{
  "action": "respond",
  "params": {
    "messageToUser": "Okay, I have analyzed the code. Here is the explanation: {{explanationResult.explanation}}"
  },
  "reasoning": "Explanation generated and stored, ready to provide the final answer."
}
\`\`\`

Now, based on the current context, what is the single best next action?
`;

// Function to build variables for the planner prompt
export function buildPlannerVariables(resolutionContextData: Record<string, any>): PlannerPromptVariables {
    const baseVariables = mapContextToBaseVariables(resolutionContextData); // Use the existing mapping

    // Get list of available tools and prompts (excluding planner)
    const availableTools = ToolRunner.listTools().join(', ');
    const availablePrompts = Object.keys(getPromptDefinitions()).filter(type => type !== 'planner').join(', '); // Need access to PROMPT_DEFINITIONS

    // Get planning history from FlowContext (assuming Orchestrator stores it)
    const planningHistory = resolutionContextData.planningHistory || [];
    const planningIteration = resolutionContextData.planningIteration || 1;


    const plannerVariables: PlannerPromptVariables = {
        ...baseVariables,
        currentFlowState: resolutionContextData, // Pass the full flattened context state
        availableTools: availableTools,
        availablePrompts: availablePrompts,
        planningHistory: planningHistory,
        planningIteration: planningIteration
    };

    return plannerVariables;
}