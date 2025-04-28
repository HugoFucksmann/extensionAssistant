
import { Plan } from './planningEngine';

export interface EvaluationResult {
  success: boolean;
  completionLevel: 'partial' | 'complete' | 'exceeds';
  qualityAssessment: 'poor' | 'adequate' | 'good' | 'excellent';
  missingElements: string[];
  additionalStepsNeeded: {
    description: string;
    reason: string;
    toolSuggestion: string;
  }[];
  requiresUserInput: boolean;
  userPrompt?: string;
}

export class ResultEvaluator {
  private modelManager: any; // ModelManager
  private promptLoader: any; // PromptLoader

  constructor(/* Inyectar dependencias */) {
    // ... inicialización
  }

  public async evaluateResults(originalRequest: string, executedPlan: Plan, actionResults: any): Promise<EvaluationResult> {
    // 1. Carga el prompt de evaluación
    // 2. Llena el prompt con el request original, plan ejecutado y resultados
    // 3. Envía el prompt al modelo LLM
    // 4. Parsea la respuesta y la convierte en un objeto EvaluationResult
    // 5. Retorna el resultado de la evaluación
  }

  public async suggestImprovements(evaluationResult: EvaluationResult): Promise<string[]> {
    // Analiza el resultado de la evaluación y sugiere posibles mejoras
    // Retorna un array de sugerencias en formato de texto
  }

  public async determineNextAction(evaluationResult: EvaluationResult): Promise<string> {
    // Basado en el resultado de la evaluación, determina la siguiente acción a tomar
    // Puede ser 'continue', 'refine', 'ask_user', o 'complete'
  }
}


const resultEvaluatorPrompt = `
Eres un evaluador experto de resultados en desarrollo de software. Tu tarea es analizar los resultados de las acciones realizadas y determinar si cumplen con los objetivos.

CONTEXTO:
- Solicitud original: "{{originalRequest}}"
- Plan ejecutado: {{executedPlan}}
- Resultados obtenidos: {{actionResults}}

INSTRUCCIONES:
1. Evalúa si los resultados cumplen con la solicitud original.
2. Identifica posibles mejoras o pasos adicionales necesarios.
3. Determina si se necesita intervención del usuario.

Tu respuesta debe ser un objeto JSON con la siguiente estructura:
{
  "success": boolean,
  "completionLevel": "partial" | "complete" | "exceeds",
  "qualityAssessment": "poor" | "adequate" | "good" | "excellent",
  "missingElements": string[],
  "additionalStepsNeeded": [
    {
      "description": string,
      "reason": string,
      "toolSuggestion": string
    }
  ],
  "requiresUserInput": boolean,
  "userPrompt": string
}
 `
