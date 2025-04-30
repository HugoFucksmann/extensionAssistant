// src/core/prompts/promptManager.ts
import { inputAnalyzerPrompt } from './prompt.inputAnalyzer';
import { planningEnginePrompt } from './prompt.planningEngine';
import { communicationPrompt } from './prompt.communication';
import { editingPrompt } from './prompt.editing';
import { examinationPrompt } from './prompt.examination';
import { projectManagementPrompt } from './prompt.projectManagement';
import { projectSearchPrompt } from './prompt.projectSearch';
import { resultEvaluatorPrompt } from './prompt.resultEvaluator';
import { toolSelectorPrompt } from './prompt.toolSelector';

export type PromptType = 
  'inputAnalyzer' | 
  'planningEngine' | 
  'communication' | 
  'editing' | 
  'examination' | 
  'projectManagement' | 
  'projectSearch' | 
  'resultEvaluator' | 
  'toolSelector';

export class PromptManager {
  private prompts: Map<PromptType, string> = new Map();
  
  constructor() {
    this.initialize();
  }
  
  private initialize(): void {
    this.prompts.set('inputAnalyzer', inputAnalyzerPrompt);
    this.prompts.set('planningEngine', planningEnginePrompt);
    this.prompts.set('communication', communicationPrompt);
    this.prompts.set('editing', editingPrompt);
    this.prompts.set('examination', examinationPrompt);
    this.prompts.set('projectManagement', projectManagementPrompt);
    this.prompts.set('projectSearch', projectSearchPrompt);
    this.prompts.set('resultEvaluator', resultEvaluatorPrompt);
    this.prompts.set('toolSelector', toolSelectorPrompt);
    
    console.log(`[PromptManager] Inicializado con ${this.prompts.size} prompts`);
  }
  
  public getPrompt(type: PromptType): string {
    const prompt = this.prompts.get(type);
    if (!prompt) {
      throw new Error(`Prompt no encontrado para el tipo: ${type}`);
    }
    return prompt;
  }
  
  public fillPromptTemplate(template: string, variables: Record<string, string>): string {
    let filledTemplate = template;
    
    for (const [key, value] of Object.entries(variables)) {
      const placeholder = `{{${key}}}`;
      filledTemplate = filledTemplate.replace(new RegExp(placeholder, 'g'), value);
    }
    
    return filledTemplate;
  }
}