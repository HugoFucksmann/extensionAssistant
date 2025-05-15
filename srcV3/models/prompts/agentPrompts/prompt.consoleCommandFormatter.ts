// src/models/prompts/intentions/prompt.consoleCommandFormatter.ts

import { ConsoleCommandFormatterPromptVariables } from '../../../orchestrator/execution/types';
import { mapContextToBaseVariables } from '../../promptSystem';

// Define the prompt template for the consoleCommandFormatter
export const consoleCommandFormatterPrompt = `
You are an AI assistant tasked with generating a single command string to be run in a terminal based on the user's objective.

User Objective: "{{objective}}"
User Message: "{{userMessage}}"
Specific Command Objective: "{{commandObjective}}"

Recent Conversation History:
{{chatHistory}}

Key Extracted Entities:
{{extractedEntities}}

Project Context:
{{projectContext}}

Instructions:
- Analyze the User Objective, User Message, and Specific Command Objective.
- Determine the appropriate command to execute in a standard terminal (like bash, zsh, or cmd.exe depending on the user's OS, but assume a common shell like bash unless context strongly suggests otherwise).
- Consider the Project Context (e.g., project type, dependencies) to infer necessary tools (npm, yarn, pip, dotnet, etc.).
- Use the Extracted Entities to fill in command parameters (e.g., package names, file paths).
- The command should be a single line string.
- Do NOT include any introductory or concluding text, just the command string itself.
- Do NOT include code block markers (e.g., \`\`\`).
- If you cannot determine a suitable command, output an empty string or a simple placeholder like "echo 'Could not determine command'".

Command:
`;

// Function to build variables for the consoleCommandFormatter prompt
export function buildConsoleCommandFormatterVariables(contextData: Record<string, any>): ConsoleCommandFormatterPromptVariables {
    const baseVariables = mapContextToBaseVariables(contextData);

    // The specific command objective might be the main objective or a refined one
    const commandObjective = contextData.analysisResult?.objective || contextData.userMessage || '';

    const formatterVariables: ConsoleCommandFormatterPromptVariables = {
        ...baseVariables,
        commandObjective: commandObjective,
        // extractedEntities is already included in baseVariables
    };

    return formatterVariables;
}