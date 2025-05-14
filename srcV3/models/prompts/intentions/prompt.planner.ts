// src/models/prompts/intentions/prompt.planner.ts

// Import types from the central types file
import { BasePromptVariables, PromptVariables, PromptType, PlannerResponse, PlannerPromptVariables } from '../../../orchestrator/execution/types'; // Import PlannerResponse and PlannerPromptVariables
import { ToolRunner } from '../../../tools';

import { mapContextToBaseVariables, getPromptDefinitions } from '../../promptSystem';



// Define the expected output structure for the planner prompt (REMOVED - now in types.ts)
// export interface PlannerResponse { ... }

// Define the variables needed for the planner prompt (REMOVED - now in types.ts)
// export interface PlannerPromptVariables extends BasePromptVariables { ... }


// Define the prompt template for the planner (remains the same)
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

Current Flow State (Results of previous steps in this turn, keyed by 'storeAs' name):
{{currentFlowState}}

Available Tools (Use these to interact with the VS Code environment):
{{availableTools}}

Available Prompts (Use these for AI reasoning, generation, or analysis):
{{availablePrompts}}

Planning History for this turn (Sequence of actions taken and their outcomes):
{{planningHistory}}

Current Planning Iteration: {{planningIteration}}

Instructions:
1. Analyze the User Objective, User Message, History, Context, and especially the **Current Flow State** to understand what has been done and what is needed.
2. Consider the **Available Tools** and **Available Prompts**.
3. Decide the **single best next action** to move closer to the objective.
4. Your action must be one of:
    - \`tool\`: Execute one of the Available Tools. Use this to gather information (read files, search) or perform actions (apply edits - future).
    - \`prompt\`: Execute one of the Available Prompts (excluding the planner itself). Use this for AI analysis, generation, or validation.
    - \`respond\`: You have sufficient information or have completed the task. Provide the final message to the user.
5. Provide a brief \`reasoning\` for your choice.
6. If the action is \`tool\` or \`prompt\`, specify the \`toolName\` or \`promptType\` and any necessary \`params\`. Parameters should reference data available in the **Current Flow State** using placeholder syntax (e.g., \`"filePath": "{{extractedEntities.filesMentioned.[0]}}"\`) or provide literal values. Ensure parameters match the expected input of the tool/prompt.
7. If the action is \`tool\` or \`prompt\`, provide a \`storeAs\` key to save the result in the Flow Context for future steps. Choose a descriptive key (e.g., \`activeEditorContent\`, \`fileContent:path/to/file\`, \`proposedFixResult\`, \`validationResult\`).
8. If the action is \`respond\`, the \`params\` should include a \`messageToUser\` string containing your final response. You can reference results from the **Current Flow State** using placeholders (e.g., \`"messageToUser": "{{explanationResult.explanation}}"\`).

Consider these common task patterns:
- **Explain Code:** Often involves: \`editor.getActiveEditorContent\` or \`filesystem.getFileContents\` -> \`explainCodePrompt\` -> \`respond\`.
- **Fix Code:** Often involves: \`editor.getActiveEditorContent\` or \`filesystem.getFileContents\` -> \`project.search\` (for errors) -> \`fixCodePrompt\` -> \`codeValidator\` -> \`codeManipulation.applyWorkspaceEdit\` (future) -> \`respond\`.
- **General Conversation:** Often involves: \`conversationResponder\` -> \`respond\`.
- **If a step fails:** Analyze the error in **Planning History** and **Current Flow State**. Decide if you can retry, try a different approach, or if you need to \`respond\` asking the user for clarification or stating the failure.

Your response must be a JSON object matching the \`PlannerResponse\` structure.

Now, based on the current context, what is the single best next action?
`;

// Function to build variables for the planner prompt (remains the same)
export function buildPlannerVariables(resolutionContextData: Record<string, any>): PlannerPromptVariables {
    const baseVariables = mapContextToBaseVariables(resolutionContextData); // Use the existing mapping

    // Get list of available tools and prompts (excluding planner)
    const availableTools = ToolRunner.listTools().join(', ');
    const availablePrompts = Object.keys(getPromptDefinitions()).filter(type => type !== 'planner').join(', '); // Use getter for PROMPT_DEFINITIONS

    // Get planning history and iteration from FlowContext (stored by Orchestrator)
    const planningHistory = resolutionContextData.planningHistory || [];
    const planningIteration = resolutionContextData.planningIteration || 1;

    // Prepare currentFlowState - exclude potentially large or circular objects if necessary,
    // but for now, passing the full resolution context data is intended.
    const currentFlowState = resolutionContextData;


    const plannerVariables: PlannerPromptVariables = {
        ...baseVariables,
        currentFlowState: currentFlowState, // Pass the full flattened context state
        availableTools: availableTools,
        availablePrompts: availablePrompts,
        planningHistory: planningHistory,
        planningIteration: planningIteration
    };

    return plannerVariables;
}