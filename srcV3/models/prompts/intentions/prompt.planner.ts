// src/models/prompts/intentions/prompt.planner.ts

import { BasePromptVariables, PlannerPromptVariables } from '../../../orchestrator/execution/types';
import { MemoryItem } from '../../../store/repositories/MemoryRepository';
import { ToolRunner } from '../../../tools';
import { mapContextToBaseVariables, getPromptDefinitions } from '../../promptSystem';

// Define the prompt template for the planner
export const plannerPrompt = `
You are an AI assistant responsible for planning and executing tasks based on user requests within a VS Code extension. Your goal is to determine the single best next action to take to fulfill the user's objective, given the current context and the results of previous steps.

User Objective: "{{objective}}"
User Message: "{{userMessage}}"

Recent Conversation Summary:
{{summary}}

Last Recent Messages (approx. last 4 turns):
{{recentMessagesString}}

Key Extracted Entities:
{{extractedEntities}}

Project Context:
{{projectContext}}

Relevant Files Identified:
{{relevantFiles}}

Analyzed File Insights:
{{analyzedFileInsights}}

Relevant Project Memory:
{{retrievedMemory}}

Current Flow State (Results of previous steps in this turn, keyed by 'storeAs' name):
{{currentFlowState}}

Available Tools (Use these to interact with the VS Code environment):
{{availableTools}}

Available Prompts (Use these for AI reasoning, generation, or analysis):
{{availablePrompts}}

Planning History for this turn (Sequence of actions taken and their outcomes):
{{planningHistory}}

Current Planning Iteration: {{planningIteration}}

{{#if isReplanning}}
--- REPLANNING ---
This is a replanning attempt. The previous attempt(s) encountered issues or new information became available.
Reason for replanning: "{{replanReason}}"
New data that triggered replanning: {{replanData}}
Analyze the "Planning History" below to understand what went wrong in previous steps before deciding the next action.
--- END REPLANNING ---
{{/if}}

Instructions:
1. Analyze the User Objective, User Message, **Recent Conversation Summary**, **Last Recent Messages**, Context, **Relevant Project Memory**, and especially the **Current Flow State** and **Analyzed File Insights** to understand what has been done and what is needed.
2. **If this is a replanning attempt, carefully review the "Planning History" and "Reason for replanning" to understand past failures or new context.** Adjust your plan accordingly.
3. Consider the **Available Tools** and **Available Prompts**.
4. Decide the **single best next action** to move closer to the objective.
5. Your action must be one of:
    - \`tool\`: Execute one of the Available Tools. Use this to gather information (read files, search) or perform actions (apply edits - future).
    - \`prompt\`: Execute one of the Available Prompts (excluding the planner itself). Use this for AI analysis, generation, or validation.
    - \`respond\`: You have sufficient information or have completed the task. Provide the final message to the user.
6. Provide a brief \`reasoning\` for your choice.
7. If the action is \`tool\` or \`prompt\`, specify the \`toolName\` or \`promptType\` and any necessary \`params\`. Parameters should reference data available in the **Current Flow State** using placeholder syntax (e.g., \`"filePath": "{{extractedEntities.filesMentioned.[0]}}"\`) or provide literal values. Ensure parameters match the expected input of the tool/prompt.
8. If the action is \`tool\` or \`prompt\`, provide a \`storeAs\` key to save the result in the Flow Context for future steps. Choose a descriptive key (e.g., \`activeEditorContent\`, \`fileContent:path/to/file\`, \`proposedFixResult\`, \`validationResult\`, \`fileAnalysis:path/to/file\`, \`fileFragments:path/to/file\`, \`memoryRetrievalResult\`).
9. If the action is \`respond\`, the \`params\` should include a \`messageToUser\` string containing your final response. You can reference results from the **Current Flow State** using placeholders (e.g., \`"explanationResult.explanation"}\`).

Consider these common task patterns:
- Explain Code: Often involves: \`editor.getActiveEditorContent\` or \`filesystem.getFileContents\` -> \`codeAnalyzer\` / \`codeFragmenter\` (potentially run by agent) -> \`explainCodePrompt\` -> \`respond\`.
- Fix Code: Often involves: \`editor.getActiveEditorContent\` or \`filesystem.getFileContents\` -> \`project.search\` (for errors) -> \`codeAnalyzer\` / \`codeFragmenter\` (potentially run by agent) -> \`fixCodePrompt\` -> \`codeValidator\` -> \`codeManipulation.applyWorkspaceEdit\` (future) -> \`respond\`.
- General Conversation: Often involves: \`conversationResponder\` -> \`respond\`.
- If a step fails: Analyze the error in Planning History and Current Flow State. Decide if you can retry, try a different approach, or if you need to \`respond\` asking the user for clarification or stating the failure.

Your response must be a JSON object matching the \`PlannerResponse\` structure.

Now, based on the current context, what is the single best next action?
`;

// Function to build variables for the planner prompt
export interface PlannerPromptVariablesWithReplan extends PlannerPromptVariables {
    isReplanning?: boolean;
    replanReason?: string;
    replanData?: any;
}

export function buildPlannerVariables(resolutionContextData: Record<string, any>): PlannerPromptVariablesWithReplan {
    const baseVariables = mapContextToBaseVariables(resolutionContextData);

    const availableTools = ToolRunner.listTools().join(', ');
    const availablePrompts = Object.keys(getPromptDefinitions()).filter(type => type !== 'planner').join(', ');

    const fullHistoryString = resolutionContextData.chatHistoryString || '';
    const historyLines = fullHistoryString.split('\n').filter((line: string) => line.trim() !== '');
    const recentMessagesLines = historyLines.slice(-8);
    const recentMessagesString = recentMessagesLines.join('\n');

    const planningHistory = resolutionContextData.planningHistory || [];
    const planningIteration = resolutionContextData.planningIteration || 1;

    const currentFlowState = resolutionContextData;

    const retrievedMemory: MemoryItem[] = resolutionContextData.retrievedMemory || [];
    const formattedMemory = retrievedMemory.length > 0
        ? retrievedMemory.map(item => `Type: ${item.type}\nKey: ${item.keyName}\nContent: ${JSON.stringify(item.content, null, 2)}\nReason: ${'reason' in item ? item.reason : 'N/A'}`).join('\n---\n')
        : 'None retrieved.';


    const plannerVariables: PlannerPromptVariablesWithReplan = {
        ...baseVariables,
        summary: resolutionContextData.summary || 'No summary available.',
        recentMessagesString: recentMessagesString,
        relevantFiles: resolutionContextData.relevantFiles ? resolutionContextData.relevantFiles.join(', ') : 'None identified.',
        analyzedFileInsights: resolutionContextData.analyzedFileInsights ? JSON.stringify(resolutionContextData.analyzedFileInsights, null, 2) : 'None available.',
        retrievedMemory: formattedMemory,
        currentFlowState: currentFlowState,
        availableTools: availableTools,
        availablePrompts: availablePrompts,
        planningHistory: planningHistory,
        planningIteration: planningIteration,
        // <-- Add replanning variables from context
        isReplanning: resolutionContextData.isReplanning,
        replanReason: resolutionContextData.replanReason,
        replanData: resolutionContextData.replanData ? JSON.stringify(resolutionContextData.replanData, null, 2) : 'None.',
        // -->
    };

    return plannerVariables;
}