import { ModelManager } from '../models/modelManager';
import { PromptLoader } from '../core/prompts/promptLoader';

export interface AnalysisResult {
  type: 'DIRECT_ACTION' | 'PLANNING_NEEDED' | 'CLARIFICATION_NEEDED' | 'UNKNOWN';
  intent?: string; // Intención detectada
  parameters?: Record<string, any>; // Parámetros extraídos
  originalInput: string;
  refinedInput?: string; // Input posiblemente reformulado
}

export class InputAnalyzer {
  private modelManager: ModelManager;
  private promptLoader: PromptLoader;

  constructor(/* Inyectar dependencias */) {
    // ... inicialización
  }

  public async analyze(userInput: string, sessionContext?: any): Promise<AnalysisResult> {
    // 1. Preprocesa el input.
    // 2. (Opcional) Verifica reglas/keywords simples primero.
    // 3. Construye prompt para el LLM usando plantilla 'analyzer'.
    // 4. Llama al LLM via modelManager para clasificar y extraer información.
    // 5. Parsea la respuesta del LLM.
    // 6. Formatea y retorna el objeto AnalysisResult.
  }
  
  // Missing methods to add:
  private async preprocessInput(input: string): Promise<string> {
    // Limpia y formatea la entrada del usuario para el análisis
    // Elimina caracteres especiales innecesarios o normaliza la entrada
  }
  
  private async detectKeywords(input: string): Promise<string[]> {
    // Identifica palabras clave que podrían indicar intenciones específicas
    // Retorna un array de keywords encontrados
  }
  
  private async buildAnalyzerPrompt(input: string, context: any): Promise<string> {
    // Construye el prompt completo para el LLM incluyendo la entrada del usuario y el contexto
  }
  
  private async parseModelResponse(response: string): Promise<AnalysisResult> {
    // Convierte la respuesta del modelo en un objeto AnalysisResult estructurado
    // Valida que la respuesta tenga el formato esperado
  }
}

const inputAnalyzerPrompt = `
Eres un asistente especializado en análisis de solicitudes de desarrolladores. Tu tarea es analizar el prompt del usuario y los metadatos proporcionados para determinar cómo procesar la solicitud.

CONTEXTO:
- Prompt del usuario: "{{userPrompt}}"
- Archivos referenciados: {{referencedFiles}}
- Funciones mencionadas: {{functionNames}}
- Contexto actual del proyecto: {{projectContext}}

INSTRUCCIONES:
1. Analiza el prompt y determina si la solicitud:
   a) Puede ser manejada directamente por una herramienta específica
   b) Requiere planificación completa

2. Si puede manejarse directamente, especifica la herramienta y los parámetros.
3. Identifica la categoría principal de la solicitud.

Tu respuesta debe ser un objeto JSON con la siguiente estructura:
{
  "needsFullPlanning": boolean,
  "category": "codeExamination" | "codeEditing" | "projectManagement" | "communication" | "other",
  "directAction": {
    "tool": string,
    "params": object
  } | null,
  "confidence": number,
  "relevantContext": string[]
}
`;



/* 

opcion mejor ??

// src/orchestrator/inputAnalyzer.ts
import { PromptLoader } from '../core/prompts/promptLoader';
import { AIService } from '../models/aiService';
import { SessionContext } from '../core/context/sessionContext';

export class InputAnalyzer {
  private promptLoader: PromptLoader;
  private aiService: AIService;
  
  constructor(aiService: AIService) {
    this.promptLoader = new PromptLoader();
    this.aiService = aiService;
  }
  
  async analyzeInput(input: UserInput, context: SessionContext): Promise<AnalysisResult> {
    const promptTemplate = this.promptLoader.loadPrompt('analyzer');
    const filledPrompt = this.promptLoader.fillPromptTemplate(promptTemplate, {
      userPrompt: input.prompt,
      referencedFiles: JSON.stringify(input.referencedFiles || []),
      functionNames: JSON.stringify(input.functionNames || []),
      projectContext: context.getState('projectContext') || '{}'
    });
    
    const response = await this.aiService.generateResponse(filledPrompt);
    
    try {
      const analysisResult = JSON.parse(response);
      
      // Validar estructura del resultado
      this.validateAnalysisResult(analysisResult);
      
      // Guardar en contexto para pasos posteriores
      context.setState('analysis', analysisResult);
      
      return analysisResult;
    } catch (error) {
      throw new Error(`Failed to parse analysis result: ${error.message}`);
    }
  }
  
  private validateAnalysisResult(result: any): void {
    // Implementar validación del formato JSON
  }
}

*/