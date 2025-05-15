// src/models/prompts/intentions/prompt.fixCodePlanner.ts

import { FixCodePlannerPromptVariables, FixCodePlannerResponse } from '../../../orchestrator/execution/types';
import { mapContextToBaseVariables } from '../../promptSystem';
import { ToolRunner } from '../../../tools/core/toolRunner';

// Define the prompt template for the fixCodePlanner
export const fixCodePlannerPrompt = `
You are an AI agent specialized in fixing code issues within a VS Code extension. Your task is to determine the single best next action to take to address the user's code fixing objective, given the current state of the fixing process.

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

Fix Code Process History for this turn:
{{planningHistory}}

Current Fix Code Iteration: {{fixCodeIteration}}

Available Tools (Subset relevant to fixing):
- filesystem.getFileContents
- project.searchWorkspace (useful for finding error context)
- codeManipulation.applyWorkspaceEdit (Future: to apply the fix)

Available Prompts (Subset relevant to fixing):
- fixCodePrompt (Generates a proposed fix)
- codeValidator (Validates a proposed fix)
- conversationResponder (If you need to ask the user for clarification)

Instructions:
1. Analyze the User Objective, Current Flow State, and Fix Code Process History.
2. Understand what has been attempted, what results were obtained (e.g., original code, proposed fix, validation result), and any errors encountered.
3. Decide the **single best next action** to move closer to successfully fixing the code.
4. Your action must be one of:
    - \`tool\`: Execute a relevant tool (e.g., get file content if missing, search for error context).
    - \`prompt\`: Execute a relevant prompt (e.g., run \`fixCodePrompt\` to get a fix, run \`codeValidator\` on a proposed fix, run \`conversationResponder\` if you need user input).
    - \`respond\`: You have successfully generated and validated a fix (Future: or applied it), or you cannot proceed further and need to inform the user.
5. Provide a brief \`reasoning\` for your choice.
6. If the action is \`tool\` or \`prompt\`, specify the \`toolName\` or \`promptType\` and any necessary \`params\`. Parameters should reference data available in the **Current Flow State** using placeholder syntax (e.g., \`"filePath": "{{targetFilePath}}"\`, \`"proposedCode": "{{proposedFixResult.proposedCode}}"\`). Ensure parameters match the expected input of the tool/prompt.
7. If the action is \`tool\` or \`prompt\`, provide a \`storeAs\` key to save the result in the Flow Context for future steps (e.g., \`originalCodeContent\`, \`proposedFixResult\`, \`validationResult\`).
8. If the action is \`respond\`, the \`params\` should include a \`messageToUser\` string containing your final response. Reference results from the **Current Flow State** using placeholders (e.g., \`"messageToUser": "The fix was validated: {{validationResult.isValid}}" \`).

Consider these states and typical next steps:
- **Start/Need Code:** If original code content is missing, get it using \`filesystem.getFileContents\` or \`editor.getActiveEditorContent\`.
- **Have Code, Need Fix:** If you have the original code but no proposed fix, run \`fixCodePrompt\`.
- **Have Proposed Fix, Need Validation:** If you have a proposed fix but no validation result, run \`codeValidator\`.
- **Have Validation Result:**
    - If \`validationResult.isValid\` is true: (Future: run \`codeManipulation.applyWorkspaceEdit\`) or \`respond\` with success.
    - If \`validationResult.isValid\` is false and \`validationResult.error\` provides feedback: Run \`fixCodePrompt\` again, providing the validation error as additional context (ensure prompt template supports this).
    - If validation failed unexpectedly or feedback is unclear: Consider \`respond\` asking for clarification or stating the failure.
- **Step Failed:** Analyze the error in **Current Flow State** and **Fix Code Process History**. Decide if you can retry the step, try a different approach (e.g., search for error context), or if you need to \`respond\` stating the failure.
- **Max Iterations Approaching:** Prioritize actions that lead to a final response or gather critical missing information.

Your response must be a JSON object matching the \`PlannerResponse\` structure.

Now, based on the current context, what is the single best next action?
`;

// Function to build variables for the fixCodePlanner prompt
export function buildFixCodePlannerVariables(contextData: Record<string, any>): FixCodePlannerPromptVariables {
    const baseVariables = mapContextToBaseVariables(contextData);

    // Extract fix-code-specific context from the full resolution context
    const fixCodeIteration = contextData.fixCodeIteration || 1;
    const planningHistory = contextData.planningHistory || []; // Use the full planning history for the turn
    const analysisResult = contextData.analysisResult; // Pass the full analysis result

    // Attempt to find the target file path if one was mentioned in the analysis
    const filesMentioned = analysisResult?.extractedEntities?.filesMentioned || [];
    const targetFilePath = filesMentioned.length > 0 ? filesMentioned[0] : undefined;

    // Extract specific results from the current flow state for easier access
    const originalCodeContent = targetFilePath ? contextData[`fileContent:${targetFilePath}`] : contextData.activeEditorContent;
    const proposedFixResult = contextData.proposedFixResult;
    const validationResult = contextData.validationResult;


    const fixCodePlannerVariables: FixCodePlannerPromptVariables = {
        ...baseVariables,
        currentFlowState: contextData, // Pass the entire state
        planningHistory: planningHistory,
        fixCodeIteration: fixCodeIteration,
        originalCodeContent: originalCodeContent,
        proposedFixResult: proposedFixResult,
        validationResult: validationResult,
        targetFilePath: targetFilePath,
        analysisResult: analysisResult,
        // Note: availableTools and availablePrompts could be filtered here
        // to only show those relevant to fixing, but passing the full list
        // and instructing the model in the template is also an option.
        // Let's rely on template instructions for now.
    };

    return fixCodePlannerVariables;
}