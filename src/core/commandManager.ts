import * as vscode from 'vscode';
import { EventBus } from './eventBus';
import { ChatManager } from './chatManager';
import { MemoryManager } from './memoryManager';

/**
 * CommandManager optimizado que utiliza el bus de eventos
 * para comunicarse con otros componentes
 */
export class CommandManager {
  constructor(
    private eventBus: EventBus,
    private chatManager: ChatManager,
    private memoryManager: MemoryManager
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
        await this.chatManager.createNewChat();
      }),
      
      vscode.commands.registerCommand('extensionAssistant.loadChat', async (args: any) => {
        if (args?.chatId) {
          await this.chatManager.loadChat(args.chatId, args.loadMessages !== false);
        }
      }),
      
      vscode.commands.registerCommand('extensionAssistant.loadChatList', async () => {
        await this.chatManager.getChatList();
      }),
      
      vscode.commands.registerCommand('extensionAssistant.setModel', async (args: any) => {
        const modelType = args?.modelType || 'gemini';
        await this.eventBus.emit('model:change', { modelType });
      }),
      
      vscode.commands.registerCommand('extensionAssistant.storeProjectMemory', async (args: any) => {
        if (args?.projectPath && args?.key && args?.content) {
          await this.memoryManager.storeProjectMemory(args.projectPath, args.key, args.content);
        }
      }),
      
      vscode.commands.registerCommand('extensionAssistant.getProjectMemory', async (args: any) => {
        if (args?.projectPath && args?.key) {
          return this.memoryManager.getProjectMemory(args.projectPath, args.key);
        }
        return null;
      })
    ];
  }
}