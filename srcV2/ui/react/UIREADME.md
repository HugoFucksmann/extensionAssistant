# Documentación del Frontend - Extension Assistant

Este documento describe la arquitectura y componentes principales del frontend de la extensión Assistant para VS Code.

## Arquitectura General

El frontend está construido con React y sigue una arquitectura basada en componentes con hooks personalizados y un contexto central. La aplicación se comunica con el backend (la extensión de VS Code) a través de un servicio dedicado.

### Estructura de Carpetas

```
src/ui/
├── Components/        # Componentes de UI reutilizables
├── context/           # Contexto de React para estado global
├── historical/        # Componentes relacionados con el historial de chats
├── hooks/             # Hooks personalizados para lógica reutilizable
├── services/          # Servicios para comunicación con el backend
├── webview.jsx        # Punto de entrada principal de la UI
└── UIREADME.md        # Esta documentación
```

## Componentes Principales

### AppContext

El `AppContext` (`src/ui/context/AppContext.jsx`) es el corazón de la aplicación. Proporciona un estado global y funciones compartidas a todos los componentes. Utiliza hooks personalizados para manejar diferentes aspectos de la aplicación:

- Estado de carga (`useLoading`)
- Gestión de mensajes (`useMessages`)
- Archivos del proyecto (`useProjectFiles`)

Este contexto centraliza la comunicación con el backend y coordina el estado de la aplicación.

### Hooks Personalizados

La aplicación utiliza varios hooks personalizados para encapsular lógica reutilizable:

#### useBackend

`useBackend` proporciona una interfaz para comunicarse con el backend desde cualquier componente. Ofrece métodos como:

- `sendMessage`: Enviar mensajes al chat
- `selectModel`: Seleccionar un modelo de IA
- `getState`/`setState`: Acceder al estado persistente

#### useLoading

Maneja los estados de carga y inicialización de la aplicación mediante un reducer.

#### useMessages

Gestiona la colección de mensajes del chat, incluyendo:

- Agregar nuevos mensajes
- Limpiar la conversación
- Normalizar el formato de los mensajes

#### useProjectFiles

Se encarga de obtener y mantener la lista de archivos del proyecto actual.

#### useTextareaResize

Utilitario para manejar el redimensionamiento automático de áreas de texto en la interfaz.

## Comunicación con el Backend

La comunicación con el backend se realiza a través del `BackendService` (`src/ui/services/BackendService.js`). Este servicio:

1. Establece un canal de comunicación con la extensión de VS Code
2. Proporciona métodos para enviar acciones al backend
3. Implementa un sistema de eventos para recibir respuestas
4. Maneja el estado persistente entre sesiones

### Acciones Disponibles

```javascript
export const ACTIONS = {
  SEND_MESSAGE: 'sendMessage',
  SELECT_MODEL: 'selectModel',
  LOAD_CHAT: 'loadChat',
  LOAD_HISTORY: 'loadHistory',
  CLEAR_CONVERSATION: 'clearConversation',
  GET_PROJECT_FILES: 'getProjectFiles'
};
```

## Flujo de Datos

1. **Entrada del Usuario**: El usuario interactúa con componentes como `ChatInput`
2. **Procesamiento**: Los eventos se manejan a través de callbacks en el contexto
3. **Comunicación**: Las acciones se envían al backend a través de `BackendService`
4. **Respuesta**: El backend responde con eventos que son capturados por los listeners
5. **Actualización de UI**: El estado se actualiza y los componentes se renderizan

## Buenas Prácticas Implementadas

1. **Separación de Responsabilidades**: Cada hook y componente tiene una responsabilidad específica
2. **Reutilización de Código**: Los hooks personalizados encapsulan lógica reutilizable
3. **Estado Centralizado**: El contexto proporciona un punto único de acceso al estado global
4. **Comunicación Desacoplada**: El servicio de backend abstrae la comunicación con VS Code
5. **Manejo Eficiente de Efectos**: Uso adecuado de `useEffect` y limpieza de recursos

## Cómo Extender

### Agregar un Nuevo Hook

1. Crear un nuevo archivo en `src/ui/hooks/`
2. Implementar el hook siguiendo el patrón de los existentes
3. Importarlo y utilizarlo en el `AppContext` o en componentes individuales

### Agregar un Nuevo Componente

1. Crear un nuevo archivo en `src/ui/Components/`
2. Utilizar `useAppContext()` para acceder al estado global
3. Utilizar hooks personalizados según sea necesario

### Agregar una Nueva Acción

1. Agregar la acción en `ACTIONS` en `BackendService.js`
2. Implementar el manejo de la acción en el backend
3. Crear métodos en `useBackend` para facilitar su uso

## Ejemplo de Uso

```jsx
import React from 'react';
import { useAppContext } from '../context/AppContext';
import useBackend from '../hooks/useBackend';

function MiComponente() {
  const { messages, isLoading } = useAppContext();
  const { sendMessage } = useBackend();
  
  const handleSend = () => {
    sendMessage('Hola mundo');
  };
  
  return (
    <div>
      {isLoading ? 'Cargando...' : 'Listo'}
      <button onClick={handleSend}>Enviar</button>
      <ul>
        {messages.map((msg, i) => (
          <li key={i}>{msg.text}</li>
        ))}
      </ul>
    </div>
  );
}
```
