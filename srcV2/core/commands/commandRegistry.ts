import * as vscode from 'vscode';
import { VS_CODE_PREFIX } from '../config/constants';

export class CommandRegistry {
  private commands: Map<string, Function> = new Map();
  
  // Register a command handler
  register(command: string, handler: Function): void {
    this.commands.set(command, handler);
  }
  
  // Register all commands with VS Code
  registerWithVSCode(context: vscode.ExtensionContext): vscode.Disposable[] {
    const disposables: vscode.Disposable[] = [];
    
    this.commands.forEach((handler, command) => {
      disposables.push(
        vscode.commands.registerCommand(
          `${VS_CODE_PREFIX}${command.split(':').join('.')}`,
          async (args: any) => await handler(args)
        )
      );
    });
    
    return disposables;
  }
}