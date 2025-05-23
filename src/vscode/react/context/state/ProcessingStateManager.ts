// src/ui/state/ProcessingStateManager.ts
import { ProcessingStatus, ToolExecution } from '@shared/types';

export type ProcessingAction = 
  | { type: 'SET_STATUS'; payload: ProcessingStatus }
  | { type: 'RESET_STATUS' }
  | { type: 'UPDATE_TOOL'; payload: { tool: string; status: 'started' | 'completed' | 'error'; data?: any } }
  | { type: 'SET_PHASE'; payload: string }
  | { type: 'SET_ERROR'; payload: string };

export const initialProcessingState: ProcessingStatus = {
  phase: '',
  status: 'inactive',
  tools: []
};

export const processingReducer = (state: ProcessingStatus, action: ProcessingAction): ProcessingStatus => {
  switch (action.type) {
    case 'SET_STATUS':
      return action.payload;
    
    case 'RESET_STATUS':
      return initialProcessingState;
    
    case 'UPDATE_TOOL':
      const { tool, status, data } = action.payload;
      const toolIndex = state.tools.findIndex(t => t.name === tool && t.status === 'started');
      const updatedTools = [...state.tools];
      
      if (toolIndex >= 0) {
        updatedTools[toolIndex] = {
          ...updatedTools[toolIndex],
          status,
          ...(status === 'completed' && { 
            endTime: Date.now(), 
            result: data?.result 
          }),
          ...(status === 'error' && { 
            endTime: Date.now(), 
            error: data?.error 
          })
        };
      } else if (status === 'started') {
        updatedTools.push({
          name: tool,
          status: 'started',
          startTime: Date.now(),
          parameters: data?.parameters,
          result: undefined,
          error: undefined,
          endTime: undefined
        });
      }
      
      return {
        ...state,
        tools: updatedTools,
        status: 'active'
      };
    
    case 'SET_PHASE':
      return { ...state, phase: action.payload };
    
    case 'SET_ERROR':
      return { 
        ...state, 
        status: 'error', 
        phase: 'error',
        error: action.payload 
      };
    
    default:
      return state;
  }
};