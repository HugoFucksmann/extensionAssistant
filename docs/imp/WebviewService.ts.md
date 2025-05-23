// src/ui/services/WebviewService.ts
export class WebviewService {
  private static instance: WebviewService;
  
  private constructor() {}
  
  static getInstance(): WebviewService {
    if (!WebviewService.instance) {
      WebviewService.instance = new WebviewService();
    }
    return WebviewService.instance;
  }

  sendMessage(type: string, payload: Record<string, unknown> = {}) {
    window.vscode.postMessage({ type, payload });
    console.log('[WebviewService] Sent:', { type, payload });
  }

  // Convenient methods for common operations
  sendUserMessage(text: string, files: string[] = [], chatId: string) {
    this.sendMessage('webview:sendMessage', { text, files, chatId });
  }

  requestNewChat() {
    this.sendMessage('webview:requestNewChat');
  }

  loadChat(chatId: string) {
    this.sendMessage('webview:loadChat', { chatId });
  }

  clearChat(chatId: string) {
    this.sendMessage('webview:clearChat', { chatId });
  }

  notifyReady() {
    this.sendMessage('webview:ready');
  }
}