// src/models/prompts/intentions/prompt.examinationResultsFormatter.ts

import { ExaminationResultsFormatterPromptVariables } from '../../../orchestrator/execution/types';
import { mapContextToBaseVariables } from '../../promptSystem';


// Define the prompt template for the examinationResultsFormatter
export const examinationResultsFormatterPrompt = `
You are an AI assistant tasked with summarizing and explaining the results of a code or project examination task.

User Objective: "{{objective}}"
User Message: "{{userMessage}}"
Specific Examination Objective: "{{examinationObjective}}"

Project Information:
{{projectInfoResult}}

Package Dependencies:
{{packageDependenciesResult}}

Key Extracted Entities:
{{extractedEntities}}

Recent Conversation History:
{{chatHistory}}

Instructions:
- Analyze the Specific Examination Objective and the provided examination results (Project Information, Package Dependencies, etc.).
- Summarize the key findings relevant to the user's objective.
- Present the information clearly and concisely in a natural language message.
- If results are missing or indicate no relevant information was found, state that.
- Do NOT include the raw JSON results in your final response.

Formatted Examination Results:
`;

// Function to build variables for the examinationResultsFormatter prompt
export function buildExaminationResultsFormatterVariables(contextData: Record<string, any>): ExaminationResultsFormatterPromptVariables {
    const baseVariables = mapContextToBaseVariables(contextData);

    // The specific examination objective might be the main objective or a refined one
    const examinationObjective = contextData.analysisResult?.objective || contextData.userMessage || '';

    // Extract results from examination tools from the context data
    const projectInfoResult = contextData.projectInfoResult;
    const packageDependenciesResult = contextData.packageDependenciesResult;

    const formatterVariables: ExaminationResultsFormatterPromptVariables = {
        ...baseVariables,
        examinationObjective: examinationObjective,
        projectInfoResult: projectInfoResult,
        packageDependenciesResult: packageDependenciesResult,
        // extractedEntities is already included in baseVariables
    };

    return formatterVariables;
}