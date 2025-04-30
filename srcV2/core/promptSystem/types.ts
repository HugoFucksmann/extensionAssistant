export type PromptType =
  | 'inputAnalyzer'
  | 'planningEngine'
  | 'communication'
  | 'editing'
  | 'examination'
  | 'projectManagement'
  | 'projectSearch'
  | 'resultEvaluator'
  | 'toolSelector';

export interface PromptVariables {
  [key: string]: string | number | boolean | object;
}

// Construye el objeto de variables para un prompt específico, a partir del contexto general.
export function buildPromptVariables(type: PromptType, context: Record<string, any>): PromptVariables {
  switch (type) {
    case 'editing':
      return {
        originalCode: context.originalCode ?? '',
        fileName: context.fileName ?? '',
        editRequest: context.editRequest ?? '',
        targetFunctions: context.targetFunctions ?? '',
      };
    case 'inputAnalyzer':
      return {
        userPrompt: context.userPrompt ?? '',
        referencedFiles: context.referencedFiles ?? '',
        functionNames: context.functionNames ?? '',
        projectContext: context.projectContext ?? '',
      };
    // ...otros casos igual que tu lógica actual
    default:
      throw new Error(`No variable builder definido para el prompt: ${type}`);
  }
}