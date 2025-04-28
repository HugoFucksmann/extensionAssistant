import * as vscode from 'vscode';
import { EventBus } from '../core/events/eventBus';
import { ChatManager } from '../ui/connectors/chatManager';
import { MemoryManager } from '../storage/memory/memoryManager';
import { AppCommands, VS_CODE_PREFIX } from '../config/constants';
import { OrchestratorService } from '../orchestrator/orchestratorService';
import { WorkflowManager } from '../orchestrator/workflowManager';
import { Plan } from '../orchestrator/planningEngine';

/**
 * CommandManager optimizado que utiliza el bus de eventos
 * para comunicarse con otros componentes
 */
export class CommandManager {
  constructor(
    private eventBus: EventBus,
    private chatManager: ChatManager,
    private memoryManager: MemoryManager,
    private orchestratorService: OrchestratorService,
    private workflowManager: WorkflowManager
  ) {
    console.log('CommandManager inicializado');
  }

  /**
   * Registra los comandos de VS Code
   * @param context El contexto de la extensión
   * @returns Array de disposables para los comandos registrados
   */
  public registerCommands(context: vscode.ExtensionContext): vscode.Disposable[] {
    return [
      // Comandos existentes
      ...this.registerChatCommands(),
      ...this.registerMemoryCommands(),
      ...this.registerModelCommands(),
      
      // Nuevos comandos para planificación y orquestación
      ...this.registerPlanningCommands(),
      ...this.registerToolCommands()
    ];
  }
  
  /**
   * Registra los comandos relacionados con el chat
   */
  private registerChatCommands(): vscode.Disposable[] {
    return [
      vscode.commands.registerCommand(`${VS_CODE_PREFIX}${AppCommands.CHAT_OPEN.split(':').join('.')}`, () => {
        vscode.commands.executeCommand('workbench.view.extension.ai-chat-sidebar');
      }),
      
      vscode.commands.registerCommand(`${VS_CODE_PREFIX}${AppCommands.MESSAGE_TEST.split(':').join('.')}`, async () => {
        await this.eventBus.emit(AppCommands.MESSAGE_SEND, { 
          message: 'Mensaje de prueba desde comando' 
        });
      }),
      
      vscode.commands.registerCommand(`${VS_CODE_PREFIX}${AppCommands.CHAT_NEW.split(':').join('.')}`, async () => {
        await this.chatManager.createNewChat();
      }),
      
      vscode.commands.registerCommand(`${VS_CODE_PREFIX}${AppCommands.CHAT_LOAD.split(':').join('.')}`, async (args: any) => {
        if (args?.chatId) {
          await this.chatManager.loadChat(args.chatId, args.loadMessages !== false);
        }
      }),
      
      vscode.commands.registerCommand(`${VS_CODE_PREFIX}${AppCommands.CHAT_LIST_LOAD.split(':').join('.')}`, async () => {
        await this.chatManager.getChatList();
      })
    ];
  }
  
  /**
   * Registra los comandos relacionados con la memoria
   */
  private registerMemoryCommands(): vscode.Disposable[] {
    return [
      vscode.commands.registerCommand(`${VS_CODE_PREFIX}${AppCommands.MEMORY_STORE.split(':').join('.')}`, async (args: any) => {
        if (args?.projectPath && args?.key && args?.content) {
          await this.memoryManager.storeProjectMemory(args.projectPath, args.key, args.content);
        }
      }),
      
      vscode.commands.registerCommand(`${VS_CODE_PREFIX}${AppCommands.MEMORY_GET.split(':').join('.')}`, async (args: any) => {
        if (args?.projectPath && args?.key) {
          return this.memoryManager.getProjectMemory(args.projectPath, args.key);
        }
        return null;
      })
    ];
  }
  
  /**
   * Registra los comandos relacionados con el modelo
   */
  private registerModelCommands(): vscode.Disposable[] {
    return [
      vscode.commands.registerCommand(`${VS_CODE_PREFIX}${AppCommands.MODEL_CHANGE.split(':').join('.')}`, async (args: any) => {
        const modelType = args?.modelType || 'gemini';
        await this.eventBus.emit(AppCommands.MODEL_CHANGE, { modelType });
      })
    ];
  }
  
  /**
   * Registra los comandos relacionados con la planificación
   */
  private registerPlanningCommands(): vscode.Disposable[] {
    return [
      // Crear un nuevo plan basado en una entrada del usuario
      vscode.commands.registerCommand(`${VS_CODE_PREFIX}${AppCommands.PLAN_CREATE.split(':').join('.')}`, async (args: any) => {
        if (args?.userInput && args?.sessionId) {
          const result = await this.orchestratorService.handleRequest(args.userInput, args.sessionId);
          return result;
        }
        return null;
      }),
      
      // Ejecutar un plan existente
      vscode.commands.registerCommand(`${VS_CODE_PREFIX}${AppCommands.PLAN_EXECUTE.split(':').join('.')}`, async (args: any) => {
        if (args?.plan) {
          return this.workflowManager.executePlan(args.plan);
        }
        return null;
      }),
      
      // Pausar la ejecución de un plan
      vscode.commands.registerCommand(`${VS_CODE_PREFIX}${AppCommands.PLAN_PAUSE.split(':').join('.')}`, async (args: any) => {
        if (args?.plan) {
          await this.workflowManager.pausePlanExecution(args.plan);
          await this.eventBus.emit(AppCommands.PLAN_UPDATED, { 
            plan: args.plan,
            message: 'Plan pausado'
          });
        }
      }),
      
      // Reanudar un plan pausado
      vscode.commands.registerCommand(`${VS_CODE_PREFIX}${AppCommands.PLAN_RESUME.split(':').join('.')}`, async (args: any) => {
        if (args?.plan) {
          await this.workflowManager.resumePlanExecution(args.plan);
          await this.eventBus.emit(AppCommands.PLAN_UPDATED, { 
            plan: args.plan,
            message: 'Plan reanudado'
          });
        }
      }),
      
      // Cancelar un plan en ejecución
      vscode.commands.registerCommand(`${VS_CODE_PREFIX}${AppCommands.PLAN_CANCEL.split(':').join('.')}`, async (args: any) => {
        if (args?.plan) {
          await this.orchestratorService.cancelCurrentOperation(args.sessionId || 'default');
          await this.eventBus.emit(AppCommands.PLAN_UPDATED, {
            plan: args.plan,
            message: 'Plan cancelado',
            reason: args.reason || 'Cancelado por el usuario'
          });
        }
      }),
      
      // Obtener estado actual de un plan
      vscode.commands.registerCommand(`${VS_CODE_PREFIX}${AppCommands.PLAN_STATUS_GET.split(':').join('.')}`, async (args: any) => {
        if (args?.sessionId) {
          return this.orchestratorService.getExecutionStatus(args.sessionId);
        }
        return null;
      })
    ];
  }
  
  /**
   * Registra los comandos relacionados con herramientas
   */
  private registerToolCommands(): vscode.Disposable[] {
    return [
      // Ejecutar una herramienta específica directamente
      vscode.commands.registerCommand(`${VS_CODE_PREFIX}${AppCommands.TOOL_EXECUTE.split(':').join('.')}`, async (args: any) => {
        if (args?.toolName && args?.parameters) {
          // Asumiendo que hay un método para ejecutar herramientas directamente
          // Puede ser implementado en OrchestratorService o en otra clase específica
          return this.workflowManager['executeToolDirectly'](args.toolName, args.parameters, args.context);
        }
        return null;
      }),
      
      // Listar herramientas disponibles
      vscode.commands.registerCommand(`${VS_CODE_PREFIX}${AppCommands.TOOL_LIST.split(':').join('.')}`, async () => {
        // Asumiendo que ToolRegistry está accesible de alguna forma
        // Puedes ajustar según tu arquitectura específica
        return this.orchestratorService['toolRegistry'].getAllTools();
      })
    ];
  }
}