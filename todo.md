¡Excelente! Aquí tienes un plan de implementación por etapas para abordar sistemáticamente cada una de las inconsistencias detectadas.

Este plan está diseñado para minimizar el riesgo, agrupando cambios relacionados y comenzando por las correcciones más sencillas y aisladas.

Plan de Implementación de Correcciones
Etapa 1: Limpieza de Código Redundante y Obsoleto

Objetivo: Eliminar código que no se utiliza o es duplicado. Son cambios de bajo riesgo que mejoran inmediatamente la legibilidad y reducen el mantenimiento.

Archivos Involucrados:

src/features/tools/definitions/filesystem/findFilesByName.ts

src/features/tools/definitions/filesystem/index.ts

src/vscode/webView/core/WebviewProvider.ts

Plan de Acción Detallado:

Eliminar la herramienta de búsqueda duplicada:

En src/features/tools/definitions/filesystem/index.ts:

Elimina la línea import { findFilesByName } from './findFilesByName';.

Elimina findFilesByName del array filesystemToolDefinitions.

Elimina findFilesByName de la exportación final.

Eliminar el archivo:

Borra completamente el archivo src/features/tools/definitions/filesystem/findFilesByName.ts.

Eliminar el método no utilizado en WebviewProvider:

En src/vscode/webView/core/WebviewProvider.ts:

Localiza y elimina por completo el método public async loadFiles(): Promise<void>.

Etapa 2: Estandarización de Contratos de Datos y Formatos

Objetivo: Asegurar que las estructuras de datos (especialmente las salidas de herramientas y los mensajes de la webview) sean consistentes y se adhieran a los tipos definidos.

Archivos Involucrados:

src/features/tools/definitions/terminal/runInTerminal.ts

src/features/tools/toolOutputTypes.ts (para referencia)

src/vscode/webView/formatters/MessageFormatter.ts

src/vscode/webView/adapters/WebviewEventAdapter.ts

Plan de Acción Detallado:

Corregir el tipo de salida de la herramienta runInTerminal:

En src/features/tools/definitions/terminal/runInTerminal.ts:

Importa createToolOutput y RunInTerminalToolOutput de src/features/tools/toolOutputTypes.ts.

Modifica la función execute para que devuelva el tipo ToolResult<RunInTerminalToolOutput>.

Usa createToolOutput para construir la respuesta.

Ejemplo de cambio:

Generated typescript
// Antes:
// return { success: true, data: { message: "...", output: "..." } };

// Después (dentro del bloque try/catch):
const executionTime = Date.now() - startTime; // Necesitarás un startTime al inicio del execute
return {
  success: true,
  data: createToolOutput('runInTerminal', 
    { terminalName: 'default', commandSent: true }, 
    {
      title: `Comando Ejecutado: ${params.command}`,
      summary: `El comando '${params.command}' se ejecutó.`,
      details: (stderr ? `Advertencias:\n${stderr.trim()}\n\n` : '') + `Salida:\n${truncatedOutput}`,
      executionTime,
      success: true
    }
  )
};


Estandarizar los retornos de MessageFormatter:

En src/vscode/webView/formatters/MessageFormatter.ts:

Modifica todos los métodos de formato (formatAgentPhaseStarted, formatSystemError, etc.) para que devuelvan un objeto { content: string; metadata: any } en lugar de un string.

Ejemplo de cambio:

Generated typescript
// Antes:
// public formatAgentPhaseStarted(payload: any): string {
//   return `Iniciando fase: ${payload.phase}`;
// }

// Después:
public formatAgentPhaseStarted(payload: any): { content: string; metadata: any } {
  return {
    content: `Iniciando fase: ${payload.phase}`,
    metadata: { phase: payload.phase, status: 'phase_started' }
  };
}
IGNORE_WHEN_COPYING_START
content_copy
download
Use code with caution.
TypeScript
IGNORE_WHEN_COPYING_END

En src/vscode/webView/adapters/WebviewEventAdapter.ts:

Simplifica el método processEvent y sus sub-métodos. Ahora siempre recibirás un objeto { content, metadata } del formateador.

Ejemplo de cambio:

Generated typescript
// Antes:
// baseMessage.content = this.messageFormatter.formatAgentPhaseStarted(payload);
// baseMessage.metadata = { ... };

// Después:
const formatted = this.messageFormatter.formatAgentPhaseStarted(payload);
baseMessage.content = formatted.content;
baseMessage.metadata = { ...baseMessage.metadata, ...formatted.metadata };
IGNORE_WHEN_COPYING_START
content_copy
download
Use code with caution.
TypeScript
IGNORE_WHEN_COPYING_END
Etapa 3: Refactorización del Núcleo del Agente (Estado y Lógica)

Objetivo: Limpiar la definición del estado del grafo, eliminar conceptos legacy y separar la lógica interna del agente del historial de conversación. Esta es la etapa más crítica.

Archivos Involucrados:

src/core/langgraph/state/GraphState.ts

src/core/langgraph/state/StateFactory.ts

src/core/langgraph/graph/StateAnnotations.ts

src/core/langgraph/nodes/PlannerNode.ts

src/core/langgraph/nodes/ExecutorNode.ts

src/core/langgraph/services/ContextBuilderService.ts

Plan de Acción Detallado:

Unificar null y undefined para currentTask:

En src/core/langgraph/state/GraphState.ts:

Cambia la línea currentTask?: string | null; a currentTask?: string;.

Eliminar Fases del Grafo Obsoletas:

En src/core/langgraph/state/GraphState.ts:

En el enum GraphPhase, elimina las entradas ANALYSIS, EXECUTION y VALIDATION.

En src/core/langgraph/state/StateFactory.ts y src/core/langgraph/graph/StateAnnotations.ts:

En la inicialización de nodeIterations, elimina las claves y valores para las fases obsoletas. Solo deben quedar las fases activas (PLANNER, EXECUTOR, TOOL_RUNNER, RESPONSE, ERROR_HANDLER, etc.).

Mover los "Thoughts" del Agente a debugInfo:

En src/core/langgraph/nodes/PlannerNode.ts:

Elimina la creación de thoughtMessage.

En la sentencia return, elimina la adición del thoughtMessage al array messages.

En su lugar, añade el "thought" al objeto debugInfo.

Ejemplo de cambio:

Generated typescript
// Antes:
// const thoughtMessage = new AIMessage({ content: `Planner Thought: ${planResult.thought}` });
// return { messages: [...state.messages, thoughtMessage], ... };

// Después:
return {
    debugInfo: { ...state.debugInfo, lastPlannerThought: planResult.thought },
    currentPlan: planResult.plan,
    // ... resto del estado
};
IGNORE_WHEN_COPYING_START
content_copy
download
Use code with caution.
TypeScript
IGNORE_WHEN_COPYING_END

En src/core/langgraph/nodes/ExecutorNode.ts:

Aplica el mismo cambio que en PlannerNode, moviendo el "thought" del ejecutor a debugInfo en lugar de a messages.

En src/core/langgraph/services/ContextBuilderService.ts:

En el método formatMessagesForHistory, elimina la condición que filtra los mensajes de "Thought". Ya no es necesaria.

Ejemplo de cambio:

Generated typescript
// Eliminar esta parte del `if (isAIMessage(msg))`
// if (includeSystemThoughts || !/^(Planner|Executor) Thought:/.test(msg.content as string)) {
//   chatHistory.push(`Assistant: ${msg.content}`);
// }

// Simplificar a:
if (isAIMessage(msg)) {
    chatHistory.push(`Assistant: ${msg.content}`);
}
IGNORE_WHEN_COPYING_START
content_copy
download
Use code with caution.
TypeScript
IGNORE_WHEN_COPYING_END
Conclusión del Plan

Al seguir estas tres etapas en orden, se realizarán las correcciones de manera controlada. La Etapa 1 es segura y rápida. La Etapa 2 mejora la robustez del sistema de tipos. La Etapa 3 es la más profunda, pero al realizarla al final, se trabaja sobre una base ya más limpia y estandarizada. Se recomienda realizar pruebas después de cada etapa para asegurar que la funcionalidad principal del asistente no se ha visto afectada.