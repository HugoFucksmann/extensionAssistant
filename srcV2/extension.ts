import * as vscode from 'vscode';
import { ExtensionHandler } from './core/config/extensionHandler';
import { logger } from './utils/logger';
import { ErrorHandler } from './utils/errorHandler';

// Global error handler instance for error reporting
export const errorHandler = new ErrorHandler();

export async function activate(context: vscode.ExtensionContext) {
  try {
    logger.info('Activating AI Assistant extension...');
    
    // Initialize the extension handler (main component container)
    const extensionHandler = ExtensionHandler.initialize(context);
    await extensionHandler.initialize();
    
    // Register cleanup on deactivation
    context.subscriptions.push({
      dispose: () => deactivateExtension()
    });
    
    logger.info('AI Assistant extension activated successfully');
  } catch (error) {
    logger.error('Failed to activate extension:', {error});
    deactivateExtension();
    vscode.window.showErrorMessage(
      `Extension activation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

function deactivateExtension() {
  try {
    const extensionHandler = ExtensionHandler.getInstance();
    extensionHandler.dispose();
    logger.info('AI Assistant extension deactivated');
  } catch (error) {
    // May fail if getInstance is called before initialization or after disposal
    logger.info('AI Assistant extension deactivated (no handler to dispose)');
  }
}

export function deactivate() {
  deactivateExtension();
}