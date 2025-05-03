
import { Logger } from '../../utils/logger';
import { BaseAPI } from '../../models/baseAPI';
import { runPrompt } from '../../core/promptSystem/promptSystem';
import { ConfigurationManager } from '../../core/config/ConfigurationManager';

export interface ExaminationPlan {
  objective: string;
  steps: {
    toolName: string;
    params: any;
    description: string;
    resultKey?: string;
  }[];
  estimatedComplexity: 'simple' | 'moderate' | 'complex';
}

export class ExaminationPlanner {
  constructor(
    private configurationManager: ConfigurationManager,
    private logger: Logger,
    private modelApi: BaseAPI
  ) {
    this.logger.info('ExaminationPlanner inicializado');
    console.log(`[ExaminationPlanner] Inicializado`);
  }
  
  public async createExaminationPlan(input: string, codeContext: any): Promise<ExaminationPlan> {
    try {
      this.logger.info('ExaminationPlanner: Creando plan de examen', { input });
      console.log(`[ExaminationPlanner] Creando plan para: ${input}`);

      const context = {
        userPrompt: input,
        codeContext,
        availableTools: this.getAvailableExaminationTools()
      };

      const plan = await runPrompt<ExaminationPlan>(
        'examination',
        context,
        this.modelApi
      );

      this.logger.info(`[ExaminationPlanner] Plan creado con ${plan.steps.length} pasos`);
      return plan;
    } catch (error) {
      this.logger.error('ExaminationPlanner: Error creando plan', { error });
      console.error(`[ExaminationPlanner] Error: ${error instanceof Error ? error.message : 'Error desconocido'}`);
      return {
        objective: 'Plan por defecto debido a un error',
        steps: [],
        estimatedComplexity: 'simple'
      };
    }
  }
  
  
  private getAvailableExaminationTools(): any[] {
    // Aquí deberías devolver la lista de herramientas disponibles para examen de código
    return [
      {
        name: 'readFile',
        description: 'Lee el contenido de un archivo',
        parameters: {
          file: 'Ruta al archivo a leer'
        }
      },
      {
        name: 'searchFiles',
        description: 'Busca archivos en el proyecto',
        parameters: {
          pattern: 'Patrón de búsqueda (glob)',
          path: 'Ruta donde buscar (opcional)'
        }
      },
      {
        name: 'searchCode',
        description: 'Busca código en el proyecto',
        parameters: {
          query: 'Término de búsqueda',
          path: 'Ruta donde buscar (opcional)',
          language: 'Lenguaje de programación (opcional)'
        }
      },
      {
        name: 'analyzeCode',
        description: 'Analiza el código en busca de patrones o problemas',
        parameters: {
          file: 'Ruta al archivo a analizar',
          type: 'Tipo de análisis (estructura, dependencias, complejidad)'
        }
      }
    ];
  }
}
