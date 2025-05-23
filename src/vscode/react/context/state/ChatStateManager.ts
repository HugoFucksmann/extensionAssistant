// src/ui/state/ChatStateManager.ts
import { ChatMessage, Chat } from '@shared/types';

export type ChatStateType = {
  messages: ChatMessage[];
  chatList: Chat[];
  currentChatId: string | null;
  isLoading: boolean;
  showHistory: boolean;
};

export type ChatAction = 
  | { type: 'SET_MESSAGES'; payload: ChatMessage[] }
  | { type: 'ADD_MESSAGE'; payload: ChatMessage }
  | { type: 'CLEAR_MESSAGES' }
  | { type: 'SET_CHAT_LIST'; payload: Chat[] }
  | { type: 'SET_CURRENT_CHAT_ID'; payload: string | null }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_SHOW_HISTORY'; payload: boolean }
  | { type: 'LOAD_CHAT'; payload: { chatId: string; messages: ChatMessage[] } }
  | { type: 'NEW_CHAT'; payload?: { chatId?: string } };

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
      // Avoid duplicates
      if (state.messages.some(m => 
        m.id === action.payload.id || 
        (m.content === action.payload.content && 
         m.sender === action.payload.sender && 
         Math.abs((m.timestamp || 0) - (action.payload.timestamp || 0)) < 1000)
      )) {
        return state;
      }
      return { ...state, messages: [...state.messages, action.payload] };
    
    case 'CLEAR_MESSAGES':
      return { ...state, messages: [], isLoading: false };
    
    case 'SET_CHAT_LIST':
      return { ...state, chatList: action.payload };
    
    case 'SET_CURRENT_CHAT_ID':
      return { ...state, currentChatId: action.payload };
    
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    
    case 'SET_SHOW_HISTORY':
      return { ...state, showHistory: action.payload };
    
    case 'LOAD_CHAT':
      return {
        ...state,
        messages: action.payload.messages,
        currentChatId: action.payload.chatId,
        showHistory: false,
        isLoading: false,
      };
    
    case 'NEW_CHAT':
      return {
        ...state,
        messages: [],
        currentChatId: action.payload?.chatId || null,
        isLoading: false,
        showHistory: false,
      };
    
    default:
      return state;
  }
};