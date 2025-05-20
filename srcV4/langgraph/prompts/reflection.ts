/**
 * Prompt para la reflexión en el ReAct Graph
 * Utiliza las interfaces de chat de LangChain para una respuesta estructurada
 */

import { ChatPromptTemplate, HumanMessagePromptTemplate, SystemMessagePromptTemplate } from "@langchain/core/prompts";
import { JsonOutputParser } from "@langchain/core/output_parsers";

/**
 * Interfaz para la evaluación de una acción
 */
export interface ActionEvaluation {
  actionId: number;
  success: boolean;
  analysisOfResult: string;
  achievedObjective: boolean;
}

/**
 * Interfaz para la respuesta estructurada de la reflexión
 */
export interface ReflectionResponse {
  actionsEvaluation: ActionEvaluation[];
  overallProgress: string;
  objectivesAchieved: string[];
  objectivesPending: string[];
  needsCorrection: boolean;
  correctionStrategy: string;
  readyForResponse: boolean;
  confidenceInSolution: number;
}

/**
 * Parser para la respuesta de la reflexión
 */
export const reflectionParser = new JsonOutputParser<ReflectionResponse>();

/**
 * Prompt para la reflexión en el ReAct Graph
 */
export const reflectionPrompt = ChatPromptTemplate.fromMessages([
  SystemMessagePromptTemplate.fromTemplate(
    `Eres un asistente de programación especializado en evaluar resultados y reflexionar sobre el progreso en la resolución de problemas.
    
Estás operando como parte de un grafo ReAct que utiliza LangGraph para procesar la solicitud del usuario.
Has ejecutado una o más acciones según el plan y ahora debes reflexionar sobre los resultados.

Tu tarea es reflexionar sobre los resultados obtenidos hasta ahora:
1. Evaluar si cada acción ha producido el resultado esperado
2. Determinar si se han cumplido los objetivos del usuario
3. Identificar cualquier problema o desviación del plan original
4. Decidir si es necesario ajustar el plan o ejecutar acciones adicionales
5. Evaluar si ya tienes suficiente información para generar una respuesta final

Debes responder en formato JSON con la siguiente estructura exacta:
{
  "actionsEvaluation": [
    {
      "actionId": 1,
      "success": true,
      "analysisOfResult": "Evaluación detallada del resultado de esta acción",
      "achievedObjective": true
    }
  ],
  "overallProgress": "Evaluación general del progreso hacia la resolución de la solicitud",
  "objectivesAchieved": ["objetivo1", "objetivo2"],
  "objectivesPending": ["objetivo3"],
  "needsCorrection": false,
  "correctionStrategy": "Estrategia para corregir el curso si es necesario",
  "readyForResponse": true,
  "confidenceInSolution": 0.85
}`
  ),
  HumanMessagePromptTemplate.fromTemplate(
    `Mensaje del usuario: {userMessage}
    
Análisis inicial: {initialAnalysis}
    
Plan original: {plan}
    
Acciones ejecutadas y resultados: {actionsAndResults}
    
Reflexiona sobre los resultados obtenidos hasta ahora y proporciona tu respuesta estructurada.`
  )
]);
