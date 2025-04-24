"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrchestratorAgent = void 0;
const uiAgent_1 = require("./ui/uiAgent");
/**
 * OrchestratorAgent es responsable de coordinar el flujo de procesamiento entre los diferentes agentes.
 * Recibe mensajes del usuario, los procesa a través de los agentes y devuelve respuestas.
 * Se enfoca exclusivamente en el flujo de mensajes entre el usuario y el asistente IA.
 */
class OrchestratorAgent {
    constructor(memoryAgent, uiProvider) {
        this.uiProvider = uiProvider;
        this.modelAPI = null;
        console.log('OrchestratorAgent inicializado');
        // Inicializar componentes
        this.memoryAgent = memoryAgent;
        this.uiAgent = new uiAgent_1.UIAgent(uiProvider);
    }
    /**
     * Establece la instancia de BaseAPI a utilizar
     * @param modelAPI La instancia de BaseAPI
     */
    setModelAPI(modelAPI) {
        console.log('OrchestratorAgent: Estableciendo instancia de BaseAPI');
        this.modelAPI = modelAPI;
    }
    /**
     * Inicializa todos los agentes
     * @param context El contexto de la extensión
     */
    async initialize(context) {
        console.log('Inicializando todos los agentes...');
        // Inicializar agentes
        await this.memoryAgent.initialize();
        await this.uiAgent.initialize();
        console.log('Todos los agentes inicializados correctamente');
    }
    /**
     * Procesa un mensaje del usuario a través de la cadena de agentes
     * @param message El texto del mensaje del usuario
     * @returns La respuesta final para la UI
     */
    async processUserMessage(message) {
        if (!this.modelAPI) {
            throw new Error('ModelAPI no inicializado en OrchestratorAgent');
        }
        console.log(`OrchestratorAgent procesando mensaje: ${message}`);
        try {
            // 1. Generar respuesta con el modelo
            console.log('Paso 1: Enviando mensaje al modelo');
            const response = await this.modelAPI.generateResponse(message);
            console.log('Respuesta del modelo recibida');
            // Crear respuesta estructurada
            const modelResponse = {
                response,
                modelType: this.modelAPI.getCurrentModel(),
                metadata: {
                    timestamp: new Date().toISOString(),
                    prompt: message
                }
            };
            console.log('Respuesta estructurada creada');
            // 2. Procesar con el agente de memoria
            console.log('Paso 2: Enviando respuesta del modelo al agente de memoria');
            const memoryResponse = await this.memoryAgent.process(modelResponse);
            console.log('Respuesta del agente de memoria recibida');
            // 3. Procesar con el agente de UI
            console.log('Paso 3: Enviando respuesta de memoria al agente de UI');
            const uiResponse = await this.uiAgent.process(memoryResponse);
            console.log('Respuesta del agente de UI recibida');
            return uiResponse;
        }
        catch (error) {
            console.error('Error al procesar mensaje:', error);
            // Notificar error a la UI
            this.uiProvider.sendMessageToWebview({
                type: 'receiveMessage',
                message: `Error al procesar la solicitud: ${error.message || 'Desconocido'}`,
                isUser: false,
                isError: true
            });
            // Devolver respuesta de error
            return {
                message: `Error al procesar la solicitud: ${error.message || 'Desconocido'}`,
                isUser: false,
                isError: true,
                metadata: { error: error.toString() }
            };
        }
    }
    /**
     * Libera los recursos utilizados por el agente orquestrador
     */
    dispose() {
        console.log('Liberando recursos del OrchestratorAgent');
        // Liberar recursos
        this.memoryAgent.dispose();
        this.uiAgent.dispose();
    }
}
exports.OrchestratorAgent = OrchestratorAgent;
//# sourceMappingURL=orchestratorAgent.js.map