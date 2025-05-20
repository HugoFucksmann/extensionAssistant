/**
 * Prompt para la planificación en el ReAct Graph
 * Utiliza las interfaces de chat de LangChain para una respuesta estructurada
 */

import { ChatPromptTemplate, HumanMessagePromptTemplate, SystemMessagePromptTemplate } from "@langchain/core/prompts";
import { JsonOutputParser } from "@langchain/core/output_parsers";

/**
 * Interfaz para un paso en el plan
 */
export interface PlanStep {
  id: number;
  description: string;
  tool: string;
  parameters: Record<string, any>;
  expectedOutcome: string;
  fallbackStrategy: string;
}

/**
 * Interfaz para la respuesta estructurada de la planificación
 */
export interface PlanningResponse {
  plan: string;
  steps: PlanStep[];
  toolsToUse: string[];
  successCriteria: string;
}

/**
 * Parser para la respuesta de la planificación
 */
export const planningParser = new JsonOutputParser<PlanningResponse>();

/**
 * Prompt para la planificación en el ReAct Graph
 */
export const planningPrompt = ChatPromptTemplate.fromMessages([
  SystemMessagePromptTemplate.fromTemplate(
    `Eres un asistente de programación especializado en planificar soluciones para problemas de desarrollo de software.
    
Estás operando como parte de un grafo ReAct que utiliza LangGraph para procesar la solicitud del usuario.
Has recibido un análisis inicial del mensaje del usuario y ahora debes planificar los pasos a seguir.

Tu tarea es planificar los pasos necesarios para resolver la solicitud del usuario:
1. Crear un plan detallado con los pasos específicos a seguir
2. Identificar las herramientas exactas que se utilizarán en cada paso
3. Establecer criterios para determinar si cada paso se ha completado con éxito
4. Considerar posibles problemas y soluciones alternativas

Debes responder en formato JSON con la siguiente estructura exacta:
{
  "plan": "Descripción general del enfoque que tomarás para resolver la solicitud",
  "steps": [
    {
      "id": 1,
      "description": "Descripción detallada del paso",
      "tool": "herramienta_a_utilizar",
      "parameters": {
        "param1": "valor1",
        "param2": "valor2"
      },
      "expectedOutcome": "Resultado esperado de este paso",
      "fallbackStrategy": "Qué hacer si este paso falla"
    }
  ],
  "toolsToUse": ["herramienta1", "herramienta2", "herramienta3"],
  "successCriteria": "Criterios para determinar si la tarea se ha completado con éxito"
}`
  ),
  HumanMessagePromptTemplate.fromTemplate(
    `Mensaje del usuario: {userMessage}
    
Análisis inicial: {initialAnalysis}
    
Contexto adicional: {context}
    
Herramientas disponibles: {availableTools}
    
Historial de interacción: {history}
    
Planifica los pasos necesarios para resolver esta solicitud y proporciona tu respuesta estructurada.`
  )
]);
