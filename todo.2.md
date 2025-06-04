¡Excelente pregunta! Mover parte de la lógica de presentación del ToolOutput del backend a la UI (el frontend de la webview) es una muy buena idea para mejorar la separación de concerns y dar más flexibilidad a la UI.

Actualmente, el backend (específicamente toolResponseMapper.ts) hace un esfuerzo considerable para formatear una respuesta "bonita" y resumida (ToolOutput) a partir del ToolResult crudo de la herramienta.

Lógica que se puede mover del Backend (toolResponseMapper.ts) a la UI:

Generación de title:

Backend Actual: title: \Error en ${toolName}`otitle: `Resultado de ${toolName}``.

UI Potencial: La UI recibe el toolName y el estado de success. Puede construir este título fácilmente.

Generación de summary (especialmente la lógica genérica):

Backend Actual: Intenta extraer un resumen de result.data.message, result.data.summary, cuenta elementos si result.data es un array, o toma el primer valor si es un objeto simple.

UI Potencial: La UI recibe result.data (que llamaremos rawData en la UI). Puede inspeccionar este rawData y decidir cómo generar un resumen. Por ejemplo:

Si rawData es un string, mostrar los primeros N caracteres.

Si rawData es un array, mostrar "Se procesaron X elementos."

Si rawData es un objeto con una propiedad message o summary, usarla.

Si es un error, mostrar el mensaje de error.

Generación de details:

Backend Actual: JSON.stringify(result.data, null, 2) o el string crudo si result.data es un string. También trunca los detalles.

UI Potencial: La UI recibe rawData. Si quiere mostrar una vista JSON, puede hacer el JSON.stringify ella misma (quizás con un visor de JSON interactivo). La truncación para la visualización es definitivamente responsabilidad de la UI.

Formateo específico por herramienta (ej. getActiveEditorInfo):

Backend Actual: Tiene un bloque if (toolName === 'getActiveEditorInfo') para formatear específicamente la salida de esta herramienta.

UI Potencial: La UI recibe toolName y rawData. Puede tener lógica condicional (un switch sobre toolName o componentes específicos) para renderizar la salida de ciertas herramientas de manera personalizada. Por ejemplo, para getActiveEditorInfo, podría mostrar los campos (filePath, languageId, etc.) de forma estructurada.

Formateo de executionTime:

Backend Actual: Usa formatExecutionTime para convertir milisegundos a un string legible (ej. "120ms", "1.23s").

UI Potencial: La UI recibe el executionTime como número (milisegundos) y puede tener su propia función formatExecutionTime para mostrarlo.

Manejo de items:

Backend Actual: Si result.data es un array, lo pone en items.

UI Potencial: La UI recibe rawData. Si Array.isArray(rawData), puede iterar y renderizar los elementos.

¿Qué enviaría el backend a la UI entonces?

En lugar de un ToolOutput completamente formateado, el WebviewEventHandler enviaría un objeto más "crudo" a la UI cuando un ToolExecutionEvent (completed/error) ocurra. Este objeto podría parecerse más a:

// Nuevo tipo para el mensaje a la UI
interface ToolResponseMessagePayload {
  operationId: string; // Para que la UI pueda identificar el mensaje original
  toolName: string;
  success: boolean;
  rawData?: any; // Sería el result.data original de la herramienta
  error?: string; // El result.error original
  executionTime?: number; // En milisegundos
  warnings?: string[];
  // Podrías incluir el modelAnalysis aquí también si la UI lo va a usar directamente
  modelAnalysis?: any; // El payload.modelAnalysis
}


Cambios Necesarios:

Backend (WebviewEventHandler.ts):

En handleToolExecutionCompleted y handleToolExecutionError:

Ya no llamaría a mapToolResponse.

Construiría un objeto ToolResponseMessagePayload usando los campos directamente del ToolExecutionEventPayload (ej. payload.rawToolOutput para rawData, payload.error para error, payload.duration para executionTime).

El chatMessage.metadata.toolOutput (si se mantiene) almacenaría este ToolResponseMessagePayload en lugar del antiguo ToolOutput.

El mensaje enviado a la webview (this.postMessage('agentActionUpdate', chatMessage)) contendría este nuevo payload.

Backend (toolResponseMapper.ts):

La función mapToolResponse y la interfaz ToolOutput podrían ser eliminadas o significativamente reducidas (quizás solo para logging interno si es necesario, pero no para la comunicación con la UI).

La función formatExecutionTime podría eliminarse del backend si no se usa en ningún otro lugar.

UI (Frontend Webview):

Cuando reciba un mensaje de tipo 'agentActionUpdate' (o el tipo que uses):

El payload.metadata.toolOutput (o como se llame el campo) contendrá el ToolResponseMessagePayload.

La UI usará toolName, success, rawData, error, etc., para renderizar la información.

Implementará su propia lógica para:

Generar títulos.

Crear resúmenes basados en el tipo y contenido de rawData.

Mostrar rawData (ej. como JSON, lista, texto plano).

Renderizar de forma especial para ciertos toolName.

Formatear el executionTime.

Manejar la truncación de texto.

Beneficios de este cambio:

Backend más simple: El backend se enfoca en ejecutar la herramienta y transmitir el resultado, no en cómo se ve.

UI más flexible: La UI tiene control total sobre la presentación. Puede cambiar cómo se muestran los resultados de las herramientas sin necesidad de modificar el backend.

Mejor separación de concerns: Lógica de presentación en el frontend, lógica de negocio en el backend.

Potencialmente menos datos transferidos: Si JSON.stringify de result.data es muy grande, y la UI solo necesita mostrar un resumen o una parte, se evita enviar el string grande.

Adaptación a diferentes herramientas más fácil en la UI: La UI puede tener componentes React dedicados para mostrar resultados de herramientas complejas.

En resumen, la mayoría de lo que hace mapToolResponse para construir title, summary, details, e items (y el formateo de tiempo) puede y probablemente debería moverse a la lógica de renderizado de la UI. El backend se limitaría a pasar la información esencial y los datos crudos.