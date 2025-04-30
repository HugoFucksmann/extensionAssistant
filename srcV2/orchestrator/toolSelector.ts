import { OrchestrationContext } from '../core/context/orchestrationContext';
import { toolSelectorPrompt } from '../core/prompts/prompt.toolSelector'; // Ajusta el path si es necesario
import { ToolRegistry } from '../tools/core/toolRegistry';
import { ErrorHandler } from '../utils/errorHandler';
import { Logger } from '../utils/logger';
import { InputAnalysis } from './inputAnalyzer';

/**
 * Interfaz que define la selección de una herramienta
 */
export interface ToolSelection {
  tool: string;
  reason: string;
  confidence: number;
}

export class ToolSelector {
  private orchestrationContext: OrchestrationContext;
  private toolRegistry: ToolRegistry;
  private logger: Logger;
  private errorHandler: ErrorHandler;
  private modelApi: any; // Cambia el tipo si tienes una interfaz concreta

  constructor(
    orchestrationContext: OrchestrationContext,
    toolRegistry: ToolRegistry,
    logger: Logger,
    errorHandler: ErrorHandler,
    modelApi: any // Asegúrate de pasar una instancia con generateResponse(prompt: string): Promise<string>
  ) {
    this.orchestrationContext = orchestrationContext;
    this.toolRegistry = toolRegistry;
    this.logger = logger;
    this.errorHandler = errorHandler;
    this.modelApi = modelApi;
  }

  /**
   * Selecciona la herramienta adecuada según el análisis de entrada y contexto.
   */
  public async selectTool(
    taskDescription: string,
    stepDescription: string,
    inputAnalysis: InputAnalysis
  ): Promise<ToolSelection> {
    try {
      // 1. Obtener el contexto centralizado
      // Nota: Asumimos que el contexto es accesible directamente
      const contextData = this.orchestrationContext;

      // 2. Obtener herramientas disponibles
      const availableTools = this.toolRegistry.getAvailableTools();

      // 3. Preparar el prompt para el modelo
      const prompt = this.preparePrompt(
        taskDescription,
        stepDescription,
        inputAnalysis,
        contextData,
        availableTools
      );

      // 4. Llamar al modelo para obtener la respuesta
      const modelResponse = await this.modelApi.generateResponse(prompt);

      // 5. Validar y parsear la respuesta del modelo
      const selection = this.validateAndParseSelection(modelResponse, availableTools);

      if (!selection) {
        throw new Error('No se pudo parsear la selección de herramienta del modelo.');
      }

      return selection;
    } catch (err) {
      this.logger.error('[ToolSelector] Error en selectTool:', {err: err});
      // Capturar el error pero no necesitamos usar el resultado
      this.errorHandler.handleError(err, 'ToolSelector.selectTool');

      // Fallback robusto: selecciona la primera herramienta disponible o una por defecto
      const fallbackTools = this.toolRegistry.getAvailableTools();
      const fallbackTool = fallbackTools[0]?.name || 'defaultTool';
      return {
        tool: fallbackTool,
        reason: 'Fallback: error en la selección automática',
        confidence: 0
      };
    }
  }

  /**
   * Prepara el prompt para el modelo usando el contexto y análisis de entrada.
   */
  private preparePrompt(
    taskDescription: string,
    stepDescription: string,
    inputAnalysis: InputAnalysis,
    contextData: any,
    availableTools: any[]
  ): string {
    // Variables para el prompt
    const sessionContext = contextData.session || '';
    const projectContext = contextData.project || '';
    const codeContext = contextData.code || '';

    // Serializar herramientas disponibles
    const toolsList = availableTools
      .map((tool: any) => `- ${tool.name}: ${tool.description}`)
      .join('\n');

    // Reemplazar variables en el template
    let prompt = toolSelectorPrompt
      .replace('{{taskDescription}}', taskDescription)
      .replace('{{stepDescription}}', stepDescription)
      .replace('{{inputAnalysis}}', JSON.stringify(inputAnalysis, null, 2))
      .replace('{{sessionContext}}', JSON.stringify(sessionContext, null, 2))
      .replace('{{projectContext}}', JSON.stringify(projectContext, null, 2))
      .replace('{{codeContext}}', JSON.stringify(codeContext, null, 2))
      .replace('{{availableTools}}', toolsList);

    return prompt;
  }

  /**
   * Valida y parsea la selección de herramienta devuelta por el modelo.
   */
  private validateAndParseSelection(modelResponse: string, availableTools: any[]): ToolSelection | null {
    try {
      // Asume que el modelo responde con un JSON válido
      const parsed = JSON.parse(modelResponse) as any;

      // Validación básica
      if (
        parsed &&
        typeof parsed.tool === 'string' &&
        availableTools.some((tool: any) => tool.name === parsed.tool)
      ) {
        return {
          tool: parsed.tool,
          reason: parsed.reason || '',
          confidence: parsed.confidence || 1
        };
      }
      return null;
    } catch (err) {
      this.logger.warn('[ToolSelector] No se pudo parsear la respuesta del modelo:',{ modelResponse });
      return null;
    }
  }
}