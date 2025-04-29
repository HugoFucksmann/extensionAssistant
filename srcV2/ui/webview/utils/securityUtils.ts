/**
 * Utilidades de seguridad para el webview
 */
export function generateNonce(): string {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
      text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
  }
  
  /**
   * Genera una política de seguridad de contenido para el webview
   */
  export function generateContentSecurityPolicy(webviewCspSource: string, nonce: string): string {
    return `default-src 'none'; style-src ${webviewCspSource} 'unsafe-inline'; img-src ${webviewCspSource} https: data:; script-src 'nonce-${nonce}' 'unsafe-eval'; connect-src https: http: ws:;`;
  }