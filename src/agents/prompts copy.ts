/**
 * Prompts utilizados por los diferentes agentes
 */

export const PROMPTS = {
  // Prompt para analizar la consulta del usuario
  PROMPT_ANALYSIS: `
    Eres un asistente especializado en analizar consultas de programación.
    
    CONSULTA DEL USUARIO:
    {userQuery}
    
    TAREA:
    Analiza la consulta y extrae la siguiente información:
    1. Objetivo principal del usuario
    2. Palabras clave importantes (nombres de archivos, funciones, variables, etc.)
    3. Tipo de problema (error, mejora, pregunta conceptual, etc.)
    
    Responde en formato JSON con la siguiente estructura:
    {
      "objective": "string",
      "keywords": ["string"],
      "problemType": "string",
      "actionPlan": {
        "steps": [
          {
            "id": number,
            "description": "string",
            "actionType": "string"
          }
        ]
      }
    }
    
    Los tipos de acción pueden ser:
    - "buscar_archivos": Buscar archivos relevantes
    - "examinar_codigo": Analizar código específico
    - "generar_respuesta": Generar respuesta final
  `,

  // Prompt para seleccionar archivos relevantes
  FILE_SELECTION: `
    Eres un asistente especializado en seleccionar archivos relevantes para resolver problemas de código.
    
    ANÁLISIS PREVIO:
    {analysis}
    
    ARCHIVOS DISPONIBLES:
    {availableFiles}
    
    TAREA:
    Selecciona los archivos más relevantes para resolver el problema del usuario.
    Explica brevemente por qué cada archivo es relevante.
    
    Responde en formato JSON con la siguiente estructura:
    {
      "relevantFiles": [
        {
          "path": "string",
          "relevance": "string",
          "reason": "string"
        }
      ]
    }
  `,

  // Prompt para examinar un archivo individual
  SINGLE_FILE_EXAMINATION: `
    Eres un asistente especializado en analizar código para identificar problemas.
    
    ANÁLISIS PREVIO:
    {analysis}
    
    PROBLEMA A RESOLVER:
    {problem}
    
    ARCHIVO A EXAMINAR:
    Ruta: {filePath}
    
    CONTENIDO DEL ARCHIVO:
    {fileContent}
    
    TAREA:
    Analiza este archivo específico y determina si contiene código relevante para el problema.
    Si es relevante, extrae los fragmentos exactos que podrían estar relacionados con el problema.
    
    Responde en formato JSON con la siguiente estructura:
    {
      "isRelevant": boolean,
      "relevanceScore": number, // 0-100
      "reason": "string",
      "codeExtracts": [
        {
          "code": "string",
          "startLine": number,
          "endLine": number,
          "explanation": "string"
        }
      ],
      "possibleIssues": [
        {
          "description": "string",
          "confidence": number,
          "location": "string"
        }
      ],
      "additionalFilesToExamine": [
        {
          "suggestedPath": "string",
          "reason": "string",
          "priority": number // 0-100
        }
      ]
    }
  `,
  
  // Prompt para consolidar análisis de múltiples archivos
  CODE_EXAMINATION_CONSOLIDATION: `
    Eres un asistente especializado en analizar código para identificar problemas.
    
    ANÁLISIS PREVIO:
    {analysis}
    
    PROBLEMA A RESOLVER:
    {problem}
    
    RESULTADOS DE ANÁLISIS DE ARCHIVOS INDIVIDUALES:
    {fileAnalysisResults}
    
    TAREA:
    Consolida los resultados de los análisis individuales de archivos.
    Identifica las causas más probables del problema basándote en todos los fragmentos de código relevantes.
    Determina si se necesita examinar archivos adicionales.
    
    Responde en formato JSON con la siguiente estructura:
    {
      "consolidatedCodeExtracts": [
        {
          "filePath": "string",
          "code": "string",
          "startLine": number,
          "endLine": number,
          "relevance": "string",
          "explanation": "string"
        }
      ],
      "possibleIssues": [
        {
          "description": "string",
          "confidence": number,
          "location": "string",
          "explanation": "string"
        }
      ],
      "needsAdditionalFiles": boolean,
      "additionalFilesToExamine": [
        {
          "suggestedPath": "string",
          "reason": "string",
          "priority": number // 0-100
        }
      ],
      "rootCauseAnalysis": "string"
    }
  `,

  // Prompt para generar respuesta final
  RESPONSE_GENERATION: `
    Eres un asistente de programación que ayuda a resolver problemas de código.
    
    CONSULTA ORIGINAL:
    {userQuery}
    
    ANÁLISIS:
    {analysis}
    
    ARCHIVOS RELEVANTES:
    {relevantFiles}
    
    FRAGMENTOS DE CÓDIGO:
    {codeExtracts}
    
    POSIBLES PROBLEMAS:
    {possibleIssues}
    
    TAREA:
    Genera una respuesta clara y concisa para el usuario que:
    1. Explique el problema identificado
    2. Proporcione una solución específica
    3. Incluya fragmentos de código relevantes
    4. Explique por qué ocurre el problema
    
    Formato libre, pero asegúrate de ser claro y directo.
  `
};
