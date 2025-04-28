import { ToolRegistry } from '../tools/core/toolRegistry';

export class ToolSelector {
  private toolRegistry: ToolRegistry;

  constructor(/* Inyectar dependencias */) {
    // ... inicialización
  }

  public async selectBestTool(capability: string, context: any): Promise<string | null> {
    // 1. Obtiene herramientas que cumplen la 'capability' desde toolRegistry.
    // 2. Aplica lógica/heurística/LLM para seleccionar la mejor basada en 'context'.
    // 3. Retorna el nombre/ID de la herramienta seleccionada o null.
  }
  
  // Missing methods to add:
  private async getToolsByCapability(capability: string): Promise<string[]> {
    // Recupera todas las herramientas que proporcionan la capacidad especificada
  }
  
  private async rankTools(tools: string[], context: any): Promise<string[]> {
    // Ordena las herramientas según su relevancia para el contexto actual
  }
  
  public async getToolCapabilities(toolName: string): Promise<string[]> {
    // Obtiene las capacidades que proporciona una herramienta específica
  }
  
  public async buildToolSelectionPrompt(capability: string, tools: string[], context: any): Promise<string> {
    // Construye un prompt para que el LLM ayude a seleccionar la mejor herramienta
  }
}

const toolSelectorPrompt = `
Eres un experto en selección de herramientas para desarrollo de software. Tu tarea es analizar el contexto y elegir la herramienta más adecuada para cada paso del proceso.

CONTEXTO:
- Solicitud actual: "{{currentStep}}"
- Estado actual: {{currentState}}
- Resultado anterior: {{previousResult}}

HERRAMIENTAS DISPONIBLES:
{{availableTools}}

INSTRUCCIONES:
1. Analiza el paso actual del plan.
2. Selecciona la herramienta más adecuada y especifica los parámetros exactos.
3. Justifica brevemente tu elección.

Tu respuesta debe ser un objeto JSON con la siguiente estructura:
{
  "selectedTool": string,
  "parameters": object,
  "reasoning": string,
  "requiredContext": string[],
  "expectedOutcome": string
}
`