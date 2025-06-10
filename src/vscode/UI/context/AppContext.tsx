// src/vscode/react/context/AppContext.tsx - Enhanced with Execution Mode Support

import '../../webView/types/VSCodeContext';
import React, { createContext, useContext, useReducer } from 'react';

// Import modular components
import { AppState, AppContextType } from './types';
import { appReducer } from './appReducer';
import { createAppActions } from './appActions';
import { useAppEffects } from './useAppEffects';
import { DEFAULT_LOADING_TEXT, initialIsDarkMode } from './constants';

// @ts-ignore
import { getTheme } from '../theme/theme.js';

const initialState: AppState = {
  messages: [],
  chatList: [],
  currentChatId: null,
  isLoading: false,
  showHistory: false,
  currentModel: 'gemini',
  isDarkMode: initialIsDarkMode,
  theme: getTheme(initialIsDarkMode),
  testModeEnabled: false,
  activeFeedbackOperationId: null,
  loadingText: DEFAULT_LOADING_TEXT,
  // New execution mode properties
  currentExecutionMode: 'simple',
  availableExecutionModes: [
    {
      id: 'simple',
      name: 'Simple',
      description: 'Ejecución directa paso a paso - rápida y eficiente',
      enabled: true
    },
    {
      id: 'planner',
      name: 'Planificador',
      description: 'Planificación detallada con replanificación automática',
      enabled: true
    },
    {
      id: 'supervised',
      name: 'No Supervisado',
      description: 'Ejecución autónoma con plan validado',
      enabled: true
    }
  ]
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
};

export const AppProvider = ({ children }: { children: React.ReactNode }) => {
  const [state, dispatch] = useReducer(appReducer, initialState);

  const postMessageToBackend = React.useCallback((type: string, payload?: any) => {
    (window as any).vscode?.postMessage({ type, payload });
  }, []);

  // Use custom hook for effects
  useAppEffects(state, dispatch, postMessageToBackend);

  // Create actions using factory function - memoize to prevent re-creation
  const actions = React.useMemo(() => 
    createAppActions(postMessageToBackend, dispatch), 
    [postMessageToBackend]
  );

  // Wrapper functions that use state for additional logic
  const setShowHistory = React.useCallback((show: boolean) => {
    actions.setShowHistory(show, state.chatList.length);
  }, [actions, state.chatList.length]);

  // New execution mode action
  const switchExecutionMode = React.useCallback((mode: 'simple' | 'planner' | 'supervised') => {
    const modeConfig = state.availableExecutionModes.find(m => m.id === mode);
    
    if (!modeConfig) {
      console.error(`Unknown execution mode: ${mode}`);
      return;
    }
    
    if (!modeConfig.enabled) {
      console.warn(`Execution mode '${mode}' is not yet available`);
      return;
    }

    dispatch({ type: 'SET_EXECUTION_MODE', payload: mode });
    postMessageToBackend('switchExecutionMode', { mode });
  }, [state.availableExecutionModes, postMessageToBackend]);

  return (
    <AppContext.Provider value={{
      ...state,
      postMessage: postMessageToBackend,
      sendMessage: actions.sendMessage,
      newChat: actions.newChat,
      setShowHistory,
      loadChat: actions.loadChat,
      switchModel: actions.switchModel,
      toggleDarkMode: actions.toggleDarkMode,
      switchExecutionMode,
    }}>
      {children}
    </AppContext.Provider>
  );
};