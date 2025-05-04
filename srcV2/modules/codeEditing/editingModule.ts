/* // CODIGO DE EJEMPLO SIN TERMINAR DE IMPLEMENTAR

import { LoggerService } from '../../utils/logger';
import { ToolRegistry } from '../../tools/core/toolRegistry';
import { ExecutionPlan } from '../../orchestrator/planningEngine';
import { OrchestrationContext } from '../../core/context/orchestrationContext';
import { Module, ModulePlan } from '../moduleManager';
import { executeModelInteraction } from '../../core/promptSystem/promptSystem';

export class CodeEditingModule implements Module {
  public name = 'codeEditingModule';
  public category = 'codeEditing';
  public description = 'Module for handling code editing requests';
  public supportedIntents = [
    'edit_code',
    'refactor_code',
    'format_code',
    'fix_bug',
    'implement_feature',
    'create_file',
    'modify_file'
  ];

  constructor(
    private toolRegistry: ToolRegistry,
    private logger: LoggerService
  ) {
    this.logger.info('CodeEditingModule initialized');
  }

  public canHandleIntent(intent: string): boolean {
    return this.supportedIntents.includes(intent);
  }

  public async createPlan(input: string, context: any): Promise<ModulePlan> {
    this.logger.info('CodeEditingModule creating plan', { input });
    
    try {
      // Aquí utilizaríamos executeModelInteraction para generar un plan específico
      // para edición de código
      const result = await executeModelInteraction<ModulePlan>(
        'codeEditingPlanner',
        {
          userInput: input,
          context,
          availableTools: this.getEditingTools()
        }
      );
      
      // Añadir información del módulo
      return {
        ...result,
        moduleUsed: this.name
      };
    } catch (error) {
      this.logger.error('Error creating code editing plan', { error });
      throw error;
    }
  }

  public async executePlan(plan: ExecutionPlan, context: OrchestrationContext): Promise<any> {
    this.logger.info('CodeEditingModule executing plan', { planId: plan.id });
    
    // Aquí podríamos implementar una lógica especializada para la ejecución de
    // planes de edición de código.
    
    // En este ejemplo, simplemente ejecutamos cada paso secuencialmente usando
    // las herramientas correspondientes, pero podríamos añadir lógica adicional
    // específica para la edición de código
    
    const results: any[] = [];
    
    // Verificamos el contexto para obtener información específica de edición de código
    const currentFile = context.get().currentFile;
    const projectData = context.get().projectData;
    
    if (!currentFile && plan.plan.some(step => step.toolName === 'codeEditor')) {
      this.logger.warn('CodeEditingModule executing plan without current file context');
    }
    
    for (let i = 0; i < plan.plan.length; i++) {
      const step = plan.plan[i];
      this.logger.info(`Executing step ${i + 1}: ${step.description}`, { toolName: step.toolName });
      
      // Obtener la herramienta
      const tool = this.toolRegistry.getByName(step.toolName);
      if (!tool) {
        throw new Error(`Tool not found: ${step.toolName}`);
      }
      
      // Aquí podríamos enriquecer los parámetros con información específica
      // del contexto de edición de código
      const enrichedParams = this.enrichToolParams(step.toolParams, currentFile, projectData);
      
      // Ejecutar la herramienta
      const result = await tool.execute(enrichedParams);
      results.push(result);
      
      // Actualizar el contexto
      this.updateContext(context, step, result);
    }
    
    return {
      executedSteps: plan.plan.length,
      results,
      finalContent: context.get().editedContent
    };
  }

  private getEditingTools(): any[] {
    // Filtrar las herramientas disponibles para obtener solo las relacionadas
    // con la edición de código
    return this.toolRegistry.getAvailableTools()
      .filter(tool => [
        'codeEditor',
        'fileEditor',
        'codeAnalyzer',
        'formatter',
        'refactorHelper'
      ].includes(tool.name));
  }

  private enrichToolParams(
    params: Record<string, any>,
    currentFile?: string,
    projectData?: any
  ): Record<string, any> {
    // Si no hay parámetros de archivo pero tenemos un archivo actual,
    // añadirlo a los parámetros
    if (!params.file && currentFile) {
      return {
        ...params,
        file: currentFile
      };
    }
    
    // Si hay información específica del proyecto que podría ser útil,
    // añadirla a los parámetros
    if (projectData && params.requiresProjectContext) {
      return {
        ...params,
        projectContext: projectData
      };
    }
    
    return params;
  }

  private updateContext(
    context: OrchestrationContext,
    step: any,
    result: any
  ): void {
    // Actualizar el contexto con los resultados específicos de la edición
    if (result.editedContent) {
      context.set({ editedContent: result.editedContent });
    }
    
    if (result.createdFile) {
      const existingFiles = context.get().createdFiles || [];
      context.set({ 
        createdFiles: [...existingFiles, result.createdFile] 
      });
    }
  }
} */