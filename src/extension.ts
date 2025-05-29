import * as vscode from 'vscode';
import { ExtensionActivator } from './ExtensionActivator';
import { ComponentFactory } from './core/ComponentFactory';

let activator: ExtensionActivator | undefined;

export function activate(context: vscode.ExtensionContext) {
  console.log('Activating extensionAssistant (Windsurf Architecture)');
  
  try {
    activator = new ExtensionActivator(context);
    activator.activate();
    console.log('Extension activated successfully');
  } catch (error) {
    console.error('Error activating extension:', error);
    vscode.window.showErrorMessage(
      'Error al activar la extensión. Por favor, revisa la consola para más detalles.'
    );
  }
}

export function deactivate() {
  console.log('Deactivating extension');
  activator?.deactivate();
  ComponentFactory.dispose();
  console.log('Extension deactivated.');
}