
Plan de Refactorización: De LangGraph a un Motor Multimodo

Objetivo General: Reemplazar el motor de ejecución monolítico LangGraphEngine por un ExecutionEngine flexible que delegue tareas a diferentes "Modos" (Simple, Planner, Supervised), seleccionados por el usuario. La refactorización debe ser incremental, manteniendo la extensión funcional en cada etapa.

Etapa 0: Preparación y Abstracciones Fundamentales

Objetivo: Introducir las nuevas interfaces y estructuras de datos principales sin alterar el flujo de ejecución actual. Esto sienta las bases para las etapas posteriores y no tiene impacto funcional visible.

Archivos Afectados:

(Nuevo) src/core/execution/ExecutionEngine.ts: Definir la interfaz del nuevo motor.

(Nuevo) src/core/execution/ExecutionState.ts: Definir la nueva estructura de estado unificada.

(Nuevo) src/core/execution/modes/BaseMode.ts: Definir la clase base abstracta para todos los modos.

(Nuevo) src/core/checkpoint/CheckpointManager.ts: Crear una implementación inicial (stub) del gestor de checkpoints.

src/core/ComponentFactory.ts: Modificar para que sea consciente de las nuevas clases, aunque todavía no las instancie para su uso.

Dependencias e Impacto:

Impacto Nulo: Esta etapa solo añade nuevos archivos y tipos. El LangGraphEngine existente seguirá siendo el motor principal.

Dependencia: Es un prerrequisito fundamental para todas las etapas siguientes.

Orden y Justificación:

Primero. Se crea el "esqueleto" de la nueva arquitectura. Al no modificar la lógica existente, el riesgo es mínimo y permite que el resto del equipo comience a familiarizarse con las nuevas estructuras.

Etapa 1: Implementación del "Modo Simple" y Reemplazo del Motor

Objetivo: Reemplazar el LangGraphEngine por el nuevo ExecutionEngine funcionando exclusivamente con un SimpleMode. Este nuevo modo replicará la lógica del LangGraphEngine actual, asegurando que la funcionalidad principal de la extensión no cambie para el usuario final.

Archivos Afectados:

(Nuevo) src/core/execution/modes/SimpleMode.ts: Implementar la lógica de los nodos Analyze, Execute, Validate y Respond como un bucle dentro del método execute() de esta clase.

src/core/execution/ExecutionEngine.ts: Implementar la lógica para instanciar y delegar la ejecución al SimpleMode.

src/core/ApplicationLogicService.ts: (Modificación Mayor) Cambiar la dependencia de LangGraphEngine a ExecutionEngine. La llamada a processUserMessage ahora invocará al nuevo motor.

src/core/ComponentFactory.ts: (Modificación Mayor) Cambiar el método getLangGraphEngine por getExecutionEngine. Se encargará de instanciar el ExecutionEngine con el SimpleMode.

src/core/ConversationManager.ts: Adaptar para que gestione el nuevo ExecutionState en lugar del SimplifiedOptimizedGraphState.

(Deprecación) src/core/langgraph/*: Todos los archivos relacionados con LangGraph (nodos, builder, etc.) ya no serán llamados directamente y pueden ser marcados para su eliminación.

Dependencias e Impacto:

Impacto Alto: Este es el "trasplante de corazón" de la arquitectura. Cambia por completo el flujo de ejecución interno.

Prerrequisito: Requiere la Etapa 0 completada.

Riesgo: El mayor riesgo de la refactorización está aquí. El objetivo es lograr una paridad funcional 1:1 con el sistema anterior. Pruebas exhaustivas son cruciales.

Orden y Justificación:

Segundo. Es vital realizar este cambio fundamental antes de añadir nueva complejidad. Al reemplazar el motor con una versión funcionalmente idéntica, establecemos una nueva base estable sobre la cual construir los modos más avanzados.

Etapa 2: Integración con la Interfaz de Usuario (UI)

Objetivo: Exponer la selección de modo en la interfaz del chat (Webview), permitiendo al usuario elegir el modo de ejecución antes de enviar una consulta. Inicialmente, solo el "Modo Simple" estará disponible y seleccionado por defecto.

Archivos Afectados:

src/vscode/webView/core/WebviewProvider.ts: (Modificación Mayor)

Añadir lógica para enviar los modos disponibles a la UI.

Recibir el modo seleccionado por el usuario junto con el mensaje.

Pasar el modo seleccionado al ApplicationLogicService.

src/core/ApplicationLogicService.ts: Modificar processUserMessage para aceptar el modo y pasárselo al ExecutionEngine.

src/core/execution/ExecutionEngine.ts: Añadir un método setMode(mode) para cambiar el modo de ejecución actual.

(UI) Archivos de la UI en React/Svelte (no provistos, pero se asume su modificación para añadir un selector de modo).

Dependencias e Impacto:

Impacto Medio: Afecta la interacción del usuario y el contrato entre la UI y el backend de la extensión.

Prerrequisito: La Etapa 1 debe estar completada y estable.

Orden y Justificación:

Tercero. Una vez que el backend soporta la arquitectura de modos (aunque solo con una implementación), tiene sentido exponer esta capacidad en la UI. Esto prepara el terreno para cuando se añadan nuevos modos.

Etapa 3: Refactorización del Sistema de Memoria

Objetivo: Reemplazar la implementación actual de MemoryManager (basada en almacenamiento de VS Code y mapas en memoria) por el nuevo sistema segmentado basado en SQLite.

Archivos Afectados:

src/features/memory/MemoryManager.ts: (Reescritura Completa)

Añadir dependencia a una librería de SQLite (ej. sqlite3).

Implementar el esquema de la base de datos.

Reescribir los métodos getRelevantMemories, storePersistent, etc., para que usen consultas SQL segmentadas por modo, como se describe en el plan.

src/core/execution/modes/*: Todos los modos (SimpleMode y futuros) ahora llamarán a memoryManager.getRelevantMemory() y obtendrán resultados filtrados y optimizados para su contexto.

Dependencias e Impacto:

Impacto Alto en el Almacenamiento: Cambia completamente la capa de persistencia de la memoria.

Impacto Bajo en la Lógica de Negocio: Si la interfaz de MemoryManager se mantiene consistente, los modos de ejecución no deberían necesitar grandes cambios, pero su comportamiento mejorará debido a la memoria más relevante.

Prerrequisito: Puede realizarse en paralelo después de la Etapa 1, pero es más seguro hacerlo después de la Etapa 2 para tener una base estable.

Orden y Justificación:

Cuarto. Es una refactorización grande y autocontenida. Realizarla ahora beneficia a todos los modos que se construirán a continuación, ya que podrán aprovechar desde el principio una memoria más potente.

Etapa 4: Implementación del "Modo Planificador" y Checkpoints

Objetivo: Añadir el segundo modo de ejecución, PlannerMode, que incluye planificación detallada y replanificación. Implementar el sistema de checkpoints, ya que es crucial para este modo.

Archivos Afectados:

(Nuevo) src/core/execution/modes/PlannerMode.ts: Implementar la lógica de planificación, ejecución de pasos y replanificación.

src/core/checkpoint/CheckpointManager.ts: Implementar completamente la lógica de creación y restauración de checkpoints.

src/core/ComponentFactory.ts: Actualizar para que pueda instanciar PlannerMode.

src/core/execution/ExecutionEngine.ts: Actualizar para que pueda delegar la ejecución al PlannerMode.

src/vscode/webView/core/WebviewProvider.ts: Actualizar la lista de modos disponibles para la UI.

Dependencias e Impacto:

Impacto Aditivo: Esta etapa añade nueva funcionalidad sin modificar la existente (SimpleMode).

Prerrequisito: Etapas 1, 2 y 3. El PlannerMode se beneficiará enormemente del nuevo sistema de memoria.

Orden y Justificación:

Quinto. Con la arquitectura base y la memoria avanzada en su lugar, estamos listos para añadir modos más complejos. Se agrupan el PlannerMode y los Checkpoints porque su funcionalidad está intrínsecamente ligada.

Etapa 5: Implementación del "Modo No Supervisado"

Objetivo: Añadir el SupervisedMode, el más autónomo, que incluye validación de planes con el usuario y mecanismos de escalación.

Archivos Afectados:

(Nuevo) src/core/execution/modes/SupervisedMode.ts: Implementar la lógica de plan colaborativo, ejecución autónoma y escalación al usuario.

src/core/ComponentFactory.ts: Actualizar para instanciar SupervisedMode.

src/core/execution/ExecutionEngine.ts: Actualizar para delegar al SupervisedMode.

src/vscode/webView/core/WebviewProvider.ts: Añadir el nuevo modo a la UI y manejar las interacciones de escalación (ej. mostrar una pregunta de confirmación al usuario).

Dependencias e Impacto:

Impacto Aditivo y en UI: Añade el último modo y requiere nuevas capacidades de interacción en la UI.

Prerrequisito: Todas las etapas anteriores.

Orden y Justificación:

Sexto. Es el modo más complejo y se basa en todos los componentes desarrollados previamente (motor, memoria, checkpoints). Se implementa al final, cuando la arquitectura es más madura.

Etapa 6: Finalización, Limpieza y Métricas

Objetivo: Eliminar el código obsoleto, añadir componentes finales como RiskAssessment y asegurar que las métricas de rendimiento se recopilan correctamente.

Archivos Afectados:

(Eliminación) src/core/langgraph/*: Eliminar de forma segura todos los archivos del antiguo motor LangGraph.

(Nuevo) src/core/analysis/RiskAssessment.ts: Añadir el componente informativo de análisis de riesgo.

src/core/monitoring/PerformanceMonitor.ts: Asegurarse de que las métricas se registran con el contexto del modo de ejecución.

Revisión general de todo el código para asegurar consistencia.

Dependencias e Impacto:

Impacto Bajo: Principalmente limpieza y mejoras de calidad.

Prerrequisito: Todas las etapas funcionales deben estar completas.

Orden y Justificación:

Último. La limpieza de código muerto y el pulido final se realizan cuando la nueva arquitectura está completamente implementada y validada.