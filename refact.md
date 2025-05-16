Lista de Puntos de Simplificación y Refactorización:
A. Eliminación de Redundancia y Consolidación de Responsabilidades:
Unificar Funcionalidad de Sistema de Archivos:
Problema: Duplicación entre src/services/fileSystemService.ts y las tools en src/tools/filesystem/.
Simplificación: Eliminar fileSystemService.ts y usar exclusivamente ToolRunner para operaciones de listado y lectura de archivos. Migrar la lógica más completa de fileSystemService.getWorkspaceFiles a tools/filesystem/getWorkspaceFiles.ts. Mejorar tools/filesystem/getFileContents.ts para usar core.safeReadFile.
Centralizar Inicialización del Esquema de Base de Datos:
Problema: ChatRepository.initializeTables define el esquema para todas las tablas (chats, messages, cache, memory).
Simplificación: Mover la lógica de creación de todas las tablas (CREATE TABLE IF NOT EXISTS) a un método dentro de DatabaseManager.ts, que se llamará después de abrir la conexión.
B. Mejora de la Estructura y Legibilidad del Código (Descomposición):
Descomponer Métodos Largos en ChatService.ts:
Problema: El método sendMessage es extenso y maneja múltiples etapas del procesamiento de un turno.
Simplificación: Extraer lógica en métodos privados más pequeños y cohesivos (ej: _ensureChat, _saveUserMessage, _runPlanningLoop, _saveAssistantMessage, _triggerBackgroundProcessing).
Descomponer Métodos Largos en Orchestrator.ts:
Problema: El método processUserMessage es extenso y maneja el bucle de planificación interno.
Simplificación: Extraer lógica en métodos privados más pequeños (ej: _runInitialAnalysis, _runPlanningIteration, _executePlannerAction, _handleStepResult).
Descomponer Métodos Largos en FileInsightAgent.ts:
Problema: El método processFiles itera sobre archivos y realiza múltiples operaciones (lectura, caché, análisis, fragmentación).
Simplificación: Extraer la lógica de procesamiento de un solo archivo a un método privado.
C. Optimización de la Interacción con el Modelo de Lenguaje (Prompts):
Refinar la Construcción de Variables del Prompt:
Problema: mapContextToBaseVariables y la forma en que buildVariables consumen resolutionContextData pueden llevar a pasar datos excesivos a las plantillas.
Simplificación/Optimización: Hacer que cada función buildVariables sea explícitamente selectiva sobre los datos que extrae del resolutionContextData, construyendo un objeto de variables mínimo para su prompt.
Optimizar el currentFlowState para el Prompt del Planificador:
Problema: El planificador recibe potencialmente todo el resolutionContext como currentFlowState.
Simplificación/Optimización: Modificar buildPlannerVariables para que currentFlowState solo contenga un resumen o una vista filtrada de los resultados de los pasos del turno actual.
Formato Conciso para Datos Estructurados en Prompts:
Problema: Usar JSON.stringify(..., null, 2) para insights, fragmentos, memoria, etc., en prompts es verboso.
Simplificación/Optimización: Usar JSON.stringify(...) sin formato o, idealmente, resúmenes textuales generados por los agentes para estos datos complejos cuando se incluyen en prompts.
Consistencia de Idioma en Plantillas de Prompt:
Problema: explainCodePrompt está en español, otros en inglés.
Simplificación: Estandarizar a un solo idioma (probablemente inglés) o implementar un sistema de gestión de plantillas por idioma si la extensión es multilingüe.
D. Mejoras en la Gestión de Datos y Estado:
Abstraer Lógica Repetida en Repositorios:
Problema: Patrón repetido de parseo JSON y manejo de errores en CacheRepository y MemoryRepository.
Simplificación: Crear una función helper para encapsular esta lógica común.
Persistencia del Estado del ConversationContext (CRÍTICO - aunque pospuesto por ahora):
Problema: El estado enriquecido de ConversationContext (summary, relevantFiles, etc.) no se guarda en la DB.
Simplificación/Funcionalidad: Implementar la persistencia de este estado en la tabla chats. (Lo menciono por completitud, aunque dijiste que no lo configuremos aún).
E. Seguridad y Completitud de Funcionalidades:
Manejo Seguro de API Keys:
Problema: API key de Gemini hardcodeada como fallback en ModelManager.ts.
Simplificación/Seguridad: Usar vscode.SecretStorage.
Implementar Lógica Real para Tools Placeholder:
Problema: applyWorkspaceEdit y searchWorkspace son simuladas.
Simplificación/Funcionalidad: Implementar su lógica real.
F. Mejoras Generales de Código (Menor Prioridad para "Simplificación" pero bueno para "Mantenibilidad"):
Revisar ToolRunner.runTool para Validación de Parámetros:
Problema: La validación actual es un poco verbosa.
Simplificación Potencial: Considerar un enfoque más declarativo o genérico si los patrones de validación son muy comunes, aunque la flexibilidad actual es buena.
Claridad en ToolRunner.runParallel:
Problema: La advertencia sobre la no implementación de concurrencia.
Simplificación: Si la concurrencia no es un requisito, renombrar a runSequential o simplificar la implementación para que sea explícitamente secuencial.