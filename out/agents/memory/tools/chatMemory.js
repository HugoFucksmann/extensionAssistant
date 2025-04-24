"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatMemory = void 0;
/**
 * Herramienta para gestionar la memoria de chats
 */
class ChatMemory {
    constructor(storage) {
        this.storage = storage;
    }
    /**
     * Guarda un chat en la base de datos
     * @param chatId ID del chat
     * @param chat Objeto de chat a guardar
     */
    async saveChat(chatId, chat) {
        try {
            await this.storage.storeChatMemory(chatId, 'chat_data', JSON.stringify(chat));
            console.log('Chat guardado correctamente:', chatId);
        }
        catch (error) {
            console.error('Error al guardar el chat:', error);
            throw error;
        }
    }
    /**
     * Carga un chat desde la base de datos
     * @param chatId ID del chat a cargar
     * @returns El chat cargado o null si no existe
     */
    async loadChat(chatId) {
        try {
            const chatData = await this.storage.getChatMemory(chatId, 'chat_data');
            if (chatData && chatData.content) {
                return JSON.parse(chatData.content);
            }
            return null;
        }
        catch (error) {
            console.error('Error al cargar el chat:', error);
            return null;
        }
    }
    /**
     * Actualiza la lista de chats
     * @param newChat El nuevo chat a añadir a la lista
     * @returns La lista actualizada de chats
     */
    async updateChatList(newChat) {
        try {
            // Obtener la lista actual de chats
            const chatList = await this.getChatList();
            // Crear una versión simplificada del chat para la lista
            const chatSummary = {
                id: newChat.id,
                title: newChat.title,
                timestamp: newChat.timestamp,
                preview: newChat.preview
            };
            // Comprobar si este chat ya existe en la lista
            const existingIndex = chatList.findIndex((chat) => chat.id === chatSummary.id);
            if (existingIndex >= 0) {
                // Actualizar chat existente
                chatList[existingIndex] = chatSummary;
            }
            else {
                // Añadir nuevo chat
                chatList.push(chatSummary);
            }
            // Guardar la lista actualizada
            await this.storage.storeChatMemory('global', 'chat_list', JSON.stringify(chatList));
            return chatList;
        }
        catch (error) {
            console.error('Error al actualizar la lista de chats:', error);
            return [];
        }
    }
    /**
     * Obtiene la lista de todos los chats
     * @returns La lista de chats
     */
    async getChatList() {
        try {
            const chatListData = await this.storage.getChatMemory('global', 'chat_list');
            if (chatListData && chatListData.content) {
                return JSON.parse(chatListData.content);
            }
            return [];
        }
        catch (error) {
            console.error('Error al obtener la lista de chats:', error);
            return [];
        }
    }
    /**
     * Genera un ID único para un nuevo chat
     * @returns ID único para el chat
     */
    generateChatId() {
        return `chat_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    }
}
exports.ChatMemory = ChatMemory;
//# sourceMappingURL=chatMemory.js.map