"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommandManager = void 0;
const baseAPI_1 = require("../models/baseAPI");
/**
 * CommandManager es responsable de ejecutar los comandos de la aplicación
 * Centraliza la lógica de comandos y desacopla el orquestador de los detalles de implementación
 */
class CommandManager {
    constructor(memoryAgent, orchestratorAgent, uiProvider) {
        this.memoryAgent = memoryAgent;
        this.orchestratorAgent = orchestratorAgent;
        this.uiProvider = uiProvider;
        this.currentModelType = 'gemini';
        // Inicializar BaseAPI con el modelo predeterminado
        this.modelAPI = new baseAPI_1.BaseAPI(this.currentModelType);
        // Pasar la instancia de BaseAPI al orchestratorAgent
        this.orchestratorAgent.setModelAPI(this.modelAPI);
    }
    /**
     * Ejecuta un comando
     * @param commandType El tipo de comando a ejecutar
     * @param payload Los datos asociados al comando
     * @returns El resultado de la ejecución del comando
     */
    async executeCommand(commandType, payload) {
        console.log(`CommandManager ejecutando comando: ${commandType}`, payload);
        try {
            switch (commandType) {
                case 'createNewChat':
                    return await this.createNewChat();
                case 'loadChat':
                    return await this.loadChat(payload?.chatId);
                case 'setModel':
                    return this.setModel(payload?.modelType);
                default:
                    return {
                        success: false,
                        error: `Comando desconocido: ${commandType}`
                    };
            }
        }
        catch (error) {
            console.error(`Error al ejecutar comando ${commandType}:`, error);
            return {
                success: false,
                error: error.message || 'Error desconocido'
            };
        }
    }
    /**
     * Crea un nuevo chat
     */
    async createNewChat() {
        try {
            await this.memoryAgent.createNewChat((response) => this.uiProvider.sendMessageToWebview(response));
            return {
                success: true
            };
        }
        catch (error) {
            return {
                success: false,
                error: `Error al crear nuevo chat: ${error.message}`
            };
        }
    }
    /**
     * Carga un chat existente
     * @param chatId ID del chat a cargar
     */
    async loadChat(chatId) {
        if (!chatId) {
            return {
                success: false,
                error: 'Se requiere chatId para cargar un chat'
            };
        }
        try {
            const chat = await this.memoryAgent.loadChat(chatId);
            return {
                success: true,
                data: chat
            };
        }
        catch (error) {
            return {
                success: false,
                error: `Error al cargar chat: ${error.message}`
            };
        }
    }
    /**
     * Cambia el modelo de lenguaje
     * @param modelType Tipo de modelo a utilizar
     */
    setModel(modelType) {
        console.log(`CommandManager.setModel llamado con modelType: ${modelType}`);
        if (!modelType) {
            console.error('CommandManager.setModel: Se requiere modelType para cambiar el modelo');
            return {
                success: false,
                error: 'Se requiere modelType para cambiar el modelo'
            };
        }
        try {
            console.log(`CommandManager: Modelo actual antes del cambio: ${this.currentModelType}`);
            // Cambiar el modelo directamente en BaseAPI
            this.modelAPI.setModel(modelType);
            // Actualizar el tipo de modelo actual
            this.currentModelType = modelType;
            console.log(`CommandManager: Modelo cambiado a: ${this.currentModelType}`);
            // Notificar a la UI del cambio de modelo
            this.uiProvider.sendMessageToWebview({
                type: 'modelChanged',
                modelType
            });
            console.log(`CommandManager: Notificación enviada a la UI sobre cambio de modelo a: ${modelType}`);
            return {
                success: true,
                data: { modelType }
            };
        }
        catch (error) {
            console.error(`CommandManager: Error al cambiar modelo:`, error);
            return {
                success: false,
                error: `Error al cambiar modelo: ${error.message}`
            };
        }
    }
    /**
     * Obtiene el tipo de modelo actual
     * @returns El tipo de modelo actual
     */
    getCurrentModel() {
        return this.currentModelType;
    }
    /**
     * Obtiene la instancia de BaseAPI
     * @returns La instancia de BaseAPI
     */
    getModelAPI() {
        return this.modelAPI;
    }
}
exports.CommandManager = CommandManager;
//# sourceMappingURL=commandManager.js.map