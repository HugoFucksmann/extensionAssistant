// src/models/prompts/intentions/prompt.projectManagementParamsFormatter.ts

import { ProjectManagementParamsFormatterVariables, ProjectManagementParamsFormatterResponse } from '../../../orchestrator/execution/types';
import { mapContextToBaseVariables } from '../../promptSystem';

// Define the prompt template for the projectManagementParamsFormatter
export const projectManagementParamsFormatterPrompt = `
You are an AI assistant tasked with generating JSON parameters for a specific project management tool call based on the user's objective.

User Objective: "{{objective}}"
User Message: "{{userMessage}}"
Specific Project Management Objective: "{{projectManagementObjective}}"

Key Extracted Entities:
{{extractedEntities}}

Project Context:
{{projectContext}}

Recent Conversation History:
{{chatHistory}}

Instructions:
- Analyze the Specific Project Management Objective, User Message, Extracted Entities, and Project Context.
- Determine the necessary parameters for the *next* project management tool that needs to be called to achieve the objective.
- The tool to be called is determined by the agent, your task is *only* to format the parameters for it.
- Consider the type of action implied by the objective (e.g., creating a file, creating a directory, adding a dependency, installing dependencies).
- Use Extracted Entities (like file names, directory names, package names) to populate the parameters.
- Consider Project Context (like package manager) if relevant for dependency management tools.
- Output a JSON object containing *only* the parameters required by the specific tool.
- Do NOT include any introductory or concluding text, just the JSON object itself.
- Do NOT include code block markers (e.g., \`\`\`json\`).

Example Parameter JSON Structures:
- For \`filesystem.createFile\`: \`{ "filePath": "path/to/new/file.js", "content": "Optional initial content", "overwrite": false }\`
- For \`filesystem.createDirectory\`: \`{ "directoryPath": "path/to/new/directory", "recursive": true }\`
- For \`project.addDependency\`: \`{ "packageName": "package-name", "dev": true, "packageManager": "npm" }\`
- For \`project.installDependencies\`: \`{ "packageManager": "yarn" }\` (Parameters are often optional for this one)

Generate the JSON parameters:
`;

// Function to build variables for the projectManagementParamsFormatter prompt
export function buildProjectManagementParamsFormatterVariables(contextData: Record<string, any>): ProjectManagementParamsFormatterVariables {
    const baseVariables = mapContextToBaseVariables(contextData);

    // The specific project management objective might be the main objective or a refined one
    const projectManagementObjective = contextData.analysisResult?.objective || contextData.userMessage || '';

    const formatterVariables: ProjectManagementParamsFormatterVariables = {
        ...baseVariables,
        projectManagementObjective: projectManagementObjective,
        // extractedEntities and projectContext are already included in baseVariables
    };

    return formatterVariables;
}