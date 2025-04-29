/**
 * useBackend.jsx
 * Hook para acceder al servicio de backend desde cualquier componente
 */

import { useAppContext } from '../context/AppContext';
import { ACTIONS } from '../services/BackendService';

const useBackend = () => {
  const context = useAppContext();
  const { backendService } = context;
  
  // Si backendService no está disponible, proporcionar funciones vacías
  if (!backendService) {
    console.warn('BackendService no está disponible en el contexto');
    return {
      sendToBackend: () => {},
      sendMessage: () => {},
      selectModel: () => {},
      onBackendMessage: () => () => {},
      getState: () => ({}),
      setState: () => {}
    };
  }
  
  return {
    // Enviar cualquier acción al backend
    sendToBackend: (action, payload = {}) => {
      backendService.send(action, payload);
    },
    
    // Enviar un mensaje al chat
    sendMessage: (message, selectedFiles = [], model = 'ollama') => {
      backendService.send(ACTIONS.SEND_MESSAGE, {
        message,
        selectedFiles,
        model
      });
    },
    
    // Seleccionar un modelo
    selectModel: (modelName) => {
      backendService.setState({ model: modelName });
    },
    
    // Registrar un listener para un tipo de mensaje
    onBackendMessage: (messageType, callback) => {
      return backendService.on(messageType, callback);
    },
    
    // Obtener el estado persistente
    getState: () => backendService.getState(),
    
    // Actualizar el estado persistente
    setState: (state) => backendService.setState(state)
  };
};

export default useBackend;
