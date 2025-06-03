# Extension Assistant

Una extensión de VS Code que proporciona un asistente de IA para ayudarte con tus tareas de programación, con un enfoque en la optimización de flujo de trabajo y la integración con herramientas de desarrollo.

## Características

- 🤖 Chat de IA integrado en la barra lateral de VS Code
- 📱 Interfaz de usuario moderna y responsiva basada en React
- 🧠 Soporte para múltiples modelos de IA (Ollama y Google Gemini)
- 🛠️ Sistema de herramientas integrado:
  - Operaciones de sistema de archivos
  - Integración con Git
  - Ejecución de comandos en terminal
  - Análisis de código y diagnósticos
- 📊 Sistema de eventos centralizado para comunicación entre componentes
- 📱 Gestión de estado centralizada para el webview
- 🔍 Sistema de validación de herramientas y parámetros
- 📊 Sistema de registro y seguimiento de operaciones

## Componentes Principales

- `ApplicationLogicService`: Orquesta la lógica principal del asistente
- `OptimizedReActEngine`: Motor de ejecución optimizado para el flujo ReAct
- `ToolRegistry`: Registro centralizado de herramientas disponibles
- `ConversationManager`: Gestiona el estado y el historial de conversaciones
- `LongTermStorage`: Manejo persistente del estado de la aplicación

## Cómo usar

1. Abre la barra lateral de VS Code y haz clic en el icono de chat
2. Escribe tu pregunta o solicitud en el campo de texto
3. Recibe respuestas del asistente de IA
4. Utiliza las herramientas integradas para operaciones de desarrollo

## Desarrollo

Para ejecutar esta extensión en modo de desarrollo:

1. Clona este repositorio
2. Ejecuta `npm install` para instalar las dependencias
3. Ejecuta `npm run build` para compilar la extensión
4. Presiona F5 para iniciar una nueva ventana de VS Code con la extensión cargada

## Comandos

- `extensionAssistant.openChat`: Abre la vista de chat
- `extensionAssistant.sendTestMessage`: Envía un mensaje de prueba al chat
- `extensionAssistant.selectModel`: Cambia el modelo de IA activo
- `extensionAssistant.clearChat`: Limpia la conversación actual

## Estructura del Proyecto

```
src/
├── core/              # Lógica central de la aplicación
├── features/          # Funcionalidades específicas
│   ├── ai/           # Componentes de IA
│   ├── memory/       # Manejo de memoria y estado
│   ├── tools/        # Sistema de herramientas
│   └── events/       # Sistema de eventos
├── vscode/           # Integración con VS Code
└── shared/           # Utilidades compartidas
```

## Contribuir

1. Crea una rama para tu feature: `git checkout -b feature/TuFeature`
2. Commit tus cambios: `git commit -m 'Añadir tu feature'`
3. Push a la rama: `git push origin feature/TuFeature`
4. Abre un Pull Request

## Licencia

MIT
