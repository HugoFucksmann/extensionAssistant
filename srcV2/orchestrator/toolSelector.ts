import { OrchestrationContext } from "../core/context/orchestrationContext";
import { executeModelInteraction } from "../core/promptSystem/promptSystem";
import { ToolRegistry } from "../tools/core/toolRegistry";
import { LoggerService } from "../utils/logger";


export interface ToolSelection {
  toolName: string;
  params: Record<string, any>;
  confidence: number;
}

export class ToolSelector {
  constructor(
    private context: OrchestrationContext,
    private toolRegistry: ToolRegistry,
    private logger: LoggerService
  ) {}

  public async selectTool(taskDescription: string): Promise<ToolSelection> {
    try {
      this.logger.info('Seleccionando herramienta para tarea', { taskDescription });
      
      return await executeModelInteraction<ToolSelection>(
        'toolSelector',
        {
          taskDescription,
          availableTools: this.toolRegistry.getAvailableTools(),
          context: this.context.get()
        }
      );
    } catch (error) {
      this.logger.error('Error seleccionando herramienta', { error });
      return this.getDefaultToolSelection();
    }
  }

  private getDefaultToolSelection(): ToolSelection {
    return {
      toolName: 'default',
      params: {},
      confidence: 0
    };
  }
}
