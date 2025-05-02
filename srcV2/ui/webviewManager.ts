import * as vscode from 'vscode';
import { UIStateContext } from '../core/context/uiStateContext';
import { ChatService } from '../services/chatService';
import { WebviewProvider } from './webview/webviewProvider';
import { ExtensionHandler } from '../core/config/extensionHandler';

/**
 * Clase que centraliza toda la gestión de WebView
 * Maneja la creación, configuración y comunicación con el WebView
 */
export class WebViewManager {
  public static readonly viewType = 'aiChat.chatView';
  private webviewProvider: WebviewProvider;

  constructor(
    private readonly extensionUri: vscode.Uri,
    private readonly uiStateContext: UIStateContext,
    private readonly chatService: ChatService
  ) {
    // Crear el proveedor de webview
    this.webviewProvider = new WebviewProvider(
      extensionUri,
      uiStateContext,
      chatService
    );
  }

  /**
   * Registra el proveedor de webview en VS Code
   */
  public register(context: vscode.ExtensionContext): vscode.Disposable {
    return vscode.window.registerWebviewViewProvider(
      WebViewManager.viewType,
      this.webviewProvider
    );
  }

  /**
   * Limpia los recursos al desactivar la extensión
   */
  public dispose(): void {
    this.webviewProvider.dispose();
  }
}