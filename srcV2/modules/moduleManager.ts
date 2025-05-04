// src/modules/moduleManager.ts

import { EventBus } from '../core/event/eventBus';
import { log } from '../utils/logger';
import { ToolRegistry } from '../tools/core/toolRegistry';
import { ErrorHandler } from '../utils/errorHandler';
import { OrchestrationContext } from '../core/context/orchestrationContext';
import { ExecutionPlan } from '../orchestrator/planningEngine';


// Interfaces para definir módulos
export interface Module {
  name: string;
  category: string;
  description: string;
  supportedIntents: string[];
  canHandleIntent(intent: string): boolean;
  createPlan(input: string, context: any): Promise<ModulePlan>;
  executePlan(plan: ExecutionPlan, context: OrchestrationContext): Promise<any>;
}

export interface ModulePlan {
  id: string;
  objective: string;
  steps: {
    description: string;
    toolName: string;
    params: Record<string, any>;
    resultKey?: string;
  }[];
  estimatedComplexity?: "simple" | "moderate" | "complex";
}

export class ModuleManager {
  private modules: Map<string, Module> = new Map();
  private categoryToModuleMap: Map<string, Module> = new Map();
  private intentToModuleMap: Map<string, Module[]> = new Map();
  
  constructor(
 
    private toolRegistry: ToolRegistry,
    private eventBus: EventBus,
    private errorHandler: ErrorHandler
  ) {
    this.initializeDefaultModules();
  
  }

  private initializeDefaultModules() {
    // Este método inicializaría los módulos predeterminados
    // que mencionaste en tu código: EditingModule, ExaminationModule, etc.
    // Aquí solo registramos la estructura básica, la implementación real
    // vendrá cuando se implementen los módulos
  }

  /**
   * Registra un nuevo módulo en el sistema
   */
  public registerModule(module: Module): void {
    if (this.modules.has(module.name)) {
      log(`Module ${module.name} is already registered`,'warn');
      return;
    }

    this.modules.set(module.name, module);
    this.categoryToModuleMap.set(module.category, module);
    
    // Registrar el módulo para cada intent que soporte
    for (const intent of module.supportedIntents) {
      if (!this.intentToModuleMap.has(intent)) {
        this.intentToModuleMap.set(intent, []);
      }
      this.intentToModuleMap.get(intent)!.push(module);
    }

    log(`Module ${module.name} registered for category ${module.category}`,'info');
    this.eventBus.emit('module:registered', { moduleName: module.name });
  }

  /**
   * Encuentra un módulo por categoría
   */
  public getModuleByCategory(category: string): Module | undefined {
    return this.categoryToModuleMap.get(category);
  }

  /**
   * Encuentra módulos que pueden manejar un intent específico
   */
  public getModulesByIntent(intent: string): Module[] {
    return this.intentToModuleMap.get(intent) || [];
  }

  /**
   * Encuentra el mejor módulo para un análisis de entrada específico
   */
  public findBestModuleForAnalysis(analysis: {
    category: string;
    intentClassification: string;
    confidence: number;
  }): Module | undefined {
    // Primero intentamos encontrar un módulo por categoría
    const categoryModule = this.getModuleByCategory(analysis.category);
    if (categoryModule && analysis.confidence > 0.7) {
      return categoryModule;
    }

    // Si no encontramos un módulo por categoría o la confianza es baja,
    // intentamos encontrar un módulo por intent
    const intentModules = this.getModulesByIntent(analysis.intentClassification);
    if (intentModules.length > 0) {
      // Aquí podríamos implementar lógica adicional para seleccionar
      // el mejor módulo si hay varios que manejan el mismo intent
      return intentModules[0];
    }

    return undefined;
  }

  /**
   * Crea un plan utilizando el módulo apropiado
   */
  public async createPlan(
    input: string,
    analysis: {
      category: string;
      intentClassification: string;
      confidence: number;
    },
    context: any
  ): Promise<ModulePlan | null> {
    const module = this.findBestModuleForAnalysis(analysis);
    
    if (!module) {
      log('No specialized module found for input analysis { analysis }','warn' );
      return null;
    }

    try {
      log(`Creating plan with module ${module.name} { analysis }`, 'info');
      return await module.createPlan(input, context);
    } catch (error) {
      log(`Error creating plan with module ${module.name }: ${ error }`, 'error');
      this.errorHandler.handleError({
        error,
        context: 'ModuleManager.createPlan',
        metadata: {
          module: module.name,
          analysis
        }
      });
      return null;
    }
  }

  /**
   * Ejecuta un plan utilizando el módulo apropiado
   */
  public async executePlan(
    plan: ExecutionPlan,
    context: OrchestrationContext
  ): Promise<any> {
    // Determinamos qué módulo debe ejecutar este plan
    // Esto podría basarse en metadatos en el plan o en otra lógica
    
    // Asumimos que el plan tiene un campo metadata.category
    const category = (plan as any).metadata?.category || 'default';
    const module = this.getModuleByCategory(category);
    
    if (!module) {
      log('No specialized module found for plan execution { category }', 'warn');
      throw new Error(`No module found for category ${category}`);
    }

    try {
     
      return await module.executePlan(plan, context);
    } catch (error) {
      log(`Error executing plan with module ${module.name} ${ error }`, 'error');
      this.errorHandler.handleError({
        error,
        context: 'ModuleManager.executePlan',
        metadata: {
          module: module.name,
          planId: plan.id
        }
      });
      throw error;
    }
  }

  /**
   * Devuelve todos los módulos registrados
   */
  public getAllModules(): Module[] {
    return Array.from(this.modules.values());
  }
}