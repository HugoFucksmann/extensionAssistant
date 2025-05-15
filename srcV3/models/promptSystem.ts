// src/models/promptSystem.ts

import { PromptType, BasePromptVariables, PlannerResponse, PromptVariables, PromptDefinition, FixCodePlannerPromptVariables, ConsoleCommandFormatterPromptVariables, EditingPromptVariables, ExaminationResultsFormatterPromptVariables, ProjectManagementParamsFormatterVariables } from '../orchestrator'; // Import ProjectManagementParamsFormatterVariables
import { inputAnalyzerPrompt, buildInputAnalyzerVariables, codeValidatorPrompt, buildCodeValidatorVariables } from './prompts';
import { explainCodePrompt } from './prompts/intentions/prompt.explainCode';
import { fixCodePrompt } from './prompts/intentions/prompt.fixCode';
import { conversationPrompt, buildConversationVariables } from './prompts/intentions/prompt.conversation';
import { plannerPrompt, buildPlannerVariables } from './prompts/intentions/prompt.planner';


import { ModelManager } from './config/ModelManager';
import { ModelType } from './config/types';
import { parseModelResponse } from './config/modelUtils';
import { searchResultsFormatterPrompt, buildSearchResultsFormatterVariables } from './prompts/agentPrompts/prompt.searchResultsFormatter';
import { fixCodePlannerPrompt, buildFixCodePlannerVariables } from './prompts/agentPrompts/prompt.fixCodePlanner';
import { consoleCommandFormatterPrompt, buildConsoleCommandFormatterVariables } from './prompts/agentPrompts/prompt.consoleCommandFormatter';

import { examinationResultsFormatterPrompt, buildExaminationResultsFormatterVariables } from './prompts/agentPrompts/prompt.examinationResultsFormatter';
import { projectManagementParamsFormatterPrompt, buildProjectManagementParamsFormatterVariables } from './prompts/agentPrompts/prompt.projectManagementParamsFormatter'; // Import new prompt
import { buildEditingPromptVariables, editingPrompt } from '../orchestrator/agents/prompt.editing';

// Use the imported PromptDefinition interface

const PROMPT_DEFINITIONS: Partial<Record<PromptType, PromptDefinition<any>>> = {
  inputAnalyzer: { template: inputAnalyzerPrompt, buildVariables: buildInputAnalyzerVariables },
  codeValidator: { template: codeValidatorPrompt, buildVariables: buildCodeValidatorVariables },
  explainCodePrompt: { template: explainCodePrompt, buildVariables: mapContextToBaseVariables },
  fixCodePrompt: { template: fixCodePrompt, buildVariables: mapContextToBaseVariables }, // fixCodePrompt template likely needs more specific variables later
  conversationResponder: { template: conversationPrompt, buildVariables: buildConversationVariables },
  planner: { template: plannerPrompt, buildVariables: buildPlannerVariables }, // General planner
  searchResultsFormatter: { template: searchResultsFormatterPrompt, buildVariables: buildSearchResultsFormatterVariables },
  fixCodePlanner: { template: fixCodePlannerPrompt, buildVariables: buildFixCodePlannerVariables }, // FixCode agent planner
  consoleCommandFormatter: { template: consoleCommandFormatterPrompt, buildVariables: buildConsoleCommandFormatterVariables },
  editingPrompt: { template: editingPrompt, buildVariables: buildEditingPromptVariables },
  examinationResultsFormatter: { template: examinationResultsFormatterPrompt, buildVariables: buildExaminationResultsFormatterVariables },
  projectManagementParamsFormatter: { template: projectManagementParamsFormatterPrompt, buildVariables: buildProjectManagementParamsFormatterVariables } // Register projectManagementParamsFormatter
};

let _modelManager: ModelManager | null = null;

export function initializePromptSystem(modelManager: ModelManager): void {
  _modelManager = modelManager;
  console.log('[PromptSystem] Initialized');
}

export function mapContextToBaseVariables(resolutionContextData: Record<string, any>): BasePromptVariables {
  const baseVariables: BasePromptVariables = {
    userMessage: resolutionContextData.userMessage || '',
    chatHistory: resolutionContextData.chatHistoryString || '',
    objective: resolutionContextData.analysisResult?.objective,
    extractedEntities: resolutionContextData.analysisResult?.extractedEntities,
    projectContext: resolutionContextData.projectInfo, // projectInfo is stored in GlobalContext, accessible via resolution context
    activeEditorContent: resolutionContextData.activeEditorContent
  };

  // Include other dynamic variables from the context, excluding known base/system keys
  const dynamicVariables = Object.keys(resolutionContextData)
    .filter(key =>
        !(key in baseVariables) // Not already in baseVariables
        && key !== 'chatHistoryString' // chatHistory is mapped to baseVariables.chatHistory
        && key !== 'planningHistory' // Specific to planner/unknown agent
        && key !== 'planningIteration' // Specific to planner/unknown agent
        && key !== 'analysisResult' // Mapped to baseVariables.objective/extractedEntities, but also passed explicitly to some builders
        && !key.startsWith('fileContent:') // Handled by dynamic placeholder logic
        && !key.startsWith('searchResults:') // Handled by dynamic placeholder logic
        // Add other system/agent-specific keys to exclude if necessary
        && key !== 'conversationResponse' // Result of conversation agent
        && key !== 'explanationResult' // Result of explain code agent
        && key !== 'proposedFixResult' // Result of fix code prompt - also passed explicitly to fixCodePlanner
        && key !== 'validationResult' // Result of code validator prompt - also passed explicitly to fixCodePlanner
        && key !== 'fixCodeIteration' // Specific to FixCodeAgent internal state - also passed explicitly to fixCodePlanner
        && key !== 'formattedSearchResults' // Result of SearchAgent
        && key !== 'searchResults' // Raw search results - handled by mapContextToBaseVariables explicitly
        && key !== 'targetFilePath' // Specific to FixCodeAgent/EditingAgent - also passed explicitly to builders
        && key !== 'commandString' // Result of ConsoleAgent's formatter prompt
        && key !== 'commandResult' // Result of ConsoleAgent's tool execution
        && key !== 'codeContentToEdit' // Specific to EditingAgent - also passed explicitly to builder
        && key !== 'editingObjective' // Specific to EditingAgent - also passed explicitly to builder
        && key !== 'generatedEdits' // Result of EditingAgent's prompt
        && key !== 'applyEditResult' // Result of EditingAgent's tool execution
        && key !== 'examinationObjective' // Specific to ExaminationAgent - also passed explicitly to builder
        && key !== 'projectInfoResult' // Result of project.getProjectInfo - also passed explicitly to builder
        && key !== 'packageDependenciesResult' // Result of project.getPackageDependencies - also passed explicitly to builder
        && key !== 'projectManagementObjective' // Specific to ProjectManagementAgent - also passed explicitly to builder
        && key !== 'projectManagementParams' // Result of ProjectManagementAgent's formatter prompt
        && key !== 'projectManagementResult' // Result of ProjectManagementAgent's tool execution
    )
    .reduce<Record<string, any>>((acc, key) => {
      acc[key] = resolutionContextData[key];
      return acc;
    }, {});

    // Explicitly add searchResults if it exists, to ensure it's available
    // even if the dynamic placeholder logic isn't used for this specific key.
    // This makes it available for direct {{searchResults}} placeholder.
    if (resolutionContextData.searchResults !== undefined) {
         dynamicVariables.searchResults = resolutionContextData.searchResults;
    }


  return { ...baseVariables, ...dynamicVariables };
}

function buildPromptVariables(type: PromptType, resolutionContextData: Record<string, any>): PromptVariables {
  const definition = PROMPT_DEFINITIONS[type];
  if (!definition) {
    throw new Error(`No prompt definition found for type: ${type}`);
  }
  // Use the specific buildVariables function for the prompt type
  return definition.buildVariables(resolutionContextData);
}

export function getPromptDefinitions(): Partial<Record<PromptType, PromptDefinition<any>>> {
    return PROMPT_DEFINITIONS;
}

function fillPromptTemplate(template: string, variables: PromptVariables): string {
  let output = template;

  // Handle dynamic placeholders like {{prefix:.*}} first
  const dynamicPlaceholderRegex = /\{\{(\w+):.\*\}}/g;
  let match;
  let lastIndex = 0;
  let dynamicOutput = '';

  while ((match = dynamicPlaceholderRegex.exec(template)) !== null) {
      dynamicOutput += template.substring(lastIndex, match.index);
      lastIndex = dynamicPlaceholderRegex.lastIndex;

      const prefix = match[1];
      const relevantDynamicVariables = Object.entries(variables)
          .filter(([key]) => key.startsWith(`${prefix}:`));

      if (relevantDynamicVariables.length > 0) {
          const dynamicContent = relevantDynamicVariables
              .map(([key, value]) => {
                  // Use the part after the prefix as the identifier in the heading
                  const originalKey = key.substring(prefix.length + 1);

                  const contentString = typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean' || value === null || value === undefined
                    ? String(value)
                    : JSON.stringify(value, null, 2);

                  // Determine code block language hint based on key suffix if prefix is fileContent
                  const codeBlockLang = prefix === 'fileContent' ? originalKey.split('.').pop() : '';

                  return `### ${prefix.replace(/([A-Z])/g, ' $1').trim()} for ${originalKey}:\n\n${codeBlockLang ? '```' + codeBlockLang + '\n' : ''}${contentString}${codeBlockLang ? '\n```' : ''}\n`;
              })
              .join('\n---\n'); // Separator between dynamic sections

          dynamicOutput += dynamicContent;
      }
  }
  dynamicOutput += template.substring(lastIndex);


  // Handle static placeholders {{key}} in the generated output string
   let finalOutput = dynamicOutput;
   for (const [key, value] of Object.entries(variables)) {
       // Skip keys already handled by dynamic placeholders (those with ':')
       if (key.includes(':')) continue;

       const placeholder = `{{${key}}}`;
       // Convert value to string, handling objects/arrays via JSON.stringify
       const stringValue = typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean' || value === null || value === undefined
         ? String(value)
         : JSON.stringify(value, null, 2); // Stringify objects/arrays

       // Escape special characters in the placeholder for the regex
       const escapedPlaceholder = placeholder.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');

       // Replace all occurrences globally
       finalOutput = finalOutput.replace(
         new RegExp(escapedPlaceholder, 'g'),
         // Escape '$' in the replacement string to prevent it from being interpreted
         // as a special character in the replace method (e.g., $1, $&).
         stringValue.replace(/\$/g, '$$$$')
       );
   }

   // Remove any remaining unresolved static placeholders (e.g., if a variable was missing)
   finalOutput = finalOutput.replace(/\{\{.*?\}\}/g, '');

  return finalOutput;
}

export async function executeModelInteraction<T = any>(
  type: PromptType,
  resolutionContextData: Record<string, any>
): Promise<T> {
  if (!_modelManager) {
    throw new Error('PromptSystem not initialized. Call initializePromptSystem() first.');
  }

  const definition = PROMPT_DEFINITIONS[type];
  if (!definition) {
    throw new Error(`Unknown prompt type: ${type}`);
  }

  // Build variables using the specific buildVariables function for the prompt type
  const variables = buildPromptVariables(type, resolutionContextData);
  const filledPrompt = fillPromptTemplate(definition.template, variables);

  console.log(`[PromptSystem] Sending prompt for type '${type}'`); // Reduced logging of prompt content

  const rawResponse = await _modelManager.sendPrompt(filledPrompt);

  // Parse the response according to the prompt type's expected output
  return parseModelResponse<T>(type, rawResponse);
}

export async function changeModel(modelType: ModelType): Promise<void> {
  if (!_modelManager) throw new Error('PromptSystem not initialized.');
  await _modelManager.setModel(modelType);
}

export function getCurrentModel(): ModelType {
  if (!_modelManager) throw new Error('PromptSystem not initialized.');
  return _modelManager.getCurrentModel();
}

export function abortModelRequest(): void {
  if (_modelManager) {
    _modelManager.abortRequest();
  }
}

export function disposePromptSystem(): void {
  if (_modelManager) {
      _modelManager.dispose();
      _modelManager = null;
      console.log('[PromptSystem] Disposed');
  }
}