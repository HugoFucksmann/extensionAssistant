// src/orchestrator/agents/SearchAgent.ts

import { IAgent } from './IAgent';
import { FlowContext } from '../context/flowContext';
import { StepExecutor } from '../execution/stepExecutor';
import { ExecutionStep } from '../execution/types';

/**
 * Agent responsible for handling 'search' intents.
 * This agent performs a workspace search and formats the results for the user.
 * Sequence:
 * 1. Get the search query from analysis or context.
 * 2. Run the 'project.searchWorkspace' tool.
 * 3. Run the 'searchResultsFormatter' prompt to format the results.
 * 4. Return the formatted results.
 */
export class SearchAgent implements IAgent {
    private stepExecutor: StepExecutor;

    constructor(stepExecutor: StepExecutor) {
        this.stepExecutor = stepExecutor;
    }

    async execute(flowContext: FlowContext): Promise<string | any> {
        const chatId = flowContext.getChatId();
        const analysis = flowContext.getAnalysisResult();
        // Get the search query from the objective or potentially extracted entities
        const searchQuery = analysis?.objective || flowContext.getValue<string>('userMessage') || '';

        console.log(`[SearchAgent:${chatId}] Executing search for query: "${searchQuery.substring(0, 50)}..."`);

        if (!searchQuery) {
            console.warn(`[SearchAgent:${chatId}] No search query found.`);
            return "Sorry, I couldn't find a search query in your request.";
        }

        const steps: ExecutionStep[] = [
            // Step 1: Run the workspace search tool
            {
                name: 'runWorkspaceSearch',
                type: 'tool',
                execute: 'project.searchWorkspace',
                params: { query: searchQuery }, // Pass the extracted query
                storeAs: 'searchResults' // Store the raw search results
            },
            // Step 2: Format the search results using a prompt
            {
                name: 'formatSearchResults',
                type: 'prompt',
                execute: 'searchResultsFormatter',
                params: {}, // searchResultsFormatter prompt uses full context (including searchResults)
                storeAs: 'formattedSearchResults', // Store the formatted string
                 // Condition: Only run if the search step succeeded and returned results
                 // Check if searchResults exists and is not null/undefined.
                 // The prompt template should handle the case where results are empty.
                 condition: (ctx) => ctx.searchResults !== undefined && ctx.searchResults !== null
            }
        ];

        let finalResponse: string | any = "Sorry, I couldn't perform the search."; // Default failure message

        for (const step of steps) {
            const stepResult = await this.stepExecutor.runStep(step, flowContext);

            if (stepResult.skipped) {
                 console.log(`[SearchAgent:${chatId}] Step skipped: '${step.name}'. Condition was false.`);
                 // If the format step is skipped because searchResults is missing,
                 // the finalResponse will remain the default failure message.
            } else if (!stepResult.success) {
                console.error(`[SearchAgent:${chatId}] Step failed: '${step.name}'.`, stepResult.error?.message || 'Unknown error');
                // If a step fails, set the final response to an error and stop the sequence
                finalResponse = `Sorry, a step failed while trying to perform the search ('${step.name}'). Error: ${stepResult.error?.message || 'Unknown error'}.`;
                return finalResponse; // Exit early
            } else {
                 console.log(`[SearchAgent:${chatId}] Step succeeded: '${step.name}'.`);
                 // If the last step (formatSearchResults) succeeded, its result is the desired output
                 if (step.name === 'formatSearchResults' && stepResult.result !== undefined) {
                      finalResponse = stepResult.result; // Assuming the formatter prompt returns the string
                 }
            }
        }

         // After running all steps, return the finalResponse.
         // If the formatter prompt succeeded, finalResponse will hold its result.
         // Otherwise, it will hold the default failure message or an error message from a failed step.
        return finalResponse;
    }
}