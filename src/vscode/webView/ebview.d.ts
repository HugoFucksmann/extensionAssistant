// src/vscode/webView/webview.d.ts
declare global {
    // Definiciones para el entorno de la Webview
    const vscode: {
        postMessage: (message: any) => void;
        getState: () => any;
        setState: (newState: any) => void;
    };

    interface Window {
        vscode: ReturnType<typeof acquireVsCodeApi>; // Asumiendo que acquireVsCodeApi está disponible globalmente en la webview
    }

    // Si usas document y MutationObserver directamente en el TS de la webview, también irían aquí.
    // Por ahora, solo se incluye `vscode` y `Window.vscode` que son comunes.
    // const document: any; // Descomentar si es necesario
    // const MutationObserver: { // Descomentar si es necesario
    //   new(callback: (mutations: any[], observer: any) => void): MutationObserver;
    // };
}

// Asegúrate de que este archivo sea tratado como un módulo si no tiene importaciones/exportaciones.
// Una forma es añadir:
export { }; 