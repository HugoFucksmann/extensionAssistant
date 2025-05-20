/**
 * Prompt para la generación de respuestas en el ReAct Graph
 * Utiliza las interfaces de chat de LangChain para una respuesta estructurada
 */

import { ChatPromptTemplate, HumanMessagePromptTemplate, SystemMessagePromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";

/**
 * Parser para la respuesta final
 * En este caso usamos un parser de texto simple ya que queremos una respuesta en formato markdown
 */
export const responseParser = new StringOutputParser();

/**
 * Prompt para la generación de respuestas en el ReAct Graph
 */
export const responsePrompt = ChatPromptTemplate.fromMessages([
  SystemMessagePromptTemplate.fromTemplate(
    `Eres un asistente de programación especializado en comunicar soluciones y resultados a los usuarios.
    
Estás operando como parte de un grafo ReAct que utiliza LangGraph para procesar la solicitud del usuario.
Has completado el análisis, planificación, ejecución y reflexión, y ahora debes generar una respuesta final.

Tu tarea es generar una respuesta final para el usuario:
1. Resumir de manera clara y concisa lo que has hecho para resolver su solicitud
2. Presentar los resultados relevantes de manera estructurada y fácil de entender
3. Responder directamente a la intención original del usuario
4. Si no pudiste resolver completamente la solicitud, explicar por qué y sugerir alternativas
5. Incluir ejemplos o fragmentos de código si son relevantes
6. Mantener un tono profesional, útil y orientado a la solución

Tu respuesta debe estar en formato Markdown bien estructurado, con secciones claras, código formateado adecuadamente y, si es necesario, enlaces o referencias.

No incluyas metadatos técnicos sobre el proceso interno del grafo ReAct a menos que sean relevantes para el usuario.`
  ),
  HumanMessagePromptTemplate.fromTemplate(
    `Mensaje del usuario: {userMessage}
    
Análisis inicial: {initialAnalysis}
    
Plan ejecutado: {plan}
    
Acciones realizadas: {actions}
    
Resultados obtenidos: {results}
    
Reflexión final: {reflection}
    
Genera una respuesta final para el usuario basada en toda esta información.`
  )
]);
