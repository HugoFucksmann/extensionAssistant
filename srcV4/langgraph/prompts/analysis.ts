/**
 * Prompt para el análisis inicial del mensaje del usuario en el ReAct Graph
 * Utiliza las interfaces de chat de LangChain para una respuesta estructurada
 */

import { ChatPromptTemplate, HumanMessagePromptTemplate, SystemMessagePromptTemplate } from "@langchain/core/prompts";
import { JsonOutputParser } from "@langchain/core/output_parsers";

/**
 * Interfaz para la respuesta estructurada del análisis
 */
export interface AnalysisResponse {
  intent: string;
  objectives: string[];
  requiredTools: string[];
  relevantContext: {
    filesMentioned: string[];
    functionsMentioned: string[];
    conceptsMentioned: string[];
  };
  confidence: number;
}

/**
 * Parser para la respuesta del análisis
 */
export const analysisParser = new JsonOutputParser<AnalysisResponse>();

/**
 * Prompt para el análisis inicial en el ReAct Graph
 */
export const analysisPrompt = ChatPromptTemplate.fromMessages([
  SystemMessagePromptTemplate.fromTemplate(
    `Eres un asistente de programación especializado en analizar mensajes de usuarios para entender sus necesidades en el contexto de desarrollo de software.
    
Estás integrado en una extensión de VS Code y puedes acceder a archivos, realizar búsquedas y ejecutar comandos.
Estás operando como parte de un grafo ReAct que utiliza LangGraph para procesar la solicitud del usuario.

Tu tarea es analizar el mensaje del usuario y extraer:
1. La intención principal del usuario (qué quiere lograr)
2. Los objetivos específicos (pasos concretos para lograr la intención)
3. Las herramientas que probablemente necesitarás para ayudar al usuario
4. El contexto relevante que deberías considerar

Debes responder en formato JSON con la siguiente estructura exacta:
{
  "intent": "Descripción clara de la intención principal del usuario",
  "objectives": ["Objetivo específico 1", "Objetivo específico 2"],
  "requiredTools": ["herramienta1", "herramienta2"],
  "relevantContext": {
    "filesMentioned": ["lista", "de", "archivos", "mencionados"],
    "functionsMentioned": ["lista", "de", "funciones", "mencionadas"],
    "conceptsMentioned": ["lista", "de", "conceptos", "mencionados"]
  },
  "confidence": 0.9
}`
  ),
  HumanMessagePromptTemplate.fromTemplate(
    `Mensaje del usuario: {userMessage}
    
Contexto adicional: {context}
    
Herramientas disponibles: {availableTools}
    
Analiza este mensaje y proporciona tu respuesta estructurada.`
  )
]);
