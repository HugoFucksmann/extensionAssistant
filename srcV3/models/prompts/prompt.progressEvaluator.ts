// src/models/prompts/prompt.progressEvaluator.ts

import { BasePromptVariables, StepResult } from '../../orchestrator';
import { mapContextToBaseVariables } from '../promptSystem';

export interface ProgressEvaluatorPromptVariables extends BasePromptVariables {
    planningHistory: StepResult[]; // Full planning history for the turn
    userObjective: string;
    userMessage: string;
}

export const progressEvaluatorPrompt = `
You are an AI assistant specialized in evaluating the progress of a multi-step planning process. Your task is to analyze the provided planning history, identify successes and failures, and provide feedback or suggestions for the next steps.

User Objective: "{{userObjective}}"
User Message: "{{userMessage}}"

Planning History:
{{planningHistory}}

Instructions:
- Analyze the "Planning History" carefully.
- Identify the sequence of steps taken, their type (tool/prompt), execution result (success/failure/skipped), and any errors encountered.
- Evaluate if the steps taken seem appropriate for the "User Objective".
- Pinpoint the step(s) that failed or produced unexpected results.
- Provide a concise summary of the progress and the main issue(s) encountered.
- Suggest potential reasons for failures or alternative approaches.
- Respond in English.

Your response must be a JSON object with this structure:
{
  "summary": string, // Concise summary of progress/issues
  "analysis": Array<{
    "stepName": string,
    "status": "success" | "failure" | "skipped",
    "details": string, // Description of outcome or error
    "suggestion"?: string // Suggestion for this specific step
  }>,
  "overallSuggestion": string, // Overall suggestion for the planner (e.g., "retry step X", "try tool Y", "ask user for clarification")
  "error"?: string
}
`;

export function buildProgressEvaluatorVariables(contextData: Record<string, any>): ProgressEvaluatorPromptVariables {
    const baseVariables = mapContextToBaseVariables(contextData);

    const progressEvaluatorVariables: ProgressEvaluatorPromptVariables = {
        ...baseVariables,
        planningHistory: contextData.planningHistory || [], // Expect planning history
        userObjective: contextData.objective || '',
        userMessage: contextData.userMessage || '',
    };

    return progressEvaluatorVariables;
}