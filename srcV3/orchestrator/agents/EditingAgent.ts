// src/orchestrator/agents/EditingAgent.ts

import { IAgent } from './IAgent';
import { FlowContext } from '../context/flowContext';
import { StepExecutor } from '../execution/stepExecutor';
import { ExecutionStep, EditingPromptResponse } from '../execution/types'; // Import EditingPromptResponse

/**
 * Agent responsible for handling 'editing' intents.
 * This agent generates code edits based on the user's objective and applies them.
 * Sequence:
 * 1. Get the editing objective and relevant code content.
 * 2. Run the 'editingPrompt' to generate a WorkspaceEdit JSON object.
 * 3. Run the 'codeManipulation.applyWorkspaceEdit' tool with the generated edits.
 * 4. Respond to the user confirming the edits were applied (or reporting failure).
 */
export class EditingAgent implements IAgent {
    private stepExecutor: StepExecutor;

    constructor(stepExecutor: StepExecutor) {
        this.stepExecutor = stepExecutor;
    }

    async execute(flowContext: FlowContext): Promise<string | any> {
        const chatId = flowContext.getChatId();
        const analysis = flowContext.getAnalysisResult();
        // Get the editing objective from the objective or user message
        const editingObjective = analysis?.objective || flowContext.getValue<string>('userMessage') || '';

        console.log(`[EditingAgent:${chatId}] Executing for editing objective: "${editingObjective.substring(0, 50)}..."`);

        if (!editingObjective) {
            console.warn(`[EditingAgent:${chatId}] No editing objective found.`);
            return "Sorry, I couldn't determine what edits you want to make.";
        }

        // Determine which code to edit. Prioritize files mentioned in analysis,
        // otherwise use the active editor content.
        const filesMentioned = analysis?.extractedEntities?.filesMentioned || [];
        const targetFilePath = filesMentioned.length > 0 ? filesMentioned[0] : undefined; // Take the first mentioned file

        const steps: ExecutionStep[] = [];

        // Step 1: Get code content if needed (only if a specific file is mentioned and content isn't already there)
        // If no file is mentioned, the editingPrompt should ideally work with activeEditorContent,
        // which is already in the base context variables.
        const existingCodeContent = targetFilePath ? flowContext.getValue(`fileContent:${targetFilePath}`) : flowContext.getValue('activeEditorContent');

        if (existingCodeContent === undefined) { // Only add step if content is NOT already there
            if (targetFilePath) {
                 // TODO: Add validation if file exists/is accessible
                 steps.push({
                     name: 'getFileContentForEditing',
                     type: 'tool',
                     execute: 'filesystem.getFileContents',
                     params: { filePath: targetFilePath },
                     storeAs: `fileContent:${targetFilePath}` // Store using a dynamic key
                 });
            } else {
                 // If no file mentioned and active editor content isn't already there, get it
                 steps.push({
                     name: 'getEditorContentForEditing',
                     type: 'tool',
                     execute: 'editor.getActiveEditorContent',
                     storeAs: 'activeEditorContent'
                 });
            }
        } else {
             console.log(`[EditingAgent:${chatId}] Code content already available in context.`);
        }


        // Step 2: Run the editingPrompt to generate the WorkspaceEdit JSON
        steps.push({
            name: 'generateWorkspaceEdit',
            type: 'prompt',
            execute: 'editingPrompt',
            params: {}, // editingPrompt uses full context (including code content, objective, etc.)
            storeAs: 'generatedEdits', // Store the generated WorkspaceEdit JSON
             // Condition: Only run if the editing objective is present and some code context is available
             condition: (ctx) => {
                  const obj = ctx.editingObjective || ctx.analysisResult?.objective || ctx.userMessage;
                  const codeContent = targetFilePath ? ctx[`fileContent:${targetFilePath}`] : ctx.activeEditorContent;
                  return !!obj && (codeContent !== undefined && codeContent !== null && codeContent !== ''); // Ensure objective and non-empty code content
             }
        });

        // Step 3: Apply the generated WorkspaceEdit using the tool
        steps.push({
            name: 'applyWorkspaceEdit',
            type: 'tool',
            execute: 'codeManipulation.applyWorkspaceEdit',
            // Params need to reference the stored WorkspaceEdit object
            params: {
                edits: '{{generatedEdits}}' // Use placeholder for the generated edits
            },
            storeAs: 'applyEditResult', // Store the result of the tool execution (e.g., success status)
             // Condition: Only run if the edits were successfully generated by the prompt
             // Check if generatedEdits exists, is an object, and contains either documentChanges (non-empty array) or changes (non-empty object)
             condition: (ctx) => {
                 const edits = ctx.generatedEdits;
                 return edits !== undefined && edits !== null && typeof edits === 'object' &&
                        ((Array.isArray(edits.documentChanges) && edits.documentChanges.length > 0) ||
                         (edits.changes !== undefined && edits.changes !== null && typeof edits.changes === 'object' && Object.keys(edits.changes).length > 0));
             }
        });


        let finalResponse: string | any = "Sorry, I couldn't apply the edits."; // Default failure message

        for (const step of steps) {
            const stepResult = await this.stepExecutor.runStep(step, flowContext);

            if (stepResult.skipped) {
                 console.log(`[EditingAgent:${chatId}] Step skipped: '${step.name}'. Condition was false.`);
                 // If a step is skipped, check if it was a critical step.
                 // If 'get content' skipped because content was there, fine.
                 // If 'generate edits' skipped because content was missing, finalResponse remains default.
                 // If 'apply edits' skipped because generatedEdits was missing/invalid, finalResponse remains default.
            } else if (!stepResult.success) {
                console.error(`[EditingAgent:${chatId}] Step failed: '${step.name}'.`, stepResult.error?.message || 'Unknown error');
                // If a step fails, set the final response to an error and stop the sequence
                finalResponse = `Sorry, a step failed while trying to apply edits ('${step.name}'). Error: ${stepResult.error?.message || 'Unknown error'}.`;
                return finalResponse; // Exit early
            } else {
                 console.log(`[EditingAgent:${chatId}] Step succeeded: '${step.name}'.`);
                 // If the last step (applyWorkspaceEdit) succeeded, we can formulate a success message
                 if (step.name === 'applyWorkspaceEdit' && stepResult.result !== undefined) {
                      // Assuming the tool returns a success indicator (e.g., { success: true })
                      finalResponse = "The requested edits have been applied.";
                 }
            }
        }

         // After running all steps, return the finalResponse.
         // If the edits were applied successfully, finalResponse will hold the success message.
         // Otherwise, it will hold the default failure message or an error message from a failed step.
        return finalResponse;
    }
}