// src/core/ConversationManager.ts
import { WindsurfState, VSCodeContext, HistoryEntry } from '../shared/types';
import { MemoryManager } from '../features/memory/MemoryManager';
import { getConfig } from '../shared/config';
import { IConversationManager } from './interfaces/IConversationManager';

const config = getConfig(process.env.NODE_ENV === 'production' ? 'production' : 'development');

export class ConversationManager implements IConversationManager {
  private activeConversations: Map<string, WindsurfState> = new Map();

  constructor() {
   
  }

  public getOrCreateConversationState(
    chatId: string,
    userMessage: string,
    contextData: Record<string, any> = {},
  ): WindsurfState {
    let state = this.activeConversations.get(chatId);
    const currentTime = Date.now();

    if (state) {
      // Reutilizar y actualizar estado existente
      state.userMessage = userMessage;
      state.objective = `Responder a: ${userMessage.substring(0, 100)}...`;
      state.iterationCount = 0; 
      state.completionStatus = 'in_progress';
      state.error = undefined; 
      state.reasoningResult = undefined;
      state.actionResult = undefined;
      state.reflectionResult = undefined;
      state.correctionResult = undefined;
      state.finalOutput = undefined; 
      state.timestamp = currentTime; 

      const userHistoryEntry: HistoryEntry = {
          phase: 'user_input',
          content: userMessage, 
          timestamp: currentTime,
          iteration: 0, 
          metadata: {
         
            status: 'success',
           
          },
      };
      state.history.push(userHistoryEntry);


      if (contextData.projectContext) state.projectContext = contextData.projectContext;
      if (contextData.editorContext) state.editorContext = contextData.editorContext;

    
      this.activeConversations.set(chatId, state); 
      return state;
    }

 
    const initialUserEntry: HistoryEntry = {
        phase: 'user_input',
        content: userMessage,
        timestamp: currentTime,
        iteration: 0,
        metadata: {
          status: 'success',
        
        },
    };

    const newState: WindsurfState = {
      objective: `Responder a: ${userMessage.substring(0, 100)}...`,
      userMessage: userMessage,
      chatId: chatId,
      iterationCount: 0,
      maxIterations: config.backend.react.maxIterations,
      completionStatus: 'in_progress',
      history: [initialUserEntry],
      projectContext: contextData.projectContext, 
      editorContext: contextData.editorContext, 
  
      timestamp: currentTime,
    };
    this.activeConversations.set(chatId, newState);
   
    return newState;
  }

  public getConversationState(chatId:string): WindsurfState | undefined {
    return this.activeConversations.get(chatId);
  }

  public updateConversationState(chatId: string, state: WindsurfState): void {
   
    state.timestamp = Date.now();
    this.activeConversations.set(chatId, state);
   
  }

  public async endConversation(chatId: string, memoryManager?: MemoryManager): Promise<void> {
    const state = this.activeConversations.get(chatId);
   
  }

  public clearConversation(chatId: string, memoryManager?: MemoryManager): void {
    this.activeConversations.delete(chatId);
    if (memoryManager) {
      memoryManager.clearConversationMemory(chatId); 
    }
    
  }
}