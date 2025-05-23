// src/ui/state/ChatStateManager.ts
import { ChatMessage, Chat } from '@shared/types'; // Ajusta la ruta

export type ChatStateType = {
  messages: ChatMessage[];
  chatList: Chat[]; // Lista de chats para el historial
  currentChatId: string | null;
  isLoading: boolean;
  showHistory: boolean; // Para alternar la vista de historial
};

export type ChatAction =
  | { type: 'SET_MESSAGES'; payload: ChatMessage[] }
  | { type: 'ADD_MESSAGE'; payload: ChatMessage }
  | { type: 'CLEAR_MESSAGES' } // Limpia mensajes del chat actual
  | { type: 'SET_CHAT_LIST'; payload: Chat[] }
  | { type: 'SET_CURRENT_CHAT_ID'; payload: string | null }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_SHOW_HISTORY'; payload: boolean }
  | { 
      type: 'SET_ACTIVE_CHAT'; 
      payload: { 
        chatId: string; 
        messages: ChatMessage[];
        isNew?: boolean; // Opcional: indica si es un chat nuevo o cargado
      } 
    }

export const initialChatState: ChatStateType = {
  messages: [],
  chatList: [],
  currentChatId: null,
  isLoading: false,
  showHistory: false,
};

export const chatReducer = (state: ChatStateType, action: ChatAction): ChatStateType => {
  switch (action.type) {
    case 'SET_MESSAGES':
      return { ...state, messages: action.payload };

    case 'ADD_MESSAGE':
      // Evitar duplicados por ID si el backend reenvía algo inesperadamente
      if (state.messages.some(m => m.id === action.payload.id)) {
        return state;
      }
      return { ...state, messages: [...state.messages, action.payload] };

    case 'CLEAR_MESSAGES': // Limpia mensajes del chat actual, no cambia el ID
      return { ...state, messages: [], isLoading: false };

    case 'SET_CHAT_LIST':
      return { ...state, chatList: action.payload };

    case 'SET_CURRENT_CHAT_ID':
      if (state.currentChatId === action.payload) return state; // No cambio si es el mismo
      // Si el payload es null, limpiamos el estado del chat
      if (action.payload === null) {
        return { 
          ...state, 
          currentChatId: null, 
          messages: [], 
          isLoading: false, 
          showHistory: false 
        };
      }
      // Para compatibilidad con código existente que solo quiere cambiar el ID
      return { ...state, currentChatId: action.payload };

    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };

    case 'SET_SHOW_HISTORY':
      return { ...state, showHistory: action.payload };

    case 'SET_ACTIVE_CHAT':
      return {
        ...state,
        currentChatId: action.payload.chatId,
        messages: action.payload.messages,
        isLoading: false,
        showHistory: false,
      };


    default:
      return state;
  }
};