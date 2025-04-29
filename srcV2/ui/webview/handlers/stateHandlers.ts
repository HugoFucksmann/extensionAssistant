import { UIStateContext } from '../../../core/context/uiStateContext';

/**
 * Interfaces para los tipos de datos manejados en el estado
 */
interface ChatMessage {
  id: string;
  content: string;
  role: 'user' | 'assistant' | 'system';
  timestamp: number;
}

interface Chat {
  id: string;
  title: string;
  lastMessage?: string;
  timestamp: number;
}

/**
 * Tipo para la función que envía mensajes al webview
 */
export type MessageSender = (message: any) => void;

/**
 * Configura las suscripciones a cambios de estado para comunicación con el webview
 */
export function setupStateListeners(
  uiStateContext: UIStateContext,
  sendMessageToWebview: MessageSender
): (() => void)[] {
  const unsubscribers: (() => void)[] = [];
  
  // Suscribirse a cambios en los mensajes
  unsubscribers.push(
    uiStateContext.subscribe('messages', (messages: ChatMessage[]) => {
      sendMessageToWebview({
        type: 'chatLoaded',
        chat: {
          id: uiStateContext.getState('currentChatId'),
          messages
        },
        messagesLoaded: true
      });
    })
  );
  
  // Suscribirse a cambios en la lista de chats
  unsubscribers.push(
    uiStateContext.subscribe('chatList', (chatList: Chat[]) => {
      sendMessageToWebview({
        type: 'historyLoaded',
        history: chatList
      });
    })
  );
  
  // Suscribirse a cambios en el modelo
  unsubscribers.push(
    uiStateContext.subscribe('modelType', (modelType: 'ollama' | 'gemini') => {
      sendMessageToWebview({
        type: 'modelChanged',
        modelType
      });
    })
  );
  
  // Suscribirse a cambios en el estado de procesamiento
  unsubscribers.push(
    uiStateContext.subscribe('isProcessing', (isProcessing: boolean) => {
      sendMessageToWebview({
        type: 'processingStatus',
        isProcessing
      });
    })
  );
  
  // Suscribirse a errores
  unsubscribers.push(
    uiStateContext.subscribe('error', (message: string | null) => {
      sendMessageToWebview({
        type: 'error',
        message: message || 'Error desconocido'
      });
    })
  );
  
  return unsubscribers;
}