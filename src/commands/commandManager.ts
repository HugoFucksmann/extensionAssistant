import * as vscode from 'vscode';
import { EventBus } from '../core/eventBus';

/**
 * CommandManager optimizado que utiliza el bus de eventos
 * para comunicarse con otros componentes
 */
export class CommandManager {
  constructor(
    private eventBus: EventBus
  ) {
    console.log('CommandManager inicializado');
    
    // No necesita referencias directas a otros componentes
    // La comunicación se hace a través del bus de eventos
  }

  /**
   * Registra los comandos de VS Code
   * @param context El contexto de la extensión
   * @returns Array de disposables para los comandos registrados
   */
  public registerCommands(context: vscode.ExtensionContext): vscode.Disposable[] {
    return [
      vscode.commands.registerCommand('extensionAssistant.openChat', () => {
        vscode.commands.executeCommand('workbench.view.extension.ai-chat-sidebar');
      }),
      
      vscode.commands.registerCommand('extensionAssistant.sendTestMessage', async () => {
        // Emitir evento para procesar mensaje de prueba
        await this.eventBus.emit('message:send', { 
          message: 'Mensaje de prueba desde comando' 
        });
      }),
      
      vscode.commands.registerCommand('extensionAssistant.createNewChat', async () => {
        await this.eventBus.emit('chat:new');
      }),
      
      vscode.commands.registerCommand('extensionAssistant.setModel', async (args: any) => {
        const modelType = args?.modelType || 'gemini';
        await this.eventBus.emit('model:change', { modelType });
      })
    ];
  }
}