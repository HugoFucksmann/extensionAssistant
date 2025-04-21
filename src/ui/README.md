# Arquitectura de Comunicación Frontend-Backend

Este documento describe la arquitectura de comunicación entre el frontend (React) y el backend (extensión de VS Code) en la aplicación.

## Estructura General

La comunicación con el backend está centralizada a través de un servicio único (`BackendService`) que maneja todos los mensajes enviados y recibidos.

### Archivos Principales

- `services/BackendService.js`: Servicio centralizado para la comunicación con el backend.
- `hooks/useBackend.jsx`: Hook para acceder al servicio desde cualquier componente.
- `context/AppContext.jsx`: Proporciona el servicio y el estado global a toda la aplicación.

## Flujo de Comunicación

1. **Envío de Mensajes al Backend**:
   - Los componentes utilizan el hook `useBackend` para enviar mensajes al backend.
   - El método `sendToBackend(action, payload)` permite enviar cualquier tipo de acción con cualquier payload.

2. **Recepción de Mensajes del Backend**:
   - El `BackendService` configura un listener global para los mensajes del backend.
   - Los componentes pueden registrar callbacks para tipos específicos de mensajes usando `onBackendMessage(type, callback)`.

## Tipos de Acciones

Las acciones están definidas como constantes en `ACTIONS` para evitar errores tipográficos:

```javascript
export const ACTIONS = {
  SEND_MESSAGE: 'sendMessage',
  SELECT_MODEL: 'selectModel',
  LOAD_CHAT: 'loadChat',
  LOAD_HISTORY: 'loadHistory',
  CLEAR_CONVERSATION: 'clearConversation'
};
```

## Ejemplo de Uso

### Enviar un Mensaje

```javascript
import { useBackend } from '../hooks/useBackend';
import { ACTIONS } from '../services/BackendService';

const MyComponent = () => {
  const { sendToBackend } = useBackend();
  
  const handleSendMessage = () => {
    sendToBackend(ACTIONS.SEND_MESSAGE, {
      message: 'Hola mundo',
      selectedFiles: [],
      model: 'ollama'
    });
  };
  
  return <button onClick={handleSendMessage}>Enviar</button>;
};
```

### Escuchar Mensajes del Backend

```javascript
import { useEffect } from 'react';
import { useBackend } from '../hooks/useBackend';

const MyComponent = () => {
  const { onBackendMessage } = useBackend();
  
  useEffect(() => {
    // Registrar un listener para mensajes de tipo 'modelResponse'
    const unsubscribe = onBackendMessage('modelResponse', (message) => {
      console.log('Respuesta recibida:', message);
    });
    
    // Limpiar el listener cuando el componente se desmonte
    return unsubscribe;
  }, [onBackendMessage]);
  
  return <div>Mi Componente</div>;
};
```

## Persistencia de Estado

El servicio también proporciona métodos para persistir y recuperar estado:

```javascript
const { setState, getState } = useBackend();

// Guardar estado
setState({ model: 'ollama' });

// Recuperar estado
const state = getState();
console.log(state.model); // 'ollama'
```

## Ventajas de esta Arquitectura

1. **Centralización**: Toda la comunicación con el backend está en un solo lugar.
2. **Simplicidad**: Una interfaz simple y consistente para todos los componentes.
3. **Mantenibilidad**: Fácil de extender con nuevos tipos de mensajes.
4. **Desacoplamiento**: Los componentes no necesitan conocer los detalles de la comunicación.
