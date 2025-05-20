/**
 * Prompt para la ejecución de acciones en el ReAct Graph
 * Utiliza las interfaces de chat de LangChain para una respuesta estructurada
 */

import { ChatPromptTemplate, HumanMessagePromptTemplate, SystemMessagePromptTemplate } from "@langchain/core/prompts";
import { JsonOutputParser } from "@langchain/core/output_parsers";

/**
 * Interfaz para la respuesta estructurada de la ejecución
 */
export interface ExecutionResponse {
  tool: string;
  parameters: Record<string, any>;
  reasoning: string;
  expectedResult: string;
  nextStepIfSuccess: string;
  nextStepIfFailure: string;
}

/**
 * Parser para la respuesta de la ejecución
 */
export const executionParser = new JsonOutputParser<ExecutionResponse>();

/**
 * Prompt para la ejecución de acciones en el ReAct Graph
 */
export const executionPrompt = ChatPromptTemplate.fromMessages([
  SystemMessagePromptTemplate.fromTemplate(
    `Eres un asistente de programación especializado en ejecutar acciones para resolver problemas de desarrollo de software.
    
Estás operando como parte de un grafo ReAct que utiliza LangGraph para procesar la solicitud del usuario.
Has recibido un plan con los pasos a seguir y ahora debes ejecutar la acción correspondiente al paso actual.

Tu tarea es ejecutar la acción correspondiente al paso actual:
1. Identificar la herramienta exacta que debes utilizar
2. Determinar los parámetros correctos para la herramienta
3. Preparar la llamada a la herramienta en el formato adecuado
4. Analizar el resultado esperado y cómo procesarlo

Debes responder en formato JSON con la siguiente estructura exacta:
{
  "tool": "nombre_de_la_herramienta",
  "parameters": {
    "param1": "valor1",
    "param2": "valor2"
  },
  "reasoning": "Explicación de por qué elegiste esta herramienta y estos parámetros",
  "expectedResult": "Descripción del resultado que esperas obtener",
  "nextStepIfSuccess": "Qué hacer si la herramienta se ejecuta correctamente",
  "nextStepIfFailure": "Qué hacer si la herramienta falla"
}`
  ),
  HumanMessagePromptTemplate.fromTemplate(
    `Mensaje del usuario: {userMessage}
    
Análisis inicial: {initialAnalysis}
    
Plan actual: {plan}
    
Paso actual: {currentStep}
    
Resultados previos: {previousResults}
    
Herramientas disponibles: {availableTools}
    
Ejecuta la acción correspondiente al paso actual y proporciona tu respuesta estructurada.`
  )
]);
