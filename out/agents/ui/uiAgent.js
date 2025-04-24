"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UIAgent = void 0;
/**
 * UIAgent es responsable de gestionar la comunicación con la interfaz de usuario.
 * Recibe las respuestas del agente de memoria y las formatea para enviarlas a la UI.
 */
class UIAgent {
    constructor(uiProvider) {
        this.uiProvider = uiProvider;
        this.name = 'UIAgent';
    }
    async initialize() {
        console.log('UIAgent inicializado');
    }
    /**
     * Procesa la respuesta del agente de memoria y la envía a la UI
     * @param memoryResponse Respuesta del agente de memoria
     * @returns Respuesta formateada para la UI
     */
    async process(memoryResponse) {
        console.log(`${this.name} procesando respuesta de memoria:`, memoryResponse);
        // Extraer el mensaje del asistente
        const message = memoryResponse.assistantMessage.text;
        // Enviar mensaje a la UI
        this.uiProvider.sendMessageToWebview({
            type: 'receiveMessage',
            message,
            isUser: false
        });
        return {
            message,
            isUser: false,
            metadata: {
                timestamp: new Date().toISOString(),
                originalMemoryResponse: memoryResponse
            }
        };
    }
    dispose() {
        console.log('UIAgent eliminado');
    }
}
exports.UIAgent = UIAgent;
//# sourceMappingURL=uiAgent.js.map