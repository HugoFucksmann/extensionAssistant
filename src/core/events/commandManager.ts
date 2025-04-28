import * as vscode from 'vscode';
import { EventBus } from './eventBus';
import { ChatManager } from '../../ui/conectors/chatManager';
import { MemoryManager } from '../storage/memory/memoryManager';
import { AppCommands, VS_CODE_PREFIX } from '../config/constants';

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
      vscode.commands.registerCommand(`${VS_CODE_PREFIX}${AppCommands.CHAT_OPEN.split(':').join('.')}`, () => {
        vscode.commands.executeCommand('workbench.view.extension.ai-chat-sidebar');
      }),
      
      vscode.commands.registerCommand(`${VS_CODE_PREFIX}${AppCommands.MESSAGE_TEST.split(':').join('.')}`, async () => {
        // Emitir evento para procesar mensaje de prueba
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
      }),
      
      vscode.commands.registerCommand(`${VS_CODE_PREFIX}${AppCommands.MODEL_CHANGE.split(':').join('.')}`, async (args: any) => {
        const modelType = args?.modelType || 'gemini';
        await this.eventBus.emit(AppCommands.MODEL_CHANGE, { modelType });
      }),
      
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
}